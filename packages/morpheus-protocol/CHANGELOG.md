# 更新日志

## 0.5.0

- 新增 `agent-os-interactive.v2` catalog、context binding、workspace change DTO 及严格编解码器。
- 新增 built-in Admin Control typed operations，并并入统一 Control v1 operation/code inventory。
- 保持 interactive v1 与既有 Agent OS/Control 协议兼容。

## 0.4.0

- 新增 `agent-os-interactive.v1` 的严格 request、response、event、cursor 与 snapshot 编解码器。
- 新增 rich transcript event 类型、事件级 cursor、连续序列/回放校验和内容摘要校验。
- 保持既有 `agent-os/v1` 与 projected SSE v2 API 兼容。

## 0.3.0

- Tool Result 统一使用 `ToolResultEnvelope`。
- 新增 Tool Result 的严格解析、编码与解码。
- 非 `personal-host/v1` 状态统一分类为 `unknown`。
