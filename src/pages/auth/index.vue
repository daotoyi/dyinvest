<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import AppIcon from "../../components/AppIcon.vue";
import { useAuth } from "../../composables/useAuth";
import {
  WECHAT_CLOUD_ENV,
  WECHAT_PHONE_LOGIN_FUNCTION,
} from "../../config/runtime";
import {
  EXPERIENCE_LABELS,
  RISK_LABELS,
} from "../../domain/user";

const {
  currentUser,
  isLoggedIn,
  accountIdentifier,
  preferences,
  hasAccounts,
  login,
  loginWithVerifiedPhone,
  register,
  logout,
} = useAuth();

const mode = ref<"login" | "register">("register");
const username = ref("");
const nickname = ref("");
const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const agreed = ref(false);
const errorMessage = ref("");
const submitting = ref(false);
const phoneLoading = ref(false);
let cloudInitialized = false;

interface PhoneNumberEvent {
  detail?: {
    code?: string;
    errMsg?: string;
  };
}

interface PhoneLoginCloudResult {
  ok?: boolean;
  phoneNumber?: string;
  code?: string;
  message?: string;
}

interface PhoneLoginFailure {
  code?: string;
  errCode?: string | number;
  errMsg?: string;
  message?: string;
}

interface WechatCloudApi {
  init(options: { env?: string; traceUser?: boolean }): void;
  callFunction(options: {
    name: string;
    data: { code: string };
  }): Promise<{ result?: unknown }>;
}

onLoad((query) => {
  if (query?.mode === "login" || query?.mode === "register") {
    mode.value = query.mode;
  } else {
    mode.value = hasAccounts.value ? "login" : "register";
  }
});

const activeTitle = computed(() =>
  mode.value === "login" ? "登录本地账户" : "创建本地账户",
);

function switchMode(nextMode: "login" | "register") {
  mode.value = nextMode;
  errorMessage.value = "";
  password.value = "";
  confirmPassword.value = "";
}

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }
  uni.reLaunch({ url: "/pages/profile/index" });
}

function goHome() {
  uni.reLaunch({ url: "/pages/home/index" });
}

function openSettings() {
  uni.navigateTo({ url: "/pages/settings/index" });
}

function finishAuth(message: string) {
  uni.showToast({ title: message, icon: "success" });
  setTimeout(() => {
    const pages = getCurrentPages();
    if (pages.length > 1) uni.navigateBack();
    else uni.reLaunch({ url: "/pages/profile/index" });
  }, 450);
}

function showPhoneUnavailable() {
  uni.showModal({
    title: "手机号快捷登录",
    content:
      "微信一键获取手机号仅在微信小程序内可用。H5 需要接入短信验证码服务和后端会话接口。",
    showCancel: false,
    confirmText: "我知道了",
    confirmColor: "#0e6f5c",
  });
}

async function handleGetPhoneNumber(event: PhoneNumberEvent) {
  errorMessage.value = "";
  const detail = event.detail;
  if (!detail?.code) {
    const cancelled =
      detail?.errMsg?.includes("deny") || detail?.errMsg?.includes("cancel");
    errorMessage.value = cancelled
      ? "你已取消手机号授权"
      : `微信未返回手机号授权码${detail?.errMsg ? `：${detail.errMsg}` : "，请稍后重试"}`;
    return;
  }

  const cloud = (
    globalThis as typeof globalThis & {
      wx?: { cloud?: WechatCloudApi };
    }
  ).wx?.cloud;
  if (!cloud) {
    errorMessage.value = "当前环境不支持微信云开发手机号登录";
    return;
  }

  phoneLoading.value = true;
  try {
    if (!cloudInitialized) {
      if (!WECHAT_CLOUD_ENV) {
        throw new Error(
          "未配置微信云开发环境 ID，请使用 VITE_WECHAT_CLOUD_ENV 重新构建",
        );
      }
      cloud.init({
        env: WECHAT_CLOUD_ENV,
        traceUser: true,
      });
      cloudInitialized = true;
    }

    const response = await cloud.callFunction({
      name: WECHAT_PHONE_LOGIN_FUNCTION,
      data: { code: detail.code },
    });
    const result = response.result as PhoneLoginCloudResult | undefined;
    if (!result?.ok || !result.phoneNumber) {
      const code = result?.code ? `[${result.code}] ` : "";
      throw new Error(
        `${code}${result?.message || "手机号验证失败，请确认云函数和环境配置"}`,
      );
    }
    loginWithVerifiedPhone(result.phoneNumber);
    finishAuth("手机号登录成功");
  } catch (error) {
    const failure = error as PhoneLoginFailure;
    const code = failure?.errCode ?? failure?.code;
    const message =
      failure?.errMsg ||
      failure?.message ||
      (error instanceof Error ? error.message : "");
    errorMessage.value = `${message || "手机号快捷登录失败，请稍后重试"}${
      code ? `（错误码 ${code}）` : ""
    }`;
  } finally {
    phoneLoading.value = false;
  }
}

function submit() {
  errorMessage.value = "";
  if (!username.value.trim()) {
    errorMessage.value = "请输入用户名";
    return;
  }
  if (!password.value) {
    errorMessage.value = "请输入密码";
    return;
  }
  if (mode.value === "register") {
    if (!nickname.value.trim()) {
      errorMessage.value = "请输入昵称";
      return;
    }
    if (password.value !== confirmPassword.value) {
      errorMessage.value = "两次输入的密码不一致";
      return;
    }
    if (!agreed.value) {
      errorMessage.value = "请先确认风险提示与本地数据说明";
      return;
    }
  }

  submitting.value = true;
  try {
    if (mode.value === "login") {
      login(username.value, password.value);
      finishAuth("登录成功");
    } else {
      register({
        username: username.value,
        password: password.value,
        nickname: nickname.value,
      });
      finishAuth("注册成功");
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "操作失败，请稍后重试";
  } finally {
    submitting.value = false;
  }
}

function handleLogout() {
  uni.showModal({
    title: "退出当前账户",
    content: "退出后，本机账户及配置仍会保留，下次可以重新登录。",
    confirmText: "退出登录",
    confirmColor: "#cf5547",
    success: (result) => {
      if (!result.confirm) return;
      logout();
      uni.showToast({ title: "已退出登录", icon: "success" });
    },
  });
}
</script>

<template>
  <view class="auth-page">
    <view class="auth-layout">
      <view class="auth-brand-panel">
        <view class="auth-brand">
          <view class="auth-brand__mark">θ</view>
          <view>
            <text class="auth-brand__name">道元期权</text>
            <text class="auth-brand__meta">DAO OPTIONS</text>
          </view>
        </view>

        <view class="auth-brand__content">
          <text class="auth-brand__eyebrow">Your local workspace</text>
          <text class="auth-brand__title">把学习、策略和偏好，留在自己的账户里。</text>
          <text class="auth-brand__desc">
            当前版本使用本机账户。配置会绑定到具体用户，切换账户后仍然可以恢复。
          </text>
          <view class="auth-feature-list">
            <view class="auth-feature">
              <AppIcon name="bookCheck" :size="18" color="#b9e5d8" />
              <text>保存学习与风险偏好</text>
            </view>
            <view class="auth-feature">
              <AppIcon name="chart" :size="18" color="#b9e5d8" />
              <text>记住默认策略和下单数量</text>
            </view>
            <view class="auth-feature">
              <AppIcon name="lock" :size="18" color="#b9e5d8" />
              <text>密码使用随机盐和哈希保存</text>
            </view>
          </view>
        </view>

        <view class="auth-brand__footer">
          <view class="auth-brand__status">
            <view class="auth-brand__dot" />
            <text>本地账户模式</text>
          </view>
          <text>未接入云端同步</text>
        </view>
      </view>

      <view class="auth-form-panel">
        <button class="auth-back" @tap="goBack">
          <AppIcon name="arrowLeft" :size="19" color="#52605c" />
        </button>

        <view v-if="isLoggedIn && currentUser" class="signed-in">
          <view class="signed-in__badge">
            <AppIcon name="circleCheck" :size="24" color="#0e6f5c" />
          </view>
          <text class="signed-in__eyebrow">Signed in</text>
          <text class="signed-in__title">已登录 {{ preferences?.nickname }}</text>
          <text class="signed-in__desc">
            {{ accountIdentifier }} · {{ RISK_LABELS[preferences?.riskLevel ?? "C3"] }}
          </text>
          <view class="signed-in__summary">
            <view class="signed-in__summary-item">
              <text>经验</text>
              <text>{{ EXPERIENCE_LABELS[preferences?.experience ?? "beginner"] }}</text>
            </view>
            <view class="signed-in__summary-item">
              <text>本地账户</text>
              <text>已启用</text>
            </view>
          </view>
          <button class="button-primary signed-in__primary" @tap="openSettings">
            <AppIcon name="sliders" :size="16" color="#ffffff" />
            <text>编辑账户配置</text>
          </button>
          <button class="button-secondary signed-in__secondary" @tap="handleLogout">
            <AppIcon name="logOut" :size="16" color="#17211e" />
            <text>退出登录</text>
          </button>
          <button class="button-quiet signed-in__home" @tap="goHome">返回首页</button>
        </view>

        <view v-else class="auth-form-wrap">
          <view class="auth-form-head">
            <text class="eyebrow">Local account</text>
            <text class="auth-form-title">{{ activeTitle }}</text>
            <text class="auth-form-desc">
              可使用微信手机号快捷登录，也可以创建独立的本地用户名账户。
            </text>
          </view>

          <!-- #ifdef MP-WEIXIN -->
          <button
            class="phone-login"
            open-type="getPhoneNumber"
            :loading="phoneLoading"
            @getphonenumber="handleGetPhoneNumber"
          >
            <view class="phone-login__icon">
              <AppIcon name="messageCircle" :size="20" color="#ffffff" />
            </view>
            <view class="phone-login__copy">
              <text class="phone-login__title">手机号快捷登录</text>
              <text class="phone-login__desc">微信授权手机号，一键验证登录</text>
            </view>
            <AppIcon name="chevronRight" :size="17" color="#94d7c5" />
          </button>
          <!-- #endif -->

          <!-- #ifndef MP-WEIXIN -->
          <button class="phone-login" @tap="showPhoneUnavailable">
            <view class="phone-login__icon">
              <AppIcon name="messageCircle" :size="20" color="#ffffff" />
            </view>
            <view class="phone-login__copy">
              <text class="phone-login__title">手机号快捷登录</text>
              <text class="phone-login__desc">微信小程序内可一键授权手机号</text>
            </view>
            <AppIcon name="chevronRight" :size="17" color="#94d7c5" />
          </button>
          <!-- #endif -->

          <view class="auth-divider">
            <view class="auth-divider__line" />
            <text>或使用本地账户</text>
            <view class="auth-divider__line" />
          </view>

          <view class="segmented auth-mode">
            <button
              class="segmented__item"
              :class="{ 'segmented__item--active': mode === 'login' }"
              @tap="switchMode('login')"
            >
              登录
            </button>
            <button
              class="segmented__item"
              :class="{ 'segmented__item--active': mode === 'register' }"
              @tap="switchMode('register')"
            >
              注册
            </button>
          </view>

          <view class="auth-fields">
            <view v-if="mode === 'register'" class="auth-field">
              <text class="auth-field__label">昵称</text>
              <view class="auth-input">
                <AppIcon name="user" :size="17" color="#7b8783" />
                <input
                  v-model="nickname"
                  class="auth-input__field"
                  type="text"
                  maxlength="20"
                  placeholder="用于显示的名称"
                />
              </view>
            </view>

            <view class="auth-field">
              <text class="auth-field__label">用户名</text>
              <view class="auth-input">
                <AppIcon name="userPlus" :size="17" color="#7b8783" />
                <input
                  v-model="username"
                  class="auth-input__field"
                  type="text"
                  maxlength="20"
                  placeholder="字母开头，3-20 位"
                />
              </view>
            </view>

            <view class="auth-field">
              <text class="auth-field__label">密码</text>
              <view class="auth-input">
                <AppIcon name="lock" :size="17" color="#7b8783" />
                <input
                  v-model="password"
                  class="auth-input__field"
                  type="text"
                  maxlength="64"
                  placeholder="至少 8 位"
                  :password="!showPassword"
                  confirm-type="done"
                  @confirm="submit"
                />
                <button class="auth-input__toggle" @tap="showPassword = !showPassword">
                  <AppIcon
                    :name="showPassword ? 'eyeOff' : 'eye'"
                    :size="17"
                    color="#7b8783"
                  />
                </button>
              </view>
            </view>

            <view v-if="mode === 'register'" class="auth-field">
              <text class="auth-field__label">确认密码</text>
              <view class="auth-input">
                <AppIcon name="keyRound" :size="17" color="#7b8783" />
                <input
                  v-model="confirmPassword"
                  class="auth-input__field"
                  type="text"
                  maxlength="64"
                  placeholder="再次输入密码"
                  :password="!showConfirmPassword"
                  confirm-type="done"
                  @confirm="submit"
                />
                <button
                  class="auth-input__toggle"
                  @tap="showConfirmPassword = !showConfirmPassword"
                >
                  <AppIcon
                    :name="showConfirmPassword ? 'eyeOff' : 'eye'"
                    :size="17"
                    color="#7b8783"
                  />
                </button>
              </view>
            </view>
          </view>

          <button
            v-if="mode === 'register'"
            class="auth-agreement"
            @tap="agreed = !agreed"
          >
            <view class="auth-agreement__box" :class="{ 'auth-agreement__box--checked': agreed }">
              <AppIcon v-if="agreed" name="check" :size="12" color="#ffffff" />
            </view>
            <text>我已知晓本地数据说明和期权交易风险</text>
          </button>

          <view v-if="errorMessage" class="auth-error">
            <AppIcon name="alert" :size="15" color="#a84237" />
            <text>{{ errorMessage }}</text>
          </view>

          <button
            class="button-primary button-primary--teal auth-submit"
            :disabled="submitting"
            @tap="submit"
          >
            <AppIcon
              :name="mode === 'login' ? 'logOut' : 'userPlus'"
              :size="16"
              color="#ffffff"
            />
            <text>{{ submitting ? "处理中" : mode === "login" ? "登录账户" : "创建账户" }}</text>
          </button>

          <button class="button-quiet auth-guest" @tap="goHome">
            暂不登录，以访客模式继续
          </button>

          <view class="auth-local-note">
            <AppIcon name="info" :size="14" color="#7b8783" />
            <text>
              手机号由微信授权并仅用于登录识别；本地用户名账户不支持跨设备同步。
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.auth-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: var(--canvas);
}

.auth-layout {
  display: grid;
  width: 100%;
  max-width: 1080px;
  min-height: 680px;
  grid-template-columns: minmax(340px, 0.85fr) minmax(460px, 1.15fr);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.auth-brand-panel {
  display: flex;
  flex-direction: column;
  padding: 28px;
  background: #17211e;
  color: #ffffff;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-brand__mark {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #b9e5d8;
  font-family: Georgia, serif;
  font-size: 27px;
  font-weight: 700;
}

.auth-brand__name {
  display: block;
  font-size: 14px;
  font-weight: 720;
}

.auth-brand__meta {
  display: block;
  margin-top: 1px;
  color: #7e8d88;
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
}

.auth-brand__content {
  display: flex;
  flex-direction: column;
  margin: auto 0;
}

.auth-brand__eyebrow {
  color: #8fa19b;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.auth-brand__title {
  margin-top: 12px;
  font-size: 29px;
  font-weight: 720;
  line-height: 1.35;
}

.auth-brand__desc {
  margin-top: 12px;
  color: #a2b0ac;
  font-size: 12px;
  line-height: 1.7;
}

.auth-feature-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin-top: 30px;
}

.auth-feature {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #c5d1cd;
  font-size: 10px;
}

.auth-brand__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 17px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  color: #697772;
  font-size: 8px;
}

.auth-brand__status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9daeaa;
}

.auth-brand__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #8fd8c2;
}

.auth-form-panel {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 36px 62px;
  background: var(--surface);
}

.auth-back {
  position: absolute;
  top: 26px;
  left: 26px;
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.auth-form-wrap,
.signed-in {
  width: 100%;
  max-width: 390px;
  margin: auto;
}

.auth-form-head {
  display: flex;
  flex-direction: column;
  margin-top: 22px;
}

.auth-form-title {
  margin-top: 5px;
  color: var(--ink);
  font-size: 25px;
  font-weight: 750;
}

.auth-form-desc {
  margin-top: 7px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.65;
}

.phone-login {
  display: flex;
  width: 100%;
  min-height: 58px;
  align-items: center;
  gap: 11px;
  margin-top: 20px;
  padding: 10px 13px;
  border-radius: 7px;
  background: var(--teal);
  color: #ffffff;
  text-align: left;
}

.phone-login:active {
  background: #0a5b4c;
}

.phone-login__icon {
  display: flex;
  width: 35px;
  height: 35px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.08);
}

.phone-login__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.phone-login__title {
  font-size: 11px;
  font-weight: 720;
}

.phone-login__desc {
  margin-top: 2px;
  color: #b9e5d8;
  font-size: 8px;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 17px;
  color: var(--muted-light);
  font-size: 8px;
}

.auth-divider__line {
  height: 1px;
  flex: 1;
  background: var(--line);
}

.auth-mode {
  display: flex;
  width: 100%;
  margin-top: 12px;
}

.auth-mode .segmented__item {
  flex: 1;
}

.auth-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 20px;
}

.auth-field {
  display: flex;
  flex-direction: column;
}

.auth-field__label {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 650;
}

.auth-input {
  display: flex;
  height: 46px;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: #ffffff;
}

.auth-input:focus-within {
  border-color: var(--teal);
}

.auth-input__field {
  height: 100%;
  flex: 1;
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 12px;
}

.auth-input__toggle {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
}

.auth-agreement {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.55;
  text-align: left;
}

.auth-agreement__box {
  display: flex;
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--surface);
}

.auth-agreement__box--checked {
  border-color: var(--teal);
  background: var(--teal);
}

.auth-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 12px;
  padding: 9px 10px;
  border: 1px solid #f0d0ca;
  border-radius: 5px;
  background: var(--red-wash);
  color: #a84237;
  font-size: 9px;
  line-height: 1.5;
}

.auth-submit {
  width: 100%;
  margin-top: 16px;
}

.auth-guest {
  width: 100%;
  margin-top: 8px;
  color: var(--muted);
}

.auth-local-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 12px;
  padding-top: 13px;
  border-top: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 8px;
  line-height: 1.55;
}

.signed-in {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.signed-in__badge {
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--teal-wash);
}

.signed-in__eyebrow {
  margin-top: 13px;
  color: var(--muted-light);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}

.signed-in__title {
  margin-top: 5px;
  color: var(--ink);
  font-size: 24px;
  font-weight: 750;
}

.signed-in__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.signed-in__summary {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 22px;
  padding: 15px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfb;
}

.signed-in__summary-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.signed-in__summary-item text:first-child {
  color: var(--muted);
  font-size: 8px;
}

.signed-in__summary-item text:last-child {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 650;
}

.signed-in__primary,
.signed-in__secondary {
  width: 100%;
  margin-top: 12px;
}

.signed-in__home {
  margin-top: 8px;
}

@media (max-width: 900px) {
  .auth-page {
    display: block;
    min-height: 100vh;
    padding: 0;
    background: var(--surface);
  }

  .auth-layout {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .auth-brand-panel {
    padding: calc(20px + var(--status-bar-height, env(safe-area-inset-top))) 20px 22px;
  }

  .auth-brand__content {
    margin: 26px 0 0;
  }

  .auth-brand__title {
    max-width: 320px;
    font-size: 23px;
  }

  .auth-brand__desc {
    max-width: 330px;
    font-size: 11px;
  }

  .auth-feature-list {
    display: none;
  }

  .auth-brand__footer {
    display: none;
  }

  .auth-form-panel {
    min-height: 520px;
    flex: 1;
    padding: 42px 20px calc(30px + env(safe-area-inset-bottom));
  }

  .auth-back {
    top: 18px;
    left: 20px;
    width: 32px;
    height: 32px;
  }

  .auth-form-wrap,
  .signed-in {
    max-width: 100%;
    margin-top: 20px;
  }

  .auth-form-head {
    margin-top: 0;
  }

  .auth-form-title {
    font-size: 22px;
  }

  .auth-input {
    height: 48px;
  }

  .signed-in {
    margin-top: 70px;
  }
}
</style>
