#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_PATH="${WECHAT_DEVTOOLS_CLI:-/Applications/wechatwebdevtools.app/Contents/MacOS/cli}"
MINI_PROGRAM_DIR="$ROOT_DIR/dist/build/mp-weixin"
VERSION="${MP_VERSION:-$(node -p "require('./package.json').version")}"
DESCRIPTION="${MP_DESC:-期权工坊初版：学习、策略与模拟交易}"

if [[ ! -x "$CLI_PATH" ]]; then
  echo "未找到微信开发者工具 CLI：$CLI_PATH" >&2
  exit 1
fi

cd "$ROOT_DIR"
npm run build:mp-weixin

APP_ID="$(node -e "const p=require('./dist/build/mp-weixin/project.config.json'); process.stdout.write(p.appid || '')")"
if [[ "$APP_ID" != "wx6aef5e7ef168ecdd" ]]; then
  echo "小程序 AppID 校验失败，当前为：$APP_ID" >&2
  exit 1
fi

"$CLI_PATH" islogin --lang zh
"$CLI_PATH" upload \
  --project "$MINI_PROGRAM_DIR" \
  --version "$VERSION" \
  --desc "$DESCRIPTION" \
  --lang zh
