export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type RiskLevel = "C2" | "C3" | "C4";

export interface UserPreferences {
  nickname: string;
  experience: ExperienceLevel;
  riskLevel: RiskLevel;
  defaultStrategyId: string;
  defaultOrderQuantity: number;
  updatedAt: string;
}

export interface LocalUserRecord {
  id: string;
  username: string;
  usernameNormalized: string;
  nickname: string;
  authMethod?: "local" | "wechat_phone";
  phone?: string;
  role?: "user" | "admin";
  status?: "active" | "disabled";
  salt: string;
  passwordHash: string;
  hashIterations: number;
  createdAt: string;
}

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
    updatedAt: new Date().toISOString(),
  };
}
