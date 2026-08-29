/**
 * Protocol-only execution.v1 prompt control contract.
 *
 * The specialized payloads intentionally omit the execution envelope,
 * requestId, caller identity, authority, transport, and persistence facts.
 * A future execution.v1 owner may carry these values in its own envelope.
 */

import { deepFreeze, sha256Hex } from "./contract-primitives.js";

export const AGENT_OS_V1_PROMPT_CONTROL_SCHEMA =
  "agent-os-prompt-control/v1" as const;
export const AGENT_OS_V1_PROMPT_STEER_OPERATION = "prompt.steer" as const;
export const AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION =
  "prompt.follow-up" as const;

export const AGENT_OS_V1_PROMPT_CONTROL_LIMITS = Object.freeze({
  maxDepth: 8,
  maxWidth: 32,
  maxTotalUtf8Bytes: 65_536,
  maxRequestIdUtf8Bytes: 128,
  maxSessionIdUtf8Bytes: 128,
  maxRunIdUtf8Bytes: 128,
  maxAttemptIdUtf8Bytes: 128,
  maxInstructionBytes: 65_536,
});

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._/-]{0,127}$/u;

const TRUSTED_STRUCTURED_CLONE =
  typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone
    : undefined;

const ABORT_SIGNAL_INTRINSICS = captureAbortSignalIntrinsics();
const ABORT_ERRORS = new WeakSet<object>();

export type AgentOsV1PromptControlOperation =
  | typeof AGENT_OS_V1_PROMPT_STEER_OPERATION
  | typeof AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION;

export type AgentOsV1PromptControlContractErrorCode =
  | "INPUT_INVALID"
  | "TARGET_NOT_CURRENT"
  | "STATE_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "OWNER_UNAVAILABLE";

export class AgentOsV1PromptControlContractError extends Error {
  constructor(readonly code: AgentOsV1PromptControlContractErrorCode) {
    super(code);
    this.name = "AgentOsV1PromptControlContractError";
  }
}

export interface AgentOsV1PromptControlInstructionMessage {
  readonly role: "user";
  readonly content: string;
}

export interface AgentOsV1PromptControlInstruction {
  readonly messages: readonly Readonly<AgentOsV1PromptControlInstructionMessage>[];
}

/** The exact active-attempt identity used by both prompt controls. */
export interface AgentOsV1PromptControlTarget {
  readonly sessionId: string;
  readonly runId: string;
  readonly attemptId: string;
  readonly storeGeneration: number;
}

export interface AgentOsV1PromptSteerRequest {
  readonly schemaVersion: typeof AGENT_OS_V1_PROMPT_CONTROL_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROMPT_STEER_OPERATION;
  readonly target: Readonly<AgentOsV1PromptControlTarget>;
  readonly instruction: Readonly<AgentOsV1PromptControlInstruction>;
  readonly instructionDigest: string;
}

export interface AgentOsV1PromptFollowUpRequest {
  readonly schemaVersion: typeof AGENT_OS_V1_PROMPT_CONTROL_SCHEMA;
  readonly operation: typeof AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION;
  readonly predecessor: Readonly<AgentOsV1PromptControlTarget>;
  readonly instruction: Readonly<AgentOsV1PromptControlInstruction>;
  readonly instructionDigest: string;
}

export type AgentOsV1PromptControlRequest =
  | AgentOsV1PromptSteerRequest
  | AgentOsV1PromptFollowUpRequest;

/** Correlated owner receipt; requestId remains in the execution.v1 envelope. */
export interface AgentOsV1PromptControlReceipt {
  readonly operation: AgentOsV1PromptControlOperation;
  readonly sessionId: string;
  readonly target: Readonly<AgentOsV1PromptControlTarget>;
  readonly requestFingerprint: string;
  readonly acceptedRevision: number;
  readonly replayed: boolean;
}

export type AgentOsV1PromptControlResponse = AgentOsV1PromptControlReceipt;

export interface AgentOsV1PromptControlRequestBinding {
  readonly requestId: string;
  readonly operation: AgentOsV1PromptControlOperation;
  readonly sessionId: string;
  readonly target: Readonly<AgentOsV1PromptControlTarget>;
  readonly instructionDigest: string;
  readonly requestFingerprint: string;
}

export type AgentOsV1PromptControlRequestBindingComparison =
  | "replay"
  | "independent";

export interface AgentOsV1PromptControlFreshAdmission {
  readonly kind: "fresh-admission";
  readonly requestId: string;
  readonly requestFingerprint: string;
}

export interface AgentOsV1PromptControlReferenceDispatchContext {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1PromptControlRequest>;
  readonly requestBinding: Readonly<AgentOsV1PromptControlRequestBinding>;
  readonly freshAdmission: Readonly<AgentOsV1PromptControlFreshAdmission>;
  readonly signal?: AbortSignal;
}

export type AgentOsV1PromptControlReferenceDispatch = (
  context: Readonly<AgentOsV1PromptControlReferenceDispatchContext>,
) => unknown | Promise<unknown>;

export interface AgentOsV1PromptControlReferenceAdmissionContext {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1PromptControlRequest>;
  readonly requestBinding: Readonly<AgentOsV1PromptControlRequestBinding>;
  readonly signal?: AbortSignal;
}

export type AgentOsV1PromptControlReferenceAdmit = (
  context: Readonly<AgentOsV1PromptControlReferenceAdmissionContext>,
) => unknown | Promise<unknown>;

export interface AgentOsV1PromptControlReferenceClientOptions {
  readonly admit: AgentOsV1PromptControlReferenceAdmit;
  readonly dispatch: AgentOsV1PromptControlReferenceDispatch;
}

export type AgentOsV1PromptControlReferenceResult =
  | Readonly<{
      readonly disposition: "accepted";
      readonly receipt: Readonly<AgentOsV1PromptControlReceipt>;
    }>
  | Readonly<{
      readonly disposition: "replay_requires_fresh_admission";
      readonly binding: Readonly<AgentOsV1PromptControlRequestBinding>;
    }>;

export interface AgentOsV1PromptControlReferenceClient {
  readonly request: (
    envelopeInput: unknown,
    optionsInput?: unknown,
  ) => Promise<Readonly<AgentOsV1PromptControlReferenceResult>>;
}

/** Parse one exact prompt.steer payload into copied, deeply frozen plain data. */
export function parseAgentOsV1PromptSteerRequest(
  input: unknown,
): Readonly<AgentOsV1PromptSteerRequest> {
  const value = copyPlainData(input);
  return parseSteerValue(value);
}

/** Parse one exact prompt.follow-up payload into copied, deeply frozen plain data. */
export function parseAgentOsV1PromptFollowUpRequest(
  input: unknown,
): Readonly<AgentOsV1PromptFollowUpRequest> {
  const value = copyPlainData(input);
  return parseFollowUpValue(value);
}

/** Parse either of the two approved prompt control operations. */
export function parseAgentOsV1PromptControlRequest(
  input: unknown,
): Readonly<AgentOsV1PromptControlRequest> {
  const value = copyPlainData(input);
  if (value.operation === AGENT_OS_V1_PROMPT_STEER_OPERATION)
    return parseSteerValue(value);
  if (value.operation === AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION)
    return parseFollowUpValue(value);
  fail("INPUT_INVALID");
}

/** Parse the exact six-field correlated owner receipt. */
export function parseAgentOsV1PromptControlReceipt(
  input: unknown,
): Readonly<AgentOsV1PromptControlReceipt> {
  const value = copyPlainData(input);
  exact(value, [
    "operation",
    "sessionId",
    "target",
    "requestFingerprint",
    "acceptedRevision",
    "replayed",
  ]);
  const operation = operationValue(value.operation);
  const target = parseTarget(value.target, "receipt target");
  const sessionId = identifierText(
    value.sessionId,
    AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxSessionIdUtf8Bytes,
  );
  if (sessionId !== target.sessionId) fail("STATE_CONFLICT");
  const requestFingerprint = digest(value.requestFingerprint);
  if (
    typeof value.acceptedRevision !== "number" ||
    !Number.isSafeInteger(value.acceptedRevision) ||
    value.acceptedRevision < 0
  )
    fail("INPUT_INVALID");
  if (typeof value.replayed !== "boolean") fail("INPUT_INVALID");
  return deepFreeze({
    operation,
    sessionId,
    target,
    requestFingerprint,
    acceptedRevision: value.acceptedRevision,
    replayed: value.replayed,
  });
}

/** Alias matching the execution.v1 response terminology. */
export const parseAgentOsV1PromptControlResponse =
  parseAgentOsV1PromptControlReceipt;

/**
 * Validate receipt correlation against a fresh envelope binding. No registry,
 * cache, authority, or transport is consulted by this pure helper.
 */
export function assertAgentOsV1PromptControlReceiptCorrelated(
  receiptInput: unknown,
  bindingInput: unknown,
): Readonly<AgentOsV1PromptControlReceipt> {
  const receipt = parseAgentOsV1PromptControlReceipt(receiptInput);
  const binding = parseRequestBinding(bindingInput);
  if (!binding.fingerprintValid) fail("INPUT_INVALID");
  if (
    receipt.operation !== binding.operation ||
    receipt.sessionId !== binding.sessionId ||
    !sameTarget(receipt.target, binding.target) ||
    receipt.requestFingerprint !== binding.requestFingerprint
  )
    fail("STATE_CONFLICT");
  return receipt;
}

/** Alias for callers that use response terminology. */
export const assertAgentOsV1PromptControlResponseCorrelated =
  assertAgentOsV1PromptControlReceiptCorrelated;

/** Canonical source for the reusable execution.v1 prompt input digest. */
export function canonicalAgentOsV1PromptControlInstructionSource(
  input: unknown,
): string {
  const instruction = parseInstruction(copyPlainData(input));
  return canonicalJson({
    schemaVersion: "agent-os-canonical-prompt-input/v1",
    prompt: instruction,
  });
}

/** Compute the self-validating canonical instruction digest. */
export function createAgentOsV1PromptControlInstructionDigest(
  input: unknown,
): string {
  return contentDigest(canonicalAgentOsV1PromptControlInstructionSource(input));
}

/** Canonical source for request identity/fingerprint. */
export function canonicalAgentOsV1PromptControlRequestSource(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): string {
  const identity = parseRequestIdentity(input);
  return canonicalJson({
    schemaVersion: AGENT_OS_V1_PROMPT_CONTROL_SCHEMA,
    operation: identity.request.operation,
    requestId: identity.requestId,
    sessionId: identity.target.sessionId,
    target: identity.target,
    instructionDigest: identity.request.instructionDigest,
  });
}

/** Compute a deterministic fingerprint bound to the envelope requestId and payload. */
export function createAgentOsV1PromptControlRequestFingerprint(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): string {
  return contentDigest(canonicalAgentOsV1PromptControlRequestSource(input));
}

/** Create an immutable request binding from a request envelope seam. */
export function createAgentOsV1PromptControlRequestBinding(input: {
  readonly requestId: unknown;
  readonly request: unknown;
}): Readonly<AgentOsV1PromptControlRequestBinding> {
  const identity = parseRequestIdentity(input);
  return deepFreeze({
    requestId: identity.requestId,
    operation: identity.request.operation,
    sessionId: identity.target.sessionId,
    target: identity.target,
    instructionDigest: identity.request.instructionDigest,
    requestFingerprint: requestFingerprintFromIdentity(identity),
  });
}

/**
 * Compare bindings without a cache. Same requestId and exact binding is a
 * replay; a same-ID drift is an idempotency conflict; different IDs are
 * independent only after both fingerprints have been recomputed and checked.
 */
export function assertAgentOsV1PromptControlRequestBindingCompatible(
  existing: unknown,
  incoming: unknown,
): AgentOsV1PromptControlRequestBindingComparison {
  const left = parseRequestBinding(existing);
  const right = parseRequestBinding(incoming);
  const sameRequestId = left.requestId === right.requestId;
  if (
    sameRequestId &&
    (left.operation !== right.operation ||
      left.sessionId !== right.sessionId ||
      !sameTarget(left.target, right.target) ||
      left.instructionDigest !== right.instructionDigest ||
      left.requestFingerprint !== right.requestFingerprint)
  )
    fail("IDEMPOTENCY_CONFLICT");
  if (!left.fingerprintValid || !right.fingerprintValid) fail("INPUT_INVALID");
  return sameRequestId ? "replay" : "independent";
}

/**
 * Create a protocol-only injected client seam. The caller supplies the owner
 * admission and dispatch; this helper only parses, correlates, and gates
 * admission/waiting. Caller input can request admission but cannot provide it.
 */
export function createAgentOsV1PromptControlReferenceClient(
  optionsInput: unknown,
): AgentOsV1PromptControlReferenceClient {
  const clientOptions = captureReferenceClientOptions(optionsInput);
  const admit = clientOptions.admit;
  const dispatch = clientOptions.dispatch;

  const request = async (
    envelopeInput: unknown,
    optionsInput?: unknown,
  ): Promise<Readonly<AgentOsV1PromptControlReferenceResult>> => {
    const envelope = parseRequestIdentity(envelopeInput);
    const options = parseReferenceOptions(optionsInput);
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: envelope.requestId,
      request: envelope.request,
    });
    assertSignalUsable(options.signal);
    if (isSignalAborted(options.signal)) throw createAbortError();

    if (options.existingBinding !== undefined) {
      const comparison = assertAgentOsV1PromptControlRequestBindingCompatible(
        options.existingBinding,
        binding,
      );
      if (comparison !== "replay") fail("IDEMPOTENCY_CONFLICT");
      if (comparison === "replay" && options.freshAdmission !== true)
        return deepFreeze({
          disposition: "replay_requires_fresh_admission",
          binding,
        });
    }

    if (options.freshAdmission !== true) fail("OWNER_UNAVAILABLE");

    const admissionContext = Object.freeze({
      requestId: envelope.requestId,
      request: envelope.request,
      requestBinding: binding,
      signal: options.signal,
    });
    let admissionPending: Promise<unknown>;
    try {
      admissionPending = Promise.resolve(admit(admissionContext));
    } catch (error: unknown) {
      admissionPending = Promise.reject(error);
    }
    let admissionResult: unknown;
    try {
      admissionResult = await raceReferenceDispatch(
        admissionPending,
        options.signal,
      );
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
      fail("OWNER_UNAVAILABLE");
    }
    const freshAdmission = parseFreshAdmission(admissionResult, binding);

    const context = Object.freeze({
      requestId: envelope.requestId,
      request: envelope.request,
      requestBinding: binding,
      freshAdmission,
      signal: options.signal,
    });
    let pending: Promise<unknown>;
    try {
      pending = Promise.resolve(dispatch(context));
    } catch (error: unknown) {
      pending = Promise.reject(error);
    }
    let response: unknown;
    try {
      response = await raceReferenceDispatch(pending, options.signal);
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
      fail("OWNER_UNAVAILABLE");
    }
    try {
      const receipt = parseAgentOsV1PromptControlReceipt(response);
      assertAgentOsV1PromptControlReceiptCorrelated(receipt, binding);
      return deepFreeze({ disposition: "accepted", receipt });
    } catch (error: unknown) {
      if (error instanceof AgentOsV1PromptControlContractError) throw error;
      fail("OWNER_UNAVAILABLE");
    }
  };

  return deepFreeze({ request });
}

interface ParsedRequestBinding extends AgentOsV1PromptControlRequestBinding {
  readonly fingerprintValid: boolean;
}

function parseSteerValue(
  value: Record<string, unknown>,
): Readonly<AgentOsV1PromptSteerRequest> {
  exact(value, [
    "schemaVersion",
    "operation",
    "target",
    "instruction",
    "instructionDigest",
  ]);
  if (value.schemaVersion !== AGENT_OS_V1_PROMPT_CONTROL_SCHEMA)
    fail("INPUT_INVALID");
  if (value.operation !== AGENT_OS_V1_PROMPT_STEER_OPERATION)
    fail("INPUT_INVALID");
  const target = parseTarget(value.target, "steer target");
  const instruction = parseInstruction(value.instruction);
  const instructionDigest = digest(value.instructionDigest);
  if (
    instructionDigest !==
    createAgentOsV1PromptControlInstructionDigest(instruction)
  )
    fail("INPUT_INVALID");
  return deepFreeze({
    schemaVersion: AGENT_OS_V1_PROMPT_CONTROL_SCHEMA,
    operation: AGENT_OS_V1_PROMPT_STEER_OPERATION,
    target,
    instruction,
    instructionDigest,
  });
}

function parseFollowUpValue(
  value: Record<string, unknown>,
): Readonly<AgentOsV1PromptFollowUpRequest> {
  exact(value, [
    "schemaVersion",
    "operation",
    "predecessor",
    "instruction",
    "instructionDigest",
  ]);
  if (value.schemaVersion !== AGENT_OS_V1_PROMPT_CONTROL_SCHEMA)
    fail("INPUT_INVALID");
  if (value.operation !== AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION)
    fail("INPUT_INVALID");
  const predecessor = parseTarget(value.predecessor, "follow-up predecessor");
  const instruction = parseInstruction(value.instruction);
  const instructionDigest = digest(value.instructionDigest);
  if (
    instructionDigest !==
    createAgentOsV1PromptControlInstructionDigest(instruction)
  )
    fail("INPUT_INVALID");
  return deepFreeze({
    schemaVersion: AGENT_OS_V1_PROMPT_CONTROL_SCHEMA,
    operation: AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION,
    predecessor,
    instruction,
    instructionDigest,
  });
}

function parseRequestIdentity(input: unknown): {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1PromptControlRequest>;
  readonly target: Readonly<AgentOsV1PromptControlTarget>;
} {
  const wrapper = copyPlainData(input);
  exact(wrapper, ["requestId", "request"]);
  const requestId = identifierText(
    wrapper.requestId,
    AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxRequestIdUtf8Bytes,
  );
  const request = parseAgentOsV1PromptControlRequest(wrapper.request);
  const target =
    request.operation === AGENT_OS_V1_PROMPT_STEER_OPERATION
      ? request.target
      : request.predecessor;
  return { requestId, request, target };
}

function parseRequestBinding(input: unknown): ParsedRequestBinding {
  const value = copyPlainData(input);
  exact(value, [
    "requestId",
    "operation",
    "sessionId",
    "target",
    "instructionDigest",
    "requestFingerprint",
  ]);
  const requestId = identifierText(
    value.requestId,
    AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxRequestIdUtf8Bytes,
  );
  const operation = operationValue(value.operation);
  const target = parseTarget(value.target, "request binding target");
  const sessionId = identifierText(
    value.sessionId,
    AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxSessionIdUtf8Bytes,
  );
  if (sessionId !== target.sessionId) fail("INPUT_INVALID");
  const instructionDigest = digest(value.instructionDigest);
  const requestFingerprint = digest(value.requestFingerprint);
  const expectedFingerprint = requestFingerprintFromParts(
    requestId,
    operation,
    target,
    instructionDigest,
  );
  return deepFreeze({
    requestId,
    operation,
    sessionId,
    target,
    instructionDigest,
    requestFingerprint,
    fingerprintValid: requestFingerprint === expectedFingerprint,
  });
}

interface ParsedReferenceOptions {
  readonly existingBinding: unknown;
  readonly freshAdmission?: boolean;
  readonly signal?: AbortSignal;
}

function captureReferenceClientOptions(
  input: unknown,
): AgentOsV1PromptControlReferenceClientOptions {
  const value = shallowPlainData(input, ["admit", "dispatch"]);
  exact(value, ["admit", "dispatch"]);
  const admit = value.admit;
  const dispatch = value.dispatch;
  if (!isReferenceAdmit(admit) || !isReferenceDispatch(dispatch))
    fail("INPUT_INVALID");
  return { admit, dispatch };
}

function isReferenceAdmit(
  value: unknown,
): value is AgentOsV1PromptControlReferenceAdmit {
  return typeof value === "function";
}

function isReferenceDispatch(
  value: unknown,
): value is AgentOsV1PromptControlReferenceDispatch {
  return typeof value === "function";
}

function parseReferenceOptions(input: unknown): ParsedReferenceOptions {
  if (input === undefined)
    return {
      existingBinding: undefined,
      freshAdmission: undefined,
      signal: undefined,
    };
  const value = shallowPlainData(input, [
    "existingBinding",
    "freshAdmission",
    "signal",
  ]);
  const signal = value.signal;
  if (signal !== undefined && (signal === null || typeof signal !== "object"))
    fail("INPUT_INVALID");
  if (
    value.freshAdmission !== undefined &&
    typeof value.freshAdmission !== "boolean"
  )
    fail("INPUT_INVALID");
  return {
    existingBinding: value.existingBinding,
    freshAdmission: value.freshAdmission as boolean | undefined,
    signal: signal as AbortSignal | undefined,
  };
}

function parseFreshAdmission(
  input: unknown,
  binding: Readonly<AgentOsV1PromptControlRequestBinding>,
): Readonly<AgentOsV1PromptControlFreshAdmission> {
  const value = copyPlainData(input);
  exact(value, ["kind", "requestId", "requestFingerprint"]);
  if (value.kind !== "fresh-admission") fail("INPUT_INVALID");
  const requestId = identifierText(
    value.requestId,
    AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxRequestIdUtf8Bytes,
  );
  const requestFingerprint = digest(value.requestFingerprint);
  if (
    requestId !== binding.requestId ||
    requestFingerprint !== binding.requestFingerprint
  )
    fail("OWNER_UNAVAILABLE");
  return deepFreeze({ kind: "fresh-admission", requestId, requestFingerprint });
}

function shallowPlainData(
  input: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    fail("INPUT_INVALID");
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
  if (prototype !== Object.prototype || symbols.length !== 0)
    fail("INPUT_INVALID");
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

function requestFingerprintFromIdentity(identity: {
  readonly requestId: string;
  readonly request: Readonly<AgentOsV1PromptControlRequest>;
  readonly target: Readonly<AgentOsV1PromptControlTarget>;
}): string {
  return requestFingerprintFromParts(
    identity.requestId,
    identity.request.operation,
    identity.target,
    identity.request.instructionDigest,
  );
}

function requestFingerprintFromParts(
  requestId: string,
  operation: AgentOsV1PromptControlOperation,
  target: Readonly<AgentOsV1PromptControlTarget>,
  instructionDigest: string,
): string {
  return contentDigest(
    canonicalJson({
      schemaVersion: AGENT_OS_V1_PROMPT_CONTROL_SCHEMA,
      operation,
      requestId,
      sessionId: target.sessionId,
      target,
      instructionDigest,
    }),
  );
}

function parseTarget(
  value: unknown,
  label: string,
): Readonly<AgentOsV1PromptControlTarget> {
  const target = objectValue(value);
  exact(target, ["sessionId", "runId", "attemptId", "storeGeneration"]);
  return deepFreeze({
    sessionId: identifierText(
      target.sessionId,
      AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxSessionIdUtf8Bytes,
    ),
    runId: identifierText(
      target.runId,
      AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxRunIdUtf8Bytes,
    ),
    attemptId: identifierText(
      target.attemptId,
      AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxAttemptIdUtf8Bytes,
    ),
    storeGeneration: positiveInteger(
      target.storeGeneration,
      `${label}.storeGeneration`,
    ),
  });
}

function parseInstruction(
  value: unknown,
): Readonly<AgentOsV1PromptControlInstruction> {
  const instruction = objectValue(value);
  exact(instruction, ["messages"]);
  const messages = arrayValue(instruction.messages);
  if (messages.length === 0 || messages.length > 32) fail("INPUT_INVALID");
  let instructionBytes = 0;
  const copied = messages.map((message) => {
    const item = objectValue(message);
    exact(item, ["role", "content"]);
    if (item.role !== "user") fail("INPUT_INVALID");
    if (typeof item.content !== "string" || item.content.length === 0)
      fail("INPUT_INVALID");
    instructionBytes += utf8Length(item.content);
    if (
      instructionBytes > AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxInstructionBytes
    )
      fail("INPUT_INVALID");
    return { role: "user" as const, content: item.content };
  });
  return deepFreeze({ messages: copied });
}

function operationValue(value: unknown): AgentOsV1PromptControlOperation {
  if (
    value !== AGENT_OS_V1_PROMPT_STEER_OPERATION &&
    value !== AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION
  )
    fail("INPUT_INVALID");
  return value;
}

function positiveInteger(value: unknown, _label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    fail("INPUT_INVALID");
  return value;
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

function digest(value: unknown): string {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value))
    fail("INPUT_INVALID");
  return value;
}

function sameTarget(
  left: Readonly<AgentOsV1PromptControlTarget>,
  right: Readonly<AgentOsV1PromptControlTarget>,
): boolean {
  return (
    left.sessionId === right.sessionId &&
    left.runId === right.runId &&
    left.attemptId === right.attemptId &&
    left.storeGeneration === right.storeGeneration
  );
}

interface CopyState {
  readonly seen: WeakSet<object>;
  totalUtf8Bytes: number;
}

function copyPlainData(input: unknown): Record<string, unknown> {
  const state: CopyState = { seen: new WeakSet<object>(), totalUtf8Bytes: 0 };
  const copied = copyValue(input, state, 0);
  if (copied === null || typeof copied !== "object" || Array.isArray(copied))
    fail("INPUT_INVALID");
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
  if (depth >= AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxDepth)
    fail("INPUT_INVALID");
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
  if (prototype !== Object.prototype || symbols.length !== 0)
    fail("INPUT_INVALID");

  const keys = Object.keys(descriptors);
  if (keys.length > AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxWidth)
    fail("INPUT_INVALID");
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

function copyArray(
  input: readonly unknown[],
  state: CopyState,
  depth: number,
): readonly unknown[] {
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
  if (prototype !== Array.prototype || symbols.length !== 0)
    fail("INPUT_INVALID");
  const lengthDescriptor = descriptors.length;
  if (
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxWidth
  )
    fail("INPUT_INVALID");
  const length = lengthDescriptor.value;
  const ownKeys = Object.keys(descriptors);
  const expectedKeys = [
    "length",
    ...Array.from({ length }, (_, index) => String(index)),
  ];
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some((key) => !expectedKeys.includes(key)) ||
    expectedKeys.some(
      (key) => !Object.prototype.hasOwnProperty.call(descriptors, key),
    )
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
  if (
    typeof TRUSTED_STRUCTURED_CLONE !== "function" ||
    currentClone !== TRUSTED_STRUCTURED_CLONE
  )
    fail("INPUT_INVALID");
  try {
    Reflect.apply(TRUSTED_STRUCTURED_CLONE, globalThis, [input]);
  } catch {
    fail("INPUT_INVALID");
  }
}

function captureAbortSignalIntrinsics():
  | Readonly<{
      readonly aborted: (...args: never[]) => unknown;
      readonly addEventListener: (...args: never[]) => unknown;
      readonly removeEventListener: (...args: never[]) => unknown;
    }>
  | undefined {
  let prototype: object | undefined;
  try {
    const constructor = globalThis.AbortSignal;
    if (typeof constructor !== "function") return undefined;
    prototype = constructor.prototype;
  } catch {
    return undefined;
  }
  try {
    const aborted = findPropertyDescriptor(prototype, "aborted")?.get;
    const addEventListener = findPropertyDescriptor(
      prototype,
      "addEventListener",
    )?.value;
    const removeEventListener = findPropertyDescriptor(
      prototype,
      "removeEventListener",
    )?.value;
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

function findPropertyDescriptor(
  start: object,
  key: string,
): PropertyDescriptor | undefined {
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

function raceReferenceDispatch(
  promise: Promise<unknown>,
  signal: AbortSignal | undefined,
) {
  if (signal === undefined) return promise;
  if (isSignalAborted(signal)) return Promise.reject(createAbortError());
  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      if (ABORT_SIGNAL_INTRINSICS === undefined) return;
      try {
        Reflect.apply(ABORT_SIGNAL_INTRINSICS.removeEventListener, signal, [
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
      (error: unknown) => settle(() => reject(error)),
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
  return error !== null && typeof error === "object" && ABORT_ERRORS.has(error);
}

function countUtf8(value: string, state: CopyState): void {
  state.totalUtf8Bytes += utf8Length(value);
  if (
    state.totalUtf8Bytes > AGENT_OS_V1_PROMPT_CONTROL_LIMITS.maxTotalUtf8Bytes
  )
    fail("INPUT_INVALID");
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("INPUT_INVALID");
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) fail("INPUT_INVALID");
  return value;
}

function exact(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
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

function fail(code: AgentOsV1PromptControlContractErrorCode): never {
  throw new AgentOsV1PromptControlContractError(code);
}
