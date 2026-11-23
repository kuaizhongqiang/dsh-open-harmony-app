---
读者: App Agent / Plugin Agent / Docs/Architect
类型: design（契约真源）
权威: 高（App↔Plugin 接口域真源；需求域最高见 raw）
状态: v0.2（评审有条件通过；2 项 Critical 中 R1 已修、R2 待负责人）
依赖: docs/design/02-architecture.md
---

# 03 App ↔ Plugin 契约（字段级）

> 本文件是 App 与 Plugin 的**唯一接口真源**。规则：先改本文、再改实现；跨端字段改动同批改完两侧，只改一侧视为未完成；遇歧义登记 `docs/open-questions.md`，不自行决定。
> 契约版本号 `v0.2`；所有 JSON 字段用 camelCase；时间戳 ISO8601 UTC。
> 评审见 `docs/review/02-contracts-review.md`（R1 已修 / R2 待负责人，见 open-questions Q7）。

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

> **统一鉴权规则（R1 已修）**：所有**写请求**（POST/PUT/PATCH/DELETE）必须带 `Authorization: Bearer` + `X-Device-Id`，与 02 §3.2 一致。管理端点（devices/whitelist）另要求 TCP 对端为回环。读端点（GET）仅需回环或已配对 token，见各端点标注。

### 3.3 令牌续期（同 Origin 自动续期）
`POST /mobile/token/refresh`（鉴权：`Authorization` + `X-Device-Id`）
→ `200 { "token":"...", "issuedAt":"...", "expiresAt":"..." }`｜`401` 过期/撤销

### 3.4 设备管理（仅回环）
`GET /mobile/devices`（回环读）→ `200 { "devices":[Device] }`
`DELETE /mobile/devices/:deviceId`（回环 + `Authorization` + `X-Device-Id`）→ `204`｜`403` 非回环对端

### 3.5 白名单（仅回环，OpenClaw 式）
`GET /mobile/whitelist`（回环读）→ `200 { "trustedProxies":["10.0.0.1"], "allowUsers":["u1@x"], "userHeader":"x-forwarded-user" }`
`PUT /mobile/whitelist`（同结构；回环 + `Authorization` + `X-Device-Id`）→ `200`

### 3.6 代理到 DSH（需鉴权，回环代理）
`* /mobile/api/**`：带 `Authorization` + `X-Device-Id` 转发到 Host(3080)。
- 透传范围：Host 的 2xx/4xx/5xx 响应体与 `X-Contract-Version` 头原样透传；网关自生错误只用 §5 的 `502`（Host 不可达）/ `504`（超时）。
- 超限：`413`（见 §1 消息上限）。

### 3.7 版本查询（无鉴权，只读非敏感信息）
`GET /mobile/version`
→ `200 { "plugin":VersionInfo, "app":VersionInfo }`
> `plugin`/`app` 段的 `url`/`sha256` 分别指向 npm tarball / hap；`dshVersion` 来源为 Host 实际运行版本（见 §3.1）。App 版本**拉取通道**待定（Q7）：直查 GitHub 或经本端点。

## 4 WebSocket 事件流

`WS /mobile/ws`（**首帧鉴权**：握手后客户端首帧发 token + deviceId，避免 token 入 URL）。
客户端→服务端：`{ "type":"auth", "token":"...", "deviceId":"..." }` 后 `{ "type":"subscribe", "sessionId":? }`（`sessionId` 缺省 = 订阅全部会话）。auth 失败返回错误帧 `{type:"error", code:401}` 并关闭（关闭码 4401）。

服务端→客户端事件（**以下 type 为本契约合成名，不直接等同 DSH 事件名**。已按 `dsh-v0.2.3-alpha.2` 核对，DSH 事件是 `namespace/verb` 形式；全部由 Plugin **映射**后下发）：

| type（本契约） | 载荷 | DSH 真实来源 | 映射规则 |
|---|---|---|---|
| `session.updated` | `{ sessionId, title, updatedAt }` | `session/title` + `api-session/added`/`activity` | 合并多源，非单一 DSH 事件 |
| `message.delta` | `{ sessionId, messageId, delta }` | `assistant-stream` 的 `chunk` frame（`attemptId/index/chunk`） | `chunk`→`delta`、`attemptId`→`messageId`、补 `sessionId` |
| `tool.call` | `{ sessionId, toolName, args }` | `tool/call`（斜杠）`{turn,step,callId,name,arguments}` | 改名、`name`→`toolName`、补 `sessionId` |
| `agent.status` | `{ sessionId, status }` | `api-session/status` / `SessionState` | 来源为 API/Cordis 而非事件日志 |
| `ping` / `pong` | `{}` | 无 DSH 对应 | WS 心跳，本契约专有 |

> 真源：`vendor/deepseek-harness/packages/core/session/src/types.ts`（`SessionEventMap`）、`.../known-event-types.ts`（65 项）、`docs/subsystems/session.md`。详见 `docs/review/02-contracts-review.md` §事件词汇核对。
> 断线重连：App 指数退避 + 增量补偿（对齐 `session.updated` 后的状态）。

## 5 错误码

| 码 | 含义 | 机器子码（响应体 `error.code`） |
|---|---|---|
| `401` | 未配对 / token 过期或撤销 | `UNAUTHORIZED` |
| `403` | 白名单拒绝 / 非回环对端 / 设备未授权 | `WHITELIST_DENIED` / `NOT_LOOPBACK` / `DEVICE_UNAUTHORIZED` |
| `404` | 未知端点 | `NOT_FOUND` |
| `409` | 配对密钥已用或过期 | `PAIRING_CONSUMED` |
| `413` | 请求/剪贴板/二进制超限 | `PAYLOAD_TOO_LARGE` |
| `429` | 限流 | `RATE_LIMITED` |
| `502` | Host 不可达（网关自生） | `UPSTREAM_UNREACHABLE` |
| `504` | Host 超时（网关自生） | `UPSTREAM_TIMEOUT` |

> `VersionInfo.required=true` 的行为：App 显示强制升级提示并阻断连接，直至升级完成（错误状态 `UPGRADE_REQUIRED`）。

## 6 版本升级通道（Q6）

- Plugin：比对 npm/GitHub tag（`dsh-harmony`）；下载 → 校验 SHA-256 → 提示/自动升级。
- App：下载 hap → 校验签名 + SHA-256 → 拉起系统安装（In-house 证书签名）。
- **⚠ Q7 待负责人定**：App 版本 tag 的拉取通道——① App 直查 GitHub Release（02 §7 口径）｜② 经网关 `GET /mobile/version` 的 `app` 段（03 §3.7 口径）。两者二选一后同步 02/03，未定前 App 侧不实现升级检查。

## 7 未决（转 open-questions）

- [x] DSH session 事件词汇核对完成（`dsh-v0.2.3-alpha.2`）：4 个业务事件均需映射，详见 §4 与 `docs/review/02-contracts-review.md`。
- [ ] 配对是否需 CA 指纹绑定（dsh-mobile 有，我们 App 纯原生是否沿用）。→ Q8
- [ ] App 版本 tag 拉取通道（Q7）。
- [ ] 配对二维码/链接 payload 格式（`PairingKey.origin` 如何用）。→ Q8
- [ ] 二进制上传端点是否新增（§1 提到但 §3 无端点）。→ Q9

## 8 验收矩阵（怎么验）

| 切片（02 §8） | 端点/事件 | 请求或动作 | 预期 | 门禁 |
|---|---|---|---|---|
| 3 health | `GET /mobile/health` | 无鉴权 GET | `200 status:ok` + 版本 | `check-contracts` C1 |
| 4 WS | `WS /mobile/ws` | 首帧 auth+deviceId，subscribe | 收到一条 `session.updated` 映射事件 | `check-contracts` C3 |
| 5 配对 | `POST /mobile/pair` | 一次性 pairingKey | `201` 返回 token；二次重连免配对 | `check-contracts` C2 |
| 升级 | `GET /mobile/version` | 无鉴权 GET | `200 plugin/app VersionInfo` | `check-plugin-version` |
