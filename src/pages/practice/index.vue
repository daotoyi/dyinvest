<script setup lang="ts">
import { computed, ref } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import MiniLineChart from "../../components/MiniLineChart.vue";
import PageHeader from "../../components/PageHeader.vue";
import {
  CONTRACT_MULTIPLIER,
  demoSnapshotLabel,
  findQuoteById,
  optionDisplayName,
  underlying,
} from "../../data/options";
import { usePaperAccount } from "../../composables/usePaperAccount";
import { translate } from "../../i18n";
import {
  formatMoney,
  formatPercent,
  formatSignedMoney,
} from "../../domain/format";

const {
  state,
  initialEquity,
  totalEquity,
  availableCash,
  marginUsed,
  unrealizedPnl,
  totalReturn,
  activePositions,
  currentPremium,
} = usePaperAccount();

const activeTab = ref<"positions" | "orders">("positions");
const latestEquity = computed(() =>
  state.equityHistory[state.equityHistory.length - 1] ?? totalEquity.value,
);
const previousEquity = computed(
  () =>
    state.equityHistory[state.equityHistory.length - 2] ??
    latestEquity.value,
);
const dayChange = computed(() => latestEquity.value - previousEquity.value);
const dayChangePct = computed(() =>
  previousEquity.value === 0 ? 0 : dayChange.value / previousEquity.value,
);
const marginRatio = computed(() =>
  totalEquity.value === 0 ? 0 : marginUsed.value / totalEquity.value,
);
const positions = computed(() =>
  activePositions.value.map((position) => {
    const quote = findQuoteById(position.quoteId);
    const current = currentPremium(position);
    const pnl =
      position.netQty *
      (current - position.avgPremium) *
      CONTRACT_MULTIPLIER;
    const marketValue =
      position.netQty * current * CONTRACT_MULTIPLIER;
    return {
      ...position,
      name: optionDisplayName(position.type, position.strike),
      current,
      pnl,
      marketValue,
      iv: quote?.iv ?? 0,
      sideLabel: translate(
        position.netQty > 0 ? "practice.longSide" : "practice.shortSide",
      ),
      quantity: Math.abs(position.netQty),
    };
  }),
);

function goOrder() {
  uni.navigateTo({ url: "/pages/order/index" });
}

function goLive() {
  uni.navigateTo({ url: "/pages/live/index" });
}
</script>

<template>
  <AppShell>
    <view class="page-canvas">
      <view class="page-content">
        <PageHeader
          :title="$t('practice.title')"
          :eyebrow="$t('practice.eyebrow')"
          :subtitle="$t('practice.subtitle')"
        >
          <template #action>
            <button class="button-primary" @tap="goOrder">
              <AppIcon name="plus" :size="16" color="#ffffff" />
              <text>{{ $t("practice.newOrder") }}</text>
            </button>
          </template>
        </PageHeader>

        <view class="practice-overview">
          <view class="equity-panel">
            <view class="equity-panel__head">
              <view>
                <text class="equity-panel__label">{{ $t("practice.accountEquity") }}</text>
                <text class="equity-panel__value mono">{{ formatMoney(totalEquity) }}</text>
                <view class="equity-panel__change">
                  <view class="equity-panel__change-item">
                    <AppIcon
                      :name="dayChange >= 0 ? 'trendUp' : 'trendDown'"
                      :size="14"
                      :color="dayChange >= 0 ? '#ff9e91' : '#8fd8c2'"
                    />
                    <text
                      class="mono"
                      :class="dayChange >= 0 ? 'equity-panel__up' : 'equity-panel__down'"
                    >
                      {{ formatSignedMoney(dayChange) }}
                    </text>
                    <text
                      class="mono"
                      :class="dayChange >= 0 ? 'equity-panel__up' : 'equity-panel__down'"
                    >
                      {{ formatPercent(dayChangePct, 2, true) }}
                    </text>
                  </view>
                  <text class="equity-panel__period">{{ $t("practice.sampleDayChange") }}</text>
                </view>
              </view>
              <view class="equity-panel__env">
                <view class="status-dot" />
                <text>{{ $t("practice.localSim") }}</text>
              </view>
            </view>

            <view class="equity-panel__chart">
              <MiniLineChart
                :values="state.equityHistory"
                color="#8fd8c2"
                fill-color="rgba(143, 216, 194, 0.1)"
                :height="138"
              />
            </view>

            <view class="equity-panel__stats">
              <view class="equity-stat">
                <text class="equity-stat__label">{{ $t("common.totalReturn") }}</text>
                <text class="equity-stat__value mono">{{ formatPercent(totalReturn, 2, true) }}</text>
              </view>
              <view class="equity-stat">
                <text class="equity-stat__label">{{ $t("practice.unrealizedPnl") }}</text>
                <text
                  class="equity-stat__value mono"
                  :class="unrealizedPnl >= 0 ? 'equity-panel__up' : 'equity-panel__down'"
                >
                  {{ formatSignedMoney(unrealizedPnl) }}
                </text>
              </view>
              <view class="equity-stat">
                <text class="equity-stat__label">{{ $t("common.availableCash") }}</text>
                <text class="equity-stat__value mono">{{ formatMoney(availableCash, 0) }}</text>
              </view>
              <view class="equity-stat">
                <text class="equity-stat__label">{{ $t("practice.marginUsed") }}</text>
                <text class="equity-stat__value mono">{{ formatMoney(marginUsed, 0) }}</text>
              </view>
            </view>
          </view>

          <view class="account-side">
            <view class="risk-card card">
              <view class="risk-card__head">
                <view>
                  <text class="eyebrow">{{ $t("practice.riskSnapshot") }}</text>
                  <text class="risk-card__title">{{ $t("practice.accountRisk") }}</text>
                </view>
                <view class="chip chip--amber">{{ marginRatio > 0.25 ? $t("practice.elevated") : $t("practice.controlled") }}</view>
              </view>
              <view class="risk-card__metric">
                <view class="risk-card__metric-head">
                  <text>{{ $t("practice.marginUse") }}</text>
                  <text class="mono">{{ formatPercent(marginRatio, 1) }}</text>
                </view>
                <view class="risk-card__track">
                  <view
                    class="risk-card__track-value"
                    :style="{ width: `${Math.min(marginRatio * 100, 100)}%` }"
                  />
                </view>
              </view>
              <view class="risk-facts">
                <view class="risk-fact">
                  <text>{{ $t("practice.initialCapital") }}</text>
                  <text class="mono">{{ formatMoney(initialEquity, 0) }}</text>
                </view>
                <view class="risk-fact">
                  <text>{{ $t("practice.positionCount") }}</text>
                  <text class="mono">{{ activePositions.length }}</text>
                </view>
                <view class="risk-fact">
                  <text>{{ $t("practice.tradeCount") }}</text>
                  <text class="mono">{{ state.orders.length }}</text>
                </view>
              </view>
              <view class="risk-card__note">
                <AppIcon name="info" :size="13" color="#7b8783" />
                <text>{{ $t("practice.marginNote") }}</text>
              </view>
            </view>

            <button class="live-banner" @tap="goLive">
              <view class="live-banner__icon">
                <AppIcon name="link" :size="19" color="#946617" />
              </view>
              <view class="live-banner__copy">
                <text class="live-banner__title">{{ $t("practice.connectLive") }}</text>
                <text class="live-banner__desc">{{ $t("practice.connectLiveCopy") }}</text>
              </view>
              <view class="live-banner__status">{{ $t("nav.pending") }}</view>
              <AppIcon name="chevronRight" :size="15" color="#946617" />
            </button>
          </view>
        </view>

        <view class="portfolio-panel card">
          <view class="portfolio-panel__head">
            <view class="section-heading__copy">
              <text class="section-heading__title">{{ $t("practice.paperPositions") }}</text>
              <text class="section-heading__meta">{{ demoSnapshotLabel() }}</text>
            </view>
            <view class="segmented">
              <button
                class="segmented__item"
                :class="{ 'segmented__item--active': activeTab === 'positions' }"
                @tap="activeTab = 'positions'"
              >
                {{ $t("practice.positionTab", { count: activePositions.length }) }}
              </button>
              <button
                class="segmented__item"
                :class="{ 'segmented__item--active': activeTab === 'orders' }"
                @tap="activeTab = 'orders'"
              >
                {{ $t("practice.orderTab", { count: state.orders.length }) }}
              </button>
            </view>
          </view>

          <view v-if="activeTab === 'positions'">
            <view v-if="positions.length" class="position-table">
              <view class="position-table__head">
                <text>{{ $t("common.contract") }}</text>
                <text>{{ $t("practice.sideQty") }}</text>
                <text>{{ $t("practice.averagePrice") }}</text>
                <text>{{ $t("practice.lastPrice") }}</text>
                <text>{{ $t("practice.floating") }}</text>
              </view>
              <view
                v-for="position in positions"
                :key="position.key"
                class="position-row"
              >
                <view class="position-name">
                  <view
                    class="position-name__type"
                    :class="position.type === 'call' ? 'position-name__type--call' : 'position-name__type--put'"
                  >
                    {{ position.type === "call" ? "C" : "P" }}
                  </view>
                  <view>
                    <text class="position-name__title">{{ position.name }}</text>
                    <text class="position-name__meta">
                      {{ position.expiry }} · IV {{ formatPercent(position.iv, 1) }}
                    </text>
                  </view>
                </view>
                <view class="position-direction">
                  <text
                    class="chip"
                    :class="position.netQty > 0 ? 'chip--red' : 'chip--teal'"
                  >
                    {{ position.sideLabel }} {{ position.quantity }}
                  </text>
                </view>
                <text class="mono position-cell">{{ position.avgPremium.toFixed(4) }}</text>
                <text class="mono position-cell">{{ position.current.toFixed(4) }}</text>
                <view class="position-pnl">
                  <text
                    class="mono"
                    :class="position.pnl >= 0 ? 'positive' : 'negative'"
                  >
                    {{ formatSignedMoney(position.pnl) }}
                  </text>
                  <text class="position-pnl__meta mono">
                    {{ $t("practice.marketValue") }} {{ formatMoney(position.marketValue, 0) }}
                  </text>
                </view>
              </view>
            </view>
            <view v-else class="empty-state">
              <view class="empty-state__icon">
                <AppIcon name="layers" :size="24" color="#7b8783" />
              </view>
              <text class="empty-state__title">{{ $t("practice.emptyPositions") }}</text>
              <text class="empty-state__desc">{{ $t("practice.noPositionsDesc") }}</text>
              <button class="button-secondary" @tap="goOrder">
                <AppIcon name="plus" :size="15" color="#17211e" />
                <text>{{ $t("practice.newOrder") }}</text>
              </button>
            </view>
          </view>

          <view v-else>
            <view v-if="state.orders.length" class="order-list">
              <view
                v-for="order in state.orders"
                :key="order.id"
                class="order-row"
              >
                <view class="order-row__status">
                  <AppIcon name="check" :size="13" color="#0e6f5c" />
                </view>
                <view class="order-row__copy">
                  <text class="order-row__title">{{ order.title }}</text>
                  <text class="order-row__meta">{{ order.createdAt }} · {{ order.subtitle }}</text>
                </view>
                <view class="order-row__amount">
                  <text
                    class="mono"
                    :class="order.cashFlow >= 0 ? 'positive' : 'negative'"
                  >
                    {{ formatSignedMoney(order.cashFlow) }}
                  </text>
                  <text class="order-row__status-label">{{ order.status }}</text>
                </view>
              </view>
            </view>
            <view v-else class="empty-state">
              <view class="empty-state__icon">
                <AppIcon name="activity" :size="24" color="#7b8783" />
              </view>
              <text class="empty-state__title">{{ $t("practice.noOrdersTitle") }}</text>
              <text class="empty-state__desc">{{ $t("practice.noOrdersDesc") }}</text>
            </view>
          </view>

          <view class="portfolio-panel__foot">
            <view class="portfolio-panel__source">
              <AppIcon name="info" :size="13" color="#7b8783" />
              <text>{{ $t("practice.dataNote") }}</text>
            </view>
            <text class="portfolio-panel__spot mono">{{ $t("practice.underlyingSpot", { price: underlying.spot.toFixed(3) }) }}</text>
          </view>
        </view>

        <view class="action-row">
          <button class="action-tile" @tap="goOrder">
            <view class="action-tile__icon action-tile__icon--teal">
              <AppIcon name="plus" :size="20" color="#0e6f5c" />
            </view>
            <view>
              <text class="action-tile__title">{{ $t("practice.singleOrderTitle") }}</text>
              <text class="action-tile__desc">{{ $t("practice.singleOrderDesc") }}</text>
            </view>
            <AppIcon name="chevronRight" :size="16" color="#7b8783" />
          </button>
          <button class="action-tile" @tap="goLive">
            <view class="action-tile__icon action-tile__icon--amber">
              <AppIcon name="shield" :size="20" color="#946617" />
            </view>
            <view>
              <text class="action-tile__title">{{ $t("practice.liveCheckTitle") }}</text>
              <text class="action-tile__desc">{{ $t("practice.liveCheckDesc") }}</text>
            </view>
            <AppIcon name="chevronRight" :size="16" color="#7b8783" />
          </button>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.practice-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.75fr);
  gap: 16px;
}

.equity-panel {
  display: flex;
  min-height: 328px;
  flex-direction: column;
  padding: 23px;
  border-radius: 8px;
  background: #17211e;
  color: #ffffff;
}

.equity-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.equity-panel__label {
  display: block;
  color: #9caba6;
  font-size: 10px;
}

.equity-panel__value {
  display: block;
  margin-top: 6px;
  font-size: 31px;
  font-weight: 650;
}

.equity-panel__change {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 7px;
}

.equity-panel__change-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
}

.equity-panel__period {
  color: #778580;
  font-size: 9px;
}

.equity-panel__up {
  color: #ff9e91;
}

.equity-panel__down {
  color: #8fd8c2;
}

.equity-panel__env {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: 1px solid rgba(185, 229, 216, 0.17);
  border-radius: 5px;
  color: #b9e5d8;
  font-size: 9px;
}

.equity-panel__env .status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #8fd8c2;
}

.equity-panel__chart {
  height: 138px;
  margin: 11px -4px 0;
}

.equity-panel__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: auto;
  padding-top: 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.equity-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.equity-stat__label {
  color: #83918c;
  font-size: 9px;
}

.equity-stat__value {
  color: #e5ece9;
  font-size: 11px;
  font-weight: 600;
}

.account-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.risk-card {
  padding: 18px;
}

.risk-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.risk-card__title {
  display: block;
  margin-top: 3px;
  color: var(--ink);
  font-size: 16px;
  font-weight: 730;
}

.risk-card__metric {
  margin-top: 18px;
}

.risk-card__metric-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--muted);
  font-size: 9px;
}

.risk-card__metric-head .mono {
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
}

.risk-card__track {
  height: 5px;
  margin-top: 7px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--surface-soft);
}

.risk-card__track-value {
  height: 100%;
  border-radius: 3px;
  background: var(--amber);
}

.risk-facts {
  display: flex;
  flex-direction: column;
  margin-top: 14px;
}

.risk-fact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 9px;
}

.risk-fact:last-child {
  border-bottom: 0;
}

.risk-fact .mono {
  color: var(--ink-soft);
  font-size: 10px;
}

.risk-card__note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 7px;
  color: var(--muted-light);
  font-size: 8px;
  line-height: 1.5;
}

.live-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px;
  border: 1px solid #ead8b5;
  border-radius: 8px;
  background: #fdf9f1;
  text-align: left;
}

.live-banner__icon {
  display: flex;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--amber-wash);
}

.live-banner__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.live-banner__title {
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.live-banner__desc {
  margin-top: 1px;
  overflow: hidden;
  color: var(--muted);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-banner__status {
  color: #946617;
  font-size: 8px;
  font-weight: 650;
}

.portfolio-panel {
  margin-top: 16px;
  padding: 20px;
}

.portfolio-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.position-table__head,
.position-row {
  display: grid;
  grid-template-columns: minmax(210px, 1.45fr) 115px 88px 80px minmax(120px, 0.8fr);
  align-items: center;
  gap: 10px;
}

.position-table__head {
  margin-top: 15px;
  padding: 8px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 9px;
}

.position-table__head text:not(:first-child) {
  text-align: right;
}

.position-row {
  min-height: 66px;
  border-bottom: 1px solid var(--line);
}

.position-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.position-name__type {
  display: flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
}

.position-name__type--call {
  background: var(--red-wash);
  color: #a84237;
}

.position-name__type--put {
  background: var(--teal-wash);
  color: var(--teal);
}

.position-name__title {
  display: block;
  overflow: hidden;
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.position-name__meta {
  display: block;
  margin-top: 2px;
  color: var(--muted-light);
  font-size: 8px;
}

.position-direction {
  display: flex;
  justify-content: flex-end;
}

.position-cell {
  color: var(--ink-soft);
  font-size: 10px;
  text-align: right;
}

.position-pnl {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.position-pnl .mono:first-child {
  font-size: 11px;
  font-weight: 650;
}

.position-pnl__meta {
  color: var(--muted-light);
  font-size: 8px;
}

.order-list {
  margin-top: 15px;
  border-top: 1px solid var(--line);
}

.order-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  border-bottom: 1px solid var(--line);
}

.order-row__status {
  display: flex;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--teal-wash);
}

.order-row__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.order-row__title {
  overflow: hidden;
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-row__meta {
  margin-top: 2px;
  color: var(--muted-light);
  font-size: 8px;
}

.order-row__amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.order-row__amount .mono {
  font-size: 11px;
  font-weight: 650;
}

.order-row__status-label {
  color: var(--muted-light);
  font-size: 8px;
}

.empty-state {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.empty-state__icon {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--surface-soft);
}

.empty-state__title {
  margin-top: 5px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
}

.empty-state__desc {
  color: var(--muted);
  font-size: 10px;
}

.empty-state .button-secondary {
  margin-top: 8px;
}

.portfolio-panel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 10px;
}

.portfolio-panel__source {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted-light);
  font-size: 8px;
}

.portfolio-panel__spot {
  color: var(--muted);
  font-size: 9px;
}

.action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.action-tile {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  text-align: left;
}

.action-tile__icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
}

.action-tile__icon--teal {
  background: var(--teal-wash);
}

.action-tile__icon--amber {
  background: var(--amber-wash);
}

.action-tile > view:nth-child(2) {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.action-tile__title {
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.action-tile__desc {
  margin-top: 1px;
  color: var(--muted);
  font-size: 8px;
}

@media (max-width: 1050px) {
  .practice-overview {
    grid-template-columns: 1fr;
  }

  .account-side {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .page-header .button-primary {
    min-width: 42px;
    padding: 0 12px;
  }

  .practice-overview {
    gap: 12px;
  }

  .equity-panel {
    min-height: 315px;
    padding: 18px;
  }

  .equity-panel__value {
    font-size: 27px;
  }

  .equity-panel__stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .account-side {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .risk-card {
    padding: 16px;
  }

  .portfolio-panel {
    margin-top: 12px;
    padding: 16px;
  }

  .position-table__head {
    display: none;
  }

  .position-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    padding: 12px 0;
  }

  .position-name {
    grid-column: 1;
  }

  .position-direction {
    grid-column: 2;
  }

  .position-cell {
    display: none;
  }

  .position-pnl {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    padding-left: 39px;
  }

  .order-row {
    min-height: 60px;
  }

  .action-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .portfolio-panel__foot {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
