<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";
import { strategyTemplates } from "../../data/strategies";
import { useLearningProgress } from "../../composables/useLearningProgress";
import { usePaperAccount } from "../../composables/usePaperAccount";
import { useAuth } from "../../composables/useAuth";
import { useContentSettings } from "../../composables/useContentSettings";
import { formatMoney, formatPercent } from "../../domain/format";
import {
  EXPERIENCE_LABELS,
  RISK_LABELS,
} from "../../domain/user";

const { completedCount, progress, reset: resetLearning } = useLearningProgress();
const {
  totalEquity,
  totalReturn,
  activePositions,
  reset: resetPaper,
} = usePaperAccount();
const {
  currentUser,
  isLoggedIn,
  isAdmin,
  displayName,
  accountIdentifier,
  preferences,
  logout,
} = useAuth();
const { visibleLessons, visibleStrategies } = useContentSettings();

const level = computed(() => {
  if (preferences.value) return RISK_LABELS[preferences.value.riskLevel];
  if (completedCount.value >= 7) return "C4 · 积极型";
  if (completedCount.value >= 3) return "C3 · 稳健型";
  return "学习中";
});
const avatarLetter = computed(
  () => displayName.value.trim().slice(0, 1) || "研",
);
const defaultStrategyName = computed(() => {
  const id = preferences.value?.defaultStrategyId;
  return (
    visibleStrategies.value.find((template) => template.id === id)?.name ??
    strategyTemplates.find((template) => template.id === id)?.name ??
    "牛市看涨价差"
  );
});

function openLive() {
  uni.navigateTo({ url: "/pages/live/index" });
}

function openAuth(mode: "login" | "register" = "login") {
  uni.navigateTo({ url: `/pages/auth/index?mode=${mode}` });
}

function openSettings() {
  uni.navigateTo({ url: "/pages/settings/index" });
}

function openAdmin() {
  uni.navigateTo({ url: "/pages/admin/index" });
}

function handleLogout() {
  uni.showModal({
    title: "退出登录",
    content: "退出后账户和配置仍保存在本机，下次可以重新登录。",
    confirmText: "退出登录",
    confirmColor: "#cf5547",
    success: (result) => {
      if (!result.confirm) return;
      logout();
      uni.showToast({ title: "已退出登录", icon: "success" });
    },
  });
}

function confirmResetPaper() {
  uni.showModal({
    title: "重置模拟账户",
    content: "将恢复初始资金和示例持仓，当前模拟订单与持仓会被清除。",
    confirmText: "重置",
    confirmColor: "#cf5547",
    success: (result) => {
      if (!result.confirm) return;
      resetPaper();
      resetLearning();
      uni.showToast({ title: "本地数据已重置", icon: "success" });
    },
  });
}

function showDisclosure() {
  uni.showModal({
    title: "风险与数据说明",
    content:
      "本应用当前为产品初版。行情、课程图表、策略参数和模拟交易均为演示用途，不构成投资建议，也不连接真实券商、交易所或资金账户。",
    showCancel: false,
    confirmText: "我知道了",
    confirmColor: "#0e6f5c",
  });
}
</script>

<template>
  <AppShell>
    <view class="page-canvas">
      <view class="page-content">
        <PageHeader
          title="我的"
          eyebrow="Profile & settings"
          subtitle="查看学习进度、模拟账户状态与风险披露。"
        >
          <template #action>
            <button class="icon-button" @tap="showDisclosure">
              <AppIcon name="info" :size="18" />
            </button>
          </template>
        </PageHeader>

        <view class="profile-hero">
          <view class="profile-identity">
            <view class="profile-avatar">{{ avatarLetter }}</view>
            <view class="profile-identity__copy">
              <text class="profile-identity__name">{{ displayName }}</text>
              <view class="profile-identity__meta">
                <view class="profile-identity__dot" />
                <text>{{ level }}</text>
                <text>{{ isLoggedIn ? accountIdentifier : "访客模式" }}</text>
              </view>
            </view>
          </view>
          <view class="profile-hero__actions">
            <button v-if="isAdmin" class="profile-admin-entry" @tap="openAdmin">
              <view class="profile-admin-entry__icon">
                <AppIcon name="chart" :size="17" color="#ffffff" />
              </view>
              <text>管理后台</text>
              <AppIcon name="arrowUpRight" :size="14" color="#b9e5d8" />
            </button>
            <button
              v-else
              class="profile-hero__badge"
              @tap="isLoggedIn ? openSettings() : openAuth()"
            >
              <AppIcon name="user" :size="18" color="#b9e5d8" />
              <view>
                <text>账户状态</text>
                <text>{{ isLoggedIn ? "已登录" : "未登录" }}</text>
              </view>
            </button>
          </view>
        </view>

        <view class="account-strip" :class="{ 'account-strip--guest': !isLoggedIn }">
          <view class="account-strip__icon">
            <AppIcon
              :name="isLoggedIn ? 'settings' : 'userPlus'"
              :size="20"
              :color="isLoggedIn ? '#0e6f5c' : '#946617'"
            />
          </view>
          <view class="account-strip__copy">
            <text class="account-strip__title">
              {{ isLoggedIn ? "账户与偏好设置" : "登录或注册本地账户" }}
            </text>
            <text class="account-strip__desc">
              {{ isLoggedIn
                ? `${EXPERIENCE_LABELS[preferences?.experience ?? "beginner"]} · 默认策略 ${defaultStrategyName}`
                : "保存昵称、风险偏好、默认策略和下单数量" }}
            </text>
          </view>
          <button
            class="button-secondary account-strip__button"
            @tap="isLoggedIn ? openSettings() : openAuth()"
          >
            <text>{{ isLoggedIn ? "管理配置" : "登录 / 注册" }}</text>
            <AppIcon name="chevronRight" :size="14" color="#17211e" />
          </button>
        </view>

        <view class="profile-stats">
          <view class="profile-stat card">
            <view class="profile-stat__head">
              <view class="profile-stat__icon profile-stat__icon--teal">
                <AppIcon name="graduation" :size="19" color="#0e6f5c" />
              </view>
              <text class="profile-stat__meta">{{ completedCount }} / {{ visibleLessons.length }}</text>
            </view>
            <text class="profile-stat__label">学习进度</text>
            <text class="profile-stat__value mono">{{ Math.round(progress * 100) }}%</text>
            <view class="profile-stat__track">
              <view class="profile-stat__track-value" :style="{ width: `${progress * 100}%` }" />
            </view>
          </view>

          <view class="profile-stat card">
            <view class="profile-stat__head">
              <view class="profile-stat__icon profile-stat__icon--blue">
                <AppIcon name="activity" :size="19" color="#436d93" />
              </view>
              <view class="chip">{{ activePositions.length }} 持仓</view>
            </view>
            <text class="profile-stat__label">模拟权益</text>
            <text class="profile-stat__value mono">{{ formatMoney(totalEquity, 0) }}</text>
            <text
              class="profile-stat__change mono"
              :class="totalReturn >= 0 ? 'positive' : 'negative'"
            >
              {{ formatPercent(totalReturn, 2, true) }} 累计
            </text>
          </view>

          <button class="profile-stat profile-stat--link card" @tap="openLive">
            <view class="profile-stat__head">
              <view class="profile-stat__icon profile-stat__icon--amber">
                <AppIcon name="link" :size="19" color="#946617" />
              </view>
              <AppIcon name="chevronRight" :size="15" color="#7b8783" />
            </view>
            <text class="profile-stat__label">实盘接入</text>
            <text class="profile-stat__value profile-stat__value--text">待合作券商</text>
            <text class="profile-stat__change">查看正式接入要求</text>
          </button>
        </view>

        <view class="profile-sections">
          <view class="settings-group card">
            <text class="settings-group__title">账户、交易与学习</text>
            <button
              v-if="isLoggedIn"
              class="settings-row"
              @tap="openSettings"
            >
              <view class="settings-row__icon">
                <AppIcon name="settings" :size="18" color="#0e6f5c" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">账户与偏好设置</text>
                <text class="settings-row__desc">昵称、风险偏好、默认策略和数量</text>
              </view>
              <view class="settings-row__status">{{ RISK_LABELS[preferences?.riskLevel ?? "C3"] }}</view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
            <button
              v-if="!isLoggedIn"
              class="settings-row"
              @tap="openAuth('register')"
            >
              <view class="settings-row__icon">
                <AppIcon name="userPlus" :size="18" color="#0e6f5c" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">登录或注册</text>
                <text class="settings-row__desc">创建本地账户并保存个人配置</text>
              </view>
              <view class="settings-row__status">未登录</view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
            <button class="settings-row" @tap="openLive">
              <view class="settings-row__icon">
                <AppIcon name="shield" :size="18" color="#946617" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">实盘交易接入</text>
                <text class="settings-row__desc">券商授权、行情与风控要求</text>
              </view>
              <view class="settings-row__status">未接入</view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
            <button class="settings-row" @tap="showDisclosure">
              <view class="settings-row__icon">
                <AppIcon name="bookCheck" :size="18" color="#436d93" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">风险与内容说明</text>
                <text class="settings-row__desc">数据来源、模拟收益和免责声明</text>
              </view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
          </view>

          <view class="settings-group card">
            <text class="settings-group__title">本地数据</text>
            <button class="settings-row" @tap="confirmResetPaper">
              <view class="settings-row__icon settings-row__icon--red">
                <AppIcon name="reset" :size="18" color="#cf5547" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">重置演示数据</text>
                <text class="settings-row__desc">恢复模拟账户和学习进度</text>
              </view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
            <view class="settings-row settings-row--static">
              <view class="settings-row__icon">
                <AppIcon name="lock" :size="18" color="#52605c" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">隐私与账户安全</text>
                <text class="settings-row__desc">当前版本不采集券商登录信息</text>
              </view>
            </view>
            <button
              v-if="isLoggedIn"
              class="settings-row"
              @tap="handleLogout"
            >
              <view class="settings-row__icon settings-row__icon--red">
                <AppIcon name="logOut" :size="18" color="#cf5547" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">退出登录</text>
                <text class="settings-row__desc">本机账户和配置会继续保留</text>
              </view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
          </view>
        </view>

        <view class="risk-disclosure">
          <view class="risk-disclosure__head">
            <AppIcon name="alert" :size="17" color="#946617" />
            <text>风险提示</text>
          </view>
          <text class="risk-disclosure__text">
            期权交易具有杠杆和到期归零风险，卖方可能承担超过权利金的损失。本应用当前仅用于产品验证与教育演示，所有行情、损益和收益均为模拟数据，不构成投资建议。
          </text>
        </view>

        <view class="profile-footer">
          <text>道元期权 · DAO OPTIONS</text>
          <view class="profile-footer__dot" />
          <text>v0.3.7</text>
          <view class="profile-footer__dot" />
          <text>本地演示版</text>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.profile-hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 10px;
  color: #ffffff;
}

.profile-identity {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 13px;
  padding: 15px 17px;
  border-radius: 8px;
  background: #17211e;
}

.profile-avatar {
  display: flex;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(185, 229, 216, 0.2);
  border-radius: 8px;
  background: rgba(185, 229, 216, 0.08);
  color: #b9e5d8;
  font-size: 16px;
  font-weight: 700;
}

.profile-identity__copy {
  display: flex;
  flex-direction: column;
}

.profile-identity__name {
  font-size: 14px;
  font-weight: 720;
}

.profile-identity__meta {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 4px;
  color: #8c9b96;
  font-size: 9px;
}

.profile-identity__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #56635e;
}

.profile-hero__actions {
  display: flex;
  align-items: stretch;
}

.profile-admin-entry {
  display: flex;
  min-width: 128px;
  min-height: 72px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 14px;
  border: 0;
  border-radius: 8px;
  background: var(--teal);
  text-align: left;
}

.profile-admin-entry__icon {
  display: flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
}

.profile-admin-entry > text {
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.profile-hero__badge {
  display: flex;
  min-height: 72px;
  align-items: center;
  gap: 9px;
  padding: 12px 14px;
  border: 1px solid rgba(185, 229, 216, 0.17);
  border-radius: 8px;
  background: #17211e;
}

.profile-hero__badge view {
  display: flex;
  flex-direction: column;
}

.profile-hero__badge view text:first-child {
  color: #8c9b96;
  font-size: 8px;
}

.profile-hero__badge view text:last-child {
  margin-top: 1px;
  color: #b9e5d8;
  font-size: 10px;
  font-weight: 650;
}

.account-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 13px 15px;
  border: 1px solid #cfe5de;
  border-radius: 8px;
  background: var(--teal-wash);
}

.account-strip--guest {
  border-color: #ead8b5;
  background: #fdf9f1;
}

.account-strip__icon {
  display: flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
}

.account-strip__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.account-strip__title {
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.account-strip__desc {
  margin-top: 2px;
  overflow: hidden;
  color: var(--muted);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-strip__button {
  min-height: 34px;
  padding: 0 10px;
  flex: 0 0 auto;
  font-size: 9px;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.profile-stat {
  display: flex;
  min-height: 163px;
  flex-direction: column;
  padding: 17px;
  text-align: left;
}

.profile-stat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.profile-stat__icon {
  display: flex;
  width: 35px;
  height: 35px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.profile-stat__icon--teal {
  background: var(--teal-wash);
}

.profile-stat__icon--blue {
  background: var(--blue-wash);
}

.profile-stat__icon--amber {
  background: var(--amber-wash);
}

.profile-stat__meta {
  color: var(--muted-light);
  font-family: var(--font-mono);
  font-size: 9px;
}

.profile-stat__label {
  margin-top: 20px;
  color: var(--muted);
  font-size: 9px;
}

.profile-stat__value {
  margin-top: 3px;
  color: var(--ink);
  font-size: 22px;
  font-weight: 680;
}

.profile-stat__value--text {
  font-size: 15px;
}

.profile-stat__change {
  margin-top: 5px;
  color: var(--muted-light);
  font-size: 9px;
}

.profile-stat__track {
  height: 4px;
  margin-top: auto;
  overflow: hidden;
  border-radius: 2px;
  background: var(--surface-soft);
}

.profile-stat__track-value {
  height: 100%;
  border-radius: 2px;
  background: var(--teal);
}

.profile-stat--link:active {
  background: #fbfcfb;
}

.profile-sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.settings-group {
  overflow: hidden;
}

.settings-group__title {
  display: block;
  padding: 16px 17px 10px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 720;
}

.settings-row {
  display: flex;
  width: 100%;
  min-height: 65px;
  align-items: center;
  gap: 10px;
  padding: 10px 17px;
  border-top: 1px solid var(--line);
  text-align: left;
}

.settings-row__icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--surface-soft);
}

.settings-row__icon--red {
  background: var(--red-wash);
}

.settings-row__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.settings-row__title {
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
}

.settings-row__desc {
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
}

.settings-row__status {
  color: var(--muted-light);
  font-size: 8px;
}

.settings-row--static {
  cursor: default;
}

.risk-disclosure {
  margin-top: 14px;
  padding: 16px 17px;
  border: 1px solid #e8dabf;
  border-radius: 8px;
  background: #fdf9f1;
}

.risk-disclosure__head {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #71551d;
  font-size: 11px;
  font-weight: 700;
}

.risk-disclosure__text {
  display: block;
  margin-top: 7px;
  color: #806b42;
  font-size: 9px;
  line-height: 1.65;
}

.profile-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 26px 0 8px;
  color: var(--muted-light);
  font-size: 8px;
}

.profile-footer__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--line-strong);
}

@media (max-width: 900px) {
  .profile-hero__actions {
    margin-left: auto;
  }

  .profile-hero__badge {
    display: none;
  }

  .profile-admin-entry {
    min-width: 112px;
    min-height: 66px;
    padding: 10px 12px;
  }

  .profile-identity {
    padding: 12px 13px;
  }

  .profile-avatar {
    width: 38px;
    height: 38px;
  }

  .account-strip {
    align-items: flex-start;
  }

  .account-strip__button {
    padding: 0 8px;
  }

  .profile-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .profile-stat {
    min-height: 150px;
  }

  .profile-stat--link {
    grid-column: 1 / -1;
    min-height: 130px;
  }

  .profile-sections {
    grid-template-columns: 1fr;
  }
}
</style>
