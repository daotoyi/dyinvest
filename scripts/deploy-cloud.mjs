import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const cli =
  process.env.WECHAT_DEVTOOLS_CLI ||
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const projectDir = join(rootDir, "dist", "build", "mp-weixin");
const fileEnv = loadEnv("production", rootDir, "");
const cloudEnv = (
  process.env.WECHAT_CLOUD_ENV ||
  fileEnv.VITE_WECHAT_CLOUD_ENV ||
  ""
).trim();
const functionPath = join(projectDir, "cloudfunctions", "phoneLogin");

if (!cloudEnv) {
  console.error(
    "缺少微信云开发环境 ID。请在 .env.local 中配置 VITE_WECHAT_CLOUD_ENV。",
  );
  process.exit(1);
}
if (!existsSync(join(functionPath, "index.js"))) {
  console.error(
    `未找到构建后的 phoneLogin 云函数：${functionPath}。请先运行 npm run build:mp-weixin。`,
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
