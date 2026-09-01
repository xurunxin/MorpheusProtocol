import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import {
  AGENT_OS_INTERACTIVE_V1_OPERATIONS,
  AGENT_OS_INTERACTIVE_V1_EVENT_TYPES,
  AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION,
  type AgentOsInteractiveAckResponse,
  type AgentOsInteractiveCursor,
  type AgentOsInteractiveEvent,
  type AgentOsInteractiveEventPayload,
  type AgentOsInteractiveEventType,
  type AgentOsInteractiveIdentifier,
  type AgentOsInteractiveInteractionDecision,
  type AgentOsInteractiveModelDescriptor,
  type AgentOsInteractiveOperation,
  type AgentOsInteractiveProviderApiFamily,
  type AgentOsInteractiveProviderCatalogResponse,
  type AgentOsInteractiveProviderDescriptor,
  type AgentOsInteractivePublicJsonValue,
  type AgentOsInteractiveQueueItem,
  type AgentOsInteractiveQueueResponse,
  type AgentOsInteractiveRequest,
  type AgentOsInteractiveResponse,
  type AgentOsInteractiveRunState,
  type AgentOsInteractiveSessionCatalogResponse,
  type AgentOsInteractiveSessionSummary,
  type AgentOsInteractiveSnapshot,
  type AgentOsInteractiveTranscriptPage,
  type AgentOsInteractiveTranscriptResponse,
  type AgentOsInteractiveV1SchemaVersion,
} from "./agent-os-interactive-v1-types.js";

export * from "./agent-os-interactive-v1-types.js";

export const AGENT_OS_INTERACTIVE_V1_LIMITS = Object.freeze({
  maxFrameBytes: 1_048_576,
  maxJsonDepth: 32,
  maxJsonNodes: 20_000,
  maxArrayItems: 10_000,
  maxObjectProperties: 1_024,
  maxStringUtf8Bytes: 1_048_576,
  maxRequestIdBytes: 128,
  maxIdentifierBytes: 128,
  maxMessageBytes: 65_536,
  maxEvents: 256,
  maxQueueItems: 64,
  maxSessions: 256,
  maxProviders: 128,
  maxModels: 256,
});

const OPERATION_SET = new Set<string>(AGENT_OS_INTERACTIVE_V1_OPERATIONS);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const STREAM_EPOCH_PATTERN = /^stream-epoch:[A-Za-z0-9._:/-]{1,127}$/u;
const RFC3339_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/u;
const STRUCTURED_CLONE_REFERENCE =
  typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone
    : undefined;
const STRUCTURED_CLONE = STRUCTURED_CLONE_REFERENCE?.bind(globalThis);

export type AgentOsInteractiveContractErrorCode =
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "UNKNOWN_OPERATION"
  | "UNKNOWN_EVENT"
  | "INVALID_SCHEMA"
  | "DIGEST_MISMATCH"
  | "JSON_BUDGET"
  | "CORRELATION_MISMATCH"
  | "SEQUENCE_GAP";

export class AgentOsInteractiveContractError extends Error {
  constructor(
    readonly code: AgentOsInteractiveContractErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "AgentOsInteractiveContractError";
  }
}

export type AgentOsInteractiveEventInput = Omit<
  AgentOsInteractiveEvent,
  "cursor" | "digest"
> & {
  /** The constructor derives a cursor at this event sequence when omitted. */
  readonly cursor?:
    | Readonly<AgentOsInteractiveCursor>
    | AgentOsInteractiveCursorInput;
};
export type AgentOsInteractiveCursorInput = Omit<
  AgentOsInteractiveCursor,
  "digest"
>;
export type AgentOsInteractiveSnapshotInput = Omit<
  AgentOsInteractiveSnapshot,
  "digest"
>;

export function parseAgentOsInteractiveRequest(
  input: unknown,
): Readonly<AgentOsInteractiveRequest> {
  const value = record(input, "interactive request");
  const operation = operationValue(value.operation);
  const baseFields = ["schemaVersion", "operation", "requestId"];
  const requestId = identifier(value.requestId, "requestId");
  switch (operation) {
    case "session.catalog.read":
    case "provider.catalog.read":
      exact(value, baseFields, operation);
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
      }) as AgentOsInteractiveRequest;
    case "session.create": {
      exactOptional(
        value,
        baseFields,
        ["title", "providerId", "modelId", "apiFamily"],
        operation,
      );
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        ...(value.title === undefined
          ? {}
          : { title: text(value.title, "title", 256) }),
        ...(value.providerId === undefined
          ? {}
          : { providerId: identifier(value.providerId, "providerId") }),
        ...(value.modelId === undefined
          ? {}
          : { modelId: identifier(value.modelId, "modelId") }),
        ...(value.apiFamily === undefined
          ? {}
          : { apiFamily: apiFamily(value.apiFamily) }),
      }) as AgentOsInteractiveRequest;
    }
    case "session.fork":
      exactOptional(value, [...baseFields, "sessionId"], ["title"], operation);
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        ...(value.title === undefined
          ? {}
          : { title: text(value.title, "title", 256) }),
      }) as AgentOsInteractiveRequest;
    case "session.rename":
      exact(value, [...baseFields, "sessionId", "title"], operation);
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        title: text(value.title, "title", 256),
      }) as AgentOsInteractiveRequest;
    case "turn.start":
      exact(
        value,
        [...baseFields, "sessionId", "turnId", "message", "bindingRevision"],
        operation,
      );
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        turnId: identifier(value.turnId, "turnId"),
        message: text(
          value.message,
          "message",
          AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
        ),
        bindingRevision: revision(value.bindingRevision, "bindingRevision"),
      }) as AgentOsInteractiveRequest;
    case "turn.cancel":
      exact(
        value,
        [...baseFields, "sessionId", "runId", "turnId", "reason"],
        operation,
      );
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        reason: text(value.reason, "reason", 512),
      }) as AgentOsInteractiveRequest;
    case "turn.retry":
      exact(
        value,
        [...baseFields, "sessionId", "runId", "turnId", "bindingRevision"],
        operation,
      );
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        bindingRevision: revision(value.bindingRevision, "bindingRevision"),
      }) as AgentOsInteractiveRequest;
    case "transcript.read":
    case "transcript.subscribe":
      exact(value, [...baseFields, "sessionId", "cursor", "limit"], operation);
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        cursor:
          value.cursor === null
            ? null
            : parseAgentOsInteractiveCursor(value.cursor),
        limit: boundedInteger(
          value.limit,
          "limit",
          1,
          AGENT_OS_INTERACTIVE_V1_LIMITS.maxEvents,
        ),
      }) as AgentOsInteractiveRequest;
    case "provider.binding.create":
      exact(
        value,
        [
          ...baseFields,
          "sessionId",
          "providerId",
          "modelId",
          "apiFamily",
          "expectedRevision",
        ],
        operation,
      );
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        providerId: identifier(value.providerId, "providerId"),
        modelId: identifier(value.modelId, "modelId"),
        apiFamily: apiFamily(value.apiFamily),
        expectedRevision: revision(value.expectedRevision, "expectedRevision"),
      }) as AgentOsInteractiveRequest;
    case "prompt.queue.read":
      exact(value, [...baseFields, "sessionId", "runId"], operation);
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
      }) as AgentOsInteractiveRequest;
    case "prompt.queue.clear":
      exact(
        value,
        [...baseFields, "sessionId", "runId", "expectedRevision"],
        operation,
      );
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        expectedRevision: revision(value.expectedRevision, "expectedRevision"),
      }) as AgentOsInteractiveRequest;
    case "session.compact":
      exact(value, [...baseFields, "sessionId", "sourceRunId"], operation);
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        sourceRunId: identifier(value.sourceRunId, "sourceRunId"),
      }) as AgentOsInteractiveRequest;
    case "prompt.steer":
    case "prompt.follow-up":
      exact(
        value,
        [...baseFields, "sessionId", "runId", "turnId", "instruction"],
        operation,
      );
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        instruction: text(
          value.instruction,
          "instruction",
          AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
        ),
      }) as AgentOsInteractiveRequest;
    case "interaction.respond": {
      exactOptional(
        value,
        [...baseFields, "sessionId", "challengeId", "decision"],
        ["answer"],
        operation,
      );
      const decision = interactionDecision(value.decision);
      if (decision === "answer" && value.answer === undefined)
        fail("INVALID_VALUE", "answer is required for answer decision");
      if (decision !== "answer" && value.answer !== undefined)
        fail("INVALID_VALUE", "answer is only valid for answer decision");
      return freeze({
        schemaVersion: schema(value.schemaVersion),
        operation,
        requestId,
        sessionId: identifier(value.sessionId, "sessionId"),
        challengeId: identifier(value.challengeId, "challengeId"),
        decision,
        ...(value.answer === undefined
          ? {}
          : {
              answer: text(
                value.answer,
                "answer",
                AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
              ),
            }),
      }) as AgentOsInteractiveRequest;
    }
    default:
      return exhaustive(operation);
  }
}

export const parseAgentOsInteractiveV1Request = parseAgentOsInteractiveRequest;

export function createAgentOsInteractiveEvent(
  input: AgentOsInteractiveEventInput,
): Readonly<AgentOsInteractiveEvent> {
  const unsigned = parseInteractiveEventUnsigned(input, {
    deriveCursor: true,
    rejectDigest: true,
  });
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function parseAgentOsInteractiveEvent(
  input: unknown,
): Readonly<AgentOsInteractiveEvent> {
  const value = record(input, "interactive event");
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
    "interactive event",
  );
  const unsigned = parseInteractiveEventUnsigned(value, {
    deriveCursor: false,
    rejectDigest: false,
  });
  verifyDigest(value.digest, unsigned, "interactive event");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

export function createAgentOsInteractiveCursor(
  input: AgentOsInteractiveCursorInput,
): Readonly<AgentOsInteractiveCursor> {
  const value = record(input, "interactive cursor constructor");
  if ("digest" in value)
    fail("INVALID_SHAPE", "cursor constructor input must not include digest");
  const unsigned = parseInteractiveCursorUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function parseAgentOsInteractiveCursor(
  input: unknown,
): Readonly<AgentOsInteractiveCursor> {
  const value = record(input, "interactive cursor");
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
    "interactive cursor",
  );
  const unsigned = parseInteractiveCursorUnsigned(value);
  verifyDigest(value.digest, unsigned, "interactive cursor");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

export function createAgentOsInteractiveSnapshot(
  input: AgentOsInteractiveSnapshotInput,
): Readonly<AgentOsInteractiveSnapshot> {
  const value = record(input, "interactive snapshot constructor");
  if ("digest" in value)
    fail("INVALID_SHAPE", "snapshot constructor input must not include digest");
  const unsigned = parseInteractiveSnapshotUnsigned(value);
  return freeze({ ...unsigned, digest: digestOf(unsigned) });
}

export function parseAgentOsInteractiveSnapshot(
  input: unknown,
): Readonly<AgentOsInteractiveSnapshot> {
  const value = record(input, "interactive snapshot");
  exactOptional(
    value,
    [
      "schemaVersion",
      "sessionId",
      "runId",
      "turnId",
      "attemptId",
      "effectId",
      "bindingRevision",
      "streamEpoch",
      "watermark",
      "state",
      "terminal",
      "updatedAt",
      "digest",
    ],
    ["sessionTitle", "providerId", "modelId", "apiFamily"],
    "interactive snapshot",
  );
  const unsigned = parseInteractiveSnapshotUnsigned(value);
  verifyDigest(value.digest, unsigned, "interactive snapshot");
  return freeze({ ...unsigned, digest: digest(value.digest, "digest") });
}

export function parseAgentOsInteractiveTranscriptResponse(
  input: unknown,
): Readonly<AgentOsInteractiveTranscriptResponse> {
  const value = record(input, "interactive transcript response");
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
    "interactive transcript response",
  );
  const operation = value.operation;
  if (operation !== "transcript.read" && operation !== "transcript.subscribe")
    fail("INVALID_VALUE", "transcript response operation is invalid");
  const snapshot = parseAgentOsInteractiveSnapshot(value.snapshot);
  const eventsInput = array(
    value.events,
    "events",
    AGENT_OS_INTERACTIVE_V1_LIMITS.maxEvents,
  );
  const events = eventsInput.map((event) =>
    parseAgentOsInteractiveEvent(event),
  );
  if (new Set(events.map((event) => event.eventId)).size !== events.length)
    fail(
      "CORRELATION_MISMATCH",
      "transcript events contain duplicate event ids",
    );
  const cursor = parseAgentOsInteractiveCursor(value.cursor);
  const sessionId = snapshot.sessionId;
  let previousSequence = 0;
  let previousStreamEpoch = snapshot.streamEpoch;
  for (const event of events) {
    if (
      event.sessionId !== sessionId ||
      event.streamEpoch !== snapshot.streamEpoch ||
      event.cursor.sessionId !== sessionId ||
      event.cursor.streamEpoch !== snapshot.streamEpoch ||
      event.cursor.sequence !== event.sequence ||
      event.cursor.watermark > snapshot.watermark ||
      event.bindingRevision !== snapshot.bindingRevision ||
      event.sequence <= previousSequence
    )
      fail("CORRELATION_MISMATCH", "transcript event identity is inconsistent");
    if (event.sequence !== previousSequence + 1 && previousSequence !== 0)
      fail("SEQUENCE_GAP", "transcript events are not contiguous");
    previousSequence = event.sequence;
    previousStreamEpoch = event.streamEpoch;
  }
  if (
    previousStreamEpoch !== cursor.streamEpoch ||
    cursor.sessionId !== sessionId
  )
    fail("CORRELATION_MISMATCH", "transcript cursor identity is inconsistent");
  if (
    value.disposition === "snapshot-required" &&
    cursor.sequence !== snapshot.watermark
  )
    fail(
      "SEQUENCE_GAP",
      "snapshot-required transcript cursor must equal its snapshot watermark",
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
  if (
    events.length > 0 &&
    cursor.sequence !== events[events.length - 1]!.sequence
  )
    fail(
      "CORRELATION_MISMATCH",
      "transcript cursor does not end at the last event",
    );
  if (
    value.disposition !== "events" &&
    value.disposition !== "snapshot-required"
  )
    fail("INVALID_VALUE", "transcript disposition is invalid");
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

export function parseAgentOsInteractiveSessionCatalogResponse(
  input: unknown,
): Readonly<AgentOsInteractiveSessionCatalogResponse> {
  const value = record(input, "interactive session catalog response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "sessions"],
    "interactive session catalog response",
  );
  if (value.operation !== "session.catalog.read")
    fail("INVALID_VALUE", "session catalog operation is invalid");
  const sessions = array(
    value.sessions,
    "sessions",
    AGENT_OS_INTERACTIVE_V1_LIMITS.maxSessions,
  ).map((item) => {
    const entry = record(item, "session summary");
    exact(
      entry,
      ["sessionId", "title", "updatedAt", "state"],
      "session summary",
    );
    return freeze({
      sessionId: identifier(entry.sessionId, "sessionId"),
      title: text(entry.title, "title", 256),
      updatedAt: timestamp(entry.updatedAt, "updatedAt"),
      state: runState(entry.state),
    }) as Readonly<AgentOsInteractiveSessionSummary>;
  });
  if (
    new Set(sessions.map((session) => session.sessionId)).size !==
    sessions.length
  )
    fail("INVALID_VALUE", "session catalog contains duplicate session ids");
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "session.catalog.read",
    requestId: identifier(value.requestId, "requestId"),
    sessions: freeze(sessions),
  });
}

export function parseAgentOsInteractiveProviderCatalogResponse(
  input: unknown,
): Readonly<AgentOsInteractiveProviderCatalogResponse> {
  const value = record(input, "interactive provider catalog response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "providers"],
    "interactive provider catalog response",
  );
  if (value.operation !== "provider.catalog.read")
    fail("INVALID_VALUE", "provider catalog operation is invalid");
  const providers = array(
    value.providers,
    "providers",
    AGENT_OS_INTERACTIVE_V1_LIMITS.maxProviders,
  ).map((item) => {
    const provider = record(item, "provider descriptor");
    exact(
      provider,
      ["providerId", "displayName", "models"],
      "provider descriptor",
    );
    const models = array(
      provider.models,
      "models",
      AGENT_OS_INTERACTIVE_V1_LIMITS.maxModels,
    ).map((model) => {
      const entry = record(model, "model descriptor");
      exact(entry, ["modelId", "apiFamilies"], "model descriptor");
      const apiFamilies = array(entry.apiFamilies, "apiFamilies", 2).map(
        (family) => apiFamily(family),
      );
      if (new Set(apiFamilies).size !== apiFamilies.length)
        fail("INVALID_VALUE", "model apiFamilies must be unique");
      return freeze({
        modelId: identifier(entry.modelId, "modelId"),
        apiFamilies: freeze(apiFamilies),
      }) as Readonly<AgentOsInteractiveModelDescriptor>;
    });
    if (new Set(models.map((model) => model.modelId)).size !== models.length)
      fail("INVALID_VALUE", "provider contains duplicate model ids");
    return freeze({
      providerId: identifier(provider.providerId, "providerId"),
      displayName: text(provider.displayName, "displayName", 256),
      models: freeze(models),
    }) as Readonly<AgentOsInteractiveProviderDescriptor>;
  });
  if (
    new Set(providers.map((provider) => provider.providerId)).size !==
    providers.length
  )
    fail("INVALID_VALUE", "provider catalog contains duplicate provider ids");
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "provider.catalog.read",
    requestId: identifier(value.requestId, "requestId"),
    providers: freeze(providers),
  });
}

export function parseAgentOsInteractiveQueueResponse(
  input: unknown,
): Readonly<AgentOsInteractiveQueueResponse> {
  const value = record(input, "interactive queue response");
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
    "interactive queue response",
  );
  if (value.operation !== "prompt.queue.read")
    fail("INVALID_VALUE", "queue response operation is invalid");
  const items = array(
    value.items,
    "queue items",
    AGENT_OS_INTERACTIVE_V1_LIMITS.maxQueueItems,
  ).map((item) => {
    const entry = record(item, "queue item");
    exact(
      entry,
      ["itemId", "kind", "status", "instructionDigest", "revision"],
      "queue item",
    );
    if (entry.kind !== "steer" && entry.kind !== "follow_up")
      fail("INVALID_VALUE", "queue item kind is invalid");
    if (
      !(
        [
          "queued",
          "claimed",
          "context_applied",
          "applied",
          "cancelled",
          "recovery_required",
        ] as const
      ).includes(entry.status as never)
    )
      fail("INVALID_VALUE", "queue item status is invalid");
    return freeze({
      itemId: identifier(entry.itemId, "itemId"),
      kind: entry.kind,
      status: entry.status,
      instructionDigest: digest(entry.instructionDigest, "instructionDigest"),
      revision: revision(entry.revision, "revision"),
    }) as Readonly<AgentOsInteractiveQueueItem>;
  });
  if (new Set(items.map((item) => item.itemId)).size !== items.length)
    fail("INVALID_VALUE", "queue contains duplicate item ids");
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

export function parseAgentOsInteractiveAckResponse(
  input: unknown,
): Readonly<AgentOsInteractiveAckResponse> {
  const value = record(input, "interactive acknowledgement response");
  exactOptional(
    value,
    ["schemaVersion", "operation", "requestId", "status", "replayed"],
    ["sessionId", "runId", "turnId", "reason"],
    "interactive acknowledgement response",
  );
  const operation = operationValue(value.operation);
  if (
    [
      "transcript.read",
      "transcript.subscribe",
      "session.catalog.read",
      "provider.catalog.read",
      "prompt.queue.read",
    ].includes(operation)
  )
    fail("INVALID_VALUE", "ack operation requires a specialized response");
  if (
    value.status !== "accepted" &&
    value.status !== "completed" &&
    value.status !== "rejected"
  )
    fail("INVALID_VALUE", "ack status is invalid");
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: operation as AgentOsInteractiveAckResponse["operation"],
    requestId: identifier(value.requestId, "requestId"),
    status: value.status,
    replayed: boolean(value.replayed, "replayed"),
    ...(value.sessionId === undefined
      ? {}
      : { sessionId: identifier(value.sessionId, "sessionId") }),
    ...(value.runId === undefined
      ? {}
      : { runId: identifier(value.runId, "runId") }),
    ...(value.turnId === undefined
      ? {}
      : { turnId: identifier(value.turnId, "turnId") }),
    ...(value.reason === undefined
      ? {}
      : { reason: text(value.reason, "reason", 512) }),
  });
}

export function parseAgentOsInteractiveResponse(
  input: unknown,
): Readonly<AgentOsInteractiveResponse> {
  const value = record(input, "interactive response");
  const operation = value.operation;
  if (operation === "transcript.read" || operation === "transcript.subscribe")
    return parseAgentOsInteractiveTranscriptResponse(input);
  if (operation === "session.catalog.read")
    return parseAgentOsInteractiveSessionCatalogResponse(input);
  if (operation === "provider.catalog.read")
    return parseAgentOsInteractiveProviderCatalogResponse(input);
  if (operation === "prompt.queue.read")
    return parseAgentOsInteractiveQueueResponse(input);
  return parseAgentOsInteractiveAckResponse(input);
}

export function parseAgentOsInteractiveTranscriptPage(
  input: unknown,
): Readonly<AgentOsInteractiveTranscriptPage> {
  const value = record(input, "interactive transcript page");
  exact(
    value,
    ["schemaVersion", "sessionId", "response"],
    "interactive transcript page",
  );
  const response = parseAgentOsInteractiveTranscriptResponse(value.response);
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

export const createAgentOsInteractiveV1Event = createAgentOsInteractiveEvent;
export const parseAgentOsInteractiveV1Event = parseAgentOsInteractiveEvent;
export const createAgentOsInteractiveV1Cursor = createAgentOsInteractiveCursor;
export const parseAgentOsInteractiveV1Cursor = parseAgentOsInteractiveCursor;
export const createAgentOsInteractiveV1Snapshot =
  createAgentOsInteractiveSnapshot;
export const parseAgentOsInteractiveV1Snapshot =
  parseAgentOsInteractiveSnapshot;
export const parseAgentOsInteractiveV1Response =
  parseAgentOsInteractiveResponse;
export const parseAgentOsInteractiveV1TranscriptResponse =
  parseAgentOsInteractiveTranscriptResponse;
export const parseAgentOsInteractiveV1SessionCatalogResponse =
  parseAgentOsInteractiveSessionCatalogResponse;
export const parseAgentOsInteractiveV1ProviderCatalogResponse =
  parseAgentOsInteractiveProviderCatalogResponse;
export const parseAgentOsInteractiveV1QueueResponse =
  parseAgentOsInteractiveQueueResponse;
export const parseAgentOsInteractiveV1AckResponse =
  parseAgentOsInteractiveAckResponse;
export const parseAgentOsInteractiveV1TranscriptPage =
  parseAgentOsInteractiveTranscriptPage;

export function canonicalAgentOsInteractiveSource(input: unknown): string {
  const parsed = parseCanonicalInput(input);
  return canonicalJson(parsed);
}

export function serializeAgentOsInteractiveRequest(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveRequest(input))}\n`;
}

export function serializeAgentOsInteractiveEvent(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveEvent(input))}\n`;
}

export function serializeAgentOsInteractiveResponse(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveResponse(input))}\n`;
}

export function serializeAgentOsInteractiveCursor(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveCursor(input))}\n`;
}

export function serializeAgentOsInteractiveSnapshot(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveSnapshot(input))}\n`;
}

export function serializeAgentOsInteractive(input: unknown): string {
  return `${canonicalAgentOsInteractiveSource(input)}\n`;
}

export const serializeAgentOsInteractiveV1 = serializeAgentOsInteractive;
export const canonicalAgentOsInteractiveV1Source =
  canonicalAgentOsInteractiveSource;
export const serializeAgentOsInteractiveV1Request =
  serializeAgentOsInteractiveRequest;
export const serializeAgentOsInteractiveV1Event =
  serializeAgentOsInteractiveEvent;
export const serializeAgentOsInteractiveV1Response =
  serializeAgentOsInteractiveResponse;
export const serializeAgentOsInteractiveV1Cursor =
  serializeAgentOsInteractiveCursor;
export const serializeAgentOsInteractiveV1Snapshot =
  serializeAgentOsInteractiveSnapshot;

function parseCanonicalInput(input: unknown): unknown {
  const value = record(input, "interactive canonical source");
  const schemaVersion = schema(value.schemaVersion);
  if (value.eventType !== undefined) return parseAgentOsInteractiveEvent(value);
  if (
    value.streamEpoch !== undefined &&
    value.digest !== undefined &&
    value.state !== undefined
  )
    return parseAgentOsInteractiveSnapshot(value);
  if (
    value.streamEpoch !== undefined &&
    value.digest !== undefined &&
    value.sequence !== undefined
  )
    return parseAgentOsInteractiveCursor(value);
  if (value.response !== undefined)
    return parseAgentOsInteractiveTranscriptPage(value);
  if (
    value.operation !== undefined &&
    typeof value.operation === "string" &&
    value.operation.startsWith("transcript.")
  )
    return parseAgentOsInteractiveTranscriptResponse(value);
  if (
    value.operation !== undefined &&
    value.operation === "session.catalog.read" &&
    value.sessions !== undefined
  )
    return parseAgentOsInteractiveSessionCatalogResponse(value);
  if (
    value.operation !== undefined &&
    value.operation === "provider.catalog.read" &&
    value.providers !== undefined
  )
    return parseAgentOsInteractiveProviderCatalogResponse(value);
  if (
    value.operation !== undefined &&
    value.operation === "prompt.queue.read" &&
    value.items !== undefined
  )
    return parseAgentOsInteractiveQueueResponse(value);
  if (value.operation !== undefined && value.status !== undefined)
    return parseAgentOsInteractiveAckResponse(value);
  if (schemaVersion === AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION)
    return parseAgentOsInteractiveRequest(value);
  fail("INVALID_SCHEMA", "interactive canonical source has an unknown shape");
}

interface InteractiveEventUnsignedOptions {
  readonly deriveCursor: boolean;
  readonly rejectDigest: boolean;
}

function parseInteractiveEventUnsigned(
  input: unknown,
  options: InteractiveEventUnsignedOptions,
): Omit<AgentOsInteractiveEvent, "digest"> {
  const value = record(input, "interactive event");
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
    "interactive event",
  );
  if (!options.deriveCursor && !("cursor" in value))
    fail("INVALID_SHAPE", "interactive event.cursor is required");
  if (options.rejectDigest && "digest" in value)
    fail("INVALID_SHAPE", "event constructor input must not include digest");
  const eventType = eventTypeValue(value.eventType);
  const schemaVersion = schema(value.schemaVersion);
  const sessionId = identifier(value.sessionId, "sessionId");
  const streamEpochValue = streamEpoch(value.streamEpoch);
  const sequence = boundedInteger(
    value.sequence,
    "sequence",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const cursor =
    "cursor" in value
      ? options.deriveCursor
        ? createEventCursor(value.cursor)
        : parseAgentOsInteractiveCursor(value.cursor)
      : createAgentOsInteractiveCursor({
          schemaVersion,
          sessionId,
          streamEpoch: streamEpochValue,
          sequence,
          watermark: sequence,
        });
  if (
    cursor.schemaVersion !== schemaVersion ||
    cursor.sessionId !== sessionId ||
    cursor.streamEpoch !== streamEpochValue ||
    cursor.sequence !== sequence
  )
    fail("CORRELATION_MISMATCH", "interactive event cursor is inconsistent");
  return {
    schemaVersion,
    eventId: identifier(value.eventId, "eventId"),
    sessionId,
    runId: nullableIdentifier(value.runId, "runId"),
    turnId: nullableIdentifier(value.turnId, "turnId"),
    attemptId: nullableIdentifier(value.attemptId, "attemptId"),
    effectId: nullableIdentifier(value.effectId, "effectId"),
    bindingRevision: revision(value.bindingRevision, "bindingRevision"),
    streamEpoch: streamEpochValue,
    sequence,
    cursor,
    eventType,
    payload: parseEventPayload(eventType, value.payload),
    createdAt: timestamp(value.createdAt, "createdAt"),
  } as Omit<AgentOsInteractiveEvent, "digest">;
}

function createEventCursor(input: unknown): Readonly<AgentOsInteractiveCursor> {
  const value = record(input, "interactive event cursor");
  return "digest" in value
    ? parseAgentOsInteractiveCursor(value)
    : createAgentOsInteractiveCursor(value as AgentOsInteractiveCursorInput);
}

function parseInteractiveCursorUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveCursor, "digest"> {
  const value = record(input, "interactive cursor");
  exactOptional(
    value,
    ["schemaVersion", "sessionId", "streamEpoch", "sequence", "watermark"],
    ["digest"],
    "interactive cursor",
  );
  const sequence = boundedInteger(
    value.sequence,
    "sequence",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const watermark = boundedInteger(
    value.watermark,
    "watermark",
    sequence,
    Number.MAX_SAFE_INTEGER,
  );
  return {
    schemaVersion: schema(value.schemaVersion),
    sessionId: identifier(value.sessionId, "sessionId"),
    streamEpoch: streamEpoch(value.streamEpoch),
    sequence,
    watermark,
  };
}

function parseInteractiveSnapshotUnsigned(
  input: unknown,
): Omit<AgentOsInteractiveSnapshot, "digest"> {
  const value = record(input, "interactive snapshot");
  exactOptional(
    value,
    [
      "schemaVersion",
      "sessionId",
      "runId",
      "turnId",
      "attemptId",
      "effectId",
      "bindingRevision",
      "streamEpoch",
      "watermark",
      "state",
      "terminal",
      "updatedAt",
    ],
    ["digest", "sessionTitle", "providerId", "modelId", "apiFamily"],
    "interactive snapshot",
  );
  const hasProvider = value.providerId !== undefined;
  const hasModel = value.modelId !== undefined;
  const hasApiFamily = value.apiFamily !== undefined;
  if (hasProvider !== hasModel || hasProvider !== hasApiFamily)
    fail(
      "INVALID_SHAPE",
      "snapshot binding metadata must include providerId, modelId and apiFamily together",
    );
  const state = runState(value.state);
  const terminal = boolean(value.terminal, "terminal");
  if (
    terminal !==
    (state === "succeeded" ||
      state === "failed" ||
      state === "cancelled" ||
      state === "unknown")
  )
    fail("INVALID_VALUE", "snapshot terminal flag does not match state");
  return {
    schemaVersion: schema(value.schemaVersion),
    sessionId: identifier(value.sessionId, "sessionId"),
    ...(value.sessionTitle === undefined
      ? {}
      : { sessionTitle: text(value.sessionTitle, "sessionTitle", 256) }),
    ...(hasProvider
      ? {
          providerId: identifier(value.providerId, "providerId"),
          modelId: identifier(value.modelId, "modelId"),
          apiFamily: apiFamily(value.apiFamily),
        }
      : {}),
    runId: nullableIdentifier(value.runId, "runId"),
    turnId: nullableIdentifier(value.turnId, "turnId"),
    attemptId: nullableIdentifier(value.attemptId, "attemptId"),
    effectId: nullableIdentifier(value.effectId, "effectId"),
    bindingRevision: revision(value.bindingRevision, "bindingRevision"),
    streamEpoch: streamEpoch(value.streamEpoch),
    watermark: boundedInteger(
      value.watermark,
      "watermark",
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    state,
    terminal,
    updatedAt: timestamp(value.updatedAt, "updatedAt"),
  };
}

function parseEventPayload(
  eventType: AgentOsInteractiveEventType,
  input: unknown,
): AgentOsInteractiveEventPayload {
  const value = record(input, `${eventType} payload`);
  switch (eventType) {
    case "user.message":
      exact(value, ["messageId", "content"], `${eventType} payload`);
      return freeze({
        messageId: identifier(value.messageId, "messageId"),
        content: text(
          value.content,
          "content",
          AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
        ),
      });
    case "assistant.text.start":
    case "assistant.reasoning.start":
      exact(value, ["contentId"], `${eventType} payload`);
      return freeze({ contentId: identifier(value.contentId, "contentId") });
    case "assistant.text.delta":
    case "assistant.reasoning.delta":
      exact(value, ["contentId", "delta"], `${eventType} payload`);
      return freeze({
        contentId: identifier(value.contentId, "contentId"),
        delta: text(
          value.delta,
          "delta",
          AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
          true,
        ),
      });
    case "assistant.text.end":
    case "assistant.reasoning.end":
      exact(value, ["contentId", "content"], `${eventType} payload`);
      return freeze({
        contentId: identifier(value.contentId, "contentId"),
        content: text(
          value.content,
          "content",
          AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
          true,
        ),
      });
    case "tool.call.started":
      exact(
        value,
        ["toolCallId", "toolName", "arguments"],
        `${eventType} payload`,
      );
      return freeze({
        toolCallId: identifier(value.toolCallId, "toolCallId"),
        toolName: text(value.toolName, "toolName", 256),
        arguments: publicObject(value.arguments, "arguments"),
      });
    case "tool.call.args.delta":
      exact(value, ["toolCallId", "delta"], `${eventType} payload`);
      return freeze({
        toolCallId: identifier(value.toolCallId, "toolCallId"),
        delta: text(
          value.delta,
          "delta",
          AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
          true,
        ),
      });
    case "tool.call.terminal":
      exact(
        value,
        ["toolCallId", "status", "result", "isError"],
        `${eventType} payload`,
      );
      if (
        value.status !== "succeeded" &&
        value.status !== "failed" &&
        value.status !== "cancelled"
      )
        fail("INVALID_VALUE", "tool terminal status is invalid");
      return freeze({
        toolCallId: identifier(value.toolCallId, "toolCallId"),
        status: value.status,
        result: publicValue(value.result),
        isError: boolean(value.isError, "isError"),
      });
    case "tool.result":
      exact(value, ["toolCallId", "result", "isError"], `${eventType} payload`);
      return freeze({
        toolCallId: identifier(value.toolCallId, "toolCallId"),
        result: publicValue(value.result),
        isError: boolean(value.isError, "isError"),
      });
    case "artifact.reference":
      exactOptional(
        value,
        ["artifactId", "kind", "uri"],
        ["label"],
        `${eventType} payload`,
      );
      return freeze({
        artifactId: identifier(value.artifactId, "artifactId"),
        kind: text(value.kind, "kind", 128),
        uri: text(value.uri, "uri", 2_048),
        ...(value.label === undefined
          ? {}
          : { label: text(value.label, "label", 256) }),
      });
    case "interaction.requested":
      exactOptional(
        value,
        ["challengeId", "kind", "prompt"],
        ["options", "capability"],
        `${eventType} payload`,
      );
      if (value.kind !== "approval" && value.kind !== "question")
        fail("INVALID_VALUE", "interaction kind is invalid");
      return freeze({
        challengeId: identifier(value.challengeId, "challengeId"),
        kind: value.kind,
        prompt: text(
          value.prompt,
          "prompt",
          AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
        ),
        ...(value.capability === undefined
          ? {}
          : value.capability === "interaction.respond"
            ? { capability: value.capability }
            : fail("INVALID_VALUE", "interaction capability is invalid")),
        ...(value.options === undefined
          ? {}
          : {
              options: freeze(
                array(value.options, "options", 32).map((option) =>
                  text(option, "option", 256),
                ),
              ),
            }),
      });
    case "interaction.resolved": {
      exactOptional(
        value,
        ["challengeId", "decision"],
        ["answer"],
        `${eventType} payload`,
      );
      const decision = interactionDecision(value.decision);
      if (decision === "answer" && value.answer === undefined)
        fail("INVALID_VALUE", "interaction answer is required");
      if (decision !== "answer" && value.answer !== undefined)
        fail(
          "INVALID_VALUE",
          "interaction answer is only valid for answer decision",
        );
      return freeze({
        challengeId: identifier(value.challengeId, "challengeId"),
        decision,
        ...(value.answer === undefined
          ? {}
          : {
              answer: text(
                value.answer,
                "answer",
                AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
              ),
            }),
      });
    }
    case "usage": {
      exactOptional(
        value,
        ["inputTokens", "outputTokens"],
        ["totalTokens", "cost"],
        `${eventType} payload`,
      );
      const inputTokens = boundedInteger(
        value.inputTokens,
        "inputTokens",
        0,
        Number.MAX_SAFE_INTEGER,
      );
      const outputTokens = boundedInteger(
        value.outputTokens,
        "outputTokens",
        0,
        Number.MAX_SAFE_INTEGER,
      );
      const totalTokens =
        value.totalTokens === undefined
          ? undefined
          : boundedInteger(
              value.totalTokens,
              "totalTokens",
              inputTokens + outputTokens,
              Number.MAX_SAFE_INTEGER,
            );
      const cost =
        value.cost === undefined
          ? undefined
          : nonNegativeNumber(value.cost, "cost");
      return freeze({
        inputTokens,
        outputTokens,
        ...(totalTokens === undefined ? {} : { totalTokens }),
        ...(cost === undefined ? {} : { cost }),
      });
    }
    case "compaction.checkpoint":
      exactOptional(
        value,
        ["checkpointId", "sourceWatermark"],
        ["summary"],
        `${eventType} payload`,
      );
      return freeze({
        checkpointId: identifier(value.checkpointId, "checkpointId"),
        sourceWatermark: boundedInteger(
          value.sourceWatermark,
          "sourceWatermark",
          0,
          Number.MAX_SAFE_INTEGER,
        ),
        ...(value.summary === undefined
          ? {}
          : {
              summary: text(
                value.summary,
                "summary",
                AGENT_OS_INTERACTIVE_V1_LIMITS.maxMessageBytes,
              ),
            }),
      });
    case "turn.terminal":
      exactOptional(
        value,
        ["status"],
        ["resultDigest", "reason"],
        `${eventType} payload`,
      );
      if (
        value.status !== "succeeded" &&
        value.status !== "failed" &&
        value.status !== "cancelled" &&
        value.status !== "unknown"
      )
        fail("INVALID_VALUE", "turn terminal status is invalid");
      return freeze({
        status: value.status,
        ...(value.resultDigest === undefined
          ? {}
          : { resultDigest: digest(value.resultDigest, "resultDigest") }),
        ...(value.reason === undefined
          ? {}
          : { reason: text(value.reason, "reason", 512) }),
      });
    default:
      return exhaustive(eventType);
  }
}

function publicObject(
  input: unknown,
  label: string,
): Readonly<Record<string, AgentOsInteractivePublicJsonValue>> {
  const value = record(input, label);
  return copyPublicJson(value, 0, { nodes: 0 }, new WeakSet()) as Readonly<
    Record<string, AgentOsInteractivePublicJsonValue>
  >;
}

function publicValue(input: unknown): AgentOsInteractivePublicJsonValue {
  return copyPublicJson(input, 0, { nodes: 0 }, new WeakSet());
}

function copyPublicJson(
  input: unknown,
  depth: number,
  state: { nodes: number },
  seen: WeakSet<object>,
): AgentOsInteractivePublicJsonValue {
  if (depth > AGENT_OS_INTERACTIVE_V1_LIMITS.maxJsonDepth)
    fail("JSON_BUDGET", "JSON nesting is too deep");
  state.nodes += 1;
  if (state.nodes > AGENT_OS_INTERACTIVE_V1_LIMITS.maxJsonNodes)
    fail("JSON_BUDGET", "JSON has too many nodes");
  if (input === null || typeof input === "boolean") return input;
  if (typeof input === "number") return finiteNumber(input, "JSON number");
  if (typeof input === "string") {
    assertStringBudget(input, "JSON string");
    return input;
  }
  if (input === null || typeof input !== "object")
    fail("INVALID_VALUE", "JSON value has an unsupported type");
  if (seen.has(input))
    fail("INVALID_SHAPE", "JSON must not contain cycles or shared references");
  seen.add(input);
  if (Array.isArray(input)) {
    const values = array(
      input,
      "JSON array",
      AGENT_OS_INTERACTIVE_V1_LIMITS.maxArrayItems,
    );
    return freeze(
      values.map((value) => copyPublicJson(value, depth + 1, state, seen)),
    );
  }
  const entries = Object.entries(record(input, "JSON object"));
  if (entries.length > AGENT_OS_INTERACTIVE_V1_LIMITS.maxObjectProperties)
    fail("JSON_BUDGET", "JSON object is too large");
  const output: Record<string, AgentOsInteractivePublicJsonValue> = {};
  for (const [key, value] of entries) {
    assertStringBudget(key, "JSON key");
    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: copyPublicJson(value, depth + 1, state, seen),
      writable: true,
    });
  }
  return freeze(output);
}

function schema(value: unknown): AgentOsInteractiveV1SchemaVersion {
  if (value !== AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION)
    fail("INVALID_SCHEMA", "interactive schemaVersion is unsupported");
  return AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION;
}

function operationValue(value: unknown): AgentOsInteractiveOperation {
  if (typeof value !== "string" || !OPERATION_SET.has(value))
    fail("UNKNOWN_OPERATION", "interactive operation is not registered");
  return value as AgentOsInteractiveOperation;
}

function eventTypeValue(value: unknown): AgentOsInteractiveEventType {
  if (typeof value !== "string" || !EVENT_TYPES.has(value))
    fail("UNKNOWN_EVENT", "interactive event is not registered");
  return value as AgentOsInteractiveEventType;
}

const EVENT_TYPES = new Set<string>(AGENT_OS_INTERACTIVE_V1_EVENT_TYPES);

function apiFamily(value: unknown): AgentOsInteractiveProviderApiFamily {
  if (value !== "openai-responses" && value !== "openai-completions")
    fail("INVALID_VALUE", "provider API family is invalid");
  return value;
}

function interactionDecision(
  value: unknown,
): AgentOsInteractiveInteractionDecision {
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

function runState(value: unknown): AgentOsInteractiveRunState {
  if (
    value !== "idle" &&
    value !== "running" &&
    value !== "awaiting-interaction" &&
    value !== "succeeded" &&
    value !== "failed" &&
    value !== "cancelled" &&
    value !== "unknown"
  )
    fail("INVALID_VALUE", "interactive run state is invalid");
  return value;
}

function streamEpoch(value: unknown): `stream-epoch:${string}` {
  if (typeof value !== "string" || !STREAM_EPOCH_PATTERN.test(value))
    fail("INVALID_VALUE", "streamEpoch is invalid");
  return value as `stream-epoch:${string}`;
}

function identifier(
  value: unknown,
  label: string,
): AgentOsInteractiveIdentifier {
  if (typeof value !== "string" || !ID_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  assertStringBudget(
    value,
    label,
    AGENT_OS_INTERACTIVE_V1_LIMITS.maxIdentifierBytes,
  );
  scalarLength(value, label);
  return value;
}

function nullableIdentifier(
  value: unknown,
  label: string,
): AgentOsInteractiveIdentifier | null {
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

function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is not a sha256 digest`);
  return value;
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

function finiteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) fail("INVALID_VALUE", `${label} must be finite`);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean")
    fail("INVALID_VALUE", `${label} must be boolean`);
  return value;
}

function array(
  input: unknown,
  label: string,
  maxItems: number,
): readonly unknown[] {
  if (!Array.isArray(input))
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  let prototype: object | null;
  let symbols: symbol[];
  let descriptors: Record<string, PropertyDescriptor>;
  try {
    prototype = Object.getPrototypeOf(input);
    symbols = Object.getOwnPropertySymbols(input);
    descriptors = Object.getOwnPropertyDescriptors(input);
  } catch {
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  }
  if (prototype !== Array.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  if (symbols.length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const length = descriptors.length?.value;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0)
    fail("INVALID_SHAPE", `${label} has an invalid length`);
  if (length > maxItems) fail("JSON_BUDGET", `${label} is too large`);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (key === "length") continue;
    if (
      !/^(?:0|[1-9][0-9]*)$/u.test(key) ||
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail("INVALID_SHAPE", `${label} contains an unsafe item`);
  }
  const values: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor))
      fail("INVALID_SHAPE", `${label} must not contain holes`);
    values.push(descriptor.value);
  }
  return values;
}

function record(input: unknown, label: string): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  let prototype: object | null;
  let symbols: symbol[];
  let descriptors: Record<string, PropertyDescriptor>;
  try {
    prototype = Object.getPrototypeOf(input);
    symbols = Object.getOwnPropertySymbols(input);
    descriptors = Object.getOwnPropertyDescriptors(input);
  } catch {
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  }
  if (prototype !== Object.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (symbols.length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  if (
    Object.keys(descriptors).length >
    AGENT_OS_INTERACTIVE_V1_LIMITS.maxObjectProperties
  )
    fail("JSON_BUDGET", `${label} has too many properties`);
  for (const [key, descriptor] of Object.entries(descriptors)) {
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
  }
  if (STRUCTURED_CLONE !== undefined) {
    let currentStructuredClone: typeof globalThis.structuredClone;
    try {
      currentStructuredClone = globalThis.structuredClone;
    } catch {
      fail("INVALID_SHAPE", `${label} cannot be safely cloned`);
    }
    if (currentStructuredClone !== STRUCTURED_CLONE_REFERENCE)
      fail("INVALID_SHAPE", `${label} cannot be safely cloned`);
    try {
      STRUCTURED_CLONE(input);
    } catch (error) {
      void error;
      fail("INVALID_SHAPE", `${label} cannot be safely cloned`);
    }
  }
  return input as Record<string, unknown>;
}

function exact(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !(key in value))
  )
    fail("INVALID_SHAPE", `${label} contains unknown or missing fields`);
}

function exactOptional(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (
    keys.some((key) => !required.includes(key) && !optional.includes(key)) ||
    required.some((key) => !(key in value))
  )
    fail("INVALID_SHAPE", `${label} contains unknown or missing fields`);
  for (const key of optional) {
    if (key in value && value[key] === undefined)
      fail("INVALID_VALUE", `${label}.${key} must not be undefined`);
  }
}

function assertStringBudget(
  value: string,
  label: string,
  limit: number = AGENT_OS_INTERACTIVE_V1_LIMITS.maxStringUtf8Bytes,
): void {
  if (new TextEncoder().encode(value).byteLength > limit)
    fail("JSON_BUDGET", `${label} exceeds its UTF-8 byte budget`);
}

function scalarLength(value: string, label: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff)
        fail("INVALID_VALUE", `${label} contains an unpaired surrogate`);
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff)
      fail("INVALID_VALUE", `${label} contains an unpaired surrogate`);
    count += 1;
  }
  return count;
}

function verifyDigest(input: unknown, unsigned: unknown, label: string): void {
  const actual = digest(input, `${label}.digest`);
  const expected = digestOf(unsigned);
  if (actual !== expected)
    fail("DIGEST_MISMATCH", `${label} digest does not match canonical source`);
}

function digestOf(value: unknown): string {
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
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
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
  code: AgentOsInteractiveContractErrorCode,
  message: string,
): never {
  throw new AgentOsInteractiveContractError(code, message);
}
