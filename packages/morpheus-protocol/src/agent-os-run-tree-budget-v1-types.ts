/** Run Tree Budget v1 只定义公共合同；Control 是跨 Run balance 的唯一 durable owner。 */
export type AgentOsBudgetDimensionV1 =
  | "input_tokens"
  | "output_tokens"
  | "tool_calls"
  | "cost_usd_micros";

export interface AgentOsBudgetVectorV1 {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly toolCalls: number;
  readonly costUsdMicros: number;
}

export type AgentOsBudgetUnknownReasonV1 =
  | "pricing_unavailable"
  | "provider_omitted"
  | "outcome_unknown"
  | "not_observed";

export type AgentOsBudgetObservedQuantityV1 =
  | { readonly kind: "known"; readonly value: number }
  | { readonly kind: "unknown"; readonly reason: AgentOsBudgetUnknownReasonV1 };

export interface AgentOsBudgetObservationV1 {
  readonly inputTokens: Readonly<AgentOsBudgetObservedQuantityV1>;
  readonly outputTokens: Readonly<AgentOsBudgetObservedQuantityV1>;
  readonly toolCalls: Readonly<AgentOsBudgetObservedQuantityV1>;
  readonly costUsdMicros: Readonly<AgentOsBudgetObservedQuantityV1>;
}

export interface AgentOsRunTreeBudgetCeilingUnsignedV1 {
  readonly schemaVersion: "agent-os-run-tree-budget/v1";
  readonly ceilingId: string;
  readonly tenantId: string;
  readonly workloadId: string;
  readonly rootRunId: string;
  readonly revision: number;
  readonly policyDigest: string;
  readonly limit: Readonly<AgentOsBudgetVectorV1>;
  readonly hardDimensions: readonly AgentOsBudgetDimensionV1[];
  readonly createdAt: string;
}

export interface AgentOsRunTreeBudgetCeilingV1 extends AgentOsRunTreeBudgetCeilingUnsignedV1 {
  readonly ceilingDigest: string;
}

export interface AgentOsBudgetSubjectV1 {
  readonly kind: "child" | "effect";
  readonly runId: string;
  readonly turnId: string | null;
  readonly attemptId: string | null;
  readonly effectId: string | null;
  readonly logicalKey: `${string}:${string}`;
  readonly storeGeneration: number;
}

export interface AgentOsBudgetReservationRequestUnsignedV1 {
  readonly schemaVersion: "agent-os-run-tree-budget/v1";
  readonly operation: "reserve";
  readonly commandId: string;
  readonly reservationId: string;
  readonly ceilingId: string;
  readonly ceilingDigest: string;
  readonly expectedCeilingRevision: number;
  readonly balanceStateDigest: string;
  readonly expectedBalanceRevision: number;
  readonly parentReservationId: string | null;
  readonly parentReservationDigest: string | null;
  readonly parentAttributionKey: string | null;
  readonly subject: Readonly<AgentOsBudgetSubjectV1>;
  readonly requested: Readonly<AgentOsBudgetVectorV1>;
  readonly upperBoundEvidenceDigest: string;
  readonly effectPermitDigest: string | null;
  readonly kernelFenceDigest: string;
  readonly attributionKey: string;
  readonly chargeKey: string;
  readonly requestedAt: string;
}

export interface AgentOsBudgetReservationRequestV1 extends AgentOsBudgetReservationRequestUnsignedV1 {
  readonly requestDigest: string;
}

export type AgentOsBudgetReservationDispositionV1 = "reserved" | "denied";
export type AgentOsBudgetReservationDenialReasonV1 =
  | "insufficient_budget"
  | "stale_ceiling"
  | "stale_parent"
  | "missing_upper_bound";

export interface AgentOsBudgetReservationReceiptUnsignedV1 {
  readonly schemaVersion: "agent-os-run-tree-budget/v1";
  readonly operation: "reserve";
  readonly receiptId: string;
  readonly commandId: string;
  readonly reservationId: string;
  readonly requestDigest: string;
  readonly disposition: AgentOsBudgetReservationDispositionV1;
  readonly denialReason: AgentOsBudgetReservationDenialReasonV1 | null;
  readonly ceilingId: string;
  readonly ceilingDigest: string;
  readonly ceilingRevision: number;
  readonly balanceStateDigest: string;
  readonly balanceRevision: number;
  readonly parentReservationId: string | null;
  readonly reservationRevision: number;
  readonly reserved: Readonly<AgentOsBudgetVectorV1>;
  readonly availableBefore: Readonly<AgentOsBudgetVectorV1>;
  readonly availableAfter: Readonly<AgentOsBudgetVectorV1>;
  readonly attributionKey: string;
  readonly chargeKey: string;
  readonly committedAt: string;
}

export interface AgentOsBudgetReservationReceiptV1 extends AgentOsBudgetReservationReceiptUnsignedV1 {
  readonly receiptDigest: string;
}

export type AgentOsBudgetSettlementOperationV1 =
  | "commit"
  | "release"
  | "refund";

export interface AgentOsBudgetCommitStateV1 {
  readonly commitReceiptDigest: string;
  readonly usageEvidenceDigest: string;
  readonly committed: Readonly<AgentOsBudgetVectorV1>;
  readonly refunded: Readonly<AgentOsBudgetVectorV1>;
}

export type AgentOsBudgetCurrentStateOwnerDispositionV1 =
  | "ceiling"
  | "reserved"
  | "closed";

export interface AgentOsBudgetCurrentStateUnsignedV1 {
  readonly schemaVersion: "agent-os-run-tree-budget/v1";
  readonly ceilingId: string;
  readonly ceilingDigest: string;
  readonly ceilingRevision: number;
  readonly ownerReservationId: string | null;
  readonly ownerReservationReceiptDigest: string | null;
  readonly ownerDisposition: AgentOsBudgetCurrentStateOwnerDispositionV1;
  readonly balanceRevision: number;
  readonly reservationRevision: number;
  readonly reserved: Readonly<AgentOsBudgetVectorV1>;
  readonly available: Readonly<AgentOsBudgetVectorV1>;
  readonly committedTotal: Readonly<AgentOsBudgetVectorV1>;
  readonly releasedTotal: Readonly<AgentOsBudgetVectorV1>;
  readonly refundedTotal: Readonly<AgentOsBudgetVectorV1>;
  readonly commitStates: readonly Readonly<AgentOsBudgetCommitStateV1>[];
  readonly latestSettlementReceiptDigest: string | null;
  readonly capturedAt: string;
}

export interface AgentOsBudgetCurrentStateV1 extends AgentOsBudgetCurrentStateUnsignedV1 {
  readonly stateDigest: string;
}

export interface AgentOsBudgetSettlementMutationUnsignedV1 {
  readonly schemaVersion: "agent-os-run-tree-budget/v1";
  readonly operation: AgentOsBudgetSettlementOperationV1;
  readonly commandId: string;
  readonly reservationId: string;
  readonly reservationReceiptDigest: string;
  readonly previousStateDigest: string;
  readonly expectedReservationRevision: number;
  readonly amount: Readonly<AgentOsBudgetVectorV1>;
  readonly sourceCommitReceiptDigest: string | null;
  readonly usageEvidenceDigest: string | null;
  readonly correctionEvidenceDigest: string | null;
  readonly occurredAt: string;
}

export interface AgentOsBudgetSettlementReceiptUnsignedV1 {
  readonly schemaVersion: "agent-os-run-tree-budget/v1";
  readonly operation: AgentOsBudgetSettlementOperationV1;
  readonly receiptId: string;
  readonly commandId: string;
  readonly reservationId: string;
  readonly reservationReceiptDigest: string;
  readonly previousStateDigest: string;
  readonly mutationDigest: string;
  readonly expectedReservationRevision: number;
  readonly reservationRevision: number;
  readonly amount: Readonly<AgentOsBudgetVectorV1>;
  readonly committedTotal: Readonly<AgentOsBudgetVectorV1>;
  readonly releasedTotal: Readonly<AgentOsBudgetVectorV1>;
  readonly refundedTotal: Readonly<AgentOsBudgetVectorV1>;
  readonly sourceCommitReceiptDigest: string | null;
  readonly sourceCommitRefundedTotal: Readonly<AgentOsBudgetVectorV1> | null;
  readonly usageEvidenceDigest: string | null;
  readonly correctionEvidenceDigest: string | null;
  readonly occurredAt: string;
}

export interface AgentOsBudgetSettlementReceiptV1 extends AgentOsBudgetSettlementReceiptUnsignedV1 {
  readonly receiptDigest: string;
}

export interface AgentOsResourceAttributionReceiptUnsignedV1 {
  readonly schemaVersion: "agent-os-run-tree-budget/v1";
  readonly receiptId: string;
  readonly reservationId: string;
  readonly reservationReceiptDigest: string;
  readonly attributionKey: string;
  readonly chargeKey: string;
  readonly attemptId: string;
  readonly effectId: string;
  readonly effectDispatchReceiptDigest: string;
  readonly observed: Readonly<AgentOsBudgetObservationV1>;
  readonly conservativeCharge: Readonly<AgentOsBudgetVectorV1>;
  readonly observedAt: string;
}

export interface AgentOsResourceAttributionReceiptV1 extends AgentOsResourceAttributionReceiptUnsignedV1 {
  readonly receiptDigest: string;
}

export interface AgentOsBudgetCeilingSuccessorUnsignedV1 {
  readonly schemaVersion: "agent-os-run-tree-budget/v1";
  readonly predecessorCeilingId: string;
  readonly predecessorCeilingDigest: string;
  readonly predecessorRevision: number;
  readonly successor: Readonly<AgentOsRunTreeBudgetCeilingV1>;
  readonly controlCommandId: string;
  readonly controlCommandDigest: string;
  readonly controlCommandReceiptDigest: string;
  readonly authorizationRevision: number;
  readonly installedAt: string;
}

export interface AgentOsBudgetCeilingSuccessorV1 extends AgentOsBudgetCeilingSuccessorUnsignedV1 {
  readonly successorDigest: string;
}

/** 注入式只读端口；协议包不提供 transport、cache 或 storage implementation。 */
export interface BudgetReservationCurrentStatePortV1 {
  readCeiling(
    ceilingId: string,
  ): Promise<Readonly<AgentOsRunTreeBudgetCeilingV1> | null>;
  readCurrentState(
    ceilingId: string,
    ownerReservationId: string | null,
  ): Promise<Readonly<AgentOsBudgetCurrentStateV1> | null>;
}
