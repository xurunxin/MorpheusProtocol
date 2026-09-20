import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import { parseAgentOsEffectDispatchReceiptV1 } from "./agent-os-effect-v1-contract.js";
import {
  parseAgentOsBudgetCurrentStateV1,
  parseAgentOsBudgetSettlementReceiptV1,
} from "./agent-os-run-tree-budget-v1-contract.js";

/** Authenticated Worker evidence, never a caller-selected charge or refund. */
export interface AgentOsWorkerBudgetReconciliationInputV1 {
  readonly commandId: string;
  readonly reservationId: string;
  readonly reservationReceiptDigest: string;
  readonly previousStateDigest: string;
  readonly expectedReservationRevision: number;
  readonly kernelFenceDigest: string;
  readonly dispatchReceipt: ReturnType<
    typeof parseAgentOsEffectDispatchReceiptV1
  >;
}

/** v1 deliberately has no refund/release path: unknown remains outstanding. */
export interface AgentOsWorkerBudgetReconciliationReceiptV1 {
  readonly schemaVersion: "agent-os-worker-budget-reconciliation/v1";
  readonly commandId: string;
  readonly reservationId: string;
  readonly reservationReceiptDigest: string;
  readonly dispatchReceiptDigest: string;
  readonly previousStateDigest: string;
  readonly previousReservationRevision: number;
  readonly policy: "commit-reserved-known-retain-unknown/v1";
  readonly result: "retained_unknown" | "committed_upper_bound";
  readonly settlement: ReturnType<
    typeof parseAgentOsBudgetSettlementReceiptV1
  > | null;
  readonly reservationState: ReturnType<
    typeof parseAgentOsBudgetCurrentStateV1
  >;
  readonly receiptDigest: string;
}

const keys = [
  "schemaVersion",
  "commandId",
  "reservationId",
  "reservationReceiptDigest",
  "dispatchReceiptDigest",
  "previousStateDigest",
  "previousReservationRevision",
  "policy",
  "result",
  "settlement",
  "reservationState",
] as const;
const dimensions = [
  "inputTokens",
  "outputTokens",
  "toolCalls",
  "costUsdMicros",
] as const;

export function parseAgentOsWorkerBudgetReconciliationInputV1(
  input: unknown,
): AgentOsWorkerBudgetReconciliationInputV1 {
  const value = record(input, [
    "commandId",
    "reservationId",
    "reservationReceiptDigest",
    "previousStateDigest",
    "expectedReservationRevision",
    "kernelFenceDigest",
    "dispatchReceipt",
  ]);
  return deepFreeze({
    commandId: id(value.commandId),
    reservationId: id(value.reservationId),
    reservationReceiptDigest: digest(value.reservationReceiptDigest),
    previousStateDigest: digest(value.previousStateDigest),
    expectedReservationRevision: revision(value.expectedReservationRevision),
    kernelFenceDigest: digest(value.kernelFenceDigest),
    dispatchReceipt: parseAgentOsEffectDispatchReceiptV1(value.dispatchReceipt),
  });
}

function unsigned(
  input: unknown,
): Omit<AgentOsWorkerBudgetReconciliationReceiptV1, "receiptDigest"> {
  const value = record(input, keys);
  if (
    value.schemaVersion !== "agent-os-worker-budget-reconciliation/v1" ||
    value.policy !== "commit-reserved-known-retain-unknown/v1"
  )
    invalid();
  if (
    value.result !== "retained_unknown" &&
    value.result !== "committed_upper_bound"
  )
    invalid();
  const reservationId = id(value.reservationId);
  const reservationReceiptDigest = digest(value.reservationReceiptDigest);
  const dispatchReceiptDigest = digest(value.dispatchReceiptDigest);
  const previousStateDigest = digest(value.previousStateDigest);
  const previousReservationRevision = revision(
    value.previousReservationRevision,
  );
  const reservationState = parseAgentOsBudgetCurrentStateV1(
    value.reservationState,
  );
  const settlement =
    value.settlement === null
      ? null
      : parseAgentOsBudgetSettlementReceiptV1(value.settlement);
  if (
    reservationState.ownerReservationId !== reservationId ||
    reservationState.ownerReservationReceiptDigest !== reservationReceiptDigest
  )
    invalid();
  if (value.result === "retained_unknown") {
    if (
      settlement !== null ||
      reservationState.stateDigest !== previousStateDigest ||
      reservationState.reservationRevision !== previousReservationRevision ||
      reservationState.ownerDisposition !== "reserved"
    )
      invalid();
  } else {
    if (
      settlement?.commandId !== value.commandId ||
      reservationState.commitStates.length !== 1 ||
      reservationState.commitStates[0]?.commitReceiptDigest !==
        settlement?.receiptDigest ||
      reservationState.commitStates[0]?.usageEvidenceDigest !==
        dispatchReceiptDigest ||
      (settlement !== null &&
        reservationState.capturedAt < settlement.occurredAt)
    )
      invalid();
    if (
      settlement === null ||
      settlement.operation !== "commit" ||
      settlement.reservationId !== reservationId ||
      settlement.reservationReceiptDigest !== reservationReceiptDigest ||
      settlement.previousStateDigest !== previousStateDigest ||
      settlement.expectedReservationRevision !== previousReservationRevision ||
      settlement.reservationRevision !== previousReservationRevision + 1 ||
      settlement.usageEvidenceDigest !== dispatchReceiptDigest ||
      settlement.sourceCommitReceiptDigest !== null ||
      settlement.correctionEvidenceDigest !== null ||
      settlement.reservationRevision !== reservationState.reservationRevision ||
      reservationState.latestSettlementReceiptDigest !==
        settlement.receiptDigest ||
      reservationState.ownerDisposition !== "closed"
    )
      invalid();
    for (const dimension of dimensions) {
      if (
        settlement.amount[dimension] !== reservationState.reserved[dimension] ||
        settlement.committedTotal[dimension] !== settlement.amount[dimension] ||
        reservationState.committedTotal[dimension] !==
          settlement.committedTotal[dimension] ||
        reservationState.available[dimension] !== 0 ||
        reservationState.releasedTotal[dimension] !== 0 ||
        reservationState.refundedTotal[dimension] !== 0 ||
        settlement.releasedTotal[dimension] !== 0 ||
        settlement.refundedTotal[dimension] !== 0
      )
        invalid();
    }
  }
  return {
    schemaVersion: "agent-os-worker-budget-reconciliation/v1",
    commandId: id(value.commandId),
    reservationId,
    reservationReceiptDigest,
    dispatchReceiptDigest,
    previousStateDigest,
    previousReservationRevision,
    policy: "commit-reserved-known-retain-unknown/v1",
    result: value.result,
    settlement,
    reservationState,
  };
}

export function createAgentOsWorkerBudgetReconciliationReceiptV1(
  input: Omit<AgentOsWorkerBudgetReconciliationReceiptV1, "receiptDigest">,
): AgentOsWorkerBudgetReconciliationReceiptV1 {
  const value = unsigned(input);
  return deepFreeze({ ...value, receiptDigest: hash(value) });
}

export function parseAgentOsWorkerBudgetReconciliationReceiptV1(
  input: unknown,
): AgentOsWorkerBudgetReconciliationReceiptV1 {
  const value = record(input, [...keys, "receiptDigest"]);
  const { receiptDigest, ...source } = value;
  const parsed = unsigned(source);
  if (digest(receiptDigest) !== hash(parsed)) invalid();
  return deepFreeze({ ...parsed, receiptDigest: digest(receiptDigest) });
}

/** Structural correlation only; Control must re-read its durable admission and current writer. */
export function assertAgentOsWorkerBudgetReconciliationBindingV1(
  input: unknown,
  output: unknown,
): void {
  const request = parseAgentOsWorkerBudgetReconciliationInputV1(input);
  const receipt = parseAgentOsWorkerBudgetReconciliationReceiptV1(output);
  for (const key of [
    "commandId",
    "reservationId",
    "reservationReceiptDigest",
    "previousStateDigest",
  ] as const)
    if (request[key] !== receipt[key]) invalid();
  if (
    receipt.previousReservationRevision !==
      request.expectedReservationRevision ||
    receipt.dispatchReceiptDigest !== request.dispatchReceipt.receiptDigest ||
    receipt.result !==
      (request.dispatchReceipt.disposition === "unknown"
        ? "retained_unknown"
        : "committed_upper_bound")
  )
    invalid();
}

function record(
  input: unknown,
  expected: readonly string[],
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    return invalid();
  if (Object.keys(input).sort().join("|") !== [...expected].sort().join("|"))
    invalid();
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor)) invalid();
  }
  let json: string | undefined;
  try {
    json = JSON.stringify(input);
  } catch {
    return invalid();
  }
  if (json === undefined || new TextEncoder().encode(json).length > 1_048_576)
    invalid();
  return input as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9._/-]{0,127}$/u.test(value))
    return invalid();
  return value;
}
function digest(value: unknown): string {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value))
    return invalid();
  return value;
}
function revision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    return invalid();
  return value;
}
function hash(value: unknown): string {
  return `sha256:${sha256Hex(JSON.stringify(value))}`;
}
function invalid(): never {
  throw new Error("INVALID_WORKER_BUDGET_RECONCILIATION");
}
