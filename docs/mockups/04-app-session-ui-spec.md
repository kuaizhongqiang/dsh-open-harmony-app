---
读者: HTML 实现子代理（阶段 B，仅重写 app-mockup.html 的 P3）
类型: ui-spec
权威: 高（事实源自 vendor/deepseek-harness 只读源码；画法取舍以负责人 2026-11-23 结论为准）
状态: v1.0（P3 会话列表与导航 UI 规格，可照此直接画图）
依赖: docs/plan/plan-app-ui-redo-2026-11-23.md
---

# P3 会话列表与导航 UI 规格（App Mockup / DSH 事实版）

> 本文只写画图规格，不写 HTML/CSS 实现代码，不改 `vendor/deepseek-harness`。视觉只用 `--dsw-*` token 名描述。凡源码未直接覆盖、由 mockup 取舍的地方一律标「推测」或「mockup 决策」。

## 0 证据与纪律

### 0.1 来源缩写（源码均已逐行核对）

| 缩写 | 源文件 | 覆盖内容 |
|---|---|---|
| `[SB]` | `packages/client/ui-sidebar/src/client/SidebarRoot.tsx:299-445` | 侧栏自上而下结构、新会话按钮、底部设置区 |
| `[SBC]` | `packages/client/ui-sidebar/src/client/SidebarRoot.module.css:245-565` | 品牌行/按钮尺寸与 token |
| `[LOC]` | `packages/client/ui-sidebar/src/client/locales.ts:7-8,24-25` | 「新会话 / New Session」文案 |
| `[ROWS]` | `packages/client/ui-workspace/src/client/rows/Rows.tsx:287-374,568-679` | 会话行 DOM、状态点、置顶、空白行 |
| `[RCSS]` | `packages/client/ui-workspace/src/client/rows/Rows.module.css:2-352` | 行高、槽宽、字号、hover/触屏、归档色 |
| `[WB]` | `packages/client/ui-workspace/src/client/rows/WorkspaceBrowser.tsx:1231-1346` | 会话区 header（搜索/分组/添加工作区） |
| `[COL]` | `packages/client/ui-layout/src/client/columns.ts:11-31` | 抽屉断点 768、侧栏默认/夹取宽度 |
| `[FRAME]` | `packages/client/ui-layout/src/client/AppFrame.tsx:170-175,288-341` | 无底部导航 Tab、抽屉遮罩、三列布局 |
| `[SD]` | `packages/client/ui-primitives/src/StateDot.tsx` + `StateDot.module.css` | 状态点尺寸/颜色/动画 token |
| `[RT]` | `packages/client/ui-primitives/src/relative-time.ts` + `ui-workspace/src/client/locales.ts:114-138` | 相对时间分桶与中文文案 |
| `[SET]` | `packages/client/ui-settings-general/src/client/SettingsRoot.tsx:34-43,123-249` | 设置面板、remote-connection/plugins 分区、触发齿轮 + 连接状态点 |
| `[THEME]` | `docs/mockups/dsh-theme.css` | 所有 `--dsw-*` token 的实际取值 |

### 0.2 三条纪律

1. **只用 `--dsw-*` token** 描述颜色/圆角/背景；不新造 token、不写十六进制色值。需要的 token 均已在 `[THEME]` 中确认存在（如 `--dsw-radius-md=12px`、`--dsw-alias-state-warn-primary`、`--dsw-alias-button-elevated-fill` 等）。
2. **事实与决策分离**：源码有的照写；mockup 为窄屏做的取舍明确标「推测 / mockup 决策」，不伪装成源码事实。
3. **不画底部 Tab**：这是负责人明确要求且源码证实（见第 1、6 节）。

---

## 1 结论摘要（先记住这四条，再动手）

1. **DSH 无底部导航 Tab**。`[FRAME]` 的 AppFrame 只有 `sidebar / center / rightbar` 三列（`grid-template-columns` 见 :295-297）与一个通用 `shell.bottom` 槽（:325-327，承载状态提示类内容，**不是**「会话/设备/设置」导航）。因此 P3 **不得**出现任何底部 Tab 条。
2. **全局导航在左侧栏**：自上而下顺序由 `[SB]` 固定为 —— 品牌行 → 新会话按钮 → 全局面板列表（Plugins 等）→ 工作区会话区 → 底部设置区。
3. **新会话按钮在侧栏顶部**，紧接品牌行下方，38px 高，含图标 + 「新会话 / New Session」+ 快捷键提示（`[SB]:351-377`）。
4. **会话行是单行**，无副标题：16px 前导状态点槽 + 单行省略标题（14/20）+ 尾部相对时间（10/16），hover/触屏时时间换 More 操作（`[ROWS]:625-679`、`[RCSS]:122-225`）。

---

## 2 手机端（390×844 外壳）布局方案

### 2.1 核心思路（mockup 决策，符合源码语义）

手机宽 390 < 768（`SIDEBAR_DRAWER_BREAKPOINT`，`[COL]:21`）。源码行为是：侧栏不再占独立列，而是以**抽屉**覆盖主内容（`[FRAME]:172,312-318` 的 `drawerMask` + `sidebarCol`）。

为了让 P3「会话列表」在静态 mockup 里可读，采用**主方案 + 抽屉变体**：

- **主方案（P3 默认帧）**：把会话列表页本身画成「DSH 侧栏的内容」——用侧栏形态**占满整个 390×844 屏幕**（侧栏宽度即屏宽）。序列完全按 `[SB]` 的侧栏顺序。这样一屏就能展示「新会话按钮 / Plugins / 会话行 / 底部设置」全部导航事实。
- **抽屉变体（状态变体之一）**：体现 `<768px` 的真实规则——主区是聊天内容，侧栏从**左侧滑入**成为覆盖抽屉（宽约 320px，`推测`，源码 `sidebarWidth` 由状态注入），右侧 remainder 盖半透明遮罩（`[FRAME]:312-313` 的 `drawerMask`）。抽屉内仍是下面 B1–B6 的完整序列。

### 2.2 区块表（主方案，自上而下；内部命名 B1–B6 供实现者对齐）

| 区块 | 名称 | 高度（390×844） | 位置与内容 |
|---|---|---|---|
| **B1** | 品牌行 | **60px**（固定，顶部） | 左右内边距约 8–12px（`推测`）。左侧：品牌 mark（24px，`sidebar.brand.mark`）+ 品牌名（`sidebar.brand.name`）。右侧：面板/收起切换图标按钮（`[SB]:299-348`、`[SBC]:245-256`）。视觉：无底色，文字用 `--dsw-alias-label-primary`。源注释明确 macOS 下品牌行兼作拖拽区，mockup 不需表现拖拽。 |
| **B2** | 新会话按钮带 | **52px**（固定） | 按钮本体 38px 高，上下留白合计约 14px；`margin-bottom: 6px`（`[SBC]:438`）。按钮规格见第 3 节。宽接近满屏（左右各留约 12–16px，`推测`）。 |
| **B3** | 全局面板列表 | **约 108px**（固定；3 项 ×36px，`推测`） | 顶部小标题「全局面板 / Global panels」（`panels.label`，`[LOC]:11,28`）。其下为 32–36px 行高的面板项，每项前导图标 + 文本：**Plugins**（全局面板项，见第 6 节）；可再列「归档会话」等，数量按 mockup 需要（`推测`）。首项常驻 `FIXED_PANEL_ID`（`[SB]:385-402`），末项可为「更多 / More」（`panels.more`）。选中项用 `--dsw-alias-interactive-bg-hover` 底。 |
| **B4** | 会话区 header | **40px**（固定） | 左：分组标题「会话」（flat 时 `section.sessions`）或「工作区」（`section.workspaces`，`[WB]:1233-1238`）；右：搜索图标按钮、视图选项、添加工作区按钮（`[WB]:1239-1327`）。图标按钮 14–16px，颜色 `--dsw-alias-label-tertiary`。 |
| **B5** | 会话列表 | **flex 剩余空间，可滚动** | 工作区文件夹组行 + 会话行（第 4 节）逐行 32px 堆叠；滚动区可带底部渐隐 `scrollFade`（`[SB]:429`）。此区是 mockup 主要信息密度区。 |
| **B6** | 底部设置栏 | **48px**（固定，贴底） | 设置齿轮按钮 + 连接状态点（`[SB]:436-444` 的 `footArea`；`[SET]:233-249` 的 `triggerRow`）。点击在 mockup 中「点开设置面板」（见第 6.3 节）。用一条极淡分隔或与列表拉开 6px 间距（`推测`）。 |

> 高度合计：60+52+108+40+48 = 308px，B5 滚动区约 536px，可容纳约 16 行 32px 会话行，足够展示各类状态。

### 2.3 抽屉变体画法要点

- 侧栏抽屉宽度约 **320px**（`SIDEBAR_MIN=264`、`SIDEBAR_MAX=420` 之间取值，`[COL]:13-15`；具体值 `推测`）。
- 抽屉内 B1–B6 序列不变，仅宽度收窄；会话行标题省略更早触发。
- 抽屉右侧为半透明遮罩（`drawerMask`，`[FRAME]:312-313`）；点击遮罩关闭（`推测` 为 mockup 交互）。
- 顶部提供一个可见的「打开侧栏 / 收起侧栏」入口来表达切换（`toggle.open` = 「打开侧边栏」，`[LOC]:9,26`）。

---

## 3 新建会话按钮规格（B2）

| 属性 | 值 | 依据 |
|---|---|---|
| 文案（zh / en） | **新会话 / New Session** | `[LOC]:7,24`（按钮可见文字用 `session.new`；tooltip/aria 用 `session.new.label` = 新建会话 / New session） |
| 图标 | `IconNewChatOutlineMedium`，size **14**（宽屏）；收起态为 `IconNewChatOutlineRegular` 16/18 | `[SB]:363-367` |
| 高度 | **38px** | `[SBC]:452`、`[SB]` 按钮 `className=newSession` |
| 内边距 | `8px 12px`，`box-sizing: border-box` | `[SBC]:453-455` |
| 圆角 | `--dsw-radius-md`（=12px） | `[SBC]:457`、`[THEME]:20` |
| 边框 | `0.5px solid --dsw-alias-border-l3` | `[SBC]:456` |
| 背景（默认） | `--dsw-alias-button-elevated-fill` | `[SBC]:458` |
| 背景（hover） | `--dsw-alias-button-floating-hover` | `[SBC]:467-470` |
| 文字色 / 字号 | `--dsw-alias-label-primary`；14px / 22px / weight 500 | `[SBC]:459-462` |
| 快捷键提示 | 右侧显示 **⌘ N**（mac）/ **Ctrl N**（Windows）；hover 或 focus 时显现 | `[SB]:369-371`、`[SBC]:547-562` |
| 图标与文字间距 | 6px | `[SBC]:544`（`newSessionContent` gap） |

**点击行为（必须在 mockup 里可见反馈）**：在会话列表（B5）**最顶部插入一条空白「新会话」草稿行并选中它**（选中底色 `--dsw-alias-interactive-bg-hover`）。草稿行规格见第 4.3 节。事实依据：按钮调用 `openNewSession`（`[SB]:340,361`），负责人结论明确「点击插入一条空白『新会话』草稿行并选中」（计划文档第 1 项）。

---

## 4 会话行规格（B5 主体）

### 4.1 单行会话行

| 部位 | 规格 | 依据 |
|---|---|---|
| 整体 | **单行**，`height: 32px`，flex，`align-items: center`，圆角 `--dsw-radius-md`，左右内边距约 `0 8px`（起始侧含 sidebar row padding + 工作区缩进） | `[RCSS]:2-14,123-126` |
| 前导槽 | **16px 宽 × 20px 高**，居中放状态点；无状态时留空。**不画副标题** | `[ROWS]:625-629`、`[RCSS]:132-140` |
| 标题 | `font-size: 14px; line-height: 20px`，`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`（单行省略），`flex: 1` | `[RCSS]:181-188,206-208` |
| 标题右边距 | 与尾部时间留约 12px（`margin: 0 12px 0 --dsh-sidebar-label-gap`） | `[RCSS]:128-130` |
| 尾部时间 | `font-size: 10px; line-height: 16px`，颜色 `--dsw-alias-label-tertiary`；文案档位见 4.2 | `[RCSS]:219-225`、`[RT]` |
| hover / 触屏 | **时间隐藏，换成 More（…）操作图标**（`contextMenu.button`）；键盘 focus 时也显示 | `[ROWS]:667-678`、`[RCSS]:266-345` |
| hover 底色 | `--dsw-alias-interactive-bg-hover`；标题省略号在 hover 时改为 `clip`（marquee 效果，`推测` 在静态 mockup 用省略即可） | `[RCSS]:303-324` |
| 选中态 | 底色 `--dsw-alias-interactive-bg-hover`，`aria-selected=true` | `[ROWS]:573,577`、`[RCSS]:24-26` |
| 置顶图钉 | `IconPinFillRegular`，size **14**，颜色 `--dsw-alias-label-caption`，位于时间之后、行尾之前，左边距 6px；仅非归档行显示；hover/触屏时让位给 More 而隐藏 | `[ROWS]:661,366-374`、`[RCSS]:227-236,295-297,333-344` |

### 4.2 尾部相对时间文案

时间由 `relativeTime` 分桶（`now / minutes / hours / days / months / years`，`[RT]`），zh locale 给出「刚刚 / {n}分钟 / {n}小时 / {n}天 / {n}个月 / {n}年」（`[RT]` locales 114-138）。

**mockup 展示档位（负责人指定）**：依次画 **刚刚 → 5分钟 → 昨天 → 星期二 → 10月1日**（从新到旧的 5 行样例）。其中「昨天/星期二/10月1日」属于绝对日期式表达，源码仅有相对分桶（无「星期X/月日」字面量）——标为 `推测`：mockup 展示层对 ≥1 天的行做了绝对化，不必在源码里找对应字符串。

**warning 行的时间位被替换**：待审批/计划待审/待回答时，尾部时间**不显示时间**，改显示紧凑状态文案（见第 5.2 节 trailingLabel），颜色仍 `--dsw-alias-label-tertiary`（`[ROWS]:653-659`）。

### 4.3 空白「新会话」草稿行

- 前导槽**空**（`!row.blank` 守卫使状态点不渲染，`[ROWS]:626`）；
- 标题显示 **「新会话 / New Session」**（14/20，省略）；
- **无尾部时间、无操作图标、无图钉**（`[ROWS]:652,667` 均以 `!row.blank` 为条件）；
- 处于选中态（`--dsw-alias-interactive-bg-hover`）。

### 4.4 工作区文件夹组行

- 单行约 **32px**（`推测`：源码给出 `.projectRow .rowActions { height:20px }` 但未直接给出行高常量，`[RCSS]:118-120`）；
- 前导：**展开三角** `IconTriangleRightFillRegular` + **文件夹图标** `IconFolderCloseRegular / IconFolderOpenRegular`（关闭/打开态，`[ROWS]:16-18`）；
- 中部：工作区名（14/20，可省略）+ 会话计数（caption 色，`推测`）；
- hover：文件夹图标 ↔ chevron 互换、右侧显 More / 新建会话操作（`[ROWS]:1-10` 文件头注释描述 folder→chevron hover 互换）；
- 分组行本身可选中/展开，视觉层级与会话行区分（`推测`：组行文字用 `--dsw-alias-label-secondary`，会话标题用 `--dsw-alias-label-primary`）。

### 4.5 归档态

- 归档行标题颜色降为 **`--dsw-alias-label-caption`**（`[RCSS]:242-247`）；
- 前导槽**留空**（`row.archived` 守卫，`[ROWS]:626`），实时状态只在 hover card 显示；
- 「归档筛选」打开时，列表只显示归档行且标题为 caption 色（`[WB]:1300-1306` 的 `archivedFilter` 由视图选项控制）。

---

## 5 状态点视觉表（前导 16px 槽内）

`StateDotState` 联合为 `done / warning / ongoing / error / idle`（`[SD]:9`）；`sessionStatuses` 把会话情况映射为该状态（`[ROWS]:298-352`）。槽内只画**主状态点**（`statuses[0]`，`[ROWS]:355-363`）。

| 会话情况 | 状态 | 视觉 | token | 依据 |
|---|---|---|---|---|
| 运行中 / running | `ongoing` | **14px 旋转环**：浅色 0.25 透明整环 + 呼吸弧段，连续旋转 1.5s linear；静态 mockup 画「环 + 一段高亮弧」即可 | 环色 `--dsw-alias-label-tertiary`（`[SD]:39`） | `[SD]:50-66`；**注**：需求方括注 `--dsw-alias-state-*`，但源码 spinner 实际取 `label-tertiary`——以源码为准，括注视为泛指状态色族（`推测`） |
| 待审批 / 计划待审 / 待回答 | `warning` | **琥珀圆点**，默认 10px 槽、内芯约 6px | `--dsw-alias-state-warn-primary` | `[ROWS]:314-339`、`[SD]:21-23`；`[THEME]:335` |
| 未读（含子智能体完成提醒） | `done` | **绿圆点** | `--dsw-alias-state-success-primary` | `[ROWS]:340-343`（done 状态对应 `status.unread`）、`[SD]:17-19`；`[THEME]:331` |
| 运行出错 / failed | `error` | **红圆点** | `--dsw-alias-state-error-primary` | `[ROWS]:340-341`、`[SD]:25-27`；`[THEME]:328` |
| 空闲 / idle | `idle` | **不画点**（留空槽） | —— 见下方注记 | 负责人规格：「idle=不画点」 |
| 其他中性 | `idle`（源码） | 源码实际渲染 10px 灰点 | `--dsw-alias-state-idle-primary` | `[ROWS]:351`、`[SD]:30-32`；`[THEME]:330` |

> **idle 注记（事实 vs 决策）**：源码对完全空闲的会话返回 `idle` 并**确实渲染一个 10px 灰点**（`--dsw-alias-state-idle-primary`，很淡）。负责人规格要求「idle=不画点」。本 mockup **按负责人规格：idle 留空不画点**；此为 `mockup 决策`，与源码有差异，已在此标明，不视为源码事实。

### 5.1 多状态优先级（画单行时只取一个点）

`sessionStatuses` 优先级：**pending（warning）> running（ongoing）> 子智能体运行（ongoing）> 完成/未读（done/error）> idle**（`[ROWS]:344-351`）。即一行同时有「待审批 + 未读」时，前导槽画**琥珀点**。

### 5.2 warning 的 trailingLabel（替换行尾时间）

| pending 类型 | 完整标签（hover card） | 行尾紧凑标签 |
|---|---|---|
| approval 待审批 | 等待审批 | **待审批** |
| plan-review 计划待审 | 计划待审 | **计划待审** |
| question 待回答 | 等待回答 | **待回答** |

依据：`[ROWS]:314-339`、`[RT]` locales 118-123。

---

## 6 「设备 / 设置 / Plugins」新位置（删掉底部 Tab 之后）

### 6.1 Plugins —— 全局面板项

Plugins **不是**底部 Tab，而是侧栏「全局面板」列表（B3）中的一项，位置在**新会话按钮下方**（`[SB]:385-402` 的 `panelList`）。画法：面板行（32–36px）+ 插件图标 + 文本「Plugins / 插件」（`推测` 中文文案），与「归档会话」等面板项并列。设置面板里也有 `plugins` 分区（`[SET]:39` 的 navIcon 映射），二者语义一致。

### 6.2 设置 —— 侧栏底部齿轮 + 连接状态点

设置入口是 **B6 底部设置栏**的齿轮按钮（`IconSettingsOutlineMedium`）+ 连接状态指示器（`[SB]:436-444`；`[SET]:233-249` 的 `triggerRow`）。连接状态点复用状态点 token：`connected` 不额外画异常点；`connecting/disconnected/recovered` 分别对应amber/红/绿反馈（`[SET]:216-223`、`ConnectionIndicator`）。mockup 默认画「已连接」的绿点或低调配色（`推测`）。

### 6.3 网关 / 设备 —— 归入设置的 remote-connection 分区（语义映射）

- **语义映射说明**：负责人原「设备」Tab 在 DSH 里没有独立导航项；其承载的**网关/远程连接/配对**内容，源码位于设置面板的 **`remote-connection` 分区**（`[SET]:41` 的 `navIcon('remote-connection')` = `IconRemoteConnectionOutlineMedium`；实现在 `packages/client/remote-connection/src/client/RemoteConnectionSettings.tsx` / `RemoteConnectionSection.tsx`）。因此 mockup 中把「设备/网关」**画进设置面板的 remote-connection 分区**，作为一项设置项，不再单独占导航位。这是负责人要求的内容重排（计划文档第 2 项），非源码的「设备 Tab」。
- **设置面板画法（中心模态）**：设置齿轮点击后弹出居中模态面板（`role=dialog`，`[SET]:59-115`）：
  1. 左侧/顶部为分区导航条（accounts / models / plugins / archived-sessions / **remote-connection** 等，`[SET]:34-43`）；
  2. 右侧/下侧为当前分区内容；切到 **remote-connection** 时画「网关地址 / 连接状态 / 配对请求」等条目（`推测` 具体内容，图标用 `IconRemoteConnectionOutlineMedium`）；
  3. 顶部有关闭按钮（`IconCloseOutlineRegular`，`[SET]:105-108`），遮罩点击 / Esc 关闭（`[SET]:54-57`）。
- **手机 mockup 里如何点开设置面板**：在 B6 点齿轮按钮 → 模态面板出现。`<768px` 时面板**铺满视口**、分区导航从竖排变为**横向条带**（`[SET]:3-5` 文件注释明确「below 768px the panel fills the viewport and the rail turns into a horizontal strip」）。这是手机端设置面板的规范画法。

---

## 7 状态变体清单（≥6，给出 8 个；实现者按需分帧）

| # | 变体名 | 画面要点 |
|---|---|---|
| V1 | 默认 | B1–B6 齐全；若干会话行（标题+时间+状态点），无 Tab |
| V2 | 新会话按钮点击后 | B5 顶部多一条选中态空白草稿行「新会话」，无时间无操作（4.3 节） |
| V3 | running | 某行前导 14px 旋转环（5 节 ongoing），时间仍显示 |
| V4 | warning / 待审批 | 某行前导琥珀点，**行尾时间替换为「待审批」**（5.2 节） |
| V5 | 未读 + 失败 | 一行绿点（未读）、一行红点（failed），对比展示 |
| V6 | 空白列表 | B5 区无会话行（仅有全局面板与 header），留白；可画轻提示文案（`推测`） |
| V7 | 归档筛选 | B5 只显示归档行，标题 caption 色、前导槽空（4.5 节） |
| V8 | 窄屏抽屉 | 主区聊天内容 + 左侧滑入 320px 侧栏抽屉 + 遮罩，抽屉内为 B1–B6（2.3 节） |

---

## 8 给 HTML 实现者的 checklist 与验收关键词

### 8.1 必须画（MUST）

- [ ] 侧栏形态的会话列表占满手机屏：品牌行 / 新会话按钮 / 全局面板 / 会话区 / 底部设置栏，顺序与第 2.2 节 B1–B6 一致。
- [ ] 侧栏顶部 38px「新会话 / New Session」按钮：图标 + 文字 + ⌘/Ctrl N，token 按第 3 节。
- [ ] 点击新会话按钮出现选中态空白草稿行（第 4.3 节）。
- [ ] 会话行单行 32px：16px 状态点槽 + 14/20 省略标题 + 10/16 尾部时间；无副标题。
- [ ] 5 类状态点：running 环 / warning 琥珀 / unread 绿 / failed 红 / idle 空；warning 行时间替换（第 5 节）。
- [ ] Plugins 作为新会话按钮下方的全局面板项（6.1 节）。
- [ ] 底部齿轮 + 连接状态点；点击弹出设置模态，含 remote-connection 分区（6.2–6.3 节）。
- [ ] 置顶图钉、归档 caption 色、工作区文件夹组行（第 4.4–4.5 节）。
- [ ] hover/触屏时时间换 More 图标（第 4.1 节）。
- [ ] 所有视觉只用 `--dsw-*` token。

### 8.2 不要画（MUST NOT）

- [ ] **不要**底部「会话 / 设备 / 设置」Tab 条，也不要任何等价的底部导航（源码无此结构）。
- [ ] **不要**把「设备/网关」画成独立导航项；它属于设置里的 remote-connection（6.3 节）。
- [ ] **不要**把 Plugins 画成底部 Tab 或浮动按钮；它是侧栏全局面板项。
- [ ] **不要**给会话行加副标题/摘要第二行（源码行 DOM 只有单行标题）。
- [ ] **不要**用自造色值或非 `--dsw-*` 的视觉变量；不要写调试串（sessionId=、Message{ 等）。
- [ ] **不要**在空白草稿行上画时间、More 操作或状态点。
- [ ] **不要**把 idle 画成显眼的点（本 mockup 决策：留空）。

### 8.3 六个验收关键词

1. **新会话按钮**（38px、token、快捷键、点击反馈）
2. **无底部 Tab**（导航只在侧栏）
3. **侧栏结构**（B1–B6 顺序）
4. **单行会话行**（32px、状态点 + 标题 + 时间、无副标题）
5. **状态点**（running 环 / warning / unread / failed / idle）
6. **设置与远程连接**（底部齿轮 → 设置模态 → remote-connection；Plugins 在全局面板）
