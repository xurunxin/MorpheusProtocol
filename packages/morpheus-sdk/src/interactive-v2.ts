import {
  parseAgentOsInteractiveV2Event,
  parseAgentOsInteractiveV2Request,
  parseAgentOsInteractiveV2Response,
  parseAgentOsInteractiveV2TranscriptPage,
  parseAgentOsInteractiveV2TranscriptResponse,
  type AgentOsInteractiveV2Event,
  type AgentOsInteractiveV2Request,
  type AgentOsInteractiveV2Response,
  type AgentOsInteractiveV2TranscriptResponse,
} from "@xurunxin/morpheus-protocol";

export interface InteractiveV2AppTransport {
  readonly request: (
    request: Readonly<AgentOsInteractiveV2Request>,
    signal?: AbortSignal,
  ) => Promise<unknown> | unknown;
  readonly subscribe?: (
    request: Readonly<AgentOsInteractiveV2Request>,
    signal?: AbortSignal,
  ) => AsyncIterable<unknown> | PromiseLike<AsyncIterable<unknown>> | unknown;
}

export interface InteractiveV2AppRequestOptions {
  readonly signal?: AbortSignal;
}

export type InteractiveV2TranscriptStreamItem = Readonly<
  AgentOsInteractiveV2TranscriptResponse | AgentOsInteractiveV2Event
>;

export interface InteractiveV2ProjectionState {
  readonly sessionId: string;
  readonly snapshot: AgentOsInteractiveV2TranscriptResponse["snapshot"];
  readonly events: readonly Readonly<AgentOsInteractiveV2Event>[];
  readonly cursor: AgentOsInteractiveV2TranscriptResponse["cursor"];
  readonly replayed: boolean;
}

export interface InteractiveV2ProjectionExpectedContext {
  readonly sessionId: string;
  readonly streamEpoch?: string;
  readonly bindingRevision?: number;
}

export type InteractiveV2ProjectionRebuildReason =
  | "initial-snapshot-required"
  | "session-changed"
  | "run-changed"
  | "binding-revision-changed"
  | "stream-epoch-changed"
  | "cursor-gap"
  | "event-conflict";

export type InteractiveV2ProjectionTransition =
  | Readonly<{
      kind: "committed";
      state: Readonly<InteractiveV2ProjectionState>;
    }>
  | Readonly<{
      kind: "rebuild-required";
      reason: InteractiveV2ProjectionRebuildReason;
    }>;

export interface InteractiveV2AppClient {
  readonly request: (
    input: Readonly<AgentOsInteractiveV2Request>,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<Readonly<AgentOsInteractiveV2Response>>;
  readonly subscribeTranscript: (
    input: Readonly<AgentOsInteractiveV2Request>,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => AsyncIterable<InteractiveV2TranscriptStreamItem>;
  readonly reduce: (
    previous: Readonly<InteractiveV2ProjectionState> | null,
    input: unknown,
    expected?: Readonly<InteractiveV2ProjectionExpectedContext>,
  ) => InteractiveV2ProjectionTransition;
  readonly readAgentCatalog: (
    request: Readonly<
      Extract<AgentOsInteractiveV2Request, { operation: "agent.catalog.read" }>
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<AgentOsInteractiveV2Response, { operation: "agent.catalog.read" }>
    >
  >;
  readonly readAgentDefinition: (
    request: Readonly<
      Extract<
        AgentOsInteractiveV2Request,
        { operation: "agent.definition.read" }
      >
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<
        AgentOsInteractiveV2Response,
        { operation: "agent.definition.read" }
      >
    >
  >;
  readonly readWorkspaceCatalog: (
    request: Readonly<
      Extract<
        AgentOsInteractiveV2Request,
        { operation: "workspace.catalog.read" }
      >
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<
        AgentOsInteractiveV2Response,
        { operation: "workspace.catalog.read" }
      >
    >
  >;
  readonly readExecutionCatalog: (
    request: Readonly<
      Extract<
        AgentOsInteractiveV2Request,
        { operation: "execution.catalog.read" }
      >
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<
        AgentOsInteractiveV2Response,
        { operation: "execution.catalog.read" }
      >
    >
  >;
  readonly createContextBinding: (
    request: Readonly<
      Extract<
        AgentOsInteractiveV2Request,
        { operation: "context.binding.create" }
      >
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<
        AgentOsInteractiveV2Response,
        { operation: "context.binding.create" }
      >
    >
  >;
  readonly readConfigStatus: (
    request: Readonly<
      Extract<AgentOsInteractiveV2Request, { operation: "config.status.read" }>
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<AgentOsInteractiveV2Response, { operation: "config.status.read" }>
    >
  >;
  readonly reconcileConfig: (
    request: Readonly<
      Extract<AgentOsInteractiveV2Request, { operation: "config.reconcile" }>
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<AgentOsInteractiveV2Response, { operation: "config.reconcile" }>
    >
  >;
  readonly previewWorkspaceChanges: (
    request: Readonly<
      Extract<
        AgentOsInteractiveV2Request,
        { operation: "workspace.change.preview" }
      >
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<
        AgentOsInteractiveV2Response,
        { operation: "workspace.change.preview" }
      >
    >
  >;
  readonly applyWorkspaceChanges: (
    request: Readonly<
      Extract<
        AgentOsInteractiveV2Request,
        { operation: "workspace.change.apply" }
      >
    >,
    options?: Readonly<InteractiveV2AppRequestOptions>,
  ) => Promise<
    Readonly<
      Extract<
        AgentOsInteractiveV2Response,
        { operation: "workspace.change.apply" }
      >
    >
  >;
}

/**
 * Creates a stateless v2 App client.  It validates all requests/responses and
 * delegates transport, persistence, cancellation and lifecycle to the caller.
 */
export function createInteractiveV2AppClient(
  transport: Readonly<InteractiveV2AppTransport>,
): Readonly<InteractiveV2AppClient> {
  if (typeof transport.request !== "function")
    throw new TypeError("InteractiveV2AppTransport.request must be a function");

  const request = async (
    input: Readonly<AgentOsInteractiveV2Request>,
    options: Readonly<InteractiveV2AppRequestOptions> = {},
  ): Promise<Readonly<AgentOsInteractiveV2Response>> => {
    const parsedRequest = parseAgentOsInteractiveV2Request(input);
    const response = parseAgentOsInteractiveV2Response(
      await transport.request(parsedRequest, options.signal),
    );
    if (response.operation !== parsedRequest.operation)
      throw new TypeError(
        "interactive v2 response operation does not match request",
      );
    if (response.requestId !== parsedRequest.requestId)
      throw new TypeError(
        "interactive v2 response requestId does not match request",
      );
    return response;
  };

  const typed =
    <TOperation extends AgentOsInteractiveV2Request["operation"]>(
      operation: TOperation,
    ) =>
    async (
      input: Readonly<
        Extract<AgentOsInteractiveV2Request, { operation: TOperation }>
      >,
      options?: Readonly<InteractiveV2AppRequestOptions>,
    ): Promise<
      Readonly<Extract<AgentOsInteractiveV2Response, { operation: TOperation }>>
    > => {
      const response = await request(input, options);
      if (response.operation !== operation)
        throw new TypeError(
          "interactive v2 typed response operation does not match request",
        );
      return response as Extract<
        AgentOsInteractiveV2Response,
        { operation: TOperation }
      >;
    };

  return Object.freeze({
    request,
    subscribeTranscript: (
      input: Readonly<AgentOsInteractiveV2Request>,
      options: Readonly<InteractiveV2AppRequestOptions> = {},
    ) => subscribeTranscript(transport, input, options.signal),
    reduce: transitionInteractiveV2Projection,
    readAgentCatalog: typed("agent.catalog.read"),
    readAgentDefinition: typed("agent.definition.read"),
    readWorkspaceCatalog: typed("workspace.catalog.read"),
    readExecutionCatalog: typed("execution.catalog.read"),
    createContextBinding: typed("context.binding.create"),
    readConfigStatus: typed("config.status.read"),
    reconcileConfig: typed("config.reconcile"),
    previewWorkspaceChanges: typed("workspace.change.preview"),
    applyWorkspaceChanges: typed("workspace.change.apply"),
  });
}

export const createAgentOsInteractiveV2AppClient = createInteractiveV2AppClient;

async function* subscribeTranscript(
  transport: Readonly<InteractiveV2AppTransport>,
  input: Readonly<AgentOsInteractiveV2Request>,
  signal: AbortSignal | undefined,
): AsyncGenerator<InteractiveV2TranscriptStreamItem> {
  const request = parseAgentOsInteractiveV2Request(input);
  if (request.operation !== "transcript.subscribe")
    throw new TypeError("subscribeTranscript requires transcript.subscribe");
  if (transport.subscribe !== undefined) {
    const source = await transport.subscribe(request, signal);
    if (!isAsyncIterable(source))
      throw new TypeError(
        "InteractiveV2AppTransport.subscribe must return an async iterable",
      );
    for await (const item of source)
      yield decodeTranscriptItem(item, request.requestId, request.sessionId);
    return;
  }
  const response = parseAgentOsInteractiveV2TranscriptResponse(
    await transport.request(request, signal),
  );
  assertTranscriptResponse(response, request.requestId, request.sessionId);
  yield response;
}

function decodeTranscriptItem(
  input: unknown,
  requestId: string,
  sessionId: string,
): InteractiveV2TranscriptStreamItem {
  if (isRecord(input) && input.eventType !== undefined) {
    const event = parseAgentOsInteractiveV2Event(input);
    if (event.sessionId !== sessionId)
      throw new TypeError("transcript event belongs to another session");
    return event;
  }
  const response = parseAgentOsInteractiveV2TranscriptResponse(input);
  assertTranscriptResponse(response, requestId, sessionId);
  return response;
}

function assertTranscriptResponse(
  response: Readonly<AgentOsInteractiveV2TranscriptResponse>,
  requestId: string,
  sessionId: string,
): void {
  if (response.operation !== "transcript.subscribe")
    throw new TypeError("transcript response operation does not match request");
  if (response.requestId !== requestId)
    throw new TypeError("transcript response requestId does not match request");
  if (response.snapshot.sessionId !== sessionId)
    throw new TypeError("transcript response belongs to another session");
}

export function transitionInteractiveV2Projection(
  previous: Readonly<InteractiveV2ProjectionState> | null,
  input: unknown,
  expected?: Readonly<InteractiveV2ProjectionExpectedContext>,
): InteractiveV2ProjectionTransition {
  if (isRecord(input) && input.eventType !== undefined)
    return transitionEvent(previous, input, expected);
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
  if (response.disposition === "snapshot-required") return committed(response);
  if (previous === null) return rebuild("initial-snapshot-required");
  if (previous.cursor.streamEpoch !== response.cursor.streamEpoch)
    return rebuild("stream-epoch-changed");
  if (previous.snapshot.bindingRevision !== response.snapshot.bindingRevision)
    return rebuild("binding-revision-changed");
  const bySequence = new Map(
    previous.events.map((event) => [event.sequence, event]),
  );
  const byId = new Map(previous.events.map((event) => [event.eventId, event]));
  for (const event of response.events) {
    const sameId = byId.get(event.eventId);
    if (
      sameId !== undefined &&
      (sameId.sequence !== event.sequence || sameId.digest !== event.digest)
    )
      return rebuild("event-conflict");
    if (event.sequence > previous.cursor.sequence) continue;
    const sameSequence = bySequence.get(event.sequence);
    if (sameSequence === undefined || sameSequence.digest !== event.digest)
      return rebuild("event-conflict");
  }
  const fresh = response.events.filter(
    (event) => event.sequence > previous.cursor.sequence,
  );
  if (previous.snapshot.runId !== response.snapshot.runId) {
    const last = fresh.at(-1);
    if (last === undefined || last.runId !== response.snapshot.runId)
      return rebuild("run-changed");
  }
  const first = fresh[0];
  if (
    (first !== undefined && first.sequence !== previous.cursor.sequence + 1) ||
    (first === undefined && response.cursor.sequence > previous.cursor.sequence)
  )
    return rebuild("cursor-gap");
  if (fresh.length === 0)
    return committed({
      ...response,
      snapshot: previous.snapshot,
      events: previous.events,
      cursor: previous.cursor,
    });
  return committed({
    ...response,
    events: Object.freeze([...previous.events, ...fresh]),
  });
}

function transitionEvent(
  previous: Readonly<InteractiveV2ProjectionState> | null,
  input: unknown,
  expected: Readonly<InteractiveV2ProjectionExpectedContext> | undefined,
): InteractiveV2ProjectionTransition {
  const event = parseAgentOsInteractiveV2Event(input);
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
  const sameId = previous.events.find(
    (candidate) => candidate.eventId === event.eventId,
  );
  if (
    sameId !== undefined &&
    (sameId.sequence !== event.sequence || sameId.digest !== event.digest)
  )
    return rebuild("event-conflict");
  const sameSequence = previous.events.find(
    (candidate) => candidate.sequence === event.sequence,
  );
  if (event.sequence <= previous.cursor.sequence) {
    if (sameSequence?.digest !== event.digest) return rebuild("event-conflict");
    return Object.freeze({ kind: "committed", state: previous });
  }
  if (event.sequence !== previous.cursor.sequence + 1)
    return rebuild("cursor-gap");
  return Object.freeze({
    kind: "committed",
    state: Object.freeze({
      sessionId: previous.sessionId,
      snapshot: previous.snapshot,
      events: Object.freeze([...previous.events, event]),
      cursor: event.cursor,
      replayed: false,
    }),
  });
}

export const reduceInteractiveV2Transcript = transitionInteractiveV2Projection;
export const reduceAgentOsInteractiveV2Transcript =
  transitionInteractiveV2Projection;

function transcriptResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV2TranscriptResponse> {
  if (isRecord(input) && input.response !== undefined)
    return parseAgentOsInteractiveV2TranscriptPage(input).response;
  return parseAgentOsInteractiveV2TranscriptResponse(input);
}
function committed(
  response: Readonly<AgentOsInteractiveV2TranscriptResponse>,
): InteractiveV2ProjectionTransition {
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
  reason: InteractiveV2ProjectionRebuildReason,
): InteractiveV2ProjectionTransition {
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
