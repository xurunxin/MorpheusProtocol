# Worker 私有授权通道 v1

`agent-os-worker-authority/v1` 用于可信监督进程建立的本地私有 Worker/Control 通道。Protocol 只定义数据与关系，不实现传输、凭据、策略或生命周期。生产通道必须从连接所有者确定 worker 身份，并校验 envelope.workerId；自报标识和自洽摘要不构成认证。

每个请求具有 schemaVersion、requestId、workerId、operation、payload。响应具有相同关联字段、规范请求的 SHA-256 摘要 requestDigest、Control 读取时间 authorityNow 和 accepted receipt 或固定 rejected code。每帧最多 1 MiB；未知字段、混合成功/失败字段、非规范时间以及错误响应关联均拒绝。

| operation             | 输入                                                      | 回执                                                             |
| --------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| run.authorize         | commandId、runId、turnId、attemptId                       | ownerRevision/ownerDigest、Control 构造的 remote Worker contract |
| writer.activate       | command/grant/run/store/writer/claim 身份                 | 当前 writer fence 与期限                                         |
| writer.recover        | 原始身份和 expectedClaimFence、恢复 commandId             | 严格更高 fence                                                   |
| writer.consume        | 身份、claimFence、operationDigest                         | 精确 fence 的 consumed 回执                                      |
| authority.read        | grantId、runId                                            | grant、placement、writer、key/revocation 当前事实                |
| effect.permit.issue   | commandId、permitId、claim、候选 intent/request           | Control EffectPermit                                             |
| effect.budget.admit   | commandId、claim、intent、permit、已提交 preparation 观察 | application、reservation request/receipt/current state           |
| effect.authority.read | grant/run/attempt/store/effect/permit/reservation 标识    | 同一 Control 事务的当前 authority/permit/budget 事实             |

调用方不提供 Run 配置、权限上限、预算额度或当前快照。Control 从持久 owner 配置及真实 ledger 派生这些值，并校验候选 intent 的 catalog/schema/handler、权限范围、时间窗和当前 writer。preparation 是可信 Worker 报告的已提交观察；Control 不能把它升级为自身持有的 Kernel 状态。Worker 仍负责核对本地持久 intent 与 Kernel fence。

`accepted` 表示操作或读取成功。当前 grantStatus/permitStatus 可以为 revoked，placement、writer 或 key 可以已与旧 grant 不同。消费者必须据此拒绝执行，不能把“可解析”或 accepted 当作可 dispatch。预算 reservationState.capturedAt 是最后一次持久变更时间，允许早于本次 authorityNow；不得修改旧状态时间或摘要以伪造新鲜度。

生产 Worker 应在 begun 前与 sink 前分别发起新的 authority 读取。EOF、超时或未关联响应必须使读取不可用，不能复用缓存授权。重试保持同一 commandId 和原始输入；Control 重放持久证据，并单独核验当前可消费性，不能用新时钟/余额重建旧 reservation request。

本契约不承诺跨 Control/Worker 数据库原子性、最后一次读取后的即时撤销、公共网络接入、多 Worker 调度或预算最终结算。H14/H15/G4 的交付与验收仍独立进行。
