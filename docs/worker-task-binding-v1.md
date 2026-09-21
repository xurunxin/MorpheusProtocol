# Worker WorkItem 绑定 v1

`task.bind` 与 `task.bind.read` 属于已认证 Worker/Control 私有通道。业务客户端不提交 Kernel claim、grant 或 Control receipt。Worker 从真实父 Kernel child/outbox 生成完整 child authorization input，并绑定标题、非空验收条件和 owner 已解析的不可变目标 revision。

Control 必须复用既有 WorkItem authority：在固定 owner scope 内创建父 Run 的 `workflow_run` WorkItem 和对应 `subagent_task`。它必须核查父 writer、子 grant/预算的真实当前记录，并将 WorkItem journal 变更与私有命令回执写入同一数据库连接的外层事务，不能创建另一套 lifecycle。返回的 root create 与 child spawn-subtasks 回执来自这些真实命令；root/child lineage、完整输入摘要和 owner/scope 一并固定。

协议 parser 仅验证数据一致性。自洽摘要和调用方带来的回执不证明权限。Worker 必须从私有 Control 响应取得绑定，核对 owner revision/digest、grant 的 tenant/workload/host 及完整原请求。生成既有 TaskHandle 时保留真实 WorkItem、Kernel child、父子 attempt/input 与目标 revision；临时任务的 planTaskId 可为空，非空 TaskPlan 引用必须另有真实可核验关联，不能由业务字符串推断。

`task.bind.read` 以完整原始请求精确查询历史回执。未命中、已拒绝或输入冲突都不能调用创建路径，不能刷新父权限或释放预算。读写响应操作不可互换。历史回执可在父终止后用于恢复身份及审计；新的 I/O 仍受父/子当前 authority 和 Worker Kernel 同步 guard 约束。

这次增量仅交付契约。生产 Task 业务入口、WorkItem owner 接线、delivery/check/artifact 验收及 G4 的进程故障矩阵仍需要独立验证。
