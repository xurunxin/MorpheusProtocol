import {
  AGENT_OS_V1_PROTOCOL_REGISTRY,
  AgentOsV1ContractError,
  parseAgentOsV1ActiveRunPin,
  parseAgentOsV1ActiveRunPins,
  parseAgentOsV1HandlerCatalogSnapshot,
  parseAgentOsV1HandlerTransitionCommand,
  parseAgentOsV1HandshakeOffer,
  parseAgentOsV1PersonalTransitionCommand,
  parseAgentOsV1ReferenceRequest,
  parseAgentOsV1ReferenceResponse,
} from "./agent-os-v1-contract.js";
import type {
  AgentOsV1ActiveRunPin,
  AgentOsV1HandlerCatalogEntry,
  AgentOsV1HandlerCatalogSnapshot,
  AgentOsV1HandshakeOffer,
  AgentOsV1NegotiatedSnapshot,
  AgentOsV1ProtocolFamily,
  AgentOsV1ProtocolVersion,
  AgentOsV1ReferenceRequest,
  AgentOsV1ReferenceResponse,
  AgentOsV1RejectionReason,
  AgentOsV1UpdateReason,
  PersonalHostState,
} from "./agent-os-v1-types.js";

export { AGENT_OS_V1_PROTOCOL_REGISTRY };

export type AgentOsV1HandshakeResult =
  | Readonly<{ status: "accepted"; snapshot: Readonly<AgentOsV1NegotiatedSnapshot> }>
  | Readonly<{ status: "UPDATE_REQUIRED"; reason: AgentOsV1UpdateReason }>
  | Readonly<{ status: "rejected"; reason: AgentOsV1RejectionReason }>;

/**
 * 纯 handshake：无连接、时钟、credential 或 registry ownership。
 * nowEpochMs 必须由 owner 注入，使测试与重放保持确定性。
 */
export function negotiateAgentOsV1Handshake(
  clientInput: unknown,
  providerInput: unknown,
  nowEpochMs: number
): AgentOsV1HandshakeResult {
  const client = parseAgentOsV1HandshakeOffer(clientInput);
  const provider = parseAgentOsV1HandshakeOffer(providerInput);
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < 0)
    throw new AgentOsV1ReferenceError("INVALID_INPUT", "nowEpochMs must be non-negative");

  const securityRejection = validatePeers(client, provider, nowEpochMs);
  if (securityRejection !== null) return updateResult("rejected", securityRejection);
  if (client.protocol.protocolId !== provider.protocol.protocolId)
    return updateResult("UPDATE_REQUIRED", "NO_COMMON_VERSION");
  const protocolId = client.protocol.protocolId;
  const registered: readonly AgentOsV1ProtocolVersion[] = AGENT_OS_V1_PROTOCOL_REGISTRY[protocolId];
  const offered = [...client.protocol.versions, ...provider.protocol.versions];
  if (offered.some((version) => majorOf(version) !== 1))
    return updateResult("UPDATE_REQUIRED", "CROSS_MAJOR");
  if (offered.some((version) => !registered.includes(version)))
    return updateResult("UPDATE_REQUIRED", "UNKNOWN_VERSION");
  const providerVersions = new Set(provider.protocol.versions);
  const commonVersions = client.protocol.versions
    .filter((version) => providerVersions.has(version) && registered.includes(version))
    .sort(compareProtocolVersions);
  const selectedVersion = commonVersions.at(-1);
  if (selectedVersion === undefined) return updateResult("UPDATE_REQUIRED", "NO_COMMON_VERSION");
  if (client.protocol.schemaVersion !== provider.protocol.schemaVersion)
    return updateResult("UPDATE_REQUIRED", "SCHEMA_MISMATCH");

  const providerFeatures = new Set(provider.protocol.features);
  const selectedFeatures = client.protocol.features
    .filter((feature) => providerFeatures.has(feature))
    .sort();
  const selectedSet = new Set(selectedFeatures);
  if (
    [...client.protocol.requiredFeatures, ...provider.protocol.requiredFeatures].some(
      (feature) => !selectedSet.has(feature)
    )
  )
    return updateResult("UPDATE_REQUIRED", "REQUIRED_FEATURE_MISSING");

  return deepFreeze({
    status: "accepted",
    snapshot: {
      protocolId,
      selectedVersion,
      selectedFeatures,
      schemaVersion: "agent-os/v1",
      handlerVersion: provider.protocol.handlerVersion,
    },
  });
}

export type AgentOsV1ReferenceTransport<TRequest> = (
  request: Readonly<AgentOsV1ReferenceRequest<TRequest>>
) => Promise<unknown>;

export interface AgentOsV1ReferenceCodecs<TRequest, TResponse> {
  /** 必须 strict parse/copy/freeze family payload；不得返回原始未验证输入。 */
  readonly request: (input: unknown) => TRequest;
  /** 必须 strict parse/copy/freeze family payload；不得返回原始未验证输入。 */
  readonly response: (input: unknown) => TResponse;
}

export interface AgentOsV1ReferenceClient<
  TProtocol extends AgentOsV1ProtocolFamily,
  TRequest,
  TResponse,
> {
  readonly protocolId: TProtocol;
  readonly request: (
    operation: string,
    envelope: unknown,
    snapshot: unknown,
    payload: TRequest,
    nowEpochMs: number
  ) => Promise<Readonly<AgentOsV1ReferenceResponse<TResponse>>>;
}

/** reference client 只封装 strict envelope 与注入 transport。 */
export function createAgentOsV1ReferenceClient<
  TProtocol extends AgentOsV1ProtocolFamily,
  TRequest,
  TResponse,
>(
  protocolId: TProtocol,
  transport: AgentOsV1ReferenceTransport<TRequest>,
  codecs: Readonly<AgentOsV1ReferenceCodecs<TRequest, TResponse>>
): AgentOsV1ReferenceClient<TProtocol, TRequest, TResponse> {
  assertProtocolFamily(protocolId);
  return deepFreeze({
    protocolId,
    request: async (
      operation: string,
      envelopeInput: unknown,
      snapshotInput: unknown,
      payload: TRequest,
      nowEpochMs: number
    ) => {
      const request = parseAgentOsV1ReferenceRequest(
        { protocolId, operation, envelope: envelopeInput, snapshot: snapshotInput, payload },
        codecs.request
      );
      assertLiveDeadline(request.envelope.deadline, nowEpochMs);
      return parseAgentOsV1ReferenceResponse(
        await transport(request),
        protocolId,
        request.envelope.requestId,
        codecs.response
      );
    },
  });
}

export interface AgentOsV1ReferenceHandler<TRequest, TResponse> {
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly handlerVersion: string;
  readonly operation: string;
  readonly handle: (payload: TRequest) => Promise<TResponse> | TResponse;
}

/** provider dispatch 完全由 owner-provided catalog、pin 与 handler table 驱动。 */
export async function dispatchAgentOsV1Reference<TRequest, TResponse>(
  requestInput: unknown,
  catalogInput: unknown,
  activePinInput: unknown,
  handlersInput: unknown,
  nowEpochMs: number,
  codecs: Readonly<AgentOsV1ReferenceCodecs<TRequest, TResponse>>
): Promise<Readonly<AgentOsV1ReferenceResponse<TResponse>>> {
  const request = parseAgentOsV1ReferenceRequest(requestInput, codecs.request);
  const catalog = parseAgentOsV1HandlerCatalogSnapshot(catalogInput);
  const activePin = parseAgentOsV1ActiveRunPin(activePinInput);
  const handlers = parseOwnerHandlers<TRequest, TResponse>(handlersInput);
  assertLiveDeadline(request.envelope.deadline, nowEpochMs);
  if (!sameSnapshot(request.snapshot, activePin))
    throw new AgentOsV1ReferenceError(
      "PIN_DRIFT",
      "request snapshot differs from the active Run pin"
    );
  const resolved = resolveAgentOsV1PinnedHandler(catalog, activePin);
  if (resolved.status === "UPDATE_REQUIRED")
    throw new AgentOsV1ReferenceError("UPDATE_REQUIRED", resolved.reason);
  if (!resolved.handler.operations.includes(request.operation))
    throw new AgentOsV1ReferenceError(
      "UNKNOWN_OPERATION",
      "operation is absent from the pinned catalog"
    );
  const matchingHandlers = handlers.filter(
    (candidate) =>
      candidate.protocolId === request.protocolId &&
      candidate.handlerVersion === activePin.handlerVersion &&
      candidate.operation === request.operation
  );
  if (matchingHandlers.length !== 1)
    throw new AgentOsV1ReferenceError(
      "UPDATE_REQUIRED",
      matchingHandlers.length === 0
        ? "owner did not provide the pinned handler"
        : "owner provided duplicate pinned handlers"
    );
  const handler = matchingHandlers[0];
  if (handler === undefined)
    throw new AgentOsV1ReferenceError("UPDATE_REQUIRED", "pinned handler resolution failed");
  const payload = await handler.handle(request.payload);
  return parseAgentOsV1ReferenceResponse(
    {
      protocolId: request.protocolId,
      requestId: request.envelope.requestId,
      status: "ok",
      payload,
    },
    request.protocolId,
    request.envelope.requestId,
    codecs.response
  );
}

export type AgentOsV1HandlerResolution =
  | Readonly<{ status: "accepted"; handler: Readonly<AgentOsV1HandlerCatalogEntry> }>
  | Readonly<{ status: "UPDATE_REQUIRED"; reason: "HANDLER_MISSING" }>;

export function resolveAgentOsV1PinnedHandler(
  catalogInput: unknown,
  activePinInput: unknown
): AgentOsV1HandlerResolution {
  const catalog = parseAgentOsV1HandlerCatalogSnapshot(catalogInput);
  const activePin = parseAgentOsV1ActiveRunPin(activePinInput);
  const handler = catalog.handlers.find(
    (entry) =>
      entry.protocolId === activePin.protocolId && entry.handlerVersion === activePin.handlerVersion
  );
  return handler === undefined
    ? updateResult("UPDATE_REQUIRED", "HANDLER_MISSING")
    : deepFreeze({ status: "accepted", handler });
}

export type AgentOsV1HandlerTransitionResult =
  | Readonly<{ status: "accepted"; snapshot: Readonly<AgentOsV1HandlerCatalogSnapshot> }>
  | Readonly<{ status: "UPDATE_REQUIRED"; reason: "HANDLER_MISSING" | "HANDLER_PINNED" }>;

export function planAgentOsV1HandlerTransition(
  catalogInput: unknown,
  activePinInputs: unknown,
  commandInput: unknown
): AgentOsV1HandlerTransitionResult {
  const catalog = parseAgentOsV1HandlerCatalogSnapshot(catalogInput);
  const activePins = parseAgentOsV1ActiveRunPins(activePinInputs);
  const command = parseAgentOsV1HandlerTransitionCommand(commandInput);
  const index = catalog.handlers.findIndex(
    (handler) =>
      handler.protocolId === command.protocolId && handler.handlerVersion === command.handlerVersion
  );
  if (index < 0) return updateResult("UPDATE_REQUIRED", "HANDLER_MISSING");
  const pinned = activePins.some(
    (pin) => pin.protocolId === command.protocolId && pin.handlerVersion === command.handlerVersion
  );
  if (command.action === "unload" && pinned)
    return updateResult("UPDATE_REQUIRED", "HANDLER_PINNED");
  if (catalog.revision === Number.MAX_SAFE_INTEGER)
    throw new AgentOsV1ReferenceError("INVALID_INPUT", "handler catalog revision is exhausted");

  const handlers = catalog.handlers.flatMap((handler, handlerIndex) => {
    if (handlerIndex !== index) return [handler];
    if (command.action === "unload") return [];
    return [{ ...handler, lifecycle: "draining" as const }];
  });
  return deepFreeze({
    status: "accepted",
    snapshot: { revision: catalog.revision + 1, handlers },
  });
}

export type AgentOsV1PersonalTransitionResult =
  | Readonly<{ status: "accepted"; state: PersonalHostState }>
  | Readonly<{
      status: "migration_required";
      actions: readonly ["drain", "fence", "new-generation", "takeover"];
    }>
  | Readonly<{
      status: "rejected";
      reason: "INVALID_TRANSITION" | "REMOTE_RENEWAL_DENIED" | "REVOKED_AUTO_RECOVERY_DENIED";
    }>;

const PERSONAL_TRANSITIONS = deepFreeze({
  LocalOnly: ["EnrollmentPending"],
  EnrollmentPending: ["ManagedOnline"],
  ManagedOnline: ["ManagedOffline"],
  ManagedOffline: ["ManagedOnline", "Revoked"],
  Revoked: [],
} satisfies Readonly<Record<PersonalHostState, readonly PersonalHostState[]>>);

/** Personal 状态转换只返回计划，不写 Host state。 */
export function planAgentOsV1PersonalTransition(
  inputValue: unknown
): AgentOsV1PersonalTransitionResult {
  const input = parseAgentOsV1PersonalTransitionCommand(inputValue);
  if (input.from === "Revoked") {
    return input.autoRecover
      ? updateResult("rejected", "REVOKED_AUTO_RECOVERY_DENIED")
      : updateResult("rejected", "INVALID_TRANSITION");
  }
  if (input.authorityDomainChanged)
    return deepFreeze({
      status: "migration_required",
      actions: ["drain", "fence", "new-generation", "takeover"],
    });
  if (input.from === "ManagedOffline" && input.renewRemoteAuthority)
    return updateResult("rejected", "REMOTE_RENEWAL_DENIED");
  const allowedTransitions: readonly PersonalHostState[] = PERSONAL_TRANSITIONS[input.from];
  if (!allowedTransitions.includes(input.to)) return updateResult("rejected", "INVALID_TRANSITION");
  return deepFreeze({ status: "accepted", state: input.to });
}

export class AgentOsV1ReferenceError extends Error {
  constructor(
    readonly code:
      | "INVALID_INPUT"
      | "DEADLINE_EXPIRED"
      | "PIN_DRIFT"
      | "UNKNOWN_OPERATION"
      | "UPDATE_REQUIRED",
    message: string
  ) {
    super(message);
    this.name = "AgentOsV1ReferenceError";
  }
}

function parseOwnerHandlers<TRequest, TResponse>(
  input: unknown
): readonly AgentOsV1ReferenceHandler<TRequest, TResponse>[] {
  const handlers = strictArrayValues(input, "owner handlers").map((entry) => {
    const value = strictRecord(entry, "owner handler");
    exactKeys(value, ["protocolId", "handlerVersion", "operation", "handle"], "owner handler");
    const handle = value.handle;
    if (typeof handle !== "function")
      throw new AgentOsV1ReferenceError("INVALID_INPUT", "owner handler handle must be a function");
    return Object.freeze({
      protocolId: protocolFamilyValue(value.protocolId),
      handlerVersion: identifierValue(value.handlerVersion, "owner handler handlerVersion"),
      operation: identifierValue(value.operation, "owner handler operation"),
      handle: handle as AgentOsV1ReferenceHandler<TRequest, TResponse>["handle"],
    });
  });
  const identities = handlers.map(
    (handler) => `${handler.protocolId}:${handler.handlerVersion}:${handler.operation}`
  );
  if (new Set(identities).size !== identities.length)
    throw new AgentOsV1ReferenceError("INVALID_INPUT", "owner handlers contain duplicate keys");
  return deepFreeze(handlers);
}

function protocolFamilyValue(value: unknown): AgentOsV1ProtocolFamily {
  assertProtocolFamily(value);
  return value;
}

function identifierValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9._/-]{0,127}$/u.test(value))
    throw new AgentOsV1ReferenceError("INVALID_INPUT", `${label} is invalid`);
  return value;
}

function strictArrayValues(input: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype)
    throw new AgentOsV1ReferenceError("INVALID_INPUT", `${label} must be a plain array`);
  if (Object.getOwnPropertySymbols(input).length !== 0)
    throw new AgentOsV1ReferenceError("INVALID_INPUT", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const result: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      throw new AgentOsV1ReferenceError(
        "INVALID_INPUT",
        `${label} must contain only enumerable data items without holes`
      );
    result.push(descriptor.value);
  }
  if (Object.keys(descriptors).some((key) => key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key)))
    throw new AgentOsV1ReferenceError("INVALID_INPUT", `${label} contains non-index fields`);
  return result;
}

function strictRecord(input: unknown, label: string): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    throw new AgentOsV1ReferenceError("INVALID_INPUT", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(input).length !== 0)
    throw new AgentOsV1ReferenceError("INVALID_INPUT", `${label} must not contain symbols`);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(input))) {
    if (
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      throw new AgentOsV1ReferenceError(
        "INVALID_INPUT",
        `${label}.${key} must be an enumerable data field`
      );
  }
  return input as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !(key in value))
  )
    throw new AgentOsV1ReferenceError(
      "INVALID_INPUT",
      `${label} contains unknown or missing fields`
    );
}

function validatePeers(
  client: Readonly<AgentOsV1HandshakeOffer>,
  provider: Readonly<AgentOsV1HandshakeOffer>,
  nowEpochMs: number
): AgentOsV1RejectionReason | null {
  if (
    !client.peer.audience.includes(provider.peer.peerId) ||
    !provider.peer.audience.includes(client.peer.peerId)
  )
    return "AUDIENCE_MISMATCH";
  if (client.peer.authorityDomain !== provider.peer.authorityDomain)
    return "AUTHORITY_DOMAIN_MISMATCH";
  if (
    client.peer.tenantId !== provider.peer.tenantId ||
    client.peer.workloadId !== provider.peer.workloadId
  )
    return "IDENTITY_MISMATCH";
  if (
    client.peer.enrollmentRef !== null &&
    provider.peer.enrollmentRef !== null &&
    (client.peer.enrollmentRef.ref !== provider.peer.enrollmentRef.ref ||
      client.peer.enrollmentRef.digest !== provider.peer.enrollmentRef.digest)
  )
    return "ENROLLMENT_MISMATCH";
  if (
    Math.abs(Date.parse(client.issuedAt) - nowEpochMs) > client.maxClockSkewMs ||
    Math.abs(Date.parse(provider.issuedAt) - nowEpochMs) > provider.maxClockSkewMs
  )
    return "CLOCK_SKEW";
  return null;
}

function sameSnapshot(
  snapshot: Readonly<AgentOsV1NegotiatedSnapshot>,
  pin: Readonly<AgentOsV1ActiveRunPin>
): boolean {
  return (
    snapshot.protocolId === pin.protocolId &&
    snapshot.selectedVersion === pin.selectedVersion &&
    snapshot.schemaVersion === pin.schemaVersion &&
    snapshot.handlerVersion === pin.handlerVersion &&
    snapshot.selectedFeatures.length === pin.selectedFeatures.length &&
    snapshot.selectedFeatures.every((feature, index) => feature === pin.selectedFeatures[index])
  );
}

function assertLiveDeadline(deadline: string, nowEpochMs: number): void {
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < 0)
    throw new AgentOsV1ReferenceError("INVALID_INPUT", "nowEpochMs must be non-negative");
  if (Date.parse(deadline) <= nowEpochMs)
    throw new AgentOsV1ReferenceError("DEADLINE_EXPIRED", "authority request deadline has expired");
}

function assertProtocolFamily(value: unknown): asserts value is AgentOsV1ProtocolFamily {
  if (typeof value !== "string" || !Object.hasOwn(AGENT_OS_V1_PROTOCOL_REGISTRY, value))
    throw new AgentOsV1ReferenceError("INVALID_INPUT", "protocolId is not registered");
}

function majorOf(version: AgentOsV1ProtocolVersion): number {
  return Number(version.slice(0, version.indexOf(".")));
}

function compareProtocolVersions(
  left: AgentOsV1ProtocolVersion,
  right: AgentOsV1ProtocolVersion
): number {
  const leftSeparator = left.indexOf(".");
  const rightSeparator = right.indexOf(".");
  const leftMajor = Number(left.slice(0, leftSeparator));
  const rightMajor = Number(right.slice(0, rightSeparator));
  const leftMinor = Number(left.slice(leftSeparator + 1));
  const rightMinor = Number(right.slice(rightSeparator + 1));
  return leftMajor - rightMajor || leftMinor - rightMinor;
}

function updateResult<TStatus extends "UPDATE_REQUIRED" | "rejected", TReason extends string>(
  status: TStatus,
  reason: TReason
): Readonly<{ status: TStatus; reason: TReason }> {
  return Object.freeze({ status, reason });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** ContractError is re-exported for callers that want one catch boundary for strict codecs. */
export { AgentOsV1ContractError };
