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
});
