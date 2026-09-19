# Interactive v4 输入控制（R0 / H01）

`agent-os-interactive.v4` 是既有 `prompt.steer`、`prompt.follow-up`、`prompt.queue.read/clear`、
`turn.cancel` 与 `capability.read` 的新版本输入控制 profile。其余命令继续使用已协商 v3，
transcript 保持 v2；没有新增队列、执行入口或 durable authority。
Protocol 与 SDK 包准备锁步 0.6.0；发布状态以 registry/SRI 为准，源码和本地 pack 不代表已发布。

## 身份与消费

每次命令带稳定 requestId/commandId/principal/payloadDigest；输入另带 inputId。
owner 完整绑定 sessionId、runId、turnId、bindingRevision 和 fence。
同一 commandId 与内容返回原 receipt（replayed=true）；不同内容必须返回 idempotency-conflict。
连接超时后保留原命令身份，通过 queue.read 找到 commandId/inputId；SDK 不自动发送第二份输入。
payloadDigest 用 `createAgentOsInteractiveV4CommandFingerprint` 计算，包含 operation、目标、正文、
requestId 和 commandId/principal，不包含 payloadDigest 自身。Host 必须比对 fingerprint，
并从已验证 transport identity 校验 principal；该字段本身不是授权证明。
当前 profile 不承载远端 proof，不得绕过既有 remote ingress proof/epoch 验证。

Host ingress 标注 source=user/system；客户端命令禁止携带 source。
系统提醒由 Host 内部受控入口接收，不能伪装成用户请求。

| 状态                 | binding                               | 语义                                   |
| -------------------- | ------------------------------------- | -------------------------------------- |
| queued               | null                                  | 已接收，等待安全边界/预算/维护         |
| bound                | snapshotId + requestDigest + effectId | 已纳入冻结请求 intent；不保证送达/理解 |
| unknown              | 保留原 binding                        | 实际结果未知，显式恢复前不重发         |
| settled              | 保留原 binding                        | 已结算；不等于任务验收成功             |
| cancelled / rejected | null                                  | 未绑定输入的终态                       |

clear 必带 expectedRevision，不能撤销 bound。turn.cancel 是独立命令；accepted 只说明
取消已接收，`cancel-pending-settlement` 表示外部副作用仍待结算。
seal 后目标明确的 steer 拒绝 target-sealed；owner/fence 过期拒绝 stale-target；不隐式转 follow-up。
显式 retry 的新 Effect 通过既有 lineage 引用原绑定，不改写本输入的首次逻辑消费证据。

## 快照与 SDK

queue.read 返回按 acceptedSequence 严格递增的完整有界输入页，最多 64 项。
queueRevision 是整个页的 revision，单项 queueRevision 是该输入的最后变化 revision。
只有 settled/cancelled/rejected 可从后续页移出；未决项不能静默消失，容量不足由 Host 拒绝新输入。
不透明正文不进入回执；request/Effect digest 是相关身份，不授予读取原文的权限。
需要更多历史时使用原 transcript/receipt 留存路径，不能把该有界投影视作新的历史数据库。

SDK reducer 对相同 revision+内容幂等；同 revision 不同内容、身份变化、已绑定倒退均要求重建。
delta 必须连续 revision；重连由调用方显式使用 snapshot 模式补齐缺口，仍不允许倒退或重绑定。
调用方仅在已验证 owner 发生真实切换时清空旧 projection 并重新加载，不能用清空规避冲突。
SDK 不拥有订阅或持久化；当前输入状态通过显式 queue.read 刷新，transcript reducer 继续复用 v2。

## 能力与兼容矩阵

每个 operation 的 ready 必须同时满足 hostImplemented、runtimeImplemented、configured、authorized。
Host 只有队列表不够；H02/G1 生产 adapter conformance 前必须保持 prompt.steer unavailable。
SDK 请求需要同一可信连接的 capability.read 结果。该客户端校验不能代替 Host 的实时授权与 fence 校验。

| Client / Host          | 行为                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| v4 / v4 且操作 ready   | 使用 v4，校验完整回执                                                   |
| v4 / v4 缺能力或未就绪 | 本地禁用操作，Host 同样拒绝                                             |
| v4 / v1–v3             | 新 schema 被旧 parser 拒绝；保留显式协商的旧 start/cancel，不转换 steer |
| v1–v3 / 新 Host        | 旧 profile 语义保持；不得把 v4 字段塞入旧帧                             |
| 新 SDK / 旧 Protocol   | 缺少 exports，packed consumer 必须拒绝                                  |

拒绝和边界测试在 `agent-os-interactive-v4.test.ts`、SDK `interactive-v4.test.ts`。
packed consumer 验证候选包导出、旧 parser 拒绝与 reducer；没有生产 Host 通过的声明。
