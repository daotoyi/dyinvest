<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";
import PayoffChart from "../../components/PayoffChart.vue";
import {
  DEMO_EXPIRY_LABEL,
  DEMO_SNAPSHOT_LABEL,
  findQuote,
  optionChain,
  underlying,
} from "../../data/options";
import {
  buildStrategyLegs,
  calculateStrategyMetrics,
  elapsedDaysLabel,
  strategyTemplates,
} from "../../data/strategies";
import { useAuth } from "../../composables/useAuth";
import { useContentSettings } from "../../composables/useContentSettings";
import type { StrategyLeg } from "../../domain/types";
import {
  formatMoney,
  formatNumber,
  formatSignedNumber,
  formatVol,
  optionLabel,
} from "../../domain/format";

const { preferences } = useAuth();
const { visibleStrategies } = useContentSettings();
const configuredStrategy = preferences.value?.defaultStrategyId;
const defaultVisibleStrategy =
  visibleStrategies.value.find(
    (template) => template.id === "bull-call-spread",
  )?.id ?? visibleStrategies.value[0]?.id ?? "bull-call-spread";
const initialStrategyId =
  configuredStrategy &&
  visibleStrategies.value.some((template) => template.id === configuredStrategy)
    ? configuredStrategy
    : defaultVisibleStrategy;
const selectedTemplateId = ref(initialStrategyId);
const legs = ref<StrategyLeg[]>(buildStrategyLegs(selectedTemplateId.value));
const activeTab = ref<"chart" | "scenario">("chart");
const openCategoryId = ref<string | null>(null);
const ivShocks = [-0.05, 0, 0.05];
const priceShocks = [-0.05, -0.025, 0, 0.025, 0.05];
const strikes = optionChain.map((row) => row.strike);
const strategyCategoryDefinitions = [
  {
    id: "direction-spread",
    label: "方向价差",
    tags: ["方向", "合成方向", "价差"],
  },
  {
    id: "credit-spread",
    label: "信用价差",
    tags: ["信用价差"],
  },
  {
    id: "volatility",
    label: "波动率",
    tags: ["波动率", "卖方波动率"],
  },
  {
    id: "range",
    label: "区间",
    tags: ["区间", "收敛", "偏卖方"],
  },
  {
    id: "ratio",
    label: "比例",
    tags: ["比例"],
  },
] satisfies Array<{ id: string; label: string; tags: string[] }>;

onLoad((query) => {
  const requestedId = String(query?.id ?? "");
  if (
    requestedId &&
    visibleStrategies.value.some((template) => template.id === requestedId)
  ) {
    selectTemplate(requestedId);
  }
});

const selectedTemplate = computed(
  () =>
    visibleStrategies.value.find(
      (item) => item.id === selectedTemplateId.value,
    ) ??
    visibleStrategies.value[0] ??
    strategyTemplates[0],
);
const strategyCategories = computed(() =>
  strategyCategoryDefinitions
    .map((category) => ({
      ...category,
      strategies: visibleStrategies.value.filter((template) =>
        category.tags.includes(template.tag),
      ),
    }))
    .filter((category) => category.strategies.length > 0),
);
const activeCategoryId = computed(
  () =>
    strategyCategories.value.find((category) =>
      category.strategies.some(
        (template) => template.id === selectedTemplateId.value,
      ),
    )?.id ??
    strategyCategories.value[0]?.id ??
    "",
);
const strategySummary = computed(
  () =>
    `覆盖方向、信用价差、波动率、区间与尾部风险，共 ${visibleStrategies.value.length} 个策略模板。`,
);
const metrics = computed(() => calculateStrategyMetrics(legs.value));
const scenarioRows = computed(() =>
  priceShocks.map((priceShock) => ({
    priceShock,
    price: underlying.spot * (1 + priceShock),
    cells: ivShocks.map((ivShock) => {
      const cell = metrics.value.scenarios.find(
        (item) =>
          item.priceShock === priceShock && item.ivShock === ivShock,
      );
      return cell?.value ?? 0;
    }),
  })),
);

function selectTemplate(id: string) {
  selectedTemplateId.value = id;
  legs.value = buildStrategyLegs(id);
}

function toggleCategory(id: string) {
  openCategoryId.value = openCategoryId.value === id ? null : id;
}

function selectCategoryTemplate(id: string) {
  selectTemplate(id);
  openCategoryId.value = null;
}

function categoryMenuAlignment(index: number) {
  if (index <= 1) return "left";
  if (index >= strategyCategories.value.length - 2) return "right";
  return "center";
}

function categoryIconColor(id: string) {
  if (activeCategoryId.value === id) return "#ffffff";
  if (openCategoryId.value === id) return "#0e6f5c";
  return "#52605c";
}

function changeQuantity(leg: StrategyLeg, delta: number) {
  leg.quantity = Math.min(10, Math.max(1, leg.quantity + delta));
}

function changeStrike(leg: StrategyLeg, event: { detail: { value: number | string } }) {
  const index = Number(event.detail.value);
  const strike = strikes[index];
  if (strike === undefined) return;
  const quote = findQuote(leg.type, strike);
  if (!quote) return;
  leg.strike = strike;
  leg.quoteId = quote.id;
  leg.premium = quote.premium;
  leg.iv = quote.iv;
}

function resetLegs() {
  legs.value = buildStrategyLegs(selectedTemplateId.value);
}

function metricMoney(value: number, unlimitedLabel: string) {
  return Number.isFinite(value) ? formatMoney(value, 0) : unlimitedLabel;
}

function goSimulate() {
  uni.navigateTo({
    url: `/pages/order/index?mode=strategy&id=${selectedTemplateId.value}`,
  });
}
</script>

<template>
  <AppShell>
    <view class="page-canvas">
      <view class="page-content">
        <PageHeader
          title="策略实验室"
          eyebrow="Strategy lab"
          :subtitle="strategySummary"
        >
          <template #action>
            <view class="strategy-market-chip">
              <view class="strategy-market-chip__dot" />
              <view>
                <text class="strategy-market-chip__name">{{ underlying.name }}</text>
                <text class="strategy-market-chip__meta">{{ underlying.symbol }} · {{ DEMO_SNAPSHOT_LABEL }}</text>
              </view>
            </view>
          </template>
        </PageHeader>

        <view class="strategy-toolbar">
          <view class="strategy-picker-block">
            <text class="strategy-picker-block__label">策略分类</text>
            <view
              v-if="openCategoryId"
              class="strategy-menu-dismiss"
              @tap="openCategoryId = null"
            />
            <view class="strategy-categories">
              <view
                v-for="(category, index) in strategyCategories"
                :key="category.id"
                class="strategy-category"
              >
                <button
                  class="strategy-category__trigger"
                  :class="{
                    'strategy-category__trigger--active': activeCategoryId === category.id,
                    'strategy-category__trigger--open': openCategoryId === category.id,
                  }"
                  @tap="toggleCategory(category.id)"
                >
                  <text>{{ category.label }}</text>
                  <view
                    class="strategy-category__chevron"
                    :class="{ 'strategy-category__chevron--open': openCategoryId === category.id }"
                  >
                    <AppIcon
                      name="chevronDown"
                      :size="12"
                      :color="categoryIconColor(category.id)"
                    />
                  </view>
                </button>
                <view
                  v-if="openCategoryId === category.id"
                  class="strategy-category-menu"
                  :class="`strategy-category-menu--${categoryMenuAlignment(index)}`"
                >
                  <view class="strategy-category-menu__head">
                    <text>{{ category.label }}</text>
                    <text>{{ category.strategies.length }} 个策略</text>
                  </view>
                  <button
                    v-for="template in category.strategies"
                    :key="template.id"
                    class="strategy-category-menu__item"
                    :class="{
                      'strategy-category-menu__item--selected':
                        selectedTemplateId === template.id,
                    }"
                    @tap="selectCategoryTemplate(template.id)"
                  >
                    <view class="strategy-category-menu__copy">
                      <text class="strategy-category-menu__name">
                        {{ template.name }}
                      </text>
                      <text class="strategy-category-menu__meta">
                        {{ template.risk }} · {{ template.tag }}
                      </text>
                    </view>
                    <AppIcon
                      v-if="selectedTemplateId === template.id"
                      name="check"
                      :size="14"
                      color="#0e6f5c"
                    />
                  </button>
                </view>
              </view>
            </view>
          </view>
          <view class="strategy-spot">
            <text class="strategy-spot__label">标的现价</text>
            <text class="strategy-spot__value mono">{{ underlying.spot.toFixed(3) }}</text>
            <text class="positive mono">{{ underlying.change >= 0 ? "+" : "" }}{{ underlying.change.toFixed(3) }}</text>
          </view>
        </view>

        <view class="strategy-layout">
          <view class="strategy-primary">
            <view class="chart-panel card">
              <view class="chart-panel__head">
                <view>
                  <text class="chart-panel__title">{{ selectedTemplate?.name }}</text>
                  <view class="chart-panel__meta">
                    <text>{{ selectedTemplate?.risk }}</text>
                    <view class="chart-panel__dot" />
                    <text>剩余 {{ elapsedDaysLabel() }} 天</text>
                    <view class="chart-panel__dot" />
                    <text>{{ DEMO_EXPIRY_LABEL }} 到期</text>
                  </view>
                </view>
                <view class="segmented">
                  <button
                    class="segmented__item"
                    :class="{ 'segmented__item--active': activeTab === 'chart' }"
                    @tap="activeTab = 'chart'"
                  >
                    损益图
                  </button>
                  <button
                    class="segmented__item"
                    :class="{ 'segmented__item--active': activeTab === 'scenario' }"
                    @tap="activeTab = 'scenario'"
                  >
                    情景
                  </button>
                </view>
              </view>

              <view v-if="activeTab === 'chart'" class="chart-panel__body">
                <view class="chart-legend">
                  <view class="chart-legend__item">
                    <view class="chart-legend__line chart-legend__line--solid" />
                    <text>到期损益</text>
                  </view>
                  <view class="chart-legend__item">
                    <view class="chart-legend__line chart-legend__line--dashed" />
                    <text>当前理论价值</text>
                  </view>
                  <view class="chart-legend__item">
                    <view class="chart-legend__line chart-legend__line--spot" />
                    <text>现价</text>
                  </view>
                </view>
                <PayoffChart
                  :expiry="metrics.expirySeries"
                  :current="metrics.currentSeries"
                  :spot="underlying.spot"
                  :height="326"
                />
              </view>

              <view v-else class="scenario-panel">
                <view class="scenario-panel__intro">
                  <text>价格变化 × 隐含波动率变化</text>
                  <text>估算当前理论损益，不含手续费</text>
                </view>
                <view class="scenario-table">
                  <view class="scenario-table__head">
                    <text>标的价格</text>
                    <text v-for="shock in ivShocks" :key="shock">
                      IV {{ shock > 0 ? "+" : "" }}{{ Math.round(shock * 100) }}pt
                    </text>
                  </view>
                  <view
                    v-for="row in scenarioRows"
                    :key="row.priceShock"
                    class="scenario-table__row"
                  >
                    <view class="scenario-price">
                      <text class="mono">{{ row.price.toFixed(3) }}</text>
                      <text class="mono">{{ row.priceShock > 0 ? "+" : "" }}{{ Math.round(row.priceShock * 100) }}%</text>
                    </view>
                    <view
                      v-for="cell in row.cells"
                      :key="cell"
                      class="scenario-cell mono"
                      :class="cell >= 0 ? 'scenario-cell--up' : 'scenario-cell--down'"
                    >
                      {{ formatSignedNumber(cell) }}
                    </view>
                  </view>
                </view>
                <view class="scenario-panel__note">
                  <AppIcon name="info" :size="14" color="#7b8783" />
                  <text>情景分析是局部估算，实际价格还受流动性、利率和波动率曲面影响。</text>
                </view>
              </view>

              <view class="chart-metrics">
                <view class="chart-metric">
                  <text class="chart-metric__label">最大收益</text>
                  <text class="chart-metric__value mono positive">
                    {{ metricMoney(metrics.maxProfit, "无上限") }}
                  </text>
                </view>
                <view class="chart-metric">
                  <text class="chart-metric__label">最大亏损</text>
                  <text class="chart-metric__value mono negative">
                    {{ metricMoney(metrics.maxLoss, "风险很大") }}
                  </text>
                </view>
                <view class="chart-metric">
                  <text class="chart-metric__label">盈亏平衡</text>
                  <text class="chart-metric__value mono">
                    {{ metrics.breakevens.length ? metrics.breakevens.map((item) => item.toFixed(3)).join(" / ") : "—" }}
                  </text>
                </view>
                <view class="chart-metric">
                  <text class="chart-metric__label">净权利金</text>
                  <text class="chart-metric__value mono">
                    {{ metrics.netPremium > 0 ? "支出 " : "收入 " }}{{ formatMoney(Math.abs(metrics.netPremium), 0) }}
                  </text>
                </view>
              </view>
            </view>

            <view class="legs-panel card">
              <view class="legs-panel__head">
                <view>
                  <text class="legs-panel__title">策略结构</text>
                  <text class="legs-panel__meta">{{ legs.length }} 条腿 · 1 张合约 = {{ formatNumber(10000) }} 份 ETF</text>
                </view>
                <button class="button-quiet" @tap="resetLegs">
                  <AppIcon name="reset" :size="14" color="#0e6f5c" />
                  <text>恢复模板</text>
                </button>
              </view>

              <view class="leg-table__head">
                <text>方向 / 合约</text>
                <text>行权价</text>
                <text>最新价</text>
                <text>数量</text>
              </view>
              <view v-for="leg in legs" :key="leg.uid" class="leg-row">
                <view class="leg-contract">
                  <view
                    class="leg-side"
                    :class="leg.side === 'buy' ? 'leg-side--buy' : 'leg-side--sell'"
                  >
                    {{ leg.side === "buy" ? "买" : "卖" }}
                  </view>
                  <view class="leg-contract__copy">
                    <text class="leg-contract__name">
                      {{ leg.type === "call" ? "认购" : "认沽" }} {{ optionLabel(leg.type, leg.strike) }}
                    </text>
                    <text class="leg-contract__meta">IV {{ formatVol(leg.iv) }} · {{ DEMO_EXPIRY_LABEL }}</text>
                  </view>
                </view>

                <picker
                  class="leg-picker"
                  :range="strikes.map((strike) => strike.toFixed(3))"
                  :value="strikes.indexOf(leg.strike)"
                  @change="changeStrike(leg, $event)"
                >
                  <button class="leg-picker__button">
                    <text class="mono">{{ leg.strike.toFixed(3) }}</text>
                    <AppIcon name="chevronRight" :size="12" color="#7b8783" />
                  </button>
                </picker>

                <text class="leg-premium mono">{{ leg.premium.toFixed(4) }}</text>

                <view class="quantity-stepper">
                  <button class="quantity-stepper__button" @tap="changeQuantity(leg, -1)">
                    <AppIcon name="minus" :size="13" color="#52605c" />
                  </button>
                  <text class="quantity-stepper__value mono">{{ leg.quantity }}</text>
                  <button class="quantity-stepper__button" @tap="changeQuantity(leg, 1)">
                    <AppIcon name="plus" :size="13" color="#52605c" />
                  </button>
                </view>
              </view>

              <view class="legs-panel__foot">
                <view class="legs-panel__thesis">
                  <AppIcon name="target" :size="16" color="#0e6f5c" />
                  <text>{{ selectedTemplate?.thesis }}</text>
                </view>
                <text class="legs-panel__margin">
                  保证金估算：{{ formatMoney(0, 0) }} · 以券商为准
                </text>
              </view>
            </view>
          </view>

          <view class="strategy-aside">
            <view class="risk-panel card">
              <view class="risk-panel__head">
                <text class="risk-panel__title">组合 Greeks</text>
                <view class="chip chip--blue">{{ selectedTemplate?.risk }}</view>
              </view>
              <view class="greek-list">
                <view class="greek-row">
                  <view>
                    <text class="greek-row__name">Delta</text>
                    <text class="greek-row__desc">方向敞口</text>
                  </view>
                  <text class="greek-row__value mono">{{ formatSignedNumber(metrics.netDelta) }}</text>
                </view>
                <view class="greek-row">
                  <view>
                    <text class="greek-row__name">Gamma</text>
                    <text class="greek-row__desc">Delta 变化速度</text>
                  </view>
                  <text class="greek-row__value mono">{{ formatSignedNumber(metrics.netGamma, 1) }}</text>
                </view>
                <view class="greek-row">
                  <view>
                    <text class="greek-row__name">Theta</text>
                    <text class="greek-row__desc">每日时间价值</text>
                  </view>
                  <text
                    class="greek-row__value mono"
                    :class="metrics.netTheta >= 0 ? 'positive' : 'negative'"
                  >
                    {{ formatSignedNumber(metrics.netTheta, 1) }}
                  </text>
                </view>
                <view class="greek-row">
                  <view>
                    <text class="greek-row__name">Vega</text>
                    <text class="greek-row__desc">每 1pt 波动率</text>
                  </view>
                  <text class="greek-row__value mono">{{ formatSignedNumber(metrics.netVega, 1) }}</text>
                </view>
              </view>
              <view class="risk-panel__note">
                <AppIcon name="info" :size="13" color="#7b8783" />
                <text>Greeks 为示例快照，随行情与时间变化。</text>
              </view>
            </view>

            <view class="structure-panel card">
              <text class="structure-panel__title">执行检查</text>
              <view class="check-list">
                <view class="check-item">
                  <AppIcon name="circleCheck" :size="16" color="#0e6f5c" />
                  <text>先确认最大亏损</text>
                </view>
                <view class="check-item">
                  <AppIcon name="circleCheck" :size="16" color="#0e6f5c" />
                  <text>核对行权价和到期日</text>
                </view>
                <view class="check-item">
                  <AppIcon name="circleDashed" :size="16" color="#95a09c" />
                  <text>检查盘口与单腿成交风险</text>
                </view>
              </view>
              <button class="button-primary button-primary--teal structure-panel__button" @tap="goSimulate">
                <AppIcon name="activity" :size="16" color="#ffffff" />
                <text>发送到模拟盘</text>
              </button>
              <text class="structure-panel__disclaimer">
                初版模拟撮合不包含实盘盘口和真实保证金。
              </text>
            </view>

            <view class="option-chain-card card">
              <view class="option-chain-card__head">
                <text class="option-chain-card__title">期权链快照</text>
                <text class="option-chain-card__meta">平值附近</text>
              </view>
              <view class="option-chain__head">
                <text>认购</text>
                <text>行权价</text>
                <text>认沽</text>
              </view>
              <view
                v-for="row in optionChain.slice(1, 4)"
                :key="row.strike"
                class="option-chain__row"
              >
                <text class="mono positive">{{ row.call.premium.toFixed(4) }}</text>
                <text class="mono option-chain__strike">{{ row.strike.toFixed(3) }}</text>
                <text class="mono negative">{{ row.put.premium.toFixed(4) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.strategy-market-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.strategy-market-chip__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--teal-bright);
  box-shadow: 0 0 0 3px var(--teal-wash);
}

.strategy-market-chip__name {
  display: block;
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.strategy-market-chip__meta {
  display: block;
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 8px;
}

.strategy-toolbar {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
  z-index: 12;
}

.strategy-picker-block {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  z-index: 30;
}

.strategy-picker-block__label {
  color: var(--muted);
  font-size: 9px;
}

.strategy-menu-dismiss {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.strategy-categories {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  z-index: 30;
}

.strategy-category {
  position: relative;
  flex: 0 0 auto;
}

.strategy-category__trigger {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 4px;
  padding: 0 9px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 650;
  white-space: nowrap;
}

.strategy-category__trigger--active {
  border-color: var(--ink);
  background: var(--ink);
  color: #ffffff;
}

.strategy-category__trigger--open:not(.strategy-category__trigger--active) {
  border-color: #9bc9bb;
  background: var(--teal-wash);
  color: var(--teal);
}

.strategy-category__chevron {
  display: flex;
  transition: transform 150ms ease;
}

.strategy-category__chevron--open {
  transform: rotate(180deg);
}

.strategy-category-menu {
  position: absolute;
  top: calc(100% + 7px);
  width: 232px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 16px 36px rgba(23, 33, 30, 0.14);
  z-index: 40;
}

.strategy-category-menu--left {
  left: 0;
}

.strategy-category-menu--center {
  left: 50%;
  transform: translateX(-50%);
}

.strategy-category-menu--right {
  right: 0;
}

.strategy-category-menu__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 11px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 8px;
}

.strategy-category-menu__head text:first-child {
  color: var(--ink);
  font-size: 10px;
  font-weight: 700;
}

.strategy-category-menu__item {
  display: flex;
  width: 100%;
  min-height: 43px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 11px;
  border-top: 1px solid var(--line);
  text-align: left;
}

.strategy-category-menu__item--selected {
  background: var(--teal-wash);
}

.strategy-category-menu__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.strategy-category-menu__name {
  color: var(--ink);
  font-size: 10px;
  font-weight: 680;
}

.strategy-category-menu__meta {
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 8px;
}

.strategy-spot {
  display: flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}

.strategy-spot__label {
  color: var(--muted);
  font-size: 9px;
}

.strategy-spot__value {
  color: var(--ink);
  font-size: 17px;
  font-weight: 700;
}

.strategy-spot .positive {
  font-size: 10px;
}

.strategy-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 16px;
  align-items: start;
}

.strategy-primary,
.strategy-aside {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.chart-panel {
  overflow: hidden;
}

.chart-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px 12px;
}

.chart-panel__title {
  display: block;
  color: var(--ink);
  font-size: 19px;
  font-weight: 740;
}

.chart-panel__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  color: var(--muted);
  font-size: 9px;
}

.chart-panel__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--line-strong);
}

.chart-panel__body {
  padding: 0 12px;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 0 8px;
}

.chart-legend__item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 9px;
}

.chart-legend__line {
  width: 18px;
  height: 2px;
  background: var(--teal);
}

.chart-legend__line--dashed {
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    #7896b0 0,
    #7896b0 4px,
    transparent 4px,
    transparent 7px
  );
}

.chart-legend__line--spot {
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    #8f9c98 0,
    #8f9c98 3px,
    transparent 3px,
    transparent 7px
  );
}

.scenario-panel {
  padding: 4px 20px 16px;
}

.scenario-panel__intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
  color: var(--muted);
  font-size: 9px;
}

.scenario-panel__intro text:first-child {
  color: var(--ink-soft);
  font-weight: 650;
}

.scenario-table {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 7px;
}

.scenario-table__head,
.scenario-table__row {
  display: grid;
  grid-template-columns: 1.2fr repeat(3, 1fr);
  align-items: center;
}

.scenario-table__head {
  min-height: 35px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
}

.scenario-table__head text,
.scenario-cell {
  text-align: right;
  padding: 0 10px;
}

.scenario-table__head text:first-child {
  text-align: left;
}

.scenario-table__row {
  min-height: 50px;
  border-top: 1px solid var(--line);
}

.scenario-price {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
}

.scenario-price .mono:first-child {
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
}

.scenario-price .mono:last-child {
  color: var(--muted-light);
  font-size: 8px;
}

.scenario-cell {
  font-size: 11px;
  font-weight: 650;
}

.scenario-cell--up {
  color: var(--red);
}

.scenario-cell--down {
  color: var(--teal);
}

.scenario-panel__note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  color: var(--muted-light);
  font-size: 9px;
  line-height: 1.5;
}

.chart-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--line);
}

.chart-metric {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.chart-metric__label {
  color: var(--muted);
  font-size: 9px;
}

.chart-metric__value {
  overflow: hidden;
  color: var(--ink);
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legs-panel {
  padding: 18px 20px;
}

.legs-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.legs-panel__title {
  display: block;
  color: var(--ink);
  font-size: 15px;
  font-weight: 720;
}

.legs-panel__meta {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

.leg-table__head,
.leg-row {
  display: grid;
  grid-template-columns: minmax(150px, 1.6fr) 90px 70px 100px;
  align-items: center;
  gap: 10px;
}

.leg-table__head {
  margin-top: 15px;
  padding: 7px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 9px;
}

.leg-table__head text:not(:first-child) {
  text-align: right;
}

.leg-row {
  min-height: 62px;
  border-bottom: 1px solid var(--line);
}

.leg-contract {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.leg-side {
  display: flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 750;
}

.leg-side--buy {
  background: var(--red-wash);
  color: #a84237;
}

.leg-side--sell {
  background: var(--teal-wash);
  color: var(--teal);
}

.leg-contract__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.leg-contract__name {
  overflow: hidden;
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leg-contract__meta {
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 8px;
}

.leg-picker__button {
  display: flex;
  width: 100%;
  height: 30px;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  color: var(--ink-soft);
  font-size: 11px;
}

.leg-premium {
  color: var(--ink-soft);
  font-size: 11px;
  text-align: right;
}

.quantity-stepper {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.quantity-stepper__button {
  display: flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fbfcfb;
}

.quantity-stepper__value {
  width: 26px;
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
  text-align: center;
}

.legs-panel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 13px;
}

.legs-panel__thesis {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.5;
}

.legs-panel__margin {
  color: var(--muted-light);
  font-size: 8px;
  white-space: nowrap;
}

.risk-panel,
.structure-panel,
.option-chain-card {
  padding: 17px;
}

.risk-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.risk-panel__title {
  color: var(--ink);
  font-size: 13px;
  font-weight: 720;
}

.greek-list {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}

.greek-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.greek-row:last-child {
  border-bottom: 0;
}

.greek-row__name {
  display: block;
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 650;
}

.greek-row__desc {
  display: block;
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 8px;
}

.greek-row__value {
  color: var(--ink);
  font-size: 12px;
  font-weight: 650;
}

.risk-panel__note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 8px;
  color: var(--muted-light);
  font-size: 8px;
  line-height: 1.5;
}

.structure-panel__title {
  color: var(--ink);
  font-size: 13px;
  font-weight: 720;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 13px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 9px;
}

.structure-panel__button {
  width: 100%;
  margin-top: 15px;
}

.structure-panel__disclaimer {
  display: block;
  margin-top: 8px;
  color: var(--muted-light);
  font-size: 8px;
  text-align: center;
}

.option-chain-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-chain-card__title {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.option-chain-card__meta {
  color: var(--muted-light);
  font-size: 8px;
}

.option-chain__head,
.option-chain__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  text-align: center;
}

.option-chain__head {
  margin-top: 11px;
  padding: 6px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 8px;
}

.option-chain__row {
  min-height: 33px;
  border-bottom: 1px solid var(--line);
  font-size: 9px;
}

.option-chain__row:last-child {
  border-bottom: 0;
}

.option-chain__strike {
  color: var(--ink-soft);
  font-weight: 650;
}

@media (max-width: 1100px) {
  .strategy-layout {
    grid-template-columns: minmax(0, 1fr) 240px;
  }
}

@media (max-width: 900px) {
  .strategy-market-chip {
    display: none;
  }

  .strategy-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
    margin-right: 0;
  }

  .strategy-picker-block {
    flex-basis: auto;
  }

  .strategy-categories {
    gap: 5px;
  }

  .strategy-category__trigger {
    min-height: 30px;
    padding: 0 7px;
    font-size: 9px;
  }

  .strategy-spot {
    justify-content: flex-end;
  }

  .strategy-layout {
    display: flex;
    flex-direction: column;
  }

  .strategy-primary,
  .strategy-aside {
    width: 100%;
  }

  .chart-panel__head {
    padding: 16px 16px 10px;
  }

  .chart-panel__title {
    font-size: 17px;
  }

  .chart-panel__body {
    padding: 0 4px;
  }

  .chart-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 14px 16px 16px;
  }

  .legs-panel {
    padding: 16px;
  }

  .leg-table__head {
    display: none;
  }

  .leg-row {
    grid-template-columns: minmax(0, 1fr) 72px 80px;
    gap: 8px;
    padding: 12px 0;
  }

  .leg-picker {
    grid-column: 2;
    grid-row: 1;
  }

  .leg-premium {
    display: none;
  }

  .quantity-stepper {
    grid-column: 3;
    grid-row: 1;
  }

  .legs-panel__foot {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .strategy-aside {
    gap: 12px;
  }

  .option-chain-card {
    display: none;
  }

  .scenario-panel {
    padding: 4px 12px 14px;
  }

  .scenario-table__head,
  .scenario-table__row {
    grid-template-columns: 1.15fr repeat(3, 1fr);
  }

  .scenario-table__head text,
  .scenario-cell {
    padding: 0 6px;
  }

  .scenario-price {
    padding: 0 6px;
  }
}
</style>
