import {
  AgentOsV1ContractError,
  parseAgentOsV1ExecutionGrant,
  parseAgentOsV1ExecutionInstance,
} from "./agent-os-v1-contract.js";
import {
  assertAgentOsBudgetReservationRelationshipV1,
  parseAgentOsRunTreeBudgetCeilingV1,
  parseAgentOsBudgetReservationRequestV1,
  parseAgentOsBudgetReservationReceiptV1,
  parseAgentOsBudgetCurrentStateV1,
} from "./agent-os-run-tree-budget-v1-contract.js";
import { deepFreeze, sha256Hex } from "./contract-primitives.js";

/** Control 对已预留子额度的排他消费绑定；摘要不是签名或授权来源。 */
export interface AgentOsHostBudgetConsumptionBindingUnsignedV1 {
  readonly schemaVersion: "agent-os-host-budget-consumption/v1";
  readonly commandId: string;
  readonly consumerId: string;
  readonly claimRevision: 1;
  readonly controlId: string;
  readonly grantId: string;
  readonly grantDigest: string;
  readonly reservationId: string;
  readonly requestDigest: string;
  readonly reservationReceiptDigest: string;
  readonly reservationStateDigest: string;
  readonly hostId: string;
  readonly storeId: string;
  readonly storeGeneration: number;
  readonly rootRunId: string;
  readonly rootAttemptId: string;
  readonly definitionDigest: string;
  readonly policyDigest: string;
  readonly capabilityDigest: string;
  readonly budgetTreeRootRunId: string;
  readonly instanceId: string;
  readonly instanceGeneration: number;
  readonly placementId: string;
  readonly placementRevision: number;
  readonly leaseId: string;
  readonly leaseEpoch: `lease-epoch:${string}`;
  readonly scope: readonly string[];
  readonly allowedEffectKinds: readonly (
    | "provider.compact"
    | "provider.llm"
    | "tool.dispatch"
  )[];
  readonly allowRetry: boolean;
  readonly lineageRule: "same-consumption-binding-parent/v1";
  /** 仅同一 Host 的逻辑执行树；不授予 Worker placement 或跨 Host 委派。 */
  readonly consumptionKind: "personal-host-local-run-tree";
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface AgentOsHostBudgetConsumptionBindingV1 extends AgentOsHostBudgetConsumptionBindingUnsignedV1 {
  readonly bindingDigest: string;
}

export const AGENT_OS_HOST_BUDGET_CONSUMPTION_SCHEMA_V1 =
  "agent-os-host-budget-consumption/v1" as const;

const KEYS = [
  "schemaVersion",
  "commandId",
  "consumerId",
  "claimRevision",
  "controlId",
  "grantId",
  "grantDigest",
  "reservationId",
  "requestDigest",
  "reservationReceiptDigest",
  "reservationStateDigest",
  "hostId",
  "storeId",
  "storeGeneration",
  "rootRunId",
  "rootAttemptId",
  "definitionDigest",
  "policyDigest",
  "capabilityDigest",
  "budgetTreeRootRunId",
  "instanceId",
  "instanceGeneration",
  "placementId",
  "placementRevision",
  "leaseId",
  "leaseEpoch",
  "scope",
  "consumptionKind",
  "createdAt",
  "expiresAt",
  "allowedEffectKinds",
  "allowRetry",
  "lineageRule",
] as const;

export function createAgentOsHostBudgetConsumptionV1(
  input: Omit<
    AgentOsHostBudgetConsumptionBindingUnsignedV1,
    "schemaVersion" | "consumptionKind" | "lineageRule"
  >,
): Readonly<AgentOsHostBudgetConsumptionBindingV1> {
  const value = unsigned({
    ...input,
    schemaVersion: AGENT_OS_HOST_BUDGET_CONSUMPTION_SCHEMA_V1,
    consumptionKind: "personal-host-local-run-tree",
    lineageRule: "same-consumption-binding-parent/v1",
  });
  return deepFreeze({ ...value, bindingDigest: contentDigest(value) });
}

export function parseAgentOsHostBudgetConsumptionV1(
  input: unknown,
): Readonly<AgentOsHostBudgetConsumptionBindingV1> {
  const value = record(input);
  exact(value, [...KEYS, "bindingDigest"]);
  const { bindingDigest, ...source } = value;
  const parsed = unsigned(source);
  if (digest(bindingDigest) !== contentDigest(parsed))
    fail("DRIFT_DETECTED", "Host budget consumption binding digest drifted");
  return deepFreeze({ ...parsed, bindingDigest: digest(bindingDigest) });
}

export function serializeAgentOsHostBudgetConsumptionV1(
  input: unknown,
): string {
  return canonical(parseAgentOsHostBudgetConsumptionV1(input));
}

function unsigned(
  input: unknown,
): Readonly<AgentOsHostBudgetConsumptionBindingUnsignedV1> {
  const value = record(input);
  exact(value, KEYS);
  if (value.schemaVersion !== AGENT_OS_HOST_BUDGET_CONSUMPTION_SCHEMA_V1)
    fail("UNSUPPORTED_VERSION", "unsupported Host budget consumption schema");
  if (value.consumptionKind !== "personal-host-local-run-tree")
    fail("INVALID_VALUE", "unsupported Host budget consumption kind");
  if (value.lineageRule !== "same-consumption-binding-parent/v1")
    fail("INVALID_VALUE", "unsupported Host budget lineage rule");
  const operations = strings(value.allowedEffectKinds, 3);
  if (
    operations.some(
      (op, i) =>
        !["provider.compact", "provider.llm", "tool.dispatch"].includes(op) ||
        (i > 0 && operations[i - 1]! >= op),
    )
  )
    fail("INVALID_VALUE", "Host budget operations must be sorted and unique");
  if (value.claimRevision !== 1 || typeof value.allowRetry !== "boolean")
    fail(
      "INVALID_VALUE",
      "Host budget claim v1 has one immutable revision and an explicit retry flag",
    );
  const generation = integer(value.storeGeneration, 0);
  if (
    typeof value.leaseEpoch !== "string" ||
    !/^lease-epoch:[a-z][a-z0-9._-]{0,127}$/u.test(value.leaseEpoch)
  )
    fail("INVALID_VALUE", "invalid Host lease epoch");
  const createdAt = instant(value.createdAt);
  const expiresAt = instant(value.expiresAt);
  if (Date.parse(expiresAt) <= Date.parse(createdAt))
    fail(
      "INVALID_VALUE",
      "Host budget consumption must have a positive lifetime",
    );
  const scope = strings(value.scope, 128).map(identifier);
  if (
    new Set(scope).size !== scope.length ||
    scope.some((item, i) => i > 0 && scope[i - 1]! >= item)
  )
    fail("INVALID_VALUE", "Host budget scope must be sorted and unique");
  return deepFreeze({
    schemaVersion: AGENT_OS_HOST_BUDGET_CONSUMPTION_SCHEMA_V1,
    commandId: identifier(value.commandId),
    consumerId: identifier(value.consumerId),
    claimRevision: 1,
    controlId: identifier(value.controlId),
    grantId: identifier(value.grantId),
    grantDigest: digest(value.grantDigest),
    reservationId: identifier(value.reservationId),
    requestDigest: digest(value.requestDigest),
    reservationReceiptDigest: digest(value.reservationReceiptDigest),
    reservationStateDigest: digest(value.reservationStateDigest),
    hostId: identifier(value.hostId),
    storeId: identifier(value.storeId),
    storeGeneration: generation,
    rootRunId: identifier(value.rootRunId),
    rootAttemptId: identifier(value.rootAttemptId),
    definitionDigest: digest(value.definitionDigest),
    policyDigest: digest(value.policyDigest),
    capabilityDigest: digest(value.capabilityDigest),
    budgetTreeRootRunId: identifier(value.budgetTreeRootRunId),
    instanceId: identifier(value.instanceId),
    instanceGeneration: integer(value.instanceGeneration, 0),
    placementId: identifier(value.placementId),
    placementRevision: integer(value.placementRevision, 0),
    leaseId: identifier(value.leaseId),
    leaseEpoch: value.leaseEpoch as `lease-epoch:${string}`,
    scope,
    allowedEffectKinds:
      operations as AgentOsHostBudgetConsumptionBindingUnsignedV1["allowedEffectKinds"],
    allowRetry: value.allowRetry,
    lineageRule: "same-consumption-binding-parent/v1",
    consumptionKind: "personal-host-local-run-tree",
    createdAt,
    expiresAt,
  });
}

function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9._/-]{0,127}$/u.test(value))
    fail(
      "INVALID_VALUE",
      "Host budget identity must use the Agent OS v1 identifier grammar",
    );
  return value;
}

/** 解析后排序所有对象键；Control/Host 不自行选择不同的 grant 哈希形式。 */
export function createAgentOsHostBudgetGrantDigestV1(grant: unknown): string {
  return contentDigest(parseAgentOsV1ExecutionGrant(grant));
}

/** 只验证公开证据的关系；真实 current owner/排他 CAS 与撤销检查仍由调用方 authority 提供。 */
export function assertAgentOsHostBudgetConsumptionRelationshipV1(input: {
  readonly binding: unknown;
  readonly grant: unknown;
  readonly instance: unknown;
  readonly ceiling: unknown;
  readonly parent: unknown | null;
  readonly preReservationState: unknown;
  readonly request: unknown;
  readonly receipt: unknown;
  readonly reservationState: unknown;
  readonly admissionKernelFenceDigest: string;
  readonly now: string;
  readonly consumer: Readonly<{
    hostId: string;
    storeId: string;
    storeGeneration: number;
    rootRunId: string;
    rootAttemptId: string;
    definitionDigest: string;
    policyDigest: string;
    capabilityDigest: string;
    placementId: string;
    placementRevision: number;
  }>;
}): void {
  const binding = parseAgentOsHostBudgetConsumptionV1(input.binding);
  const grant = parseAgentOsV1ExecutionGrant(input.grant);
  const instance = parseAgentOsV1ExecutionInstance(input.instance);
  const ceiling = parseAgentOsRunTreeBudgetCeilingV1(input.ceiling);
  const request = parseAgentOsBudgetReservationRequestV1(input.request);
  const receipt = parseAgentOsBudgetReservationReceiptV1(input.receipt);
  const state = parseAgentOsBudgetCurrentStateV1(input.reservationState);
  const parent =
    input.parent === null
      ? null
      : parseAgentOsBudgetReservationReceiptV1(input.parent);
  const preState = parseAgentOsBudgetCurrentStateV1(input.preReservationState);
  assertAgentOsBudgetReservationRelationshipV1({
    ceiling,
    request,
    receipt,
    parent,
    currentState: preState,
  });
  if (grant.kind !== "remote" || grant.leaseBinding.kind !== "remote")
    fail(
      "INVALID_VALUE",
      "Host budget requires a current remote grant and lease",
    );
  const lease = grant.leaseBinding;
  const equal = (actual: unknown, expected: unknown) => {
    if (canonical(actual) !== canonical(expected))
      fail("DRIFT_DETECTED", "Host budget consumption evidence does not match");
  };
  equal(binding.grantId, grant.grantId);
  equal(binding.controlId, grant.issuer);
  equal(binding.grantDigest, createAgentOsHostBudgetGrantDigestV1(grant));
  equal(binding.hostId, grant.hostId);
  equal(binding.hostId, instance.hostId);
  equal(instance.deploymentId, grant.deploymentId);
  equal(binding.instanceId, grant.instanceId);
  equal(binding.instanceId, instance.instanceId);
  equal(binding.instanceGeneration, instance.generation);
  equal(binding.instanceGeneration, lease.generation);
  equal(instance.observedState, "running");
  equal(binding.leaseId, lease.leaseId);
  equal(binding.leaseEpoch, lease.epoch);
  equal(binding.rootRunId, grant.runId);
  equal(binding.rootAttemptId, grant.attemptId);
  equal(binding.definitionDigest, grant.definitionDigest);
  equal(binding.policyDigest, grant.policyDigest);
  equal(binding.capabilityDigest, grant.capabilityDigest);
  equal(binding.budgetTreeRootRunId, ceiling.rootRunId);
  equal(ceiling.tenantId, grant.tenantId);
  equal(ceiling.workloadId, grant.workloadId);
  for (const key of [
    "hostId",
    "storeId",
    "storeGeneration",
    "rootRunId",
    "rootAttemptId",
    "definitionDigest",
    "policyDigest",
    "capabilityDigest",
    "placementId",
    "placementRevision",
  ] as const)
    equal(binding[key], input.consumer[key]);
  if (grant.audience.length !== 1 || grant.audience[0] !== binding.hostId)
    fail("DRIFT_DETECTED", "Host is outside grant audience");
  for (const source of [grant, grant.sessionGrant, lease]) {
    if (
      binding.scope.some((scope) => !source.scope.includes(scope)) ||
      Date.parse(binding.createdAt) < Date.parse(source.notBefore) ||
      Date.parse(binding.expiresAt) > Date.parse(source.expiresAt)
    )
      fail(
        "DRIFT_DETECTED",
        "Host consumption expands source scope or lifetime",
      );
  }
  for (const kind of binding.allowedEffectKinds) {
    if (
      kind === "tool.dispatch"
        ? !binding.scope.includes("tool.execute")
        : !binding.scope.includes("prompt.execute")
    )
      fail("INVALID_VALUE", "Host effect kind has no source operation scope");
  }
  const now = Date.parse(instant(input.now));
  if (
    now < Date.parse(binding.createdAt) ||
    now >= Date.parse(binding.expiresAt)
  )
    fail(
      "DRIFT_DETECTED",
      "Host budget consumption is outside its current window",
    );
  equal(request.subject.kind, "child");
  equal(request.subject.runId, binding.rootRunId);
  equal(request.subject.turnId, null);
  equal(request.subject.attemptId, null);
  equal(request.subject.effectId, null);
  equal(request.effectPermitDigest, null);
  equal(request.kernelFenceDigest, input.admissionKernelFenceDigest);
  equal(receipt.disposition, "reserved");
  equal(binding.reservationId, receipt.reservationId);
  equal(binding.requestDigest, request.requestDigest);
  equal(binding.reservationReceiptDigest, receipt.receiptDigest);
  equal(binding.reservationStateDigest, state.stateDigest);
  equal(state.ceilingId, ceiling.ceilingId);
  equal(state.ceilingDigest, ceiling.ceilingDigest);
  equal(state.ceilingRevision, ceiling.revision);
  equal(state.ownerDisposition, "reserved");
  equal(state.ownerReservationId, receipt.reservationId);
  equal(state.ownerReservationReceiptDigest, receipt.receiptDigest);
  equal(state.balanceRevision, 0);
  equal(state.reservationRevision, receipt.reservationRevision);
  equal(state.reserved, receipt.reserved);
  equal(state.available, receipt.reserved);
  const zero = {
    inputTokens: 0,
    outputTokens: 0,
    toolCalls: 0,
    costUsdMicros: 0,
  };
  equal(state.committedTotal, zero);
  equal(state.releasedTotal, zero);
  equal(state.refundedTotal, zero);
  equal(state.commitStates, []);
  equal(state.latestSettlementReceiptDigest, null);
  if (
    Date.parse(binding.createdAt) < Date.parse(receipt.committedAt) ||
    Date.parse(binding.createdAt) < Date.parse(state.capturedAt)
  )
    fail("DRIFT_DETECTED", "Host claim predates its reservation evidence");
}

function integer(value: unknown, minimum: number): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  )
    fail("INVALID_VALUE", "invalid Host budget revision or generation");
  return value;
}

function strings(value: unknown, maximum: number): string[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length === 0 ||
    value.length > maximum ||
    Object.keys(value).length !== value.length ||
    Object.getOwnPropertySymbols(value).length !== 0
  )
    fail("INVALID_SHAPE", "Host budget list must be a bounded dense array");
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const field = Object.getOwnPropertyDescriptor(value, String(i));
    if (
      !field ||
      !("value" in field) ||
      !field.enumerable ||
      typeof field.value !== "string"
    )
      fail(
        "INVALID_SHAPE",
        "Host budget list must contain only string data fields",
      );
    result.push(field.value);
  }
  return result;
}

function digest(value: unknown): string {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value))
    fail("INVALID_VALUE", "Host budget digest must be canonical SHA-256");
  return value;
}

function instant(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    fail(
      "INVALID_VALUE",
      "Host budget timestamp must be a canonical UTC instant",
    );
  return value;
}

function record(value: unknown): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail("INVALID_SHAPE", "Host budget binding must be a plain object");
  if (Object.getOwnPropertySymbols(value).length !== 0)
    fail("INVALID_SHAPE", "Host budget binding must not contain symbols");
  for (const descriptor of Object.values(
    Object.getOwnPropertyDescriptors(value),
  ))
    if (!descriptor.enumerable || !("value" in descriptor))
      fail(
        "INVALID_SHAPE",
        "Host budget binding must contain only data fields",
      );
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, keys: readonly string[]): void {
  if (
    Object.keys(value).length !== keys.length ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    fail("UNKNOWN_FIELD", "Host budget binding has unknown or missing fields");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const source = record(value);
  return `{${Object.keys(source)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(source[key])}`)
    .join(",")}}`;
}

function contentDigest(value: unknown): string {
  return `sha256:${sha256Hex(canonical(value))}`;
}

function fail(code: AgentOsV1ContractError["code"], message: string): never {
  throw new AgentOsV1ContractError(code, message);
}
