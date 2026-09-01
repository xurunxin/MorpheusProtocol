import {
  parseAgentOsInteractiveEvent,
  parseAgentOsInteractiveRequest,
  parseAgentOsInteractiveResponse,
  parseAgentOsInteractiveTranscriptPage,
  parseAgentOsInteractiveTranscriptResponse,
  type AgentOsInteractiveEvent,
  type AgentOsInteractiveRequest,
  type AgentOsInteractiveResponse,
  type AgentOsInteractiveTranscriptResponse,
} from "@xurunxin/morpheus-protocol";

export interface InteractiveAppTransport {
  readonly request: (
    request: Readonly<AgentOsInteractiveRequest>,
    signal?: AbortSignal,
  ) => Promise<unknown> | unknown;
  readonly subscribe?: (
    request: Readonly<AgentOsInteractiveRequest>,
    signal?: AbortSignal,
  ) => AsyncIterable<unknown> | PromiseLike<AsyncIterable<unknown>> | unknown;
}

export interface InteractiveAppRequestOptions {
  readonly signal?: AbortSignal;
}

/**
 * A transcript subscription keeps the atomic response frame intact.  In
 * particular, callers must be able to feed a `snapshot-required` frame to the
 * deterministic reducer before applying later event frames.
 */
export type InteractiveTranscriptStreamItem = Readonly<
  AgentOsInteractiveTranscriptResponse | AgentOsInteractiveEvent
>;

export interface InteractiveAppClient {
  readonly request: (
    input: unknown,
    options?: Readonly<InteractiveAppRequestOptions>,
  ) => Promise<Readonly<AgentOsInteractiveResponse>>;
  readonly subscribeTranscript: (
    input: unknown,
    options?: Readonly<InteractiveAppRequestOptions>,
  ) => AsyncIterable<InteractiveTranscriptStreamItem>;
  readonly reduce: (
    previous: Readonly<InteractiveProjectionState> | null,
    input: unknown,
    expected?: Readonly<InteractiveProjectionExpectedContext>,
  ) => InteractiveProjectionTransition;
}

/**
 * Creates a stateless App client.  The caller owns transport, retry policy,
 * persistence and lifecycle; this object only validates and decodes DTOs.
 */
export function createInteractiveAppClient(
  transport: Readonly<InteractiveAppTransport>,
): Readonly<InteractiveAppClient> {
  if (typeof transport.request !== "function")
    throw new TypeError("InteractiveAppTransport.request must be a function");
  return Object.freeze({
    request: async (
      input: unknown,
      options: Readonly<InteractiveAppRequestOptions> = {},
    ) => {
      const request = parseAgentOsInteractiveRequest(input);
      const response = await transport.request(request, options.signal);
      const parsedResponse = parseAgentOsInteractiveResponse(response);
      if (parsedResponse.operation !== request.operation)
        throw new TypeError(
          "interactive response operation does not match request",
        );
      if (parsedResponse.requestId !== request.requestId)
        throw new TypeError(
          "interactive response requestId does not match request",
        );
      return parsedResponse;
    },
    subscribeTranscript: (
      input: unknown,
      options: Readonly<InteractiveAppRequestOptions> = {},
    ) => subscribeTranscript(transport, input, options.signal),
    reduce: transitionInteractiveProjection,
  });
}

export const createAgentOsInteractiveAppClient = createInteractiveAppClient;

async function* subscribeTranscript(
  transport: Readonly<InteractiveAppTransport>,
  input: unknown,
  signal: AbortSignal | undefined,
): AsyncGenerator<InteractiveTranscriptStreamItem> {
  const request = parseAgentOsInteractiveRequest(input);
  if (request.operation !== "transcript.subscribe")
    throw new TypeError("subscribeTranscript requires transcript.subscribe");
  if (transport.subscribe !== undefined) {
    const source = await transport.subscribe(request, signal);
    if (!isAsyncIterable(source))
      throw new TypeError(
        "InteractiveAppTransport.subscribe must return an async iterable",
      );
    for await (const item of source) {
      yield decodeTranscriptItem(
        item,
        request.operation,
        request.requestId,
        request.sessionId,
      );
    }
    return;
  }
  const response = parseAgentOsInteractiveTranscriptResponse(
    await transport.request(request, signal),
  );
  assertTranscriptResponse(
    response,
    request.operation,
    request.requestId,
    request.sessionId,
  );
  yield response;
}

function decodeTranscriptItem(
  input: unknown,
  operation: "transcript.subscribe",
  requestId: string,
  sessionId: string,
): InteractiveTranscriptStreamItem {
  if (isRecord(input) && input.eventType !== undefined) {
    const event = parseAgentOsInteractiveEvent(input);
    if (event.sessionId !== sessionId)
      throw new TypeError("transcript event belongs to another session");
    return event;
  }
  const response = parseAgentOsInteractiveTranscriptResponse(input);
  assertTranscriptResponse(response, operation, requestId, sessionId);
  return response;
}

function assertTranscriptResponse(
  response: Readonly<AgentOsInteractiveTranscriptResponse>,
  operation: "transcript.subscribe",
  requestId: string,
  sessionId: string,
): void {
  if (response.operation !== operation)
    throw new TypeError("transcript response operation does not match request");
  if (response.requestId !== requestId)
    throw new TypeError("transcript response requestId does not match request");
  if (response.snapshot.sessionId !== sessionId)
    throw new TypeError("transcript response belongs to another session");
}

export interface InteractiveProjectionState {
  readonly sessionId: string;
  readonly snapshot: AgentOsInteractiveTranscriptResponse["snapshot"];
  readonly events: readonly Readonly<AgentOsInteractiveEvent>[];
  readonly cursor: AgentOsInteractiveTranscriptResponse["cursor"];
  readonly replayed: boolean;
}

export interface InteractiveProjectionExpectedContext {
  readonly sessionId: string;
  readonly streamEpoch?: string;
  readonly bindingRevision?: number;
}

export type InteractiveProjectionRebuildReason =
  | "initial-snapshot-required"
  | "session-changed"
  | "run-changed"
  | "binding-revision-changed"
  | "stream-epoch-changed"
  | "cursor-gap"
  | "event-conflict";

export type InteractiveProjectionTransition =
  | Readonly<{
      kind: "committed";
      state: Readonly<InteractiveProjectionState>;
    }>
  | Readonly<{
      kind: "rebuild-required";
      reason: InteractiveProjectionRebuildReason;
    }>;

/**
 * The only stateful operation exposed by the SDK is a pure reducer.  It never
 * mutates the previous value and treats gaps or identity drift as a request to
 * obtain an atomic snapshot.
 */
export function transitionInteractiveProjection(
  previous: Readonly<InteractiveProjectionState> | null,
  input: unknown,
  expected?: Readonly<InteractiveProjectionExpectedContext>,
): InteractiveProjectionTransition {
  if (isRecord(input) && input.eventType !== undefined)
    return transitionInteractiveEvent(previous, input, expected);
  const response = transcriptResponse(input);
  const sessionId = response.snapshot.sessionId;
  if (expected !== undefined) {
    if (sessionId !== expected.sessionId) return rebuild("session-changed");
    if (
      expected.streamEpoch !== undefined &&
      response.snapshot.streamEpoch !== expected.streamEpoch
    )
      return rebuild("stream-epoch-changed");
    if (
      expected.bindingRevision !== undefined &&
      response.snapshot.bindingRevision !== expected.bindingRevision
    )
      return rebuild("binding-revision-changed");
  }
  if (previous !== null && previous.sessionId !== sessionId)
    return rebuild("session-changed");
  if (response.disposition === "snapshot-required")
    return committedState(response);
  if (previous === null) return rebuild("initial-snapshot-required");
  if (previous.cursor.streamEpoch !== response.cursor.streamEpoch)
    return rebuild("stream-epoch-changed");
  if (previous.snapshot.bindingRevision !== response.snapshot.bindingRevision)
    return rebuild("binding-revision-changed");

  const previousBySequence = new Map(
    previous.events.map((event) => [event.sequence, event]),
  );
  const previousByEventId = new Map(
    previous.events.map((event) => [event.eventId, event]),
  );
  for (const event of response.events) {
    const committedByEventId = previousByEventId.get(event.eventId);
    if (
      committedByEventId !== undefined &&
      (committedByEventId.sequence !== event.sequence ||
        committedByEventId.digest !== event.digest)
    )
      return rebuild("event-conflict");
    if (event.sequence > previous.cursor.sequence) continue;
    const committed = previousBySequence.get(event.sequence);
    if (committed === undefined || committed.digest !== event.digest)
      return rebuild("event-conflict");
  }
  const freshEvents = response.events.filter(
    (event) => event.sequence > previous.cursor.sequence,
  );
  if (previous.snapshot.runId !== response.snapshot.runId) {
    const lastFresh = freshEvents.at(-1);
    if (lastFresh === undefined || lastFresh.runId !== response.snapshot.runId)
      return rebuild("run-changed");
  }
  const first = freshEvents[0];
  if (
    (first !== undefined && first.sequence !== previous.cursor.sequence + 1) ||
    (first === undefined && response.cursor.sequence > previous.cursor.sequence)
  )
    return rebuild("cursor-gap");
  if (freshEvents.length === 0)
    return committedState({
      ...response,
      snapshot: previous.snapshot,
      events: previous.events,
      cursor: previous.cursor,
    });
  return committedState({
    ...response,
    events: Object.freeze([...previous.events, ...freshEvents]),
  });
}

function transitionInteractiveEvent(
  previous: Readonly<InteractiveProjectionState> | null,
  input: unknown,
  expected: Readonly<InteractiveProjectionExpectedContext> | undefined,
): InteractiveProjectionTransition {
  const event = parseAgentOsInteractiveEvent(input);
  if (expected !== undefined) {
    if (event.sessionId !== expected.sessionId)
      return rebuild("session-changed");
    if (
      expected.streamEpoch !== undefined &&
      event.streamEpoch !== expected.streamEpoch
    )
      return rebuild("stream-epoch-changed");
    if (
      expected.bindingRevision !== undefined &&
      event.bindingRevision !== expected.bindingRevision
    )
      return rebuild("binding-revision-changed");
  }
  if (previous === null) return rebuild("initial-snapshot-required");
  if (previous.sessionId !== event.sessionId) return rebuild("session-changed");
  if (previous.cursor.streamEpoch !== event.streamEpoch)
    return rebuild("stream-epoch-changed");
  if (previous.snapshot.bindingRevision !== event.bindingRevision)
    return rebuild("binding-revision-changed");
  const committedByEventId = previous.events.find(
    (candidate) => candidate.eventId === event.eventId,
  );
  if (
    committedByEventId !== undefined &&
    (committedByEventId.sequence !== event.sequence ||
      committedByEventId.digest !== event.digest)
  )
    return rebuild("event-conflict");
  const committed = previous.events.find(
    (candidate) => candidate.sequence === event.sequence,
  );
  if (event.sequence <= previous.cursor.sequence) {
    if (committed?.digest !== event.digest) return rebuild("event-conflict");
    return Object.freeze({
      kind: "committed" as const,
      state: previous,
    });
  }
  if (event.sequence !== previous.cursor.sequence + 1)
    return rebuild("cursor-gap");
  return Object.freeze({
    kind: "committed" as const,
    state: Object.freeze({
      sessionId: previous.sessionId,
      snapshot: previous.snapshot,
      events: Object.freeze([...previous.events, event]),
      cursor: event.cursor,
      replayed: false,
    }),
  });
}

export const reduceInteractiveTranscript = transitionInteractiveProjection;
export const reduceAgentOsInteractiveTranscript =
  transitionInteractiveProjection;

function transcriptResponse(
  input: unknown,
): Readonly<AgentOsInteractiveTranscriptResponse> {
  if (isRecord(input) && input.response !== undefined)
    return parseAgentOsInteractiveTranscriptPage(input).response;
  return parseAgentOsInteractiveTranscriptResponse(input);
}

function committedState(
  response: Readonly<AgentOsInteractiveTranscriptResponse>,
): InteractiveProjectionTransition {
  return Object.freeze({
    kind: "committed" as const,
    state: Object.freeze({
      sessionId: response.snapshot.sessionId,
      snapshot: response.snapshot,
      events: Object.freeze([...response.events]),
      cursor: response.cursor,
      replayed: response.replayed,
    }),
  });
}

function rebuild(
  reason: InteractiveProjectionRebuildReason,
): InteractiveProjectionTransition {
  return Object.freeze({ kind: "rebuild-required" as const, reason });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    value !== null && typeof value === "object" && Symbol.asyncIterator in value
  );
}
