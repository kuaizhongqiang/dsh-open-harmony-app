---
读者: 全体 Agent / 负责人
类型: decision
权威: 高
状态: 生效
---

# ADR-0006 强制 PR + merge，且 CI 与 publish 分离

- **决策（负责人，2026-11-23）**：
  1. **所有推送必须经 PR + merge，禁止直接 push/提交到 main**（含 agent）。
  2. 流水线分两条：**merge CI** 只做验证；**publish 流水线** 单独触发，只有显式打 tag 才 `new tag + publish`；**不是所有 merge 都发版**。
- **为什么**：防止无评审直接入库；把"验证通过"与"发布产物"解耦，避免每次 merge 误发版。
- **影响面**：
  - 分支保护：main 开启 require pull request + require status checks（CI 绿才能 merge）。
  - `.github/workflows/ci.yml`：仅 PR / push main 触发，跑门禁，**不打包、不打 tag、不发 release**。
  - `.github/workflows/publish.yml`：仅 `push tags: ['v*', 'plugin-v*', 'app-v*']` 与 `workflow_dispatch` 触发，做 tag 校验 + release（未来接 npm publish / hap 分发）。
  - 发版流程：merge →（积累到里程碑）→ 手动打 tag → publish 流水线。
  - skill `github-collab` 与 `.workflows/release-tag.md` 同步该纪律。
