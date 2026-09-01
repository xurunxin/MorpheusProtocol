# 更新日志

## 0.5.0

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
