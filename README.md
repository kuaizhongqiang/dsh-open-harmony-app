# dsh-open-harmony-app

OpenHarmony（鸿蒙）版的 DeepSeek Harness 移动端。对标社区参考实现 [`dsh-mobile`](https://github.com/saya-ch/dsh-mobile)（它做 Android，我们做鸿蒙），让你在手机上安全、实时地使用电脑上的 DeepSeek Harness。

## 两大部分

| 目录 | 内容 | 职责 |
|---|---|---|
| `app/` | 鸿蒙原生应用（ArkTS / ArkUI） | 纯原生 UI + 显式 HTTP/WS 客户端 + 通知/权限/文件/相机等原生能力（不加载插件 web 页面） |
| `plugin/` | dsh 插件（TypeScript） | "中转代理工具"：设备发现、配对、HTTPS、回环代理、扩展注册表，把 App 请求代理到本机 DSH |

## 核心链路

```
鸿蒙 App ──HTTPS──> 移动网关(plugin) ──回环代理──> 本机 DSH Web/Host
                      │
                      └── 同一会话/工作区/事件流 ──> 同步回 App
```

## 文档入口

- 需求原文（最高权威）：`docs/raw-ignore-by-git/raw-requirement.txt`
- 需求分析：`docs/design/01-requirements-analysis.md`
- 主计划：`docs/plan/plan-project-init-2026-11-23.md`
- 文档地图：`docs/README.md`
- Agent 纪律：`AGENT.md`

## 当前状态

文档先行阶段。鸿蒙环境未装、代码脚手架未建，本期先定架构与切片。
