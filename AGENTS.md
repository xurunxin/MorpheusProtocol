# MorpheusProtocol 开发约定

## 职责

本仓只维护版本化协议、严格解析器、编解码与应用 SDK。禁止加入存储、凭据、Kernel 生命周期、Control 策略、Runtime 执行或 Host 组合实现。

## 依赖

- Protocol 生产依赖必须为空。
- SDK 只能精确依赖同版本 `@xurunxin/morpheus-protocol`。
- 不提交本地链接、相对包、Git 依赖或浮动版本。

## 变更要求

- 新增或修改 wire 字段时，必须同步类型、严格解析器、规范编码与拒绝测试。
- Protocol 与 SDK 版本必须锁步。
- 公共 API 变化同步 README 与 CHANGELOG。
- 保持 App SDK 无状态，网络传输由调用方注入。

## 验证

日常依次运行 `bun run check`、`bun test`、`bun run build`。发布前运行 `bun run release:check`。
