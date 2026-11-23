---
读者: 全体 Agent / 负责人
类型: design
权威: 高
状态: 草案（Q1 目标平台待定，其余已定）
依赖: docs/design/01-requirements-analysis.md
---

# 02 架构定稿（纯原生 ArkUI）

> 依据 Q2 决策：app 用**纯原生 ArkUI 重写**，不加载插件 web 页面。因此 app 与 plugin 之间是**显式 HTTP/WebSocket API 契约**，而不是 WebView + bridge。

## 1 总体结构

```
┌──────────────────────────────┐         ┌────────────────────────────────────┐
│  OpenHarmony App (ArkTS/ArkUI)│         │  PC: DSH + dsh-harmony plugin        │
│                              │  HTTPS  │                                    │
│  UI  ── HTTP/WS 客户端 ──────┼────────>│  Gateway(3443) ── 回环代理 ──> Host(3080)│
│   │                         │         │   │  ├ 配对/令牌                      │
│   └ 原生能力(通知/权限/相机) │         │   │  ├ 白名单(OpenClaw style)        │
│                              │         │   │  ├ 移动工作区 mobile-access/     │
│   HUKS 存 token/CA           │         │   └ 管理 API / 管理页面              │
└──────────────────────────────┘         └────────────────────────────────────┘
        │ 远程：TailMesh/HarmoTail 加入 tailnet → 直连电脑 tailnet IP
        └ LAN：直连电脑局域网 IP:3443
```

- **App 侧**：只做「原生 UI + 网络客户端 + 原生能力 + 安全存储」，不含 DSH 前端逻辑。
- **Plugin 侧**：对 App 暴露一个**稳定 API 面**；对 DSH 走回环代理复用其会话/工具/事件，不重写 DSH。

## 2 App（ArkTS/ArkUI 原生）

### 2.1 分层

| 层 | 职责 | 关键 API（鸿蒙） |
|---|---|---|
| UI 层 | 会话抽屉、聊天、工具详情、设置、扫码配对、设备列表 | ArkUI 声明式组件 |
| 状态层 | 会话/消息/连接状态（可观测） | ArkTS `@Observed`/`AppStorage`/自建 store |
| 网络层 | HTTP 请求 + WebSocket 事件流 | `@ohos.net.http`、`@ohos.net.webSocket` |
| 安全层 | token / CA 指纹 / 配对凭据 | **HUKS**（`@ohos.security.huks`） |
| 能力层 | 通知、权限、相机扫码、文件、剪贴板、后台任务 | `@ohos.notificationManager`、`@ohos.abilityAccessCtrl`、`@ohos.multimedia.camera`、`@ohos.file.picker`、`@ohos.pasteboard`、`@ohos.resourceschedule.backgroundTaskManager` |
| 更新层 | 查 GitHub tag → 下载 hap → 校验 → 拉起安装 | `@ohos.net.http` + 文件 + 系统安装入口 |

### 2.2 关键约束（因放弃 WebView 而新增）

- **无 bridge**：所有能力都在 ArkTS 内直接调用，不再有"网页调原生"这一层；安全性靠**网络契约**而非 Origin 校验。
- **必须自建 UI**：会话/消息渲染、流式输出、工具卡片、输入栏全部原生实现（工作量最大项）。
- **状态一致性**：App 的本地状态与 DSH 会话事件需靠 WS 事件流对齐，需处理断线重连与增量补偿。

## 3 Plugin（dsh 插件，TypeScript，in-process）

### 3.1 插件形态

dsh 是 Cordis 微内核、"Everything is a plugin"。本插件为**进程内插件**，在 DSH Host 进程里注册路由与能力（与 dsh-mobile 的 Host face 同构），**不修改 DSH 源码**。

**落地 API（已核实 submodule `dsh-v0.2.3-alpha.2`）**：
- 注册：`@deepseek-ai/cordis` 的 `ctx.plugin(...)`，支持 function / class / object 三种形态，default 或 named export 均可；该 fork **无 `reusable` 字段**。
- HTTP/WS 路由：`@deepseek-ai/dsh-host-webserver` 的 `ctx.webServer`。
- 回环地址：`ctx.webServer.getOrigin()`。
- 仓库内可模仿的等价实现：`webhook-github`、`open-in-app`、`api-gateway`（WS 路由）、`frontend-static`（fallback）。
- 关键包：`vendor/deepseek-harness/vendor/cordis`、`packages/host/webserver`、`packages/typert/protocol`（`PeerScope`，仅 peer 鉴权需要）。

| 模块 | 职责 |
|---|---|
| `gateway` | HTTPS 监听（默认 3443），对 App 提供 API；局域网/远程共用 |
| `relay` | 回环代理到 DSH Host（默认 3080），把会话/消息/工具/事件转发给 App |
| `pairing` | 配对（扫码/链接/密钥）、令牌签发/续期/撤销 |
| `whitelist` | OpenClaw 式白名单：`trustedProxies` IP 名单 + `allowUsers` 用户名单 + `userHeader` 身份头 |
| `workspace` | 恒定移动工作区 `$DSH_HOME/mobile-access/`，隔离管理移动端 session |
| `management` | 管理 API + DSH 内"移动访问"页面（设备/白名单/通道开关） |
| `version` | GitHub tag 版本监控（plugin 自身上游） |
| `transport` | WebSocket 事件流（默认仅放行精确路径） |

### 3.2 回环代理模型

- Gateway 以"本机操作者身份"把 App 请求代理到 Host；**管理 API 只接受 TCP 对端为回环**（对端 IP = 127.0.0.1/::1），不暴露公网。
- 第三方 WebSocket 路径默认拦截，按**精确路径**放行，不接受查询串/模糊前缀。
- 所有写请求校验：配对 token + `X-Device-Id`（+ 可选 CA 指纹固定）。纯原生 App 无浏览器 Origin、无 CSRF 概念，不沿用 Web 那套信任锚。

### 3.3 移动工作区（需求 #6）

- 固定目录 `$DSH_HOME/mobile-access/`：证书、配对记录、白名单、自定义文件、移动端 session 索引。
- 与桌面 session 隔离管理，但共享同一 DSH 工作区/事件流。
- `purge` 可整体清除（含防火墙规则）。

## 4 App ↔ Plugin 契约（HTTP + WS）

> 字段级契约见 `docs/design/03-contracts.md`（v0.1 草案）。此处只定形状。

| 类别 | 端点 | 说明 |
|---|---|---|
| 发现/健康 | `GET /mobile/health` | 网关存活 + 版本 |
| 配对 | `POST /mobile/pair` | 用配对密钥换 device token |
| 令牌 | `POST /mobile/token/refresh` | 同 Origin 自动续期 |
| 设备 | `GET /mobile/devices`、`DELETE /mobile/devices/:deviceId` | 设备列表 / 撤销 |
| 白名单 | `GET/PUT /mobile/whitelist` | 仅回环管理 |
| 代理 | `* /mobile/api/**` | 回环转发到 DSH Host |
| 事件 | `WS /mobile/ws` | 会话/工具/状态事件流 |
| 版本 | `GET /mobile/version` | 返回最新 tag（plugin/app 各一） |

## 5 安全矩阵

| 控制项 | 落点 | 做法 |
|---|---|---|
| 传输 | App↔Gateway | 仅 HTTPS；App 侧禁明文（networkSecurity 等价配置） |
| 身份 | App↔Gateway | 设备配对 token + `X-Device-Id`（+ 可选 CA 指纹固定） |
| 准入 | Gateway | OpenClaw 式白名单（IP/用户/身份头），独立于配对 |
| 管理面 | Gateway | 仅回环可访问 `/mobile/*` 管理路由 |
| WS | Gateway | 精确路径白名单，默认拦截第三方 |
| 凭据 | App | HUKS；私钥/token 不进仓 |
| 升级 | App/Plugin | 大小 + SHA-256（App 侧 hap 另验签名），禁静默自更新 |
| 远程 | 网络 | 远程默认关闭；tailnet 优先，公网隧道兜底 |

## 6 远程通道（Q5）

| 方案 | 说明 | 取舍 |
|---|---|---|
| **TailMesh / HarmoTail（原生 Tailscale 客户端）** | 手机加入 tailnet，直连电脑 tailnet IP:3443 | **首选**（端到端加密、无需公网暴露） |
| cloudflared / cloudflared 命名隧道 | 公网 HTTPS，兜底 | 临时/测试 |
| 自建 FRP / 自有反代 | 有 VPS 时 | 长期稳定需运维 |
| 卓易通装 Android Tailscale | 兼容层 | 兜底，体验非原生 |
| 自建 VPN 扩展（VpnExtAbility） | 把 WireGuard 做进 App | 重，暂不做 |

> App 只需一个 base URL（LAN IP / tailnet IP / 公网域名），三种入口同一套 HTTPS 契约。

## 7 版本与更新（Q4/Q6）

- **Plugin**：npm 包名 `dsh-harmony`；比对 npm/GitHub tag → 提示或自动升级（校验 SHA-256）。
- **App**：不上架 AppGallery；走 **In-house 定向发布**（组织内部发布证书 + Profile，包传自有服务器）。
  - 自更新链路：查 GitHub Release tag → 下载新 hap → 校验签名/SHA-256 → 拉起系统安装。
  - 注意：企业应用（MDM/HEM）仅支持鸿蒙电脑擎云设备，**手机不适用**，故手机必须走 In-house。
- 版本监控范围：**plugin + app 都监控**（Q6）。

## 8 垂直切片（纯原生版）

1. 空 ArkUI 工程出 hap（环境未装，占位）。
2. plugin 起 HTTPS 网关（3443）→ 回环代理到 Host（3080）。
3. App 用 `@ohos.net.http` 打通 `GET /mobile/health`。
4. WS 打通：App 订阅 `/mobile/ws` 收到一条事件。
5. 配对：生成二维码 → App 扫码 → token → 二次连接免配对。

## 9 待定项

- Q1 目标平台未定：若最终选纯 OpenHarmony（API 9），需复核 `@ohos.*` 可用面与 TailMesh/HarmoTail 兼容性（它们要求 HarmonyOS NEXT）。
- 字段级契约 `03-contracts.md` 已出 v0.1 草案，待评审。
- 证书/CA 生命周期（签发/分发/轮换/吊销）待定 → 开 `type:decision` issue。
