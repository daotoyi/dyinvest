import { computed, reactive } from "vue";
import { lessons } from "../data/lessons";

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

function persist() {
  uni.setStorageSync(STORAGE_KEY, [...state.completedIds]);
}

export function useLearningProgress() {
  const completedCount = computed(() => state.completedIds.length);
  const progress = computed(() =>
    Math.min(completedCount.value / lessons.length, 1),
  );

  function isCompleted(id: string) {
    return state.completedIds.includes(id);
  }

  function complete(id: string) {
    if (!state.completedIds.includes(id)) {
      state.completedIds.push(id);
      persist();
    }
  }

  function reset() {
    state.completedIds.splice(0);
    persist();
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
