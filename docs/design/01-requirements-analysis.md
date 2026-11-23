---
读者: 全体 Agent / 负责人
类型: design（契约类）
权威: 高（需求原文之上的一次确定性解读，改动需同步 raw 与 DECISION）
状态: 草案（待负责人确认 §7 开放问题）
依赖: docs/raw-ignore-by-git/raw-requirement.txt
---

# 01 需求分析

> 本文把 `docs/raw-ignore-by-git/raw-requirement.txt` 的 12 条原始需求，逐条翻译成可执行的设计意图，并给出参考实现依据。原始需求为最高权威，本文是"解读层"，两者冲突以原始需求为准。

## 1 术语基线（先把名字钉死）

| 简称 | 全称 / 来源 | 在本项目的含义 |
|---|---|---|
| **dsh** | deepseek harness，`github.com/deepseek-ai/deepseek-harness` | Agent Runtime/Harness（"Everything is a plugin"，TypeScript + pnpm monorepo + Cordis 微内核）。不是推理服务器、不是模型，是 Agent 操作系统 |
| **DSH** | 同上（大写） | 运行在电脑上的 dsh 实例（Web UI 默认 3080 / Host） |
| **OpenHarmony** | 开放原子基金会开源操作系统底座（HarmonyOS NEXT 的底座） | 本项目移动端目标平台（对标 dsh-mobile 的 Android） |
| **app** | 本仓库第一部分 | 鸿蒙原生应用（ArkTS / ArkUI） |
| **plugin** | 本仓库第二部分 | dsh 插件，即"中转代理工具"（对标 `dsh-mobile` 的 Host face） |
| **openclaw** | OpenClaw 个人 AI 网关（`~/.openclaw/openclaw.json`） | 其 server 端白名单机制（`trusted-proxy` 模式）作为本项目安全设计的参照 |
| **微信 AI 扫码** | 微信 ClawBot / iLink 协议（`ilinkai.weixin.qq.com`，`@tencent-weixin/openclaw-weixin`） | 配对交互范式的参照（扫码 = 快捷建立信任连接） |

## 2 参考实现：dsh-mobile（`saya-ch/dsh-mobile`）

这是需求第 5 条"通讯/代理方式"的直接参照，与我们的目标高度同构（它做的是 Android，我们做的是鸿蒙）。

### 2.1 三层结构（只借用 Host/网关部分，客户端改为纯原生）

| 层 | dsh-mobile | 我们的鸿蒙版 |
|---|---|---|
| **Host face**（电脑端） | 设备发现、配对、HTTPS、回环代理、扩展注册表 | 即 `plugin/`，职责基本不变 |
| **Client face**（移动 web） | 专用移动布局 + 扩展 SDK | **不做**：改为纯原生 ArkUI 直接实现 UI（见 §4.2） |
| **App** | Kotlin WebView 薄壳（AndroidX WebKit WebMessage bridge） | **纯原生 ArkTS/ArkUI**，无 WebView、无 bridge |

> **与参考实现的差异**：dsh-mobile 是"Web 薄壳 + bridge"；我们 Q2 已定**纯原生 ArkUI 重写**，因此 App 与 plugin 之间改为**显式 HTTP + WebSocket 契约**（详见 `02-architecture.md`），不再有"网页调原生"的 bridge 层。下表的 Host/网关、配对、回环代理、白名单机制仍照搬。

### 2.2 通讯与代理（需求第 5 条的核心）

```
鸿蒙 App ──HTTPS(3443)──> 移动网关(plugin) ──回环代理──> 本机 DSH Web/Host(3080)
                              │
                              └── 同一会话/工作区/事件流 ──> 同步回 App
```

- **传输**：仅 HTTPS；app 侧禁用明文流量（鸿蒙 `networkSecurityConfig` 等价物）。
- **配对**：扫码 / 链接 / 密钥，同一 Origin 自动续期；配对的设备视为"完全可信设备"。
- **回环代理**：网关以"本机操作者身份"把请求代理到本机 DSH；管理 API 只接受 TCP 对端为回环。
- **WebSocket**：默认只放行 DSH 内置第一方路径，第三方路径按**精确路径**白名单放行，不接受查询串/模糊前缀。
- **远程通道**：LAN（默认）+ 远程（tailnet 优先：TailMesh/HarmoTail 原生 Tailscale 客户端加入 tailnet；cloudflared/自建 FRP/自有反代 兜底）。

### 2.3 安全（需求第 5 条 + 第 8 条）

| 控制项 | dsh-mobile（Android） | 我们的鸿蒙版 |
|---|---|---|
| 传输 | 仅 HTTPS | 仅 HTTPS |
| 信任 | 精确 Origin + 配对私有 CA / 系统证书 | token + deviceId +（可选）CA 指纹固定 |
| 凭据 | Android Keystore 加密 | **HUKS（鸿蒙统一密钥库）** 加密 |
| Bridge | WebMessage，校验精确顶层 Origin + 主框架，禁用 `addJavascriptInterface` | **无 bridge**（纯原生）；安全性转为网络契约 + token + 白名单 |
| 消息上限 | 入站 1MiB / 剪贴板 256KiB / 二进制 8MiB / 回复 12MiB | 沿用同量级上限 |
| 白名单 | 配对设备模型 | **加 OpenClaw 式 server 端白名单**（见 §4.5） |

## 3 逐条需求解读

### 3.1 功能类

**#3 两个部分：app + plugin（中转代理工具）**
→ 仓库两模块：`app/`（鸿蒙应用）+ `plugin/`（dsh 插件）。plugin 是 app 与 DSH 之间的中转/代理层，本身不重写 DSH 源码（与 dsh-mobile 一致）。

**#4 运营功能：github tag 版本监控升级**
→ 独立"版本升级子系统"：
- App 与 plugin 各自检查自己的 GitHub release/tag（本项目仓库的 tag）；
- 比对本地版本 → 提示升级（plugin 可自动更新，app 引导下载新 hap）；
- 关键：升级必须走**明确通道与校验**（大小 + SHA-256 + 签名），不留静默自更新后门。

**#5 快速链接交互 + openclaw server 白名单**
→ 两件事合一条：**配对交互**（微信式扫码）+ **server 端白名单**（第二道闸）。
- 交互：电脑端生成配对二维码 → 鸿蒙 App 扫码建立信任（对标微信 AI 扫码的"扫即连"体验）。
- 安全：在 dsh-mobile 的"配对设备模型"之上，再加 OpenClaw 式 `trusted-proxy` 白名单（IP 白名单 + 用户白名单 + 身份头），使 server 端能独立于设备配对做准入控制。

**#6 dsh 恒定移动端工作区，单独管理 session**
→ 一个固定的 `$DSH_HOME/mobile-access/` 等价目录（含证书、配对记录、自定义文件），把移动端 session 与桌面 session 隔离管理，但共享同一 DSH 工作区/会话流（对应 dsh-mobile 的 `mobile-access`）。

**#7 dsh 管理 app 的页面**
→ 对标 dsh-mobile 的 "Mobile Access" 面板：设备列表（命名/连接方式/Origin/可达状态/最近连接）、配对授权、撤销设备、白名单配置、远程通道开关。

**#8 app 符合手机使用习惯（通知/权限/通讯等）**
→ 原生能力清单（对标 dsh-mobile 的 bridge 能力）：通知（前台服务保持事件流 + 后台提醒）、权限（相机扫码、麦克风录音、通知）、文件（pick/share）、剪贴板、共享、设备切换、页面缩放。

### 3.2 纪律类

**#9 仓库纪律（issue / PR）**
→ git 主仓库 + 分支保护：feature 分支 → PR → 评审 → 合并；bug/需求先开 issue；提交信息规范（conventional commits）。

**#10 agent 纪律（AGENT.md per key path）**
→ 每个关键路径一个 `AGENT.md`，定义该路径下的红线、读序、SOP；根 `AGENT.md` 是唯一手册，其余路径指针式索引。

**#11 workflows（skill 注册）**
→ 把 SOP 固化为 skill（CodeBuddy skill），让 agent 通过 `use_skill` 统一加载，避免"每个 agent 各写一套 SOP"。

**#12 文档先行 plan<{name}-{date}>.md**
→ 任何执行先落一份 `docs/plan/plan-<name>-<date>.md`，可回溯；计划里必须写"怎么验"。

## 4 关键设计决策（草案，待确认）

### 4.1 目标平台版本
- 首选 **HarmonyOS NEXT（API 12+）** 还是纯 **OpenHarmony（API 9+）**？影响 ArkTS 可用 API 面。
- 决策影响：`@ohos.net.http`/`@ohos.net.webSocket`、HUKS、通知、后台任务 API 可用面。

### 4.2 app 形态（已定：方案 B）
- ~~方案 A：ArkTS 薄壳 + `Web` 组件加载插件页面~~（放弃）
- **方案 B（已定）**：**纯原生 ArkUI 重写**整套移动端界面，不加载插件 web 页面。App 用原生 HTTP/WebSocket 直接连网关 API。
- 影响：客户端无 WebView、无 `javaScriptProxy` bridge；原生能力（通知/权限/相机/文件）由 ArkUI 直接提供；与 plugin 之间必须定义**显式 API 契约**（HTTP + WS）。

### 4.3 plugin 落位
- 作为独立 git 仓库 + 发布到 npm（`dsh-harmony`，Q4 已定），还是与本仓库 monorepo 同仓？
- 建议：同仓 monorepo（`app/` + `plugin/`），plugin 单独发 npm。

### 4.4 deepseek-harness submodule
- 开发插件需要理解 dsh 的 plugin API 契约。是否把 `deepseek-harness` 拉为 `vendor/` 子模块作为**只读参考**？
- 建议：拉为 submodule 仅作 API 参考（dsh-mobile 也"不改 DSH 源码"）；不把它当构建依赖。

### 4.5 OpenClaw 白名单落点
- 白名单作用在**移动网关（plugin）**这一层：`trustedProxies`（可信代理 IP）+ `allowUsers`（用户白名单）+ `userHeader`（身份头）。
- 与"配对设备模型"是**两把独立的锁**：设备配对证明"这台设备可信"，白名单证明"这个来源/用户可信"。

## 5 垂直切片（最小可验收路径）

1. 空鸿蒙工程能出 hap（DevEco 构建通过）。
2. plugin 起一个 HTTPS 网关（默认 3443），回环代理到本机 DSH(3080)。
3. App 原生 `@ohos.net.http` 打通 `GET /mobile/health`，`@ohos.net.webSocket` 订阅一条事件。
4. 一条消息往返：App 输入 → 网关代理 → DSH 响应 → 回显。
5. 配对二维码生成 → App 扫码 → 建立 token → 自动续期。

## 6 门禁（第 1 批，5 道）

沿用 repo-init 通用门禁：`check-sync` / `check-data` / `check-contracts` / `check-docs`，另加本项目的 `check-plugin-version`（tag 与 package.json 一致性）。退出码 `0/1/2`。

## 7 开放问题与决策（截至 2026-11-23）

| # | 问题 | 决策 |
|---|---|---|
| Q1 | 目标平台（HarmonyOS NEXT vs 纯 OpenHarmony，API 版本） | **已定：两个都支持**（ADR-0007，PlatformAdapter 抽象） |
| Q2 | app 形态（Web 薄壳 vs 纯原生 ArkUI） | **已定：纯原生 ArkUI 重写** |
| Q3 | 是否拉 `deepseek-harness` 为只读 submodule | **已定：已拉** `vendor/deepseek-harness`（`--depth 1`，`dsh-v0.2.3-alpha.2`） |
| Q4 | plugin npm 包名 | **已定：`dsh-harmony`**（对标 `dsh-mobile`；冲突时退 `@kuaizhongqiang/dsh-harmony`） |
| Q5 | 远程通道本期是否做 | **已定：做**。鸿蒙有原生 Tailscale 类客户端（TailMesh / HarmoTail / Tailscale-OHOS），远程优先走 tailnet；公网隧道（cloudflared/frp）兜底 |
| Q6 | 版本监控范围 | **已定：plugin + app 都监控**。App 不上架 AppGallery，但允许远程更新（In-house 定向发布 + 自更新：比对版本→下载 hap→校验→交系统安装） |
| Q7-Q9 | 版本通道 / 配对 payload / 二进制上传 | **已定（ADR-0007）**：App 直查 GitHub Release；配对 `dshpair://v1/...` + CA 指纹绑定；本期无二进制上传端点 |

## 8 交付口径

本期交付 = 文档方案 + 架构定稿 + 垂直切片跑通；不承诺远程通道、不承诺完整聊天 UI。
