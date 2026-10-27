<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";
import PayoffChart from "../../components/PayoffChart.vue";
import {
  demoExpiryLabel,
  demoSnapshotLabel,
  findQuote,
  optionChain,
  underlying,
  underlyingDisplayName,
} from "../../data/options";
import {
  buildStrategyLegs,
  calculateStrategyMetrics,
  elapsedDaysLabel,
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
import { translate } from "../../i18n";

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
const isWeixinMiniProgram = ref(false);
// #ifdef MP-WEIXIN
isWeixinMiniProgram.value = true;
// #endif
const ivShocks = [-0.05, 0, 0.05];
const priceShocks = [-0.05, -0.025, 0, 0.025, 0.05];
const strikes = optionChain.map((row) => row.strike);
const strategyCategoryDefinitions = [
  {
    id: "direction-spread",
    labelKey: "strategy.direction",
    shortKey: "strategy.directionShort",
    templateIds: [
      "long-call",
      "long-put",
      "risk-reversal",
      "bull-call-spread",
      "bear-put-spread",
    ],
  },
  {
    id: "credit-spread",
    labelKey: "strategy.credit",
    shortKey: "strategy.creditShort",
    templateIds: ["bull-put-spread", "bear-call-spread"],
  },
  {
    id: "volatility",
    labelKey: "strategy.volatility",
    shortKey: "strategy.volatilityShort",
    templateIds: ["long-straddle", "short-straddle", "short-strangle"],
  },
  {
    id: "range",
    labelKey: "strategy.range",
    shortKey: "strategy.rangeShort",
    templateIds: ["iron-condor", "iron-butterfly", "long-condor", "butterfly", "jade-lizard"],
  },
  {
    id: "ratio",
    labelKey: "strategy.ratio",
    shortKey: "strategy.ratioShort",
    templateIds: ["call-ratio-spread"],
  },
] satisfies Array<{
  id: string;
  labelKey: string;
  shortKey: string;
  templateIds: string[];
}>;

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
    undefined,
);
const strategyCategories = computed(() =>
  strategyCategoryDefinitions
    .map((category) => ({
      ...category,
      label: translate(category.labelKey),
      shortLabel: translate(category.shortKey),
      strategies: visibleStrategies.value.filter((template) =>
        category.templateIds.includes(template.id),
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
const openCategory = computed(() =>
  strategyCategories.value.find(
    (category) => category.id === openCategoryId.value,
  ),
);
const openCategoryLayoutHeight = computed(() =>
  openCategory.value
    ? 58 + openCategory.value.strategies.length * 44
    : 0,
);
const toolbarStyle = computed(() => ({
  paddingBottom:
    isWeixinMiniProgram.value && openCategoryId.value
      ? `${openCategoryLayoutHeight.value}px`
      : "0px",
}));
const strategySummary = computed(
  () => translate("strategy.summary", { count: visibleStrategies.value.length }),
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
          :title="$t('strategy.title')"
          :eyebrow="$t('strategy.eyebrow')"
          :subtitle="strategySummary"
        >
          <template #action>
            <view class="strategy-market-chip">
              <view class="strategy-market-chip__dot" />
              <view>
                <text class="strategy-market-chip__name">{{ underlyingDisplayName() }}</text>
                <text class="strategy-market-chip__meta">{{ underlying.symbol }} · {{ demoSnapshotLabel() }}</text>
              </view>
            </view>
          </template>
        </PageHeader>

        <view class="strategy-toolbar" :style="toolbarStyle">
          <view class="strategy-picker-block">
            <text class="strategy-picker-block__label">{{ $t("strategy.category") }}</text>
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
                  <text class="strategy-category__label strategy-category__label--full">
                    {{ category.label }}
                  </text>
                  <text class="strategy-category__label strategy-category__label--short">
                    {{ category.shortLabel }}
                  </text>
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
                    <text>{{ $t("strategy.strategyCount", { count: category.strategies.length }) }}</text>
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
            <text class="strategy-spot__label">{{ $t("strategy.spotPrice") }}</text>
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
                    <text>{{ $t("strategy.daysLeft", { days: elapsedDaysLabel() }) }}</text>
                    <view class="chart-panel__dot" />
                    <text>{{ $t("strategy.expiresOn", { date: demoExpiryLabel() }) }}</text>
                  </view>
                </view>
                <view class="segmented">
                  <button
                    class="segmented__item"
                    :class="{ 'segmented__item--active': activeTab === 'chart' }"
                    @tap="activeTab = 'chart'"
                  >
                    {{ $t("strategy.payoff") }}
                  </button>
                  <button
                    class="segmented__item"
                    :class="{ 'segmented__item--active': activeTab === 'scenario' }"
                    @tap="activeTab = 'scenario'"
                  >
                    {{ $t("strategy.scenario") }}
                  </button>
                </view>
              </view>

              <view v-if="activeTab === 'chart'" class="chart-panel__body">
                <view class="chart-legend">
                  <view class="chart-legend__item">
                    <view class="chart-legend__line chart-legend__line--solid" />
                    <text>{{ $t("strategy.expiryPnl") }}</text>
                  </view>
                  <view class="chart-legend__item">
                    <view class="chart-legend__line chart-legend__line--dashed" />
                    <text>{{ $t("strategy.currentValue") }}</text>
                  </view>
                  <view class="chart-legend__item">
                    <view class="chart-legend__line chart-legend__line--spot" />
                    <text>{{ $t("strategy.spot") }}</text>
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
                  <text>{{ $t("strategy.scenarioIntro") }}</text>
                  <text>{{ $t("strategy.scenarioHint") }}</text>
                </view>
                <view class="scenario-table">
                  <view class="scenario-table__head">
                    <text>{{ $t("strategy.spotPrice") }}</text>
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
                  <text>{{ $t("strategy.scenarioNote") }}</text>
                </view>
              </view>

              <view class="chart-metrics">
                <view class="chart-metric">
                  <text class="chart-metric__label">{{ $t("home.maxProfit") }}</text>
                  <text class="chart-metric__value mono positive">
                    {{ metricMoney(metrics.maxProfit, $t("home.unlimited")) }}
                  </text>
                </view>
                <view class="chart-metric">
                  <text class="chart-metric__label">{{ $t("home.maxLoss") }}</text>
                  <text class="chart-metric__value mono negative">
                    {{ metricMoney(metrics.maxLoss, $t("home.highRisk")) }}
                  </text>
                </view>
                <view class="chart-metric">
                  <text class="chart-metric__label">{{ $t("home.breakeven") }}</text>
                  <text class="chart-metric__value mono">
                    {{ metrics.breakevens.length ? metrics.breakevens.map((item) => item.toFixed(3)).join(" / ") : "—" }}
                  </text>
                </view>
                <view class="chart-metric">
                  <text class="chart-metric__label">{{ $t("home.netPremium") }}</text>
                  <text class="chart-metric__value mono">
                    {{ metrics.netPremium > 0 ? $t("strategy.debit") : $t("strategy.creditAmount") }} {{ formatMoney(Math.abs(metrics.netPremium), 0) }}
                  </text>
                </view>
              </view>
            </view>

            <view class="legs-panel card">
              <view class="legs-panel__head">
                <view>
                  <text class="legs-panel__title">{{ $t("strategy.mechanics") }}</text>
                  <text class="legs-panel__meta">{{ $t("strategy.legMeta", { legs: legs.length, shares: formatNumber(10000) }) }}</text>
                </view>
                <button class="button-quiet" @tap="resetLegs">
                  <AppIcon name="reset" :size="14" color="#0e6f5c" />
                  <text>{{ $t("strategy.resetLegs") }}</text>
                </button>
              </view>

              <view class="leg-table__head">
                <text>{{ $t("strategy.sideContract") }}</text>
                <text>{{ $t("common.strike") }}</text>
                <text>{{ $t("common.latest") }}</text>
                <text>{{ $t("common.quantity") }}</text>
              </view>
              <view v-for="leg in legs" :key="leg.uid" class="leg-row">
                <view class="leg-contract">
                  <view
                    class="leg-side"
                    :class="leg.side === 'buy' ? 'leg-side--buy' : 'leg-side--sell'"
                  >
                    {{ leg.side === "buy" ? $t("common.buy") : $t("common.sell") }}
                  </view>
                  <view class="leg-contract__copy">
                    <text class="leg-contract__name">
                      {{ leg.type === "call" ? $t("common.call") : $t("common.put") }} {{ optionLabel(leg.type, leg.strike) }}
                    </text>
                    <text class="leg-contract__meta">IV {{ formatVol(leg.iv) }} · {{ demoExpiryLabel() }}</text>
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
                  {{ $t("strategy.marginEstimate", { value: formatMoney(0, 0) }) }}
                </text>
              </view>
            </view>
          </view>

          <view class="strategy-aside">
            <view class="risk-panel card">
              <view class="risk-panel__head">
                <text class="risk-panel__title">{{ $t("strategy.greeksTitle") }}</text>
                <view class="chip chip--blue">{{ selectedTemplate?.risk }}</view>
              </view>
              <view class="greek-list">
                <view class="greek-row">
                  <view>
                    <text class="greek-row__name">Delta</text>
                    <text class="greek-row__desc">{{ $t("strategy.deltaDesc") }}</text>
                  </view>
                  <text class="greek-row__value mono">{{ formatSignedNumber(metrics.netDelta) }}</text>
                </view>
                <view class="greek-row">
                  <view>
                    <text class="greek-row__name">Gamma</text>
                    <text class="greek-row__desc">{{ $t("strategy.gammaDesc") }}</text>
                  </view>
                  <text class="greek-row__value mono">{{ formatSignedNumber(metrics.netGamma, 1) }}</text>
                </view>
                <view class="greek-row">
                  <view>
                    <text class="greek-row__name">Theta</text>
                    <text class="greek-row__desc">{{ $t("strategy.thetaDesc") }}</text>
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
                    <text class="greek-row__desc">{{ $t("strategy.vegaDesc") }}</text>
                  </view>
                  <text class="greek-row__value mono">{{ formatSignedNumber(metrics.netVega, 1) }}</text>
                </view>
              </view>
              <view class="risk-panel__note">
                <AppIcon name="info" :size="13" color="#7b8783" />
                <text>{{ $t("strategy.greeksNote") }}</text>
              </view>
            </view>

            <view class="structure-panel card">
              <text class="structure-panel__title">{{ $t("strategy.executionCheck") }}</text>
              <view class="check-list">
                <view class="check-item">
                  <AppIcon name="circleCheck" :size="16" color="#0e6f5c" />
                  <text>{{ $t("strategy.checkMaxLoss") }}</text>
                </view>
                <view class="check-item">
                  <AppIcon name="circleCheck" :size="16" color="#0e6f5c" />
                  <text>{{ $t("strategy.checkStrikes") }}</text>
                </view>
                <view class="check-item">
                  <AppIcon name="circleDashed" :size="16" color="#95a09c" />
                  <text>{{ $t("strategy.checkLiquidity") }}</text>
                </view>
              </view>
              <button class="button-primary button-primary--teal structure-panel__button" @tap="goSimulate">
                <AppIcon name="activity" :size="16" color="#ffffff" />
                <text>{{ $t("strategy.sendToPaper") }}</text>
              </button>
              <text class="structure-panel__disclaimer">
                {{ $t("strategy.simulationDisclaimer") }}
              </text>
            </view>

            <view class="option-chain-card card">
              <view class="option-chain-card__head">
                <text class="option-chain-card__title">{{ $t("strategy.optionChain") }}</text>
                <text class="option-chain-card__meta">{{ $t("strategy.nearTheMoney") }}</text>
              </view>
              <view class="option-chain__head">
                <text>{{ $t("common.call") }}</text>
                <text>{{ $t("common.strike") }}</text>
                <text>{{ $t("common.put") }}</text>
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
  transition: padding-bottom 160ms ease;
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
  flex-wrap: wrap;
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

.strategy-category__label--short {
  display: none;
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

@media (max-width: 360px) {
  .strategy-category__label--full {
    display: none;
  }

  .strategy-category__label--short {
    display: inline;
  }

  .strategy-categories {
    gap: 4px;
  }

  .strategy-category__trigger {
    gap: 2px;
    padding: 0 6px;
  }
}
</style>
