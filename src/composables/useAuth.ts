import { computed, reactive } from "vue";
import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import {
  defaultPreferences,
  maskPhone,
  type ExperienceLevel,
  type LocalUserRecord,
  type RiskLevel,
  type UserPreferences,
} from "../domain/user";
import {
  createDefaultAdminRecord,
  DEFAULT_ADMIN_USERNAME,
} from "../config/defaultAdmin";

const USERS_KEY = "options-lab-local-users-v1";
const SESSION_KEY = "options-lab-local-session-v1";
const PREFERENCES_PREFIX = "options-lab-user-preferences-v1:";
const HASH_ITERATIONS = 60000;

interface AuthState {
  users: LocalUserRecord[];
  currentUserId: string | null;
  preferences: UserPreferences | null;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = uni.getStorageSync(key) as T;
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    uni.setStorageSync(key, value);
  } catch {
    // The UI reports persistence failures through the calling flow.
  }
}

function readUsers() {
  const raw = readStorage<unknown>(USERS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is LocalUserRecord => {
    if (!item || typeof item !== "object") return false;
    const user = item as Partial<LocalUserRecord>;
    return (
      typeof user.id === "string" &&
      typeof user.username === "string" &&
      typeof user.usernameNormalized === "string" &&
      typeof user.nickname === "string" &&
      typeof user.salt === "string" &&
      typeof user.passwordHash === "string" &&
      typeof user.hashIterations === "number"
    );
  });
}

function readSessionUserId(users: LocalUserRecord[]) {
  const userId = readStorage<string>(SESSION_KEY, "");
  return users.some((user) => user.id === userId) ? userId : null;
}

function readPreferences(userId: string | null) {
  if (!userId) return null;
  const raw = readStorage<Partial<UserPreferences> | null>(
    `${PREFERENCES_PREFIX}${userId}`,
    null,
  );
  const user = readUsers().find((item) => item.id === userId);
  if (!user) return null;
  return sanitizePreferences(raw, user.nickname);
}

function sanitizePreferences(
  input: Partial<UserPreferences> | null,
  nicknameFallback: string,
): UserPreferences {
  const base = defaultPreferences(nicknameFallback);
  if (!input) return base;
  const experience: ExperienceLevel =
    input.experience === "intermediate" || input.experience === "advanced"
      ? input.experience
      : "beginner";
  const riskLevel: RiskLevel =
    input.riskLevel === "C2" || input.riskLevel === "C4"
      ? input.riskLevel
      : "C3";
  return {
    nickname:
      typeof input.nickname === "string" && input.nickname.trim()
        ? input.nickname.trim().slice(0, 20)
        : nicknameFallback,
    experience,
    riskLevel,
    defaultStrategyId:
      typeof input.defaultStrategyId === "string" && input.defaultStrategyId
        ? input.defaultStrategyId
        : base.defaultStrategyId,
    defaultOrderQuantity:
      typeof input.defaultOrderQuantity === "number" &&
      Number.isFinite(input.defaultOrderQuantity)
        ? Math.min(20, Math.max(1, Math.floor(input.defaultOrderQuantity)))
        : 1,
    updatedAt:
      typeof input.updatedAt === "string" ? input.updatedAt : base.updatedAt,
  };
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(bytes);
}

function utf8Bytes(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }
  const encoded = encodeURIComponent(value);
  const bytes: number[] = [];
  for (let index = 0; index < encoded.length; index += 1) {
    const character = encoded[index];
    if (character === "%") {
      bytes.push(Number.parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(encoded.charCodeAt(index));
    }
  }
  return new Uint8Array(bytes);
}

function derivePasswordHash(password: string, salt: string, iterations: number) {
  const derived = pbkdf2(sha256, utf8Bytes(password), utf8Bytes(salt), {
    c: iterations,
    dkLen: 32,
  });
  return bytesToHex(derived);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

const initialUsers = readUsers();
let usersChanged = false;
for (const user of initialUsers) {
  if (!user.role) {
    user.role = "user";
    usersChanged = true;
  }
  if (!user.status) {
    user.status = "active";
    usersChanged = true;
  }
}
const hasDefaultAdmin = initialUsers.some(
  (user) => user.usernameNormalized === DEFAULT_ADMIN_USERNAME,
);
if (!hasDefaultAdmin) {
  initialUsers.unshift(createDefaultAdminRecord());
  usersChanged = true;
}
if (
  initialUsers.length > 0 &&
  !initialUsers.some((user) => user.role === "admin" && user.status !== "disabled")
) {
  const defaultAdmin = initialUsers.find(
    (user) =>
      user.usernameNormalized === DEFAULT_ADMIN_USERNAME &&
      user.status !== "disabled",
  );
  const firstActive =
    defaultAdmin ?? initialUsers.find((user) => user.status !== "disabled");
  if (firstActive) {
    firstActive.role = "admin";
    usersChanged = true;
  }
}
if (usersChanged) {
  writeStorage(USERS_KEY, JSON.parse(JSON.stringify(initialUsers)));
}
const initialUserId = readSessionUserId(initialUsers);
const state = reactive<AuthState>({
  users: initialUsers,
  currentUserId: initialUserId,
  preferences: readPreferences(initialUserId),
});

const currentUser = computed(
  () => state.users.find((user) => user.id === state.currentUserId) ?? null,
);
const isLoggedIn = computed(() => Boolean(currentUser.value));
const isAdmin = computed(
  () =>
    currentUser.value?.role === "admin" &&
    currentUser.value?.status !== "disabled",
);
const displayName = computed(
  () => state.preferences?.nickname ?? currentUser.value?.nickname ?? "访客",
);
const accountIdentifier = computed(() => {
  const user = currentUser.value;
  if (!user) return "";
  if (user.authMethod === "wechat_phone" && user.phone) {
    return maskPhone(user.phone);
  }
  return `@${user.username}`;
});
const hasAccounts = computed(() => state.users.length > 0);

function persistUsers() {
  writeStorage(USERS_KEY, JSON.parse(JSON.stringify(state.users)));
}

function persistSession() {
  writeStorage(SESSION_KEY, state.currentUserId ?? "");
}

function persistPreferences(preferences: UserPreferences) {
  if (!state.currentUserId) return;
  writeStorage(`${PREFERENCES_PREFIX}${state.currentUserId}`, preferences);
}

function register(input: {
  username: string;
  password: string;
  nickname: string;
}) {
  const username = input.username.trim();
  const nickname = input.nickname.trim();
  const normalized = username.toLowerCase();

  if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(username)) {
    throw new Error("用户名需为 3-20 位字母、数字或下划线，并以字母开头");
  }
  if (input.password.length < 8) {
    throw new Error("密码至少需要 8 位");
  }
  if (nickname.length < 2 || nickname.length > 20) {
    throw new Error("昵称需为 2-20 个字符");
  }
  if (
    state.users.some(
      (user) => user.usernameNormalized === normalized,
    )
  ) {
    throw new Error("该用户名已存在");
  }

  const salt = randomHex(16);
  const user: LocalUserRecord = {
    id: `u_${Date.now()}_${randomHex(4)}`,
    username,
    usernameNormalized: normalized,
    nickname,
    authMethod: "local",
    role: state.users.some((item) => item.role === "admin")
      ? "user"
      : "admin",
    status: "active",
    salt,
    passwordHash: derivePasswordHash(input.password, salt, HASH_ITERATIONS),
    hashIterations: HASH_ITERATIONS,
    createdAt: new Date().toISOString(),
  };
  state.users.push(user);
  state.currentUserId = user.id;
  state.preferences = defaultPreferences(nickname);
  persistUsers();
  persistSession();
  persistPreferences(state.preferences);
  return user;
}

function login(username: string, password: string) {
  const normalized = username.trim().toLowerCase();
  const user = state.users.find(
    (item) => item.usernameNormalized === normalized,
  );
  if (!user) throw new Error("用户名或密码不正确");
  if (user.status === "disabled") {
    throw new Error("该账户已被管理员禁用");
  }
  if (user.authMethod === "wechat_phone") {
    throw new Error("该账户请使用手机号快捷登录");
  }

  const candidate = derivePasswordHash(
    password,
    user.salt,
    user.hashIterations,
  );
  if (!constantTimeEqual(candidate, user.passwordHash)) {
    throw new Error("用户名或密码不正确");
  }

  state.currentUserId = user.id;
  state.preferences =
    readPreferences(user.id) ?? defaultPreferences(user.nickname);
  persistSession();
  persistPreferences(state.preferences);
  return user;
}

function loginWithVerifiedPhone(phone: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  if (!/^1\d{10}$/.test(normalizedPhone)) {
    throw new Error("微信返回的手机号格式不正确");
  }

  let user = state.users.find((item) => item.phone === normalizedPhone);
  if (user?.status === "disabled") {
    throw new Error("该账户已被管理员禁用");
  }
  if (!user) {
    const suffix = normalizedPhone.slice(-4);
    let username = `wx_${suffix}`;
    let sequence = 1;
    while (
      state.users.some(
        (item) => item.usernameNormalized === username.toLowerCase(),
      )
    ) {
      sequence += 1;
      username = `wx_${suffix}_${sequence}`;
    }
    user = {
      id: `u_${Date.now()}_${randomHex(4)}`,
      username,
      usernameNormalized: username.toLowerCase(),
      nickname: `微信用户${suffix}`,
      authMethod: "wechat_phone",
      phone: normalizedPhone,
      role: state.users.some((item) => item.role === "admin")
        ? "user"
        : "admin",
      status: "active",
      salt: "",
      passwordHash: "",
      hashIterations: 0,
      createdAt: new Date().toISOString(),
    };
    state.users.push(user);
    persistUsers();
  }

  state.currentUserId = user.id;
  state.preferences =
    readPreferences(user.id) ?? defaultPreferences(user.nickname);
  persistSession();
  persistPreferences(state.preferences);
  return user;
}

function logout() {
  state.currentUserId = null;
  state.preferences = null;
  persistSession();
}

function updatePreferences(patch: Partial<UserPreferences>) {
  if (!state.currentUserId || !state.preferences) {
    throw new Error("请先登录后再保存配置");
  }
  const next = sanitizePreferences(
    { ...state.preferences, ...patch, updatedAt: new Date().toISOString() },
    currentUser.value?.nickname ?? state.preferences.nickname,
  );
  state.preferences = next;
  persistPreferences(next);

  const user = currentUser.value;
  if (user && user.nickname !== next.nickname) {
    user.nickname = next.nickname;
    persistUsers();
  }
  return next;
}

function requireAdmin() {
  if (!isAdmin.value) throw new Error("当前账户没有管理权限");
}

function setUserRole(userId: string, role: "user" | "admin") {
  requireAdmin();
  if (userId === state.currentUserId && role !== "admin") {
    throw new Error("不能取消自己的管理员权限");
  }
  const user = state.users.find((item) => item.id === userId);
  if (!user) throw new Error("用户不存在");
  user.role = role;
  persistUsers();
}

function setUserStatus(userId: string, status: "active" | "disabled") {
  requireAdmin();
  if (userId === state.currentUserId && status === "disabled") {
    throw new Error("不能禁用当前登录账户");
  }
  const user = state.users.find((item) => item.id === userId);
  if (!user) throw new Error("用户不存在");
  user.status = status;
  persistUsers();
}

function getUserPreferences(userId: string) {
  const user = state.users.find((item) => item.id === userId);
  return user ? readPreferences(userId) ?? defaultPreferences(user.nickname) : null;
}

export function useAuth() {
  return {
    state,
    currentUser,
    isLoggedIn,
    isAdmin,
    displayName,
    accountIdentifier,
    hasAccounts,
    preferences: computed(() => state.preferences),
    register,
    login,
    loginWithVerifiedPhone,
    logout,
    updatePreferences,
    setUserRole,
    setUserStatus,
    getUserPreferences,
  };
}
