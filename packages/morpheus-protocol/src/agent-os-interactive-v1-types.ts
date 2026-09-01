/**
 * Public App-plane protocol for interactive terminal clients.
 *
 * This file intentionally contains data-only DTOs.  It must not grow storage,
 * credential, lifecycle, or Runtime implementation dependencies.
 */

export const AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION =
  "agent-os-interactive.v1" as const;
export const AGENT_OS_INTERACTIVE_V1_SCHEMA =
  AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION;

export type AgentOsInteractiveV1SchemaVersion =
  typeof AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION;

export const AGENT_OS_INTERACTIVE_V1_OPERATIONS = Object.freeze([
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
] as const);

export type AgentOsInteractiveOperation =
  (typeof AGENT_OS_INTERACTIVE_V1_OPERATIONS)[number];

export type AgentOsInteractiveV1Operation = AgentOsInteractiveOperation;

export type AgentOsInteractiveIdentifier = string;
export type AgentOsInteractiveStreamEpoch = `stream-epoch:${string}`;

export type AgentOsInteractiveRunState =
  | "idle"
  | "running"
  | "awaiting-interaction"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export type AgentOsInteractiveTurnTerminalStatus =
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export type AgentOsInteractiveProviderApiFamily =
  | "openai-responses"
  | "openai-completions";

export type AgentOsInteractivePublicJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly AgentOsInteractivePublicJsonValue[]
  | { readonly [key: string]: AgentOsInteractivePublicJsonValue };

export interface AgentOsInteractiveRequestBase {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly operation: AgentOsInteractiveOperation;
  readonly requestId: AgentOsInteractiveIdentifier;
}

export interface AgentOsInteractiveSessionCatalogReadRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "session.catalog.read";
}

export interface AgentOsInteractiveSessionCreateRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "session.create";
  readonly title?: string;
  readonly providerId?: AgentOsInteractiveIdentifier;
  readonly modelId?: AgentOsInteractiveIdentifier;
  readonly apiFamily?: AgentOsInteractiveProviderApiFamily;
}

export interface AgentOsInteractiveSessionForkRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "session.fork";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly title?: string;
}

export interface AgentOsInteractiveSessionRenameRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "session.rename";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly title: string;
}

export interface AgentOsInteractiveTurnStartRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "turn.start";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly turnId: AgentOsInteractiveIdentifier;
  readonly message: string;
  readonly bindingRevision: number;
}

export interface AgentOsInteractiveTurnCancelRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "turn.cancel";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly runId: AgentOsInteractiveIdentifier;
  readonly turnId: AgentOsInteractiveIdentifier;
  readonly reason: string;
}

export interface AgentOsInteractiveTurnRetryRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "turn.retry";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly runId: AgentOsInteractiveIdentifier;
  readonly turnId: AgentOsInteractiveIdentifier;
  readonly bindingRevision: number;
}

export interface AgentOsInteractiveTranscriptReadRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "transcript.read";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly cursor: Readonly<AgentOsInteractiveCursor> | null;
  readonly limit: number;
}

export interface AgentOsInteractiveTranscriptSubscribeRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "transcript.subscribe";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly cursor: Readonly<AgentOsInteractiveCursor> | null;
  readonly limit: number;
}

export interface AgentOsInteractiveProviderCatalogReadRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "provider.catalog.read";
}

export interface AgentOsInteractiveProviderBindingCreateRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "provider.binding.create";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly providerId: AgentOsInteractiveIdentifier;
  readonly modelId: AgentOsInteractiveIdentifier;
  readonly apiFamily: AgentOsInteractiveProviderApiFamily;
  readonly expectedRevision: number;
}

export interface AgentOsInteractivePromptQueueReadRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "prompt.queue.read";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly runId: AgentOsInteractiveIdentifier;
}

export interface AgentOsInteractivePromptQueueClearRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "prompt.queue.clear";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly runId: AgentOsInteractiveIdentifier;
  readonly expectedRevision: number;
}

export interface AgentOsInteractiveSessionCompactRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "session.compact";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly sourceRunId: AgentOsInteractiveIdentifier;
}

export interface AgentOsInteractivePromptSteerRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "prompt.steer";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly runId: AgentOsInteractiveIdentifier;
  readonly turnId: AgentOsInteractiveIdentifier;
  readonly instruction: string;
}

export interface AgentOsInteractivePromptFollowUpRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "prompt.follow-up";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly runId: AgentOsInteractiveIdentifier;
  readonly turnId: AgentOsInteractiveIdentifier;
  readonly instruction: string;
}

export type AgentOsInteractiveInteractionKind = "approval" | "question";
export type AgentOsInteractiveInteractionDecision =
  | "approve"
  | "reject"
  | "cancel"
  | "retry"
  | "answer";

export interface AgentOsInteractiveInteractionRespondRequest extends AgentOsInteractiveRequestBase {
  readonly operation: "interaction.respond";
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly challengeId: AgentOsInteractiveIdentifier;
  readonly decision: AgentOsInteractiveInteractionDecision;
  readonly answer?: string;
}

export type AgentOsInteractiveRequest =
  | Readonly<AgentOsInteractiveSessionCatalogReadRequest>
  | Readonly<AgentOsInteractiveSessionCreateRequest>
  | Readonly<AgentOsInteractiveSessionForkRequest>
  | Readonly<AgentOsInteractiveSessionRenameRequest>
  | Readonly<AgentOsInteractiveTurnStartRequest>
  | Readonly<AgentOsInteractiveTurnCancelRequest>
  | Readonly<AgentOsInteractiveTurnRetryRequest>
  | Readonly<AgentOsInteractiveTranscriptReadRequest>
  | Readonly<AgentOsInteractiveTranscriptSubscribeRequest>
  | Readonly<AgentOsInteractiveProviderCatalogReadRequest>
  | Readonly<AgentOsInteractiveProviderBindingCreateRequest>
  | Readonly<AgentOsInteractivePromptQueueReadRequest>
  | Readonly<AgentOsInteractivePromptQueueClearRequest>
  | Readonly<AgentOsInteractiveSessionCompactRequest>
  | Readonly<AgentOsInteractivePromptSteerRequest>
  | Readonly<AgentOsInteractivePromptFollowUpRequest>
  | Readonly<AgentOsInteractiveInteractionRespondRequest>;

export type AgentOsInteractiveV1Request = AgentOsInteractiveRequest;

export interface AgentOsInteractiveCursor {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly streamEpoch: AgentOsInteractiveStreamEpoch;
  readonly sequence: number;
  readonly watermark: number;
  readonly digest: string;
}

export type AgentOsInteractiveV1Cursor = AgentOsInteractiveCursor;

export interface AgentOsInteractiveSnapshot {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly sessionId: AgentOsInteractiveIdentifier;
  /** Display metadata is authority-issued with the frozen binding snapshot. */
  readonly sessionTitle?: string;
  readonly providerId?: AgentOsInteractiveIdentifier;
  readonly modelId?: AgentOsInteractiveIdentifier;
  readonly apiFamily?: AgentOsInteractiveProviderApiFamily;
  readonly runId: AgentOsInteractiveIdentifier | null;
  readonly turnId: AgentOsInteractiveIdentifier | null;
  readonly attemptId: AgentOsInteractiveIdentifier | null;
  readonly effectId: AgentOsInteractiveIdentifier | null;
  readonly bindingRevision: number;
  readonly streamEpoch: AgentOsInteractiveStreamEpoch;
  readonly watermark: number;
  readonly state: AgentOsInteractiveRunState;
  readonly terminal: boolean;
  readonly updatedAt: string;
  readonly digest: string;
}

export type AgentOsInteractiveV1Snapshot = AgentOsInteractiveSnapshot;

export interface AgentOsInteractiveEventBase {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly eventId: AgentOsInteractiveIdentifier;
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly runId: AgentOsInteractiveIdentifier | null;
  readonly turnId: AgentOsInteractiveIdentifier | null;
  readonly attemptId: AgentOsInteractiveIdentifier | null;
  readonly effectId: AgentOsInteractiveIdentifier | null;
  readonly bindingRevision: number;
  readonly streamEpoch: AgentOsInteractiveStreamEpoch;
  readonly sequence: number;
  readonly cursor: Readonly<AgentOsInteractiveCursor>;
  readonly eventType: AgentOsInteractiveEventType;
  readonly payload: AgentOsInteractiveEventPayload;
  readonly createdAt: string;
  readonly digest: string;
}

export type AgentOsInteractiveEventType =
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
  | "turn.terminal";

export type AgentOsInteractiveV1EventType = AgentOsInteractiveEventType;

export const AGENT_OS_INTERACTIVE_V1_EVENT_TYPES = Object.freeze([
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
  "turn.terminal",
] as const satisfies readonly AgentOsInteractiveEventType[]);

export type AgentOsInteractiveEventPayload =
  | Readonly<{ messageId: AgentOsInteractiveIdentifier; content: string }>
  | Readonly<{ contentId: AgentOsInteractiveIdentifier }>
  | Readonly<{
      contentId: AgentOsInteractiveIdentifier;
      delta: string;
    }>
  | Readonly<{
      contentId: AgentOsInteractiveIdentifier;
      content: string;
    }>
  | Readonly<{
      toolCallId: AgentOsInteractiveIdentifier;
      toolName: string;
      arguments: Readonly<Record<string, AgentOsInteractivePublicJsonValue>>;
    }>
  | Readonly<{
      toolCallId: AgentOsInteractiveIdentifier;
      delta: string;
    }>
  | Readonly<{
      toolCallId: AgentOsInteractiveIdentifier;
      status: "succeeded" | "failed" | "cancelled";
      result: AgentOsInteractivePublicJsonValue;
      isError: boolean;
    }>
  | Readonly<{
      toolCallId: AgentOsInteractiveIdentifier;
      result: AgentOsInteractivePublicJsonValue;
      isError: boolean;
    }>
  | Readonly<{
      artifactId: AgentOsInteractiveIdentifier;
      kind: string;
      uri: string;
      label?: string;
    }>
  | Readonly<{
      challengeId: AgentOsInteractiveIdentifier;
      kind: AgentOsInteractiveInteractionKind;
      prompt: string;
      options?: readonly string[];
      capability?: "interaction.respond";
    }>
  | Readonly<{
      challengeId: AgentOsInteractiveIdentifier;
      decision: AgentOsInteractiveInteractionDecision;
      answer?: string;
    }>
  | Readonly<{
      inputTokens: number;
      outputTokens: number;
      totalTokens?: number;
      cost?: number;
    }>
  | Readonly<{
      checkpointId: AgentOsInteractiveIdentifier;
      sourceWatermark: number;
      summary?: string;
    }>
  | Readonly<{
      status: AgentOsInteractiveTurnTerminalStatus;
      resultDigest?: string;
      reason?: string;
    }>;

export type AgentOsInteractiveV1EventPayload = AgentOsInteractiveEventPayload;

export type AgentOsInteractiveEvent = Readonly<AgentOsInteractiveEventBase>;
export type AgentOsInteractiveV1Event = AgentOsInteractiveEvent;

export type AgentOsInteractiveTranscriptOperation =
  | "transcript.read"
  | "transcript.subscribe";

export interface AgentOsInteractiveTranscriptResponse {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly operation: AgentOsInteractiveTranscriptOperation;
  readonly requestId: AgentOsInteractiveIdentifier;
  readonly disposition: "events" | "snapshot-required";
  readonly snapshot: Readonly<AgentOsInteractiveSnapshot>;
  readonly events: readonly Readonly<AgentOsInteractiveEvent>[];
  readonly cursor: Readonly<AgentOsInteractiveCursor>;
  readonly replayed: boolean;
}

export type AgentOsInteractiveV1TranscriptResponse =
  AgentOsInteractiveTranscriptResponse;

export interface AgentOsInteractiveSessionSummary {
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly title: string;
  readonly updatedAt: string;
  readonly state: AgentOsInteractiveRunState;
}

export interface AgentOsInteractiveSessionCatalogResponse {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly operation: "session.catalog.read";
  readonly requestId: AgentOsInteractiveIdentifier;
  readonly sessions: readonly Readonly<AgentOsInteractiveSessionSummary>[];
}

export interface AgentOsInteractiveProviderDescriptor {
  readonly providerId: AgentOsInteractiveIdentifier;
  readonly displayName: string;
  readonly models: readonly Readonly<AgentOsInteractiveModelDescriptor>[];
}

export interface AgentOsInteractiveModelDescriptor {
  readonly modelId: AgentOsInteractiveIdentifier;
  readonly apiFamilies: readonly AgentOsInteractiveProviderApiFamily[];
}

export interface AgentOsInteractiveProviderCatalogResponse {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly operation: "provider.catalog.read";
  readonly requestId: AgentOsInteractiveIdentifier;
  readonly providers: readonly Readonly<AgentOsInteractiveProviderDescriptor>[];
}

export interface AgentOsInteractiveQueueItem {
  readonly itemId: AgentOsInteractiveIdentifier;
  readonly kind: "steer" | "follow_up";
  readonly status:
    | "queued"
    | "claimed"
    | "context_applied"
    | "applied"
    | "cancelled"
    | "recovery_required";
  readonly instructionDigest: string;
  readonly revision: number;
}

export interface AgentOsInteractiveQueueResponse {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly operation: "prompt.queue.read";
  readonly requestId: AgentOsInteractiveIdentifier;
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly runId: AgentOsInteractiveIdentifier;
  readonly queueRevision: number;
  readonly items: readonly Readonly<AgentOsInteractiveQueueItem>[];
}

export interface AgentOsInteractiveAckResponse {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly operation: Exclude<
    AgentOsInteractiveOperation,
    | "transcript.read"
    | "transcript.subscribe"
    | "session.catalog.read"
    | "provider.catalog.read"
    | "prompt.queue.read"
  >;
  readonly requestId: AgentOsInteractiveIdentifier;
  readonly status: "accepted" | "completed" | "rejected";
  readonly replayed: boolean;
  readonly sessionId?: AgentOsInteractiveIdentifier;
  readonly runId?: AgentOsInteractiveIdentifier;
  readonly turnId?: AgentOsInteractiveIdentifier;
  readonly reason?: string;
}

export type AgentOsInteractiveResponse =
  | Readonly<AgentOsInteractiveTranscriptResponse>
  | Readonly<AgentOsInteractiveSessionCatalogResponse>
  | Readonly<AgentOsInteractiveProviderCatalogResponse>
  | Readonly<AgentOsInteractiveQueueResponse>
  | Readonly<AgentOsInteractiveAckResponse>;

export type AgentOsInteractiveV1Response = AgentOsInteractiveResponse;

export interface AgentOsInteractiveTranscriptPage {
  readonly schemaVersion: AgentOsInteractiveV1SchemaVersion;
  readonly sessionId: AgentOsInteractiveIdentifier;
  readonly response: Readonly<AgentOsInteractiveTranscriptResponse>;
}
