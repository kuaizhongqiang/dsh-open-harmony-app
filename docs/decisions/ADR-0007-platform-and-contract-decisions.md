---
读者: 全体 Agent / 负责人
类型: decision
权威: 高
状态: 生效
---

# ADR-0007 Q1/Q7/Q8/Q9 决策落地（2026-11-23）

- **决策（负责人）**：
  - **Q1**：**两个都支持** —— HarmonyOS NEXT（API 12+）与纯 OpenHarmony（API 9+）双目标。
  - **Q7**：按 Docs/Architect 思路 → **App 直查 GitHub Release**（版本真源统一在仓库 tag）；网关 `/mobile/version` 的 `app` 段降级为"已配对电脑缓存"，非主通道。
  - **Q8**：按 Docs/Architect 方案 → 配对 payload 用二维码/链接携带 `{v,pairingKey,origin,expiresAt,caFingerprint}`；**沿用 CA 指纹绑定**（防 MITM，纯原生 App 同样适用）。
  - **Q9**：Docs/Architect 定 → **本期不加**二进制上传端点（YAGNI）；二进制上限仅约束 WS 消息，删掉 §1 "除二进制上传"例外。
- **为什么**：Q1 双平台扩大覆盖面（华为商用机 + 行业 OpenHarmony 设备）；Q7 统一版本真源、避开网关可达性依赖（App 不上架无市场 API）；Q8 配对即建立信任，CA 指纹绑定是安全基线；Q9 无实际上传需求，不为假想需求造接口。
- **影响面**：
  - **架构**：引入"平台适配层"抽象 `@ohos.*` 差异（网络/HUKS/通知/后台/扫码/安装），能力探测 + 条件编译；`dsh-mobile` 参考层不变。
  - **远程通道**：tailnet 优先结论保持；纯 OpenHarmony 无 TailMesh/HarmoTail 时用公网隧道（cloudflared/FRP）兜底，App 的 base URL 抽象屏蔽差异。
  - **契约**：03 v0.3 —— Q7 改 §6/§3.7，Q8 补 PairingKey payload + CA 绑定定稿，Q9 删二进制上传例外；04 事件映射不变。
  - **UI**：06 §7 的 12 项 `【Q1】` 从"待复核"改为"双平台适配清单"。
  - **门禁**：check-contracts 不受影响（仍查 §1~§7 + 5 错误码 + 首帧鉴权）。
