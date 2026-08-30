# Changelog

## 0.2.1

- 新增 `agent-os-control/v1` 八个 family、22 个严格 request/receipt operation DTO/parser 与 canonical codec。
- 补齐 durable Control receipt code，新增不伪造 revision/fence 的 `control.service.rejection` contract 和 operation/code inventory；audit store failure 不再编码为 `CORRUPT_STORE` authority receipt。
- Audit public value 增加路径及高置信 token signature defense-in-depth 检查，producer redaction 仍是前置责任。
- 保持既有 `agent-os/v1` wire/schema/artifact 标识不变。

## 0.2.0

- 首个独立仓候选版本。
- 保留 Frozen Greenfield v1 wire contract，发布新的 `@xurunxin/morpheus-protocol` package identity。
- 纳入 extension manifest 公共 contract。
