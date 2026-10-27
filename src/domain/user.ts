export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type RiskLevel = "C2" | "C3" | "C4";
export type AppLanguage = "en" | "zh-CN";
export type UserRole = "user" | "admin";
export type UserStatus = "active" | "disabled";
export type UserDatasetType = "learning" | "paper";

export interface UserPreferences {
  nickname: string;
  experience: ExperienceLevel;
  riskLevel: RiskLevel;
  defaultStrategyId: string;
  defaultOrderQuantity: number;
  language: AppLanguage;
  updatedAt: string;
}

export interface CloudUser {
  id: string;
  username: string;
  usernameNormalized: string;
  nickname: string;
  authMethod?: "local" | "wechat_phone";
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  preferences?: UserPreferences;
}

/** @deprecated Use CloudUser. Kept while older settings migrate. */
export type LocalUserRecord = CloudUser;

export interface CloudSession {
  token: string;
  expiresAt: string;
  user: CloudUser;
}

export interface UserDataset<T = unknown> {
  type: UserDatasetType;
  payload: T | null;
  revision: number;
  updatedAt: string | null;
}

export type UserDatasets = Record<UserDatasetType, UserDataset>;

export function maskPhone(phone?: string) {
  if (!phone || phone.length < 7) return "";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "期权新手",
  intermediate: "有基础",
  advanced: "进阶交易者",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  C2: "C2 · 稳健型",
  C3: "C3 · 平衡型",
  C4: "C4 · 积极型",
};

export function defaultPreferences(nickname: string): UserPreferences {
  return {
    nickname,
    experience: "beginner",
    riskLevel: "C3",
    defaultStrategyId: "bull-call-spread",
    defaultOrderQuantity: 1,
    language: "en",
    updatedAt: new Date().toISOString(),
  };
}
