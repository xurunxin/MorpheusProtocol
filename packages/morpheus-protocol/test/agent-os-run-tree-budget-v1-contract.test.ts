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
  createAgentOsBudgetCurrentStateDigestV1,
  createAgentOsBudgetReservationReceiptDigestV1,
  createAgentOsBudgetReservationRequestDigestV1,
  createAgentOsBudgetSettlementReceiptDigestV1,
  createAgentOsBudgetSettlementMutationDigestV1,
  createAgentOsEffectDispatchReceiptDigestV1,
  createAgentOsResourceAttributionReceiptDigestV1,
  createAgentOsRunTreeBudgetCeilingDigestV1,
  parseAgentOsBudgetCeilingSuccessorV1,
  parseAgentOsBudgetCurrentStateV1,
  parseAgentOsBudgetReservationReceiptV1,
  parseAgentOsBudgetReservationRequestV1,
  parseAgentOsBudgetSettlementReceiptV1,
  parseAgentOsResourceAttributionReceiptV1,
  parseAgentOsRunTreeBudgetCeilingV1,
} from "../src/index.js";
import type {
  AgentOsBudgetCeilingSuccessorUnsignedV1,
  AgentOsBudgetCurrentStateUnsignedV1,
  AgentOsBudgetReservationReceiptUnsignedV1,
  AgentOsBudgetReservationRequestUnsignedV1,
  AgentOsBudgetSettlementReceiptUnsignedV1,
  AgentOsBudgetVectorV1,
  AgentOsResourceAttributionReceiptUnsignedV1,
  AgentOsRunTreeBudgetCeilingUnsignedV1,
} from "../src/agent-os-run-tree-budget-v1-types.js";
import type { AgentOsEffectDispatchReceiptUnsignedV1 } from "../src/agent-os-effect-v1-types.js";

const ZERO = Object.freeze({
  inputTokens: 0,
  outputTokens: 0,
  toolCalls: 0,
  costUsdMicros: 0,
});
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

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value))
    return `[${value.map((item) => canonical(item)).join(",")}]`;
  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

function ceilingFixture(
  override: Partial<AgentOsRunTreeBudgetCeilingUnsignedV1> = {},
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
    hardDimensions: [
      "input_tokens",
      "output_tokens",
      "tool_calls",
      "cost_usd_micros",
    ],
    createdAt: "2026-08-07T00:00:00.000Z",
    ...override,
  };
  return parseAgentOsRunTreeBudgetCeilingV1({
    ...unsigned,
    ceilingDigest: createAgentOsRunTreeBudgetCeilingDigestV1(unsigned),
  });
}

function currentStateFixture(
  ceiling = ceilingFixture(),
  reservation: ReturnType<
    typeof parseAgentOsBudgetReservationReceiptV1
  > | null = null,
  override: Partial<AgentOsBudgetCurrentStateUnsignedV1> = {},
): ReturnType<typeof parseAgentOsBudgetCurrentStateV1> {
  const unsigned: AgentOsBudgetCurrentStateUnsignedV1 = {
    schemaVersion: "agent-os-run-tree-budget/v1",
    ceilingId: ceiling.ceilingId,
    ceilingDigest: ceiling.ceilingDigest,
    ceilingRevision: ceiling.revision,
    ownerReservationId: reservation?.reservationId ?? null,
    ownerReservationReceiptDigest: reservation?.receiptDigest ?? null,
    ownerDisposition: reservation === null ? "ceiling" : "reserved",
    balanceRevision: 3,
    reservationRevision: reservation?.reservationRevision ?? 0,
    reserved: reservation?.reserved ?? ceiling.limit,
    available: reservation?.reserved ?? ceiling.limit,
    committedTotal: ZERO,
    releasedTotal: ZERO,
    refundedTotal: ZERO,
    commitStates: [],
    latestSettlementReceiptDigest: null,
    capturedAt: "2026-08-07T00:00:00.500Z",
    ...override,
  };
  return parseAgentOsBudgetCurrentStateV1({
    ...unsigned,
    stateDigest: createAgentOsBudgetCurrentStateDigestV1(unsigned),
  });
}

function requestFixture(
  ceiling = ceilingFixture(),
  override: Partial<AgentOsBudgetReservationRequestUnsignedV1> = {},
  balanceState = currentStateFixture(ceiling),
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
    balanceStateDigest: balanceState.stateDigest,
    expectedBalanceRevision: balanceState.balanceRevision,
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
  right: AgentOsBudgetVectorV1,
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
  currentState = currentStateFixture(),
  override: Partial<AgentOsBudgetReservationReceiptUnsignedV1> = {},
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
    balanceStateDigest: currentState.stateDigest,
    balanceRevision: currentState.balanceRevision + 1,
    parentReservationId: request.parentReservationId,
    reservationRevision: 1,
    reserved: request.requested,
    availableBefore: currentState.available,
    availableAfter: subtract(currentState.available, request.requested),
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
  currentState = currentStateFixture(ceilingFixture(), reservation),
  override: Partial<AgentOsBudgetSettlementReceiptUnsignedV1> = {},
): ReturnType<typeof parseAgentOsBudgetSettlementReceiptV1> {
  const draft: AgentOsBudgetSettlementReceiptUnsignedV1 = {
    schemaVersion: "agent-os-run-tree-budget/v1",
    operation: "commit",
    receiptId: "receipt.commit.one",
    commandId: "command.commit.one",
    reservationId: reservation.reservationId,
    reservationReceiptDigest: reservation.receiptDigest,
    previousStateDigest: currentState.stateDigest,
    mutationDigest: digest("pending-mutation"),
    expectedReservationRevision: currentState.reservationRevision,
    reservationRevision: currentState.reservationRevision + 1,
    amount: REQUESTED,
    committedTotal: REQUESTED,
    releasedTotal: ZERO,
    refundedTotal: ZERO,
    sourceCommitReceiptDigest: null,
    sourceCommitRefundedTotal: null,
    usageEvidenceDigest: digest("dispatch-receipt"),
    correctionEvidenceDigest: null,
    occurredAt: "2026-08-07T00:00:03.000Z",
    ...override,
  };
  const unsigned: AgentOsBudgetSettlementReceiptUnsignedV1 = {
    ...draft,
    mutationDigest: createAgentOsBudgetSettlementMutationDigestV1({
      schemaVersion: draft.schemaVersion,
      operation: draft.operation,
      commandId: draft.commandId,
      reservationId: draft.reservationId,
      reservationReceiptDigest: draft.reservationReceiptDigest,
      previousStateDigest: draft.previousStateDigest,
      expectedReservationRevision: draft.expectedReservationRevision,
      amount: draft.amount,
      sourceCommitReceiptDigest: draft.sourceCommitReceiptDigest,
      usageEvidenceDigest: draft.usageEvidenceDigest,
      correctionEvidenceDigest: draft.correctionEvidenceDigest,
      occurredAt: draft.occurredAt,
    }),
  };
  return parseAgentOsBudgetSettlementReceiptV1({
    ...unsigned,
    receiptDigest: createAgentOsBudgetSettlementReceiptDigestV1(unsigned),
  });
}

function effectDispatchReceiptFixture(
  override: Partial<AgentOsEffectDispatchReceiptUnsignedV1> = {},
) {
  const unsigned: AgentOsEffectDispatchReceiptUnsignedV1 = {
    schemaVersion: "agent-os-effect/v1",
    receiptId: "receipt.effect.one",
    disposition: "succeeded",
    intentDigest: digest("effect-intent"),
    permitDigest: digest("effect-permit"),
    effectId: "effect.one",
    runId: "run.child",
    attemptId: "attempt.one",
    adapterKind: "provider",
    adapterId: "provider.demo",
    operation: "model.invoke",
    idempotencyKey: "idempotency:effect.one",
    requestDigest: digest("effect-request"),
    responseDigest: digest("effect-response"),
    authority: {
      grantId: "grant.demo",
      sessionGrantId: "session.demo",
      leaseId: "lease.demo",
      leaseEpoch: "lease-epoch:current",
      rotationGeneration: "rotation:key-current",
      revocationGeneration: "revocation:key-current",
      tenantId: "tenant.demo",
      workloadId: "workload.demo",
      principalId: "principal.demo",
      authorityDomain: "authority.demo",
      hostId: "host.demo",
      deploymentId: "deployment.demo",
      runId: "run.child",
      turnId: "turn.one",
      attemptId: "attempt.one",
      instanceId: "instance.demo",
      instanceGeneration: 3,
      claimId: "claim.demo",
      claimFence: 5,
      storeId: "store.demo",
      storeGeneration: 3,
      definitionDigest: digest("definition"),
      policyDigest: digest("policy"),
      capabilityDigest: digest("capability"),
      keyId: "key.demo",
    },
    usage: { inputUnits: 325, outputUnits: 200, totalUnits: 525 },
    dispatchedAt: "2026-08-07T00:00:03.500Z",
    completedAt: "2026-08-07T00:00:03.900Z",
    ...override,
  };
  return {
    ...unsigned,
    receiptDigest: createAgentOsEffectDispatchReceiptDigestV1(unsigned),
  };
}

function attributionFixture(
  reservation = reservationFixture(),
  effectDispatchReceipt = effectDispatchReceiptFixture(),
  override: Partial<AgentOsResourceAttributionReceiptUnsignedV1> = {},
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
    effectDispatchReceiptDigest: effectDispatchReceipt.receiptDigest,
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
    const currentState = currentStateFixture(ceiling);
    const { requestDigest, ...unsignedRequest } = request;
    const { stateDigest, ...unsignedState } = currentState;

    expect(Object.isFrozen(ceiling.limit)).toBe(true);
    expect(Object.isFrozen(request.subject)).toBe(true);
    expect(requestDigest).toBe(
      createAgentOsBudgetReservationRequestDigestV1(unsignedRequest),
    );
    expect(stateDigest).toBe(
      `sha256:${createHash("sha256").update(canonical(unsignedState)).digest("hex")}`,
    );
    expect(
      AgentOsRunTreeBudgetV1.parseAgentOsBudgetReservationReceiptV1(
        reservation,
      ),
    ).toEqual(reservation);
    expect(settlement.operation).toBe("commit");
    expect(attribution.observed.outputTokens).toEqual({
      kind: "unknown",
      reason: "provider_omitted",
    });
  });

  test("validates a root reservation and rejects sibling oversell", () => {
    const ceiling = ceilingFixture();
    const currentState = currentStateFixture(ceiling);
    const request = requestFixture(ceiling, {}, currentState);
    const reservation = reservationFixture(request, currentState);
    expect(() =>
      assertAgentOsBudgetReservationRelationshipV1({
        ceiling,
        parent: null,
        currentState,
        request,
        receipt: reservation,
      }),
    ).not.toThrow();

    const lowAvailable = {
      inputTokens: 100,
      outputTokens: 100,
      toolCalls: 0,
      costUsdMicros: 100,
    };
    const staleState = currentStateFixture(ceiling, null, {
      available: lowAvailable,
    });
    const staleRequest = requestFixture(ceiling, {}, staleState);
    const forged = reservationFixture(staleRequest, staleState, {
      reserved: staleRequest.requested,
      availableAfter: ZERO,
    });
    expect(() =>
      assertAgentOsBudgetReservationRelationshipV1({
        ceiling,
        parent: null,
        currentState: staleState,
        request: staleRequest,
        receipt: forged,
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("binds child reservations to an active same-ceiling parent current state", () => {
    const ceiling = ceilingFixture();
    const rootState = currentStateFixture(ceiling);
    const parentRequest = requestFixture(ceiling, {}, rootState);
    const parent = reservationFixture(parentRequest, rootState);
    const parentState = currentStateFixture(ceiling, parent, {
      available: {
        inputTokens: 300,
        outputTokens: 150,
        toolCalls: 1,
        costUsdMicros: 600_000,
      },
    });
    const subject = {
      kind: "child" as const,
      runId: "run.grandchild",
      turnId: null,
      attemptId: null,
      effectId: null,
      logicalKey: "child:grandchild" as const,
      storeGeneration: 4,
    };
    const attributionKey = createAgentOsBudgetAttributionKeyV1({
      ceilingId: ceiling.ceilingId,
      tenantId: ceiling.tenantId,
      workloadId: ceiling.workloadId,
      rootRunId: ceiling.rootRunId,
      parentAttributionKey: parent.attributionKey,
      subject,
    });
    const childRequest = requestFixture(
      ceiling,
      {
        commandId: "command.reserve.child",
        reservationId: "reservation.child",
        parentReservationId: parent.reservationId,
        parentReservationDigest: parent.receiptDigest,
        parentAttributionKey: parent.attributionKey,
        subject,
        requested: {
          inputTokens: 100,
          outputTokens: 50,
          toolCalls: 1,
          costUsdMicros: 200_000,
        },
        effectPermitDigest: null,
        attributionKey,
        chargeKey: createAgentOsBudgetChargeKeyV1({
          attributionKey,
          reservationId: "reservation.child",
          attemptId: null,
          effectId: null,
        }),
      },
      parentState,
    );
    const childReceipt = reservationFixture(childRequest, parentState, {
      receiptId: "receipt.reserve.child",
    });
    expect(() =>
      assertAgentOsBudgetReservationRelationshipV1({
        ceiling,
        parent,
        currentState: parentState,
        request: childRequest,
        receipt: childReceipt,
      }),
    ).not.toThrow();

    const deniedParent = reservationFixture(parentRequest, rootState, {
      disposition: "denied",
      denialReason: "insufficient_budget",
      reserved: ZERO,
      availableAfter: rootState.available,
    });
    expect(() =>
      assertAgentOsBudgetReservationRelationshipV1({
        ceiling,
        parent: deniedParent,
        currentState: parentState,
        request: childRequest,
        receipt: childReceipt,
      }),
    ).toThrow(AgentOsV1ContractError);

    const foreignParent = reservationFixture(parentRequest, rootState, {
      ceilingId: "ceiling.foreign",
      ceilingDigest: digest("foreign-ceiling"),
    });
    expect(() =>
      assertAgentOsBudgetReservationRelationshipV1({
        ceiling,
        parent: foreignParent,
        currentState: parentState,
        request: childRequest,
        receipt: childReceipt,
      }),
    ).toThrow(AgentOsV1ContractError);

    const selfParentRequest = requestFixture(
      ceiling,
      {
        commandId: "command.reserve.self-parent",
        reservationId: parent.reservationId,
        parentReservationId: parent.reservationId,
        parentReservationDigest: parent.receiptDigest,
        parentAttributionKey: parent.attributionKey,
        subject,
        requested: childRequest.requested,
        effectPermitDigest: null,
        attributionKey,
        chargeKey: createAgentOsBudgetChargeKeyV1({
          attributionKey,
          reservationId: parent.reservationId,
          attemptId: null,
          effectId: null,
        }),
      },
      parentState,
    );
    const selfParentReceipt = reservationFixture(
      selfParentRequest,
      parentState,
      {
        receiptId: "receipt.reserve.self-parent",
      },
    );
    expect(() =>
      assertAgentOsBudgetReservationRelationshipV1({
        ceiling,
        parent,
        currentState: parentState,
        request: selfParentRequest,
        receipt: selfParentReceipt,
      }),
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
      }),
    ).not.toBe(requestFixture(ceiling).chargeKey);
  });

  test("keeps unknown usage explicit and conservatively charges hard dimensions", () => {
    const ceiling = ceilingFixture();
    const balance = currentStateFixture(ceiling);
    const request = requestFixture(ceiling, {}, balance);
    const reservation = reservationFixture(request, balance);
    const currentState = currentStateFixture(ceiling, reservation);
    const effectDispatchReceipt = effectDispatchReceiptFixture();
    const attribution = attributionFixture(reservation, effectDispatchReceipt);
    expect(() =>
      assertAgentOsResourceAttributionRelationshipV1({
        ceiling,
        currentState,
        request,
        reservation,
        effectDispatchReceipt,
        attribution,
      }),
    ).not.toThrow();

    const fabricatedZero = attributionFixture(
      reservation,
      effectDispatchReceipt,
      {
        conservativeCharge: { ...REQUESTED, outputTokens: 0, costUsdMicros: 0 },
      },
    );
    expect(() =>
      assertAgentOsResourceAttributionRelationshipV1({
        ceiling,
        currentState,
        request,
        reservation,
        effectDispatchReceipt,
        attribution: fabricatedZero,
      }),
    ).toThrow(AgentOsV1ContractError);

    const driftedDispatch = effectDispatchReceiptFixture({
      attemptId: "attempt.two",
      effectId: "effect.two",
    });
    const driftedAttribution = attributionFixture(
      reservation,
      driftedDispatch,
      {
        attemptId: "attempt.two",
        effectId: "effect.two",
        chargeKey: createAgentOsBudgetChargeKeyV1({
          attributionKey: reservation.attributionKey,
          reservationId: reservation.reservationId,
          attemptId: "attempt.two",
          effectId: "effect.two",
        }),
      },
    );
    expect(() =>
      assertAgentOsResourceAttributionRelationshipV1({
        ceiling,
        currentState,
        request,
        reservation,
        effectDispatchReceipt: driftedDispatch,
        attribution: driftedAttribution,
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("enforces commit, release and refund bounds", () => {
    const ceiling = ceilingFixture();
    const balance = currentStateFixture(ceiling);
    const request = requestFixture(ceiling, {}, balance);
    const reservation = reservationFixture(request, balance);
    const currentState = currentStateFixture(ceiling, reservation);
    const commit = settlementFixture(reservation, currentState);
    expect(() =>
      assertAgentOsBudgetSettlementRelationshipV1({
        reservation,
        currentState,
        sourceCommit: null,
        receipt: commit,
      }),
    ).not.toThrow();

    const staleRevisionState = currentStateFixture(ceiling, reservation, {
      reservationRevision: currentState.reservationRevision + 1,
    });
    expect(() =>
      assertAgentOsBudgetSettlementRelationshipV1({
        reservation,
        currentState: staleRevisionState,
        sourceCommit: null,
        receipt: commit,
      }),
    ).toThrow(AgentOsV1ContractError);

    const zeroCommit = settlementFixture(reservation, currentState, {
      receiptId: "receipt.commit.zero",
      commandId: "command.commit.zero",
      amount: ZERO,
      committedTotal: ZERO,
    });
    const zeroCommittedState = currentStateFixture(ceiling, reservation, {
      reservationRevision: zeroCommit.reservationRevision,
      commitStates: [
        {
          commitReceiptDigest: zeroCommit.receiptDigest,
          usageEvidenceDigest: zeroCommit.usageEvidenceDigest!,
          committed: ZERO,
          refunded: ZERO,
        },
      ],
      latestSettlementReceiptDigest: zeroCommit.receiptDigest,
    });
    const releaseAfterZeroCommit = settlementFixture(
      reservation,
      zeroCommittedState,
      {
        operation: "release",
        receiptId: "receipt.release.after-zero",
        commandId: "command.release.after-zero",
        amount: { ...ZERO, toolCalls: 1 },
        releasedTotal: { ...ZERO, toolCalls: 1 },
        usageEvidenceDigest: null,
      },
    );
    expect(() =>
      assertAgentOsBudgetSettlementRelationshipV1({
        reservation,
        currentState: zeroCommittedState,
        sourceCommit: null,
        receipt: releaseAfterZeroCommit,
      }),
    ).toThrow(AgentOsV1ContractError);

    const committedState = currentStateFixture(ceiling, reservation, {
      reservationRevision: commit.reservationRevision,
      committedTotal: REQUESTED,
      commitStates: [
        {
          commitReceiptDigest: commit.receiptDigest,
          usageEvidenceDigest: commit.usageEvidenceDigest!,
          committed: commit.amount,
          refunded: ZERO,
        },
      ],
      latestSettlementReceiptDigest: commit.receiptDigest,
    });

    const overRelease = settlementFixture(reservation, committedState, {
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
        currentState: committedState,
        sourceCommit: null,
        receipt: overRelease,
      }),
    ).toThrow(AgentOsV1ContractError);

    const refundAmount = { ...ZERO, inputTokens: 100 };
    const refund = settlementFixture(reservation, committedState, {
      operation: "refund",
      receiptId: "receipt.refund.one",
      commandId: "command.refund.one",
      amount: refundAmount,
      committedTotal: REQUESTED,
      releasedTotal: ZERO,
      refundedTotal: refundAmount,
      sourceCommitReceiptDigest: commit.receiptDigest,
      sourceCommitRefundedTotal: refundAmount,
      usageEvidenceDigest: commit.usageEvidenceDigest,
      correctionEvidenceDigest: digest("correction"),
    });
    expect(() =>
      assertAgentOsBudgetSettlementRelationshipV1({
        reservation,
        currentState: committedState,
        sourceCommit: commit,
        receipt: refund,
      }),
    ).not.toThrow();

    const overRefund = settlementFixture(reservation, committedState, {
      operation: "refund",
      amount: { ...REQUESTED, inputTokens: REQUESTED.inputTokens + 1 },
      committedTotal: REQUESTED,
      releasedTotal: ZERO,
      refundedTotal: { ...REQUESTED, inputTokens: REQUESTED.inputTokens + 1 },
      sourceCommitReceiptDigest: commit.receiptDigest,
      sourceCommitRefundedTotal: {
        ...REQUESTED,
        inputTokens: REQUESTED.inputTokens + 1,
      },
      usageEvidenceDigest: commit.usageEvidenceDigest,
      correctionEvidenceDigest: digest("correction"),
    });
    expect(() =>
      assertAgentOsBudgetSettlementRelationshipV1({
        reservation,
        currentState: committedState,
        sourceCommit: commit,
        receipt: overRefund,
      }),
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
      assertAgentOsBudgetCeilingSuccessorRelationshipV1({
        predecessor,
        successor,
      }),
    ).not.toThrow();
    expect(successor.controlCommandReceiptDigest).toBe(
      digest("control-command-receipt"),
    );
  });

  test("same command and input replay exactly while payload drift changes the fingerprint", () => {
    const first = requestFixture();
    const replay = requestFixture();
    const drift = requestFixture(ceilingFixture(), {
      requested: { ...REQUESTED, toolCalls: 2 },
    });
    expect(replay.requestDigest).toBe(first.requestDigest);
    expect(drift.commandId).toBe(first.commandId);
    expect(drift.requestDigest).not.toBe(first.requestDigest);

    const reservation = reservationFixture();
    const state = currentStateFixture(ceilingFixture(), reservation);
    const commit = settlementFixture(reservation, state);
    const alteredCommit = settlementFixture(reservation, state, {
      amount: { ...REQUESTED, inputTokens: REQUESTED.inputTokens - 1 },
      committedTotal: { ...REQUESTED, inputTokens: REQUESTED.inputTokens - 1 },
    });
    expect(alteredCommit.commandId).toBe(commit.commandId);
    expect(alteredCommit.mutationDigest).not.toBe(commit.mutationDigest);

    const dispatch = effectDispatchReceiptFixture();
    const attribution = attributionFixture(reservation, dispatch);
    const alteredAttribution = attributionFixture(reservation, dispatch, {
      observed: {
        ...attribution.observed,
        inputTokens: { kind: "known", value: 324 },
      },
    });
    expect(alteredAttribution.receiptId).toBe(attribution.receiptId);
    expect(alteredAttribution.receiptDigest).not.toBe(
      attribution.receiptDigest,
    );
  });

  test("rejects unsafe values, unknown fields and hostile object shapes", () => {
    const ceiling = ceilingFixture();
    for (const unsafe of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() =>
        parseAgentOsRunTreeBudgetCeilingV1({
          ...ceiling,
          limit: { ...ceiling.limit, costUsdMicros: unsafe },
        }),
      ).toThrow(AgentOsV1ContractError);
    }
    expect(() =>
      parseAgentOsRunTreeBudgetCeilingV1({ ...ceiling, revision: 2 }),
    ).toThrow(AgentOsV1ContractError);
    const sparseDimensions = new Array<unknown>(2);
    sparseDimensions[0] = "input_tokens";
    expect(() =>
      parseAgentOsRunTreeBudgetCeilingV1({
        ...ceiling,
        hardDimensions: sparseDimensions,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsRunTreeBudgetCeilingV1({ ...ceiling, token: "secret" }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsRunTreeBudgetCeilingV1(Object.create(ceiling)),
    ).toThrow(AgentOsV1ContractError);

    const symbolInput = { ...ceiling, [Symbol("secret")]: "hidden" };
    expect(() => parseAgentOsRunTreeBudgetCeilingV1(symbolInput)).toThrow(
      AgentOsV1ContractError,
    );

    const accessorInput = { ...ceiling };
    Object.defineProperty(accessorInput, "revision", {
      enumerable: true,
      get: () => 1,
    });
    expect(() => parseAgentOsRunTreeBudgetCeilingV1(accessorInput)).toThrow(
      AgentOsV1ContractError,
    );

    const hiddenInput = { ...ceiling };
    Object.defineProperty(hiddenInput, "revision", {
      enumerable: false,
      value: 1,
    });
    expect(() => parseAgentOsRunTreeBudgetCeilingV1(hiddenInput)).toThrow(
      AgentOsV1ContractError,
    );
  });
});
