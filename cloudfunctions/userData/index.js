const crypto = require("crypto");
const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const command = db.command;
const USERS = "users";
const SESSIONS = "sessions";
const USER_DATA = "user_data";
const APP_CONFIG = "app_config";
const DATA_TYPES = new Set(["learning", "paper"]);
const SESSION_DAYS = 30;
const MAX_PAYLOAD_BYTES = 128 * 1024;
const DEFAULT_ADMIN = {
  id: "u_default_admin",
  username: "admin",
  nickname: "系统管理员",
  salt: "768fa0b600e96c80c040e98e9b2ee222",
  passwordHash:
    "b8c5cfec92c411431fc02b08d70159c8e7cb7bee93c18c1277340e803bf043ef",
  iterations: 60000,
};

class UserError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

let bootstrapPromise;

function nowIso() {
  return new Date().toISOString();
}

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function passwordHash(password, salt, iterations) {
  return crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left), "utf8");
  const rightBuffer = Buffer.from(String(right), "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function sanitizeText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeLanguage(value) {
  return value === "zh-CN" ? "zh-CN" : "en";
}

function defaultPreferences(nickname, language = "en") {
  return {
    nickname: nickname || (language === "en" ? "Investor" : "投资者"),
    experience: "beginner",
    riskLevel: "C3",
    defaultStrategyId: "bull-call-spread",
    defaultOrderQuantity: 1,
    language: normalizeLanguage(language),
    updatedAt: nowIso(),
  };
}

function sanitizePreferences(input, nicknameFallback) {
  const source = input && typeof input === "object" ? input : {};
  const experience = ["beginner", "intermediate", "advanced"].includes(
    source.experience,
  )
    ? source.experience
    : "beginner";
  const riskLevel = ["C2", "C3", "C4"].includes(source.riskLevel)
    ? source.riskLevel
    : "C3";
  const quantity = Number.isFinite(Number(source.defaultOrderQuantity))
    ? Math.min(20, Math.max(1, Math.floor(Number(source.defaultOrderQuantity))))
    : 1;
  return {
    nickname:
      sanitizeText(source.nickname, 20) || nicknameFallback || "Investor",
    experience,
    riskLevel,
    defaultStrategyId:
      sanitizeText(source.defaultStrategyId, 64) || "bull-call-spread",
    defaultOrderQuantity: quantity,
    language: normalizeLanguage(source.language),
    updatedAt: nowIso(),
  };
}

function publicUser(user) {
  return {
    id: user._id || user.id,
    username: user.username,
    usernameNormalized: user.usernameNormalized,
    nickname: user.preferences?.nickname || user.nickname,
    authMethod: user.authMethod || "local",
    phone: user.phone || "",
    role: user.role === "admin" ? "admin" : "user",
    status: user.status === "disabled" ? "disabled" : "active",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    preferences: user.preferences,
  };
}

function withoutId(record) {
  const { _id, ...data } = record;
  return data;
}

async function createCollectionIfMissing(name) {
  try {
    await db.createCollection(name);
  } catch (error) {
    const message = String(error?.errMsg || error?.message || "");
    if (!/exist|exists|已存在|DATABASE_COLLECTION_EXIST/i.test(message)) {
      console.warn(`createCollection ${name} skipped`, message);
    }
  }
}

async function ensureBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await Promise.all(
        [USERS, SESSIONS, USER_DATA, APP_CONFIG].map(createCollectionIfMissing),
      );

      const adminResult = await db
        .collection(USERS)
        .where({ usernameNormalized: DEFAULT_ADMIN.username })
        .limit(1)
        .get();
      if (!adminResult.data.length) {
        try {
          await db
            .collection(USERS)
            .doc(DEFAULT_ADMIN.id)
            .set({
              data: {
                username: DEFAULT_ADMIN.username,
                usernameNormalized: DEFAULT_ADMIN.username,
                nickname: DEFAULT_ADMIN.nickname,
                authMethod: "local",
                role: "admin",
                status: "active",
                salt: DEFAULT_ADMIN.salt,
                passwordHash: DEFAULT_ADMIN.passwordHash,
                hashIterations: DEFAULT_ADMIN.iterations,
                preferences: {
                  ...defaultPreferences(DEFAULT_ADMIN.nickname, "zh-CN"),
                  nickname: DEFAULT_ADMIN.nickname,
                },
                createdAt: "2026-10-25T00:00:00.000Z",
                updatedAt: nowIso(),
              },
            });
        } catch (error) {
          const message = String(error?.errMsg || error?.message || "");
          if (!/duplicate|exist/i.test(message)) throw error;
        }
      }

      try {
        const content = await db.collection(APP_CONFIG).doc("content").get();
        if (!content.data) throw new Error("missing");
      } catch {
        await db
          .collection(APP_CONFIG)
          .doc("content")
          .set({
            data: {
              disabledLessonIds: [],
              disabledStrategyIds: [],
              announcement: {
                enabled: false,
                title: "模拟环境说明",
                text: "当前行情、策略和收益均为演示数据，不构成投资建议。",
                updatedAt: nowIso(),
              },
              revision: 1,
              updatedAt: nowIso(),
            },
          });
      }
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

async function findUserByUsername(username) {
  const normalized = sanitizeText(username, 20).toLowerCase();
  const result = await db
    .collection(USERS)
    .where({ usernameNormalized: normalized })
    .limit(1)
    .get();
  return result.data[0] || null;
}

async function findUserByPhone(phone) {
  if (!phone) return null;
  const result = await db
    .collection(USERS)
    .where({ phone })
    .limit(1)
    .get();
  return result.data[0] || null;
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const createdAt = nowIso();
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await db.collection(SESSIONS).add({
    data: {
      tokenHash,
      userId,
      createdAt,
      expiresAt,
      lastSeenAt: createdAt,
    },
  });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

async function removeSession(token) {
  if (!token) return;
  await db
    .collection(SESSIONS)
    .where({ tokenHash: sha256(token) })
    .remove()
    .catch(() => undefined);
}

async function authenticate(event) {
  const token = sanitizeText(event?.token, 256);
  if (!token) throw new UserError("AUTH_REQUIRED", "请先登录");
  const result = await db
    .collection(SESSIONS)
    .where({
      tokenHash: sha256(token),
      expiresAt: command.gt(Date.now()),
    })
    .limit(1)
    .get();
  const session = result.data[0];
  if (!session) throw new UserError("SESSION_EXPIRED", "登录状态已过期");
  let user;
  try {
    user = (await db.collection(USERS).doc(session.userId).get()).data;
  } catch {
    throw new UserError("USER_NOT_FOUND", "账户不存在");
  }
  if (!user || user.status === "disabled") {
    throw new UserError("ACCOUNT_DISABLED", "该账户已被管理员禁用");
  }
  await db
    .collection(SESSIONS)
    .doc(session._id)
    .update({ data: { lastSeenAt: nowIso() } })
    .catch(() => undefined);
  return { user, session, token };
}

function ensureAdmin(auth) {
  if (auth.user.role !== "admin" || auth.user.status === "disabled") {
    throw new UserError("ADMIN_REQUIRED", "当前账户没有管理权限");
  }
}

async function loadDataset(userId, type) {
  try {
    const result = await db
      .collection(USER_DATA)
      .doc(`${userId}_${type}`)
      .get();
    if (!result.data) throw new Error("missing");
    return {
      type,
      payload: result.data.payload,
      revision: Number(result.data.revision) || 0,
      updatedAt: result.data.updatedAt,
    };
  } catch {
    return { type, payload: null, revision: 0, updatedAt: null };
  }
}

async function loadAllUserData(userId) {
  const entries = await Promise.all(
    [...DATA_TYPES].map((type) => loadDataset(userId, type)),
  );
  return Object.fromEntries(entries.map((entry) => [entry.type, entry]));
}

async function getContent() {
  try {
    const result = await db.collection(APP_CONFIG).doc("content").get();
    const data = result.data;
    if (!data) throw new Error("missing");
    return {
      payload: {
        disabledLessonIds: Array.isArray(data.disabledLessonIds)
          ? data.disabledLessonIds
          : [],
        disabledStrategyIds: Array.isArray(data.disabledStrategyIds)
          ? data.disabledStrategyIds
          : [],
        announcement: data.announcement,
      },
      revision: Number(data.revision) || 1,
      updatedAt: data.updatedAt,
    };
  } catch {
    return {
      payload: {
        disabledLessonIds: [],
        disabledStrategyIds: [],
        announcement: {
          enabled: false,
          title: "模拟环境说明",
          text: "当前行情、策略和收益均为演示数据，不构成投资建议。",
          updatedAt: nowIso(),
        },
      },
      revision: 1,
      updatedAt: nowIso(),
    };
  }
}

async function register(event) {
  const username = sanitizeText(event.username, 20);
  const nickname = sanitizeText(event.nickname, 20);
  const password = typeof event.password === "string" ? event.password : "";
  const language = normalizeLanguage(event.language);
  if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(username)) {
    throw new UserError(
      "INVALID_USERNAME",
      "用户名需为 3-20 位字母、数字或下划线，并以字母开头",
    );
  }
  if (password.length < 8) {
    throw new UserError("WEAK_PASSWORD", "密码至少需要 8 位");
  }
  if (nickname.length < 2) {
    throw new UserError("INVALID_NICKNAME", "昵称至少需要 2 个字符");
  }
  if (await findUserByUsername(username)) {
    throw new UserError("USERNAME_EXISTS", "该用户名已存在");
  }
  const userId = `u_${Date.now()}_${randomHex(5)}`;
  const salt = randomHex(16);
  const createdAt = nowIso();
  const preferences = defaultPreferences(nickname, language);
  const user = {
    _id: userId,
    username,
    usernameNormalized: username.toLowerCase(),
    nickname,
    authMethod: "local",
    phone: "",
    role: "user",
    status: "active",
    salt,
    passwordHash: passwordHash(password, salt, 60000),
    hashIterations: 60000,
    preferences,
    createdAt,
    updatedAt: createdAt,
  };
  await db.collection(USERS).doc(userId).set({ data: withoutId(user) });
  const session = await createSession(userId);
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: publicUser(user),
    datasets: await loadAllUserData(userId),
  };
}

async function login(event) {
  const user = await findUserByUsername(event.username);
  if (!user || user.authMethod === "wechat_phone") {
    throw new UserError("INVALID_CREDENTIALS", "用户名或密码不正确");
  }
  if (user.status === "disabled") {
    throw new UserError("ACCOUNT_DISABLED", "该账户已被管理员禁用");
  }
  const candidate = passwordHash(
    typeof event.password === "string" ? event.password : "",
    user.salt,
    Number(user.hashIterations) || 60000,
  );
  if (!constantTimeEqual(candidate, user.passwordHash)) {
    throw new UserError("INVALID_CREDENTIALS", "用户名或密码不正确");
  }
  const session = await createSession(user._id);
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: publicUser(user),
    datasets: await loadAllUserData(user._id),
  };
}

async function phoneLogin(event, auth) {
  const code = sanitizeText(event.code, 512);
  if (!code) throw new UserError("MISSING_PHONE_CODE", "缺少微信手机号授权码");
  let response;
  try {
    response = await cloud.openapi.phonenumber.getPhoneNumber({ code });
  } catch (error) {
    console.error("phone exchange failed", {
      errCode: error?.errCode,
      errMsg: error?.errMsg,
    });
    throw new UserError(
      "PHONE_EXCHANGE_FAILED",
      "手机号验证服务暂不可用，请稍后重试",
    );
  }
  const phoneInfo = response.phoneInfo || response.phone_info || {};
  const phone = String(phoneInfo.purePhoneNumber || phoneInfo.pure_phone_number || "");
  if (!/^1\d{10}$/.test(phone)) {
    throw new UserError("INVALID_PHONE", "微信未返回有效手机号");
  }

  const phoneOwner = await findUserByPhone(phone);
  let user = auth?.user || phoneOwner;
  if (auth?.user && phoneOwner && phoneOwner._id !== auth.user._id) {
    throw new UserError(
      "PHONE_ALREADY_BOUND",
      "该手机号已绑定其他账户，请直接使用手机号登录",
    );
  }
  if (auth?.user?.phone && auth.user.phone !== phone) {
    throw new UserError(
      "ACCOUNT_PHONE_MISMATCH",
      "当前账户已绑定其他手机号",
    );
  }
  if (user?.status === "disabled") {
    throw new UserError("ACCOUNT_DISABLED", "该账户已被管理员禁用");
  }
  if (!user) {
    const suffix = phone.slice(-4);
    const userId = `u_${Date.now()}_${randomHex(5)}`;
    const username = `wx_${suffix}_${randomHex(3)}`;
    const createdAt = nowIso();
    user = {
      _id: userId,
      username,
      usernameNormalized: username.toLowerCase(),
      nickname: `WeChat ${suffix}`,
      authMethod: "wechat_phone",
      phone,
      role: "user",
      status: "active",
      salt: "",
      passwordHash: "",
      hashIterations: 0,
      preferences: defaultPreferences(`WeChat ${suffix}`, event.language),
      createdAt,
      updatedAt: createdAt,
    };
    await db.collection(USERS).doc(userId).set({ data: withoutId(user) });
  } else {
    const wxContext = cloud.getWXContext();
    await db
      .collection(USERS)
      .doc(user._id)
      .update({
        data: {
          phone,
          authMethod: user.authMethod || "wechat_phone",
          openId: wxContext.OPENID || user.openId || "",
          updatedAt: nowIso(),
        },
      });
    user = {
      ...user,
      phone,
      openId: wxContext.OPENID || user.openId || "",
    };
  }
  const session = await createSession(user._id);
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: publicUser(user),
    datasets: await loadAllUserData(user._id),
  };
}

async function restore(event) {
  const auth = await authenticate(event);
  return {
    user: publicUser(auth.user),
    datasets: await loadAllUserData(auth.user._id),
  };
}

async function updatePreferences(event, auth) {
  const preferences = sanitizePreferences(
    event.preferences,
    auth.user.preferences?.nickname || auth.user.nickname,
  );
  await db
    .collection(USERS)
    .doc(auth.user._id)
    .update({
      data: {
        nickname: preferences.nickname,
        preferences,
        updatedAt: nowIso(),
      },
    });
  return { user: publicUser({ ...auth.user, preferences }) };
}

async function pushData(event, auth) {
  const type = sanitizeText(event.type, 32);
  if (!DATA_TYPES.has(type)) {
    throw new UserError("INVALID_DATA_TYPE", "不支持的数据类型");
  }
  const payload = event.payload;
  const serialized = JSON.stringify(payload);
  if (!serialized || Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
    throw new UserError("PAYLOAD_TOO_LARGE", "同步数据格式或大小不正确");
  }
  const baseRevision = Math.max(0, Math.floor(Number(event.baseRevision) || 0));
  const docId = `${auth.user._id}_${type}`;
  let current = null;
  try {
    current = (await db.collection(USER_DATA).doc(docId).get()).data;
  } catch {
    current = null;
  }
  const currentRevision = Number(current?.revision) || 0;
  if (baseRevision !== currentRevision) {
    return {
      conflict: true,
      current: {
        type,
        payload: current?.payload ?? null,
        revision: currentRevision,
        updatedAt: current?.updatedAt ?? null,
      },
    };
  }
  const revision = currentRevision + 1;
  const updatedAt = nowIso();
  await db
    .collection(USER_DATA)
    .doc(docId)
    .set({
      data: {
        userId: auth.user._id,
        type,
        payload,
        revision,
        updatedAt,
      },
    });
  return { conflict: false, dataset: { type, payload, revision, updatedAt } };
}

async function listUsers(auth) {
  ensureAdmin(auth);
  const result = await db.collection(USERS).limit(100).get();
  return {
    users: result.data.map((user) => publicUser(user)),
  };
}

async function setUserRole(event, auth) {
  ensureAdmin(auth);
  const userId = sanitizeText(event.userId, 128);
  if (userId === auth.user._id && event.role !== "admin") {
    throw new UserError("SELF_ROLE_CHANGE", "不能取消自己的管理员权限");
  }
  const role = event.role === "admin" ? "admin" : "user";
  await db.collection(USERS).doc(userId).update({
    data: { role, updatedAt: nowIso() },
  });
  return { userId, role };
}

async function setUserStatus(event, auth) {
  ensureAdmin(auth);
  const userId = sanitizeText(event.userId, 128);
  if (userId === auth.user._id && event.status === "disabled") {
    throw new UserError("SELF_DISABLE", "不能禁用当前登录账户");
  }
  const status = event.status === "disabled" ? "disabled" : "active";
  await db.collection(USERS).doc(userId).update({
    data: { status, updatedAt: nowIso() },
  });
  return { userId, status };
}

async function pushContent(event, auth) {
  ensureAdmin(auth);
  const payload = event.payload;
  if (!payload || typeof payload !== "object") {
    throw new UserError("INVALID_CONTENT", "运营内容格式不正确");
  }
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) {
    throw new UserError("PAYLOAD_TOO_LARGE", "运营内容过大");
  }
  const baseRevision = Math.max(0, Math.floor(Number(event.baseRevision) || 0));
  const current = (await db.collection(APP_CONFIG).doc("content").get()).data;
  const currentRevision = Number(current?.revision) || 1;
  if (baseRevision !== currentRevision) {
    return {
      conflict: true,
      current: await getContent(),
    };
  }
  const revision = currentRevision + 1;
  const updatedAt = nowIso();
  await db
    .collection(APP_CONFIG)
    .doc("content")
    .set({
      data: {
        disabledLessonIds: Array.isArray(payload.disabledLessonIds)
          ? payload.disabledLessonIds.filter((item) => typeof item === "string")
          : [],
        disabledStrategyIds: Array.isArray(payload.disabledStrategyIds)
          ? payload.disabledStrategyIds.filter((item) => typeof item === "string")
          : [],
        announcement: payload.announcement || {},
        revision,
        updatedAt,
      },
    });
  return {
    conflict: false,
    dataset: { payload, revision, updatedAt },
  };
}

async function handle(event, context) {
  await ensureBootstrap();
  const action = sanitizeText(event?.action, 40);
  let auth = null;
  if (event?.token) {
    try {
      auth = await authenticate(event);
    } catch (error) {
      if (["logout", "phoneLogin"].includes(action)) {
        auth = null;
      } else {
        throw error;
      }
    }
  }

  switch (action) {
    case "register":
      return register(event);
    case "login":
      return login(event);
    case "phoneLogin":
      return phoneLogin(event, auth);
    case "restore":
      return restore(event);
    case "logout":
      await removeSession(event.token);
      return { loggedOut: true };
    case "updatePreferences":
      return updatePreferences(event, auth || (await authenticate(event)));
    case "pull": {
      const activeAuth = auth || (await authenticate(event));
      return {
        user: publicUser(activeAuth.user),
        datasets: await loadAllUserData(activeAuth.user._id),
      };
    }
    case "push": {
      const activeAuth = auth || (await authenticate(event));
      return pushData(event, activeAuth);
    }
    case "getContent":
      return getContent();
    case "listUsers": {
      const activeAuth = auth || (await authenticate(event));
      return listUsers(activeAuth);
    }
    case "setUserRole": {
      const activeAuth = auth || (await authenticate(event));
      return setUserRole(event, activeAuth);
    }
    case "setUserStatus": {
      const activeAuth = auth || (await authenticate(event));
      return setUserStatus(event, activeAuth);
    }
    case "pushContent": {
      const activeAuth = auth || (await authenticate(event));
      return pushContent(event, activeAuth);
    }
    default:
      throw new UserError("UNKNOWN_ACTION", "未知的云端操作");
  }
}

exports.main = async (event, context) => {
  try {
    const data = await handle(event || {}, context);
    return { ok: true, data };
  } catch (error) {
    const normalized =
      error instanceof UserError
        ? error
        : new UserError("CLOUD_ERROR", "云端服务暂不可用，请稍后重试");
    console.error("userData failed", {
      action: event?.action,
      code: normalized.code,
      message: normalized.message,
      error: error instanceof Error ? error.stack : String(error),
    });
    return {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
      },
    };
  }
};
