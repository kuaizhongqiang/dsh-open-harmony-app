# .agent/ — Agent 运行与技能索引

## 角色与归属

见 `docs/design/04-agent-collaboration.md`（一文件一 owner）。

## 技能索引（场景 → 读哪份）

| 场景 | 技能（`use_skill`） | 对应 SOP |
|---|---|---|
| 开 issue / 提 PR / 打 tag / 发 release / 记决策 | `github-collab` | `.workflows/issue-lifecycle.md`、`.workflows/release-tag.md` |
| 交接 / 归档 / 交给下一个人 | `handoff` | `.agent/handoff-template.json` |

## 交接

- 结构化交接落 `docs/handoffs/<workflow>-<YYYYMMDD>.json`（模板见 `handoff-template.json`）。
- agent 间用 JSON，对人用口头。

## 纪律

- 每个关键路径一个 `AGENT.md`（需求 #10）；缺文件即纪律不完整。
- SOP 一律走 skill，禁止各写各的（需求 #11）。
