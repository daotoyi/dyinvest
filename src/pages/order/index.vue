<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";
import {
  CONTRACT_MULTIPLIER,
  demoExpiryLabel,
  demoSnapshotLabel,
  findQuote,
  optionChain,
  optionDisplayName,
  underlying,
  underlyingDisplayName,
} from "../../data/options";
import {
  buildStrategyLegs,
  calculateStrategyMetrics,
  elapsedDaysLabel,
  localizedStrategyTemplates,
} from "../../data/strategies";
import type { OptionSide, OptionType } from "../../domain/types";
import { formatMoney, formatPercent, formatSignedMoney, formatVol } from "../../domain/format";
import { usePaperAccount } from "../../composables/usePaperAccount";
import { useAuth } from "../../composables/useAuth";
import { translate } from "../../i18n";

const mode = ref<"single" | "strategy">("single");
const strategyId = ref("bull-call-spread");
const side = ref<OptionSide>("buy");
const type = ref<OptionType>("call");
const strike = ref(4.1);
const { preferences } = useAuth();
const quantity = ref(
  Math.min(20, Math.max(1, preferences.value?.defaultOrderQuantity ?? 1)),
);
const priceText = ref("0.0000");
const strikes = optionChain.map((row) => row.strike);
const {
  availableCash,
  placeOrder,
  placeStrategy,
  estimateMargin,
} = usePaperAccount();

onLoad((query) => {
  if (query?.mode === "strategy") {
    mode.value = "strategy";
    if (query.id) strategyId.value = String(query.id);
    return;
  }
  if (query?.type === "call" || query?.type === "put") {
    type.value = query.type;
  }
  if (query?.strike) {
    const parsed = Number(query.strike);
    if (strikes.includes(parsed)) strike.value = parsed;
  }
});

const selectedQuote = computed(() => findQuote(type.value, strike.value));
const selectedTemplate = computed(
  () =>
    localizedStrategyTemplates.value.find(
      (template) => template.id === strategyId.value,
    ) ?? localizedStrategyTemplates.value[1],
);
const strategyLegs = computed(() =>
  mode.value === "strategy" ? buildStrategyLegs(strategyId.value) : [],
);
const strategyMetrics = computed(() =>
  mode.value === "strategy"
    ? calculateStrategyMetrics(strategyLegs.value)
    : undefined,
);
const currentPrice = computed(() => selectedQuote.value?.premium ?? 0);
const limitPrice = computed(() => {
  const parsed = Number(priceText.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : currentPrice.value;
});
const grossAmount = computed(
  () => limitPrice.value * CONTRACT_MULTIPLIER * quantity.value,
);
const feeEstimate = 2.5;
const cashEffect = computed(() =>
  side.value === "buy"
    ? -(grossAmount.value + feeEstimate)
    : grossAmount.value - feeEstimate,
);
const marginEstimate = computed(() =>
  side.value === "sell" ? estimateMargin(quantity.value) : 0,
);
const strategyMargin = computed(() =>
  strategyLegs.value
    .filter((leg) => leg.side === "sell")
    .reduce((total, leg) => total + estimateMargin(leg.quantity), 0),
);
const strategyCashEffect = computed(() => {
  if (!strategyMetrics.value) return 0;
  return (
    -strategyMetrics.value.netPremium -
    strategyLegs.value.length * feeEstimate
  );
});
const submitLabel = computed(() =>
  mode.value === "single" ? translate("order.submit") : translate("order.simulate"),
);
const canSubmit = computed(() => {
  if (mode.value === "strategy") {
    return availableCash.value >=
      Math.max(-strategyCashEffect.value, 0) + strategyMargin.value;
  }
  if (side.value === "buy") return availableCash.value >= grossAmount.value + feeEstimate;
  return availableCash.value >= marginEstimate.value + feeEstimate;
});

watch(
  () => [type.value, strike.value],
  () => {
    priceText.value = currentPrice.value.toFixed(4);
  },
  { immediate: true },
);

function changeSide(nextSide: OptionSide) {
  side.value = nextSide;
}

function changeType(nextType: OptionType) {
  type.value = nextType;
}

function changeStrike(event: { detail: { value: number | string } }) {
  const nextStrike = strikes[Number(event.detail.value)];
  if (nextStrike !== undefined) strike.value = nextStrike;
}

function adjustQuantity(delta: number) {
  quantity.value = Math.min(20, Math.max(1, quantity.value + delta));
}

function submit() {
  if (!canSubmit.value) {
    uni.showToast({
      title:
        mode.value === "single"
          ? translate("order.insufficientFunds")
          : translate("order.insufficientMargin"),
      icon: "none",
    });
    return;
  }

  const content =
    mode.value === "strategy"
      ? translate("order.strategyContent", {
          name: selectedTemplate.value?.name ?? translate("order.strategyCombo"),
          legs: strategyLegs.value.length,
        })
      : translate("order.singleContent", {
          side: translate(side.value === "buy" ? "common.buy" : "common.sell"),
          qty: quantity.value,
          contract: optionDisplayName(type.value, strike.value),
          price: limitPrice.value.toFixed(4),
        });

  uni.showModal({
    title: translate("order.confirmTitle"),
    content,
    confirmText: translate("order.confirmAction"),
    confirmColor: "#0e6f5c",
    success: (result) => {
      if (!result.confirm) return;
      try {
        if (mode.value === "strategy") {
          placeStrategy(
            strategyLegs.value,
            selectedTemplate.value?.name ?? translate("order.strategyCombo"),
          );
        } else {
          placeOrder({
            type: type.value,
            strike: strike.value,
            side: side.value,
            quantity: quantity.value,
            price: limitPrice.value,
          });
        }
        uni.showToast({ title: translate("order.success"), icon: "success" });
        setTimeout(() => {
          uni.redirectTo({ url: "/pages/practice/index" });
        }, 500);
      } catch (error) {
        uni.showToast({
          title: error instanceof Error ? error.message : translate("order.failed"),
          icon: "none",
        });
      }
    },
  });
}
</script>

<template>
  <AppShell secondary>
    <view class="page-canvas page-canvas--secondary">
      <view class="page-content order-page">
        <PageHeader
          back
          :title="mode === 'single' ? $t('order.title') : $t('order.strategyTitle')"
          :eyebrow="$t('order.title')"
          :subtitle="$t('order.subtitle')"
        >
          <template #action>
            <view class="simulation-chip">
              <view class="simulation-chip__dot" />
              <text>{{ $t("order.simulation") }}</text>
            </view>
          </template>
        </PageHeader>

        <view v-if="mode === 'single'" class="order-layout">
          <view class="order-main">
            <view class="underlying-strip card">
              <view class="underlying-strip__identity">
                <view class="underlying-strip__mark">300</view>
                <view>
                  <text class="underlying-strip__name">{{ underlyingDisplayName() }}</text>
                  <text class="underlying-strip__meta">{{ underlying.symbol }} · {{ demoSnapshotLabel() }}</text>
                </view>
              </view>
              <view class="underlying-strip__quote">
                <text class="underlying-strip__price mono">{{ underlying.spot.toFixed(3) }}</text>
                <text class="positive mono">{{ formatPercent(underlying.changePct, 2, true) }}</text>
              </view>
            </view>

            <view class="order-ticket card">
              <view class="order-ticket__head">
                <text class="order-ticket__title">{{ $t("order.orderParams") }}</text>
                <text class="order-ticket__meta">{{ $t("order.oneContract", { multiplier: CONTRACT_MULTIPLIER.toLocaleString() }) }}</text>
              </view>

              <view class="order-field">
                <text class="order-field__label">{{ $t("order.side") }}</text>
                <view class="segmented order-field__segmented">
                  <button
                    class="segmented__item order-side order-side--buy"
                    :class="{ 'order-side--active': side === 'buy' }"
                    @tap="changeSide('buy')"
                  >
                    {{ $t("order.buyOpen") }}
                  </button>
                  <button
                    class="segmented__item order-side order-side--sell"
                    :class="{ 'order-side--active': side === 'sell' }"
                    @tap="changeSide('sell')"
                  >
                    {{ $t("order.sellOpen") }}
                  </button>
                </view>
              </view>

              <view class="order-divider" />

              <view class="order-field">
                <text class="order-field__label">{{ $t("order.optionType") }}</text>
                <view class="segmented order-field__segmented">
                  <button
                    class="segmented__item"
                    :class="{ 'segmented__item--active': type === 'call' }"
                    @tap="changeType('call')"
                  >
                    {{ $t("common.call") }}
                  </button>
                  <button
                    class="segmented__item"
                    :class="{ 'segmented__item--active': type === 'put' }"
                    @tap="changeType('put')"
                  >
                    {{ $t("common.put") }}
                  </button>
                </view>
              </view>

              <view class="order-divider" />

              <view class="order-field order-field--inline">
                <view>
                  <text class="order-field__label">{{ $t("common.strike") }}</text>
                  <text class="order-field__hint">{{ $t("order.expiryHint", { date: demoExpiryLabel(), days: elapsedDaysLabel() }) }}</text>
                </view>
                <picker
                  :range="strikes.map((item) => item.toFixed(3))"
                  :value="strikes.indexOf(strike)"
                  @change="changeStrike"
                >
                  <button class="order-value-picker">
                    <text class="mono">{{ strike.toFixed(3) }}</text>
                    <AppIcon name="chevronRight" :size="14" color="#7b8783" />
                  </button>
                </picker>
              </view>

              <view class="quote-inline">
                <view class="quote-inline__item">
                  <text>{{ $t("practice.lastPrice") }}</text>
                  <text class="mono">{{ currentPrice.toFixed(4) }}</text>
                </view>
                <view class="quote-inline__item">
                  <text>{{ $t("order.impliedVol") }}</text>
                  <text class="mono">{{ formatVol(selectedQuote?.iv ?? 0) }}</text>
                </view>
                <view class="quote-inline__item">
                  <text>{{ $t("order.volume") }}</text>
                  <text class="mono">{{ (selectedQuote?.volume ?? 0).toLocaleString() }}</text>
                </view>
              </view>

              <view class="order-field">
                <view class="order-field__label-row">
                  <text class="order-field__label">{{ $t("order.orderPrice") }}</text>
                  <button class="order-field__quick" @tap="priceText = currentPrice.toFixed(4)">
                    <text>{{ $t("order.useLast") }}</text>
                  </button>
                </view>
                <view class="price-input">
                  <text class="price-input__prefix mono">¥</text>
                  <input
                    v-model="priceText"
                    class="price-input__field mono"
                    type="digit"
                    :placeholder="currentPrice.toFixed(4)"
                  />
                  <text class="price-input__unit">{{ $t("order.perShare") }}</text>
                </view>
              </view>

              <view class="order-field">
                <text class="order-field__label">{{ $t("order.orderQuantity") }}</text>
                <view class="quantity-row">
                  <view class="quantity-row__stepper">
                    <button class="quantity-row__button" @tap="adjustQuantity(-1)">
                      <AppIcon name="minus" :size="15" color="#52605c" />
                    </button>
                    <text class="quantity-row__value mono">{{ quantity }}</text>
                    <button class="quantity-row__button" @tap="adjustQuantity(1)">
                      <AppIcon name="plus" :size="15" color="#52605c" />
                    </button>
                  </view>
                  <text class="quantity-row__unit">{{ $t("order.contracts") }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="order-aside">
            <view class="order-summary card">
              <view class="order-summary__head">
                <text class="order-summary__title">{{ $t("order.orderPreview") }}</text>
                <view
                  class="chip"
                  :class="side === 'buy' ? 'chip--red' : 'chip--teal'"
                >
                  {{ side === "buy" ? $t("order.buyer") : $t("order.seller") }}
                </view>
              </view>
              <view class="summary-contract">
                <text class="summary-contract__name">{{ optionDisplayName(type, strike) }}</text>
                <text class="summary-contract__meta">{{ demoExpiryLabel() }} · {{ type === "call" ? $t("common.call") : $t("common.put") }}</text>
              </view>
              <view class="summary-list">
                <view class="summary-row">
                  <text>{{ $t("common.premium") }}</text>
                  <text class="mono">{{ formatMoney(grossAmount) }}</text>
                </view>
                <view class="summary-row">
                  <text>{{ $t("order.feeEstimate") }}</text>
                  <text class="mono">{{ formatMoney(feeEstimate) }}</text>
                </view>
                <view class="summary-row summary-row--strong">
                  <text>{{ side === "buy" ? $t("order.estimatedDebit") : $t("order.estimatedCredit") }}</text>
                  <text class="mono">{{ formatMoney(Math.abs(cashEffect)) }}</text>
                </view>
                <view class="summary-row">
                  <text>{{ $t("order.marginEstimate") }}</text>
                  <text class="mono">{{ formatMoney(marginEstimate) }}</text>
                </view>
                <view class="summary-row">
                  <text>{{ $t("common.availableCash") }}</text>
                  <text class="mono">{{ formatMoney(availableCash, 0) }}</text>
                </view>
              </view>
              <view class="summary-risk">
                <AppIcon name="alert" :size="15" color="#946617" />
                <text v-if="side === 'buy'">
                  {{ $t("order.buyerRisk") }}
                </text>
                <text v-else>
                  {{ $t("order.sellerRisk") }}
                </text>
              </view>
              <button
                class="button-primary button-primary--teal order-summary__button"
                :disabled="!canSubmit"
                @tap="submit"
              >
                <AppIcon name="check" :size="16" color="#ffffff" />
                <text>{{ submitLabel }}</text>
              </button>
              <text class="order-summary__note">{{ $t("order.localOnly") }}</text>
            </view>

            <view class="order-guide card">
              <text class="order-guide__title">{{ $t("order.matchingRules") }}</text>
              <view class="order-guide__item">
                <text class="mono">01</text>
                <text>{{ $t("order.rule1") }}</text>
              </view>
              <view class="order-guide__item">
                <text class="mono">02</text>
                <text>{{ $t("order.rule2") }}</text>
              </view>
              <view class="order-guide__item">
                <text class="mono">03</text>
                <text>{{ $t("order.rule3") }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="strategy-order-layout">
          <view class="strategy-order-main">
            <view class="strategy-order-head card">
              <view class="strategy-order-head__icon">
                <AppIcon name="chart" :size="23" color="#0e6f5c" />
              </view>
              <view class="strategy-order-head__copy">
                <text class="eyebrow">{{ $t("order.strategyOrder") }}</text>
                <text class="strategy-order-head__title">{{ selectedTemplate?.name }}</text>
                <text class="strategy-order-head__desc">{{ selectedTemplate?.thesis }}</text>
              </view>
              <view class="chip chip--blue">{{ selectedTemplate?.risk }}</view>
            </view>

            <view class="strategy-leg-list card">
              <view class="strategy-leg-list__head">
                <text>{{ $t("order.strategyLegs") }}</text>
                <text>{{ demoExpiryLabel() }} · {{ demoSnapshotLabel() }}</text>
              </view>
              <view
                v-for="leg in strategyLegs"
                :key="leg.uid"
                class="strategy-leg-row"
              >
                <view
                  class="strategy-leg-side"
                  :class="leg.side === 'buy' ? 'strategy-leg-side--buy' : 'strategy-leg-side--sell'"
                >
                  {{ leg.side === "buy" ? $t("common.buy") : $t("common.sell") }}
                </view>
                <view class="strategy-leg-row__copy">
                  <text class="strategy-leg-row__title">
                    {{ leg.type === "call" ? $t("common.call") : $t("common.put") }} {{ leg.strike.toFixed(3) }}
                  </text>
                  <text class="strategy-leg-row__meta">
                    {{ leg.quantity }} {{ $t("order.contracts") }} · IV {{ formatVol(leg.iv) }}
                  </text>
                </view>
                <text class="mono strategy-leg-row__premium">{{ leg.premium.toFixed(4) }}</text>
                <text class="mono strategy-leg-row__amount">
                  {{ formatMoney(leg.premium * CONTRACT_MULTIPLIER * leg.quantity, 0) }}
                </text>
              </view>
            </view>

            <view class="strategy-scenario-card card">
              <view class="section-heading">
                <view class="section-heading__copy">
                  <text class="section-heading__title">{{ $t("order.executionChecks") }}</text>
                  <text class="section-heading__meta">{{ $t("order.executionMeta") }}</text>
                </view>
              </view>
              <view class="execution-checks">
                <view class="execution-check">
                  <AppIcon name="circleCheck" :size="17" color="#0e6f5c" />
                  <view>
                    <text>{{ $t("order.checkRiskTitle") }}</text>
                    <text>{{ $t("order.checkRiskDesc") }}</text>
                  </view>
                </view>
                <view class="execution-check">
                  <AppIcon name="circleCheck" :size="17" color="#0e6f5c" />
                  <view>
                    <text>{{ $t("order.checkCashTitle") }}</text>
                    <text>{{ $t("order.checkCashDesc") }}</text>
                  </view>
                </view>
                <view class="execution-check">
                  <AppIcon name="alert" :size="17" color="#946617" />
                  <view>
                    <text>{{ $t("order.checkBookTitle") }}</text>
                    <text>{{ $t("order.checkBookDesc") }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="strategy-order-aside">
            <view class="order-summary card">
              <view class="order-summary__head">
                <text class="order-summary__title">{{ $t("order.comboPreview") }}</text>
                <view class="chip chip--teal">{{ $t("order.legsCount", { count: strategyLegs.length }) }}</view>
              </view>
              <view class="summary-list">
                <view class="summary-row">
                  <text>{{ $t("home.netPremium") }}</text>
                  <text class="mono">
                    {{ (strategyMetrics?.netPremium ?? 0) >= 0 ? $t("strategy.debit") : $t("strategy.creditAmount") }}
                    {{ formatMoney(Math.abs(strategyMetrics?.netPremium ?? 0), 0) }}
                  </text>
                </view>
                <view class="summary-row">
                  <text>{{ $t("home.maxProfit") }}</text>
                  <text class="mono positive">
                    {{ Number.isFinite(strategyMetrics?.maxProfit) ? formatMoney(strategyMetrics?.maxProfit ?? 0, 0) : $t("home.unlimited") }}
                  </text>
                </view>
                <view class="summary-row">
                  <text>{{ $t("home.maxLoss") }}</text>
                  <text class="mono negative">
                    {{ Number.isFinite(strategyMetrics?.maxLoss) ? formatMoney(strategyMetrics?.maxLoss ?? 0, 0) : $t("home.highRisk") }}
                  </text>
                </view>
                <view class="summary-row">
                  <text>{{ $t("order.feeEstimate") }}</text>
                  <text class="mono">{{ formatMoney(strategyLegs.length * feeEstimate) }}</text>
                </view>
                <view class="summary-row summary-row--strong">
                  <text>{{ $t("order.expectedCashChange") }}</text>
                  <text class="mono">{{ formatSignedMoney(strategyCashEffect) }}</text>
                </view>
                <view class="summary-row">
                  <text>{{ $t("order.marginEstimate") }}</text>
                  <text class="mono">{{ formatMoney(strategyMargin, 0) }}</text>
                </view>
                <view class="summary-row">
                  <text>{{ $t("common.availableCash") }}</text>
                  <text class="mono">{{ formatMoney(availableCash, 0) }}</text>
                </view>
              </view>
              <view class="summary-risk">
                <AppIcon name="info" :size="15" color="#946617" />
                <text>{{ $t("order.noBroker") }}</text>
              </view>
              <button
                class="button-primary button-primary--teal order-summary__button"
                :disabled="!canSubmit"
                @tap="submit"
              >
                <AppIcon name="check" :size="16" color="#ffffff" />
                <text>{{ submitLabel }}</text>
              </button>
              <text class="order-summary__note">{{ $t("order.localOnly") }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.simulation-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid #cee5de;
  border-radius: 5px;
  background: var(--teal-wash);
  color: var(--teal);
  font-size: 9px;
  font-weight: 650;
}

.simulation-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--teal-bright);
}

.order-layout,
.strategy-order-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  align-items: start;
}

.order-main,
.strategy-order-main,
.order-aside,
.strategy-order-aside {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.underlying-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
}

.underlying-strip__identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.underlying-strip__mark {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--ink);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
}

.underlying-strip__name {
  display: block;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.underlying-strip__meta {
  display: block;
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 8px;
}

.underlying-strip__quote {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.underlying-strip__price {
  color: var(--ink);
  font-size: 19px;
  font-weight: 700;
}

.underlying-strip__quote .positive {
  font-size: 9px;
}

.order-ticket {
  padding: 20px;
}

.order-ticket__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--line);
}

.order-ticket__title {
  color: var(--ink);
  font-size: 15px;
  font-weight: 730;
}

.order-ticket__meta {
  color: var(--muted-light);
  font-size: 9px;
}

.order-field {
  margin-top: 17px;
}

.order-field--inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.order-field__label {
  display: block;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 650;
}

.order-field__hint {
  display: block;
  margin-top: 2px;
  color: var(--muted-light);
  font-size: 8px;
}

.order-field__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-field__quick {
  color: var(--teal);
  font-size: 9px;
  font-weight: 650;
}

.order-field__segmented {
  display: flex;
  width: 100%;
  margin-top: 8px;
}

.order-field__segmented .segmented__item {
  flex: 1;
}

.order-side--buy.segmented__item:not(.order-side--active) {
  color: #a84237;
}

.order-side--sell.segmented__item:not(.order-side--active) {
  color: var(--teal);
}

.order-side--buy.order-side--active {
  background: var(--red);
  color: #ffffff;
}

.order-side--sell.order-side--active {
  background: var(--teal);
  color: #ffffff;
}

.order-divider {
  height: 1px;
  margin-top: 17px;
  background: var(--line);
}

.order-value-picker {
  display: flex;
  min-width: 112px;
  height: 38px;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fbfcfb;
  color: var(--ink);
  font-size: 14px;
  font-weight: 650;
}

.quote-inline {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--surface-soft);
}

.quote-inline__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--muted-light);
  font-size: 8px;
}

.quote-inline__item .mono {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 650;
}

.price-input {
  display: flex;
  height: 48px;
  align-items: center;
  margin-top: 8px;
  padding: 0 13px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: #ffffff;
}

.price-input__prefix {
  color: var(--muted);
  font-size: 13px;
}

.price-input__field {
  height: 100%;
  flex: 1;
  padding: 0 7px;
  color: var(--ink);
  font-size: 21px;
  font-weight: 650;
}

.price-input__unit {
  color: var(--muted-light);
  font-size: 9px;
}

.quantity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.quantity-row__stepper {
  display: flex;
  height: 38px;
  align-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  overflow: hidden;
}

.quantity-row__button {
  display: flex;
  width: 38px;
  height: 36px;
  align-items: center;
  justify-content: center;
  background: #fbfcfb;
}

.quantity-row__value {
  display: flex;
  width: 52px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--line);
  border-left: 1px solid var(--line);
  color: var(--ink);
  font-size: 13px;
  font-weight: 650;
}

.quantity-row__unit {
  color: var(--muted);
  font-size: 9px;
}

.order-summary {
  padding: 18px;
}

.order-summary__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.order-summary__title {
  color: var(--ink);
  font-size: 14px;
  font-weight: 730;
}

.summary-contract {
  display: flex;
  flex-direction: column;
  margin-top: 16px;
  padding: 13px;
  border-radius: 6px;
  background: var(--surface-soft);
}

.summary-contract__name {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.summary-contract__meta {
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
}

.summary-list {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  color: var(--muted);
  font-size: 9px;
}

.summary-row .mono {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 600;
}

.summary-row--strong {
  margin-top: 3px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
}

.summary-row--strong .mono {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.summary-risk {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 7px;
  padding: 10px;
  border: 1px solid #ead8b5;
  border-radius: 6px;
  background: #fdf9f1;
  color: #80652b;
  font-size: 8px;
  line-height: 1.55;
}

.order-summary__button {
  width: 100%;
  margin-top: 14px;
}

.order-summary__note {
  display: block;
  margin-top: 7px;
  color: var(--muted-light);
  font-size: 8px;
  text-align: center;
}

.order-guide {
  padding: 16px;
}

.order-guide__title {
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.order-guide__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  color: var(--muted);
  font-size: 8px;
  line-height: 1.5;
}

.order-guide__item .mono {
  color: var(--muted-light);
  font-size: 8px;
}

.strategy-order-head {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 18px;
}

.strategy-order-head__icon {
  display: flex;
  width: 43px;
  height: 43px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--teal-wash);
}

.strategy-order-head__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.strategy-order-head__title {
  margin-top: 2px;
  color: var(--ink);
  font-size: 18px;
  font-weight: 730;
}

.strategy-order-head__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.5;
}

.strategy-leg-list {
  padding: 18px;
}

.strategy-leg-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.strategy-leg-list__head text:last-child {
  color: var(--muted-light);
  font-size: 8px;
  font-weight: 400;
}

.strategy-leg-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 64px 82px;
  align-items: center;
  gap: 10px;
  min-height: 60px;
  border-bottom: 1px solid var(--line);
}

.strategy-leg-row:last-child {
  border-bottom: 0;
}

.strategy-leg-side {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 750;
}

.strategy-leg-side--buy {
  background: var(--red-wash);
  color: #a84237;
}

.strategy-leg-side--sell {
  background: var(--teal-wash);
  color: var(--teal);
}

.strategy-leg-row__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.strategy-leg-row__title {
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
}

.strategy-leg-row__meta {
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 8px;
}

.strategy-leg-row__premium,
.strategy-leg-row__amount {
  color: var(--ink-soft);
  font-size: 10px;
  text-align: right;
}

.strategy-scenario-card {
  padding: 18px;
}

.execution-checks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.execution-check {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.execution-check > view {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.execution-check > view text:first-child {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 650;
}

.execution-check > view text:last-child {
  color: var(--muted);
  font-size: 8px;
}

@media (max-width: 1000px) {
  .order-layout,
  .strategy-order-layout {
    grid-template-columns: minmax(0, 1fr) 290px;
  }
}

@media (max-width: 900px) {
  .simulation-chip {
    display: none;
  }

  .order-layout,
  .strategy-order-layout {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .order-main,
  .strategy-order-main {
    width: 100%;
  }

  .order-aside,
  .strategy-order-aside {
    width: 100%;
  }

  .underlying-strip {
    padding: 13px 14px;
  }

  .order-ticket,
  .order-summary,
  .strategy-order-head,
  .strategy-leg-list,
  .strategy-scenario-card {
    padding: 16px;
  }

  .order-field--inline {
    align-items: flex-start;
  }

  .strategy-order-head {
    flex-wrap: wrap;
  }

  .strategy-order-head .chip {
    margin-left: 56px;
  }

  .strategy-leg-row {
    grid-template-columns: 28px minmax(0, 1fr) 70px;
  }

  .strategy-leg-row__premium {
    display: none;
  }
}
</style>
