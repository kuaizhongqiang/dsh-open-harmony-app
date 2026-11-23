---
读者: 全体 Agent / 负责人
类型: decision
权威: 高
状态: 生效
---

# ADR-0003 plugin npm 包名 `dsh-harmony`（Q4）

- **决策**：插件发布名 `dsh-harmony`（对标 `dsh-mobile`）；若 npm 名称冲突，退 `@kuaizhongqiang/dsh-harmony`。
- **为什么**：简洁、与参考实现命名对齐、便于 `dsh plugin add dsh-harmony`。
- **影响面**：package.json `name`、发布脚本、版本监控源。
