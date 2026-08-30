# Changelog

本仓遵循语义化版本；Protocol 与 SDK 锁步发布。

## 0.2.1

- 新增 `agent-os-control/v1` 八个 Control family 的严格 DTO、22 个 request/receipt operation、canonical codec 与 digest helper。
- 补齐现有 Control authority 的 operation-specific receipt codes，新增 pre-authority `control.service.rejection` contract 与机器可读 operation/code inventory；audit `CORRUPT_STORE` 改由 service rejection 承接。
- 收紧 audit public value 的路径与高置信 credential signature defense-in-depth 检查，并明确 producer-side redaction 责任。
- Protocol 与 SDK 锁步升级至 `0.2.1`；SDK 精确依赖 `@xurunxin/morpheus-protocol@0.2.1`。
- 保持既有 `agent-os/v1` wire/schema/artifact 标识及 0.2.0 发布证据不变。

## 0.2.0

- 从 MorpheusCore Frozen Greenfield v1 基线拆出公开 Protocol 与 App SDK。
- 将 package identity 切换为 `@xurunxin/morpheus-protocol` 与 `@xurunxin/morpheus-sdk`。
- 保持现有 `agent-os/v1` wire、schema 与 artifact 标识不变。
- 根构建移除 workspace linking，并加入 package locator、packed consumer、候选内容摘要与幂等 registry publication Gate。
