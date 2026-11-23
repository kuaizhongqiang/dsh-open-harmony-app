---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 草案（依赖 Q1-Q6 拍板）
依赖: docs/design/01-requirements-analysis.md
---

# plan-project-init-2026-11-23

项目初始化主计划。文档先行：本文是后续一切执行的可回溯起点。

## 1 目标

完成 dsh-open-harmony-app 的**方案定稿 + 仓库纪律层 + 垂直切片设计**。（2026-11-23 更正：原前提"无鸿蒙环境"已失效——本机已装 DevEco 26 并产出未签名 hap，见 §3/M4 状态。）

## 2 范围（本期做 / 不做）

**做**
- 需求分析 + 参考实现调研（已完成：`docs/design/01-requirements-analysis.md`）
- 纪律层：`AGENT.md` / `CODEBUDDY.md` / `docs/README.md`（已完成）
- 架构定稿：`docs/design/02-architecture.md`（已完成，纯原生 ArkUI）
- `deepseek-harness` 只读 submodule（已完成：`vendor/deepseek-harness` @ dsh-v0.2.3-alpha.2）
- 决策台账 `docs/decisions/ADR-0001..0005`（经 issue+PR 流程）
- 垂直切片步骤清单（本文 §5）
- 门禁清单（本文 §6）
- 版本监控、配对、白名单、工作区的字段/接口契约（`docs/design/03-contracts.md`，**下一步**）

**不做（本期明确排除）**
- ~~不装鸿蒙环境、不出 hap（本机无 DevEco）~~ **已失效**：本机已装 DevEco 26，app 骨架与未签名 hap 已产出（见 §3 状态）；但**签名出包**（可安装 hap）仍需 Owner 提供 In-house 证书，本期不做。
- 不写业务功能代码（app 初始化计划只建骨架 + 占位页，非业务 UI）
- 远程通道本期不实现（仅定方案：tailnet 优先、公网隧道兜底；实现后置）
- 不把 `deepseek-harness` 当构建依赖（只作只读参考）

## 3 里程碑（2026-11-23 跟进更新）

| 里程碑 | 内容 | 验收（怎么验） | 状态 |
|---|---|---|---|
| M0 | 文档方案 + 纪律层 | AGENT 三件套 + 五行头齐全 | 完成 |
| M1 | 架构定稿 | `02-architecture.md` 纯原生 ArkUI + 安全矩阵（v0.3 双平台） | 完成 |
| M2 | 契约先行 | `03-contracts.md` v0.4（配对/端口/CA 端点/版本通道/事件映射） | 完成（PR #18） |
| M3 | 垂直切片 | 设计态验收矩阵齐全；门禁 5 道全绿；**app 骨架已建 + hap 编译通过**（fa843fd） | 部分完成（运行验证 #8–#13 待做） |
| M4 | 出包 | DevEco 26 已装、未签名 hap 已产出（`entry-default-unsigned.hap`）；**签名出包需 Owner 提供 In-house 证书**；双平台下限未决 Q10 | 阻塞（证书 + Q10） |

> **环境事实更正（2026-11-23）**：本机**已装 DevEco Studio 26.0.0.851**（旧版计划"无鸿蒙环境"表述作废），SDK = HarmonyOS 26 / API 26；未装独立 API 9 / API 12 SDK。详见 `docs/plan/plan-harmony-env-init-2026-11-23.md`（另一 agent 的 app 初始化计划，V1–V6 实测 PASS）。

## 4 需求 → 设计映射

| 原始需求 | 落点文档 | 交付物 |
|---|---|---|
| #3 两大部分 | `02-architecture.md` | `app/` + `plugin/` 模块边界 |
| #4 版本监控 | `03-contracts.md` + `plugin/AGENT.md` | tag 契约 + 校验清单 |
| #5 扫码 + 白名单 | `02-architecture.md` §安全 | 配对交互 + OpenClaw 式白名单矩阵 |
| #6 移动工作区 | `02-architecture.md` | `$DSH_HOME/mobile-access/` 目录契约 |
| #7 管理页面 | `02-architecture.md` | Mobile Access 面板信息架构 |
| #8 手机习惯 | `02-architecture.md` §2.1 | 原生能力表（通知/权限/文件/相机/剪贴板） |
| #9-#12 纪律 | `AGENT.md` + `docs/README.md` | 仓库/agent/workflow/文档纪律 |

## 5 垂直切片（最小可验收路径）

1. 空鸿蒙工程能出 hap —— 验：DevEco 构建退出码 0（环境未装，先占位）。
2. plugin 起 HTTPS 网关（默认 3443），回环代理本机 DSH(3080) —— 验：`curl` 网关回环端口返回 200。
3. App 原生 `@ohos.net.http` 打通 `GET /mobile/health` —— 验：返回 200 + 版本号。
4. WS 打通：App 订阅 `/mobile/ws` 收到一条事件 —— 验：事件回调触发。
5. 配对二维码生成 → 扫码 → token → 续期 —— 验：二次连接免重复配对。

## 6 门禁（第 1 批，5 道）

`check-sync` / `check-data` / `check-contracts` / `check-docs` / `check-plugin-version`。退出码 `0 通过 / 1 违例 / 2 前置不满足`；每条错误给 `规则号/文件/路径/期望 vs 实际` + 可粘贴修法。上线前必须做一次"人为违规会红 / 干净会绿"验证。

## 7 决策状态（详见 `docs/decisions/`）

- 已定：Q2 纯原生 ArkUI｜Q3 已拉 submodule｜Q4 `dsh-harmony`｜Q5 tailnet 优先｜Q6 plugin+app 都监控。
- 待定：Q1 目标平台（HarmonyOS NEXT vs 纯 OpenHarmony）→ 见 `docs/open-questions.md`。
- 下一步：`03-contracts.md` 已出 v0.1 草案 → 评审通过（M2）→ 启动 M3 垂直切片。

## 8 分工与协作（详见 `docs/design/04-agent-collaboration.md`）

| 角色 | 归属 | 职责 |
|---|---|---|
| Owner（负责人） | 全部 | 拍板 / 验收 / 发布 |
| Docs/Architect | `docs/**`（除 review）、`AGENT.md`、`tools/**` | 需求/架构/契约/纪律/审核 |
| App Agent | `app/**` | 鸿蒙 ArkTS/ArkUI |
| Plugin Agent | `plugin/**` | dsh 插件（gateway/relay/pairing/whitelist/version） |
| Reviewer | `docs/review/**` | 只评审不改代码 |

**配合铁律**：契约先行（`03-contracts.md` 是 App↔Plugin 唯一接口真源，跨端改动同批）｜一文件一 owner（越界先提 handoff）｜共享路径串行写｜发现对方 bug 记 `docs/review/` 不代修｜`vendor/deepseek-harness/` 只读无人拥有。

## 9 任务分解（细化）

> owner 见 §8；每条必须附「怎么验」。M0/M1 已完成。

| 任务 | owner | 验收 |
|---|---|---|
| **M2.1** `03-contracts.md` 评审通过 | Reviewer | 双方无未决歧义，字段/错误码/WS 事件齐全 |
| **M2.2** Plugin 核对 DSH session 事件词汇对齐 `packages/session` | Plugin | 输出「事件对齐表」进 03 §4，消掉未决 #1 |
| **M2.3** App 确认 ArkTS 网络/HUKS/通知 API 面（受 Q1） | App | 输出「API 可用矩阵」，回填 Q1 决策依据 |
| **M3.1** plugin 骨架：`ctx.plugin` + `ctx.webServer` 起网关 + `/mobile/health` | Plugin | `curl https://127.0.0.1:3443/mobile/health` 返 200 |
| **M3.2** 回环代理 `/mobile/api/**` → Host(3080) | Plugin | 一条代理请求往返与直接打 Host 一致 |
| **M3.3** 配对 + token + 白名单 | Plugin | 配对换 token → 续期 → 白名单拒非名单来源 |
| **M3.4** App 骨架：空 ArkUI 工程 + `@ohos.net.http` 打通 health | App | App 内发起请求收到 200 + 版本 |
| **M3.5** App 订阅 `WS /mobile/ws` 收到事件 | App | 触发一次 `session.updated` 回调 |
| **M3.6** 配对二维码：生成 → App 扫码 → token → 二次免配对 | App+Plugin | 二次连接免重复配对 |
| **M4.1** 出可安装 hap（DevEco 已装，未签名 hap 已编译通过） | App | 未签名 hap exit 0（已验）；**签名 hap 需 Owner 提供 In-house 证书**；双平台下限未决 Q10 |
