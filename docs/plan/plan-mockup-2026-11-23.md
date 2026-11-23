---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 已确认（用户 2026-11-23 指令：交互设计 → 设计令牌 → 高保真 mockup，subagent 并行）
依赖: docs/design/01-requirements-analysis.md, docs/design/06-app-ui-architecture.md, docs/design/03-contracts.md
---

# [Feature Name] 高保真 Mockup 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 dsh-open-harmony-app 产出「产品交互设计 → 设计令牌 → 高保真 mockup」三阶段交付物，覆盖 App 端 9 页与 Plugin 端本项目插件相关部分（不做 DSH 全量管理面）。

**Architecture:** 纯静态、零依赖的单文件 HTML 表达。App 端用一个手机外壳（phone shell）承载 9 个页面 + 主线交互切换；Plugin 端用 PC 端 DSH「移动访问」管理面板表达本项目插件的 6 个功能域。设计令牌作为唯一视觉真源（JSON + CSS 变量），被两端 mockup 共同引用；交互设计文档作为页面/状态/文案真源。三阶段用 subagent 并行：阶段 A 两个子代理并行写 App/Plugin 交互设计；阶段 B 一个子代理基于两份交互稿产出设计令牌；阶段 C 两个子代理并行基于「交互稿 + 令牌」产出两端 HTML。共享 `docs/design/` 串行写红线通过让子代理写入 `docs/mockups/` 工作区规避，主代理最后统一收口索引。

**Tech Stack:** 纯 HTML5 + 内联 CSS（CSS 自定义属性做令牌）+ 极少量内联原生 JS（仅用于 mockup 页面切换/状态演示）；无框架、无构建、无外部资源（字体用系统栈、图标用内联 SVG/CSS），双击即可在浏览器打开。

---

## 1 目标与范围

### 1.1 交付三件套（严格按用户要求的顺序）

| 阶段 | 交付物 | 落点 | 真源角色 |
|---|---|---|---|
| A 产品交互设计 | App 交互稿 + Plugin 交互稿 | `docs/mockups/01-interaction-app.md`、`docs/mockups/02-interaction-plugin.md` | 页面/流程/状态/文案的讲解真源 |
| B 设计令牌 | `design-tokens.json` + `tokens.css` | `docs/mockups/design-tokens.json`、`docs/mockups/tokens.css` | 视觉唯一真源（颜色/字型/间距/圆角/阴影/动效/组件） |
| C 高保真 mockup | App 端 HTML + Plugin 端 HTML | `docs/mockups/app-mockup.html`、`docs/mockups/plugin-mockup.html` | 可交互演示 |

### 1.2 范围界定

**App 端（全量 9 页）：** 依据 `docs/design/06-app-ui-architecture.md` §2 的 P1–P9，含启动/设备选择、扫码配对、会话列表、聊天、工具详情、设置、连接诊断、版本升级、已配对设备；含三 Tab 导航、WS 状态、错误码文案、通知/权限触发点。

**Plugin 端（只做本项目插件相关，不做 DSH 全量）：** 依据 `02-architecture.md` §3.1 的 8 模块与 `03-contracts.md`，落地为 DSH 内「移动访问」管理面板的 6 个功能域：
1. 网关总览（origin:3443、plugin/DSH 版本、工作区路径、健康状态）
2. 配对管理（生成 `dshpair://v1/...` 二维码/链接、有效期、撤销）
3. 已配对设备（名称/平台/origin/逻辑在线/最近连接/撤销，对应 `GET|DELETE /mobile/devices`）
4. 白名单配置（`trustedProxies` / `allowUsers` / `userHeader`，对应 `GET|PUT /mobile/whitelist`）
5. 远程通道与 CA（通道开关/tailnet 优先/CA 指纹与轮换提示，ADR-0008）
6. 版本监控（plugin npm tag + app hap tag + 校验状态提示）

**不做：** DSH 自身的会话/模型/插件市场等无关管理页；真实网络请求；真实相机/证书/通知；后端逻辑。所有数据是 mock 数据。

### 1.3 表达形式决策

选 HTML（而非模拟器截图）的理由：仓库零前端依赖、双击即开、可把 9 页 + 6 域放进一个可点击切换的演示器，便于负责人直接验证交互与状态。App 端用 CSS 画手机外壳，Plugin 端画 PC 浏览器窗口外壳。

---

## 2 任务分解（bite-sized，含 subagent 并行）

### Task A1（子代理，并行）：App 产品交互设计

**Files:** Create `docs/mockups/01-interaction-app.md`

**Step 1:** 读 `docs/design/06-app-ui-architecture.md` §1–§5、`docs/design/03-contracts.md` §2–§5。
**Step 2:** 为 P1–P9 每页写：目标、入口/出口、关键状态（加载/空/错误/成功/流式）、端点映射、原生能力触发点、主流程串接（选设备→配对→会话→聊天→工具）。
**Step 3:** 写一段「交互原则」与「文案表」（按钮/错误码 409/403/429/401/502 的中文文案）。
**Step 4:** 返回摘要（页面数、状态数、关键分支），不写令牌、不写 HTML。

### Task A2（子代理，并行）：Plugin 产品交互设计

**Files:** Create `docs/mockups/02-interaction-plugin.md`

**Step 1:** 读 `docs/design/02-architecture.md` §3、`docs/design/03-contracts.md` §3.1–3.8、ADR-0008。
**Step 2:** 为 §1.2 的 6 个功能域各写：目标、触发、数据字段（对齐契约 camelCase）、操作与反馈、风险提示（CA 换锚强制重配对、白名单独立闸门、管理面仅回环）。
**Step 3:** 写「PC 端管理页信息架构」：侧栏导航 + 概览仪表 + 设备表 + 配对二维码弹出层 + 白名单表单 + CA 卡片 + 版本卡。
**Step 4:** 返回摘要，不写令牌、不写 HTML。

### Task B（子代理，阶段 A 完成后）：设计令牌

**Files:** Create `docs/mockups/design-tokens.json`、`docs/mockups/tokens.css`

**Step 1:** 读 A1/A2 交互稿，提取两端共用的语义角色（品牌/成功/警告/危险/中性、层级文字、表面、边框、状态色）。
**Step 2:** JSON 定义 token：`color.*`（含语义别名与亮色一套）、`typography.*`（字体栈/字号/行高/字重）、`space.*`（4px 基）、`radius.*`、`shadow.*`、`motion.*`、`component.*`（按钮/卡片/输入/标签/徽章/导航）。
**Step 3:** `tokens.css` 用 `:root{--...}` 一一对应 JSON（命名一致），可直接内联进 mockup。
**Step 4:** 写一段「令牌使用约定」（禁止硬编码色值、语义色不可直用为装饰）放进 JSON 的 `_meta` 字段。
**Step 5:** 返回摘要（token 数量、命名规范），不写 HTML。

### Task C1（子代理，阶段 B 完成后，并行）：App 高保真 mockup

**Files:** Create `docs/mockups/app-mockup.html`

**Step 1:** 读 A1 交互稿、B 令牌（JSON + CSS）。
**Step 2:** 单文件 HTML：顶部一条「页面跳转条」（9 页 + 状态变体入口），中部居中手机外壳（CSS 画，含状态栏/刘海/底部 Home 指示条），内部渲染当前页。
**Step 3:** 逐页高保真还原：P1 探活列表、P2 扫码取景框+确认、P3 会话列表+三 Tab、P4 聊天（消息气泡/流式光标/工具卡/提问卡/输入栏）、P5 工具详情、P6 设置、P7 诊断（RTT/错误码释义）、P8 升级弹层（SHA-256/大小）、P9 已配对设备（忘记操作）。
**Step 4:** 用内联 JS 做页面切换与少量状态演示（如发送后出现流式回复）；所有颜色/间距/字号只引用令牌变量，不硬编码。
**Step 5:** 返回摘要（页面数、可交互点数）。

### Task C2（子代理，阶段 B 完成后，并行）：Plugin 高保真 mockup

**Files:** Create `docs/mockups/plugin-mockup.html`

**Step 1:** 读 A2 交互稿、B 令牌。
**Step 2:** 单文件 HTML：PC 浏览器窗口外壳（标题栏/侧栏 6 项导航/内容区），点击侧栏切换 6 个功能域。
**Step 3:** 高保真还原：总览仪表（网关/版本/工作区/健康）、配对弹层（二维码占位图形 + `dshpair://v1/...` 文本 + 有效期 + 撤销）、设备表（含逻辑在线徽章）、白名单表单、远程通道+CA 卡片（指纹/轮换警示）、版本监控卡。
**Step 4:** 样式与 C1 共用令牌语义（同一套 tokens.css 变量复制进文件），体现「同一产品家族」。
**Step 5:** 返回摘要（功能域数、可交互点数）。

### Task D（主代理收口）：索引与一致性校验

**Files:** Create `docs/mockups/README.md`

**Step 1:** 写索引：三阶段产物清单、打开方式、真源关系（交互稿→令牌→HTML）、范围声明。
**Step 2:** 校验：两端 HTML 的 CSS 变量名集合 ⊆ tokens.css；App 9 页齐全；Plugin 6 域齐全；契约字段名 camelCase 一致；无外部资源引用（grep `http(s)://` 引用）。
**Step 3:** 汇报交付（不提交、不 push；如需入库由负责人按 feature 分支 → PR 流程决定）。

---

## 3 并行编排（用户明确要求 subagent 并行）

```
阶段 A（并行 2 个）:  A1 App 交互  ||  A2 Plugin 交互
        ↓ 两者完成后
阶段 B（1 个）:       B 设计令牌（读 A1+A2）
        ↓ 完成后
阶段 C（并行 2 个）:  C1 App HTML  ||  C2 Plugin HTML
        ↓ 两者完成后
阶段 D（主代理）:     索引 + 一致性校验
```

> 为何不全部一次性并行：B 依赖 A 的语义角色，C 依赖 A 的页面结构与 B 的令牌；强行并行会导致令牌与页面对不上。并行点放在真正独立的 A1/A2 与 C1/C2。

---

## 4 怎么验（验收标准）

1. **顺序性**：A 产物存在且被 B 引用；B 产物存在且被 C 引用；README 索引齐全。
2. **完整性**：App HTML 含 P1–P9 全部 9 页；Plugin HTML 含 6 个功能域。
3. **令牌一致性**：两端 HTML 的 `--*` 变量在 `tokens.css` 中均有定义；无裸色值（`#xxx`/`rgb(`）出现在组件规则里。
4. **契约一致性**：字段名 `origin`/`deviceId`/`caFingerprint`/`trustedProxies`/`allowUsers`/`userHeader`/`sha256` 等与 `03-contracts.md` 一致（camelCase）。
5. **可运行性**：两个 HTML 单文件双击可开，无外部依赖，无 JS 报错（人工打开核对 + 静态 grep）。
6. **范围**：Plugin 端不含 DSH 全量管理页；所有数据为 mock，不发真实请求。

---

## 5 纪律对齐

- 红线条目：不改 `vendor/deepseek-harness/`、不改 app/plugin 源码、不提交 main、密钥不进仓（mockup 中 token/CA 指纹均为示意假值）。
- `docs/design/`、`docs/plan/` 共享串行写：子代理只写 `docs/mockups/`，主代理写 `docs/plan/` 与 `docs/mockups/README.md`，无并发写同一共享路径。
- 本计划为 docs/plan 文档，符合「文档先行」红线；后续如需把交互稿提升为 `docs/design/07-*`，另走 handoff + 串行写。
