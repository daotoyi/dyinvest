#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLOUD_ENV="zhenhesheng-d6gkez7p221305432"
WEB_TARGET="${WEB_DEPLOY_TARGET:-root@49.232.35.145}"
WEB_DIR="${WEB_DEPLOY_DIR:-/www/wwwroot/dyinvest.cn}"
WEB_URL="${WEB_DEPLOY_URL:-https://dyinvest.cn}"
VERSION="$(node -p "require('${ROOT_DIR}/package.json').version")"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$ROOT_DIR"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

CONFIGURED_ENV="${VITE_WECHAT_CLOUD_ENV:-}"
if [[ "$CONFIGURED_ENV" != "$CLOUD_ENV" ]]; then
  echo "云环境配置不一致：期望 $CLOUD_ENV，实际 ${CONFIGURED_ENV:-未配置}" >&2
  exit 1
fi

echo "开始同步发布 v$VERSION"
echo "云环境：$CLOUD_ENV"
echo "网站：$WEB_URL"

npm run typecheck
npm run test:unit
WECHAT_CLOUD_ENV="$CLOUD_ENV" npm run deploy:cloud
MP_VERSION="$VERSION" \
  MP_DESC="道元期权${VERSION}：云环境与网站同步发布" \
  npm run deploy:mp
npm run build:h5
cp dist/build/h5/index.html dist/build/h5/404.html

ssh "$WEB_TARGET" \
  "mkdir -p /www/backup/dyinvest.cn-$STAMP && tar -C '$WEB_DIR' -czf /www/backup/dyinvest.cn-$STAMP/site.tar.gz ."
rsync -az dist/build/h5/ "$WEB_TARGET:$WEB_DIR/"
ssh "$WEB_TARGET" \
  "chown -R www:www '$WEB_DIR/assets' '$WEB_DIR/static' && find '$WEB_DIR/assets' '$WEB_DIR/static' -type d -exec chmod 755 {} + && find '$WEB_DIR/assets' '$WEB_DIR/static' -type f -exec chmod 644 {} + && chmod 644 '$WEB_DIR/index.html' '$WEB_DIR/404.html' && nginx -t && nginx -s reload"

curl -fsS --max-time 15 "$WEB_URL" >/dev/null
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions info \
  --env "$CLOUD_ENV" \
  --names phoneLogin \
  --project "$ROOT_DIR/dist/build/mp-weixin" \
  --lang zh

printf '\n同步发布完成\n'
printf '云环境：%s\n' "$CLOUD_ENV"
printf '网站：%s\n' "$WEB_URL"
printf '网站备份：/www/backup/dyinvest.cn-%s\n' "$STAMP"
printf '版本号：v%s\n' "$VERSION"
