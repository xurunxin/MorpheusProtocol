# SDK 边界

- 本包只负责编排已解析的公开协议 DTO 与注入的轻量 client；协议 schema、parser 与 canonicalization 只属于 `@morpheus/api-protocol`。
- 禁止持有 credential、URL、storage、timer、polling、lifecycle、policy 或 authority，也不得提供默认网络 transport。
- 投影更新必须以不可变 root replacement 提交；tenant、run、cursor、stream epoch 或 authority epoch 漂移时先丢弃局部 delta，再请求完整 snapshot。
- lifecycle 与 compatibility 必须由调用方 owner 作为 expected context 提供；SDK 在 commit、update-required 或 rebuild 前逐项核对，不能接受 page 自报状态成为 lifecycle authority。
- 同 sequence 且同 digest 的重放只能幂等忽略；同 sequence 异 digest、future cursor 或 sequence 缺口必须 fail closed，不能替换已提交 root。
- `runPromptWithAbort` 只能编排 caller 注入的 reference Prompt client、start/cancel 参数工厂与 `AbortSignal`：pre-abort 不 dispatch，mid-flight cancel 至多一次，settle 后移除 listener；不得生成 wire/authority 字段或吞掉 transport/provider failure。
