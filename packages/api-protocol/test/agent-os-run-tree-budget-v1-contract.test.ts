import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  AgentOsV1ContractError,
  AgentOsRunTreeBudgetV1,
  assertAgentOsBudgetCeilingSuccessorRelationshipV1,
  assertAgentOsBudgetReservationRelationshipV1,
  assertAgentOsBudgetSettlementRelationshipV1,
  assertAgentOsResourceAttributionRelationshipV1,
  createAgentOsBudgetAttributionKeyV1,
  createAgentOsBudgetCeilingSuccessorDigestV1,
  createAgentOsBudgetChargeKeyV1,
  createAgentOsBudgetReservationReceiptDigestV1,
  createAgentOsBudgetReservationRequestDigestV1,
  createAgentOsBudgetSettlementReceiptDigestV1,
  createAgentOsResourceAttributionReceiptDigestV1,
  createAgentOsRunTreeBudgetCeilingDigestV1,
  parseAgentOsBudgetCeilingSuccessorV1,
  parseAgentOsBudgetReservationReceiptV1,
  parseAgentOsBudgetReservationRequestV1,
  parseAgentOsBudgetSettlementReceiptV1,
  parseAgentOsResourceAttributionReceiptV1,
  parseAgentOsRunTreeBudgetCeilingV1,
} from "../src/index.js";
import type {
  AgentOsBudgetCeilingSuccessorUnsignedV1,
  AgentOsBudgetReservationReceiptUnsignedV1,
  AgentOsBudgetReservationRequestUnsignedV1,
  AgentOsBudgetSettlementReceiptUnsignedV1,
  AgentOsBudgetVectorV1,
  AgentOsResourceAttributionReceiptUnsignedV1,
  AgentOsRunTreeBudgetCeilingUnsignedV1,
} from "../src/agent-os-run-tree-budget-v1-types.js";

const ZERO = Object.freeze({ inputTokens: 0, outputTokens: 0, toolCalls: 0, costUsdMicros: 0 });
const LIMIT = Object.freeze({
  inputTokens: 1_000,
  outputTokens: 500,
  toolCalls: 4,
  costUsdMicros: 2_000_000,
});
const REQUESTED = Object.freeze({
  inputTokens: 400,
  outputTokens: 200,
  toolCalls: 1,
  costUsdMicros: 800_000,
});

function digest(seed: string): string {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function ceilingFixture(
  override: Partial<AgentOsRunTreeBudgetCeilingUnsignedV1> = {}
): ReturnType<typeof parseAgentOsRunTreeBudgetCeilingV1> {
  const unsigned: AgentOsRunTreeBudgetCeilingUnsignedV1 = {
    schemaVersion: "agent-os-run-tree-budget/v1",
    ceilingId: "ceiling.root",
    tenantId: "tenant.demo",
    workloadId: "workload.demo",
    rootRunId: "run.root",
    revision: 1,
    policyDigest: digest("policy"),
    limit: LIMIT,
    hardDimensions: ["input_tokens", "output_tokens", "tool_calls", "cost_usd_micros"],
    createdAt: "2026-08-07T00:00:00.000Z",
    ...override,
  };
  return parseAgentOsRunTreeBudgetCeilingV1({
    ...unsigned,
    ceilingDigest: createAgentOsRunTreeBudgetCeilingDigestV1(unsigned),
  });
}

function requestFixture(
  ceiling = ceilingFixture(),
  override: Partial<AgentOsBudgetReservationRequestUnsignedV1> = {}
): ReturnType<typeof parseAgentOsBudgetReservationRequestV1> {
  const subject = {
    kind: "effect" as const,
    runId: "run.child",
    turnId: "turn.one",
    attemptId: "attempt.one",
    effectId: "effect.one",
    logicalKey: "effect:invoke" as const,
    storeGeneration: 3,
  };
  const attributionKey = createAgentOsBudgetAttributionKeyV1({
    ceilingId: ceiling.ceilingId,
    tenantId: ceiling.tenantId,
    workloadId: ceiling.workloadId,
    rootRunId: ceiling.rootRunId,
    parentAttributionKey: null,
    subject,
  });
  const unsigned: AgentOsBudgetReservationRequestUnsignedV1 = {
    schemaVersion: "agent-os-run-tree-budget/v1",
    operation: "reserve",
    commandId: "command.reserve.one",
    reservationId: "reservation.one",
    ceilingId: ceiling.ceilingId,
    ceilingDigest: ceiling.ceilingDigest,
    expectedCeilingRevision: ceiling.revision,
    parentReservationId: null,
    parentReservationDigest: null,
    parentAttributionKey: null,
    subject,
    requested: REQUESTED,
    upperBoundEvidenceDigest: digest("upper-bound"),
    effectPermitDigest: digest("effect-permit"),
    kernelFenceDigest: digest("kernel-fence"),
    attributionKey,
    chargeKey: createAgentOsBudgetChargeKeyV1({
      attributionKey,
      reservationId: "reservation.one",
      attemptId: subject.attemptId,
      effectId: subject.effectId,
    }),
    requestedAt: "2026-08-07T00:00:01.000Z",
    ...override,
  };
  return parseAgentOsBudgetReservationRequestV1({
    ...unsigned,
    requestDigest: createAgentOsBudgetReservationRequestDigestV1(unsigned),
  });
}

function subtract(
  left: AgentOsBudgetVectorV1,
  right: AgentOsBudgetVectorV1
): AgentOsBudgetVectorV1 {
  return {
    inputTokens: left.inputTokens - right.inputTokens,
    outputTokens: left.outputTokens - right.outputTokens,
    toolCalls: left.toolCalls - right.toolCalls,
    costUsdMicros: left.costUsdMicros - right.costUsdMicros,
  };
}

function reservationFixture(
  request = requestFixture(),
  available: AgentOsBudgetVectorV1 = LIMIT,
  override: Partial<AgentOsBudgetReservationReceiptUnsignedV1> = {}
): ReturnType<typeof parseAgentOsBudgetReservationReceiptV1> {
  const unsigned: AgentOsBudgetReservationReceiptUnsignedV1 = {
    schemaVersion: "agent-os-run-tree-budget/v1",
    operation: "reserve",
    receiptId: "receipt.reserve.one",
    commandId: request.commandId,
    reservationId: request.reservationId,
    requestDigest: request.requestDigest,
    disposition: "reserved",
    denialReason: null,
    ceilingId: request.ceilingId,
    ceilingDigest: request.ceilingDigest,
    ceilingRevision: request.expectedCeilingRevision,
    parentReservationId: request.parentReservationId,
    reservationRevision: 1,
    reserved: request.requested,
    availableBefore: available,
    availableAfter: subtract(available, request.requested),
    attributionKey: request.attributionKey,
    chargeKey: request.chargeKey,
    committedAt: "2026-08-07T00:00:02.000Z",
    ...override,
  };
  return parseAgentOsBudgetReservationReceiptV1({
    ...unsigned,
    receiptDigest: createAgentOsBudgetReservationReceiptDigestV1(unsigned),
  });
}

function settlementFixture(
  reservation = reservationFixture(),
  override: Partial<AgentOsBudgetSettlementReceiptUnsignedV1> = {}
): ReturnType<typeof parseAgentOsBudgetSettlementReceiptV1> {
  const unsigned: AgentOsBudgetSettlementReceiptUnsignedV1 = {
    schemaVersion: "agent-os-run-tree-budget/v1",
    operation: "commit",
    receiptId: "receipt.commit.one",
    commandId: "command.commit.one",
    reservationId: reservation.reservationId,
    reservationReceiptDigest: reservation.receiptDigest,
    expectedReservationRevision: reservation.reservationRevision,
    reservationRevision: reservation.reservationRevision + 1,
    amount: REQUESTED,
    committedTotal: REQUESTED,
    releasedTotal: ZERO,
    refundedTotal: ZERO,
    usageEvidenceDigest: digest("dispatch-receipt"),
    correctionEvidenceDigest: null,
    occurredAt: "2026-08-07T00:00:03.000Z",
    ...override,
  };
  return parseAgentOsBudgetSettlementReceiptV1({
    ...unsigned,
    receiptDigest: createAgentOsBudgetSettlementReceiptDigestV1(unsigned),
  });
}

function attributionFixture(
  reservation = reservationFixture(),
  override: Partial<AgentOsResourceAttributionReceiptUnsignedV1> = {}
): ReturnType<typeof parseAgentOsResourceAttributionReceiptV1> {
  const unsigned: AgentOsResourceAttributionReceiptUnsignedV1 = {
    schemaVersion: "agent-os-run-tree-budget/v1",
    receiptId: "receipt.attribution.one",
    reservationId: reservation.reservationId,
    reservationReceiptDigest: reservation.receiptDigest,
    attributionKey: reservation.attributionKey,
    chargeKey: reservation.chargeKey,
    attemptId: "attempt.one",
    effectId: "effect.one",
    effectDispatchReceiptDigest: digest("dispatch-receipt"),
    observed: {
      inputTokens: { kind: "known", value: 325 },
      outputTokens: { kind: "unknown", reason: "provider_omitted" },
      toolCalls: { kind: "known", value: 1 },
      costUsdMicros: { kind: "unknown", reason: "pricing_unavailable" },
    },
    conservativeCharge: REQUESTED,
    observedAt: "2026-08-07T00:00:04.000Z",
    ...override,
  };
  return parseAgentOsResourceAttributionReceiptV1({
    ...unsigned,
    receiptDigest: createAgentOsResourceAttributionReceiptDigestV1(unsigned),
  });
}

describe("agent-os-run-tree-budget/v1", () => {
  test("exports strict canonical root, reservation, settlement and attribution contracts", () => {
    const ceiling = ceilingFixture();
    const request = requestFixture(ceiling);
    const reservation = reservationFixture(request);
    const settlement = settlementFixture(reservation);
    const attribution = attributionFixture(reservation);
    const { requestDigest, ...unsignedRequest } = request;

    expect(Object.isFrozen(ceiling.limit)).toBe(true);
    expect(Object.isFrozen(request.subject)).toBe(true);
    expect(requestDigest).toBe(createAgentOsBudgetReservationRequestDigestV1(unsignedRequest));
    expect(AgentOsRunTreeBudgetV1.parseAgentOsBudgetReservationReceiptV1(reservation)).toEqual(
      reservation
    );
    expect(settlement.operation).toBe("commit");
    expect(attribution.observed.outputTokens).toEqual({
      kind: "unknown",
      reason: "provider_omitted",
    });
  });

  test("validates a root reservation and rejects sibling oversell", () => {
    const ceiling = ceilingFixture();
    const request = requestFixture(ceiling);
    const reservation = reservationFixture(request);
    expect(() =>
      assertAgentOsBudgetReservationRelationshipV1({
        ceiling,
        parent: null,
        available: LIMIT,
        request,
        receipt: reservation,
      })
    ).not.toThrow();

    const lowAvailable = { inputTokens: 100, outputTokens: 100, toolCalls: 0, costUsdMicros: 100 };
    const forged = reservationFixture(request, lowAvailable, {
      reserved: request.requested,
      availableAfter: ZERO,
    });
    expect(() =>
      assertAgentOsBudgetReservationRelationshipV1({
        ceiling,
        parent: null,
        available: lowAvailable,
        request,
        receipt: forged,
      })
    ).toThrow(AgentOsV1ContractError);
  });

  test("binds attribution to logical lineage but not placement, lease or time", () => {
    const ceiling = ceilingFixture();
    const subject = requestFixture(ceiling).subject;
    const stable = createAgentOsBudgetAttributionKeyV1({
      ceilingId: ceiling.ceilingId,
      tenantId: ceiling.tenantId,
      workloadId: ceiling.workloadId,
      rootRunId: ceiling.rootRunId,
      parentAttributionKey: null,
      subject,
    });
    const relocated = createAgentOsBudgetAttributionKeyV1({
      ceilingId: ceiling.ceilingId,
      tenantId: ceiling.tenantId,
      workloadId: ceiling.workloadId,
      rootRunId: ceiling.rootRunId,
      parentAttributionKey: null,
      subject: { ...subject, storeGeneration: 99 },
    });
    expect(relocated).toBe(stable);
    expect(
      createAgentOsBudgetChargeKeyV1({
        attributionKey: stable,
        reservationId: "reservation.two",
        attemptId: "attempt.two",
        effectId: "effect.two",
      })
    ).not.toBe(requestFixture(ceiling).chargeKey);
  });

  test("keeps unknown usage explicit and conservatively charges hard dimensions", () => {
    const reservation = reservationFixture();
    const attribution = attributionFixture(reservation);
    expect(() =>
      assertAgentOsResourceAttributionRelationshipV1({
        reservation,
        hardDimensions: ["cost_usd_micros", "output_tokens"],
        attribution,
      })
    ).not.toThrow();

    const fabricatedZero = attributionFixture(reservation, {
      conservativeCharge: { ...REQUESTED, outputTokens: 0, costUsdMicros: 0 },
    });
    expect(() =>
      assertAgentOsResourceAttributionRelationshipV1({
        reservation,
        hardDimensions: ["cost_usd_micros", "output_tokens"],
        attribution: fabricatedZero,
      })
    ).toThrow(AgentOsV1ContractError);
  });

  test("enforces commit, release and refund bounds", () => {
    const reservation = reservationFixture();
    const commit = settlementFixture(reservation);
    expect(() =>
      assertAgentOsBudgetSettlementRelationshipV1({
        reservation,
        previousCommitted: ZERO,
        previousReleased: ZERO,
        previousRefunded: ZERO,
        receipt: commit,
      })
    ).not.toThrow();

    const overRelease = settlementFixture(reservation, {
      operation: "release",
      amount: { ...ZERO, toolCalls: 1 },
      committedTotal: REQUESTED,
      releasedTotal: { ...ZERO, toolCalls: 1 },
      refundedTotal: ZERO,
      usageEvidenceDigest: null,
      correctionEvidenceDigest: null,
    });
    expect(() =>
      assertAgentOsBudgetSettlementRelationshipV1({
        reservation,
        previousCommitted: REQUESTED,
        previousReleased: ZERO,
        previousRefunded: ZERO,
        receipt: overRelease,
      })
    ).toThrow(AgentOsV1ContractError);

    const overRefund = settlementFixture(reservation, {
      operation: "refund",
      amount: { ...REQUESTED, inputTokens: REQUESTED.inputTokens + 1 },
      committedTotal: REQUESTED,
      releasedTotal: ZERO,
      refundedTotal: { ...REQUESTED, inputTokens: REQUESTED.inputTokens + 1 },
      usageEvidenceDigest: digest("usage"),
      correctionEvidenceDigest: digest("correction"),
    });
    expect(() =>
      assertAgentOsBudgetSettlementRelationshipV1({
        reservation,
        previousCommitted: REQUESTED,
        previousReleased: ZERO,
        previousRefunded: ZERO,
        receipt: overRefund,
      })
    ).toThrow(AgentOsV1ContractError);
  });

  test("requires an authorized immutable ceiling successor", () => {
    const predecessor = ceilingFixture();
    const successorCeiling = ceilingFixture({
      revision: 2,
      limit: { ...LIMIT, costUsdMicros: 3_000_000 },
      createdAt: "2026-08-07T01:00:00.000Z",
    });
    const unsigned: AgentOsBudgetCeilingSuccessorUnsignedV1 = {
      schemaVersion: "agent-os-run-tree-budget/v1",
      predecessorCeilingId: predecessor.ceilingId,
      predecessorCeilingDigest: predecessor.ceilingDigest,
      predecessorRevision: predecessor.revision,
      successor: successorCeiling,
      controlCommandId: "command.budget.successor",
      controlCommandDigest: digest("control-command"),
      controlCommandReceiptDigest: digest("control-command-receipt"),
      authorizationRevision: 7,
      installedAt: "2026-08-07T01:00:01.000Z",
    };
    const successor = parseAgentOsBudgetCeilingSuccessorV1({
      ...unsigned,
      successorDigest: createAgentOsBudgetCeilingSuccessorDigestV1(unsigned),
    });
    expect(() =>
      assertAgentOsBudgetCeilingSuccessorRelationshipV1({ predecessor, successor })
    ).not.toThrow();
    expect(successor.controlCommandReceiptDigest).toBe(digest("control-command-receipt"));
  });

  test("same command and input replay exactly while payload drift changes the fingerprint", () => {
    const first = requestFixture();
    const replay = requestFixture();
    const drift = requestFixture(ceilingFixture(), { requested: { ...REQUESTED, toolCalls: 2 } });
    expect(replay.requestDigest).toBe(first.requestDigest);
    expect(drift.commandId).toBe(first.commandId);
    expect(drift.requestDigest).not.toBe(first.requestDigest);
  });

  test("rejects unsafe values, unknown fields and hostile object shapes", () => {
    const ceiling = ceilingFixture();
    expect(() =>
      parseAgentOsRunTreeBudgetCeilingV1({
        ...ceiling,
        limit: { ...ceiling.limit, costUsdMicros: 1.5 },
      })
    ).toThrow(AgentOsV1ContractError);
    expect(() => parseAgentOsRunTreeBudgetCeilingV1({ ...ceiling, token: "secret" })).toThrow(
      AgentOsV1ContractError
    );
    expect(() => parseAgentOsRunTreeBudgetCeilingV1(Object.create(ceiling))).toThrow(
      AgentOsV1ContractError
    );

    const symbolInput = { ...ceiling, [Symbol("secret")]: "hidden" };
    expect(() => parseAgentOsRunTreeBudgetCeilingV1(symbolInput)).toThrow(AgentOsV1ContractError);

    const accessorInput = { ...ceiling };
    Object.defineProperty(accessorInput, "revision", { enumerable: true, get: () => 1 });
    expect(() => parseAgentOsRunTreeBudgetCeilingV1(accessorInput)).toThrow(AgentOsV1ContractError);

    const hiddenInput = { ...ceiling };
    Object.defineProperty(hiddenInput, "revision", { enumerable: false, value: 1 });
    expect(() => parseAgentOsRunTreeBudgetCeilingV1(hiddenInput)).toThrow(AgentOsV1ContractError);
  });
});
