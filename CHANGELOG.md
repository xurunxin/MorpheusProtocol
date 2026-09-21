# 更新日志

## 未发布

- 0.6.11：新增私有 Worker task.bind/task.bind.read 严格契约，将完整 child authority 输入、业务验收条件及目标 revision 与既有 Control WorkItem root/child 回执关联；独立只读恢复不得创建任务或权限。Protocol/SDK 锁步，不宣称完成 H14/H15/G4。

- 0.6.10：增加子授权历史回执只读查询，复用完整原始 payload 和严格回执关联；读写操作不可互换，不增加可分配预算。Control/Worker 接入及崩溃恢复验收仍需完成。

- 0.6.9：新增私有 `run.authorize.child` 的严格请求、回执与关联校验，固定完整父 writer/Kernel 准备证据及子预算 request/receipt。旧 root 请求保持原样，历史子授权回执 exact replay 不增加额度，也不替代当前 dispatch 检查。Protocol/SDK 锁步发布；不宣称 H15/G4 已完成。

- 0.6.8：Worker 私有 authority 增加 Effect 预算保守对账契约。已知结果按预留上限提交，unknown 保留未决额度；不接受调用方指定金额、释放或退款。严格关联 Effect receipt、预算 CAS、结算及当前状态；实际 Control/Worker 接入和 H15/G4 验收仍未完成。

- 0.6.7：任务句柄 v1 身份、状态视图、追加式制品/检查/结算证据、规范 wire 与 SDK。终态允许审计 revision 增长但不能翻转执行结果；中断观察不产生取消。

- 0.6.5：增加 `agent-os-worker-authority/v1` 私有监督进程通道契约。绑定请求摘要、worker/Run/claim/Effect 身份与预算复合回执，拒绝调用方注入预算、approval 或 current snapshot；保留账本变更时间与当前读取时间的区别。Protocol/SDK 锁步；不代表生产 Worker ingress、H14/H15 或 G4 已完成。

- 0.6.4：补充 H12 Inspector 有界只读 wire profile，严格 ready/unavailable 关系及 SDK 请求关联；完整捕获保持本地 API，不进入 App profile。

- 0.6.3：H12 脱敏 Inspector DTO 与规范编码；数值、固定原因码、HMAC 标识、来源容量及 cache usage 证据严格校验。SDK 增加纯事件 reducer 和注入式只读快照客户端，重复幂等、缺口/冲突要求快照；不提供执行或原始捕获端口。

- Protocol/SDK 锁步准备 0.6.2：新增 Host 已预留子预算的排他消费绑定合同，包含独立 budget tree/scope root、store/instance/claim revision、source grant/lease 与允许的本地派生操作。规范编码与严格拒绝身份漂移、未知字段、错误版本、无效时间窗和畸形数组；不引入存储或签发 authority。

- Protocol/SDK 锁步准备 0.6.1：新增只读 `prompt.queue.owner.read`，从 Host 获取逻辑回合身份与 fence；严格校验 session 关联，并以 queue.read 能力准入。队列容量拒绝新增 `queue-full` 原因。

## 0.6.0（next）

- Protocol/SDK 锁步准备 0.6.0：新增显式 `agent-os-interactive.v4` 输入控制 profile、消费证据、端到端能力准入与无状态队列 reducer。旧 v1/v2/v3 严格性保持；此源码变化不代表 Host 已支持或包已发布。
- SDK 的 Node JSONL 传输支持 Interactive v2 与 v3 客户端；修正配置读取和 reconcile 响应的类型提取，供单机 HTTP/SSE 适配服务使用。

## 0.5.0

- 新增 `agent-os-interactive.v2`，覆盖 Agent、workspace、execution、config catalog、context binding 与 workspace change 契约。
- 新增 v2 cursor/snapshot/event strict parser、canonical codec 与身份/digest/gap 校验。
- 将 built-in Admin 的 WorkItem、TaskPlan、Message、Schedule、typed human-control 操作合并到唯一 `agent-os-control/v1` matrix/code inventory。
- 新增 `agent-os-remote-ingress.v1` 远端授权 proof 契约：proof 携带 Ed25519 `signature` 与签发密钥 `keyId`，并提供规范签名载荷编解码（`createAgentOsRemoteIngressV1ProofSigningPayload`），Host 侧可验证签发方真实性。
- SDK v3 客户端强制命令成功终态（accepted/completed）必须携带 command receipt；rejected 为独立拒绝语义。
- Protocol 与 SDK 锁步升级至 0.5.0。

## 0.4.0

- 新增版本化 `agent-os-interactive.v1` App-plane 协议。
- 新增 session、turn、transcript、provider、queue、compact、steer/follow-up 和 interaction 操作。
- 新增带 session/run/turn/attempt/effect/binding identity 的 rich transcript events、cursor、snapshot、replay 与严格 canonical serializer。
- Protocol 与 SDK 锁步升级至 0.4.0。

## 0.3.0

- Protocol 与 SDK 锁步升级至 0.3.0。
- Tool Result 统一为严格的 `ToolResultEnvelope`，提供解析与编解码 API。
- Personal Host 非 v1 状态统一分类为 `unknown`，仅允许隔离或显式重置。
- 统一日常验证、完整验证与 tag 发布入口。
