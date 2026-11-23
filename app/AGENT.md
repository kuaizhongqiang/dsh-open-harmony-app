# app/AGENT.md — 鸿蒙应用路径纪律

只写「不能做什么 + 去哪查」。职责见 `docs/design/02-architecture.md` §2、`docs/design/04-agent-collaboration.md`。

## 1 归属

- Owner：App Agent。`app/**` 一文件一 owner，越界先提 handoff，不直接改他人文件。
- 只读：`vendor/deepseek-harness/**`。

## 2 红线（技术）

1. **纯原生 ArkTS/ArkUI**，禁用 WebView 加载 DSH 页面；App↔Plugin 走显式 HTTP + WebSocket 契约。
2. **仅 HTTPS**，禁明文流量；凭据（token/CA 指纹）用 **HUKS** 加密存，不进仓。
3. 契约真源是 `docs/design/03-contracts.md`：改字段先改契约、再改实现，**同批改完 plugin 侧**。
4. 不上架 AppGallery，走 **In-house 定向发布 + 自更新**；升级必须校验签名 + SHA-256，禁静默自更新。
5. 权限最小化：相机（扫码）/麦克风（录音）/通知 按需申请，不预授权。

## 3 平台 / 环境

- **Q1 已定：双平台都支持**（HarmonyOS NEXT API12+ + 纯 OpenHarmony API9+，ADR-0007）。平台相关能力一律走 `PlatformAdapter`（能力探测 + 条件编译），禁止在业务层散落平台判断；适配清单见 `docs/design/06-app-ui-architecture.md` §7。
- 本机无 DevEco：先设计/契约，后构建；出包（M4）需装环境，两个目标各验一次。

## 4 去哪查

- 架构分层 → `docs/design/02-architecture.md` §2
- 字段级契约 → `docs/design/03-contracts.md`（v0.1 草案）
- 垂直切片 → `docs/plan/plan-project-init-2026-11-23.md` §5
