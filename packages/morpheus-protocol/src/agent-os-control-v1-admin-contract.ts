import { deepFreeze, sha256Hex } from "./contract-primitives.js";

/** Kept as a literal here to avoid a runtime cycle with the v1 aggregator. */
const AGENT_OS_CONTROL_V1_SCHEMA_VERSION = "agent-os-control/v1" as const;

/**
 * Control operations used by the built-in Admin agent.  This is kept in a
 * separate module so the original v1 families remain byte-for-byte stable;
 * both modules use the same `agent-os-control/v1` wire namespace.
 */
export const AGENT_OS_CONTROL_V1_ADMIN_CAPABILITIES = Object.freeze([
  "work-item",
  "task-plan",
  "message",
  "schedule",
  "human-control",
] as const);
export type AgentOsControlV1AdminCapability =
  (typeof AGENT_OS_CONTROL_V1_ADMIN_CAPABILITIES)[number];

export const AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX = deepFreeze([
  {
    capability: "work-item",
    request: "control.work-item.create",
    receipt: "control.work-item.create.receipt",
  },
  {
    capability: "work-item",
    request: "control.work-item.update",
    receipt: "control.work-item.update.receipt",
  },
  {
    capability: "work-item",
    request: "control.work-item.list",
    receipt: "control.work-item.list.receipt",
  },
  {
    capability: "work-item",
    request: "control.work-item.block",
    receipt: "control.work-item.block.receipt",
  },
  {
    capability: "work-item",
    request: "control.work-item.complete",
    receipt: "control.work-item.complete.receipt",
  },
  {
    capability: "work-item",
    request: "control.work-item.fail",
    receipt: "control.work-item.fail.receipt",
  },
  {
    capability: "work-item",
    request: "control.work-item.spawn-subtasks",
    receipt: "control.work-item.spawn-subtasks.receipt",
  },
  {
    capability: "task-plan",
    request: "control.task-plan.draft",
    receipt: "control.task-plan.draft.receipt",
  },
  {
    capability: "task-plan",
    request: "control.task-plan.accept",
    receipt: "control.task-plan.accept.receipt",
  },
  {
    capability: "task-plan",
    request: "control.task-plan.reject",
    receipt: "control.task-plan.reject.receipt",
  },
  {
    capability: "message",
    request: "control.message.send",
    receipt: "control.message.send.receipt",
  },
  {
    capability: "message",
    request: "control.message.list",
    receipt: "control.message.list.receipt",
  },
  {
    capability: "schedule",
    request: "control.schedule.create",
    receipt: "control.schedule.create.receipt",
  },
  {
    capability: "schedule",
    request: "control.schedule.list",
    receipt: "control.schedule.list.receipt",
  },
  {
    capability: "schedule",
    request: "control.schedule.cancel",
    receipt: "control.schedule.cancel.receipt",
  },
  {
    capability: "human-control" as const,
    request: "control.human-control.command" as const,
    receipt: "control.human-control.command.receipt" as const,
  },
] as const);

export type AgentOsControlV1AdminRequestOperation =
  (typeof AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX)[number]["request"];
export type AgentOsControlV1AdminReceiptOperation =
  (typeof AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX)[number]["receipt"];
export const AGENT_OS_CONTROL_V1_ADMIN_REQUEST_OPERATIONS = Object.freeze(
  AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX.map((entry) => entry.request),
);
export const AGENT_OS_CONTROL_V1_ADMIN_RECEIPT_OPERATIONS = Object.freeze(
  AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX.map((entry) => entry.receipt),
);

export const AGENT_OS_CONTROL_V1_ADMIN_LIMITS = Object.freeze({
  maxItems: 256,
  maxPlanTasks: 64,
  maxMessages: 256,
  maxSchedules: 128,
  maxStringBytes: 65_536,
  maxIdentifierBytes: 128,
  maxJsonDepth: 16,
  maxJsonNodes: 8_192,
} as const);

export type AgentOsControlV1AdminPublicValue =
  | null
  | boolean
  | number
  | string
  | readonly AgentOsControlV1AdminPublicValue[]
  | { readonly [key: string]: AgentOsControlV1AdminPublicValue };

export type AgentOsControlV1AdminWorkItemType =
  | "prompt"
  | "workflow_run"
  | "workflow_node"
  | "subagent_task"
  | "instruction_task"
  | "manual";
export type AgentOsControlV1AdminWorkItemStatus =
  | "pending"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";
export type AgentOsControlV1AdminMutableTaskStatus = "pending" | "running";

type AdminRequestBase<Operation extends AgentOsControlV1AdminRequestOperation> =
  Readonly<{
    schemaVersion: typeof AGENT_OS_CONTROL_V1_SCHEMA_VERSION;
    operation: Operation;
    requestId: string;
    correlationId: string;
    tenantId: string;
    workloadId: string;
    hostId: string;
    idempotencyKey: string;
    expectedRevision: number;
    expectedFence: number;
  }>;

type AdminReceiptBase<
  Operation extends AgentOsControlV1AdminReceiptOperation,
  Code extends string = string,
> = Readonly<{
  schemaVersion: typeof AGENT_OS_CONTROL_V1_SCHEMA_VERSION;
  operation: Operation;
  requestId: string;
  correlationId: string;
  status: "accepted" | "rejected";
  code: Code;
  revision: number;
  fence: number;
  replay?: boolean;
}>;

export type AgentOsControlV1AdminWorkItemPayload = Readonly<{
  title: string;
  acceptanceCriteria: readonly string[];
  description?: string;
  type?: AgentOsControlV1AdminWorkItemType;
  priority?: number;
  input?: Readonly<Record<string, AgentOsControlV1AdminPublicValue>>;
  ownerInstanceId?: string;
  sessionId?: string;
  taskGraph?: AgentOsControlV1AdminPublicValue;
}>;
export type AgentOsControlV1AdminWorkItemSummary =
  AgentOsControlV1AdminWorkItemPayload &
    Readonly<{
      workItemId: string;
      status: AgentOsControlV1AdminWorkItemStatus;
      parentWorkItemId?: string;
      rootWorkItemId?: string;
      createdAt?: string;
      updatedAt?: string;
    }>;

export type AgentOsControlV1AdminWorkItemCreateRequest =
  AdminRequestBase<"control.work-item.create"> &
    AgentOsControlV1AdminWorkItemPayload &
    Readonly<{ parentWorkItemId?: string; rootWorkItemId?: string }>;
export type AgentOsControlV1AdminWorkItemUpdateRequest =
  AdminRequestBase<"control.work-item.update"> &
    Readonly<{
      workItemId: string;
      title?: string;
      description?: string;
      acceptanceCriteria?: readonly string[];
      priority?: number;
      input?: Readonly<Record<string, AgentOsControlV1AdminPublicValue>>;
      taskGraph?: AgentOsControlV1AdminPublicValue;
      status?: AgentOsControlV1AdminMutableTaskStatus;
      unblockStatus?: AgentOsControlV1AdminMutableTaskStatus;
    }>;
export type AgentOsControlV1AdminWorkItemListRequest =
  AdminRequestBase<"control.work-item.list"> &
    Readonly<{
      status?: AgentOsControlV1AdminWorkItemStatus;
      type?: AgentOsControlV1AdminWorkItemType;
      rootWorkItemId?: string;
      parentWorkItemId?: string;
      ownerInstanceId?: string;
      limit?: number;
    }>;
export type AgentOsControlV1AdminWorkItemBlockRequest =
  AdminRequestBase<"control.work-item.block"> &
    Readonly<{ workItemId: string; blockReason: string }>;
export type AgentOsControlV1AdminWorkItemCompleteRequest =
  AdminRequestBase<"control.work-item.complete"> &
    Readonly<{ workItemId: string; result?: AgentOsControlV1AdminPublicValue }>;
export type AgentOsControlV1AdminWorkItemFailRequest =
  AdminRequestBase<"control.work-item.fail"> &
    Readonly<{ workItemId: string; error: string }>;
export type AgentOsControlV1AdminWorkItemSpawnRequest =
  AdminRequestBase<"control.work-item.spawn-subtasks"> &
    Readonly<{
      parentWorkItemId: string;
      subtasks: readonly AgentOsControlV1AdminWorkItemPayload[];
    }>;
export type AgentOsControlV1AdminWorkItemRequest =
  | AgentOsControlV1AdminWorkItemCreateRequest
  | AgentOsControlV1AdminWorkItemUpdateRequest
  | AgentOsControlV1AdminWorkItemListRequest
  | AgentOsControlV1AdminWorkItemBlockRequest
  | AgentOsControlV1AdminWorkItemCompleteRequest
  | AgentOsControlV1AdminWorkItemFailRequest
  | AgentOsControlV1AdminWorkItemSpawnRequest;

export type AgentOsControlV1AdminTaskPlanTask =
  AgentOsControlV1AdminWorkItemPayload &
    Readonly<{
      planTaskId: string;
      dependsOn: readonly string[];
      scheduleHint?: AgentOsControlV1AdminPublicValue;
    }>;
export type AgentOsControlV1AdminTaskPlanDraftRequest =
  AdminRequestBase<"control.task-plan.draft"> &
    Readonly<{
      goal: string;
      tasks?: readonly AgentOsControlV1AdminTaskPlanTask[];
    }>;
export type AgentOsControlV1AdminTaskPlanAcceptRequest =
  AdminRequestBase<"control.task-plan.accept"> & Readonly<{ planId: string }>;
export type AgentOsControlV1AdminTaskPlanRejectRequest =
  AdminRequestBase<"control.task-plan.reject"> &
    Readonly<{ planId?: string; reason: string }>;
export type AgentOsControlV1AdminTaskPlanRequest =
  | AgentOsControlV1AdminTaskPlanDraftRequest
  | AgentOsControlV1AdminTaskPlanAcceptRequest
  | AgentOsControlV1AdminTaskPlanRejectRequest;

export type AgentOsControlV1AdminMessageReceiver = Readonly<
  { type: "agent"; agentId: string } | { type: "group"; groupId: string }
>;
export type AgentOsControlV1AdminMessageSummary = Readonly<{
  messageId: string;
  groupId: string;
  messageType: string;
  receiver?: AgentOsControlV1AdminMessageReceiver;
  workItemId?: string;
  parentWorkItemId?: string;
  instructionId?: string;
  comment?: string;
  data?: Readonly<Record<string, AgentOsControlV1AdminPublicValue>>;
  createdAt?: string;
}>;
export type AgentOsControlV1AdminMessageSendRequest =
  AdminRequestBase<"control.message.send"> &
    Readonly<{
      messageId?: string;
      groupId: string;
      messageType: string;
      receiver?: AgentOsControlV1AdminMessageReceiver;
      workItemId?: string;
      parentWorkItemId?: string;
      instructionId?: string;
      comment?: string;
      data?: Readonly<Record<string, AgentOsControlV1AdminPublicValue>>;
    }>;
export type AgentOsControlV1AdminMessageListRequest =
  AdminRequestBase<"control.message.list"> &
    Readonly<{
      groupId?: string;
      workItemId?: string;
      instructionId?: string;
      limit?: number;
      cursor?: string;
    }>;
export type AgentOsControlV1AdminMessageRequest =
  | AgentOsControlV1AdminMessageSendRequest
  | AgentOsControlV1AdminMessageListRequest;

export type AgentOsControlV1AdminPlanningSchedule = Readonly<
  | { type: "daily"; hour: number; minute: number }
  | { type: "weekly"; weekday: number; hour: number; minute: number }
>;
export type AgentOsControlV1AdminScheduleSummary = Readonly<{
  scheduleId: string;
  kind: "follow_up" | "task_review";
  schedule: AgentOsControlV1AdminPlanningSchedule;
  prompt?: string;
  workItemId?: string;
  sessionId?: string;
  createdAt?: string;
}>;
export type AgentOsControlV1AdminScheduleCreateRequest =
  AdminRequestBase<"control.schedule.create"> &
    Readonly<{
      scheduleId?: string;
      kind: "follow_up" | "task_review";
      schedule: AgentOsControlV1AdminPlanningSchedule;
      prompt?: string;
      workItemId?: string;
      sessionId?: string;
    }>;
export type AgentOsControlV1AdminScheduleListRequest =
  AdminRequestBase<"control.schedule.list"> &
    Readonly<{ sessionId?: string; limit?: number; cursor?: string }>;
export type AgentOsControlV1AdminScheduleCancelRequest =
  AdminRequestBase<"control.schedule.cancel"> &
    Readonly<{ scheduleId: string; reason?: string }>;
export type AgentOsControlV1AdminScheduleRequest =
  | AgentOsControlV1AdminScheduleCreateRequest
  | AgentOsControlV1AdminScheduleListRequest
  | AgentOsControlV1AdminScheduleCancelRequest;

export type AgentOsControlV1AdminHumanControlAction =
  | "pause"
  | "resume"
  | "approve"
  | "reject"
  | "request_changes"
  | "reassign"
  | "handoff"
  | "retry"
  | "cancel"
  | "recovery-resolved";
export type AgentOsControlV1AdminHumanControlCommand = Readonly<{
  commandId: string;
  targetId: string;
  action: AgentOsControlV1AdminHumanControlAction;
  reason?: string;
  expiresAt?: string;
  assigneeId?: string;
  payload?: AgentOsControlV1AdminPublicValue;
}>;
export type AgentOsControlV1AdminHumanControlCommandRequest =
  AdminRequestBase<"control.human-control.command"> &
    Readonly<{
      command: AgentOsControlV1AdminHumanControlCommand;
      targetTenantId?: string;
    }>;

export type AgentOsControlV1AdminRequest =
  | AgentOsControlV1AdminWorkItemRequest
  | AgentOsControlV1AdminTaskPlanRequest
  | AgentOsControlV1AdminMessageRequest
  | AgentOsControlV1AdminScheduleRequest
  | AgentOsControlV1AdminHumanControlCommandRequest;

export type AgentOsControlV1AdminWorkItemReceipt =
  AdminReceiptBase<`control.work-item.${"create" | "update" | "list" | "block" | "complete" | "fail" | "spawn-subtasks"}.receipt`> &
    Readonly<{
      workItemId?: string;
      workItemIds?: readonly string[];
      items?: readonly AgentOsControlV1AdminWorkItemSummary[];
      item?: Readonly<AgentOsControlV1AdminWorkItemSummary>;
    }>;
export type AgentOsControlV1AdminTaskPlanReceipt =
  AdminReceiptBase<`control.task-plan.${"draft" | "accept" | "reject"}.receipt`> &
    Readonly<{
      planId?: string;
      taskCount?: number;
      workItemIds?: readonly string[];
      planStatus?: "draft" | "accepted" | "rejected";
    }>;
export type AgentOsControlV1AdminMessageReceipt =
  AdminReceiptBase<`control.message.${"send" | "list"}.receipt`> &
    Readonly<{
      messageId?: string;
      messages?: readonly AgentOsControlV1AdminMessageSummary[];
      cursor?: string;
    }>;
export type AgentOsControlV1AdminScheduleReceipt =
  AdminReceiptBase<`control.schedule.${"create" | "list" | "cancel"}.receipt`> &
    Readonly<{
      scheduleId?: string;
      schedules?: readonly AgentOsControlV1AdminScheduleSummary[];
    }>;
export type AgentOsControlV1AdminHumanControlReceipt =
  AdminReceiptBase<"control.human-control.command.receipt"> &
    Readonly<{ commandId?: string; targetId?: string }>;
export type AgentOsControlV1AdminReceipt =
  | AgentOsControlV1AdminWorkItemReceipt
  | AgentOsControlV1AdminTaskPlanReceipt
  | AgentOsControlV1AdminMessageReceipt
  | AgentOsControlV1AdminScheduleReceipt
  | AgentOsControlV1AdminHumanControlReceipt;
export type AgentOsControlV1AdminMessage =
  | AgentOsControlV1AdminRequest
  | AgentOsControlV1AdminReceipt;

export type AgentOsControlV1AdminContractErrorCode =
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "UNKNOWN_FIELD"
  | "UNSUPPORTED_VERSION"
  | "UNSUPPORTED_OPERATION"
  | "SENSITIVE_FIELD"
  | "JSON_BUDGET";
export class AgentOsControlV1AdminContractError extends Error {
  constructor(
    readonly code: AgentOsControlV1AdminContractErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AgentOsControlV1AdminContractError";
  }
}

const REQUEST_SET = new Set<string>(
  AGENT_OS_CONTROL_V1_ADMIN_REQUEST_OPERATIONS,
);
const RECEIPT_SET = new Set<string>(
  AGENT_OS_CONTROL_V1_ADMIN_RECEIPT_OPERATIONS,
);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const REQUEST_BASE = [
  "schemaVersion",
  "operation",
  "requestId",
  "correlationId",
  "tenantId",
  "workloadId",
  "hostId",
  "idempotencyKey",
  "expectedRevision",
  "expectedFence",
] as const;
const RECEIPT_BASE = [
  "schemaVersion",
  "operation",
  "requestId",
  "correlationId",
  "status",
  "code",
  "revision",
  "fence",
] as const;
const CODES: Record<string, readonly string[]> = {
  "control.work-item.create": [
    "NONE",
    "LIMIT_EXCEEDED",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.work-item.update": [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "LIMIT_EXCEEDED",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.work-item.list": [
    "NONE",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.work-item.block": [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.work-item.complete": [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.work-item.fail": [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.work-item.spawn-subtasks": [
    "NONE",
    "NOT_FOUND",
    "LIMIT_EXCEEDED",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.task-plan.draft": [
    "NONE",
    "LIMIT_EXCEEDED",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.task-plan.accept": [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "LIMIT_EXCEEDED",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.task-plan.reject": [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.message.send": [
    "NONE",
    "LIMIT_EXCEEDED",
    "NOT_FOUND",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.message.list": [
    "NONE",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.schedule.create": [
    "NONE",
    "LIMIT_EXCEEDED",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.schedule.list": [
    "NONE",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.schedule.cancel": [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  "control.human-control.command": [
    "NONE",
    "RBAC_DENIED",
    "POLICY_DENIED",
    "LIMIT_EXCEEDED",
    "NOT_FOUND",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
};

const ADMIN_REQUEST_REJECTS = [
  "INVALID_SHAPE",
  "INVALID_VALUE",
  "LIMIT_EXCEEDED",
] as const;

/**
 * The Admin family is part of the same ordered Control inventory as the
 * original families.  Export the per-operation code metadata so the
 * aggregator can build one authoritative inventory for Control adapters.
 */
export const AGENT_OS_CONTROL_V1_ADMIN_OPERATION_CODE_DEFINITIONS =
  Object.freeze(
    Object.fromEntries(
      AGENT_OS_CONTROL_V1_ADMIN_REQUEST_OPERATIONS.map((operation) => [
        operation,
        {
          requestRejects: ADMIN_REQUEST_REJECTS,
          responseCodes: CODES[operation] ?? [],
        },
      ]),
    ) as Record<
      AgentOsControlV1AdminRequestOperation,
      Readonly<{
        requestRejects: readonly [
          "INVALID_SHAPE",
          "INVALID_VALUE",
          "LIMIT_EXCEEDED",
        ];
        responseCodes: readonly string[];
      }>
    >,
  );

export function parseAgentOsControlV1AdminRequest(
  input: unknown,
): Readonly<AgentOsControlV1AdminRequest> {
  const value = record(input, "Control Admin request");
  const operation = requestOperation(value.operation);
  const base = requestBase(value, operation);
  switch (operation) {
    case "control.work-item.create":
      return freeze({
        ...base,
        ...parseWorkItemPayload(value, true),
        ...optionalIdentifier(value, "parentWorkItemId"),
        ...optionalIdentifier(value, "rootWorkItemId"),
      }) as AgentOsControlV1AdminRequest;
    case "control.work-item.update":
      exactOptional(
        value,
        [...REQUEST_BASE, "workItemId"],
        [
          "title",
          "description",
          "acceptanceCriteria",
          "priority",
          "input",
          "taskGraph",
          "status",
          "unblockStatus",
        ],
        operation,
      );
      return freeze({
        ...base,
        workItemId: identifier(value.workItemId, "workItemId"),
        ...optionalText(value, "title", 4096),
        ...optionalText(value, "description", 65536),
        ...optionalCriteria(value, "acceptanceCriteria"),
        ...optionalPriority(value),
        ...optionalPublicObject(value, "input"),
        ...optionalPublicValue(value, "taskGraph"),
        ...optionalMutableStatus(value, "status"),
        ...optionalMutableStatus(value, "unblockStatus"),
      }) as AgentOsControlV1AdminRequest;
    case "control.work-item.list":
      exactOptional(
        value,
        REQUEST_BASE,
        [
          "status",
          "type",
          "rootWorkItemId",
          "parentWorkItemId",
          "ownerInstanceId",
          "limit",
        ],
        operation,
      );
      return freeze({
        ...base,
        ...optionalWorkItemStatus(value, "status"),
        ...optionalWorkItemType(value, "type"),
        ...optionalIdentifier(value, "rootWorkItemId"),
        ...optionalIdentifier(value, "parentWorkItemId"),
        ...optionalIdentifier(value, "ownerInstanceId"),
        ...optionalLimit(value),
      }) as AgentOsControlV1AdminRequest;
    case "control.work-item.block":
      exact(value, [...REQUEST_BASE, "workItemId", "blockReason"], operation);
      return freeze({
        ...base,
        workItemId: identifier(value.workItemId, "workItemId"),
        blockReason: text(value.blockReason, "blockReason"),
      }) as AgentOsControlV1AdminRequest;
    case "control.work-item.complete":
      exactOptional(
        value,
        [...REQUEST_BASE, "workItemId"],
        ["result"],
        operation,
      );
      return freeze({
        ...base,
        workItemId: identifier(value.workItemId, "workItemId"),
        ...optionalPublicValue(value, "result"),
      }) as AgentOsControlV1AdminRequest;
    case "control.work-item.fail":
      exact(value, [...REQUEST_BASE, "workItemId", "error"], operation);
      return freeze({
        ...base,
        workItemId: identifier(value.workItemId, "workItemId"),
        error: text(value.error, "error"),
      }) as AgentOsControlV1AdminRequest;
    case "control.work-item.spawn-subtasks":
      exact(
        value,
        [...REQUEST_BASE, "parentWorkItemId", "subtasks"],
        operation,
      );
      return freeze({
        ...requestBase(value, operation),
        parentWorkItemId: identifier(
          value.parentWorkItemId,
          "parentWorkItemId",
        ),
        subtasks: freeze(
          array(
            value.subtasks,
            "subtasks",
            AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxPlanTasks,
          ).map((item) => parseWorkItemPayload(record(item, "subtask"), false)),
        ),
      }) as AgentOsControlV1AdminWorkItemSpawnRequest;
    case "control.task-plan.draft":
      exactOptional(value, [...REQUEST_BASE, "goal"], ["tasks"], operation);
      return freeze({
        ...base,
        goal: text(value.goal, "goal"),
        ...optionalTaskPlanTasks(value),
      }) as AgentOsControlV1AdminRequest;
    case "control.task-plan.accept":
      exact(value, [...REQUEST_BASE, "planId"], operation);
      return freeze({
        ...base,
        planId: identifier(value.planId, "planId"),
      }) as AgentOsControlV1AdminRequest;
    case "control.task-plan.reject":
      exactOptional(value, REQUEST_BASE, ["planId", "reason"], operation);
      if (value.reason === undefined)
        fail("INVALID_VALUE", "reason is required");
      return freeze({
        ...base,
        ...optionalIdentifier(value, "planId"),
        reason: text(value.reason, "reason"),
      }) as AgentOsControlV1AdminRequest;
    case "control.message.send":
      exactOptional(
        value,
        [...REQUEST_BASE, "groupId", "messageType"],
        [
          "messageId",
          "receiver",
          "workItemId",
          "parentWorkItemId",
          "instructionId",
          "comment",
          "data",
        ],
        operation,
      );
      return freeze({
        ...base,
        groupId: identifier(value.groupId, "groupId"),
        messageType: text(value.messageType, "messageType", 256),
        ...optionalIdentifier(value, "messageId"),
        ...optionalReceiver(value),
        ...optionalIdentifier(value, "workItemId"),
        ...optionalIdentifier(value, "parentWorkItemId"),
        ...optionalIdentifier(value, "instructionId"),
        ...optionalText(value, "comment", 65536),
        ...optionalPublicObject(value, "data"),
      }) as AgentOsControlV1AdminRequest;
    case "control.message.list":
      exactOptional(
        value,
        REQUEST_BASE,
        ["groupId", "workItemId", "instructionId", "limit", "cursor"],
        operation,
      );
      return freeze({
        ...base,
        ...optionalIdentifier(value, "groupId"),
        ...optionalIdentifier(value, "workItemId"),
        ...optionalIdentifier(value, "instructionId"),
        ...optionalLimit(value),
        ...optionalIdentifier(value, "cursor"),
      }) as AgentOsControlV1AdminRequest;
    case "control.schedule.create":
      exactOptional(
        value,
        [...REQUEST_BASE, "kind", "schedule"],
        ["scheduleId", "prompt", "workItemId", "sessionId"],
        operation,
      );
      return freeze({
        ...base,
        kind: scheduleKind(value.kind),
        schedule: parseSchedule(value.schedule),
        ...optionalIdentifier(value, "scheduleId"),
        ...optionalText(value, "prompt", 65536),
        ...optionalIdentifier(value, "workItemId"),
        ...optionalIdentifier(value, "sessionId"),
      }) as AgentOsControlV1AdminRequest;
    case "control.schedule.list":
      exactOptional(
        value,
        REQUEST_BASE,
        ["sessionId", "limit", "cursor"],
        operation,
      );
      return freeze({
        ...base,
        ...optionalIdentifier(value, "sessionId"),
        ...optionalLimit(value),
        ...optionalIdentifier(value, "cursor"),
      }) as AgentOsControlV1AdminRequest;
    case "control.schedule.cancel":
      exactOptional(
        value,
        [...REQUEST_BASE, "scheduleId"],
        ["reason"],
        operation,
      );
      return freeze({
        ...base,
        scheduleId: identifier(value.scheduleId, "scheduleId"),
        ...optionalText(value, "reason", 4096),
      }) as AgentOsControlV1AdminRequest;
    case "control.human-control.command":
      exactOptional(
        value,
        [...REQUEST_BASE, "command"],
        ["targetTenantId"],
        operation,
      );
      return freeze({
        ...base,
        command: parseHumanCommand(value.command),
        ...optionalIdentifier(value, "targetTenantId"),
      }) as AgentOsControlV1AdminRequest;
    default:
      fail("INVALID_VALUE", "unsupported Control Admin request operation");
  }
}

export function parseAgentOsControlV1AdminReceipt(
  input: unknown,
): Readonly<AgentOsControlV1AdminReceipt> {
  const value = record(input, "Control Admin receipt");
  const operation = receiptOperation(value.operation);
  const requestOperation = operation.slice(
    0,
    -8,
  ) as AgentOsControlV1AdminRequestOperation;
  const base = receiptBase(value, operation);
  switch (requestOperation) {
    case "control.work-item.create":
    case "control.work-item.update":
    case "control.work-item.list":
    case "control.work-item.block":
    case "control.work-item.complete":
    case "control.work-item.fail":
    case "control.work-item.spawn-subtasks":
      exactOptional(
        value,
        [...RECEIPT_BASE],
        ["replay", "workItemId", "workItemIds", "items", "item"],
        operation,
      );
      return freeze({
        ...base,
        ...optionalBoolean(value, "replay"),
        ...optionalIdentifier(value, "workItemId"),
        ...optionalIdentifierArray(value, "workItemIds"),
        ...optionalWorkItemSummaryArray(value, "items"),
        ...optionalWorkItemSummary(value, "item"),
      }) as AgentOsControlV1AdminReceipt;
    case "control.task-plan.draft":
    case "control.task-plan.accept":
    case "control.task-plan.reject":
      exactOptional(
        value,
        [...RECEIPT_BASE],
        ["replay", "planId", "taskCount", "workItemIds", "planStatus"],
        operation,
      );
      return freeze({
        ...base,
        ...optionalBoolean(value, "replay"),
        ...optionalIdentifier(value, "planId"),
        ...optionalNonNegativeInteger(value, "taskCount"),
        ...optionalIdentifierArray(value, "workItemIds"),
        ...optionalPlanStatus(value),
      }) as AgentOsControlV1AdminReceipt;
    case "control.message.send":
    case "control.message.list":
      exactOptional(
        value,
        [...RECEIPT_BASE],
        ["replay", "messageId", "messages", "cursor"],
        operation,
      );
      return freeze({
        ...base,
        ...optionalBoolean(value, "replay"),
        ...optionalIdentifier(value, "messageId"),
        ...optionalMessageSummaryArray(value, "messages"),
        ...optionalIdentifier(value, "cursor"),
      }) as AgentOsControlV1AdminReceipt;
    case "control.schedule.create":
    case "control.schedule.list":
    case "control.schedule.cancel":
      exactOptional(
        value,
        [...RECEIPT_BASE],
        ["replay", "scheduleId", "schedules"],
        operation,
      );
      return freeze({
        ...base,
        ...optionalBoolean(value, "replay"),
        ...optionalIdentifier(value, "scheduleId"),
        ...optionalScheduleSummaryArray(value, "schedules"),
      }) as AgentOsControlV1AdminReceipt;
    case "control.human-control.command":
      exactOptional(
        value,
        [...RECEIPT_BASE],
        ["replay", "commandId", "targetId"],
        operation,
      );
      return freeze({
        ...base,
        ...optionalBoolean(value, "replay"),
        ...optionalIdentifier(value, "commandId"),
        ...optionalIdentifier(value, "targetId"),
      }) as AgentOsControlV1AdminReceipt;
    default:
      fail("INVALID_VALUE", "unsupported Control Admin receipt operation");
  }
}

export function parseAgentOsControlV1AdminMessage(
  input: unknown,
): Readonly<AgentOsControlV1AdminMessage> {
  const value = record(input, "Control Admin message");
  if (typeof value.operation === "string" && RECEIPT_SET.has(value.operation))
    return parseAgentOsControlV1AdminReceipt(value);
  return parseAgentOsControlV1AdminRequest(value);
}
export function canonicalAgentOsControlV1AdminSource(input: unknown): string {
  return canonicalJson(parseAgentOsControlV1AdminMessage(input));
}
export function canonicalAgentOsControlV1AdminRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlV1AdminRequest(input));
}
export function canonicalAgentOsControlV1AdminReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlV1AdminReceipt(input));
}
export function createAgentOsControlV1AdminDigest(
  input: unknown,
): `sha256:${string}` {
  return `sha256:${sha256Hex(canonicalAgentOsControlV1AdminSource(input))}`;
}
export function encodeAgentOsControlV1Admin(input: unknown): string {
  return `${canonicalAgentOsControlV1AdminSource(input)}\n`;
}
export function decodeAgentOsControlV1Admin(
  source: string,
): Readonly<AgentOsControlV1AdminMessage> {
  if (typeof source !== "string")
    fail("INVALID_VALUE", "encoded source must be a string");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    fail("INVALID_VALUE", "encoded source is not valid JSON");
  }
  return parseAgentOsControlV1AdminMessage(value);
}

function requestOperation(
  value: unknown,
): AgentOsControlV1AdminRequestOperation {
  if (typeof value !== "string" || !REQUEST_SET.has(value))
    fail(
      "UNSUPPORTED_OPERATION",
      "unsupported Control Admin request operation",
    );
  return value as AgentOsControlV1AdminRequestOperation;
}
function receiptOperation(
  value: unknown,
): AgentOsControlV1AdminReceiptOperation {
  if (typeof value !== "string" || !RECEIPT_SET.has(value))
    fail(
      "UNSUPPORTED_OPERATION",
      "unsupported Control Admin receipt operation",
    );
  return value as AgentOsControlV1AdminReceiptOperation;
}
function requestBase<Operation extends AgentOsControlV1AdminRequestOperation>(
  value: Record<string, unknown>,
  operation: Operation,
): AdminRequestBase<Operation> {
  requireFields(value, REQUEST_BASE, operation);
  return {
    schemaVersion: schema(value.schemaVersion),
    operation,
    requestId: identifier(value.requestId, "requestId"),
    correlationId: identifier(value.correlationId, "correlationId"),
    tenantId: identifier(value.tenantId, "tenantId"),
    workloadId: identifier(value.workloadId, "workloadId"),
    hostId: identifier(value.hostId, "hostId"),
    idempotencyKey: identifier(value.idempotencyKey, "idempotencyKey"),
    expectedRevision: integer(value.expectedRevision, "expectedRevision"),
    expectedFence: integer(value.expectedFence, "expectedFence"),
  };
}
function receiptBase(
  value: Record<string, unknown>,
  operation: AgentOsControlV1AdminReceiptOperation,
): AdminReceiptBase<AgentOsControlV1AdminReceiptOperation> {
  requireFields(value, RECEIPT_BASE, operation);
  const codes = CODES[operation.slice(0, -8)];
  if (!codes)
    fail("UNSUPPORTED_OPERATION", "receipt code inventory is missing");
  const code = text(value.code, "code", 128);
  if (!codes.includes(code))
    fail("INVALID_VALUE", "receipt code is invalid for operation");
  const status = receiptStatus(value.status);
  if ((status === "accepted") !== (code === "NONE"))
    fail(
      "INVALID_VALUE",
      "accepted receipts must use NONE and rejected receipts a rejection code",
    );
  return {
    schemaVersion: schema(value.schemaVersion),
    operation,
    requestId: identifier(value.requestId, "requestId"),
    correlationId: identifier(value.correlationId, "correlationId"),
    status,
    code,
    revision: integer(value.revision, "revision"),
    fence: integer(value.fence, "fence"),
    ...optionalBoolean(value, "replay"),
  };
}
function parseWorkItemPayload(
  value: Record<string, unknown>,
  includeRequired: boolean,
): AgentOsControlV1AdminWorkItemPayload {
  const required = includeRequired
    ? [...REQUEST_BASE, "title", "acceptanceCriteria"]
    : ["title", "acceptanceCriteria"];
  exactOptional(
    value,
    required,
    [
      "description",
      "type",
      "priority",
      "input",
      "ownerInstanceId",
      "sessionId",
      "taskGraph",
      "parentWorkItemId",
      "rootWorkItemId",
    ],
    "work item payload",
  );
  return {
    title: text(value.title, "title", 4096),
    acceptanceCriteria: criteria(value.acceptanceCriteria),
    ...optionalText(value, "description", 65536),
    ...optionalWorkItemType(value, "type"),
    ...optionalPriority(value),
    ...optionalPublicObject(value, "input"),
    ...optionalIdentifier(value, "ownerInstanceId"),
    ...optionalIdentifier(value, "sessionId"),
    ...optionalPublicValue(value, "taskGraph"),
  };
}
function parseTask(value: unknown): AgentOsControlV1AdminTaskPlanTask {
  const item = record(value, "task plan task");
  exactOptional(
    item,
    ["planTaskId", "title", "acceptanceCriteria", "dependsOn"],
    [
      "description",
      "type",
      "priority",
      "input",
      "ownerInstanceId",
      "sessionId",
      "taskGraph",
      "scheduleHint",
    ],
    "task plan task",
  );
  return {
    planTaskId: identifier(item.planTaskId, "planTaskId"),
    title: text(item.title, "title", 4096),
    acceptanceCriteria: criteria(item.acceptanceCriteria),
    dependsOn: identifierArray(item.dependsOn, "dependsOn"),
    ...optionalText(item, "description", 65536),
    ...optionalWorkItemType(item, "type"),
    ...optionalPriority(item),
    ...optionalPublicObject(item, "input"),
    ...optionalIdentifier(item, "ownerInstanceId"),
    ...optionalIdentifier(item, "sessionId"),
    ...optionalPublicValue(item, "taskGraph"),
    ...optionalPublicValue(item, "scheduleHint"),
  };
}
function optionalTaskPlanTasks(
  value: Record<string, unknown>,
): Partial<Record<string, readonly AgentOsControlV1AdminTaskPlanTask[]>> {
  if (value.tasks === undefined) return {};
  return {
    tasks: freeze(
      array(
        value.tasks,
        "tasks",
        AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxPlanTasks,
      ).map(parseTask),
    ),
  };
}
function optionalReceiver(
  value: Record<string, unknown>,
): Partial<Record<string, AgentOsControlV1AdminMessageReceiver>> {
  if (value.receiver === undefined) return {};
  const receiver = record(value.receiver, "receiver");
  exact(
    receiver,
    ["type", receiver.type === "agent" ? "agentId" : "groupId"],
    "receiver",
  );
  if (receiver.type === "agent")
    return {
      receiver: {
        type: "agent",
        agentId: identifier(receiver.agentId, "receiver.agentId"),
      },
    };
  if (receiver.type === "group")
    return {
      receiver: {
        type: "group",
        groupId: identifier(receiver.groupId, "receiver.groupId"),
      },
    };
  fail("INVALID_VALUE", "receiver type is invalid");
}
function parseSchedule(value: unknown): AgentOsControlV1AdminPlanningSchedule {
  const schedule = record(value, "schedule");
  if (schedule.type === "daily") {
    exact(schedule, ["type", "hour", "minute"], "daily schedule");
    return {
      type: "daily",
      hour: bounded(schedule.hour, "hour", 0, 23),
      minute: bounded(schedule.minute, "minute", 0, 59),
    };
  }
  if (schedule.type === "weekly") {
    exact(schedule, ["type", "weekday", "hour", "minute"], "weekly schedule");
    return {
      type: "weekly",
      weekday: bounded(schedule.weekday, "weekday", 0, 6),
      hour: bounded(schedule.hour, "hour", 0, 23),
      minute: bounded(schedule.minute, "minute", 0, 59),
    };
  }
  fail("INVALID_VALUE", "schedule type is invalid");
}
function parseHumanCommand(
  value: unknown,
): AgentOsControlV1AdminHumanControlCommand {
  const command = record(value, "human-control command");
  exactOptional(
    command,
    ["commandId", "targetId", "action"],
    ["reason", "expiresAt", "assigneeId", "payload"],
    "human-control command",
  );
  return {
    commandId: identifier(command.commandId, "commandId"),
    targetId: identifier(command.targetId, "targetId"),
    action: humanControlAction(command.action),
    ...optionalText(command, "reason", 4096),
    ...optionalInstant(command, "expiresAt"),
    ...optionalIdentifier(command, "assigneeId"),
    ...optionalPublicValue(command, "payload"),
  };
}
function parseWorkItemSummary(
  value: unknown,
): AgentOsControlV1AdminWorkItemSummary {
  const item = record(value, "work item summary");
  exactOptional(
    item,
    ["workItemId", "title", "acceptanceCriteria", "status"],
    [
      "description",
      "type",
      "priority",
      "input",
      "ownerInstanceId",
      "sessionId",
      "taskGraph",
      "parentWorkItemId",
      "rootWorkItemId",
      "createdAt",
      "updatedAt",
    ],
    "work item summary",
  );
  return {
    workItemId: identifier(item.workItemId, "workItemId"),
    title: text(item.title, "title", 4096),
    acceptanceCriteria: criteria(item.acceptanceCriteria),
    status: workItemStatus(item.status),
    ...optionalText(item, "description", 65536),
    ...optionalWorkItemType(item, "type"),
    ...optionalPriority(item),
    ...optionalPublicObject(item, "input"),
    ...optionalIdentifier(item, "ownerInstanceId"),
    ...optionalIdentifier(item, "sessionId"),
    ...optionalPublicValue(item, "taskGraph"),
    ...optionalIdentifier(item, "parentWorkItemId"),
    ...optionalIdentifier(item, "rootWorkItemId"),
    ...optionalInstant(item, "createdAt"),
    ...optionalInstant(item, "updatedAt"),
  };
}
function parseMessageSummary(
  value: unknown,
): AgentOsControlV1AdminMessageSummary {
  const item = record(value, "message summary");
  exactOptional(
    item,
    ["messageId", "groupId", "messageType"],
    [
      "receiver",
      "workItemId",
      "parentWorkItemId",
      "instructionId",
      "comment",
      "data",
      "createdAt",
    ],
    "message summary",
  );
  return {
    messageId: identifier(item.messageId, "messageId"),
    groupId: identifier(item.groupId, "groupId"),
    messageType: text(item.messageType, "messageType", 256),
    ...optionalReceiver(item),
    ...optionalIdentifier(item, "workItemId"),
    ...optionalIdentifier(item, "parentWorkItemId"),
    ...optionalIdentifier(item, "instructionId"),
    ...optionalText(item, "comment", 65536),
    ...optionalPublicObject(item, "data"),
    ...optionalInstant(item, "createdAt"),
  };
}
function parseScheduleSummary(
  value: unknown,
): AgentOsControlV1AdminScheduleSummary {
  const item = record(value, "schedule summary");
  exactOptional(
    item,
    ["scheduleId", "kind", "schedule"],
    ["prompt", "workItemId", "sessionId", "createdAt"],
    "schedule summary",
  );
  return {
    scheduleId: identifier(item.scheduleId, "scheduleId"),
    kind: scheduleKind(item.kind),
    schedule: parseSchedule(item.schedule),
    ...optionalText(item, "prompt", 65536),
    ...optionalIdentifier(item, "workItemId"),
    ...optionalIdentifier(item, "sessionId"),
    ...optionalInstant(item, "createdAt"),
  };
}

function optionalWorkItemSummaryArray(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, readonly AgentOsControlV1AdminWorkItemSummary[]>> {
  return value[key] === undefined
    ? {}
    : ({
        [key]: freeze(
          array(value[key], key, AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxItems).map(
            parseWorkItemSummary,
          ),
        ),
      } as Partial<
        Record<string, readonly AgentOsControlV1AdminWorkItemSummary[]>
      >);
}
function optionalWorkItemSummary(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, AgentOsControlV1AdminWorkItemSummary>> {
  return value[key] === undefined
    ? {}
    : { [key]: parseWorkItemSummary(value[key]) };
}
function optionalMessageSummaryArray(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, readonly AgentOsControlV1AdminMessageSummary[]>> {
  return value[key] === undefined
    ? {}
    : ({
        [key]: freeze(
          array(
            value[key],
            key,
            AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxMessages,
          ).map(parseMessageSummary),
        ),
      } as Partial<
        Record<string, readonly AgentOsControlV1AdminMessageSummary[]>
      >);
}
function optionalScheduleSummaryArray(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, readonly AgentOsControlV1AdminScheduleSummary[]>> {
  return value[key] === undefined
    ? {}
    : ({
        [key]: freeze(
          array(
            value[key],
            key,
            AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxSchedules,
          ).map(parseScheduleSummary),
        ),
      } as Partial<
        Record<string, readonly AgentOsControlV1AdminScheduleSummary[]>
      >);
}
function optionalIdentifierArray(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, readonly string[]>> {
  return value[key] === undefined
    ? {}
    : { [key]: identifierArray(value[key], key) };
}
function identifierArray(value: unknown, label: string): readonly string[] {
  const values = array(
    value,
    label,
    AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxItems,
  ).map((item) => identifier(item, `${label} item`));
  if (new Set(values).size !== values.length)
    fail("INVALID_VALUE", `${label} contains duplicates`);
  return values;
}
function criteria(value: unknown): readonly string[] {
  const values = array(value, "acceptanceCriteria", 64).map((item) =>
    text(item, "acceptanceCriteria item", 4096),
  );
  if (values.length === 0)
    fail("INVALID_VALUE", "acceptanceCriteria must not be empty");
  return freeze(values);
}
function optionalCriteria(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, readonly string[]>> {
  return value[key] === undefined ? {} : { [key]: criteria(value[key]) };
}
function optionalText(
  value: Record<string, unknown>,
  key: string,
  max: number,
): Partial<Record<string, string>> {
  return value[key] === undefined ? {} : { [key]: text(value[key], key, max) };
}
function optionalIdentifier(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, string>> {
  return value[key] === undefined ? {} : { [key]: identifier(value[key], key) };
}
function optionalInstant(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, string>> {
  return value[key] === undefined ? {} : { [key]: instant(value[key], key) };
}
function optionalPriority(
  value: Record<string, unknown>,
): Partial<Record<string, number>> {
  return value.priority === undefined
    ? {}
    : { priority: finiteNumber(value.priority, "priority") };
}
function optionalLimit(
  value: Record<string, unknown>,
): Partial<Record<string, number>> {
  return value.limit === undefined
    ? {}
    : {
        limit: bounded(
          value.limit,
          "limit",
          1,
          AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxItems,
        ),
      };
}
function optionalBoolean(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, boolean>> {
  return value[key] === undefined ? {} : { [key]: boolean(value[key], key) };
}
function optionalNonNegativeInteger(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, number>> {
  return value[key] === undefined
    ? {}
    : { [key]: bounded(value[key], key, 0, Number.MAX_SAFE_INTEGER) };
}
function optionalMutableStatus(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, AgentOsControlV1AdminMutableTaskStatus>> {
  return value[key] === undefined ? {} : { [key]: mutableStatus(value[key]) };
}
function optionalWorkItemType(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, AgentOsControlV1AdminWorkItemType>> {
  return value[key] === undefined ? {} : { [key]: workItemType(value[key]) };
}
function optionalWorkItemStatus(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, AgentOsControlV1AdminWorkItemStatus>> {
  return value[key] === undefined ? {} : { [key]: workItemStatus(value[key]) };
}
function optionalPlanStatus(
  value: Record<string, unknown>,
): Partial<Record<string, "draft" | "accepted" | "rejected">> {
  return value.planStatus === undefined
    ? {}
    : { planStatus: planStatus(value.planStatus) };
}
function optionalPublicObject(
  value: Record<string, unknown>,
  key: string,
): Partial<
  Record<string, Readonly<Record<string, AgentOsControlV1AdminPublicValue>>>
> {
  return value[key] === undefined
    ? {}
    : { [key]: publicObject(value[key], key) };
}
function optionalPublicValue(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, AgentOsControlV1AdminPublicValue>> {
  return value[key] === undefined ? {} : { [key]: publicValue(value[key]) };
}

function schema(value: unknown): typeof AGENT_OS_CONTROL_V1_SCHEMA_VERSION {
  if (value !== AGENT_OS_CONTROL_V1_SCHEMA_VERSION)
    fail("UNSUPPORTED_VERSION", "Control schemaVersion is unsupported");
  return AGENT_OS_CONTROL_V1_SCHEMA_VERSION;
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  if (
    new TextEncoder().encode(value).byteLength >
    AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxIdentifierBytes
  )
    fail("JSON_BUDGET", `${label} is too long`);
  return value;
}
function text(
  value: unknown,
  label: string,
  max: number = AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxStringBytes,
): string {
  if (typeof value !== "string" || value.length === 0)
    fail("INVALID_VALUE", `${label} must be a non-empty string`);
  if (new TextEncoder().encode(value).byteLength > max)
    fail("JSON_BUDGET", `${label} is too long`);
  return value;
}
function instant(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !INSTANT.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    fail("INVALID_VALUE", `${label} is not an instant`);
  return value;
}
function integer(value: unknown, label: string): number {
  return bounded(value, label, 0, Number.MAX_SAFE_INTEGER);
}
function bounded(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    fail("INVALID_VALUE", `${label} is outside its integer range`);
  return value;
}
function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    fail("INVALID_VALUE", `${label} must be finite`);
  return value;
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean")
    fail("INVALID_VALUE", `${label} must be boolean`);
  return value;
}
function workItemType(value: unknown): AgentOsControlV1AdminWorkItemType {
  if (
    value !== "prompt" &&
    value !== "workflow_run" &&
    value !== "workflow_node" &&
    value !== "subagent_task" &&
    value !== "instruction_task" &&
    value !== "manual"
  )
    fail("INVALID_VALUE", "work item type is invalid");
  return value;
}
function workItemStatus(value: unknown): AgentOsControlV1AdminWorkItemStatus {
  if (
    value !== "pending" &&
    value !== "running" &&
    value !== "waiting" &&
    value !== "completed" &&
    value !== "failed" &&
    value !== "cancelled" &&
    value !== "expired"
  )
    fail("INVALID_VALUE", "work item status is invalid");
  return value;
}
function mutableStatus(value: unknown): AgentOsControlV1AdminMutableTaskStatus {
  if (value !== "pending" && value !== "running")
    fail("INVALID_VALUE", "mutable task status is invalid");
  return value;
}
function planStatus(value: unknown): "draft" | "accepted" | "rejected" {
  if (value !== "draft" && value !== "accepted" && value !== "rejected")
    fail("INVALID_VALUE", "plan status is invalid");
  return value;
}
function scheduleKind(value: unknown): "follow_up" | "task_review" {
  if (value !== "follow_up" && value !== "task_review")
    fail("INVALID_VALUE", "schedule kind is invalid");
  return value;
}
function humanControlAction(
  value: unknown,
): AgentOsControlV1AdminHumanControlAction {
  if (
    value !== "pause" &&
    value !== "resume" &&
    value !== "approve" &&
    value !== "reject" &&
    value !== "request_changes" &&
    value !== "reassign" &&
    value !== "handoff" &&
    value !== "retry" &&
    value !== "cancel" &&
    value !== "recovery-resolved"
  )
    fail("INVALID_VALUE", "human-control action is invalid");
  return value;
}
function receiptStatus(value: unknown): "accepted" | "rejected" {
  if (value !== "accepted" && value !== "rejected")
    fail("INVALID_VALUE", "receipt status is invalid");
  return value;
}

function publicObject(
  value: unknown,
  label: string,
): Readonly<Record<string, AgentOsControlV1AdminPublicValue>> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_SHAPE", `${label} must be an object`);
  return publicValue(value) as Readonly<
    Record<string, AgentOsControlV1AdminPublicValue>
  >;
}
function publicValue(value: unknown): AgentOsControlV1AdminPublicValue {
  const state = { nodes: 0 };
  return copyPublicValue(value, 0, state, new WeakSet());
}
function copyPublicValue(
  value: unknown,
  depth: number,
  state: { nodes: number },
  seen: WeakSet<object>,
): AgentOsControlV1AdminPublicValue {
  if (depth > AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxJsonDepth)
    fail("JSON_BUDGET", "JSON nesting is too deep");
  state.nodes += 1;
  if (state.nodes > AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxJsonNodes)
    fail("JSON_BUDGET", "JSON has too many nodes");
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    if (
      typeof value === "string" &&
      new TextEncoder().encode(value).byteLength >
        AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxStringBytes
    )
      fail("JSON_BUDGET", "JSON string is too long");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail("INVALID_VALUE", "JSON number must be finite");
    return value;
  }
  if (typeof value !== "object")
    fail("INVALID_VALUE", "JSON value has unsupported type");
  if (seen.has(value)) fail("INVALID_SHAPE", "JSON must not contain cycles");
  seen.add(value);
  if (Array.isArray(value))
    return freeze(
      array(value, "JSON array", AGENT_OS_CONTROL_V1_ADMIN_LIMITS.maxItems).map(
        (item) => copyPublicValue(item, depth + 1, state, seen),
      ),
    );
  const object = record(value, "JSON object");
  const result: Record<string, AgentOsControlV1AdminPublicValue> = {};
  for (const [key, child] of Object.entries(object))
    result[key] = copyPublicValue(child, depth + 1, state, seen);
  return freeze(result);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length > 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors))
    if (
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail("INVALID_SHAPE", `${label}.${key} must be a data property`);
  return value as Record<string, unknown>;
}
function array(value: unknown, label: string, max: number): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("INVALID_SHAPE", `${label} must be an array`);
  if (value.length > max) fail("JSON_BUDGET", `${label} is too large`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor))
      fail("INVALID_SHAPE", `${label} must not contain holes`);
    result.push(descriptor.value);
  }
  return result;
}
function requireFields(
  value: Record<string, unknown>,
  required: readonly string[],
  label: string,
): void {
  if (required.some((key) => !(key in value)))
    fail("INVALID_SHAPE", `${label} contains missing fields`);
}
function exact(
  value: Record<string, unknown>,
  required: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== required.length ||
    keys.some((key) => !required.includes(key)) ||
    required.some((key) => !(key in value))
  )
    fail("INVALID_SHAPE", `${label} contains unknown or missing fields`);
}
function exactOptional(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    Object.keys(value).some((key) => !allowed.has(key)) ||
    required.some((key) => !(key in value))
  )
    fail("INVALID_SHAPE", `${label} contains unknown or missing fields`);
  for (const key of optional)
    if (key in value && value[key] === undefined)
      fail("INVALID_VALUE", `${label}.${key} must not be undefined`);
}
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = record(value, "canonical source");
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}
function freeze<T>(value: T): T {
  return deepFreeze(value);
}
function fail(
  code: AgentOsControlV1AdminContractErrorCode,
  message: string,
): never {
  throw new AgentOsControlV1AdminContractError(code, message);
}
