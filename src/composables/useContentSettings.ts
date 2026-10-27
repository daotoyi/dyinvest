import { computed, reactive, watch } from "vue";
import { lessons } from "../data/lessons";
import { strategyTemplates } from "../data/strategies";
import { currentSessionToken } from "../services/session";
import { userDataApi } from "../services/userData";

const STORAGE_KEY = "options-lab-content-settings-v1";

export interface AnnouncementSettings {
  enabled: boolean;
  title: string;
  text: string;
  updatedAt: string;
}

interface ContentSettingsState {
  disabledLessonIds: string[];
  disabledStrategyIds: string[];
  announcement: AnnouncementSettings;
}

function defaultAnnouncement(): AnnouncementSettings {
  return {
    enabled: false,
    title: "模拟环境说明",
    text: "当前行情、策略和收益均为演示数据，不构成投资建议。",
    updatedAt: new Date().toISOString(),
  };
}

function createDefaultState(): ContentSettingsState {
  return {
    disabledLessonIds: [],
    disabledStrategyIds: [],
    announcement: defaultAnnouncement(),
  };
}

function loadState(): ContentSettingsState {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY) as
      | Partial<ContentSettingsState>
      | null;
    if (!saved || typeof saved !== "object") return createDefaultState();
    return {
      disabledLessonIds: Array.isArray(saved.disabledLessonIds)
        ? saved.disabledLessonIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      disabledStrategyIds: Array.isArray(saved.disabledStrategyIds)
        ? saved.disabledStrategyIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      announcement: {
        ...defaultAnnouncement(),
        ...(saved.announcement ?? {}),
      },
    };
  } catch {
    return createDefaultState();
  }
}

const state = reactive<ContentSettingsState>(loadState());
let contentRevision = 1;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let applyingCloudContent = false;

watch(
  state,
  (value) => {
    uni.setStorageSync(STORAGE_KEY, JSON.parse(JSON.stringify(value)));
  },
  { deep: true, immediate: true },
);

function contentSnapshot(): ContentSettingsState {
  return JSON.parse(JSON.stringify(state)) as ContentSettingsState;
}

function applyCloudPayload(
  payload: NonNullable<Awaited<ReturnType<typeof userDataApi.getContent>>["payload"]>,
  revision: number,
) {
  applyingCloudContent = true;
  contentRevision = revision;
  state.disabledLessonIds.splice(
    0,
    state.disabledLessonIds.length,
    ...payload.disabledLessonIds,
  );
  state.disabledStrategyIds.splice(
    0,
    state.disabledStrategyIds.length,
    ...payload.disabledStrategyIds,
  );
  state.announcement = {
    ...defaultAnnouncement(),
    ...payload.announcement,
  };
  setTimeout(() => {
    applyingCloudContent = false;
  }, 0);
}

async function loadContent() {
  try {
    const result = await userDataApi.getContent();
    if (result.payload) applyCloudPayload(result.payload, result.revision);
    return result.payload;
  } catch {
    return null;
  }
}

async function syncContent() {
  const token = currentSessionToken();
  if (!token || applyingCloudContent) return null;
  try {
    const result = await userDataApi.pushContent(
      token,
      contentSnapshot(),
      contentRevision,
    );
    if (result.conflict && result.current) {
      if (result.current.payload) {
        applyCloudPayload(result.current.payload, result.current.revision);
      }
      return result.current;
    }
    if (result.dataset) contentRevision = result.dataset.revision;
    return result.dataset ?? null;
  } catch {
    return null;
  }
}

function scheduleSync(delay = 500) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncContent();
  }, delay);
}

const visibleLessons = computed(() =>
  lessons.filter((lesson) => !state.disabledLessonIds.includes(lesson.id)),
);
const visibleStrategies = computed(() =>
  strategyTemplates.filter(
    (strategy) => !state.disabledStrategyIds.includes(strategy.id),
  ),
);

function isLessonEnabled(id: string) {
  return !state.disabledLessonIds.includes(id);
}

function isStrategyEnabled(id: string) {
  return !state.disabledStrategyIds.includes(id);
}

function setLessonEnabled(id: string, enabled: boolean) {
  const index = state.disabledLessonIds.indexOf(id);
  if (enabled && index >= 0) state.disabledLessonIds.splice(index, 1);
  if (!enabled && index < 0) state.disabledLessonIds.push(id);
  scheduleSync();
}

function setStrategyEnabled(id: string, enabled: boolean) {
  const index = state.disabledStrategyIds.indexOf(id);
  if (enabled && index >= 0) state.disabledStrategyIds.splice(index, 1);
  if (!enabled && index < 0) state.disabledStrategyIds.push(id);
  scheduleSync();
}

function saveAnnouncement(input: Omit<AnnouncementSettings, "updatedAt">) {
  state.announcement = {
    ...input,
    title: input.title.trim().slice(0, 40),
    text: input.text.trim().slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
  scheduleSync();
}

function resetContentSettings() {
  Object.assign(state, createDefaultState());
  scheduleSync();
}

export function useContentSettings() {
  return {
    state,
    visibleLessons,
    visibleStrategies,
    isLessonEnabled,
    isStrategyEnabled,
    setLessonEnabled,
    setStrategyEnabled,
    saveAnnouncement,
    resetContentSettings,
    loadContent,
    syncContent,
  };
}
