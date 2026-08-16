/**
 * Protocol-only provider.read metadata projection contract.
 *
 * The specialized DTOs deliberately omit provider status/use, endpoint,
 * credential, authentication, transport, storage, and execution authority.
 * A future execution.v1 owner may carry this payload in its own envelope.
 */

export const AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA = "agent-os-provider-projection/v1" as const;
export const AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION = "provider.read" as const;
export const AGENT_OS_V1_PROVIDER_READ_OPERATION = AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION;

export const AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS = Object.freeze({
  maxDepth: 8,
  maxWidth: 32,
  maxTotalUtf8Bytes: 16_384,
  maxRequestIdUtf8Bytes: 128,
  maxSessionIdUtf8Bytes: 128,
  maxCursorUtf8Bytes: 1_024,
  maxProviderIdUtf8Bytes: 128,
  maxModelIdUtf8Bytes: 128,
});

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._/-]{0,127}$/u;
const TRUSTED_REFLECT_APPLY: typeof Reflect.apply = Reflect.apply;
const TRUSTED_TEXT_ENCODER_CONSTRUCTOR: typeof TextEncoder | undefined =
  typeof globalThis.TextEncoder === "function" ? globalThis.TextEncoder : undefined;
const TRUSTED_TEXT_ENCODER_ENCODE: ((this: TextEncoder, input: string) => Uint8Array) | undefined =
  TRUSTED_TEXT_ENCODER_CONSTRUCTOR === undefined
    ? undefined
    : findPropertyDescriptor(TRUSTED_TEXT_ENCODER_CONSTRUCTOR.prototype, "encode")?.value;
const TRUSTED_STRUCTURED_CLONE =
  typeof globalThis.structuredClone === "function" ? globalThis.structuredClone : undefined;
const TRUSTED_IS_PROXY = captureTrustedIsProxy();
const ABORT_SIGNAL_INTRINSICS = captureAbortSignalIntrinsics();
const CONTRACT_ERRORS = new WeakSet<object>();
const ABORT_ERRORS = new WeakSet<object>();

export type AgentOsV1ProviderProjectionContractErrorCode =
  | "INPUT_INVALID"
  | "TARGET_NOT_CURRENT"
  | "METADATA_CORRUPT"
  | "IDEMPOTENCY_CONFLICT"
  | "RECOVERY_REQUIRED"
  | "OWNER_UNAVAILABLE";

export class AgentOsV1ProviderProjectionContractError extends Error {
  readonly code: AgentOsV1ProviderProjectionContractErrorCode;

  constructor(code: AgentOsV1ProviderProjectionContractErrorCode, _message = code) {
    const safeCode = isKnownContractErrorCode(code) ? code : "OWNER_UNAVAILABLE";
    super(safeCode);
    this.code = safeCode;
    Object.defineProperty(this, "code", {
      configurable: false,
      enumerable: true,
      value: safeCode,
      writable: false,
    });
    this.name = "AgentOsV1ProviderProjectionContractError";
    CONTRACT_ERRORS.add(this);
  }
}

export interface AgentOsV1ProviderProjectionTarget {
  readonly sessionId: string;
  readonly storeGeneration: number;
}

export type AgentOsV1ProviderProjectionSelectionState = "selected" | "unselected" | "unknown";

export interface AgentOsV1ProviderProjection {
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly selectionState: AgentOsV1ProviderProjectionSelectionState;
  readonly contentPolicy: "metadata-only.v1";
}

export interface AgentOsV1ProviderProjectionReadRequest {
  readonly schemaVersion: typeof AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION;
  readonly target: Readonly<AgentOsV1ProviderProjectionTarget>;
  readonly cursor: string | null;
}

export interface AgentOsV1ProviderProjectionSnapshotResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION;
  readonly target: Readonly<AgentOsV1ProviderProjectionTarget>;
  readonly disposition: "snapshot";
  readonly cursor: string;
  readonly projectionRevision: number;
  readonly projectionDigest: string;
  readonly projection: Readonly<AgentOsV1ProviderProjection>;
}

export interface AgentOsV1ProviderProjectionNotModifiedResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION;
  readonly target: Readonly<AgentOsV1ProviderProjectionTarget>;
  readonly disposition: "not-modified";
  readonly cursor: string;
  readonly projectionRevision: number;
  readonly projectionDigest: string;
}

export interface AgentOsV1ProviderProjectionSnapshotRequiredResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION;
  readonly target: Readonly<AgentOsV1ProviderProjectionTarget>;
  readonly disposition: "snapshot-required";
  readonly cursor: null;
  readonly projectionRevision: number;
  readonly projectionDigest: string;
}

export type AgentOsV1ProviderProjectionReadResponse =
  | AgentOsV1ProviderProjectionSnapshotResponse
  | AgentOsV1ProviderProjectionNotModifiedResponse
  | AgentOsV1ProviderProjectionSnapshotRequiredResponse;

export interface AgentOsV1ProviderProjectionRequestBinding {
  readonly requestId: string;
  readonly target: Readonly<AgentOsV1ProviderProjectionTarget>;
  readonly cursor: string | null;
  readonly requestFingerprint: string;
}

export type AgentOsV1ProviderProjectionRequestBindingComparison = "replay" | "independent";

export interface AgentOsV1ProviderProjectionFreshAdmission {
  readonly kind: "fresh-admission";
  readonly requestId: string;
  readonly requestFingerprint: string;
}

export interface AgentOsV1ProviderProjectionReferenceAdmissionContext {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1ProviderProjectionReadRequest>;
  readonly requestBinding: Readonly<AgentOsV1ProviderProjectionRequestBinding>;
  readonly signal?: AbortSignal;
}

export interface AgentOsV1ProviderProjectionReferenceReadContext extends AgentOsV1ProviderProjectionReferenceAdmissionContext {
  readonly freshAdmission: Readonly<AgentOsV1ProviderProjectionFreshAdmission>;
}

export type AgentOsV1ProviderProjectionReferenceAdmit = (
  context: Readonly<AgentOsV1ProviderProjectionReferenceAdmissionContext>
) => unknown | Promise<unknown>;

export type AgentOsV1ProviderProjectionReferenceRead = (
  context: Readonly<AgentOsV1ProviderProjectionReferenceReadContext>
) => unknown | Promise<unknown>;

export interface AgentOsV1ProviderProjectionReferenceClientOptions {
  readonly admit: AgentOsV1ProviderProjectionReferenceAdmit;
  readonly read: AgentOsV1ProviderProjectionReferenceRead;
}

export type AgentOsV1ProviderProjectionReferenceResult =
  | Readonly<{
      readonly disposition: "accepted";
      readonly response: Readonly<AgentOsV1ProviderProjectionReadResponse>;
    }>
  | Readonly<{
      readonly disposition: "replay_requires_fresh_admission";
      readonly binding: Readonly<AgentOsV1ProviderProjectionRequestBinding>;
    }>;

export interface AgentOsV1ProviderProjectionReferenceClient {
  readonly request: (
    envelopeInput: unknown,
    optionsInput?: unknown
  ) => Promise<Readonly<AgentOsV1ProviderProjectionReferenceResult>>;
}

/** Strictly parse one provider.read request into copied, deeply frozen data. */
export function parseAgentOsV1ProviderProjectionReadRequest(
  input: unknown
): Readonly<AgentOsV1ProviderProjectionReadRequest> {
  const value = copyPlainData(input);
  exact(value, ["schemaVersion", "operation", "target", "cursor"]);
  if (value.schemaVersion !== AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA) fail("INPUT_INVALID");
  if (value.operation !== AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION) fail("INPUT_INVALID");
  const target = parseTarget(value.target);
  const cursor = value.cursor === null ? null : opaqueText(value.cursor, maxCursorBytes());
  return deepFreeze({
    schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
    target,
    cursor,
  });
}

/** Strictly parse the bounded provider projection response union. */
export function parseAgentOsV1ProviderProjectionReadResponse(
  input: unknown
): Readonly<AgentOsV1ProviderProjectionReadResponse> {
  const value = copyPlainData(input);
  if (value.schemaVersion !== AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA) fail("INPUT_INVALID");
  if (value.operation !== AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION) fail("INPUT_INVALID");
  const target = parseTarget(value.target);
  const projectionRevision = nonNegativeInteger(value.projectionRevision);
  const projectionDigest = digest(value.projectionDigest);
  if (value.disposition === "snapshot") {
    exact(value, [
      "schemaVersion",
      "operation",
      "target",
      "disposition",
      "cursor",
      "projectionRevision",
      "projectionDigest",
      "projection",
    ]);
    const cursor = opaqueText(value.cursor, maxCursorBytes());
    const projection = parseProjection(value.projection);
    if (projectionDigest !== projectionDigestFor(target, projectionRevision, projection))
      fail("METADATA_CORRUPT");
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
      operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
      target,
      disposition: "snapshot",
      cursor,
      projectionRevision,
      projectionDigest,
      projection,
    });
  }
  if (value.disposition === "not-modified") {
    exact(value, [
      "schemaVersion",
      "operation",
      "target",
      "disposition",
      "cursor",
      "projectionRevision",
      "projectionDigest",
    ]);
    const cursor = opaqueText(value.cursor, maxCursorBytes());
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
      operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
      target,
      disposition: "not-modified",
      cursor,
      projectionRevision,
      projectionDigest,
    });
  }
  if (value.disposition === "snapshot-required") {
    exact(value, [
      "schemaVersion",
      "operation",
      "target",
      "disposition",
      "cursor",
      "projectionRevision",
      "projectionDigest",
    ]);
    if (value.cursor !== null) fail("INPUT_INVALID");
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
      operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
      target,
      disposition: "snapshot-required",
      cursor: null,
      projectionRevision,
      projectionDigest,
    });
  }
  fail("INPUT_INVALID");
}

export const parseAgentOsV1ProviderProjectionResponse =
  parseAgentOsV1ProviderProjectionReadResponse;

/** Canonical source for the metadata projection digest. */
export function canonicalAgentOsV1ProviderProjectionSource(input: {
  readonly target: unknown;
  readonly projectionRevision: unknown;
  readonly projection: unknown;
}): string {
  const value = copyPlainData(input);
  exact(value, ["target", "projectionRevision", "projection"]);
  const target = parseTarget(value.target);
  const projectionRevision = nonNegativeInteger(value.projectionRevision);
  const projection = parseProjection(value.projection);
  return canonicalJson({
    schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
    target,
    projectionRevision,
    projection,
  });
}

export function createAgentOsV1ProviderProjectionDigest(input: {
  readonly target: unknown;
  readonly projectionRevision: unknown;
  readonly projection: unknown;
}): string {
  return contentDigest(canonicalAgentOsV1ProviderProjectionSource(input));
}

/** Canonical source for request idempotency fingerprints. */
export function canonicalAgentOsV1ProviderProjectionRequestSource(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): string {
  const identity = parseRequestIdentity(input);
  return canonicalJson({
    schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
    requestId: identity.requestId,
    target: identity.request.target,
    cursor: identity.request.cursor,
  });
}

export function createAgentOsV1ProviderProjectionRequestFingerprint(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): string {
  return contentDigest(canonicalAgentOsV1ProviderProjectionRequestSource(input));
}

export function createAgentOsV1ProviderProjectionRequestBinding(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): Readonly<AgentOsV1ProviderProjectionRequestBinding> {
  const identity = parseRequestIdentity(input);
  return deepFreeze({
    requestId: identity.requestId,
    target: identity.request.target,
    cursor: identity.request.cursor,
    requestFingerprint: requestFingerprintFromIdentity(identity),
  });
}

/** Compare bindings without a registry or cache. */
export function assertAgentOsV1ProviderProjectionRequestBindingCompatible(
  existing: unknown,
  incoming: unknown
): AgentOsV1ProviderProjectionRequestBindingComparison {
  const left = parseRequestBinding(existing);
  const right = parseRequestBinding(incoming);
  const sameRequestId = left.requestId === right.requestId;
  if (
    sameRequestId &&
    (!sameTarget(left.target, right.target) ||
      left.cursor !== right.cursor ||
      left.requestFingerprint !== right.requestFingerprint)
  )
    fail("IDEMPOTENCY_CONFLICT");
  if (!left.fingerprintValid || !right.fingerprintValid) fail("METADATA_CORRUPT");
  return sameRequestId ? "replay" : "independent";
}

/** Correlate an owner response against a trusted request binding. */
export function assertAgentOsV1ProviderProjectionResponseCorrelated(
  responseInput: unknown,
  bindingInput: unknown
): Readonly<AgentOsV1ProviderProjectionReadResponse> {
  const response = parseAgentOsV1ProviderProjectionReadResponse(responseInput);
  const binding = parseRequestBinding(bindingInput);
  if (!binding.fingerprintValid) fail("METADATA_CORRUPT");
  if (!sameTarget(response.target, binding.target)) fail("METADATA_CORRUPT");
  if (response.disposition === "not-modified") {
    if (binding.cursor === null || response.cursor !== binding.cursor) fail("METADATA_CORRUPT");
  }
  if (response.disposition === "snapshot-required" && binding.cursor === null)
    fail("METADATA_CORRUPT");
  return response;
}

export const assertAgentOsV1ProviderProjectionReadResponseCorrelated =
  assertAgentOsV1ProviderProjectionResponseCorrelated;

/** Create the protocol-only injected owner seam for admission and metadata read. */
export function createAgentOsV1ProviderProjectionReferenceClient(
  optionsInput: unknown
): AgentOsV1ProviderProjectionReferenceClient {
  const clientOptions = captureReferenceClientOptions(optionsInput);
  const admit = clientOptions.admit;
  const read = clientOptions.read;

  const request = async (
    envelopeInput: unknown,
    requestOptionsInput?: unknown
  ): Promise<Readonly<AgentOsV1ProviderProjectionReferenceResult>> => {
    const envelope = parseRequestIdentity(envelopeInput);
    const options = parseReferenceOptions(requestOptionsInput);
    const binding = createAgentOsV1ProviderProjectionRequestBinding({
      requestId: envelope.requestId,
      request: envelope.request,
    });
    assertSignalUsable(options.signal);
    if (isSignalAborted(options.signal)) throw createAbortError();

    if (options.existingBinding !== undefined) {
      const comparison = assertAgentOsV1ProviderProjectionRequestBindingCompatible(
        options.existingBinding,
        binding
      );
      if (comparison === "independent") fail("RECOVERY_REQUIRED");
      if (options.freshAdmission !== true)
        return deepFreeze({ disposition: "replay_requires_fresh_admission", binding });
    }
    if (options.freshAdmission !== true) fail("OWNER_UNAVAILABLE");

    const admissionContext = Object.freeze({
      requestId: envelope.requestId,
      request: envelope.request,
      requestBinding: binding,
      signal: options.signal,
    });
    let admissionResult: unknown;
    try {
      admissionResult = await raceReferenceRead(
        callOwner(() => admit(admissionContext)),
        options.signal
      );
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
      throw mapOwnerError(error);
    }
    let freshAdmission: Readonly<AgentOsV1ProviderProjectionFreshAdmission>;
    try {
      freshAdmission = parseFreshAdmission(admissionResult, binding);
    } catch {
      throw new AgentOsV1ProviderProjectionContractError("OWNER_UNAVAILABLE");
    }
    const readContext = Object.freeze({
      requestId: envelope.requestId,
      request: envelope.request,
      requestBinding: binding,
      freshAdmission,
      signal: options.signal,
    });
    let response: unknown;
    try {
      response = await raceReferenceRead(
        callOwner(() => read(readContext)),
        options.signal
      );
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
      throw mapOwnerError(error);
    }
    try {
      return deepFreeze({
        disposition: "accepted",
        response: assertAgentOsV1ProviderProjectionResponseCorrelated(response, binding),
      });
    } catch (error: unknown) {
      if (isContractError(error)) throw error;
      throw new AgentOsV1ProviderProjectionContractError("OWNER_UNAVAILABLE");
    }
  };

  return deepFreeze({ request });
}

export const createAgentOsV1ProviderProjectionClient =
  createAgentOsV1ProviderProjectionReferenceClient;

interface ParsedRequestBinding extends AgentOsV1ProviderProjectionRequestBinding {
  readonly fingerprintValid: boolean;
}

function parseTarget(input: unknown): Readonly<AgentOsV1ProviderProjectionTarget> {
  const value = objectValue(input);
  exact(value, ["sessionId", "storeGeneration"]);
  return deepFreeze({
    sessionId: identifierText(value.sessionId, maxSessionIdBytes()),
    storeGeneration: positiveInteger(value.storeGeneration),
  });
}

function parseProjection(input: unknown): Readonly<AgentOsV1ProviderProjection> {
  const value = objectValue(input);
  exact(value, ["providerId", "modelId", "selectionState", "contentPolicy"]);
  const providerId = nullableIdentifier(value.providerId, maxProviderIdBytes());
  const modelId = nullableIdentifier(value.modelId, maxModelIdBytes());
  if (
    value.selectionState !== "selected" &&
    value.selectionState !== "unselected" &&
    value.selectionState !== "unknown"
  )
    fail("INPUT_INVALID");
  if (value.contentPolicy !== "metadata-only.v1") fail("INPUT_INVALID");
  return deepFreeze({
    providerId,
    modelId,
    selectionState: value.selectionState,
    contentPolicy: "metadata-only.v1",
  });
}

function parseRequestIdentity(input: unknown): {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1ProviderProjectionReadRequest>;
} {
  const value = copyPlainData(input);
  exact(value, ["requestId", "request"]);
  return {
    requestId: identifierText(value.requestId, maxRequestIdBytes()),
    request: parseAgentOsV1ProviderProjectionReadRequest(value.request),
  };
}

function parseRequestBinding(input: unknown): ParsedRequestBinding {
  const value = copyPlainData(input);
  exact(value, ["requestId", "target", "cursor", "requestFingerprint"]);
  const requestId = identifierText(value.requestId, maxRequestIdBytes());
  const target = parseTarget(value.target);
  const cursor = value.cursor === null ? null : opaqueText(value.cursor, maxCursorBytes());
  const requestFingerprint = digest(value.requestFingerprint);
  const expectedFingerprint = requestFingerprintFromParts(requestId, target, cursor);
  return deepFreeze({
    requestId,
    target,
    cursor,
    requestFingerprint,
    fingerprintValid: requestFingerprint === expectedFingerprint,
  });
}

function requestFingerprintFromIdentity(identity: {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1ProviderProjectionReadRequest>;
}): string {
  return requestFingerprintFromParts(
    identity.requestId,
    identity.request.target,
    identity.request.cursor
  );
}

function requestFingerprintFromParts(
  requestId: string,
  target: Readonly<AgentOsV1ProviderProjectionTarget>,
  cursor: string | null
): string {
  return contentDigest(
    canonicalJson({
      schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
      operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
      requestId,
      target,
      cursor,
    })
  );
}

function projectionDigestFor(
  target: Readonly<AgentOsV1ProviderProjectionTarget>,
  projectionRevision: number,
  projection: Readonly<AgentOsV1ProviderProjection>
): string {
  return contentDigest(
    canonicalJson({
      schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
      operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
      target,
      projectionRevision,
      projection,
    })
  );
}

function sameTarget(
  left: Readonly<AgentOsV1ProviderProjectionTarget>,
  right: Readonly<AgentOsV1ProviderProjectionTarget>
): boolean {
  return left.sessionId === right.sessionId && left.storeGeneration === right.storeGeneration;
}

interface ParsedReferenceOptions {
  readonly existingBinding: unknown;
  readonly freshAdmission?: boolean;
  readonly signal?: AbortSignal;
}

function captureReferenceClientOptions(
  input: unknown
): AgentOsV1ProviderProjectionReferenceClientOptions {
  const value = shallowPlainData(input, ["admit", "read"]);
  exact(value, ["admit", "read"]);
  if (typeof value.admit !== "function" || typeof value.read !== "function") fail("INPUT_INVALID");
  return {
    admit: value.admit as AgentOsV1ProviderProjectionReferenceAdmit,
    read: value.read as AgentOsV1ProviderProjectionReferenceRead,
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

function parseFreshAdmission(
  input: unknown,
  binding: Readonly<AgentOsV1ProviderProjectionRequestBinding>
): Readonly<AgentOsV1ProviderProjectionFreshAdmission> {
  const value = copyPlainData(input);
  exact(value, ["kind", "requestId", "requestFingerprint"]);
  if (value.kind !== "fresh-admission") fail("INPUT_INVALID");
  const requestId = identifierText(value.requestId, maxRequestIdBytes());
  const requestFingerprint = digest(value.requestFingerprint);
  if (requestId !== binding.requestId || requestFingerprint !== binding.requestFingerprint)
    fail("OWNER_UNAVAILABLE");
  return deepFreeze({ kind: "fresh-admission", requestId, requestFingerprint });
}

function callOwner(callback: () => unknown | Promise<unknown>): Promise<unknown> {
  try {
    return Promise.resolve(callback());
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}

function mapOwnerError(error: unknown): AgentOsV1ProviderProjectionContractError {
  if (isContractError(error)) {
    return new AgentOsV1ProviderProjectionContractError(
      isKnownContractErrorCode(error.code) ? error.code : "OWNER_UNAVAILABLE"
    );
  }
  return new AgentOsV1ProviderProjectionContractError("OWNER_UNAVAILABLE");
}

function isKnownContractErrorCode(
  value: unknown
): value is AgentOsV1ProviderProjectionContractErrorCode {
  return (
    value === "INPUT_INVALID" ||
    value === "TARGET_NOT_CURRENT" ||
    value === "METADATA_CORRUPT" ||
    value === "IDEMPOTENCY_CONFLICT" ||
    value === "RECOVERY_REQUIRED" ||
    value === "OWNER_UNAVAILABLE"
  );
}

function isContractError(error: unknown): error is AgentOsV1ProviderProjectionContractError {
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
  if (depth >= AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxDepth) fail("INPUT_INVALID");
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
  if (keys.length > AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxWidth) fail("INPUT_INVALID");
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
    lengthDescriptor.value > AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxWidth
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
  let currentClone: typeof globalThis.structuredClone;
  try {
    currentClone = globalThis.structuredClone;
  } catch {
    fail("INPUT_INVALID");
  }
  if (typeof TRUSTED_STRUCTURED_CLONE !== "function" || currentClone !== TRUSTED_STRUCTURED_CLONE)
    fail("INPUT_INVALID");
  try {
    TRUSTED_REFLECT_APPLY(TRUSTED_STRUCTURED_CLONE, globalThis, [input]);
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
    const util = TRUSTED_REFLECT_APPLY(getBuiltinModule, host, ["node:util"]);
    if (util === null || typeof util !== "object") return undefined;
    const types = (util as { readonly types?: TrustedUtilTypes }).types;
    const isProxy = types?.isProxy;
    if (typeof isProxy !== "function") return undefined;
    return (value: object): boolean => {
      try {
        return TRUSTED_REFLECT_APPLY(isProxy, types, [value]) === true;
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
    TRUSTED_REFLECT_APPLY(ABORT_SIGNAL_INTRINSICS.aborted, signal, []);
  } catch {
    fail("INPUT_INVALID");
  }
}

function isSignalAborted(signal: AbortSignal | undefined): boolean {
  if (signal === undefined) return false;
  if (ABORT_SIGNAL_INTRINSICS === undefined) fail("INPUT_INVALID");
  try {
    return TRUSTED_REFLECT_APPLY(ABORT_SIGNAL_INTRINSICS.aborted, signal, []) === true;
  } catch {
    fail("INPUT_INVALID");
  }
}

function raceReferenceRead(
  promise: Promise<unknown>,
  signal: AbortSignal | undefined
): Promise<unknown> {
  if (signal === undefined) return promise;
  if (isSignalAborted(signal)) return Promise.reject(createAbortError());
  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      if (ABORT_SIGNAL_INTRINSICS === undefined) return;
      try {
        TRUSTED_REFLECT_APPLY(ABORT_SIGNAL_INTRINSICS.removeEventListener, signal, [
          "abort",
          onAbort,
        ]);
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
      TRUSTED_REFLECT_APPLY(ABORT_SIGNAL_INTRINSICS.addEventListener, signal, [
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

function identifierText(value: unknown, maximumBytes: number): string {
  if (
    typeof value !== "string" ||
    !IDENTIFIER_PATTERN.test(value) ||
    utf8Length(value) > maximumBytes
  )
    fail("INPUT_INVALID");
  return value;
}

function nullableIdentifier(value: unknown, maximumBytes: number): string | null {
  return value === null ? null : identifierText(value, maximumBytes);
}

function opaqueText(value: unknown, maximumBytes: number): string {
  if (typeof value !== "string" || value.length === 0) fail("INPUT_INVALID");
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) fail("INPUT_INVALID");
  }
  if (utf8Length(value) > maximumBytes) fail("INPUT_INVALID");
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
  state.totalUtf8Bytes += utf8Length(value);
  if (state.totalUtf8Bytes > AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxTotalUtf8Bytes)
    fail("INPUT_INVALID");
}

function utf8Length(value: string): number {
  if (TRUSTED_TEXT_ENCODER_CONSTRUCTOR === undefined || TRUSTED_TEXT_ENCODER_ENCODE === undefined)
    fail("INPUT_INVALID");
  const encoder = new TRUSTED_TEXT_ENCODER_CONSTRUCTOR();
  const encoded = TRUSTED_REFLECT_APPLY(TRUSTED_TEXT_ENCODER_ENCODE, encoder, [value]);
  if (!(encoded instanceof Uint8Array)) fail("INPUT_INVALID");
  return encoded.byteLength;
}

function maxCursorBytes(): number {
  return AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxCursorUtf8Bytes;
}

function maxSessionIdBytes(): number {
  return AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxSessionIdUtf8Bytes;
}

function maxRequestIdBytes(): number {
  return AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxRequestIdUtf8Bytes;
}

function maxProviderIdBytes(): number {
  return AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxProviderIdUtf8Bytes;
}

function maxModelIdBytes(): number {
  return AGENT_OS_V1_PROVIDER_PROJECTION_LIMITS.maxModelIdUtf8Bytes;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("INPUT_INVALID");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
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

function fail(code: AgentOsV1ProviderProjectionContractErrorCode): never {
  throw new AgentOsV1ProviderProjectionContractError(code);
}

function sha256Hex(input: string): string {
  const bytes = utf8Bytes(input);
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

function utf8Bytes(input: string): Uint8Array {
  if (TRUSTED_TEXT_ENCODER_CONSTRUCTOR === undefined || TRUSTED_TEXT_ENCODER_ENCODE === undefined)
    fail("INPUT_INVALID");
  const encoder = new TRUSTED_TEXT_ENCODER_CONSTRUCTOR();
  const encoded = TRUSTED_REFLECT_APPLY(TRUSTED_TEXT_ENCODER_ENCODE, encoder, [input]);
  if (!(encoded instanceof Uint8Array)) fail("INPUT_INVALID");
  return encoded;
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
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92b, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;
