import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import {
  parseAgentOsV1CanonicalPromptCursor,
  type AgentOsV1CanonicalPromptCursor,
} from "./agent-os-v1-contract.js";

export const AGENT_OS_TASK_HANDLE_V1 = "agent-os-task-handle/v1" as const;
export const AGENT_OS_TASK_HANDLE_MAX_BYTES = 1_048_576;

/** References to existing owners. A handle never grants execution or cancellation authority. */
export interface AgentOsTaskIdentityV1 {
  readonly tenantId: string;
  readonly ownerId: string;
  readonly workItemId: string;
  readonly planTaskId: string | null;
  readonly parentRunId: string;
  readonly parentTurnId: string;
  readonly parentAttemptId: string;
  readonly parentStoreGeneration: number;
  readonly kernelChildId: string;
  readonly childRunId: string;
  readonly childAttemptId: string;
  readonly inputDigest: string;
  readonly definitionDigest: string;
  /** Immutable code/workspace revision selected for this task, not a Control CAS revision. */
  readonly targetRevision: string;
}
export interface AgentOsTaskHandleV1 {
  readonly schemaVersion: typeof AGENT_OS_TASK_HANDLE_V1;
  readonly handleId: string;
  readonly identity: Readonly<AgentOsTaskIdentityV1>;
}
export interface AgentOsTaskArtifactV1 {
  readonly artifactId: string;
  readonly artifactRef: string;
  readonly contentDigest: string;
  readonly bytes: number;
  readonly childRunId: string;
  readonly childAttemptId: string;
  readonly inputDigest: string;
  readonly targetRevision: string;
  readonly effectReceiptDigest: string;
}
export interface AgentOsTaskCheckReceiptV1 {
  readonly receiptId: string;
  readonly checkId: string;
  readonly childRunId: string;
  readonly childAttemptId: string;
  readonly inputDigest: string;
  readonly targetRevision: string;
  readonly artifactDigests: readonly string[];
  /** Safe display text; the owner retains and verifies the actual executed command privately. */
  readonly commandDisplay: string;
  readonly commandDigest: string;
  readonly effectReceiptDigest: string;
  readonly reportDigest: string;
  readonly status: "passed" | "failed" | "unknown" | "skipped";
  readonly exitCode: number | null;
}
type RunStatus =
  | "pending"
  | "running"
  | "cancel_requested"
  | "succeeded"
  | "failed"
  | "cancelled";
type AttemptStatus =
  | "active"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";
export interface AgentOsTaskViewV1 {
  readonly handle: Readonly<AgentOsTaskHandleV1>;
  readonly revision: number;
  readonly execution: Readonly<{
    runStatus: RunStatus;
    attemptStatus: AttemptStatus | null;
    runRevision: number;
    resultDigest: string | null;
  }>;
  readonly parentChild: Readonly<{
    status: "pending" | "succeeded" | "failed" | "cancelled";
    resultDigest: string | null;
    wakeEmitted: boolean;
  }>;
  /** An audit-only attempt does not mutate parentChild.status or imply a wake. */
  readonly settlementAttempts: readonly Readonly<{
    commandId: string;
    disposition: "applied" | "audit_only";
    mutationReceiptDigest: string;
  }>[];
  readonly delivery: Readonly<{
    mode: "foreground" | "background";
    recipientId: string;
    status: "pending" | "acknowledged" | "failed";
    acknowledgmentDigest: string | null;
  }>;
  readonly validation: Readonly<{
    status: "unverified" | "passed" | "failed" | "stale" | "incomplete";
    policyDigest: string;
    requiredCheckIds: readonly string[];
    requiredArtifactIds: readonly string[];
  }>;
  readonly outputCursor: Readonly<AgentOsV1CanonicalPromptCursor> | null;
  readonly artifacts: readonly Readonly<AgentOsTaskArtifactV1>[];
  readonly checks: readonly Readonly<AgentOsTaskCheckReceiptV1>[];
}

export function createAgentOsTaskHandleV1(
  input: unknown,
): Readonly<AgentOsTaskHandleV1> {
  const identity = parseIdentity(input);
  const handleId = `task.${sha256Hex(JSON.stringify({ schemaVersion: AGENT_OS_TASK_HANDLE_V1, identity }))}`;
  return deepFreeze({
    schemaVersion: AGENT_OS_TASK_HANDLE_V1,
    handleId,
    identity,
  });
}
export function parseAgentOsTaskHandleV1(
  input: unknown,
): Readonly<AgentOsTaskHandleV1> {
  const value = object(input, ["schemaVersion", "handleId", "identity"]);
  const handle = createAgentOsTaskHandleV1(value.identity);
  if (
    value.schemaVersion !== handle.schemaVersion ||
    value.handleId !== handle.handleId
  )
    invalid();
  return handle;
}
function parseIdentity(input: unknown): AgentOsTaskIdentityV1 {
  const value = object(input, [
    "tenantId",
    "ownerId",
    "workItemId",
    "planTaskId",
    "parentRunId",
    "parentTurnId",
    "parentAttemptId",
    "parentStoreGeneration",
    "kernelChildId",
    "childRunId",
    "childAttemptId",
    "inputDigest",
    "definitionDigest",
    "targetRevision",
  ]);
  const identity = {
    tenantId: id(value.tenantId),
    ownerId: id(value.ownerId),
    workItemId: id(value.workItemId),
    planTaskId: value.planTaskId === null ? null : id(value.planTaskId),
    parentRunId: id(value.parentRunId),
    parentTurnId: id(value.parentTurnId),
    parentAttemptId: id(value.parentAttemptId),
    parentStoreGeneration: integer(value.parentStoreGeneration, 1),
    kernelChildId: id(value.kernelChildId),
    childRunId: id(value.childRunId),
    childAttemptId: id(value.childAttemptId),
    inputDigest: digest(value.inputDigest),
    definitionDigest: digest(value.definitionDigest),
    targetRevision: id(value.targetRevision),
  };
  if (identity.parentRunId === identity.childRunId) invalid();
  return identity;
}
export function parseAgentOsTaskArtifactV1(
  input: unknown,
): Readonly<AgentOsTaskArtifactV1> {
  const value = object(input, [
    "artifactId",
    "artifactRef",
    "contentDigest",
    "bytes",
    "childRunId",
    "childAttemptId",
    "inputDigest",
    "targetRevision",
    "effectReceiptDigest",
  ]);
  const artifactRef = id(value.artifactRef);
  if (!/^artifact:[a-zA-Z0-9._-]+$/u.test(artifactRef)) invalid();
  return deepFreeze({
    artifactId: id(value.artifactId),
    artifactRef,
    contentDigest: digest(value.contentDigest),
    bytes: integer(value.bytes),
    childRunId: id(value.childRunId),
    childAttemptId: id(value.childAttemptId),
    inputDigest: digest(value.inputDigest),
    targetRevision: id(value.targetRevision),
    effectReceiptDigest: digest(value.effectReceiptDigest),
  });
}
export function parseAgentOsTaskCheckReceiptV1(
  input: unknown,
): Readonly<AgentOsTaskCheckReceiptV1> {
  const value = object(input, [
    "receiptId",
    "checkId",
    "childRunId",
    "childAttemptId",
    "inputDigest",
    "targetRevision",
    "artifactDigests",
    "commandDisplay",
    "commandDigest",
    "effectReceiptDigest",
    "reportDigest",
    "status",
    "exitCode",
  ]);
  const status = choice(value.status, [
    "passed",
    "failed",
    "unknown",
    "skipped",
  ] as const);
  const exitCode =
    value.exitCode === null
      ? null
      : integer(value.exitCode, -2147483648, 4294967295);
  if (
    (status === "passed" && exitCode !== 0) ||
    (status === "failed" && (exitCode === null || exitCode === 0)) ||
    ((status === "unknown" || status === "skipped") && exitCode !== null)
  )
    invalid();
  return deepFreeze({
    receiptId: id(value.receiptId),
    checkId: id(value.checkId),
    childRunId: id(value.childRunId),
    childAttemptId: id(value.childAttemptId),
    inputDigest: digest(value.inputDigest),
    targetRevision: id(value.targetRevision),
    artifactDigests: unique(value.artifactDigests, digest),
    commandDisplay: text(value.commandDisplay, 1024),
    commandDigest: digest(value.commandDigest),
    effectReceiptDigest: digest(value.effectReceiptDigest),
    reportDigest: digest(value.reportDigest),
    status,
    exitCode,
  });
}
export function parseAgentOsTaskViewV1(
  input: unknown,
): Readonly<AgentOsTaskViewV1> {
  bounded(input);
  const value = object(input, [
    "handle",
    "revision",
    "execution",
    "parentChild",
    "settlementAttempts",
    "delivery",
    "validation",
    "outputCursor",
    "artifacts",
    "checks",
  ]);
  const handle = parseAgentOsTaskHandleV1(value.handle);
  const execution = object(value.execution, [
    "runStatus",
    "attemptStatus",
    "runRevision",
    "resultDigest",
  ]);
  const parent = object(value.parentChild, [
    "status",
    "resultDigest",
    "wakeEmitted",
  ]);
  const delivery = object(value.delivery, [
    "mode",
    "recipientId",
    "status",
    "acknowledgmentDigest",
  ]);
  const validation = object(value.validation, [
    "status",
    "policyDigest",
    "requiredCheckIds",
    "requiredArtifactIds",
  ]);
  const view: AgentOsTaskViewV1 = {
    handle,
    revision: integer(value.revision),
    execution: {
      runStatus: choice(execution.runStatus, [
        "pending",
        "running",
        "cancel_requested",
        "succeeded",
        "failed",
        "cancelled",
      ] as const),
      attemptStatus:
        execution.attemptStatus === null
          ? null
          : choice(execution.attemptStatus, [
              "active",
              "succeeded",
              "failed",
              "cancelled",
              "unknown",
            ] as const),
      runRevision: integer(execution.runRevision),
      resultDigest: nullableDigest(execution.resultDigest),
    },
    parentChild: {
      status: choice(parent.status, [
        "pending",
        "succeeded",
        "failed",
        "cancelled",
      ] as const),
      resultDigest: nullableDigest(parent.resultDigest),
      wakeEmitted: bool(parent.wakeEmitted),
    },
    settlementAttempts: array(value.settlementAttempts).map((item) => {
      const row = object(item, [
        "commandId",
        "disposition",
        "mutationReceiptDigest",
      ]);
      return {
        commandId: id(row.commandId),
        disposition: choice(row.disposition, [
          "applied",
          "audit_only",
        ] as const),
        mutationReceiptDigest: digest(row.mutationReceiptDigest),
      };
    }),
    delivery: {
      mode: choice(delivery.mode, ["foreground", "background"] as const),
      recipientId: id(delivery.recipientId),
      status: choice(delivery.status, [
        "pending",
        "acknowledged",
        "failed",
      ] as const),
      acknowledgmentDigest: nullableDigest(delivery.acknowledgmentDigest),
    },
    validation: {
      status: choice(validation.status, [
        "unverified",
        "passed",
        "failed",
        "stale",
        "incomplete",
      ] as const),
      policyDigest: digest(validation.policyDigest),
      requiredCheckIds: unique(validation.requiredCheckIds, id),
      requiredArtifactIds: unique(validation.requiredArtifactIds, id),
    },
    outputCursor:
      value.outputCursor === null
        ? null
        : parseAgentOsV1CanonicalPromptCursor(value.outputCursor),
    artifacts: array(value.artifacts).map(parseAgentOsTaskArtifactV1),
    checks: array(value.checks).map(parseAgentOsTaskCheckReceiptV1),
  };
  distinct(view.artifacts.map((item) => item.artifactId));
  distinct(view.checks.map((item) => item.receiptId));
  distinct(view.settlementAttempts.map((item) => item.commandId));
  if (
    view.outputCursor !== null &&
    view.outputCursor.runId !== handle.identity.childRunId
  )
    invalid();
  if (
    (view.delivery.status === "acknowledged") !==
    (view.delivery.acknowledgmentDigest !== null)
  )
    invalid();
  if (
    view.parentChild.status === "pending" &&
    (view.parentChild.resultDigest !== null || view.parentChild.wakeEmitted)
  )
    invalid();
  const applied = view.settlementAttempts.filter(
    (item) => item.disposition === "applied",
  );
  if (
    view.parentChild.status === "pending"
      ? applied.length !== 0
      : applied.length !== 1 ||
        view.parentChild.resultDigest === null ||
        !view.parentChild.wakeEmitted
  )
    invalid();
  for (const item of [...view.artifacts, ...view.checks]) {
    if (
      item.childRunId !== handle.identity.childRunId ||
      item.childAttemptId !== handle.identity.childAttemptId
    )
      invalid();
  }
  if (view.validation.status === "passed") {
    if (
      view.execution.runStatus !== "succeeded" ||
      view.execution.attemptStatus !== "succeeded" ||
      view.validation.requiredCheckIds.length === 0
    )
      invalid();
    const current = (item: { inputDigest: string; targetRevision: string }) =>
      item.inputDigest === handle.identity.inputDigest &&
      item.targetRevision === handle.identity.targetRevision;
    for (const artifactId of view.validation.requiredArtifactIds) {
      if (
        !view.artifacts.some(
          (item) => item.artifactId === artifactId && current(item),
        )
      )
        invalid();
      const artifact = view.artifacts.find(
        (item) => item.artifactId === artifactId,
      );
      if (
        artifact === undefined ||
        !view.validation.requiredCheckIds.some((checkId) => {
          const check = view.checks.findLast(
            (item) => item.checkId === checkId,
          );
          return (
            check !== undefined &&
            check.status === "passed" &&
            current(check) &&
            check.artifactDigests.includes(artifact.contentDigest)
          );
        })
      )
        invalid();
    }
    for (const checkId of view.validation.requiredCheckIds) {
      const receipt = view.checks.findLast((item) => item.checkId === checkId);
      if (
        receipt === undefined ||
        receipt.status !== "passed" ||
        !current(receipt) ||
        receipt.artifactDigests.some(
          (hash) =>
            !view.artifacts.some(
              (artifact) =>
                artifact.contentDigest === hash && current(artifact),
            ),
        )
      )
        invalid();
    }
  }
  return deepFreeze(view);
}

/** Consistency only. Owners must still authenticate and resolve every receipt against durable facts. */
export function assertAgentOsTaskViewSuccessorV1(
  previousInput: unknown,
  nextInput: unknown,
): void {
  const previous = parseAgentOsTaskViewV1(previousInput);
  const next = parseAgentOsTaskViewV1(nextInput);
  if (
    previous.handle.handleId !== next.handle.handleId ||
    next.revision < previous.revision ||
    next.execution.runRevision < previous.execution.runRevision
  )
    invalid();
  if (
    next.revision === previous.revision &&
    JSON.stringify(previous) !== JSON.stringify(next)
  )
    invalid();
  if (
    ["succeeded", "failed", "cancelled"].includes(
      previous.execution.runStatus,
    ) &&
    (previous.execution.runStatus !== next.execution.runStatus ||
      previous.execution.attemptStatus !== next.execution.attemptStatus ||
      previous.execution.resultDigest !== next.execution.resultDigest)
  )
    invalid();
  if (
    previous.delivery.status === "acknowledged" &&
    (next.delivery.status !== "acknowledged" ||
      next.delivery.recipientId !== previous.delivery.recipientId ||
      next.delivery.acknowledgmentDigest !==
        previous.delivery.acknowledgmentDigest)
  )
    invalid();
  if (
    previous.parentChild.status !== "pending" &&
    JSON.stringify(previous.parentChild) !== JSON.stringify(next.parentChild)
  )
    invalid();
  if (
    previous.execution.runStatus !== "pending" &&
    next.execution.runStatus === "pending"
  )
    invalid();
  if (
    previous.execution.runStatus === "cancel_requested" &&
    next.execution.runStatus === "running"
  )
    invalid();
  if (
    previous.execution.attemptStatus !== null &&
    previous.execution.attemptStatus !== "active" &&
    next.execution.attemptStatus !== previous.execution.attemptStatus
  )
    invalid();
  if (previous.outputCursor !== null) {
    if (next.outputCursor === null) invalid();
    // A full view may carry a replacement epoch; canonical output reads then use
    // their existing snapshot-required semantics. Within one epoch cursors never regress.
    if (
      previous.outputCursor.streamEpoch === next.outputCursor.streamEpoch &&
      (next.outputCursor.sequence < previous.outputCursor.sequence ||
        next.outputCursor.watermark < previous.outputCursor.watermark)
    )
      invalid();
  }
  const retains = <T>(
    old: readonly T[],
    current: readonly T[],
    key: (item: T) => string,
  ) => {
    for (const [index, item] of old.entries())
      if (
        current[index] === undefined ||
        key(current[index]) !== key(item) ||
        JSON.stringify(current[index]) !== JSON.stringify(item)
      )
        invalid();
  };
  retains(previous.artifacts, next.artifacts, (item) => item.artifactId);
  retains(previous.checks, next.checks, (item) => item.receiptId);
  retains(
    previous.settlementAttempts,
    next.settlementAttempts,
    (item) => item.commandId,
  );
}

/** Business intent only. Current cancellation policy and grants are resolved by the owner. */
export type AgentOsTaskRequestV1 = Readonly<{
  schemaVersion: typeof AGENT_OS_TASK_HANDLE_V1;
  requestId: string;
  handleId: string;
}> &
  (
    | { readonly operation: "task.observe" }
    | {
        readonly operation: "task.set-delivery";
        readonly commandId: string;
        readonly expectedRevision: number;
        readonly mode: "foreground" | "background";
      }
    | {
        readonly operation: "task.cancel";
        readonly commandId: string;
        readonly expectedRevision: number;
        readonly reason: string;
        readonly scope: "task" | "task-and-descendants";
      }
  );
export type AgentOsTaskResponseV1 = Readonly<{
  schemaVersion: typeof AGENT_OS_TASK_HANDLE_V1;
  requestId: string;
  requestDigest: string;
  operation: AgentOsTaskRequestV1["operation"];
}> &
  (
    | {
        readonly status: "accepted";
        readonly view: Readonly<AgentOsTaskViewV1>;
      }
    | {
        readonly status: "rejected";
        readonly code:
          | "UNAVAILABLE"
          | "NOT_FOUND"
          | "FORBIDDEN"
          | "REVISION_CONFLICT"
          | "IDEMPOTENCY_CONFLICT"
          | "BUSY";
      }
  );

export function parseAgentOsTaskRequestV1(
  input: unknown,
): AgentOsTaskRequestV1 {
  bounded(input);
  if (input === null || typeof input !== "object" || Array.isArray(input))
    invalid();
  const operation = choice((input as Record<string, unknown>).operation, [
    "task.observe",
    "task.set-delivery",
    "task.cancel",
  ] as const);
  const keys = ["schemaVersion", "requestId", "handleId", "operation"];
  const value = object(
    input,
    operation === "task.observe"
      ? keys
      : [
          ...keys,
          "commandId",
          "expectedRevision",
          ...(operation === "task.cancel" ? ["reason", "scope"] : ["mode"]),
        ],
  );
  if (value.schemaVersion !== AGENT_OS_TASK_HANDLE_V1) invalid();
  const handleId = id(value.handleId);
  if (!/^task\.[a-f0-9]{64}$/u.test(handleId)) invalid();
  const common = {
    schemaVersion: AGENT_OS_TASK_HANDLE_V1,
    requestId: id(value.requestId),
    handleId,
  };
  if (operation === "task.observe") return deepFreeze({ ...common, operation });
  const command = {
    commandId: id(value.commandId),
    expectedRevision: integer(value.expectedRevision),
  };
  if (operation === "task.set-delivery")
    return deepFreeze({
      ...common,
      operation,
      ...command,
      mode: choice(value.mode, ["foreground", "background"] as const),
    });
  return deepFreeze({
    ...common,
    operation,
    ...command,
    reason: text(value.reason, 1024),
    scope: choice(value.scope, ["task", "task-and-descendants"] as const),
  });
}
export function parseAgentOsTaskResponseV1(
  input: unknown,
): AgentOsTaskResponseV1 {
  bounded(input);
  if (input === null || typeof input !== "object" || Array.isArray(input))
    invalid();
  const status = choice((input as Record<string, unknown>).status, [
    "accepted",
    "rejected",
  ] as const);
  const value = object(input, [
    "schemaVersion",
    "requestId",
    "requestDigest",
    "operation",
    "status",
    status === "accepted" ? "view" : "code",
  ]);
  if (value.schemaVersion !== AGENT_OS_TASK_HANDLE_V1) invalid();
  const common = {
    schemaVersion: AGENT_OS_TASK_HANDLE_V1,
    requestId: id(value.requestId),
    requestDigest: digest(value.requestDigest),
    operation: choice(value.operation, [
      "task.observe",
      "task.set-delivery",
      "task.cancel",
    ] as const),
  };
  return status === "accepted"
    ? deepFreeze({
        ...common,
        status,
        view: parseAgentOsTaskViewV1(value.view),
      })
    : deepFreeze({
        ...common,
        status,
        code: choice(value.code, [
          "UNAVAILABLE",
          "NOT_FOUND",
          "FORBIDDEN",
          "REVISION_CONFLICT",
          "IDEMPOTENCY_CONFLICT",
          "BUSY",
        ] as const),
      });
}
export function encodeAgentOsTaskRequestV1(input: unknown): string {
  return JSON.stringify(parseAgentOsTaskRequestV1(input));
}
export function encodeAgentOsTaskResponseV1(input: unknown): string {
  return JSON.stringify(parseAgentOsTaskResponseV1(input));
}
export function createAgentOsTaskRequestDigestV1(input: unknown): string {
  return `sha256:${sha256Hex(encodeAgentOsTaskRequestV1(input))}`;
}
/** Owner persists command identity before effects; transport requestId is excluded. */
export function createAgentOsTaskCommandDigestV1(input: unknown): string {
  const request = parseAgentOsTaskRequestV1(input);
  if (request.operation === "task.observe") invalid();
  const { requestId: _requestId, ...command } = request;
  return `sha256:${sha256Hex(JSON.stringify(command))}`;
}
export function assertAgentOsTaskResponseBindingV1(
  requestInput: unknown,
  responseInput: unknown,
): void {
  const request = parseAgentOsTaskRequestV1(requestInput);
  const response = parseAgentOsTaskResponseV1(responseInput);
  if (
    request.requestId !== response.requestId ||
    request.operation !== response.operation ||
    response.requestDigest !== createAgentOsTaskRequestDigestV1(request)
  )
    invalid();
  if (response.status === "accepted") {
    if (response.view.handle.handleId !== request.handleId) invalid();
    if (
      request.operation === "task.set-delivery" &&
      response.view.delivery.mode !== request.mode
    )
      invalid();
    if (
      request.operation !== "task.observe" &&
      response.view.revision < request.expectedRevision
    )
      invalid();
    // An accepted cancel is acknowledgment of intent, never proof of terminal cancellation.
  }
}
export function decodeAgentOsTaskRequestV1(
  source: string | Uint8Array,
): AgentOsTaskRequestV1 {
  return parseAgentOsTaskRequestV1(decodeTask(source));
}
export function decodeAgentOsTaskResponseV1(
  source: string | Uint8Array,
): AgentOsTaskResponseV1 {
  return parseAgentOsTaskResponseV1(decodeTask(source));
}
function decodeTask(source: string | Uint8Array): unknown {
  if (typeof source !== "string" && !(source instanceof Uint8Array)) invalid();
  if (
    (typeof source === "string"
      ? new TextEncoder().encode(source).length
      : source.byteLength) > AGENT_OS_TASK_HANDLE_MAX_BYTES
  )
    invalid();
  try {
    return JSON.parse(
      typeof source === "string"
        ? source
        : new TextDecoder("utf-8", { fatal: true }).decode(source),
    );
  } catch {
    return invalid();
  }
}

function object(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    invalid();
  const value = input as Record<string, unknown>;
  if (Object.keys(value).sort().join("|") !== [...keys].sort().join("|"))
    invalid();
  return value;
}
function id(input: unknown): string {
  if (
    typeof input !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,255}$/u.test(input)
  )
    invalid();
  return input;
}
function digest(input: unknown): string {
  if (typeof input !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(input))
    invalid();
  return input;
}
function nullableDigest(input: unknown): string | null {
  return input === null ? null : digest(input);
}
function integer(
  input: unknown,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < minimum ||
    input > maximum
  )
    invalid();
  return input;
}
function bool(input: unknown): boolean {
  if (typeof input !== "boolean") invalid();
  return input;
}
function text(input: unknown, bytes: number): string {
  if (
    typeof input !== "string" ||
    input.trim().length === 0 ||
    new TextEncoder().encode(input).length > bytes
  )
    invalid();
  return input;
}
function array(input: unknown): readonly unknown[] {
  if (!Array.isArray(input) || input.length > 128) invalid();
  return input;
}
function distinct(values: readonly string[]) {
  if (new Set(values).size !== values.length) invalid();
}
function unique(
  input: unknown,
  parse: (value: unknown) => string,
): readonly string[] {
  const values = array(input).map(parse);
  distinct(values);
  return values;
}
function choice<T extends string>(input: unknown, choices: readonly T[]): T {
  for (const value of choices) if (input === value) return value;
  return invalid();
}
function bounded(input: unknown) {
  try {
    const value = JSON.stringify(input);
    if (
      value === undefined ||
      new TextEncoder().encode(value).length > AGENT_OS_TASK_HANDLE_MAX_BYTES
    )
      invalid();
  } catch {
    invalid();
  }
}
function invalid(): never {
  throw new Error("INVALID_TASK_HANDLE_CONTRACT");
}
