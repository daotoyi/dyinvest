# 云环境与网站同步发布

## 固定目标

| 项目 | 值 |
| --- | --- |
| 小程序 AppID | `wx6aef5e7ef168ecdd` |
| 小程序名称 | 道元数链 |
| 共享云环境 | `zhenhesheng-d6gkez7p221305432` |
| 云函数 | `phoneLogin` |
| H5 网站 | `https://dyinvest.cn` |
| H5 部署目录 | `/www/wwwroot/dyinvest.cn` |

## 环境授权核验

- 共享环境已出现在道元数链项目的云环境缓存中。
- 使用 `wx6aef5e7ef168ecdd` 从最小小程序页面调用
  `phoneLogin` 已成功，返回 `MISSING_PHONE_CODE`，说明云函数鉴权链路可用。
- 云环境静态托管域名属于其他 Web 项目，不作为道元数链的小程序 URL，
  也不作为 `dyinvest.cn` 的部署目标。

## 一键发布

每次功能更新完成后执行：

```bash
npm run deploy:all
```

脚本会依次执行：

1. TypeScript 类型检查和单元测试。
2. 构建小程序并标记为云开发项目。
3. 将 `phoneLogin` 部署到固定云环境。
4. 构建并上传同版本微信小程序开发版。
5. 构建 H5，备份服务器站点后同步到 `dyinvest.cn`。
6. 执行 Nginx 检查、重载、网站健康检查和云函数状态检查。

## 可配置项

默认服务器使用 SSH 密钥登录。需要覆盖时设置：

```bash
WEB_DEPLOY_TARGET=root@49.232.35.145 \
WEB_DEPLOY_DIR=/www/wwwroot/dyinvest.cn \
WEB_DEPLOY_URL=https://dyinvest.cn \
npm run deploy:all
```

服务器密码不写入仓库。
