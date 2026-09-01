# 更新日志

## 0.5.0

- 新增 `agent-os-interactive.v2`，覆盖 Agent、workspace、execution、config catalog、context binding 与 workspace change 契约。
- 新增 v2 cursor/snapshot/event strict parser、canonical codec 与身份/digest/gap 校验。
- 将 built-in Admin 的 WorkItem、TaskPlan、Message、Schedule、typed human-control 操作合并到唯一 `agent-os-control/v1` matrix/code inventory。
- Protocol 与 SDK 锁步升级至 0.5.0。

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
