# 微信手机号快捷登录

## 实现方式

1. 小程序使用 `button open-type="getPhoneNumber"` 获取微信手机号授权。
2. 微信返回一次性 `code`。
3. 客户端调用云函数 `phoneLogin`。
4. 云函数通过 `cloud.openapi.phonenumber.getPhoneNumber` 换取已验证手机号。
5. 客户端使用已验证手机号创建或恢复本机账户。

前端不会伪造手机号，也不会要求用户手动输入微信验证码。

## 前置条件

- 小程序主体已具备微信手机号快速验证能力。
- 已在微信公众平台完成用户隐私保护指引和手机号用途声明。
- 已开通微信云开发并创建环境。
- 云开发环境已部署 `phoneLogin` 云函数。
- 微信手机号快速验证可能存在调用额度或计费规则，以微信平台最新规则为准。

## 配置环境

复制 `.env.example` 为 `.env.local`，填写云开发环境 ID：

```bash
VITE_WECHAT_CLOUD_ENV=your-cloud-env-id
```

构建小程序时，该环境 ID 会注入客户端。

## 部署云函数

```bash
WECHAT_CLOUD_ENV=your-cloud-env-id npm run deploy:cloud
```

云函数目录：

```text
cloudfunctions/phoneLogin
```

该函数需要以下 OpenAPI 权限：

```text
phonenumber.getPhoneNumber
```

## 验证流程

1. 使用小程序体验版或预览码进入登录页。
2. 点击“手机号快捷登录”。
3. 在微信授权弹层中确认手机号。
4. 云函数返回手机号后，客户端创建或恢复账户。
5. 在个人中心确认显示脱敏手机号，例如 `138****8000`。

## 当前限制

- H5 无法使用微信手机号授权，H5 端点击按钮会显示平台限制说明。
- 当前项目尚未配置云环境 ID，也未部署云函数，因此正式获取手机号前必须完成上述配置。
- 手机号账户和偏好当前保存在本机，尚不支持跨设备同步。
- 如需跨设备登录，需要增加服务端用户表、会话令牌和手机号绑定关系。
