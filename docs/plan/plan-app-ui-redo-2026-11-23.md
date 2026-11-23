---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 已确认（负责人 2026-11-23：app 会话/聊天重做，基于 DSH 真实 UI 调研）
依赖: docs/plan/plan-mockup-rework-2026-11-23.md（上轮返工计划）, vendor/deepseek-harness（只读 submodule，UI 真源）
---

# [Feature Name] App Mockup UI 重做计划（DSH 组件级事实版）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于对 DSH submodule 的组件级 UI 调研，重做 `app-mockup.html` 的会话列表（P3）、聊天（P4）与相关导航/状态区，解决负责人提出的 6 项问题；Plugin 端不动。

**Architecture:** 三阶段 subagent 编排。阶段 A 并行两份 UI 规格（会话/导航、聊天/ composer /goal-plan），阶段 B 单代理按规格重写 HTML，阶段 C 主代理用 agent-browser 逐页截图校验并回归。视觉仍原样内联 DSH 主题 CSS（`dsh-theme.css`，31860 字节），不新增自造 token。

**Tech Stack:** 单文件 HTML5 + 内联 DSH 主题 CSS + 少量原生 JS；无外部资源。

---

## 1 负责人提出的 6 项问题 → 调研后的真实事实

| # | 负责人问题 | DSH 源码事实（调研结论） | 落地改动 |
|---|---|---|---|
| 1 | 创建会话按钮不对，需要一个 | 侧栏顶部 Logo 行下方有 38px「新会话 / New Session」按钮（`IconNewChatOutlineMedium` + ⌘/Ctrl N），点击插入一条空白「新会话」草稿行 | P3 顶部加真实按钮；点击后列表顶部出现「新会话」空态行 |
| 2 | 底部「会话/设备/设置」Tab 不要，内容改位置 | DSH 无底部 Tab（`ui-layout/AppFrame.tsx` 仅 sidebar/center/rightbar）；全局导航在左侧栏；设置是侧栏底部齿轮；设备/网关对应设置里的 `remote-connection` 分区 + 连接指示器 | 删除底部 Tab；设置/设备/Plugins 等改为侧栏条目；内容重排 |
| 3 | 会话气泡不对，不是简单折叠 | 只有**用户消息**是右对齐圆角气泡（`--dsw-specific-bubble`，radius 20px，10/16 padding，max 82%）；助手是**全宽无背景 Markdown 正文**；reasoning/tool/context 是 24px disclosure 行 + 展开卡 | 助手去掉气泡；reasoning 按 `Think · 摘要` 24px 行；工具按 ToolRow 单行 + 展开卡 |
| 4 | 气泡样式不是 DSH 样式 | 用户气泡浅色 `rgb(237,243,254)`（`--dsw-specific-bubble`），助手正文 14/24、块间距 16px、无底色无边框无头像 | 气泡部分整体重画，只用 `--dsw-*` token |
| 5 | 排队机制样式不对 | queue 是**输入框正上方**的 dock 面板（贴输入卡、上圆角 16px、`--dsw-specific-menu`），>1 条时「{n} 条排队消息」折叠头，每行 36px；不是聊天气泡，也不画闪烁光标 | 队列从消息流移到 composer 上方，按 QueueDock 重画 |
| 6 | 需要考虑 goal/plan 等样式 | Goal=输入上方 36px 横条（目标图标+阶段+objective+3 圆按钮）；Todo=折叠条（状态点非 checkbox）；Plan=输入栏蓝色 chip + 消息尾 60px 计划卡 + 右侧栏 Markdown；Approval=composer takeover 琥珀卡（拒绝/允许一次） | 在 composer stack 与消息尾/侧栏补这些形态 |

## 2 调研真源（subagent 已核实，附路径）

- 会话列表/导航：`ui-workspace/src/client/rows/Rows.tsx:568-679`、`WorkspaceBrowser.tsx:1231-1346`、`ui-sidebar/src/client/SidebarRoot.tsx:299-445`、`ui-layout/src/client/columns.ts:11-31`、`AppFrame.tsx:170-175,288-341`。
- 新建会话：`SidebarRoot.tsx:351-377`、文案 `ui-sidebar/src/client/locales.ts:7-8,24-25`。
- 消息：用户气泡 `ui-primitives/src/UserMessageBubble.module.css:1-11`、助手正文 `ui-chat/src/client/chat/AssistantMarkdown.module.css:9-22`、Think `ReasoningRow.module.css`、工具 `ui-tool/.../ToolRow.module.css`、queue `ui-conversation/src/client/queue/QueueDock.tsx:106-391`、运行态 `RunningStatus.tsx`。
- Goal/Plan/Todo/Approval：`ui-goal/GoalBar.tsx:130-173`、`ui-plan/PlanModeControl.module.css:9-24` + `PlanCard.tsx:38-60`、`ui-conversation/TodoPanel.tsx:65-99`、`ui-approval/ApprovalCard.tsx:53-93`、`ui-deliverables/ChangedFiles.tsx:30-106`。

## 3 任务分解

```
阶段 A（并行 2 个）: A1 P3 会话/导航规格  ||  A2 P4 聊天/composer/goal-plan 规格
        ↓
阶段 B（1 个）:      B 按规格重写 app-mockup.html
        ↓
阶段 C（主代理）:     agent-browser 截图逐页校验 + 主题/零依赖回归
```

### Task A1（并行）：P3 会话列表与导航 UI 规格
**Files:** Create `docs/mockups/04-app-session-ui-spec.md`
- 基于会话调研报告，写可执行的 P3 规格：侧栏结构顺序（Logo/新会话/全局面板/工作区会话区/底部设置）、新会话按钮尺寸文案图标、会话行 DOM（单行：16px 状态点 + 标题 + 相对时间，无副标题）、6 种状态点视觉、空白/归档/置顶态、32px 行高、触屏规则。
- 明确「无底部 Tab」后，设备/设置/Plugins 放在哪里（侧栏底部设置齿轮 + remote-connection 分区；Plugins 作为全局面板项）。
- 给 HTML 实现者的 checklist（必须画/不要画）。不写 HTML。

### Task A2（并行）：P4 聊天/composer/goal-plan UI 规格
**Files:** Create `docs/mockups/05-app-chat-ui-spec.md`
- 基于聊天与 goal/plan 两份调研报告，写可执行的 P4 规格：用户右气泡 vs 助手全宽正文的精确样式（token/圆角/padding/宽度/间距）、Think 折叠行、工具行 + 六种展开卡、图片/文件、queue dock、运行态鲸尾+shimmer、composer stack（Todo 折叠条/Goal 36px 条/Plan chip/输入栏）、Approval 与 PlanReview 的 composer takeover 卡、消息尾 Plan/ChangedFiles/Deliverables 卡、右侧栏抽屉（Plan Markdown/变更评审）。
- 给 HTML 实现者的 checklist（必须画/不要画，尤其"不要闪烁光标/助手气泡/头像"）。不写 HTML。

### Task B：按规格重写 HTML
**Files:** Modify `docs/mockups/app-mockup.html`（仅此文件）
- 读 A1/A2 规格、`dsh-theme.css`、`03-dsh-style-guide.md`。
- 原样内联 `dsh-theme.css`（31860 字节）不变；补充布局 CSS 只在标注段、只用 `var(--dsw-*)`。
- 重写 P3/P4，其余页保持；删除底部 Tab；状态变体入口改为产品化；保留明暗切换与零外部资源。
- 完成后用 agent-browser 自行截图 P3/P4 并查看，不满意再改。

### Task C（主代理）：独立校验
- 打开 HTML，逐页截图 P3/P4（含状态变体与明暗），亲自查看确认 6 项问题全部解决。
- 再验：主题 CSS 逐字节前缀一致、无硬编码色值、无外部资源、无 fetch、无底部 Tab 字样、无 `sessionId=`/`event type=`/`Message{` 等调试串。

## 4 怎么验（验收标准）

1. P3 有「新会话」按钮且点击有反馈；无底部「会话/设备/设置」Tab；侧栏导航结构与 DSH 一致。
2. P4 用户消息右气泡（浅蓝、20px 圆角）、助手全宽正文（无气泡/无头像）；Think/工具是 disclosure 行；queue 在输入上方；有 Goal/Todo/Plan/Approval/消息尾产物卡。
3. 无调试串；零外部资源；明暗可切；主题 CSS 原样。
4. Plugin 端文件未改动（`plugin-mockup.html` 保持原样）。

## 5 纪律
- vendor 只读；不改 plugin 端；不改源码；不提交/不 push。
- 共享 docs/plan 串行写：子代理只写 `docs/mockups/` 规格与 HTML。
