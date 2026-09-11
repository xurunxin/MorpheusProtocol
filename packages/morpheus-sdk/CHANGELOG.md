# 更新日志

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
