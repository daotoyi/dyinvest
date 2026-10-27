import { USER_DATA_FUNCTION, WECHAT_CLOUD_ENV } from "../config/runtime";

interface CloudEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

interface WechatCloudApi {
  init(options: { env?: string; traceUser?: boolean }): void;
  callFunction(options: {
    name: string;
    data: Record<string, unknown>;
  }): Promise<{ result?: unknown }>;
}

interface CloudbaseAuthResult {
  error?: { message?: string };
}

interface CloudbaseApp {
  auth(options?: { persistence?: string }): {
    getLoginState(): Promise<unknown>;
    signInAnonymously(): Promise<CloudbaseAuthResult>;
  };
  callFunction(options: {
    name: string;
    data: Record<string, unknown>;
    parse: boolean;
  }): Promise<{ result?: unknown }>;
}

export class CloudRequestError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CloudRequestError";
    this.code = code;
  }
}

let webCloudPromise: Promise<CloudbaseApp> | null = null;
let wechatCloudInitialized = false;

function parseEnvelope<T>(raw: unknown): T {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      throw new CloudRequestError("INVALID_CLOUD_RESPONSE", "云端返回了无效响应");
    }
  }
  if (!value || typeof value !== "object") {
    throw new CloudRequestError("INVALID_CLOUD_RESPONSE", "云端响应为空");
  }
  const envelope = value as CloudEnvelope<T>;
  if (!envelope.ok) {
    throw new CloudRequestError(
      envelope.error?.code || "CLOUD_ERROR",
      envelope.error?.message || "云端服务暂不可用",
    );
  }
  return envelope.data as T;
}

async function getWebCloud() {
  if (!webCloudPromise) {
    webCloudPromise = (async () => {
      const module = await import("@cloudbase/js-sdk");
      const cloudbase = module.default as unknown as {
        init(options: { env: string }): CloudbaseApp;
      };
      const app = cloudbase.init({ env: WECHAT_CLOUD_ENV });
      const auth = app.auth({ persistence: "local" });
      const loginState = await auth.getLoginState();
      if (!loginState) {
        const result = await auth.signInAnonymously();
        if (result?.error) {
          throw new CloudRequestError(
            "ANONYMOUS_AUTH_FAILED",
            result.error.message ||
              "CloudBase 匿名登录未启用，请在云开发控制台开启匿名登录",
          );
        }
      }
      return app;
    })().catch((error) => {
      webCloudPromise = null;
      throw error;
    });
  }
  return webCloudPromise;
}

function getWechatCloud() {
  const cloud = (
    globalThis as typeof globalThis & {
      wx?: { cloud?: WechatCloudApi };
    }
  ).wx?.cloud;
  if (!cloud) {
    throw new CloudRequestError(
      "WECHAT_CLOUD_UNAVAILABLE",
      "当前微信环境不支持云开发",
    );
  }
  if (!wechatCloudInitialized) {
    cloud.init({ env: WECHAT_CLOUD_ENV, traceUser: true });
    wechatCloudInitialized = true;
  }
  return cloud;
}

export async function callCloud<T>(
  action: string,
  payload: object = {},
): Promise<T> {
  const data = { ...(payload as Record<string, unknown>), action };
  try {
    // #ifdef MP-WEIXIN
    {
      const response = await getWechatCloud().callFunction({
        name: USER_DATA_FUNCTION,
        data,
      });
      return parseEnvelope<T>(response.result);
    }
    // #endif
    // #ifndef MP-WEIXIN
    {
      const app = await getWebCloud();
      const response = await app.callFunction({
        name: USER_DATA_FUNCTION,
        data,
        parse: true,
      });
      return parseEnvelope<T>(response.result);
    }
    // #endif
  } catch (error) {
    if (error instanceof CloudRequestError) throw error;
    const message =
      error instanceof Error ? error.message : "云端连接失败，请检查网络";
    throw new CloudRequestError("NETWORK_ERROR", message);
  }
}
