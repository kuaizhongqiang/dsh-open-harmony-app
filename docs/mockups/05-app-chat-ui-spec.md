---
读者: HTML 实现子代理（阶段 B，仅重写 app-mockup.html 的 P4）
类型: ui-spec
权威: 高（事实逐行核对 vendor/deepseek-harness 只读源码；与任务书表述冲突处以源码为准并显式标注）
状态: v1.0（P4 聊天 / composer / goal-plan UI 规格，可照此直接画图）
依赖: docs/plan/plan-app-ui-redo-2026-11-23.md、docs/mockups/03-dsh-style-guide.md、docs/mockups/dsh-theme.css
---

# P4 聊天区 + Composer Stack + Goal/Plan/Todo/审批 UI 规格（DSH 事实版）

> 本文只写**画图规格**，不写 HTML/CSS 实现代码，不改 `vendor/deepseek-harness`。所有颜色、圆角、阴影、背景只用 `--dsw-*` / `--dsh-*` token 名描述（取值见 `[THEME]`）。源码未覆盖、为 390×844 手机 mockup 做的取舍一律标「**mockup 决策**」。

## 0 证据、纪律与覆盖清单

### 0.1 来源缩写（下列源码均已逐行核对）

| 缩写 | 源文件（相对 `vendor/deepseek-harness/`） | 覆盖内容 |
|---|---|---|
| `[UB]` | `packages/client/ui-primitives/src/UserMessageBubble.module.css:1-11` | 用户气泡本体 |
| `[AM]` | `packages/client/ui-chat/src/client/chat/AssistantMarkdown.module.css:1-22,86-91` | 助手全宽正文、块间距、tail 偏移 |
| `[MI]` | `packages/client/ui-chat/src/client/chat/MessageItem.module.css:1-21,78-98,306-358` | 用户右对齐、附件行、文件卡、context 行 |
| `[IA]` | `packages/client/ui-chat/src/client/chat/MessageIconActions.module.css:1-10,63-72` | 28px 操作行 |
| `[RR]` | `packages/client/ui-chat/src/client/chat/ReasoningRow.tsx:49-112` + `ReasoningRow.module.css:1-77` | Think 折叠行 |
| `[TR]` | `packages/client/ui-tool/src/client/tool/components/ToolRow.tsx:332-479` + `ToolRow.module.css:1-7,165-172,247-256,316-377` | 工具行、六类展开卡、失败态 |
| `[EB]` | `packages/client/ui-tool/src/client/tool/components/ExitCodeBadge.tsx` + `.module.css` | 退出码胶囊（中性 Tag + 红点） |
| `[QD]` | `packages/client/ui-conversation/src/client/queue/QueueDock.tsx:106-391` + `QueueDock.module.css:1-249` | 排队 dock |
| `[RS]` | `packages/client/ui-chat/src/client/chat/RunningStatus.tsx:25-48` + `ChatView.module.css:218-279` | 鲸尾 + shimmer 运行态 |
| `[GB]` | `packages/client/ui-goal/src/client/GoalBar.tsx:130-173` + `GoalBar.module.css:19-73` | Goal 36px 横条 |
| `[TD]` | `packages/client/ui-conversation/src/client/skeleton/TodoPanel.tsx:65-99` + `TodoPanel.module.css:1-125` | Todo 折叠条 |
| `[PC]` | `packages/client/ui-plan/src/client/PlanModeControl.module.css:9-24` | 蓝色「计划」chip |
| `[PL]` | `packages/client/ui-plan/src/client/PlanCard.tsx:43-60` + `PlanPreview.module.css:1-31` | 消息尾计划卡 |
| `[PR]` | `packages/client/ui-user-questions/src/client/PlanReviewPanel.tsx:29-89` + `PlanReviewPanel.module.css:1-88` | 计划待审 takeover |
| `[AP]` | `packages/client/ui-approval/src/client/ApprovalCard.tsx:53-93` + `ApprovalPanel.module.css:1-39,155-196` | 审批 takeover |
| `[CF]` | `packages/client/ui-deliverables/src/client/ChangedFiles.tsx:30-106` + `ChangedFiles.module.css:1-43` | 已编辑文件卡 |
| `[DL]` | `packages/client/ui-deliverables/src/client/Deliverables.module.css:1-19` | 交付文件两列卡 |
| `[IMG]` | `packages/client/ui-attachment/src/MessageImage.tsx:31-46,71-101,173-180` + `MessageImage.module.css:1-44` | 单图 240 / 多图 64 方砖 |
| `[STK]` | `packages/client/ui-conversation/src/client/skeleton/ConversationRoot.module.css:419-444,512-520` | composer stack 6px 间距、dock 宽度 |
| `[COL]` | `packages/client/ui-layout/src/client/columns.ts:11-31` | 右栏宽度约束、抽屉断点 768 |
| `[THEME]` | `docs/mockups/dsh-theme.css` | `--dsw-*` token 实际取值 |
| `[LOC]` | 各包 `src/client/locales.ts` / `locale.ts` | 中文文案原文 |

### 0.2 三条纪律

1. **助手没有气泡**。`[UB]` 只描述用户消息；`[AM]` 明确助手是 full-width narration。任何「助手气泡 / 头像 / 角色标签」都是错误发明。
2. **事实优先于任务书措辞**。任务书把「正在深入分析」「Think」作为示意写法；源码中文实际是「深度求索中」「思考」，实现用源码文案（英文口径 Deep diving / Think 可保留在 en 态）。composer 顺序亦按源码注册顺序校正，见 §6.1。
3. **queue 不是消息、approval 不是消息**。二者分别属于 composer dock 与 composer overlay，绝不进入消息流。

### 0.3 覆盖块数：**18 块**（实现者按此清单自检）

| # | 块 | 章节 | # | 块 | 章节 |
|---|---|---|---|---|---|
| 1 | 顶部栏（返回/标题/状态小字） | §2 | 10 | 文件卡 240×64 | §3.6 |
| 2 | 消息滚动区 | §2 | 11 | system/developer/context 24px 折叠行 | §3.7 |
| 3 | composer stack（含输入栏/Goal/Todo/Plan chip） | §2、§6 | 12 | 消息尾 Plan 卡 60px | §3.8 |
| 4 | 右侧栏抽屉 | §2 | 13 | 消息尾 Changed Files 卡 | §3.9 |
| 5 | 用户消息右气泡 + 28px 操作行 | §3.1 | 14 | 消息尾 Deliverables 两列卡 | §3.10 |
| 6 | 助手全宽正文 + turn-tail 操作行 | §3.2 | 15 | QueueDock 排队 dock | §4 |
| 7 | Think 折叠行 | §3.3 | 16 | 运行态鲸尾 + shimmer | §5 |
| 8 | 工具行 + 六类展开卡 | §3.4 | 17 | Approval composer takeover | §7.1 |
| 9 | 图片（单张/多张） | §3.5 | 18 | PlanReview composer takeover | §7.2 |

---

## 1 结论摘要（最重要，动手前先背下这 5 条）

1. **DSH 只有用户消息是右对齐圆角气泡**。气泡本体：背景 `--dsw-specific-bubble`（浅色 `--dsw-static-deepseek-50` = `rgb(237,243,254)`；深色 `--dsw-static-neutral-bluish-850` = `rgb(44,44,46)`）、圆角 `--dsw-radius-xl` = **20px**、内边距 **10px 16px**、正文 14/22、颜色 `--dsw-alias-label-primary`、`white-space: pre-wrap`。宽度上限 `min(内容列宽 × 0.702, 82%)`，右对齐（`[UB]`、`[MI]:1-21`）。
2. **助手是「全宽、无背景、无边框、无圆角、无头像、无左右分栏」的 Markdown 正文**。14/24，块间 `--dsh-assistant-block-gap: 16px`，颜色 `--dsw-alias-label-primary`；正文下方 16px 才接 28px turn-tail 操作行。**「助手气泡」这种东西不存在**（`[AM]`）。
3. **Think / 工具 / context 都是 24px disclosure 折叠行**，展开后才是卡片；不是气泡里的内文。工具行固定全宽单行 `[16px 图标] gap6 [13/24 标题] gap8 [2×2 点] gap8 [摘要省略]`，展开卡统一相对行首**左缩进 4px**（`[RR]`、`[TR]`）。
4. **队列在输入框正上方，贴住输入卡**，是 `--dsw-specific-menu` 面板、上圆角 `--dsw-radius-lg`=16px、0.5px `--dsw-alias-border-l1` 无下边；>1 条时默认折叠成「2 条排队消息 ▴」。queued 消息不进消息流（`[QD]`）。
5. **Goal / Todo / 计划 chip 属于 composer stack；审批与计划待审是 composer takeover 覆盖卡**（`[GB]`、`[TD]`、`[PC]`、`[AP]`、`[PR]`）。Plan 模式同时影响三处：输入栏蓝色 chip、消息尾 60px 计划卡、右侧栏 Markdown。

---

## 2 手机聊天页布局（390×844 外壳）

### 2.1 四区自上而下

| 区 | 名称 | 高度 | 位置与画法 |
|---|---|---|---|
| **A** | 顶部栏 | **56px 固定**（mockup 决策） | 左：返回箭头 28px 圆形热区；中：会话标题 14/20 `--dsw-alias-label-primary`，下一行状态小字 11/16 `--dsw-alias-label-tertiary`（如「空闲 / 等待审批 / 计划待审」，文案取自 `[LOC]` 的 workspace 状态词典）；右：更多/侧栏开关 28px。底部 0.5px `--dsw-alias-border-l1`。无底部 Tab（见 P3 规格）。 |
| **B** | 消息滚动区 | **flex 剩余空间，可滚动** | A 与 C 之间；左右各留 16px（mockup 决策；源码内容列宽由 `--dsh-chat-content-width` 控制，`[STK]:512-520`）。消息块按 §3 逐块堆叠：相邻消息 16px；同一 turn 内 process 行（Think/工具/context）之间 **4px**；助手正文与其 tail 之间 **16px**（`[AM]`、`ChatView.module.css:89-98`）。滚动到底部时，最后一条有输出的内容块与运行态之间才显示分隔线（`[RS]`）。 |
| **C** | composer stack | **吸附底部（sticky bottom: 0）** | 由四层组成，详细顺序与间距见 §6。默认只有输入卡时约 **96px**（mockup 决策：文本区 48 + 底部工具行 40 + 8 内边距）；有 Goal + Todo + QueueDock 时最高约 96+36+36+36=204px + 间距，消息区相应压缩。 |
| **D** | 右侧栏抽屉 | **关闭 / 宽 320px 覆盖**（mockup 决策） | 源码右栏 `RIGHTBAR_MIN=300`、首次打开为帧宽 45%，<768px 侧栏走抽屉（`[COL]`）。手机上从右侧滑入覆盖 B，宽 **320px**（300–420 区间取值），左侧余区盖半透明遮罩；抽屉内自上而下：标题条 48px + 内容区（Plan Markdown 14/1.75，内边距 20px 24px 40px；变更评审 diff 红删绿增；交付预览）。默认态不画，只在「Plan 模式开 / 已提交计划 / 变更评审」变体里画（`[PL]:37-43`）。 |

### 2.2 消息流纵向节奏（给实现者的对齐尺）

- 用户 turn：气泡 → 6px → 28px 动作行（`[MI]:3-8` 的 `gap: 6px`）。
- 助手 turn：process 行（Think/工具/context）逐条 4px → 正文块间 16px → 16px → tail 28px。
- 音频视觉上**不加**任何卡片底色、边框、左侧竖线或头像占位。

---

## 3 逐种消息块画法

> 每块固定给出「结构 / 文案 / 尺寸 / token / 不要画错的点」。

### 3.1 用户消息右气泡 + 28px 操作行

- **结构**：右对齐列 → 气泡（内含文本，附件行在其上或气泡内末尾）→ 下方 6px 操作行。
- **文案**：用户输入原文；操作行从左到右 = 时间（如「10:42」）+ 复制 + 分支/重试图标（图标 14px，28px 热区）。
- **尺寸**：气泡 max-width `min(0.702 × 内容列宽, 82%)`；padding **10px 16px**；radius **20px**（`--dsw-radius-xl`）；正文 **14/22**；操作行 **28px**，图标热区 28px、radius `--dsw-radius-sm`=8px（`[IA]`）。
- **token**：背景 `--dsw-specific-bubble`；文字 `--dsw-alias-label-primary`；时间 `--dsw-alias-label-secondary`；图标 `--dsw-alias-label-tertiary`；hover `--dsw-alias-interactive-bg-hover`。
- **不要画错**：不要左对齐；不要给助手用同一气泡；不要圆角写成 12/16px；不要超过 82%；不要在气泡里塞「User / 用户」角色标签。

### 3.2 助手正文（全宽）+ turn-tail 操作行

- **结构**：全宽文字列 → Markdown 段落 / 列表 / 粗体 / 代码块 → 16px 后接 tail 操作行。无外层容器背景。
- **文案**：答复正文；tail = 时间 + 复制 + 重新生成 + 分支 + 用量/反馈图标（按 mockup 需要取 3–5 个）。
- **尺寸**：**14/24**（`--dsh-content-font-size` + `--dsh-content-font-delta`）；块间距 **16px**；tail 行 **28px**，相对正文左边缘光学偏移 −6px；tail 上边距 **16px**（`[AM]:86-91`）。
- **token**：正文 `--dsw-alias-label-primary`；tail 图标 `--dsw-alias-label-tertiary`；代码/链接沿用既有 Markdown token（`--dsw-alias-markdown-code-block` 等）。
- **不要画错**：**不画气泡底色、不画边框、不画圆角、不画头像、不画「Assistant / 助手」标签、不做左右分栏**；不要把 tail 贴到正文最后一行（必须留 16px）；不要闪烁光标（运行态见 §5）。

### 3.3 Think 折叠行

- **结构**：单行 disclosure：前导三角/思考图标 → `思考` → 2×2 分隔点 → 摘要首行（省略号）→ 右侧运行状态 shimmer；展开后标题吸顶，正文在其下。
- **文案**：`▸/▾ 思考 · 摘要首行…`（英文 `Think · …`；摘要取正文首行的已完成段落，去掉 `**`）。
- **尺寸**：折叠行 **24px**；展开标题 `position: sticky; top: 0`；正文左缩进 **22px**，上下各 4px，**13/20**，单行省略。
- **token**：标题 13/24 常规字重、颜色 `--dsw-alias-label-tertiary`；分隔点 `--dsw-alias-label-caption`；吸顶标题背景 `--dsw-alias-bg-base`；摘要 `--dsw-alias-label-tertiary`；展开正文 13/20 三级灰。
- **不要画错**：不要把 Think 画成正文里的灰段落；不要默认展开（折叠是默认）；不要展开时丢掉吸顶标题；摘要不要多行。

### 3.4 工具行 + 展开卡

- **结构**：全宽单行 `[icon] Bash · 描述 …` → 点击展开后，卡片相对行首**左缩进 4px**。
- **文案**：标题为工具名（`Bash` / `Read` / `Edit` / `Search` / `Web` 等），摘要为描述/参数；失败时摘要换成失败首行 + 红点胶囊「退出码 N」（英文 `exit code N`；无正常退出为「未正常退出」）。
- **尺寸**：单行 **24px**；前导图标 16px、gap 6px、标题 13/24、点 2×2、摘要单行省略；展开卡 `margin-left: 4px`，radius `--dsw-radius-lg`=16px，0.5px `--dsw-alias-border-l1`。IN/OUT 通用卡为 `max-content + 1fr` 两列、column-gap 14px、字号 `--dsw-font-markdown-code-block-small`。
- **六类展开卡（每种都要能画）**：
  1. **terminal**：命令横幅置顶（不随输出滚动）+ 状态点 + 输出区；输出最大高 224px、行高 18px、命令 `pre-wrap`；失败时红点 + 「退出码 N」胶囊。
  2. **diff**：红删绿增行，沿用代码等宽 token；失败时下面补红色 output 段。
  3. **read**：带行号的读取窗口，等宽 13/18。
  4. **search**：按文件分组的匹配列表 / 路径列表；被截断时在卡下方 13px 三级灰补一行恢复定位文案。
  5. **web**：答案摘要 + 引用/来源列表。
  6. **image**：图片缩略图组 + 完整路径与尺寸行（等宽小字）。
  - 补充（源码存在，mockup 可只留占位）：通用 IN/OUT 卡、code 高亮块、askQuestion 卡、details + Inspect 按钮。
- **token**：失败摘要 `--dsw-alias-state-error-primary`；停止摘要 `--dsw-alias-state-warn-label`；退出码胶囊用中性 Tag 底 + **红点** `--dsw-alias-state-error-primary`；一般卡面 `--dsw-alias-markdown-code-block`；恢复文案 `--dsw-alias-label-tertiary`。
- **不要画错**：工具行不是 28px 也不是气泡；展开卡不能与行首齐平（要 4px 缩进）；失败不要只变红字而漏掉退出码胶囊；不要给 terminal 画闪烁光标。

### 3.5 图片

- **结构**：附件行右对齐（用户）/ 左对齐（工具结果）；单张按长边 240px 自适应，多张为方砖网格。
- **文案**：无需文字；失败砖显示 12/18 的重试提示；工具图片卡下方显示路径与「宽×高 · 字节数」。
- **尺寸**：单图长边 **240px**（宽高比钳制 0.25–4，`object-fit: cover`，不放大）；多图 **64×64 方砖**，gap 10px；圆角 `--dsw-radius-xl`=20px；边框 0.5px `--dsw-alias-border-l2-darkmode-thin`。
- **token**：砖底 `--dsw-alias-interactive-bg-hover`；说明 `--dsw-alias-label-tertiary`；失败底 `--dsw-alias-interactive-bg-hover-danger`。
- **不要画错**：不要把多图画成大小不一；不要 radius 16；用户图片不要左对齐。

### 3.6 文件（消息附件卡）

- **结构**：横卡：28px 文件图标 + 文件名（单行省略）+ 大小/元信息。
- **文案**：`文件名` + `12 KB · PDF` 之类。
- **尺寸**：**240×64px**（`min-height: 64px`），padding **8px 12px**，radius `--dsw-radius-lg`=16px，0.5px `--dsw-alias-border-l2`；文件名 14/22 500，元信息 12/15。
- **token**：背景 `--dsw-alias-input-major`（缺失时 transparent）；名 `--dsw-alias-label-primary`；元信息 `--dsw-alias-label-tertiary`。
- **不要画错**：不要 60px 高（那是交付卡）；不要把它画成队列里的文件 chip（queue chip 是 24px 高）。

### 3.7 system / developer / context 折叠行

- **结构**：一条 24px disclosure 行：16px 前导图标（context 用上下文/压缩图标，developer/system 用对应静态图标）+ 单行标题 + 摘要 + hover 时右侧 chevron。
- **文案**：如「上下文已压缩 · 检查点」「系统提示」「开发者指令」；摘要单行省略。
- **尺寸**：行高 **24px**（上下 padding 2px），前导槽 16px、margin-right 6px，radius `--dsw-radius-sm`=8px。
- **token**：文字 `--dsw-alias-label-tertiary`，hover `--dsw-alias-label-secondary` + `--dsw-alias-interactive-bg-hover`。
- **不要画错**：不要展开成大段正文；不要画成用户气泡或红色错误行；context 折叠行与 queue 无关。

### 3.8 消息尾：已提交 Plan 卡

- **结构**：整宽按钮卡：40px Markdown 图标砖 + 两行文字（标题 / `计划 · Markdown`）+ 右侧「打开」按钮。
- **文案**：标题取计划首行；副文案固定 **计划 · Markdown**；按钮 **打开**。
- **尺寸**：卡高 **60px**，padding 8px 10px，radius 16px，0.5px l1；图标砖 40×40、radius 10px；标题 13/20 500；副文案 10/16；按钮高 28px、radius 8px。多张卡之间 10px。
- **token**：卡面 `--dsw-alias-card-fill`（hover `--dsw-alias-card-fill-hover`）；砖底 `--dsw-alias-card-tile-fill`；副文案 `--dsw-alias-label-tertiary`；按钮底 `--dsw-alias-button-floating-fill`、描边 l3。
- **不要画错**：不要画成聊天消息气泡；不要少「打开」；不要和交付文件卡混淆。

### 3.9 消息尾：Changed Files 卡

- **结构**：卡头 60px（40px 图标砖 + 标题 + 统计）→ 文件行列表（默认最多 4 行）→ 底部「查看全部 N 个文件」折叠条。
- **文案**：标题 **已编辑 N 个文件**（单文件为「已编辑 xxx」）；统计 `+N`（绿）/ `-N`（红）；行内为文件路径 + 该文件 `+N/-N`；折叠条「查看全部 N 个文件 ▾」。
- **尺寸**：卡头 **60px**；文件行 min-height 24px、padding 7px 14px/18px，路径 12px、计数 11px 等宽；折叠条 12/18；卡圆角 16px，边框 0.5px l2。
- **token**：卡底 `--dsw-alias-bg-layer-1`，卡头 `--dsw-alias-card-fill`；新增 `--dsw-alias-state-success-primary`，删除 `--dsw-alias-state-error-primary`；砖底 `--dsw-alias-card-tile-fill`。
- **不要画错**：+/- 必须是绿/红且等宽；超过 4 行要折叠，不能无限拉长；单文件只画卡头不画列表。

### 3.10 消息尾：Deliverables 两列文件卡

- **结构**：区标题「交付文件」→ 两列网格文件卡（每张 40px 图标砖 + 文件名 + 描述），超过 4 张折叠。
- **文案**：文件名 + 描述/「在侧边栏预览」（hover）；「全部 N 个文件 ▾」。
- **尺寸**：网格 `repeat(2, minmax(0,1fr))`、gap 10px；单卡 **60px 高**、padding 8px 10px、radius 16px、0.5px l1；文件名 13/20 500，描述 10/16；窄于 620px 容器时退化为单列。
- **token**：卡面 `--dsw-alias-card-fill`；砖底 `--dsw-alias-card-tile-fill`、图标 `--dsw-alias-link`；描述 `--dsw-alias-label-tertiary`。
- **不要画错**：不要画成一整条 240×64 的消息附件卡；不要超过 4 张全展开；单文件时单列。

---

## 4 排队机制（QueueDock）

- **位置（最关键）**：画在**输入框正上方、贴住输入卡**，面板下沿**压进输入卡 3px**（视觉上连成一张表面），宽度比输入卡左右各内缩 8px dock inset；**绝不进入消息流**（`[QD]:1-26`）。
- **面板**：背景 `--dsw-specific-menu` + `--dsw-menu-backdrop-filter`；**上圆角 `--dsw-radius-lg`=16px、下方直角**；0.5px `--dsw-alias-border-l1`，**无下边框**；内部上下 padding 2px（`[QD]:28-59`）。
- **头部（仅 >1 条时出现）**：高 **36px**，`[排队图标] 2 条排队消息 ▴`；**默认折叠**，点击展开；折叠时若含未落定回显，头部尾部显示 `发送中…`。文案来自 `[LOC]`: `queue.count = {n} 条排队消息`、`queue.sending = 发送中…`。
- **行**：每条 **36px**；结构 = 24px 图片砖（radius `--dsw-radius-xs`=4px）/ 24px 文件 chip（radius 8px，16px 图标 + 文件名 + 10px 大小） + 单行省略预览 13px + 右侧 3 个 **28px 圆形**按钮（编辑 / 删除 / 插话发送）。行间 0.5px l1 内阴影分隔，列表最高 180px 可滚（`[QD]:113-232`）。
- **单条时**：不画头部，行首直接放排队图标。未落定（pending）行右侧显示三级灰 `发送中…`，三个操作按钮置灰 opacity 0.45。
- **语义边界（必须遵守）**：**queued 不出现在消息流**；**steering（插话）以用户气泡内联进正文**；**context 是折叠行**，三者互不混画。
- **不要画错**：不要给队列项画气泡底/头像/时间戳；不要画闪烁光标；不要把「发送中…」当作助手输出。

---

## 5 流式与运行态

- **结构**：正文末尾下方 → 4px 留白处一条 0.5px 分隔线 → 28px 内容行：鲸尾 icon（14px）+ shimmer 文案。
- **文案**：中文 **深度求索中** / 带计时 **深度求索中，用时 {duration} ···**；英文 **Deep diving / Deep diving for {duration} ···**（`[LOC]` 原文；任务书「正在深入分析…」为同义描述，实现用源码文案）。数字用等宽数字。
- **尺寸**：内容行 **28px**、gap 6px、margin-top 4px；字号 12px（正文 14−2）、行高 22px；分隔线在行上方 **4px** 处，0.5px，颜色为 `--dsw-alias-border-l1` 与 `--dsw-alias-border-l2` 的 75%/25% 混合（`[RS]`）。
- **token**：文字 `--dsw-alias-label-deep-diving`；shimmer 高亮 `--dsw-alias-label-deep-diving-shimmer`；鲸尾用当前色。
- **中断后**：把 shimmer 行替换为 **11px「已停止」小胶囊**（高 18px、radius 8px、`--dsw-alias-state-warn-label` 文字、极淡 warn 底）；工具行停止态摘要同样为「已停止」但用 13px warn 色。
- **不要画错**：**不要闪烁光标 / 竖线光标**；不要每帧改变布局高度；不要把运行态画成用户气泡；分隔线只在最后一条有输出的内容块后出现。

---

## 6 Composer Stack（自下而上的准确顺序与间距）

### 6.1 顺序校正（重要）

任务书第 6 条列举了「输入栏 / Goal / Todo / QueueDock」四块，全部保留；但其中 QueueDock 依第 4 条与源码必须**紧贴输入卡上方**，因此**权威顺序**按源码注册顺序（`todo=0 → goal=10 → queue=20 → inputBar`，`[STK]`）：

**自下而上**：输入栏 → **QueueDock** → Goal 36px 横条 → Todo 折叠条 → 消息区底部留白 8px。
**自上而下**：Todo → Goal → QueueDock → 输入栏。

### 6.2 间距表

| 相邻关系 | 间距 | 依据 |
|---|---|---|
| 各 dock 卡之间 | **6px** | `[STK]:421-429` 的 stack gap |
| QueueDock → 输入卡 | **−3px（下沿压进输入卡 3px）** | `[QD]:19-25` 负 margin 抵消 gap 后再吃进 3px |
| Todo 顶部 → 消息区 | **8px**（mockup 决策） | 源码为自适应列，手机外壳取 8px |
| 输入卡底部 → 屏幕底 | **8px 安全区**（mockup 决策） | — |

### 6.3 各层画法

1. **输入栏（最底）**：左 `+` 附件圆按钮 28px；中间单行/多行文本框（最大文本高 336px，源码 cap，mockup 单行即可）；右侧 `发送` 图标按钮，运行中换成 `停止`（方形）；底部 modes 区含蓝色 **「计划」chip**（高 **28px**、min-width 34px、padding 0 8px、radius 8px、13/20 500、背景 `--dsw-alias-state-business-tertiary`、文字 `--dsw-alias-state-business-primary`，`[PC]`）。宽度按 composer card max width，左右各 16px 清距。
2. **QueueDock**：见 §4；仅在有排队时出现。
3. **Goal 36px 横条**：`[目标图标 14px] 进行中的目标 | objective [编辑][清除][暂停]`；高 **36px**，padding 4px 5px 4px 12px，radius 12px，背景 `--dsw-specific-menu` + `--dsw-elevation-panel`，border `--dsw-alias-border-l1`；label 13/24 500 primary，objective 13/20 dimmed 单行省略；三个 14px 圆按钮（编辑/清除/暂停或恢复）尾部排列（`[GB]`）。目标被 block 时可在 objective 位显示 12/20 错误文案 `--dsw-alias-state-error-primary`。
4. **Todo 折叠条**：`[清单图标 16px] 任务 · 2 已完成 · 1 进行中 · 3 待处理 ▴`；默认折叠；卡片 8px 上下 padding / 12px 左右，radius 16px，背景 `--dsw-specific-menu` + `--dsw-elevation-panel`；标题 13/24 500 primary，进度 13/20 tertiary，分隔用窄空格中点；展开后每行 13/20 secondary，**状态点是圆点（StateDot），不是 checkbox**，列表最高 180px 可滚（`[TD]`）。

---

## 7 覆盖式卡片（Composer Takeover，不是消息气泡）

> 二者都**替换输入区**显示在 composer seat 内（源码 `conversation.composer` overlay），原输入卡、Goal、Todo、QueueDock 一并让位；关闭后恢复 §6 的栈。不得画进消息流。

### 7.1 Approval 审批卡

- **结构**：整宽覆盖卡 = 琥珀顶栏 → 正文（标题 + 描述 + 等宽详情区）→ 底部右对齐按钮。
- **文案**：顶栏 **● 等待审批**；标题 **工具 bash 请求越权执行**（`escalation`，工具名替换）；描述可空；详情区为命令原文（等宽）；按钮 **拒绝**（outline）/ **允许一次**（primary；若有始终允许再补一个 outline+primary 组合，mockup 可只画两个）。
- **尺寸/token**：外框 padding 8px 左右清距+16px / 12px；卡 1px `--dsw-alias-state-warn-secondary`、radius `--dsw-radius-xl`=20px、底 `--dsw-specific-input-major`、阴影 `--dsw-shadow-lv2`；顶栏 10px 16px、13/18，底 `--dsw-alias-state-warn-tertiary`、字 `--dsw-alias-state-warn-primary`；正文 gap 6px、padding 12px 16px 0、最大高 336px 可滚；标题 15/24 500 primary；详情 `--ds-font-family-code` 13/20 tertiary、`word-break: break-all`；按钮行 padding 14px 16px、gap 8px（`[AP]`）。
- **不要画错**：不要把它画成聊天气泡；不要漏琥珀顶栏和 1px amber 边框；不要把「允许一次」写成「确定」。

### 7.2 PlanReview 计划待审卡

- **结构**：琥珀顶栏（右侧「查看全文」入口）→ 标题 + 两行描述 → 底部按钮行。
- **文案**：顶栏 **● 计划待审** + **查看全文**；标题取计划首行；描述取首段（最多两行）；按钮 **要求修改**（outline + 编辑图标）/ **同意执行**（primary）。
- **尺寸/token**：顶栏 12px 16px、14/20，底 `--dsw-alias-state-warn-tertiary`、字 `--dsw-alias-state-warn-primary`；卡 radius 20px、底 `--dsw-specific-input-major`、阴影 `--dsw-elevation-panel`；摘要区 padding 14px 16px 12px，标题 15/22 500，描述 14/24 secondary 两行截断；底部 padding 8px 16px 12px、gap 8px；错误反馈 11/16 error 色（`[PR]`）。
- **不要画错**：按钮必须是「要求修改 / 同意执行」，不是「拒绝 / 允许」；标题图标不是必需，不要加用户头像；不要与 §3.8 的已提交 Plan 卡混为一谈。

---

## 8 状态变体清单（10 种，逐个可切换）

| # | 变体 | 必须画出的差异 |
|---|---|---|
| V1 | **正常** | 用户右气泡 + 助手全宽正文 + 28px tail；composer 只有输入栏；无 Goal/Todo/queue/抽屉。 |
| V2 | **流式运行** | 鲸尾 + shimmer「深度求索中…」28px 行、上方 4px 分隔线；发送按钮变停止；无闪烁光标。 |
| V3 | **排队多条** | 输入卡上方 QueueDock 折叠头「2 条排队消息 ▴」；展开后两行 36px，含 24px 缩略图/文件 chip 与 3 个圆按钮；其中一行带「发送中…」。 |
| V4 | **Goal 存在** | 输入栏上方 36px Goal 横条（图标 + 阶段 + objective + 编辑/清除/暂停），与输入栏间距经 QueueDock 规则对齐。 |
| V5 | **Todo 展开** | Todo 折叠条展开，显示 6 行状态点 + 单行任务文；点非 checkbox；列表可滚。 |
| V6 | **Plan 模式开** | 输入栏蓝色「计划」chip 高亮；消息尾出现 60px 已提交 Plan 卡；右侧栏抽屉显示计划 Markdown；顶部状态小字可为「计划待审」语境。 |
| V7 | **Approval** | Approval takeover 覆盖输入区；琥珀顶栏「等待审批」+ 越权标题 + 等宽详情 + 拒绝/允许一次；下方不再画输入栏。 |
| V8 | **PlanReview** | PlanReview takeover 覆盖输入区；琥珀顶栏「计划待审」+ 标题/两行描述 + 查看全文 + 要求修改/同意执行。 |
| V9 | **工具失败** | 工具行摘要红色 + 红点「退出码 N」胶囊；展开 terminal 显示命令横幅 + 输出与状态点；diff 场景补红色 output 段。 |
| V10 | **已停止** | 运行态位置换成 11px「已停止」小胶囊；工具行停止摘要为 13px warn 色「已停止」；发送按钮恢复。 |

---

## 9 给 HTML 实现者的 Checklist

### 9.1 必须画 ✅

1. 用户消息右对齐气泡：`--dsw-specific-bubble` / 20px / 10×16 / max 82%，下方 28px 时间+图标操作行。
2. 助手全宽无背景 Markdown：14/24、块距 16px、tail 上方 16px + 28px 行。
3. Think 24px 折叠行、展开标题 sticky、正文左缩进 22px、13/20。
4. 工具 24px 单行 + 缩进 4px 的 16px 圆角展开卡，至少覆盖 terminal / diff / read / search / web / image 六种。
5. 图片单张长边 240 / 多张 64 方砖、radius 20；文件 240×64、radius 16。
6. QueueDock 贴输入卡上方、上圆角 16、0.5px l1、折叠头「2 条排队消息 ▴」、36px 行与 28px 圆按钮、发送中回显。
7. 鲸尾 + shimmer 28px 运行行 + 4px 处分隔线；停止后 11px「已停止」胶囊。
8. Composer 四层按 §6.1 顺序：输入栏（含蓝色计划 chip）→ QueueDock → Goal 36px → Todo 折叠条；stack gap 6px、queue 压入输入卡 3px。
9. 消息尾三卡：Plan 60px「计划 · Markdown / 打开」、Changed Files「已编辑 N 个文件」+绿/红计数、Deliverables 两列 60px 文件卡。
10. Approval / PlanReview 作为 composer takeover 覆盖卡，琥珀顶栏与指定按钮文案齐全。
11. 所有视觉用 `--dsw-*` token；明暗两套都能切；与 P3 无底部 Tab 保持一致。

### 9.2 不要画 ❌（红线）

- **不要助手气泡**（含任何底色/边框/圆角容器）；**不要头像**；**不要「用户 / 助手 / System」角色标签**。
- **不要闪烁光标**（运行态只有鲸尾 + shimmer）。
- **不要把 queue 画成消息气泡**，不要把 queued 消息塞进消息流，不要给队列项加时间戳。
- **不要把 approval / plan-review 画成普通气泡或消息尾卡**，它们必须覆盖输入区。
- 不要把 steering 画成队列行（它是内联用户气泡）；不要把 context 画成普通正文。
- 不要给工具行画 28px 高或给展开卡与行首齐平；不要漏失败态红点胶囊。
- 不要把 Todo 状态点画成 checkbox；不要把单图/多图尺寸互换；不要把交付卡画成 240×64 附件卡。
- 不要新造 token 或硬编码色值；不要写 fetch / 外部资源；不改 `vendor/`，不改 `plugin-mockup.html`。
