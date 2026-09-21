# 更新日志

## 0.6.11

- 新增私有 Worker WorkItem 绑定及只读恢复契约，严格校验实际 root/child WorkItem 回执 lineage、请求摘要与业务元数据。无存储、授权或 Kernel lifecycle 实现。

## 0.6.7

- 新增任务句柄 v1 严格身份/视图/证据/演进校验，以及 observe、set-delivery、cancel 意图的规范编码、摘要和响应绑定。无存储或 authority 实现。

## 0.6.6

- 新增私有 Worker Prompt v1 无权限业务契约、严格有界编解码、完整请求／幂等命令摘要、响应绑定和共享 canonical Prompt input 解析器。

## 0.6.4（未发布）

- H12 正式 snapshot.read wire 契约、规范编码、有界 limit 与严格 ready/unavailable 状态；拒绝 capture/执行字段及操作。

## 0.6.3（未发布）

- H12 只读脱敏 Inspector 契约，严格有限字段、规范编码、事件摘要及容量限制；不引入采集、存储、授权或执行逻辑。

## 0.6.2（未发布）

- 新增 `agent-os-host-budget-consumption/v1` 纯消费绑定合同与 canonical SHA-256 codec。区分 budget tree root 和 Host scope root，冻结 source grant、lease、store generation、claim/instance revision、允许操作及父 lineage 规则；严格拒绝未知、漂移和畸形输入，不提供实际认领或授权实现。

## 0.6.1（未发布）

- 新增只读 `prompt.queue.owner.read` 请求与响应；owner 必须属于请求 session，空 owner 不得声明 sealed。增加 `queue-full` 拒绝原因，既有帧形状保持。

## 0.6.0（next）

- 新增 v4 输入控制 profile：owner/fence、command/input identity、queue CAS、消费 request/Effect 绑定、严格编解码和端到端能力声明。旧 profile 不新增字段。

## 0.5.0

- 新增 `agent-os-interactive.v3` profile：能力发现（implemented/configured/authorized/ready 四维状态）、command binding（proof/epoch/payload digest）、幂等 ack 响应与命令指纹。
- 新增 `agent-os-remote-ingress.v1` 契约骨架：远端授权 proof 字段与有效期上限（fail closed 窗口校验）。
- 新增 `agent-os-attachment.v1` 契约骨架：图像附件 wire 形状与限额（`attachment.image` capability 本切片 declared 未实现）。
- transcript 事件流保持 `agent-os-interactive.v2` wire identity；v3 不承载事件语义。
- 新增 N01 `scripts/verify-interactive-remote-contract.ts` strict/negative 验证脚本。
- 新增 `agent-os-interactive.v2` catalog、context binding、workspace change DTO 及严格编解码器。
- 新增 built-in Admin Control typed operations，并并入统一 Control v1 operation/code inventory。
- 保持 interactive v1/v2 与既有 Agent OS/Control 协议兼容。

## 0.4.0

- 新增 `agent-os-interactive.v1` 的严格 request、response、event、cursor 与 snapshot 编解码器。
- 新增 rich transcript event 类型、事件级 cursor、连续序列/回放校验和内容摘要校验。
- 保持既有 `agent-os/v1` 与 projected SSE v2 API 兼容。

## 0.3.0

- Tool Result 统一使用 `ToolResultEnvelope`。
- 新增 Tool Result 的严格解析、编码与解码。
- 非 `personal-host/v1` 状态统一分类为 `unknown`。
