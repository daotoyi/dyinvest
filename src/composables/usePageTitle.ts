import { watch } from "vue";
import { translate } from "../i18n";
import { useLocale } from "./useLocale";

export function usePageTitle(key: string) {
  const { locale } = useLocale();
  watch(
    locale,
    () => {
      const title = translate(key);
      try {
        uni.setNavigationBarTitle({ title });
      } catch {
        // Native title is unavailable in some H5 contexts.
      }
      if (typeof document !== "undefined") document.title = title;
    },
    { immediate: true },
  );
}
