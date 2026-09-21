import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import { parseAgentOsV1ExecutionClaimBinding } from "./agent-os-v1-contract.js";
import {
  parseAgentOsBudgetReservationRequestV1,
  parseAgentOsBudgetReservationReceiptV1,
  type AgentOsBudgetVectorV1,
} from "./agent-os-run-tree-budget-v1-contract.js";
import { parseAgentOsWorkerRunAuthorizationV1 } from "./agent-os-worker-authority-v1-contract.js";

/** Only an authenticated Worker may provide this observation of its committed Kernel child. */
export interface AgentOsWorkerChildAuthorizationInputV1 {
  readonly schemaVersion: "agent-os-worker-child-authority/v1";
  readonly commandId: string;
  readonly admissionId: string;
  readonly parentClaim: ReturnType<typeof parseAgentOsV1ExecutionClaimBinding>;
  readonly parentGrantDigest: string;
  readonly parentTurnId: string;
  readonly parentRunRevision: number;
  readonly kernelChildId: string;
  readonly logicalChildKey: string;
  readonly runId: string;
  readonly turnId: string;
  readonly attemptId: string;
  readonly inputDigest: string;
  readonly definitionDigest: string;
  readonly capabilityDigest: string;
  readonly policyDigest: string;
  readonly requestedBudget: Readonly<AgentOsBudgetVectorV1>;
  readonly preparedAt: string;
  readonly kernelFenceDigest: string;
}

/** Historical authorization is not permission to dispatch: both parent and child must remain current. */
export interface AgentOsWorkerChildAuthorizationReceiptV1 {
  readonly schemaVersion: "agent-os-worker-child-authority/v1";
  readonly commandId: string;
  readonly admissionId: string;
  readonly inputDigest: string;
  readonly parentGrantDigest: string;
  readonly kernelFenceDigest: string;
  readonly authorization: ReturnType<
    typeof parseAgentOsWorkerRunAuthorizationV1
  >;
  readonly budgetRequest: ReturnType<
    typeof parseAgentOsBudgetReservationRequestV1
  >;
  readonly budgetReceipt: ReturnType<
    typeof parseAgentOsBudgetReservationReceiptV1
  >;
  readonly receiptDigest: string;
}

const inputKeys = [
  "schemaVersion",
  "commandId",
  "admissionId",
  "parentClaim",
  "parentGrantDigest",
  "parentTurnId",
  "parentRunRevision",
  "kernelChildId",
  "logicalChildKey",
  "runId",
  "turnId",
  "attemptId",
  "inputDigest",
  "definitionDigest",
  "capabilityDigest",
  "policyDigest",
  "requestedBudget",
  "preparedAt",
] as const;
const receiptKeys = [
  "schemaVersion",
  "commandId",
  "admissionId",
  "inputDigest",
  "parentGrantDigest",
  "kernelFenceDigest",
  "authorization",
  "budgetRequest",
  "budgetReceipt",
] as const;
const dimensions = [
  "inputTokens",
  "outputTokens",
  "toolCalls",
  "costUsdMicros",
] as const;

function unsignedInput(
  input: unknown,
): Omit<AgentOsWorkerChildAuthorizationInputV1, "kernelFenceDigest"> {
  const value = record(input, inputKeys);
  if (value.schemaVersion !== "agent-os-worker-child-authority/v1") invalid();
  const parentClaim = parseAgentOsV1ExecutionClaimBinding(value.parentClaim);
  const runId = id(value.runId);
  if (runId === parentClaim.runId) invalid();
  const requested = record(value.requestedBudget, dimensions);
  const requestedBudget = {
    inputTokens: integer(requested.inputTokens, 0),
    outputTokens: integer(requested.outputTokens, 0),
    toolCalls: integer(requested.toolCalls, 0),
    costUsdMicros: integer(requested.costUsdMicros, 0),
  };
  if (dimensions.every((key) => requestedBudget[key] === 0)) invalid();
  if (
    typeof value.preparedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.preparedAt) ||
    !Number.isFinite(Date.parse(value.preparedAt)) ||
    new Date(value.preparedAt).toISOString() !== value.preparedAt
  )
    invalid();
  return {
    schemaVersion: "agent-os-worker-child-authority/v1",
    commandId: id(value.commandId),
    admissionId: id(value.admissionId),
    parentClaim,
    parentGrantDigest: digest(value.parentGrantDigest),
    parentTurnId: id(value.parentTurnId),
    parentRunRevision: integer(value.parentRunRevision, 1),
    kernelChildId: id(value.kernelChildId),
    logicalChildKey: id(value.logicalChildKey),
    runId,
    turnId: id(value.turnId),
    attemptId: id(value.attemptId),
    inputDigest: digest(value.inputDigest),
    definitionDigest: digest(value.definitionDigest),
    capabilityDigest: digest(value.capabilityDigest),
    policyDigest: digest(value.policyDigest),
    requestedBudget,
    preparedAt: value.preparedAt,
  };
}

/** Seals the complete committed preparation, including the immutable parent writer claim. */
export function createAgentOsWorkerChildAuthorizationInputV1(
  input: Omit<AgentOsWorkerChildAuthorizationInputV1, "kernelFenceDigest">,
): AgentOsWorkerChildAuthorizationInputV1 {
  const value = unsignedInput(input);
  return deepFreeze({ ...value, kernelFenceDigest: hash(value) });
}
export function parseAgentOsWorkerChildAuthorizationInputV1(
  input: unknown,
): AgentOsWorkerChildAuthorizationInputV1 {
  const value = record(input, [...inputKeys, "kernelFenceDigest"]);
  const { kernelFenceDigest, ...unsigned } = value;
  const parsed = unsignedInput(unsigned);
  if (digest(kernelFenceDigest) !== hash(parsed)) invalid();
  return deepFreeze({
    ...parsed,
    kernelFenceDigest: digest(kernelFenceDigest),
  });
}
export function createAgentOsWorkerChildAuthorizationInputDigestV1(
  input: unknown,
): string {
  return hash(parseAgentOsWorkerChildAuthorizationInputV1(input));
}

function unsignedReceipt(
  input: unknown,
): Omit<AgentOsWorkerChildAuthorizationReceiptV1, "receiptDigest"> {
  const value = record(input, receiptKeys);
  if (value.schemaVersion !== "agent-os-worker-child-authority/v1") invalid();
  const authorization = parseAgentOsWorkerRunAuthorizationV1(
    value.authorization,
  );
  const budgetRequest = parseAgentOsBudgetReservationRequestV1(
    value.budgetRequest,
  );
  const budgetReceipt = parseAgentOsBudgetReservationReceiptV1(
    value.budgetReceipt,
  );
  const kernelFenceDigest = digest(value.kernelFenceDigest);
  const grant = authorization.contract.executionGrant;
  if (
    authorization.duplicate ||
    budgetReceipt.disposition !== "reserved" ||
    budgetRequest.subject.kind !== "child" ||
    budgetRequest.subject.runId !== grant.runId ||
    budgetRequest.commandId !== budgetReceipt.commandId ||
    budgetRequest.reservationId !== budgetReceipt.reservationId ||
    budgetRequest.requestDigest !== budgetReceipt.requestDigest ||
    budgetRequest.ceilingId !== budgetReceipt.ceilingId ||
    budgetRequest.ceilingDigest !== budgetReceipt.ceilingDigest ||
    budgetRequest.expectedCeilingRevision !== budgetReceipt.ceilingRevision ||
    budgetRequest.balanceStateDigest !== budgetReceipt.balanceStateDigest ||
    budgetRequest.expectedBalanceRevision + 1 !==
      budgetReceipt.balanceRevision ||
    budgetRequest.parentReservationId !== budgetReceipt.parentReservationId ||
    budgetReceipt.committedAt < budgetRequest.requestedAt ||
    budgetRequest.attributionKey !== budgetReceipt.attributionKey ||
    budgetRequest.chargeKey !== budgetReceipt.chargeKey ||
    budgetRequest.kernelFenceDigest !== kernelFenceDigest
  )
    invalid();
  for (const key of dimensions)
    if (budgetRequest.requested[key] !== budgetReceipt.reserved[key]) invalid();
  return {
    schemaVersion: "agent-os-worker-child-authority/v1",
    commandId: id(value.commandId),
    admissionId: id(value.admissionId),
    inputDigest: digest(value.inputDigest),
    parentGrantDigest: digest(value.parentGrantDigest),
    kernelFenceDigest,
    authorization,
    budgetRequest,
    budgetReceipt,
  };
}
export function createAgentOsWorkerChildAuthorizationReceiptV1(
  input: Omit<AgentOsWorkerChildAuthorizationReceiptV1, "receiptDigest">,
): AgentOsWorkerChildAuthorizationReceiptV1 {
  const value = unsignedReceipt(input);
  return deepFreeze({ ...value, receiptDigest: hash(value) });
}
export function parseAgentOsWorkerChildAuthorizationReceiptV1(
  input: unknown,
): AgentOsWorkerChildAuthorizationReceiptV1 {
  const value = record(input, [...receiptKeys, "receiptDigest"]);
  const { receiptDigest, ...unsigned } = value;
  const parsed = unsignedReceipt(unsigned);
  if (digest(receiptDigest) !== hash(parsed)) invalid();
  return deepFreeze({ ...parsed, receiptDigest: digest(receiptDigest) });
}

/** Correlation only. Control re-reads authority and Worker re-checks its own Kernel before I/O. */
export function assertAgentOsWorkerChildAuthorizationBindingV1(
  input: unknown,
  output: unknown,
): void {
  const request = parseAgentOsWorkerChildAuthorizationInputV1(input);
  const receipt = parseAgentOsWorkerChildAuthorizationReceiptV1(output);
  for (const key of [
    "commandId",
    "admissionId",
    "parentGrantDigest",
    "kernelFenceDigest",
  ] as const)
    if (request[key] !== receipt[key]) invalid();
  const grant = receipt.authorization.contract.executionGrant;
  if (
    receipt.inputDigest !== hash(request) ||
    grant.runId !== request.runId ||
    grant.attemptId !== request.attemptId ||
    receipt.authorization.turnId !== request.turnId ||
    grant.definitionDigest !== request.definitionDigest ||
    grant.capabilityDigest !== request.capabilityDigest ||
    grant.policyDigest !== request.policyDigest ||
    grant.grantId === request.parentClaim.grantId ||
    grant.authorityDomain !== request.parentClaim.authorityDomain ||
    receipt.budgetRequest.subject.storeGeneration !==
      request.parentClaim.storeGeneration ||
    receipt.budgetRequest.subject.logicalKey !==
      `child:${request.logicalChildKey}` ||
    receipt.budgetRequest.requestedAt !== request.preparedAt
  )
    invalid();
  for (const key of dimensions)
    if (receipt.budgetRequest.requested[key] !== request.requestedBudget[key])
      invalid();
}

function record(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    return invalid();
  if (Object.keys(input).sort().join("|") !== [...keys].sort().join("|"))
    invalid();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor)) invalid();
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
function integer(value: unknown, minimum: number): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  )
    return invalid();
  return value;
}
function hash(value: unknown): string {
  return `sha256:${sha256Hex(JSON.stringify(value))}`;
}
function invalid(): never {
  throw new Error("INVALID_WORKER_CHILD_AUTHORIZATION");
}
