import type { CloudSession, CloudUser } from "../domain/user";

const SESSION_KEY = "options-lab-cloud-session-v2";

export interface StoredSession {
  token: string;
  expiresAt: string;
  user: CloudUser;
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredSession>;
  return (
    typeof session.token === "string" &&
    typeof session.expiresAt === "string" &&
    Boolean(session.user) &&
    typeof session.user === "object"
  );
}

export function readSession(): StoredSession | null {
  try {
    const stored = uni.getStorageSync(SESSION_KEY) as unknown;
    if (!isStoredSession(stored)) return null;
    if (Date.parse(stored.expiresAt) <= Date.now()) return null;
    return stored;
  } catch {
    return null;
  }
}

export function writeSession(session: CloudSession | StoredSession | null) {
  try {
    if (!session) {
      uni.removeStorageSync(SESSION_KEY);
      return;
    }
    uni.setStorageSync(SESSION_KEY, session);
  } catch {
    // The current operation reports storage failures to the caller.
  }
}

export function currentSessionToken() {
  return readSession()?.token ?? "";
}
