# @xurunxin/morpheus-protocol

Morpheus Agent OS 的公开 DTO、schema、strict parser、codec、version negotiation 与 extension manifest contract。

```ts
import { parseAgentOsV1Contract } from "@xurunxin/morpheus-protocol";

const contract = parseAgentOsV1Contract(input);
```

`agent-os-control/v1` 通过 `parseAgentOsControl*Request`、`parseAgentOsControl*Receipt` 和总 `parseAgentOsControlV1` 导出。八个 Control family 的 22 个 operation 均按矩阵严格区分字段；`canonicalAgentOsControlV1Source` 与 `encodeAgentOsControlV1` 产生稳定 canonical JSON。

解析器拒绝未知字段、不支持的版本和非规范数据；canonical digest helper 对等价输入产生稳定结果。本包不包含 storage、credential、runtime 或 authority implementation。
