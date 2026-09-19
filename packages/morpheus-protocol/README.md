# @xurunxin/morpheus-protocol

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
