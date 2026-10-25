import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const cli =
  process.env.WECHAT_DEVTOOLS_CLI ||
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const cloudEnv = (process.env.WECHAT_CLOUD_ENV || "").trim();
const projectDir = join(rootDir, "dist", "build", "mp-weixin");
const functionPath = join(rootDir, "cloudfunctions", "phoneLogin");

if (!cloudEnv) {
  console.error(
    "缺少 WECHAT_CLOUD_ENV。请先在微信开发者工具中创建云开发环境。",
  );
  process.exit(1);
}

const result = spawnSync(
  cli,
  [
    "cloud",
    "functions",
    "deploy",
    "--env",
    cloudEnv,
    "--paths",
    functionPath,
    "--remote-npm-install",
    "--project",
    projectDir,
    "--lang",
    "zh",
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
