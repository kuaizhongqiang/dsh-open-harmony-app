---
读者: 全体 Agent / 负责人
类型: record
权威: 高
状态: 生效
---

# open-questions.md — 未决问题（唯一维护点）

> 已决问题经 issue+PR 落 `docs/decisions/ADR-*.md`。此处只留未决。

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| — | **当前无未决问题** | — | 新问题请开 issue 并在此登记 |

> 已全部决策：Q1/Q7/Q8/Q9 见 `docs/decisions/ADR-0007-...md`；Q2-Q6 见 ADR-0001..0005。03 契约字段级与 App UI 架构见 `docs/design/03-contracts.md`（v0.3）与 `docs/design/06-app-ui-architecture.md`（v0.2）。

## 历史资料：Q1 双平台对比（调研结论；决策=两个都支持）

| 维度 | HarmonyOS NEXT（华为商用，API 12+） | 纯 OpenHarmony（开源底座，API 9+） |
|---|---|---|
| 关系 | 华为在 OpenHarmony 之上的商用系统（类比 AOSP↔Android） | 开放原子基金会开源底座 |
| ArkTS/ArkUI/Stage | 共享骨架 | 共享骨架 |
| API 面 | 更全更快；部分 kit 闭源独有 | 更新慢、生态慢；`system_core` 级接口理论上更多可及 |
| HUKS/通知/后台任务 | 完整 | 部分版本缺失/滞后 |
| 上架 | 华为应用市场（我们不走） | 无市场，hdc 部署 |
| TailMesh/HarmoTail（远程） | **支持（要求 NEXT）** | 不保证 |
| 我方诉求契合 | 高（原生能力 + tailnet 远程） | 中 |

**决策（2026-11-23）**：**两个都支持**（ADR-0007）。经 `PlatformAdapter` 抽象差异；纯 OpenHarmony 远程通道用公网隧道兜底。
