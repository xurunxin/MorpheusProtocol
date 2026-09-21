# Worker 受管子授权 v1

父 grant 摘要统一使用 `createAgentOsWorkerParentGrantDigestV1`，基于严格解析后的规范字段顺序生成。Control 和 Worker 不得各自选择对象序列化顺序或不同的哈希 preimage。

`parentDefinitionDigest` 与父 store generation、父 run revision 一并封入 Kernel fence；Control 核对父 grant，Worker 核对父 Kernel Run。`preparedAt` 必须早于父 claim 到期。回执的 `requestDigest` 表示整份授权请求，与 child prompt 的 `inputDigest` 区分。子预算 receipt 必须符合现有 Control reserve 形状：空 turn/attempt/effect、receiptId 等于 reserve commandId、初始 reservation revision 为 1、各维剩余额度精确减去预留量。

私有 `agent-os-worker-authority/v1` 增加独立 `run.authorize.child` 操作，其 payload 使用 `agent-os-worker-child-authority/v1`。现有 `run.authorize` 仍表示独立 root，不增加可选字段。旧端拒绝未知操作时必须返回 unavailable，不能回退为 root 授权。此版本仅交付严格协议，不证明 Control/Worker/Host 接线或 H15/G4 完成。

Worker 在真实父 Kernel 存储创建 RunChild 记录并持久化授权 outbox 后，发送完整 parent claim、parent grant digest、父 turn/revision、Kernel child ID/logical key、child Run/turn/attempt、输入/definition/capability/policy digest、请求预算和持久化准备时间。`kernelFenceDigest` 覆盖这些字段的完整规范化 preimage；它是关联摘要，不能替代读取真实 Kernel。创建 RunChild 不等于创建独立 child Run；父存储、Worker owner、子存储和 Control 之间不能假设跨库原子事务。

只有受信 Worker composition 可以构造该请求。业务 prompt 不能提供此证据或直接取得 authority channel。Control 首次 mutation 必须重读自身 parent grant、writer、placement、scope、有效期和预算链；请求字段只是查找/比较依据。父 grant 的 policy/capability/scope 是 child 的上界。Control 从 root ceiling 或嵌套 parent reservation 派生余额，使用同一事务内的预算 CAS、子 grant 和命令回执；不得调用 root ceiling 安装路径为 child 创建新额度。请求预算是申请额度，不是可用余额或授予额度的证明。

成功回执包含规范请求摘要、parent grant/fence digest、child authorization、真实 reservation request/receipt 及完整回执摘要。解析器核对 Run、权限摘要、预算额度、subject、store generation、logical key、preparedAt 与预算 request/receipt 的对应关系。`authorization.duplicate` 固定 false，回执在 exact replay 时逐字保持不变；RPC requestId 可更新但稳定 commandId 和完整 payload 不变。Control 在检查新 mutation 的当前性之前查找已提交结果，过期重放不重新 reserve，也不授予新 dispatch 权限。

Worker 在 child dispatch 前再次读取父 Kernel 的当前 attempt、取消/终态、store generation 和 writer fence。Control 同时验证父子当前授权，撤销不能只影响 root。旧回执不是当前授权，父取消与 child dispatch 的竞争需由 production 接线和故障测试验证。已 begun 的 unknown 额度保持未决，本契约没有 release/refund 操作。

此切片面向同一 Worker 的父子 Kernel 与私有 Control。PersonalHost 到 Worker 的跨 Host parent evidence 仍需要真实认证桥，不能用自洽 JSON 或本地 standalone consent 替代。
