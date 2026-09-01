# 更新日志

## 0.4.0

- 新增版本化 `agent-os-interactive.v1` App-plane 协议。
- 新增 session、turn、transcript、provider、queue、compact、steer/follow-up 和 interaction 操作。
- 新增带 session/run/turn/attempt/effect/binding identity 的 rich transcript events、cursor、snapshot、replay 与严格 canonical serializer。
- Protocol 与 SDK 锁步升级至 0.4.0。

## 0.3.0

- Protocol 与 SDK 锁步升级至 0.3.0。
- Tool Result 统一为严格的 `ToolResultEnvelope`，提供解析与编解码 API。
- Personal Host 非 v1 状态统一分类为 `unknown`，仅允许隔离或显式重置。
- 统一日常验证、完整验证与 tag 发布入口。
