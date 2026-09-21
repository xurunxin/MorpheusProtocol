import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import {
  parseAgentOsWorkerChildAuthorizationInputV1,
  type AgentOsWorkerChildAuthorizationInputV1,
} from "./agent-os-worker-child-authority-v1-contract.js";
import {
  parseAgentOsControlV1AdminReceipt,
  type AgentOsControlV1AdminWorkItemReceipt,
} from "./agent-os-control-v1-admin-contract.js";

/** Private Control operation. The business client cannot supply these Kernel/authority observations. */
export interface AgentOsWorkerTaskBindingInputV1 {
  readonly schemaVersion: "agent-os-worker-task-binding/v1";
  readonly commandId: string;
  readonly child: Readonly<AgentOsWorkerChildAuthorizationInputV1>;
  readonly title: string;
  readonly acceptanceCriteria: readonly string[];
  readonly targetRevision: string;
}

/** Immutable WorkItem evidence, not a new execution authority or task lifecycle. */
export interface AgentOsWorkerTaskBindingReceiptV1 {
  readonly schemaVersion: "agent-os-worker-task-binding/v1";
  readonly commandId: string;
  readonly requestDigest: string;
  readonly ownerRevision: number;
  readonly ownerDigest: string;
  readonly scope: Readonly<{
    tenantId: string;
    workloadId: string;
    hostId: string;
  }>;
  readonly rootReceipt: Readonly<AgentOsControlV1AdminWorkItemReceipt>;
  readonly childReceipt: Readonly<AgentOsControlV1AdminWorkItemReceipt>;
  readonly receiptDigest: string;
}

export function parseAgentOsWorkerTaskBindingInputV1(
  input: unknown,
): Readonly<AgentOsWorkerTaskBindingInputV1> {
  const value = object(input, [
    "schemaVersion",
    "commandId",
    "child",
    "title",
    "acceptanceCriteria",
    "targetRevision",
  ]);
  if (
    value.schemaVersion !== "agent-os-worker-task-binding/v1" ||
    !Array.isArray(value.acceptanceCriteria) ||
    value.acceptanceCriteria.length < 1 ||
    value.acceptanceCriteria.length > 32
  )
    invalid();
  const criteria = value.acceptanceCriteria.map((item) => text(item, 2048));
  if (new Set(criteria).size !== criteria.length) invalid();
  return deepFreeze({
    schemaVersion: value.schemaVersion,
    commandId: id(value.commandId),
    child: parseAgentOsWorkerChildAuthorizationInputV1(value.child),
    title: text(value.title, 512),
    acceptanceCriteria: criteria,
    targetRevision: text(value.targetRevision, 256),
  });
}

export function createAgentOsWorkerTaskBindingInputDigestV1(
  input: unknown,
): string {
  return hash(parseAgentOsWorkerTaskBindingInputV1(input));
}

const receiptKeys = [
  "schemaVersion",
  "commandId",
  "requestDigest",
  "ownerRevision",
  "ownerDigest",
  "scope",
  "rootReceipt",
  "childReceipt",
] as const;
export function createAgentOsWorkerTaskBindingReceiptV1(
  input: unknown,
): Readonly<AgentOsWorkerTaskBindingReceiptV1> {
  const value = object(input, receiptKeys);
  if (
    value.schemaVersion !== "agent-os-worker-task-binding/v1" ||
    typeof value.ownerRevision !== "number" ||
    !Number.isSafeInteger(value.ownerRevision) ||
    value.ownerRevision < 1
  )
    invalid();
  const scope = object(value.scope, ["tenantId", "workloadId", "hostId"]);
  const rootReceipt = workItemReceipt(
    value.rootReceipt,
    "control.work-item.create.receipt",
  );
  const childReceipt = workItemReceipt(
    value.childReceipt,
    "control.work-item.spawn-subtasks.receipt",
  );
  const root = rootReceipt.item;
  const child = childReceipt.items?.[0];
  if (
    !root ||
    !child ||
    rootReceipt.workItemId !== root.workItemId ||
    rootReceipt.items?.length !== 1 ||
    hash(rootReceipt.items[0]) !== hash(root) ||
    rootReceipt.workItemIds?.length !== 1 ||
    rootReceipt.workItemIds[0] !== root.workItemId ||
    root.parentWorkItemId !== undefined ||
    root.rootWorkItemId !== root.workItemId ||
    root.type !== "workflow_run" ||
    root.status !== "pending" ||
    childReceipt.items?.length !== 1 ||
    childReceipt.item !== undefined ||
    childReceipt.workItemIds?.length !== 1 ||
    childReceipt.workItemIds[0] !== child.workItemId ||
    childReceipt.workItemId !== root.workItemId ||
    child.workItemId === root.workItemId ||
    child.parentWorkItemId !== root.workItemId ||
    child.rootWorkItemId !== root.workItemId ||
    child.type !== "subagent_task" ||
    child.status !== "pending" ||
    childReceipt.revision <= rootReceipt.revision ||
    childReceipt.fence < rootReceipt.fence
  )
    invalid();
  const body: Omit<AgentOsWorkerTaskBindingReceiptV1, "receiptDigest"> = {
    schemaVersion: value.schemaVersion,
    commandId: id(value.commandId),
    requestDigest: digest(value.requestDigest),
    ownerRevision: value.ownerRevision,
    ownerDigest: digest(value.ownerDigest),
    scope: {
      tenantId: id(scope.tenantId),
      workloadId: id(scope.workloadId),
      hostId: id(scope.hostId),
    },
    rootReceipt,
    childReceipt,
  };
  return deepFreeze({ ...body, receiptDigest: hash(body) });
}

export function parseAgentOsWorkerTaskBindingReceiptV1(
  input: unknown,
): Readonly<AgentOsWorkerTaskBindingReceiptV1> {
  const value = object(input, [...receiptKeys, "receiptDigest"]);
  const { receiptDigest, ...body } = value;
  const receipt = createAgentOsWorkerTaskBindingReceiptV1(body);
  if (receiptDigest !== receipt.receiptDigest) invalid();
  return receipt;
}

export function assertAgentOsWorkerTaskBindingV1(
  rawInput: unknown,
  rawReceipt: unknown,
): void {
  const input = parseAgentOsWorkerTaskBindingInputV1(rawInput);
  const receipt = parseAgentOsWorkerTaskBindingReceiptV1(rawReceipt);
  const root = receipt.rootReceipt.item!;
  const child = receipt.childReceipt.items![0]!;
  if (
    receipt.commandId !== input.commandId ||
    receipt.requestDigest !== hash(input) ||
    child.title !== input.title ||
    hash(child.acceptanceCriteria) !== hash(input.acceptanceCriteria) ||
    hash(root.input) !== hash({ parentRunId: input.child.parentClaim.runId }) ||
    hash(child.input) !==
      hash({
        parentRunId: input.child.parentClaim.runId,
        childRunId: input.child.runId,
        childAttemptId: input.child.attemptId,
        kernelChildId: input.child.kernelChildId,
        inputDigest: input.child.inputDigest,
        targetRevision: input.targetRevision,
      })
  )
    invalid();
}

function workItemReceipt(
  value: unknown,
  operation:
    | "control.work-item.create.receipt"
    | "control.work-item.spawn-subtasks.receipt",
): AgentOsControlV1AdminWorkItemReceipt {
  const receipt = parseAgentOsControlV1AdminReceipt(value);
  if (
    receipt.operation !== operation ||
    receipt.status !== "accepted" ||
    receipt.code !== "NONE" ||
    receipt.replay === true
  )
    invalid();
  return receipt as AgentOsControlV1AdminWorkItemReceipt;
}
function object(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== [...keys].sort().join("|")
  )
    invalid();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor)) invalid();
  }
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(input);
  } catch {
    invalid();
  }
  if (
    serialized === undefined ||
    new TextEncoder().encode(serialized).length > 1_048_576
  )
    invalid();
  return input as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9._/-]{0,127}$/u.test(value))
    invalid();
  return value;
}
function text(value: unknown, maximum: number): string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    value.includes("\0") ||
    new TextEncoder().encode(value).length > maximum
  )
    invalid();
  return value;
}
function digest(value: unknown): string {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value))
    invalid();
  return value;
}
function hash(value: unknown): string {
  return `sha256:${sha256Hex(canonical(value))}`;
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const result = JSON.stringify(value);
    if (result === undefined) invalid();
    return result;
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}
function invalid(): never {
  throw new Error("INVALID_WORKER_TASK_BINDING");
}
