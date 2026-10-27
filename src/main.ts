import { createSSRApp } from "vue";
import App from "./App.vue";
import { i18n } from "./i18n";
import { translate } from "./i18n";

export function createApp() {
  const app = createSSRApp(App);
  app.use(i18n);
  app.config.globalProperties.$t = translate as unknown as typeof app.config.globalProperties.$t;
  return { app };
}
