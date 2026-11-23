---
读者: App Agent / Plugin Agent / Docs+Architect / 负责人
类型: decision
权威: 高（证书与信任锚生命周期真源；字段真源仍见 03-contracts.md v0.3）
状态: 生效（issue #2 定稿；按 05 §4.2 经 PR 引入）
依赖: 02-architecture.md §3.3/§5/§6；03-contracts.md v0.3 §2/§3.2；ADR-0007（Q1/Q8）；ADR-0004（远程通道）
---

# ADR-0008 证书/CA 生命周期定稿（签发 / 分发 / 轮换 / 吊销）

> 关闭 issue #2。ADR-0007 的 Q8 只定了"配对时固定 CA 指纹"，未覆盖证书的生成、续期与作废；本文补齐四阶段闭环。
> 信任模型继承 `dsh-mobile`：LAN / tailnet / 自签 FRP 入口用**私有 CA + 配对固定**；公开域名远程入口用**系统信任证书 + 配对固定其锚**。
> **贯穿全文的不变量**：信任 = `精确 Origin（scheme://host:port）` + `caFingerprint（锚证书 DER 的 SHA-256，64 位小写 hex）`。**锚不变则叶子证书可任意重签，App 免重新配对；锚变则必须重新扫码配对。**

## 1 决策：四阶段总览

| 阶段 | 执行方 | 产物 / 触发 | App 侧动作 | 是否需重配对 |
|---|---|---|---|---|
| **签发 issue** | Plugin（首次 setup） | `$DSH_HOME/mobile-access/certs/` 下生成 CA + 叶子证书 | 无 | — |
| **分发 distribute** | Plugin 生成 payload，App 消费 | `dshpair://v1/<base64url>` 携带 `caFingerprint` | 校验锚指纹 → 固定到精确 Origin → HUKS 落盘 | 本次即建立配对 |
| **轮换 rotate** | Plugin（自动/管理端点） | 叶子续期（同锚）或换 CA（新锚） | 前者无感；后者旧 pin/token 全失效 | 叶子：**否**；换 CA：**是** |
| **吊销 revoke** | Plugin（回环管理）/ App | 设备撤销、CA 泄露应急、过期记录清理 | 清 token；锚泄露则清 pin 并重扫 | 设备撤销后重配对；全量泄露后全员重配对 |

**理由**：把"锚"与"叶子"分开，才能让 90 天短期叶子证书与长期稳定配对共存——这是 dsh-mobile "CA 更新叶子免重新配对、换 CA 才重配对"做法的直接落地。

## 2 签发（issue）

### 2.1 谁生成、生成什么

- Plugin 在**首次 setup**（网关启动且 `certs/ca/meta.json` 不存在）生成；已有且未过期的 CA 必须复用，**禁止静默覆盖**。重建/替换只能由回环管理动作显式触发。
- 目录布局（只新增 `certs/`，其余沿用 02 §3.3）：

```
$DSH_HOME/mobile-access/certs/
  ca/             # LAN / tailnet 私有 CA；也是默认 CA
    ca.key        # 0600，仅 PC 本机账户可读
    ca.crt
    meta.json     # fingerprint / notBefore / notAfter / serial / status
  remote-ca/      # 仅"自签 FRP 入口"时生成，与 ca/ 物理隔离
    ca.key
    ca.crt
    meta.json
  server/
    server.key
    server.crt    # SAN 覆盖全部网关入口
```

- **信任域隔离**：每个独立信任域一把 CA。`ca/` 服务 LAN IP 与 tailnet IP；`remote-ca/` 服务**自签**的 FRP / 自建反代入口。公开域名（cloudflared 等带公共可信证书的入口）不生成 CA，走 §2.4 系统信任模式。扫码 payload 携带的是**所选 Origin 对应那把 CA**的指纹。

### 2.2 算法与有效期（确定值）

| 项 | 取值 | 理由 |
|---|---|---|
| CA 密钥 | **ECDSA P-256**（首选）；运行时不支持 EC 时退化 **RSA-2048**（须记入 setup 日志） | 两者均满足 128-bit 安全强度；P-256 证书更小、握手更快 |
| CA 签名 | `SHA-256`；`basicConstraints: CA:TRUE, pathLen:0`；`keyUsage: keyCertSign,cRLSign` | `pathLen:0` 禁止再签下级 CA，限制误用面 |
| CA 有效期 | **3650 天（10 年）**，自生成时刻起 | 锚长期稳定，避免周期性全员重配对；过期走 §5.3 清理 |
| 叶子密钥 | 与 CA 同算法族；每把叶子独立密钥 | 避免 CA 私钥参与日常 TLS 握手 |
| 叶子有效期 | **90 天**；剩余 ≤30 天时自动续期 | 缩短叶子私钥泄露窗口；换叶不动锚，用户无感 |
| 叶子 SAN | `127.0.0.1`、`localhost`、本机 LAN IP、已配置的 tailnet IP、已配置的公网主机名；新增入口必须重签叶子 | App 按精确 Origin 校验主机名，SAN 缺失即连接失败 |
| 配对密钥 | 一次性，TTL **5 分钟**，成功后立即消费 | 与 03 §2/§3.2 的 `409 PAIRING_CONSUMED` 一致 |

- 证书与私钥以**原子替换**写入（临时文件 + rename），禁止半写状态；写权限 `0600`，目录 `0700`。

### 2.3 LAN / tailnet 的私有 CA 签发流程

1. 用 `ca.key` 对 CSR（公用名 `dsh-harmony gateway`，SAN 如 §2.2）签发叶子证书，序列号随机且唯一。
2. 握手时同时发送 `server.crt` + `ca.crt`（链根随握手下发），使 App 无需外部渠道即可算出锚指纹。
3. 网关仅监听 HTTPS（默认 3443），禁明文与自动降级；白名单/回环约束保持 02 §5 不变。

### 2.4 公开远程与自签 FRP 的差异

- **公开远程（公共可信证书，如 cloudflared 自定义域名）**：不生成私有 CA，使用系统信任证书；`caFingerprint` = **证书链中锚证书（链根）DER 的 SHA-256**。服务端未发送根证书时，App 沿 issuer 用系统信任库补全后取根；无法确定根则**配对失败**，禁止退化为"只 pin 叶子"（叶子轮换会造成不可预期的重配对）。App 必须同时通过系统主机名校验与锚指纹校验（AND，不是 OR）。
- **自签 FRP / 自建反代入口**：按 §2.1 生成独立 `remote-ca`，按 §2.3 签发叶子；payload 携带 `remote-ca` 指纹。**禁止复用 LAN CA 去签公网入口证书**，以免公网暴露面污染 LAN 信任域。
- **tailnet 入口**：视为 LAN 信任域，用 `ca/`；Origin 是 tailnet IP，pin 记录按该精确 Origin 单独存一条。

## 3 分发（distribute）

### 3.1 payload 生成（Plugin）

1. 生成一次性 `PairingKey`：`{ v:1, pairingKey, origin, expiresAt, caFingerprint }`（字段与 03 §2 一致，camelCase、ISO8601 UTC）。
2. `origin` 必须是 `https://host:port` 形式、显式端口、**无路径无查询串**；按选中入口取 LAN/tailnet/FRP/公网主机名。
3. `caFingerprint` = 该 Origin 信任锚 DER 的 SHA-256，64 位小写 hex；私有 CA 模式取 `ca.crt`/`remote-ca/ca.crt`，系统信任模式按 §2.4 取链根。
4. JSON 序列化 → **base64url（无 padding）** → 拼成 `dshpair://v1/<base64url>`，出二维码/链接。禁止在链接里放私钥、token 或 CA 证书本身。

### 3.2 App 固定到精确 Origin（校验顺序不可调换）

1. 解码：校验 `v === 1`、`expiresAt` 未过期、`origin` 为显式 https、指纹为 64 位 hex；任一不符即拒绝，不落盘。
2. 按 `origin` 建立 TLS：**精确匹配 scheme + host + port，禁止跟随重定向、禁止 http 回退、禁止 host 通配**；由传输层统一执行 pin，任何端点都不得绕过。
3. 计算对端信任锚 DER 的 SHA-256，与 payload `caFingerprint` **逐字节相等**才继续；不等则立即断连并报 `CA_FINGERPRINT_MISMATCH`，不发送 `pairingKey`、不写任何凭据。
4. 通过该连接 `POST /mobile/pair`（03 §3.2）；收到 `201` 后**再次比对响应中的 `caFingerprint` 与扫码 payload**，不等则丢弃 token、删除本次全部本地记录并报错。
5. 只有以上全部通过，才允许 `GET /mobile/health` / WS / 代理请求等后续流量。

### 3.3 存储（HUKS，App 侧）

- 按 `(origin, mode)` 建 pin 记录，逻辑别名建议 `dsh.pin.<sha256(origin)>`；token 按 `dsh.token.<deviceId>`。值经 HUKS 信封加密，**私钥/主密钥不出 HUKS、不导出**。
- pin 表是**白名单式**：一台设备可有多条（多 PC / 多 Origin），每条锁死到精确 Origin；**禁止"信任所有"开关、禁止用户手动改 pin、禁止静默更新已存 pin**——更新 pin 的唯一合法入口是重新扫码（§4）。
- token、指纹、配对凭据禁止写入 `AppStorage`/偏好文件/数据库明文/日志/剪贴板/截图；网络层只从 HUKS 取用。
- 系统信任证书模式下"系统信任"仅用于主机名校验，pin 仍由 HUKS 中的指纹记录执行，二者叠加。

## 4 轮换（rotate）

### 4.1 判定表（唯一判据：锚指纹是否变化）

| 变更 | 锚指纹 | token | App 动作 | 重配对 |
|---|---|---|---|---|
| 叶子到期/续期/重签（同 CA） | 不变 | 继续有效 | 无感，下次连接自动接受 | **否** |
| 叶子 SAN 扩充（新增入口） | 不变 | 继续有效 | 新 Origin 按 §3 单独扫码生成新 pin 记录；旧记录不动 | 仅新 Origin 需 |
| CA 密钥轮换 / CA 重建 / 算法升级 | **变** | 全部失效 | 旧 pin 命中失败 → 提示"网关已换 CA，请重新扫码" | **是** |
| 远程从私有 CA 切到公共证书（或反向） | **变** | 全部失效 | 同上，且 Origin 通常同时变化 | **是** |
| token 过期（锚未变） | 不变 | 走 `POST /mobile/token/refresh` 续期 | 自动续，pin 不变 | 否 |

**禁止**：在服务端或 App 端静默改写已保存的 `caFingerprint` 来"适配"新证书——那等于放弃 MITM 防护。

### 4.2 叶子续期流程（自动、免重配对）

1. Plugin 每次网关启动 + 每日巡检 `server.crt` 的 `notAfter`；剩余 ≤30 天即触发续期。
2. 用**同一把 CA 私钥**按 §2.2 SAN 重签叶子（新序列号、新叶子密钥），原子替换文件并重载 TLS 上下文；若 webserver 不支持热重载，则短暂重启网关（见 §9 待验证）。
3. 锚指纹不变 ⇒ **payload 不需要重发，配对记录不变更，token 不失效**。续期结果只写 `meta.json` 审计字段。

### 4.3 CA 更换流程（必须重配对）

采用**双 Origin 重叠窗口**，避免全员同时断连：

1. 生成新 CA + 新叶子（新锚指纹），新 CA 记录 `status: active`；旧 CA 置 `status: retired`、`retiredAt`。
2. 旧叶子继续在原 Origin 服务老设备；新叶子在**新 Origin**（新端口或新主机名）启动网关，对外只发布新 Origin 的 `dshpair://v1/...`。
3. App 扫新码 → 新 pin 记录与 token 落盘；旧记录保留至切换完成。
4. 全部设备重配完成（或到达保留期限）后：停服旧 Origin，撤销旧 token，安全擦除旧 CA 私钥，旧元数据转只读审计（§5.3）。
5. 无并发设备时可跳过重叠窗口直接切换，但必须明确告知"所有设备需重新扫码"。

## 5 吊销（revoke）

### 5.1 单设备撤销

- 管理端 `DELETE /mobile/devices/:deviceId`（回环 + `Authorization` + `X-Device-Id`，03 §3.4）→ 设备标记 `revoked`、**立即服务端作废其 token**（不等到 `expiresAt`），CA 与叶子保持不变。
- 其他设备不受影响。被撤设备的 App 下一次请求得 `401 UNAUTHORIZED`/`DEVICE_UNAUTHORIZED` → 清除本地 token，提示"已撤销，请重新扫码"；**CA pin 可保留复用**（锚仍有效）。

### 5.2 CA 私钥泄露 / 疑似泄露（应急）

1. **立即停用旧锚**：旧 CA 置 `compromisedAt`，拒绝以其指纹生成任何新配对密钥；能切到新叶子则先切，不能则停网关。
2. **重新签发 CA**：在干净目录生成全新 CA + 叶子（新密钥、新指纹），不要复用旧 CSR 或旧序列号空间。
3. **全员重配对**：旧 pin 与旧 token 全部作废，向所有设备重新分发 payload。理由：指纹绑定是唯一信任锚，锚私钥泄露等价于锚作废，无法做到免重配对。
4. **清理**：切换完成后安全擦除旧 CA 私钥（覆盖 + 删除），事件只记元数据（时间、旧指纹、处置），**不得写入仓库、tag、Release 或日志附件**。
5. 公网入口若使用系统信任证书，则改为轮换托管域名证书 / 更换锚的根 CA，并按同流程全员重配。

### 5.3 过期 / 退休 CA 记录清理

- 过期或退休 CA **停止签发、停止发配对密钥**，元数据（指纹、有效期、状态）只读保留 `notAfter + 90 天` 供审计；期间**仍允许设备删除与重新配置**（权限来自回环 + 管理 token，不依赖该 CA 的私钥或签名）。
- 清理任务在网关启动 + 每周执行：删除超过保留期的 CA 目录、对应 pin 引用与失效 token；审计日志只留指纹与状态，不留密钥。
- `purge $DSH_HOME/mobile-access/`（02 §3.3）整体清除证书、配对记录、白名单与防火墙规则，用于设备退役/彻底重置。

## 6 双平台抽象（Q1）

| 能力 | HarmonyOS NEXT（API 12+） | 纯 OpenHarmony（API 9+） | `PlatformAdapter` 统一接口（契约草图，非实现） |
|---|---|---|---|
| 密钥存储 | `@ohos.security.huks`，可用完整访问控制/用户认证 | 同为 HUKS，但算法与认证策略按 API 9 能力子集探测 | `secureStore.put/get/delete/has(alias, bytes)` |
| TLS 固定 | 优先用平台原生"自定义信任锚/证书链校验"能力 | 可能只有 CA bundle 级能力或缺失 | `tls.capability() → 'pin' \| 'ca-bundle' \| 'none'`；`tls.setPins(origin, anchorDer[])`；`tls.verify(origin, chainDer) → boolean` |
| HTTP / WS | `@ohos.net.http` / `@ohos.net.webSocket` | 同名 API，参数能力差异由适配层封装 | 两者共用同一 `tls` 实例，WS 握手与 HTTP **同一套 pin**，禁止分叉 |

- 启动时执行一次能力探测并缓存结果；业务层只调 `tls.capability()`，**禁止散落平台判断**（沿用 02 §2.1.1、06 §7 的 `PlatformAdapter` 纪律）。
- `'pin'`：平台可校验锚 DER → 执行 §3.2 全量校验。
- `'ca-bundle'`：平台只能加载单个自定义信任锚 → **仅支持私有 CA 模式**（把 CA DER 作为该 Origin 的唯一信任锚），系统信任证书模式在此平台禁用。
- `'none'`：**拒连并给出明确用户可懂的错误"当前平台不支持证书固定，未建立连接"**。**禁止**降级为"系统信任即可"、禁止关闭主机名校验、禁止让用户点"仍要连接"绕过。这是与 dsh-mobile 安全基线一致的硬约束。
- 两平台 pin/token 一律进 HUKS；NEXT 可额外绑定用户认证，API 9 退化为 HUKS 普通访问控制，**绝不退化为明文偏好文件**。

## 7 安全红线

1. CA 私钥（`ca.key` / `remote-ca/ca.key`）**不进 git、不进版本控制**，也不得出现在 npm tarball、hap、Release 附件、二维码、日志、崩溃报告或聊天消息中；只存 `$DSH_HOME/mobile-access/certs/`，权限 `0600`。
2. **禁止把私有 CA 安装进系统/设备信任库**；自定义 CA 只作为单次连接的信任锚使用，全局安装会污染设备其他应用的信任面。
3. 禁止"信任所有证书"、跳过 TLS 校验、跳过主机名校验、http 回退或重定向跨 Origin。
4. 指纹不匹配时禁止继续连接或落盘任何凭据；禁止静默改写已保存的 pin（唯一入口是重新扫码）。
5. token / CA 指纹 / 配对密钥只经 HUKS 存储，不进 `AppStorage`、日志、剪贴板、截图、备份明文。
6. 配对密钥一次性、5 分钟有效、用后即焚；CA 轮换、设备撤销、白名单变更**仅回环管理端点**可触发（03 §3.4/§3.5）。
7. 签名仅用 `SHA-256` + ECDSA P-256 / RSA-2048；禁 SHA-1、RSA-1024；CA `pathLen:0`，不得签发下级 CA。
8. 应急轮换后旧 CA 私钥必须擦除；事故记录不含密钥，不入仓。

## 8 影响面（同步要求；本 ADR 不直接改这些文件）

| 文件 | 必须同步的内容 |
|---|---|
| `docs/design/02-architecture.md` | §3.3 补 `certs/{ca,remote-ca,server}` 布局；§5 安全矩阵把"（可选）CA 指纹固定"升级为"**强制**：精确 Origin + 锚指纹 + HUKS；不装系统信任库；pin 能力缺失即拒连"；§6 注明 LAN/tailnet/自签 FRP 用私有 CA、公开域名用系统信任证书；§9 将 issue #2 待定项改为"已由 ADR-0008 关闭"。 |
| `docs/design/03-contracts.md`（v0.3 → v0.4，按 05 §4.2 走 PR） | §2 明确 `caFingerprint` = 锚证书 DER 的 SHA-256（64 小写 hex）及私有 CA / 系统信任两种锚定义；§3.2 写清"扫码 payload 与 `/pair` 响应双向比对 + 建连前已按该指纹校验"；新增回环管理端点 `GET /mobile/ca`（只返回指纹/有效期/状态，禁返私钥）、`POST /mobile/ca/leaf/rotate`、`POST /mobile/ca/rotate` 及其鉴权/错误码（含 `403 CA_FINGERPRINT_MISMATCH`）；§5 补对应机器子码；§8 验收矩阵补"叶子续期免重配 / 换 CA 强制重配 / 设备撤销"三例。**先改契约再改实现，两侧同批。** |
| `app/AGENT.md` | §2 红线补"pin 按精确 Origin；禁静默改 pin；禁系统信任库安装；平台不支持固定时拒连而非降级"；§3 补 `PlatformAdapter.tls` 能力探测约定；§4 去哪查加 ADR-0008。 |
| `plugin/AGENT.md` | §2 红线补"CA 私钥只存 `mobile-access/certs/`；轮换/撤销仅回环；换 CA 必须作废旧 token 并强制全员重配对；旧 CA 只读保留 + 到期清理"；§4 去哪查加 ADR-0008。 |
| `docs/open-questions.md` / issue #2 | ADR 经 PR merge 后关闭 issue #2；契约版本升 v0.4 时同步 `docs/README.md` 与 02/03 的状态行。 |
| 门禁（`tools/check-*.mjs`，issue #1） | `check-contracts` 增加对 `caFingerprint` 语义、CA 管理端点与错误码存在性的静态校验；`check-docs` 校验 ADR 编号连续。 |

## 9 待验证（不阻塞本 ADR 生效；需真机/环境）

1. NEXT API12+ 与纯 OpenHarmony API9+ 的 `@ohos.net.http` / `@ohos.net.webSocket` 是否暴露对端证书链或提供 pin 配置——决定落 `'pin'`、`'ca-bundle'` 还是 `'none'`（拒连）。
2. 两平台 HUKS 实际支持的算法、别名长度、访问控制/用户认证差异；`'none'` 分支的错误文案是否可交互呈现。
3. WS 握手是否与 HTTP 共用同一信任锚配置；若不能，需在 App 传输层统一做 `tls.verify`。
4. `dsh-host-webserver` 是否支持不重启热重载 TLS 证书；否则叶子续期需短暂重启网关，须定重试窗口。
5. 三种 Origin（LAN IP / tailnet IP / 公网域名或 FRP）的 SAN 组合与证书链形态；自签 FRP 是否确需独立 `remote-ca`（预期需要）。
6. 双 Origin 重叠窗口下新端口网关是否受白名单/回环约束影响；旧 Origin 停服判定方式。
7. 过期 CA 保留期 90 天是否合适；无 CA 私钥时"仍可删除/重配"的权限校验路径（回环 + 管理 token）实测。
8. 系统信任模式下从证书链提取根 CA 并计算锚指纹的可行性；不可行时该平台禁用公共证书模式。
9. 端到端真机用例（两平台各一遍）：`配对 → 叶子续期免重配 → 换 CA 强制重配 → 单设备撤销 → 设备撤销后重配 → CA 过期清理`。
