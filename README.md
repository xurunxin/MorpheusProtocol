# MorpheusProtocol

Morpheus Agent OS 的公开、版本化协议与 App SDK 仓库。源码和 npm 发布物采用 Apache-2.0。

本仓只包含两类能力：

- `@xurunxin/morpheus-protocol`：DTO、schema、strict parser、codec、version negotiation 与 extension manifest contract。
- `@xurunxin/morpheus-sdk`：面向 Console、Terminal、Desktop、Operator 的轻量 App client；网络 transport 由调用方注入。

本仓不包含 storage、credential、Kernel lifecycle、Control policy、Runtime adapter 或 Host composition。源码包名已切换为 `@xurunxin/*`，但 `agent-os/v1` 等 wire/schema/artifact 标识保持不变。

## 安装

GitHub npm registry 即使读取公开包也要求认证。本地凭据应放在用户级 npm/Bun credential 配置或环境变量中，不得提交到仓库：

```sh
bun add @xurunxin/morpheus-protocol@0.2.1 @xurunxin/morpheus-sdk@0.2.1
```

## 本地 Gate

```sh
bun install --frozen-lockfile
bun run verify
```

`verify` 覆盖格式、lint、类型、协议测试、边界与依赖 locator 检查、候选内容摘要、打包内容及空目录消费者安装。根构建通过 TypeScript paths/project references 协作，不使用 Bun workspace linking；SDK 的发布 manifest 仍精确依赖 Protocol `0.2.1`。

`@xurunxin/morpheus-protocol@0.2.1` 新增 `agent-os-control/v1` 的 8 个 family、22 个 operation-discriminated request/receipt DTO，包含 strict parser、canonical source、digest 与 browser-compatible codec。`AGENT_OS_CONTROL_V1_OPERATION_CODE_INVENTORY` 是跨仓 conformance 的机器可读 operation/requestReject/response code 清单，Control 应直接消费它而不是复制矩阵。Control authority 只交换这些 versioned DTO；storage、credential、runtime 与 authority implementation 仍不属于本包。

解析失败、Control service 尚未启动或 authority/store 尚不能形成 committed state 时，使用 `parseAgentOsControlServiceRejection` 对应的 `control.service.rejection` contract。该 pre-authority rejection 只有 request/correlation、`status: "rejected"`、有限 code、origin 和可选安全 detail，明确不携带或伪造 `revision`、`fence`、`replay` 或 idempotency state。`CORRUPT_STORE` 只能作为 `origin: "service"` 的 service rejection，不能作为 audit authority receipt；audit receipt 的 wire code 不包含它。

Audit `details`/`redactedDetails` 是 producer-side redaction 之后的 public value。parser 只提供 defense-in-depth：拒绝字段名敏感字段、POSIX/Windows/UNC/相对 traversal/file URI 路径，以及 JWT、Bearer、GitHub/OpenAI/AWS 等高置信 token signature；producer 仍必须在进入 Protocol 前完成完整脱敏。普通公共文本不会因包含 `sketch` 等相似前缀而被拒绝。

发布工作流只响应版本 tag。它先对两包做 registry integrity 预检，缺失版本使用临时 `candidate-staging` tag 发布并回读；只有两包均与本地 pack manifest 一致后才幂等推进 `next`。同版本不同 integrity 或 `next` 回退都会中止。稳定 dist-tag 仍由 MorpheusIntegration 对精确 release lock 验收后推进。
