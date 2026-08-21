import type {
  ExecutionClaimBinding,
  ExecutionGrant,
  ExecutionInstance,
  RevocationGenerationRef,
  RotationGenerationRef,
} from "./agent-os-v1-types.js";

export type AgentOsWorkerLeaseV1Operation =
  | "worker.availability"
  | "placement.offer"
  | "claim.request"
  | "claim.ack"
  | "lease.renew"
  | "execution.progress"
  | "execution.resource-health"
  | "execution.result"
  | "execution.cancel"
  | "worker.drain"
  | "worker.quarantine";

export interface AgentOsWorkerLeaseV1WorkloadIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly audience: readonly [string];
  readonly keyId: string;
  readonly rotationGeneration: RotationGenerationRef;
  readonly revocationGeneration: RevocationGenerationRef;
}

export interface AgentOsWorkerLeaseV1CapabilityManifest {
  readonly packageId: string;
  readonly packageDigest: string;
  readonly capabilityDigest: string;
}

export interface AgentOsWorkerLeaseV1Capacity {
  readonly maxActiveRuns: number;
  readonly activeRuns: number;
}

export interface AgentOsWorkerLeaseV1AvailabilityPayload {
  readonly identity: Readonly<AgentOsWorkerLeaseV1WorkloadIdentity>;
  readonly manifest: Readonly<AgentOsWorkerLeaseV1CapabilityManifest>;
  readonly capacity: Readonly<AgentOsWorkerLeaseV1Capacity>;
  readonly draining: boolean;
  readonly observedAt: string;
}

export interface AgentOsWorkerLeaseV1PlacementOfferPayload {
  readonly commandId: string;
  readonly grant: Readonly<ExecutionGrant>;
  readonly instance: Readonly<ExecutionInstance>;
  readonly manifest: Readonly<AgentOsWorkerLeaseV1CapabilityManifest>;
  readonly offeredAt: string;
  readonly expiresAt: string;
}

export interface AgentOsWorkerLeaseV1ClaimRequestPayload {
  readonly commandId: string;
  readonly grant: Readonly<ExecutionGrant>;
  readonly instance: Readonly<ExecutionInstance>;
  readonly claim: Readonly<ExecutionClaimBinding>;
}

export type AgentOsWorkerLeaseV1ClaimRejection =
  | "authority_mismatch"
  | "capacity_exhausted"
  | "draining"
  | "expired"
  | "fenced";

export interface AgentOsWorkerLeaseV1ClaimAckPayload {
  readonly commandId: string;
  readonly claim: Readonly<ExecutionClaimBinding>;
  readonly accepted: boolean;
  readonly rejection: AgentOsWorkerLeaseV1ClaimRejection | null;
}

export interface AgentOsWorkerLeaseV1RenewPayload {
  readonly commandId: string;
  readonly grant: Readonly<ExecutionGrant>;
  readonly instance: Readonly<ExecutionInstance>;
  readonly claim: Readonly<ExecutionClaimBinding>;
}

export interface AgentOsWorkerLeaseV1ProgressPayload {
  readonly commandId: string;
  readonly claim: Readonly<ExecutionClaimBinding>;
  readonly revision: number;
  readonly progressDigest: string;
  readonly observedAt: string;
}

export interface AgentOsWorkerLeaseV1ResourceHealthPayload {
  readonly commandId: string;
  readonly claim: Readonly<ExecutionClaimBinding>;
  readonly revision: number;
  readonly acquiredResourceCount: number;
  readonly observedAt: string;
}

export interface AgentOsWorkerLeaseV1ResultPayload {
  readonly commandId: string;
  readonly claim: Readonly<ExecutionClaimBinding>;
  readonly status: "succeeded" | "failed";
  readonly resultDigest: string;
  readonly artifactDigest: string | null;
  readonly completedAt: string;
}

export interface AgentOsWorkerLeaseV1CancelPayload {
  readonly commandId: string;
  readonly claim: Readonly<ExecutionClaimBinding>;
  readonly reasonDigest: string;
}

export interface AgentOsWorkerLeaseV1DrainPayload {
  readonly commandId: string;
  readonly mode: "graceful" | "immediate";
  readonly reasonDigest: string;
  readonly deadline: string;
}

export type AgentOsWorkerLeaseV1QuarantineReason =
  | "artifact_corrupt"
  | "authority_drift"
  | "protocol_violation"
  | "tenant_mismatch";

export interface AgentOsWorkerLeaseV1QuarantinePayload {
  readonly commandId: string;
  readonly targetMessageId: string;
  readonly reason: AgentOsWorkerLeaseV1QuarantineReason;
  readonly evidenceDigest: string;
}

export type AgentOsWorkerLeaseV1PayloadByOperation = Readonly<{
  "worker.availability": AgentOsWorkerLeaseV1AvailabilityPayload;
  "placement.offer": AgentOsWorkerLeaseV1PlacementOfferPayload;
  "claim.request": AgentOsWorkerLeaseV1ClaimRequestPayload;
  "claim.ack": AgentOsWorkerLeaseV1ClaimAckPayload;
  "lease.renew": AgentOsWorkerLeaseV1RenewPayload;
  "execution.progress": AgentOsWorkerLeaseV1ProgressPayload;
  "execution.resource-health": AgentOsWorkerLeaseV1ResourceHealthPayload;
  "execution.result": AgentOsWorkerLeaseV1ResultPayload;
  "execution.cancel": AgentOsWorkerLeaseV1CancelPayload;
  "worker.drain": AgentOsWorkerLeaseV1DrainPayload;
  "worker.quarantine": AgentOsWorkerLeaseV1QuarantinePayload;
}>;

export type AgentOsWorkerLeaseV1Payload =
  AgentOsWorkerLeaseV1PayloadByOperation[AgentOsWorkerLeaseV1Operation];

export type AgentOsWorkerLeaseV1Envelope<
  Operation extends AgentOsWorkerLeaseV1Operation = AgentOsWorkerLeaseV1Operation,
> = Readonly<{
  schemaVersion: "agent-os-worker-lease/v1";
  operation: Operation;
  sender: "control" | "worker";
  messageId: string;
  correlationId: string;
  sequence: number;
  leaderTerm: number;
  controlId: string;
  tenantId: string;
  workloadId: string;
  workerId: string;
  requestedAt: string;
  deadline: string;
  payloadDigest: string;
  envelopeDigest: string;
  payload: Readonly<AgentOsWorkerLeaseV1PayloadByOperation[Operation]>;
}>;

export type AgentOsWorkerLeaseV1ContractErrorCode =
  | "DIGEST_MISMATCH"
  | "DRIFT_DETECTED"
  | "GRANT_EXPANSION"
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "UNKNOWN_FIELD"
  | "UNSUPPORTED_OPERATION"
  | "UNSUPPORTED_VERSION";

export type AgentOsWorkerLeaseV1ConformanceScenarioId =
  | "artifact-corruption"
  | "cancel"
  | "claim-race"
  | "duplicate"
  | "leader-switch"
  | "lease-expiry"
  | "old-generation-writer"
  | "out-of-order"
  | "partition-reconnect"
  | "rolling-drain"
  | "tenant-isolation";

export interface AgentOsWorkerLeaseV1ConformanceScenario {
  readonly id: AgentOsWorkerLeaseV1ConformanceScenarioId;
  readonly expected: "accept" | "reject";
  readonly rejectionCode: string | null;
}

export interface AgentOsWorkerLeaseV1ConformanceResult {
  readonly id: AgentOsWorkerLeaseV1ConformanceScenarioId;
  readonly actual: "accept" | "reject";
  readonly rejectionCode: string | null;
  readonly forbiddenSideEffectCalls: number;
}
