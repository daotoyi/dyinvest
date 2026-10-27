import { computed, reactive, watch } from "vue";
import { useContentSettings } from "./useContentSettings";
import {
  pushUserDataset,
  registerDatasetHandler,
} from "../services/userDataSync";

const STORAGE_KEY = "options-lab-learning-v1";

function loadCompleted() {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY) as unknown;
    return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const state = reactive({
  completedIds: loadCompleted(),
});
let applyingCloudState = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
const { visibleLessons } = useContentSettings();

function persist() {
  try {
    uni.setStorageSync(STORAGE_KEY, [...state.completedIds]);
  } catch {
    // The cloud copy remains authoritative when local storage is unavailable.
  }
}

function scheduleCloudPush(delay = 600) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushUserDataset("learning", [...state.completedIds]).catch(() => undefined);
  }, delay);
}

watch(
  () => [...state.completedIds],
  () => {
    persist();
    if (!applyingCloudState) scheduleCloudPush();
  },
  { flush: "sync" },
);

registerDatasetHandler("learning", (payload) => {
  applyingCloudState = true;
  if (Array.isArray(payload)) {
    const next = payload.filter(
      (item): item is string => typeof item === "string",
    );
    state.completedIds.splice(0, state.completedIds.length, ...next);
  }
  persist();
  setTimeout(() => {
    applyingCloudState = false;
    if (payload === null) scheduleCloudPush(0);
  }, 0);
});

export function useLearningProgress() {
  const completedCount = computed(() => state.completedIds.length);
  const progress = computed(() =>
    visibleLessons.value.length > 0
      ? Math.min(completedCount.value / visibleLessons.value.length, 1)
      : 0,
  );

  function isCompleted(id: string) {
    return state.completedIds.includes(id);
  }

  function complete(id: string) {
    if (!state.completedIds.includes(id)) {
      state.completedIds.push(id);
    }
  }

  function reset() {
    state.completedIds.splice(0);
  }

  return {
    completedIds: computed(() => state.completedIds),
    completedCount,
    progress,
    isCompleted,
    complete,
    reset,
  };
}
