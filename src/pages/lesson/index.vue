<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PayoffChart from "../../components/PayoffChart.vue";
import PageHeader from "../../components/PageHeader.vue";
import { getLesson, lessons } from "../../data/lessons";
import { underlying } from "../../data/options";
import {
  buildStrategyLegs,
  calculateStrategyMetrics,
} from "../../data/strategies";
import { useLearningProgress } from "../../composables/useLearningProgress";
import { formatSignedMoney } from "../../domain/format";

const lessonId = ref("option-basics");
const selectedAnswer = ref<number | null>(null);
const scenarioPrice = ref(underlying.spot);
const { isCompleted, complete } = useLearningProgress();

onLoad((query) => {
  if (query?.id) lessonId.value = String(query.id);
});

const lesson = computed(() => getLesson(lessonId.value) ?? lessons[0]);
const lessonIndex = computed(() =>
  lessons.findIndex((item) => item.id === lesson.value?.id),
);
const previousLesson = computed(() =>
  lessonIndex.value > 0 ? lessons[lessonIndex.value - 1] : undefined,
);
const nextLesson = computed(() =>
  lessonIndex.value >= 0 && lessonIndex.value < lessons.length - 1
    ? lessons[lessonIndex.value + 1]
    : undefined,
);
const chartTemplate = computed(() => {
  if (lesson.value?.id === "margin-risk" || lesson.value?.id === "four-structures") {
    return "iron-condor";
  }
  if (lesson.value?.id === "spreads") return "bull-call-spread";
  if (lesson.value?.level === "进阶") return "long-straddle";
  return "long-call";
});
const chartLegs = computed(() => buildStrategyLegs(chartTemplate.value));
const chartMetrics = computed(() => calculateStrategyMetrics(chartLegs.value));
const scenarioPnl = computed(() => {
  const points = chartMetrics.value.expirySeries;
  return points.reduce((closest, point) =>
    Math.abs(point.price - scenarioPrice.value) <
    Math.abs(closest.price - scenarioPrice.value)
      ? point
      : closest,
  ).value;
});
const answeredCorrectly = computed(
  () =>
    selectedAnswer.value !== null &&
    selectedAnswer.value === lesson.value?.quiz.answer,
);

function openLesson(id: string) {
  uni.redirectTo({ url: `/pages/lesson/index?id=${id}` });
  selectedAnswer.value = null;
}

function markComplete() {
  if (!lesson.value) return;
  complete(lesson.value.id);
  uni.showToast({ title: "课程已完成", icon: "success" });
}
</script>

<template>
  <AppShell secondary>
    <view class="page-canvas page-canvas--secondary">
      <view class="page-content lesson-page">
        <PageHeader
          back
          :title="lesson?.title ?? '课程'"
          :eyebrow="lesson?.chapter"
          :subtitle="lesson?.summary"
        >
          <template #action>
            <view class="lesson-progress-chip">
              <AppIcon name="clock" :size="14" color="#6d7a76" />
              <text>{{ lesson?.minutes }} 分钟</text>
            </view>
          </template>
        </PageHeader>

        <view class="lesson-layout">
          <view class="lesson-main">
            <view class="lesson-keyidea">
              <view class="lesson-keyidea__mark">
                <AppIcon name="target" :size="21" color="#0e6f5c" />
              </view>
              <view class="lesson-keyidea__copy">
                <text class="eyebrow">Key idea</text>
                <text class="lesson-keyidea__text">{{ lesson?.keyIdea }}</text>
              </view>
            </view>

            <view class="lesson-article">
              <view
                v-for="(section, index) in lesson?.sections"
                :key="section.heading"
                class="lesson-section"
              >
                <view class="lesson-section__index mono">{{ String(index + 1).padStart(2, "0") }}</view>
                <view class="lesson-section__body">
                  <text class="lesson-section__heading">{{ section.heading }}</text>
                  <text
                    v-for="paragraph in section.body"
                    :key="paragraph"
                    class="lesson-section__paragraph"
                  >
                    {{ paragraph }}
                  </text>
                  <view v-if="section.formula" class="lesson-formula mono">
                    {{ section.formula }}
                  </view>
                  <view v-if="section.note" class="lesson-note">
                    <AppIcon name="alert" :size="16" color="#946617" />
                    <text>{{ section.note }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view class="lesson-lab">
              <view class="section-heading">
                <view class="section-heading__copy">
                  <text class="section-heading__title">把价格拖到不同位置</text>
                  <text class="section-heading__meta">观察到期损益，而不是只看当前权利金</text>
                </view>
                <view class="chip chip--teal">交互演示</view>
              </view>

              <view class="lesson-lab__chart">
                <PayoffChart
                  :expiry="chartMetrics.expirySeries"
                  :current="chartMetrics.currentSeries"
                  :spot="scenarioPrice"
                  :height="280"
                />
              </view>
              <view class="lesson-lab__control">
                <view class="lesson-lab__control-head">
                  <text>标的到期价格</text>
                  <text class="mono">{{ scenarioPrice.toFixed(3) }}</text>
                </view>
                <slider
                  :value="scenarioPrice"
                  :min="3.6"
                  :max="4.7"
                  :step="0.01"
                  active-color="#0e6f5c"
                  background-color="#dfe6e3"
                  block-color="#17211e"
                  :block-size="18"
                  @changing="scenarioPrice = Number($event.detail.value)"
                  @change="scenarioPrice = Number($event.detail.value)"
                />
                <view class="lesson-lab__result">
                  <text>该价格下的到期损益</text>
                  <text
                    class="mono"
                    :class="scenarioPnl >= 0 ? 'positive' : 'negative'"
                  >
                    {{ formatSignedMoney(scenarioPnl) }}
                  </text>
                </view>
                <text class="lesson-lab__disclaimer">
                  以一手示例组合计算，不含手续费、滑点与真实保证金变化。
                </text>
              </view>
            </view>

            <view class="lesson-quiz">
              <view class="lesson-quiz__head">
                <view>
                  <text class="eyebrow">Quick check</text>
                  <text class="lesson-quiz__title">用一道题确认理解</text>
                </view>
                <view class="chip">{{ selectedAnswer === null ? "未作答" : answeredCorrectly ? "回答正确" : "再想一想" }}</view>
              </view>
              <text class="lesson-quiz__question">{{ lesson?.quiz.question }}</text>
              <view class="lesson-quiz__options">
                <button
                  v-for="(option, index) in lesson?.quiz.options"
                  :key="option"
                  class="lesson-quiz__option"
                  :class="{
                    'lesson-quiz__option--selected': selectedAnswer === index,
                    'lesson-quiz__option--correct':
                      selectedAnswer !== null && index === lesson?.quiz.answer,
                  }"
                  @tap="selectedAnswer = index"
                >
                  <view class="lesson-quiz__bullet">
                    <text>{{ String.fromCharCode(65 + index) }}</text>
                  </view>
                  <text>{{ option }}</text>
                  <AppIcon
                    v-if="selectedAnswer !== null && index === lesson?.quiz.answer"
                    name="check"
                    :size="16"
                    color="#0e6f5c"
                  />
                </button>
              </view>
              <view v-if="selectedAnswer !== null" class="lesson-quiz__feedback">
                <AppIcon
                  :name="answeredCorrectly ? 'circleCheck' : 'info'"
                  :size="17"
                  :color="answeredCorrectly ? '#0e6f5c' : '#946617'"
                />
                <text>{{ lesson?.quiz.explanation }}</text>
              </view>
            </view>

            <view class="lesson-complete">
              <view>
                <text class="lesson-complete__title">
                  {{ isCompleted(lesson?.id ?? "") ? "这节课已经完成" : "完成本课并记录进度" }}
                </text>
                <text class="lesson-complete__desc">
                  完成状态保存在当前设备，可在「我的」中查看。
                </text>
              </view>
              <button
                class="button-primary"
                :class="{ 'button-primary--teal': isCompleted(lesson?.id ?? '') }"
                @tap="markComplete"
              >
                <AppIcon name="check" :size="16" color="#ffffff" />
                <text>{{ isCompleted(lesson?.id ?? "") ? "已完成" : "完成课程" }}</text>
              </button>
            </view>

            <view class="lesson-pagination">
              <button
                v-if="previousLesson"
                class="lesson-pagination__item"
                @tap="openLesson(previousLesson.id)"
              >
                <AppIcon name="arrowLeft" :size="17" color="#52605c" />
                <view>
                  <text class="lesson-pagination__label">上一课</text>
                  <text class="lesson-pagination__title">{{ previousLesson.title }}</text>
                </view>
              </button>
              <view v-else />
              <button
                v-if="nextLesson"
                class="lesson-pagination__item lesson-pagination__item--next"
                @tap="openLesson(nextLesson.id)"
              >
                <view>
                  <text class="lesson-pagination__label">下一课</text>
                  <text class="lesson-pagination__title">{{ nextLesson.title }}</text>
                </view>
                <AppIcon name="arrowRight" :size="17" color="#52605c" />
              </button>
            </view>
          </view>

          <view class="lesson-aside">
            <view class="aside-card card">
              <text class="aside-card__label">本课要点</text>
              <view class="aside-points">
                <view class="aside-point">
                  <view class="aside-point__dot" />
                  <text>合约方向、行权价和到期日共同决定风险。</text>
                </view>
                <view class="aside-point">
                  <view class="aside-point__dot" />
                  <text>方向正确不代表一定盈利，时间和波动率同样重要。</text>
                </view>
                <view class="aside-point">
                  <view class="aside-point__dot" />
                  <text>先看最大亏损，再比较潜在收益。</text>
                </view>
              </view>
            </view>

            <view class="aside-card card aside-card--risk">
              <view class="aside-risk__head">
                <AppIcon name="shield" :size="18" color="#946617" />
                <text>风险提示</text>
              </view>
              <text class="aside-risk__text">
                本课程与图表均为教育演示，不构成针对任何人的交易建议。期权可能损失全部权利金。
              </text>
            </view>

            <view class="aside-card card">
              <text class="aside-card__label">学习进度</text>
              <view class="aside-progress">
                <view class="aside-progress__copy">
                  <text class="mono">{{ lessonIndex + 1 }} / {{ lessons.length }}</text>
                  <text>{{ lesson?.level }}课程</text>
                </view>
                <view class="aside-progress__track">
                  <view
                    class="aside-progress__value"
                    :style="{ width: `${((lessonIndex + 1) / lessons.length) * 100}%` }"
                  />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.lesson-progress-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--muted);
  font-size: 10px;
}

.lesson-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 32px;
  align-items: start;
}

.lesson-main {
  min-width: 0;
}

.lesson-keyidea {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 18px 20px;
  border-left: 3px solid var(--teal);
  background: var(--teal-wash);
}

.lesson-keyidea__mark {
  display: flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.74);
}

.lesson-keyidea__copy {
  display: flex;
  flex-direction: column;
}

.lesson-keyidea__text {
  margin-top: 5px;
  color: #21483f;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.55;
}

.lesson-article {
  padding: 8px 0;
}

.lesson-section {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 16px;
  padding: 27px 0;
  border-bottom: 1px solid var(--line);
}

.lesson-section__index {
  padding-top: 3px;
  color: var(--muted-light);
  font-size: 11px;
}

.lesson-section__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.lesson-section__heading {
  color: var(--ink);
  font-size: 20px;
  font-weight: 730;
  line-height: 1.35;
}

.lesson-section__paragraph {
  margin-top: 13px;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.95;
}

.lesson-formula {
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  color: #315f54;
  font-size: 12px;
  line-height: 1.7;
}

.lesson-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 18px;
  padding: 13px 14px;
  border: 1px solid #ead8b5;
  border-radius: 7px;
  background: #fdf9f1;
  color: #6e571f;
  font-size: 12px;
  line-height: 1.6;
}

.lesson-note .app-icon {
  margin-top: 1px;
}

.lesson-lab {
  margin-top: 26px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.lesson-lab__chart {
  margin: 8px -6px 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.lesson-lab__control {
  margin-top: 10px;
  padding: 0 8px;
}

.lesson-lab__control-head,
.lesson-lab__result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--muted);
  font-size: 10px;
}

.lesson-lab__control-head .mono {
  color: var(--ink);
  font-size: 13px;
  font-weight: 650;
}

.lesson-lab__result {
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.lesson-lab__result .mono {
  font-size: 13px;
  font-weight: 650;
}

.lesson-lab__disclaimer {
  display: block;
  margin-top: 8px;
  color: var(--muted-light);
  font-size: 9px;
  text-align: right;
}

.lesson-quiz {
  margin-top: 26px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.lesson-quiz__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.lesson-quiz__title {
  display: block;
  margin-top: 4px;
  color: var(--ink);
  font-size: 18px;
  font-weight: 730;
}

.lesson-quiz__question {
  display: block;
  margin-top: 18px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 650;
}

.lesson-quiz__options {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 12px;
}

.lesson-quiz__option {
  display: flex;
  min-height: 47px;
  align-items: center;
  gap: 11px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fbfcfb;
  color: var(--ink-soft);
  font-size: 12px;
  text-align: left;
}

.lesson-quiz__option--selected {
  border-color: var(--line-strong);
  background: var(--surface);
}

.lesson-quiz__option--correct {
  border-color: #b9d9cf;
  background: var(--teal-wash);
  color: #1f5145;
}

.lesson-quiz__bullet {
  display: flex;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
}

.lesson-quiz__option > text:nth-child(2) {
  flex: 1;
}

.lesson-quiz__feedback {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 11px 12px;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.55;
}

.lesson-complete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 22px;
  padding: 20px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.lesson-complete__title {
  display: block;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
}

.lesson-complete__desc {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

.lesson-pagination {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.lesson-pagination__item {
  display: flex;
  max-width: 48%;
  align-items: center;
  gap: 10px;
  padding: 10px;
  color: var(--ink-soft);
  text-align: left;
}

.lesson-pagination__item--next {
  text-align: right;
}

.lesson-pagination__label {
  display: block;
  color: var(--muted-light);
  font-size: 9px;
}

.lesson-pagination__title {
  display: block;
  margin-top: 2px;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 650;
}

.lesson-aside {
  position: sticky;
  top: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aside-card {
  padding: 17px;
}

.aside-card__label {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.aside-points {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 15px;
}

.aside-point {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.55;
}

.aside-point__dot {
  width: 4px;
  height: 4px;
  flex: 0 0 auto;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--teal);
}

.aside-card--risk {
  border-color: #e8dabf;
  background: #fdf9f1;
}

.aside-risk__head {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #71551d;
  font-size: 11px;
  font-weight: 700;
}

.aside-risk__text {
  display: block;
  margin-top: 10px;
  color: #826b3d;
  font-size: 10px;
  line-height: 1.65;
}

.aside-progress {
  margin-top: 13px;
}

.aside-progress__copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 9px;
}

.aside-progress__copy .mono {
  color: var(--ink);
  font-size: 11px;
}

.aside-progress__track {
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--surface-soft);
}

.aside-progress__value {
  height: 100%;
  border-radius: 2px;
  background: var(--teal);
}

@media (max-width: 1000px) {
  .lesson-layout {
    grid-template-columns: minmax(0, 1fr) 230px;
    gap: 22px;
  }
}

@media (max-width: 900px) {
  .lesson-progress-chip {
    display: none;
  }

  .lesson-layout {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lesson-keyidea {
    padding: 15px;
  }

  .lesson-keyidea__text {
    font-size: 13px;
  }

  .lesson-section {
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 8px;
    padding: 22px 0;
  }

  .lesson-section__heading {
    font-size: 18px;
  }

  .lesson-section__paragraph {
    font-size: 13px;
    line-height: 1.9;
  }

  .lesson-lab,
  .lesson-quiz {
    padding: 16px;
  }

  .lesson-lab__chart {
    margin: 8px -10px 0;
  }

  .lesson-complete {
    align-items: flex-start;
    padding: 18px 0;
  }

  .lesson-complete .button-primary {
    flex: 0 0 auto;
  }

  .lesson-pagination__item {
    max-width: 48%;
    padding: 8px 0;
  }

  .lesson-aside {
    position: static;
    width: 100%;
  }

  .aside-card:nth-child(3) {
    display: none;
  }
}
</style>
