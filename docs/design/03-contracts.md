---
读者: App Agent / Plugin Agent / Docs/Architect
类型: design（契约真源）
权威: 高（App↔Plugin 接口域真源；需求域最高见 raw）
状态: 草案（v0.1，待双方评审 + 负责人确认）
依赖: docs/design/02-architecture.md
---

# 03 App ↔ Plugin 契约（字段级）

> 本文件是 App 与 Plugin 的**唯一接口真源**。规则：先改本文、再改实现；跨端字段改动同批改完两侧，只改一侧视为未完成；遇歧义登记 `docs/open-questions.md`，不自行决定。
> 契约版本号 `v0.1`；所有 JSON 字段用 camelCase；时间戳 ISO8601 UTC。

## 1 传输与常量

| 项 | 值 |
|---|---|
| 传输 | 仅 HTTPS（App 侧禁明文） |
| 默认端口 | 网关 3443（可配）；Host 上游 3080 |
| 认证头 | `Authorization: Bearer <token>`、`X-Device-Id: <deviceId>` |
| 消息上限 | 请求 ≤ 1 MiB，剪贴板 ≤ 256 KiB，二进制 ≤ 8 MiB，回复 ≤ 12 MiB |
| Content-Type | `application/json`（除二进制上传） |
| 版本 | 响应头 `X-Contract-Version: v0.1` |

## 2 数据模型

### Device
```json
{ "deviceId": "uuid", "name": "我的手机", "platform": "harmony",
  "origin": "https://192.168.1.5:3443", "reachable": true, "lastSeenAt": "..." }
```

### Token
```json
{ "token": "opaque", "deviceId": "uuid", "issuedAt": "...", "expiresAt": "..." }
```

### PairingKey（一次性、短时效，PC 端生成）
```json
{ "pairingKey": "opaque", "expiresAt": "...", "origin": "https://..." }
```

### VersionInfo
```json
{ "current": "0.1.0", "latest": "0.1.1", "url": "https://.../x.hap", "sha256": "hex", "required": false }
```

## 3 HTTP 端点

### 3.1 健康检查（无鉴权）
`GET /mobile/health`
→ `200 { "status":"ok", "pluginVersion":"0.1.0", "dshVersion":"0.2.3-alpha.2", "time":"..." }`

### 3.2 配对（无鉴权，一次性密钥）
`POST /mobile/pair`
请求：`{ "pairingKey":"...", "deviceName":"...", "platform":"harmony" }`
成功：`201 { "deviceId":"...", "token":"...", "expiresAt":"...", "caFingerprint":"sha256" }`
> `caFingerprint` 为保留字段（是否作为绑定凭据，见 §7 未决）。
失败：`409` 密钥已用/过期｜`403` 来源不在白名单｜`429` 限流

### 3.3 令牌续期（同 Origin 自动续期）
`POST /mobile/token/refresh`（带 `Authorization`）
→ `200 { "token":"...", "expiresAt":"..." }`｜`401` 过期/撤销

### 3.4 设备管理（仅回环）
`GET /mobile/devices` → `200 { "devices":[Device] }`
`DELETE /mobile/devices/:deviceId` → `204`｜`403` 非回环对端

### 3.5 白名单（仅回环，OpenClaw 式）
`GET /mobile/whitelist` → `200 { "trustedProxies":["10.0.0.1"], "allowUsers":["u1@x"], "userHeader":"x-forwarded-user" }`
`PUT /mobile/whitelist`（同结构）→ `200`

### 3.6 代理到 DSH（需鉴权，回环代理）
`* /mobile/api/**`：带 `Authorization` + `X-Device-Id` 转发到 Host(3080)，响应透传。

### 3.7 版本查询（无鉴权或轻鉴权）
`GET /mobile/version`
→ `200 { "plugin":VersionInfo, "app":VersionInfo }`

## 4 WebSocket 事件流

`WS /mobile/ws`（**首帧鉴权**：握手后客户端首帧发 token，避免 token 入 URL）。客户端→服务端：`{ "type":"auth", "token":"..." }` 后 `{ "type":"subscribe", "sessionId":? }`。
服务端→客户端事件（透传 DSH session 词汇，后续对齐 `packages/session`）：

| type | 载荷 |
|---|---|
| `session.updated` | `{ sessionId, title, updatedAt }` |
| `message.delta` | `{ sessionId, messageId, delta }`（流式） |
| `tool.call` | `{ sessionId, toolName, args }` |
| `agent.status` | `{ sessionId, status }` |
| `ping` / `pong` | `{}` |

> 断线重连：App 需做指数退避 + 增量补偿（对齐 `session.updated` 后的状态）。

## 5 错误码

| 码 | 含义 |
|---|---|
| `401` | 未配对 / token 过期或撤销 |
| `403` | 白名单拒绝 / 非回环对端 / 设备未授权 |
| `404` | 未知端点 |
| `409` | 配对密钥已用或过期 |
| `429` | 限流 |

## 6 版本升级通道（Q6）

- Plugin：比对 npm/GitHub tag（`dsh-harmony`）；下载 → 校验 SHA-256 → 提示/自动升级。
- App：查 `GET /mobile/version` 的 `app` 段 → 下载 hap → 校验签名 + SHA-256 → 拉起系统安装（In-house 证书签名）。

## 7 未决（转 open-questions）

- [ ] DSH session 事件词汇是否与 `packages/session` 完全对齐（需 Plugin 侧核对 submodule）。
- [ ] 配对是否需 CA 指纹绑定（dsh-mobile 有，我们 App 纯原生是否沿用）。
