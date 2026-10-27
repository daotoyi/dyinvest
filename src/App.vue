<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { useAuth } from "./composables/useAuth";
import { useContentSettings } from "./composables/useContentSettings";
import "./composables/useLearningProgress";
import "./composables/usePaperAccount";

onLaunch(() => {
  // Root pages use a shared cross-platform navigation shell.
  void useAuth()
    .restore()
    .catch(() => undefined);
  void useContentSettings()
    .loadContent()
    .catch(() => undefined);
});
</script>

<style lang="scss">
@use "./styles/global.scss";
</style>
