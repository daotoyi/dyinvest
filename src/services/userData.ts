import type {
  AppLanguage,
  CloudSession,
  CloudUser,
  UserDataset,
  UserDatasetType,
  UserDatasets,
  UserPreferences,
  UserRole,
  UserStatus,
} from "../domain/user";
import { callCloud } from "./cloudClient";

export interface CloudSessionPayload {
  token: string;
  expiresAt: string;
  user: CloudUser;
  datasets: UserDatasets;
}

export interface RegisterInput {
  username: string;
  password: string;
  nickname: string;
  language: AppLanguage;
}

export interface PhoneLoginInput {
  code?: string;
  phoneNumber?: string;
  language: AppLanguage;
  token?: string;
}

export interface PullPayload {
  user: CloudUser;
  datasets: UserDatasets;
}

export interface PushPayload {
  conflict: boolean;
  dataset?: UserDataset;
  current?: UserDataset;
}

export interface ContentSettingsPayload {
  payload: {
    disabledLessonIds: string[];
    disabledStrategyIds: string[];
    announcement: {
      enabled: boolean;
      title: string;
      text: string;
      updatedAt?: string;
    };
  } | null;
  revision: number;
  updatedAt: string | null;
}

export interface ContentPushPayload {
  conflict: boolean;
  dataset?: ContentSettingsPayload;
  current?: ContentSettingsPayload;
}

export const userDataApi = {
  register(input: RegisterInput) {
    return callCloud<CloudSessionPayload>("register", input);
  },
  login(username: string, password: string) {
    return callCloud<CloudSessionPayload>("login", { username, password });
  },
  phoneLogin(input: PhoneLoginInput) {
    return callCloud<CloudSessionPayload>("phoneLogin", input);
  },
  restore(token: string) {
    return callCloud<PullPayload>("restore", { token });
  },
  logout(token: string) {
    return callCloud<{ loggedOut: boolean }>("logout", { token });
  },
  updatePreferences(token: string, preferences: UserPreferences) {
    return callCloud<{ user: CloudUser }>("updatePreferences", {
      token,
      preferences,
    });
  },
  pull(token: string) {
    return callCloud<PullPayload>("pull", { token });
  },
  push(
    token: string,
    type: UserDatasetType,
    payload: unknown,
    baseRevision: number,
  ) {
    return callCloud<PushPayload>("push", {
      token,
      type,
      payload,
      baseRevision,
    });
  },
  getContent() {
    return callCloud<ContentSettingsPayload>("getContent");
  },
  listUsers(token: string) {
    return callCloud<{ users: CloudUser[] }>("listUsers", { token });
  },
  setUserRole(token: string, userId: string, role: UserRole) {
    return callCloud<{ userId: string; role: UserRole }>("setUserRole", {
      token,
      userId,
      role,
    });
  },
  setUserStatus(token: string, userId: string, status: UserStatus) {
    return callCloud<{ userId: string; status: UserStatus }>("setUserStatus", {
      token,
      userId,
      status,
    });
  },
  pushContent(
    token: string,
    payload: ContentSettingsPayload["payload"],
    baseRevision: number,
  ) {
    return callCloud<ContentPushPayload>("pushContent", {
      token,
      payload,
      baseRevision,
    });
  },
};

export type { CloudSession };
