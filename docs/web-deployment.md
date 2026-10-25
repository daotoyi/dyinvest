# H5 网站部署说明

## 当前部署

| 项目 | 值 |
| --- | --- |
| 正式域名 | `https://dyinvest.cn` |
| Web 服务器 | Nginx 1.26.3 |
| 部署目录 | `/www/wwwroot/dyinvest.cn` |
| 站点配置 | `/www/server/panel/vhost/nginx/dyinvest.cn.conf` |
| 构建产物 | `dist/build/h5` |
| 路由模式 | Hash 路由 |
| 当前版本 | `0.3.1` |
| 最近部署 | `2026-10-25 11:29` |

服务器凭据不写入仓库。部署时通过 SSH 密钥或临时授权登录。

## 发布流程

```bash
npm ci
npm run typecheck
npm run test:unit
npm run build:h5
rsync -az --chmod=D755,F644 \
  dist/build/h5/ \
  DEPLOY_USER@DEPLOY_HOST:/www/wwwroot/dyinvest.cn/
```

发布后执行：

```bash
ssh DEPLOY_USER@DEPLOY_HOST
chown -R www:www /www/wwwroot/dyinvest.cn/assets /www/wwwroot/dyinvest.cn/static
find /www/wwwroot/dyinvest.cn/assets /www/wwwroot/dyinvest.cn/static \
  -type d -exec chmod 755 {} +
find /www/wwwroot/dyinvest.cn/assets /www/wwwroot/dyinvest.cn/static \
  -type f -exec chmod 644 {} +
nginx -t
nginx -s reload
```

## 当前 Nginx 模式

- HTTPS 静态文件站点。
- HTTP 自动跳转 HTTPS。
- Hash 路由不需要 history fallback。
- `404.html` 复制自 `index.html`。
- 原 Next.js 5000 端口反代已停用并保留 `.disabled` 备份。
- 原 `dyinvest` PM2 进程已停止，不再循环重启。

## 回滚

本次部署前的服务器备份位于：

```text
/www/backup/dyinvest.cn-YYYYMMDD-HHMMSS
```

回滚时：

1. 停用当前静态站点文件或移入临时目录。
2. 解压备份中的 `site.tar.gz`。
3. 恢复备份的 `nginx.conf` 和代理配置。
4. 执行 `nginx -t`，通过后重载 Nginx。
5. 重新启动旧 PM2 进程（如需恢复旧版本）。

## 上线检查

- `https://dyinvest.cn/` 返回 200。
- 首页和策略页 Canvas 图表正常绘制。
- CSS、JavaScript、字体资源无 404。
- 移动端无横向溢出。
- 浏览器控制台无 JavaScript 错误。
- HTTP 正确跳转 HTTPS。

## 域名说明

当前证书覆盖 `dyinvest.cn`。如需正式支持 `www.dyinvest.cn`，应重新签发包含两个域名的证书，并将 `www` 规范跳转到主域名。
