import { computed, reactive, watch } from "vue";
import { lessons } from "../data/lessons";
import { strategyTemplates } from "../data/strategies";

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

watch(
  state,
  (value) => {
    uni.setStorageSync(STORAGE_KEY, JSON.parse(JSON.stringify(value)));
  },
  { deep: true, immediate: true },
);

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
}

function setStrategyEnabled(id: string, enabled: boolean) {
  const index = state.disabledStrategyIds.indexOf(id);
  if (enabled && index >= 0) state.disabledStrategyIds.splice(index, 1);
  if (!enabled && index < 0) state.disabledStrategyIds.push(id);
}

function saveAnnouncement(input: Omit<AnnouncementSettings, "updatedAt">) {
  state.announcement = {
    ...input,
    title: input.title.trim().slice(0, 40),
    text: input.text.trim().slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
}

function resetContentSettings() {
  Object.assign(state, createDefaultState());
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
  };
}
