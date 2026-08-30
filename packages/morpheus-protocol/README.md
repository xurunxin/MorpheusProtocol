# @xurunxin/morpheus-protocol

Morpheus Agent OS 的公开 DTO、schema、strict parser、codec、version negotiation 与 extension manifest contract。

```ts
import { parseAgentOsV1Contract } from "@xurunxin/morpheus-protocol";

const contract = parseAgentOsV1Contract(input);
```

`agent-os-control/v1` 通过 `parseAgentOsControl*Request`、`parseAgentOsControl*Receipt` 和总 `parseAgentOsControlV1` 导出。八个 Control family 的 22 个 operation 均按矩阵严格区分字段；`canonicalAgentOsControlV1Source` 与 `encodeAgentOsControlV1` 产生稳定 canonical JSON。跨仓 conformance 使用导出的 `AGENT_OS_CONTROL_V1_OPERATION_CODE_INVENTORY`（别名 `AGENT_OS_CONTROL_V1_OPERATION_INVENTORY` / `AGENT_OS_CONTROL_V1_CONFORMANCE_INVENTORY`），不要在 Control 复制 operation/code 表。

非 authority 状态失败使用 `control.service.rejection`：调用 `parseAgentOsControlServiceRejection`、`encodeAgentOsControlServiceRejection` 或 `decodeAgentOsControlServiceRejection`。它不包含 `revision`、`fence`、`replay`、`idempotencyKey` 等 authority state；`CORRUPT_STORE` 与 `SERVICE_UNAVAILABLE` 只能由 `origin: "service"` 携带。audit authority receipt 不接受 `CORRUPT_STORE`，Control 应改发 service rejection。

Audit public values 必须由 producer 先完成 redaction。parser 作为 defense-in-depth 拒绝敏感字段名、POSIX/drive/UNC/relative-traversal/file URI 路径和高置信 token signature（JWT、Bearer、GitHub/OpenAI/AWS 等）；普通文本仍可通过。

解析器拒绝未知字段、不支持的版本和非规范数据；canonical digest helper 对等价输入产生稳定结果。本包不包含 storage、credential、runtime 或 authority implementation。
