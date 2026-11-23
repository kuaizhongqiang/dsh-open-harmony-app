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
| Q10 | 双平台 SDK 下限：ADR-0007 定"两个都支持"（NEXT API12+ + 纯 OpenHarmony API9+），但本机 DevEco 26 的 SDK Manager 无 API 9（最低 API 18），旧 API 9 SDK 与新 hvigor 相差 3 年 | 决定 `build-profile.json5` 的 `compatibleSdkVersion` 与双 product 配置；影响 M4 双平台验收范围 | Owner 三选一：(A) 下限放宽 API 18+（改 ADR-0007）｜(B) 另装 DevEco 3.1 + API 9 SDK｜(C) 本期只验 HarmonyOS、OpenHarmony 后置。详见 `docs/plan/plan-harmony-env-init-2026-11-23.md` §5，GitHub issue #21 |

> 已决：Q1/Q7/Q8/Q9 见 ADR-0007；Q2-Q6 见 ADR-0001..0005；CA 生命周期见 ADR-0008。03 契约字段级见 `docs/design/03-contracts.md`（v0.4），App UI 架构见 `docs/design/06-app-ui-architecture.md`（v0.2）。

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
