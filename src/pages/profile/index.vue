<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";
import { useLearningProgress } from "../../composables/useLearningProgress";
import { usePaperAccount } from "../../composables/usePaperAccount";
import { useAuth } from "../../composables/useAuth";
import { useContentSettings } from "../../composables/useContentSettings";
import { formatMoney, formatPercent } from "../../domain/format";
import { APP_VERSION } from "../../config/runtime";
import { translate } from "../../i18n";
import { riskLabel } from "../../composables/useLabels";
import { useLocale } from "../../composables/useLocale";

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
const { visibleLessons } = useContentSettings();
const { locale, setLocale } = useLocale();

const level = computed(() => {
  if (preferences.value) return riskLabel(preferences.value.riskLevel);
  if (completedCount.value >= 7) return translate("common.riskC4");
  if (completedCount.value >= 3) return translate("common.riskC3");
  return translate("common.learning");
});
const avatarLetter = computed(
  () => displayName.value.trim().slice(0, 1) || "U",
);
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
    title: translate("auth.logoutTitle"),
    content: translate("auth.logoutContent"),
    confirmText: translate("auth.logout"),
    confirmColor: "#cf5547",
    success: (result) => {
      if (!result.confirm) return;
      void logout().then(() => {
        uni.showToast({ title: translate("auth.logoutSuccess"), icon: "success" });
      });
    },
  });
}

function confirmResetPaper() {
  uni.showModal({
    title: translate("profile.resetConfirmTitle"),
    content: translate("profile.resetConfirmCopy"),
    confirmText: translate("common.reset"),
    confirmColor: "#cf5547",
    success: (result) => {
      if (!result.confirm) return;
      resetPaper();
      resetLearning();
      uni.showToast({ title: translate("profile.resetDone"), icon: "success" });
    },
  });
}

function showDisclosure() {
  uni.showModal({
    title: translate("profile.disclosureHeading"),
    content: translate("profile.disclosureContent"),
    showCancel: false,
    confirmText: translate("common.confirm"),
    confirmColor: "#0e6f5c",
  });
}
</script>

<template>
  <AppShell>
    <view class="page-canvas">
      <view class="page-content">
        <PageHeader
          :title="$t('profile.title')"
          :eyebrow="$t('profile.eyebrow')"
          :subtitle="$t('profile.subtitle')"
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
                <text>{{ isLoggedIn ? accountIdentifier : $t("common.guest") }}</text>
              </view>
            </view>
          </view>
          <view class="profile-hero__actions">
            <button v-if="isAdmin" class="profile-admin-entry" @tap="openAdmin">
              <view class="profile-admin-entry__icon">
                <AppIcon name="chart" :size="17" color="#ffffff" />
              </view>
              <text>{{ $t("profile.adminConsole") }}</text>
              <AppIcon name="arrowUpRight" :size="14" color="#b9e5d8" />
            </button>
            <button
              v-else
              class="profile-hero__badge"
              @tap="isLoggedIn ? openSettings() : openAuth()"
            >
              <AppIcon name="user" :size="18" color="#b9e5d8" />
              <view>
                <text>{{ $t("profile.accountStatus") }}</text>
                <text>{{ isLoggedIn ? $t("common.signedIn") : $t("settings.notSignedIn") }}</text>
              </view>
            </button>
          </view>
        </view>

        <view class="profile-stats">
          <view class="profile-stat card">
            <view class="profile-stat__head">
              <view class="profile-stat__icon profile-stat__icon--teal">
                <AppIcon name="graduation" :size="19" color="#0e6f5c" />
              </view>
              <text class="profile-stat__meta">{{ completedCount }} / {{ visibleLessons.length }}</text>
            </view>
            <text class="profile-stat__label">{{ $t("profile.learningProgress") }}</text>
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
              <view class="chip">{{ $t("profile.positions", { count: activePositions.length }) }}</view>
            </view>
            <text class="profile-stat__label">{{ $t("profile.paperEquity") }}</text>
            <text class="profile-stat__value mono">{{ formatMoney(totalEquity, 0) }}</text>
            <text
              class="profile-stat__change mono"
              :class="totalReturn >= 0 ? 'positive' : 'negative'"
            >
              {{ $t("profile.cumulative", { value: formatPercent(totalReturn, 2, true) }) }}
            </text>
          </view>

        </view>

        <view class="profile-sections">
          <view class="settings-group card">
            <text class="settings-group__title">{{ $t("profile.accountSection") }}</text>
            <view class="settings-row settings-row--static">
              <view class="settings-row__icon">
                <AppIcon name="sliders" :size="18" color="#52605c" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">{{ $t("settings.languageLabel") }}</text>
                <text class="settings-row__desc">{{ $t("settings.languageMeta") }}</text>
              </view>
              <view class="settings-language">
                <button
                  class="settings-language__item"
                  :class="{ 'settings-language__item--active': locale === 'en' }"
                  @tap="setLocale('en')"
                >
                  EN
                </button>
                <button
                  class="settings-language__item"
                  :class="{ 'settings-language__item--active': locale === 'zh-CN' }"
                  @tap="setLocale('zh-CN')"
                >
                  中文
                </button>
              </view>
            </view>
            <button
              v-if="isLoggedIn"
              class="settings-row"
              @tap="openSettings"
            >
              <view class="settings-row__icon">
                <AppIcon name="settings" :size="18" color="#0e6f5c" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">{{ $t("profile.settingsTitle") }}</text>
                <text class="settings-row__desc">{{ $t("profile.settingsDesc") }}</text>
              </view>
              <view class="settings-row__status">{{ riskLabel(preferences?.riskLevel ?? "C3") }}</view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
            <button
              v-if="!isLoggedIn"
              class="settings-row"
              @tap="openAuth()"
            >
              <view class="settings-row__icon">
                <AppIcon name="userPlus" :size="18" color="#0e6f5c" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">{{ $t("profile.loginTitle") }}</text>
                <text class="settings-row__desc">{{ $t("profile.loginDesc") }}</text>
              </view>
              <view class="settings-row__status">{{ $t("settings.notSignedIn") }}</view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
            <button class="settings-row" @tap="openLive">
              <view class="settings-row__icon">
                <AppIcon name="shield" :size="18" color="#946617" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">{{ $t("profile.liveTitle") }}</text>
                <text class="settings-row__desc">{{ $t("profile.liveDesc") }}</text>
              </view>
              <view class="settings-row__status">{{ $t("nav.pending") }}</view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
            <button class="settings-row" @tap="showDisclosure">
              <view class="settings-row__icon">
                <AppIcon name="bookCheck" :size="18" color="#436d93" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">{{ $t("profile.disclosureTitle") }}</text>
                <text class="settings-row__desc">{{ $t("profile.disclosureDesc") }}</text>
              </view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
          </view>

          <view class="settings-group card">
            <text class="settings-group__title">{{ $t("profile.cloudData") }}</text>
            <button class="settings-row" @tap="confirmResetPaper">
              <view class="settings-row__icon settings-row__icon--red">
                <AppIcon name="reset" :size="18" color="#cf5547" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">{{ $t("profile.resetTitle") }}</text>
                <text class="settings-row__desc">{{ $t("profile.resetDesc") }}</text>
              </view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
            <view class="settings-row settings-row--static">
              <view class="settings-row__icon">
                <AppIcon name="lock" :size="18" color="#52605c" />
              </view>
              <view class="settings-row__copy">
                <text class="settings-row__title">{{ $t("profile.securityTitle") }}</text>
                <text class="settings-row__desc">{{ $t("profile.securityDesc") }}</text>
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
                <text class="settings-row__title">{{ $t("profile.logoutTitle") }}</text>
                <text class="settings-row__desc">{{ $t("profile.logoutDesc") }}</text>
              </view>
              <AppIcon name="chevronRight" :size="15" color="#95a09c" />
            </button>
          </view>
        </view>

        <view class="risk-disclosure">
          <view class="risk-disclosure__head">
            <AppIcon name="alert" :size="17" color="#946617" />
            <text>{{ $t("profile.disclosureHeading") }}</text>
          </view>
          <text class="risk-disclosure__text">
            {{ $t("profile.riskNotice") }}
          </text>
        </view>

        <view class="profile-footer">
          <text>{{ $t("app.name") }} · {{ $t("app.meta") }}</text>
          <view class="profile-footer__dot" />
          <text>v{{ APP_VERSION }}</text>
          <view class="profile-footer__dot" />
          <text>{{ $t("profile.demoVersion") }}</text>
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

.profile-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.settings-language {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-soft);
}

.settings-language__item {
  height: 24px;
  padding: 0 7px;
  border-radius: 5px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
}

.settings-language__item--active {
  background: #ffffff;
  color: var(--teal);
  box-shadow: 0 1px 2px rgba(20, 40, 35, 0.08);
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

  .profile-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .profile-stat {
    min-height: 150px;
  }

  .profile-sections {
    grid-template-columns: 1fr;
  }
}
</style>
