/**
 * Protocol-only session.read projection contract.
 *
 * The specialized payload deliberately does not carry an execution envelope,
 * tenant/principal/authority pins, or content. An execution.v1 owner may carry
 * this payload in its own envelope in a later slice.
 */

import { deepFreeze, sha256Hex } from "./contract-primitives.js";

export const AGENT_OS_V1_SESSION_PROJECTION_SCHEMA = "agent-os-session-projection/v1" as const;
export const AGENT_OS_V1_SESSION_PROJECTION_OPERATION = "session.read" as const;

export const AGENT_OS_V1_SESSION_PROJECTION_LIMITS = Object.freeze({
  maxDepth: 8,
  maxWidth: 32,
  maxTotalUtf8Bytes: 16_384,
  maxRequestIdUtf8Bytes: 128,
  maxSessionIdUtf8Bytes: 128,
  maxCursorUtf8Bytes: 1_024,
});

const AGENT_OS_V1_SESSION_PROJECTION_IDENTIFIER_PATTERN = /^[a-z][a-z0-9._/-]{0,127}$/u;

export type AgentOsV1SessionProjectionContractErrorCode =
  | "NOT_FOUND"
  | "SOURCE_CHANGED"
  | "METADATA_CORRUPT"
  | "CURSOR_SNAPSHOT_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "INPUT_INVALID";

export class AgentOsV1SessionProjectionContractError extends Error {
  constructor(
    readonly code: AgentOsV1SessionProjectionContractErrorCode,
    message = code
  ) {
    super(message);
    this.name = "AgentOsV1SessionProjectionContractError";
  }
}

export interface AgentOsV1SessionProjectionReadRequest {
  readonly schemaVersion: typeof AGENT_OS_V1_SESSION_PROJECTION_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_SESSION_PROJECTION_OPERATION;
  readonly sessionId: string;
  readonly cursor: string | null;
}

export type AgentOsV1SessionProjectionTurnStatus =
  | "preparing"
  | "running"
  | "waiting"
  | "unknown"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "manual";

export interface AgentOsV1SessionProjectionTurn {
  readonly turnId: string;
  readonly runId: string;
  readonly turnSequence: number;
  readonly checkpointRevision: number;
  readonly status: AgentOsV1SessionProjectionTurnStatus;
}

export interface AgentOsV1SessionProjection {
  readonly generation: number;
  readonly projectionDigest: string;
  readonly contentPolicy: "omitted.v1";
  readonly turns: readonly Readonly<AgentOsV1SessionProjectionTurn>[];
}

export interface AgentOsV1SessionProjectionSnapshotResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_SESSION_PROJECTION_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_SESSION_PROJECTION_OPERATION;
  readonly sessionId: string;
  readonly disposition: "snapshot";
  readonly cursor: string;
  readonly projection: Readonly<AgentOsV1SessionProjection>;
}

export interface AgentOsV1SessionProjectionNotModifiedResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_SESSION_PROJECTION_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_SESSION_PROJECTION_OPERATION;
  readonly sessionId: string;
  readonly disposition: "not-modified";
  readonly cursor: string;
}

export interface AgentOsV1SessionProjectionSnapshotRequiredResponse {
  readonly schemaVersion: typeof AGENT_OS_V1_SESSION_PROJECTION_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_SESSION_PROJECTION_OPERATION;
  readonly sessionId: string;
  readonly disposition: "snapshot-required";
  readonly cursor: null;
}

export type AgentOsV1SessionProjectionReadResponse =
  | AgentOsV1SessionProjectionSnapshotResponse
  | AgentOsV1SessionProjectionNotModifiedResponse
  | AgentOsV1SessionProjectionSnapshotRequiredResponse;

export interface AgentOsV1SessionProjectionRequestBinding {
  readonly requestId: string;
  readonly sessionId: string;
  readonly cursor: string | null;
  readonly requestFingerprint: string;
}

export type AgentOsV1SessionProjectionRequestBindingComparison = "replay" | "independent";

/** Strictly parse and bounded-copy the specialized session.read payload. */
export function parseAgentOsV1SessionProjectionReadRequest(
  input: unknown
): Readonly<AgentOsV1SessionProjectionReadRequest> {
  const value = copyPlainData(input);
  exact(value, ["schemaVersion", "operation", "sessionId", "cursor"]);

  if (value.schemaVersion !== AGENT_OS_V1_SESSION_PROJECTION_SCHEMA) fail("INPUT_INVALID");
  if (value.operation !== AGENT_OS_V1_SESSION_PROJECTION_OPERATION) fail("INPUT_INVALID");

  const sessionId = identifierText(
    value.sessionId,
    AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxSessionIdUtf8Bytes
  );
  const cursor =
    value.cursor === null
      ? null
      : opaqueText(value.cursor, AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxCursorUtf8Bytes);

  return deepFreeze({
    schemaVersion: AGENT_OS_V1_SESSION_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_SESSION_PROJECTION_OPERATION,
    sessionId,
    cursor,
  });
}

/** Strictly parse the atomic projection read response discriminated union. */
export function parseAgentOsV1SessionProjectionReadResponse(
  input: unknown
): Readonly<AgentOsV1SessionProjectionReadResponse> {
  const value = copyPlainData(input);
  if (value.schemaVersion !== AGENT_OS_V1_SESSION_PROJECTION_SCHEMA) fail("INPUT_INVALID");
  if (value.operation !== AGENT_OS_V1_SESSION_PROJECTION_OPERATION) fail("INPUT_INVALID");
  const sessionId = identifierText(
    value.sessionId,
    AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxSessionIdUtf8Bytes
  );

  if (value.disposition === "snapshot") {
    exact(value, [
      "schemaVersion",
      "operation",
      "sessionId",
      "disposition",
      "cursor",
      "projection",
    ]);
    const cursor = opaqueText(
      value.cursor,
      AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxCursorUtf8Bytes
    );
    const projection = parseProjection(value.projection, sessionId);
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_SESSION_PROJECTION_SCHEMA,
      operation: AGENT_OS_V1_SESSION_PROJECTION_OPERATION,
      sessionId,
      disposition: "snapshot",
      cursor,
      projection,
    });
  }
  if (value.disposition === "not-modified") {
    exact(value, ["schemaVersion", "operation", "sessionId", "disposition", "cursor"]);
    const cursor = opaqueText(
      value.cursor,
      AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxCursorUtf8Bytes
    );
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_SESSION_PROJECTION_SCHEMA,
      operation: AGENT_OS_V1_SESSION_PROJECTION_OPERATION,
      sessionId,
      disposition: "not-modified",
      cursor,
    });
  }
  if (value.disposition === "snapshot-required") {
    exact(value, ["schemaVersion", "operation", "sessionId", "disposition", "cursor"]);
    if (value.cursor !== null) fail("INPUT_INVALID");
    return deepFreeze({
      schemaVersion: AGENT_OS_V1_SESSION_PROJECTION_SCHEMA,
      operation: AGENT_OS_V1_SESSION_PROJECTION_OPERATION,
      sessionId,
      disposition: "snapshot-required",
      cursor: null,
    });
  }
  fail("INPUT_INVALID");
}

function parseProjection(value: unknown, sessionId: string): Readonly<AgentOsV1SessionProjection> {
  const normalized = projectionUnsigned(value);
  if (normalized.projectionDigest === undefined) fail("INPUT_INVALID");
  if (normalized.projectionDigest !== projectionDigestFor(sessionId, normalized.projection))
    fail("METADATA_CORRUPT");
  return deepFreeze({ ...normalized.projection, projectionDigest: normalized.projectionDigest });
}

/** Canonical source used for the projection content digest. */
export function canonicalAgentOsV1SessionProjectionSource(input: {
  readonly sessionId: unknown;
  readonly projection: unknown;
}): string {
  const value = copyPlainData(input);
  exact(value, ["sessionId", "projection"]);
  const sessionId = identifierText(
    value.sessionId,
    AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxSessionIdUtf8Bytes
  );
  const normalized = projectionUnsigned(value.projection);
  if (
    normalized.projectionDigest !== undefined &&
    normalized.projectionDigest !== projectionDigestFor(sessionId, normalized.projection)
  )
    fail("METADATA_CORRUPT");
  return canonicalProjectionSource(sessionId, normalized.projection);
}

/** Generate the deterministic content digest for a projection payload. */
export function createAgentOsV1SessionProjectionDigest(input: {
  readonly sessionId: unknown;
  readonly projection: unknown;
}): string {
  return contentDigest(canonicalAgentOsV1SessionProjectionSource(input));
}

/** Canonical source used for the request idempotency fingerprint. */
export function canonicalAgentOsV1SessionProjectionRequestSource(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): string {
  const { requestId, request } = parseRequestIdentity(input);
  return canonicalRequestSource(requestId, request.sessionId, request.cursor);
}

/** Generate a deterministic request fingerprint bound to requestId/session/cursor. */
export function createAgentOsV1SessionProjectionRequestFingerprint(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): string {
  return contentDigest(canonicalAgentOsV1SessionProjectionRequestSource(input));
}

/** Create an immutable request binding without retaining caller-owned input. */
export function createAgentOsV1SessionProjectionRequestBinding(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): Readonly<AgentOsV1SessionProjectionRequestBinding> {
  const { requestId, request } = parseRequestIdentity(input);
  return deepFreeze({
    requestId,
    sessionId: request.sessionId,
    cursor: request.cursor,
    requestFingerprint: requestFingerprintFromParts(requestId, request.sessionId, request.cursor),
  });
}

/**
 * Compare two immutable bindings. This helper has no registry or cache: an
 * exact requestId/fingerprint pair is replay, while a different requestId is
 * independent. Same-id drift is a stable idempotency conflict.
 */
export function assertAgentOsV1SessionProjectionRequestBindingCompatible(
  existing: unknown,
  incoming: unknown
): AgentOsV1SessionProjectionRequestBindingComparison {
  const left = parseRequestBinding(existing);
  const right = parseRequestBinding(incoming);
  const sameRequestId = left.requestId === right.requestId;
  if (
    sameRequestId &&
    (left.sessionId !== right.sessionId ||
      left.cursor !== right.cursor ||
      left.requestFingerprint !== right.requestFingerprint)
  )
    fail("IDEMPOTENCY_CONFLICT");
  if (!left.fingerprintValid || !right.fingerprintValid) fail("METADATA_CORRUPT");
  if (!sameRequestId) return "independent";
  return "replay";
}

interface ParsedRequestBinding extends AgentOsV1SessionProjectionRequestBinding {
  readonly fingerprintValid: boolean;
}

function parseRequestBinding(input: unknown): ParsedRequestBinding {
  const value = copyPlainData(input);
  exact(value, ["requestId", "sessionId", "cursor", "requestFingerprint"]);
  const requestId = identifierText(
    value.requestId,
    AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxRequestIdUtf8Bytes
  );
  const sessionId = identifierText(
    value.sessionId,
    AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxSessionIdUtf8Bytes
  );
  const cursor =
    value.cursor === null
      ? null
      : opaqueText(value.cursor, AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxCursorUtf8Bytes);
  const requestFingerprint = digest(value.requestFingerprint);
  const expectedFingerprint = requestFingerprintFromParts(requestId, sessionId, cursor);
  return deepFreeze({
    requestId,
    sessionId,
    cursor,
    requestFingerprint: expectedFingerprint,
    fingerprintValid: requestFingerprint === expectedFingerprint,
  });
}

function copyRequestBindingInput(input: unknown): {
  readonly requestId: unknown;
  readonly request: unknown;
} {
  const value = copyPlainData(input);
  exact(value, ["requestId", "request"]);
  return { requestId: value.requestId, request: value.request };
}

function parseRequestIdentity(input: unknown): {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1SessionProjectionReadRequest>;
} {
  const wrapper = copyRequestBindingInput(input);
  return {
    requestId: identifierText(
      wrapper.requestId,
      AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxRequestIdUtf8Bytes
    ),
    request: parseAgentOsV1SessionProjectionReadRequest(wrapper.request),
  };
}

function canonicalRequestSource(
  requestId: string,
  sessionId: string,
  cursor: string | null
): string {
  return canonicalJson({
    schemaVersion: AGENT_OS_V1_SESSION_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_SESSION_PROJECTION_OPERATION,
    requestId,
    sessionId,
    cursor,
  });
}

function requestFingerprintFromParts(
  requestId: string,
  sessionId: string,
  cursor: string | null
): string {
  return contentDigest(canonicalRequestSource(requestId, sessionId, cursor));
}

interface ProjectionParts {
  readonly projection: {
    readonly generation: number;
    readonly contentPolicy: "omitted.v1";
    readonly turns: readonly Readonly<AgentOsV1SessionProjectionTurn>[];
  };
  readonly projectionDigest?: string;
}

function projectionUnsigned(input: unknown): ProjectionParts {
  const value = objectValue(copyPlainData(input));
  const hasDigest = Object.prototype.hasOwnProperty.call(value, "projectionDigest");
  exact(
    value,
    hasDigest
      ? ["generation", "projectionDigest", "contentPolicy", "turns"]
      : ["generation", "contentPolicy", "turns"]
  );
  const generation = value.generation;
  if (typeof generation !== "number" || !Number.isSafeInteger(generation) || generation <= 0)
    fail("INPUT_INVALID");
  if (value.contentPolicy !== "omitted.v1") fail("INPUT_INVALID");
  if (!Array.isArray(value.turns)) fail("INPUT_INVALID");
  const turns: AgentOsV1SessionProjectionTurn[] = [];
  let previousSequence = 0;
  for (const item of value.turns) {
    const turn = objectValue(item);
    exact(turn, ["turnId", "runId", "turnSequence", "checkpointRevision", "status"]);
    const turnId = opaqueText(
      turn.turnId,
      AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxSessionIdUtf8Bytes
    );
    const runId = opaqueText(
      turn.runId,
      AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxSessionIdUtf8Bytes
    );
    if (
      typeof turn.turnSequence !== "number" ||
      !Number.isSafeInteger(turn.turnSequence) ||
      turn.turnSequence <= previousSequence
    )
      fail("INPUT_INVALID");
    const checkpointRevision = turn.checkpointRevision;
    if (
      typeof checkpointRevision !== "number" ||
      !Number.isSafeInteger(checkpointRevision) ||
      checkpointRevision < 0
    )
      fail("INPUT_INVALID");
    if (!isTurnStatus(turn.status)) fail("INPUT_INVALID");
    previousSequence = turn.turnSequence;
    turns.push({
      turnId,
      runId,
      turnSequence: turn.turnSequence,
      checkpointRevision,
      status: turn.status,
    });
  }
  return {
    projection: { generation, contentPolicy: "omitted.v1", turns },
    projectionDigest: hasDigest ? digest(value.projectionDigest) : undefined,
  };
}

function canonicalProjectionSource(
  sessionId: string,
  projection: ProjectionParts["projection"]
): string {
  return canonicalJson({
    schemaVersion: AGENT_OS_V1_SESSION_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_SESSION_PROJECTION_OPERATION,
    sessionId,
    ...projection,
  });
}

function projectionDigestFor(sessionId: string, projection: ProjectionParts["projection"]): string {
  return contentDigest(canonicalProjectionSource(sessionId, projection));
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
    const input = value as Record<string, unknown>;
    return `{${Object.keys(input)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`)
      .join(",")}}`;
  }
  fail("INPUT_INVALID");
}

function contentDigest(source: string): string {
  return `sha256:${sha256Hex(source)}`;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("INPUT_INVALID");
  return value as Record<string, unknown>;
}

function isTurnStatus(value: unknown): value is AgentOsV1SessionProjectionTurnStatus {
  return (
    value === "preparing" ||
    value === "running" ||
    value === "waiting" ||
    value === "unknown" ||
    value === "succeeded" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "manual"
  );
}

function digest(value: unknown): string {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value)) fail("INPUT_INVALID");
  return value;
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
  if (depth >= AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxDepth) fail("INPUT_INVALID");
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
  if (keys.length > AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxWidth) fail("INPUT_INVALID");
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

    const child = copyValue(descriptor.value, state, depth + 1);
    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: child,
      writable: true,
    });
  }

  // A transparent Proxy is otherwise observationally equivalent to a plain
  // object. structuredClone rejects proxies; descriptor validation above
  // ensures ordinary accessors are rejected before clone inspection.
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
    lengthDescriptor.value > AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxWidth
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
  let clone: typeof globalThis.structuredClone;
  try {
    clone = globalThis.structuredClone;
  } catch {
    fail("INPUT_INVALID");
  }
  if (typeof clone !== "function") fail("INPUT_INVALID");
  try {
    clone(input);
  } catch {
    fail("INPUT_INVALID");
  }
}

function countUtf8(value: string, state: CopyState): void {
  const bytes = new TextEncoder().encode(value).byteLength;
  state.totalUtf8Bytes += bytes;
  if (state.totalUtf8Bytes > AGENT_OS_V1_SESSION_PROJECTION_LIMITS.maxTotalUtf8Bytes)
    fail("INPUT_INVALID");
}

function identifierText(value: unknown, maxBytes: number): string {
  if (
    typeof value !== "string" ||
    !AGENT_OS_V1_SESSION_PROJECTION_IDENTIFIER_PATTERN.test(value) ||
    new TextEncoder().encode(value).byteLength > maxBytes
  )
    fail("INPUT_INVALID");
  return value;
}

function opaqueText(value: unknown, maxBytes: number): string {
  if (typeof value !== "string" || value.length === 0) fail("INPUT_INVALID");
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) fail("INPUT_INVALID");
  }
  if (new TextEncoder().encode(value).byteLength > maxBytes) fail("INPUT_INVALID");
  return value;
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

function fail(code: AgentOsV1SessionProjectionContractErrorCode): never {
  throw new AgentOsV1SessionProjectionContractError(code);
}
