import type { LocalUserRecord } from "../domain/user";

// The seeded password is intentionally absent from source control. Change the
// hash through a dedicated account migration before exposing this demo admin.
export const DEFAULT_ADMIN_ID = "u_default_admin";
export const DEFAULT_ADMIN_USERNAME = "admin";
export const DEFAULT_ADMIN_PASSWORD_SALT =
  "768fa0b600e96c80c040e98e9b2ee222";
export const DEFAULT_ADMIN_PASSWORD_HASH =
  "b8c5cfec92c411431fc02b08d70159c8e7cb7bee93c18c1277340e803bf043ef";
export const DEFAULT_ADMIN_HASH_ITERATIONS = 60000;

export function createDefaultAdminRecord(): LocalUserRecord {
  return {
    id: DEFAULT_ADMIN_ID,
    username: DEFAULT_ADMIN_USERNAME,
    usernameNormalized: DEFAULT_ADMIN_USERNAME,
    nickname: "系统管理员",
    authMethod: "local",
    role: "admin",
    status: "active",
    salt: DEFAULT_ADMIN_PASSWORD_SALT,
    passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
    hashIterations: DEFAULT_ADMIN_HASH_ITERATIONS,
    createdAt: "2026-10-25T00:00:00.000Z",
  };
}
