import type { AgentOsInteractiveV2Cursor } from "./agent-os-interactive-v2-types.js";

/**
 * agent-os-interactive.v3 控制面 profile（B01 决策 D1：新语义只进新版本 profile）。
 *
 * 冻结裁定（B02，证据见 independent-agent-backend/08-semantic-freeze.md）：
 * - 事件、cursor、snapshot、transcript 页等数据面 wire identity 保持
 *   `agent-os-interactive.v2`，v3 客户端必须用 v2 严格解析器消费内嵌数据结构；
 *   本文件仅引用 v2 cursor 类型，不另造平行 cursor（S4）。
 * - v3 只覆盖请求、命令回执与能力发现；命令绑定（M3）、幂等响应（M4）、
 *   重放绑定断言（M5/S4）与能力四维状态（M1）是 v3 专有字段。
 * - 旧 v1/v2 profile strict 不动；v3 请求不得发给未协商 v3 的 peer，
 *   旧 peer 应返回明确 update-required 类拒绝，不得透明降级。
 */
export const AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION =
  "agent-os-interactive.v3" as const;
export const AGENT_OS_INTERACTIVE_V3_SCHEMA =
  AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION;

export type AgentOsInteractiveV3SchemaVersion =
  typeof AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION;

export const AGENT_OS_INTERACTIVE_V3_OPERATIONS = Object.freeze([
  "session.catalog.read",
  "session.create",
  "session.fork",
  "session.rename",
  "turn.start",
  "turn.cancel",
  "turn.retry",
  "transcript.read",
  "transcript.subscribe",
  "provider.catalog.read",
  "provider.binding.create",
  "prompt.queue.read",
  "prompt.queue.clear",
  "session.compact",
  "prompt.steer",
  "prompt.follow-up",
  "interaction.respond",
  "agent.catalog.read",
  "agent.definition.read",
  "workspace.catalog.read",
  "execution.catalog.read",
  "context.binding.create",
  "config.status.read",
  "config.reconcile",
  "workspace.change.preview",
  "workspace.change.apply",
  "capability.read",
] as const);

export type AgentOsInteractiveV3Operation =
  (typeof AGENT_OS_INTERACTIVE_V3_OPERATIONS)[number];

export type AgentOsInteractiveV3Identifier = string;
export type AgentOsInteractiveV3Digest = `sha256:${string}`;

/**
 * 命令绑定（03-protocol §命令提交，M3）：commandId + principal + payload
 * digest 是幂等记录键；authorityProof/authorityEpoch 仅在远端授权路径携带，
 * 语义由 agent-os-remote-ingress.v1 契约冻结。CAS 期望 revision 仍由各
 * operation 既有字段携带（bindingRevision/expectedRevision 等），不重复建模。
 */
export interface AgentOsInteractiveV3CommandBinding {
  readonly commandId: AgentOsInteractiveV3Identifier;
  readonly principal: AgentOsInteractiveV3Identifier;
  readonly payloadDigest: AgentOsInteractiveV3Digest;
  readonly authorityProof?: string;
  readonly authorityEpoch?: number;
}

export interface AgentOsInteractiveV3RequestBase {
  readonly schemaVersion: AgentOsInteractiveV3SchemaVersion;
  readonly operation: AgentOsInteractiveV3Operation;
  readonly requestId: AgentOsInteractiveV3Identifier;
  readonly command?: AgentOsInteractiveV3CommandBinding;
}

export interface AgentOsInteractiveV3SessionCatalogReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "session.catalog.read";
}

export interface AgentOsInteractiveV3SessionCreateRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "session.create";
  readonly title?: string;
  readonly parentSessionId?: AgentOsInteractiveV3Identifier;
  readonly agentId?: AgentOsInteractiveV3Identifier;
  readonly workspaceId?: AgentOsInteractiveV3Identifier;
  readonly executionTarget?: AgentOsInteractiveV3ExecutionTarget;
  readonly providerId?: AgentOsInteractiveV3Identifier;
  readonly modelId?: AgentOsInteractiveV3Identifier;
  readonly apiFamily?: AgentOsInteractiveV3ProviderApiFamily;
}

export interface AgentOsInteractiveV3SessionForkRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "session.fork";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly title?: string;
}

export interface AgentOsInteractiveV3SessionRenameRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "session.rename";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly title: string;
}

export interface AgentOsInteractiveV3TurnStartRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "turn.start";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly turnId: AgentOsInteractiveV3Identifier;
  readonly message: string;
  readonly bindingRevision: number;
}

export interface AgentOsInteractiveV3TurnCancelRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "turn.cancel";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly runId: AgentOsInteractiveV3Identifier;
  readonly turnId: AgentOsInteractiveV3Identifier;
  readonly reason: string;
}

export interface AgentOsInteractiveV3TurnRetryRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "turn.retry";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly runId: AgentOsInteractiveV3Identifier;
  readonly turnId: AgentOsInteractiveV3Identifier;
  readonly bindingRevision: number;
}

export interface AgentOsInteractiveV3TranscriptReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "transcript.read";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly cursor: Readonly<AgentOsInteractiveV2Cursor> | null;
  readonly limit: number;
  readonly replay?: AgentOsInteractiveV3ReplayBinding;
}

export interface AgentOsInteractiveV3TranscriptSubscribeRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "transcript.subscribe";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly cursor: Readonly<AgentOsInteractiveV2Cursor> | null;
  readonly limit: number;
  readonly replay?: AgentOsInteractiveV3ReplayBinding;
}

export interface AgentOsInteractiveV3ProviderCatalogReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "provider.catalog.read";
}

export interface AgentOsInteractiveV3ProviderBindingCreateRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "provider.binding.create";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly providerId: AgentOsInteractiveV3Identifier;
  readonly modelId: AgentOsInteractiveV3Identifier;
  readonly apiFamily: AgentOsInteractiveV3ProviderApiFamily;
  readonly expectedRevision: number;
}

export interface AgentOsInteractiveV3PromptQueueReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "prompt.queue.read";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly runId: AgentOsInteractiveV3Identifier;
}

export interface AgentOsInteractiveV3PromptQueueClearRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "prompt.queue.clear";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly runId: AgentOsInteractiveV3Identifier;
  readonly expectedRevision: number;
}

export interface AgentOsInteractiveV3SessionCompactRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "session.compact";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly sourceRunId: AgentOsInteractiveV3Identifier;
}

export interface AgentOsInteractiveV3PromptSteerRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "prompt.steer";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly runId: AgentOsInteractiveV3Identifier;
  readonly turnId: AgentOsInteractiveV3Identifier;
  readonly instruction: string;
}

export interface AgentOsInteractiveV3PromptFollowUpRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "prompt.follow-up";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly runId: AgentOsInteractiveV3Identifier;
  readonly turnId: AgentOsInteractiveV3Identifier;
  readonly instruction: string;
}

export type AgentOsInteractiveV3InteractionDecision =
  | "approve"
  | "reject"
  | "cancel"
  | "answer";

export interface AgentOsInteractiveV3InteractionRespondRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "interaction.respond";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly challengeId: AgentOsInteractiveV3Identifier;
  readonly decision: AgentOsInteractiveV3InteractionDecision;
  readonly answer?: string;
}

export interface AgentOsInteractiveV3AgentCatalogReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "agent.catalog.read";
}

export interface AgentOsInteractiveV3AgentDefinitionReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "agent.definition.read";
  readonly agentId: AgentOsInteractiveV3Identifier;
}

export interface AgentOsInteractiveV3WorkspaceCatalogReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "workspace.catalog.read";
}

export interface AgentOsInteractiveV3ExecutionCatalogReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "execution.catalog.read";
}

export interface AgentOsInteractiveV3ContextBindingCreateRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "context.binding.create";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly agentId: AgentOsInteractiveV3Identifier;
  readonly workspaceId: AgentOsInteractiveV3Identifier;
  readonly executionTarget: AgentOsInteractiveV3ExecutionTarget;
  readonly providerId: AgentOsInteractiveV3Identifier;
  readonly modelId: AgentOsInteractiveV3Identifier;
  readonly apiFamily: AgentOsInteractiveV3ProviderApiFamily;
  readonly expectedBindingRevision: number;
  readonly expectedConfigRevision?: number;
}

export interface AgentOsInteractiveV3ConfigStatusReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "config.status.read";
}

export interface AgentOsInteractiveV3ConfigReconcileRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "config.reconcile";
  readonly expectedRevision?: number;
}

export interface AgentOsInteractiveV3WorkspaceChangePreviewRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "workspace.change.preview";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly workspaceId: AgentOsInteractiveV3Identifier;
  readonly baselineDigest: AgentOsInteractiveV3Digest;
}

export interface AgentOsInteractiveV3WorkspaceChangeApplyRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "workspace.change.apply";
  readonly sessionId: AgentOsInteractiveV3Identifier;
  readonly workspaceId: AgentOsInteractiveV3Identifier;
  readonly baselineDigest: AgentOsInteractiveV3Digest;
  readonly changeDigest: AgentOsInteractiveV3Digest;
  readonly expectedWorkspaceRevision: number;
  readonly challengeId?: AgentOsInteractiveV3Identifier;
}

export interface AgentOsInteractiveV3CapabilityReadRequest extends AgentOsInteractiveV3RequestBase {
  readonly operation: "capability.read";
}

export type AgentOsInteractiveV3Request =
  | Readonly<AgentOsInteractiveV3SessionCatalogReadRequest>
  | Readonly<AgentOsInteractiveV3SessionCreateRequest>
  | Readonly<AgentOsInteractiveV3SessionForkRequest>
  | Readonly<AgentOsInteractiveV3SessionRenameRequest>
  | Readonly<AgentOsInteractiveV3TurnStartRequest>
  | Readonly<AgentOsInteractiveV3TurnCancelRequest>
  | Readonly<AgentOsInteractiveV3TurnRetryRequest>
  | Readonly<AgentOsInteractiveV3TranscriptReadRequest>
  | Readonly<AgentOsInteractiveV3TranscriptSubscribeRequest>
  | Readonly<AgentOsInteractiveV3ProviderCatalogReadRequest>
  | Readonly<AgentOsInteractiveV3ProviderBindingCreateRequest>
  | Readonly<AgentOsInteractiveV3PromptQueueReadRequest>
  | Readonly<AgentOsInteractiveV3PromptQueueClearRequest>
  | Readonly<AgentOsInteractiveV3SessionCompactRequest>
  | Readonly<AgentOsInteractiveV3PromptSteerRequest>
  | Readonly<AgentOsInteractiveV3PromptFollowUpRequest>
  | Readonly<AgentOsInteractiveV3InteractionRespondRequest>
  | Readonly<AgentOsInteractiveV3AgentCatalogReadRequest>
  | Readonly<AgentOsInteractiveV3AgentDefinitionReadRequest>
  | Readonly<AgentOsInteractiveV3WorkspaceCatalogReadRequest>
  | Readonly<AgentOsInteractiveV3ExecutionCatalogReadRequest>
  | Readonly<AgentOsInteractiveV3ContextBindingCreateRequest>
  | Readonly<AgentOsInteractiveV3ConfigStatusReadRequest>
  | Readonly<AgentOsInteractiveV3ConfigReconcileRequest>
  | Readonly<AgentOsInteractiveV3WorkspaceChangePreviewRequest>
  | Readonly<AgentOsInteractiveV3WorkspaceChangeApplyRequest>
  | Readonly<AgentOsInteractiveV3CapabilityReadRequest>;

export type AgentOsInteractiveV3ExecutionTarget =
  | "sandbox"
  | "host"
  | "managed";
export type AgentOsInteractiveV3ProviderApiFamily =
  | "openai-responses"
  | "openai-completions";

/**
 * 重放绑定断言（M5/S4）：cursor 本体保持 v2 identity；v3 请求额外断言
 * 客户端所依据的 store generation 与 projection epoch，服务端不一致时按
 * AGENT_OS_INTERACTIVE_V3_REPLAY_DISPOSITIONS 返回 rebuild/update 类处置，
 * 不得跨缺口推进 cursor。
 */
export interface AgentOsInteractiveV3ReplayBinding {
  readonly storeGeneration: number;
  readonly projectionEpoch: number;
}

export const AGENT_OS_INTERACTIVE_V3_REPLAY_DISPOSITIONS = Object.freeze([
  "committed",
  "rebuild-required",
  "update-required",
  "error",
] as const);

export type AgentOsInteractiveV3ReplayDisposition =
  (typeof AGENT_OS_INTERACTIVE_V3_REPLAY_DISPOSITIONS)[number];

/**
 * 能力发现四维状态（M1）：静态支持不等于 ready；只有 implemented 且
 * configured 且 authorized 才允许 ready。fixture 不得注册成正式 serving
 * capability。首切片裁定（08-semantic-freeze.md §9）：session.tree、
 * steer.at-tool-boundary、thinking.select、provider.auth、attachment.image、
 * compact.auto 保留契约占位，由宿主声明 implemented:false。
 */
export const AGENT_OS_INTERACTIVE_V3_CAPABILITIES = Object.freeze([
  "session.create",
  "session.read",
  "session.rename",
  "session.fork",
  "session.tree",
  "prompt.start",
  "prompt.cancel",
  "prompt.retry",
  "queue.read",
  "queue.clear",
  "steer.after-run",
  "steer.at-tool-boundary",
  "follow-up.after-run",
  "model.binding",
  "thinking.select",
  "provider.auth",
  "compact.manual",
  "compact.auto",
  "tool.execute",
  "interaction.approval",
  "interaction.question",
  "attachment.image",
  "replay.resume",
  "remote.observe",
  "remote.control",
] as const);

export type AgentOsInteractiveV3Capability =
  (typeof AGENT_OS_INTERACTIVE_V3_CAPABILITIES)[number];

export const AGENT_OS_INTERACTIVE_V3_DECLARED_CAPABILITIES = Object.freeze([
  "session.tree",
  "steer.at-tool-boundary",
  "thinking.select",
  "provider.auth",
  "compact.auto",
  "attachment.image",
] as const);

export interface AgentOsInteractiveV3CapabilityDescriptor {
  readonly capability: AgentOsInteractiveV3Capability;
  readonly implemented: boolean;
  readonly configured: boolean;
  readonly authorized: boolean;
  readonly ready: boolean;
  readonly reason?: string;
}

export interface AgentOsInteractiveV3CapabilityResponse {
  readonly schemaVersion: AgentOsInteractiveV3SchemaVersion;
  readonly operation: "capability.read";
  readonly requestId: AgentOsInteractiveV3Identifier;
  readonly capabilities: readonly Readonly<AgentOsInteractiveV3CapabilityDescriptor>[];
}

/** 命令回执（M4）：executed/duplicate 都是终态收据；冲突与过期用
 * IDEMPOTENCY_CONFLICT / IDEMPOTENCY_RECORD_EXPIRED 拒绝。 */
export interface AgentOsInteractiveV3CommandReceipt {
  readonly commandId: AgentOsInteractiveV3Identifier;
  readonly disposition: "executed" | "duplicate";
  readonly payloadDigest: AgentOsInteractiveV3Digest;
}

export type AgentOsInteractiveV3AckOperation = Exclude<
  AgentOsInteractiveV3Operation,
  | "transcript.read"
  | "transcript.subscribe"
  | "session.catalog.read"
  | "provider.catalog.read"
  | "prompt.queue.read"
  | "agent.catalog.read"
  | "agent.definition.read"
  | "workspace.catalog.read"
  | "execution.catalog.read"
  | "context.binding.create"
  | "config.status.read"
  | "config.reconcile"
  | "workspace.change.preview"
  | "workspace.change.apply"
  | "capability.read"
>;

export interface AgentOsInteractiveV3AckResponse {
  readonly schemaVersion: AgentOsInteractiveV3SchemaVersion;
  readonly operation: AgentOsInteractiveV3AckOperation;
  readonly requestId: AgentOsInteractiveV3Identifier;
  readonly status: "accepted" | "completed" | "rejected";
  readonly replayed: boolean;
  readonly sessionId?: AgentOsInteractiveV3Identifier;
  readonly runId?: AgentOsInteractiveV3Identifier;
  readonly turnId?: AgentOsInteractiveV3Identifier;
  readonly reason?: string;
  readonly receipt?: AgentOsInteractiveV3CommandReceipt;
}

export type AgentOsInteractiveV3Response =
  | Readonly<AgentOsInteractiveV3AckResponse>
  | Readonly<AgentOsInteractiveV3CapabilityResponse>;

/**
 * 事件流 wire identity 冻结裁定：本切片不新增事件语义，transcript 流保持
 * `agent-os-interactive.v2`。该常量仅供宿主在 v3 协商响应中声明数据面
 * identity；禁止用它伪造 v3 事件版本。
 */
export const AGENT_OS_INTERACTIVE_V3_EVENT_SCHEMA_VERSION =
  "agent-os-interactive.v2" as const;
