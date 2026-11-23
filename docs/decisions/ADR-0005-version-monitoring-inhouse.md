---
读者: 全体 Agent / 负责人
类型: decision
权威: 高
状态: 生效
---

# ADR-0005 版本监控覆盖 plugin + app，app 不上架走 In-house（Q6）

- **决策**：plugin 与 app 都做 GitHub tag 版本监控；app 不上架 AppGallery，走 In-house 定向发布 + 自更新（比对版本→下载 hap→校验签名/SHA-256→系统安装）。
- **为什么**：负责人定稿；企业 MDM/HEM 方案仅支持鸿蒙电脑擎云设备，手机不适用，故必须 In-house。
- **影响面**：需组织内部发布证书 + Profile；更新服务需托管 hap 与版本清单；升级必须校验，禁静默自更新。
