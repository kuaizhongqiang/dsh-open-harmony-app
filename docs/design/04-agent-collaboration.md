---
读者: 全体 Agent / 负责人
类型: design
权威: 高
状态: 草案（角色分工待负责人确认）
依赖: docs/design/02-architecture.md、AGENT.md
---

# 04 Agent 协作与分工协议

> 回答「谁负责哪块、多个 agent 怎么配合、怎么交接、怎么不越界」。本项目是双模块（`app/` 鸿蒙 + `plugin/` dsh 插件）+ 文档先行，天然多 agent 协作，必须把边界钉死。

## 1 角色与职责

| 角色 | 归属 | 职责 | 可用子代理 |
|---|---|---|---|
| **Owner（负责人，人类）** | 全部 | 最终拍板（Q 决策、验收、发布）、范围裁决 | — |
| **Docs/Architect（我 codebuddy）** | `docs/**`（除 `review/`）、`AGENT.md`、`README.md`、`tools/**` | 需求分析、架构、契约、纪律、审核、版本管理 | code-explorer |
| **App Agent** | `app/**` | 鸿蒙原生 ArkTS/ArkUI 开发（UI/网络/安全/更新） | typescript-pro |
| **Plugin Agent** | `plugin/**` | dsh 插件开发（gateway/relay/pairing/whitelist/version） | javascript-pro、code-explorer |
| **Reviewer Agent** | `docs/review/**` | 只做评审，只写 review 目录，不改被审代码 | code-reviewer |

> 子代理（subagent）是**工具**不是常驻成员：由上面某个角色在需要时派生，结果回收给该角色，不单独拥有文件。

## 2 文件归属（R-1：一文件一 owner）

| 路径 | Owner | 他人能做什么 |
|---|---|---|
| `docs/raw-ignore-by-git/**` | Owner（只读） | 读 |
| `docs/design/**`、`docs/plan/**`、`docs/decisions/**`、`docs/open-questions.md` | Docs/Architect | 提 handoff 需求；`03-contracts.md` 为契约真源，App/Plugin 双方消费、改动同批 |
| `docs/review/**` | Reviewer | 只增不改历史轮次 |
| `docs/handoffs/**` | 双方写入（结构化交接） | 读 + 追加 |
| `app/**` | App Agent | 提 handoff 需求，不直接改 |
| `plugin/**` | Plugin Agent | 提 handoff 需求，不直接改 |
| `vendor/deepseek-harness/**` | **无人拥有（只读）** | 禁改 |
| `tools/**` | Docs/Architect | 提需求 |
| `AGENT.md` / `README.md` / `CODEBUDDY.md` | Docs/Architect | 提需求 |

## 3 配合机制

### 3.1 契约先行（最核心）

`docs/design/03-contracts.md` 是 App 与 Plugin 的**唯一接口真源**（配对字段、令牌、设备、白名单、代理路由、WS 事件、版本）。规则：

- 先改契约、再改实现；**跨端字段改动必须同一批改完两侧**，只改一侧视为未完成。
- 任何一方发现契约歧义 → 登记 `docs/open-questions.md`，不自行决定。

### 3.2 交接（handoff）

- 结构化交接落 `docs/handoffs/<workflow>-<YYYYMMDD>.json`（agent 间用 JSON，对人用口头）。
- 交接内容：已做什么、待做什么、依赖谁、阻塞点、验收标准。

### 3.3 串行写（防交叉不一致）

- 共享路径（`docs/`、契约、`AGENT.md`）同一时刻**只允许一个 agent 写**。
- 无分支隔离时，`svn/git` 同步会混入半成品，跨文件不一致任何检查都发现不了 → 默认串行。

### 3.4 越界与评审（发现对方 bug 不代修）

- 改对方文件：先提 handoff 需求，不直接改。
- 发现对方 bug：记入 `docs/review/`（按轮次），不代修。
- 复审写在新文件，不改历史轮次。

## 4 子代理使用规范

| 子代理 | 何时派生 | 不给它做的 |
|---|---|---|
| `code-explorer` | 跨文件/跨目录检索、读 `vendor/deepseek-harness` 的插件 API 与内核契约 | 不写文件、不拍板 |
| `code-reviewer` | 变更/PR 评审，产出 `docs/review/` 结论 | 不改代码 |
| `typescript-pro` | ArkTS/TS 类型体系、复杂泛型、严格类型安全 | 不脱离 owner 边界 |
| `javascript-pro` | JS/TS 异步、浏览器/Node 兼容、复杂 JS 模式 | 同上 |

派生纪律：一次派一个明确任务（"查什么、结论给谁、只读/可写范围"）；结果由派生它的角色回收综合，子代理不直接越界落盘。

## 5 验收与交接门槛

- 每角色完成一个垂直切片单元后，先在本地自验（对应门禁 exit 0），再交 Reviewer。
- 交接必须附「怎么验」；没写验收方式的交接视为未完成。

## 6 待确认

- [ ] 角色表是否与实际团队一致（App/Plugin 是两个真人/两个 agent，还是同一人？）。
- [ ] `docs/review/`、`docs/handoffs/` 目录是否现在就建。
