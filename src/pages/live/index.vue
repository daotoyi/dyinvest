<script setup lang="ts">
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";
import { translate } from "../../i18n";

const connectionModes = [
  {
    code: "A",
    nameKey: "live.modeA",
    descKey: "live.modeADesc",
    stateKey: "live.modeAState",
    footKey: "live.modeAFoot",
  },
  {
    code: "B",
    nameKey: "live.modeB",
    descKey: "live.modeBDesc",
    stateKey: "live.modeBState",
    footKey: "live.modeBFoot",
  },
  {
    code: "C",
    nameKey: "live.modeC",
    descKey: "live.modeCDesc",
    stateKey: "live.modeCState",
    footKey: "live.modeCFoot",
  },
];

const requirements = [
  { titleKey: "live.req1", descKey: "live.req1Desc", done: false },
  { titleKey: "live.req2", descKey: "live.req2Desc", done: false },
  { titleKey: "live.req3", descKey: "live.req3Desc", done: false },
  { titleKey: "live.req4", descKey: "live.req4Desc", done: false },
  { titleKey: "live.req5", descKey: "live.req5Desc", done: false },
  { titleKey: "live.req6", descKey: "live.req6Desc", done: false },
];

function unavailable() {
  uni.showToast({
    title: translate("live.unavailable"),
    icon: "none",
  });
}
</script>

<template>
  <AppShell secondary>
    <view class="page-canvas page-canvas--secondary">
      <view class="page-content">
        <PageHeader
          back
          :title="$t('live.title')"
          :eyebrow="$t('live.eyebrow')"
          :subtitle="$t('live.subtitle')"
        >
          <template #action>
            <view class="live-status">
              <view class="live-status__dot" />
              <text>{{ $t("live.status") }}</text>
            </view>
          </template>
        </PageHeader>

        <view class="live-hero">
          <view class="live-hero__copy">
            <text class="eyebrow">{{ $t("live.currentStatus") }}</text>
            <text class="live-hero__title">{{ $t("live.heroTitle") }}</text>
            <text class="live-hero__desc">
              {{ $t("live.heroDesc") }}
            </text>
          </view>
          <view class="live-hero__badge">
            <AppIcon name="shield" :size="25" color="#946617" />
            <view>
              <text>{{ $t("live.liveStatus") }}</text>
              <text>{{ $t("live.pendingBlocker") }}</text>
            </view>
          </view>
        </view>

        <view class="mode-section">
          <view class="section-heading">
            <view class="section-heading__copy">
              <text class="section-heading__title">{{ $t("live.pathsTitle") }}</text>
              <text class="section-heading__meta">{{ $t("live.pathsMeta") }}</text>
            </view>
          </view>
          <view class="mode-grid">
            <view
              v-for="mode in connectionModes"
              :key="mode.code"
              class="mode-card card"
            >
              <view class="mode-card__head">
                <view class="mode-card__code mono">{{ mode.code }}</view>
                <view class="chip" :class="mode.code === 'A' ? 'chip--teal' : 'chip--amber'">
                  {{ $t(mode.stateKey) }}
                </view>
              </view>
              <text class="mode-card__title">{{ $t(mode.nameKey) }}</text>
              <text class="mode-card__desc">{{ $t(mode.descKey) }}</text>
              <view class="mode-card__line" />
              <text class="mode-card__foot">
                {{ $t(mode.footKey) }}
              </text>
            </view>
          </view>
        </view>

        <view class="live-layout">
          <view class="requirements-panel card">
            <view class="requirements-panel__head">
              <view>
                <text class="requirements-panel__title">{{ $t("live.checklistTitle") }}</text>
                <text class="requirements-panel__meta">{{ $t("live.checklistMeta", { done: 0, total: requirements.length }) }}</text>
              </view>
              <view class="chip chip--amber">{{ $t("live.notReady") }}</view>
            </view>
            <view class="requirement-list">
              <view
                v-for="(item, index) in requirements"
                :key="item.titleKey"
                class="requirement-row"
              >
                <view class="requirement-row__index mono">{{ String(index + 1).padStart(2, "0") }}</view>
                <view class="requirement-row__copy">
                  <text class="requirement-row__title">{{ $t(item.titleKey) }}</text>
                  <text class="requirement-row__desc">{{ $t(item.descKey) }}</text>
                </view>
                <view class="requirement-row__state">
                  <AppIcon name="circleDashed" :size="16" color="#95a09c" />
                  <text>{{ $t("live.pendingConfirm") }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="security-panel card">
            <view class="security-panel__icon">
              <AppIcon name="lock" :size="23" color="#0e6f5c" />
            </view>
            <text class="security-panel__title">{{ $t("live.securityTitle") }}</text>
            <view class="security-list">
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>{{ $t("live.security1") }}</text>
              </view>
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>{{ $t("live.security2") }}</text>
              </view>
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>{{ $t("live.security3") }}</text>
              </view>
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>{{ $t("live.security4") }}</text>
              </view>
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>{{ $t("live.security5") }}</text>
              </view>
            </view>
            <view class="security-panel__note">
              <AppIcon name="info" :size="13" color="#7b8783" />
              <text>{{ $t("live.securityNote") }}</text>
            </view>
          </view>
        </view>

        <view class="connection-flow">
          <view class="section-heading">
            <view class="section-heading__copy">
              <text class="section-heading__title">{{ $t("live.flowTitle") }}</text>
              <text class="section-heading__meta">{{ $t("live.flowMeta") }}</text>
            </view>
          </view>
          <view class="flow-grid">
            <view class="flow-step">
              <view class="flow-step__index mono">01</view>
              <text class="flow-step__title">{{ $t("live.flow1Title") }}</text>
              <text class="flow-step__desc">{{ $t("live.flow1Desc") }}</text>
            </view>
            <view class="flow-step">
              <view class="flow-step__index mono">02</view>
              <text class="flow-step__title">{{ $t("live.flow2Title") }}</text>
              <text class="flow-step__desc">{{ $t("live.flow2Desc") }}</text>
            </view>
            <view class="flow-step">
              <view class="flow-step__index mono">03</view>
              <text class="flow-step__title">{{ $t("live.flow3Title") }}</text>
              <text class="flow-step__desc">{{ $t("live.flow3Desc") }}</text>
            </view>
            <view class="flow-step">
              <view class="flow-step__index mono">04</view>
              <text class="flow-step__title">{{ $t("live.flow4Title") }}</text>
              <text class="flow-step__desc">{{ $t("live.flow4Desc") }}</text>
            </view>
          </view>
        </view>

        <view class="live-action">
          <view class="live-action__copy">
            <text class="live-action__title">{{ $t("live.actionTitle") }}</text>
            <text class="live-action__desc">
              {{ $t("live.actionDesc") }}
            </text>
          </view>
          <button class="button-secondary" @tap="unavailable">
            <AppIcon name="link" :size="16" color="#17211e" />
            <text>{{ $t("live.actionButton") }}</text>
          </button>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.live-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid #ead8b5;
  border-radius: 5px;
  background: #fdf9f1;
  color: #946617;
  font-size: 9px;
  font-weight: 650;
}

.live-status__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--amber);
}

.live-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 26px;
  padding: 25px;
  border: 1px solid #e8dabf;
  border-radius: 8px;
  background: #fdf9f1;
}

.live-hero__copy {
  display: flex;
  max-width: 720px;
  flex-direction: column;
}

.live-hero__title {
  margin-top: 5px;
  color: var(--ink);
  font-size: 23px;
  font-weight: 750;
}

.live-hero__desc {
  margin-top: 7px;
  color: #746a53;
  font-size: 11px;
  line-height: 1.7;
}

.live-hero__badge {
  display: flex;
  min-width: 190px;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #ead8b5;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.7);
}

.live-hero__badge view {
  display: flex;
  flex-direction: column;
}

.live-hero__badge view text:first-child {
  color: var(--muted);
  font-size: 8px;
}

.live-hero__badge view text:last-child {
  margin-top: 2px;
  color: #71551d;
  font-size: 10px;
  font-weight: 700;
}

.mode-section {
  margin-top: 25px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  padding: 17px;
}

.mode-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mode-card__code {
  color: var(--muted-light);
  font-size: 18px;
  font-weight: 700;
}

.mode-card__title {
  margin-top: 15px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.mode-card__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.55;
}

.mode-card__line {
  height: 1px;
  margin: 14px 0 10px;
  background: var(--line);
}

.mode-card__foot {
  color: var(--muted-light);
  font-size: 8px;
}

.live-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
  align-items: start;
  margin-top: 16px;
}

.requirements-panel {
  padding: 20px;
}

.requirements-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.requirements-panel__title {
  color: var(--ink);
  font-size: 15px;
  font-weight: 730;
}

.requirements-panel__meta {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

.requirement-list {
  margin-top: 13px;
  border-top: 1px solid var(--line);
}

.requirement-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  border-bottom: 1px solid var(--line);
}

.requirement-row__index {
  width: 24px;
  flex: 0 0 auto;
  color: var(--muted-light);
  font-size: 9px;
}

.requirement-row__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.requirement-row__title {
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
}

.requirement-row__desc {
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
}

.requirement-row__state {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted-light);
  font-size: 8px;
  white-space: nowrap;
}

.security-panel {
  padding: 19px;
}

.security-panel__icon {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--teal-wash);
}

.security-panel__title {
  display: block;
  margin-top: 12px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 720;
}

.security-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.security-item {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 9px;
}

.security-panel__note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 8px;
  line-height: 1.5;
}

.connection-flow {
  margin-top: 24px;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.flow-step {
  position: relative;
  display: flex;
  min-height: 145px;
  flex-direction: column;
  padding: 18px;
  border-right: 1px solid var(--line);
}

.flow-step:last-child {
  border-right: 0;
}

.flow-step__index {
  color: var(--teal);
  font-size: 10px;
  font-weight: 650;
}

.flow-step__title {
  margin-top: 23px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.flow-step__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.55;
}

.live-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 18px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.live-action__copy {
  display: flex;
  flex-direction: column;
}

.live-action__title {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.live-action__desc {
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

@media (max-width: 1000px) {
  .live-layout {
    grid-template-columns: minmax(0, 1fr) 260px;
  }
}

@media (max-width: 900px) {
  .live-status {
    display: none;
  }

  .live-hero {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    padding: 18px;
  }

  .live-hero__title {
    font-size: 20px;
  }

  .live-hero__badge {
    width: 100%;
  }

  .mode-grid,
  .live-layout {
    grid-template-columns: 1fr;
  }

  .flow-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .flow-step:nth-child(2) {
    border-right: 0;
  }

  .flow-step:nth-child(-n + 2) {
    border-bottom: 1px solid var(--line);
  }

  .live-action {
    align-items: flex-start;
    flex-direction: column;
  }

  .live-action .button-secondary {
    width: 100%;
  }
}
</style>
