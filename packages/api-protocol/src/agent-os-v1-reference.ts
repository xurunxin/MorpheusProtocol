import {
  AgentOsV1ContractError,
  parseAgentOsV1ActiveRunPin,
  parseAgentOsV1AuthorityRequestEnvelope,
  parseAgentOsV1HandlerCatalogSnapshot,
  parseAgentOsV1HandshakeOffer,
} from "./agent-os-v1-contract.js";
import type {
  AgentOsV1ActiveRunPin,
  AgentOsV1AuthorityRequestEnvelope,
  AgentOsV1HandlerCatalogEntry,
  AgentOsV1HandlerCatalogSnapshot,
  AgentOsV1HandshakeOffer,
  AgentOsV1NegotiatedSnapshot,
  AgentOsV1ProtocolFamily,
  AgentOsV1ProtocolVersion,
  AgentOsV1RejectionReason,
  AgentOsV1UpdateReason,
  PersonalHostState,
} from "./agent-os-v1-types.js";

export const AGENT_OS_V1_PROTOCOL_REGISTRY = deepFreeze({
  "execution.v1": ["1.0", "1.1"],
  "deployment.v1": ["1.0", "1.1"],
  "control.v1": ["1.0", "1.1"],
  "personal-local.v1": ["1.0", "1.1"],
} satisfies Readonly<Record<AgentOsV1ProtocolFamily, readonly AgentOsV1ProtocolVersion[]>>);

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

export interface AgentOsV1ReferenceRequest<TPayload> {
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly operation: string;
  readonly envelope: Readonly<AgentOsV1AuthorityRequestEnvelope>;
  readonly snapshot: Readonly<AgentOsV1NegotiatedSnapshot>;
  readonly payload: TPayload;
}

export interface AgentOsV1ReferenceResponse<TPayload> {
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly requestId: string;
  readonly status: "ok";
  readonly payload: TPayload;
}

export type AgentOsV1ReferenceTransport<TRequest, TResponse> = (
  request: Readonly<AgentOsV1ReferenceRequest<TRequest>>
) => Promise<Readonly<AgentOsV1ReferenceResponse<TResponse>>>;

export interface AgentOsV1ReferenceClient<
  TProtocol extends AgentOsV1ProtocolFamily,
  TRequest,
  TResponse,
> {
  readonly protocolId: TProtocol;
  readonly request: (
    operation: string,
    envelope: unknown,
    snapshot: Readonly<AgentOsV1NegotiatedSnapshot>,
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
  transport: AgentOsV1ReferenceTransport<TRequest, TResponse>
): AgentOsV1ReferenceClient<TProtocol, TRequest, TResponse> {
  return deepFreeze({
    protocolId,
    request: async (
      operation: string,
      envelopeInput: unknown,
      snapshot: Readonly<AgentOsV1NegotiatedSnapshot>,
      payload: TRequest,
      nowEpochMs: number
    ) => {
      const envelope = parseAgentOsV1AuthorityRequestEnvelope(envelopeInput);
      assertOperation(operation);
      assertSnapshotForProtocol(snapshot, protocolId);
      assertLiveDeadline(envelope.deadline, nowEpochMs);
      return transport(
        deepFreeze({ protocolId, operation, envelope, snapshot: deepFreezeCopy(snapshot), payload })
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
  request: Readonly<AgentOsV1ReferenceRequest<TRequest>>,
  catalogInput: unknown,
  activePinInput: unknown,
  handlers: readonly AgentOsV1ReferenceHandler<TRequest, TResponse>[],
  nowEpochMs: number
): Promise<Readonly<AgentOsV1ReferenceResponse<TResponse>>> {
  const envelope = parseAgentOsV1AuthorityRequestEnvelope(request.envelope);
  const catalog = parseAgentOsV1HandlerCatalogSnapshot(catalogInput);
  const activePin = parseAgentOsV1ActiveRunPin(activePinInput);
  assertOperation(request.operation);
  assertSnapshotForProtocol(request.snapshot, request.protocolId);
  assertLiveDeadline(envelope.deadline, nowEpochMs);
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
  const handler = handlers.find(
    (candidate) =>
      candidate.protocolId === request.protocolId &&
      candidate.handlerVersion === activePin.handlerVersion &&
      candidate.operation === request.operation
  );
  if (handler === undefined)
    throw new AgentOsV1ReferenceError(
      "UPDATE_REQUIRED",
      "owner did not provide the pinned handler"
    );
  const payload = await handler.handle(request.payload);
  return deepFreeze({
    protocolId: request.protocolId,
    requestId: envelope.requestId,
    status: "ok",
    payload,
  });
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
  activePinInputs: readonly unknown[],
  command: Readonly<{
    action: "drain" | "unload";
    protocolId: AgentOsV1ProtocolFamily;
    handlerVersion: string;
  }>
): AgentOsV1HandlerTransitionResult {
  const catalog = parseAgentOsV1HandlerCatalogSnapshot(catalogInput);
  const activePins = activePinInputs.map((input) => parseAgentOsV1ActiveRunPin(input));
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
  input: Readonly<{
    from: PersonalHostState;
    to: PersonalHostState;
    authorityDomainChanged: boolean;
    renewRemoteAuthority: boolean;
    autoRecover: boolean;
  }>
): AgentOsV1PersonalTransitionResult {
  if (input.authorityDomainChanged)
    return deepFreeze({
      status: "migration_required",
      actions: ["drain", "fence", "new-generation", "takeover"],
    });
  if (input.from === "ManagedOffline" && input.renewRemoteAuthority)
    return updateResult("rejected", "REMOTE_RENEWAL_DENIED");
  if (input.from === "Revoked" && input.autoRecover)
    return updateResult("rejected", "REVOKED_AUTO_RECOVERY_DENIED");
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

function assertSnapshotForProtocol(
  snapshot: Readonly<AgentOsV1NegotiatedSnapshot>,
  protocolId: AgentOsV1ProtocolFamily
): void {
  const registered: readonly AgentOsV1ProtocolVersion[] = AGENT_OS_V1_PROTOCOL_REGISTRY[protocolId];
  if (snapshot.protocolId !== protocolId || !registered.includes(snapshot.selectedVersion))
    throw new AgentOsV1ReferenceError(
      "UPDATE_REQUIRED",
      "snapshot protocol/version is not registered"
    );
  if (snapshot.schemaVersion !== "agent-os/v1")
    throw new AgentOsV1ReferenceError("UPDATE_REQUIRED", "snapshot schemaVersion is unsupported");
}

function assertLiveDeadline(deadline: string, nowEpochMs: number): void {
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < 0)
    throw new AgentOsV1ReferenceError("INVALID_INPUT", "nowEpochMs must be non-negative");
  if (Date.parse(deadline) <= nowEpochMs)
    throw new AgentOsV1ReferenceError("DEADLINE_EXPIRED", "authority request deadline has expired");
}

function assertOperation(operation: string): void {
  if (!/^[a-z][a-z0-9._/-]{0,127}$/u.test(operation))
    throw new AgentOsV1ReferenceError("INVALID_INPUT", "operation is invalid");
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

function deepFreezeCopy<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return deepFreeze(value.map((entry) => deepFreezeCopy(entry))) as T;
  const copy = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, deepFreezeCopy(entry)])
  );
  return deepFreeze(copy) as T;
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
