---
读者: Plugin 端 / Mockup 子代理 / UI 实现方
类型: design
权威: 高（以 submodule 源码为准）
状态: v1（返工全量重写：纠正“独立插件后台”错误前提）
依赖: vendor/deepseek-harness/docs/subsystems/slots.md；vendor/deepseek-harness/packages/client/ui-plugin-manager/README.md；vendor/deepseek-harness/packages/client/ui-plugin-manager/src/client/index.ts；plugin/src；docs/design/03-contracts.md
---

# 02 Plugin 端：DSH Web UI 内插件配置页交互文档

> 引用约定：本文所有路径相对工作区根 `f:/Project/dsh-open-harmony-app`。`vendor/deepseek-harness` 为只读真源，不得修改。mock 数据均为假值。

## 1. 纠偏声明：为什么上一轮“独立 PC 后台管理面板”是错的

### 1.1 产品形态被画错了

上一轮把插件画成“网关总览 / 配对 / 设备 / 白名单 / CA / 版本”六域独立 PC 后台，是错误的。DSH 的 Web Client 是**单一 Web SPA**：三栏 `AppFrame` 由根槽位组合侧栏、主区、右栏，全局面板占用根级 keyed `main` 槽位；`conversation` 只是保留 key，Plugins 是另一个 shipped global panel，而不是另一个站点或独立后台（`vendor/deepseek-harness/packages/client/ui-layout/README.md:10-12,30-38`；`vendor/deepseek-harness/packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:3351-3390`）。

插件本体是 Cordis 进程内插件：模块导出 `apply(ctx)`，由 Loader 挂载并调用；`dsh-harmony` 自身也是 `name = 'dsh-harmony'`、`inject = ['webServer']`、`apply()` 内启动 HTTPS 网关的 Cordis function plugin（`vendor/deepseek-harness/docs/cordis-tutorial/01-first-plugin.md:5,11-19,45-51`；`plugin/src/index.ts:6-14`）。`dsh-harmony` 的业务职责确实是网关、配对、白名单、工作区路径、内存状态与事件映射（`plugin/src/gateway.ts:42-50`；`plugin/src/state.ts:53-65`；`plugin/src/workspace.ts:6-49`；`plugin/src/events.ts:1-18`），但这些职责是**Host/进程能力**，不是另起一套后台 UI 的理由。

### 1.2 正确的 UI 注入方式

浏览器侧插件只能通过 `ctx.slots.register(options, Component)` 贡献 UI，并在返回插件对象里声明 `inject: ['slots']`；每次注册必须包在 `ctx.slots.inject(key, () => ctx.slots.register(...))` 中，因为槽位只在声明它的宿主轴挂载期间存在，注册到未声明槽位会抛错（`vendor/deepseek-harness/docs/subsystems/slots.md:5,21-29,44-53`；`vendor/deepseek-harness/packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:71-79`）。

关键约束（来源同上）：

- 不要传 `priority`：浏览器半 façade 会自动分配且低于 shipped entries（`slot-catalog.ts:75`）。
- 浏览器半不能 `import` 设计系统组件；用 `React.createElement` 构造节点，用 `styles.insert` 注入样式，并用 `var(--dsw-*)` 主题变量而不是字面颜色，否则另一套配色会破（`slot-catalog.ts:76`）。
- 组件不接收 `ctx`；业务数据通过注册 `inject` 投影成回调或可观察源，React 内容通过子槽位组合（`slots.md:87-103,127-135`）。
- 注册失败会出现在浏览器半加载报告里，用 `cordis_inspect what:"temporary"` 回读（`slot-catalog.ts:78`）。

因此本轮唯一正确画法：**DSH Web SPA 左侧栏 Plugins 选中态 → 主区 PluginManagerPage → dsh-harmony bundle 详情/行详情 → 注入的配置表单**。本轮不画独立标题栏、不画自造侧栏、不画“网关控制台”式外壳。

## 2. DSH Web UI 骨架与 Plugins 主面板真实信息架构

### 2.1 三栏 AppFrame

- 根槽位组合 sidebar / main / rightbar；侧栏宽度 264–420px，默认 280px，≥768px 折叠为 56px rail；<768px 使用 modal drawer 且不留栏位；<1024px 自动折叠（`vendor/deepseek-harness/packages/client/ui-layout/README.md:10-12,28-36`）。
- 右侧栏是中心区让位的 track，首次打开占视口 45%，保留像素偏好，上限 70%；空间不足时先压到 300px，再要求 occupant 自行关闭（`ui-layout/README.md:30,65`）。
- 全局面板用 root-scoped keyed `main`；`ctx.layout.selectPanel(id)` 选择已注册面板，`null` 回到会话；Plugins 是 shipped global panel（`ui-layout/README.md:36-38`；`slot-catalog.ts:3351-3390`）。
- Settings → Plugins 是一个 `settings.section` 条目：id `plugins`、order 15，点击后关闭 Settings 并打开 Plugins 主列表（`vendor/deepseek-harness/packages/client/ui-plugin-manager/README.md:14,104`；`vendor/deepseek-harness/packages/client/ui-plugin-manager/src/client/index.ts:176-182`）。

### 2.2 侧栏 Plugins 项

- Plugins 侧栏项与 main panel 共用 id `plugins`：面板常量 `PANEL_ID = 'plugins'`，向 `sidebar.panellist` 注册 `PluginsPanelIcon`，向 `main` 注册 `PluginManagerPage`（`ui-plugin-manager/src/client/index.ts:85-89,132-157,184-190`）。
- `sidebar.panellist` 是 root-scoped list；id 对应 main panel，按钮由 sidebar 拥有，label 来自列表元数据；owner props 为 `size`、`active`（`slot-catalog.ts:5082-5134`）。
- Mock 时侧栏项必须显示“Plugins”选中态；它不是插件自造导航项。

### 2.3 Plugins 主面板信息架构（按 README 逐条）

1. **页面头部与信息按钮**：说明该页配置官方插件，并安装、管理、配置其他插件；信息按钮为 11px caption-colored icon，20px 方形 hover 区，副标题后 4px 间隔；hover/focus 显示共享 tooltip，点击保持到再次点击、Escape、Tab 或外部点击（`ui-plugin-manager/README.md:34`）。
2. **client sync 状态条**：每个视图都存在，即使 bundle 列表不可用；位于页面 body 顶部、任何 header 之下；状态来自 `ctx.modules.entries.state`。同步中显示 `Syncing plugins on this page…`；失败时显示 `data-client-sync-failure` 通知，说明部分插件未能在本页同步、Host 启用状态未改变，逐条列 `id: message`，并提供 `Retry this page`（调用 `ctx.modules.entries.retry()`，同步中禁用）（`ui-plugin-manager/README.md:36`；`ui-plugin-manager/src/client/index.ts:140-145`）。
3. **分组一：Built-in plugin settings**：按配置顺序列出官方配置页：Subagent、web search and fetch、agent loop、shell（`ui-plugin-manager/README.md:34`）。
4. **分组二：Experimental plugins**：显示主要可选 bundle；标题旁 `More` 打开同标题的独立列表页，返回后回到主列表；Experimental 标记只由 `EXPERIMENTAL_BUNDLES` 集合决定，不看包名前缀（`ui-plugin-manager/README.md:34,156`）。
5. **分组三：Installed plugins**：位于 Experimental plugins 下方，列出 profile 中其他 bundle；安装携带的可选 bundle 没有 uninstall；Experimental 包在两个列表都保留 Experimental 标记（`ui-plugin-manager/README.md:34`）。
6. **Installed / Discover tabs**：页面自带 Installed tab；其他插件可用 `plugins.tab` 追加 Discover 等 tab；选中 tab 在离开 Plugins 后保留；tab 页替换分组内容并隐藏页面自带 Refresh / Add plugin（`ui-plugin-manager/README.md:38,122-125`；`slot-catalog.ts:3837-3891`）。
7. **Refresh / Add plugin**：Refresh 读取列表后逐个检查 registry 安装 bundle 的新版本；手动刷新期间 spinner + disabled，至少 400ms 防闪烁；失败保留缓存并 toast。`Add plugin` 有主按钮和独立箭头菜单，菜单可含第三方安装与 agent 创建插件动作（`ui-plugin-manager/README.md:50,52-61`；`slot-catalog.ts:3432-3482`）。
8. **卡片与详情**：卡片/详情显示当前语言的标题与描述，回退到包根 `package.json`；图标来自 manifest `icon` / `./icon` / `<subpath>/icon`，缺失则用默认图；OS 不兼容显示原因且禁用开启；问题 bundle 显示 problem tag（`ui-plugin-manager/README.md:40,48,83`）。
9. **bundle 开关与 row 开关**：bundle switch 改变 layer selection，操作期间 disabled + spinner，永久预留 22px；row switch 只在 bundle 开启时出现，调用 `pluginManager.setPluginEnabled` 写入 `cordis.patch.yml`，并显示 Host fiber phase 状态标记；超过 10 行给过滤器（`ui-plugin-manager/README.md:81-87`）。
10. **Versions 更新检查**：registry 安装的第三方 bundle 详情页在 rows 下方有 Versions；打开页面检查一次，可 `Check again`；摘要行显示 checking / up to date / update available / 需 DSH 升级 / failed；可展开逐版本行，`Update` 打开确认框；失败安装按策略保留或恢复已安装版本（`ui-plugin-manager/README.md:73-79`）。
11. **首次加载骨架屏**：第一次读取列表显示短分组标题占位 + 4 张骨架卡，沿用真实卡片行、图标、文本行间距，操作区空白；与 Session search 相同 opacity pulse，reduced motion 下静态；refresh 保留既有列表（`ui-plugin-manager/README.md:46`）。
12. **窄屏与响应式**：<768px 页面使用 20px 水平 inset 与 conversation header 对齐；头部宽度变窄时 Refresh / Add plugin 先变图标按钮，tabs 收缩，必要时 action group 换行；触屏不留 hover 态，输入框 coarse pointer 下 16px face（`ui-plugin-manager/README.md:30,38`）。

### 2.4 本文覆盖的槽位（12 个）

下表槽位定义均可由生成的 `CLIENT_SLOT_API` 逐项核对；除标明外均为 root scope，并共享标准 props：`useRemoteAccess`、`useResource`、`useContextMenu`、`useWorkspaces`、`usePanelInfo`、`useSessionStatus`、`useSessions`、`useSessionRetainInfo`、`useSessionAccess`、`useWorkspaceAccess`（`slot-catalog.ts:3364-3377` 等）。

| # | 槽位 | kind / key | 在本文中的作用 | 源码 |
|---|---|---|---|---|
| 1 | `main` | keyed / `plugins` | PluginManagerPage 所在全局主面板 | `slot-catalog.ts:3351-3390`；`ui-plugin-manager/src/client/index.ts:132-157` |
| 2 | `sidebar.panellist` | list / `plugins` | 侧栏 Plugins 项 | `slot-catalog.ts:5082-5134`；`ui-plugin-manager/src/client/index.ts:184-190` |
| 3 | `settings.section` | list / `plugins` | Settings → Plugins 跳转项 | `slot-catalog.ts:4560-4615`；`ui-plugin-manager/src/client/index.ts:176-182` |
| 4 | `plugins.add.actions` | list / 自有 id | Add plugin 菜单额外动作，本插件可不注册 | `slot-catalog.ts:3432-3482` |
| 5 | `plugins.bundle.activation` | keyed / 包名 | 用户显式启用后的引导，本轮不画 | `slot-catalog.ts:3485-3525` |
| 6 | `plugins.bundle.config` | keyed / 包名 | bundle 级配置，插在描述与 rows 之间，仅 `view:'page'` | `slot-catalog.ts:3528-3572` |
| 7 | `plugins.detail.actions` | list / 自有 id | 详情页头部、switch/uninstall 前 | `slot-catalog.ts:3575-3625` |
| 8 | `plugins.detail.badge` | list / 自有 id | 标题旁、版本/Experimental/problem 标签之后 | `slot-catalog.ts:3628-3680` |
| 9 | `plugins.detail.section` | list / 自有 id | 详情页自有内容之后的扩展 section | `slot-catalog.ts:3683-3733` |
| 10 | `plugins.item` | list / 官方 id | 官方插件配置卡；bundle 配置不应放这里 | `slot-catalog.ts:3736-3791` |
| 11 | `plugins.row.config` | keyed / `<包名>#<row id>` | row 的 Configure 配置页 | `slot-catalog.ts:3794-3834`；`ui-plugin-manager/README.md:92,102` |
| 12 | `plugins.tab` | list / 自有 id | Installed 之后的 tab，如 Discover | `slot-catalog.ts:3837-3891` |

`plugins.bundle.config` 的 owner props 是 `view: 'summary' | 'page'` 与可选 `form?: ConfigPageForm`；`summary` 只渲染一行文字或 inline nodes，`page` 渲染带保存控件的表单（`slot-catalog.ts:3541-3543`；`ui-plugin-manager/README.md:90-102`）。`plugins.row.config` 的 key 必须按 `<package name>#<row id>`，且 bundle patch 必须声明对应 row id，否则 Configure 不会出现（`slot-catalog.ts:3797-3798`；`ui-plugin-manager/README.md:102`）。只有保存才写入；离开页面时 staged edits 被丢弃；页面负责 title、icon、crumb，表单可复用 `ConfigField`，Host 提供 `form.state` 与 `form.mutate(operations, expectedRevision)`（`ui-plugin-manager/README.md:92,152-156`）。冲突写会刷新最新 Host 值并保留草稿（`vendor/deepseek-harness/packages/client/ui-settings/README.md:30-36`）。

## 3. dsh-harmony 在 Plugins 面板中的位置

### 3.1 卡片

- 所在列表：mock 假设 `dsh-harmony` 是 profile 已安装 bundle，位于 **Installed plugins**；同时因本轮要求显示 Experimental 标记。实际标记仅来自 `EXPERIMENTAL_BUNDLES`，当前 workspace 未提供该名单 → **未证实**；mock 仍按需求画出（`ui-plugin-manager/README.md:34,156`）。
- 名称：`dsh-harmony`（`plugin/src/index.ts:7`）。
- 版本：`0.1.0`（`plugin/src/config.ts:102`；`docs/design/03-contracts.md:49-52` 的 `current` 示例同值）。
- 描述：mock 假值“Harmony 移动端安全访问网关与配对管理插件”。源码未导出插件展示描述 → **未证实**。
- 图标：默认 artwork；源码未提供 manifest `icon` / `./icon` → **未证实**（`ui-plugin-manager/README.md:40`）。
- 操作区：bundle switch（由 PluginManagerPage 拥有，`ui-plugin-manager/README.md:81-84`）+ `Configure`。源码证明 row config 或 settings.section 被认领时会出现 Configure（`ui-plugin-manager/README.md:92,104`），但**未证实** bundle 卡片本身必有 Configure；本轮 mock 按需求画出，标注为 demo 入口。
- 状态标签：可出现 `Experimental`、`Update available`（若 registry 检查发现更新）、`problem tag` / `not-running tag`（若 Host 报告问题）；分别见 `ui-plugin-manager/README.md:77,83,156`。

### 3.2 详情页 section 顺序

1. **头部**：标题 `dsh-harmony`；副标题为完整包名（mock 假值 `dsh-harmony`，真实 npm 包名未证实）；版本 `0.1.0`；Experimental / problem / not-running tags；`plugins.detail.actions` 与 `plugins.detail.badge` 贡献位（`ui-plugin-manager/README.md:34,83,106-108`）。
2. **bundle detail document**：bundle 自己的长文档，作为第一个 section 且无单独标题；Markdown + 图片；加载中 3 行骨架；读取失败给出原因 + Retry；不读 bundle 声明的 repository（`ui-plugin-manager/README.md:42`）。
3. **bundle 配置**：`plugins.bundle.config`，key 为包名；位于描述与 rows 之间；`view:'page'` 渲染表单（`slot-catalog.ts:3528-3532`；`ui-plugin-manager/README.md:92`）。
4. **组件 rows**：列出 bundle patch 声明的 row；每行有 switch、fiber phase 状态标记；>10 行显示过滤器；配置 row 的 `Configure` 打开 row 页（`ui-plugin-manager/README.md:85-87,92,102`）。
5. **Source**：rows 之后；显示 `pnpm add` 可接受的 spec 或 `Built in`，再显示当前版本（`ui-plugin-manager/README.md:83`）。
6. **Versions**：仅 registry 安装的 bundle 显示；对本插件是否适用**未证实**（本地/link/git/tarball 与 Official bundle 不显示，`ui-plugin-manager/README.md:75`）；mock 按需求显示。
7. **`plugins.detail.section` 扩展区**：自有 section chrome；对不感兴趣的 subject 返回 null；按 `order` 排序（`ui-plugin-manager/README.md:106-118`）。

### 3.3 配置入口与 view 形态

- Bundle-level 配置直接在详情页内联显示：网关与 origin、工作区路径、白名单、CA、远程通道、版本监控。
- Row-level 配置通过 `Configure` 进入独立配置页：配对管理、已配对设备列表；row 页存在的前提是 `plugins.row.config` 注册了对应 `<包名>#<row id>`（`ui-plugin-manager/README.md:118`）。
- `view:'summary'`：卡片或缺省描述处的一行摘要；`view:'page'`：完整表单 + 保存控件（`slot-catalog.ts:3542`）。本轮所有配置分区以 `page` 为主，`summary` 只作为卡片/row 摘要态。

## 4. 配置表单分区（8 个）

> key 规则：`plugins.bundle.config` 使用包名（mock key `dsh-harmony`，真实 npm 包名未证实）；`plugins.row.config` 使用 `<包名>#<row id>`。row id `pairing` / `devices` 为本轮 mock id，bundle patch 是否声明 → **未证实**（`ui-plugin-manager/README.md:102`）。
> 字段命名：契约响应字段严格使用 `03-contracts.md` 的 camelCase；HarmonyConfig 输入字段使用 `plugin/src/types.ts` 的 camelCase；不引入 snake_case。

### 4.1 网关与 origin

| 项 | 内容 |
|---|---|
| slot / key | `plugins.bundle.config` / `dsh-harmony` |
| view | `page` |
| 控件与字段 | `host` 文本（默认 `0.0.0.0`）；`port` 数字（默认 `3443`）；`origin` 只读推导 + 可编辑，格式 `https://host:port`；`upstreamOrigin` 只读展示 Host `@ 3080`（来自 `ctx.webServer.getOrigin()`）；`tls.certFile` / `tls.keyFile` 只读路径；`maxRequestBytes` / `upstreamTimeoutMs` 高级项 |
| 校验 | `port` 必须整数 1–65535；`origin` 必须绝对 `https://host:port`、显式端口、无 path/query/fragment/userinfo；`tls.certFile` 与 `tls.keyFile` 必填；插件从不生成私钥（`plugin/src/config.ts:28-40,84-122`；`plugin/src/server.ts:23-34`；`docs/design/03-contracts.md:15-24`） |
| 保存 | staged edits + `Save`；走宿主表单写路径或 Host API（具体 Remote 名未证实）；成功后显示 saved timestamp，失败保留草稿（`ui-plugin-manager/README.md:92,152-156`；`ui-settings/README.md:30-36`） |
| 状态变体 | 正常、端口非法、origin 非法、TLS 路径缺失、保存冲突 |

### 4.2 移动工作区路径

| 项 | 内容 |
|---|---|
| slot / key | `plugins.bundle.config` / `dsh-harmony` |
| view | `page` |
| 控件与字段 | `dshHome` 文本（默认 `$DSH_HOME` 或 home）；`ca.anchorCertFile` 文本；派生只读路径：`mobile-access/certs/ca/ca.crt`、`mobile-access/certs/server/server.crt`、`mobile-access/certs/server/server.key` |
| 行为 | 路径解析来自 `resolveDshHome()` / `mobileAccessDir()` / `defaultServerCertPaths()` / `defaultAnchorCertPath()`；`SENSITIVE_KEY_PATHS` 仅声明，不可编辑私钥内容（`plugin/src/workspace.ts:6-49`；`plugin/src/types.ts:51-63`） |
| 保存 | `Save` 写入 `dshHome` 与 `ca.anchorCertFile`；路径变更后即时重算派生只读路径；实际文件读写由 Host 完成（未证实具体服务名） |
| 状态变体 | 正常、路径不可读、指纹模式缺 anchor、保存冲突 |

### 4.3 配对管理

| 项 | 内容 |
|---|---|
| slot / key | `plugins.row.config` / `dsh-harmony#pairing` |
| view | `page` |
| 控件与字段 | `Generate pairing code` 主按钮；结果展示 `v`、`pairingKey`、`origin`、`expiresAt`、`caFingerprint`；二维码/链接文本 `dshpair://v1/<base64url>`；倒计时与 `Regenerate` |
| 真值 | PC 端进程内 API 生成一次性 key，M3 无独立签发 HTTP 端点；payload 是 `PairingKeyPayload` 的 base64url，以 `dshpair://v1/` 开头；`caFingerprint` 为锚证书 DER 的 SHA-256、64 位小写 hex（`docs/design/03-contracts.md:41-47,60-68`；`plugin/src/state.ts:75-90`；`plugin/src/config.ts:18-26`） |
| 保存 | 不是普通表单保存：点击生成即调用进程内 `createPairingKey()`；浏览器桥接方式**未证实**；一次性 key 5 分钟 TTL，过期或消费后显示 consumed/expired（`plugin/src/constants.ts:13-14`；`plugin/src/state.ts:92-99`） |
| 状态变体 | 未生成、生成中、有效倒计时、已消费/已过期、CA 锚变更导致不可再用 |

### 4.4 已配对设备列表

| 项 | 内容 |
|---|---|
| slot / key | `plugins.row.config` / `dsh-harmony#devices` |
| view | `page` |
| 字段 | 列表列：`deviceId`、`name`、`platform`、`origin`、`reachable`、`lastSeenAt`；操作 `Revoke` |
| 行为 | `GET /mobile/devices` 仅回环读；`DELETE /mobile/devices/:deviceId` 回环 + `Authorization` + `X-Device-Id`；撤销后目标 token 立即作废；`reachable` 是 token 有效/撤销推导的逻辑在线，不是实时心跳（`docs/design/03-contracts.md:28-39,74-76,161`；`plugin/src/state.ts:101-127,180-191`） |
| 保存 | 列表自动刷新；`Revoke` 需二次确认；确认成功后就地移除/标记；失败显示错误码与 message |
| 状态变体 | 有设备、空列表、加载中、撤销确认、撤销失败、reachable=false |

### 4.5 白名单

| 项 | 内容 |
|---|---|
| slot / key | `plugins.bundle.config` / `dsh-harmony` |
| view | `page` |
| 字段 | `trustedProxies: string[]`（tag 输入）；`allowUsers: string[]`（tag 输入）；`userHeader` 文本 |
| 行为 | `GET /mobile/whitelist` 回环读；`PUT /mobile/whitelist` 同结构、回环 + `Authorization` + `X-Device-Id`；默认 `trustedProxies: []`、`allowUsers: []`、`userHeader: 'x-forwarded-user'`；空 `allowUsers` 表示不做用户门禁（`docs/design/03-contracts.md:78-80`；`plugin/src/types.ts:38-49`；`plugin/src/state.ts:204-218,233-239`） |
| 保存 | `Save` 原子提交三项；成功后回显服务端最新值；`WHITELIST_DENIED` 时保留草稿并显示字段级错误 |
| 状态变体 | 正常、空数组、字段类型错误、保存中、保存失败、并发冲突 |

### 4.6 CA 状态与轮换警示

| 项 | 内容 |
|---|---|
| slot / key | `plugins.bundle.config` / `dsh-harmony` |
| view | `page` |
| 字段 | `active.caFingerprint`、`active.notBefore`、`active.notAfter`、`active.status`、`retired[].retiredAt` |
| 行为 | `GET /mobile/ca` 只返回指纹与元数据，禁返私钥 / CSR / CA 证书本体；`POST /mobile/ca/leaf/rotate` 锚不变、token 不失效、App 免重配对；`POST /mobile/ca/rotate` 返回新 `caFingerprint`、`newOrigin`、`rePairRequired: true`，旧 pin/token 全失效，全员重新扫码（`docs/design/03-contracts.md:93-99,159-160`；`plugin/src/gateway.ts:174-210`；`plugin/src/state.ts:193-202`） |
| 保存 | leaf rotate：普通危险确认；CA rotate：强警示确认框，必须明确列出 `rePairRequired` 后果；当前实现是 stub，真实证书操作 TODO，必须在 UI 标注 mock / 未证实（`plugin/src/config.ts:57-60,78-80`；`plugin/src/gateway.ts:191,202`） |
| 状态变体 | active、fingerprint-only 元数据缺失、leaf rotate 确认、CA rotate 强警示、轮换中、轮换失败 |

### 4.7 远程通道开关

| 项 | 内容 |
|---|---|
| slot / key | `plugins.bundle.config` / `dsh-harmony` |
| view | `page` |
| 控件 | `Proxy /mobile/api/**` switch、`WebSocket /mobile/ws` switch；只读显示首帧鉴权要求与 `GATEWAY_WS_PATH` |
| 行为依据 | 契约定义 `/mobile/api/**` 转发到 Host(3080)，`WS /mobile/ws` 首帧发 `token` + `deviceId`；成功后进入契约事件流（`docs/design/03-contracts.md:82-85,101-117`；`plugin/src/server.ts:58-69,101-125`；`plugin/src/constants.ts:6`） |
| 保存 | **未证实**：`HarmonyConfig` 没有对应开关字段（`plugin/src/types.ts:65-86`），契约也没有配置端点；mock 只保留本地 staged 状态，不显示为已持久化 |
| 状态变体 | mock on/off、后端不支持、保存不可用、WS 鉴权失败提示 |

### 4.8 版本监控

| 项 | 内容 |
|---|---|
| slot / key | `plugins.bundle.config` / `dsh-harmony` |
| view | `page` |
| 字段 | `plugin.current`、`plugin.latest`、`plugin.url`、`plugin.sha256`、`plugin.required`；`app.current`、`app.latest`、`app.url`、`app.sha256`、`app.required`；只读 `dshVersion` |
| 行为 | `GET /mobile/version` 返回 plugin/app 两段；`GET /mobile/health` 返回 dshVersion；App 升级主通道是 App 直查 GitHub Release，网关 `app` 段仅作已配对电脑缓存参考；`required: true` 时 App 显示强制升级并阻断连接（`docs/design/03-contracts.md:56-59,87-91,135,137-140`；`plugin/src/types.ts:30-36`） |
| 保存 | 无保存；`Check again` 重新读取；发现新版本进入 Versions 更新确认流程（`ui-plugin-manager/README.md:73-79`） |
| 状态变体 | up to date、update available、required update、check failed、checking |

## 5. 关键流程串接

1. **进入配置页并保存反馈**
   1. 用户在 DSH Web SPA 左侧栏选择 **Plugins**，main keyed panel 切到 `plugins`（`ui-plugin-manager/src/client/index.ts:132-157,184-190`）。
   2. 页面顶部先显示 client sync 状态条；主列表按 Built-in plugin settings / Experimental plugins / Installed plugins 分组渲染（`ui-plugin-manager/README.md:34,36`）。
   3. 用户点击 `dsh-harmony` 卡片打开详情页；详情文档先加载，随后看到 bundle 配置、rows、Source、Versions（`ui-plugin-manager/README.md:42,75,83,92`）。
   4. 修改 `port`、`origin`、白名单等字段，点击 `Save`。
   5. 保存中按钮 disabled + spinner；成功显示 saved timestamp，失败保留 staged edits；并发冲突时刷新 Host 值但保留草稿（`ui-plugin-manager/README.md:92,152-156`；`ui-settings/README.md:30-36`）。

2. **生成配对码 → 手机扫码 → 设备出现在配置页**
   1. 在详情页 row `pairing` 点击 `Configure`，打开 `plugins.row.config` key `dsh-harmony#pairing` 的 page 表单（`slot-catalog.ts:3794-3798`）。
   2. 点击 `Generate pairing code`，生成 `PairingKeyPayload`：`v`、`pairingKey`、`origin`、`expiresAt`、`caFingerprint`（`plugin/src/state.ts:75-90`）。
   3. UI 展示 `dshpair://v1/<base64url>` 与二维码，倒计时 5 分钟；说明一次性、过期后需重新生成（`docs/design/03-contracts.md:41-47`；`plugin/src/constants.ts:13-14`）。
   4. 手机扫码后 `POST /mobile/pair` 携带 `pairingKey`、`deviceName`、`platform`；服务端校验 CA 指纹、注册设备、消费 key，返回 `deviceId`、`token`、`issuedAt`、`expiresAt`、`caFingerprint`（`docs/design/03-contracts.md:60-68`；`plugin/src/gateway.ts:221-255`）。
   5. 用户打开 `dsh-harmony#devices` 的 Configure 页；列表新增一条 `deviceId` / `name` / `platform` / `reachable` / `lastSeenAt` 记录（`docs/design/03-contracts.md:28-33,74-76`）。

3. **CA 换锚 `rePairRequired` 强警示**
   1. 用户在 CA section 点击 `Rotate CA anchor`。
   2. 弹出危险确认：列出当前 `caFingerprint`、新 `newOrigin`、`rePairRequired: true`，说明旧 pin/token 全失效、所有设备需重新扫码（`docs/design/03-contracts.md:93-99`）。
   3. 确认后调用 `POST /mobile/ca/rotate`；mock 返回新 `caFingerprint`、`newOrigin`、`rePairRequired: true`（`plugin/src/gateway.ts:198-210`）。
   4. 页面切到 CA 强警示态：`devices` 列表全部 `reachable=false`；配对码区提示旧码不可再用；提供“Generate new pairing code”主操作（`plugin/src/state.ts:193-202`）。
   5. 必须标注当前实现为 stub，真实 CA 生成与双 Origin 重叠窗口尚未完成（`plugin/src/config.ts:57-60`；`plugin/src/gateway.ts:202`）。

4. **Versions 发现新版本 → 更新确认**
   1. 打开 `dsh-harmony` 详情页时，Versions section 向 Host 请求一次新版本；可点 `Check again`（`ui-plugin-manager/README.md:75`）。
   2. 摘要行显示 checking / up to date / update available / need DSH update / failed；发现更新时展开逐版本行，含 dist-tags、prerelease/deprecated、发布日期与 `Update`（`ui-plugin-manager/README.md:75-77`）。
   3. `Update` 打开确认框：显示 installed version、target version、registry；说明失败安装会保留或重装已安装版本（`ui-plugin-manager/README.md:79`）。
   4. 更新中显示 Host 报告的步骤；结果态区分“新版本运行 / 等待重启 / 目标被拒 / 卸载失败 / 安装失败后已回滚 / 回滚失败导致未安装”（`ui-plugin-manager/README.md:79`）。
   5. 对 `dsh-harmony` 是否为 registry 安装并获得 Versions section：**未证实**；mock 按需求展示（`ui-plugin-manager/README.md:75`）。

5. **插件未启用 / 同步失败时的降级**
   1. Bundle switch 关闭时，row switch 与 `plugins.row.config` 的 Configure 不出现；注册随浏览器半卸载而消失（`ui-plugin-manager/README.md:87,102`；`slots.md:21-29`）。
   2. client sync 失败时仍显示状态条，但 Host enablement 不变；点击 `Retry this page` 调用 `ctx.modules.entries.retry()`（`ui-plugin-manager/README.md:36`；`ui-plugin-manager/src/client/index.ts:143-144`）。
   3. 列表读取失败且已有缓存时保留列表并 toast；首次读取失败显示 in-place message + Retry（`ui-plugin-manager/README.md:50`）。

## 6. 下游 mockup 子代理 checklist

### 6.1 必须画出

- [ ] DSH 三栏 `AppFrame`：左侧栏、主区、右侧栏 track；侧栏 Plugins 项处于选中态（`ui-layout/README.md:10-12,30-38`；`ui-plugin-manager/src/client/index.ts:184-190`）。
- [ ] Plugins 页头部：标题、副标题、信息按钮、Refresh、Add plugin；窄屏时 Refresh/Add plugin 先退化为图标按钮（`ui-plugin-manager/README.md:34,38,50-61`）。
- [ ] 页面 body 顶部的 client sync 状态条：syncing 文案与 failure 通知样例（`ui-plugin-manager/README.md:36`）。
- [ ] 分组标题与卡片：Built-in plugin settings、Experimental plugins、Installed plugins；`dsh-harmony` 卡片含名称、版本 `0.1.0`、描述、Experimental、switch、Configure（`ui-plugin-manager/README.md:34,40`；`plugin/src/index.ts:7`；`plugin/src/config.ts:102`）。
- [ ] 首次加载骨架屏示意：短分组标题占位 + 4 张骨架卡，操作区空白（`ui-plugin-manager/README.md:46`）。
- [ ] 详情页：detail document 区、bundle config 区、rows + Configure、Source、Versions、`plugins.detail.section` 扩展区（`ui-plugin-manager/README.md:42,75,83,92,106-118`）。
- [ ] 8 个配置分区的真实字段：尤其 `deviceId`、`lastSeenAt`、`trustedProxies`、`allowUsers`、`userHeader`、`caFingerprint`、`rePairRequired`、`current/latest/url/sha256/required`（`docs/design/03-contracts.md:28-52,74-99`）。
- [ ] 危险确认两级样式：普通 `Revoke` / leaf rotate 确认，CA rotate 的 `rePairRequired` 强警示确认（`docs/design/03-contracts.md:93-99,159-160`）。
- [ ] `<768px` 行为说明：20px 水平 inset、侧栏 drawer、不预留侧栏列、卡片操作区点击态不留 hover（`ui-plugin-manager/README.md:30,38`；`ui-layout/README.md:30,34`）。
- [ ] 所有视觉使用 DSH 主题变量语义，不写死颜色；实现侧用 `React.createElement` + `styles.insert` + `var(--dsw-*)`（`slot-catalog.ts:76`）。

### 6.2 必须避免

- [ ] 不要画独立后台标题栏、独立 logo、独立一级导航、独立路由壳；Plugins 是 DSH SPA 的 main panel（`ui-layout/README.md:36-38`；`slot-catalog.ts:3351-3390`）。
- [ ] 不要自造“网关总览 / 配对 / 设备 / 白名单 / CA / 版本”六域后台导航；它们是 Plugins 页内的配置分区或 row 配置页。
- [ ] 不要伪造 CSS Module 类名或假设能 import 设计系统组件；浏览器半不能 import，必须用 `React.createElement` + `styles.insert`（`slot-catalog.ts:76`）。
- [ ] 不要注册到未声明槽位；所有 `plugins.*` 注册必须由 `main[plugins]` 的 children 声明承载并用 `ctx.slots.inject` 包裹（`ui-plugin-manager/src/client/index.ts:146-157`；`slot-catalog.ts:74`）。
- [ ] 不要传 `priority`，不要覆盖 shipped 的 `conversation` main key（`(slot-catalog.ts:75)`；`ui-layout/README.md:36`）。
- [ ] 不要把 `plugins.item` 当作 bundle 配置入口；bundle 配置必须用 `plugins.bundle.config`（`slot-catalog.ts:3740,3528-3532`）。
- [ ] 不要画私有 CA 私钥、CSR、CA 证书本体；端点只返回指纹与元数据（`docs/design/03-contracts.md:95`）。
- [ ] 不要把 `reachable` 画成实时心跳；它是逻辑在线状态（`docs/design/03-contracts.md:33`）。
- [ ] 不要把网关 `app` 段版本画成升级判据；App 直查 GitHub Release（`docs/design/03-contracts.md:91,140`）。

## 7. 状态变体表（10 个）

| # | 状态 | 触发 | 视觉 / 行为 | 源码 |
|---|---|---|---|---|
| 1 | 正常已加载 | 列表和 bundle 详情读取成功 | 卡片、分组、switch、Configure、rows、Source、Versions 全部就位 | `ui-plugin-manager/README.md:34,40,75,83,92` |
| 2 | 加载骨架 | 首次列表读取 | 短分组标题占位 + 4 张骨架卡；操作区空白；pulse，reduced motion 静态 | `ui-plugin-manager/README.md:46` |
| 3 | 插件未启用 | bundle switch off | row switch / Configure 不出现；配置注册随浏览器半卸载 | `ui-plugin-manager/README.md:87,102`；`slots.md:21-29` |
| 4 | client sync 同步中 | `ctx.modules.entries.state` running | `Syncing plugins on this page…`；Retry disabled | `ui-plugin-manager/README.md:36`；`ui-plugin-manager/src/client/index.ts:143-144` |
| 5 | client sync 失败 | entries fail | `data-client-sync-failure` 通知；逐条 `id: message`；`Retry this page` | `ui-plugin-manager/README.md:36` |
| 6 | 配置错误 | port/origin/TLS/白名单字段非法 | 字段级错误；Save disabled 或提交被拒；草稿保留 | `plugin/src/config.ts:28-40,84-98`；`plugin/src/state.ts:204-218`；`ui-settings/README.md:34` |
| 7 | 危险确认 | Revoke 设备 / leaf rotate | 普通确认框；显示影响对象；可取消 | `docs/design/03-contracts.md:74-76,96-97` |
| 8 | CA 强警示 | `POST /mobile/ca/rotate` 前 | 显示 `rePairRequired: true`、新 `caFingerprint`、`newOrigin`；旧 token/pin 失效；全员重配 | `docs/design/03-contracts.md:98-99,159-160`；`plugin/src/gateway.ts:198-210` |
| 9 | 版本更新 | Versions 发现可安装新版 | `Update available` 徽标；详情 `Update to`；确认框 + 步骤进度 + 结果态 | `ui-plugin-manager/README.md:73-79` |
| 10 | 同步失败但列表可用 | 非首次 Refresh 失败 | 保留缓存列表；failure toast；再次 Refresh 重试 | `ui-plugin-manager/README.md:50` |

## 8. 未证实清单（供实现前核对）

- `dsh-harmony` 的真实 npm 包名、bundle patch、row id `pairing` / `devices` 是否声明 → 未证实；当前 mock 使用 `dsh-harmony` 与假 row id。
- `dsh-harmony` 是否进入 `EXPERIMENTAL_BUNDLES` → 未证实；本轮按需求画 Experimental。
- 卡片本身是否提供 Configure，取决于 settings.section / row 认领关系；当前源码只证明 row/config 与 settings.section 会提供 Configure（`ui-plugin-manager/README.md:92,104`）。
- 浏览器半调用 `createPairingKey()` / devices / whitelist / CA 的具体 Host Remote 名称 → 未证实；`plugin/src` 只给出进程内 API 与 HTTP 路由。
- `HarmonyConfig` 无“远程通道开关”字段；`plugin/src/types.ts:65-86` 未声明，契约也无配置端点 → 未证实。
- `POST /mobile/ca/rotate` 当前为 stub，真实证书生成与双 Origin 重叠窗口未完成（`plugin/src/gateway.ts:202`；`plugin/src/config.ts:57-60`）。
- `dsh-harmony` 是否 registry 安装从而显示 Versions section → 未证实（`ui-plugin-manager/README.md:75`）。
