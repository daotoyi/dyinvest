<script setup lang="ts">
import { computed, ref } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";
import { strategyTemplates } from "../../data/strategies";
import { useAuth } from "../../composables/useAuth";
import {
  EXPERIENCE_LABELS,
  RISK_LABELS,
  type ExperienceLevel,
  type RiskLevel,
} from "../../domain/user";

const {
  isLoggedIn,
  accountIdentifier,
  preferences,
  updatePreferences,
} = useAuth();

const draft = ref({
  nickname: preferences.value?.nickname ?? "",
  experience: preferences.value?.experience ?? "beginner",
  riskLevel: preferences.value?.riskLevel ?? "C3",
  defaultStrategyId:
    preferences.value?.defaultStrategyId ?? "bull-call-spread",
  defaultOrderQuantity: preferences.value?.defaultOrderQuantity ?? 1,
});
const errorMessage = ref("");
const savedMessage = ref("");
const experienceOptions: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];
const riskOptions: RiskLevel[] = ["C2", "C3", "C4"];
const strategyIndex = computed(() => {
  const index = strategyTemplates.findIndex(
    (template) => template.id === draft.value.defaultStrategyId,
  );
  return index >= 0 ? index : 1;
});
const selectedStrategy = computed(() => strategyTemplates[strategyIndex.value]);
const lastSavedLabel = computed(() => {
  const value = preferences.value?.updatedAt;
  if (!value) return "尚未保存";
  return new Date(value).toLocaleString("zh-CN");
});

function openAuth() {
  uni.navigateTo({ url: "/pages/auth/index?mode=login" });
}

function changeStrategy(event: { detail: { value: number | string } }) {
  const strategy = strategyTemplates[Number(event.detail.value)];
  if (strategy) draft.value.defaultStrategyId = strategy.id;
}

function changeQuantity(delta: number) {
  draft.value.defaultOrderQuantity = Math.min(
    20,
    Math.max(1, draft.value.defaultOrderQuantity + delta),
  );
}

function save() {
  errorMessage.value = "";
  savedMessage.value = "";
  if (draft.value.nickname.trim().length < 2) {
    errorMessage.value = "昵称至少需要 2 个字符";
    return;
  }
  try {
    const saved = updatePreferences({
      nickname: draft.value.nickname.trim(),
      experience: draft.value.experience,
      riskLevel: draft.value.riskLevel,
      defaultStrategyId: draft.value.defaultStrategyId,
      defaultOrderQuantity: draft.value.defaultOrderQuantity,
    });
    draft.value.nickname = saved.nickname;
    savedMessage.value = "配置已保存到当前本地账户";
    uni.showToast({ title: "配置已保存", icon: "success" });
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "保存失败，请稍后重试";
  }
}
</script>

<template>
  <AppShell secondary>
    <view class="page-canvas page-canvas--secondary">
      <view class="page-content">
        <PageHeader
          back
          title="账户与偏好"
          eyebrow="Account preferences"
          subtitle="配置与当前用户绑定，并保存在本机。"
        >
          <template #action>
            <view class="settings-status">
              <view class="settings-status__dot" />
              <text>{{ isLoggedIn ? "本地已保存" : "未登录" }}</text>
            </view>
          </template>
        </PageHeader>

        <view v-if="!isLoggedIn" class="settings-login card">
          <view class="settings-login__icon">
            <AppIcon name="lock" :size="24" color="#0e6f5c" />
          </view>
          <text class="settings-login__title">登录后才能保存账户配置</text>
          <text class="settings-login__desc">
            注册本地账户后，昵称、风险偏好、默认策略和下单数量会独立保存。
          </text>
          <button class="button-primary button-primary--teal" @tap="openAuth">
            <AppIcon name="userPlus" :size="16" color="#ffffff" />
            <text>登录或注册</text>
          </button>
        </view>

        <view v-else class="settings-layout">
          <view class="settings-main">
            <view class="settings-card card">
              <view class="settings-card__head">
                <view>
                  <text class="settings-card__title">账户资料</text>
                  <text class="settings-card__meta">用于应用内展示和策略推荐入口</text>
                </view>
                <view class="chip chip--teal">{{ accountIdentifier }}</view>
              </view>

              <view class="settings-field">
                <text class="settings-field__label">显示昵称</text>
                <view class="settings-input">
                  <AppIcon name="user" :size="17" color="#7b8783" />
                  <input
                    v-model="draft.nickname"
                    class="settings-input__field"
                    type="text"
                    maxlength="20"
                    placeholder="请输入昵称"
                  />
                </view>
              </view>

              <view class="settings-field">
                <text class="settings-field__label">期权经验</text>
                <view class="choice-grid">
                  <button
                    v-for="option in experienceOptions"
                    :key="option"
                    class="choice-item"
                    :class="{ 'choice-item--active': draft.experience === option }"
                    @tap="draft.experience = option"
                  >
                    <view class="choice-item__radio">
                      <view v-if="draft.experience === option" class="choice-item__radio-dot" />
                    </view>
                    <text>{{ EXPERIENCE_LABELS[option] }}</text>
                  </button>
                </view>
              </view>
            </view>

            <view class="settings-card card">
              <view class="settings-card__head">
                <view>
                  <text class="settings-card__title">风险偏好</text>
                  <text class="settings-card__meta">仅用于应用内提示和策略默认值</text>
                </view>
                <AppIcon name="shield" :size="19" color="#946617" />
              </view>

              <view class="risk-choice-list">
                <button
                  v-for="option in riskOptions"
                  :key="option"
                  class="risk-choice"
                  :class="{ 'risk-choice--active': draft.riskLevel === option }"
                  @tap="draft.riskLevel = option"
                >
                  <view class="risk-choice__copy">
                    <text class="risk-choice__title">{{ RISK_LABELS[option] }}</text>
                    <text class="risk-choice__desc">
                      {{ option === "C2" ? "优先保护本金，降低组合波动" : option === "C3" ? "接受适度波动，追求风险收益平衡" : "能承受较大波动和更复杂的策略" }}
                    </text>
                  </view>
                  <view class="risk-choice__check">
                    <AppIcon
                      v-if="draft.riskLevel === option"
                      name="check"
                      :size="14"
                      color="#0e6f5c"
                    />
                  </view>
                </button>
              </view>
            </view>

            <view class="settings-card card">
              <view class="settings-card__head">
                <view>
                  <text class="settings-card__title">策略与交易偏好</text>
                  <text class="settings-card__meta">进入策略实验室和下单页时自动应用</text>
                </view>
                <AppIcon name="sliders" :size="19" color="#52605c" />
              </view>

              <picker
                :range="strategyTemplates.map((template) => template.name)"
                :value="strategyIndex"
                @change="changeStrategy"
              >
                <view class="settings-select">
                  <view>
                    <text class="settings-field__label">默认策略</text>
                    <text class="settings-select__value">{{ selectedStrategy?.name }}</text>
                  </view>
                  <view class="settings-select__action">
                    <text>{{ selectedStrategy?.risk }}</text>
                    <AppIcon name="chevronRight" :size="15" color="#7b8783" />
                  </view>
                </view>
              </picker>

              <view class="settings-row-line" />

              <view class="settings-quantity">
                <view>
                  <text class="settings-field__label">默认下单数量</text>
                  <text class="settings-quantity__hint">模拟下单页初始合约张数</text>
                </view>
                <view class="settings-stepper">
                  <button class="settings-stepper__button" @tap="changeQuantity(-1)">
                    <AppIcon name="minus" :size="14" color="#52605c" />
                  </button>
                  <text class="settings-stepper__value mono">{{ draft.defaultOrderQuantity }}</text>
                  <button class="settings-stepper__button" @tap="changeQuantity(1)">
                    <AppIcon name="plus" :size="14" color="#52605c" />
                  </button>
                </view>
              </view>
            </view>

            <view v-if="errorMessage" class="settings-message settings-message--error">
              <AppIcon name="alert" :size="15" color="#a84237" />
              <text>{{ errorMessage }}</text>
            </view>
            <view v-if="savedMessage" class="settings-message settings-message--success">
              <AppIcon name="circleCheck" :size="15" color="#0e6f5c" />
              <text>{{ savedMessage }}</text>
            </view>

            <button class="button-primary button-primary--teal settings-save" @tap="save">
              <AppIcon name="save" :size="16" color="#ffffff" />
              <text>保存账户配置</text>
            </button>
          </view>

          <view class="settings-aside">
            <view class="account-summary card">
              <view class="account-summary__avatar">
                {{ draft.nickname.slice(0, 1) || "U" }}
              </view>
              <text class="account-summary__name">{{ draft.nickname || "未命名用户" }}</text>
              <text class="account-summary__username">{{ accountIdentifier }}</text>
              <view class="account-summary__meta">
                <view class="chip">{{ RISK_LABELS[draft.riskLevel] }}</view>
                <view class="chip">{{ EXPERIENCE_LABELS[draft.experience] }}</view>
              </view>
              <view class="account-summary__line" />
              <view class="account-summary__row">
                <text>默认策略</text>
                <text>{{ selectedStrategy?.shortName }}</text>
              </view>
              <view class="account-summary__row">
                <text>默认数量</text>
                <text class="mono">{{ draft.defaultOrderQuantity }} 张</text>
              </view>
            </view>

            <view class="data-scope card">
              <view class="data-scope__head">
                <AppIcon name="info" :size="18" color="#436d93" />
                <text>数据范围</text>
              </view>
              <text class="data-scope__text">
                这些配置保存在当前设备，并绑定到用户 ID。当前版本不上传云端，也不支持跨设备同步。
              </text>
              <text class="data-scope__meta">
                最近保存：{{ lastSavedLabel }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.settings-status {
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

.settings-status__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--teal-bright);
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 16px;
  align-items: start;
}

.settings-main,
.settings-aside {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.settings-card {
  padding: 19px;
}

.settings-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--line);
}

.settings-card__title {
  color: var(--ink);
  font-size: 14px;
  font-weight: 720;
}

.settings-card__meta {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

.settings-field {
  margin-top: 16px;
}

.settings-field__label {
  display: block;
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 650;
}

.settings-input {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
  padding: 0 11px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--surface);
}

.settings-input__field {
  height: 100%;
  flex: 1;
  color: var(--ink);
  font-family: var(--font-ui);
  font-size: 12px;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.choice-item {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fbfcfb;
  color: var(--muted);
  font-size: 10px;
  text-align: left;
}

.choice-item--active {
  border-color: #b9d9cf;
  background: var(--teal-wash);
  color: #215447;
}

.choice-item__radio {
  display: flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--surface);
}

.choice-item__radio-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal);
}

.risk-choice-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 14px;
}

.risk-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fbfcfb;
  text-align: left;
}

.risk-choice--active {
  border-color: #b9d9cf;
  background: var(--teal-wash);
}

.risk-choice__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.risk-choice__title {
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
}

.risk-choice__desc {
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
}

.risk-choice__check {
  display: flex;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
}

.settings-select {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 15px;
}

.settings-select__value {
  display: block;
  margin-top: 4px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 650;
}

.settings-select__action {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 9px;
}

.settings-row-line {
  height: 1px;
  margin: 4px 0 12px;
  background: var(--line);
}

.settings-quantity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.settings-quantity__hint {
  display: block;
  margin-top: 2px;
  color: var(--muted-light);
  font-size: 8px;
}

.settings-stepper {
  display: flex;
  height: 34px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}

.settings-stepper__button {
  display: flex;
  width: 34px;
  height: 32px;
  align-items: center;
  justify-content: center;
  background: #fbfcfb;
}

.settings-stepper__value {
  display: flex;
  width: 38px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--line);
  border-left: 1px solid var(--line);
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
}

.settings-message {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 9px;
  line-height: 1.5;
}

.settings-message--error {
  border: 1px solid #f0d0ca;
  background: var(--red-wash);
  color: #a84237;
}

.settings-message--success {
  border: 1px solid #cce6de;
  background: var(--teal-wash);
  color: #215447;
}

.settings-save {
  align-self: flex-end;
  min-width: 180px;
}

.account-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.account-summary__avatar {
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--teal-wash);
  color: var(--teal);
  font-size: 20px;
  font-weight: 750;
}

.account-summary__name {
  margin-top: 10px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 720;
}

.account-summary__username {
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

.account-summary__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
  margin-top: 12px;
}

.account-summary__line {
  width: 100%;
  height: 1px;
  margin: 17px 0 7px;
  background: var(--line);
}

.account-summary__row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  color: var(--muted);
  font-size: 8px;
}

.account-summary__row text:last-child {
  color: var(--ink-soft);
  font-size: 9px;
  font-weight: 650;
}

.data-scope {
  padding: 17px;
}

.data-scope__head {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.data-scope__text {
  display: block;
  margin-top: 9px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.65;
}

.data-scope__meta {
  display: block;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 8px;
}

.settings-login {
  display: flex;
  min-height: 330px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
}

.settings-login__icon {
  display: flex;
  width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--teal-wash);
}

.settings-login__title {
  margin-top: 15px;
  color: var(--ink);
  font-size: 16px;
  font-weight: 720;
}

.settings-login__desc {
  max-width: 340px;
  margin-top: 5px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.6;
}

.settings-login .button-primary {
  margin-top: 18px;
}

@media (max-width: 900px) {
  .settings-status {
    display: none;
  }

  .settings-layout {
    display: flex;
    flex-direction: column;
  }

  .settings-main,
  .settings-aside {
    width: 100%;
  }

  .settings-aside {
    order: -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .settings-card {
    padding: 16px;
  }

  .choice-grid {
    grid-template-columns: 1fr;
  }

  .settings-save {
    width: 100%;
  }

  .account-summary {
    min-height: 230px;
  }

  .data-scope {
    display: none;
  }
}
</style>
