---
读者: Docs/Architect / App Agent / Plugin Agent
类型: review
权威: 中（评审结论，只增不改）
状态: 有条件通过（2 Critical 待关闭）
---

# 02 03-contracts v0.1 评审（2026-11-23）

评审方式：code-reviewer 子代理只读评审。结论：**有条件通过**；端点形状与 02 §4 完全一致。

## Critical（实现前必须关闭）

| # | 问题 | 处置 |
|---|---|---|
| R1 | 写端点鉴权标注不一致：`token/refresh` 仅写 Authorization，`DELETE /devices`、`PUT /whitelist` 未写鉴权，与 02 §3.2「所有写请求校验 token + X-Device-Id」冲突 | 已在 v0.2 统一：所有写端点显式标注 `Authorization` + `X-Device-Id`；管理端点另加"仅回环" |
| R2 | App 版本通道冲突：02 §7 写"直查 GitHub Release"，03 §6 写"查网关 /mobile/version"，`version` 模块职责只写 plugin 上游 | 负责人决策，登记 `docs/open-questions.md` Q7；v0.2 在 §6 标注二选一待定 |

## Important（v0.2 已修 / 已登记）

- R3 WS 首帧缺 deviceId、`subscribe` 缺省语义、auth 失败行为 → v0.2 补 `{type:"auth",token,deviceId}` + WS 错误码。
- R4 缺 413 超限码、二进制上传端点 → v0.2 加 413；二进制上传端点登记 Q8。
- R5 `/mobile/version` "轻鉴权"二义 → v0.2 定稿为"无鉴权（只读非敏感）"。
- R6 代理透传边界 + 网关错误码 → v0.2 加 502/504 与透传范围。
- R7 `required=true` 行为、plugin 段产物类型 → v0.2 定义；仍有一项登记 open-questions。
- R8 配对载体 payload 未定义 → v0.2 定义二维码/链接内容。
- R9 缺"怎么验"矩阵 → v0.2 新增 §8 验收矩阵。
- R10 事件词汇"暂定"标注 → 由 code-explorer 核对完成，v0.2 改为确定结论（4 个业务事件均需映射）。
- R11/R12/R13 字段小问题 → v0.2 统一字段、注明版本来源、错误码加子码。

## 事件词汇核对（code-explorer，dsh-v0.2.3-alpha.2）

**不能透传。** DSH 真实事件是 `namespace/verb` 形式（`SessionEventMap`，65 个 `KNOWN_SESSION_EVENT_TYPES`），我们的 4 个业务事件**全部是需映射的合成名**：

| 本契约 type | DSH 真实来源 | 映射 |
|---|---|---|
| `session.updated` | `session/title` + `api-session/added`/`activity` | 合并多源，非单一事件 |
| `message.delta` | `assistant-stream` 的 `chunk` frame（`attemptId/index/chunk`） | `chunk`→`delta`、`attemptId`→`messageId`、补 `sessionId` |
| `tool.call` | `tool/call`（斜杠）`{turn,step,callId,name,arguments}` | 改名、`name`→`toolName`、补 `sessionId` |
| `agent.status` | `api-session/status(sessionId, running)` / `SessionState` | 来源是 API/Cordis 而非事件日志 |
| `ping`/`pong` | 无 | WS 心跳，本契约专有 |

证据：`vendor/deepseek-harness/packages/core/session/src/types.ts`、`.../known-event-types.ts`、`docs/subsystems/session.md`、`docs/persistence-catalog.md`。
