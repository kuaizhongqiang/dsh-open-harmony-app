# issue-lifecycle — 待办/决策的 issue→PR→merge SOP

替代 `docs/TODO.md` 与 `docs/DECISION.md`。

## 待办（替代 TODO）

1. 开 issue：选 `type:task`，挂 milestone，设 assignee，标题动词开头。
2. 分支 `feat/<slug>` 或 `fix/<slug>`。
3. PR 描述写 `Closes #N`；合并后 issue 自动 close。

## 决策（替代 DECISION，ADR 流程）

1. 开 `type:decision` issue：写背景 / 选项 / 建议 / 影响面。
2. issue 内讨论；负责人拍板（comment 明确「已定：xxx」）。
3. 定稿 PR 新增 `docs/decisions/ADR-NNNN-<slug>.md`（含"为什么 + 影响面"），review 后 merge。

## 门禁（PR 前）

- `node tools/check-docs.mjs` 通过。
- 跨端字段改动同批改完两侧（契约 #3）。
- 提交信息 conventional commits。
