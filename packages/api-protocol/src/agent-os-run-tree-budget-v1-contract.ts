import { AgentOsV1ContractError } from "./agent-os-v1-contract.js";
import type {
  AgentOsBudgetCeilingSuccessorUnsignedV1,
  AgentOsBudgetCeilingSuccessorV1,
  AgentOsBudgetDimensionV1,
  AgentOsBudgetObservationV1,
  AgentOsBudgetObservedQuantityV1,
  AgentOsBudgetReservationDenialReasonV1,
  AgentOsBudgetReservationReceiptUnsignedV1,
  AgentOsBudgetReservationReceiptV1,
  AgentOsBudgetReservationRequestUnsignedV1,
  AgentOsBudgetReservationRequestV1,
  AgentOsBudgetSettlementOperationV1,
  AgentOsBudgetSettlementReceiptUnsignedV1,
  AgentOsBudgetSettlementReceiptV1,
  AgentOsBudgetSubjectV1,
  AgentOsBudgetUnknownReasonV1,
  AgentOsBudgetVectorV1,
  AgentOsResourceAttributionReceiptUnsignedV1,
  AgentOsResourceAttributionReceiptV1,
  AgentOsRunTreeBudgetCeilingUnsignedV1,
  AgentOsRunTreeBudgetCeilingV1,
  BudgetReservationCurrentStatePortV1,
} from "./agent-os-run-tree-budget-v1-types.js";

export type {
  AgentOsBudgetCeilingSuccessorUnsignedV1,
  AgentOsBudgetCeilingSuccessorV1,
  AgentOsBudgetDimensionV1,
  AgentOsBudgetObservationV1,
  AgentOsBudgetObservedQuantityV1,
  AgentOsBudgetReservationDenialReasonV1,
  AgentOsBudgetReservationDispositionV1,
  AgentOsBudgetReservationReceiptUnsignedV1,
  AgentOsBudgetReservationReceiptV1,
  AgentOsBudgetReservationRequestUnsignedV1,
  AgentOsBudgetReservationRequestV1,
  AgentOsBudgetSettlementOperationV1,
  AgentOsBudgetSettlementReceiptUnsignedV1,
  AgentOsBudgetSettlementReceiptV1,
  AgentOsBudgetSubjectV1,
  AgentOsBudgetUnknownReasonV1,
  AgentOsBudgetVectorV1,
  AgentOsResourceAttributionReceiptUnsignedV1,
  AgentOsResourceAttributionReceiptV1,
  AgentOsRunTreeBudgetCeilingUnsignedV1,
  AgentOsRunTreeBudgetCeilingV1,
  BudgetReservationCurrentStatePortV1,
} from "./agent-os-run-tree-budget-v1-types.js";

const SCHEMA_VERSION = "agent-os-run-tree-budget/v1" as const;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._-]{0,127}$/u;
const OPAQUE_REF_PATTERN = /^[a-z][a-z0-9._-]{0,63}:[a-z][a-z0-9._-]{0,127}$/u;
const DIMENSIONS = ["input_tokens", "output_tokens", "tool_calls", "cost_usd_micros"] as const;
const ZERO_VECTOR: AgentOsBudgetVectorV1 = Object.freeze({
  inputTokens: 0,
  outputTokens: 0,
  toolCalls: 0,
  costUsdMicros: 0,
});

const CEILING_UNSIGNED_KEYS = [
  "schemaVersion",
  "ceilingId",
  "tenantId",
  "workloadId",
  "rootRunId",
  "revision",
  "policyDigest",
  "limit",
  "hardDimensions",
  "createdAt",
] as const;
const RESERVATION_REQUEST_UNSIGNED_KEYS = [
  "schemaVersion",
  "operation",
  "commandId",
  "reservationId",
  "ceilingId",
  "ceilingDigest",
  "expectedCeilingRevision",
  "parentReservationId",
  "parentReservationDigest",
  "parentAttributionKey",
  "subject",
  "requested",
  "upperBoundEvidenceDigest",
  "effectPermitDigest",
  "kernelFenceDigest",
  "attributionKey",
  "chargeKey",
  "requestedAt",
] as const;
const RESERVATION_RECEIPT_UNSIGNED_KEYS = [
  "schemaVersion",
  "operation",
  "receiptId",
  "commandId",
  "reservationId",
  "requestDigest",
  "disposition",
  "denialReason",
  "ceilingId",
  "ceilingDigest",
  "ceilingRevision",
  "parentReservationId",
  "reservationRevision",
  "reserved",
  "availableBefore",
  "availableAfter",
  "attributionKey",
  "chargeKey",
  "committedAt",
] as const;
const SETTLEMENT_UNSIGNED_KEYS = [
  "schemaVersion",
  "operation",
  "receiptId",
  "commandId",
  "reservationId",
  "reservationReceiptDigest",
  "expectedReservationRevision",
  "reservationRevision",
  "amount",
  "committedTotal",
  "releasedTotal",
  "refundedTotal",
  "usageEvidenceDigest",
  "correctionEvidenceDigest",
  "occurredAt",
] as const;
const ATTRIBUTION_UNSIGNED_KEYS = [
  "schemaVersion",
  "receiptId",
  "reservationId",
  "reservationReceiptDigest",
  "attributionKey",
  "chargeKey",
  "attemptId",
  "effectId",
  "effectDispatchReceiptDigest",
  "observed",
  "conservativeCharge",
  "observedAt",
] as const;
const SUCCESSOR_UNSIGNED_KEYS = [
  "schemaVersion",
  "predecessorCeilingId",
  "predecessorCeilingDigest",
  "predecessorRevision",
  "successor",
  "controlCommandId",
  "controlCommandDigest",
  "controlCommandReceiptDigest",
  "authorizationRevision",
  "installedAt",
] as const;

export interface AgentOsBudgetAttributionIdentityInputV1 {
  readonly ceilingId: string;
  readonly tenantId: string;
  readonly workloadId: string;
  readonly rootRunId: string;
  readonly parentAttributionKey: string | null;
  readonly subject: unknown;
}

export interface AgentOsBudgetChargeIdentityInputV1 {
  readonly attributionKey: string;
  readonly reservationId: string;
  readonly attemptId: string | null;
  readonly effectId: string | null;
}

export interface AgentOsBudgetReservationRelationshipInputV1 {
  readonly ceiling: unknown;
  readonly parent: unknown | null;
  readonly available: unknown;
  readonly request: unknown;
  readonly receipt: unknown;
}

export interface AgentOsBudgetSettlementRelationshipInputV1 {
  readonly reservation: unknown;
  readonly previousCommitted: unknown;
  readonly previousReleased: unknown;
  readonly previousRefunded: unknown;
  readonly receipt: unknown;
}

export interface AgentOsResourceAttributionRelationshipInputV1 {
  readonly reservation: unknown;
  readonly hardDimensions: unknown;
  readonly attribution: unknown;
}

export interface AgentOsBudgetCeilingSuccessorRelationshipInputV1 {
  readonly predecessor: unknown;
  readonly successor: unknown;
}

export function parseAgentOsRunTreeBudgetCeilingV1(
  input: unknown
): Readonly<AgentOsRunTreeBudgetCeilingV1> {
  const value = record(input, "budget ceiling");
  exact(value, [...CEILING_UNSIGNED_KEYS, "ceilingDigest"], "budget ceiling");
  const unsigned = ceilingUnsigned(omitField(value, "ceilingDigest"));
  const ceilingDigest = selfDigest(value.ceilingDigest, unsigned, "budget ceiling ceilingDigest");
  return deepFreeze({ ...unsigned, ceilingDigest });
}

export function parseAgentOsBudgetReservationRequestV1(
  input: unknown
): Readonly<AgentOsBudgetReservationRequestV1> {
  const value = record(input, "budget reservation request");
  exact(
    value,
    [...RESERVATION_REQUEST_UNSIGNED_KEYS, "requestDigest"],
    "budget reservation request"
  );
  const unsigned = reservationRequestUnsigned(omitField(value, "requestDigest"));
  const requestDigest = selfDigest(
    value.requestDigest,
    unsigned,
    "budget reservation request requestDigest"
  );
  return deepFreeze({ ...unsigned, requestDigest });
}

export function parseAgentOsBudgetReservationReceiptV1(
  input: unknown
): Readonly<AgentOsBudgetReservationReceiptV1> {
  const value = record(input, "budget reservation receipt");
  exact(
    value,
    [...RESERVATION_RECEIPT_UNSIGNED_KEYS, "receiptDigest"],
    "budget reservation receipt"
  );
  const unsigned = reservationReceiptUnsigned(omitField(value, "receiptDigest"));
  const receiptDigest = selfDigest(
    value.receiptDigest,
    unsigned,
    "budget reservation receipt receiptDigest"
  );
  return deepFreeze({ ...unsigned, receiptDigest });
}

export function parseAgentOsBudgetSettlementReceiptV1(
  input: unknown
): Readonly<AgentOsBudgetSettlementReceiptV1> {
  const value = record(input, "budget settlement receipt");
  exact(value, [...SETTLEMENT_UNSIGNED_KEYS, "receiptDigest"], "budget settlement receipt");
  const unsigned = settlementUnsigned(omitField(value, "receiptDigest"));
  const receiptDigest = selfDigest(
    value.receiptDigest,
    unsigned,
    "budget settlement receipt receiptDigest"
  );
  return deepFreeze({ ...unsigned, receiptDigest });
}

export function parseAgentOsResourceAttributionReceiptV1(
  input: unknown
): Readonly<AgentOsResourceAttributionReceiptV1> {
  const value = record(input, "resource attribution receipt");
  exact(value, [...ATTRIBUTION_UNSIGNED_KEYS, "receiptDigest"], "resource attribution receipt");
  const unsigned = attributionUnsigned(omitField(value, "receiptDigest"));
  const receiptDigest = selfDigest(
    value.receiptDigest,
    unsigned,
    "resource attribution receipt receiptDigest"
  );
  return deepFreeze({ ...unsigned, receiptDigest });
}

export function parseAgentOsBudgetCeilingSuccessorV1(
  input: unknown
): Readonly<AgentOsBudgetCeilingSuccessorV1> {
  const value = record(input, "budget ceiling successor");
  exact(value, [...SUCCESSOR_UNSIGNED_KEYS, "successorDigest"], "budget ceiling successor");
  const unsigned = successorUnsigned(omitField(value, "successorDigest"));
  const successorDigest = selfDigest(
    value.successorDigest,
    unsigned,
    "budget ceiling successor successorDigest"
  );
  return deepFreeze({ ...unsigned, successorDigest });
}

export function serializeAgentOsRunTreeBudgetCeilingV1(input: unknown): string {
  return canonicalJson(parseAgentOsRunTreeBudgetCeilingV1(input));
}

export function serializeAgentOsBudgetReservationRequestV1(input: unknown): string {
  return canonicalJson(parseAgentOsBudgetReservationRequestV1(input));
}

export function serializeAgentOsBudgetReservationReceiptV1(input: unknown): string {
  return canonicalJson(parseAgentOsBudgetReservationReceiptV1(input));
}

export function serializeAgentOsBudgetSettlementReceiptV1(input: unknown): string {
  return canonicalJson(parseAgentOsBudgetSettlementReceiptV1(input));
}

export function serializeAgentOsResourceAttributionReceiptV1(input: unknown): string {
  return canonicalJson(parseAgentOsResourceAttributionReceiptV1(input));
}

export function serializeAgentOsBudgetCeilingSuccessorV1(input: unknown): string {
  return canonicalJson(parseAgentOsBudgetCeilingSuccessorV1(input));
}

export function createAgentOsRunTreeBudgetCeilingDigestV1(input: unknown): string {
  return contentDigest(canonicalJson(ceilingUnsigned(record(input, "budget ceiling unsigned"))));
}

export function createAgentOsBudgetReservationRequestDigestV1(input: unknown): string {
  return contentDigest(
    canonicalJson(reservationRequestUnsigned(record(input, "budget reservation request unsigned")))
  );
}

export function createAgentOsBudgetReservationReceiptDigestV1(input: unknown): string {
  return contentDigest(
    canonicalJson(reservationReceiptUnsigned(record(input, "budget reservation receipt unsigned")))
  );
}

export function createAgentOsBudgetSettlementReceiptDigestV1(input: unknown): string {
  return contentDigest(
    canonicalJson(settlementUnsigned(record(input, "budget settlement receipt unsigned")))
  );
}

export function createAgentOsResourceAttributionReceiptDigestV1(input: unknown): string {
  return contentDigest(
    canonicalJson(attributionUnsigned(record(input, "resource attribution receipt unsigned")))
  );
}

export function createAgentOsBudgetCeilingSuccessorDigestV1(input: unknown): string {
  return contentDigest(
    canonicalJson(successorUnsigned(record(input, "budget ceiling successor unsigned")))
  );
}

export function createAgentOsBudgetAttributionKeyV1(
  input: AgentOsBudgetAttributionIdentityInputV1
): string {
  const subject = budgetSubject(input.subject, "budget attribution subject");
  return contentDigest(
    canonicalJson({
      schemaVersion: SCHEMA_VERSION,
      kind: "attribution",
      ceilingId: identifier(input.ceilingId, "budget attribution ceilingId"),
      tenantId: identifier(input.tenantId, "budget attribution tenantId"),
      workloadId: identifier(input.workloadId, "budget attribution workloadId"),
      rootRunId: identifier(input.rootRunId, "budget attribution rootRunId"),
      parentAttributionKey: nullableDigest(
        input.parentAttributionKey,
        "budget attribution parentAttributionKey"
      ),
      subject: {
        kind: subject.kind,
        runId: subject.runId,
        logicalKey: subject.logicalKey,
      },
    })
  );
}

export function createAgentOsBudgetChargeKeyV1(input: AgentOsBudgetChargeIdentityInputV1): string {
  return contentDigest(
    canonicalJson({
      schemaVersion: SCHEMA_VERSION,
      kind: "charge",
      attributionKey: digest(input.attributionKey, "budget charge attributionKey"),
      reservationId: identifier(input.reservationId, "budget charge reservationId"),
      attemptId: nullableIdentifier(input.attemptId, "budget charge attemptId"),
      effectId: nullableIdentifier(input.effectId, "budget charge effectId"),
    })
  );
}

export function assertAgentOsBudgetReservationRelationshipV1(
  input: AgentOsBudgetReservationRelationshipInputV1
): void {
  const ceiling = parseAgentOsRunTreeBudgetCeilingV1(input.ceiling);
  const request = parseAgentOsBudgetReservationRequestV1(input.request);
  const receipt = parseAgentOsBudgetReservationReceiptV1(input.receipt);
  const available = budgetVector(input.available, "budget reservation available");
  const parent =
    input.parent === null ? null : parseAgentOsBudgetReservationReceiptV1(input.parent);

  same(request.ceilingId, ceiling.ceilingId, "reservation ceilingId drift");
  same(request.ceilingDigest, ceiling.ceilingDigest, "reservation ceilingDigest drift");
  same(request.expectedCeilingRevision, ceiling.revision, "reservation ceiling revision drift");
  same(receipt.commandId, request.commandId, "reservation commandId drift");
  same(receipt.reservationId, request.reservationId, "reservation identity drift");
  same(receipt.requestDigest, request.requestDigest, "reservation request digest drift");
  same(receipt.ceilingId, ceiling.ceilingId, "receipt ceilingId drift");
  same(receipt.ceilingDigest, ceiling.ceilingDigest, "receipt ceilingDigest drift");
  same(receipt.ceilingRevision, ceiling.revision, "receipt ceiling revision drift");
  same(receipt.attributionKey, request.attributionKey, "reservation attribution drift");
  same(receipt.chargeKey, request.chargeKey, "reservation charge drift");
  assertVectorEqual(receipt.availableBefore, available, "reservation availableBefore drift");

  if (parent === null) {
    if (
      request.parentReservationId !== null ||
      request.parentReservationDigest !== null ||
      request.parentAttributionKey !== null ||
      receipt.parentReservationId !== null
    )
      fail("DRIFT_DETECTED", "root reservation must not claim parent lineage");
    assertVectorWithin(request.requested, ceiling.limit, "root reservation exceeds ceiling");
  } else {
    same(request.parentReservationId, parent.reservationId, "parent reservationId drift");
    same(request.parentReservationDigest, parent.receiptDigest, "parent reservation digest drift");
    same(request.parentAttributionKey, parent.attributionKey, "parent attribution drift");
    same(receipt.parentReservationId, parent.reservationId, "receipt parent drift");
    assertVectorWithin(request.requested, parent.reserved, "child reservation exceeds parent");
  }

  const expectedAttribution = createAgentOsBudgetAttributionKeyV1({
    ceilingId: ceiling.ceilingId,
    tenantId: ceiling.tenantId,
    workloadId: ceiling.workloadId,
    rootRunId: ceiling.rootRunId,
    parentAttributionKey: request.parentAttributionKey,
    subject: request.subject,
  });
  same(request.attributionKey, expectedAttribution, "reservation attribution key drift");
  same(
    request.chargeKey,
    createAgentOsBudgetChargeKeyV1({
      attributionKey: request.attributionKey,
      reservationId: request.reservationId,
      attemptId: request.subject.attemptId,
      effectId: request.subject.effectId,
    }),
    "reservation charge key drift"
  );

  const fits = vectorWithin(request.requested, available);
  if (receipt.disposition === "reserved") {
    if (!fits) fail("GRANT_EXPANSION", "reserved receipt oversells current available budget");
    if (receipt.denialReason !== null)
      fail("DRIFT_DETECTED", "reserved receipt must not carry denialReason");
    assertVectorEqual(receipt.reserved, request.requested, "reserved amount drift");
    assertVectorEqual(
      receipt.availableAfter,
      subtractVector(available, request.requested),
      "reserved availableAfter drift"
    );
  } else {
    if (receipt.denialReason === null)
      fail("DRIFT_DETECTED", "denied receipt requires a stable reason code");
    assertVectorEqual(receipt.reserved, ZERO_VECTOR, "denied receipt must reserve zero");
    assertVectorEqual(receipt.availableAfter, available, "denied receipt changed available budget");
  }
}

export function assertAgentOsBudgetSettlementRelationshipV1(
  input: AgentOsBudgetSettlementRelationshipInputV1
): void {
  const reservation = parseAgentOsBudgetReservationReceiptV1(input.reservation);
  if (reservation.disposition !== "reserved")
    fail("INVALID_VALUE", "settlement requires a successful reservation");
  const receipt = parseAgentOsBudgetSettlementReceiptV1(input.receipt);
  const previousCommitted = budgetVector(input.previousCommitted, "previous committed");
  const previousReleased = budgetVector(input.previousReleased, "previous released");
  const previousRefunded = budgetVector(input.previousRefunded, "previous refunded");
  same(receipt.reservationId, reservation.reservationId, "settlement reservationId drift");
  same(
    receipt.reservationReceiptDigest,
    reservation.receiptDigest,
    "settlement reservation digest drift"
  );
  same(
    receipt.reservationRevision,
    receipt.expectedReservationRevision + 1,
    "settlement revision must advance exactly once"
  );

  const expectedCommitted =
    receipt.operation === "commit"
      ? addVector(previousCommitted, receipt.amount)
      : previousCommitted;
  const expectedReleased =
    receipt.operation === "release"
      ? addVector(previousReleased, receipt.amount)
      : previousReleased;
  const expectedRefunded =
    receipt.operation === "refund" ? addVector(previousRefunded, receipt.amount) : previousRefunded;
  assertVectorEqual(receipt.committedTotal, expectedCommitted, "settlement committed total drift");
  assertVectorEqual(receipt.releasedTotal, expectedReleased, "settlement released total drift");
  assertVectorEqual(receipt.refundedTotal, expectedRefunded, "settlement refunded total drift");
  assertVectorWithin(
    addVector(receipt.committedTotal, receipt.releasedTotal),
    reservation.reserved,
    "commit plus release exceeds reservation"
  );
  assertVectorWithin(
    receipt.refundedTotal,
    receipt.committedTotal,
    "refund exceeds committed charge"
  );

  if (receipt.operation === "commit") {
    if (receipt.usageEvidenceDigest === null || receipt.correctionEvidenceDigest !== null)
      fail("DRIFT_DETECTED", "commit requires usage evidence and forbids correction evidence");
  } else if (receipt.operation === "release") {
    if (receipt.usageEvidenceDigest !== null || receipt.correctionEvidenceDigest !== null)
      fail("DRIFT_DETECTED", "release must not fabricate usage or correction evidence");
  } else if (receipt.usageEvidenceDigest === null || receipt.correctionEvidenceDigest === null) {
    fail("DRIFT_DETECTED", "refund requires usage and authoritative correction evidence");
  }
}

export function assertAgentOsResourceAttributionRelationshipV1(
  input: AgentOsResourceAttributionRelationshipInputV1
): void {
  const reservation = parseAgentOsBudgetReservationReceiptV1(input.reservation);
  if (reservation.disposition !== "reserved")
    fail("INVALID_VALUE", "attribution requires a successful reservation");
  const attribution = parseAgentOsResourceAttributionReceiptV1(input.attribution);
  const hardDimensions = budgetDimensions(input.hardDimensions, "hard dimensions");
  same(attribution.reservationId, reservation.reservationId, "attribution reservation drift");
  same(
    attribution.reservationReceiptDigest,
    reservation.receiptDigest,
    "attribution reservation digest drift"
  );
  same(attribution.attributionKey, reservation.attributionKey, "attribution key drift");
  same(attribution.chargeKey, reservation.chargeKey, "charge key drift");
  assertVectorWithin(
    attribution.conservativeCharge,
    reservation.reserved,
    "conservative charge exceeds reservation"
  );
  for (const dimension of DIMENSIONS) {
    const observation = observedForDimension(attribution.observed, dimension);
    const charge = vectorForDimension(attribution.conservativeCharge, dimension);
    const reserved = vectorForDimension(reservation.reserved, dimension);
    if (observation.kind === "known" && charge < observation.value)
      fail("GRANT_EXPANSION", `${dimension} charge cannot be below known usage`);
    if (observation.kind === "unknown" && hardDimensions.includes(dimension) && charge !== reserved)
      fail(
        "GRANT_EXPANSION",
        `${dimension} unknown hard usage must conservatively charge its reservation`
      );
  }
}

export function assertAgentOsBudgetCeilingSuccessorRelationshipV1(
  input: AgentOsBudgetCeilingSuccessorRelationshipInputV1
): void {
  const predecessor = parseAgentOsRunTreeBudgetCeilingV1(input.predecessor);
  const successor = parseAgentOsBudgetCeilingSuccessorV1(input.successor);
  same(successor.predecessorCeilingId, predecessor.ceilingId, "successor predecessorId drift");
  same(
    successor.predecessorCeilingDigest,
    predecessor.ceilingDigest,
    "successor predecessor digest drift"
  );
  same(successor.predecessorRevision, predecessor.revision, "successor predecessor revision drift");
  same(successor.successor.ceilingId, predecessor.ceilingId, "successor ceiling identity drift");
  same(successor.successor.tenantId, predecessor.tenantId, "successor tenant drift");
  same(successor.successor.workloadId, predecessor.workloadId, "successor workload drift");
  same(successor.successor.rootRunId, predecessor.rootRunId, "successor root Run drift");
  same(successor.successor.policyDigest, predecessor.policyDigest, "successor policy drift");
  same(
    successor.successor.revision,
    predecessor.revision + 1,
    "successor revision must advance exactly once"
  );
}

function ceilingUnsigned(value: Record<string, unknown>): AgentOsRunTreeBudgetCeilingUnsignedV1 {
  exact(value, CEILING_UNSIGNED_KEYS, "budget ceiling unsigned");
  schema(value.schemaVersion, "budget ceiling");
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    ceilingId: identifier(value.ceilingId, "budget ceiling ceilingId"),
    tenantId: identifier(value.tenantId, "budget ceiling tenantId"),
    workloadId: identifier(value.workloadId, "budget ceiling workloadId"),
    rootRunId: identifier(value.rootRunId, "budget ceiling rootRunId"),
    revision: nonNegativeInteger(value.revision, "budget ceiling revision"),
    policyDigest: digest(value.policyDigest, "budget ceiling policyDigest"),
    limit: budgetVector(value.limit, "budget ceiling limit"),
    hardDimensions: budgetDimensions(value.hardDimensions, "budget ceiling hardDimensions"),
    createdAt: instant(value.createdAt, "budget ceiling createdAt"),
  });
}

function reservationRequestUnsigned(
  value: Record<string, unknown>
): AgentOsBudgetReservationRequestUnsignedV1 {
  exact(value, RESERVATION_REQUEST_UNSIGNED_KEYS, "budget reservation request unsigned");
  schema(value.schemaVersion, "budget reservation request");
  if (value.operation !== "reserve")
    fail("INVALID_VALUE", "budget reservation request operation must equal reserve");
  const subject = budgetSubject(value.subject, "budget reservation request subject");
  const parentReservationId = nullableIdentifier(
    value.parentReservationId,
    "budget reservation request parentReservationId"
  );
  const parentReservationDigest = nullableDigest(
    value.parentReservationDigest,
    "budget reservation request parentReservationDigest"
  );
  const parentAttributionKey = nullableDigest(
    value.parentAttributionKey,
    "budget reservation request parentAttributionKey"
  );
  if (
    [parentReservationId, parentReservationDigest, parentAttributionKey].filter(
      (item) => item !== null
    ).length !== 0 &&
    [parentReservationId, parentReservationDigest, parentAttributionKey].some(
      (item) => item === null
    )
  )
    fail("INVALID_SHAPE", "budget reservation parent lineage must be all-null or complete");
  const effectPermitDigest = nullableDigest(
    value.effectPermitDigest,
    "budget reservation request effectPermitDigest"
  );
  if ((subject.kind === "effect") !== (effectPermitDigest !== null))
    fail("DRIFT_DETECTED", "only effect reservations require effectPermitDigest");
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    operation: "reserve",
    commandId: identifier(value.commandId, "budget reservation request commandId"),
    reservationId: identifier(value.reservationId, "budget reservation request reservationId"),
    ceilingId: identifier(value.ceilingId, "budget reservation request ceilingId"),
    ceilingDigest: digest(value.ceilingDigest, "budget reservation request ceilingDigest"),
    expectedCeilingRevision: nonNegativeInteger(
      value.expectedCeilingRevision,
      "budget reservation request expectedCeilingRevision"
    ),
    parentReservationId,
    parentReservationDigest,
    parentAttributionKey,
    subject,
    requested: budgetVector(value.requested, "budget reservation request requested"),
    upperBoundEvidenceDigest: digest(
      value.upperBoundEvidenceDigest,
      "budget reservation request upperBoundEvidenceDigest"
    ),
    effectPermitDigest,
    kernelFenceDigest: digest(
      value.kernelFenceDigest,
      "budget reservation request kernelFenceDigest"
    ),
    attributionKey: digest(value.attributionKey, "budget reservation request attributionKey"),
    chargeKey: digest(value.chargeKey, "budget reservation request chargeKey"),
    requestedAt: instant(value.requestedAt, "budget reservation request requestedAt"),
  });
}

function reservationReceiptUnsigned(
  value: Record<string, unknown>
): AgentOsBudgetReservationReceiptUnsignedV1 {
  exact(value, RESERVATION_RECEIPT_UNSIGNED_KEYS, "budget reservation receipt unsigned");
  schema(value.schemaVersion, "budget reservation receipt");
  if (value.operation !== "reserve")
    fail("INVALID_VALUE", "budget reservation receipt operation must equal reserve");
  const disposition =
    value.disposition === "reserved" || value.disposition === "denied"
      ? value.disposition
      : fail("INVALID_VALUE", "budget reservation receipt disposition is invalid");
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    operation: "reserve",
    receiptId: identifier(value.receiptId, "budget reservation receipt receiptId"),
    commandId: identifier(value.commandId, "budget reservation receipt commandId"),
    reservationId: identifier(value.reservationId, "budget reservation receipt reservationId"),
    requestDigest: digest(value.requestDigest, "budget reservation receipt requestDigest"),
    disposition,
    denialReason: denialReason(value.denialReason),
    ceilingId: identifier(value.ceilingId, "budget reservation receipt ceilingId"),
    ceilingDigest: digest(value.ceilingDigest, "budget reservation receipt ceilingDigest"),
    ceilingRevision: nonNegativeInteger(
      value.ceilingRevision,
      "budget reservation receipt ceilingRevision"
    ),
    parentReservationId: nullableIdentifier(
      value.parentReservationId,
      "budget reservation receipt parentReservationId"
    ),
    reservationRevision: positiveInteger(
      value.reservationRevision,
      "budget reservation receipt reservationRevision"
    ),
    reserved: budgetVector(value.reserved, "budget reservation receipt reserved"),
    availableBefore: budgetVector(
      value.availableBefore,
      "budget reservation receipt availableBefore"
    ),
    availableAfter: budgetVector(value.availableAfter, "budget reservation receipt availableAfter"),
    attributionKey: digest(value.attributionKey, "budget reservation receipt attributionKey"),
    chargeKey: digest(value.chargeKey, "budget reservation receipt chargeKey"),
    committedAt: instant(value.committedAt, "budget reservation receipt committedAt"),
  });
}

function settlementUnsigned(
  value: Record<string, unknown>
): AgentOsBudgetSettlementReceiptUnsignedV1 {
  exact(value, SETTLEMENT_UNSIGNED_KEYS, "budget settlement receipt unsigned");
  schema(value.schemaVersion, "budget settlement receipt");
  const operation = settlementOperation(value.operation);
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    operation,
    receiptId: identifier(value.receiptId, "budget settlement receipt receiptId"),
    commandId: identifier(value.commandId, "budget settlement receipt commandId"),
    reservationId: identifier(value.reservationId, "budget settlement receipt reservationId"),
    reservationReceiptDigest: digest(
      value.reservationReceiptDigest,
      "budget settlement receipt reservationReceiptDigest"
    ),
    expectedReservationRevision: positiveInteger(
      value.expectedReservationRevision,
      "budget settlement receipt expectedReservationRevision"
    ),
    reservationRevision: positiveInteger(
      value.reservationRevision,
      "budget settlement receipt reservationRevision"
    ),
    amount: budgetVector(value.amount, "budget settlement receipt amount"),
    committedTotal: budgetVector(value.committedTotal, "budget settlement receipt committedTotal"),
    releasedTotal: budgetVector(value.releasedTotal, "budget settlement receipt releasedTotal"),
    refundedTotal: budgetVector(value.refundedTotal, "budget settlement receipt refundedTotal"),
    usageEvidenceDigest: nullableDigest(
      value.usageEvidenceDigest,
      "budget settlement receipt usageEvidenceDigest"
    ),
    correctionEvidenceDigest: nullableDigest(
      value.correctionEvidenceDigest,
      "budget settlement receipt correctionEvidenceDigest"
    ),
    occurredAt: instant(value.occurredAt, "budget settlement receipt occurredAt"),
  });
}

function attributionUnsigned(
  value: Record<string, unknown>
): AgentOsResourceAttributionReceiptUnsignedV1 {
  exact(value, ATTRIBUTION_UNSIGNED_KEYS, "resource attribution receipt unsigned");
  schema(value.schemaVersion, "resource attribution receipt");
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    receiptId: identifier(value.receiptId, "resource attribution receipt receiptId"),
    reservationId: identifier(value.reservationId, "resource attribution receipt reservationId"),
    reservationReceiptDigest: digest(
      value.reservationReceiptDigest,
      "resource attribution receipt reservationReceiptDigest"
    ),
    attributionKey: digest(value.attributionKey, "resource attribution receipt attributionKey"),
    chargeKey: digest(value.chargeKey, "resource attribution receipt chargeKey"),
    attemptId: identifier(value.attemptId, "resource attribution receipt attemptId"),
    effectId: identifier(value.effectId, "resource attribution receipt effectId"),
    effectDispatchReceiptDigest: digest(
      value.effectDispatchReceiptDigest,
      "resource attribution receipt effectDispatchReceiptDigest"
    ),
    observed: observation(value.observed, "resource attribution receipt observed"),
    conservativeCharge: budgetVector(
      value.conservativeCharge,
      "resource attribution receipt conservativeCharge"
    ),
    observedAt: instant(value.observedAt, "resource attribution receipt observedAt"),
  });
}

function successorUnsigned(
  value: Record<string, unknown>
): AgentOsBudgetCeilingSuccessorUnsignedV1 {
  exact(value, SUCCESSOR_UNSIGNED_KEYS, "budget ceiling successor unsigned");
  schema(value.schemaVersion, "budget ceiling successor");
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    predecessorCeilingId: identifier(
      value.predecessorCeilingId,
      "budget ceiling successor predecessorCeilingId"
    ),
    predecessorCeilingDigest: digest(
      value.predecessorCeilingDigest,
      "budget ceiling successor predecessorCeilingDigest"
    ),
    predecessorRevision: nonNegativeInteger(
      value.predecessorRevision,
      "budget ceiling successor predecessorRevision"
    ),
    successor: parseAgentOsRunTreeBudgetCeilingV1(value.successor),
    controlCommandId: identifier(
      value.controlCommandId,
      "budget ceiling successor controlCommandId"
    ),
    controlCommandDigest: digest(
      value.controlCommandDigest,
      "budget ceiling successor controlCommandDigest"
    ),
    controlCommandReceiptDigest: digest(
      value.controlCommandReceiptDigest,
      "budget ceiling successor controlCommandReceiptDigest"
    ),
    authorizationRevision: positiveInteger(
      value.authorizationRevision,
      "budget ceiling successor authorizationRevision"
    ),
    installedAt: instant(value.installedAt, "budget ceiling successor installedAt"),
  });
}

function budgetSubject(value: unknown, label: string): Readonly<AgentOsBudgetSubjectV1> {
  const input = record(value, label);
  exact(
    input,
    ["kind", "runId", "turnId", "attemptId", "effectId", "logicalKey", "storeGeneration"],
    label
  );
  if (input.kind !== "child" && input.kind !== "effect")
    fail("INVALID_VALUE", `${label}.kind is invalid`);
  const kind: AgentOsBudgetSubjectV1["kind"] = input.kind;
  const subject = deepFreeze({
    kind,
    runId: identifier(input.runId, `${label}.runId`),
    turnId: nullableIdentifier(input.turnId, `${label}.turnId`),
    attemptId: nullableIdentifier(input.attemptId, `${label}.attemptId`),
    effectId: nullableIdentifier(input.effectId, `${label}.effectId`),
    logicalKey: opaqueRef(input.logicalKey, `${label}.logicalKey`),
    storeGeneration: nonNegativeInteger(input.storeGeneration, `${label}.storeGeneration`),
  });
  if (subject.kind === "child" && subject.effectId !== null)
    fail("DRIFT_DETECTED", `${label} child must not claim effectId`);
  if (
    subject.kind === "effect" &&
    (subject.turnId === null || subject.attemptId === null || subject.effectId === null)
  )
    fail("DRIFT_DETECTED", `${label} effect requires turnId, attemptId and effectId`);
  return subject;
}

function budgetVector(value: unknown, label: string): Readonly<AgentOsBudgetVectorV1> {
  const input = record(value, label);
  exact(input, ["inputTokens", "outputTokens", "toolCalls", "costUsdMicros"], label);
  return deepFreeze({
    inputTokens: nonNegativeInteger(input.inputTokens, `${label}.inputTokens`),
    outputTokens: nonNegativeInteger(input.outputTokens, `${label}.outputTokens`),
    toolCalls: nonNegativeInteger(input.toolCalls, `${label}.toolCalls`),
    costUsdMicros: nonNegativeInteger(input.costUsdMicros, `${label}.costUsdMicros`),
  });
}

function observation(value: unknown, label: string): Readonly<AgentOsBudgetObservationV1> {
  const input = record(value, label);
  exact(input, ["inputTokens", "outputTokens", "toolCalls", "costUsdMicros"], label);
  return deepFreeze({
    inputTokens: observedQuantity(input.inputTokens, `${label}.inputTokens`),
    outputTokens: observedQuantity(input.outputTokens, `${label}.outputTokens`),
    toolCalls: observedQuantity(input.toolCalls, `${label}.toolCalls`),
    costUsdMicros: observedQuantity(input.costUsdMicros, `${label}.costUsdMicros`),
  });
}

function observedQuantity(value: unknown, label: string): AgentOsBudgetObservedQuantityV1 {
  const input = record(value, label);
  if (input.kind === "known") {
    exact(input, ["kind", "value"], label);
    return deepFreeze({ kind: "known", value: nonNegativeInteger(input.value, `${label}.value`) });
  }
  if (input.kind === "unknown") {
    exact(input, ["kind", "reason"], label);
    return deepFreeze({ kind: "unknown", reason: unknownReason(input.reason, `${label}.reason`) });
  }
  fail("INVALID_VALUE", `${label}.kind is invalid`);
}

function budgetDimensions(value: unknown, label: string): readonly AgentOsBudgetDimensionV1[] {
  const items = arrayValues(value, label).map((item, index) =>
    budgetDimension(item, `${label}[${index}]`)
  );
  if (items.length === 0 || new Set(items).size !== items.length)
    fail("INVALID_VALUE", `${label} must be non-empty and unique`);
  const order = new Map(DIMENSIONS.map((dimension, index) => [dimension, index]));
  return deepFreeze([...items].sort((left, right) => order.get(left)! - order.get(right)!));
}

function budgetDimension(value: unknown, label: string): AgentOsBudgetDimensionV1 {
  if (!DIMENSIONS.some((dimension) => dimension === value))
    fail("INVALID_VALUE", `${label} is not a supported budget dimension`);
  return value as AgentOsBudgetDimensionV1;
}

function denialReason(value: unknown): AgentOsBudgetReservationDenialReasonV1 | null {
  if (value === null) return null;
  if (
    value !== "insufficient_budget" &&
    value !== "stale_ceiling" &&
    value !== "stale_parent" &&
    value !== "missing_upper_bound"
  )
    fail("INVALID_VALUE", "budget reservation denialReason is invalid");
  return value;
}

function settlementOperation(value: unknown): AgentOsBudgetSettlementOperationV1 {
  if (value !== "commit" && value !== "release" && value !== "refund")
    fail("INVALID_VALUE", "budget settlement operation is invalid");
  return value;
}

function unknownReason(value: unknown, label: string): AgentOsBudgetUnknownReasonV1 {
  if (
    value !== "pricing_unavailable" &&
    value !== "provider_omitted" &&
    value !== "outcome_unknown" &&
    value !== "not_observed"
  )
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function observedForDimension(
  value: AgentOsBudgetObservationV1,
  dimension: AgentOsBudgetDimensionV1
): AgentOsBudgetObservedQuantityV1 {
  if (dimension === "input_tokens") return value.inputTokens;
  if (dimension === "output_tokens") return value.outputTokens;
  if (dimension === "tool_calls") return value.toolCalls;
  return value.costUsdMicros;
}

function vectorForDimension(
  value: AgentOsBudgetVectorV1,
  dimension: AgentOsBudgetDimensionV1
): number {
  if (dimension === "input_tokens") return value.inputTokens;
  if (dimension === "output_tokens") return value.outputTokens;
  if (dimension === "tool_calls") return value.toolCalls;
  return value.costUsdMicros;
}

function addVector(
  left: AgentOsBudgetVectorV1,
  right: AgentOsBudgetVectorV1
): AgentOsBudgetVectorV1 {
  return budgetVector(
    {
      inputTokens: checkedAdd(left.inputTokens, right.inputTokens, "inputTokens"),
      outputTokens: checkedAdd(left.outputTokens, right.outputTokens, "outputTokens"),
      toolCalls: checkedAdd(left.toolCalls, right.toolCalls, "toolCalls"),
      costUsdMicros: checkedAdd(left.costUsdMicros, right.costUsdMicros, "costUsdMicros"),
    },
    "budget vector sum"
  );
}

function subtractVector(
  left: AgentOsBudgetVectorV1,
  right: AgentOsBudgetVectorV1
): AgentOsBudgetVectorV1 {
  if (!vectorWithin(right, left)) fail("GRANT_EXPANSION", "budget vector subtraction underflow");
  return deepFreeze({
    inputTokens: left.inputTokens - right.inputTokens,
    outputTokens: left.outputTokens - right.outputTokens,
    toolCalls: left.toolCalls - right.toolCalls,
    costUsdMicros: left.costUsdMicros - right.costUsdMicros,
  });
}

function checkedAdd(left: number, right: number, label: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) fail("INVALID_VALUE", `${label} sum exceeds safe integer`);
  return result;
}

function vectorWithin(actual: AgentOsBudgetVectorV1, ceiling: AgentOsBudgetVectorV1): boolean {
  return DIMENSIONS.every(
    (dimension) => vectorForDimension(actual, dimension) <= vectorForDimension(ceiling, dimension)
  );
}

function assertVectorWithin(
  actual: AgentOsBudgetVectorV1,
  ceiling: AgentOsBudgetVectorV1,
  message: string
): void {
  if (!vectorWithin(actual, ceiling)) fail("GRANT_EXPANSION", message);
}

function assertVectorEqual(
  left: AgentOsBudgetVectorV1,
  right: AgentOsBudgetVectorV1,
  message: string
): void {
  if (canonicalJson(left) !== canonicalJson(right)) fail("DRIFT_DETECTED", message);
}

function selfDigest(value: unknown, unsigned: unknown, label: string): string {
  const actual = digest(value, label);
  if (actual !== contentDigest(canonicalJson(unsigned)))
    fail("DRIFT_DETECTED", `${label} is self-inconsistent`);
  return actual;
}

function schema(value: unknown, label: string): void {
  if (value !== SCHEMA_VERSION)
    fail("UNSUPPORTED_VERSION", `${label} schemaVersion must equal ${SCHEMA_VERSION}`);
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
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable || !("value" in descriptor) || descriptor.get || descriptor.set)
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data field`);
  }
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !(key in value))
  )
    fail("UNKNOWN_FIELD", `${label} contains unknown or missing fields`);
}

function omitField(value: Record<string, unknown>, field: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

function arrayValues(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  if (Object.getOwnPropertySymbols(value).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor))
      fail("INVALID_SHAPE", `${label} must not contain holes or hidden values`);
    result.push(descriptor.value);
  }
  if (Object.keys(descriptors).some((key) => key !== "length" && !/^(?:0|[1-9][0-9]*)$/u.test(key)))
    fail("INVALID_SHAPE", `${label} contains a non-index property`);
  return result;
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a path-free canonical identifier`);
  return value;
}

function nullableIdentifier(value: unknown, label: string): string | null {
  return value === null ? null : identifier(value, label);
}

function opaqueRef(value: unknown, label: string): `${string}:${string}` {
  if (typeof value !== "string" || !OPAQUE_REF_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a path-free namespace-qualified opaque ref`);
  return value as `${string}:${string}`;
}

function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a canonical SHA-256 digest`);
  return value;
}

function nullableDigest(value: unknown, label: string): string | null {
  return value === null ? null : digest(value, label);
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    fail("INVALID_VALUE", `${label} must be a non-negative safe integer`);
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  const result = nonNegativeInteger(value, label);
  if (result === 0) fail("INVALID_VALUE", `${label} must be positive`);
  return result;
}

function instant(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    new Date(value).toISOString() !== value
  )
    fail("INVALID_VALUE", `${label} must be canonical RFC3339 UTC milliseconds`);
  return value;
}

function same(left: unknown, right: unknown, message: string): void {
  if (canonicalJson(left) !== canonicalJson(right)) fail("DRIFT_DETECTED", message);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value))
      fail("INVALID_VALUE", "canonical budget source contains a non-safe integer");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const input = record(value, "canonical budget source");
    return `{${Object.keys(input)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`)
      .join(",")}}`;
  }
  fail("INVALID_VALUE", "canonical budget source contains an unsupported value");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function contentDigest(source: string): string {
  return `sha256:${sha256Hex(source)}`;
}

function fail(code: AgentOsV1ContractError["code"], message: string): never {
  throw new AgentOsV1ContractError(code, message);
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
