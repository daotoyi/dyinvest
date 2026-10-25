import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const outputDir = join(rootDir, "dist", "build", "mp-weixin");
const cloudSource = join(rootDir, "cloudfunctions");
const cloudTarget = join(outputDir, "cloudfunctions");
const projectConfigPath = join(outputDir, "project.config.json");
const appConfigPath = join(outputDir, "app.json");

if (!existsSync(outputDir)) {
  throw new Error("微信小程序构建产物不存在，请先运行 npm run build:mp-weixin");
}

if (existsSync(cloudSource)) {
  rmSync(cloudTarget, { recursive: true, force: true });
  cpSync(cloudSource, cloudTarget, {
    recursive: true,
    filter: (source) => !source.includes("node_modules"),
  });
}

const projectConfig = JSON.parse(readFileSync(projectConfigPath, "utf8"));
projectConfig.cloudfunctionRoot = "cloudfunctions/";
writeFileSync(projectConfigPath, `${JSON.stringify(projectConfig, null, 2)}\n`);

const appConfig = JSON.parse(readFileSync(appConfigPath, "utf8"));
if (appConfig.lazyCodeLoading !== "requiredComponents") {
  throw new Error("小程序未启用组件按需注入");
}
