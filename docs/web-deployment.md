# H5 网站部署说明

## 当前部署

| 项目 | 值 |
| --- | --- |
| 访问域名 | `http://options.dyinvest.cn`（HTTPS 待证书） |
| Web 服务器 | Nginx 1.26.3 |
| 部署目录 | `/www/wwwroot/options.dyinvest.cn` |
| 站点配置 | `/www/server/panel/vhost/nginx/options.dyinvest.cn.conf` |
| 构建产物 | `dist/build/h5` |
| 路由模式 | Hash 路由 |
| 当前版本 | `0.4.0` |
| 最近部署 | `2026-11-02` |

服务器凭据不写入仓库。部署时通过 SSH 密钥或临时授权登录。

## 发布流程

```bash
npm ci
npm run typecheck
npm run test:unit
npm run build:h5
rsync -az --chmod=D755,F644 \
  dist/build/h5/ \
  DEPLOY_USER@DEPLOY_HOST:/www/wwwroot/options.dyinvest.cn/
```

发布后执行：

```bash
ssh DEPLOY_USER@DEPLOY_HOST
chown -R www:www /www/wwwroot/options.dyinvest.cn
find /www/wwwroot/options.dyinvest.cn \
  -type d -exec chmod 755 {} +
find /www/wwwroot/options.dyinvest.cn \
  -type f -exec chmod 644 {} +
nginx -t
nginx -s reload
```

## 当前 Nginx 模式

- 当前为 HTTP 静态文件站点。
- `options.dyinvest.cn` 尚未签发独立 SSL 证书，暂不启用 HTTPS。
- Hash 路由不需要 history fallback。
- `404.html` 复制自 `index.html`。
- 目录内旧 Next.js 副本已备份并移除。

## 回滚

本次部署前的服务器备份位于：

```text
/www/backup/options.dyinvest.cn-YYYYMMDD-HHMMSS
```

回滚时：

1. 停用当前静态站点文件或移入临时目录。
2. 解压备份中的 `site.tar.gz`。
3. 恢复备份的 `nginx.conf` 和代理配置。
4. 执行 `nginx -t`，通过后重载 Nginx。
5. 重新启动旧 PM2 进程（如需恢复旧版本）。

## 上线检查

- `http://options.dyinvest.cn/` 返回 200。
- 首页和策略页 Canvas 图表正常绘制。
- CSS、JavaScript、字体资源无 404。
- 移动端无横向溢出。
- 浏览器控制台无 JavaScript 错误。
- HTTPS 需先为 `options.dyinvest.cn` 签发证书。

## 域名说明

当前 `dyinvest.cn` 证书仅覆盖主域名，不能用于 `options.dyinvest.cn`。
如需 HTTPS，应为该子域名单独签发证书。
