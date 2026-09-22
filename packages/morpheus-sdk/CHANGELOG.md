# 更新日志

## 0.6.13

- 锁步消费 Protocol 0.6.13；公开 SDK 调用方式不变。

## 0.6.12

- Add strict private Worker task.start business contract and stateless SDK client, with full command/response binding and canonical prompt identity.

## 0.6.11

- 精确锁步 Protocol 0.6.11；Worker 私有 WorkItem 绑定不新增业务客户端权限。

## 0.6.7

- 新增无状态任务句柄客户端，严格校验输入及响应；不重试，中断观察不取消任务。Protocol 精确锁步 0.6.7。

## 0.6.6

- 新增无状态 Worker Prompt v1 客户端，校验业务输入和响应绑定；中断传输不取消 Run，精确依赖 Protocol 0.6.6。

## 未发布

- 0.6.4：精确依赖 Protocol 0.6.4，增加正式 Inspector wire client，拒绝关联漂移、超出请求容量和取消后结果。

- 0.6.3：精确依赖 Protocol 0.6.3，增加 Inspector 纯 reducer 与只读快照客户端；gap/conflict/reconnect 均保留不确定性，不猜测模型理解、缓存命中或任务完成。

- 0.6.2 与 Protocol 锁步；精确依赖新增 Host budget consumption 合同的 Protocol 0.6.2，无新的有状态 SDK 行为。

- 0.6.1 支持通过 `prompt.queue.owner.read` 发现 Host 逻辑回合；要求 queue.read 能力就绪，拒绝跨 session 响应，无自动重试。

## 0.6.0（next）

- 0.6.0 新增 `createInteractiveV4AppClient` 和 `transitionInteractiveV4Queue`；拒绝缺少能力、跨 owner、错误 command receipt 和状态倒退。缺口要求显式 snapshot 重建，无自动重发。
- Node JSONL 传输与 Interactive v2 类型兼容；配置状态读取及 reconcile 返回明确响应类型。

## 0.5.0

- 新增无状态 `InteractiveV3AppClient`（`agent-os-interactive.v3`）：command binding 回执按 canonical 指纹校验、`capability.read` helper；transcript 订阅保持 v2 数据面 wire identity 并与 v2 共用同一确定性 reducer（dedup、乱序、缺口 rebuild、恢复快照一致）。
- 新增子路径导出 `@xurunxin/morpheus-sdk/node`（注入式 JSONL duplex transport，面向 Node IPC/named pipe）与 `@xurunxin/morpheus-sdk/browser`（注入式 fetch/WebSocket transport）；两个入口与主入口均不 import `node:*`，真实 browser bundle 不含 Node builtins 与 Host imports。
- 订阅/连接生命周期与取消分离：关闭订阅、abort、socket EOF 只拆除 wire 连接，绝不合成 `turn.cancel`。
- 新增 `runInteractiveV3TurnWithAbort`：AbortSignal 只触发显式 `turn.cancel` 命令请求。
- 新增无状态 `InteractiveV2AppClient` 及 Agent/workspace/execution/config/context/workspace helpers。
- 新增 v2 transcript reducer，支持 snapshot rebuild、duplicate 去重、gap/conflict 与上下文漂移检测。
- 与 Protocol 锁步升级至 0.5.0。

## 0.4.0

- 与 Protocol 锁步升级至 0.4.0。
- 新增无状态 `InteractiveAppClient`，由调用方注入 request/subscribe transport。
- 新增唯一确定性 transcript reducer，支持 snapshot、增量、重放去重和 gap/conflict rebuild。
- transcript subscribe 保留完整 response frame，使 `snapshot-required` 能被调用方原子重建。
- 同一 session 内仅在连续 fresh event 证明新 Run identity 时推进 snapshot，拒绝 metadata-only Run 漂移。

## 0.3.0

- 与 Protocol 锁步升级至 0.3.0。
- 精确依赖 `@xurunxin/morpheus-protocol@0.3.0`。
- 保持无状态客户端与调用方注入传输边界。
