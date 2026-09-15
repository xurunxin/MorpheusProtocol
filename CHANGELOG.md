# 更新日志

## 未发布

- SDK 的 Node JSONL 传输支持 Interactive v2 与 v3 客户端；修正配置读取和 reconcile 响应的类型提取，供单机 HTTP/SSE 适配服务使用。

## 0.5.0

- 新增 `agent-os-interactive.v2`，覆盖 Agent、workspace、execution、config catalog、context binding 与 workspace change 契约。
- 新增 v2 cursor/snapshot/event strict parser、canonical codec 与身份/digest/gap 校验。
- 将 built-in Admin 的 WorkItem、TaskPlan、Message、Schedule、typed human-control 操作合并到唯一 `agent-os-control/v1` matrix/code inventory。
- 新增 `agent-os-remote-ingress.v1` 远端授权 proof 契约：proof 携带 Ed25519 `signature` 与签发密钥 `keyId`，并提供规范签名载荷编解码（`createAgentOsRemoteIngressV1ProofSigningPayload`），Host 侧可验证签发方真实性。
- SDK v3 客户端强制命令成功终态（accepted/completed）必须携带 command receipt；rejected 为独立拒绝语义。
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
