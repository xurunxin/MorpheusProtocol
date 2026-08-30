# @xurunxin/morpheus-sdk

Morpheus App Plane 的轻量客户端 SDK。它组合公开协议 DTO 与调用方注入的传输，不保存服务端状态。

## 能力

- 创建 Prompt 客户端编排。
- 管理取消信号和关联请求。
- 应用不可变投影快照与增量。
- 校验握手与应用可见的协议上下文。

## 不负责范围

本包不持有凭据、URL、存储、计时器、轮询、生命周期或策略 authority，也不提供默认网络传输。

## 安装

```powershell
bun add @xurunxin/morpheus-sdk@0.3.0
```

## 使用示例

```ts
import { createAgentOsAppClient } from "@xurunxin/morpheus-sdk";

const app = createAgentOsAppClient(promptClient);
```

## 依赖边界

本包只精确依赖同版本 `@xurunxin/morpheus-protocol`。应用应通过公开 SDK 与版本化协议协作。

## 当前限制

传输重试、持久化和服务发现由应用提供。投影出现序列缺口或上下文漂移时，调用方需要重新获取完整快照。

## 许可证

Apache-2.0，详见包内 `LICENSE`。
