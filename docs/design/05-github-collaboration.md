---
读者: 全体 Agent / 负责人
类型: design
权威: 高
状态: 草案
依赖: docs/design/04-agent-collaboration.md
---

# 05 GitHub 协作机制（替代 TODO/RECORD/DECISION）

> 把 `docs/TODO.md`、`docs/RECORD.md`、`docs/DECISION.md` 三个台账用 GitHub 原生机制替代，并规划 `.github/`、`.agent/`、`.workflows/` 三路径与配套技能。

## 1 替代映射

| 原台账（已废弃） | GitHub 机制 | 说明 |
|---|---|---|
| `docs/TODO.md` | **Issues** | 待办 = open issue；`type:*` label 分类；挂 milestone；`Closes #N` 收口 |
| `docs/DECISION.md` | **Issue（提案/讨论）+ PR（定稿）+ merge（生效）** | ADR 文件落 `docs/decisions/ADR-NNNN-<slug>.md`，由 PR 引入 |
| `docs/RECORD.md` | **merge 历史 + Releases + tag** | 记录由提交历史、PR 描述、tag 后的 Release CHANGELOG 承载 |
| `docs/ROADMAP.md`（一并） | **Milestones** | 每个里程碑一个 milestone，issue 挂其下 |

保留 `docs/open-questions.md` 作为未决问题的**快速入口**（每个未决项建议同时开一个 `type:decision` issue）。

## 2 标签（labels）约定

| 标签 | 用途 |
|---|---|
| `type:task` / `type:decision` / `type:bug` / `type:feature` | issue 类型 |
| `scope:app` / `scope:plugin` / `scope:docs` / `scope:infra` | 归属模块 |
| `priority:p0` / `p1` / `p2` | 优先级 |

## 3 里程碑（milestones）约定

| milestone | 内容 | 状态 |
|---|---|---|
| `m0-docs` | 文档方案 + 纪律层 | 完成 |
| `m1-architecture` | 架构定稿 | 完成 |
| `m2-contracts` | 契约先行（03 评审通过） | 进行中 |
| `m3-vertical-slice` | 垂直切片 | 待开始 |
| `m4-harmony-build` | 装环境 + 出 hap | 待 Q1 |

## 4 流程（SOP）

### 4.1 待办 / 任务（替代 TODO）

1. 开 issue，选 `type:task`，挂 milestone，设 assignee，标题用动词开头（`实现 xxx` / `修复 xxx`）。
2. 实现分支 `feat/…` / `fix/…`。
3. PR 描述里写 `Closes #N`；合并后 issue 自动 close。

### 4.2 决策（替代 DECISION）

1. 开 `type:decision` issue：写背景、选项、建议。
2. issue 内讨论，负责人拍板（comment 明确"已定"）。
3. 定稿 PR 新增 `docs/decisions/ADR-NNNN-<slug>.md`（含"为什么 + 影响面"），review 后 merge。

### 4.0 提交与发布纪律（ADR-0006）

- **禁止直接 push/提交到 main**（含 agent）：所有变更走 feature 分支 → PR → CI 绿 → merge。
- **merge CI 与 publish 分离**：merge 只验证，不打包、不打 tag、不发 release；**只有显式打 tag 才触发 publish**，不是所有 merge 都发版。
- main 开启分支保护：require pull request + require status checks（`check-docs` 等门禁）。

### 4.3 版本发布（替代 RECORD + 收口）

1. milestone 的 issue 全部关闭；变更已通过 PR merge 进 main。
2. `CHANGELOG.md`（根目录）追加本次变更（经 PR）。
3. **手动**打 tag：`v<major>.<minor>.<patch>` / `plugin-v*` / `app-v*`（semver），推到 origin。
4. tag push 触发 `publish.yml`：校验 tag ↔ CHANGELOG ↔ 版本声明 → 发 GitHub Release（正文贴 CHANGELOG；附件放 app hap + plugin tarball）。
5. 普通 merge **不触发** publish；只有 tag 或 `workflow_dispatch` 触发。

## 5 三路径规划

### 5.1 `.github/`（GitHub 协作机制）

| 文件 | 作用 |
|---|---|
| `ISSUE_TEMPLATE/task.md` | 任务 issue 模板 |
| `ISSUE_TEMPLATE/decision.md` | 决策（ADR）issue 模板 |
| `ISSUE_TEMPLATE/bug.md` | 缺陷 issue 模板 |
| `PULL_REQUEST_TEMPLATE.md` | PR 模板（关联 issue + 验收 + 契约同批勾选） |
| `CODEOWNERS` | 路径 → 人类 owner（AI owner 边界仍以 04 为准） |
| `workflows/ci.yml` | **merge CI**（仅验证）：PR + push main 触发，跑 5 道门禁；不打 tag、不打包、不发 release |
| `workflows/publish.yml` | **publish 流水线**：仅 tag（`v*`/`plugin-v*`/`app-v*`）+ 手动触发；校验版本一致性后发 Release |

### 5.2 `.agent/`（agent 运行与交接）

| 文件 | 作用 |
|---|---|
| `README.md` | 技能索引（场景 → 读哪份 skill/workflow） |
| `handoff-template.json` | 结构化交接模板（`docs/handoffs/` 落点） |

### 5.3 `.workflows/`（SOP 真源）

| 文件 | 作用 |
|---|---|
| `README.md` | workflow 索引 |
| `issue-lifecycle.md` | 待办/决策的 issue→PR→merge SOP |
| `release-tag.md` | 版本发布 SOP（CHANGELOG→tag→release） |

### 5.4 `.codebuddy/skills/`（技能，把 workflow 注册给 agent）

| 技能 | 触发 | 对应 workflow |
|---|---|---|
| `github-collab` | 开 issue / 提 PR / 打 tag / 发 release / 记录决策 | `issue-lifecycle` + `release-tag` |
| `handoff` | 交接 / 归档 / 让下一个人接手 | `.agent/handoff-template.json` |

> 需求 #11：SOP 通过 skill 注册，agent 用 `use_skill` 统一加载，杜绝各写各的 SOP。

## 6 首批 issue（由废弃 TODO 迁移）

| # | 标题 | label | milestone |
|---|---|---|---|
| 1 | 落地 5 道门禁脚本 tools/check-*.mjs | scope:infra, type:task | m3-vertical-slice |
| 2 | 定稿证书/CA 生命周期（签发/分发/轮换/吊销） | scope:plugin, type:decision | m2-contracts |
| 3 | App 原生 UI 信息架构与页面清单 | scope:app, type:task | m3-vertical-slice |
| 4 | Q1 目标平台（HarmonyOS NEXT vs 纯 OpenHarmony） | type:decision, priority:p0 | m4-harmony-build |

## 7 待确认

- [ ] GitHub 仓库当前 milestones/labels 是否已建；未建则需在仓库 Settings 手动创建（本设计为约定文档）。
- [ ] `CODEOWNERS` 用哪个 GitHub 账号（默认 `@kuaizhongqiang`）。
