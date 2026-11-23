---
name: github-collab
description: >-
  管理本仓库的 GitHub 协作流程：开 issue（task/decision/bug）、提 PR、merge、打 tag、发 release。
  本仓库用 GitHub 的 milestone/issue/PR/merge/tag 替代了 TODO/DECISION/RECORD 台账。
  当用户要「开 issue / 提 PR / 打版本 tag / 发 release / 记录一个决策」时使用本技能。
---

# github-collab

把待办、决策、版本记录落到 GitHub 原生机制，替代已废弃的 `docs/TODO.md` / `docs/DECISION.md` / `docs/RECORD.md`。

## 触发场景

- 新增待办 → 开 `type:task` issue。
- 记录/提案决策 → 开 `type:decision` issue。
- 修 bug → 开 `type:bug` issue。
- 完成工作 → 提 PR，描述写 `Closes #N`；**禁止直接 push 到 main**（ADR-0006）。
- 里程碑收口 → 手动打 tag 才发版；普通 merge 不发布。

## 操作（imperative）

1. 开 issue：套用 `.github/ISSUE_TEMPLATE/` 下对应模板，选 label（`type:*`、`scope:*`、`priority:*`），挂 milestone。
2. 决策走 ADR 流程：issue 讨论 → 负责人拍板 → PR 新增 `docs/decisions/ADR-NNNN-<slug>.md`（含「为什么 + 影响面」）→ merge。
3. 改代码：先 `git switch -c <type>/<slug>`，在分支上提交，**push 分支 → 开 PR → CI 绿 → merge**，绝不直接 push main。
4. PR 前跑门禁：5 道 `node tools/check-*.mjs`；确认跨端字段同批改完两侧；提交信息 conventional commits。
5. 版本发布（仅显式）：变更经 PR merge → 更新根 `CHANGELOG.md`（经 PR）→ 手动打 semver tag → `publish.yml` 自动发 Release；**merge 不触发发布**。

## 参考（按需读）

- SOP：`.workflows/issue-lifecycle.md`、`.workflows/release-tag.md`
- 约定：`docs/design/05-github-collaboration.md`
- 模板：`.github/ISSUE_TEMPLATE/`、`.github/PULL_REQUEST_TEMPLATE.md`
