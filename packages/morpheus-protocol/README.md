# @xurunxin/morpheus-protocol

Morpheus 的版本化 DTO、Schema、严格解析器与编解码包。

## 能力

- 解析并规范化 `agent-os/v1`、Control、Worker Lease、Effect 与应用投影协议。
- 提供 `agent-os-interactive.v1` 的交互式 App-plane 操作、rich transcript events、cursor/snapshot/replay 契约。
- 拒绝未知字段、不支持的版本和不一致绑定。
- 生成稳定的规范 JSON 与摘要。
- 校验扩展清单和工具策略数据。
- 以 `ToolResultEnvelope` 表示完成、拒绝和失败结果。

## 不负责范围

本包不访问数据库、文件系统或凭据，不执行模型、工具与沙箱，也不拥有 Run 生命周期、调度策略或 Host 组合。

## 安装

```powershell
bun add @xurunxin/morpheus-protocol@0.4.0
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

事件 envelope 会携带与 session、streamEpoch、sequence 对齐的 cursor；构造器在未
提供 cursor 时按当前事件序列自动生成，wire parser 则要求并校验该字段。

## 依赖边界

本包没有生产依赖。所有输入在进入业务实现前都应经过对应严格解析器。

## 当前限制

`agent-os/v1` 仍是 Agent OS authority 主协议；`agent-os-interactive.v1` 只承载
App-plane 交互意图和 transcript 投影，不拥有 Run、凭据、工具或 Host 生命周期。

## 许可证

Apache-2.0，详见包内 `LICENSE`。
