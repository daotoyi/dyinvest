<script setup lang="ts">
import { computed, ref } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";
import { lessons } from "../../data/lessons";
import { useLearningProgress } from "../../composables/useLearningProgress";
import { useContentSettings } from "../../composables/useContentSettings";

const { completedCount, progress, isCompleted } = useLearningProgress();
const { visibleLessons, isLessonEnabled } = useContentSettings();
const filter = ref<"全部" | "基础" | "进阶">("全部");
const filters: Array<"全部" | "基础" | "进阶"> = ["全部", "基础", "进阶"];

const filteredLessons = computed(() =>
  filter.value === "全部"
    ? visibleLessons.value
    : visibleLessons.value.filter((lesson) => lesson.level === filter.value),
);
const nextLesson = computed(
  () =>
    visibleLessons.value.find((lesson) => !isCompleted(lesson.id)) ??
    visibleLessons.value[0],
);
const foundationProgress = computed(() => {
  const group = visibleLessons.value.filter((lesson) => lesson.level === "基础");
  return group.length
    ? group.filter((lesson) => isCompleted(lesson.id)).length / group.length
    : 0;
});
const advancedProgress = computed(() => {
  const group = visibleLessons.value.filter((lesson) => lesson.level === "进阶");
  return group.length
    ? group.filter((lesson) => isCompleted(lesson.id)).length / group.length
    : 0;
});

function openLesson(id: string) {
  uni.navigateTo({ url: `/pages/lesson/index?id=${id}` });
}
</script>

<template>
  <AppShell>
    <view class="page-canvas">
      <view class="page-content">
        <PageHeader
          title="学习"
          eyebrow="从合约入门到组合风险"
          subtitle="用可交互的损益图和情景分析，把概念变成判断。"
        >
          <template #action>
            <view class="learn-header-count">
              <text class="mono">{{ completedCount }}</text>
              <text>/ {{ visibleLessons.length }} 课</text>
            </view>
          </template>
        </PageHeader>

        <view class="course-progress">
          <view class="course-progress__main">
            <view class="course-progress__copy">
              <text class="eyebrow">Overall progress</text>
              <text class="course-progress__title">期权基础与策略路径</text>
              <text class="course-progress__desc">
                当前建议从「{{ nextLesson?.title }}」继续。
              </text>
            </view>
            <button
              class="button-primary"
              @tap="nextLesson && openLesson(nextLesson.id)"
            >
              <AppIcon name="play" :size="15" color="#ffffff" />
              <text>继续学习</text>
            </button>
          </view>
          <view class="course-progress__bar">
            <view
              class="course-progress__bar-value"
              :style="{ width: `${progress * 100}%` }"
            />
          </view>
          <view class="course-progress__stats">
            <view class="progress-stat">
              <text class="progress-stat__label">完成进度</text>
              <text class="progress-stat__value mono">{{ Math.round(progress * 100) }}%</text>
            </view>
            <view class="progress-stat">
              <text class="progress-stat__label">基础课程</text>
              <text class="progress-stat__value mono">{{ Math.round(foundationProgress * 100) }}%</text>
            </view>
            <view class="progress-stat">
              <text class="progress-stat__label">进阶课程</text>
              <text class="progress-stat__value mono">{{ Math.round(advancedProgress * 100) }}%</text>
            </view>
            <view class="progress-stat progress-stat--hint">
              <text class="progress-stat__label">学习建议</text>
              <text class="progress-stat__value">先完成风险指标</text>
            </view>
          </view>
        </view>

        <view class="lesson-toolbar">
          <view class="section-heading lesson-toolbar__heading">
            <view class="section-heading__copy">
              <text class="section-heading__title">课程目录</text>
              <text class="section-heading__meta">{{ filteredLessons.length }} 节 · 约 {{ visibleLessons.reduce((sum, item) => sum + item.minutes, 0) }} 分钟</text>
            </view>
          </view>
          <view class="segmented">
            <button
              v-for="item in filters"
              :key="item"
              class="segmented__item"
              :class="{ 'segmented__item--active': filter === item }"
              @tap="filter = item"
            >
              {{ item }}
            </button>
          </view>
        </view>

        <view class="lesson-list">
          <button
            v-for="(lesson, index) in filteredLessons"
            :key="lesson.id"
            class="lesson-card card"
            :class="{ 'lesson-card--done': isCompleted(lesson.id) }"
            @tap="openLesson(lesson.id)"
          >
            <view class="lesson-card__index mono">
              {{ String(lessons.findIndex((item) => item.id === lesson.id) + 1).padStart(2, "0") }}
            </view>
            <view class="lesson-card__body">
              <view class="lesson-card__meta">
                <text>{{ lesson.chapter }}</text>
                <view class="lesson-card__meta-dot" />
                <text>{{ lesson.level }}</text>
              </view>
              <text class="lesson-card__title">{{ lesson.title }}</text>
              <text class="lesson-card__summary">{{ lesson.summary }}</text>
            </view>
            <view class="lesson-card__side">
              <view
                class="lesson-card__status"
                :class="{ 'lesson-card__status--done': isCompleted(lesson.id) }"
              >
                <AppIcon
                  :name="isCompleted(lesson.id) ? 'check' : lesson.icon"
                  :size="14"
                  :color="isCompleted(lesson.id) ? '#0e6f5c' : '#52605c'"
                />
              </view>
              <view class="lesson-card__duration">
                <AppIcon name="clock" :size="12" color="#7b8783" />
                <text>{{ lesson.minutes }} 分钟</text>
              </view>
              <view class="lesson-card__action">
                <text>{{ isCompleted(lesson.id) ? "复习" : index === 0 && filteredLessons.length > 1 ? "继续" : "学习" }}</text>
                <AppIcon name="arrowRight" :size="14" color="#0e6f5c" />
              </view>
            </view>
          </button>
        </view>

        <view class="learn-note">
          <view class="learn-note__icon">
            <AppIcon name="shield" :size="20" color="#946617" />
          </view>
          <view class="learn-note__copy">
            <text class="learn-note__title">学习内容不构成投资建议</text>
            <text class="learn-note__desc">
              示例行情与收益均为演示数据，实际交易前请阅读交易所规则和券商风险揭示。
            </text>
          </view>
          <button
            v-if="isLessonEnabled('margin-risk')"
            class="button-quiet"
            @tap="openLesson('margin-risk')"
          >
            <text>查看风险课</text>
            <AppIcon name="chevronRight" :size="14" color="#946617" />
          </button>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.learn-header-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--muted);
  font-size: 11px;
}

.learn-header-count .mono {
  color: var(--ink);
  font-size: 19px;
  font-weight: 700;
}

.course-progress {
  padding: 18px 20px;
  border: 1px solid #cfded9;
  border-radius: 8px;
  background: #edf5f2;
}

.course-progress__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.course-progress__copy {
  display: flex;
  flex-direction: column;
}

.course-progress__title {
  margin-top: 4px;
  color: var(--ink);
  font-size: 19px;
  font-weight: 750;
}

.course-progress__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.course-progress__bar {
  height: 5px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 3px;
  background: rgba(14, 111, 92, 0.12);
}

.course-progress__bar-value {
  height: 100%;
  border-radius: 3px;
  background: var(--teal);
  transition: width 300ms ease;
}

.course-progress__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 13px;
}

.progress-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 12px;
  border-right: 1px solid rgba(14, 111, 92, 0.12);
}

.progress-stat:last-child {
  border-right: 0;
}

.progress-stat__label {
  color: var(--muted);
  font-size: 9px;
}

.progress-stat__value {
  color: var(--ink);
  font-size: 14px;
  font-weight: 650;
}

.progress-stat--hint .progress-stat__value {
  font-size: 11px;
}

.lesson-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-top: 22px;
}

.lesson-toolbar__heading {
  margin-bottom: 0;
}

.lesson-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 12px;
}

.lesson-card {
  display: grid;
  min-height: 108px;
  grid-template-columns: 30px minmax(0, 1fr) 66px;
  align-items: center;
  gap: 11px;
  padding: 13px 14px;
  text-align: left;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.lesson-card:active {
  transform: translateY(1px);
  border-color: var(--line-strong);
}

.lesson-card__index {
  align-self: start;
  padding-top: 2px;
  color: var(--muted-light);
  font-size: 10px;
  font-weight: 650;
}

.lesson-card__status {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--surface-soft);
}

.lesson-card__status--done {
  background: var(--teal-wash);
}

.lesson-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.lesson-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-light);
  font-size: 9px;
  font-weight: 650;
}

.lesson-card__meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--line-strong);
}

.lesson-card__title {
  margin-top: 4px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 720;
  line-height: 1.3;
}

.lesson-card__summary {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.lesson-card__side {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 6px;
}

.lesson-card__duration,
.lesson-card__action {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 9px;
  white-space: nowrap;
}

.lesson-card__action {
  color: var(--teal);
  font-weight: 700;
}

.lesson-card--done {
  background: #fbfdfc;
}

.learn-note {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 18px;
  padding: 15px 17px;
  border: 1px solid #e8dabf;
  border-radius: 8px;
  background: #fdf9f1;
}

.learn-note__icon {
  display: flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--amber-wash);
}

.learn-note__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.learn-note__title {
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.learn-note__desc {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

@media (max-width: 900px) {
  .course-progress {
    padding: 16px;
  }

  .course-progress__main {
    align-items: flex-start;
  }

  .course-progress__title {
    font-size: 18px;
  }

  .course-progress__desc {
    max-width: 220px;
  }

  .course-progress__stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .progress-stat--hint {
    display: none;
  }

  .lesson-toolbar {
    align-items: flex-start;
    margin-top: 20px;
  }

  .lesson-toolbar .segmented {
    flex: 0 0 auto;
  }

  .segmented__item {
    padding: 0 9px;
  }

  .lesson-list {
    grid-template-columns: 1fr;
  }

  .lesson-card {
    min-height: 100px;
    grid-template-columns: 26px minmax(0, 1fr) 62px;
    padding: 12px;
  }

  .learn-note {
    align-items: flex-start;
  }

  .learn-note .button-quiet {
    display: none;
  }
}
</style>
