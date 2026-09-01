/**
 * Public App-plane protocol for the full-screen Morpheus TUI.
 *
 * v2 deliberately keeps the v1 transcript identity model and adds immutable
 * context binding/catalog projections.  The DTOs contain only authority-issued
 * public metadata; prompts, credentials and host-private paths never cross
 * this boundary.
 */

export const AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION =
  "agent-os-interactive.v2" as const;
export const AGENT_OS_INTERACTIVE_V2_SCHEMA =
  AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION;

export type AgentOsInteractiveV2SchemaVersion =
  typeof AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION;

export const AGENT_OS_INTERACTIVE_V2_OPERATIONS = Object.freeze([
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
] as const);

export type AgentOsInteractiveV2Operation =
  (typeof AGENT_OS_INTERACTIVE_V2_OPERATIONS)[number];

export type AgentOsInteractiveV2Identifier = string;
export type AgentOsInteractiveV2StreamEpoch = `stream-epoch:${string}`;
export type AgentOsInteractiveV2Digest = `sha256:${string}`;

export type AgentOsInteractiveV2RunState =
  | "idle"
  | "running"
  | "awaiting-interaction"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown"
  | "recovery_required";

export type AgentOsInteractiveV2TurnTerminalStatus =
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export type AgentOsInteractiveV2ProviderApiFamily =
  | "openai-responses"
  | "openai-completions";

export type AgentOsInteractiveV2PublicJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly AgentOsInteractiveV2PublicJsonValue[]
  | { readonly [key: string]: AgentOsInteractiveV2PublicJsonValue };

export type AgentOsInteractiveV2ExecutionTarget =
  | "sandbox"
  | "host"
  | "managed";
export type AgentOsInteractiveV2AgentKind = "builtin" | "configured";
export type AgentOsInteractiveV2Availability = "ready" | "unavailable";
export type AgentOsInteractiveV2TrustStatus =
  | "trusted"
  | "untrusted"
  | "challenge-required";
export type AgentOsInteractiveV2ChangeStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed";
export type AgentOsInteractiveV2ConfigState =
  | "empty"
  | "ready"
  | "degraded"
  | "invalid"
  | "recovery_required";

export interface AgentOsInteractiveV2RequestBase {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: AgentOsInteractiveV2Operation;
  readonly requestId: AgentOsInteractiveV2Identifier;
}

export interface AgentOsInteractiveV2SessionCatalogReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "session.catalog.read";
}

export interface AgentOsInteractiveV2SessionCreateRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "session.create";
  readonly title?: string;
  readonly parentSessionId?: AgentOsInteractiveV2Identifier;
  readonly agentId?: AgentOsInteractiveV2Identifier;
  readonly workspaceId?: AgentOsInteractiveV2Identifier;
  readonly executionTarget?: AgentOsInteractiveV2ExecutionTarget;
  readonly providerId?: AgentOsInteractiveV2Identifier;
  readonly modelId?: AgentOsInteractiveV2Identifier;
  readonly apiFamily?: AgentOsInteractiveV2ProviderApiFamily;
}

export interface AgentOsInteractiveV2SessionForkRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "session.fork";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly title?: string;
}

export interface AgentOsInteractiveV2SessionRenameRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "session.rename";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly title: string;
}

export interface AgentOsInteractiveV2TurnStartRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "turn.start";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly turnId: AgentOsInteractiveV2Identifier;
  readonly message: string;
  readonly bindingRevision: number;
}

export interface AgentOsInteractiveV2TurnCancelRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "turn.cancel";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly runId: AgentOsInteractiveV2Identifier;
  readonly turnId: AgentOsInteractiveV2Identifier;
  readonly reason: string;
}

export interface AgentOsInteractiveV2TurnRetryRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "turn.retry";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly runId: AgentOsInteractiveV2Identifier;
  readonly turnId: AgentOsInteractiveV2Identifier;
  readonly bindingRevision: number;
}

export interface AgentOsInteractiveV2TranscriptReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "transcript.read";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly cursor: Readonly<AgentOsInteractiveV2Cursor> | null;
  readonly limit: number;
}

export interface AgentOsInteractiveV2TranscriptSubscribeRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "transcript.subscribe";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly cursor: Readonly<AgentOsInteractiveV2Cursor> | null;
  readonly limit: number;
}

export interface AgentOsInteractiveV2ProviderCatalogReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "provider.catalog.read";
}

export interface AgentOsInteractiveV2ProviderBindingCreateRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "provider.binding.create";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly providerId: AgentOsInteractiveV2Identifier;
  readonly modelId: AgentOsInteractiveV2Identifier;
  readonly apiFamily: AgentOsInteractiveV2ProviderApiFamily;
  readonly expectedRevision: number;
}

export interface AgentOsInteractiveV2PromptQueueReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "prompt.queue.read";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly runId: AgentOsInteractiveV2Identifier;
}

export interface AgentOsInteractiveV2PromptQueueClearRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "prompt.queue.clear";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly runId: AgentOsInteractiveV2Identifier;
  readonly expectedRevision: number;
}

export interface AgentOsInteractiveV2SessionCompactRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "session.compact";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly sourceRunId: AgentOsInteractiveV2Identifier;
}

export interface AgentOsInteractiveV2PromptSteerRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "prompt.steer";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly runId: AgentOsInteractiveV2Identifier;
  readonly turnId: AgentOsInteractiveV2Identifier;
  readonly instruction: string;
}

export interface AgentOsInteractiveV2PromptFollowUpRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "prompt.follow-up";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly runId: AgentOsInteractiveV2Identifier;
  readonly turnId: AgentOsInteractiveV2Identifier;
  readonly instruction: string;
}

export type AgentOsInteractiveV2InteractionKind = "approval" | "question";
export type AgentOsInteractiveV2InteractionDecision =
  | "approve"
  | "reject"
  | "cancel"
  | "retry"
  | "answer";

export interface AgentOsInteractiveV2InteractionRespondRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "interaction.respond";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly challengeId: AgentOsInteractiveV2Identifier;
  readonly decision: AgentOsInteractiveV2InteractionDecision;
  readonly answer?: string;
}

export interface AgentOsInteractiveV2AgentCatalogReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "agent.catalog.read";
}

export interface AgentOsInteractiveV2AgentDefinitionReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "agent.definition.read";
  readonly agentId: AgentOsInteractiveV2Identifier;
}

export interface AgentOsInteractiveV2WorkspaceCatalogReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "workspace.catalog.read";
}

export interface AgentOsInteractiveV2ExecutionCatalogReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "execution.catalog.read";
}

export interface AgentOsInteractiveV2ContextBindingCreateRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "context.binding.create";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly agentId: AgentOsInteractiveV2Identifier;
  readonly workspaceId: AgentOsInteractiveV2Identifier;
  readonly executionTarget: AgentOsInteractiveV2ExecutionTarget;
  readonly providerId: AgentOsInteractiveV2Identifier;
  readonly modelId: AgentOsInteractiveV2Identifier;
  readonly apiFamily: AgentOsInteractiveV2ProviderApiFamily;
  readonly expectedBindingRevision: number;
  readonly expectedConfigRevision?: number;
}

export interface AgentOsInteractiveV2ConfigStatusReadRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "config.status.read";
}

export interface AgentOsInteractiveV2ConfigReconcileRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "config.reconcile";
  readonly expectedRevision?: number;
}

export interface AgentOsInteractiveV2WorkspaceChangePreviewRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "workspace.change.preview";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly workspaceId: AgentOsInteractiveV2Identifier;
  readonly baselineDigest: AgentOsInteractiveV2Digest;
}

export interface AgentOsInteractiveV2WorkspaceChangeApplyRequest extends AgentOsInteractiveV2RequestBase {
  readonly operation: "workspace.change.apply";
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly workspaceId: AgentOsInteractiveV2Identifier;
  readonly baselineDigest: AgentOsInteractiveV2Digest;
  readonly changeDigest: AgentOsInteractiveV2Digest;
  readonly expectedWorkspaceRevision: number;
  readonly challengeId?: AgentOsInteractiveV2Identifier;
}

export type AgentOsInteractiveV2Request =
  | Readonly<AgentOsInteractiveV2SessionCatalogReadRequest>
  | Readonly<AgentOsInteractiveV2SessionCreateRequest>
  | Readonly<AgentOsInteractiveV2SessionForkRequest>
  | Readonly<AgentOsInteractiveV2SessionRenameRequest>
  | Readonly<AgentOsInteractiveV2TurnStartRequest>
  | Readonly<AgentOsInteractiveV2TurnCancelRequest>
  | Readonly<AgentOsInteractiveV2TurnRetryRequest>
  | Readonly<AgentOsInteractiveV2TranscriptReadRequest>
  | Readonly<AgentOsInteractiveV2TranscriptSubscribeRequest>
  | Readonly<AgentOsInteractiveV2ProviderCatalogReadRequest>
  | Readonly<AgentOsInteractiveV2ProviderBindingCreateRequest>
  | Readonly<AgentOsInteractiveV2PromptQueueReadRequest>
  | Readonly<AgentOsInteractiveV2PromptQueueClearRequest>
  | Readonly<AgentOsInteractiveV2SessionCompactRequest>
  | Readonly<AgentOsInteractiveV2PromptSteerRequest>
  | Readonly<AgentOsInteractiveV2PromptFollowUpRequest>
  | Readonly<AgentOsInteractiveV2InteractionRespondRequest>
  | Readonly<AgentOsInteractiveV2AgentCatalogReadRequest>
  | Readonly<AgentOsInteractiveV2AgentDefinitionReadRequest>
  | Readonly<AgentOsInteractiveV2WorkspaceCatalogReadRequest>
  | Readonly<AgentOsInteractiveV2ExecutionCatalogReadRequest>
  | Readonly<AgentOsInteractiveV2ContextBindingCreateRequest>
  | Readonly<AgentOsInteractiveV2ConfigStatusReadRequest>
  | Readonly<AgentOsInteractiveV2ConfigReconcileRequest>
  | Readonly<AgentOsInteractiveV2WorkspaceChangePreviewRequest>
  | Readonly<AgentOsInteractiveV2WorkspaceChangeApplyRequest>;

export interface AgentOsInteractiveV2Cursor {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly streamEpoch: AgentOsInteractiveV2StreamEpoch;
  readonly sequence: number;
  readonly watermark: number;
  readonly digest: AgentOsInteractiveV2Digest;
}

export type AgentOsInteractiveV2CursorInput = Omit<
  AgentOsInteractiveV2Cursor,
  "digest"
>;

export interface AgentOsInteractiveV2ProviderBindingSummary {
  readonly providerId: AgentOsInteractiveV2Identifier;
  readonly modelId: AgentOsInteractiveV2Identifier;
  readonly apiFamily: AgentOsInteractiveV2ProviderApiFamily;
  readonly revision: number;
}

export interface AgentOsInteractiveV2ContextBinding {
  readonly bindingId: AgentOsInteractiveV2Identifier;
  readonly revision: number;
  readonly agentId: AgentOsInteractiveV2Identifier;
  readonly agentRevision: number;
  readonly configRevision: number;
  readonly profileId?: AgentOsInteractiveV2Identifier;
  readonly promptDigest: AgentOsInteractiveV2Digest;
  readonly toolsDigest: AgentOsInteractiveV2Digest;
  readonly skillsDigest: AgentOsInteractiveV2Digest;
  readonly workspaceId: AgentOsInteractiveV2Identifier;
  readonly executionTarget: AgentOsInteractiveV2ExecutionTarget;
  readonly provider: Readonly<AgentOsInteractiveV2ProviderBindingSummary>;
  readonly policyDigest: AgentOsInteractiveV2Digest;
  readonly capabilityDigest: AgentOsInteractiveV2Digest;
  readonly executorArtifactDigest?: AgentOsInteractiveV2Digest;
  readonly createdAt: string;
  readonly digest: AgentOsInteractiveV2Digest;
}

export type AgentOsInteractiveV2ContextBindingInput = Omit<
  AgentOsInteractiveV2ContextBinding,
  "digest"
>;

export interface AgentOsInteractiveV2AgentDescriptor {
  readonly agentId: AgentOsInteractiveV2Identifier;
  readonly displayName: string;
  readonly kind: AgentOsInteractiveV2AgentKind;
  readonly description?: string;
  readonly revision: number;
  readonly configRevision: number;
  readonly availability: AgentOsInteractiveV2Availability;
  readonly unavailableReason?: string;
  readonly defaultExecutionTarget: AgentOsInteractiveV2ExecutionTarget;
  readonly allowedExecutionTargets: readonly AgentOsInteractiveV2ExecutionTarget[];
  readonly defaultProviderId: AgentOsInteractiveV2Identifier;
  readonly defaultModelId: AgentOsInteractiveV2Identifier;
  readonly defaultApiFamily: AgentOsInteractiveV2ProviderApiFamily;
  readonly allowedModelBindings: readonly Readonly<AgentOsInteractiveV2ProviderBindingSummary>[];
  readonly toolNames: readonly string[];
  readonly skillNames: readonly string[];
  readonly digest: AgentOsInteractiveV2Digest;
}

export type AgentOsInteractiveV2AgentDescriptorInput = Omit<
  AgentOsInteractiveV2AgentDescriptor,
  "digest"
>;

export interface AgentOsInteractiveV2AgentDefinition {
  readonly descriptor: Readonly<AgentOsInteractiveV2AgentDescriptor>;
  readonly toolNames: readonly string[];
  readonly skillNames: readonly string[];
  readonly promptDigest: AgentOsInteractiveV2Digest;
  readonly policyDigest: AgentOsInteractiveV2Digest;
  readonly capabilityDigest: AgentOsInteractiveV2Digest;
  readonly digest: AgentOsInteractiveV2Digest;
}

export interface AgentOsInteractiveV2WorkspaceDescriptor {
  readonly workspaceId: AgentOsInteractiveV2Identifier;
  readonly displayName: string;
  readonly kind: "git" | "directory" | "snapshot";
  readonly trustStatus: AgentOsInteractiveV2TrustStatus;
  readonly revision: number;
  readonly dirty: boolean;
  readonly availability: AgentOsInteractiveV2Availability;
  readonly unavailableReason?: string;
  readonly digest: AgentOsInteractiveV2Digest;
}

export type AgentOsInteractiveV2WorkspaceDescriptorInput = Omit<
  AgentOsInteractiveV2WorkspaceDescriptor,
  "digest"
>;

export interface AgentOsInteractiveV2ExecutionDescriptor {
  readonly target: AgentOsInteractiveV2ExecutionTarget;
  readonly displayName: string;
  readonly availability: AgentOsInteractiveV2Availability;
  readonly unavailableReason?: string;
  readonly defaultForAgentIds: readonly AgentOsInteractiveV2Identifier[];
  readonly capabilities: readonly string[];
  readonly requiresApproval: boolean;
  readonly artifactDigest?: AgentOsInteractiveV2Digest;
  readonly digest: AgentOsInteractiveV2Digest;
}

export type AgentOsInteractiveV2ExecutionDescriptorInput = Omit<
  AgentOsInteractiveV2ExecutionDescriptor,
  "digest"
>;

export interface AgentOsInteractiveV2ConfigStatus {
  readonly configId: AgentOsInteractiveV2Identifier;
  readonly revision: number;
  readonly digest: AgentOsInteractiveV2Digest;
  readonly status: AgentOsInteractiveV2ConfigState;
  readonly source: "builtin" | "explicit";
  readonly diagnostics: readonly string[];
  readonly agentCount: number;
  readonly providerCount: number;
  readonly lastKnownGoodRevision?: number;
}

export interface AgentOsInteractiveV2WorkspaceChange {
  readonly path: string;
  readonly status: AgentOsInteractiveV2ChangeStatus;
  readonly beforeDigest?: AgentOsInteractiveV2Digest;
  readonly afterDigest?: AgentOsInteractiveV2Digest;
  readonly bytes: number;
}

export interface AgentOsInteractiveV2WorkspaceChangeSet {
  readonly workspaceId: AgentOsInteractiveV2Identifier;
  readonly baselineDigest: AgentOsInteractiveV2Digest;
  readonly changeDigest: AgentOsInteractiveV2Digest;
  readonly workspaceRevision: number;
  readonly changes: readonly Readonly<AgentOsInteractiveV2WorkspaceChange>[];
  readonly conflict: boolean;
  readonly conflictReason?: string;
  readonly digest: AgentOsInteractiveV2Digest;
}

export type AgentOsInteractiveV2WorkspaceChangeSetInput = Omit<
  AgentOsInteractiveV2WorkspaceChangeSet,
  "digest"
>;

export interface AgentOsInteractiveV2Snapshot {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly sessionTitle?: string;
  readonly parentSessionId?: AgentOsInteractiveV2Identifier;
  readonly providerId?: AgentOsInteractiveV2Identifier;
  readonly modelId?: AgentOsInteractiveV2Identifier;
  readonly apiFamily?: AgentOsInteractiveV2ProviderApiFamily;
  readonly runId: AgentOsInteractiveV2Identifier | null;
  readonly turnId: AgentOsInteractiveV2Identifier | null;
  readonly attemptId: AgentOsInteractiveV2Identifier | null;
  readonly effectId: AgentOsInteractiveV2Identifier | null;
  readonly binding: Readonly<AgentOsInteractiveV2ContextBinding> | null;
  readonly bindingRevision: number;
  readonly streamEpoch: AgentOsInteractiveV2StreamEpoch;
  readonly watermark: number;
  readonly state: AgentOsInteractiveV2RunState;
  readonly terminal: boolean;
  readonly updatedAt: string;
  readonly digest: AgentOsInteractiveV2Digest;
}

export type AgentOsInteractiveV2SnapshotInput = Omit<
  AgentOsInteractiveV2Snapshot,
  "digest"
>;

export type AgentOsInteractiveV2EventType =
  | "user.message"
  | "assistant.text.start"
  | "assistant.text.delta"
  | "assistant.text.end"
  | "assistant.reasoning.start"
  | "assistant.reasoning.delta"
  | "assistant.reasoning.end"
  | "tool.call.started"
  | "tool.call.args.delta"
  | "tool.call.terminal"
  | "tool.result"
  | "artifact.reference"
  | "interaction.requested"
  | "interaction.resolved"
  | "usage"
  | "compaction.checkpoint"
  | "context.binding.created"
  | "config.reconciled"
  | "workspace.change.previewed"
  | "workspace.change.applied"
  | "turn.terminal";

export const AGENT_OS_INTERACTIVE_V2_EVENT_TYPES = Object.freeze([
  "user.message",
  "assistant.text.start",
  "assistant.text.delta",
  "assistant.text.end",
  "assistant.reasoning.start",
  "assistant.reasoning.delta",
  "assistant.reasoning.end",
  "tool.call.started",
  "tool.call.args.delta",
  "tool.call.terminal",
  "tool.result",
  "artifact.reference",
  "interaction.requested",
  "interaction.resolved",
  "usage",
  "compaction.checkpoint",
  "context.binding.created",
  "config.reconciled",
  "workspace.change.previewed",
  "workspace.change.applied",
  "turn.terminal",
] as const satisfies readonly AgentOsInteractiveV2EventType[]);

export type AgentOsInteractiveV2EventPayload =
  | Readonly<{ messageId: AgentOsInteractiveV2Identifier; content: string }>
  | Readonly<{ contentId: AgentOsInteractiveV2Identifier }>
  | Readonly<{
      contentId: AgentOsInteractiveV2Identifier;
      delta: string;
    }>
  | Readonly<{
      contentId: AgentOsInteractiveV2Identifier;
      content: string;
    }>
  | Readonly<{
      toolCallId: AgentOsInteractiveV2Identifier;
      toolName: string;
      arguments: Readonly<Record<string, AgentOsInteractiveV2PublicJsonValue>>;
    }>
  | Readonly<{
      toolCallId: AgentOsInteractiveV2Identifier;
      delta: string;
    }>
  | Readonly<{
      toolCallId: AgentOsInteractiveV2Identifier;
      status: "succeeded" | "failed" | "cancelled";
      result: AgentOsInteractiveV2PublicJsonValue;
      isError: boolean;
    }>
  | Readonly<{
      toolCallId: AgentOsInteractiveV2Identifier;
      result: AgentOsInteractiveV2PublicJsonValue;
      isError: boolean;
    }>
  | Readonly<{
      artifactId: AgentOsInteractiveV2Identifier;
      kind: string;
      uri: string;
      label?: string;
    }>
  | Readonly<{
      challengeId: AgentOsInteractiveV2Identifier;
      kind: AgentOsInteractiveV2InteractionKind;
      prompt: string;
      options?: readonly string[];
      capability?: "interaction.respond";
    }>
  | Readonly<{
      challengeId: AgentOsInteractiveV2Identifier;
      decision: AgentOsInteractiveV2InteractionDecision;
      answer?: string;
    }>
  | Readonly<{
      inputTokens: number;
      outputTokens: number;
      totalTokens?: number;
      cost?: number;
    }>
  | Readonly<{
      checkpointId: AgentOsInteractiveV2Identifier;
      sourceWatermark: number;
      summary?: string;
    }>
  | Readonly<{
      binding: Readonly<AgentOsInteractiveV2ContextBinding>;
    }>
  | Readonly<{
      configRevision: number;
      configDigest: AgentOsInteractiveV2Digest;
      status: AgentOsInteractiveV2ConfigState;
    }>
  | Readonly<{
      changeSet: Readonly<AgentOsInteractiveV2WorkspaceChangeSet>;
    }>
  | Readonly<{
      status: AgentOsInteractiveV2TurnTerminalStatus;
      resultDigest?: AgentOsInteractiveV2Digest;
      reason?: string;
    }>;

export interface AgentOsInteractiveV2EventBase {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly eventId: AgentOsInteractiveV2Identifier;
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly runId: AgentOsInteractiveV2Identifier | null;
  readonly turnId: AgentOsInteractiveV2Identifier | null;
  readonly attemptId: AgentOsInteractiveV2Identifier | null;
  readonly effectId: AgentOsInteractiveV2Identifier | null;
  readonly bindingRevision: number;
  readonly streamEpoch: AgentOsInteractiveV2StreamEpoch;
  readonly sequence: number;
  readonly cursor: Readonly<AgentOsInteractiveV2Cursor>;
  readonly eventType: AgentOsInteractiveV2EventType;
  readonly payload: AgentOsInteractiveV2EventPayload;
  readonly createdAt: string;
  readonly digest: AgentOsInteractiveV2Digest;
}

export type AgentOsInteractiveV2Event = Readonly<AgentOsInteractiveV2EventBase>;
export type AgentOsInteractiveV2EventInput = Omit<
  AgentOsInteractiveV2Event,
  "digest" | "cursor"
> & { readonly cursor?: Readonly<AgentOsInteractiveV2CursorInput> };

export type AgentOsInteractiveV2TranscriptOperation =
  | "transcript.read"
  | "transcript.subscribe";

export interface AgentOsInteractiveV2TranscriptResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: AgentOsInteractiveV2TranscriptOperation;
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly disposition: "events" | "snapshot-required";
  readonly snapshot: Readonly<AgentOsInteractiveV2Snapshot>;
  readonly events: readonly Readonly<AgentOsInteractiveV2Event>[];
  readonly cursor: Readonly<AgentOsInteractiveV2Cursor>;
  readonly replayed: boolean;
}

export interface AgentOsInteractiveV2SessionSummary {
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly title: string;
  readonly updatedAt: string;
  readonly state: AgentOsInteractiveV2RunState;
  readonly agentId?: AgentOsInteractiveV2Identifier;
  readonly workspaceId?: AgentOsInteractiveV2Identifier;
  readonly executionTarget?: AgentOsInteractiveV2ExecutionTarget;
  readonly bindingRevision?: number;
}

export interface AgentOsInteractiveV2SessionCatalogResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "session.catalog.read";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly sessions: readonly Readonly<AgentOsInteractiveV2SessionSummary>[];
}

export interface AgentOsInteractiveV2ProviderDescriptor {
  readonly providerId: AgentOsInteractiveV2Identifier;
  readonly displayName: string;
  readonly models: readonly Readonly<AgentOsInteractiveV2ModelDescriptor>[];
}

export interface AgentOsInteractiveV2ModelDescriptor {
  readonly modelId: AgentOsInteractiveV2Identifier;
  readonly apiFamilies: readonly AgentOsInteractiveV2ProviderApiFamily[];
}

export interface AgentOsInteractiveV2ProviderCatalogResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "provider.catalog.read";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly providers: readonly Readonly<AgentOsInteractiveV2ProviderDescriptor>[];
}

export interface AgentOsInteractiveV2QueueItem {
  readonly itemId: AgentOsInteractiveV2Identifier;
  readonly kind: "steer" | "follow_up";
  readonly status:
    | "queued"
    | "claimed"
    | "context_applied"
    | "applied"
    | "cancelled"
    | "recovery_required";
  readonly instructionDigest: AgentOsInteractiveV2Digest;
  readonly revision: number;
}

export interface AgentOsInteractiveV2QueueResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "prompt.queue.read";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly runId: AgentOsInteractiveV2Identifier;
  readonly queueRevision: number;
  readonly items: readonly Readonly<AgentOsInteractiveV2QueueItem>[];
}

export interface AgentOsInteractiveV2AgentCatalogResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "agent.catalog.read";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly config: Readonly<AgentOsInteractiveV2ConfigStatus>;
  readonly agents: readonly Readonly<AgentOsInteractiveV2AgentDescriptor>[];
}

export interface AgentOsInteractiveV2AgentDefinitionResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "agent.definition.read";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly definition: Readonly<AgentOsInteractiveV2AgentDefinition>;
}

export interface AgentOsInteractiveV2WorkspaceCatalogResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "workspace.catalog.read";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly workspaces: readonly Readonly<AgentOsInteractiveV2WorkspaceDescriptor>[];
}

export interface AgentOsInteractiveV2ExecutionCatalogResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "execution.catalog.read";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly executions: readonly Readonly<AgentOsInteractiveV2ExecutionDescriptor>[];
}

export interface AgentOsInteractiveV2ContextBindingResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "context.binding.create";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly parentSessionId?: AgentOsInteractiveV2Identifier;
  readonly binding: Readonly<AgentOsInteractiveV2ContextBinding>;
  readonly replayed: boolean;
}

export interface AgentOsInteractiveV2ConfigStatusResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "config.status.read" | "config.reconcile";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly config: Readonly<AgentOsInteractiveV2ConfigStatus>;
  readonly replayed: boolean;
}

export interface AgentOsInteractiveV2WorkspaceChangeResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: "workspace.change.preview" | "workspace.change.apply";
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly changeSet: Readonly<AgentOsInteractiveV2WorkspaceChangeSet>;
  readonly replayed: boolean;
}

export interface AgentOsInteractiveV2AckResponse {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly operation: Exclude<
    AgentOsInteractiveV2Operation,
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
  >;
  readonly requestId: AgentOsInteractiveV2Identifier;
  readonly status: "accepted" | "completed" | "rejected";
  readonly replayed: boolean;
  readonly sessionId?: AgentOsInteractiveV2Identifier;
  readonly runId?: AgentOsInteractiveV2Identifier;
  readonly turnId?: AgentOsInteractiveV2Identifier;
  readonly reason?: string;
}

export type AgentOsInteractiveV2Response =
  | Readonly<AgentOsInteractiveV2TranscriptResponse>
  | Readonly<AgentOsInteractiveV2SessionCatalogResponse>
  | Readonly<AgentOsInteractiveV2ProviderCatalogResponse>
  | Readonly<AgentOsInteractiveV2QueueResponse>
  | Readonly<AgentOsInteractiveV2AgentCatalogResponse>
  | Readonly<AgentOsInteractiveV2AgentDefinitionResponse>
  | Readonly<AgentOsInteractiveV2WorkspaceCatalogResponse>
  | Readonly<AgentOsInteractiveV2ExecutionCatalogResponse>
  | Readonly<AgentOsInteractiveV2ContextBindingResponse>
  | Readonly<AgentOsInteractiveV2ConfigStatusResponse>
  | Readonly<AgentOsInteractiveV2WorkspaceChangeResponse>
  | Readonly<AgentOsInteractiveV2AckResponse>;

export interface AgentOsInteractiveV2TranscriptPage {
  readonly schemaVersion: AgentOsInteractiveV2SchemaVersion;
  readonly sessionId: AgentOsInteractiveV2Identifier;
  readonly response: Readonly<AgentOsInteractiveV2TranscriptResponse>;
}
