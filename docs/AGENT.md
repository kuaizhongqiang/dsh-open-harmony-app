# docs/AGENT.md — docs 路径纪律

只写「不能做什么 + 去哪查」。文档地图与五行头约定见 `docs/README.md`。

## 1 归属（一文件一 owner）

| 子路径 | Owner | 他人 |
|---|---|---|
| `raw-ignore-by-git/` | Owner（人类，只读） | 只读 |
| `design/`、`plan/` | Docs/Architect | 提 handoff 需求 |
| `decisions/`、`open-questions.md` | Docs/Architect | 提 handoff 需求 |
| `review/` | Reviewer | 只增不改历史轮次 |
| `handoffs/` | 双方（结构化交接） | 读 + 追加 |

## 2 红线

1. `raw-ignore-by-git/` 需求原文**只读**，权威最高，改动只由 Owner 决定。
2. `decisions/` 下的 ADR 文件**只增不改**，经 issue + PR 流程引入（见 `.workflows/issue-lifecycle.md`）。
3. `review/` **只增不改**，复审写新文件，不改历史轮次。
4. 执行先落 `plan/plan-<name>-<date>.md`，未写计划不动代码（文档先行）。
5. 契约类文档（`design/NN-*.md`）改动前先改契约、再改实现；跨端字段同批改完两侧。
6. 共享路径（`design/`、`plan/`、契约）**串行写**：同一时刻只允许一个 agent 写。

## 3 读序（≤3 份）

1. `raw-ignore-by-git/raw-requirement.txt`（需求原文）
2. `design/01-requirements-analysis.md`（解读层）
3. `plan/`（执行计划）

## 4 去哪查

- 文档地图 / 五行头约定 / 状态唯一维护点 → `docs/README.md`
- 决策（ADR）→ `docs/decisions/ADR-NNNN-*.md`（经 issue+PR 流程）
- 未决问题 → `docs/open-questions.md`
- 分工与协作 → `docs/design/04-agent-collaboration.md`
