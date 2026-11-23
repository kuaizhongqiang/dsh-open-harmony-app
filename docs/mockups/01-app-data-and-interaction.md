---
读者: App Agent / mockup 子代理 / Docs/Architect
类型: design
权威: 高（以 vendor/deepseek-harness 只读 submodule 源码为准；本项目文档仅用于桥接说明）
状态: v1.0（返工：DSH 真实数据结构与 P1–P9 页面映射）
依赖: ["vendor/deepseek-harness/packages/api/session-controller/src/types.ts", "vendor/deepseek-harness/packages/core/session/src/types.ts", "vendor/deepseek-harness/packages/llm/llm/src/message.ts", "vendor/deepseek-harness/packages/llm/llm/src/types.ts", "vendor/deepseek-harness/packages/core/tools/src/contracts.ts", "vendor/deepseek-harness/packages/core/tools/src/presentation.ts", "vendor/deepseek-harness/packages/core/session/src/known-event-types.ts", "vendor/deepseek-harness/packages/session/session-title/src/types.ts", "docs/design/03-contracts.md", "docs/design/06-app-ui-architecture.md", "vendor/deepseek-harness/packages/api/session-controller/src/client/contract/snapshot.ts", "vendor/deepseek-harness/packages/api/session-controller/src/client/contract/events.ts", "vendor/deepseek-harness/packages/attachment/attachment/src/types.ts", "vendor/deepseek-harness/packages/core/tool-executor-ptc/src/types.ts", "vendor/deepseek-harness/packages/client/ui-session-status/src/client/status.ts", "vendor/deepseek-harness/packages/api/session-controller/src/index.ts", "vendor/deepseek-harness/packages/api/gateway/README.zh.md"]
---

# App 端：DSH 真实数据结构与页面映射

> 本文只写文档，不写 HTML/CSS，不修改 `vendor/deepseek-harness`。事实来源于只读 submodule 与本项目设计文档；凡源码未覆盖的推断一律标「未证实」。

## 0 证据缩写

| 缩写 | 完整路径 |
|---|---|
| `[SC]` | `vendor/deepseek-harness/packages/api/session-controller/src/types.ts` |
| `[SS]` | `vendor/deepseek-harness/packages/core/session/src/types.ts` |
| `[LM]` | `vendor/deepseek-harness/packages/llm/llm/src/message.ts` |
| `[LT]` | `vendor/deepseek-harness/packages/llm/llm/src/types.ts` |
| `[TC]` | `vendor/deepseek-harness/packages/core/tools/src/contracts.ts` |
| `[TP]` | `vendor/deepseek-harness/packages/core/tools/src/presentation.ts` |
| `[KE]` | `vendor/deepseek-harness/packages/core/session/src/known-event-types.ts` |
| `[ST]` | `vendor/deepseek-harness/packages/session/session-title/src/types.ts` |
| `[C03]` | `docs/design/03-contracts.md` |
| `[C06]` | `docs/design/06-app-ui-architecture.md` |
| `[SCX]` | `vendor/deepseek-harness/packages/api/session-controller/src/client/contract/snapshot.ts` |
| `[CE]` | `vendor/deepseek-harness/packages/api/session-controller/src/client/contract/events.ts` |
| `[AT]` | `vendor/deepseek-harness/packages/attachment/attachment/src/types.ts` |
| `[PTC]` | `vendor/deepseek-harness/packages/core/tool-executor-ptc/src/types.ts` |
| `[SUI]` | `vendor/deepseek-harness/packages/client/ui-session-status/src/client/status.ts` |
| `[SCE]` | `vendor/deepseek-harness/packages/api/session-controller/src/index.ts` |
| `[GW]` | `vendor/deepseek-harness/packages/api/gateway/README.zh.md` |

---

## 1 纠偏声明：上一轮的合成字段与真实对应

| # | 上一轮做法（合成/臆造） | 真实结构与规则 | 源码证据 |
|---|---|---|---|
| 1 | 把 `title` 当作 `Session` / `SessionSummary` 的普通字段。 | `SessionSummary` 根本没有 `title` 字段；标题是 projection key `SessionProjectionMap.title: string \| null`，由最新 `session/title` 事件折叠成 `SessionTitleSnapshot`，列表行要从 `SessionSummary.projections.values.title` 读取。 | `[SC:145-159]`、`[SC:40-53]`、`[ST:79-87]`、`[ST:40-56]` |
| 2 | 用单一 `status` 表达会话状态。 | DSH wire/summary 没有统一 `status`。真实维度至少分三层：`SessionSummary.running/blank/agentAvailable/formatStatus`；`SessionState.cursor/active/running/queue/pendingInput`；客户端 UI 再组装 `SessionStatus{running,pendingInteraction,completionUnread,completionFailed}`。 | `[SC:145-159]`、`[SC:602-613]`、`[SCX:68-94]`、`[SUI:15-31]`、`[SC:684-690]` |
| 3 | 用 `message.delta` 表示流式增量，且把 `attemptId` 当 `messageId`。 | `message.delta` 是本项目契约的合成 WS type（`[C03:106-114]` 明示“合成名”）。真实链路是 `StreamChunk`（`text-delta`/`reasoning-delta`/`tool-call-delta`/`block-start`/`block-end`/`usage`/`finish`）→ `SessionAssistantStreamFrame{start,chunk,end}`（含 `attemptId/revision/index/turn/step`）→ 客户端 `assistant/live-chunk`。`LlmAttemptId` 与 `MessageId` 是不同身份。诚实：`attemptId → messageId` 的改名会丢失尝试级语义。 | `[C03:106-114]`、`[LT:488-508]`、`[SC:511-542]`、`[CE:6-17]`、`[LM:163-168]` |
| 4 | 把消息正文当作单一字符串或 `delta` 累加结果。 | `Message.content` 恒为 `readonly ContentBlock[]`；七种 block 为 `text/reasoning/image/file/tool-call/tool-addition/tool-removal`。工具调用参数在 block 中是原始 JSON 字符串，不是已解析对象。 | `[LM:163-173]`、`[LT:139-157]`、`[LT:111-119]` |
| 5 | 把工具调用压成 `toolName`/`args` 单卡，忽略结果与呈现意图。 | 真实事件是 `tool/call{turn,step,callId,name,arguments}` 与 `tool/result{turn,step,message,error?,meta?}`；`ToolCallView` 有 3 种 card，`ToolResultView` 有 6 种 card，另有 PTC 子调用 `tool/ptc-dispatch-start` / `tool/ptc-dispatch`。 | `[SS:371-400]`、`[TP:46-46]`、`[TP:140-140]`、`[PTC:11-28]`、`[PTC:30-62]`、`[KE:77-80]` |
| 6 | 事件 envelope 被合成事件名替代，未保留 `seq/time/data`。 | 真实 `SessionWireEvent` 必有 `type/seq/time/data`，可带 `ignorable/sourceEventSeqs/surfaceOp`；`SessionFollowFrame` 是 `snapshot` / `event` / `assistant-stream` 的联合。 | `[SC:447-462]`、`[SC:550-562]`、`[SS:513-536]`、`[KE:22-88]` |
| 7 | 头像/附件直接画成本地 URL 或路径。 | durable 附件是 `ImageAttachmentRef` / `FileAttachmentRef`，`attachmentId` 是不透明存储 ID，永不是文件路径或 bearer URL；`image` part 提交时带 `mediaType/data`，Host 提升为 durable ref。 | `[AT:10-46]`、`[SC:66-80]`、`[LT:80-109]` |
| 8 | “列表摘要=最后一条消息文本”。 | 列表行只有 `updatedAt/blank/running/normalized projection values` 等；末条消息文本需另读历史页（`session/events` / `session/follow` 的 records），不能从 `SessionSummary` 凭空取。 | `[SC:145-159]`、`[SC:444-445]`、`[SC:544-562]` |

> 本项目契约层已自认 `session.updated`/`message.delta`/`tool.call`/`agent.status` 为“合成名”，由 Plugin 映射后下发 `[C03:101-117]`；本文保留页号，但把页面内容改为直接对齐 DSH 真实字段，并明确桥接关系。

---

## 2 字段级数据结构表

### 2.1 SessionSummary（会话列表行，含 projections hints）

| 字段 | 类型 | 可选 | UI 展示位置 | 源码路径 |
|---|---|---|---|---|
| `sessionId` | `SessionId` | 否 | P3 行主键、P4 路由参数 | `[SC:145-159]` |
| `agentAvailable` | `boolean` | 否 | P3/P4 是否可交互的灰度依据 | `[SC:145-159]` |
| `formatStatus` | `'current' \| 'migration-required'` | 是 | P3 迁移角标；P7 诊断说明 | `[SC:145-159]` |
| `updatedAt` | `number` | 否 | P3 排序、相对时间 | `[SC:145-159]` |
| `running` | `boolean` | 否 | P3 运行中圆点 | `[SC:145-159]` |
| `blank` | `boolean` | 否 | P3 “空会话”样式 | `[SC:145-159]` |
| `parentSessionId` | `SessionId` | 是 | P3 缩进/父子关系 | `[SC:145-159]` |
| `origin` | `'subagent'` | 是 | P3 子代理标签 | `[SC:145-159]` |
| `cwd` | `string` | 是 | P3 副标题（若展示） | `[SC:145-159]` |
| `projections` | `SessionProjectionHints` | 是 | P3 标题与续聊提示的唯一摘要来源 | `[SC:145-159]` |
| `projections.kind` | `'cached' \| 'sequenced'` | 否 | P3 决定是否可与当前连接 seq 比较 | `[SC:40-53]` |
| `projections.asOfSeq` | `number` | 否 | P3 合并水位 | `[SC:40-53]` |
| `projections.values` | `Partial<SessionProjectionSummaryValues>` | 否 | P3 逐 key 渲染，缺失即未知 | `[SC:40-53]` |
| `projections.values.title` | `string \| null` | 是 | P3 会话标题（不是顶层字段） | `[ST:79-87]` |
| `projections.values.conversationContinuation` | `SessionSeq \| null` | 是 | P3 空 prompt 续聊提示 | `[SC:19-29]` |
| `projections.imageLimits` | `ImageAttachmentLimits` | 否（但 summary 排除） | 不从列表取；来自 boot 常量 | `[SC:23-29]` |

补充：`SessionListValue.items` 才是列表响应体 `[SC:243-246]`；搜索结果是 `SessionSearchItem{sessionId,snippet}` `[SC:161-171]`。

### 2.2 SessionWireHeader + SessionTitleSnapshot（会话详情 header）

| 字段 | 类型 | 可选 | UI 展示位置 | 源码路径 |
|---|---|---|---|---|
| `header.version` | `number` | 否 | P7 格式信息 | `[SC:425-437]` |
| `header.id` | `SessionId` | 否 | P4 header 主键 | `[SC:425-437]` |
| `header.createdAt` | `number` | 否 | P4 创建时间 | `[SC:425-437]` |
| `header.cwd` | `string` | 是 | P4 工作目录 | `[SC:425-437]` |
| `header.parentSession` | `SessionId` | 是 | P4 父会话入口 | `[SC:425-437]` |
| `header.isSeeded` | `boolean` | 否 | P4 分叉继承标记 | `[SC:425-437]` |
| `header.origin` | `'subagent'` | 是 | P4 子代理标记 | `[SC:425-437]` |
| `header.delegationDepth` | `number` | 是 | P4 层级深度 | `[SC:425-437]` |
| `header.agentPreset` | `string` | 是 | P4 预设标签 | `[SC:425-437]` |
| `title.title` | `string` | 否 | P4 可编辑标题 | `[ST:40-48]` |
| `title.messageSeqs` | `SessionSeq[]` | 否 | P4 “根据哪些消息生成”说明 | `[ST:40-48]` |
| `title.source` | `SessionTitleSource`（fallback/provider/user） | 否 | P4 标题来源徽标；`user` 表示固定不再自动生成 | `[ST:27-48]` |
| `title.eventSeq` | `SessionSeq` | 否 | P4 标题事件定位 | `[ST:50-56]` |
| `title.updatedAt` | `number` | 否 | P4 标题更新时间 | `[ST:50-56]` |

重命名走 RPC `session/rename`，返回 `{title, seq}` 而不是修改本地对象 `[SC:289-299]`、`[SCE:410-413]`。

### 2.3 SessionState / SessionSnapshot / SessionStatus（运行状态与 UI 状态）

| 字段 | 类型 | 可选 | UI 展示位置 | 源码路径 |
|---|---|---|---|---|
| `SessionState.cursor` | `number` | 否 | P4 增量游标 | `[SC:602-613]` |
| `SessionState.active` | `boolean` | 否 | P4 是否有 live Agent | `[SC:602-613]` |
| `SessionState.running` | `boolean` | 否 | P4 状态标签、停止按钮 | `[SC:602-613]` |
| `SessionState.queue` | `SessionQueuedItem[] \| null` | 否 | P4 队列 dock；`null`= passive 无可读队列 | `[SC:602-613]`、`[SC:591-597]` |
| `SessionState.pendingInput` | `SessionPendingInput[]`（approval/question/other） | 否 | P4 需要输入提示；单独变化不触发 observeState | `[SC:599-613]` |
| `SessionSnapshot.sessionId` | `SessionId` | 否 | P4 绑定身份 | `[SCX:68-94]` |
| `SessionSnapshot.pendingSubmissions` | `PendingSubmission[]` | 否 | P4 本地乐观消息；reload 后只从 durable events 重建 | `[SCX:40-57]`、`[SCX:68-94]` |
| `SessionSnapshot.running` | `boolean` | 否 | P4 状态 | `[SCX:68-94]` |
| `SessionSnapshot.openState` | `'cold'\|'loading'\|'open'\|'error'` | 否 | P4 历史加载骨架/错误 | `[SCX:59-60]`、`[SCX:68-94]` |
| `SessionSnapshot.historyLoadStatus` | `'idle'\|'loading'\|'pendingConsumption'\|'error'` | 否 | P4 上拉加载 | `[SCX:68-94]` |
| `SessionSnapshot.awaitingFirstTurn` | `boolean` | 否 | P4 首次发送等待 `turn/start` | `[SCX:91-93]` |
| `SessionSnapshot.lastAgentError` | `string \| null` | 否 | P4/P7 错误条 | `[SCX:68-94]` |
| `SessionStatus.running` | `boolean \| undefined` | 否 | P3/P4 聚合状态（undefined=基线未到） | `[SUI:15-31]` |
| `SessionStatus.pendingInteraction` | `SessionPendingInteraction \| undefined` | 否 | P4 审批/问题卡片 | `[SUI:15-31]` |
| `SessionStatus.completionUnread` | `boolean` | 否 | P3 未读角标 | `[SUI:15-31]` |
| `SessionStatus.completionFailed` | `boolean` | 否 | P3 失败标记 | `[SUI:15-31]` |
| `SessionWaitValue.reason` | `'idle'\|'input-required'\|'timeout'` | 否 | P4 等待态文案 | `[SC:636-641]` |

> 状态组合规则（设计建议，非源码事实）：`running=true` 用 `SessionState.running`；`pendingInput` 非空叠加“需要输入”；`queue` 非空叠加排队数；标题仍从 projection 取；不要从 `SessionSummary` 臆造 `status`。

### 2.4 Message 五角色 + ContentBlock 七种

| 字段 | 类型 | 可选 | UI 展示位置 | 源码路径 |
|---|---|---|---|---|
| `Message.id` | `MessageId` | 否 | P4 行 key | `[LM:163-173]` |
| `Message.content` | `readonly ContentBlock[]` | 否 | P4 正文块数组 | `[LM:163-173]` |
| `Message.source` | `MessageSource` | 否 | P4 来源徽标；未知 kind 要 fall through | `[LM:128-161]` |
| `SystemMessage.role` | `'system'` | 否 | P4 折叠的系统提示区 | `[LM:175-179]` |
| `DeveloperMessage.role` | `'developer'` | 否 | P4 工具更新/上下文说明 | `[LM:181-184]` |
| `UserMessage.role` | `'user'` | 否 | P4 用户气泡 | `[LM:186-189]` |
| `AssistantMessage.role` | `'assistant'` | 否 | P4 助手气泡 | `[LM:191-195]` |
| `ToolResultMessage.role` | `'tool'` | 否 | P4 工具结果卡 | `[LM:197-205]` |
| `ToolResultMessage.toolCallId` | `ToolCallId` | 否 | P4 与 tool/call 配对 | `[LM:197-205]` |
| `ToolResultMessage.isError` | `boolean` | 是 | P4 错误态 | `[LM:197-205]` |
| `ContentBlock.type='text'` | `TextBlock{text}` | 否 | P4 普通文本 | `[LT:68-72]` |
| `ContentBlock.type='reasoning'` | `ReasoningBlock{text}` | 否 | P4 思考链折叠区，区别于可见文本 | `[LT:74-78]` |
| `ContentBlock.type='image'` | `ImageBlock{attachment,offloaded?}` | 否 | P4 图片；`offloaded` 显示占位文本 | `[LT:80-96]` |
| `ContentBlock.type='file'` | `FileBlock{attachment}` | 否 | P4 文件卡片；provider 只见句柄文本 | `[LT:98-109]` |
| `ContentBlock.type='tool-call'` | `ToolCallBlock{id,name,arguments}` | 否 | P4 工具调用块；`arguments` 是原始 JSON 字符串 | `[LT:111-119]` |
| `ContentBlock.type='tool-addition'` | `ToolAdditionBlock{toolName}` | 否 | P4 developer 区工具激活说明 | `[LT:121-131]` |
| `ContentBlock.type='tool-removal'` | `ToolRemovalBlock{toolName}` | 否 | P4 developer 区工具移除说明 | `[LT:133-137]` |
| `ContentBlock` 联合 | `ContentBlockMap[keyof]` | 否 | switch `type`，未知要 fall through | `[LT:139-157]` |

`extractTextContent()` 只取 `text` block，reasoning/tool-call 不贡献文本 `[LM:334-348]`。

### 2.5 StreamChunk + SessionAssistantStreamFrame + AssistantLiveChunkEvent

| 字段 | 类型 | 可选 | UI 展示位置 | 源码路径 |
|---|---|---|---|---|
| `StreamChunk.type='block-start'` | `{index,blockType}` | 否 | P4 新块占位 | `[LT:488-508]` |
| `StreamChunk.type='text-delta'` | `{index,text}` | 否 | P4 文本追加 | `[LT:488-508]` |
| `StreamChunk.type='reasoning-delta'` | `{index,text}` | 否 | P4 思考区追加 | `[LT:488-508]` |
| `StreamChunk.type='tool-call-delta'` | `{index,id,name?,argumentsDelta}` | 否 | P4 工具参数流式拼接（原始字符串） | `[LT:488-508]` |
| `StreamChunk.type='block-end'` | `{index,block}` | 否 | P4 定稿单个 block | `[LT:488-508]` |
| `StreamChunk.type='usage'` | `{usage: TokenUsage}` | 否 | P4 token 计数 | `[LT:174-196]`、`[LT:488-508]` |
| `StreamChunk.type='finish'` | `{reason: FinishReason,replayState?}` | 否 | P4 结束原因（stop/tool-calls/max-tokens/aborted/error） | `[LT:159-172]`、`[LT:488-508]` |
| `SessionAssistantStreamFrame.start` | `{type:'start',attemptId,revision,startedAfterSeq,turn,step}` | 否 | P4 新尝试起始行 | `[SC:511-542]` |
| `SessionAssistantStreamFrame.chunk` | `{type:'chunk',attemptId,revision,index,time,chunk}` | 否 | P4 流式行；`chunk` 是 `JsonValue` | `[SC:511-542]` |
| `SessionAssistantStreamFrame.end` | `{type:'end',attemptId,revision,index,outcome}` | 否 | P4 收敛为 committed(seq/eventType) 或 abandoned | `[SC:511-542]` |
| `SessionAssistantStreamAttempt` | `{attemptId,startedAfterSeq,turn,step,nextIndex,stream}` | 否 | P4 重连 opening 的活跃尝试恢复 | `[SC:492-509]` |
| `SessionFollowFrame` | `snapshot \| event \| {type:'assistant-stream',frame}` | 否 | P4/P3 订阅主联合 | `[SC:550-562]` |
| `AssistantLiveChunkEvent.type` | `'assistant/live-chunk'` | 否 | P4 客户端暂态行（非 durable） | `[CE:6-17]` |
| `AssistantLiveChunkEvent.seq/time` | `number` | 否 | P4 在 durable seq 之间排序 | `[CE:6-17]` |
| `AssistantLiveChunkEvent.data` | `{attemptId,turn,step,chunk: StreamChunk}` | 否 | P4 无 revision/index，不是 wire frame | `[CE:6-17]` |
| `SessionEventChange.kind` | `replace/prepend/append/settle-assistant` | 否 | P4 增量窗口更新；settle 按 attemptId 替换暂态行 | `[CE:97-114]`、`[CE:176-195]` |

### 2.6 tool/call + tool/result 事件 + ToolCallView/ToolResultView card + PTC 子调用

| 字段 | 类型 | 可选 | UI 展示位置 | 源码路径 |
|---|---|---|---|---|
| `tool/call.data.turn/step` | `number` | 否 | P4/P5 归属于哪一轮哪一步 | `[SS:371-376]` |
| `tool/call.data.callId` | `ToolCallId` | 否 | P5 路由参数、配对主键 | `[SS:371-376]` |
| `tool/call.data.name` | `string` | 否 | P4 卡标题回退 | `[SS:371-376]` |
| `tool/call.data.arguments` | `string` | 否 | P5 原始 JSON 字符串展示 | `[SS:371-376]` |
| `tool/result.data.message` | `ToolResultMessage` | 否 | P4/P5 结果正文块 | `[SS:377-400]` |
| `tool/result.data.error` | `{name,code,reason?}` | 是 | P5 错误详情；仅 `isError:true` 可出现 | `[SS:390-399]` |
| `tool/result.data.meta` | `JsonValue` | 是 | P5 呈现意图载荷；core 不解释 | `[SS:377-400]` |
| `ToolResult.isError` | `boolean` | 否 | P4/P5 成功/失败样式 | `[TC:152-165]` |
| `ToolDefinition.presentCall` | `(args) => ToolCallView \| undefined` | 是 | P4 pending 卡 | `[TC:85-94]` |
| `ToolDefinition.presentResult` | `(args,result) => ToolResultView \| undefined` | 是 | P4/P5 completed 卡 | `[TC:95-102]` |
| `ToolCallView.card='generic'` | `GenericCallView{title,kind?,rawInput?,content?,locations?}` | 否 | P4 默认工具卡 | `[TP:42-75]` |
| `ToolCallView.card='terminal'` | `TerminalCallView{title,description?,cwd?}` | 否 | P4 终端命令卡 | `[TP:77-100]` |
| `ToolCallView.card='diff'` | `DiffCallView{title,diffs,locations?}` | 否 | P4 内联 diff 卡 | `[TP:102-118]` |
| `ToolResultView.card='generic'` | `GenericResultView{title?,content?}` | 否 | P5 默认结果卡 | `[TP:142-155]` |
| `ToolResultView.card='terminal'` | `TerminalResultView{title?,output?,exitCode?/signal?}` | 否 | P5 终端输出与退出态 | `[TP:157-176]` |
| `ToolResultView.card='diff'` | `DiffResultView{title?,diffs}` | 否 | P5 应用后 diff | `[TP:178-190]` |
| `ToolResultView.card='search'` | `SearchMatchesResultView \| SearchPathsResultView`，`shape='matches'\|'paths'`，含 `truncated/total` | 否 | P5 搜索结果卡，禁止把截断当完整 | `[TP:192-267]` |
| `ToolResultView.card='read'` | `ReadResultView{path,offset,lines,totalLines,lang?,content?}` | 否 | P5 带行号代码视图 | `[TP:269-308]` |
| `ToolResultView.card='web'` | `WebSearchResultView \| WebFetchResultView`，`kind='search'\|'fetch'`，含 `truncated` | 否 | P5 引用/抓取卡 | `[TP:310-389]` |
| `ToolCallKind` | `read/edit/delete/move/search/execute/fetch/other` | 否 | P4 图标/分类；`other` 为默认 | `[TP:10-15]` |
| `tool/ptc-dispatch-start.data` | `{rootCallId,parentCallId,subCallId,name,arguments}` | 否 | P4 子调用运行中；按 `subCallId` 与 settle 配对 | `[PTC:11-18]`、`[PTC:32-45]` |
| `tool/ptc-dispatch.data` | `PtcDispatchStartEventData + {isError,content,meta?,error?}` | 否 | P4/P5 子调用完成；每个 start 恰有一个 settle（含 abort） | `[PTC:20-28]`、`[PTC:46-61]` |
| `RUN_CODE_NAME` | `'run_code'` | 否 | P4 PTC 根调用名 | `[TC:12-13]` |

### 2.7 65 事件按 A–H 八类分组（全名清单 + UI 渲染标记）

图例：**应渲染** = 进入 P4 消息流或显式卡片；**状态/折叠** = 只更新状态栏、折叠区或下钻；**仅日志** = 普通聊天流不渲染，可在 P7/诊断查看。所有事件名来自 `[KE:22-88]`；标注 `payload 未证实` 表示本轮未读其 data 类型，具体卡片形态不得臆造。

#### A 组：会话生命周期 / 回合步骤 / 运行配置（12）

| 事件全名 | UI 建议 | 证据与说明 |
|---|---|---|
| `turn/start` | 状态/折叠 | `[SS:298-304]` |
| `turn/end` | 状态/折叠 | `[SS:305-313]` |
| `step/start` | 状态/折叠 | `[SS:314-315]` |
| `step/end` | 状态/折叠 | `[SS:316-317]` |
| `session/end-seed` | 仅日志 | `[SS:418-442]` |
| `agent-preset/selected` | 状态/折叠 | payload 未证实 |
| `model/selection` | 状态/折叠 | payload 未证实 |
| `sandbox/mode` | 状态/折叠 | payload 未证实 |
| `permission/preset` | 状态/折叠 | payload 未证实 |
| `plan/mode` | 状态/折叠 | payload 未证实 |
| `working-directory/change` | 状态/折叠 | payload 未证实 |
| `workspace-root/change` | 状态/折叠 | payload 未证实 |

#### B 组：消息 / 内容 / 压缩 / 助手尝试（10）

| 事件全名 | UI 建议 | 证据与说明 |
|---|---|---|
| `system/message` | 状态/折叠 | `[SS:334-345]` |
| `developer/message` | 状态/折叠 | `[SS:326-333]` |
| `user/message` | 应渲染 | `[SS:318-325]` |
| `assistant/message` | 应渲染 | `[SS:346-364]`；含 `message/stream/usage?/interrupted?` |
| `assistant/attempt` | 状态/折叠 | `[SS:365-370]` |
| `image/offload` | 状态/折叠 | `[KE:90-93]`；投影解释器事件 |
| `compaction/start` | 仅日志 | payload 未证实 |
| `compaction/end` | 仅日志 | payload 未证实 |
| `compaction/prune` | 仅日志 | payload 未证实 |
| `compaction/summary` | 状态/折叠 | payload 未证实 |

#### C 组：工具执行 / PTC（8）

| 事件全名 | UI 建议 | 证据与说明 |
|---|---|---|
| `tool/call` | 应渲染 | `[SS:371-376]` |
| `tool/result` | 应渲染 | `[SS:377-400]` |
| `tool/ptc-dispatch-start` | 应渲染 | `[PTC:32-45]` |
| `tool/ptc-dispatch` | 应渲染 | `[PTC:46-61]` |
| `tool-workflow/run-start` | 状态/折叠 | payload 未证实 |
| `tool-workflow/run-end` | 状态/折叠 | payload 未证实 |
| `tool-workflow/agent-start` | 状态/折叠 | payload 未证实 |
| `tool-workflow/agent-end` | 状态/折叠 | payload 未证实 |

#### D 组：审批 / 反馈 / 交互卡（7）

| 事件全名 | UI 建议 | 证据与说明 |
|---|---|---|
| `approval/asked` | 应渲染 | payload 未证实；对应 pendingInput `'approval'` `[SC:599-600]` |
| `approval/decided` | 应渲染 | payload 未证实 |
| `approval/policy` | 状态/折叠 | payload 未证实 |
| `feedback/message-delete` | 状态/折叠 | payload 未证实 |
| `feedback/message-put` | 状态/折叠 | payload 未证实 |
| `feedback/record` | 仅日志 | payload 未证实 |
| `action-cards/decision` | 应渲染 | payload 未证实 |

#### E 组：目标 / 待办 / 日程 / 产物 / 后台作业（6）

| 事件全名 | UI 建议 | 证据与说明 |
|---|---|---|
| `goal/change` | 状态/折叠 | payload 未证实 |
| `todo/write` | 应渲染 | payload 未证实 |
| `schedule/change` | 状态/折叠 | payload 未证实 |
| `deliverables/presented` | 应渲染 | payload 未证实 |
| `job/registered` | 状态/折叠 | payload 未证实 |
| `job/settled` | 状态/折叠 | payload 未证实 |

#### F 组：子代理 / 团队（8）

| 事件全名 | UI 建议 | 证据与说明 |
|---|---|---|
| `subagent/catalog` | 状态/折叠 | payload 未证实 |
| `subagent/descriptor` | 状态/折叠 | payload 未证实 |
| `subagent/model-selection-policy` | 状态/折叠 | payload 未证实 |
| `team/member` | 状态/折叠 | payload 未证实 |
| `team/message/delivered` | 应渲染 | payload 未证实 |
| `team/message/queued` | 状态/折叠 | payload 未证实 |
| `team/mode` | 状态/折叠 | payload 未证实 |
| `team/task` | 应渲染 | payload 未证实 |

#### G 组：外部执行 / Web / Hook / 重试 / inbox（9）

| 事件全名 | UI 建议 | 证据与说明 |
|---|---|---|
| `command/run` | 状态/折叠 | payload 未证实 |
| `command/done` | 状态/折叠 | payload 未证实 |
| `hook/invoked` | 仅日志 | payload 未证实 |
| `hook/result` | 仅日志 | payload 未证实 |
| `web/deepseek-search-llm-request` | 仅日志 | payload 未证实 |
| `session-log-deepseek/delivery-accepted` | 仅日志 | payload 未证实 |
| `agent/inbox/spliced` | 状态/折叠 | payload 未证实 |
| `llm/retry` | 状态/折叠 | payload 未证实 |
| `llm/retry-started` | 状态/折叠 | payload 未证实 |

#### H 组：标题 / 请求日志 / 工作区变更（5）

| 事件全名 | UI 建议 | 证据与说明 |
|---|---|---|
| `session/title` | 状态/折叠 | `[ST:40-48]`；投影成 title，不在消息流当正文 |
| `session/title-llm-request` | 仅日志 | payload 未证实 |
| `request/header` | 仅日志 | `[SS:400-410]` |
| `request/context` | 仅日志 | `[SS:411-417]` |
| `workspace/changes` | 状态/折叠 | payload 未证实 |

> envelope 公共字段对所有 65 项成立：`type/seq/time/data`，可选 `ignorable/sourceEventSeqs/surfaceOp` `[SC:447-462]`、`[SS:513-536]`。surfaceOp 只允许在 5 类 surface 事件 `[SS:448-462]`。

### 2.8 ModelCatalog / ModelSelection / Attachment

| 字段 | 类型 | 可选 | UI 展示位置 | 源码路径 |
|---|---|---|---|---|
| `ModelSelection.provider` | `string` | 否 | P4 模型选择 | `[SC:82-87]` |
| `ModelSelection.model` | `string` | 否 | P4 模型选择 | `[SC:82-87]` |
| `ModelSelection.reasoningEffort` | `string` | 是 | P4 推理强度 | `[SC:82-87]` |
| `ModelCatalog.default` | `ModelSelection` | 否 | P4 默认选中项 | `[SC:126-133]` |
| `ModelCatalog.routableProviders` | `string[]` | 否 | P4 provider 过滤 | `[SC:126-133]` |
| `ModelCatalog.groups` | `ModelProviderGroup[]` | 否 | P4 分组选择器 | `[SC:112-117]`、`[SC:126-133]` |
| `ModelCatalogModel.reasoning` | `ModelReasoning{efforts,defaultEffort?}` | 是 | P4 推理强度下拉 | `[SC:89-110]` |
| `ModelCatalogModel.badge` | `LlmModelBadge{text,tone}` | 是 | P4 显示标签（仅展示数据） | `[SC:102-110]`、`[LT:354-366]` |
| `ModelCatalog.failures` | `ModelCatalogFailure[]` | 否 | P4/P7 provider 失败提示 | `[SC:119-133]` |
| `PromptContentPart.type='text'` | `{text}` | 否 | P4 InputBar | `[SC:66-80]` |
| `PromptContentPart.type='image'` | `{mediaType,data,name?}` | 否 | P4 图片上传 | `[SC:66-80]` |
| `PromptContentPart.type='file'` | `{receiptId}` | 否 | P4 文件上传回执 | `[SC:66-80]` |
| `ImageAttachmentRef.attachmentId` | `AttachmentId` | 否 | P4/P5 不透明 ID，禁当 URL | `[AT:10-32]` |
| `ImageAttachmentRef.mediaType` | `ImageMediaType` | 否 | P4 图片渲染 | `[AT:7-8]`、`[AT:10-32]` |
| `ImageAttachmentRef.width/height/bytes` | `number` | 否 | P4 尺寸/体积 | `[AT:10-32]` |
| `ImageAttachmentRef.name/originalDimensions` | `string? / {width,height}?` | 是 | P4 文件名与原始尺寸 | `[AT:10-32]` |
| `FileAttachmentRef.attachmentId/name/bytes` | `AttachmentId/string/number` | 否 | P4 文件卡 | `[AT:34-46]` |
| `SessionAttachmentValue.data` | `string` | 否 | P4/P5 durable 图片读取（base64） | `[SC:331-343]` |

---

## 3 P1–P9 页面映射（沿用 06 页号，内容换成真实字段）

### 3.0 传输关系总览（先读）

- DSH Host：**一元调用走 RPC `/api`**，调用形式为 `ctx.connection.rpc.call('/api', endpoint, ...)` `[GW:31]`、`[GW:60]`；**流式 Remote 走 Host 的 `/api/remote.mux` WebSocket** `[GW:41]`。会话 endpoint 名由 `@Remote` 声明，例如 `session/list` `[SCE:254-258]`、`session/follow` `[SCE:583-586]`、`session/state` `[SCE:549-552]`、`session/prompt` `[SCE:441-466]`。
- 本项目网关：`/mobile/api/**` 是需鉴权的**回环代理**，透传 Host 2xx/4xx/5xx 与 `X-Contract-Version` `[C03:82-85]`；`WS /mobile/ws` 下发的是 Plugin **映射后的合成事件** `[C03:101-117]`。
- 因此页面拿 DSH 真字段有两条路：**A）直连路径**：App → `/mobile/api/**` → Host `/api` RPC / `/api/remote.mux` 流，保留 DSH 字段名；**B）兼容路径**：App → `/mobile/ws` 收 `session.updated`/`message.delta` 等合成名，由 Plugin 映射。本文以 A 为真源，B 仅为兼容层。`06` 中 `/mobile/api/sessions` 等仍是占位路径 `[C06:15-16]`，具体子路径未证实，禁止把占位路径写成既成事实。

### 3.1 P1 启动 / 设备选择页

- **展示的真实字段**：无 DSH 会话字段；仅网关/本地 `origin/token/caFingerprint/reachable/lastSeenAt`，以及 `VersionInfo` `[C03:28-32]`、`[C03:49-52]`。
- **状态变体**：无本地凭据 → P2；有有效 token → P3；探活失败 → 重试；`required:true` 升级 → 阻断 `[C03:135-140]`。
- **DSH 事件/端点**：无；只调用 `GET /mobile/health`、`GET /mobile/version` `[C06:63]`。
- **桥接说明**：此页不进入 `/mobile/api/**`，也不碰 `/api` RPC；不要提前拉 `session/list`。

### 3.2 P2 配对扫码页

- **展示的真实字段**：`PairingKey{v,pairingKey,origin,expiresAt,caFingerprint}` 与配对响应 `{deviceId,token,issuedAt,expiresAt,caFingerprint}` `[C03:41-47]`、`[C03:60-66]`。
- **状态变体**：扫码待确认 / 指纹不符 / `409` 已用 / `403` 白名单 / `429` 限流 / 成功写 HUKS `[C03:65-68]`。
- **DSH 事件/端点**：无；`POST /mobile/pair` 是网关 carve-out `[C03:68]`。
- **桥接说明**：token 只进 HUKS，不进 AppStorage `[C06:148]`；配对完成后才获得访问 `/mobile/api/**` 的鉴权能力。

### 3.3 P3 会话列表页

- **展示的真实字段**：`SessionSummary.sessionId/running/blank/agentAvailable/updatedAt/formatStatus/parentSessionId/origin/cwd`，标题只取 `projections.values.title`，续聊提示取 `conversationContinuation`；`kind='cached'` 时 `asOfSeq` 不可与当前连接 seq 比较 `[SC:40-53]`、`[SC:145-159]`、`[ST:79-87]`。
- **状态变体**：`running` 开/关；`blank`；`formatStatus='migration-required'`；`origin='subagent'`；`projections` 缺失（标题未证实）；`agentAvailable=false`。
- **DSH 事件/端点**：RPC `session/list` 返回 `SessionListValue.items` `[SC:243-246]`、`[SCE:254-258]`；实时列表走 RPC `session/control` 的 `baseline` + `projection` 帧 `[SC:586-589]`、`[SCE:604-622]`；兼容路径为 `WS /mobile/ws` 的 `session.updated` `[C03:110]`。
- **桥接说明**：合成 `session.updated{title,updatedAt}` 必须还原为「`updatedAt` 来自 summary/activity + `title` 来自 projection」两个事实 `[C03:110]`、`[SC:684-697]`；DSH 的 `api-session/added/removed/status/activity/error` 是 Cordis 事件而非日志事件 `[SC:669-705]`，Plugin 映射到合成 type 时不得丢 `sessionId` 来源。

### 3.4 P4 聊天页

- **展示的真实字段**：`SessionWireHeader`；`SessionFollowFrame.snapshot.records` / event envelope `type/seq/time/data`；durable `user/message`、`assistant/message`、`tool/call`、`tool/result`；`ContentBlock[]`（区分 `text/reasoning/image/file/tool-call`）；`SessionAssistantStreamFrame.start/chunk/end` 的 `attemptId/revision/index/turn/step`；`SessionState.running/queue/pendingInput`；`ToolCallView/ToolResultView` card `[SC:425-437]`、`[SC:550-562]`、`[SS:297-400]`、`[LT:139-157]`、`[TC:85-102]`。
- **状态变体**：冷启动 loading / 历史 `hasMore` / 流式中 / `awaitingFirstTurn` / `pendingInput=approval\|question\|other` / `queue` 非空 / `interrupted:true` / `usage` 有/无 / `outcome=committed\|abandoned` / PTC start 未 settle `[SCX:68-94]`、`[SS:346-364]`、`[SC:511-542]`、`[PTC:32-61]`。
- **DSH 事件/端点**：RPC `session/follow`（stream，返回 `snapshot/event/assistant-stream`）`[SCE:583-586]`；`session/events` / `page` `[SCE:505-519]`；`session/state` + `observeState` `[SCE:549-563]`；发送 `session/prompt` `[SCE:441-466]`；停止 `session/cancel` `[SCE:493-496]`；队列 `session/updateQueue` `[SCE:483-486]`；模型 `session/modelCatalog`/`selectModel` `[SCE:289-320]`；图片 `session/attachment` `[SCE:473-476]`。
- **桥接说明**：合成 `message.delta` 的真实载荷是 `{sessionId,messageId,delta}` `[C03:111]`，而 wire frame 是 `{attemptId,revision,index,time,chunk}` `[SC:511-542]`；Plugin 必须保留 `attemptId/revision/index/chunk`，用 `chunk.text` 或 `chunk.argumentsDelta` 而不是臆造 `delta` 字符串。`PromptContentPart` 的 file 分支用 `receiptId`，不是本地路径 `[SC:66-80]`。

### 3.5 P5 工具详情页

- **展示的真实字段**：`tool/call.data{callId,name,arguments,turn,step}`；`tool/result.data{message,error?,meta?}`；`ToolResultMessage.isError/toolCallId`；`ToolCallView.card` 与 `ToolResultView.card`（generic/terminal/diff/search/read/web）；`search.truncated/total`、`read.offset/totalLines`、`web.truncated`、`terminal.exitCode/signal`；PTC `rootCallId/parentCallId/subCallId` `[SS:371-400]`、`[LM:197-205]`、`[TP:46-140]`、`[TP:192-389]`、`[PTC:11-28]`。
- **状态变体**：pending（只有 call）/ completed（result 到达）/ `isError` / `meta` 缺失回退 raw content / card 能力不足回退 generic / PTC start 未 settle。
- **DSH 事件/端点**：Durable 事件 `tool/call`/`tool/result`/PTC 两事件 `[KE:77-80]`、`[PTC:45-61]`；从 P4 传入 `@ObjectLink`，无需独立 RPC `[C06:131]`；工具元信息 DSH 侧未证实（契约占位 `GET /mobile/api/tools/:toolName` `[C06:67]`）。
- **桥接说明**：合成 `tool.call{sessionId,toolName,args}` `[C03:112]` 丢掉了 `callId/turn/step` 且把 `arguments` 改名；P5 下钻参数必须改用 `{sessionId,toolCallId}`，并从 durable event 取原始 `arguments` 字符串。

### 3.6 P6 设置页

- **展示的真实字段**：网关本地字段 `server.origins/device.name/settings.notifyEnabled` `[C06:142-146]`；手动检查版本的 `VersionInfo` `[C03:49-52]`；模型偏好若展示则来自 `ModelSelection.provider/model/reasoningEffort` `[SC:82-87]`。
- **状态变体**：已配对/未配对；token 有效/过期；模型默认存在/缺失；升级提醒 `upgrade.pending`。
- **DSH 事件/端点**：可用 `session/modelCatalog` `[SCE:317-320]` 与 `session/selectModel` `[SCE:289-292]`（若做 Host 模型设置）；否则仅 `GET /mobile/version`、`POST /mobile/token/refresh` `[C06:68]`。
- **桥接说明**：不调用 `GET /mobile/devices` `[C06:47-53]`；模型字段若经网关，应保留 `provider/model/reasoningEffort` 原名，不要压成 `modelName`。

### 3.7 P7 连接诊断页

- **展示的真实字段**：网关 `base URL/CA 指纹/token expiresAt/RTT/错误码` `[C06:69]`、`[C03:119-135]`；DSH 侧可显示 `SessionWireHeader.version`、`formatStatus`、`SessionSnapshot.openState/openError/promptError`、`SessionState.active`、`SessionWaitValue.reason` `[SC:425-437]`、`[SC:145-159]`、`[SCX:68-94]`、`[SC:636-641]`。
- **状态变体**：health 正常/不可达；WS 连接/重连；`502 UPSTREAM_UNREACHABLE` / `504 UPSTREAM_TIMEOUT`；`session/agent-busy` / `session/writer-held` / `session/migration-required` 等错误详情 `[SC:173-211]`。
- **DSH 事件/端点**：`GET /mobile/health`、`POST /mobile/token/refresh`、`WS /mobile/ws` ping/pong `[C06:69]`；可选 `session/state` `[SCE:549-552]` 做只读探测。
- **桥接说明**：DSH 错误来自 RPC failure details map `[SC:173-211]`，网关自生错误只有 `502/504` `[C03:82-85]`；两者必须分栏，不能把 Host 错误伪装成网关错误。

### 3.8 P8 版本升级提示页 / 弹窗

- **展示的真实字段**：`VersionInfo{current,latest,url,sha256,required}` `[C03:49-52]`；无 DSH 会话字段。
- **状态变体**：`required=false` 可关闭；`required=true` 不可跳过；下载中/校验失败/等待安装 `[C03:135-140]`、`[C06:70]`。
- **DSH 事件/端点**：无；`GET /mobile/version`，下载走 `app.url`（GitHub Release，非网关）`[C06:70]`、`[C03:137-140]`。
- **桥接说明**：不经过 `/api` RPC，也不经过 `/mobile/api/**`；plugin 升级提示指向 PC 端。

### 3.9 P9 已配对设备页

- **展示的真实字段**：本机持久化 `origin/device.name/caFingerprint/reachable/lastSeenAt` `[C03:28-32]`、`[C06:71]`。
- **状态变体**：默认网关/非默认；可达/不可达（探活）；待确认“忘记此网关”。
- **DSH 事件/端点**：无服务端端点；仅本地 `PersistentStorage` + HUKS，可达性复用 `GET /mobile/health` `[C06:47-53]`、`[C06:71]`。
- **桥接说明**：手机端不是回环对端，禁止调用 `GET/DELETE /mobile/devices` `[C03:74-76]`；删除只清本机凭据。

---

## 4 下游 mockup 子代理「必须展示的真实结构」checklist

1. 每个 durable 事件行必须显示 envelope `type/seq/time/data`，可选 `ignorable/sourceEventSeqs/surfaceOp` 不得凭空补成必填 `[SC:447-462]`。
2. 列表行标题必须来自 `SessionSummary.projections.values.title`，并且显示 `projections.kind='cached'|'sequenced'` 与 `asOfSeq`；不得画顶层 `title` `[SC:40-53]`、`[ST:79-87]`。
3. 状态必须拆成 `running`、`blank`、`agentAvailable`、`SessionState.pendingInput`、`SessionState.queue`；不得出现单一 `status` 字段 `[SC:145-159]`、`[SC:602-613]`。
4. 消息正文必须是 `content: ContentBlock[]`，且要能区分 `text` 与 `reasoning` 两种文本块 `[LM:163-173]`、`[LT:139-157]`。
5. 图片/文件块必须显示 `attachment.attachmentId`、`mediaType/name/bytes`，`attachmentId` 不能显示为文件路径或 URL `[AT:10-46]`。
6. `tool-call` block 与 `tool/call` 事件的 `arguments` 必须按原始 JSON 字符串展示，不得伪装成已解析对象 `[LT:111-119]`、`[SS:371-376]`。
7. `tool/result` 必须显示 `message.isError`、`toolCallId`，可选 `error{name,code,reason?}` 与 `meta` 分开呈现 `[SS:377-400]`、`[LM:197-205]`。
8. 工具卡必须显示 `card` 类型：`ToolCallView` 三种 generic/terminal/diff，`ToolResultView` 六种 generic/terminal/diff/search/read/web；能力不足时写明回退到 raw content `[TP:46-46]`、`[TP:140-140]`。
9. 搜索结果卡必须显示 `shape='matches'|'paths'` 与 `truncated/total`；read 卡必须显示 `offset/totalLines`；web 卡必须显示 `truncated` `[TP:192-389]`。
10. 流式区域必须显示 `SessionAssistantStreamFrame.start/chunk/end`，含 `attemptId/revision`，start 还有 `turn/step/startedAfterSeq`，chunk 还有 `index/time`，end 还有 `outcome` `[SC:511-542]`。
11. `StreamChunk` 必须按判别联合绘制 `text-delta`/`reasoning-delta`/`tool-call-delta`/`block-start`/`block-end`/`usage`/`finish`，`finish.reason.kind` 不得省略 `[LT:488-508]`、`[LT:159-172]`。
12. 重连 opening 必须显示 `SessionFollowFrame.snapshot` 的 `header/cursor/records/hasMore/projections/assistantStream?`，不能只画“消息列表” `[SC:550-562]`。
13. `assistant/live-chunk` 必须标注为客户端暂态行，字段是 `{type,seq,time,data:{attemptId,turn,step,chunk}}`，不能与 durable `assistant/message` 混绘 `[CE:6-17]`。
14. PTC 子调用必须成对显示 `tool/ptc-dispatch-start` 与 `tool/ptc-dispatch` 的 `subCallId`，并保留 `rootCallId/parentCallId`、`isError/content/meta?` `[PTC:11-28]`、`[PTC:32-61]`。
15. 65 事件必须至少允许在诊断视图按 A–H 八类筛选；普通流只渲染白名单，`request/header`、`request/context`、`hook/*` 等不得当聊天正文 `[KE:22-88]`、`[SS:400-417]`。
16. 模型选择器必须画出 `ModelCatalog.default`、分组 `groups[].models[]`、`reasoning.efforts/defaultEffort`、`failures`，字段用 `provider/model/reasoningEffort` 原名 `[SC:82-133]`。
17. 发起 prompt 的输入必须表达 `PromptContentPart[]`（text/image/file+receiptId），发送回执是 `SessionPromptValue.accepted:true`，不是新建 message 对象 `[SC:315-329]`。
18. 桥接标签必须写明：DSH RPC `/api` + endpoint（如 `session/list`）、流式 `/api/remote.mux`、本项目 `/mobile/api/**` 代理与 `/mobile/ws` 合成事件是不同层 `[GW:31]`、`[GW:41]`、`[GW:60]`、`[C03:82-85]`、`[C03:101-117]`。

---

## 5 mock 数据示例（全部为示意假值）

### 5.1 SessionSummary（P3 一行）

```json
{
  "sessionId": "sess_fake_001",
  "agentAvailable": true,
  "formatStatus": "current",
  "updatedAt": 1760000000123,
  "running": false,
  "blank": false,
  "origin": "subagent",
  "cwd": "/fake/workspace/demo",
  "projections": {
    "kind": "sequenced",
    "asOfSeq": 42,
    "values": {
      "title": "示例会话标题",
      "conversationContinuation": null
    }
  }
}
```

> `parentSessionId` 是可选字段 `[SC:145-159]`；示例故意省略，mockup 不得把缺失字段渲染成 `null`。

### 5.2 tool/call durable 事件（P4/P5）

```json
{
  "type": "event",
  "event": {
    "type": "tool/call",
    "seq": 17,
    "time": 1760000000456,
    "data": {
      "turn": 2,
      "step": 1,
      "callId": "call_fake_7",
      "name": "read",
      "arguments": "{\"path\":\"/fake/demo.txt\",\"offset\":1}"
    }
  }
}
```

> `tool/call` 不是 surface 事件，不得携带 `surfaceOp/sourceEventSeqs` `[SS:448-462]`、`[SS:513-536]`；只有 `system/developer/user/assistant/tool-result` 才有这些字段。

### 5.3 assistant-stream.chunk frame（P4 流式行）

```json
{
  "type": "assistant-stream",
  "frame": {
    "type": "chunk",
    "attemptId": "attempt_fake_9",
    "revision": 1,
    "index": 3,
    "time": 1760000000789,
    "chunk": {
      "type": "text-delta",
      "index": 0,
      "text": "这是假的流式文本。"
    }
  }
}
```

> `chunk` 在 wire 上是 `JsonValue` `[SC:521-528]`；这里用合法 `StreamChunk` 形态填充 `[LT:496-508]`。客户端暂态行 `assistant/live-chunk` 不带 `revision/index`，不要混用 `[CE:6-17]`。
