import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import {
  parseAgentOsV1ExecutionClaimBinding,
  parseAgentOsV1ExecutionGrant,
  parseAgentOsV1ExecutionInstance,
} from "./agent-os-v1-contract.js";
import type {
  AgentOsWorkerLeaseV1AvailabilityPayload,
  AgentOsWorkerLeaseV1CancelPayload,
  AgentOsWorkerLeaseV1CapabilityManifest,
  AgentOsWorkerLeaseV1ClaimAckPayload,
  AgentOsWorkerLeaseV1ClaimRejection,
  AgentOsWorkerLeaseV1ClaimRequestPayload,
  AgentOsWorkerLeaseV1ContractErrorCode,
  AgentOsWorkerLeaseV1DrainPayload,
  AgentOsWorkerLeaseV1Envelope,
  AgentOsWorkerLeaseV1Operation,
  AgentOsWorkerLeaseV1Payload,
  AgentOsWorkerLeaseV1PayloadByOperation,
  AgentOsWorkerLeaseV1PlacementOfferPayload,
  AgentOsWorkerLeaseV1ProgressPayload,
  AgentOsWorkerLeaseV1QuarantinePayload,
  AgentOsWorkerLeaseV1QuarantineReason,
  AgentOsWorkerLeaseV1ResourceHealthPayload,
  AgentOsWorkerLeaseV1RenewPayload,
  AgentOsWorkerLeaseV1ResultPayload,
  AgentOsWorkerLeaseV1WorkloadIdentity,
} from "./agent-os-worker-lease-v1-types.js";

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MAX_SAFE_COUNTER = Number.MAX_SAFE_INTEGER;

export class AgentOsWorkerLeaseV1ContractError extends Error {
  constructor(
    readonly code: AgentOsWorkerLeaseV1ContractErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AgentOsWorkerLeaseV1ContractError";
  }
}

export function parseAgentOsWorkerLeaseV1Envelope(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1Envelope> {
  const value = record(input, "Worker lease envelope");
  exact(
    value,
    [
      "schemaVersion",
      "operation",
      "sender",
      "messageId",
      "correlationId",
      "sequence",
      "leaderTerm",
      "controlId",
      "tenantId",
      "workloadId",
      "workerId",
      "requestedAt",
      "deadline",
      "payloadDigest",
      "envelopeDigest",
      "payload",
    ],
    "Worker lease envelope",
  );
  if (value.schemaVersion !== "agent-os-worker-lease/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "schemaVersion must equal agent-os-worker-lease/v1",
    );
  const operation = workerLeaseOperation(value.operation);
  const sender = workerLeaseSender(value.sender);
  assertOperationSender(operation, sender);
  const requestedAt = instant(value.requestedAt, "requestedAt");
  const deadline = instant(value.deadline, "deadline");
  if (deadline < requestedAt)
    fail("DRIFT_DETECTED", "deadline predates requestedAt");
  const payload = parsePayload(operation, value.payload);
  const payloadDigest = digest(value.payloadDigest, "payloadDigest");
  const expectedDigest = createAgentOsWorkerLeaseV1PayloadDigest(
    operation,
    payload,
  );
  if (payloadDigest !== expectedDigest)
    fail("DIGEST_MISMATCH", "payloadDigest does not match canonical payload");
  const canonical = {
    schemaVersion: "agent-os-worker-lease/v1" as const,
    operation,
    sender,
    messageId: identifier(value.messageId, "messageId"),
    correlationId: identifier(value.correlationId, "correlationId"),
    sequence: positiveInteger(value.sequence, "sequence"),
    leaderTerm: positiveInteger(value.leaderTerm, "leaderTerm"),
    controlId: identifier(value.controlId, "controlId"),
    tenantId: identifier(value.tenantId, "tenantId"),
    workloadId: identifier(value.workloadId, "workloadId"),
    workerId: identifier(value.workerId, "workerId"),
    requestedAt,
    deadline,
    payloadDigest,
    payload,
  };
  assertEnvelopePayloadPins(canonical);
  const envelopeDigest = digest(value.envelopeDigest, "envelopeDigest");
  if (envelopeDigest !== createEnvelopeDigest(canonical))
    fail("DIGEST_MISMATCH", "envelopeDigest does not match canonical envelope");
  return deepFreeze({
    ...canonical,
    envelopeDigest,
  }) as Readonly<AgentOsWorkerLeaseV1Envelope>;
}

export function createAgentOsWorkerLeaseV1Envelope<
  Operation extends AgentOsWorkerLeaseV1Operation,
>(input: {
  readonly operation: Operation;
  readonly sender: "control" | "worker";
  readonly messageId: string;
  readonly correlationId: string;
  readonly sequence: number;
  readonly leaderTerm: number;
  readonly controlId: string;
  readonly tenantId: string;
  readonly workloadId: string;
  readonly workerId: string;
  readonly requestedAt: string;
  readonly deadline: string;
  readonly payload: AgentOsWorkerLeaseV1PayloadByOperation[Operation];
}): Readonly<AgentOsWorkerLeaseV1Envelope<Operation>> {
  const payload = parsePayload(input.operation, input.payload);
  const payloadDigest = createAgentOsWorkerLeaseV1PayloadDigest(
    input.operation,
    payload,
  );
  const canonical = {
    schemaVersion: "agent-os-worker-lease/v1" as const,
    ...input,
    payload,
    payloadDigest,
  };
  return parseAgentOsWorkerLeaseV1Envelope({
    ...canonical,
    envelopeDigest: createEnvelopeDigest(canonical),
  }) as Readonly<AgentOsWorkerLeaseV1Envelope<Operation>>;
}

export function createAgentOsWorkerLeaseV1PayloadDigest(
  operation: AgentOsWorkerLeaseV1Operation,
  payloadInput: unknown,
): string {
  const payload = parsePayload(operation, payloadInput);
  return `sha256:${sha256Hex(canonicalJson({ operation, payload }))}`;
}

export function canonicalAgentOsWorkerLeaseV1Source(input: unknown): string {
  return canonicalJson(parseAgentOsWorkerLeaseV1Envelope(input));
}

function createEnvelopeDigest(
  input: Readonly<Record<string, unknown>>,
): string {
  return `sha256:${sha256Hex(canonicalJson(input))}`;
}

function parsePayload(
  operation: AgentOsWorkerLeaseV1Operation,
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1Payload> {
  switch (operation) {
    case "worker.availability":
      return availabilityPayload(input);
    case "placement.offer":
      return placementOfferPayload(input);
    case "claim.request":
      return claimRequestPayload(input);
    case "claim.ack":
      return claimAckPayload(input);
    case "lease.renew":
      return renewPayload(input);
    case "execution.progress":
      return progressPayload(input);
    case "execution.resource-health":
      return resourceHealthPayload(input);
    case "execution.result":
      return resultPayload(input);
    case "execution.cancel":
      return cancelPayload(input);
    case "worker.drain":
      return drainPayload(input);
    case "worker.quarantine":
      return quarantinePayload(input);
  }
}

function availabilityPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1AvailabilityPayload> {
  const value = payloadRecord(input, [
    "identity",
    "manifest",
    "capacity",
    "draining",
    "observedAt",
  ]);
  const capacity = record(value.capacity, "availability capacity");
  exact(capacity, ["maxActiveRuns", "activeRuns"], "availability capacity");
  const maxActiveRuns = positiveInteger(
    capacity.maxActiveRuns,
    "maxActiveRuns",
  );
  const activeRuns = nonNegativeInteger(capacity.activeRuns, "activeRuns");
  if (activeRuns > maxActiveRuns)
    fail("DRIFT_DETECTED", "activeRuns exceeds maxActiveRuns");
  if (typeof value.draining !== "boolean")
    fail("INVALID_VALUE", "draining must be boolean");
  return deepFreeze({
    identity: workloadIdentity(value.identity),
    manifest: capabilityManifest(value.manifest),
    capacity: { maxActiveRuns, activeRuns },
    draining: value.draining,
    observedAt: instant(value.observedAt, "observedAt"),
  });
}

function placementOfferPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1PlacementOfferPayload> {
  const value = payloadRecord(input, [
    "commandId",
    "grant",
    "instance",
    "manifest",
    "offeredAt",
    "expiresAt",
  ]);
  const grant = parseAgentOsV1ExecutionGrant(value.grant);
  const instance = parseAgentOsV1ExecutionInstance(value.instance);
  const offeredAt = instant(value.offeredAt, "offeredAt");
  const expiresAt = instant(value.expiresAt, "expiresAt");
  if (expiresAt < offeredAt || expiresAt > grant.expiresAt)
    fail("GRANT_EXPANSION", "placement offer exceeds grant lifetime");
  assertGrantInstance(grant, instance);
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    grant,
    instance,
    manifest: capabilityManifest(value.manifest),
    offeredAt,
    expiresAt,
  });
}

function claimRequestPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1ClaimRequestPayload> {
  const value = payloadRecord(input, [
    "commandId",
    "grant",
    "instance",
    "claim",
  ]);
  const grant = parseAgentOsV1ExecutionGrant(value.grant);
  const instance = parseAgentOsV1ExecutionInstance(value.instance);
  const claim = parseAgentOsV1ExecutionClaimBinding(value.claim);
  assertAuthorityPins(grant, instance, claim);
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    grant,
    instance,
    claim,
  });
}

function claimAckPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1ClaimAckPayload> {
  const value = payloadRecord(input, [
    "commandId",
    "claim",
    "accepted",
    "rejection",
  ]);
  if (typeof value.accepted !== "boolean")
    fail("INVALID_VALUE", "accepted must be boolean");
  const rejection = claimRejection(value.rejection);
  if (value.accepted === (rejection !== null))
    fail("DRIFT_DETECTED", "accepted and rejection are inconsistent");
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    claim: parseAgentOsV1ExecutionClaimBinding(value.claim),
    accepted: value.accepted,
    rejection,
  });
}

function renewPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1RenewPayload> {
  const value = payloadRecord(input, [
    "commandId",
    "grant",
    "instance",
    "claim",
  ]);
  const grant = parseAgentOsV1ExecutionGrant(value.grant);
  const instance = parseAgentOsV1ExecutionInstance(value.instance);
  const claim = parseAgentOsV1ExecutionClaimBinding(value.claim);
  assertAuthorityPins(grant, instance, claim);
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    grant,
    instance,
    claim,
  });
}

function progressPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1ProgressPayload> {
  const value = payloadRecord(input, [
    "commandId",
    "claim",
    "revision",
    "progressDigest",
    "observedAt",
  ]);
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    claim: parseAgentOsV1ExecutionClaimBinding(value.claim),
    revision: positiveInteger(value.revision, "revision"),
    progressDigest: digest(value.progressDigest, "progressDigest"),
    observedAt: instant(value.observedAt, "observedAt"),
  });
}

function resourceHealthPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1ResourceHealthPayload> {
  const value = payloadRecord(input, [
    "commandId",
    "claim",
    "revision",
    "acquiredResourceCount",
    "observedAt",
  ]);
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    claim: parseAgentOsV1ExecutionClaimBinding(value.claim),
    revision: positiveInteger(value.revision, "revision"),
    acquiredResourceCount: nonNegativeInteger(
      value.acquiredResourceCount,
      "acquiredResourceCount",
    ),
    observedAt: instant(value.observedAt, "observedAt"),
  });
}

function resultPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1ResultPayload> {
  const value = payloadRecord(input, [
    "commandId",
    "claim",
    "status",
    "resultDigest",
    "artifactDigest",
    "completedAt",
  ]);
  if (value.status !== "succeeded" && value.status !== "failed")
    fail("INVALID_VALUE", "result status is invalid");
  const artifactDigest =
    value.artifactDigest === null
      ? null
      : digest(value.artifactDigest, "artifactDigest");
  if (value.status === "succeeded" && artifactDigest === null)
    fail("DRIFT_DETECTED", "succeeded result requires artifactDigest");
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    claim: parseAgentOsV1ExecutionClaimBinding(value.claim),
    status: value.status,
    resultDigest: digest(value.resultDigest, "resultDigest"),
    artifactDigest,
    completedAt: instant(value.completedAt, "completedAt"),
  });
}

function cancelPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1CancelPayload> {
  const value = payloadRecord(input, ["commandId", "claim", "reasonDigest"]);
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    claim: parseAgentOsV1ExecutionClaimBinding(value.claim),
    reasonDigest: digest(value.reasonDigest, "reasonDigest"),
  });
}

function drainPayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1DrainPayload> {
  const value = payloadRecord(input, [
    "commandId",
    "mode",
    "reasonDigest",
    "deadline",
  ]);
  if (value.mode !== "graceful" && value.mode !== "immediate")
    fail("INVALID_VALUE", "drain mode is invalid");
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    mode: value.mode,
    reasonDigest: digest(value.reasonDigest, "reasonDigest"),
    deadline: instant(value.deadline, "drain deadline"),
  });
}

function quarantinePayload(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1QuarantinePayload> {
  const value = payloadRecord(input, [
    "commandId",
    "targetMessageId",
    "reason",
    "evidenceDigest",
  ]);
  return deepFreeze({
    commandId: identifier(value.commandId, "commandId"),
    targetMessageId: identifier(value.targetMessageId, "targetMessageId"),
    reason: quarantineReason(value.reason),
    evidenceDigest: digest(value.evidenceDigest, "evidenceDigest"),
  });
}

function workloadIdentity(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1WorkloadIdentity> {
  const value = record(input, "workload identity");
  exact(
    value,
    [
      "issuer",
      "subject",
      "audience",
      "keyId",
      "rotationGeneration",
      "revocationGeneration",
    ],
    "workload identity",
  );
  if (
    !Array.isArray(value.audience) ||
    value.audience.length !== 1 ||
    !(0 in value.audience)
  )
    fail(
      "INVALID_SHAPE",
      "workload identity audience must contain exactly one item",
    );
  return deepFreeze({
    issuer: identifier(value.issuer, "identity issuer"),
    subject: identifier(value.subject, "identity subject"),
    audience: [identifier(value.audience[0], "identity audience")] as readonly [
      string,
    ],
    keyId: identifier(value.keyId, "identity keyId"),
    rotationGeneration: qualified(
      value.rotationGeneration,
      "rotation",
      "rotationGeneration",
    ),
    revocationGeneration: qualified(
      value.revocationGeneration,
      "revocation",
      "revocationGeneration",
    ),
  });
}

function capabilityManifest(
  input: unknown,
): Readonly<AgentOsWorkerLeaseV1CapabilityManifest> {
  const value = record(input, "capability manifest");
  exact(
    value,
    ["packageId", "packageDigest", "capabilityDigest"],
    "capability manifest",
  );
  return deepFreeze({
    packageId: identifier(value.packageId, "packageId"),
    packageDigest: digest(value.packageDigest, "packageDigest"),
    capabilityDigest: digest(value.capabilityDigest, "capabilityDigest"),
  });
}

function assertGrantInstance(
  grant: ReturnType<typeof parseAgentOsV1ExecutionGrant>,
  instance: ReturnType<typeof parseAgentOsV1ExecutionInstance>,
): void {
  if (grant.kind !== "remote" || grant.leaseBinding.kind !== "remote")
    fail("DRIFT_DETECTED", "Worker lease grants must bind remote authority");
  const leaseBinding = grant.leaseBinding;
  if (
    grant.instanceId !== instance.instanceId ||
    grant.deploymentId !== instance.deploymentId ||
    grant.hostId !== instance.hostId ||
    leaseBinding.generation !== instance.generation
  )
    fail("DRIFT_DETECTED", "grant and instance pins do not reconcile");
  if (grant.audience.length !== 1 || grant.audience[0] !== grant.hostId)
    fail("GRANT_EXPANSION", "grant audience must narrow to exactly one Worker");
  if (grant.scope.some((entry) => !grant.sessionGrant.scope.includes(entry)))
    fail("GRANT_EXPANSION", "grant scope exceeds the session grant scope");
  if (
    grant.notBefore < grant.sessionGrant.notBefore ||
    grant.expiresAt > grant.sessionGrant.expiresAt
  )
    fail(
      "GRANT_EXPANSION",
      "grant validity exceeds the session grant validity",
    );
  if (grant.scope.some((entry) => !leaseBinding.scope.includes(entry)))
    fail("GRANT_EXPANSION", "grant scope exceeds the remote lease scope");
  if (
    grant.notBefore < leaseBinding.notBefore ||
    grant.expiresAt > leaseBinding.expiresAt
  )
    fail("GRANT_EXPANSION", "grant validity exceeds the remote lease validity");
}

function assertAuthorityPins(
  grant: ReturnType<typeof parseAgentOsV1ExecutionGrant>,
  instance: ReturnType<typeof parseAgentOsV1ExecutionInstance>,
  claim: ReturnType<typeof parseAgentOsV1ExecutionClaimBinding>,
): void {
  assertGrantInstance(grant, instance);
  if (
    grant.leaseBinding.kind !== "remote" ||
    claim.grantId !== grant.grantId ||
    claim.leaseId !== grant.leaseBinding.leaseId ||
    claim.leaseEpoch !== grant.leaseBinding.epoch ||
    claim.authorityDomain !== grant.authorityDomain ||
    claim.runId !== grant.runId ||
    claim.attemptId !== grant.attemptId ||
    claim.instanceId !== instance.instanceId ||
    claim.instanceGeneration !== instance.generation ||
    claim.expiresAt > grant.expiresAt
  )
    fail("DRIFT_DETECTED", "grant, instance and claim pins do not reconcile");
}

function assertEnvelopePayloadPins(input: {
  readonly operation: AgentOsWorkerLeaseV1Operation;
  readonly controlId: string;
  readonly tenantId: string;
  readonly workloadId: string;
  readonly workerId: string;
  readonly requestedAt: string;
  readonly deadline: string;
  readonly payload: Readonly<AgentOsWorkerLeaseV1Payload>;
}): void {
  const payload = input.payload;
  const claim = claimAuthority(input.operation, payload);
  if (claim !== null && claim.expiresAt <= input.requestedAt)
    fail("DRIFT_DETECTED", "claim is expired at the envelope request time");
  if (input.operation === "worker.availability") {
    const availability = payload as AgentOsWorkerLeaseV1AvailabilityPayload;
    if (
      availability.identity.subject !== input.workerId ||
      availability.identity.audience[0] !== input.controlId
    )
      fail(
        "DRIFT_DETECTED",
        "availability identity does not bind the Worker and Control audience",
      );
    if (availability.observedAt > input.deadline)
      fail(
        "DRIFT_DETECTED",
        "availability observation exceeds the envelope deadline",
      );
    return;
  }
  if (
    input.operation === "placement.offer" ||
    input.operation === "claim.request" ||
    input.operation === "lease.renew"
  ) {
    const authority = payload as
      | AgentOsWorkerLeaseV1PlacementOfferPayload
      | AgentOsWorkerLeaseV1ClaimRequestPayload
      | AgentOsWorkerLeaseV1RenewPayload;
    if (
      authority.grant.tenantId !== input.tenantId ||
      authority.grant.workloadId !== input.workloadId ||
      authority.grant.hostId !== input.workerId ||
      authority.grant.audience.length !== 1 ||
      authority.grant.audience[0] !== input.workerId
    )
      fail(
        "GRANT_EXPANSION",
        "envelope authority expands or drifts from the grant",
      );
    if (
      input.requestedAt < authority.grant.notBefore ||
      input.requestedAt >= authority.grant.expiresAt ||
      input.deadline > authority.grant.expiresAt
    )
      fail("GRANT_EXPANSION", "envelope time window exceeds the grant");
    if (input.operation === "placement.offer") {
      const offer = authority as AgentOsWorkerLeaseV1PlacementOfferPayload;
      if (offer.manifest.capabilityDigest !== offer.grant.capabilityDigest)
        fail(
          "GRANT_EXPANSION",
          "Worker capability manifest does not match the authorized grant",
        );
    }
  }
  if (input.operation === "execution.progress") {
    const progress = payload as AgentOsWorkerLeaseV1ProgressPayload;
    if (
      progress.observedAt < input.requestedAt ||
      progress.observedAt > input.deadline
    )
      fail("DRIFT_DETECTED", "progress timestamp exceeds the envelope window");
  }
  if (input.operation === "execution.resource-health") {
    const resourceHealth = payload as AgentOsWorkerLeaseV1ResourceHealthPayload;
    if (
      resourceHealth.observedAt < input.requestedAt ||
      resourceHealth.observedAt > input.deadline
    )
      fail(
        "DRIFT_DETECTED",
        "resource health timestamp exceeds the envelope window",
      );
  }
  if (input.operation === "execution.result") {
    const result = payload as AgentOsWorkerLeaseV1ResultPayload;
    if (
      result.completedAt < input.requestedAt ||
      result.completedAt > input.deadline
    )
      fail("DRIFT_DETECTED", "result timestamp exceeds the envelope window");
  }
  if (input.operation === "worker.drain") {
    const drain = payload as AgentOsWorkerLeaseV1DrainPayload;
    if (drain.deadline > input.deadline)
      fail("DRIFT_DETECTED", "drain deadline exceeds the envelope deadline");
  }
}

function claimAuthority(
  operation: AgentOsWorkerLeaseV1Operation,
  payload: Readonly<AgentOsWorkerLeaseV1Payload>,
): ReturnType<typeof parseAgentOsV1ExecutionClaimBinding> | null {
  switch (operation) {
    case "claim.request":
      return (payload as AgentOsWorkerLeaseV1ClaimRequestPayload).claim;
    case "claim.ack": {
      const acknowledgement = payload as AgentOsWorkerLeaseV1ClaimAckPayload;
      return acknowledgement.accepted ? acknowledgement.claim : null;
    }
    case "lease.renew":
      return (payload as AgentOsWorkerLeaseV1RenewPayload).claim;
    case "execution.progress":
      return (payload as AgentOsWorkerLeaseV1ProgressPayload).claim;
    case "execution.resource-health":
      return (payload as AgentOsWorkerLeaseV1ResourceHealthPayload).claim;
    case "execution.result":
      return (payload as AgentOsWorkerLeaseV1ResultPayload).claim;
    case "execution.cancel":
      return (payload as AgentOsWorkerLeaseV1CancelPayload).claim;
    case "worker.availability":
    case "placement.offer":
    case "worker.drain":
    case "worker.quarantine":
      return null;
  }
}

function payloadRecord(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  const value = record(input, "Worker lease payload");
  exact(value, keys, "Worker lease payload");
  return value;
}

function workerLeaseOperation(input: unknown): AgentOsWorkerLeaseV1Operation {
  switch (input) {
    case "worker.availability":
    case "placement.offer":
    case "claim.request":
    case "claim.ack":
    case "lease.renew":
    case "execution.progress":
    case "execution.resource-health":
    case "execution.result":
    case "execution.cancel":
    case "worker.drain":
    case "worker.quarantine":
      return input;
    default:
      fail("UNSUPPORTED_OPERATION", "Worker lease operation is unsupported");
  }
}

function workerLeaseSender(input: unknown): "control" | "worker" {
  if (input === "control" || input === "worker") return input;
  fail("INVALID_VALUE", "Worker lease sender is invalid");
}

function assertOperationSender(
  operation: AgentOsWorkerLeaseV1Operation,
  sender: "control" | "worker",
): void {
  const expected =
    operation === "worker.availability" ||
    operation === "claim.request" ||
    operation === "execution.progress" ||
    operation === "execution.resource-health" ||
    operation === "execution.result"
      ? "worker"
      : "control";
  if (sender !== expected)
    fail("DRIFT_DETECTED", `${operation} must be sent by ${expected}`);
}

function claimRejection(
  input: unknown,
): AgentOsWorkerLeaseV1ClaimRejection | null {
  if (input === null) return null;
  if (
    input === "authority_mismatch" ||
    input === "capacity_exhausted" ||
    input === "draining" ||
    input === "expired" ||
    input === "fenced"
  )
    return input;
  fail("INVALID_VALUE", "claim rejection is invalid");
}

function quarantineReason(
  input: unknown,
): AgentOsWorkerLeaseV1QuarantineReason {
  if (
    input === "artifact_corrupt" ||
    input === "authority_drift" ||
    input === "protocol_violation" ||
    input === "tenant_mismatch"
  )
    return input;
  fail("INVALID_VALUE", "quarantine reason is invalid");
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if (
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get ||
      descriptor.set
    )
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data field`);
  }
  return value as Record<string, unknown>;
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
    fail("UNKNOWN_FIELD", `${label} contains unknown or missing fields`);
}

function identifier(input: unknown, label: string): string {
  if (typeof input !== "string" || !IDENTIFIER_PATTERN.test(input))
    fail("INVALID_VALUE", `${label} must be an opaque identifier`);
  return input;
}

function digest(input: unknown, label: string): string {
  if (typeof input !== "string" || !DIGEST_PATTERN.test(input))
    fail("INVALID_VALUE", `${label} must be a sha256 digest`);
  return input;
}

function qualified<Prefix extends string>(
  input: unknown,
  prefix: Prefix,
  label: string,
): `${Prefix}:${string}` {
  const value = identifier(input, label);
  if (!value.startsWith(`${prefix}:`) || value.length === prefix.length + 1)
    fail("INVALID_VALUE", `${label} must use the ${prefix}: namespace`);
  return value as `${Prefix}:${string}`;
}

function instant(input: unknown, label: string): string {
  if (
    typeof input !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(input)
  )
    fail(
      "INVALID_VALUE",
      `${label} must be canonical RFC3339 UTC milliseconds`,
    );
  if (new Date(input).toISOString() !== input)
    fail("INVALID_VALUE", `${label} is invalid`);
  return input;
}

function positiveInteger(input: unknown, label: string): number {
  if (
    !Number.isSafeInteger(input) ||
    typeof input !== "number" ||
    input <= 0 ||
    input > MAX_SAFE_COUNTER
  )
    fail("INVALID_VALUE", `${label} must be a positive safe integer`);
  return input;
}

function nonNegativeInteger(input: unknown, label: string): number {
  if (
    !Number.isSafeInteger(input) ||
    typeof input !== "number" ||
    input < 0 ||
    input > MAX_SAFE_COUNTER
  )
    fail("INVALID_VALUE", `${label} must be a non-negative safe integer`);
  return input;
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail("INVALID_VALUE", "canonical value must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail("INVALID_SHAPE", "canonical value must be plain JSON");
  const input = value as Record<string, unknown>;
  return `{${Object.keys(input)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`)
    .join(",")}}`;
}

function fail(
  code: AgentOsWorkerLeaseV1ContractErrorCode,
  message: string,
): never {
  throw new AgentOsWorkerLeaseV1ContractError(code, message);
}
