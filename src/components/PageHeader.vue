<script setup lang="ts">
import AppIcon from "./AppIcon.vue";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  eyebrow?: string;
}

withDefaults(defineProps<Props>(), {
  subtitle: "",
  back: false,
  eyebrow: "",
});

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }
  uni.reLaunch({ url: "/pages/home/index" });
}
</script>

<template>
  <view class="page-header" :class="{ 'page-header--back': back }">
    <button v-if="back" class="page-header__back" @tap="goBack">
      <AppIcon name="arrowLeft" :size="21" color="#17211e" />
    </button>
    <view class="page-header__copy">
      <text v-if="eyebrow" class="eyebrow">{{ eyebrow }}</text>
      <text class="page-header__title">{{ title }}</text>
      <text v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</text>
    </view>
    <view class="page-header__action">
      <slot name="action" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header__back {
  display: flex;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  margin-right: 2px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
}

.page-header__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.page-header__title {
  margin-top: 4px;
  color: var(--ink);
  font-size: 26px;
  font-weight: 750;
  line-height: 1.18;
}

.page-header__subtitle {
  max-width: 630px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.page-header__action {
  flex: 0 0 auto;
}

.page-header--back {
  align-items: center;
}

@media (max-width: 900px) {
  .page-header {
    margin-bottom: 18px;
  }

  .page-header__title {
    font-size: 23px;
  }

  .page-header__subtitle {
    font-size: 12px;
  }
}
</style>
