---
读者: 负责人 / 全体 Agent
类型: record
权威: 中（本目录索引；产品事实真源是 vendor/deepseek-harness 只读 submodule）
状态: 返工完成 + App UI 第三次重做（源码级组件调研，2026-11-23）
依赖: ../plan/plan-mockup-rework-2026-11-23.md, ../plan/plan-app-ui-redo-2026-11-23.md
---

# 高保真 Mockup 交付索引（DSH 事实对齐版）

本目录是「产品交互设计 → 设计令牌 → 高保真 mockup」的交付落点。**当前版本为 App UI 第三次重做版**（基于 DSH 组件级源码调研）：执行计划见 `../plan/plan-app-ui-redo-2026-11-23.md`（前序返工计划见 `../plan/plan-mockup-rework-2026-11-23.md`）。

## 第三次重做（同日，负责人 6 项问题）

负责人指出 6 项问题：① 缺创建会话按钮；② 底部「会话/设备/设置」Tab 不该存在；③ 会话气泡不对、不是简单折叠；④ 气泡样式不是 DSH 样式；⑤ 排队机制样式不对；⑥ 需要考虑 goal/plan 等样式。经三个 subagent 对 DSH 源码做组件级调研（`ui-sidebar`/`ui-workspace`/`ui-chat`/`ui-tool`/`ui-conversation`/`ui-goal`/`ui-plan`/`ui-approval`），确认并落地：

- P3 顶部「新会话 / New Session」按钮（38px + ⌘N），点击插入空白草稿行；删除底部 Tab，改侧栏导航（Plugins 全局面板、底部设置齿轮 + 远程连接分区）；会话行严格单行（状态点 + 标题 + 相对时间）。
- P4 **只有用户消息是右气泡**（`--dsw-specific-bubble`、radius 20px、max 82%），**助手是全宽无背景 Markdown 正文**；Think/工具是 24px disclosure 行 + 缩进展开卡（无助手气泡/头像/角色标签）。
- 排队改为**输入框正上方** QueueDock（上圆角 16px、折叠头「2 条排队消息」、36px 行 + 编辑/删除/插话），不进消息流。
- 补 Goal 36px 横条、Todo 折叠条（状态点非 checkbox）、Plan 蓝色 chip、Approval / PlanReview composer 覆盖卡、消息尾 Plan/ChangedFiles/Deliverables 卡、右侧栏抽屉（计划 Markdown / 变更评审）。
- 调研规格 `04-app-session-ui-spec.md`、`05-app-chat-ui-spec.md`；复核截图 `_verify2-p3.png`、`_verify2-p4.png`、`_verify2-planreview.png`。

## 返工原因（用户 2026-11-23 反馈）

上一轮三处根本错误，本轮全部废弃并重建：

| 错误 | 上一轮 | 本轮（以 submodule 为准） |
|---|---|---|
| Plugin 形态 | 独立 PC 后台六域面板 | DSH Web SPA 内 Plugins 页 + 插件详情/配置表单（slots 注入） |
| App 数据 | 本项目 contracts 的合成字段（title/status/message.delta） | DSH 真实类型（SessionSummary / projections.title / 事件时间线 / ContentBlock / stream frame / tool call+result） |
| 视觉 | 自造 `--color-*` 令牌 303 个 | DSH 主题 CSS 原样内联（`--dsw-*`，亮暗两套） |

已删除上一轮错误产物：`design-tokens.json`、`tokens.css`、`01-interaction-app.md`、`02-interaction-plugin.md`。

**第二次修正（同日）**：负责人截图复核发现返工版的 P3/P4 把真实 DSH 字段名直接印在屏幕上（`sessionId=...`、`projections.kind=...`、`event type=...`、`Message{...}`），是开发者调试输出而非产品 UI。已重做为真实手机聊天 App 形态：会话列表为标题/摘要/人话时间/未读点/运行指示；聊天页为对话气泡、可折叠思考过程、图片/文件附件、工具卡、流式输入栏。真实字段仍是数据源，但只在默认折叠的「字段溯源」面板中可见。Plugin 端未改（负责人确认通过）。复核截图：`_review-app-p3-fixed.png`、`_review-app-p4-fixed.png`、`_verify-p3.png`、`_verify-p4.png`。

**新增 issue**：[#31 [task] i18n: 对齐 DSH 多语言机制，App + Plugin 双语言（en/zh）支持](https://github.com/kuaizhongqiang/dsh-open-harmony-app/issues/31)（label: type:task / scope:app / scope:docs / priority:p2）。

## 当前产物

| 阶段 | 文件 | 内容 |
|---|---|---|
| A 交互/数据 | `01-app-data-and-interaction.md` | DSH 8 组真实数据结构字段表（源码路径+行号）、P1–P9 页面映射、18 项 checklist、真实字段名 mock JSON |
| A 交互/设计 | `02-plugin-config-page-interaction.md` | DSH Plugins 页信息架构、12 个槽位、8 个配置分区、10 个状态变体、checklist |
| B 样式 | `dsh-theme.css` | 从 `vendor/.../ui-theme/src/styles/{base,design-platform}.css` 原样拼接，31860 字节，717 个 `--dsw-` token，含亮色 `:root` 与暗色 `body[data-ds-dark-theme]` |
| B 样式 | `03-dsh-style-guide.md` | 来源、token 前缀、语义别名清单、字体栈/圆角、硬规则与允许补充的极小 CSS 白名单 |
| C 高保真 | `app-mockup.html` | 9 页；P3 侧栏式会话列表（新会话按钮/状态点/单行会话）、P4 DSH 风格聊天（用户右气泡+助手全宽正文+Think/工具 disclosure+QueueDock+Goal/Todo/Plan/审批覆盖卡+右侧栏）；明暗切换 |
| C 高保真 | `plugin-mockup.html` | DSH 三栏 Web UI + Plugins 页 + dsh-harmony 详情/配置页（8 分区、6 显式 slot）；10 状态变体；明暗切换 |

## 打开方式

双击两个 HTML 即可，零外部依赖（无 CDN/字体/图片网络请求）。顶部按钮切换明暗主题（`body[data-ds-dark-theme]`）。

## 真源关系

```
vendor/deepseek-harness（只读 submodule：插件机制、真实 TS 类型、主题 CSS）
  ├─ 真实类型 → 01-app-data-and-interaction.md → app-mockup.html
  ├─ 插件管理页/slots → 02-plugin-config-page-interaction.md → plugin-mockup.html
  └─ ui-theme/src/styles/*.css → dsh-theme.css + 03-dsh-style-guide.md → 两个 HTML 内联
本项目 docs/design/03-contracts.md = 网关层字段（与 DSH 字段的桥接说明在 01 文档）
```

## 纪律

- `vendor/deepseek-harness/**` 只读；未改任何 submodule 文件。
- 所有 mock 数据为示意假值；token/CA 指纹/密钥不进仓。
- Plugin 端不含独立后台；App 端不用臆造字段；两端不写自造令牌。
- 未提交、未 push（仓库红线：feature 分支 → PR）。

## 已执行校验（2026-11-23）

- 两个 HTML 的 `<style>` 开头均包含 `dsh-theme.css` 的**逐字节完整前缀**（31860 字节，差异仅为后续带注释的布局段）。
- `var(--dsw-` 引用：App 117 个唯一变量 / Plugin 120 个唯一变量；补充布局段以外无硬编码色值。
- 外部资源引用 0、fetch/XHR 0；`data-ds-dark-theme` 切换存在。
- App 字段关键词（SessionSummary/projections.values.title/ContentBlock/SessionAssistantStreamFrame/tool/call/tool/result/callId/isError/attemptId/revision）全部命中。
- Plugin DSH 原生关键词（Plugins/Syncing plugins/Installed plugins/Experimental/dsh-harmony/plugins.bundle.config/plugins.row.config/Configure/Versions/dshpair://v1//trustedProxies/allowUsers/userHeader/rePairRequired）全部命中；旧「网关总览」独立后台痕迹 0。
- 已用 agent-browser 实际截图复核本轮成果：P3（新会话按钮/侧栏/状态点）、P4（用户气泡+助手全宽正文/Think+工具行/QueueDock/Goal+Todo+Plan chip）、审批覆盖卡、计划待审覆盖卡均正确渲染；复核中发现并修复「计划待审自动开右侧栏遮住审批按钮」的问题。截图 `_verify2-p3.png`、`_verify2-p4.png`、`_verify2-planreview.png` 供负责人复核。
- 静态校验：主题 CSS 31860 字节逐字符一致；零外部资源引用；无底部 Tab 文案；无字段转储调试串；明暗切换存在。Plugin 端未改动（负责人确认通过）。
