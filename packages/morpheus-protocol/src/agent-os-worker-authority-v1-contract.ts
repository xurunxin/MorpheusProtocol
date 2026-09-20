import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import {
  parseAgentOsWorkerBudgetReconciliationInputV1,
  parseAgentOsWorkerBudgetReconciliationReceiptV1,
  assertAgentOsWorkerBudgetReconciliationBindingV1,
  type AgentOsWorkerBudgetReconciliationInputV1,
  type AgentOsWorkerBudgetReconciliationReceiptV1,
} from "./agent-os-worker-budget-reconciliation-v1-contract.js";
import {
  parseAgentOsV1Contract,
  parseAgentOsV1ExecutionGrant,
  parseAgentOsV1ExecutionInstance,
  parseAgentOsV1ExecutionClaimBinding,
} from "./agent-os-v1-contract.js";
import {
  parseAgentOsEffectIntentV1,
  parseAgentOsEffectPermitRequestV1,
  parseAgentOsEffectPermitV1,
  createAgentOsEffectIntentDigestV1,
  createAgentOsEffectPermitRequestDigestV1,
} from "./agent-os-effect-v1-contract.js";
import {
  parseAgentOsBudgetReservationRequestV1,
  parseAgentOsBudgetReservationReceiptV1,
  parseAgentOsBudgetCurrentStateV1,
} from "./agent-os-run-tree-budget-v1-contract.js";
import { parseAgentOsEffectBudgetAdmissionApplicationV1 } from "./agent-os-effect-budget-admission-v1-contract.js";

/** Private supervisor/Worker/Control channel. A parsed message is not authorization. */
export const AGENT_OS_WORKER_AUTHORITY_V1 =
  "agent-os-worker-authority/v1" as const;
export const AGENT_OS_WORKER_AUTHORITY_MAX_BYTES = 1_048_576;

export interface AgentOsWorkerWriterIdentityV1 {
  readonly commandId: string;
  readonly grantId: string;
  readonly runId: string;
  readonly storeId: string;
  readonly writerIncarnationId: string;
  readonly claimId: string;
}

export interface AgentOsWorkerWriterConsumeV1 extends AgentOsWorkerWriterIdentityV1 {
  readonly claimFence: number;
  readonly operationDigest: string;
}

export interface AgentOsWorkerWriterRecoverV1 {
  readonly source: AgentOsWorkerWriterIdentityV1 & {
    readonly expectedClaimFence: number;
  };
  readonly recovery: { readonly commandId: string };
}

export interface AgentOsWorkerWriterReceiptV1 {
  readonly grantId: string;
  readonly runId: string;
  readonly storeId: string;
  readonly leaseId: string;
  readonly leaseEpoch: `lease-epoch:${string}`;
  readonly instanceId: string;
  readonly writerIncarnationId: string;
  readonly claimId: string;
  readonly claimFence: number;
  readonly deadline: string;
  readonly authorityCommittedAt: string;
  readonly state: "active" | "consumed";
  readonly duplicate: boolean;
}

type WriterRequest =
  | {
      readonly operation: "writer.activate";
      readonly payload: AgentOsWorkerWriterIdentityV1;
    }
  | {
      readonly operation: "writer.recover";
      readonly payload: AgentOsWorkerWriterRecoverV1;
    }
  | {
      readonly operation: "writer.consume";
      readonly payload: AgentOsWorkerWriterConsumeV1;
    };

export interface AgentOsWorkerRunAuthorizationV1 {
  readonly ownerRevision: number;
  readonly ownerDigest: string;
  readonly turnId: string;
  readonly contract: Omit<
    ReturnType<typeof parseAgentOsV1Contract>,
    "canonicalSource"
  >;
  readonly duplicate: boolean;
}

/** Facts captured in one Control transaction. Worker still checks its own Kernel fence. */
export interface AgentOsWorkerCurrentAuthorityV1 {
  readonly ownerRevision: number;
  readonly ownerDigest: string;
  readonly authorityNow: string;
  readonly keyId: string;
  readonly rotationGeneration: `rotation:${string}`;
  readonly revocationGeneration: `revocation:${string}`;
  readonly grant: ReturnType<typeof parseAgentOsV1ExecutionGrant>;
  readonly grantStatus: "active" | "revoked";
  readonly instance: ReturnType<typeof parseAgentOsV1ExecutionInstance>;
  readonly writer: AgentOsWorkerWriterReceiptV1 | null;
}

type ControlRequest =
  | {
      readonly operation: "run.authorize";
      readonly payload: {
        readonly commandId: string;
        readonly runId: string;
        readonly turnId: string;
        readonly attemptId: string;
      };
    }
  | {
      readonly operation: "authority.read";
      readonly payload: { readonly grantId: string; readonly runId: string };
    };

/** A trusted Worker's committed-source observation, never Control-owned Kernel truth. */
export interface AgentOsWorkerPreparationEvidenceV1 {
  readonly effectId: string;
  readonly runId: string;
  readonly turnId: string;
  readonly attemptId: string;
  readonly storeId: string;
  readonly storeGeneration: number;
  readonly claimId: string;
  readonly claimFence: number;
  readonly logicalKey: string;
  readonly preparationDigest: string;
  readonly kernelFenceDigest: string;
  readonly intentDigest: string;
  readonly permitDigest: string;
  readonly preparedAt: string;
}

export interface AgentOsWorkerEffectPermitInputV1 {
  readonly commandId: string;
  readonly permitId: string;
  readonly claim: ReturnType<typeof parseAgentOsV1ExecutionClaimBinding>;
  readonly intent: ReturnType<typeof parseAgentOsEffectIntentV1>;
  readonly request: ReturnType<typeof parseAgentOsEffectPermitRequestV1>;
}
export interface AgentOsWorkerEffectBudgetInputV1 {
  readonly commandId: string;
  readonly claim: ReturnType<typeof parseAgentOsV1ExecutionClaimBinding>;
  readonly intent: ReturnType<typeof parseAgentOsEffectIntentV1>;
  readonly permit: ReturnType<typeof parseAgentOsEffectPermitV1>;
  readonly preparation: AgentOsWorkerPreparationEvidenceV1;
}
export interface AgentOsWorkerEffectReadInputV1 {
  readonly grantId: string;
  readonly runId: string;
  readonly attemptId: string;
  readonly storeId: string;
  readonly effectId: string;
  readonly permitId: string;
  readonly reservationId: string;
}
export interface AgentOsWorkerEffectBudgetReceiptV1 {
  readonly application: ReturnType<
    typeof parseAgentOsEffectBudgetAdmissionApplicationV1
  >;
  readonly request: ReturnType<typeof parseAgentOsBudgetReservationRequestV1>;
  readonly receipt: ReturnType<typeof parseAgentOsBudgetReservationReceiptV1>;
  readonly reservationState: ReturnType<
    typeof parseAgentOsBudgetCurrentStateV1
  >;
  readonly kernelFenceDigest: string;
}
export interface AgentOsWorkerEffectCurrentAuthorityV1 {
  readonly authority: AgentOsWorkerCurrentAuthorityV1;
  readonly intent: ReturnType<typeof parseAgentOsEffectIntentV1>;
  readonly permit: ReturnType<typeof parseAgentOsEffectPermitV1>;
  readonly permitStatus: "active" | "revoked";
  readonly budget: AgentOsWorkerEffectBudgetReceiptV1;
}
type EffectRequest =
  | {
      readonly operation: "effect.budget.reconcile";
      readonly payload: AgentOsWorkerBudgetReconciliationInputV1;
    }
  | {
      readonly operation: "effect.permit.issue";
      readonly payload: AgentOsWorkerEffectPermitInputV1;
    }
  | {
      readonly operation: "effect.budget.admit";
      readonly payload: AgentOsWorkerEffectBudgetInputV1;
    }
  | {
      readonly operation: "effect.authority.read";
      readonly payload: AgentOsWorkerEffectReadInputV1;
    };

export type AgentOsWorkerAuthorityRequestV1 = Readonly<{
  readonly schemaVersion: typeof AGENT_OS_WORKER_AUTHORITY_V1;
  readonly requestId: string;
  readonly workerId: string;
}> &
  (WriterRequest | ControlRequest | EffectRequest);

type AuthorityOperation = AgentOsWorkerAuthorityRequestV1["operation"];

export type AgentOsWorkerAuthorityResponseV1 = Readonly<{
  readonly schemaVersion: typeof AGENT_OS_WORKER_AUTHORITY_V1;
  readonly requestId: string;
  readonly workerId: string;
  readonly requestDigest: string;
  readonly authorityNow: string;
}> &
  (
    | {
        readonly status: "accepted";
        readonly operation: `${WriterRequest["operation"]}.receipt`;
        readonly receipt: AgentOsWorkerWriterReceiptV1;
      }
    | {
        readonly status: "accepted";
        readonly operation: "run.authorize.receipt";
        readonly receipt: AgentOsWorkerRunAuthorizationV1;
      }
    | {
        readonly status: "accepted";
        readonly operation: "authority.read.receipt";
        readonly receipt: AgentOsWorkerCurrentAuthorityV1;
      }
    | {
        readonly status: "accepted";
        readonly operation: "effect.permit.issue.receipt";
        readonly receipt: ReturnType<typeof parseAgentOsEffectPermitV1>;
      }
    | {
        readonly status: "accepted";
        readonly operation: "effect.budget.reconcile.receipt";
        readonly receipt: AgentOsWorkerBudgetReconciliationReceiptV1;
      }
    | {
        readonly status: "accepted";
        readonly operation: "effect.budget.admit.receipt";
        readonly receipt: AgentOsWorkerEffectBudgetReceiptV1;
      }
    | {
        readonly status: "accepted";
        readonly operation: "effect.authority.read.receipt";
        readonly receipt: AgentOsWorkerEffectCurrentAuthorityV1;
      }
    | {
        readonly status: "rejected";
        readonly operation: `${AuthorityOperation}.receipt`;
        readonly code:
          | "UNAVAILABLE"
          | "INVALID_AUTHORITY"
          | "IDEMPOTENCY_CONFLICT"
          | "NOT_FOUND"
          | "WRITER_FENCED";
      }
  );

export class AgentOsWorkerAuthorityContractError extends Error {
  constructor() {
    super("INVALID_WORKER_AUTHORITY_MESSAGE");
    this.name = "AgentOsWorkerAuthorityContractError";
  }
}

const writerKeys = [
  "commandId",
  "grantId",
  "runId",
  "storeId",
  "writerIncarnationId",
  "claimId",
] as const;

export function parseAgentOsWorkerAuthorityRequestV1(
  input: unknown,
): AgentOsWorkerAuthorityRequestV1 {
  bounded(input);
  const value = record(input, [
    "schemaVersion",
    "requestId",
    "workerId",
    "operation",
    "payload",
  ]);
  if (value.schemaVersion !== AGENT_OS_WORKER_AUTHORITY_V1) invalid();
  const base = {
    schemaVersion: AGENT_OS_WORKER_AUTHORITY_V1,
    requestId: id(value.requestId),
    workerId: id(value.workerId),
  };
  if (value.operation === "effect.budget.reconcile") {
    const payload = parseAgentOsWorkerBudgetReconciliationInputV1(
      value.payload,
    );
    if (payload.dispatchReceipt.authority.hostId !== base.workerId) invalid();
    return deepFreeze({ ...base, operation: value.operation, payload });
  }
  if (value.operation === "effect.permit.issue")
    return deepFreeze({
      ...base,
      operation: value.operation,
      payload: parseAgentOsWorkerEffectPermitInputV1(value.payload),
    });
  if (value.operation === "effect.budget.admit")
    return deepFreeze({
      ...base,
      operation: value.operation,
      payload: parseAgentOsWorkerEffectBudgetInputV1(value.payload),
    });
  if (value.operation === "effect.authority.read") {
    const payload = record(value.payload, [
      "grantId",
      "runId",
      "attemptId",
      "storeId",
      "effectId",
      "permitId",
      "reservationId",
    ]);
    return deepFreeze({
      ...base,
      operation: value.operation,
      payload: {
        grantId: id(payload.grantId),
        runId: id(payload.runId),
        attemptId: id(payload.attemptId),
        storeId: id(payload.storeId),
        effectId: id(payload.effectId),
        permitId: id(payload.permitId),
        reservationId: id(payload.reservationId),
      },
    });
  }
  if (value.operation === "run.authorize") {
    const payload = record(value.payload, [
      "commandId",
      "runId",
      "turnId",
      "attemptId",
    ]);
    return deepFreeze({
      ...base,
      operation: value.operation,
      payload: {
        commandId: id(payload.commandId),
        runId: id(payload.runId),
        turnId: id(payload.turnId),
        attemptId: id(payload.attemptId),
      },
    });
  }
  if (value.operation === "authority.read") {
    const payload = record(value.payload, ["grantId", "runId"]);
    return deepFreeze({
      ...base,
      operation: value.operation,
      payload: { grantId: id(payload.grantId), runId: id(payload.runId) },
    });
  }
  if (value.operation === "writer.activate") {
    const payload = record(value.payload, writerKeys);
    return deepFreeze({
      ...base,
      operation: value.operation,
      payload: writerIdentity(payload),
    });
  }
  if (value.operation === "writer.recover") {
    const payload = record(value.payload, ["source", "recovery"]);
    const source = record(payload.source, [
      ...writerKeys,
      "expectedClaimFence",
    ]);
    const recovery = record(payload.recovery, ["commandId"]);
    return deepFreeze({
      ...base,
      operation: value.operation,
      payload: {
        source: {
          ...writerIdentity(source),
          expectedClaimFence: counter(source.expectedClaimFence),
        },
        recovery: { commandId: id(recovery.commandId) },
      },
    });
  }
  if (value.operation === "writer.consume") {
    const payload = record(value.payload, [
      ...writerKeys,
      "claimFence",
      "operationDigest",
    ]);
    return deepFreeze({
      ...base,
      operation: value.operation,
      payload: {
        ...writerIdentity(payload),
        claimFence: counter(payload.claimFence),
        operationDigest: digest(payload.operationDigest),
      },
    });
  }
  return invalid();
}

export function parseAgentOsWorkerRunAuthorizationV1(
  input: unknown,
): AgentOsWorkerRunAuthorizationV1 {
  const value = record(input, [
    "ownerRevision",
    "ownerDigest",
    "turnId",
    "contract",
    "duplicate",
  ]);
  if (typeof value.duplicate !== "boolean") invalid();
  const { canonicalSource: _canonicalSource, ...contract } =
    parseAgentOsV1Contract(value.contract);
  if (
    contract.hostProfile.hostKind !== "worker" ||
    contract.executionGrant.kind !== "remote"
  )
    invalid();
  return deepFreeze({
    ownerRevision: counter(value.ownerRevision),
    ownerDigest: digest(value.ownerDigest),
    turnId: id(value.turnId),
    contract,
    duplicate: value.duplicate,
  });
}

function assertClaimIntent(
  claim: AgentOsWorkerEffectPermitInputV1["claim"],
  intent: AgentOsWorkerEffectPermitInputV1["intent"],
): void {
  for (const key of [
    "grantId",
    "leaseId",
    "leaseEpoch",
    "authorityDomain",
    "runId",
    "attemptId",
    "instanceId",
    "instanceGeneration",
    "storeId",
    "storeGeneration",
    "claimId",
    "claimFence",
  ] as const)
    if (claim[key] !== intent.authority[key]) invalid();
}

function assertPermitIntent(
  intent: AgentOsWorkerEffectPermitInputV1["intent"],
  permit: AgentOsWorkerEffectBudgetInputV1["permit"],
): void {
  if (permit.intentDigest !== createAgentOsEffectIntentDigestV1(intent))
    invalid();
  for (const key of [
    "effectId",
    "adapterKind",
    "adapterId",
    "targetRef",
    "logicalKey",
    "requestSchemaDigest",
    "responseSchemaDigest",
    "handlerDigest",
    "inputDigest",
    "idempotencyKey",
  ] as const)
    if (permit[key] !== intent[key]) invalid();
  if (
    JSON.stringify(permit.authority) !== JSON.stringify(intent.authority) ||
    JSON.stringify(permit.capability) !== JSON.stringify(intent.capability)
  )
    invalid();
}

export function parseAgentOsWorkerEffectPermitInputV1(
  input: unknown,
): AgentOsWorkerEffectPermitInputV1 {
  const value = record(input, [
    "commandId",
    "permitId",
    "claim",
    "intent",
    "request",
  ]);
  const claim = parseAgentOsV1ExecutionClaimBinding(value.claim);
  const intent = parseAgentOsEffectIntentV1(value.intent);
  const request = parseAgentOsEffectPermitRequestV1(value.request);
  assertClaimIntent(claim, intent);
  if (
    request.intentDigest !== createAgentOsEffectIntentDigestV1(intent) ||
    request.effectId !== intent.effectId ||
    JSON.stringify(request.authority) !== JSON.stringify(intent.authority)
  )
    invalid();
  for (const key of [
    "adapterKind",
    "adapterId",
    "targetRef",
    "logicalKey",
    "requestSchemaDigest",
    "responseSchemaDigest",
    "handlerDigest",
    "inputDigest",
    "idempotencyKey",
  ] as const)
    if (request[key] !== intent[key]) invalid();
  if (JSON.stringify(request.capability) !== JSON.stringify(intent.capability))
    invalid();
  return deepFreeze({
    commandId: id(value.commandId),
    permitId: id(value.permitId),
    claim,
    intent,
    request,
  });
}

export function parseAgentOsWorkerEffectBudgetInputV1(
  input: unknown,
): AgentOsWorkerEffectBudgetInputV1 {
  const value = record(input, [
    "commandId",
    "claim",
    "intent",
    "permit",
    "preparation",
  ]);
  const claim = parseAgentOsV1ExecutionClaimBinding(value.claim);
  const intent = parseAgentOsEffectIntentV1(value.intent);
  const permit = parseAgentOsEffectPermitV1(value.permit);
  assertClaimIntent(claim, intent);
  assertPermitIntent(intent, permit);
  const p = record(value.preparation, [
    "effectId",
    "runId",
    "turnId",
    "attemptId",
    "storeId",
    "storeGeneration",
    "claimId",
    "claimFence",
    "logicalKey",
    "preparationDigest",
    "kernelFenceDigest",
    "intentDigest",
    "permitDigest",
    "preparedAt",
  ]);
  for (const key of [
    "runId",
    "turnId",
    "attemptId",
    "storeId",
    "storeGeneration",
    "claimId",
    "claimFence",
  ] as const)
    if (p[key] !== intent.authority[key]) invalid();
  if (
    p.effectId !== intent.effectId ||
    p.logicalKey !== intent.logicalKey ||
    p.intentDigest !== createAgentOsEffectIntentDigestV1(intent) ||
    p.permitDigest !== permit.permitDigest
  )
    invalid();
  const preparation: AgentOsWorkerPreparationEvidenceV1 = {
    effectId: intent.effectId,
    runId: intent.authority.runId,
    turnId: intent.authority.turnId,
    attemptId: intent.authority.attemptId,
    storeId: claim.storeId,
    storeGeneration: claim.storeGeneration,
    claimId: claim.claimId,
    claimFence: claim.claimFence,
    logicalKey: intent.logicalKey,
    preparationDigest: digest(p.preparationDigest),
    kernelFenceDigest: digest(p.kernelFenceDigest),
    intentDigest: digest(p.intentDigest),
    permitDigest: digest(p.permitDigest),
    preparedAt: instant(p.preparedAt),
  };
  if (
    preparation.preparedAt < intent.createdAt ||
    preparation.preparedAt < permit.issuedAt
  )
    invalid();
  return deepFreeze({
    commandId: id(value.commandId),
    claim,
    intent,
    permit,
    preparation,
  });
}

export function parseAgentOsWorkerEffectBudgetReceiptV1(
  input: unknown,
): AgentOsWorkerEffectBudgetReceiptV1 {
  const value = record(input, [
    "application",
    "request",
    "receipt",
    "reservationState",
    "kernelFenceDigest",
  ]);
  const application = parseAgentOsEffectBudgetAdmissionApplicationV1(
    value.application,
  );
  const request = parseAgentOsBudgetReservationRequestV1(value.request);
  const receipt = parseAgentOsBudgetReservationReceiptV1(value.receipt);
  const reservationState = parseAgentOsBudgetCurrentStateV1(
    value.reservationState,
  );
  const kernelFenceDigest = digest(value.kernelFenceDigest);
  if (
    reservationState.ceilingDigest !== receipt.ceilingDigest ||
    reservationState.ceilingRevision !== receipt.ceilingRevision ||
    JSON.stringify(reservationState.reserved) !==
      JSON.stringify(receipt.reserved)
  )
    invalid();
  if (
    request.subject.kind !== "effect" ||
    application.effectId !== request.subject.effectId ||
    application.commandId !== request.commandId ||
    application.reservationId !== request.reservationId ||
    receipt.reservationId !== request.reservationId ||
    receipt.commandId !== request.commandId ||
    application.requestDigest !== request.requestDigest ||
    receipt.requestDigest !== request.requestDigest ||
    application.reservationReceiptDigest !== receipt.receiptDigest ||
    application.effectPermitDigest !== request.effectPermitDigest ||
    application.kernelFenceDigest !== kernelFenceDigest ||
    request.kernelFenceDigest !== kernelFenceDigest ||
    reservationState.ownerReservationId !== request.reservationId ||
    reservationState.ownerReservationReceiptDigest !== receipt.receiptDigest ||
    reservationState.ceilingId !== request.ceilingId ||
    receipt.disposition !== "reserved"
  )
    invalid();
  for (const key of [
    "ceilingId",
    "ceilingDigest",
    "parentReservationId",
    "attributionKey",
    "chargeKey",
  ] as const)
    if (receipt[key] !== request[key]) invalid();
  if (
    receipt.ceilingRevision !== request.expectedCeilingRevision ||
    receipt.balanceStateDigest !== request.balanceStateDigest ||
    receipt.balanceRevision !== request.expectedBalanceRevision + 1 ||
    JSON.stringify(receipt.reserved) !== JSON.stringify(request.requested) ||
    receipt.committedAt < request.requestedAt ||
    reservationState.capturedAt < receipt.committedAt ||
    reservationState.reservationRevision < receipt.reservationRevision
  )
    invalid();
  return deepFreeze({
    application,
    request,
    receipt,
    reservationState,
    kernelFenceDigest,
  });
}

export function parseAgentOsWorkerEffectCurrentAuthorityV1(
  input: unknown,
): AgentOsWorkerEffectCurrentAuthorityV1 {
  const value = record(input, [
    "authority",
    "intent",
    "permit",
    "permitStatus",
    "budget",
  ]);
  const authority = parseAgentOsWorkerCurrentAuthorityV1(value.authority);
  const intent = parseAgentOsEffectIntentV1(value.intent);
  const permit = parseAgentOsEffectPermitV1(value.permit);
  const budget = parseAgentOsWorkerEffectBudgetReceiptV1(value.budget);
  if (value.permitStatus !== "active" && value.permitStatus !== "revoked")
    invalid();
  assertPermitIntent(intent, permit);
  assertBudgetIntent(budget, intent, permit);
  if (
    authority.grant.grantId !== intent.authority.grantId ||
    authority.grant.runId !== intent.authority.runId ||
    authority.grant.attemptId !== intent.authority.attemptId ||
    authority.grant.hostId !== intent.authority.hostId ||
    budget.reservationState.capturedAt > authority.authorityNow
  )
    invalid();
  return deepFreeze({
    authority,
    intent,
    permit,
    permitStatus: value.permitStatus,
    budget,
  });
}

function assertBudgetIntent(
  budget: AgentOsWorkerEffectBudgetReceiptV1,
  intent: AgentOsWorkerEffectBudgetInputV1["intent"],
  permit: AgentOsWorkerEffectBudgetInputV1["permit"],
): void {
  if (
    budget.application.effectPermitDigest !== permit.permitDigest ||
    budget.application.effectId !== intent.effectId ||
    budget.request.subject.logicalKey !== intent.logicalKey
  )
    invalid();
  for (const key of [
    "runId",
    "turnId",
    "attemptId",
    "storeGeneration",
  ] as const)
    if (budget.request.subject[key] !== intent.authority[key]) invalid();
}

export function parseAgentOsWorkerCurrentAuthorityV1(
  input: unknown,
): AgentOsWorkerCurrentAuthorityV1 {
  const value = record(input, [
    "ownerRevision",
    "ownerDigest",
    "authorityNow",
    "keyId",
    "rotationGeneration",
    "revocationGeneration",
    "grant",
    "grantStatus",
    "instance",
    "writer",
  ]);
  if (value.grantStatus !== "active" && value.grantStatus !== "revoked")
    invalid();
  const grant = parseAgentOsV1ExecutionGrant(value.grant);
  if (grant.kind !== "remote") invalid();
  const instance = parseAgentOsV1ExecutionInstance(value.instance);
  if (instance.deploymentId !== grant.deploymentId) invalid();
  const writer =
    value.writer === null
      ? null
      : parseAgentOsWorkerWriterReceiptV1(value.writer);
  if (writer !== null && writer.runId !== grant.runId) invalid();
  const rotationGeneration = value.rotationGeneration;
  const revocationGeneration = value.revocationGeneration;
  if (
    typeof rotationGeneration !== "string" ||
    !/^rotation:[a-z0-9][a-z0-9._/-]{0,127}$/u.test(rotationGeneration)
  )
    invalid();
  if (
    typeof revocationGeneration !== "string" ||
    !/^revocation:[a-z0-9][a-z0-9._/-]{0,127}$/u.test(revocationGeneration)
  )
    invalid();
  const authorityNow = instant(value.authorityNow);
  if (writer !== null && writer.authorityCommittedAt > authorityNow) invalid();
  return deepFreeze({
    ownerRevision: counter(value.ownerRevision),
    ownerDigest: digest(value.ownerDigest),
    authorityNow,
    keyId: id(value.keyId),
    rotationGeneration: rotationGeneration as `rotation:${string}`,
    revocationGeneration: revocationGeneration as `revocation:${string}`,
    grant,
    grantStatus: value.grantStatus,
    instance,
    writer,
  });
}

export function parseAgentOsWorkerWriterReceiptV1(
  input: unknown,
): AgentOsWorkerWriterReceiptV1 {
  const value = record(input, [
    "grantId",
    "runId",
    "storeId",
    "leaseId",
    "leaseEpoch",
    "instanceId",
    "writerIncarnationId",
    "claimId",
    "claimFence",
    "deadline",
    "authorityCommittedAt",
    "state",
    "duplicate",
  ]);
  if (value.state !== "active" && value.state !== "consumed") invalid();
  if (typeof value.duplicate !== "boolean") invalid();
  const leaseEpoch = value.leaseEpoch;
  if (
    typeof leaseEpoch !== "string" ||
    !/^lease-epoch:[a-z0-9][a-z0-9._/-]{0,127}$/u.test(leaseEpoch)
  )
    invalid();
  const deadline = instant(value.deadline);
  const authorityCommittedAt = instant(value.authorityCommittedAt);
  if (authorityCommittedAt >= deadline) invalid();
  return deepFreeze({
    grantId: id(value.grantId),
    runId: id(value.runId),
    storeId: id(value.storeId),
    leaseId: id(value.leaseId),
    leaseEpoch: leaseEpoch as `lease-epoch:${string}`,
    instanceId: id(value.instanceId),
    writerIncarnationId: id(value.writerIncarnationId),
    claimId: id(value.claimId),
    claimFence: counter(value.claimFence),
    deadline,
    authorityCommittedAt,
    state: value.state,
    duplicate: value.duplicate,
  });
}

export function parseAgentOsWorkerAuthorityResponseV1(
  input: unknown,
): AgentOsWorkerAuthorityResponseV1 {
  bounded(input);
  if (input === null || typeof input !== "object" || Array.isArray(input))
    invalid();
  const raw = input as Record<string, unknown>;
  const value = record(raw, [
    "schemaVersion",
    "requestId",
    "workerId",
    "requestDigest",
    "operation",
    "authorityNow",
    "status",
    ...(raw.status === "accepted" ? ["receipt"] : ["code"]),
  ]);
  if (value.schemaVersion !== AGENT_OS_WORKER_AUTHORITY_V1) invalid();
  const operation = value.operation;
  if (
    operation !== "writer.activate.receipt" &&
    operation !== "writer.recover.receipt" &&
    operation !== "writer.consume.receipt" &&
    operation !== "run.authorize.receipt" &&
    operation !== "authority.read.receipt" &&
    operation !== "effect.permit.issue.receipt" &&
    operation !== "effect.budget.admit.receipt" &&
    operation !== "effect.budget.reconcile.receipt" &&
    operation !== "effect.authority.read.receipt"
  )
    invalid();
  const base = {
    schemaVersion: AGENT_OS_WORKER_AUTHORITY_V1,
    requestId: id(value.requestId),
    workerId: id(value.workerId),
    requestDigest: digest(value.requestDigest),
    operation,
    authorityNow: instant(value.authorityNow),
  } as const;
  if (value.status === "accepted") {
    if (operation === "effect.budget.reconcile.receipt") {
      const receipt = parseAgentOsWorkerBudgetReconciliationReceiptV1(
        value.receipt,
      );
      if (
        receipt.reservationState.capturedAt > base.authorityNow ||
        (receipt.settlement !== null &&
          receipt.settlement.occurredAt > base.authorityNow)
      )
        invalid();
      return deepFreeze({ ...base, operation, status: "accepted", receipt });
    }
    if (operation === "effect.permit.issue.receipt") {
      const receipt = parseAgentOsEffectPermitV1(value.receipt);
      if (receipt.issuedAt > base.authorityNow) invalid();
      return deepFreeze({ ...base, operation, status: "accepted", receipt });
    }
    if (operation === "effect.budget.admit.receipt") {
      const receipt = parseAgentOsWorkerEffectBudgetReceiptV1(value.receipt);
      if (receipt.reservationState.capturedAt > base.authorityNow) invalid();
      return deepFreeze({ ...base, operation, status: "accepted", receipt });
    }
    if (operation === "effect.authority.read.receipt") {
      const receipt = parseAgentOsWorkerEffectCurrentAuthorityV1(value.receipt);
      if (receipt.authority.authorityNow !== base.authorityNow) invalid();
      return deepFreeze({ ...base, operation, status: "accepted", receipt });
    }
    if (operation === "run.authorize.receipt")
      return deepFreeze({
        ...base,
        operation,
        status: "accepted",
        receipt: parseAgentOsWorkerRunAuthorizationV1(value.receipt),
      });
    if (operation === "authority.read.receipt") {
      const receipt = parseAgentOsWorkerCurrentAuthorityV1(value.receipt);
      if (receipt.authorityNow !== base.authorityNow) invalid();
      return deepFreeze({ ...base, operation, status: "accepted", receipt });
    }
    const receipt = parseAgentOsWorkerWriterReceiptV1(value.receipt);
    if (
      receipt.state !==
      (operation === "writer.consume.receipt" ? "consumed" : "active")
    )
      invalid();
    if (receipt.authorityCommittedAt > base.authorityNow) invalid();
    return deepFreeze({ ...base, operation, status: "accepted", receipt });
  }
  const code = value.code;
  if (
    value.status !== "rejected" ||
    (code !== "UNAVAILABLE" &&
      code !== "INVALID_AUTHORITY" &&
      code !== "IDEMPOTENCY_CONFLICT" &&
      code !== "NOT_FOUND" &&
      code !== "WRITER_FENCED")
  )
    invalid();
  return deepFreeze({ ...base, status: "rejected", code });
}

export function encodeAgentOsWorkerAuthorityRequestV1(input: unknown): string {
  return JSON.stringify(parseAgentOsWorkerAuthorityRequestV1(input));
}
export function encodeAgentOsWorkerAuthorityResponseV1(input: unknown): string {
  return JSON.stringify(parseAgentOsWorkerAuthorityResponseV1(input));
}
export function createAgentOsWorkerAuthorityRequestDigestV1(
  input: unknown,
): string {
  return `sha256:${sha256Hex(encodeAgentOsWorkerAuthorityRequestV1(input))}`;
}
export function assertAgentOsWorkerAuthorityResponseBindingV1(
  requestInput: unknown,
  responseInput: unknown,
): void {
  const request = parseAgentOsWorkerAuthorityRequestV1(requestInput);
  const response = parseAgentOsWorkerAuthorityResponseV1(responseInput);
  if (
    response.requestId !== request.requestId ||
    response.workerId !== request.workerId ||
    response.operation !== `${request.operation}.receipt` ||
    response.requestDigest !==
      createAgentOsWorkerAuthorityRequestDigestV1(request)
  )
    invalid();
  if (response.status === "rejected") return;
  if (request.operation === "effect.budget.reconcile") {
    if (response.operation !== "effect.budget.reconcile.receipt") invalid();
    if (request.payload.dispatchReceipt.completedAt > response.authorityNow)
      invalid();
    assertAgentOsWorkerBudgetReconciliationBindingV1(
      request.payload,
      response.receipt,
    );
    return;
  }
  if (request.operation === "effect.permit.issue") {
    if (response.operation !== "effect.permit.issue.receipt") invalid();
    assertPermitIntent(request.payload.intent, response.receipt);
    if (
      response.receipt.permitId !== request.payload.permitId ||
      response.receipt.requestDigest !==
        createAgentOsEffectPermitRequestDigestV1(request.payload.request) ||
      response.receipt.authority.hostId !== request.workerId
    )
      invalid();
    return;
  }
  if (request.operation === "effect.budget.admit") {
    if (response.operation !== "effect.budget.admit.receipt") invalid();
    assertBudgetIntent(
      response.receipt,
      request.payload.intent,
      request.payload.permit,
    );
    if (
      response.receipt.application.commandId !== request.payload.commandId ||
      response.receipt.kernelFenceDigest !==
        request.payload.preparation.kernelFenceDigest ||
      request.payload.intent.authority.hostId !== request.workerId
    )
      invalid();
    return;
  }
  if (request.operation === "effect.authority.read") {
    if (response.operation !== "effect.authority.read.receipt") invalid();
    const receipt = response.receipt;
    for (const key of ["grantId", "runId", "attemptId", "storeId"] as const)
      if (receipt.intent.authority[key] !== request.payload[key]) invalid();
    if (
      receipt.intent.effectId !== request.payload.effectId ||
      receipt.permit.permitId !== request.payload.permitId ||
      receipt.budget.application.reservationId !==
        request.payload.reservationId ||
      receipt.authority.grant.hostId !== request.workerId
    )
      invalid();
    return;
  }
  if (request.operation === "run.authorize") {
    if (response.operation !== "run.authorize.receipt") invalid();
    const grant = response.receipt.contract.executionGrant;
    if (
      grant.runId !== request.payload.runId ||
      grant.attemptId !== request.payload.attemptId ||
      response.receipt.turnId !== request.payload.turnId ||
      grant.hostId !== request.workerId
    )
      invalid();
    return;
  }
  if (request.operation === "authority.read") {
    if (response.operation !== "authority.read.receipt") invalid();
    if (
      response.receipt.grant.grantId !== request.payload.grantId ||
      response.receipt.grant.runId !== request.payload.runId ||
      response.receipt.grant.hostId !== request.workerId
    )
      invalid();
    return;
  }
  if (
    response.operation === "run.authorize.receipt" ||
    response.operation === "authority.read.receipt" ||
    response.operation === "effect.permit.issue.receipt" ||
    response.operation === "effect.budget.admit.receipt" ||
    response.operation === "effect.budget.reconcile.receipt" ||
    response.operation === "effect.authority.read.receipt"
  )
    invalid();
  const source =
    request.operation === "writer.recover"
      ? request.payload.source
      : request.payload;
  for (const key of [
    "grantId",
    "runId",
    "storeId",
    "writerIncarnationId",
    "claimId",
  ] as const)
    if (response.receipt[key] !== source[key]) invalid();
  if (
    request.operation === "writer.consume" &&
    response.receipt.claimFence !== request.payload.claimFence
  )
    invalid();
  if (
    request.operation === "writer.recover" &&
    response.receipt.claimFence <= request.payload.source.expectedClaimFence
  )
    invalid();
}
export function decodeAgentOsWorkerAuthorityRequestV1(
  source: string,
): AgentOsWorkerAuthorityRequestV1 {
  if (
    new TextEncoder().encode(source).length >
    AGENT_OS_WORKER_AUTHORITY_MAX_BYTES
  )
    invalid();
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return invalid();
  }
  return parseAgentOsWorkerAuthorityRequestV1(value);
}

export function decodeAgentOsWorkerAuthorityResponseV1(
  source: string,
): AgentOsWorkerAuthorityResponseV1 {
  if (
    new TextEncoder().encode(source).length >
    AGENT_OS_WORKER_AUTHORITY_MAX_BYTES
  )
    invalid();
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return invalid();
  }
  return parseAgentOsWorkerAuthorityResponseV1(value);
}

function writerIdentity(
  value: Record<string, unknown>,
): AgentOsWorkerWriterIdentityV1 {
  return {
    commandId: id(value.commandId),
    grantId: id(value.grantId),
    runId: id(value.runId),
    storeId: id(value.storeId),
    writerIncarnationId: id(value.writerIncarnationId),
    claimId: id(value.claimId),
  };
}
function record(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    return invalid();
  const value = input as Record<string, unknown>;
  if (Object.keys(value).sort().join("|") !== [...keys].sort().join("|"))
    invalid();
  return value;
}
function id(input: unknown): string {
  if (typeof input !== "string" || !/^[a-z][a-z0-9._/-]{0,127}$/u.test(input))
    return invalid();
  return input;
}
function digest(input: unknown): string {
  if (typeof input !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(input))
    return invalid();
  return input;
}
function counter(input: unknown): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 1)
    return invalid();
  return input;
}
function instant(input: unknown): string {
  if (
    typeof input !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(input)
  )
    return invalid();
  const time = Date.parse(input);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== input)
    invalid();
  return input;
}
function bounded(input: unknown): void {
  let json: string | undefined;
  try {
    json = JSON.stringify(input);
  } catch {
    return invalid();
  }
  if (
    json === undefined ||
    new TextEncoder().encode(json).length > AGENT_OS_WORKER_AUTHORITY_MAX_BYTES
  )
    invalid();
}
function invalid(): never {
  throw new AgentOsWorkerAuthorityContractError();
}
