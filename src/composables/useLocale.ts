import { computed } from "vue";
import type { AppLanguage } from "../domain/user";
import { getAppLocale, i18n, setAppLocale } from "../i18n";
import { useAuth } from "./useAuth";

export function useLocale() {
  const locale = computed<AppLanguage>(() =>
    i18n.global.locale.value === "zh-CN" ? "zh-CN" : "en",
  );

  function setLocale(nextLocale: AppLanguage) {
    setAppLocale(nextLocale);
    const auth = useAuth();
    const stored = auth.preferences.value;
    if (!auth.isLoggedIn.value || !stored) return;
    void auth
      .updatePreferences({
        nickname: stored.nickname,
        experience: stored.experience,
        riskLevel: stored.riskLevel,
        defaultStrategyId: stored.defaultStrategyId,
        defaultOrderQuantity: stored.defaultOrderQuantity,
        language: nextLocale,
      })
      .catch(() => undefined);
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
