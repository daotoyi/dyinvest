<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import MiniLineChart from "../../components/MiniLineChart.vue";
import {
  DEMO_SNAPSHOT_LABEL,
  optionDisplayName,
  overviewQuotes,
  underlying,
} from "../../data/options";
import { lessons } from "../../data/lessons";
import {
  buildStrategyLegs,
  calculateStrategyMetrics,
} from "../../data/strategies";
import { useLearningProgress } from "../../composables/useLearningProgress";
import { usePaperAccount } from "../../composables/usePaperAccount";
import {
  formatMoney,
  formatPercent,
  formatSignedMoney,
} from "../../domain/format";

const { completedCount, isCompleted } = useLearningProgress();
const {
  state,
  totalEquity,
  availableCash,
  unrealizedPnl,
  totalReturn,
  activePositions,
} = usePaperAccount();

const nextLesson = computed(
  () => lessons.find((lesson) => !isCompleted(lesson.id)) ?? lessons[lessons.length - 1],
);
const dayChange = computed(() => {
  const history = state.equityHistory;
  const latest = history[history.length - 1] ?? totalEquity.value;
  const previous = history[history.length - 2] ?? latest;
  return latest - previous;
});
const bullSpread = computed(() => {
  const legs = buildStrategyLegs("bull-call-spread");
  return {
    legs,
    metrics: calculateStrategyMetrics(legs),
  };
});
const payoffSamples = computed(() =>
  bullSpread.value.metrics.expirySeries
    .filter((_, index) => index % 5 === 0)
    .map((point) => point.value),
);

function go(path: string) {
  uni.reLaunch({ url: path });
}

function goLesson() {
  const lesson = nextLesson.value;
  if (!lesson) return;
  uni.navigateTo({ url: `/pages/lesson/index?id=${lesson.id}` });
}
</script>

<template>
  <AppShell>
    <view class="page-canvas home-page">
      <view class="page-content">
        <view class="mobile-brand">
          <view class="mobile-brand__mark">θ</view>
          <view>
            <text class="mobile-brand__name">期权工坊</text>
            <text class="mobile-brand__meta">THETA LAB</text>
          </view>
          <button class="icon-button mobile-brand__bell" @tap="go('/pages/profile/index')">
            <AppIcon name="bell" :size="18" />
          </button>
        </view>

        <view class="home-intro">
          <view class="home-intro__copy">
            <view class="home-intro__meta">
              <text class="eyebrow">学习与模拟</text>
              <view class="home-intro__dot" />
              <text class="home-intro__date">{{ DEMO_SNAPSHOT_LABEL }}</text>
            </view>
            <text class="home-intro__title">把每次判断，写进损益图。</text>
            <text class="home-intro__subtitle">
              先理解风险结构，再用模拟账户验证策略。
            </text>
          </view>
          <view class="home-intro__status">
            <view class="status-dot" />
            <text>模拟环境</text>
          </view>
        </view>

        <view class="home-primary">
          <view class="account-panel">
            <view class="account-panel__head">
              <view>
                <text class="account-panel__label">模拟账户权益</text>
                <text class="account-panel__value mono">{{ formatMoney(totalEquity) }}</text>
              </view>
              <view class="account-panel__badge">
                <AppIcon name="activity" :size="14" color="#b9e5d8" />
                <text>本地模拟</text>
              </view>
            </view>

            <view class="account-panel__stats">
              <view class="account-stat">
                <text class="account-stat__label">今日</text>
                <text
                  class="account-stat__value mono"
                  :class="dayChange >= 0 ? 'account-stat__value--up' : 'account-stat__value--down'"
                >
                  {{ formatSignedMoney(dayChange) }}
                </text>
              </view>
              <view class="account-stat">
                <text class="account-stat__label">累计收益</text>
                <text
                  class="account-stat__value mono"
                  :class="totalReturn >= 0 ? 'account-stat__value--up' : 'account-stat__value--down'"
                >
                  {{ formatPercent(totalReturn, 2, true) }}
                </text>
              </view>
              <view class="account-stat">
                <text class="account-stat__label">可用资金</text>
                <text class="account-stat__value mono">{{ formatMoney(availableCash, 0) }}</text>
              </view>
            </view>

            <view class="account-panel__chart">
              <MiniLineChart
                :values="state.equityHistory"
                color="#8fd8c2"
                fill-color="rgba(143, 216, 194, 0.11)"
                :height="90"
              />
            </view>

            <view class="account-panel__foot">
              <text>{{ activePositions.length }} 个持仓</text>
              <text>未实现 {{ formatSignedMoney(unrealizedPnl) }}</text>
              <button class="account-panel__link" @tap="go('/pages/practice/index')">
                <text>查看账户</text>
                <AppIcon name="arrowRight" :size="14" color="#b9e5d8" />
              </button>
            </view>
          </view>

          <view class="continue-panel card">
            <view class="continue-panel__head">
              <view class="continue-panel__icon">
                <AppIcon name="bookOpenCheck" :size="20" color="#0e6f5c" />
              </view>
              <view>
                <text class="eyebrow">继续学习</text>
                <text class="continue-panel__step">
                  {{ completedCount }} / {{ lessons.length }} 课
                </text>
              </view>
            </view>

            <view class="continue-panel__body">
              <text class="continue-panel__chapter">{{ nextLesson?.chapter }}</text>
              <text class="continue-panel__title">{{ nextLesson?.title }}</text>
              <text class="continue-panel__summary">{{ nextLesson?.summary }}</text>
            </view>

            <view class="continue-panel__progress">
              <view class="continue-panel__progress-track">
                <view
                  class="continue-panel__progress-value"
                  :style="{ width: `${(completedCount / lessons.length) * 100}%` }"
                />
              </view>
              <text>{{ Math.round((completedCount / lessons.length) * 100) }}%</text>
            </view>

            <button class="button-primary continue-panel__button" @tap="goLesson">
              <AppIcon
                :name="completedCount === 0 ? 'play' : 'arrowRight'"
                :size="16"
                color="#ffffff"
              />
              <text>{{ completedCount === 0 ? "开始第一课" : "继续课程" }}</text>
            </button>
          </view>
        </view>

        <view class="home-secondary">
          <view class="strategy-preview card">
            <view class="section-heading">
              <view class="section-heading__copy">
                <text class="section-heading__title">策略实验室</text>
                <text class="section-heading__meta">当前示例 · 牛市看涨价差</text>
              </view>
              <button class="button-quiet" @tap="go('/pages/strategy/index')">
                <text>打开</text>
                <AppIcon name="chevronRight" :size="15" color="#0e6f5c" />
              </button>
            </view>

            <view class="strategy-preview__body">
              <view class="strategy-preview__chart">
                <MiniLineChart
                  :values="payoffSamples"
                  color="#0e6f5c"
                  fill-color="rgba(14, 111, 92, 0.07)"
                  :height="122"
                  :show-reference="false"
                />
              </view>
              <view class="strategy-preview__stats">
                <view class="mini-stat">
                  <text class="mini-stat__label">最大收益</text>
                  <text class="mini-stat__value mono positive">
                    {{ Number.isFinite(bullSpread.metrics.maxProfit) ? formatMoney(bullSpread.metrics.maxProfit, 0) : "无上限" }}
                  </text>
                </view>
                <view class="mini-stat">
                  <text class="mini-stat__label">最大亏损</text>
                  <text class="mini-stat__value mono negative">
                    {{ Number.isFinite(bullSpread.metrics.maxLoss) ? formatMoney(bullSpread.metrics.maxLoss, 0) : "风险很大" }}
                  </text>
                </view>
                <view class="mini-stat">
                  <text class="mini-stat__label">净权利金</text>
                  <text class="mini-stat__value mono">{{ formatMoney(bullSpread.metrics.netPremium, 0) }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="market-card card">
            <view class="section-heading market-card__heading">
              <view class="section-heading__copy">
                <text class="section-heading__title">300ETF 期权</text>
                <text class="section-heading__meta">{{ DEMO_SNAPSHOT_LABEL }}</text>
              </view>
              <view class="market-card__price">
                <text class="mono">{{ underlying.spot.toFixed(3) }}</text>
                <text class="positive">{{ formatPercent(underlying.changePct, 2, true) }}</text>
              </view>
            </view>

            <view class="market-table__head">
              <text>合约</text>
              <text>最新</text>
              <text>涨跌</text>
            </view>
            <view
              v-for="quote in overviewQuotes"
              :key="quote.id"
              class="market-table__row"
            >
              <view class="market-row__contract">
                <view
                  class="contract-dot"
                  :class="quote.type === 'call' ? 'contract-dot--call' : 'contract-dot--put'"
                />
                <view>
                  <text class="market-row__name">{{ optionDisplayName(quote.type, quote.strike) }}</text>
                  <text class="market-row__meta">IV {{ formatPercent(quote.iv, 1) }}</text>
                </view>
              </view>
              <text class="mono market-row__premium">{{ quote.premium.toFixed(4) }}</text>
              <text class="mono positive market-row__change">
                {{ formatPercent(quote.changePct, 2, true) }}
              </text>
            </view>

            <view class="market-card__foot">
              <view class="market-card__source">
                <AppIcon name="info" :size="13" color="#7b8783" />
                <text>演示数据，不构成投资建议</text>
              </view>
              <button class="button-quiet" @tap="go('/pages/strategy/index')">
                <text>看期权链</text>
                <AppIcon name="chevronRight" :size="14" color="#0e6f5c" />
              </button>
            </view>
          </view>
        </view>

        <view class="quick-section">
          <view class="section-heading">
            <view class="section-heading__copy">
              <text class="section-heading__title">快速开始</text>
              <text class="section-heading__meta">学习、构建、验证</text>
            </view>
          </view>
          <view class="quick-grid">
            <button class="quick-action quick-action--learn" @tap="go('/pages/learn/index')">
              <view class="quick-action__icon">
                <AppIcon name="graduation" :size="22" color="#0e6f5c" />
              </view>
              <view class="quick-action__copy">
                <text class="quick-action__title">系统学习</text>
                <text class="quick-action__desc">从合约要素到组合风险</text>
              </view>
              <AppIcon name="arrowUpRight" :size="18" color="#6d7a76" />
            </button>
            <button class="quick-action quick-action--strategy" @tap="go('/pages/strategy/index')">
              <view class="quick-action__icon">
                <AppIcon name="chart" :size="22" color="#436d93" />
              </view>
              <view class="quick-action__copy">
                <text class="quick-action__title">构建策略</text>
                <text class="quick-action__desc">调整行权价与数量</text>
              </view>
              <AppIcon name="arrowUpRight" :size="18" color="#6d7a76" />
            </button>
            <button class="quick-action quick-action--paper" @tap="go('/pages/practice/index')">
              <view class="quick-action__icon">
                <AppIcon name="activity" :size="22" color="#c78b25" />
              </view>
              <view class="quick-action__copy">
                <text class="quick-action__title">模拟验证</text>
                <text class="quick-action__desc">查看持仓与收益归因</text>
              </view>
              <AppIcon name="arrowUpRight" :size="18" color="#6d7a76" />
            </button>
          </view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.home-page {
  position: relative;
}

.mobile-brand {
  display: none;
}

.home-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.home-intro__copy {
  display: flex;
  flex-direction: column;
}

.home-intro__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-intro__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--line-strong);
}

.home-intro__date {
  color: var(--muted-light);
  font-size: 11px;
}

.home-intro__title {
  margin-top: 7px;
  color: var(--ink);
  font-size: 30px;
  font-weight: 760;
  line-height: 1.18;
}

.home-intro__subtitle {
  margin-top: 7px;
  color: var(--muted);
  font-size: 13px;
}

.home-intro__status {
  display: flex;
  height: 30px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid #cee5de;
  border-radius: 6px;
  background: var(--teal-wash);
  color: var(--teal);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal-bright);
  box-shadow: 0 0 0 3px rgba(20, 158, 125, 0.1);
}

.home-primary {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.8fr);
  gap: 16px;
}

.account-panel {
  position: relative;
  display: flex;
  min-height: 286px;
  flex-direction: column;
  overflow: hidden;
  padding: 24px;
  border-radius: 8px;
  background: #17211e;
  color: #ffffff;
}

.account-panel::after {
  position: absolute;
  top: -70px;
  right: -50px;
  width: 220px;
  height: 220px;
  border: 1px solid rgba(185, 229, 216, 0.12);
  border-radius: 50%;
  content: "";
  pointer-events: none;
}

.account-panel__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.account-panel__label {
  display: block;
  color: #a7b6b1;
  font-size: 11px;
  font-weight: 650;
}

.account-panel__value {
  display: block;
  margin-top: 7px;
  font-size: 30px;
  font-weight: 650;
  line-height: 1.15;
}

.account-panel__badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid rgba(185, 229, 216, 0.18);
  border-radius: 5px;
  background: rgba(185, 229, 216, 0.06);
  color: #b9e5d8;
  font-size: 10px;
  font-weight: 650;
}

.account-panel__stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 22px;
}

.account-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.account-stat__label {
  color: #899893;
  font-size: 10px;
}

.account-stat__value {
  color: #e8efec;
  font-size: 14px;
  font-weight: 600;
}

.account-stat__value--up {
  color: #ff9e91;
}

.account-stat__value--down {
  color: #8fd8c2;
}

.account-panel__chart {
  position: relative;
  z-index: 1;
  height: 90px;
  margin: 12px -2px 0;
}

.account-panel__foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  color: #899893;
  font-size: 10px;
}

.account-panel__link {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  color: #b9e5d8;
  font-size: 11px;
  font-weight: 650;
}

.continue-panel {
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.continue-panel__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.continue-panel__icon {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--teal-wash);
}

.continue-panel__step {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.continue-panel__body {
  display: flex;
  flex-direction: column;
  margin-top: 24px;
}

.continue-panel__chapter {
  color: var(--muted-light);
  font-size: 10px;
  font-weight: 650;
}

.continue-panel__title {
  margin-top: 5px;
  color: var(--ink);
  font-size: 20px;
  font-weight: 750;
  line-height: 1.3;
}

.continue-panel__summary {
  margin-top: 7px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
}

.continue-panel__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.continue-panel__progress-track {
  height: 4px;
  flex: 1;
  overflow: hidden;
  border-radius: 2px;
  background: var(--surface-soft);
}

.continue-panel__progress-value {
  height: 100%;
  border-radius: 2px;
  background: var(--teal);
}

.continue-panel__button {
  width: 100%;
  margin-top: auto;
}

.home-secondary {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
  gap: 16px;
  margin-top: 16px;
}

.strategy-preview,
.market-card {
  padding: 20px;
}

.strategy-preview__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  gap: 18px;
  align-items: end;
}

.strategy-preview__chart {
  min-width: 0;
}

.strategy-preview__stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 16px;
  border-left: 1px solid var(--line);
}

.mini-stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mini-stat__label {
  color: var(--muted);
  font-size: 10px;
}

.mini-stat__value {
  color: var(--ink);
  font-size: 13px;
  font-weight: 650;
}

.market-card__heading {
  align-items: flex-start;
}

.market-card__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  font-size: 14px;
  font-weight: 650;
}

.market-card__price .positive {
  font-size: 10px;
}

.market-table__head,
.market-table__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px 64px;
  align-items: center;
  gap: 8px;
}

.market-table__head {
  margin-top: 14px;
  padding: 7px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 9px;
  font-weight: 650;
}

.market-table__head text:not(:first-child) {
  text-align: right;
}

.market-table__row {
  min-height: 54px;
  border-bottom: 1px solid var(--line);
}

.market-row__contract {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.contract-dot {
  width: 5px;
  height: 28px;
  flex: 0 0 auto;
  border-radius: 3px;
}

.contract-dot--call {
  background: #d96c5d;
}

.contract-dot--put {
  background: #4b8d7c;
}

.market-row__name {
  display: block;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-row__meta {
  display: block;
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 9px;
}

.market-row__premium,
.market-row__change {
  font-size: 11px;
  text-align: right;
}

.market-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 9px;
}

.market-card__source {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted-light);
  font-size: 9px;
}

.quick-section {
  margin-top: 18px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.quick-action {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  text-align: left;
}

.quick-action:active {
  background: #fbfcfb;
}

.quick-action__icon {
  display: flex;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--surface-soft);
}

.quick-action--learn .quick-action__icon {
  background: var(--teal-wash);
}

.quick-action--strategy .quick-action__icon {
  background: var(--blue-wash);
}

.quick-action--paper .quick-action__icon {
  background: var(--amber-wash);
}

.quick-action__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.quick-action__title {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.quick-action__desc {
  margin-top: 2px;
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1050px) {
  .home-primary,
  .home-secondary {
    grid-template-columns: 1fr;
  }

  .continue-panel {
    min-height: 250px;
  }
}

@media (max-width: 900px) {
  .mobile-brand {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 24px;
  }

  .mobile-brand__mark {
    display: flex;
    width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--ink);
    color: #ffffff;
    font-family: Georgia, serif;
    font-size: 24px;
    font-weight: 700;
  }

  .mobile-brand__name {
    display: block;
    color: var(--ink);
    font-size: 14px;
    font-weight: 750;
  }

  .mobile-brand__meta {
    display: block;
    color: var(--muted-light);
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 700;
  }

  .mobile-brand__bell {
    margin-left: auto;
  }

  .home-intro {
    align-items: flex-start;
  }

  .home-intro__title {
    font-size: 24px;
  }

  .home-intro__status {
    display: none;
  }

  .home-primary {
    gap: 12px;
  }

  .account-panel {
    min-height: 278px;
    padding: 20px;
  }

  .account-panel__value {
    font-size: 27px;
  }

  .account-panel__stats {
    gap: 10px;
  }

  .account-panel__chart {
    height: 82px;
  }

  .account-panel__foot text:nth-child(2) {
    margin-left: auto;
  }

  .account-panel__link {
    display: none;
  }

  .continue-panel {
    min-height: 252px;
    padding: 18px;
  }

  .home-secondary {
    gap: 12px;
    margin-top: 12px;
  }

  .strategy-preview,
  .market-card {
    padding: 17px;
  }

  .strategy-preview__body {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .strategy-preview__stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px 0 0;
    border-top: 1px solid var(--line);
    border-left: 0;
  }

  .quick-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
