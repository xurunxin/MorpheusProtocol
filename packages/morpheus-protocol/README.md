# @xurunxin/morpheus-protocol

0.6.12：`agent-os-worker-task-start/v1` 为 Task 创建提供严格业务输入。使用 `parse/encode/decodeAgentOsWorkerTaskStartRequestV1`、对应 Response 和 `assertAgentOsWorkerTaskStartResponseBindingV1`；command digest 排除 transport requestId，完整保留业务参数。`createAgentOsWorkerTaskPromptDigestV1` 定义与已有 Worker child 相同的 canonical prompt digest。

0.6.11：新增 Worker/Control 私有 `task.bind` 与 `task.bind.read`。`parseAgentOsWorkerTaskBindingInputV1`、`create/parseAgentOsWorkerTaskBindingReceiptV1` 和 `assertAgentOsWorkerTaskBindingV1` 绑定真实 Control WorkItem lineage、完整 child authorization 输入、验收条件与目标 revision。历史读取不创建 WorkItem，不授予新执行权限；详见 `docs/worker-task-binding-v1.md`。

0.6.6：新增 `agent-os-worker-prompt/v1` 私有 Worker 业务入口：`prompt.start`（commandId/runId/turnId/attemptId/prompt）、`prompt.read`（runId/cursor/limit）和 `prompt.cancel`（commandId/runId/attemptId/reason）。严格拒绝调用方传入 grant、claim、fence、策略、配置和时间戳；canonical Prompt 响应仍由 Worker 生成。最大帧 1 MiB，read 最多 256 个事件，prompt 复用 32 条 user 消息／64 KiB 解析器，cancel reason 最多 1024 UTF-8 字节。

`createAgentOsWorkerPromptRequestDigestV1` 绑定完整请求，`createAgentOsWorkerPromptCommandDigestV1` 排除 transport requestId，供 Worker 在任何 Control 写入之前持久化幂等命令。相同 commandId 改变业务输入必须拒绝；重试复用原内部请求；cancel 必须从本地持久状态读取当前 claim/fence 并核对 attempt。摘要不是授权，私有通道的所有权检查由组合层负责。JSON 编解码不包含换行；JSONL transport 必须严格 UTF-8、有界缓冲、序列化响应写入，并允许 start 等待期间读取／取消。

0.6.4 新增 `parse/serializeInspectorReadRequestV1` 与 `parse/serializeInspectorReadResponseV1`。唯一 operation 是 `snapshot.read`，limit 为 1–128；ready 响应必须包含合法快照，unavailable 不得附带快照。该契约不授予访问权，由现有 transport 校验本地权限。

0.6.3 的 `create/parse/serializeInspectorEventV1` 与 `parse/serializeInspectorSnapshotV1` 仅传输脱敏 Inspector 数据。Host 必须对所有 reference 使用 epoch 内 HMAC；eventDigest 仅校验内容一致性，不是授权。来源最多 64 项，快照最多 128 个事件；截断须显式标记。token 计数区分 exact/estimated/unobserved，prefix 结构变化不能推断缓存命中，cache 字段须有真实 provider usage。不存在原始捕获字段。

快照必须是连续事件后缀，`dropped + events.length === sequence`；dropped 只记录已淘汰前缀，不表示观察器回调丢弃。同一 requestSnapshotId 的 sourceRevision 在保留窗口内不得倒退；不承诺已淘汰身份的全局单调性，过期重复必须重新读取快照。

0.6.2 新增 `create/parse/serializeAgentOsHostBudgetConsumptionV1`，描述 Control 对已预留 child sub-budget 的排他 Host 消费绑定。`bindingDigest` 只检查完整性；Control 仍须原子认领并保持排他 owner，Host 须核验真实当前 grant、lease、reservation 与本地父执行链。本合同不授权跨 Host 或 Worker 委派。

`createAgentOsHostBudgetGrantDigestV1` 为解析后的 grant 提供统一规范摘要；`assertAgentOsHostBudgetConsumptionRelationshipV1` 验证 grant、运行中 instance、历史预留前状态、预留 receipt 和认领时未消费的 reservation 状态之间的关系。`rootRunId` 是 Host 消费范围根，`budgetTreeRootRunId` 是 Control 预算树根；reservation subject 的 store generation 属于原父 Kernel，不能冒充目标 Host generation。调用方必须提供可信当前 owner、placement、撤销和 fence 证据，不能仅凭传入对象自洽授权。

`claimRevision` 在 v1 固定为 1，不支持续期或重新认领。Control 必须在同一事务中排他认领整个子额度，并阻止该额度继续拆分、结算或释放；过期和 Host 失联不构成安全退款证明。Host 的每次 Effect 在本地 intent 事务中预留，并在外部 I/O 前重新核验当前 Control 归属与 grant/lease。Control 的全局额度保持预留，跨库对账不由本合同实现。

`same-consumption-binding-parent/v1` 要求根执行匹配 grant 的 Run/Attempt、definition/policy/capability 摘要，relationship 将绑定逐项对照可信 Host consumer 根证据；派生执行必须沿真实持久化父 begin 回溯至该根，并保持相同 binding digest、Host/store generation，操作范围只能收窄。缺失父、循环或脱离该消费树的分叉必须拒绝。`allowedEffectKinds` 精确限定 provider、compact 和 tool Effect，`allowRetry` 单独限定显式重试；工具派发仍须具有 `tool.execute` scope，并通过冻结工具定义的原有 capability/approval，绑定不替代工具权限。验证请求按实际 provider Effect 计费。

0.6.0 候选新增 `agent-os-interactive.v4` 输入控制 profile：严格 owner/fence 与 command/input
identity、queue CAS、request/Effect 消费证据、端到端能力状态。旧 v1/v2/v3 parser 保持严格。
使用 `parseAgentOsInteractiveV4Request/Response`、`serializeAgentOsInteractiveV4Request/Response`
和 `createAgentOsInteractiveV4CommandFingerprint`；发布与 Host 能力状态分别验证。

Morpheus 的版本化 DTO、Schema、严格解析器与编解码包。

## 能力

- 解析并规范化 `agent-os/v1`、Control、Worker Lease、Effect 与应用投影协议。
- 提供 `agent-os-interactive.v1` 的交互式 App-plane 操作、rich transcript events、cursor/snapshot/replay 契约。
- 提供 `agent-os-interactive.v2` 的 Agent、workspace、execution、config catalog、context binding 与 workspace change DTO。
- 提供 `agent-os-interactive.v3` 的能力发现（implemented/configured/authorized/ready）、command binding 与幂等 ack 响应契约。
- 提供 `agent-os-remote-ingress.v1` 的远端授权 proof 字段与有效期上限契约（fail closed 窗口校验）。
- 提供 `agent-os-attachment.v1` 的图像附件 wire 形状与限额契约骨架。
- 提供同一 `agent-os-control/v1` wire namespace 下的 Admin typed WorkItem、TaskPlan、Message、Schedule、human-control 操作。
- 拒绝未知字段、不支持的版本和不一致绑定。
- 生成稳定的规范 JSON 与摘要。
- 校验扩展清单和工具策略数据。
- 以 `ToolResultEnvelope` 表示完成、拒绝和失败结果。

## 不负责范围

本包不访问数据库、文件系统或凭据，不执行模型、工具与沙箱，也不拥有 Run 生命周期、调度策略或 Host 组合。

## 安装

```powershell
bun add @xurunxin/morpheus-protocol@0.5.0
```

## 使用示例

```ts
import {
  createAgentOsInteractiveEvent,
  decodeToolResultEnvelope,
  parseAgentOsV1Contract,
} from "@xurunxin/morpheus-protocol";

const contract = parseAgentOsV1Contract(input);
const result = decodeToolResultEnvelope(resultJson);

const event = createAgentOsInteractiveEvent({
  schemaVersion: "agent-os-interactive.v1",
  eventId: "event.demo.1",
  sessionId: "session.demo",
  runId: "run.demo",
  turnId: "turn.demo",
  attemptId: "attempt.demo",
  effectId: "effect.demo",
  bindingRevision: 1,
  streamEpoch: "stream-epoch:demo.1",
  sequence: 1,
  eventType: "assistant.text.delta",
  payload: { contentId: "content.demo", delta: "hello" },
  createdAt: "2026-08-31T00:00:00.000Z",
});
const parsed = parseAgentOsInteractiveEvent(event);
```

v2 的 binding 和 catalog 只暴露 Host 签发的公开名称、revision、availability 与摘要；
prompt 正文、私有路径、凭证和实现层类型不会跨过 Protocol/SDK 边界。

```ts
import {
  createAgentOsInteractiveV2ContextBinding,
  parseAgentOsInteractiveV2Request,
} from "@xurunxin/morpheus-protocol";

const request = parseAgentOsInteractiveV2Request({
  schemaVersion: "agent-os-interactive.v2",
  operation: "context.binding.create",
  requestId: "request.binding.1",
  sessionId: "session.1",
  agentId: "build",
  workspaceId: "workspace.1",
  executionTarget: "sandbox",
  providerId: "minimax-cn",
  modelId: "MiniMax-M3",
  apiFamily: "openai-responses",
  expectedBindingRevision: 1,
});
```

事件 envelope 会携带与 session、streamEpoch、sequence 对齐的 cursor；构造器在未
提供 cursor 时按当前事件序列自动生成，wire parser 则要求并校验该字段。

v3 在 v2 operation 清单上追加了 `capability.read`：修改型 operation 必须携带
command binding（`commandId`、`principal`、`payloadDigest`，可选
`authorityProof`/`authorityEpoch`），只读 operation 禁止携带；幂等收据以
`executed`/`duplicate` 终态返回。transcript 事件流仍保持 v2 wire identity，
v3 不承载事件语义。

```ts
import {
  parseAgentOsInteractiveV3Request,
  createAgentOsInteractiveV3CommandFingerprint,
} from "@xurunxin/morpheus-protocol";

const fingerprint = createAgentOsInteractiveV3CommandFingerprint({
  schemaVersion: "agent-os-interactive.v3",
  operation: "turn.start",
  requestId: "request.turn.1",
  sessionId: "session.1",
  turnId: "turn.1",
  message: "hello",
  bindingRevision: 1,
  command: {
    commandId: "command.1",
    principal: "principal.owner",
    payloadDigest: "sha256:<64 hex>",
  },
});
const request = parseAgentOsInteractiveV3Request({
  schemaVersion: "agent-os-interactive.v3",
  operation: "turn.start",
  requestId: "request.turn.1",
  sessionId: "session.1",
  turnId: "turn.1",
  message: "hello",
  bindingRevision: 1,
  command: {
    commandId: "command.1",
    principal: "principal.owner",
    payloadDigest: fingerprint,
  },
});
```

## 依赖边界

本包没有生产依赖。所有输入在进入业务实现前都应经过对应严格解析器。

## 当前限制

`agent-os/v1` 仍是 Agent OS authority 主协议；interactive v1/v2 只承载 App-plane
交互意图和 transcript/catalog 投影，不拥有 Run、凭据、工具或 Host 生命周期。
`agent-os-interactive.v3` 只新增能力发现、命令绑定与幂等响应语义；
`agent-os-remote-ingress.v1` 与 `agent-os-attachment.v1` 是 B02 契约骨架：
proof 签发/撤销 port 由 Control 侧任务实现，attachment 上传通道与内容存储由
宿主后续任务实现。

## 许可证

Apache-2.0，详见包内 `LICENSE`。
0.6.7：新增 `agent-os-task-handle/v1`。`createAgentOsTaskHandleV1` 固定 WorkItem/RunChild/父子 attempt/input/target 身份，`parseAgentOsTaskViewV1` 分离执行、父结算、交付、验收及追加证据。提供 `parse/encode/decodeAgentOsTaskRequestV1`、对应 Response API、请求/命令摘要与 `assertAgentOsTaskResponseBindingV1`，`assertAgentOsTaskViewSuccessorV1` 校验单个句柄的视图演进。parser 不验证回执真实性、不签发权限；Host 必须核对持久化事实。
