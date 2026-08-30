# @xurunxin/morpheus-protocol

Morpheus 的版本化 DTO、Schema、严格解析器与编解码包。

## 能力

- 解析并规范化 `agent-os/v1`、Control、Worker Lease、Effect 与应用投影协议。
- 拒绝未知字段、不支持的版本和不一致绑定。
- 生成稳定的规范 JSON 与摘要。
- 校验扩展清单和工具策略数据。
- 以 `ToolResultEnvelope` 表示完成、拒绝和失败结果。

## 不负责范围

本包不访问数据库、文件系统或凭据，不执行模型、工具与沙箱，也不拥有 Run 生命周期、调度策略或 Host 组合。

## 安装

```powershell
bun add @xurunxin/morpheus-protocol@0.3.0
```

## 使用示例

```ts
import {
  decodeToolResultEnvelope,
  parseAgentOsV1Contract,
} from "@xurunxin/morpheus-protocol";

const contract = parseAgentOsV1Contract(input);
const result = decodeToolResultEnvelope(resultJson);
```

## 依赖边界

本包没有生产依赖。所有输入在进入业务实现前都应经过对应严格解析器。

## 当前限制

`agent-os/v1` 是当前唯一 Agent OS 主协议版本。Personal Host 状态只识别 `personal-host/v1`。

## 许可证

Apache-2.0，详见包内 `LICENSE`。
