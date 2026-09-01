# MorpheusProtocol

MorpheusProtocol 提供 Morpheus 的版本化协议、严格 Schema 解析与应用 SDK。仓库公开发布两个锁步版本的 npm 包，根目录只用于开发与发布编排，不作为 npm 包发布。

## 能力

- `@xurunxin/morpheus-protocol`：DTO、严格解析器、规范编解码、版本协商、应用投影协议和扩展清单。
- `@xurunxin/morpheus-sdk`：面向 Terminal、Desktop、Operator 与 Console 的轻量客户端编排。
- `agent-os/v1`：Morpheus 的第一版运行协议标识。
- `agent-os-interactive.v2`：全屏 TUI 的 Agent、workspace、execution、config catalog、context binding 与 workspace change 交互契约。
- `agent-os-control/v1`：包含 built-in Admin 的 WorkItem、TaskPlan、Message、Schedule 与 typed human-control 操作。

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
