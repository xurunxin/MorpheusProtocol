/**
 * Protocol-only execution.v1 queue / compact contract.
 *
 * These DTOs intentionally omit execution envelopes, caller authority,
 * transport, persistence, queue draining, provider calls, and context
 * mutation. A future execution.v1 owner may carry them in its own envelope.
 */

export const AGENT_OS_V1_QUEUE_COMPACT_SCHEMA = "agent-os-queue-compact/v1" as const;
export const AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION = "prompt.queue.read" as const;
export const AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION = "prompt.queue.clear" as const;
export const AGENT_OS_V1_SESSION_COMPACT_OPERATION = "session.compact" as const;

export const AGENT_OS_V1_QUEUE_COMPACT_LIMITS = Object.freeze({
  maxDepth: 8,
  maxWidth: 32,
  maxTotalUtf8Bytes: 65_536,
  maxRequestIdUtf8Bytes: 128,
  maxSessionIdUtf8Bytes: 128,
  maxRunIdUtf8Bytes: 128,
  maxAttemptIdUtf8Bytes: 128,
  maxSourceRunIdUtf8Bytes: 128,
  maxCursorUtf8Bytes: 1_024,
  maxItemIdUtf8Bytes: 128,
  maxItems: 64,
});

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._/-]{0,127}$/u;

const TRUSTED_STRUCTURED_CLONE =
  typeof globalThis.structuredClone === "function" ? globalThis.structuredClone : undefined;
const TRUSTED_IS_PROXY = captureTrustedIsProxy();
const ABORT_SIGNAL_INTRINSICS = captureAbortSignalIntrinsics();
const CONTRACT_ERRORS = new WeakSet<object>();
const ABORT_ERRORS = new WeakSet<object>();

export type AgentOsV1QueueCompactOperation =
  | typeof AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION
  | typeof AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION
  | typeof AGENT_OS_V1_SESSION_COMPACT_OPERATION;

export type AgentOsV1QueueCompactContractErrorCode =
  | "INPUT_INVALID"
  | "TARGET_NOT_CURRENT"
  | "STATE_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "OWNER_UNAVAILABLE"
  | "RECOVERY_REQUIRED";

export class AgentOsV1QueueCompactContractError extends Error {
  constructor(readonly code: AgentOsV1QueueCompactContractErrorCode) {
    super(code);
    this.name = "AgentOsV1QueueCompactContractError";
    CONTRACT_ERRORS.add(this);
  }
}

export interface AgentOsV1PromptQueueTarget {
  readonly sessionId: string;
  readonly runId: string;
  readonly attemptId: string;
  readonly storeGeneration: number;
}

export interface AgentOsV1SessionCompactTarget {
  readonly sessionId: string;
  readonly sourceRunId: string;
  readonly storeGeneration: number;
  readonly sourceContextDigest: string;
}

export type AgentOsV1QueueCompactTarget =
  | Readonly<AgentOsV1PromptQueueTarget>
  | Readonly<AgentOsV1SessionCompactTarget>;

export type AgentOsV1PromptQueueItemKind = "steer" | "follow_up";
export type AgentOsV1PromptQueueItemStatus =
  | "queued"
  | "claimed"
  | "context_applied"
  | "applied"
  | "cancelled"
  | "recovery_required";

export interface AgentOsV1PromptQueueLifecycleTransition {
  readonly previousStatus: AgentOsV1PromptQueueItemStatus;
  readonly nextStatus: AgentOsV1PromptQueueItemStatus;
  readonly nonApplicationProven: boolean;
}

/** Redacted, ordered lifecycle projection; instruction content is never carried. */
export interface AgentOsV1PromptQueueItem {
  readonly itemId: string;
  readonly kind: AgentOsV1PromptQueueItemKind;
  readonly status: AgentOsV1PromptQueueItemStatus;
  readonly instructionDigest: string;
  readonly revision: number;
}

export interface AgentOsV1PromptQueueReadRequest {
  readonly schemaVersion: typeof AGENT_OS_V1_QUEUE_COMPACT_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION;
  readonly target: Readonly<AgentOsV1PromptQueueTarget>;
  readonly cursor: string | null;
}

export type AgentOsV1QueueClearFilter = AgentOsV1PromptQueueItemKind | "all";

export interface AgentOsV1PromptQueueClearRequest {
  readonly schemaVersion: typeof AGENT_OS_V1_QUEUE_COMPACT_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION;
  readonly target: Readonly<AgentOsV1PromptQueueTarget>;
  readonly filter: AgentOsV1QueueClearFilter;
  readonly expectedRevision: number;
}

export interface AgentOsV1SessionCompactRequest {
  readonly schemaVersion: typeof AGENT_OS_V1_QUEUE_COMPACT_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_SESSION_COMPACT_OPERATION;
  readonly target: Readonly<AgentOsV1SessionCompactTarget>;
}

export type AgentOsV1QueueCompactRequest =
  | Readonly<AgentOsV1PromptQueueReadRequest>
  | Readonly<AgentOsV1PromptQueueClearRequest>
  | Readonly<AgentOsV1SessionCompactRequest>;

export interface AgentOsV1PromptQueueReadSnapshotResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_QUEUE_COMPACT_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION;
  readonly target: Readonly<AgentOsV1PromptQueueTarget>;
  readonly disposition: "snapshot";
  readonly cursor: string;
  readonly queueRevision: number;
  readonly items: readonly Readonly<AgentOsV1PromptQueueItem>[];
}

export interface AgentOsV1PromptQueueReadNotModifiedResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_QUEUE_COMPACT_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION;
  readonly target: Readonly<AgentOsV1PromptQueueTarget>;
  readonly disposition: "not-modified";
  readonly cursor: string;
  readonly queueRevision: number;
}

export interface AgentOsV1PromptQueueReadSnapshotRequiredResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_QUEUE_COMPACT_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION;
  readonly target: Readonly<AgentOsV1PromptQueueTarget>;
  readonly disposition: "snapshot-required";
  readonly cursor: null;
  readonly queueRevision: number;
}

export type AgentOsV1PromptQueueReadResponse =
  | Readonly<AgentOsV1PromptQueueReadSnapshotResponse>
  | Readonly<AgentOsV1PromptQueueReadNotModifiedResponse>
  | Readonly<AgentOsV1PromptQueueReadSnapshotRequiredResponse>;

export interface AgentOsV1PromptQueueClearReceipt {
  readonly schemaVersion: typeof AGENT_OS_V1_QUEUE_COMPACT_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION;
  readonly target: Readonly<AgentOsV1PromptQueueTarget>;
  readonly filter: AgentOsV1QueueClearFilter;
  readonly expectedRevision: number;
  readonly requestFingerprint: string;
  readonly acceptedRevision: number;
  readonly changedCount: number;
  readonly replayed: boolean;
}

export type AgentOsV1SessionCompactDisposition = "applied" | "not_needed";

export interface AgentOsV1SessionCompactReceipt {
  readonly schemaVersion: typeof AGENT_OS_V1_QUEUE_COMPACT_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_SESSION_COMPACT_OPERATION;
  readonly target: Readonly<AgentOsV1SessionCompactTarget>;
  readonly requestFingerprint: string;
  readonly disposition: AgentOsV1SessionCompactDisposition;
  readonly replayed: boolean;
}

export type AgentOsV1QueueCompactResponse =
  | AgentOsV1PromptQueueReadResponse
  | Readonly<AgentOsV1PromptQueueClearReceipt>
  | Readonly<AgentOsV1SessionCompactReceipt>;

export interface AgentOsV1QueueCompactRequestBindingBase {
  readonly requestId: string;
  readonly operation: AgentOsV1QueueCompactOperation;
  readonly requestFingerprint: string;
}

export interface AgentOsV1PromptQueueReadRequestBinding extends AgentOsV1QueueCompactRequestBindingBase {
  readonly operation: typeof AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION;
  readonly target: Readonly<AgentOsV1PromptQueueTarget>;
  readonly cursor: string | null;
}

export interface AgentOsV1PromptQueueClearRequestBinding extends AgentOsV1QueueCompactRequestBindingBase {
  readonly operation: typeof AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION;
  readonly target: Readonly<AgentOsV1PromptQueueTarget>;
  readonly filter: AgentOsV1QueueClearFilter;
  readonly expectedRevision: number;
}

export interface AgentOsV1SessionCompactRequestBinding extends AgentOsV1QueueCompactRequestBindingBase {
  readonly operation: typeof AGENT_OS_V1_SESSION_COMPACT_OPERATION;
  readonly target: Readonly<AgentOsV1SessionCompactTarget>;
}

export type AgentOsV1QueueCompactRequestBinding =
  | Readonly<AgentOsV1PromptQueueReadRequestBinding>
  | Readonly<AgentOsV1PromptQueueClearRequestBinding>
  | Readonly<AgentOsV1SessionCompactRequestBinding>;

export type AgentOsV1QueueCompactRequestBindingComparison = "replay" | "independent";

export interface AgentOsV1QueueCompactFreshAdmission {
  readonly kind: "fresh-admission";
  readonly requestId: string;
  readonly requestFingerprint: string;
}

export interface AgentOsV1QueueCompactReferenceAdmissionContext {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1QueueCompactRequest>;
  readonly requestBinding: Readonly<AgentOsV1QueueCompactRequestBinding>;
  readonly replay: boolean;
  readonly signal?: AbortSignal;
}

export interface AgentOsV1QueueCompactReferenceDispatchContext extends AgentOsV1QueueCompactReferenceAdmissionContext {
  readonly freshAdmission: Readonly<AgentOsV1QueueCompactFreshAdmission>;
}

export type AgentOsV1QueueCompactReferenceAdmit = (
  context: Readonly<AgentOsV1QueueCompactReferenceAdmissionContext>
) => unknown | Promise<unknown>;

export type AgentOsV1QueueCompactReferenceDispatch = (
  context: Readonly<AgentOsV1QueueCompactReferenceDispatchContext>
) => unknown | Promise<unknown>;

export interface AgentOsV1QueueCompactReferenceClientOptions {
  readonly admit: AgentOsV1QueueCompactReferenceAdmit;
  readonly dispatch: AgentOsV1QueueCompactReferenceDispatch;
}

export type AgentOsV1QueueCompactReferenceResult =
  | Readonly<{
      readonly disposition: "accepted";
      readonly response: Readonly<AgentOsV1QueueCompactResponse>;
    }>
  | Readonly<{
      readonly disposition: "replay_requires_fresh_admission";
      readonly binding: Readonly<AgentOsV1QueueCompactRequestBinding>;
    }>;

export interface AgentOsV1QueueCompactReferenceClient {
  readonly request: (
    envelopeInput: unknown,
    optionsInput?: unknown
  ) => Promise<Readonly<AgentOsV1QueueCompactReferenceResult>>;
}

/** Strictly parse one of the three approved queue/compact request DTOs. */
export function parseAgentOsV1QueueCompactRequest(
  input: unknown
): Readonly<AgentOsV1QueueCompactRequest> {
  const value = copyPlainData(input);
  if (value.operation === AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION)
    return parsePromptQueueReadValue(value);
  if (value.operation === AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION)
    return parsePromptQueueClearValue(value);
  if (value.operation === AGENT_OS_V1_SESSION_COMPACT_OPERATION)
    return parseSessionCompactValue(value);
  fail("INPUT_INVALID");
}

export function parseAgentOsV1PromptQueueReadRequest(
  input: unknown
): Readonly<AgentOsV1PromptQueueReadRequest> {
  return parsePromptQueueReadValue(copyPlainData(input));
}

export function parseAgentOsV1PromptQueueClearRequest(
  input: unknown
): Readonly<AgentOsV1PromptQueueClearRequest> {
  return parsePromptQueueClearValue(copyPlainData(input));
}

export function parseAgentOsV1SessionCompactRequest(
  input: unknown
): Readonly<AgentOsV1SessionCompactRequest> {
  return parseSessionCompactValue(copyPlainData(input));
}

/**
 * Validate one queue item lifecycle edge without owning queue state.
 *
 * A claimed/context-applied item may be cancelled only when non-application
 * is proven; otherwise recovery_required is the only safe terminal result.
 */
export function assertAgentOsV1PromptQueueLifecycleTransition(
  input: unknown
): AgentOsV1PromptQueueItemStatus {
  const value = copyPlainData(input);
  exact(value, ["previousStatus", "nextStatus", "nonApplicationProven"]);
  const previousStatus = queueItemStatus(value.previousStatus);
  const nextStatus = queueItemStatus(value.nextStatus);
  if (typeof value.nonApplicationProven !== "boolean") fail("INPUT_INVALID");
  const proven = value.nonApplicationProven;

  if (previousStatus === nextStatus) return nextStatus;
  if (
    previousStatus === "applied" ||
    previousStatus === "cancelled" ||
    previousStatus === "recovery_required"
  )
    fail("STATE_CONFLICT");
  if (previousStatus === "queued") {
    if (nextStatus === "claimed" || nextStatus === "cancelled") return nextStatus;
    fail("STATE_CONFLICT");
  }
  if (previousStatus === "claimed") {
    if (nextStatus === "context_applied") return nextStatus;
    if (nextStatus === "cancelled" && proven) return nextStatus;
    if (nextStatus === "recovery_required" && !proven) return nextStatus;
    fail("STATE_CONFLICT");
  }
  if (previousStatus === "context_applied") {
    if (nextStatus === "applied") return nextStatus;
    if (nextStatus === "cancelled" && proven) return nextStatus;
    if (nextStatus === "recovery_required" && !proven) return nextStatus;
    fail("STATE_CONFLICT");
  }
  fail("STATE_CONFLICT");
}

/** Strictly parse an ordered redacted queue read response. */
export function parseAgentOsV1PromptQueueReadResponse(
  input: unknown
): Readonly<AgentOsV1PromptQueueReadResponse> {
  const value = copyPlainData(input);
  exactCommon(value, AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION);
  const target = parseQueueTarget(value.target);
  const disposition = value.disposition;
  if (disposition === "snapshot") {
    exact(value, [
      "schemaVersion",
      "operation",
      "target",
      "disposition",
      "cursor",
      "queueRevision",
      "items",
    ]);
    const cursor = opaqueText(value.cursor, AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxCursorUtf8Bytes);
    const queueRevision = nonNegativeInteger(value.queueRevision);
    const items = parseQueueItems(value.items, queueRevision);
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target,
      disposition,
      cursor,
      queueRevision,
      items,
    });
  }
  if (disposition === "not-modified") {
    exact(value, [
      "schemaVersion",
      "operation",
      "target",
      "disposition",
      "cursor",
      "queueRevision",
    ]);
    const cursor = opaqueText(value.cursor, AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxCursorUtf8Bytes);
    const queueRevision = nonNegativeInteger(value.queueRevision);
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target,
      disposition,
      cursor,
      queueRevision,
    });
  }
  if (disposition === "snapshot-required") {
    exact(value, [
      "schemaVersion",
      "operation",
      "target",
      "disposition",
      "cursor",
      "queueRevision",
    ]);
    if (value.cursor !== null) fail("INPUT_INVALID");
    const queueRevision = nonNegativeInteger(value.queueRevision);
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target,
      disposition,
      cursor: null,
      queueRevision,
    });
  }
  fail("INPUT_INVALID");
}

export function parseAgentOsV1PromptQueueClearReceipt(
  input: unknown
): Readonly<AgentOsV1PromptQueueClearReceipt> {
  const value = copyPlainData(input);
  exactCommon(value, AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION);
  exact(value, [
    "schemaVersion",
    "operation",
    "target",
    "filter",
    "expectedRevision",
    "requestFingerprint",
    "acceptedRevision",
    "changedCount",
    "replayed",
  ]);
  const target = parseQueueTarget(value.target);
  const filter = queueFilter(value.filter);
  const expectedRevision = nonNegativeInteger(value.expectedRevision);
  const requestFingerprint = digest(value.requestFingerprint);
  const acceptedRevision = nonNegativeInteger(value.acceptedRevision);
  const changedCount = nonNegativeInteger(value.changedCount);
  if (typeof value.replayed !== "boolean") fail("INPUT_INVALID");
  return deepFreeze({
    schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
    operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
    target,
    filter,
    expectedRevision,
    requestFingerprint,
    acceptedRevision,
    changedCount,
    replayed: value.replayed,
  });
}

export function parseAgentOsV1SessionCompactReceipt(
  input: unknown
): Readonly<AgentOsV1SessionCompactReceipt> {
  const value = copyPlainData(input);
  exactCommon(value, AGENT_OS_V1_SESSION_COMPACT_OPERATION);
  exact(value, [
    "schemaVersion",
    "operation",
    "target",
    "requestFingerprint",
    "disposition",
    "replayed",
  ]);
  const target = parseCompactTarget(value.target);
  const requestFingerprint = digest(value.requestFingerprint);
  if (value.disposition !== "applied" && value.disposition !== "not_needed") fail("INPUT_INVALID");
  if (typeof value.replayed !== "boolean") fail("INPUT_INVALID");
  return deepFreeze({
    schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
    operation: AGENT_OS_V1_SESSION_COMPACT_OPERATION,
    target,
    requestFingerprint,
    disposition: value.disposition,
    replayed: value.replayed,
  });
}

/** Parse any owner response using its operation discriminator. */
export function parseAgentOsV1QueueCompactResponse(
  input: unknown
): Readonly<AgentOsV1QueueCompactResponse> {
  const value = copyPlainData(input);
  if (value.operation === AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION)
    return parseAgentOsV1PromptQueueReadResponse(value);
  if (value.operation === AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION)
    return parseAgentOsV1PromptQueueClearReceipt(value);
  if (value.operation === AGENT_OS_V1_SESSION_COMPACT_OPERATION)
    return parseAgentOsV1SessionCompactReceipt(value);
  fail("INPUT_INVALID");
}

/** Canonical request source for deterministic, domain-separated fingerprints. */
export function canonicalAgentOsV1QueueCompactRequestSource(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): string {
  const identity = parseRequestIdentity(input);
  return canonicalJson({
    schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
    operation: identity.request.operation,
    requestId: identity.requestId,
    request: identity.request,
  });
}

export function createAgentOsV1QueueCompactRequestFingerprint(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): string {
  return contentDigest(canonicalAgentOsV1QueueCompactRequestSource(input));
}

export function createAgentOsV1QueueCompactRequestBinding(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): Readonly<AgentOsV1QueueCompactRequestBinding> {
  const identity = parseRequestIdentity(input);
  return deepFreeze({
    ...bindingParts(identity),
    requestFingerprint: requestFingerprintFromIdentity(identity),
  });
}

/**
 * Compare bindings without a registry. Same ID and exact binding is replay;
 * same-ID drift is an idempotency conflict; different IDs are independent.
 */
export function assertAgentOsV1QueueCompactRequestBindingCompatible(
  existing: unknown,
  incoming: unknown
): AgentOsV1QueueCompactRequestBindingComparison {
  const left = parseRequestBinding(existing);
  const right = parseRequestBinding(incoming);
  const sameRequestId = left.requestId === right.requestId;
  if (
    sameRequestId &&
    (!sameBindingIdentity(left, right) || left.requestFingerprint !== right.requestFingerprint)
  )
    fail("IDEMPOTENCY_CONFLICT");
  if (!left.fingerprintValid || !right.fingerprintValid) fail("INPUT_INVALID");
  return sameRequestId ? "replay" : "independent";
}

/** Correlate a receipt/response with a trusted request binding. */
export function assertAgentOsV1QueueCompactResponseCorrelated(
  responseInput: unknown,
  bindingInput: unknown
): Readonly<AgentOsV1QueueCompactResponse> {
  const response = parseAgentOsV1QueueCompactResponse(responseInput);
  const binding = parseRequestBinding(bindingInput);
  if (!binding.fingerprintValid) fail("INPUT_INVALID");
  if (response.operation !== binding.operation) fail("STATE_CONFLICT");
  if (response.operation === AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION) {
    if (binding.operation !== AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION) fail("STATE_CONFLICT");
    if (!sameTarget(response.target, binding.target)) fail("STATE_CONFLICT");
    if (response.disposition === "not-modified") {
      if (binding.cursor === null || response.cursor !== binding.cursor) fail("STATE_CONFLICT");
    }
    return response;
  }
  if (response.operation === AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION) {
    if (binding.operation !== AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION) fail("STATE_CONFLICT");
    if (!sameTarget(response.target, binding.target)) fail("STATE_CONFLICT");
    if (
      response.filter !== binding.filter ||
      response.expectedRevision !== binding.expectedRevision ||
      response.requestFingerprint !== binding.requestFingerprint ||
      response.acceptedRevision < response.expectedRevision ||
      response.changedCount > AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxItems
    )
      fail("STATE_CONFLICT");
    return response;
  }
  if (binding.operation !== AGENT_OS_V1_SESSION_COMPACT_OPERATION) fail("STATE_CONFLICT");
  if (!sameTarget(response.target, binding.target)) fail("STATE_CONFLICT");
  if (response.requestFingerprint !== binding.requestFingerprint) fail("STATE_CONFLICT");
  return response;
}

export const assertAgentOsV1QueueCompactReceiptCorrelated =
  assertAgentOsV1QueueCompactResponseCorrelated;

/** Create a protocol-only injected owner seam for admission and dispatch. */
export function createAgentOsV1QueueCompactReferenceClient(
  optionsInput: unknown
): AgentOsV1QueueCompactReferenceClient {
  const clientOptions = captureReferenceClientOptions(optionsInput);
  const admit = clientOptions.admit;
  const dispatch = clientOptions.dispatch;

  const request = async (
    envelopeInput: unknown,
    requestOptionsInput?: unknown
  ): Promise<Readonly<AgentOsV1QueueCompactReferenceResult>> => {
    const envelope = parseRequestIdentity(envelopeInput);
    const options = parseReferenceOptions(requestOptionsInput);
    const binding = createAgentOsV1QueueCompactRequestBinding({
      requestId: envelope.requestId,
      request: envelope.request,
    });
    assertSignalUsable(options.signal);
    if (isSignalAborted(options.signal)) throw createAbortError();

    let replay = false;
    if (options.existingBinding !== undefined) {
      const comparison = assertAgentOsV1QueueCompactRequestBindingCompatible(
        options.existingBinding,
        binding
      );
      if (comparison === "independent") fail("RECOVERY_REQUIRED");
      replay = true;
      if (options.freshAdmission !== true)
        return deepFreeze({ disposition: "replay_requires_fresh_admission", binding });
    }
    if (options.freshAdmission !== true) fail("OWNER_UNAVAILABLE");

    const admissionContext = Object.freeze({
      requestId: envelope.requestId,
      request: envelope.request,
      requestBinding: binding,
      replay,
      signal: options.signal,
    });
    const admissionPending = callOwner(() => admit(admissionContext));
    let admissionResult: unknown;
    try {
      admissionResult = await raceReferenceDispatch(admissionPending, options.signal);
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
      throw mapOwnerError(error);
    }
    const freshAdmission = parseFreshAdmission(admissionResult, binding);

    const dispatchContext = Object.freeze({
      requestId: envelope.requestId,
      request: envelope.request,
      requestBinding: binding,
      replay,
      freshAdmission,
      signal: options.signal,
    });
    const pending = callOwner(() => dispatch(dispatchContext));
    let response: unknown;
    try {
      response = await raceReferenceDispatch(pending, options.signal);
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
      throw mapOwnerError(error);
    }
    try {
      return deepFreeze({
        disposition: "accepted",
        response: assertAgentOsV1QueueCompactResponseCorrelated(response, binding),
      });
    } catch (error: unknown) {
      if (isContractError(error)) throw error;
      throw new AgentOsV1QueueCompactContractError("OWNER_UNAVAILABLE");
    }
  };

  return deepFreeze({ request });
}

// Convenient aliases for callers that name the three operations directly.
export const parseAgentOsV1QueueReadRequest = parseAgentOsV1PromptQueueReadRequest;
export const parseAgentOsV1QueueClearRequest = parseAgentOsV1PromptQueueClearRequest;
export const parseAgentOsV1CompactRequest = parseAgentOsV1SessionCompactRequest;

function parsePromptQueueReadValue(
  value: Record<string, unknown>
): Readonly<AgentOsV1PromptQueueReadRequest> {
  exact(value, ["schemaVersion", "operation", "target", "cursor"]);
  exactCommon(value, AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION);
  const target = parseQueueTarget(value.target);
  const cursor = value.cursor === null ? null : opaqueText(value.cursor, 1_024);
  return deepFreeze({
    schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
    operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
    target,
    cursor,
  });
}

function parsePromptQueueClearValue(
  value: Record<string, unknown>
): Readonly<AgentOsV1PromptQueueClearRequest> {
  exact(value, ["schemaVersion", "operation", "target", "filter", "expectedRevision"]);
  exactCommon(value, AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION);
  const target = parseQueueTarget(value.target);
  const filter = queueFilter(value.filter);
  const expectedRevision = nonNegativeInteger(value.expectedRevision);
  return deepFreeze({
    schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
    operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
    target,
    filter,
    expectedRevision,
  });
}

function parseSessionCompactValue(
  value: Record<string, unknown>
): Readonly<AgentOsV1SessionCompactRequest> {
  exact(value, ["schemaVersion", "operation", "target"]);
  exactCommon(value, AGENT_OS_V1_SESSION_COMPACT_OPERATION);
  const target = parseCompactTarget(value.target);
  return deepFreeze({
    schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
    operation: AGENT_OS_V1_SESSION_COMPACT_OPERATION,
    target,
  });
}

function parseQueueItems(
  input: unknown,
  queueRevision: number
): readonly Readonly<AgentOsV1PromptQueueItem>[] {
  if (!Array.isArray(input)) fail("INPUT_INVALID");
  if (input.length > AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxItems) fail("INPUT_INVALID");
  const items: AgentOsV1PromptQueueItem[] = [];
  const itemIds = new Set<string>();
  let previousRevision = -1;
  for (const itemInput of input) {
    const item = objectValue(itemInput);
    exact(item, ["itemId", "kind", "status", "instructionDigest", "revision"]);
    const itemId = identifierText(item.itemId, AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxItemIdUtf8Bytes);
    const kind = queueItemKind(item.kind);
    const status = queueItemStatus(item.status);
    const instructionDigest = digest(item.instructionDigest);
    const revision = nonNegativeInteger(item.revision);
    if (itemIds.has(itemId) || revision <= previousRevision || revision > queueRevision)
      fail("INPUT_INVALID");
    itemIds.add(itemId);
    previousRevision = revision;
    items.push({ itemId, kind, status, instructionDigest, revision });
  }
  return deepFreeze(items);
}

function parseQueueTarget(input: unknown): Readonly<AgentOsV1PromptQueueTarget> {
  const target = objectValue(input);
  exact(target, ["sessionId", "runId", "attemptId", "storeGeneration"]);
  return deepFreeze({
    sessionId: identifierText(
      target.sessionId,
      AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxSessionIdUtf8Bytes
    ),
    runId: identifierText(target.runId, AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxRunIdUtf8Bytes),
    attemptId: identifierText(
      target.attemptId,
      AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxAttemptIdUtf8Bytes
    ),
    storeGeneration: positiveInteger(target.storeGeneration),
  });
}

function parseCompactTarget(input: unknown): Readonly<AgentOsV1SessionCompactTarget> {
  const target = objectValue(input);
  exact(target, ["sessionId", "sourceRunId", "storeGeneration", "sourceContextDigest"]);
  return deepFreeze({
    sessionId: identifierText(
      target.sessionId,
      AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxSessionIdUtf8Bytes
    ),
    sourceRunId: identifierText(
      target.sourceRunId,
      AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxSourceRunIdUtf8Bytes
    ),
    storeGeneration: positiveInteger(target.storeGeneration),
    sourceContextDigest: digest(target.sourceContextDigest),
  });
}

function parseRequestIdentity(input: unknown): {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1QueueCompactRequest>;
} {
  const wrapper = copyPlainData(input);
  exact(wrapper, ["requestId", "request"]);
  return {
    requestId: identifierText(
      wrapper.requestId,
      AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxRequestIdUtf8Bytes
    ),
    request: parseAgentOsV1QueueCompactRequest(wrapper.request),
  };
}

function parseRequestBinding(input: unknown): ParsedRequestBinding {
  const value = copyPlainData(input);
  const operation = operationValue(value.operation);
  if (operation === AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION) {
    exact(value, ["requestId", "operation", "target", "cursor", "requestFingerprint"]);
    const requestId = identifierText(
      value.requestId,
      AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxRequestIdUtf8Bytes
    );
    const target = parseQueueTarget(value.target);
    const cursor = value.cursor === null ? null : opaqueText(value.cursor, 1_024);
    const requestFingerprint = digest(value.requestFingerprint);
    const expected = requestFingerprintFromParts({
      requestId,
      request: {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation,
        target,
        cursor,
      },
    });
    return deepFreeze({
      requestId,
      operation,
      target,
      cursor,
      requestFingerprint,
      fingerprintValid: requestFingerprint === expected,
    });
  }
  if (operation === AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION) {
    exact(value, [
      "requestId",
      "operation",
      "target",
      "filter",
      "expectedRevision",
      "requestFingerprint",
    ]);
    const requestId = identifierText(
      value.requestId,
      AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxRequestIdUtf8Bytes
    );
    const target = parseQueueTarget(value.target);
    const filter = queueFilter(value.filter);
    const expectedRevision = nonNegativeInteger(value.expectedRevision);
    const requestFingerprint = digest(value.requestFingerprint);
    const expected = requestFingerprintFromParts({
      requestId,
      request: {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation,
        target,
        filter,
        expectedRevision,
      },
    });
    return deepFreeze({
      requestId,
      operation,
      target,
      filter,
      expectedRevision,
      requestFingerprint,
      fingerprintValid: requestFingerprint === expected,
    });
  }
  exact(value, ["requestId", "operation", "target", "requestFingerprint"]);
  const requestId = identifierText(
    value.requestId,
    AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxRequestIdUtf8Bytes
  );
  const target = parseCompactTarget(value.target);
  const requestFingerprint = digest(value.requestFingerprint);
  const expected = requestFingerprintFromParts({
    requestId,
    request: {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation,
      target,
    },
  });
  return deepFreeze({
    requestId,
    operation,
    target,
    requestFingerprint,
    fingerprintValid: requestFingerprint === expected,
  });
}

type ParsedRequestBinding =
  | (AgentOsV1PromptQueueReadRequestBinding & { readonly fingerprintValid: boolean })
  | (AgentOsV1PromptQueueClearRequestBinding & { readonly fingerprintValid: boolean })
  | (AgentOsV1SessionCompactRequestBinding & { readonly fingerprintValid: boolean });

type AgentOsV1QueueCompactRequestBindingParts =
  | Omit<AgentOsV1PromptQueueReadRequestBinding, "requestFingerprint">
  | Omit<AgentOsV1PromptQueueClearRequestBinding, "requestFingerprint">
  | Omit<AgentOsV1SessionCompactRequestBinding, "requestFingerprint">;

function bindingParts(identity: {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1QueueCompactRequest>;
}): AgentOsV1QueueCompactRequestBindingParts {
  const request = identity.request;
  if (request.operation === AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION)
    return {
      requestId: identity.requestId,
      operation: request.operation,
      target: request.target,
      cursor: request.cursor,
    };
  if (request.operation === AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION)
    return {
      requestId: identity.requestId,
      operation: request.operation,
      target: request.target,
      filter: request.filter,
      expectedRevision: request.expectedRevision,
    };
  return { requestId: identity.requestId, operation: request.operation, target: request.target };
}

function requestFingerprintFromIdentity(identity: {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1QueueCompactRequest>;
}): string {
  return requestFingerprintFromParts(identity);
}

function requestFingerprintFromParts(input: {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1QueueCompactRequest>;
}): string {
  return contentDigest(
    canonicalJson({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: input.request.operation,
      requestId: input.requestId,
      request: input.request,
    })
  );
}

function sameBindingIdentity(left: ParsedRequestBinding, right: ParsedRequestBinding): boolean {
  if (left.operation !== right.operation || !sameTarget(left.target, right.target)) return false;
  if (left.operation === AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION) {
    return (
      right.operation === AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION && left.cursor === right.cursor
    );
  }
  if (left.operation === AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION) {
    return (
      right.operation === AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION &&
      left.filter === right.filter &&
      left.expectedRevision === right.expectedRevision
    );
  }
  return right.operation === AGENT_OS_V1_SESSION_COMPACT_OPERATION;
}

function exactCommon(
  value: Record<string, unknown>,
  operation: AgentOsV1QueueCompactOperation
): void {
  if (value.schemaVersion !== AGENT_OS_V1_QUEUE_COMPACT_SCHEMA) fail("INPUT_INVALID");
  if (value.operation !== operation) fail("INPUT_INVALID");
}

function operationValue(value: unknown): AgentOsV1QueueCompactOperation {
  if (
    value === AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION ||
    value === AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION ||
    value === AGENT_OS_V1_SESSION_COMPACT_OPERATION
  )
    return value;
  fail("INPUT_INVALID");
}

function queueFilter(value: unknown): AgentOsV1QueueClearFilter {
  if (value === "steer" || value === "follow_up" || value === "all") return value;
  fail("INPUT_INVALID");
}

function queueItemKind(value: unknown): AgentOsV1PromptQueueItemKind {
  if (value === "steer" || value === "follow_up") return value;
  fail("INPUT_INVALID");
}

function queueItemStatus(value: unknown): AgentOsV1PromptQueueItemStatus {
  if (
    value === "queued" ||
    value === "claimed" ||
    value === "context_applied" ||
    value === "applied" ||
    value === "cancelled" ||
    value === "recovery_required"
  )
    return value;
  fail("INPUT_INVALID");
}

function parseFreshAdmission(
  input: unknown,
  binding: Readonly<AgentOsV1QueueCompactRequestBinding>
): Readonly<AgentOsV1QueueCompactFreshAdmission> {
  const value = copyPlainData(input);
  exact(value, ["kind", "requestId", "requestFingerprint"]);
  if (value.kind !== "fresh-admission") fail("INPUT_INVALID");
  const requestId = identifierText(
    value.requestId,
    AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxRequestIdUtf8Bytes
  );
  const requestFingerprint = digest(value.requestFingerprint);
  if (requestId !== binding.requestId || requestFingerprint !== binding.requestFingerprint)
    fail("OWNER_UNAVAILABLE");
  return deepFreeze({ kind: "fresh-admission", requestId, requestFingerprint });
}

interface ParsedReferenceOptions {
  readonly existingBinding: unknown;
  readonly freshAdmission?: boolean;
  readonly signal?: AbortSignal;
}

function captureReferenceClientOptions(
  input: unknown
): AgentOsV1QueueCompactReferenceClientOptions {
  const value = shallowPlainData(input, ["admit", "dispatch"]);
  exact(value, ["admit", "dispatch"]);
  if (typeof value.admit !== "function" || typeof value.dispatch !== "function")
    fail("INPUT_INVALID");
  return {
    admit: value.admit as AgentOsV1QueueCompactReferenceAdmit,
    dispatch: value.dispatch as AgentOsV1QueueCompactReferenceDispatch,
  };
}

function parseReferenceOptions(input: unknown): ParsedReferenceOptions {
  if (input === undefined)
    return { existingBinding: undefined, freshAdmission: undefined, signal: undefined };
  const value = shallowPlainData(input, ["existingBinding", "freshAdmission", "signal"]);
  const signal = value.signal;
  if (signal !== undefined && (signal === null || typeof signal !== "object"))
    fail("INPUT_INVALID");
  if (value.freshAdmission !== undefined && typeof value.freshAdmission !== "boolean")
    fail("INPUT_INVALID");
  return {
    existingBinding: value.existingBinding,
    freshAdmission: value.freshAdmission as boolean | undefined,
    signal: signal as AbortSignal | undefined,
  };
}

function callOwner(callback: () => unknown | Promise<unknown>): Promise<unknown> {
  try {
    return Promise.resolve(callback());
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}

function mapOwnerError(error: unknown): AgentOsV1QueueCompactContractError {
  if (isContractError(error)) return new AgentOsV1QueueCompactContractError(error.code);
  return new AgentOsV1QueueCompactContractError("OWNER_UNAVAILABLE");
}

function isContractError(error: unknown): error is AgentOsV1QueueCompactContractError {
  return typeof error === "object" && error !== null && CONTRACT_ERRORS.has(error);
}

function shallowPlainData(input: unknown, allowedKeys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) fail("INPUT_INVALID");
  if (isProxyObject(input)) fail("INPUT_INVALID");
  let prototype: object | null;
  let symbols: symbol[];
  let descriptors: Record<string, PropertyDescriptor>;
  try {
    prototype = Object.getPrototypeOf(input);
    symbols = Object.getOwnPropertySymbols(input);
    descriptors = Object.getOwnPropertyDescriptors(input);
  } catch {
    fail("INPUT_INVALID");
  }
  if (prototype !== Object.prototype || symbols.length !== 0) fail("INPUT_INVALID");
  const keys = Object.keys(descriptors);
  if (keys.some((key) => !allowedKeys.includes(key))) fail("INPUT_INVALID");
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail("INPUT_INVALID");
    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: descriptor.value,
      writable: true,
    });
  }
  return output;
}

interface CopyState {
  readonly seen: WeakSet<object>;
  totalUtf8Bytes: number;
}

function copyPlainData(input: unknown): Record<string, unknown> {
  const state: CopyState = { seen: new WeakSet<object>(), totalUtf8Bytes: 0 };
  const copied = copyValue(input, state, 0);
  if (copied === null || typeof copied !== "object" || Array.isArray(copied)) fail("INPUT_INVALID");
  return copied as Record<string, unknown>;
}

function copyValue(input: unknown, state: CopyState, depth: number): unknown {
  if (input === null) return null;
  if (typeof input === "string") {
    countUtf8(input, state);
    return input;
  }
  if (typeof input === "boolean") return input;
  if (typeof input === "number") {
    if (!Number.isSafeInteger(input)) fail("INPUT_INVALID");
    return input;
  }
  if (typeof input !== "object") fail("INPUT_INVALID");
  if (isProxyObject(input)) fail("INPUT_INVALID");
  if (depth >= AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxDepth) fail("INPUT_INVALID");
  if (state.seen.has(input)) fail("INPUT_INVALID");
  state.seen.add(input);
  if (Array.isArray(input)) return copyArray(input, state, depth);

  let prototype: object | null;
  let symbols: symbol[];
  let descriptors: Record<string, PropertyDescriptor>;
  try {
    prototype = Object.getPrototypeOf(input);
    symbols = Object.getOwnPropertySymbols(input);
    descriptors = Object.getOwnPropertyDescriptors(input);
  } catch {
    fail("INPUT_INVALID");
  }
  if (prototype !== Object.prototype || symbols.length !== 0) fail("INPUT_INVALID");
  const keys = Object.keys(descriptors);
  if (keys.length > AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxWidth) fail("INPUT_INVALID");
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    countUtf8(key, state);
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail("INPUT_INVALID");
    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: copyValue(descriptor.value, state, depth + 1),
      writable: true,
    });
  }
  checkStructuredClone(input);
  return output;
}

function copyArray(input: readonly unknown[], state: CopyState, depth: number): readonly unknown[] {
  let prototype: object | null;
  let symbols: symbol[];
  let descriptors: Record<string, PropertyDescriptor>;
  try {
    prototype = Object.getPrototypeOf(input);
    symbols = Object.getOwnPropertySymbols(input);
    descriptors = Object.getOwnPropertyDescriptors(input);
  } catch {
    fail("INPUT_INVALID");
  }
  if (prototype !== Array.prototype || symbols.length !== 0) fail("INPUT_INVALID");
  const lengthDescriptor = descriptors.length;
  if (
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxWidth
  )
    fail("INPUT_INVALID");
  const length = lengthDescriptor.value;
  const ownKeys = Object.keys(descriptors);
  const expectedKeys = ["length", ...Array.from({ length }, (_, index) => String(index))];
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some((key) => !expectedKeys.includes(key)) ||
    expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key))
  )
    fail("INPUT_INVALID");
  const output: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail("INPUT_INVALID");
    countUtf8(key, state);
    output.push(copyValue(descriptor.value, state, depth + 1));
  }
  checkStructuredClone(input);
  return output;
}

function checkStructuredClone(input: object): void {
  if (
    typeof TRUSTED_STRUCTURED_CLONE !== "function" ||
    globalThis.structuredClone !== TRUSTED_STRUCTURED_CLONE
  )
    fail("INPUT_INVALID");
  try {
    Reflect.apply(TRUSTED_STRUCTURED_CLONE, globalThis, [input]);
  } catch {
    fail("INPUT_INVALID");
  }
}

interface BuiltinProcessHost {
  readonly getBuiltinModule?: (specifier: string) => unknown;
}

interface TrustedUtilTypes {
  readonly isProxy?: (value: object) => boolean;
}

function captureTrustedIsProxy(): ((value: object) => boolean) | undefined {
  try {
    const host = (globalThis as typeof globalThis & { readonly process?: BuiltinProcessHost })
      .process;
    const getBuiltinModule = host?.getBuiltinModule;
    if (typeof getBuiltinModule !== "function") return undefined;
    const util = Reflect.apply(getBuiltinModule, host, ["node:util"]);
    if (util === null || typeof util !== "object") return undefined;
    const types = (util as { readonly types?: TrustedUtilTypes }).types;
    const isProxy = types?.isProxy;
    if (typeof isProxy !== "function") return undefined;
    return (value: object): boolean => {
      try {
        return Reflect.apply(isProxy, types, [value]) === true;
      } catch {
        return true;
      }
    };
  } catch {
    return undefined;
  }
}

function isProxyObject(value: object): boolean {
  return TRUSTED_IS_PROXY?.(value) === true;
}

function captureAbortSignalIntrinsics():
  | Readonly<{
      readonly aborted: (...args: never[]) => unknown;
      readonly addEventListener: (...args: never[]) => unknown;
      readonly removeEventListener: (...args: never[]) => unknown;
    }>
  | undefined {
  try {
    const constructor = globalThis.AbortSignal;
    if (typeof constructor !== "function") return undefined;
    const prototype = constructor.prototype;
    const aborted = findPropertyDescriptor(prototype, "aborted")?.get;
    const addEventListener = findPropertyDescriptor(prototype, "addEventListener")?.value;
    const removeEventListener = findPropertyDescriptor(prototype, "removeEventListener")?.value;
    if (
      typeof aborted !== "function" ||
      typeof addEventListener !== "function" ||
      typeof removeEventListener !== "function"
    )
      return undefined;
    return Object.freeze({ aborted, addEventListener, removeEventListener });
  } catch {
    return undefined;
  }
}

function findPropertyDescriptor(start: object, key: string): PropertyDescriptor | undefined {
  let current: object | null = start;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) return descriptor;
    current = Object.getPrototypeOf(current);
  }
  return undefined;
}

function assertSignalUsable(signal: AbortSignal | undefined): void {
  if (signal === undefined) return;
  if (ABORT_SIGNAL_INTRINSICS === undefined) fail("INPUT_INVALID");
  try {
    Reflect.apply(ABORT_SIGNAL_INTRINSICS.aborted, signal, []);
  } catch {
    fail("INPUT_INVALID");
  }
}

function isSignalAborted(signal: AbortSignal | undefined): boolean {
  if (signal === undefined) return false;
  if (ABORT_SIGNAL_INTRINSICS === undefined) fail("INPUT_INVALID");
  try {
    return Reflect.apply(ABORT_SIGNAL_INTRINSICS.aborted, signal, []) === true;
  } catch {
    fail("INPUT_INVALID");
  }
}

function raceReferenceDispatch(promise: Promise<unknown>, signal: AbortSignal | undefined) {
  if (signal === undefined) return promise;
  if (isSignalAborted(signal)) return Promise.reject(createAbortError());
  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      if (ABORT_SIGNAL_INTRINSICS === undefined) return;
      try {
        Reflect.apply(ABORT_SIGNAL_INTRINSICS.removeEventListener, signal, ["abort", onAbort]);
      } catch {
        return;
      }
    };
    const settle = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const onAbort = (): void => settle(() => reject(createAbortError()));
    try {
      if (ABORT_SIGNAL_INTRINSICS === undefined) fail("INPUT_INVALID");
      Reflect.apply(ABORT_SIGNAL_INTRINSICS.addEventListener, signal, [
        "abort",
        onAbort,
        { once: true },
      ]);
    } catch (error: unknown) {
      settle(() => reject(error));
      return;
    }
    promise.then(
      (value) => settle(() => resolve(value)),
      (error: unknown) => settle(() => reject(error))
    );
    if (isSignalAborted(signal)) onAbort();
  });
}

function createAbortError(): Error {
  const error = new Error("The operation was aborted");
  Object.defineProperty(error, "name", {
    configurable: true,
    enumerable: false,
    value: "AbortError",
    writable: true,
  });
  ABORT_ERRORS.add(error);
  return error;
}

function isAbortError(error: unknown): error is Error {
  return typeof error === "object" && error !== null && ABORT_ERRORS.has(error);
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("INPUT_INVALID");
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, expected: readonly string[]): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    fail("INPUT_INVALID");
}

function identifierText(value: unknown, maxBytes: number): string {
  if (
    typeof value !== "string" ||
    !IDENTIFIER_PATTERN.test(value) ||
    new TextEncoder().encode(value).byteLength > maxBytes
  )
    fail("INPUT_INVALID");
  return value;
}

function opaqueText(value: unknown, maxBytes: number): string {
  if (typeof value !== "string" || value.length === 0) fail("INPUT_INVALID");
  if (new TextEncoder().encode(value).byteLength > maxBytes) fail("INPUT_INVALID");
  return value;
}

function positiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    fail("INPUT_INVALID");
  return value;
}

function nonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) fail("INPUT_INVALID");
  return value;
}

function digest(value: unknown): string {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail("INPUT_INVALID");
  return value;
}

function countUtf8(value: string, state: CopyState): void {
  state.totalUtf8Bytes += new TextEncoder().encode(value).byteLength;
  if (state.totalUtf8Bytes > AGENT_OS_V1_QUEUE_COMPACT_LIMITS.maxTotalUtf8Bytes)
    fail("INPUT_INVALID");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("INPUT_INVALID");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  fail("INPUT_INVALID");
}

function contentDigest(source: string): string {
  return `sha256:${sha256Hex(source)}`;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function sameTarget(
  left: Readonly<AgentOsV1QueueCompactTarget>,
  right: Readonly<AgentOsV1QueueCompactTarget>
): boolean {
  if (isQueueTarget(left) && isQueueTarget(right)) {
    return (
      left.sessionId === right.sessionId &&
      left.runId === right.runId &&
      left.attemptId === right.attemptId &&
      left.storeGeneration === right.storeGeneration
    );
  }
  if (isCompactTarget(left) && isCompactTarget(right)) {
    return (
      left.sessionId === right.sessionId &&
      left.sourceRunId === right.sourceRunId &&
      left.storeGeneration === right.storeGeneration &&
      left.sourceContextDigest === right.sourceContextDigest
    );
  }
  return false;
}

function isQueueTarget(value: AgentOsV1QueueCompactTarget): value is AgentOsV1PromptQueueTarget {
  return "runId" in value;
}

function isCompactTarget(
  value: AgentOsV1QueueCompactTarget
): value is AgentOsV1SessionCompactTarget {
  return "sourceRunId" in value;
}

function fail(code: AgentOsV1QueueCompactContractErrorCode): never {
  throw new AgentOsV1QueueCompactContractError(code);
}

function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLength = BigInt(bytes.length) * 8n;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  for (let index = 0; index < 8; index += 1)
    data[paddedLength - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 0xffn);
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  for (let offset = 0; offset < data.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1)
      words[index] =
        (data[offset + index * 4]! << 24) |
        (data[offset + index * 4 + 1]! << 16) |
        (data[offset + index * 4 + 2]! << 8) |
        data[offset + index * 4 + 3]!;
    for (let index = 16; index < 64; index += 1)
      words[index] =
        (small1(words[index - 2]!) +
          words[index - 7]! +
          small0(words[index - 15]!) +
          words[index - 16]!) >>>
        0;
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const temporary1 =
        (h! + big1(e!) + choose(e!, f!, g!) + SHA256_CONSTANTS[index]! + words[index]!) >>> 0;
      const temporary2 = (big0(a!) + majority(a!, b!, c!)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d! + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    state[0] = (state[0]! + a!) >>> 0;
    state[1] = (state[1]! + b!) >>> 0;
    state[2] = (state[2]! + c!) >>> 0;
    state[3] = (state[3]! + d!) >>> 0;
    state[4] = (state[4]! + e!) >>> 0;
    state[5] = (state[5]! + f!) >>> 0;
    state[6] = (state[6]! + g!) >>> 0;
    state[7] = (state[7]! + h!) >>> 0;
  }
  return [...state].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function rotate(value: number, by: number): number {
  return (value >>> by) | (value << (32 - by));
}

function choose(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

function majority(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

function big0(x: number): number {
  return rotate(x, 2) ^ rotate(x, 13) ^ rotate(x, 22);
}

function big1(x: number): number {
  return rotate(x, 6) ^ rotate(x, 11) ^ rotate(x, 25);
}

function small0(x: number): number {
  return rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3);
}

function small1(x: number): number {
  return rotate(x, 17) ^ rotate(x, 19) ^ (x >>> 10);
}

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;
