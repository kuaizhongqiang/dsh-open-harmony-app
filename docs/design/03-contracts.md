---
读者: App Agent / Plugin Agent / Docs/Architect
类型: design（契约真源）
权威: 高（App↔Plugin 接口域真源；需求域最高见 raw）
状态: v0.5（M3 实现反馈修订：配对鉴权 carve-out、400、wire 版本/TTL 明确；前序 v0.4 = ADR-0008）
依赖: docs/design/02-architecture.md
---

# 03 App ↔ Plugin 契约（字段级）

> 本文件是 App 与 Plugin 的**唯一接口真源**。规则：先改本文、再改实现；跨端字段改动同批改完两侧，只改一侧视为未完成；遇歧义登记 `docs/open-questions.md`，不自行决定。
> 契约文档版本 `v0.5`；**wire 版本 `X-Contract-Version` 独立编号为 `v0.1`**（端点实现按 wire 版本返回，文档版本升级不强制改 wire 版本）。所有 JSON 字段用 camelCase；时间戳 ISO8601 UTC。
> 评审见 `docs/review/02-contracts-review.md`（R1/R2 已关闭）；Q7/Q8/Q9 见 ADR-0007，CA 生命周期见 ADR-0008。

## 1 传输与常量

| 项 | 值 |
|---|---|
| 传输 | 仅 HTTPS（App 侧禁明文） |
| 默认端口 | 网关 3443（可配）；Host 上游 3080 |
| 认证头 | `Authorization: Bearer <token>`、`X-Device-Id: <deviceId>` |
| 消息上限 | 请求 ≤ 1 MiB，剪贴板 ≤ 256 KiB，WS 二进制消息 ≤ 8 MiB，回复 ≤ 12 MiB（Q9：本期无二进制上传端点） |
| Content-Type | `application/json` |
| 版本 | 响应头 `X-Contract-Version: v0.1` |

## 2 数据模型

### Device
```json
{ "deviceId": "uuid", "name": "我的手机", "platform": "harmony",
  "origin": "https://192.168.1.5:3443", "reachable": true, "lastSeenAt": "..." }
```
> `reachable`（v0.5 明确）= **逻辑在线状态**（按设备 token 是否有效/已撤销推导），非实时网络探测；真心跳不做。

### Token
```json
{ "token": "opaque", "deviceId": "uuid", "issuedAt": "...", "expiresAt": "..." }
```
> **TTL（v0.5 明确）**：默认 24h，可配；`refresh` 签发新 token 时**旧 token 立即作废**（单设备单有效 token）。

### PairingKey（一次性、短时效，PC 端生成）
```json
{ "v": 1, "pairingKey": "opaque", "origin": "https://192.168.1.5:3443",
  "expiresAt": "...", "caFingerprint": "sha256" }
```
> **Q8 定稿**：二维码/链接内容 = 上述 JSON 的 base64url 编码（以 `dshpair://v1/<base64url>` 开头）。`origin` 为网关 base URL（App 扫码后无需手填，显式 https + 端口、无路径无查询串）。
> `caFingerprint` 语义（ADR-0008 定稿）= **该 Origin 信任锚证书 DER 的 SHA-256，64 位小写 hex**：私有 CA 模式取 `certs/ca/ca.crt` 或 `certs/remote-ca/ca.crt`；公开域名（系统信任证书）模式取证书链根锚 DER（无法确定根则配对失败，禁只 pin 叶子）。**App 配对时固定该指纹到精确 Origin**（HUKS 存储，防 MITM，两平台一致）。

### VersionInfo
```json
{ "current": "0.1.0", "latest": "0.1.1", "url": "https://.../x.hap", "sha256": "hex", "required": false }
```

## 3 HTTP 端点

### 3.1 健康检查（无鉴权）
`GET /mobile/health`
→ `200 { "status":"ok", "pluginVersion":"0.1.0", "dshVersion":"0.2.3-alpha.2", "time":"..." }`

### 3.2 配对（无鉴权 carve-out，一次性密钥）
`POST /mobile/pair`
> 配对密钥由 **PC 端进程内 API / 管理页面**生成并编码成 `dshpair://v1/...`（M3 不起独立的签发 HTTP 端点；若未来需要远程签发，另开 issue 加仅回环端点）。
请求：`{ "pairingKey":"...", "deviceName":"...", "platform":"harmony" }`
成功：`201 { "deviceId":"...", "token":"...", "issuedAt":"...", "expiresAt":"...", "caFingerprint":"sha256" }`
> `caFingerprint` 为绑定凭据（ADR-0008）：建连前按扫码 payload 指纹校验对端锚（不符即断连 `CA_FINGERPRINT_MISMATCH`、不发 pairingKey、不落盘）；收到 `201` 后**再次比对响应指纹与扫码 payload**，不符则丢弃 token 并清理本地记录。
失败：`409` 密钥已用/过期｜`403` 来源不在白名单｜`429` 限流

> **统一鉴权规则（R1 已修，v0.5 carve-out）**：所有**写请求**（POST/PUT/PATCH/DELETE）必须带 `Authorization: Bearer` + `X-Device-Id`。**唯一例外：`POST /mobile/pair`**——配对时设备尚无 token/deviceId，凭一次性 pairingKey 免鉴权（否则鸡生蛋）；这是 §3.2 标注"无鉴权"的合法 carve-out，两侧实现按此。管理端点（devices/whitelist/CA）另要求 TCP 对端为回环。读端点（GET）仅需回环或已配对 token。

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
> `plugin`/`app` 段的 `url`/`sha256` 分别指向 npm tarball / hap；`dshVersion` 来源为 Host 实际运行版本（见 §3.1）。
> **Q7 定稿**：App 升级检查的**主通道是 App 直查 GitHub Release**（版本真源统一在仓库 tag，不受网关可达性影响）；本端点的 `app` 段降级为"已配对电脑缓存的最近已知版本"，仅作参考展示，不作为升级判据。

### 3.8 CA 管理端点（仅回环，ADR-0008）
`GET /mobile/ca`（回环读）→ `200 { "active":{ "caFingerprint":"hex", "notBefore":"...", "notAfter":"...", "status":"active" }, "retired":[{ "caFingerprint":"hex", "notBefore":"...", "notAfter":"...", "status":"retired", "retiredAt":"..." }] }`
> **禁返私钥 / CSR / CA 证书本体**，只返回指纹与元数据。
`POST /mobile/ca/leaf/rotate`（回环 + `Authorization` + `X-Device-Id`）→ `200 { "caFingerprint":"hex", "rotatedAt":"..." }`
> 同一 CA 重签叶子：锚指纹不变 → token 不失效、App 免重配对。
`POST /mobile/ca/rotate`（回环 + 鉴权）→ `200 { "caFingerprint":"hex（新）", "newOrigin":"https://...:port", "rePairRequired":true }`
> 换 CA：新锚 + 双 Origin 重叠窗口；旧 pin/token 全失效，全员重新扫码（ADR-0008 §4.3）。

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

> **错误响应体结构（v0.5 明确）**：`{ "error": { "code":"<机器子码>", "message":"<人可读，可选>" } }`；client 只依赖 `code`，`message` 仅用于展示。

| 码 | 含义 | 机器子码（响应体 `error.code`） |
|---|---|---|
| `400` | malformed JSON / 字段类型错误 | `INVALID_REQUEST` |
| `401` | 未配对 / token 过期或撤销 | `UNAUTHORIZED` |
| `403` | 白名单拒绝 / 非回环对端 / 设备未授权 / 指纹不符 | `WHITELIST_DENIED` / `NOT_LOOPBACK` / `DEVICE_UNAUTHORIZED` / `CA_FINGERPRINT_MISMATCH` |
| `404` | 未知端点 | `NOT_FOUND` |
| `409` | 配对密钥已用或过期 | `PAIRING_CONSUMED` |
| `413` | 请求/剪贴板/二进制超限 | `PAYLOAD_TOO_LARGE` |
| `429` | 限流 | `RATE_LIMITED` |
| `502` | Host 不可达（网关自生） | `UPSTREAM_UNREACHABLE` |
| `504` | Host 超时（网关自生） | `UPSTREAM_TIMEOUT` |

> `VersionInfo.required=true` 的行为：App 显示强制升级提示并阻断连接，直至升级完成（错误状态 `UPGRADE_REQUIRED`）。

## 6 版本升级通道（Q6）

- Plugin：比对 npm/GitHub tag（`dsh-harmony`）；下载 → 校验 SHA-256 → 提示/自动升级。
- App（Q7 定稿）：**直查 GitHub Release** 取最新 tag → 下载 hap → 校验签名 + SHA-256 → 拉起系统安装（In-house 证书签名）。网关 `GET /mobile/version` 的 `app` 段仅作缓存展示，不作升级判据。

## 7 未决（转 open-questions）

- [x] DSH session 事件词汇核对完成（`dsh-v0.2.3-alpha.2`）：4 个业务事件均需映射，详见 §4 与 `docs/review/02-contracts-review.md`。
- [x] Q7 App 版本拉取通道 → App 直查 GitHub Release（ADR-0007）。
- [x] Q8 配对 payload + CA 指纹绑定 → `dshpair://v1/<base64url>` + 指纹固定（ADR-0007）。
- [x] Q9 二进制上传端点 → 本期不加（ADR-0007）。
- [x] CA 生命周期（签发/分发/轮换/吊销）→ ADR-0008 定稿，v0.4 同步端点/错误码/验收三例。
- 当前无未决项；新问题请开 issue 并登记 `docs/open-questions.md`。

## 8 验收矩阵（怎么验）

| 切片（02 §8） | 端点/事件 | 请求或动作 | 预期 | 门禁 |
|---|---|---|---|---|
| 3 health | `GET /mobile/health` | 无鉴权 GET | `200 status:ok` + 版本 | `check-contracts` C1 |
| 4 WS | `WS /mobile/ws` | 首帧 auth+deviceId，subscribe | 收到一条 `session.updated` 映射事件 | `check-contracts` C3 |
| 5 配对 | `POST /mobile/pair` | 扫 `dshpair://v1/...` 得 pairingKey + caFingerprint | `201` 返回 token；指纹不符则拒绝；二次重连免配对 | `check-contracts` C2 |
| 升级 | `GET /mobile/version` | 无鉴权 GET | `200 plugin/app VersionInfo` | `check-plugin-version` |
| CA-叶子续期 | `POST /mobile/ca/leaf/rotate` | 回环 + 鉴权 | 锚指纹不变；token 有效；App 无感 | `check-contracts` C1 |
| CA-换锚 | `POST /mobile/ca/rotate` | 回环 + 鉴权 | 新锚 + `rePairRequired:true`；旧 token 失效 | `check-contracts` C1 |
| 设备撤销 | `DELETE /mobile/devices/:deviceId` | 回环 + 鉴权 | 目标 token 立即作废；CA pin 可复用 | `check-contracts` C1 |
