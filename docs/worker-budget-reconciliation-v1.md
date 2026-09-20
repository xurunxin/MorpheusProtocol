# Worker Effect 预算保守对账 v1

`effect.budget.reconcile` 复用 `agent-os-worker-authority/v1` 私有监督进程通道。请求包含稳定业务 commandId、reservation/receipt、旧 state digest/revision、Kernel fence digest 与完整 Effect dispatch receipt。请求不能指定金额、释放或退款。

回执 `agent-os-worker-budget-reconciliation/v1` 固定策略 `commit-reserved-known-retain-unknown/v1`。succeeded/failed 均按原预留上限提交；这是保守收费上限，不是实际 token 或货币用量断言。unknown 保留原预留状态，不能从缺少 usage、取消或撤销推导零费用。准确差额释放/退款需要后续独立证据政策，不属于此版本。

已知结果回执关联一次完整 commit、真实 reservation 当前状态、原 CAS 和 dispatch receipt digest；无释放、退款或第二次 commit。unknown 回执必须保持原状态摘要与 revision，且不能附结算。顶层 authority 响应继续绑定 request/worker/operation/digest，规范 JSONL 编码沿用 1 MiB 上限。

遵循现有 Control 账本语义，全额 commit 后 available 为零，ownerDisposition 仍为 reserved；只有 release 才关闭 reservation。对账完成不能伪造 closed 状态。

解析器只校验结构、自洽摘要和关联，不证明调用者是 Worker，不证明 Effect 已真实执行。Control 必须认证私有来源，重读持久 permit/admission、当前 writer/claim/fence，核对实际 reservation subject 与 Effect 身份，并使用现有账本事务和幂等命令完成结算。不能绕过 Host 排他 consumption claim，也不能为已预留 child 重新安装 root ceiling。Worker 必须发送真实 Kernel readback receipt，重启恢复只重放对账命令，不重新执行 Effect。

该增量不新增父子授权或 task start，也不单独关闭 H14/H15/H16 或 G4。
