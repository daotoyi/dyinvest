<script setup lang="ts">
import { computed, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import { APP_VERSION } from "../config/runtime";
import { useLocale } from "../composables/useLocale";
import { translate } from "../i18n";

interface Props {
  secondary?: boolean;
}

withDefaults(defineProps<Props>(), {
  secondary: false,
});

const { locale, setLocale } = useLocale();

const navItems = [
  { key: "nav.home", icon: "home", path: "/pages/home/index" },
  { key: "nav.learn", icon: "book", path: "/pages/learn/index" },
  { key: "nav.strategy", icon: "chart", path: "/pages/strategy/index" },
  { key: "nav.practice", icon: "activity", path: "/pages/practice/index" },
  { key: "nav.profile", icon: "user", path: "/pages/profile/index" },
];

const pages = getCurrentPages();
const route = pages[pages.length - 1]?.route ?? "";
const currentPath = route.startsWith("/") ? route : `/${route}`;

const activeIndex = computed(() =>
  navItems.findIndex((item) => item.path === currentPath),
);

const routeTitleKeys: Record<string, string> = {
  "/pages/home/index": "app.name",
  "/pages/learn/index": "learn.title",
  "/pages/strategy/index": "strategy.title",
  "/pages/practice/index": "practice.title",
  "/pages/profile/index": "profile.title",
  "/pages/lesson/index": "learn.title",
  "/pages/order/index": "order.title",
  "/pages/live/index": "live.title",
  "/pages/settings/index": "settings.title",
};

watch(
  [locale, () => currentPath],
  () => {
    const key = routeTitleKeys[currentPath] ?? "app.name";
    const title = translate(key);
    uni.setNavigationBarTitle({ title });
    if (typeof document !== "undefined") document.title = title;
  },
  { immediate: true },
);

function go(path: string) {
  const pages = getCurrentPages();
  if (`/${pages[pages.length - 1]?.route ?? ""}` === path) return;
  uni.reLaunch({ url: path });
}

function switchLocale(next: "en" | "zh-CN") {
  setLocale(next);
}
</script>

<template>
  <view class="app-shell">
    <view class="desktop-rail">
      <view class="brand block">
        <view class="brand__mark">θ</view>
        <view class="brand__copy">
          <text class="brand__name">{{ $t("app.name") }}</text>
          <text class="brand__meta">{{ $t("app.meta") }}</text>
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
          <text>{{ $t(item.key) }}</text>
        </button>
      </view>

      <view class="rail-bottom">
        <view class="rail-lang">
          <button
            class="rail-lang__item"
            :class="{ 'rail-lang__item--active': locale === 'en' }"
            @tap="switchLocale('en')"
          >
            EN
          </button>
          <button
            class="rail-lang__item"
            :class="{ 'rail-lang__item--active': locale === 'zh-CN' }"
            @tap="switchLocale('zh-CN')"
          >
            中文
          </button>
        </view>
        <button class="rail-live" @tap="go('/pages/live/index')">
          <view class="rail-live__top">
            <AppIcon name="shield" :size="18" color="#946617" />
            <text class="rail-live__status">{{ $t("nav.pending") }}</text>
          </view>
          <text class="rail-live__title">{{ $t("nav.live") }}</text>
          <text class="rail-live__copy">{{ $t("nav.liveCopy") }}</text>
        </button>
        <view class="rail-foot">
          <text>{{ $t("app.demoData") }}</text>
          <view class="rail-foot__dot" />
          <text>v{{ APP_VERSION }}</text>
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
        <text>{{ $t(item.key) }}</text>
      </button>
    </view>

    <view v-if="!secondary" class="mobile-lang">
      <button
        class="mobile-lang__item"
        :class="{ 'mobile-lang__item--active': locale === 'en' }"
        @tap="switchLocale('en')"
      >
        EN
      </button>
      <button
        class="mobile-lang__item"
        :class="{ 'mobile-lang__item--active': locale === 'zh-CN' }"
        @tap="switchLocale('zh-CN')"
      >
        中文
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

.rail-lang {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
}

.rail-lang__item {
  flex: 1;
  height: 28px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.rail-lang__item--active {
  background: var(--teal-wash);
  color: var(--teal);
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

.mobile-lang {
  display: none;
  position: fixed;
  z-index: 60;
  bottom: calc(76px + env(safe-area-inset-bottom));
  right: 12px;
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 8px rgba(20, 40, 35, 0.08);
  backdrop-filter: blur(10px);
}

.mobile-lang__item {
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
}

.mobile-lang__item--active {
  background: var(--teal-wash);
  color: var(--teal);
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

  .mobile-lang {
    display: flex;
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
