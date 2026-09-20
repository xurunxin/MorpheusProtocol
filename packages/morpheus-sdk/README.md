# @xurunxin/morpheus-sdk

0.6.6：新增 `createWorkerPromptClientV1({ request }).request(input, signal)`，精确依赖 Protocol 0.6.6。调用方注入已授权私有 transport；客户端校验请求与响应绑定，不持有执行权限，不重试。AbortSignal 只取消传输，取消 Run 必须显式发送 prompt.cancel。

transport 必须允许读／取消与长时间 start 并发，按 requestId 关联响应并序列化帧写入。命令幂等性和当前执行状态由 Worker 持久化 owner 处理；SDK 不创建 claim、grant 或时间戳。

0.6.4：`createRequestInspectorWireClientV1({ request }).read(request, signal)` 对接已有本地 transport，先验证只读请求，再验证响应身份、ready/unavailable 与事件数量。不建立连接、不自动重试、不管理执行或捕获权限。

H12（0.6.3）：`createRequestInspectorClientV1({ snapshot })` 使用调用方提供的已授权只读 transport，验证返回快照。`reduceInspectorEventV1(previous, event)` 是纯函数，返回 applied、duplicate 或 snapshot-required；epoch 改变、cursor 缺口、摘要冲突、过期重复及同请求来源 revision 倒退均要求重新读取快照。历史最多保留 128 项。取消读取不取消执行，没有重试、执行或开启原始捕获接口。

0.6.0 候选新增 `createInteractiveV4AppClient` 与 `transitionInteractiveV4Queue`。
命令先读取同一可信连接的 capabilities，显式传入 `{ capabilities, signal }`；不支持的操作
fail closed。Reducer 对 gap/conflict/倒退要求 snapshot 重建，连接恢复不会自动重发 prompt。

Morpheus App Plane 的轻量客户端 SDK。它组合公开协议 DTO 与调用方注入的传输，不保存服务端状态。

单机适配服务可使用 `createInteractiveV2AppClient` 与 `@xurunxin/morpheus-sdk/node` 的 `createInteractiveJsonlStreamTransport` 连接 Host 的本机管道。传输连接由调用方提供；HTTP/SSE 转换不接管 Host 的会话、Run、授权或取消状态。

## 能力

- 创建 Prompt 客户端编排。
- 管理取消信号和关联请求。
- 应用不可变投影快照与增量。
- 校验握手与应用可见的协议上下文。
- 提供无状态 `InteractiveAppClient` 与唯一确定性的 transcript reducer。
- 提供无状态 `InteractiveV2AppClient`，包含 Agent/workspace/execution/config catalog、context binding、workspace change helpers。
- 提供 `InteractiveV2` reducer，识别 duplicate、gap、conflict 与 binding/session drift。
- 提供无状态 `InteractiveV3AppClient`（`agent-os-interactive.v3`）：command binding 回执指纹校验、`capability.read`、transcript 订阅沿用 v2 数据面并共用同一 reducer。
- 提供环境 transport 入口：`@xurunxin/morpheus-sdk/node`（注入式 JSONL duplex，面向 Node IPC/named pipe）与 `@xurunxin/morpheus-sdk/browser`（注入式 fetch/WebSocket）。

## 不负责范围

本包不持有凭据、URL、存储、计时器、轮询、生命周期或策略 authority，也不提供默认网络传输。

## 安装

```powershell
bun add @xurunxin/morpheus-sdk@0.5.0
```

## 使用示例

```ts
import {
  createAgentOsAppClient,
  createInteractiveAppClient,
} from "@xurunxin/morpheus-sdk";

const app = createAgentOsAppClient(promptClient);

const interactive = createInteractiveAppClient({
  request: (request, signal) => transport.request(request, signal),
  subscribe: (request, signal) => transport.subscribe(request, signal),
});
const response = await interactive.request(transcriptReadRequest);
let projection = interactive.reduce(null, response);
for await (const frame of interactive.subscribeTranscript(subscribeRequest)) {
  projection = interactive.reduce(
    projection.kind === "committed" ? projection.state : null,
    frame,
  );
}
```

`subscribeTranscript()` 会原样产出首个 transcript response frame，随后产出 event frame；
因此 `snapshot-required` 的原子快照不会在 SDK 内丢失，并可直接交给同一个 reducer 重建。

```ts
import { createInteractiveV2AppClient } from "@xurunxin/morpheus-sdk";

const interactive = createInteractiveV2AppClient({
  request: (request, signal) => personalHost.request(request, signal),
});
const catalog = await interactive.readAgentCatalog({
  schemaVersion: "agent-os-interactive.v2",
  operation: "agent.catalog.read",
  requestId: "request.agent-catalog.1",
});
```

v3 客户端与 v2 共用同一个数据面 reducer；回执会按 canonical 命令指纹校验：

```ts
import { createInteractiveV3AppClient } from "@xurunxin/morpheus-sdk";

const interactive = createInteractiveV3AppClient({
  request: (request, signal) => transport.request(request, signal),
  subscribe: (request, signal) => transport.subscribe(request, signal),
});
const capabilities = await interactive.readCapabilities({
  schemaVersion: "agent-os-interactive.v3",
  operation: "capability.read",
  requestId: "request.capability.1",
});
```

环境 transport 入口只做 wire 适配，连接与端点全部由调用方注入：

```ts
// Node 专属入口（Node IPC / named pipe；连接由 net.connect 等注入）。
import { createInteractiveJsonlStreamTransport } from "@xurunxin/morpheus-sdk/node";

const nodeTransport = createInteractiveJsonlStreamTransport({
  connect: () => net.connect(pipePath),
});

// browser-safe 入口（fetch + WebSocket 全部注入，endpoint 显式提供）。
import { createBrowserInteractiveTransport } from "@xurunxin/morpheus-sdk/browser";

const browserTransport = createBrowserInteractiveTransport({
  requestEndpoint,
  webSocketFactory: () => new WebSocket(subscribeUrl),
  fetch,
});
```

## 依赖边界

本包只精确依赖同版本 `@xurunxin/morpheus-protocol`。应用应通过公开 SDK 与版本化协议协作。
主入口与 `./browser` 入口不包含 Node 内建依赖；`./node` 入口同样不 import `node:*`，
连接由调用方注入，因此真实 browser bundle 不携带 Node builtins 或 Host 实现。

## 当前限制

传输重试、持久化和服务发现由应用提供。交互投影出现序列缺口、冲突或上下文漂移时，
v1/v2/v3 reducer 返回 `rebuild-required`，调用方需要重新获取完整快照；SDK 不会自动重发 prompt。
订阅关闭（`break`/`return`/abort）、socket EOF 与浏览器页面刷新只拆除 wire 订阅，
绝不合成 `turn.cancel`；取消必须是携带 command binding 的显式命令（或经
`runInteractiveV3TurnWithAbort` 编排）。

## 许可证

Apache-2.0，详见包内 `LICENSE`。
0.6.7：新增 `createTaskHandleClientV1({ request }).request(input, signal)`，精确依赖 Protocol 0.6.7。观察、交付模式切换和取消意图均校验严格契约及响应绑定，无重试、缓存或调度。AbortSignal 仅中断传输；调用方保留视图时可使用 Protocol successor 校验器防止状态回退。
