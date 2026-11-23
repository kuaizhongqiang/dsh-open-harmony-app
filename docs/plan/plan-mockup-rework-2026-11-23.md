---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 已确认（用户 2026-11-23 返工指令：plugin 全量重来；app 依 DSH 真实数据结构；样式全用 DSH 标准）
依赖: docs/plan/plan-mockup-2026-11-23.md（被本计划取代的上一轮）, vendor/deepseek-harness（只读 submodule，事实真源）
---

# [Feature Name] 高保真 Mockup 返工计划（DSH 事实对齐版）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 废弃上一轮基于本项目 docs 臆造的「独立 PC 后台插件面板 + 自造设计令牌」，改为以 `vendor/deepseek-harness` 只读 submodule 的事实为准，重做 App/Plugin 高保真 mockup：Plugin 呈现为 DSH Web SPA 内的插件配置页（slots），App 展示 DSH 真实数据结构，视觉全部复用 DSH 主题 CSS。

**Architecture:** 三阶段、subagent 并行。阶段 A 两个子代理并行：A1 通读 DSH 真实类型写出「App 数据结构与页面映射」，A2 通读 DSH 插件管理页/slots 写出「Plugin 插件配置页交互」。阶段 B 一个子代理抽取 DSH 主题 CSS（`base.css` + `design-platform.css` 明暗两套）生成可内联片段与用法说明。阶段 C 两个子代理并行产出单文件 HTML，内联真实 DSH CSS，只用 `--dsw-*` 变量。主代理收口校验。上一轮自造的 `design-tokens.json`/`tokens.css` 是错误产物，删除。

**Tech Stack:** 单文件 HTML5 + 内联 DSH 主题 CSS（来自 `packages/client/ui-theme/src/styles/base.css` 与 `design-platform.css`，自包含无 @import/url）+ 少量原生 JS；无自造令牌、无 Tailwind、无外部资源。DSH 组件为 React/CSS Modules，mockup 只复刻其视觉 token 与布局形态，不伪造组件类名。

---

## 1 用户反馈的三条硬要求（返工验收即按此）

1. **Plugin 全量重来**：上一轮画的「独立 PC 后台管理面板（网关总览/配对/设备/白名单/CA/版本六域）」不存在于 DSH，废弃。真实形态 = 进程内 Cordis 插件，UI 通过 `ctx.slots.register()` 注入 DSH 单一 Web SPA 的既有槽位；配置页在 DSH 侧栏 **Plugins → dsh-harmony 插件详情页**，通过 `plugins.bundle.config` / `plugins.row.config` slots 渲染配置表单。
2. **App 依 DSH 真实数据结构**：上一轮只用了本项目 03-contracts.md 的合成字段（title/status/message.delta 等），与 DSH 真实类型不符。真实：`SessionSummary`（sessionId/updatedAt/running/blank/agentAvailable/formatStatus/projections）、title 来自 `projections.values.title`、消息是事件时间线（`user/message`、`assistant/message`、`tool/call`、`tool/result`…65 事件）、ContentBlock 七种（text/reasoning/image/file/tool-call/tool-addition/tool-removal）、流式是 `SessionAssistantStreamFrame`（start/chunk/end + attemptId/revision/index/turn/step）、工具是 `ToolCallView`/`ToolResultView` 六种 card。
3. **样式全用 DSH 标准**：不用鸿蒙样式、不自造令牌。直接内联 `base.css`（字体栈/圆角/motion）+ `design-platform.css`（亮色 `:root` 与暗色 `body[data-ds-dark-theme]` 两套 `--dsw-*` token）。字体栈/色值/圆角/阴影/焦点一律 `var(--dsw-*)`；仅结构性布局（尺寸/栅格）与 DSH 未覆盖的个别处可补极小量 CSS，须在文档标注。

## 2 事实基线（来自 submodule，已在探查报告中核实）

- 插件 UI 机制：`vendor/deepseek-harness/docs/subsystems/slots.md:5`、`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:71-79`。浏览器半不能 import 组件库，用 `React.createElement` + `styles.insert(css)` + `--dsw-*` 变量。
- 插件管理页：`vendor/.../packages/client/ui-plugin-manager/README.md:12-14,89-104`（侧栏 Plugins 项、Installed/Experimental/Installed plugins、`plugins.bundle.config`/`plugins.row.config`/`plugins.detail.*` 槽、配置表单 `view:'page'|'summary'`）。
- 主题 CSS：`vendor/.../packages/client/ui-theme/src/styles/base.css`（1933B，自包含）、`design-platform.css`（29861B，无 @import/url，含 `body[data-ds-dark-theme]` 暗色覆盖）、`docs/web-styling.md:16-33`（只用 `--dsw-alias-*`，禁 hex/静态色板值）。
- 数据结构真源：`packages/core/session/src/types.ts`、`packages/api/session-controller/src/types.ts`、`packages/llm/llm/src/{message,types}.ts`、`packages/core/tools/src/{contracts,presentation}.ts`（详见探查报告）。

## 3 任务分解（并行编排）

```
阶段 A（并行 2 个）: A1 App 数据结构与页面映射  ||  A2 Plugin 插件配置页交互
        ↓
阶段 B（1 个）:      B  DSH 主题 CSS 抽取与用法
        ↓
阶段 C（并行 2 个）: C1 app-mockup.html        ||  C2 plugin-mockup.html
        ↓
阶段 D（主代理）:     索引 + 一致性校验 + 汇报
```

### Task A1（并行）：App 数据结构与页面映射
**Files:** Create `docs/mockups/01-app-data-and-interaction.md`
- 读 `vendor/.../packages/api/session-controller/src/types.ts`、`packages/core/session/src/types.ts`、`packages/llm/llm/src/{message,types}.ts`、`packages/core/tools/src/{contracts,presentation}.ts`、本项目 `docs/design/03-contracts.md`（网关层字段，与 DSH 字段并列说明）。
- 写「字段级数据结构表」：SessionSummary / SessionWireHeader / SessionState / SessionSnapshot / Message 五角色 / ContentBlock 七种 / StreamChunk 与 SessionAssistantStreamFrame / tool-call+tool-result / ToolCallView+ToolResultView / 65 事件分类 / ModelCatalog / Attachment。每字段标类型与 UI 展示位置。
- 写 P1–P9 页面映射：每页展示上述哪些真实字段、哪些状态变体、字段来源路径。明确契约合成字段 vs DSH 真实字段的对应/差异（例如契约 `title` 实为 `projections.values.title`；契约 `session.updated` 映射自 `api-session/activity`/`session/title`）。
- mock 数据必须是真实字段名与真实形态（事件 envelope 带 seq/time/type/data；content 是 block 数组；stream frame 带 attemptId/revision/index）。
- 返回摘要：字段组数、页面数、关键纠偏点。不写 HTML、不写 CSS。

### Task A2（并行）：Plugin 插件配置页交互
**Files:** Create `docs/mockups/02-plugin-config-page-interaction.md`
- 读 `vendor/.../packages/client/ui-plugin-manager/README.md` 与 `src/client/index.ts`、`docs/subsystems/slots.md`、`slot-catalog.ts`、`packages/client/ui-layout/README.md`。
- 以 DSH 原生 Web UI 侧栏 + Plugins 页为骨架，写 dsh-harmony 插件详情页/配置表单的交互：页面从侧栏 Plugins 进入 → Installed plugins → dsh-harmony 卡片 → 详情页（bundle 描述、Source、rows、开关、Versions）→ 配置表单（`plugins.bundle.config` 或 `plugins.row.config`，`view:'page'` 带自己的保存控件）。
- 配置表单内容限于本项目插件真实职责：网关 origin/端口、配对管理、设备列表、白名单、CA、远程通道、版本——但**呈现为 DSH 插件配置页里的分区/表单/列表**，不是独立后台；每个分区注明挂在哪个 slot。
- 写清 DSH 页面真实细节：client plugin sync 状态条、Refresh/Add plugin、Installed/Experimental 分组、骨架屏、Versions 更新检查、危险操作确认、switch 与 row 状态标记；narrow(<768px) 20px inset。
- 返回摘要：槽位数、分区数、状态变体数。不写 HTML、不写 CSS。

### Task B：DSH 主题 CSS 抽取
**Files:** Create `docs/mockups/dsh-theme.css`、`docs/mockups/03-dsh-style-guide.md`
- 读取 `base.css` 与 `design-platform.css` 原文，**原样**拼成 `dsh-theme.css`（保留 `:root` 亮色与 `body[data-ds-dark-theme]` 暗色两套），不改 token 名/值，不引入 @import/url。
- `03-dsh-style-guide.md` 写：来源路径与字节数、token 命名前缀（`--dsw-*` 主 / `--dsh-*` / `--ds-*`）、可直接用的语义别名清单（bg-base/bg-layer-1..3/label-primary/secondary/tertiary/border-l1..l4/link/button-primary-fill/card-fill/state-success/error/warn/settings-card-*）、字体栈/圆角/阴影/focus、暗色切换方式、禁用事项（禁 hex/静态色板、禁伪造 CSS Module 类名、组件行为参考 primitives API 但 mockup 用原生元素复刻）。
- 返回摘要：CSS 字节数、token 数、亮暗是否齐全。

### Task C1（并行）：App 高保真 mockup
**Files:** Create `docs/mockups/app-mockup.html`（覆盖上一轮）
- 读 A1 文档、`dsh-theme.css`、DSH 主题 CSS 源文件。
- 单文件：`<style>` 开头**原样内联** `dsh-theme.css` 全文；之后仅为结构布局写极小量补充 CSS（必须用 `var(--dsw-*)`，补充处集中放一段并注释）。
- 手机外壳 + P1–P9；所有数据是 A1 的真实 DSH 字段/事件形态；聊天页事件时间线要显示 `type`/`seq`/`time`，消息 content 分块渲染 text/reasoning/tool-call 等，流式区显示 start/chunk/end 与 attemptId/turn/step；会话列表显示 SessionSummary 字段（含 projections.title、running、blank、formatStatus）；工具卡显示 ToolCallView.card 类型与 tool/result isError。
- 明暗主题切换按钮（切 `data-ds-dark-theme`）。状态变体 ≥ 8。零外部资源。
- 返回摘要：页面数、字段覆盖、变体数、内联 CSS 字节数。

### Task C2（并行）：Plugin 高保真 mockup
**Files:** Create `docs/mockups/plugin-mockup.html`（覆盖上一轮）
- 读 A2 文档、`dsh-theme.css`、DSH 主题 CSS 源文件、`ui-plugin-manager` README 与源码。
- 单文件：`<style>` 开头原样内联 `dsh-theme.css`；三栏 DSH Web UI（原生侧栏含 Plugins 项选中态、主区 Plugins 页/插件详情页、配置表单），参考 `ui-plugin-manager` 的真实细节（client sync 状态条、Installed/Experimental、Refresh/Add plugin、Versions、switch/row 状态、骨架屏、<768px inset）。
- dsh-harmony 配置表单按 A2 的 slots 分区呈现；所有色/字/圆角/阴影 `var(--dsw-*)`；明暗切换；零外部资源。
- 返回摘要：槽位/分区数、变体数、内联 CSS 字节数、是否无独立后台痕迹。

### Task D（主代理收口）
- 删除上一轮错误产物 `design-tokens.json`、`tokens.css`（自造令牌，与 DSH 标准冲突）。
- 重写 `docs/mockups/README.md`：新产物清单、真源关系（submodule → 主题 CSS / 真实类型 → 交互稿 → HTML）、返工说明（上一轮错在哪）。
- 校验：两个 HTML 内联 CSS 与 `dsh-theme.css` 字节级一致；无 `var(--dsw-` 未定义；无硬编码 hex（除 token 表本身）；无外部资源；App 字段为真实 DSH 字段；Plugin 无独立后台页面；明暗两套可切。
- 不提交、不 push（仓库红线：feature 分支 → PR）。

## 4 怎么验（验收标准）

1. 顺序：A → B → C → D 产物齐全；旧 `design-tokens.json`/`tokens.css` 已删。
2. CSS 一致性：两 HTML 内联的 `:root` + `body[data-ds-dark-theme]` 与 `dsh-theme.css` 逐字相同；引用的 `--dsw-*` 全部有定义。
3. 无自造令牌/无鸿蒙样式/无外部资源；补 CSS 集中在标注段且只用 `var(--dsw-*)`。
4. App：字段与事件形态来自 submodule 真实类型（至少覆盖 SessionSummary、事件 envelope、ContentBlock、stream frame、tool call/result 五组）；无臆造 title/status 字段。
5. Plugin：形态为 DSH Plugins 页内插件配置（slots），非独立后台；含 DSH 原生侧栏与插件管理页真实细节。
6. 明暗切换可用；单文件双击可开。

## 5 纪律
- `vendor/deepseek-harness/**` 只读，禁改。
- 不改 app/plugin 源码、不写实现代码、不提交 main。
- mock 数据全为示意假值；token/CA 指纹/密钥不进仓。
- 共享 `docs/design/`、`docs/plan/` 串行写：子代理只写 `docs/mockups/`，主代理写本计划与索引。
