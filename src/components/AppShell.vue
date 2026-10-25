<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "./AppIcon.vue";

interface Props {
  secondary?: boolean;
}

withDefaults(defineProps<Props>(), {
  secondary: false,
});

const navItems = [
  { label: "首页", icon: "home", path: "/pages/home/index" },
  { label: "学习", icon: "book", path: "/pages/learn/index" },
  { label: "策略", icon: "chart", path: "/pages/strategy/index" },
  { label: "实战", icon: "activity", path: "/pages/practice/index" },
  { label: "我的", icon: "user", path: "/pages/profile/index" },
];

const pages = getCurrentPages();
const route = pages[pages.length - 1]?.route ?? "";
const currentPath = route.startsWith("/") ? route : `/${route}`;

const activeIndex = computed(() =>
  navItems.findIndex((item) => item.path === currentPath),
);

function go(path: string) {
  const pages = getCurrentPages();
  if (`/${pages[pages.length - 1]?.route ?? ""}` === path) return;
  uni.reLaunch({ url: path });
}
</script>

<template>
  <view class="app-shell">
    <view class="desktop-rail">
      <view class="brand block">
        <view class="brand__mark">θ</view>
        <view class="brand__copy">
          <text class="brand__name">期权工坊</text>
          <text class="brand__meta">THETA LAB</text>
        </view>
      </view>

      <view class="rail-nav">
        <button
          v-for="(item, index) in navItems"
          :key="item.path"
          class="rail-nav__item"
          :class="{ 'rail-nav__item--active': activeIndex === index }"
          @tap="go(item.path)"
        >
          <AppIcon
            :name="item.icon"
            :size="19"
            :color="activeIndex === index ? '#0e6f5c' : '#687571'"
          />
          <text>{{ item.label }}</text>
        </button>
      </view>

      <view class="rail-bottom">
        <button class="rail-live" @tap="go('/pages/live/index')">
          <view class="rail-live__top">
            <AppIcon name="shield" :size="18" color="#946617" />
            <text class="rail-live__status">待接入</text>
          </view>
          <text class="rail-live__title">实盘交易</text>
          <text class="rail-live__copy">券商授权与交易网关</text>
        </button>
        <view class="rail-foot">
          <text>演示行情</text>
          <view class="rail-foot__dot" />
          <text>v0.3.0</text>
        </view>
      </view>
    </view>

    <view class="app-main">
      <slot />
    </view>

    <view v-if="!secondary" class="mobile-nav">
      <button
        v-for="(item, index) in navItems"
        :key="item.path"
        class="mobile-nav__item"
        :class="{ 'mobile-nav__item--active': activeIndex === index }"
        @tap="go(item.path)"
      >
        <AppIcon
          :name="item.icon"
          :size="21"
          :color="activeIndex === index ? '#0e6f5c' : '#7a8682'"
          :stroke-width="activeIndex === index ? 2.1 : 1.8"
        />
        <text>{{ item.label }}</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
  background: var(--canvas);
}

.desktop-rail {
  position: fixed;
  z-index: 20;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  width: 224px;
  flex-direction: column;
  padding: 26px 18px 20px;
  border-right: 1px solid var(--line);
  background: #fbfcfb;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 8px;
}

.brand__mark {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--ink);
  color: #ffffff;
  font-family: Georgia, serif;
  font-size: 27px;
  font-weight: 700;
  line-height: 1;
}

.brand__copy {
  display: flex;
  flex-direction: column;
}

.brand__name {
  color: var(--ink);
  font-size: 16px;
  font-weight: 750;
}

.brand__meta {
  margin-top: 1px;
  color: var(--muted-light);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
}

.rail-nav {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 44px;
}

.rail-nav__item {
  display: flex;
  width: 100%;
  height: 44px;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  border-radius: 7px;
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 650;
  text-align: left;
}

.rail-nav__item--active {
  background: var(--teal-wash);
  color: var(--teal);
}

.rail-bottom {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: auto;
}

.rail-live {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 13px;
  border: 1px solid #ead8b5;
  border-radius: 8px;
  background: #fdf9f0;
  text-align: left;
}

.rail-live__top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.rail-live__status {
  color: #946617;
  font-size: 10px;
  font-weight: 700;
}

.rail-live__title {
  margin-top: 12px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 750;
}

.rail-live__copy {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.rail-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  color: var(--muted-light);
  font-size: 9px;
}

.rail-foot__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--muted-light);
}

.app-main {
  min-height: 100vh;
  margin-left: 224px;
}

.mobile-nav {
  display: none;
}

@media (max-width: 900px) {
  .desktop-rail {
    display: none;
  }

  .app-main {
    margin-left: 0;
  }

  .mobile-nav {
    position: fixed;
    z-index: 50;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    height: calc(64px + env(safe-area-inset-bottom));
    align-items: flex-start;
    justify-content: space-around;
    padding: 7px 8px env(safe-area-inset-bottom);
    border-top: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(14px);
  }

  .mobile-nav__item {
    display: flex;
    min-width: 52px;
    height: 48px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: #7a8682;
    font-size: 10px;
    font-weight: 600;
  }

  .mobile-nav__item--active {
    color: var(--teal);
  }
}
</style>
