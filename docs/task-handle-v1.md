# 任务句柄 v1

`agent-os-task-handle/v1` 是既有 Control WorkItem/TaskPlan 和 Kernel RunChild 的投影，不能创建另一套任务调度或生命周期 authority。此发布仅提供 Protocol/SDK，Host/Terminal 接入和 H14 验收未由本包完成。

## 身份与所有权

句柄的 canonical SHA-256 固定 tenant/owner、WorkItem/可空 planTask、父 Run/turn/attempt/store generation、Kernel child、子 Run/attempt、输入与定义摘要、目标代码 revision。目标 revision 不是 Control CAS revision；任何这些身份变动都会产生新句柄。foreground/background 是交付偏好，不参与身份，不得创建新 Run。

解析器只验证数据一致性。Host 必须从真实 Control/Kernel 持久化记录生成视图，核对 grant、当前 fence、父子权限以及每个 Effect/check/artifact 回执；自洽 hash 不是授权或执行证明。

## 状态和证据

`execution` 保留子 Run/attempt 真相；unknown attempt 不转换为 failed。`parentChild` 只表达 Kernel 的父 child 状态。`settlementAttempts` 是完整追加历史：pending 没有 applied，terminal 有一次 applied、结果摘要和 wake 标记；迟到 audit_only 不产生另一 wake。终态允许 Run revision 因审计增长，但状态、attempt 和结果不能改变。

交付失败不改变执行或验收；acknowledged 必须带接收者与确认摘要，并永久保留。切换交付模式不删除确认，当前版本不包含重新指派接收者的多次交付模型。

artifact 使用不透明 `artifact:` 引用，包含字节数、内容摘要、子 attempt、输入/目标 revision 和 Effect 回执摘要，不传本地路径。check 包含实际命令摘要、安全显示文本、报告摘要、退出码、Effect 回执和已检查制品摘要。Host 负责验证实际命令及报告来源，模型自报完成不能生成合格回执。

passed 验收要求子执行 succeeded、非空必需 checks；每个必需 check 的最新回执必须 passed 且绑定当前输入/目标，每个必需制品必须存在并被这些最新回执覆盖。旧证据仍可追加但不满足当前验收。证据数组最多各 128 条；不得截断后冒充完整视图，超出容量应拒绝并由未来版本显式支持分页。验证状态可随新增检查变更，不能回写 Kernel 终态。

## 业务 wire

所有请求包含 schemaVersion/requestId/handleId。`task.observe` 读取完整视图；`task.set-delivery` 包含 commandId/expectedRevision/mode；`task.cancel` 包含 commandId/expectedRevision/reason/scope（task 或 task-and-descendants）。scope 只是业务意图，Host 必须按当前父子取消策略与权限决定是否执行。accepted cancel 不是终态取消证明。

Owner 在副作用前持久化命令摘要（排除 requestId）、结果和稳定命令 ID。相同命令重放不得重复创建 Run、结算、wake 或取消副作用。expectedRevision 使用视图 CAS；应先查幂等命令再判断新命令 CAS。响应绑定完整请求摘要、requestId、operation 和 handle 身份；命令 accepted 视图 revision 不得早于 expectedRevision。连接关闭、SDK abort 或停止观察均不产生取消。

帧最多 1 MiB，未知字段/操作/版本与非 UTF-8 字节被拒绝。固定 rejection 不包含私有错误。outputCursor 指向既有 canonical Prompt 流；同 epoch 单调，完整视图可替换 epoch，后续输出读取使用既有 snapshot-required 语义。

命令 accepted 返回命令提交时的持久化视图快照；重放返回同一快照而非重新执行，set-delivery 的快照 mode 必须等于请求。此快照可能落后于后续 observe，客户端不得覆盖更新 revision，可重新 observe 获取当前状态。取消提交快照仍可显示 running；实际取消结果由后续 Kernel 投影确认。
