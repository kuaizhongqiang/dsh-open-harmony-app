---
name: handoff
description: >-
  生成结构化交接文件，让另一个 agent 接手工作。用于「交接工作 / 归档进度 / 准备上下文给新会话」时。
  落点 docs/handoffs/<workflow>-<YYYYMMDD>.json，模板见 .agent/handoff-template.json。
---

# handoff

把当前进展固化为结构化 JSON，供下一位 agent 接手。

## 触发场景

- 用户说「交接 / 归档 / 总结进度 / 让下一个人接手」。
- 多 agent 串行写时，当前 agent 完成一个单元需要移交。

## 操作（imperative）

1. 复制 `.agent/handoff-template.json` 到 `docs/handoffs/<workflow>-<YYYYMMDD>.json`。
2. 填 `done` / `todo` / `blocked_by` / `contracts_touched`（改动的契约字段，需对方同批）/ `acceptance`（怎么验）。
3. 对人汇报用口头；对 agent 只交 JSON 路径。

## 参考

- 模板：`.agent/handoff-template.json`
- 协作纪律：`docs/design/04-agent-collaboration.md`
