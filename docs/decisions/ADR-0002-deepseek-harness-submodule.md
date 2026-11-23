---
读者: 全体 Agent / 负责人
类型: decision
权威: 高
状态: 生效
---

# ADR-0002 引入 deepseek-harness 为只读 submodule（Q3）

- **决策**：`git submodule add --depth 1 https://github.com/deepseek-ai/deepseek-harness vendor/deepseek-harness`，当前 `dsh-v0.2.3-alpha.2`。
- **为什么**：开发插件需要 dsh 插件 API/内核契约作参考。
- **影响面**：`vendor/` 只读、禁改；不列入构建依赖；升级 submodule 单独提交。
