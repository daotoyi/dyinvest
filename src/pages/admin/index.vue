<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import { lessons } from "../../data/lessons";
import { strategyTemplates } from "../../data/strategies";
import { useAuth } from "../../composables/useAuth";
import { useContentSettings } from "../../composables/useContentSettings";
import {
  EXPERIENCE_LABELS,
  RISK_LABELS,
  maskPhone,
  type LocalUserRecord,
} from "../../domain/user";

type AdminTab = "overview" | "users" | "content" | "announcement";

const {
  state: authState,
  currentUser,
  isAdmin,
  accountIdentifier,
  getUserPreferences,
  setUserRole,
  setUserStatus,
} = useAuth();
const {
  state: contentState,
  visibleLessons,
  visibleStrategies,
  isLessonEnabled,
  isStrategyEnabled,
  setLessonEnabled,
  setStrategyEnabled,
  saveAnnouncement,
  resetContentSettings,
} = useContentSettings();

const activeTab = ref<AdminTab>("overview");
const userSearch = ref("");
const announcementDraft = reactive({
  enabled: contentState.announcement.enabled,
  title: contentState.announcement.title,
  text: contentState.announcement.text,
});
const announcementError = ref("");

const tabs: Array<{
  id: AdminTab;
  label: string;
  icon: string;
  meta: string;
}> = [
  { id: "overview", label: "数据概览", icon: "chart", meta: "Overview" },
  { id: "users", label: "用户管理", icon: "user", meta: "Users" },
  { id: "content", label: "内容发布", icon: "layers", meta: "Content" },
  { id: "announcement", label: "运营公告", icon: "bell", meta: "Notice" },
];

const adminCount = computed(
  () => authState.users.filter((user) => user.role === "admin").length,
);
const activeUserCount = computed(
  () => authState.users.filter((user) => user.status !== "disabled").length,
);
const disabledLessonCount = computed(
  () => lessons.length - visibleLessons.value.length,
);
const disabledStrategyCount = computed(
  () => strategyTemplates.length - visibleStrategies.value.length,
);
const filteredUsers = computed(() => {
  const keyword = userSearch.value.trim().toLowerCase();
  if (!keyword) return authState.users;
  return authState.users.filter((user) => {
    const preferences = getUserPreferences(user.id);
    return [
      user.nickname,
      user.username,
      user.phone ?? "",
      preferences?.riskLevel ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
});
const recentUsers = computed(() =>
  [...authState.users]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 5),
);

function userAccount(user: LocalUserRecord) {
  return user.phone ? maskPhone(user.phone) : `@${user.username}`;
}

function userRisk(user: LocalUserRecord) {
  const preferences = getUserPreferences(user.id);
  return preferences ? RISK_LABELS[preferences.riskLevel] : "未配置";
}

function userExperience(user: LocalUserRecord) {
  const preferences = getUserPreferences(user.id);
  return preferences ? EXPERIENCE_LABELS[preferences.experience] : "未配置";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate(),
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function goBack() {
  uni.reLaunch({ url: "/pages/profile/index" });
}

function openAuth() {
  uni.navigateTo({ url: "/pages/auth/index?mode=login" });
}

function toggleRole(user: LocalUserRecord) {
  if (user.id === currentUser.value?.id) {
    uni.showToast({ title: "不能修改自己的角色", icon: "none" });
    return;
  }
  const nextRole = user.role === "admin" ? "user" : "admin";
  uni.showModal({
    title: nextRole === "admin" ? "设为管理员" : "移出管理员",
    content:
      nextRole === "admin"
        ? `确认让 ${user.nickname} 获得后台管理权限？`
        : `确认移除 ${user.nickname} 的后台管理权限？`,
    confirmColor: "#0e6f5c",
    success: (result) => {
      if (!result.confirm) return;
      try {
        setUserRole(user.id, nextRole);
        uni.showToast({ title: "角色已更新", icon: "success" });
      } catch (error) {
        uni.showToast({
          title: error instanceof Error ? error.message : "更新失败",
          icon: "none",
        });
      }
    },
  });
}

function toggleStatus(user: LocalUserRecord) {
  if (user.id === currentUser.value?.id) {
    uni.showToast({ title: "不能禁用当前账户", icon: "none" });
    return;
  }
  const nextStatus = user.status === "disabled" ? "active" : "disabled";
  uni.showModal({
    title: nextStatus === "disabled" ? "禁用账户" : "恢复账户",
    content:
      nextStatus === "disabled"
        ? `禁用后 ${user.nickname} 将无法登录，确认继续？`
        : `恢复 ${user.nickname} 的登录权限？`,
    confirmColor: nextStatus === "disabled" ? "#cf5547" : "#0e6f5c",
    success: (result) => {
      if (!result.confirm) return;
      try {
        setUserStatus(user.id, nextStatus);
        uni.showToast({ title: "账户状态已更新", icon: "success" });
      } catch (error) {
        uni.showToast({
          title: error instanceof Error ? error.message : "更新失败",
          icon: "none",
        });
      }
    },
  });
}

function toggleLesson(id: string) {
  const enabled = isLessonEnabled(id);
  if (enabled && visibleLessons.value.length <= 1) {
    uni.showToast({ title: "至少保留一节已发布课程", icon: "none" });
    return;
  }
  setLessonEnabled(id, !enabled);
}

function toggleStrategy(id: string) {
  const enabled = isStrategyEnabled(id);
  if (enabled && visibleStrategies.value.length <= 1) {
    uni.showToast({ title: "至少保留一个已启用策略", icon: "none" });
    return;
  }
  setStrategyEnabled(id, !enabled);
}

function saveAnnouncementConfig() {
  announcementError.value = "";
  if (announcementDraft.enabled && !announcementDraft.text.trim()) {
    announcementError.value = "启用公告时必须填写公告内容";
    return;
  }
  if (announcementDraft.enabled && !announcementDraft.title.trim()) {
    announcementError.value = "启用公告时必须填写公告标题";
    return;
  }
  saveAnnouncement({
    enabled: announcementDraft.enabled,
    title: announcementDraft.title,
    text: announcementDraft.text,
  });
  announcementDraft.title = contentState.announcement.title;
  announcementDraft.text = contentState.announcement.text;
  uni.showToast({ title: "公告已保存", icon: "success" });
}

function restoreContentDefaults() {
  uni.showModal({
    title: "恢复内容默认设置",
    content: "所有课程和策略将重新启用，运营公告将关闭。",
    confirmColor: "#cf5547",
    success: (result) => {
      if (!result.confirm) return;
      resetContentSettings();
      announcementDraft.enabled = false;
      announcementDraft.title = contentState.announcement.title;
      announcementDraft.text = contentState.announcement.text;
      uni.showToast({ title: "已恢复默认设置", icon: "success" });
    },
  });
}
</script>

<template>
  <view class="admin-page">
    <view v-if="isAdmin" class="admin-sidebar">
      <view class="admin-brand">
        <view class="admin-brand__mark">θ</view>
        <view>
          <text class="admin-brand__name">道元期权</text>
          <text class="admin-brand__meta">OPTIONS OPS</text>
        </view>
      </view>

      <view class="admin-sidebar__label">管理工作区</view>
      <view class="admin-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="admin-nav__item"
          :class="{ 'admin-nav__item--active': activeTab === tab.id }"
          @tap="activeTab = tab.id"
        >
          <AppIcon
            :name="tab.icon"
            :size="18"
            :color="activeTab === tab.id ? '#b9e5d8' : '#6e7d78'"
          />
          <view class="admin-nav__copy">
            <text>{{ tab.label }}</text>
            <text>{{ tab.meta }}</text>
          </view>
        </button>
      </view>

      <view class="admin-sidebar__foot">
        <button class="admin-back" @tap="goBack">
          <AppIcon name="arrowLeft" :size="16" color="#9caeaa" />
          <text>返回应用</text>
        </button>
        <view class="admin-local-note">
          <AppIcon name="info" :size="14" color="#6e7d78" />
          <text>本地演示管理台</text>
        </view>
      </view>
    </view>

    <view v-if="!isAdmin" class="admin-gate">
      <view class="admin-gate__card card">
        <view class="admin-gate__icon">
          <AppIcon name="lock" :size="27" color="#946617" />
        </view>
        <text class="admin-gate__title">无法访问管理后台</text>
        <text class="admin-gate__desc">
          当前账户没有管理员权限。本地模式下，首个注册账户会自动成为管理员。
        </text>
        <button class="button-primary" @tap="openAuth">
          <AppIcon name="logOut" :size="16" color="#ffffff" />
          <text>登录管理员账户</text>
        </button>
        <button class="button-quiet" @tap="goBack">返回个人中心</button>
      </view>
    </view>

    <view v-else class="admin-main">
      <view class="admin-mobile-head">
        <view class="admin-brand">
          <view class="admin-brand__mark">θ</view>
          <view>
            <text class="admin-brand__name">道元期权管理台</text>
            <text class="admin-brand__meta">OPTIONS OPS</text>
          </view>
        </view>
        <button class="button-quiet" @tap="goBack">返回应用</button>
      </view>

      <view class="admin-mobile-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="admin-mobile-tab"
          :class="{ 'admin-mobile-tab--active': activeTab === tab.id }"
          @tap="activeTab = tab.id"
        >
          <AppIcon
            :name="tab.icon"
            :size="16"
            :color="activeTab === tab.id ? '#0e6f5c' : '#7b8783'"
          />
          <text>{{ tab.label }}</text>
        </button>
      </view>

      <view class="admin-header">
        <view class="admin-header__copy">
          <text class="eyebrow">Operations console</text>
          <text class="admin-header__title">
            {{ tabs.find((tab) => tab.id === activeTab)?.label }}
          </text>
          <text class="admin-header__desc">
            {{ activeTab === "overview"
              ? "查看本地用户、内容和运营状态。"
              : activeTab === "users"
                ? "管理本地账户角色和可用状态。"
                : activeTab === "content"
                  ? "控制课程和策略是否在前台展示。"
                  : "统一维护首页运营公告。" }}
          </text>
        </view>
        <view class="admin-user">
          <view class="admin-user__avatar">{{ currentUser?.nickname.slice(0, 1) }}</view>
          <view>
            <text class="admin-user__name">{{ currentUser?.nickname }}</text>
            <text class="admin-user__meta">{{ accountIdentifier }} · 管理员</text>
          </view>
        </view>
      </view>

      <view v-if="activeTab === 'overview'" class="admin-section">
        <view class="admin-metrics">
          <view class="admin-metric card">
            <view class="admin-metric__top">
              <view class="admin-metric__icon admin-metric__icon--teal">
                <AppIcon name="user" :size="19" color="#0e6f5c" />
              </view>
              <text class="admin-metric__trend">本地账户</text>
            </view>
            <text class="admin-metric__value mono">{{ activeUserCount }}</text>
            <text class="admin-metric__label">可用用户 / 共 {{ authState.users.length }} 人</text>
          </view>
          <view class="admin-metric card">
            <view class="admin-metric__top">
              <view class="admin-metric__icon admin-metric__icon--blue">
                <AppIcon name="shield" :size="19" color="#436d93" />
              </view>
              <text class="admin-metric__trend">权限</text>
            </view>
            <text class="admin-metric__value mono">{{ adminCount }}</text>
            <text class="admin-metric__label">管理员账户</text>
          </view>
          <view class="admin-metric card">
            <view class="admin-metric__top">
              <view class="admin-metric__icon admin-metric__icon--amber">
                <AppIcon name="book" :size="19" color="#946617" />
              </view>
              <text class="admin-metric__trend">{{ disabledLessonCount }} 下架</text>
            </view>
            <text class="admin-metric__value mono">{{ visibleLessons.length }}</text>
            <text class="admin-metric__label">已发布课程 / 共 {{ lessons.length }} 节</text>
          </view>
          <view class="admin-metric card">
            <view class="admin-metric__top">
              <view class="admin-metric__icon admin-metric__icon--teal">
                <AppIcon name="activity" :size="19" color="#0e6f5c" />
              </view>
              <text class="admin-metric__trend">{{ disabledStrategyCount }} 停用</text>
            </view>
            <text class="admin-metric__value mono">{{ visibleStrategies.length }}</text>
            <text class="admin-metric__label">启用策略 / 共 {{ strategyTemplates.length }} 个</text>
          </view>
        </view>

        <view class="admin-overview-grid">
          <view class="admin-panel card">
            <view class="admin-panel__head">
              <view>
                <text class="admin-panel__title">最近用户</text>
                <text class="admin-panel__meta">按创建时间排序</text>
              </view>
              <button class="button-quiet" @tap="activeTab = 'users'">
                <text>全部用户</text>
                <AppIcon name="chevronRight" :size="14" color="#0e6f5c" />
              </button>
            </view>
            <view class="admin-user-list">
              <view
                v-for="user in recentUsers"
                :key="user.id"
                class="admin-user-row"
              >
                <view class="admin-user-row__avatar">{{ user.nickname.slice(0, 1) }}</view>
                <view class="admin-user-row__copy">
                  <text class="admin-user-row__name">{{ user.nickname }}</text>
                  <text class="admin-user-row__meta">{{ userAccount(user) }} · {{ userRisk(user) }}</text>
                </view>
                <view
                  class="chip"
                  :class="user.role === 'admin' ? 'chip--blue' : ''"
                >
                  {{ user.role === "admin" ? "管理员" : "用户" }}
                </view>
                <text class="admin-user-row__date">{{ formatDate(user.createdAt) }}</text>
              </view>
            </view>
          </view>

          <view class="admin-side-stack">
            <view class="admin-panel card">
              <view class="admin-panel__head">
                <view>
                  <text class="admin-panel__title">运营公告</text>
                  <text class="admin-panel__meta">首页展示状态</text>
                </view>
                <view
                  class="admin-status"
                  :class="{ 'admin-status--off': !contentState.announcement.enabled }"
                >
                  {{ contentState.announcement.enabled ? "展示中" : "已关闭" }}
                </view>
              </view>
              <text class="admin-announcement__title">{{ contentState.announcement.title }}</text>
              <text class="admin-announcement__text">{{ contentState.announcement.text }}</text>
              <button class="button-secondary admin-announcement__button" @tap="activeTab = 'announcement'">
                <AppIcon name="sliders" :size="15" color="#17211e" />
                <text>编辑公告</text>
              </button>
            </view>

            <view class="admin-panel admin-system card">
              <view class="admin-panel__head">
                <view>
                  <text class="admin-panel__title">系统状态</text>
                  <text class="admin-panel__meta">当前构建环境</text>
                </view>
                <AppIcon name="circleCheck" :size="18" color="#0e6f5c" />
              </view>
              <view class="admin-system__row">
                <text>运行模式</text>
                <text>本地演示</text>
              </view>
              <view class="admin-system__row">
                <text>应用版本</text>
                <text class="mono">v0.3.8</text>
              </view>
              <view class="admin-system__row">
                <text>小程序 AppID</text>
                <text class="mono">wx6aef5e…ecdd</text>
              </view>
              <view class="admin-system__row">
                <text>服务端 RBAC</text>
                <text class="admin-system__warning">未接入</text>
              </view>
            </view>
          </view>
        </view>

        <view class="admin-disclaimer">
          <AppIcon name="alert" :size="16" color="#946617" />
          <text>
            当前管理台直接操作本机数据，仅用于产品验证。正式上线需要服务端管理员认证、角色权限、操作审计和数据持久化。
          </text>
        </view>
      </view>

      <view v-else-if="activeTab === 'users'" class="admin-section">
        <view class="admin-panel card">
          <view class="admin-panel__head admin-panel__head--toolbar">
            <view>
              <text class="admin-panel__title">用户列表</text>
              <text class="admin-panel__meta">{{ filteredUsers.length }} 个本地账户</text>
            </view>
            <view class="admin-search">
              <AppIcon name="search" :size="15" color="#7b8783" />
              <input
                v-model="userSearch"
                class="admin-search__input"
                type="text"
                placeholder="搜索昵称、用户名或手机号"
              />
            </view>
          </view>

          <view class="admin-table">
            <view class="admin-table__head admin-table__head--users">
              <text>用户</text>
              <text>账户</text>
              <text>风险 / 经验</text>
              <text>角色</text>
              <text>状态</text>
              <text>操作</text>
            </view>
            <view
              v-for="user in filteredUsers"
              :key="user.id"
              class="admin-table__row admin-table__row--users"
            >
              <view class="admin-table-user">
                <view class="admin-table-user__avatar">{{ user.nickname.slice(0, 1) }}</view>
                <view>
                  <text class="admin-table-user__name">{{ user.nickname }}</text>
                  <text class="admin-table-user__meta">创建于 {{ formatDate(user.createdAt) }}</text>
                </view>
              </view>
              <text class="admin-table__account mono">{{ userAccount(user) }}</text>
              <view class="admin-table__stack">
                <text>{{ userRisk(user) }}</text>
                <text>{{ userExperience(user) }}</text>
              </view>
              <view
                class="chip"
                :class="user.role === 'admin' ? 'chip--blue' : ''"
              >
                {{ user.role === "admin" ? "管理员" : "用户" }}
              </view>
              <view
                class="admin-account-status"
                :class="{ 'admin-account-status--disabled': user.status === 'disabled' }"
              >
                <view class="admin-account-status__dot" />
                <text>{{ user.status === "disabled" ? "已禁用" : "正常" }}</text>
              </view>
              <view class="admin-row-actions">
                <button
                  class="admin-action"
                  :disabled="user.id === currentUser?.id"
                  @tap="toggleRole(user)"
                >
                  {{ user.role === "admin" ? "移出管理员" : "设为管理员" }}
                </button>
                <button
                  class="admin-action admin-action--danger"
                  :disabled="user.id === currentUser?.id"
                  @tap="toggleStatus(user)"
                >
                  {{ user.status === "disabled" ? "恢复" : "禁用" }}
                </button>
              </view>
            </view>
            <view v-if="!filteredUsers.length" class="admin-empty">
              <AppIcon name="search" :size="23" color="#95a09c" />
              <text>没有匹配的用户</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="activeTab === 'content'" class="admin-section">
        <view class="admin-content-grid">
          <view class="admin-panel card">
            <view class="admin-panel__head">
              <view>
                <text class="admin-panel__title">课程发布</text>
                <text class="admin-panel__meta">{{ visibleLessons.length }} / {{ lessons.length }} 已发布</text>
              </view>
              <view class="chip chip--teal">学习页</view>
            </view>
            <view class="admin-content-list">
              <view
                v-for="lesson in lessons"
                :key="lesson.id"
                class="admin-content-row"
              >
                <view class="admin-content-row__icon">
                  <AppIcon :name="lesson.icon" :size="17" color="#52605c" />
                </view>
                <view class="admin-content-row__copy">
                  <text class="admin-content-row__title">{{ lesson.title }}</text>
                  <text class="admin-content-row__meta">{{ lesson.chapter }} · {{ lesson.level }} · {{ lesson.minutes }} 分钟</text>
                </view>
                <view class="admin-content-row__status">
                  {{ isLessonEnabled(lesson.id) ? "已发布" : "草稿" }}
                </view>
                <button
                  class="admin-switch"
                  :class="{ 'admin-switch--on': isLessonEnabled(lesson.id) }"
                  @tap="toggleLesson(lesson.id)"
                >
                  <view class="admin-switch__thumb" />
                </button>
              </view>
            </view>
          </view>

          <view class="admin-panel card">
            <view class="admin-panel__head">
              <view>
                <text class="admin-panel__title">策略发布</text>
                <text class="admin-panel__meta">{{ visibleStrategies.length }} / {{ strategyTemplates.length }} 已启用</text>
              </view>
              <view class="chip chip--blue">策略实验室</view>
            </view>
            <view class="admin-content-list">
              <view
                v-for="strategy in strategyTemplates"
                :key="strategy.id"
                class="admin-content-row"
              >
                <view class="admin-content-row__icon">
                  <AppIcon name="chart" :size="17" color="#52605c" />
                </view>
                <view class="admin-content-row__copy">
                  <text class="admin-content-row__title">{{ strategy.name }}</text>
                  <text class="admin-content-row__meta">{{ strategy.tag }} · {{ strategy.risk }}</text>
                </view>
                <view class="admin-content-row__status">
                  {{ isStrategyEnabled(strategy.id) ? "已启用" : "已停用" }}
                </view>
                <button
                  class="admin-switch"
                  :class="{ 'admin-switch--on': isStrategyEnabled(strategy.id) }"
                  @tap="toggleStrategy(strategy.id)"
                >
                  <view class="admin-switch__thumb" />
                </button>
              </view>
            </view>
          </view>
        </view>

        <view class="admin-content-actions">
          <button class="button-secondary" @tap="restoreContentDefaults">
            <AppIcon name="reset" :size="15" color="#17211e" />
            <text>恢复默认发布状态</text>
          </button>
        </view>
      </view>

      <view v-else class="admin-section">
        <view class="admin-announcement-layout">
          <view class="admin-panel card">
            <view class="admin-panel__head">
              <view>
                <text class="admin-panel__title">首页运营公告</text>
                <text class="admin-panel__meta">保存后立即在当前设备的首页展示</text>
              </view>
              <button
                class="admin-switch"
                :class="{ 'admin-switch--on': announcementDraft.enabled }"
                @tap="announcementDraft.enabled = !announcementDraft.enabled"
              >
                <view class="admin-switch__thumb" />
              </button>
            </view>

            <view class="admin-form">
              <view class="admin-form__field">
                <text class="admin-form__label">公告标题</text>
                <view class="admin-form__input">
                  <input
                    v-model="announcementDraft.title"
                    type="text"
                    maxlength="40"
                    placeholder="例如：模拟环境说明"
                  />
                </view>
              </view>
              <view class="admin-form__field">
                <text class="admin-form__label">公告内容</text>
                <view class="admin-form__textarea">
                  <textarea
                    v-model="announcementDraft.text"
                    maxlength="200"
                    placeholder="填写面向用户的公告内容"
                  />
                </view>
                <text class="admin-form__counter">{{ announcementDraft.text.length }} / 200</text>
              </view>
              <view v-if="announcementError" class="admin-form__error">
                <AppIcon name="alert" :size="15" color="#a84237" />
                <text>{{ announcementError }}</text>
              </view>
              <button class="button-primary button-primary--teal admin-form__save" @tap="saveAnnouncementConfig">
                <AppIcon name="save" :size="16" color="#ffffff" />
                <text>保存运营公告</text>
              </button>
            </view>
          </view>

          <view class="admin-preview card">
            <text class="admin-preview__label">首页预览</text>
            <view class="admin-preview__window">
              <view class="admin-preview__header">
                <view class="admin-preview__logo">θ</view>
                <text>道元期权</text>
              </view>
              <view
                v-if="announcementDraft.enabled"
                class="admin-preview__notice"
              >
                <AppIcon name="bell" :size="15" color="#946617" />
                <view>
                  <text>{{ announcementDraft.title || "公告标题" }}</text>
                  <text>{{ announcementDraft.text || "公告内容将在这里显示。" }}</text>
                </view>
              </view>
              <view class="admin-preview__line admin-preview__line--wide" />
              <view class="admin-preview__line" />
              <view class="admin-preview__block" />
              <view class="admin-preview__small-grid">
                <view class="admin-preview__small" />
                <view class="admin-preview__small" />
              </view>
            </view>
            <view class="admin-preview__meta">
              <text>最近保存</text>
              <text>{{ formatDate(contentState.announcement.updatedAt) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.admin-page {
  min-height: 100vh;
  background: #eef2f0;
  color: var(--ink);
}

.admin-sidebar {
  position: fixed;
  z-index: 20;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  width: 224px;
  flex-direction: column;
  padding: 24px 16px 18px;
  background: #17211e;
  color: #ffffff;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 7px;
}

.admin-brand__mark {
  display: flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: rgba(185, 229, 216, 0.1);
  color: #b9e5d8;
  font-family: Georgia, serif;
  font-size: 25px;
  font-weight: 700;
}

.admin-brand__name {
  display: block;
  font-size: 13px;
  font-weight: 720;
}

.admin-brand__meta {
  display: block;
  margin-top: 1px;
  color: #6e7d78;
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
}

.admin-sidebar__label {
  margin: 38px 10px 9px;
  color: #6e7d78;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-nav__item {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  gap: 10px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  text-align: left;
}

.admin-nav__item--active {
  background: rgba(185, 229, 216, 0.08);
}

.admin-nav__copy {
  display: flex;
  flex-direction: column;
}

.admin-nav__copy text:first-child {
  color: #dbe4e1;
  font-size: 11px;
  font-weight: 650;
}

.admin-nav__item--active .admin-nav__copy text:first-child {
  color: #b9e5d8;
}

.admin-nav__copy text:last-child {
  margin-top: 1px;
  color: #5f6d68;
  font-family: var(--font-mono);
  font-size: 7px;
}

.admin-sidebar__foot {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.admin-back {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #9caeaa;
  font-size: 10px;
}

.admin-local-note {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 5px;
  color: #5f6d68;
  font-size: 8px;
}

.admin-main {
  min-height: 100vh;
  margin-left: 224px;
  padding: 25px 30px 40px;
}

.admin-mobile-head,
.admin-mobile-tabs {
  display: none;
}

.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  max-width: 1240px;
  margin: 0 auto 22px;
}

.admin-header__copy {
  display: flex;
  flex-direction: column;
}

.admin-header__title {
  margin-top: 4px;
  color: var(--ink);
  font-size: 25px;
  font-weight: 760;
}

.admin-header__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.admin-user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
}

.admin-user__avatar {
  display: flex;
  width: 31px;
  height: 31px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--teal-wash);
  color: var(--teal);
  font-size: 11px;
  font-weight: 750;
}

.admin-user__name {
  display: block;
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
}

.admin-user__meta {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 8px;
}

.admin-section,
.admin-metrics {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
}

.admin-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.admin-metric {
  display: flex;
  min-height: 147px;
  flex-direction: column;
  padding: 16px;
}

.admin-metric__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.admin-metric__icon {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.admin-metric__icon--teal {
  background: var(--teal-wash);
}

.admin-metric__icon--blue {
  background: var(--blue-wash);
}

.admin-metric__icon--amber {
  background: var(--amber-wash);
}

.admin-metric__trend {
  color: var(--muted-light);
  font-size: 8px;
}

.admin-metric__value {
  margin-top: auto;
  color: var(--ink);
  font-size: 25px;
  font-weight: 700;
}

.admin-metric__label {
  margin-top: 3px;
  color: var(--muted);
  font-size: 8px;
}

.admin-overview-grid,
.admin-content-grid,
.admin-announcement-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 12px;
  margin-top: 12px;
}

.admin-panel {
  padding: 18px;
}

.admin-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--line);
}

.admin-panel__head--toolbar {
  align-items: center;
}

.admin-panel__title {
  color: var(--ink);
  font-size: 13px;
  font-weight: 720;
}

.admin-panel__meta {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
}

.admin-user-list {
  display: flex;
  flex-direction: column;
}

.admin-user-row {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid var(--line);
}

.admin-user-row:last-child {
  border-bottom: 0;
}

.admin-user-row__avatar,
.admin-table-user__avatar {
  display: flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 700;
}

.admin-user-row__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.admin-user-row__name {
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
}

.admin-user-row__meta {
  margin-top: 1px;
  color: var(--muted);
  font-size: 8px;
}

.admin-user-row__date {
  color: var(--muted-light);
  font-size: 8px;
  white-space: nowrap;
}

.admin-side-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--teal);
  font-size: 8px;
  font-weight: 650;
}

.admin-status::before {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--teal-bright);
  content: "";
}

.admin-status--off {
  color: var(--muted-light);
}

.admin-status--off::before {
  background: var(--muted-light);
}

.admin-announcement__title {
  display: block;
  margin-top: 14px;
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.admin-announcement__text {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.6;
}

.admin-announcement__button {
  min-height: 34px;
  margin-top: 13px;
  padding: 0 10px;
  font-size: 9px;
}

.admin-system__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  color: var(--muted);
  font-size: 8px;
}

.admin-system__row text:last-child {
  color: var(--ink-soft);
  font-size: 8px;
  font-weight: 650;
}

.admin-system__warning {
  color: #946617 !important;
}

.admin-disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 1240px;
  margin: 12px auto 0;
  padding: 12px 14px;
  border: 1px solid #ead8b5;
  border-radius: 7px;
  background: #fdf9f1;
  color: #806b42;
  font-size: 8px;
  line-height: 1.55;
}

.admin-search {
  display: flex;
  width: 245px;
  height: 35px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fbfcfb;
}

.admin-search__input {
  height: 100%;
  flex: 1;
  color: var(--ink);
  font-size: 9px;
}

.admin-table {
  margin-top: 12px;
}

.admin-table__head,
.admin-table__row {
  display: grid;
  grid-template-columns: minmax(145px, 1.2fr) 110px minmax(105px, 0.8fr) 70px 64px 128px;
  align-items: center;
  gap: 9px;
}

.admin-table__head {
  min-height: 34px;
  padding: 0 8px;
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 8px;
  font-weight: 650;
}

.admin-table__row {
  min-height: 62px;
  padding: 0 8px;
  border-bottom: 1px solid var(--line);
}

.admin-table-user {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.admin-table-user__name {
  display: block;
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
}

.admin-table-user__meta {
  display: block;
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 7px;
}

.admin-table__account {
  color: var(--muted);
  font-size: 8px;
}

.admin-table__stack {
  display: flex;
  flex-direction: column;
  gap: 1px;
  color: var(--ink-soft);
  font-size: 8px;
}

.admin-table__stack text:last-child {
  color: var(--muted-light);
  font-size: 7px;
}

.admin-account-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--teal);
  font-size: 8px;
}

.admin-account-status__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--teal-bright);
}

.admin-account-status--disabled {
  color: #a84237;
}

.admin-account-status--disabled .admin-account-status__dot {
  background: #cf5547;
}

.admin-row-actions {
  display: flex;
  gap: 4px;
}

.admin-action {
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 7px;
}

.admin-action--danger {
  color: #a84237;
}

.admin-action[disabled] {
  opacity: 0.35;
}

.admin-empty {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--muted);
  font-size: 9px;
}

.admin-content-grid {
  margin-top: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.admin-content-list {
  display: flex;
  flex-direction: column;
}

.admin-content-row {
  display: flex;
  min-height: 62px;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid var(--line);
}

.admin-content-row:last-child {
  border-bottom: 0;
}

.admin-content-row__icon {
  display: flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--surface-soft);
}

.admin-content-row__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.admin-content-row__title {
  overflow: hidden;
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-content-row__meta,
.admin-content-row__status {
  margin-top: 1px;
  color: var(--muted-light);
  font-size: 7px;
}

.admin-content-row__status {
  flex: 0 0 auto;
}

.admin-switch {
  position: relative;
  width: 34px;
  height: 19px;
  flex: 0 0 auto;
  border-radius: 10px;
  background: #d5dedb;
  transition: background-color 160ms ease;
}

.admin-switch--on {
  background: var(--teal);
}

.admin-switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(23, 33, 30, 0.18);
  transition: transform 160ms ease;
}

.admin-switch--on .admin-switch__thumb {
  transform: translateX(15px);
}

.admin-content-actions {
  display: flex;
  justify-content: flex-end;
  max-width: 1240px;
  margin: 12px auto 0;
}

.admin-announcement-layout {
  margin-top: 0;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
}

.admin-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.admin-form__field {
  position: relative;
  display: flex;
  flex-direction: column;
}

.admin-form__label {
  color: var(--ink-soft);
  font-size: 9px;
  font-weight: 650;
}

.admin-form__input,
.admin-form__textarea {
  margin-top: 6px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: #ffffff;
}

.admin-form__input {
  height: 42px;
  padding: 0 11px;
}

.admin-form__input input {
  width: 100%;
  height: 100%;
  color: var(--ink);
  font-size: 10px;
}

.admin-form__textarea {
  min-height: 120px;
  padding: 10px 11px;
}

.admin-form__textarea textarea {
  width: 100%;
  min-height: 95px;
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 10px;
  line-height: 1.6;
}

.admin-form__counter {
  position: absolute;
  right: 9px;
  bottom: 8px;
  color: var(--muted-light);
  font-size: 7px;
}

.admin-form__error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 9px;
  border: 1px solid #f0d0ca;
  border-radius: 5px;
  background: var(--red-wash);
  color: #a84237;
  font-size: 8px;
}

.admin-form__save {
  align-self: flex-end;
  min-width: 150px;
}

.admin-preview {
  padding: 18px;
}

.admin-preview__label {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.admin-preview__window {
  margin-top: 13px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfb;
}

.admin-preview__header {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--ink);
  font-size: 9px;
  font-weight: 700;
}

.admin-preview__logo {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--ink);
  color: #ffffff;
  font-family: Georgia, serif;
  font-size: 16px;
}

.admin-preview__notice {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 13px;
  padding: 9px;
  border: 1px solid #ead8b5;
  border-radius: 5px;
  background: #fdf9f1;
}

.admin-preview__notice view {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.admin-preview__notice view text:first-child {
  color: var(--ink);
  font-size: 8px;
  font-weight: 650;
}

.admin-preview__notice view text:last-child {
  margin-top: 2px;
  color: #806b42;
  font-size: 7px;
  line-height: 1.5;
}

.admin-preview__line {
  width: 65%;
  height: 6px;
  margin-top: 8px;
  border-radius: 3px;
  background: #e8eeeb;
}

.admin-preview__line--wide {
  width: 88%;
  height: 10px;
  margin-top: 16px;
}

.admin-preview__block {
  height: 90px;
  margin-top: 13px;
  border-radius: 6px;
  background: #17211e;
}

.admin-preview__small-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
  margin-top: 8px;
}

.admin-preview__small {
  height: 42px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
}

.admin-preview__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 8px;
}

.admin-gate {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.admin-gate__card {
  display: flex;
  width: 100%;
  max-width: 390px;
  flex-direction: column;
  align-items: center;
  padding: 34px;
  text-align: center;
}

.admin-gate__icon {
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--amber-wash);
}

.admin-gate__title {
  margin-top: 16px;
  color: var(--ink);
  font-size: 18px;
  font-weight: 750;
}

.admin-gate__desc {
  margin-top: 7px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.65;
}

.admin-gate .button-primary {
  width: 100%;
  margin-top: 20px;
}

.admin-gate .button-quiet {
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .admin-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-overview-grid,
  .admin-content-grid,
  .admin-announcement-layout {
    grid-template-columns: 1fr;
  }

  .admin-table__head,
  .admin-table__row {
    grid-template-columns: minmax(145px, 1.2fr) 100px 95px 60px 58px 120px;
    gap: 6px;
  }
}

@media (max-width: 900px) {
  .admin-page {
    padding-top: calc(18px + var(--status-bar-height, env(safe-area-inset-top)));
    padding-bottom: calc(30px + env(safe-area-inset-bottom));
  }

  .admin-sidebar {
    display: none;
  }

  .admin-main {
    margin-left: 0;
    padding: 0 16px 30px;
  }

  .admin-mobile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .admin-mobile-tabs {
    display: flex;
    gap: 6px;
    margin: 18px -16px 16px;
    padding: 0 16px 2px;
    overflow-x: auto;
  }

  .admin-mobile-tab {
    display: inline-flex;
    min-height: 34px;
    flex: 0 0 auto;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    color: var(--muted);
    font-size: 9px;
  }

  .admin-mobile-tab--active {
    border-color: #cce6de;
    background: var(--teal-wash);
    color: var(--teal);
  }

  .admin-header {
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .admin-user {
    display: none;
  }

  .admin-header__title {
    font-size: 21px;
  }

  .admin-metrics {
    gap: 8px;
  }

  .admin-metric {
    min-height: 132px;
    padding: 13px;
  }

  .admin-overview-grid,
  .admin-content-grid,
  .admin-announcement-layout {
    gap: 9px;
  }

  .admin-panel {
    padding: 15px;
  }

  .admin-panel__head--toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .admin-search {
    width: 100%;
  }

  .admin-table__head {
    display: none;
  }

  .admin-table__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 7px;
    padding: 12px 0;
  }

  .admin-table-user {
    grid-column: 1;
  }

  .admin-table__account {
    grid-column: 2;
    text-align: right;
  }

  .admin-table__stack {
    grid-column: 1;
    flex-direction: row;
    gap: 5px;
  }

  .admin-table__row > .chip,
  .admin-account-status {
    grid-column: 2;
    justify-self: end;
  }

  .admin-row-actions {
    grid-column: 1 / -1;
  }

  .admin-user-row__date {
    display: none;
  }

  .admin-preview {
    padding: 15px;
  }
}
</style>
