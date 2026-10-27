import { computed } from "vue";
import type { AppLanguage } from "../domain/user";
import { getAppLocale, i18n, setAppLocale } from "../i18n";

export function useLocale() {
  const locale = computed<AppLanguage>(() =>
    i18n.global.locale.value === "zh-CN" ? "zh-CN" : "en",
  );

  function setLocale(nextLocale: AppLanguage) {
    setAppLocale(nextLocale);
  }

  function toggleLocale() {
    setLocale(locale.value === "en" ? "zh-CN" : "en");
  }

  return {
    locale,
    setLocale,
    toggleLocale,
    t: (key: string, values?: Record<string, unknown>) =>
      values ? i18n.global.t(key, values) : i18n.global.t(key),
    currentLocale: getAppLocale,
  };
}
