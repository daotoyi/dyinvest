import { computed, reactive, ref } from "vue";
import type {
  AppLanguage,
  CloudUser,
  UserPreferences,
  UserRole,
  UserStatus,
} from "../domain/user";
import { defaultPreferences } from "../domain/user";
import { setAppLocale, translate } from "../i18n";
import { CloudRequestError } from "../services/cloudClient";
import { readSession, writeSession } from "../services/session";
import {
  hydrateUserDatasets,
  resetDatasetRevisions,
} from "../services/userDataSync";
import {
  userDataApi,
  type CloudSessionPayload,
} from "../services/userData";

interface AuthState {
  users: CloudUser[];
  currentUser: CloudUser | null;
  preferences: UserPreferences | null;
}

interface PreferenceUpdate {
  nickname: string;
  experience: UserPreferences["experience"];
  riskLevel: UserPreferences["riskLevel"];
  defaultStrategyId: string;
  defaultOrderQuantity: number;
  language?: AppLanguage;
}

const state = reactive<AuthState>({
  users: [],
  currentUser: null,
  preferences: null,
});

const restoring = ref(false);
const loading = ref(false);
const error = ref("");
let restorePromise: Promise<CloudUser | null> | null = null;

const currentUser = computed(() => state.currentUser);
const preferences = computed(() => state.preferences);
const isLoggedIn = computed(() => Boolean(state.currentUser));
const isAdmin = computed(
  () =>
    state.currentUser?.role === "admin" &&
    state.currentUser?.status === "active",
);
const displayName = computed(
  () =>
    state.preferences?.nickname ||
    state.currentUser?.nickname ||
    translate("common.guest"),
);
const accountIdentifier = computed(() => {
  const user = state.currentUser;
  if (!user) return "";
  if (user.authMethod === "wechat_phone" && user.phone) {
    return `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}`;
  }
  return `@${user.username}`;
});
const hasAccounts = computed(() => state.users.length > 0);

function normalizePreferences(
  input: Partial<UserPreferences> | null | undefined,
  nicknameFallback: string,
): UserPreferences {
  const base = defaultPreferences(nicknameFallback);
  if (!input) return base;
  const experience = ["beginner", "intermediate", "advanced"].includes(
    input.experience ?? "",
  )
    ? (input.experience as UserPreferences["experience"])
    : "beginner";
  const riskLevel = ["C2", "C3", "C4"].includes(input.riskLevel ?? "")
    ? (input.riskLevel as UserPreferences["riskLevel"])
    : "C3";
  const defaultOrderQuantity = Number.isFinite(Number(input.defaultOrderQuantity))
    ? Math.min(20, Math.max(1, Math.floor(Number(input.defaultOrderQuantity))))
    : 1;
  return {
    nickname: input.nickname?.trim().slice(0, 20) || nicknameFallback,
    experience,
    riskLevel,
    defaultStrategyId:
      input.defaultStrategyId?.trim().slice(0, 64) || base.defaultStrategyId,
    defaultOrderQuantity,
    language: input.language === "zh-CN" ? "zh-CN" : "en",
    updatedAt: input.updatedAt || base.updatedAt,
  };
}

function applyUser(user: CloudUser) {
  state.currentUser = user;
  state.preferences = normalizePreferences(user.preferences, user.nickname);
  setAppLocale(state.preferences.language);
}

function clearAuthState() {
  state.currentUser = null;
  state.preferences = null;
  state.users = [];
  writeSession(null);
  resetDatasetRevisions();
}

function isSessionError(cause: unknown) {
  return (
    cause instanceof CloudRequestError &&
    [
      "AUTH_REQUIRED",
      "SESSION_EXPIRED",
      "ACCOUNT_DISABLED",
      "USER_NOT_FOUND",
    ].includes(cause.code)
  );
}

function localizeError(cause: unknown) {
  if (cause instanceof CloudRequestError) {
    const key = `errors.${cause.code}`;
    const localized = translate(key);
    return localized === key ? cause.message : localized;
  }
  return cause instanceof Error ? cause.message : translate("common.error");
}

function applySession(session: CloudSessionPayload) {
  applyUser(session.user);
  writeSession({
    token: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
  });
  hydrateUserDatasets(session.datasets);
  return session.user;
}

async function run<T>(operation: () => Promise<T>): Promise<T> {
  loading.value = true;
  error.value = "";
  try {
    return await operation();
  } catch (cause) {
    error.value = localizeError(cause);
    throw new Error(error.value);
  } finally {
    loading.value = false;
  }
}

async function restore() {
  if (restorePromise) return restorePromise;
  restorePromise = (async () => {
    const stored = readSession();
    if (!stored) {
      clearAuthState();
      return null;
    }

    restoring.value = true;
    error.value = "";
    applyUser(stored.user);
    try {
      const payload = await userDataApi.restore(stored.token);
      applyUser(payload.user);
      writeSession({
        token: stored.token,
        expiresAt: stored.expiresAt,
        user: payload.user,
      });
      hydrateUserDatasets(payload.datasets);
      return payload.user;
    } catch (cause) {
      if (isSessionError(cause)) clearAuthState();
      error.value = localizeError(cause);
      return state.currentUser;
    } finally {
      restoring.value = false;
    }
  })().finally(() => {
    restorePromise = null;
  });
  return restorePromise;
}

async function register(input: {
  username: string;
  password: string;
  nickname: string;
  language?: AppLanguage;
}) {
  return run(async () => {
    const session = await userDataApi.register({
      ...input,
      language: input.language ?? "en",
    });
    return applySession(session);
  });
}

async function login(username: string, password: string) {
  return run(async () => {
    const session = await userDataApi.login(username, password);
    return applySession(session);
  });
}

async function phoneLogin(input: { code: string; language?: AppLanguage }) {
  return run(async () => {
    const session = await userDataApi.phoneLogin({
      code: input.code,
      language: input.language ?? "en",
    });
    return applySession(session);
  });
}

async function logout() {
  const token = readSession()?.token;
  loading.value = true;
  try {
    if (token) await userDataApi.logout(token).catch(() => undefined);
  } finally {
    clearAuthState();
    loading.value = false;
  }
}

async function updatePreferences(input: PreferenceUpdate) {
  const token = readSession()?.token;
  const user = state.currentUser;
  if (!token || !user) throw new Error(translate("auth.loginRequired"));
  const next = normalizePreferences(
    {
      ...state.preferences,
      ...input,
      nickname: input.nickname,
      language: input.language ?? state.preferences?.language ?? "en",
      updatedAt: new Date().toISOString(),
    },
    user.nickname,
  );
  return run(async () => {
    const result = await userDataApi.updatePreferences(token, next);
    applyUser(result.user);
    const stored = readSession();
    if (stored) writeSession({ ...stored, user: result.user });
    return state.preferences as UserPreferences;
  });
}

async function refresh() {
  const stored = readSession();
  if (!stored) return null;
  return run(async () => {
    const payload = await userDataApi.pull(stored.token);
    applyUser(payload.user);
    writeSession({ ...stored, user: payload.user });
    hydrateUserDatasets(payload.datasets);
    return payload.user;
  });
}

async function listUsers() {
  const token = readSession()?.token;
  if (!token || !isAdmin.value) throw new Error(translate("admin.noPermission"));
  return run(async () => {
    const result = await userDataApi.listUsers(token);
    state.users = result.users;
    return result.users;
  });
}

async function setUserRole(userId: string, role: UserRole) {
  const token = readSession()?.token;
  if (!token || !isAdmin.value) throw new Error(translate("admin.noPermission"));
  await run(() => userDataApi.setUserRole(token, userId, role));
  const user = state.users.find((item) => item.id === userId);
  if (user) user.role = role;
}

async function setUserStatus(userId: string, status: UserStatus) {
  const token = readSession()?.token;
  if (!token || !isAdmin.value) throw new Error(translate("admin.noPermission"));
  await run(() => userDataApi.setUserStatus(token, userId, status));
  const user = state.users.find((item) => item.id === userId);
  if (user) user.status = status;
}

function getUserPreferences(userId: string) {
  const user = state.users.find((item) => item.id === userId);
  return user?.preferences
    ? normalizePreferences(user.preferences, user.nickname)
    : null;
}

export function useAuth() {
  return {
    state,
    restoring,
    loading,
    error,
    currentUser,
    preferences,
    isLoggedIn,
    isAdmin,
    displayName,
    accountIdentifier,
    hasAccounts,
    restore,
    register,
    login,
    phoneLogin,
    logout,
    updatePreferences,
    refresh,
    listUsers,
    setUserRole,
    setUserStatus,
    getUserPreferences,
  };
}
