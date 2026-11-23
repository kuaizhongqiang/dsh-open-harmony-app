---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 草案
依赖: docs/handoffs/m3-slice-2026-11-23.json, docs/design/03-contracts.md, docs/decisions/ADR-0008-ca-lifecycle.md, docs/plan/plan-debug-sign-device-2026-11-23.md, docs/plan/plan-app-health-ondevice-2026-11-23.md
---

# plan-m3-followups-2026-11-23

M3 垂直切片已跑通 health。本计划收口交接清单中的遗留桩，使 App↔Plugin 链路具备真机可用能力。正式 In-house 发布因无企业实名账号暂不纳入；当前验证载体为 DevEco 自动签名 debug hap + USB 反向端口转发。

## 1 目标

1. App 侧：HUKS 安全存储、TLS pin 真校验、扫码入口、WS 真实事件订阅、版本检查。
2. Plugin 侧：CA 生命周期、状态持久化、DSH 事件订阅、12 MiB 回复上限、pairingKey 签发/管理接口。
3. 双端：契约差异同批改完，补测试与门禁，真机端到端验证。

## 2 阶段

| 阶段 | 内容 | 验收 |
|---|---|---|
| P1 安全底座 | HUKS + TLS pin + CA 锚指纹校验（配对前拒连不降级） | 单测覆盖 pin 决策；真机配对前校验锚 |
| P2 连接与状态 | plugin 状态持久化、App token 持久化、WS 真实 DSH 事件 | 重启后设备/token/配对/白名单可恢复；WS 收到 DSH 映射事件 |
| P3 交互与运营 | 扫码入口、版本监控、管理页面数据链路 | 真机可扫码；App/plugin 能检查 GitHub Release 并校验 SHA-256 |
| P4 收口 | 契约/门禁/文档/真机 E2E | check-* 全绿；ADR-0008 §9 关键用例可执行 |

## 3 纪律

- 先改 `docs/design/03-contracts.md`（如需），再同批改 app + plugin。
- 跨端字段/错误码同批完成；共享路径串行写。
- 密钥/CA 私钥/token/pin 不进仓；debug 证书与 dev CA 仅用于本机验证。
- 不关闭 TLS 校验、不装系统信任库、不用 HTTP 明文。
- 每个阶段结束补测试与可复验命令。

## 4 当前环境

- 网关：`https://127.0.0.1:3443`（USB rport → PC 3443），开发 CA 由 App `caPath` 信任。
- 真机：hdc `7HD9K26127014659`；已安装 debug hap；health 实测 `ok rtt=71ms`。
- 签名：DevEco 自动签名，`app/build-profile.json5` 已忽略，模板 `app/build-profile.example.json5`。
- DSH submodule：`dsh-v0.2.3-alpha.2`，只读。

## 5 阶段执行记录

### P0 契约/门禁/低风险缺口（2026-11-23，已完成）
- 插件补齐 `400 INVALID_REQUEST`（malformed JSON / 非对象 body / whitelist 字段类型错误），`ERROR_CODES`/`ERROR_STATUS`/错误工厂/测试同步。
- 插件补齐 12 MiB 回复上限：`HarmonyConfig.maxReplyBytes` / `ResolvedConfig.maxReplyBytes`，`proxy()` 超限返回 413；新增小上限用例。
- `check-contracts.mjs` 状态码集合扩展到 `400,401,403,404,409,413,429,502,504`；`check-sync.mjs` 纳入三个 CA 端点；`02-architecture.md` 同步 v0.5 与 CA 端点表。
- 插件内 v0.4 文档漂移统一为 v0.5；`npm test` 27/27 PASS，`check-contracts`/`check-sync`/`check-docs` PASS。
- App 增加 `VersionInfo`/`VersionResponse`、`HttpClient.version()`、`HttpClient.refreshToken()`、页面版本检查按钮；`BUILD SUCCESSFUL`。

### P2 状态持久化（2026-11-23，插件侧完成）
- 新增 `plugin/src/store.ts`：`StateStore` / `MemoryStateStore` / `JsonFileStore`，原子写 `mobile-access/state.json`（0600）。
- token / pairingKey 只持久化 SHA-256 摘要；设备、token 元数据、配对记录、限流窗口、白名单重启可恢复。
- `GatewayState` 接受 `StateStore`，每次 mutation 落盘；`server.ts` 用 `JsonFileStore`。
- `plugin/test/persistence.test.ts` 验证重启恢复、摘要落盘、已消费 key 仍失效；`npm test` 29/29 PASS。

### P2/P3 进行中
- DSH 真实事件、HUKS、TLS pin、扫码、版本来源/签名校验仍未收口，继续按本计划推进。
