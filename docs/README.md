# docs/README.md — 文档地图

## 五行头约定（每个设计/契约文档顶部）

```yaml
---
读者: <谁看>
类型: <design / plan / decision / record / raw>
权威: <高 / 中 / 低>
状态: <草案 / 已确认 / 废弃>
依赖: <上游文档路径，无则省略>
---
```

## 状态唯一维护点（由 GitHub 机制承载）

- 未决问题 → `docs/open-questions.md`（建议同开 `type:decision` issue）
- 决策（ADR）→ GitHub issue + PR + merge，文件落 `docs/decisions/ADR-NNNN-*.md`
- 待办 → GitHub Issues（`type:task`）
- 记录 → merge 历史 + Releases + tag
- 路线图 → GitHub Milestones

> 约定见 `docs/design/05-github-collaboration.md`。

## 目录与职责

| 目录/文件 | 职责 | 权威 |
|---|---|---|
| `raw-ignore-by-git/` | 需求原文，只读 | 最高（需求域） |
| `design/` | 设计/契约文档（`NN-主题.md`）；`03-contracts.md` 为 App↔Plugin 接口真源 | 高 |
| `plan/` | 执行计划（`plan-<name>-<date>.md`） | 高 |
| `decisions/` | ADR 文件（`ADR-NNNN-*.md`），经 issue+PR 流程引入 | 高 |
| `review/` | 评审结论（只增不改） | 中 |
| `handoffs/` | 结构化交接（双方写入） | 中 |

## 文档清单

- [x] `design/01-requirements-analysis.md` — 需求分析 + 参考实现调研（草案）
- [x] `design/02-architecture.md` — 架构定稿（纯原生 ArkUI，Q1 待定）
- [x] `design/04-agent-collaboration.md` — Agent 分工与协作协议
- [x] `design/05-github-collaboration.md` — GitHub 协作机制（替代 TODO/RECORD/DECISION）
- [x] `plan/plan-project-init-2026-11-23.md` — 项目初始化主计划
- [x] `decisions/ADR-0001..0008` — 决策（经 issue+PR 流程；ADR-0006 = 禁直推 + CI/publish 分离；ADR-0007 = Q1/Q7/Q8/Q9；ADR-0008 = CA 生命周期）
- [x] `open-questions.md` — 未决问题（Q1 目标平台等）
- [x] `docs/AGENT.md` / `app/AGENT.md` / `plugin/AGENT.md` — 路径纪律（需求 #10）
- [x] `design/03-contracts.md` — App↔Plugin 字段级契约（v0.4，含 CA 管理端点）
- [x] `design/06-app-ui-architecture.md` — App 原生 UI 信息架构（9 页面 + 导航 + 状态）
- [x] `review/01-doc-review.md` / `review/02-contracts-review.md` — 两轮评审
- [x] `handoffs/README.md` — 结构化交接落点
