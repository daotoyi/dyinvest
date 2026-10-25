import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ADMIN_ID,
  DEFAULT_ADMIN_PASSWORD_HASH,
  DEFAULT_ADMIN_USERNAME,
} from "../config/defaultAdmin";

describe("verified phone login", () => {
  const storage = new Map<string, unknown>();
  const defaultAdminPassword = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env?.DEFAULT_ADMIN_PASSWORD;

  beforeEach(() => {
    storage.clear();
    vi.resetModules();
    vi.stubGlobal("uni", {
      getStorageSync(key: string) {
        return storage.get(key);
      },
      setStorageSync(key: string, value: unknown) {
        storage.set(key, value);
      },
    });
  });

  it("creates a local account for a verified WeChat phone number", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const user = auth.loginWithVerifiedPhone("13800138000");

    expect(user.authMethod).toBe("wechat_phone");
    expect(user.phone).toBe("13800138000");
    expect(auth.isLoggedIn.value).toBe(true);
    expect(auth.accountIdentifier.value).toBe("138****8000");
    expect(auth.preferences.value?.nickname).toBe("微信用户8000");
    expect(user.role).toBe("user");
  });

  it("reuses the same account for the same verified phone number", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const first = auth.loginWithVerifiedPhone("13800138000");
    auth.logout();
    const second = auth.loginWithVerifiedPhone("13800138000");

    expect(second.id).toBe(first.id);
    expect(auth.state.users).toHaveLength(2);
  });

  it("rejects an invalid phone number from the verification layer", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();

    expect(() => auth.loginWithVerifiedPhone("12345")).toThrow(
      "微信返回的手机号格式不正确",
    );
  });

  it("seeds exactly one default admin without overriding persisted users", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const admin = auth.state.users.find(
      (user) => user.usernameNormalized === DEFAULT_ADMIN_USERNAME,
    );

    expect(admin).toMatchObject({
      id: DEFAULT_ADMIN_ID,
      role: "admin",
      status: "active",
      authMethod: "local",
      passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
    });
    expect(auth.state.users).toHaveLength(1);

    vi.resetModules();
    const reloaded = (await import("./useAuth")).useAuth();
    expect(
      reloaded.state.users.filter(
        (user) => user.usernameNormalized === DEFAULT_ADMIN_USERNAME,
      ),
    ).toHaveLength(1);
  });

  it("keeps phone accounts non-admin and blocks duplicate admin registration", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const user = auth.loginWithVerifiedPhone("13800138000");

    expect(user.role).toBe("user");
    expect(auth.isAdmin.value).toBe(false);
    expect(() => auth.setUserRole(user.id, "admin")).toThrow(
      "当前账户没有管理权限",
    );
    expect(() =>
      auth.register({
        username: DEFAULT_ADMIN_USERNAME,
        password: "not-in-source-control",
        nickname: "重复管理员",
      }),
    ).toThrow("该用户名已存在");
  });

  it.runIf(Boolean(defaultAdminPassword))(
    "authenticates the seeded admin and enables the management console",
    async () => {
      const { useAuth } = await import("./useAuth");
      const auth = useAuth();
      const admin = auth.login(
        DEFAULT_ADMIN_USERNAME,
        defaultAdminPassword as string,
      );

      expect(admin.id).toBe(DEFAULT_ADMIN_ID);
      expect(admin.role).toBe("admin");
      expect(auth.isAdmin.value).toBe(true);

      const user = auth.loginWithVerifiedPhone("13900139000");
      auth.login(DEFAULT_ADMIN_USERNAME, defaultAdminPassword as string);
      auth.setUserRole(user.id, "admin");
      expect(user.role).toBe("admin");
      auth.setUserStatus(user.id, "disabled");
      expect(user.status).toBe("disabled");
      expect(() => auth.setUserRole(admin.id, "user")).toThrow(
        "不能取消自己的管理员权限",
      );
    },
  );

  it("enforces account status for verified phone accounts", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const user = auth.loginWithVerifiedPhone("13900139000");
    user.status = "disabled";

    expect(() => auth.loginWithVerifiedPhone("13900139000")).toThrow(
      "该账户已被管理员禁用",
    );
  });
});
