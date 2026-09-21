# MorpheusProtocol

0.6.10 增加只读 `run.authorize.child.read`：精确查询已提交的子授权回执，查询未命中不得创建 grant 或 reservation。历史回执不代表当前执行许可。

运行与验证要求 Bun >=1.4.0，直接使用已安装的兼容版本；CI 使用稳定版。不再为测试额外切换到 1.4.0。依赖和类型包仍由 lockfile 精确固定。

0.6.9 增加独立 [Worker 子授权契约](docs/worker-child-authority-v1.md)：绑定持久化父 claim、Kernel child 证据、子授权和预算 reservation。旧 root 授权不变，未知子授权操作不能降级为 root。本包不签发授权，Control/Worker 真实接线仍需完成。

0.6.8 增加 [Worker Effect 预算对账](docs/worker-budget-reconciliation-v1.md) 的严格 wire 契约：已知结果按预留上限提交，unknown 保留未决额度。协议不执行账本变更，也不代表 delegated task、Control/Worker 接线或 H15/G4 已完成。

0.6.7 增加 [任务句柄契约](docs/task-handle-v1.md)：固定绑定既有 WorkItem、Kernel RunChild 与父子 attempt，分离执行、父任务结算、交付和验收证据。SDK 提供无状态观察、交付模式切换与显式取消意图；Host/Terminal 接入及 H14 端到端验收仍需后续交付。

0.6.5 增加 [Worker 私有授权通道契约](docs/worker-authority-v1.md)：Run 授权、writer fence、Effect permit、预算准入及当前事实快照。仅提供严格 DTO、规范编码和请求关联校验；实际 Control 授权、私有传输、Worker Kernel 检查由后续 production ingress 接入完成。

0.6.4 增加 Inspector 正式 `snapshot.read` 请求/响应及 `createRequestInspectorWireClientV1`，供现有已授权本地 transport 接入；读取上限 1–128，响应校验 requestId 和容量，未启用时返回 unavailable。没有捕获或执行操作。

0.6.3 增加 H12 只读 `agent-os-request-inspector/v1`：脱敏请求投影、严格解析和规范编码，以及有界 SDK reducer。标识必须是 Host 用 epoch 内密钥生成的 HMAC，不接受原始 prompt、路径、凭据、工具正文或自由文本原因。协议出口不表示 Host/Terminal 已支持；端到端能力与 O05/O06/O08 验收由 H12 后续接入交付。

0.6.2 增加纯数据合同 `agent-os-host-budget-consumption/v1`：Control 原子认领已预留子额度后，可返回绑定 Host/store generation、source grant/lease、预算树与本地 scope root、scope/operation 和父 lineage 规则的规范回执。该合同不执行认领、不签发 grant，也不提供 Worker placement；Host 必须向真实 Control current-state port 核验排他归属与未变化的预留，不能把自洽摘要当作权限。

Harness R0 新增 [Interactive v4 输入控制契约](docs/interactive-v4-input-control.md)，
涵盖消费回执、端到端能力协商与 SDK 队列 reducer。Protocol/SDK 0.6.0 已发布到 next；
0.6.1 候选增加只读 `prompt.queue.owner.read`，由 Host 返回逻辑回合身份和 fence，客户端不自行猜测。
Host 支持与生产 conformance 由后续 R1 交付，不从 SDK 出口推导 ready。

MorpheusProtocol 提供 Morpheus 的版本化协议、严格 Schema 解析与应用 SDK。仓库公开发布两个锁步版本的 npm 包，根目录只用于开发与发布编排，不作为 npm 包发布。

## 能力

- `@xurunxin/morpheus-protocol`：DTO、严格解析器、规范编解码、版本协商、应用投影协议和扩展清单。
- `@xurunxin/morpheus-sdk`：面向 Terminal、Desktop、Operator 与 Console 的轻量客户端编排。
- `agent-os/v1`：Morpheus 的第一版运行协议标识。
- `agent-os-interactive.v2`：全屏 TUI 的 Agent、workspace、execution、config catalog、context binding 与 workspace change 交互契约。
- `agent-os-interactive.v3`：v2 数据面之上的命令绑定交互 profile，turn.start/turn.cancel 携带 command binding 与宿主回执。
- `agent-os-control/v1`：包含 built-in Admin 的 WorkItem、TaskPlan、Message、Schedule 与 typed human-control 操作。
- `agent-os-remote-ingress.v1`：远端授权 proof 契约；proof 携带 Ed25519 `signature` 与签发密钥 `keyId`，验证方以钉扎公钥复验签发方真实性。

## 不负责范围

本仓不实现持久化、凭据管理、单次 Run 生命周期、控制面策略、模型与工具执行，也不组合 Worker 或 Personal Host。SDK 不提供默认网络传输，调用方必须显式注入客户端或传输实现。

## 安装与使用

GitHub Packages 安装需要有效的 `NODE_AUTH_TOKEN`。仓库的 `.npmrc` 只保存 registry 映射和环境变量占位符。

```powershell
$env:NODE_AUTH_TOKEN = '<GitHub PAT>'
bun add @xurunxin/morpheus-protocol@0.5.0 @xurunxin/morpheus-sdk@0.5.0
```

```ts
import { parseAgentOsV1Contract } from "@xurunxin/morpheus-protocol";
import {
  createAgentOsAppClient,
  createInteractiveV2AppClient,
} from "@xurunxin/morpheus-sdk";

const contract = parseAgentOsV1Contract(input);
const app = createAgentOsAppClient(promptClient);

// Interactive v2 remains transport-agnostic; PersonalHost supplies the transport.
const tui = createInteractiveV2AppClient({
  request: (request, signal) => transport.request(request, signal),
});
const agents = await tui.readAgentCatalog({
  schemaVersion: "agent-os-interactive.v2",
  operation: "agent.catalog.read",
  requestId: "request.catalog.1",
});
```

## 开发命令

```powershell
bun install --frozen-lockfile
bun run check
bun test
bun run build
```

`bun run verify` 是日常最高门槛；`bun run verify:full` 额外验证 npm 打包内容与空目录消费者；`bun run release:check` 在打 tag 前执行完整验证、打包和版本一致性检查。

## 目录结构

```text
packages/morpheus-protocol/  协议、Schema、解析器与编解码
packages/morpheus-sdk/       应用客户端 SDK
scripts/                     边界、依赖、版本与打包检查
```

## 依赖边界

Protocol 没有生产依赖。SDK 只能精确依赖同版本 Protocol。生产依赖和提交的锁文件不得包含 `workspace:*`、`link:`、`file:` 或 Git locator。

## 当前限制

- 两个包必须锁步发布。
- GitHub Packages 客户端需要令牌。
- Tool Result 只使用 `ToolResultEnvelope`；拒绝未知字段和矛盾状态。
- `agent-os-interactive.v1` 仍保持兼容；新增 v2 binding/catalog DTO 不携带 prompt 正文、私有路径或凭证。
- SDK 的 v2 reducer 在 gap/conflict/context drift 时只返回 `rebuild-required`，由 PersonalHost 提供 snapshot。

## 许可证

源码与两个 npm 包采用 Apache-2.0，详见 [LICENSE](LICENSE)。
