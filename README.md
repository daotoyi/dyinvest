# 道元期权

期权学习、策略研究与本地模拟交易的跨端初版，基于 uni-app、Vue 3 和 TypeScript。

完整产品与技术方案见 [docs/options-investing-platform-design.md](docs/options-investing-platform-design.md)。

## 已实现

- 5 个主入口：首页、学习、策略、实战、我的。
- 8 节结构化课程，支持交互损益图、课程测验和本地学习进度。
- 16 个策略模板：覆盖方向、价差、波动率、区间、比例和尾部风险。
- 多腿策略编辑：调整行权价和数量。
- BSM 定价、Greeks、净权利金、盈亏平衡和情景矩阵实时计算。
- 本地模拟账户：持仓、订单、资金、保证金估算和权益曲线。
- 单腿模拟下单和组合策略模拟成交。
- 本地用户注册、登录、退出和用户级偏好配置。
- 微信小程序手机号快捷登录按钮和云函数验证链路。
- 偏好配置支持昵称、经验水平、风险偏好、默认策略和默认下单数量。
- 本地运营管理后台，支持用户角色、账户状态、课程上下架、策略启停和首页公告。
- 实盘接入状态、检查清单与正式接入口径说明。
- H5、微信小程序和 App 构建入口。

## 技术栈

- 前端：uni-app、Vue 3、TypeScript、SCSS
- 图表：Canvas 2D
- 计算：纯 TypeScript BSM 与策略损益引擎
- 本地持久化：`uni.getStorageSync` / `uni.setStorageSync`
- 端到端测试：Playwright
- 单元测试：Vitest

## 本地运行

```bash
npm install
npm run dev:h5
```

默认开发地址由 uni-app 输出。若端口被占用，CLI 会自动选择下一个端口。

## 构建

```bash
npm run build:h5
npm run build:mp-weixin
npm run build:app
```

构建产物：

- H5：`dist/build/h5`
- 微信小程序：`dist/build/mp-weixin`
- App：`dist/build/app`

微信小程序需要在 `src/manifest.json` 的 `mp-weixin.appid` 中填写真实 AppID，再使用微信开发者工具导入 `dist/build/mp-weixin`。

当前小程序 AppID 已配置为 `wx6aef5e7ef168ecdd`。开发者工具登录后可以执行：

```bash
MP_VERSION=0.3.8 MP_DESC="道元期权0.3.8" npm run deploy:mp
```

该命令会重新构建小程序、校验 AppID 并上传开发版。上传后需要在微信公众平台设置体验版或提交审核。微信开发者工具未登录时需要先扫码登录。

部署记录和公开发布步骤见 [docs/mp-deployment.md](docs/mp-deployment.md)。
微信手机号快捷登录配置见 [docs/phone-login.md](docs/phone-login.md)。
管理后台说明见 [docs/admin-console.md](docs/admin-console.md)。
H5 网站部署与回滚说明见 [docs/web-deployment.md](docs/web-deployment.md)。
云环境与小程序的固定同步发布流程见 [docs/deployment-sync.md](docs/deployment-sync.md)。

App 构建产物需使用 HBuilderX 完成原生打包、证书签名和上架配置。正式 App 不应只使用纯 WebView 壳，推送、生物识别、安全存储等能力应通过原生插件接入。

## 测试

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
```

端到端测试默认访问 `http://127.0.0.1:5174`，可通过环境变量覆盖：

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 npm run test:e2e
```

## 版本管理

代码仓库：[daotoyi/dyinvest](https://github.com/daotoyi/dyinvest)

- 主分支：`main`
- 每次功能更新完成验证后提交并推送到远端。
- GitHub push 不触发自动 CI，验证与发布由本地 `npm run deploy:all` 完成。

## 当前边界

- 行情是固定快照演示数据，未接入实时行情。
- 模拟账户数据仅保存在当前设备。
- 模拟撮合按限价立即成交，不计滑点、盘口排队和单腿成交失败。
- 保证金使用示例费率估算，不代表交易所或券商实际要求。
- 未接入后端、云端认证、内容 CMS、实时行情和券商交易接口。
- 未接入真实券商、资金账户、交易通道或程序化交易报备。
- 当前注册登录是本机账户体系，不属于云端身份认证，不支持跨设备同步。
- 本地密码使用随机盐和 PBKDF2 哈希保存，但清除应用数据后账户无法恢复。
- 微信手机号快捷登录需要云开发环境、`phoneLogin` 云函数和微信隐私授权配置。
- 当前管理后台直接操作本机数据，正式环境需要服务端 RBAC 和审计日志。

## 下一阶段建议

1. 接入后端 API、用户登录和云端学习进度。
2. 接入合约主数据与延迟行情，再评估实时行情授权。
3. 将模拟账户升级为服务端事件账本和每日结算。
4. 接入内容管理后台和课程发布审核。
5. 与券商确认只读账户同步与小额实盘试点条件。
