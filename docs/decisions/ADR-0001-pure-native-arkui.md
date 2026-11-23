---
读者: 全体 Agent / 负责人
类型: decision
权威: 高
状态: 生效
---

# ADR-0001 app 采用纯原生 ArkUI 重写（Q2）

- **决策**：App 不使用 WebView 加载插件页面，改为 ArkTS/ArkUI 原生实现整套移动端 UI；App↔Plugin 用显式 HTTP + WebSocket 契约。
- **为什么**：负责人定稿（2026-11-23）。原生体验更好、无 WebView 兼容层负担。
- **影响面**：放弃 dsh-mobile 的 Web 薄壳路线；UI 工作量最大项；无 bridge；安全性转为网络契约 + token + 白名单；`03-contracts.md` 必须先行。
