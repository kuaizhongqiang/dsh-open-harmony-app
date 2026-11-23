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
| Q1 | 目标平台：HarmonyOS NEXT（API 12+）还是纯 OpenHarmony（API 9+）？ | 决定 `@ohos.*` 可用面、HUKS/通知/后台任务 API、以及能否用 TailMesh/HarmoTail（要求 HarmonyOS NEXT） | 见下方对比 |
| - | 03-contracts.md 字段级契约（配对/令牌/设备/WS 事件/版本） | 阻塞 app 与 plugin 并行开发 | 下一步优先级最高 |
| - | App 原生 UI 的信息架构与页面清单 | 决定工作量与设计稿 | 需要负责人认可 UI 结构 |

## Q1 对比（调研结论，2026-11-23）

| 维度 | HarmonyOS NEXT（华为商用，API 12+） | 纯 OpenHarmony（开源底座，API 9+） |
|---|---|---|
| 关系 | 华为在 OpenHarmony 之上的商用系统（类比 AOSP↔Android） | 开放原子基金会开源底座 |
| ArkTS/ArkUI/Stage | 共享骨架 | 共享骨架 |
| API 面 | 更全更快；部分 kit 闭源独有 | 更新慢、生态慢；`system_core` 级接口理论上更多可及 |
| HUKS/通知/后台任务 | 完整 | 部分版本缺失/滞后 |
| 上架 | 华为应用市场（我们不走） | 无市场，hdc 部署 |
| TailMesh/HarmoTail（远程） | **支持（要求 NEXT）** | 不保证 |
| 我方诉求契合 | 高（原生能力 + tailnet 远程） | 中 |

**倾向**：若远程走 tailnet、且要用完整通知/后台任务/HUKS，选 **HarmonyOS NEXT**；纯 OpenHarmony 只适合无华为服务的行业设备。等待负责人定夺。
