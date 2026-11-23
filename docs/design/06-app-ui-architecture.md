---
读者: App Agent / Plugin Agent / Docs/Architect / 负责人
类型: design
权威: 中（UI 落点设计；接口字段与端点的唯一真源仍是 03-contracts.md）
状态: v0.2（双平台适配版；Q1 已定两个都支持，API 经 PlatformAdapter 抽象）
依赖: docs/design/01-requirements-analysis.md, docs/design/02-architecture.md, docs/design/03-contracts.md
---

# 06 App 原生 UI 信息架构与页面清单

> 本文是**设计文档**，不写代码。依据 Q2 决策（纯原生 ArkTS/ArkUI，无 WebView、无 bridge），把 dsh-mobile 的移动布局逐项翻译为原生页面/组件，并标出每个页面调用的 HTTP/WS 端点、状态绑定、原生能力触发点与验收标准。
>
> 三条阅读规则：
> 1. **端点真源在 `03-contracts.md`**。本文只写"页面 → 端点"的映射；字段级细节以契约为准，改契约须同批改本文。
> 2. `03-contracts.md` §3.6 只定义了通配代理 `* /mobile/api/**`，**未定义 DSH 侧子路径**。本文出现的 `/mobile/api/sessions`、`/mobile/api/sessions/:id/messages`、`/mobile/api/tools/:toolName` 均为**占位路径（⬜）**，须由 Plugin Agent 在契约中细化后两侧同步，不得单侧实现。
> 3. Q1 已定 **两个都支持**（HarmonyOS NEXT API 12+ 与纯 OpenHarmony API 9+）。凡平台相关 API 均以 **【平台】** 标注，经 `PlatformAdapter` 抽象 + 能力探测 + 条件编译，双平台适配清单见 §7（ADR-0007）。

---

## 1 设计边界与信息架构

### 1.1 入口与主干

App 只有一条主干：**选服务/设备 → 配对 → 会话 → 聊天**。设置、诊断、升级为旁路，不打断主干。

```
[启动/设备选择] --未配对--> [配对扫码] --成功--> [会话列表] --> [聊天] --> [工具详情]
       |                                          |    |          |
       +--已配对------------------------------------+    +--> [设置] --> [连接诊断]
                                                        +--> [已配对设备]
                                                        +--> [版本升级提示]
```

### 1.2 与 dsh-mobile 布局的对应关系

| dsh-mobile（Android WebView） | 本文落点 | 形态变化 |
|---|---|---|
| 会话抽屉 | P3 的抽屉（`bindSheet` / 平板 `SideBarContainer`） | Web DOM → ArkUI 组件 |
| 聊天 | P4 聊天页（消息流 + 输入栏 + 提问卡片） | 原生消息渲染，流式走 WS |
| 工具详情 | P5 工具详情页 | 工具卡片点击下钻 |
| 设置 | P6 设置页 | 原生偏好 + HUKS |
| 提问卡片 | P4 内 `PromptCard` 组件 | 静态提示词卡片 |
| 输入栏 | P4 内 `InputBar` 组件 | 文本/附件/剪贴板/发送 |
| 已配对设备列表 | P9 已配对设备页 | **语义变更**：见 §1.3 |
| 连接诊断 | P7 连接诊断页 | 主动探活 + 错误码释义 |

### 1.3 关键语义澄清：手机端"已配对设备"≠ 服务端 `/mobile/devices`

`03-contracts.md` §3.4 明确 `GET/DELETE /mobile/devices` **仅回环**（非回环对端返回 `403`）。手机不是回环对端，因此：

- **P9 已配对设备页展示的是本机持久化的"已配对网关/电脑"列表**（origin、设备名、CA 指纹、最近连接），来自 `PersistentStorage`，**不调用** `GET /mobile/devices`。
- 服务端设备注册表的查看与撤销，留在 PC 端 DSH"移动访问"管理页（架构 §3.1 `management`），手机端只提供"在本机忘记此网关"的本地操作。
- 若未来要放开手机端服务端设备管理，必须先改 `03-contracts.md`（新增手机鉴权路径），再动 UI。

---

## 2 页面清单

> 端点列中 `⬜` 表示 §0 规则 2 的占位子路径；`WS` 表示走 `WS /mobile/ws` 事件流而非独立 HTTP 请求。

| ID | 页面名 | 职责 | 调用的 API 端点 | 主要出口 |
|---|---|---|---|---|
| **P1** | 启动 / 设备选择页 | 冷启动读取本地已保存的网关 origin 列表，逐个探活；有有效 token → 直接进会话列表；无 → 引导扫码。展示版本/升级检查入口。 | `GET /mobile/health`（对每个候选 origin）；本地 `PersistentStorage` 读取；`GET /mobile/version`（启动后异步） | P2 / P3 / P8 |
| **P2** | 配对扫码页 | 相机扫码解析 `PairingKey{pairingKey, expiresAt, origin}` → 展示 origin 与设备名确认 → 换 token，写入 HUKS；处理 `409/403/429`。 | `POST /mobile/pair`（body: `pairingKey`/`deviceName`/`platform:"harmony"`）；成功后可选 `GET /mobile/health` 复核 | P3（成功，replace） |
| **P3** | 会话列表页 | 移动工作区内的会话抽屉：会话标题/摘要/更新时间/未读；WS 增量更新；下拉刷新；进入聊天；底部 Tab 承载导航。 | `WS /mobile/ws`（`session.updated`，首帧 `auth` + `subscribe`）；`GET /mobile/api/sessions` ⬜（列表）；`GET /mobile/api/sessions/:id/messages` ⬜（末条摘要） | P4 / P6 / P9 |
| **P4** | 聊天页 | 消息流（含流式增量）、`agent.status`、工具卡片、提问卡片、输入栏；断线重连与增量补偿；复制/附件的原生入口。 | `GET /mobile/api/sessions/:id/messages` ⬜（历史分页）；`POST /mobile/api/sessions/:id/messages` ⬜（发送）；`WS /mobile/ws`（`message.delta` / `tool.call` / `agent.status` / `ping`） | P5 / P6 / P7 |
| **P5** | 工具详情页 | 展示某次 `tool.call` 的名称、参数、结果/产物、执行状态；支持产物保存与复制。从聊天页工具卡片下钻。 | `GET /mobile/api/tools/:toolName` ⬜（工具元信息）；`WS /mobile/ws`（按 `sessionId` 过滤 `tool.call`）；产物下载 `GET /mobile/api/files/...` ⬜ | 返回 P4 |
| **P6** | 设置页 | 网关 origin 管理、设备名、通知开关、远程通道说明、凭据管理（本机忘记网关）、版本检查入口、退出到 P1。 | `GET /mobile/version`（手动检查）；`POST /mobile/token/refresh`（手动重连）；本地配置读写。**不调用** `/mobile/devices`（见 §1.3） | P7 / P8 / P9 / P1 |
| **P7** | 连接诊断页 | 展示 base URL、TLS/CA 指纹、token 状态与过期时间、HTTP/WS 连通性、RTT、最近错误码；提供"重新探活/重新握手/重新续期"动作。 | `GET /mobile/health`；`POST /mobile/token/refresh`；`WS /mobile/ws`（握手 + `ping`/`pong` 测活） | 返回来源页 |
| **P8** | 版本升级提示页 / 弹窗 | 比对 `VersionInfo` 与本地版本；`required:true` 时强提示；展示 SHA-256、大小、来源；下载 hap → 校验签名 + SHA-256 → 拉起系统安装；同时提示 plugin 需在 PC 端升级。 | `GET /mobile/version`（`app` 段 + `plugin` 段）；下载走 `app.url`（GitHub Release，非网关；Q7 定稿） | 返回 P6 / P1 |
| **P9** | 已配对设备页 | 本机已配对的网关/电脑列表（名称、origin、CA 指纹、可达状态、最近连接）；重命名、设为默认、"忘记此网关"（仅删本机 HUKS 凭据）。 | **无服务端端点**（本地 `PersistentStorage` + HUKS）；可达状态复用 `GET /mobile/health` 探活 | P7 / P6 |

### 2.1 页面内关键组件（非独立页面）

| 组件 | 宿主页面 | 职责 |
|---|---|---|
| `InputBar` | P4 | 文本输入、附件按钮、粘贴、发送、停止生成；受限剪贴板 256 KiB / 二进制 8 MiB（契约 §1） |
| `PromptCard` | P4 | 预设提问卡片，点击后填入 `InputBar` 或直接发送 |
| `ToolCard` | P4 | 消息流中的工具调用卡片，点击 → P5 |
| `SessionDrawer` | P3 | 会话抽屉；窄屏半模态、宽屏侧栏 |
| `UpgradeSheet` | P6 / P1 | P8 的半模态呈现形态 |

---

## 3 导航图

### 3.1 导航结构（文本图）

```
EntryAbility.onWindowStageCreate()
  └─ Navigation (根容器, pathStack: NavPathStack) 【平台】
       │
       ├─ P1 Splash/ServerPicker  [root, 不可返回]
       │    ├─ 无本地有效凭据 ──push──> P2 PairingScan
       │    │                          └─ 配对成功 ──replace──> P3
       │    └─ 有本地有效凭据 ──replace──> P3
       │
       ├─ Tabs (主界面三 Tab)
       │    ├─ Tab「会话」→ P3 SessionList
       │    │    └─ tap session ──push──> P4 Chat(sessionId)
       │    │         └─ tap ToolCard ──push──> P5 ToolDetail(sessionId, toolCallId)
       │    ├─ Tab「设备」→ P9 PairedDevices
       │    │    └─ tap item ──push──> P7 Diagnostics(origin)
       │    └─ Tab「设置」→ P6 Settings
       │         ├─ push ──> P7 Diagnostics
       │         ├─ push ──> P9 PairedDevices
       │         ├─ bindSheet ──> P8 UpgradeSheet
       │         └─ 「退出」──replace──> P1
       │
       └─ 全局入口：通知点击 / Want 深链
            └─ EntryAbility.onNewWant() → pathStack.pushPathByName('Chat', { sessionId })
```

### 3.2 ArkUI 导航组件选型

| 用途 | 组件 / 机制 | 备注 |
|---|---|---|
| 根容器与页面栈 | `Navigation` + `NavPathStack`（`navDestination()` builder 注册各页） | `NavPathStack` 需 API 10+；【平台】纯 OpenHarmony API 9 回退 `NavRouter`/`NavDestination` 声明式路由或 `@ohos.router` |
| 主界面三 Tab | `Tabs` + `TabContent` | P3/P9/P6 同栈切换，避免重复实例 |
| 会话抽屉 | 窄屏 `bindSheet`（半模态）+ `SwipeGesture`；宽屏/折叠 `SideBarContainer` | 同一 `SessionDrawer` 组件两种容器，不写两套业务逻辑 |
| 升级提示 / 权限说明 / 配对确认 | `bindSheet`（P8 `UpgradeSheet`）、`CustomDialog`（权限与确认） | 不占用页面栈；`required` 升级用不可 dismiss 的 `CustomDialog` |
| 页面参数 | `NavPathStack.pushPathByName(name, param)`，`NavDestination` 内 `onReady` 取参 | 参数对象见 §3.3 |
| 返回与栈治理 | `pop()` / `popToName()` / `replacePath()` | P2→P3、P6→P1 用 replace，防止返回回到扫码/登录态 |

### 3.3 路由参数约定

| 路由名 | 参数 | 说明 |
|---|---|---|
| `PairingScan` | 无 | 扫码结果不跨页传递，直接消费 |
| `Chat` | `{ sessionId: string }` | 通知深链同样传此参数；若 token 失效先弹 P2 |
| `ToolDetail` | `{ sessionId: string, toolCallId: string }` | 参数与 WS `tool.call` 事件对齐 |
| `Diagnostics` | `{ origin?: string }` | 省略则用当前激活网关 |

---

## 4 关键 ArkUI 组件与状态绑定

### 4.1 状态分层总表

| 层 | 载体 | 内容 | 是否持久化 |
|---|---|---|---|
| 全局配置态 | `AppStorage` + `PersistentStorage` | `server.origins`、`server.activeOrigin`、`device.id`、`device.name`、`paired`、`settings.notifyEnabled`、`settings.remoteHintSeen` | 是 |
| 运行态 | `AppStorage`（内存） | `net.state`、`ws.state`、`session.currentId`、`session.unreadMap`、`upgrade.pending` | 否 |
| 安全态 | **HUKS** | `device.token`、`gateway.caFingerprint`（Q8 定稿：固定绑定，扫码校验） | 是（加密存储） |
| 领域模型 | `@Observed` 类 | `SessionVM`、`MessageVM`、`ToolCallVM`、`DeviceVM`、`ConnectionVM` | 由 store 决定 |
| 局部 UI 态 | `@State` | 输入文本、扫码结果、表单字段、弹窗显隐、键盘高度、列表滚动位置 | 否 |

> **安全红线**：`token` **不得**进 `AppStorage`/`PersistentStorage`（会被持久化或跨组件扩散）。`AppStorage` 只放 `device.id`、`paired` 等非敏感引用；网络层按需从 HUKS 取 token，WS 首帧鉴权后即丢弃内存副本。

### 4.2 逐页组件与状态绑定

| 页面 | 关键 ArkUI 组件 | `@State`（局部） | `@Observed` / `@ObjectLink`（模型） | `AppStorage` / `@StorageLink`（全局） |
|---|---|---|---|---|
| P1 启动/设备选择 | `Navigation`、`List`/`ListItem`、`LoadingProgress`、`Text` | `probingOrigins: string[]`、`isProbing: boolean` | `ConnectionVM`（各候选探活结果） | `@StorageLink('server.origins')`、`@StorageLink('server.activeOrigin')`、`@StorageProp('paired')` |
| P2 配对扫码 | `XComponent`（相机预览）【平台】、`TextInput`（设备名）、`Button`、`CustomDialog` | `scannedKey: PairingKey \| null`、`deviceName`、`errorCode: 409\|403\|429\|null` | — | `@StorageLink('device.name')`；配对成功后写 `paired`、`device.id` 并置 token 入 HUKS |
| P3 会话列表 | `Tabs`/`TabContent`、`List`/`ListItem`、`Refresh`、`SessionDrawer`（`bindSheet`/`SideBarContainer`） | `drawerOpen`、`refreshing`、`keyword` | `SessionVM[]`（标题/摘要/`updatedAt`/未读） | `@StorageProp('session.currentId')`、`@StorageLink('session.unreadMap')`、`@StorageProp('ws.state')` |
| P4 聊天 | `List` + `Scroll`、`Text`/`Span`（流式渲染）、`ToolCard`、`PromptCard`、`InputBar`、`@Watch` | `draft`、`streaming`、`keyboardHeight`、`atBottom` | `MessageVM[]`、`ToolCallVM`、`agent.status`（`AgentStatusVM`） | `@StorageLink('session.currentId')`、`@StorageProp('net.state')` |
| P5 工具详情 | `Scroll`、`Text`/`Span`（参数/结果）、`Button`（复制/保存）、`LoadingProgress` | `expandedSection`、`saving` | `ToolCallVM`（由 P4 传入 `@ObjectLink`） | `@StorageProp('session.currentId')`（用于过滤 WS 事件） |
| P6 设置 | `List`/`ListItem`、`Toggle`、`TextInput`、`Button` | `originDraft`、`checkingVersion` | `DeviceVM`（当前网关展示） | `@StorageLink('server.origins')`、`@StorageLink('device.name')`、`@StorageLink('settings.notifyEnabled')`、`@StorageProp('upgrade.pending')` |
| P7 连接诊断 | `List`/`ListItem`、`Progress`、`Text`（错误码释义）、`Button` | `rttMs`、`lastErrorCode`、`testing` | `ConnectionVM`（`net.state`/`ws.state`/token 过期时间） | `@StorageProp('server.activeOrigin')`、`@StorageProp('device.id')` |
| P8 版本升级提示 | `bindSheet`/`CustomDialog`、`Progress`、`Text`（版本/SHA-256/大小）、`Button` | `downloading`、`progress`、`confirmed` | — | `@StorageLink('upgrade.pending')`；读 `GET /mobile/version` 的 `VersionInfo` |
| P9 已配对设备 | `List`/`ListItem`、`SwipeAction`（忘记）、`Button`（设为默认） | `confirmForget: string \| null` | `DeviceVM[]`（本地持久化列表） | `@StorageLink('server.origins')`、`@StorageLink('server.activeOrigin')` |

### 4.3 跨页状态一致性

- WS `session.updated` → 更新 `SessionVM[]` → 同步 `session.unreadMap` 到 `AppStorage`，P3 与通知角标共享。
- 断线重连（契约 §4）：`ws.state` 变为重连中 → P4 暂停渲染 `message.delta`；指数退避成功后按 `session.updated` 的 `updatedAt` 做增量补偿，避免重复消息。
- `net.state` 由网络层单点写入，P4/P7 只读，禁止两处改同一状态。

---

## 5 原生能力落点

| 能力 | 触发页面 / 组件 | 触发时机 | 鸿蒙 API | Q1 影响 |
|---|---|---|---|---|
| 通知 | P4（前台服务保持事件流 + 新消息提醒）、P1（升级提醒） | WS 收到 `@` 消息 / `required` 升级；App 退后台时由前台服务维持 | `@ohos.notificationManager`、`@ohos.resourceschedule.backgroundTaskManager` | **【平台】** 前台服务权限与 API 面在 NEXT(12+) 与纯 OpenHarmony(9) 差异大，须复核 |
| 权限 | P2（相机）、P4（通知/麦克风）、P6（通知开关） | 首次进入对应功能前申请，拒绝后给说明 `CustomDialog` | `@ohos.abilityAccessCtrl`（`AtManager.requestPermissionsFromUser`） | **【平台】** API 9 可用，但权限清单/弹窗行为需按目标平台复核 |
| 相机扫码 | P2 配对扫码页 | 用户点"扫码配对"，拉起相机预览解析二维码 | NEXT：`@hms.core.scan`（Scan Kit）；纯 OpenHarmony：`@ohos.multimedia.camera` + `XComponent` + 自集成解码 | **【平台】** Scan Kit 仅 HarmonyOS NEXT 有；纯 OpenHarmony 需替代方案（影响 P2 工作量最大项） |
| 文件 | P4 `InputBar` 附件、P5 工具产物保存、P8 hap 下载 | 选文件/图片、保存工具产物、选择下载目录 | `@ohos.file.picker`（`DocumentViewPicker`/`PhotoViewPicker`）、文件管理 | **【平台】** `DocumentViewPicker` 部分方法 API 10+；API 9 需复核 |
| 剪贴板 | P4 `InputBar`、P5 工具详情"复制" | 粘贴文本/图片到输入栏、复制工具参数或结果 | `@ohos.pasteboard`（`getSystemPasteboard()`） | **【平台】** API 9 可用，但 `PasteData` 类型支持需复核；遵守契约 §1 的 256 KiB 上限 |
| 安全存储 | P2（写入）、P6/P9（忘记）、网络层（读取） | 配对成功写 token；网络请求/WS 首帧取 token | `@ohos.security.huks`（HUKS） | **【平台】** API 9/12 算法套件与别名规范有差异，需复核 |
| 系统安装入口 | P8 版本升级 | 校验签名 + SHA-256 后拉起安装 | 文件 + 系统安装入口（具体 API 见 §7） | **【平台】** 安装入口在两平台差异显著，需单独验证 |
| 后台任务 | P4 事件流保活 | App 退后台但需继续收 WS 事件 | `@ohos.resourceschedule.backgroundTaskManager` | **【平台】** 持续任务能力与管控两平台不同 |

---

## 6 怎么验（验收标准）

> 本机无鸿蒙环境。以下先写**验收标准文本**：有环境时按"有环境验收"执行；当前阶段按"无环境静态验收"逐条核对文档/接口映射。

| 页面 | 有环境验收（步骤 → 预期） | 无环境静态验收（当前可做） |
|---|---|---|
| P1 | 冷启动无凭据 → 显示候选 origin 列表并逐个探活；断网 → 显示"离线"且提供重试；有有效 token → 直接进入 P3，不经过 P2 | 文档含 `GET /mobile/health` 探活与分支；`paired` 分支跳转明确；P1→P2/P3 转换在 §3.1 可追溯 |
| P2 | 扫有效码 → 显示 origin 确认 → 201 后进入 P3 且二次冷启动免配对；扫过期码 → 409 提示；非白名单 → 403；限流 → 429 | 请求体字段与契约 §3.2 完全一致；错误码 409/403/429 有对应文案；token 写入 HUKS 且不进 AppStorage |
| P3 | 收到 `session.updated` → 列表增量刷新且未读角标更新；下拉刷新 → 重新拉列表；断网重连 → 无重复会话 | 订阅事件名与契约 §4 一致；`⬜` 占位路径已列待确认；抽屉双形态（sheet/sidebar）不重复业务逻辑 |
| P4 | 输入发送 → 出现本地消息 → 收到 `message.delta` 流式追加；`tool.call` 渲染卡片可点进 P5；收到 `agent.status` 显示状态；重连后消息不重复 | `message.delta`/`tool.call`/`agent.status` 均已绑定；重连增量补偿逻辑在 §4.3 有描述；输入栏上限与契约 §1 对齐 |
| P5 | 从 P4 点工具卡片 → 显示参数/结果/状态；复制成功；产物可保存到文件；返回 P4 不丢聊天位置 | 参数 `{sessionId, toolCallId}` 与 WS 事件字段对齐；产物保存走 `@ohos.file.picker` |
| P6 | 改设备名 → 本地持久化生效；关通知 → 不再弹提醒；手动检查版本 → 有新版显示 P8；退出 → 回 P1 且需重新配对 | 未调用 `/mobile/devices`（§1.3 明确）；`GET /mobile/version`、`POST /mobile/token/refresh` 映射存在 |
| P7 | 依次执行探活/握手/续期 → 三个结果分别显示；构造 401/403/409 → 显示对应释义；RTT 有数值 | 三个端点齐全；错误码表引用契约 §5；只读 `net.state`/`ws.state` 不反向写入 |
| P8 | 有 `required:false` 新版 → 可关闭提示；`required:true` → 不可跳过；下载后 SHA-256 不符 → 拒绝安装并提示；plugin 新版 → 提示在 PC 端升级 | 校验链"签名 + SHA-256"完整；下载源为 `app.url` 且非网关；不静默自更新 |
| P9 | 显示本机已配对网关；重命名生效；设为默认后 P1 优先探活该 origin；忘记 → HUKS 凭据清除且回 P1 | 页面无服务端端点调用；可达状态复用 `GET /mobile/health`；删除范围限定本机 |

### 6.1 无环境阶段的统一检查项

1. 页面清单 9 项在 §2 表中齐全，且每项均有 API 映射或"无服务端端点"明示。
2. 所有 `⬜` 占位路径已在 §0 规则 2 登记，待 Plugin 侧在 `03-contracts.md` 细化后同批改本文。
3. 导航图中每个页面都可达，P2/P6→P1 使用 replace 不残留返回栈。
4. 所有 `【平台】` 项在 §7 有对应应对方案。

---

## 7 双平台适配清单（Q1 已定：两个都支持）

> Q1 已定 **HarmonyOS NEXT(API 12+) 与纯 OpenHarmony(API 9+) 双目标**（ADR-0007）。下表逐项给出两平台实现与回退策略；上层经 `PlatformAdapter` 统一接口，实现按平台能力探测 + 条件编译选择。这份表是适配层的工作清单。

| 项 | 受影响 API / 组件 | HarmonyOS NEXT（API 12+） | 纯 OpenHarmony（API 9+） | 影响页面 | 应对 |
|---|---|---|---|---|---|
| 页面栈 | `Navigation` + `NavPathStack` | 原生支持 | API 9 无 `NavPathStack`，需 `NavRouter`/`NavDestination` 或 `@ohos.router` | 全部 | 封装 `AppNavigator`，双实现 |
| 扫码 | `@hms.core.scan` / `@ohos.multimedia.camera` | 可用 Scan Kit | 无 HMS，需 camera + `XComponent` + 自集成解码库 | P2 | **最大变量**；`QrScanner` 适配层双实现，纯 OH 单独估工 |
| 通知 | `@ohos.notificationManager` | API 面完整 | 基础能力可用，细节需复核 | P4 / P1 | 抽象 `NotificationService` |
| 前台服务 / 后台 | `@ohos.resourceschedule.backgroundTaskManager` | 严格管控，按 NEXT 规则申请 | 持续任务能力与权限不同 | P4 | 抽象 `BackgroundService`，按平台配权限 |
| 权限 | `@ohos.abilityAccessCtrl` | 可用 | 可用，权限清单/弹窗行为需复核 | P2 / P4 / P6 | 权限常量集中管理 |
| 文件选择 | `@ohos.file.picker` | 完整 | `DocumentViewPicker` 部分方法 API 10+ | P4 / P5 / P8 | 提供降级到"复制到应用沙箱"路径 |
| 剪贴板 | `@ohos.pasteboard` | 可用 | 可用，`PasteData` 类型支持需复核 | P4 / P5 | 按平台限制类型，守 256 KiB 上限 |
| 安全存储 | `@ohos.security.huks` | 可用 | 可用，算法套件/别名规范差异 | P2 / P6 / P9 | HUKS 封装隔离，别名集中定义 |
| WebSocket / TLS | `@ohos.net.webSocket` + CA 指纹固定 | 可用 | 可用，证书固定能力需复核 | P3 / P4 / P7 | 若不支持固定，改为契约 §7 的 CA 绑定决策 |
| 远程通道 | TailMesh / HarmoTail / 公网隧道 | tailnet 原生客户端可用 | TailMesh/HarmoTail 不兼容，用 cloudflared/FRP 公网隧道兜底 | P6（说明）/ P7（诊断） | base URL 抽象屏蔽；两平台通道差异在 P7 诊断页说明 |
| hap 安装入口 | 文件 + 系统安装入口 | 需验证具体 API（如 `@ohos.bundle.installer` / `want` 拉起） | 安装入口与签名要求不同 | P8 | 双平台各验证一次；不静默自更新 |
| 流式文本渲染 | `Text`/`Span` + `RichText` | 可用 | 基础 `Text`/`Span` 可用 | P4 / P5 | 只用基础组件，不依赖 `RichText` 高级特性 |

---

## 8 待确认（不自行决定）

| # | 事项 | 归属 | 影响 |
|---|---|---|---|
| 1 | `/mobile/api/sessions`、`.../messages`、`.../tools/:toolName`、`.../files/...` 子路径细化 | Plugin Agent → 改 `03-contracts.md` | P3/P4/P5 的 `⬜` 占位 |
| 2 | ~~配对 CA 指纹绑定~~ **已定**：固定指纹（Q8/ADR-0007） | — | P2/P9 凭据字段、P7 诊断展示已可定 |
| 3 | ~~DSH session 事件词汇对齐~~ **已定**：4 事件均为映射（评审 02） | — | P3/P4 增量补偿逻辑已可定 |
| 4 | ~~Q1 目标平台拍板~~ **已定**：两个都支持（ADR-0007） | — | §7 双平台适配清单生效 |
| 5 | P8 系统安装入口在**两个平台**的具体 API 与权限 | App Agent（双平台各验一次） | P8 能否闭环 |

> 以上未决项不阻塞本文作为页面清单与导航设计使用；实现前须逐项收口。
