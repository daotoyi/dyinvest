import { beforeEach, describe, expect, it, vi } from "vitest";

describe("verified phone login", () => {
  const storage = new Map<string, unknown>();

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
  });

  it("reuses the same account for the same verified phone number", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const first = auth.loginWithVerifiedPhone("13800138000");
    auth.logout();
    const second = auth.loginWithVerifiedPhone("13800138000");

    expect(second.id).toBe(first.id);
    expect(auth.state.users).toHaveLength(1);
  });

  it("rejects an invalid phone number from the verification layer", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();

    expect(() => auth.loginWithVerifiedPhone("12345")).toThrow(
      "微信返回的手机号格式不正确",
    );
  });

  it("bootstraps the first account as admin and enforces account status", async () => {
    const { useAuth } = await import("./useAuth");
    const auth = useAuth();

    const first = auth.loginWithVerifiedPhone("13800138000");
    const second = auth.loginWithVerifiedPhone("13900139000");
    expect(first.role).toBe("admin");
    expect(second.role).toBe("user");
    expect(auth.isAdmin.value).toBe(false);

    auth.loginWithVerifiedPhone("13800138000");
    expect(auth.isAdmin.value).toBe(true);
    auth.setUserRole(second.id, "admin");
    expect(second.role).toBe("admin");
    auth.setUserStatus(second.id, "disabled");
    expect(second.status).toBe("disabled");
    expect(() => auth.loginWithVerifiedPhone("13900139000")).toThrow(
      "该账户已被管理员禁用",
    );
    expect(() => auth.setUserRole(first.id, "user")).toThrow(
      "不能取消自己的管理员权限",
    );
  });
});
