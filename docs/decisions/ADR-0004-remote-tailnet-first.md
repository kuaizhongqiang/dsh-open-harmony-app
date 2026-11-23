---
读者: 全体 Agent / 负责人
类型: decision
权威: 高
状态: 生效
---

# ADR-0004 远程通道：tailnet 优先，公网隧道兜底（Q5）

- **决策**：远程访问首选鸿蒙原生 Tailscale 类客户端（TailMesh / HarmoTail / Tailscale-OHOS）加入 tailnet，直连电脑 tailnet IP；cloudflared/FRP/自有反代作兜底；不自建 VPN 扩展（VpnExtAbility）本期不做。
- **为什么**：鸿蒙已有多个原生 Tailscale 客户端，端到端加密且无需公网暴露；自建 VPN 扩展成本高。
- **影响面**：App 只需支持可配置 base URL；三种入口（LAN/tailnet/公网域名）。
