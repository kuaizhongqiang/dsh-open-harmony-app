# plugin/AGENT.md — dsh 插件路径纪律

只写「不能做什么 + 去哪查」。职责见 `docs/design/02-architecture.md` §3、`docs/design/04-agent-collaboration.md`。

## 1 归属

- Owner：Plugin Agent。`plugin/**` 一文件一 owner，越界先提 handoff。
- 只读：`vendor/deepseek-harness/**`。

## 2 红线（技术）

1. **不改 deepseek-harness 源码**：插件通过 dsh 插件机制安装/卸载，不写入 DSH 安装目录。
2. 插件是**进程内插件**：用 `@deepseek-ai/cordis` 的 `ctx.plugin()` 注册；HTTP/WS 路由用 `@deepseek-ai/dsh-host-webserver` 的 `ctx.webServer`；回环地址用 `ctx.webServer.getOrigin()`。
3. 回环代理：网关以本机操作者身份代理到 Host(3080)；**管理 API 只接受 TCP 对端为回环**，不暴露公网。
4. WebSocket 默认拦截第三方路径，按**精确路径**白名单放行（不接受查询串/模糊前缀）。
5. 安全双闸：配对设备模型 + OpenClaw 式白名单（`trustedProxies` IP / `allowUsers` 用户 / `userHeader` 身份头），两把锁独立。
6. 契约真源是 `docs/design/03-contracts.md`：改字段先改契约、再改实现，**同批改完 app 侧**。
7. 发布：npm 包名 `dsh-harmony`；版本监控 + 升级校验（SHA-256），禁静默自更新。
8. Q7 定稿：App 升级直查 GitHub Release，`/mobile/version` 的 `app` 段仅为缓存；Q8 定稿：配对 payload 固定 CA 指纹（`dshpair://v1/...`）。见 ADR-0007。
9. **CA 生命周期（ADR-0008）**：CA 私钥只存 `mobile-access/certs/{ca,remote-ca}/`（0600），不进仓/制品；自签 FRP 用独立 remote-ca；叶子 90 天/剩 30 天续期（锚不变免重配对）；换 CA 必作废旧 token 强制全员重配 + 双 Origin 重叠窗口；轮换/撤销仅回环管理端点；旧 CA 只读保留 90 天后清理，私钥安全擦除。

## 3 去哪查

- 插件 API / 内核契约 → `vendor/deepseek-harness/packages/`（`core`、`web`、`host/webserver`、`sdk`）
- 架构分层 → `docs/design/02-architecture.md` §3
- CA 生命周期 → `docs/decisions/ADR-0008-ca-lifecycle.md`
- 字段级契约 → `docs/design/03-contracts.md`（v0.5）
