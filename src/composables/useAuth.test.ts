import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudUser, UserDatasets } from "../domain/user";
import type { CloudSessionPayload } from "../services/userData";

const userDataApi = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  phoneLogin: vi.fn(),
  restore: vi.fn(),
  logout: vi.fn(),
  updatePreferences: vi.fn(),
  pull: vi.fn(),
  push: vi.fn(),
  getContent: vi.fn(),
  listUsers: vi.fn(),
  setUserRole: vi.fn(),
  setUserStatus: vi.fn(),
  pushContent: vi.fn(),
}));

vi.mock("../services/userData", () => ({
  userDataApi,
}));

function makeUser(overrides: Partial<CloudUser> = {}): CloudUser {
  return {
    id: "user-1",
    username: "13800138000",
    usernameNormalized: "13800138000",
    nickname: "微信用户8000",
    authMethod: "wechat_phone",
    phone: "13800138000",
    role: "user",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function emptyDatasets(): UserDatasets {
  const stamp = "2026-01-01T00:00:00.000Z";
  return {
    learning: { type: "learning", payload: null, revision: 0, updatedAt: stamp },
    paper: { type: "paper", payload: null, revision: 0, updatedAt: stamp },
  };
}

function makeSession(user: CloudUser): CloudSessionPayload {
  return {
    token: "token-1",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user,
    datasets: emptyDatasets(),
  };
}

describe("cloud auth", () => {
  const storage = new Map<string, unknown>();

  beforeEach(() => {
    storage.clear();
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("uni", {
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: unknown) => {
        storage.set(key, value);
      },
      removeStorageSync: (key: string) => {
        storage.delete(key);
      },
    });
  });

  it("creates a cloud session for verified phone login", async () => {
    const user = makeUser();
    userDataApi.phoneLogin.mockResolvedValue(makeSession(user));

    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const result = await auth.phoneLogin({ code: "wx-code-1" });

    expect(result?.authMethod).toBe("wechat_phone");
    expect(result?.phone).toBe("13800138000");
    expect(auth.isLoggedIn.value).toBe(true);
    expect(auth.accountIdentifier.value).toBe("138****8000");
    expect(auth.state.currentUser?.role).toBe("user");
  });

  it("propagates login failures as localized errors", async () => {
    userDataApi.phoneLogin.mockRejectedValue(
      new Error("该账户已被管理员禁用"),
    );

    const { useAuth } = await import("./useAuth");
    const auth = useAuth();

    await expect(auth.phoneLogin({ code: "wx-code-1" })).rejects.toThrow(
      "该账户已被管理员禁用",
    );
    expect(auth.isLoggedIn.value).toBe(false);
  });

  it("registers a local account and stores a session", async () => {
    const user = makeUser({
      id: "user-2",
      username: "trader",
      usernameNormalized: "trader",
      authMethod: "local",
      phone: undefined,
      nickname: "Trader",
    });
    userDataApi.register.mockResolvedValue(makeSession(user));

    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const result = await auth.register({
      username: "trader",
      password: "secret",
      nickname: "Trader",
    });

    expect(result?.username).toBe("trader");
    expect(auth.accountIdentifier.value).toBe("@trader");
  });

  it("restore applies a persisted session and hydrates datasets", async () => {
    const user = makeUser();
    const { writeSession } = await import("../services/session");
    writeSession({
      token: "token-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user,
    });
    userDataApi.restore.mockResolvedValue({
      user,
      datasets: emptyDatasets(),
    });

    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    const restored = await auth.restore();

    expect(restored?.id).toBe("user-1");
    expect(auth.isLoggedIn.value).toBe(true);
  });

  it("admin can change role and status through cloud operations", async () => {
    const admin = makeUser({
      id: "admin-1",
      username: "admin",
      usernameNormalized: "admin",
      role: "admin",
      authMethod: "local",
      phone: undefined,
      nickname: "Admin",
    });
    userDataApi.login.mockResolvedValue(makeSession(admin));
    userDataApi.setUserRole.mockResolvedValue({
      userId: "user-1",
      role: "admin",
    });
    userDataApi.setUserStatus.mockResolvedValue({
      userId: "user-1",
      status: "disabled",
    });

    const { useAuth } = await import("./useAuth");
    const auth = useAuth();
    await auth.login("admin", "secret");
    expect(auth.isAdmin.value).toBe(true);

    await auth.setUserRole("user-1", "admin");
    expect(userDataApi.setUserRole).toHaveBeenCalledWith(
      "token-1",
      "user-1",
      "admin",
    );

    await auth.setUserStatus("user-1", "disabled");
    expect(userDataApi.setUserStatus).toHaveBeenCalledWith(
      "token-1",
      "user-1",
      "disabled",
    );
  });
});
