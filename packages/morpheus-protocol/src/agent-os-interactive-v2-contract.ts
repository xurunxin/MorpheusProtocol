import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import {
  AGENT_OS_INTERACTIVE_V2_EVENT_TYPES,
  AGENT_OS_INTERACTIVE_V2_OPERATIONS,
  AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
  type AgentOsInteractiveV2AckResponse,
  type AgentOsInteractiveV2AgentCatalogResponse,
  type AgentOsInteractiveV2AgentDefinition,
  type AgentOsInteractiveV2AgentDefinitionResponse,
  type AgentOsInteractiveV2AgentDescriptor,
  type AgentOsInteractiveV2AgentDescriptorInput,
  type AgentOsInteractiveV2Availability,
  type AgentOsInteractiveV2ChangeStatus,
  type AgentOsInteractiveV2ConfigState,
  type AgentOsInteractiveV2ConfigStatus,
  type AgentOsInteractiveV2ConfigStatusResponse,
  type AgentOsInteractiveV2ContextBinding,
  type AgentOsInteractiveV2ContextBindingInput,
  type AgentOsInteractiveV2ContextBindingResponse,
  type AgentOsInteractiveV2Cursor,
  type AgentOsInteractiveV2CursorInput,
  type AgentOsInteractiveV2Event,
  type AgentOsInteractiveV2EventInput,
  type AgentOsInteractiveV2EventPayload,
  type AgentOsInteractiveV2EventType,
  type AgentOsInteractiveV2ExecutionDescriptor,
  type AgentOsInteractiveV2ExecutionDescriptorInput,
  type AgentOsInteractiveV2ExecutionTarget,
  type AgentOsInteractiveV2InteractionDecision,
  type AgentOsInteractiveV2ModelDescriptor,
  type AgentOsInteractiveV2Operation,
  type AgentOsInteractiveV2ProviderApiFamily,
  type AgentOsInteractiveV2ProviderBindingSummary,
  type AgentOsInteractiveV2ProviderCatalogResponse,
  type AgentOsInteractiveV2ProviderDescriptor,
  type AgentOsInteractiveV2PublicJsonValue,
  type AgentOsInteractiveV2QueueItem,
  type AgentOsInteractiveV2QueueResponse,
  type AgentOsInteractiveV2Request,
  type AgentOsInteractiveV2Response,
  type AgentOsInteractiveV2RunState,
  type AgentOsInteractiveV2SessionCatalogResponse,
  type AgentOsInteractiveV2SessionSummary,
  type AgentOsInteractiveV2Snapshot,
  type AgentOsInteractiveV2SnapshotInput,
  type AgentOsInteractiveV2TranscriptPage,
  type AgentOsInteractiveV2TranscriptResponse,
  type AgentOsInteractiveV2TrustStatus,
  type AgentOsInteractiveV2WorkspaceChange,
  type AgentOsInteractiveV2WorkspaceChangeSetInput,
  type AgentOsInteractiveV2WorkspaceChangeResponse,
  type AgentOsInteractiveV2WorkspaceChangeSet,
  type AgentOsInteractiveV2WorkspaceDescriptor,
  type AgentOsInteractiveV2WorkspaceDescriptorInput,
} from "./agent-os-interactive-v2-types.js";

export * from "./agent-os-interactive-v2-types.js";

export const AGENT_OS_INTERACTIVE_V2_LIMITS = Object.freeze({
  maxFrameBytes: 1_048_576,
  maxJsonDepth: 32,
  maxJsonNodes: 20_000,
  maxArrayItems: 10_000,
  maxObjectProperties: 1_024,
  maxStringUtf8Bytes: 1_048_576,
  maxIdentifierBytes: 128,
  maxMessageBytes: 65_536,
  maxEvents: 256,
  maxQueueItems: 64,
  maxSessions: 256,
  maxProviders: 128,
  maxModels: 256,
  maxAgents: 256,
  maxWorkspaces: 256,
  maxExecutions: 16,
  maxTools: 256,
  maxSkills: 256,
  maxDiagnostics: 128,
  maxChanges: 10_000,
} as const);

export type AgentOsInteractiveV2ContractErrorCode =
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "UNKNOWN_FIELD"
  | "INVALID_SCHEMA"
  | "UNKNOWN_OPERATION"
  | "UNKNOWN_EVENT"
  | "CORRELATION_MISMATCH"
  | "SEQUENCE_GAP"
  | "DIGEST_MISMATCH"
  | "JSON_BUDGET";

export class AgentOsInteractiveV2ContractError extends Error {
  constructor(
    readonly code: AgentOsInteractiveV2ContractErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AgentOsInteractiveV2ContractError";
  }
}

const OPERATION_SET = new Set<string>(AGENT_OS_INTERACTIVE_V2_OPERATIONS);
const EVENT_SET = new Set<string>(AGENT_OS_INTERACTIVE_V2_EVENT_TYPES);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const STREAM_EPOCH_PATTERN = /^stream-epoch:[A-Za-z0-9._:/-]{1,127}$/u;
const RFC3339_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/u;

export type AgentOsInteractiveV2CursorInputAlias =
  AgentOsInteractiveV2CursorInput;
export type AgentOsInteractiveV2SnapshotInputAlias =
  AgentOsInteractiveV2SnapshotInput;
export type AgentOsInteractiveV2EventInputAlias =
  AgentOsInteractiveV2EventInput;

export function parseAgentOsInteractiveV2Request(
  input: unknown,
): Readonly<AgentOsInteractiveV2Request> {
  const value = record(input, "interactive v2 request");
  const operation = operationValue(value.operation);
  const base = ["schemaVersion", "operation", "requestId"];
  const common = {
    schemaVersion: schema(value.schemaVersion),
    operation,
    requestId: identifier(value.requestId, "requestId"),
  };
  switch (operation) {
    case "session.catalog.read":
    case "provider.catalog.read":
    case "agent.catalog.read":
    case "workspace.catalog.read":
    case "execution.catalog.read":
    case "config.status.read":
      exact(value, base, operation);
      return freeze(common) as AgentOsInteractiveV2Request;
    case "session.create":
      exactOptional(
        value,
        base,
        [
          "title",
          "parentSessionId",
          "agentId",
          "workspaceId",
          "executionTarget",
          "providerId",
          "modelId",
          "apiFamily",
        ],
        operation,
      );
      return freeze({
        ...common,
        ...optionalText(value, "title", 256),
        ...optionalIdentifier(value, "parentSessionId"),
        ...optionalIdentifier(value, "agentId"),
        ...optionalIdentifier(value, "workspaceId"),
        ...optionalExecutionTarget(value, "executionTarget"),
        ...optionalIdentifier(value, "providerId"),
        ...optionalIdentifier(value, "modelId"),
        ...optionalApiFamily(value, "apiFamily"),
      }) as AgentOsInteractiveV2Request;
    case "session.fork":
      exactOptional(value, [...base, "sessionId"], ["title"], operation);
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        ...optionalText(value, "title", 256),
      }) as AgentOsInteractiveV2Request;
    case "session.rename":
      exact(value, [...base, "sessionId", "title"], operation);
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        title: text(value.title, "title", 256),
      }) as AgentOsInteractiveV2Request;
    case "turn.start":
      exact(
        value,
        [...base, "sessionId", "turnId", "message", "bindingRevision"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        turnId: identifier(value.turnId, "turnId"),
        message: text(
          value.message,
          "message",
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
        ),
        bindingRevision: revision(value.bindingRevision, "bindingRevision"),
      }) as AgentOsInteractiveV2Request;
    case "turn.cancel":
      exact(
        value,
        [...base, "sessionId", "runId", "turnId", "reason"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        reason: text(value.reason, "reason", 512),
      }) as AgentOsInteractiveV2Request;
    case "turn.retry":
      exact(
        value,
        [...base, "sessionId", "runId", "turnId", "bindingRevision"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        bindingRevision: revision(value.bindingRevision, "bindingRevision"),
      }) as AgentOsInteractiveV2Request;
    case "transcript.read":
    case "transcript.subscribe":
      exact(value, [...base, "sessionId", "cursor", "limit"], operation);
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        cursor:
          value.cursor === null
            ? null
            : parseAgentOsInteractiveV2Cursor(value.cursor),
        limit: boundedInteger(
          value.limit,
          "limit",
          1,
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxEvents,
        ),
      }) as AgentOsInteractiveV2Request;
    case "provider.binding.create":
      exact(
        value,
        [
          ...base,
          "sessionId",
          "providerId",
          "modelId",
          "apiFamily",
          "expectedRevision",
        ],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        providerId: identifier(value.providerId, "providerId"),
        modelId: identifier(value.modelId, "modelId"),
        apiFamily: apiFamily(value.apiFamily),
        expectedRevision: revision(value.expectedRevision, "expectedRevision"),
      }) as AgentOsInteractiveV2Request;
    case "prompt.queue.read":
      exact(value, [...base, "sessionId", "runId"], operation);
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
      }) as AgentOsInteractiveV2Request;
    case "prompt.queue.clear":
      exact(
        value,
        [...base, "sessionId", "runId", "expectedRevision"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        expectedRevision: revision(value.expectedRevision, "expectedRevision"),
      }) as AgentOsInteractiveV2Request;
    case "session.compact":
      exact(value, [...base, "sessionId", "sourceRunId"], operation);
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        sourceRunId: identifier(value.sourceRunId, "sourceRunId"),
      }) as AgentOsInteractiveV2Request;
    case "prompt.steer":
    case "prompt.follow-up":
      exact(
        value,
        [...base, "sessionId", "runId", "turnId", "instruction"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        instruction: text(
          value.instruction,
          "instruction",
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
        ),
      }) as AgentOsInteractiveV2Request;
    case "interaction.respond": {
      exactOptional(
        value,
        [...base, "sessionId", "challengeId", "decision"],
        ["answer"],
        operation,
      );
      const decision = interactionDecision(value.decision);
      if (decision === "answer" && value.answer === undefined)
        fail("INVALID_VALUE", "answer is required for answer decision");
      if (decision !== "answer" && value.answer !== undefined)
        fail("INVALID_VALUE", "answer is only valid for answer decision");
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        challengeId: identifier(value.challengeId, "challengeId"),
        decision,
        ...optionalText(
          value,
          "answer",
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
        ),
      }) as AgentOsInteractiveV2Request;
    }
    case "agent.definition.read":
      exact(value, [...base, "agentId"], operation);
      return freeze({
        ...common,
        agentId: identifier(value.agentId, "agentId"),
      }) as AgentOsInteractiveV2Request;
    case "context.binding.create":
      exactOptional(
        value,
        [
          ...base,
          "sessionId",
          "agentId",
          "workspaceId",
          "executionTarget",
          "providerId",
          "modelId",
          "apiFamily",
          "expectedBindingRevision",
        ],
        ["expectedConfigRevision"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        agentId: identifier(value.agentId, "agentId"),
        workspaceId: identifier(value.workspaceId, "workspaceId"),
        executionTarget: executionTarget(value.executionTarget),
        providerId: identifier(value.providerId, "providerId"),
        modelId: identifier(value.modelId, "modelId"),
        apiFamily: apiFamily(value.apiFamily),
        expectedBindingRevision: revision(
          value.expectedBindingRevision,
          "expectedBindingRevision",
        ),
        ...optionalRevision(value, "expectedConfigRevision"),
      }) as AgentOsInteractiveV2Request;
    case "config.reconcile":
      exactOptional(value, base, ["expectedRevision"], operation);
      return freeze({
        ...common,
        ...optionalRevision(value, "expectedRevision"),
      }) as AgentOsInteractiveV2Request;
    case "workspace.change.preview":
      exact(
        value,
        [...base, "sessionId", "workspaceId", "baselineDigest"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        workspaceId: identifier(value.workspaceId, "workspaceId"),
        baselineDigest: digest(value.baselineDigest, "baselineDigest"),
      }) as AgentOsInteractiveV2Request;
    case "workspace.change.apply":
      exactOptional(
        value,
        [
          ...base,
          "sessionId",
          "workspaceId",
          "baselineDigest",
          "changeDigest",
          "expectedWorkspaceRevision",
        ],
        ["challengeId"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        workspaceId: identifier(value.workspaceId, "workspaceId"),
        baselineDigest: digest(value.baselineDigest, "baselineDigest"),
        changeDigest: digest(value.changeDigest, "changeDigest"),
        expectedWorkspaceRevision: revision(
          value.expectedWorkspaceRevision,
          "expectedWorkspaceRevision",
        ),
        ...optionalIdentifier(value, "challengeId"),
      }) as AgentOsInteractiveV2Request;
    default:
      return exhaustive(operation);
  }
}

export const parseAgentOsInteractiveV2RequestEnvelope =
  parseAgentOsInteractiveV2Request;

export function createAgentOsInteractiveV2Cursor(
  input: AgentOsInteractiveV2CursorInput,
): Readonly<AgentOsInteractiveV2Cursor> {
  const value = record(input, "interactive v2 cursor constructor");
  if ("digest" in value)
    fail("INVALID_SHAPE", "cursor constructor must not include digest");
  const unsigned = parseCursorUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function parseAgentOsInteractiveV2Cursor(
  input: unknown,
): Readonly<AgentOsInteractiveV2Cursor> {
  const value = record(input, "interactive v2 cursor");
  exact(
    value,
    [
      "schemaVersion",
      "sessionId",
      "streamEpoch",
      "sequence",
      "watermark",
      "digest",
    ],
    "interactive v2 cursor",
  );
  const unsigned = parseCursorUnsigned(value);
  verifyDigest(value.digest, unsigned, "interactive v2 cursor");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

export function createAgentOsInteractiveV2ContextBinding(
  input: AgentOsInteractiveV2ContextBindingInput,
): Readonly<AgentOsInteractiveV2ContextBinding> {
  const value = record(input, "interactive v2 context binding constructor");
  if ("digest" in value)
    fail("INVALID_SHAPE", "binding constructor must not include digest");
  const unsigned = parseBindingUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function parseAgentOsInteractiveV2ContextBinding(
  input: unknown,
): Readonly<AgentOsInteractiveV2ContextBinding> {
  const value = record(input, "interactive v2 context binding");
  exactOptional(
    value,
    [
      "bindingId",
      "revision",
      "agentId",
      "agentRevision",
      "configRevision",
      "promptDigest",
      "toolsDigest",
      "skillsDigest",
      "workspaceId",
      "executionTarget",
      "provider",
      "policyDigest",
      "capabilityDigest",
      "createdAt",
      "digest",
    ],
    ["profileId", "executorArtifactDigest"],
    "interactive v2 context binding",
  );
  const unsigned = parseBindingUnsigned(value);
  verifyDigest(value.digest, unsigned, "interactive v2 context binding");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

export function createAgentOsInteractiveV2AgentDescriptor(
  input: AgentOsInteractiveV2AgentDescriptorInput,
): Readonly<AgentOsInteractiveV2AgentDescriptor> {
  const value = record(input, "interactive v2 agent descriptor constructor");
  if ("digest" in value)
    fail("INVALID_SHAPE", "descriptor constructor must not include digest");
  const unsigned = parseAgentDescriptorUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function createAgentOsInteractiveV2WorkspaceDescriptor(
  input: AgentOsInteractiveV2WorkspaceDescriptorInput,
): Readonly<AgentOsInteractiveV2WorkspaceDescriptor> {
  const value = record(
    input,
    "interactive v2 workspace descriptor constructor",
  );
  if ("digest" in value)
    fail("INVALID_SHAPE", "descriptor constructor must not include digest");
  const unsigned = parseWorkspaceDescriptorUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function createAgentOsInteractiveV2ExecutionDescriptor(
  input: AgentOsInteractiveV2ExecutionDescriptorInput,
): Readonly<AgentOsInteractiveV2ExecutionDescriptor> {
  const value = record(
    input,
    "interactive v2 execution descriptor constructor",
  );
  if ("digest" in value)
    fail("INVALID_SHAPE", "descriptor constructor must not include digest");
  const unsigned = parseExecutionDescriptorUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function createAgentOsInteractiveV2WorkspaceChangeSet(
  input: AgentOsInteractiveV2WorkspaceChangeSetInput,
): Readonly<AgentOsInteractiveV2WorkspaceChangeSet> {
  const value = record(
    input,
    "interactive v2 workspace change set constructor",
  );
  if ("digest" in value)
    fail("INVALID_SHAPE", "change set constructor must not include digest");
  const unsigned = parseChangeSetUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function createAgentOsInteractiveV2Snapshot(
  input: AgentOsInteractiveV2SnapshotInput,
): Readonly<AgentOsInteractiveV2Snapshot> {
  const value = record(input, "interactive v2 snapshot constructor");
  if ("digest" in value)
    fail("INVALID_SHAPE", "snapshot constructor must not include digest");
  const unsigned = parseSnapshotUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function parseAgentOsInteractiveV2Snapshot(
  input: unknown,
): Readonly<AgentOsInteractiveV2Snapshot> {
  const value = record(input, "interactive v2 snapshot");
  exactOptional(
    value,
    [
      "schemaVersion",
      "sessionId",
      "runId",
      "turnId",
      "attemptId",
      "effectId",
      "binding",
      "bindingRevision",
      "streamEpoch",
      "watermark",
      "state",
      "terminal",
      "updatedAt",
      "digest",
    ],
    ["sessionTitle", "parentSessionId", "providerId", "modelId", "apiFamily"],
    "interactive v2 snapshot",
  );
  const unsigned = parseSnapshotUnsigned(value);
  verifyDigest(value.digest, unsigned, "interactive v2 snapshot");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

export function createAgentOsInteractiveV2Event(
  input: AgentOsInteractiveV2EventInput,
): Readonly<AgentOsInteractiveV2Event> {
  const value = record(input, "interactive v2 event constructor");
  if ("digest" in value)
    fail("INVALID_SHAPE", "event constructor must not include digest");
  const unsigned = parseEventUnsigned(value, true);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function parseAgentOsInteractiveV2Event(
  input: unknown,
): Readonly<AgentOsInteractiveV2Event> {
  const value = record(input, "interactive v2 event");
  exact(
    value,
    [
      "schemaVersion",
      "eventId",
      "sessionId",
      "runId",
      "turnId",
      "attemptId",
      "effectId",
      "bindingRevision",
      "streamEpoch",
      "sequence",
      "cursor",
      "eventType",
      "payload",
      "createdAt",
      "digest",
    ],
    "interactive v2 event",
  );
  const unsigned = parseEventUnsigned(value, false);
  verifyDigest(value.digest, unsigned, "interactive v2 event");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

export function parseAgentOsInteractiveV2TranscriptResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2TranscriptResponse> {
  const value = record(input, "interactive v2 transcript response");
  exact(
    value,
    [
      "schemaVersion",
      "operation",
      "requestId",
      "disposition",
      "snapshot",
      "events",
      "cursor",
      "replayed",
    ],
    "interactive v2 transcript response",
  );
  if (
    value.operation !== "transcript.read" &&
    value.operation !== "transcript.subscribe"
  )
    fail("INVALID_VALUE", "transcript operation is invalid");
  const operation = value.operation;
  const snapshot = parseAgentOsInteractiveV2Snapshot(value.snapshot);
  const eventsInput = array(
    value.events,
    "events",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxEvents,
  );
  const events = eventsInput.map((event) =>
    parseAgentOsInteractiveV2Event(event),
  );
  if (new Set(events.map((event) => event.eventId)).size !== events.length)
    fail(
      "CORRELATION_MISMATCH",
      "transcript events contain duplicate event ids",
    );
  const cursor = parseAgentOsInteractiveV2Cursor(value.cursor);
  let previousSequence = 0;
  for (const event of events) {
    if (
      event.sessionId !== snapshot.sessionId ||
      event.streamEpoch !== snapshot.streamEpoch ||
      event.cursor.sessionId !== snapshot.sessionId ||
      event.cursor.streamEpoch !== snapshot.streamEpoch ||
      event.cursor.sequence !== event.sequence ||
      event.cursor.watermark > snapshot.watermark ||
      event.bindingRevision !== snapshot.bindingRevision ||
      event.sequence <= previousSequence
    )
      fail("CORRELATION_MISMATCH", "transcript event identity is inconsistent");
    if (previousSequence !== 0 && event.sequence !== previousSequence + 1)
      fail("SEQUENCE_GAP", "transcript events are not contiguous");
    previousSequence = event.sequence;
  }
  if (
    cursor.sessionId !== snapshot.sessionId ||
    cursor.streamEpoch !== snapshot.streamEpoch
  )
    fail("CORRELATION_MISMATCH", "transcript cursor identity is inconsistent");
  if (
    value.disposition !== "events" &&
    value.disposition !== "snapshot-required"
  )
    fail("INVALID_VALUE", "transcript disposition is invalid");
  if (
    value.disposition === "snapshot-required" &&
    cursor.sequence !== snapshot.watermark
  )
    fail(
      "SEQUENCE_GAP",
      "snapshot-required cursor must equal snapshot watermark",
    );
  if (
    cursor.sequence > snapshot.watermark ||
    cursor.watermark !== snapshot.watermark ||
    cursor.sequence < previousSequence
  )
    fail(
      "CORRELATION_MISMATCH",
      "transcript cursor is outside snapshot watermark",
    );
  if (events.length > 0 && cursor.sequence !== events.at(-1)!.sequence)
    fail(
      "CORRELATION_MISMATCH",
      "transcript cursor does not end at the last event",
    );
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation,
    requestId: identifier(value.requestId, "requestId"),
    disposition: value.disposition,
    snapshot,
    events: freeze(events),
    cursor,
    replayed: boolean(value.replayed, "replayed"),
  });
}

export function parseAgentOsInteractiveV2SessionCatalogResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2SessionCatalogResponse> {
  const value = record(input, "interactive v2 session catalog response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "sessions"],
    "interactive v2 session catalog response",
  );
  if (value.operation !== "session.catalog.read")
    fail("INVALID_VALUE", "session catalog operation is invalid");
  const sessions = array(
    value.sessions,
    "sessions",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxSessions,
  ).map(parseSessionSummary);
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "session.catalog.read",
    requestId: identifier(value.requestId, "requestId"),
    sessions: freeze(sessions),
  });
}

export function parseAgentOsInteractiveV2ProviderCatalogResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2ProviderCatalogResponse> {
  const value = record(input, "interactive v2 provider catalog response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "providers"],
    "interactive v2 provider catalog response",
  );
  if (value.operation !== "provider.catalog.read")
    fail("INVALID_VALUE", "provider catalog operation is invalid");
  const providers = array(
    value.providers,
    "providers",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxProviders,
  ).map(parseProviderDescriptor);
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "provider.catalog.read",
    requestId: identifier(value.requestId, "requestId"),
    providers: freeze(providers),
  });
}

export function parseAgentOsInteractiveV2QueueResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2QueueResponse> {
  const value = record(input, "interactive v2 queue response");
  exact(
    value,
    [
      "schemaVersion",
      "operation",
      "requestId",
      "sessionId",
      "runId",
      "queueRevision",
      "items",
    ],
    "interactive v2 queue response",
  );
  if (value.operation !== "prompt.queue.read")
    fail("INVALID_VALUE", "queue operation is invalid");
  const items = array(
    value.items,
    "items",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxQueueItems,
  ).map(parseQueueItem);
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "prompt.queue.read",
    requestId: identifier(value.requestId, "requestId"),
    sessionId: identifier(value.sessionId, "sessionId"),
    runId: identifier(value.runId, "runId"),
    queueRevision: revision(value.queueRevision, "queueRevision"),
    items: freeze(items),
  });
}

export function parseAgentOsInteractiveV2AgentCatalogResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2AgentCatalogResponse> {
  const value = record(input, "interactive v2 agent catalog response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "config", "agents"],
    "interactive v2 agent catalog response",
  );
  if (value.operation !== "agent.catalog.read")
    fail("INVALID_VALUE", "agent catalog operation is invalid");
  const agents = array(
    value.agents,
    "agents",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxAgents,
  ).map(parseAgentDescriptor);
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "agent.catalog.read",
    requestId: identifier(value.requestId, "requestId"),
    config: parseConfigStatus(value.config),
    agents: freeze(agents),
  });
}

export function parseAgentOsInteractiveV2AgentDefinitionResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2AgentDefinitionResponse> {
  const value = record(input, "interactive v2 agent definition response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "definition"],
    "interactive v2 agent definition response",
  );
  if (value.operation !== "agent.definition.read")
    fail("INVALID_VALUE", "agent definition operation is invalid");
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "agent.definition.read",
    requestId: identifier(value.requestId, "requestId"),
    definition: parseAgentDefinition(value.definition),
  });
}

export function parseAgentOsInteractiveV2WorkspaceCatalogResponse(
  input: unknown,
): Readonly<
  import("./agent-os-interactive-v2-types.js").AgentOsInteractiveV2WorkspaceCatalogResponse
> {
  const value = record(input, "interactive v2 workspace catalog response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "workspaces"],
    "interactive v2 workspace catalog response",
  );
  if (value.operation !== "workspace.catalog.read")
    fail("INVALID_VALUE", "workspace catalog operation is invalid");
  const workspaces = array(
    value.workspaces,
    "workspaces",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxWorkspaces,
  ).map(parseWorkspaceDescriptor);
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "workspace.catalog.read",
    requestId: identifier(value.requestId, "requestId"),
    workspaces: freeze(workspaces),
  });
}

export function parseAgentOsInteractiveV2ExecutionCatalogResponse(
  input: unknown,
): Readonly<
  import("./agent-os-interactive-v2-types.js").AgentOsInteractiveV2ExecutionCatalogResponse
> {
  const value = record(input, "interactive v2 execution catalog response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "executions"],
    "interactive v2 execution catalog response",
  );
  if (value.operation !== "execution.catalog.read")
    fail("INVALID_VALUE", "execution catalog operation is invalid");
  const executions = array(
    value.executions,
    "executions",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxExecutions,
  ).map(parseExecutionDescriptor);
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "execution.catalog.read",
    requestId: identifier(value.requestId, "requestId"),
    executions: freeze(executions),
  });
}

export function parseAgentOsInteractiveV2ContextBindingResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2ContextBindingResponse> {
  const value = record(input, "interactive v2 binding response");
  exactOptional(
    value,
    [
      "schemaVersion",
      "operation",
      "requestId",
      "sessionId",
      "binding",
      "replayed",
    ],
    ["parentSessionId"],
    "interactive v2 binding response",
  );
  if (value.operation !== "context.binding.create")
    fail("INVALID_VALUE", "binding operation is invalid");
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "context.binding.create",
    requestId: identifier(value.requestId, "requestId"),
    sessionId: identifier(value.sessionId, "sessionId"),
    ...optionalIdentifier(value, "parentSessionId"),
    binding: parseAgentOsInteractiveV2ContextBinding(value.binding),
    replayed: boolean(value.replayed, "replayed"),
  });
}

export function parseAgentOsInteractiveV2ConfigStatusResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2ConfigStatusResponse> {
  const value = record(input, "interactive v2 config response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "config", "replayed"],
    "interactive v2 config response",
  );
  if (
    value.operation !== "config.status.read" &&
    value.operation !== "config.reconcile"
  )
    fail("INVALID_VALUE", "config operation is invalid");
  const operation = value.operation;
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation,
    requestId: identifier(value.requestId, "requestId"),
    config: parseConfigStatus(value.config),
    replayed: boolean(value.replayed, "replayed"),
  });
}

export function parseAgentOsInteractiveV2WorkspaceChangeResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2WorkspaceChangeResponse> {
  const value = record(input, "interactive v2 workspace change response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "changeSet", "replayed"],
    "interactive v2 workspace change response",
  );
  if (
    value.operation !== "workspace.change.preview" &&
    value.operation !== "workspace.change.apply"
  )
    fail("INVALID_VALUE", "workspace change operation is invalid");
  const operation = value.operation;
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation,
    requestId: identifier(value.requestId, "requestId"),
    changeSet: parseChangeSet(value.changeSet),
    replayed: boolean(value.replayed, "replayed"),
  });
}

const SPECIAL_RESPONSE_OPERATIONS = new Set<string>([
  "transcript.read",
  "transcript.subscribe",
  "session.catalog.read",
  "provider.catalog.read",
  "prompt.queue.read",
  "agent.catalog.read",
  "agent.definition.read",
  "workspace.catalog.read",
  "execution.catalog.read",
  "context.binding.create",
  "config.status.read",
  "config.reconcile",
  "workspace.change.preview",
  "workspace.change.apply",
]);

export function parseAgentOsInteractiveV2AckResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2AckResponse> {
  const value = record(input, "interactive v2 ack response");
  exactOptional(
    value,
    ["schemaVersion", "operation", "requestId", "status", "replayed"],
    ["sessionId", "runId", "turnId", "reason"],
    "interactive v2 ack response",
  );
  const operation = operationValue(value.operation);
  if (SPECIAL_RESPONSE_OPERATIONS.has(operation))
    fail("INVALID_VALUE", "ack response requires a specialized response");
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: operation as AgentOsInteractiveV2AckResponse["operation"],
    requestId: identifier(value.requestId, "requestId"),
    status: ackStatus(value.status),
    replayed: boolean(value.replayed, "replayed"),
    ...optionalIdentifier(value, "sessionId"),
    ...optionalIdentifier(value, "runId"),
    ...optionalIdentifier(value, "turnId"),
    ...optionalText(value, "reason", 512),
  });
}

export function parseAgentOsInteractiveV2Response(
  input: unknown,
): Readonly<AgentOsInteractiveV2Response> {
  const value = record(input, "interactive v2 response");
  const operation = value.operation;
  if (operation === "transcript.read" || operation === "transcript.subscribe")
    return parseAgentOsInteractiveV2TranscriptResponse(input);
  if (operation === "session.catalog.read")
    return parseAgentOsInteractiveV2SessionCatalogResponse(input);
  if (operation === "provider.catalog.read")
    return parseAgentOsInteractiveV2ProviderCatalogResponse(input);
  if (operation === "prompt.queue.read")
    return parseAgentOsInteractiveV2QueueResponse(input);
  if (operation === "agent.catalog.read")
    return parseAgentOsInteractiveV2AgentCatalogResponse(input);
  if (operation === "agent.definition.read")
    return parseAgentOsInteractiveV2AgentDefinitionResponse(input);
  if (operation === "workspace.catalog.read")
    return parseAgentOsInteractiveV2WorkspaceCatalogResponse(input);
  if (operation === "execution.catalog.read")
    return parseAgentOsInteractiveV2ExecutionCatalogResponse(input);
  if (operation === "context.binding.create")
    return parseAgentOsInteractiveV2ContextBindingResponse(input);
  if (operation === "config.status.read" || operation === "config.reconcile")
    return parseAgentOsInteractiveV2ConfigStatusResponse(input);
  if (
    operation === "workspace.change.preview" ||
    operation === "workspace.change.apply"
  )
    return parseAgentOsInteractiveV2WorkspaceChangeResponse(input);
  return parseAgentOsInteractiveV2AckResponse(input);
}

export function parseAgentOsInteractiveV2TranscriptPage(
  input: unknown,
): Readonly<AgentOsInteractiveV2TranscriptPage> {
  const value = record(input, "interactive v2 transcript page");
  exact(
    value,
    ["schemaVersion", "sessionId", "response"],
    "interactive v2 transcript page",
  );
  const response = parseAgentOsInteractiveV2TranscriptResponse(value.response);
  const sessionId = identifier(value.sessionId, "sessionId");
  if (response.snapshot.sessionId !== sessionId)
    fail(
      "CORRELATION_MISMATCH",
      "transcript page session does not match response",
    );
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    sessionId,
    response,
  });
}

export function canonicalAgentOsInteractiveV2Source(input: unknown): string {
  return canonicalJson(parseCanonicalInput(input));
}

export function serializeAgentOsInteractiveV2Request(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveV2Request(input))}\n`;
}
export function serializeAgentOsInteractiveV2Event(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveV2Event(input))}\n`;
}
export function serializeAgentOsInteractiveV2Response(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveV2Response(input))}\n`;
}
export function serializeAgentOsInteractiveV2(input: unknown): string {
  return `${canonicalAgentOsInteractiveV2Source(input)}\n`;
}
export function decodeAgentOsInteractiveV2(
  source: string,
): Readonly<
  | AgentOsInteractiveV2Request
  | AgentOsInteractiveV2Response
  | AgentOsInteractiveV2Event
> {
  if (typeof source !== "string")
    fail("INVALID_VALUE", "encoded source must be a string");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    fail("INVALID_VALUE", "encoded source is not valid JSON");
  }
  return parseCanonicalInput(value) as
    | AgentOsInteractiveV2Request
    | AgentOsInteractiveV2Response
    | AgentOsInteractiveV2Event;
}
export const parseAgentOsInteractiveV2 = decodeAgentOsInteractiveV2;

export function createAgentOsInteractiveV2RequestDigest(
  input: unknown,
): string {
  return `sha256:${sha256Hex(serializeAgentOsInteractiveV2Request(input).trim())}`;
}

function parseCanonicalInput(input: unknown): unknown {
  const value = record(input, "interactive v2 source");
  if (value.eventType !== undefined)
    return parseAgentOsInteractiveV2Event(value);
  if (value.operation !== undefined && typeof value.operation === "string") {
    if (
      value.status !== undefined &&
      !SPECIAL_RESPONSE_OPERATIONS.has(value.operation)
    )
      return parseAgentOsInteractiveV2AckResponse(value);
    if (
      value.operation === "transcript.read" ||
      value.operation === "transcript.subscribe"
    )
      return parseAgentOsInteractiveV2TranscriptResponse(value);
    if (value.operation === "session.catalog.read")
      return value.sessions !== undefined
        ? parseAgentOsInteractiveV2SessionCatalogResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (value.operation === "provider.catalog.read")
      return value.providers !== undefined
        ? parseAgentOsInteractiveV2ProviderCatalogResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (value.operation === "prompt.queue.read")
      return value.items !== undefined
        ? parseAgentOsInteractiveV2QueueResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (value.operation === "agent.catalog.read")
      return value.agents !== undefined
        ? parseAgentOsInteractiveV2AgentCatalogResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (value.operation === "agent.definition.read")
      return value.definition !== undefined
        ? parseAgentOsInteractiveV2AgentDefinitionResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (value.operation === "workspace.catalog.read")
      return value.workspaces !== undefined
        ? parseAgentOsInteractiveV2WorkspaceCatalogResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (value.operation === "execution.catalog.read")
      return value.executions !== undefined
        ? parseAgentOsInteractiveV2ExecutionCatalogResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (value.operation === "context.binding.create")
      return value.binding !== undefined
        ? parseAgentOsInteractiveV2ContextBindingResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (
      value.operation === "config.status.read" ||
      value.operation === "config.reconcile"
    )
      return value.config !== undefined
        ? parseAgentOsInteractiveV2ConfigStatusResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    if (
      value.operation === "workspace.change.preview" ||
      value.operation === "workspace.change.apply"
    )
      return value.changeSet !== undefined
        ? parseAgentOsInteractiveV2WorkspaceChangeResponse(value)
        : parseAgentOsInteractiveV2Request(value);
    return parseAgentOsInteractiveV2Request(value);
  }
  fail("INVALID_SHAPE", "interactive v2 source kind is unknown");
}

function parseCursorUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveV2Cursor, "digest"> {
  const value = record(input, "interactive v2 cursor");
  exactOptional(
    value,
    ["schemaVersion", "sessionId", "streamEpoch", "sequence", "watermark"],
    ["digest"],
    "interactive v2 cursor",
  );
  const sequence = revision(value.sequence, "sequence");
  const watermark = revision(value.watermark, "watermark");
  if (sequence > watermark)
    fail("CORRELATION_MISMATCH", "cursor sequence exceeds watermark");
  return {
    schemaVersion: schema(value.schemaVersion),
    sessionId: identifier(value.sessionId, "sessionId"),
    streamEpoch: streamEpoch(value.streamEpoch),
    sequence,
    watermark,
  };
}

function parseBindingUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveV2ContextBinding, "digest"> {
  const value = record(input, "interactive v2 context binding");
  exactOptional(
    value,
    [
      "bindingId",
      "revision",
      "agentId",
      "agentRevision",
      "configRevision",
      "promptDigest",
      "toolsDigest",
      "skillsDigest",
      "workspaceId",
      "executionTarget",
      "provider",
      "policyDigest",
      "capabilityDigest",
      "createdAt",
    ],
    ["profileId", "executorArtifactDigest", "digest"],
    "interactive v2 context binding",
  );
  return {
    bindingId: identifier(value.bindingId, "bindingId"),
    revision: revision(value.revision, "revision"),
    agentId: identifier(value.agentId, "agentId"),
    agentRevision: revision(value.agentRevision, "agentRevision"),
    configRevision: revision(value.configRevision, "configRevision"),
    ...optionalIdentifier(value, "profileId"),
    promptDigest: digest(value.promptDigest, "promptDigest"),
    toolsDigest: digest(value.toolsDigest, "toolsDigest"),
    skillsDigest: digest(value.skillsDigest, "skillsDigest"),
    workspaceId: identifier(value.workspaceId, "workspaceId"),
    executionTarget: executionTarget(value.executionTarget),
    provider: parseProviderBindingSummary(value.provider),
    policyDigest: digest(value.policyDigest, "policyDigest"),
    capabilityDigest: digest(value.capabilityDigest, "capabilityDigest"),
    ...optionalDigest(value, "executorArtifactDigest"),
    createdAt: timestamp(value.createdAt, "createdAt"),
  };
}

function parseSnapshotUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveV2Snapshot, "digest"> {
  const value = record(input, "interactive v2 snapshot");
  exactOptional(
    value,
    [
      "schemaVersion",
      "sessionId",
      "runId",
      "turnId",
      "attemptId",
      "effectId",
      "binding",
      "bindingRevision",
      "streamEpoch",
      "watermark",
      "state",
      "terminal",
      "updatedAt",
    ],
    [
      "sessionTitle",
      "parentSessionId",
      "providerId",
      "modelId",
      "apiFamily",
      "digest",
    ],
    "interactive v2 snapshot",
  );
  const binding =
    value.binding === null
      ? null
      : parseAgentOsInteractiveV2ContextBinding(value.binding);
  return {
    schemaVersion: schema(value.schemaVersion),
    sessionId: identifier(value.sessionId, "sessionId"),
    ...optionalText(value, "sessionTitle", 256),
    ...optionalIdentifier(value, "parentSessionId"),
    ...optionalIdentifier(value, "providerId"),
    ...optionalIdentifier(value, "modelId"),
    ...optionalApiFamily(value, "apiFamily"),
    runId: nullableIdentifier(value.runId, "runId"),
    turnId: nullableIdentifier(value.turnId, "turnId"),
    attemptId: nullableIdentifier(value.attemptId, "attemptId"),
    effectId: nullableIdentifier(value.effectId, "effectId"),
    binding,
    bindingRevision: revision(value.bindingRevision, "bindingRevision"),
    streamEpoch: streamEpoch(value.streamEpoch),
    watermark: revision(value.watermark, "watermark"),
    state: runState(value.state),
    terminal: boolean(value.terminal, "terminal"),
    updatedAt: timestamp(value.updatedAt, "updatedAt"),
  };
}

function parseEventUnsigned(
  input: unknown,
  deriveCursor: boolean,
): Omit<AgentOsInteractiveV2Event, "digest"> {
  const value = record(input, "interactive v2 event");
  exactOptional(
    value,
    [
      "schemaVersion",
      "eventId",
      "sessionId",
      "runId",
      "turnId",
      "attemptId",
      "effectId",
      "bindingRevision",
      "streamEpoch",
      "sequence",
      "eventType",
      "payload",
      "createdAt",
    ],
    ["cursor", "digest"],
    "interactive v2 event",
  );
  const sequence = revision(value.sequence, "sequence");
  const cursor =
    deriveCursor && value.cursor === undefined
      ? createAgentOsInteractiveV2Cursor({
          schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
          sessionId: identifier(value.sessionId, "sessionId"),
          streamEpoch: streamEpoch(value.streamEpoch),
          sequence,
          watermark: sequence,
        })
      : value.cursor !== undefined &&
          record(value.cursor, "event cursor").digest === undefined
        ? createAgentOsInteractiveV2Cursor(
            value.cursor as AgentOsInteractiveV2CursorInput,
          )
        : parseAgentOsInteractiveV2Cursor(value.cursor);
  if (
    cursor.sequence !== sequence ||
    cursor.sessionId !== value.sessionId ||
    cursor.streamEpoch !== value.streamEpoch
  )
    fail("CORRELATION_MISMATCH", "event cursor identity is inconsistent");
  return {
    schemaVersion: schema(value.schemaVersion),
    eventId: identifier(value.eventId, "eventId"),
    sessionId: identifier(value.sessionId, "sessionId"),
    runId: nullableIdentifier(value.runId, "runId"),
    turnId: nullableIdentifier(value.turnId, "turnId"),
    attemptId: nullableIdentifier(value.attemptId, "attemptId"),
    effectId: nullableIdentifier(value.effectId, "effectId"),
    bindingRevision: revision(value.bindingRevision, "bindingRevision"),
    streamEpoch: streamEpoch(value.streamEpoch),
    sequence,
    cursor,
    eventType: eventType(value.eventType),
    payload: parseEventPayload(value.eventType, value.payload),
    createdAt: timestamp(value.createdAt, "createdAt"),
  };
}

function parseEventPayload(
  eventTypeInput: unknown,
  input: unknown,
): AgentOsInteractiveV2EventPayload {
  const eventKind = eventType(eventTypeInput);
  const value = record(input, `${eventKind} payload`);
  switch (eventKind) {
    case "user.message":
      exact(value, ["messageId", "content"], eventKind);
      return freeze({
        messageId: identifier(value.messageId, "messageId"),
        content: text(
          value.content,
          "content",
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
          true,
        ),
      });
    case "assistant.text.start":
    case "assistant.reasoning.start":
      exact(value, ["contentId"], eventKind);
      return freeze({ contentId: identifier(value.contentId, "contentId") });
    case "assistant.text.delta":
    case "assistant.reasoning.delta":
      exact(value, ["contentId", "delta"], eventKind);
      return freeze({
        contentId: identifier(value.contentId, "contentId"),
        delta: text(
          value.delta,
          "delta",
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
          true,
        ),
      });
    case "assistant.text.end":
    case "assistant.reasoning.end":
      exact(value, ["contentId", "content"], eventKind);
      return freeze({
        contentId: identifier(value.contentId, "contentId"),
        content: text(
          value.content,
          "content",
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
          true,
        ),
      });
    case "tool.call.started":
      exact(value, ["toolCallId", "toolName", "arguments"], eventKind);
      return freeze({
        toolCallId: identifier(value.toolCallId, "toolCallId"),
        toolName: text(value.toolName, "toolName", 256),
        arguments: publicObject(value.arguments, "arguments"),
      });
    case "tool.call.args.delta":
      exact(value, ["toolCallId", "delta"], eventKind);
      return freeze({
        toolCallId: identifier(value.toolCallId, "toolCallId"),
        delta: text(
          value.delta,
          "delta",
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
          true,
        ),
      });
    case "tool.call.terminal":
      exact(value, ["toolCallId", "status", "result", "isError"], eventKind);
      return freeze({
        toolCallId: identifier(value.toolCallId, "toolCallId"),
        status: toolStatus(value.status),
        result: publicValue(value.result),
        isError: boolean(value.isError, "isError"),
      });
    case "tool.result":
      exact(value, ["toolCallId", "result", "isError"], eventKind);
      return freeze({
        toolCallId: identifier(value.toolCallId, "toolCallId"),
        result: publicValue(value.result),
        isError: boolean(value.isError, "isError"),
      });
    case "artifact.reference":
      exactOptional(value, ["artifactId", "kind", "uri"], ["label"], eventKind);
      return freeze({
        artifactId: identifier(value.artifactId, "artifactId"),
        kind: text(value.kind, "kind", 256),
        uri: text(value.uri, "uri", 4096),
        ...optionalText(value, "label", 256),
      });
    case "interaction.requested":
      exactOptional(
        value,
        ["challengeId", "kind", "prompt"],
        ["options", "capability"],
        eventKind,
      );
      return freeze({
        challengeId: identifier(value.challengeId, "challengeId"),
        kind: interactionKind(value.kind),
        prompt: text(
          value.prompt,
          "prompt",
          AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
        ),
        ...optionalStringArray(value, "options", 32, 256),
        ...optionalCapability(value, "capability"),
      });
    case "interaction.resolved":
      exactOptional(value, ["challengeId", "decision"], ["answer"], eventKind);
      {
        const decision = interactionDecision(value.decision);
        if (decision === "answer" && value.answer === undefined)
          fail("INVALID_VALUE", "answer is required");
        if (decision !== "answer" && value.answer !== undefined)
          fail("INVALID_VALUE", "answer is only valid for answer");
        return freeze({
          challengeId: identifier(value.challengeId, "challengeId"),
          decision,
          ...optionalText(
            value,
            "answer",
            AGENT_OS_INTERACTIVE_V2_LIMITS.maxMessageBytes,
          ),
        });
      }
    case "usage":
      exactOptional(
        value,
        ["inputTokens", "outputTokens"],
        ["totalTokens", "cost"],
        eventKind,
      );
      return freeze({
        inputTokens: nonNegativeNumber(value.inputTokens, "inputTokens"),
        outputTokens: nonNegativeNumber(value.outputTokens, "outputTokens"),
        ...optionalNonNegativeNumber(value, "totalTokens"),
        ...optionalNonNegativeNumber(value, "cost"),
      });
    case "compaction.checkpoint":
      exactOptional(
        value,
        ["checkpointId", "sourceWatermark"],
        ["summary"],
        eventKind,
      );
      return freeze({
        checkpointId: identifier(value.checkpointId, "checkpointId"),
        sourceWatermark: revision(value.sourceWatermark, "sourceWatermark"),
        ...optionalText(value, "summary", 4096),
      });
    case "context.binding.created":
      exact(value, ["binding"], eventKind);
      return freeze({
        binding: parseAgentOsInteractiveV2ContextBinding(value.binding),
      });
    case "config.reconciled":
      exact(value, ["configRevision", "configDigest", "status"], eventKind);
      return freeze({
        configRevision: revision(value.configRevision, "configRevision"),
        configDigest: digest(value.configDigest, "configDigest"),
        status: configStatusValue(value.status),
      });
    case "workspace.change.previewed":
    case "workspace.change.applied":
      exact(value, ["changeSet"], eventKind);
      return freeze({ changeSet: parseChangeSet(value.changeSet) });
    case "turn.terminal":
      exactOptional(value, ["status"], ["resultDigest", "reason"], eventKind);
      return freeze({
        status: terminalStatus(value.status),
        ...optionalDigest(value, "resultDigest"),
        ...optionalText(value, "reason", 512),
      });
    default:
      return exhaustive(eventKind);
  }
}

function parseSessionSummary(
  input: unknown,
): Readonly<AgentOsInteractiveV2SessionSummary> {
  const value = record(input, "session summary");
  exactOptional(
    value,
    ["sessionId", "title", "updatedAt", "state"],
    ["agentId", "workspaceId", "executionTarget", "bindingRevision"],
    "session summary",
  );
  return freeze({
    sessionId: identifier(value.sessionId, "sessionId"),
    title: text(value.title, "title", 256),
    updatedAt: timestamp(value.updatedAt, "updatedAt"),
    state: runState(value.state),
    ...optionalIdentifier(value, "agentId"),
    ...optionalIdentifier(value, "workspaceId"),
    ...optionalExecutionTarget(value, "executionTarget"),
    ...optionalRevision(value, "bindingRevision"),
  });
}

function parseProviderBindingSummary(
  input: unknown,
): Readonly<AgentOsInteractiveV2ProviderBindingSummary> {
  const value = record(input, "provider binding");
  exact(
    value,
    ["providerId", "modelId", "apiFamily", "revision"],
    "provider binding",
  );
  return freeze({
    providerId: identifier(value.providerId, "providerId"),
    modelId: identifier(value.modelId, "modelId"),
    apiFamily: apiFamily(value.apiFamily),
    revision: revision(value.revision, "provider binding revision"),
  });
}

function parseProviderDescriptor(
  input: unknown,
): Readonly<AgentOsInteractiveV2ProviderDescriptor> {
  const value = record(input, "provider descriptor");
  exact(value, ["providerId", "displayName", "models"], "provider descriptor");
  const models = array(
    value.models,
    "provider models",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxModels,
  ).map(parseModelDescriptor);
  return freeze({
    providerId: identifier(value.providerId, "providerId"),
    displayName: text(value.displayName, "displayName", 256),
    models: freeze(models),
  });
}

function parseModelDescriptor(
  input: unknown,
): Readonly<AgentOsInteractiveV2ModelDescriptor> {
  const value = record(input, "model descriptor");
  exact(value, ["modelId", "apiFamilies"], "model descriptor");
  const families = stringArray(value.apiFamilies, "apiFamilies", 2, 64).map(
    apiFamily,
  );
  if (new Set(families).size !== families.length)
    fail("INVALID_VALUE", "model apiFamilies contain duplicates");
  return freeze({
    modelId: identifier(value.modelId, "modelId"),
    apiFamilies: freeze(families),
  });
}

function parseQueueItem(
  input: unknown,
): Readonly<AgentOsInteractiveV2QueueItem> {
  const value = record(input, "queue item");
  exact(
    value,
    ["itemId", "kind", "status", "instructionDigest", "revision"],
    "queue item",
  );
  if (value.kind !== "steer" && value.kind !== "follow_up")
    fail("INVALID_VALUE", "queue item kind is invalid");
  if (
    value.status !== "queued" &&
    value.status !== "claimed" &&
    value.status !== "context_applied" &&
    value.status !== "applied" &&
    value.status !== "cancelled" &&
    value.status !== "recovery_required"
  )
    fail("INVALID_VALUE", "queue item status is invalid");
  return freeze({
    itemId: identifier(value.itemId, "itemId"),
    kind: value.kind,
    status: value.status,
    instructionDigest: digest(value.instructionDigest, "instructionDigest"),
    revision: revision(value.revision, "revision"),
  });
}

function parseAgentDescriptor(
  input: unknown,
): Readonly<AgentOsInteractiveV2AgentDescriptor> {
  const value = record(input, "agent descriptor");
  exactOptional(
    value,
    [
      "agentId",
      "displayName",
      "kind",
      "revision",
      "configRevision",
      "availability",
      "defaultExecutionTarget",
      "allowedExecutionTargets",
      "defaultProviderId",
      "defaultModelId",
      "defaultApiFamily",
      "allowedModelBindings",
      "toolNames",
      "skillNames",
      "digest",
    ],
    ["description", "unavailableReason"],
    "agent descriptor",
  );
  const unsigned = parseAgentDescriptorUnsigned(value);
  verifyDigest(value.digest, unsigned, "agent descriptor");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

function parseAgentDescriptorUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveV2AgentDescriptor, "digest"> {
  const value = record(input, "agent descriptor");
  exactOptional(
    value,
    [
      "agentId",
      "displayName",
      "kind",
      "revision",
      "configRevision",
      "availability",
      "defaultExecutionTarget",
      "allowedExecutionTargets",
      "defaultProviderId",
      "defaultModelId",
      "defaultApiFamily",
      "allowedModelBindings",
      "toolNames",
      "skillNames",
    ],
    ["description", "unavailableReason", "digest"],
    "agent descriptor",
  );
  const allowedTargets = executionTargetArray(
    value.allowedExecutionTargets,
    "allowedExecutionTargets",
  );
  const bindings = array(
    value.allowedModelBindings,
    "allowedModelBindings",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxModels,
  ).map(parseProviderBindingSummary);
  const toolNames = stringArray(
    value.toolNames,
    "toolNames",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxTools,
    256,
  );
  const skillNames = stringArray(
    value.skillNames,
    "skillNames",
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxSkills,
    256,
  );
  const unsigned = {
    agentId: identifier(value.agentId, "agentId"),
    displayName: text(value.displayName, "displayName", 256),
    kind: agentKind(value.kind),
    ...optionalText(value, "description", 4096),
    revision: revision(value.revision, "revision"),
    configRevision: revision(value.configRevision, "configRevision"),
    availability: availability(value.availability),
    ...optionalText(value, "unavailableReason", 4096),
    defaultExecutionTarget: executionTarget(value.defaultExecutionTarget),
    allowedExecutionTargets: freeze(allowedTargets),
    defaultProviderId: identifier(value.defaultProviderId, "defaultProviderId"),
    defaultModelId: identifier(value.defaultModelId, "defaultModelId"),
    defaultApiFamily: apiFamily(value.defaultApiFamily),
    allowedModelBindings: freeze(bindings),
    toolNames: freeze(toolNames),
    skillNames: freeze(skillNames),
  } as Omit<AgentOsInteractiveV2AgentDescriptor, "digest">;
  if (!allowedTargets.includes(unsigned.defaultExecutionTarget))
    fail("INVALID_VALUE", "default execution target is not allowed");
  return unsigned;
}

function parseAgentDefinition(
  input: unknown,
): Readonly<AgentOsInteractiveV2AgentDefinition> {
  const value = record(input, "agent definition");
  exact(
    value,
    [
      "descriptor",
      "toolNames",
      "skillNames",
      "promptDigest",
      "policyDigest",
      "capabilityDigest",
      "digest",
    ],
    "agent definition",
  );
  const descriptor = parseAgentDescriptor(value.descriptor);
  const unsigned = {
    descriptor,
    toolNames: freeze(
      stringArray(
        value.toolNames,
        "toolNames",
        AGENT_OS_INTERACTIVE_V2_LIMITS.maxTools,
        256,
      ),
    ),
    skillNames: freeze(
      stringArray(
        value.skillNames,
        "skillNames",
        AGENT_OS_INTERACTIVE_V2_LIMITS.maxSkills,
        256,
      ),
    ),
    promptDigest: digest(value.promptDigest, "promptDigest"),
    policyDigest: digest(value.policyDigest, "policyDigest"),
    capabilityDigest: digest(value.capabilityDigest, "capabilityDigest"),
  };
  verifyDigest(value.digest, unsigned, "agent definition");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

function parseWorkspaceDescriptor(
  input: unknown,
): Readonly<AgentOsInteractiveV2WorkspaceDescriptor> {
  const value = record(input, "workspace descriptor");
  exactOptional(
    value,
    [
      "workspaceId",
      "displayName",
      "kind",
      "trustStatus",
      "revision",
      "dirty",
      "availability",
      "digest",
    ],
    ["unavailableReason"],
    "workspace descriptor",
  );
  const unsigned = parseWorkspaceDescriptorUnsigned(value);
  verifyDigest(value.digest, unsigned, "workspace descriptor");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

function parseWorkspaceDescriptorUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveV2WorkspaceDescriptor, "digest"> {
  const value = record(input, "workspace descriptor");
  exactOptional(
    value,
    [
      "workspaceId",
      "displayName",
      "kind",
      "trustStatus",
      "revision",
      "dirty",
      "availability",
    ],
    ["unavailableReason", "digest"],
    "workspace descriptor",
  );
  const kind = value.kind;
  if (kind !== "git" && kind !== "directory" && kind !== "snapshot")
    fail("INVALID_VALUE", "workspace kind is invalid");
  const unsigned = {
    workspaceId: identifier(value.workspaceId, "workspaceId"),
    displayName: text(value.displayName, "displayName", 256),
    kind,
    trustStatus: trustStatus(value.trustStatus),
    revision: revision(value.revision, "revision"),
    dirty: boolean(value.dirty, "dirty"),
    availability: availability(value.availability),
    ...optionalText(value, "unavailableReason", 4096),
  } as Omit<AgentOsInteractiveV2WorkspaceDescriptor, "digest">;
  return unsigned;
}

function parseExecutionDescriptor(
  input: unknown,
): Readonly<AgentOsInteractiveV2ExecutionDescriptor> {
  const value = record(input, "execution descriptor");
  exactOptional(
    value,
    [
      "target",
      "displayName",
      "availability",
      "defaultForAgentIds",
      "capabilities",
      "requiresApproval",
      "digest",
    ],
    ["unavailableReason", "artifactDigest"],
    "execution descriptor",
  );
  const unsigned = parseExecutionDescriptorUnsigned(value);
  verifyDigest(value.digest, unsigned, "execution descriptor");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

function parseExecutionDescriptorUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveV2ExecutionDescriptor, "digest"> {
  const value = record(input, "execution descriptor");
  exactOptional(
    value,
    [
      "target",
      "displayName",
      "availability",
      "defaultForAgentIds",
      "capabilities",
      "requiresApproval",
    ],
    ["unavailableReason", "artifactDigest", "digest"],
    "execution descriptor",
  );
  const target = executionTarget(value.target);
  const unsigned = {
    target,
    displayName: text(value.displayName, "displayName", 256),
    availability: availability(value.availability),
    ...optionalText(value, "unavailableReason", 4096),
    defaultForAgentIds: freeze(
      stringArray(
        value.defaultForAgentIds,
        "defaultForAgentIds",
        AGENT_OS_INTERACTIVE_V2_LIMITS.maxAgents,
        128,
      ),
    ),
    capabilities: freeze(
      stringArray(value.capabilities, "capabilities", 128, 256),
    ),
    requiresApproval: boolean(value.requiresApproval, "requiresApproval"),
    ...optionalDigest(value, "artifactDigest"),
  } as Omit<AgentOsInteractiveV2ExecutionDescriptor, "digest">;
  return unsigned;
}

function parseConfigStatus(
  input: unknown,
): Readonly<AgentOsInteractiveV2ConfigStatus> {
  const value = record(input, "config status");
  exactOptional(
    value,
    [
      "configId",
      "revision",
      "digest",
      "status",
      "source",
      "diagnostics",
      "agentCount",
      "providerCount",
    ],
    ["lastKnownGoodRevision"],
    "config status",
  );
  const source = value.source;
  if (source !== "builtin" && source !== "explicit")
    fail("INVALID_VALUE", "config source is invalid");
  return freeze({
    configId: identifier(value.configId, "configId"),
    revision: revision(value.revision, "revision"),
    digest: digest(value.digest, "config digest"),
    status: configStatusValue(value.status),
    source,
    diagnostics: freeze(
      stringArray(
        value.diagnostics,
        "diagnostics",
        AGENT_OS_INTERACTIVE_V2_LIMITS.maxDiagnostics,
        4096,
      ),
    ),
    agentCount: boundedInteger(
      value.agentCount,
      "agentCount",
      0,
      AGENT_OS_INTERACTIVE_V2_LIMITS.maxAgents,
    ),
    providerCount: boundedInteger(
      value.providerCount,
      "providerCount",
      0,
      AGENT_OS_INTERACTIVE_V2_LIMITS.maxProviders,
    ),
    ...optionalRevision(value, "lastKnownGoodRevision"),
  });
}

function parseChange(
  input: unknown,
): Readonly<AgentOsInteractiveV2WorkspaceChange> {
  const value = record(input, "workspace change");
  exactOptional(
    value,
    ["path", "status", "bytes"],
    ["beforeDigest", "afterDigest"],
    "workspace change",
  );
  const status = changeStatus(value.status);
  if (status !== "added" && value.beforeDigest === undefined) {
    /* added may omit before */
  }
  if (status === "deleted" && value.afterDigest !== undefined)
    fail("INVALID_VALUE", "deleted change cannot have afterDigest");
  return freeze({
    path: relativePath(value.path),
    status,
    ...optionalDigest(value, "beforeDigest"),
    ...optionalDigest(value, "afterDigest"),
    bytes: boundedInteger(value.bytes, "bytes", 0, Number.MAX_SAFE_INTEGER),
  });
}

function parseChangeSet(
  input: unknown,
): Readonly<AgentOsInteractiveV2WorkspaceChangeSet> {
  const value = record(input, "workspace change set");
  exactOptional(
    value,
    [
      "workspaceId",
      "baselineDigest",
      "changeDigest",
      "workspaceRevision",
      "changes",
      "conflict",
      "digest",
    ],
    ["conflictReason"],
    "workspace change set",
  );
  const unsigned = parseChangeSetUnsigned(value);
  verifyDigest(value.digest, unsigned, "workspace change set");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

function parseChangeSetUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveV2WorkspaceChangeSet, "digest"> {
  const value = record(input, "workspace change set");
  exactOptional(
    value,
    [
      "workspaceId",
      "baselineDigest",
      "changeDigest",
      "workspaceRevision",
      "changes",
      "conflict",
    ],
    ["conflictReason", "digest"],
    "workspace change set",
  );
  const unsigned = {
    workspaceId: identifier(value.workspaceId, "workspaceId"),
    baselineDigest: digest(value.baselineDigest, "baselineDigest"),
    changeDigest: digest(value.changeDigest, "changeDigest"),
    workspaceRevision: revision(value.workspaceRevision, "workspaceRevision"),
    changes: freeze(
      array(
        value.changes,
        "changes",
        AGENT_OS_INTERACTIVE_V2_LIMITS.maxChanges,
      ).map(parseChange),
    ),
    conflict: boolean(value.conflict, "conflict"),
    ...optionalText(value, "conflictReason", 4096),
  } as Omit<AgentOsInteractiveV2WorkspaceChangeSet, "digest">;
  if (unsigned.conflict && unsigned.conflictReason === undefined)
    fail("INVALID_VALUE", "conflictReason is required for a conflict");
  return unsigned;
}

function schema(value: unknown): typeof AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION {
  if (value !== AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION)
    fail("INVALID_SCHEMA", "interactive v2 schemaVersion is unsupported");
  return AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION;
}
function operationValue(value: unknown): AgentOsInteractiveV2Operation {
  if (typeof value !== "string" || !OPERATION_SET.has(value))
    fail("UNKNOWN_OPERATION", "interactive v2 operation is not registered");
  return value as AgentOsInteractiveV2Operation;
}
function eventType(value: unknown): AgentOsInteractiveV2EventType {
  if (typeof value !== "string" || !EVENT_SET.has(value))
    fail("UNKNOWN_EVENT", "interactive v2 event is not registered");
  return value as AgentOsInteractiveV2EventType;
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  assertStringBudget(
    value,
    label,
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxIdentifierBytes,
  );
  scalarLength(value, label);
  return value;
}
function nullableIdentifier(value: unknown, label: string): string | null {
  return value === null ? null : identifier(value, label);
}
function text(
  value: unknown,
  label: string,
  maxBytes: number,
  allowEmpty = false,
): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0))
    fail(
      "INVALID_VALUE",
      `${label} must be a${allowEmpty ? "" : " non-empty"} string`,
    );
  scalarLength(value, label);
  assertStringBudget(value, label, maxBytes);
  return value;
}
function digest(value: unknown, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is not a sha256 digest`);
  return value as `sha256:${string}`;
}
function timestamp(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !RFC3339_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    fail("INVALID_VALUE", `${label} is not RFC3339`);
  return value;
}
function revision(value: unknown, label: string): number {
  return boundedInteger(value, label, 0, Number.MAX_SAFE_INTEGER);
}
function boundedInteger(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    fail("INVALID_VALUE", `${label} is outside its integer range`);
  return value;
}
function nonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    fail("INVALID_VALUE", `${label} must be a non-negative finite number`);
  return value;
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean")
    fail("INVALID_VALUE", `${label} must be boolean`);
  return value;
}
function apiFamily(value: unknown): AgentOsInteractiveV2ProviderApiFamily {
  if (value !== "openai-responses" && value !== "openai-completions")
    fail("INVALID_VALUE", "provider API family is invalid");
  return value;
}
function executionTarget(value: unknown): AgentOsInteractiveV2ExecutionTarget {
  if (value !== "sandbox" && value !== "host" && value !== "managed")
    fail("INVALID_VALUE", "execution target is invalid");
  return value;
}
function streamEpoch(value: unknown): `stream-epoch:${string}` {
  if (typeof value !== "string" || !STREAM_EPOCH_PATTERN.test(value))
    fail("INVALID_VALUE", "streamEpoch is invalid");
  return value as `stream-epoch:${string}`;
}
function runState(value: unknown): AgentOsInteractiveV2RunState {
  if (
    value !== "idle" &&
    value !== "running" &&
    value !== "awaiting-interaction" &&
    value !== "succeeded" &&
    value !== "failed" &&
    value !== "cancelled" &&
    value !== "unknown" &&
    value !== "recovery_required"
  )
    fail("INVALID_VALUE", "run state is invalid");
  return value;
}
function interactionDecision(
  value: unknown,
): AgentOsInteractiveV2InteractionDecision {
  if (
    value !== "approve" &&
    value !== "reject" &&
    value !== "cancel" &&
    value !== "retry" &&
    value !== "answer"
  )
    fail("INVALID_VALUE", "interaction decision is invalid");
  return value;
}
function interactionKind(value: unknown): "approval" | "question" {
  if (value !== "approval" && value !== "question")
    fail("INVALID_VALUE", "interaction kind is invalid");
  return value;
}
function toolStatus(value: unknown): "succeeded" | "failed" | "cancelled" {
  if (value !== "succeeded" && value !== "failed" && value !== "cancelled")
    fail("INVALID_VALUE", "tool status is invalid");
  return value;
}
function terminalStatus(
  value: unknown,
): "succeeded" | "failed" | "cancelled" | "unknown" {
  if (
    value !== "succeeded" &&
    value !== "failed" &&
    value !== "cancelled" &&
    value !== "unknown"
  )
    fail("INVALID_VALUE", "terminal status is invalid");
  return value;
}
function ackStatus(value: unknown): "accepted" | "completed" | "rejected" {
  if (value !== "accepted" && value !== "completed" && value !== "rejected")
    fail("INVALID_VALUE", "ack status is invalid");
  return value;
}
function agentKind(value: unknown): "builtin" | "configured" {
  if (value !== "builtin" && value !== "configured")
    fail("INVALID_VALUE", "agent kind is invalid");
  return value;
}
function availability(value: unknown): AgentOsInteractiveV2Availability {
  if (value !== "ready" && value !== "unavailable")
    fail("INVALID_VALUE", "availability is invalid");
  return value;
}
function trustStatus(value: unknown): AgentOsInteractiveV2TrustStatus {
  if (
    value !== "trusted" &&
    value !== "untrusted" &&
    value !== "challenge-required"
  )
    fail("INVALID_VALUE", "trust status is invalid");
  return value;
}
function changeStatus(value: unknown): AgentOsInteractiveV2ChangeStatus {
  if (
    value !== "added" &&
    value !== "modified" &&
    value !== "deleted" &&
    value !== "renamed"
  )
    fail("INVALID_VALUE", "change status is invalid");
  return value;
}
function configStatusValue(value: unknown): AgentOsInteractiveV2ConfigState {
  if (
    value !== "empty" &&
    value !== "ready" &&
    value !== "degraded" &&
    value !== "invalid" &&
    value !== "recovery_required"
  )
    fail("INVALID_VALUE", "config status is invalid");
  return value;
}
function relativePath(value: unknown): string {
  const path = text(value, "path", 4096);
  if (
    path.startsWith("/") ||
    /^[A-Za-z]:[\\/]/u.test(path) ||
    path.startsWith("\\\\") ||
    path.split(/[\\/]/u).includes("..")
  )
    fail("INVALID_VALUE", "workspace change path must be relative");
  return path;
}

function parseOptional<T>(
  value: Record<string, unknown>,
  key: string,
  parser: (input: unknown) => T,
): Partial<Record<string, T>> {
  return value[key] === undefined
    ? {}
    : ({ [key]: parser(value[key]) } as Partial<Record<string, T>>);
}
function optionalText(
  value: Record<string, unknown>,
  key: string,
  max: number,
): Partial<Record<string, string>> {
  return parseOptional(value, key, (input) => text(input, key, max));
}
function optionalIdentifier(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, string>> {
  return parseOptional(value, key, (input) => identifier(input, key));
}
function optionalDigest(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, `sha256:${string}`>> {
  return parseOptional(value, key, (input) => digest(input, key));
}
function optionalRevision(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, number>> {
  return parseOptional(value, key, (input) => revision(input, key));
}
function optionalApiFamily(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, AgentOsInteractiveV2ProviderApiFamily>> {
  return parseOptional(value, key, apiFamily);
}
function optionalExecutionTarget(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, AgentOsInteractiveV2ExecutionTarget>> {
  return parseOptional(value, key, executionTarget);
}
function optionalNonNegativeNumber(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, number>> {
  return parseOptional(value, key, (input) => nonNegativeNumber(input, key));
}
function optionalCapability(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, "interaction.respond">> {
  return parseOptional(value, key, (input) => {
    if (input !== "interaction.respond")
      fail("INVALID_VALUE", "capability is invalid");
    return input;
  });
}
function optionalStringArray(
  value: Record<string, unknown>,
  key: string,
  maxItems: number,
  maxBytes: number,
): Partial<Record<string, readonly string[]>> {
  return parseOptional(value, key, (input) =>
    stringArray(input, key, maxItems, maxBytes),
  );
}

function executionTargetArray(
  value: unknown,
  label: string,
): readonly AgentOsInteractiveV2ExecutionTarget[] {
  return stringArray(value, label, 3, 32).map(executionTarget);
}
function stringArray(
  value: unknown,
  label: string,
  maxItems: number,
  maxBytes: number,
): readonly string[] {
  const values = array(value, label, maxItems).map((item) =>
    text(item, `${label} item`, maxBytes),
  );
  if (new Set(values).size !== values.length)
    fail("INVALID_VALUE", `${label} contains duplicates`);
  return values;
}

function publicObject(
  value: unknown,
  label: string,
): Readonly<Record<string, AgentOsInteractiveV2PublicJsonValue>> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_SHAPE", `${label} must be an object`);
  return publicValue(value) as Readonly<
    Record<string, AgentOsInteractiveV2PublicJsonValue>
  >;
}
function publicValue(value: unknown): AgentOsInteractiveV2PublicJsonValue {
  const state = { nodes: 0 };
  return copyPublicValue(value, 0, state, new WeakSet());
}
function copyPublicValue(
  value: unknown,
  depth: number,
  state: { nodes: number },
  seen: WeakSet<object>,
): AgentOsInteractiveV2PublicJsonValue {
  if (depth > AGENT_OS_INTERACTIVE_V2_LIMITS.maxJsonDepth)
    fail("JSON_BUDGET", "JSON nesting is too deep");
  state.nodes += 1;
  if (state.nodes > AGENT_OS_INTERACTIVE_V2_LIMITS.maxJsonNodes)
    fail("JSON_BUDGET", "JSON has too many nodes");
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    if (typeof value === "string") assertStringBudget(value, "JSON string");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail("INVALID_VALUE", "JSON number must be finite");
    return value;
  }
  if (value === null || typeof value !== "object")
    fail("INVALID_VALUE", "JSON value has an unsupported type");
  if (seen.has(value))
    fail("INVALID_SHAPE", "JSON must not contain cycles or shared references");
  seen.add(value);
  if (Array.isArray(value))
    return freeze(
      value.map((item) => copyPublicValue(item, depth + 1, state, seen)),
    );
  const object = record(value, "JSON object");
  const result: Record<string, AgentOsInteractiveV2PublicJsonValue> = {};
  for (const [key, child] of Object.entries(object)) {
    assertStringBudget(key, "JSON key");
    result[key] = copyPublicValue(child, depth + 1, state, seen);
  }
  return freeze(result);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getPrototypeOf(value) !== Object.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length > 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).length >
    AGENT_OS_INTERACTIVE_V2_LIMITS.maxObjectProperties
  )
    fail("JSON_BUDGET", `${label} has too many properties`);
  for (const [key, descriptor] of Object.entries(descriptors))
    if (
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail(
        "INVALID_SHAPE",
        `${label}.${key} must be an enumerable data property`,
      );
  return value as Record<string, unknown>;
}

function array(
  value: unknown,
  label: string,
  maxItems: number,
): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  )
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  if (value.length > maxItems) fail("JSON_BUDGET", `${label} is too large`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors))
    if (
      key !== "length" &&
      (!/^(?:0|[1-9][0-9]*)$/u.test(key) ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined)
    )
      fail("INVALID_SHAPE", `${label} contains an unsafe item`);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor))
      fail("INVALID_SHAPE", `${label} must not contain holes`);
    result.push(descriptor.value);
  }
  return result;
}

function exact(
  value: Record<string, unknown>,
  required: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== required.length ||
    keys.some((key) => !required.includes(key)) ||
    required.some((key) => !(key in value))
  )
    fail("INVALID_SHAPE", `${label} contains unknown or missing fields`);
}
function exactOptional(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    Object.keys(value).some((key) => !allowed.has(key)) ||
    required.some((key) => !(key in value))
  )
    fail("INVALID_SHAPE", `${label} contains unknown or missing fields`);
  for (const key of optional)
    if (key in value && value[key] === undefined)
      fail("INVALID_VALUE", `${label}.${key} must not be undefined`);
}
function assertStringBudget(
  value: string,
  label: string,
  limit: number = AGENT_OS_INTERACTIVE_V2_LIMITS.maxStringUtf8Bytes,
): void {
  if (new TextEncoder().encode(value).byteLength > limit)
    fail("JSON_BUDGET", `${label} exceeds its UTF-8 byte budget`);
}
function scalarLength(value: string, label: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff)
        fail("INVALID_VALUE", `${label} contains an unpaired surrogate`);
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff)
      fail("INVALID_VALUE", `${label} contains an unpaired surrogate`);
    count += 1;
  }
  return count;
}
function verifyDigest(input: unknown, unsigned: unknown, label: string): void {
  const actual = digest(input, `${label}.digest`);
  if (actual !== digestOf(unsigned))
    fail("DIGEST_MISMATCH", `${label} digest does not match canonical source`);
}
function digestOf(value: unknown): `sha256:${string}` {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail("INVALID_VALUE", "canonical source contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = record(value, "canonical source");
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}
function freeze<T>(value: T): T {
  return deepFreeze(value);
}
function exhaustive(value: never): never {
  fail("INVALID_VALUE", `unsupported value: ${String(value)}`);
}
function fail(
  code: AgentOsInteractiveV2ContractErrorCode,
  message: string,
): never {
  throw new AgentOsInteractiveV2ContractError(code, message);
}
