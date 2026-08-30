import { deepFreeze, sha256Hex } from "./contract-primitives.js";

/** The versioned wire namespace owned by Morpheus Control. */
export const AGENT_OS_CONTROL_V1_SCHEMA_VERSION =
  "agent-os-control/v1" as const;

/**
 * A pre-authority response for parser/service failures. It deliberately uses
 * the Control version namespace but is not an authority receipt: it has no
 * revision, fence, replay, or idempotency state to report.
 */
export const AGENT_OS_CONTROL_V1_SERVICE_REJECTION_OPERATION =
  "control.service.rejection" as const;
export const AGENT_OS_CONTROL_V1_SERVICE_REJECTION_SCHEMA_VERSION =
  AGENT_OS_CONTROL_V1_SCHEMA_VERSION;
export const AGENT_OS_CONTROL_V1_SERVICE_REJECTION_ORIGINS = Object.freeze([
  "parser",
  "service",
] as const);
export type AgentOsControlV1ServiceRejectionOrigin =
  (typeof AGENT_OS_CONTROL_V1_SERVICE_REJECTION_ORIGINS)[number];
export type AgentOsControlV1RequestRejectionCode =
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "EXPIRED"
  | "LIMIT_EXCEEDED";
export const AGENT_OS_CONTROL_V1_SERVICE_REJECTION_CODES = Object.freeze([
  "INVALID_SHAPE",
  "INVALID_VALUE",
  "UNKNOWN_FIELD",
  "UNSUPPORTED_VERSION",
  "UNSUPPORTED_OPERATION",
  "SENSITIVE_FIELD",
  "EXPIRED",
  "LIMIT_EXCEEDED",
  "SERVICE_UNAVAILABLE",
  "CORRUPT_STORE",
] as const);
export type AgentOsControlV1ServiceRejectionCode =
  (typeof AGENT_OS_CONTROL_V1_SERVICE_REJECTION_CODES)[number];
export type AgentOsControlServiceRejection = Readonly<{
  schemaVersion: typeof AGENT_OS_CONTROL_V1_SCHEMA_VERSION;
  operation: typeof AGENT_OS_CONTROL_V1_SERVICE_REJECTION_OPERATION;
  requestId: string;
  correlationId: string;
  status: "rejected";
  code: AgentOsControlV1ServiceRejectionCode;
  origin: AgentOsControlV1ServiceRejectionOrigin;
  detail?: string;
}>;
export type AgentOsControlV1ServiceRejection = AgentOsControlServiceRejection;

export const AGENT_OS_CONTROL_V1_CAPABILITIES = Object.freeze([
  "admission",
  "enrollment",
  "quota-rbac-policy",
  "global-queue",
  "bounded-workflow",
  "declared-team",
  "human-control",
  "redacted-audit",
] as const);

export type AgentOsControlV1Capability =
  (typeof AGENT_OS_CONTROL_V1_CAPABILITIES)[number];

/**
 * This is the single ordered operation inventory for the Control wire. Keep
 * this list in lockstep with the Control protocol-block contract. The
 * generic family parsers below intentionally do not accept operations outside
 * this inventory.
 */
export const AGENT_OS_CONTROL_V1_OPERATION_MATRIX = deepFreeze([
  {
    capability: "admission",
    request: "control.admission.admit",
    receipt: "control.admission.admit.receipt",
  },
  {
    capability: "admission",
    request: "control.admission.release",
    receipt: "control.admission.release.receipt",
  },
  {
    capability: "enrollment",
    request: "control.enrollment.enroll",
    receipt: "control.enrollment.enroll.receipt",
  },
  {
    capability: "enrollment",
    request: "control.enrollment.revoke",
    receipt: "control.enrollment.revoke.receipt",
  },
  {
    capability: "quota-rbac-policy",
    request: "control.governance-policy.update",
    receipt: "control.governance-policy.update.receipt",
  },
  {
    capability: "global-queue",
    request: "control.queue.enqueue",
    receipt: "control.queue.enqueue.receipt",
  },
  {
    capability: "global-queue",
    request: "control.queue.lease",
    receipt: "control.queue.lease.receipt",
  },
  {
    capability: "global-queue",
    request: "control.queue.complete",
    receipt: "control.queue.complete.receipt",
  },
  {
    capability: "global-queue",
    request: "control.queue.cancel",
    receipt: "control.queue.cancel.receipt",
  },
  {
    capability: "global-queue",
    request: "control.queue.partition",
    receipt: "control.queue.partition.receipt",
  },
  {
    capability: "global-queue",
    request: "control.queue.takeover",
    receipt: "control.queue.takeover.receipt",
  },
  {
    capability: "global-queue",
    request: "control.queue.reclaim",
    receipt: "control.queue.reclaim.receipt",
  },
  {
    capability: "bounded-workflow",
    request: "control.workflow.declare",
    receipt: "control.workflow.declare.receipt",
  },
  {
    capability: "bounded-workflow",
    request: "control.workflow.start",
    receipt: "control.workflow.start.receipt",
  },
  {
    capability: "bounded-workflow",
    request: "control.workflow.advance",
    receipt: "control.workflow.advance.receipt",
  },
  {
    capability: "bounded-workflow",
    request: "control.workflow.cancel",
    receipt: "control.workflow.cancel.receipt",
  },
  {
    capability: "declared-team",
    request: "control.declared-team.declare",
    receipt: "control.declared-team.declare.receipt",
  },
  {
    capability: "declared-team",
    request: "control.declared-team.update",
    receipt: "control.declared-team.update.receipt",
  },
  {
    capability: "declared-team",
    request: "control.declared-team.revoke",
    receipt: "control.declared-team.revoke.receipt",
  },
  {
    capability: "human-control",
    request: "control.human-control.decide",
    receipt: "control.human-control.decide.receipt",
  },
  {
    capability: "human-control",
    request: "control.human-control.policy.update",
    receipt: "control.human-control.policy.update.receipt",
  },
  {
    capability: "redacted-audit",
    request: "control.audit.append",
    receipt: "control.audit.append.receipt",
  },
] as const);

export type AgentOsControlV1RequestOperation =
  (typeof AGENT_OS_CONTROL_V1_OPERATION_MATRIX)[number]["request"];
export type AgentOsControlV1ReceiptOperation =
  (typeof AGENT_OS_CONTROL_V1_OPERATION_MATRIX)[number]["receipt"];

export type AgentOsControlV1OperationCodeInventoryEntry = Readonly<{
  capability: AgentOsControlV1Capability;
  request: AgentOsControlV1RequestOperation;
  receipt: AgentOsControlV1ReceiptOperation;
  requestRejects: readonly AgentOsControlV1RequestRejectionCode[];
  responseCodes: readonly string[];
}>;

export const AGENT_OS_CONTROL_V1_REQUEST_OPERATIONS = Object.freeze(
  AGENT_OS_CONTROL_V1_OPERATION_MATRIX.map((entry) => entry.request),
);
export const AGENT_OS_CONTROL_V1_RECEIPT_OPERATIONS = Object.freeze(
  AGENT_OS_CONTROL_V1_OPERATION_MATRIX.map((entry) => entry.receipt),
);

export const AGENT_OS_CONTROL_V1_LIMITS = Object.freeze({
  maxRoles: 16,
  maxHumanPolicyRoles: 32,
  maxPermissionsPerRole: 32,
  maxHumanActionsPerRole: 8,
  maxTeamMembers: 16,
  maxWorkflowSteps: 16,
  maxPolicyEntries: 32,
  maxPublicArrayItems: 64,
  maxPublicObjectFields: 32,
  maxPublicDepth: 8,
  maxPublicStringLength: 4096,
} as const);

export type AgentOsControlV1Status = "accepted" | "rejected";
export type AgentOsControlV1WorkflowStatus =
  | "declared"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";
export type AgentOsControlV1WorkflowStepStatus =
  | "pending"
  | "succeeded"
  | "failed";
export type AgentOsControlV1TeamStatus = "active" | "revoked";
export type AgentOsControlV1HumanAction = "approve" | "deny" | "cancel";
export type AgentOsControlV1HumanPolicyAction =
  | AgentOsControlV1HumanAction
  | "policy.write";

export type AgentOsControlV1PublicValue =
  | null
  | boolean
  | number
  | string
  | readonly AgentOsControlV1PublicValue[]
  | Readonly<{ [key: string]: AgentOsControlV1PublicValue }>;

export type AgentOsControlV1Quota = Readonly<{
  revision: string;
  maxActiveAdmissions: number;
  maxUnits: number;
  maxAdmissionTtlMs: number;
}>;

export type AgentOsControlV1Rbac = Readonly<{
  revision: string;
  rolePermissions: Readonly<Record<string, readonly string[]>>;
}>;

export type AgentOsControlV1TeamMember = Readonly<{
  principalId: string;
  role: string;
}>;

export type AgentOsControlV1HumanPolicy = Readonly<{
  revision: string;
  maxDecisions: number;
  maxDecisionTtlMs: number;
  roleActions: Readonly<
    Record<string, readonly AgentOsControlV1HumanPolicyAction[]>
  >;
  principalRoles: Readonly<Record<string, readonly string[]>>;
}>;

type RequestBase<Operation extends AgentOsControlV1RequestOperation> =
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

type ReceiptBase<
  Operation extends AgentOsControlV1ReceiptOperation,
  Code extends string,
> = Readonly<{
  schemaVersion: typeof AGENT_OS_CONTROL_V1_SCHEMA_VERSION;
  operation: Operation;
  requestId: string;
  correlationId: string;
  status: AgentOsControlV1Status;
  code: Code;
  revision: number;
  fence: number;
  replay?: boolean;
}>;

export type AgentOsControlAdmissionAdmitRequest =
  RequestBase<"control.admission.admit"> &
    Readonly<{
      admissionId: string;
      actorPrincipalId: string;
      subjectPrincipalId: string;
      units: number;
      expiresAt: string;
    }>;

export type AgentOsControlAdmissionReleaseRequest =
  RequestBase<"control.admission.release"> &
    Readonly<{
      admissionId: string;
      actorPrincipalId: string;
    }>;

export type AgentOsControlAdmissionRequest =
  | AgentOsControlAdmissionAdmitRequest
  | AgentOsControlAdmissionReleaseRequest;

export type AgentOsControlAdmissionAdmitReceipt = ReceiptBase<
  "control.admission.admit.receipt",
  | "NONE"
  | "RBAC_DENIED"
  | "QUOTA_EXCEEDED"
  | "LIMIT_EXCEEDED"
  | "POLICY_DENIED"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
> &
  Readonly<{
    admissionId?: string;
    expiresAt?: string;
    units?: number;
  }>;

export type AgentOsControlAdmissionReleaseReceipt = ReceiptBase<
  "control.admission.release.receipt",
  | "NONE"
  | "RBAC_DENIED"
  | "NOT_FOUND"
  | "TERMINAL"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
> &
  Readonly<{
    admissionId?: string;
  }>;

export type AgentOsControlAdmissionReceipt =
  | AgentOsControlAdmissionAdmitReceipt
  | AgentOsControlAdmissionReleaseReceipt;

export type AgentOsControlEnrollmentEnrollRequest =
  RequestBase<"control.enrollment.enroll"> &
    Readonly<{
      principalId: string;
      roles: readonly string[];
      expiresAt: string;
      sponsorPrincipalId: string;
    }>;

export type AgentOsControlEnrollmentRevokeRequest =
  RequestBase<"control.enrollment.revoke"> &
    Readonly<{
      principalId: string;
      actorPrincipalId: string;
      reasonCode: string;
    }>;

export type AgentOsControlEnrollmentRequest =
  | AgentOsControlEnrollmentEnrollRequest
  | AgentOsControlEnrollmentRevokeRequest;

export type AgentOsControlEnrollmentEnrollReceipt = ReceiptBase<
  "control.enrollment.enroll.receipt",
  | "NONE"
  | "RBAC_DENIED"
  | "SCOPE_MISMATCH"
  | "LIMIT_EXCEEDED"
  | "POLICY_DENIED"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
  | "REVOKED"
> &
  Readonly<{
    enrollmentId?: string;
    principalId?: string;
    expiresAt?: string;
  }>;

export type AgentOsControlEnrollmentRevokeReceipt = ReceiptBase<
  "control.enrollment.revoke.receipt",
  | "NONE"
  | "RBAC_DENIED"
  | "NOT_FOUND"
  | "TERMINAL"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
> &
  Readonly<{
    enrollmentId?: string;
    principalId?: string;
  }>;

export type AgentOsControlEnrollmentReceipt =
  | AgentOsControlEnrollmentEnrollReceipt
  | AgentOsControlEnrollmentRevokeReceipt;

export type AgentOsControlGovernancePolicyRequest =
  RequestBase<"control.governance-policy.update"> &
    Readonly<{
      actorPrincipalId: string;
      policyRevision: string;
      quota: AgentOsControlV1Quota;
      rbac: AgentOsControlV1Rbac;
    }>;

export type AgentOsControlGovernancePolicyReceipt = ReceiptBase<
  "control.governance-policy.update.receipt",
  | "NONE"
  | "RBAC_DENIED"
  | "POLICY_DENIED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
> &
  Readonly<{
    policyRevision?: string;
  }>;

export type AgentOsControlQueueEnqueueRequest =
  RequestBase<"control.queue.enqueue"> &
    Readonly<{
      queueItemId: string;
      priority: 0 | 1 | 2;
      requestedAt: string;
    }>;

export type AgentOsControlQueueLeaseRequest =
  RequestBase<"control.queue.lease"> &
    Readonly<{
      leaseId: string;
      leaseHostId: string;
      leaseExpiresAt: string;
      queueItemId?: string;
    }>;

export type AgentOsControlQueueCompleteRequest =
  RequestBase<"control.queue.complete"> &
    Readonly<{
      queueItemId: string;
      leaseId: string;
    }>;

export type AgentOsControlQueueCancelRequest =
  RequestBase<"control.queue.cancel"> &
    Readonly<{
      queueItemId: string;
      reasonCode: string;
    }>;

export type AgentOsControlQueuePartitionRequest =
  RequestBase<"control.queue.partition"> &
    Readonly<{
      reasonCode: string;
    }>;

export type AgentOsControlQueueTakeoverRequest =
  RequestBase<"control.queue.takeover"> &
    Readonly<{
      replacementHostId: string;
    }>;

export type AgentOsControlQueueReclaimRequest =
  RequestBase<"control.queue.reclaim"> &
    Readonly<{
      queueItemId: string;
      leaseId: string;
    }>;

export type AgentOsControlQueueRequest =
  | AgentOsControlQueueEnqueueRequest
  | AgentOsControlQueueLeaseRequest
  | AgentOsControlQueueCompleteRequest
  | AgentOsControlQueueCancelRequest
  | AgentOsControlQueuePartitionRequest
  | AgentOsControlQueueTakeoverRequest
  | AgentOsControlQueueReclaimRequest;

type QueueReceiptBase<
  Operation extends AgentOsControlV1ReceiptOperation,
  Code extends string,
  Fields extends object = Record<never, never>,
> = ReceiptBase<Operation, Code> & Readonly<Fields>;

type QueueAllReceiptFields = {
  queueItemId?: string;
  leaseId?: string;
  leaseHostId?: string;
  leaseExpiresAt?: string;
};
type QueueItemLeaseReceiptFields = {
  queueItemId?: string;
  leaseId?: string;
};
type QueueItemReceiptFields = { queueItemId?: string };

export type AgentOsControlQueueEnqueueReceipt = QueueReceiptBase<
  "control.queue.enqueue.receipt",
  | "NONE"
  | "LIMIT_EXCEEDED"
  | "QUOTA_EXCEEDED"
  | "POLICY_DENIED"
  | "PARTITIONED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  QueueAllReceiptFields
>;
export type AgentOsControlQueueLeaseReceipt = QueueReceiptBase<
  "control.queue.lease.receipt",
  | "NONE"
  | "NOT_FOUND"
  | "PARTITIONED"
  | "POLICY_DENIED"
  | "QUOTA_EXCEEDED"
  | "LIMIT_EXCEEDED"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  QueueAllReceiptFields
>;
export type AgentOsControlQueueCompleteReceipt = QueueReceiptBase<
  "control.queue.complete.receipt",
  | "NONE"
  | "NOT_FOUND"
  | "POLICY_DENIED"
  | "TERMINAL"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  QueueItemLeaseReceiptFields
>;
export type AgentOsControlQueueCancelReceipt = QueueReceiptBase<
  "control.queue.cancel.receipt",
  | "NONE"
  | "NOT_FOUND"
  | "TERMINAL"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  QueueItemReceiptFields
>;
export type AgentOsControlQueuePartitionReceipt = QueueReceiptBase<
  "control.queue.partition.receipt",
  | "NONE"
  | "POLICY_DENIED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
>;
export type AgentOsControlQueueTakeoverReceipt = QueueReceiptBase<
  "control.queue.takeover.receipt",
  | "NONE"
  | "POLICY_DENIED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
>;
export type AgentOsControlQueueReclaimReceipt = QueueReceiptBase<
  "control.queue.reclaim.receipt",
  | "NONE"
  | "NOT_FOUND"
  | "POLICY_DENIED"
  | "TERMINAL"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  QueueItemLeaseReceiptFields
>;

export type AgentOsControlQueueReceipt =
  | AgentOsControlQueueEnqueueReceipt
  | AgentOsControlQueueLeaseReceipt
  | AgentOsControlQueueCompleteReceipt
  | AgentOsControlQueueCancelReceipt
  | AgentOsControlQueuePartitionReceipt
  | AgentOsControlQueueTakeoverReceipt
  | AgentOsControlQueueReclaimReceipt;

export type AgentOsControlWorkflowDeclareRequest =
  RequestBase<"control.workflow.declare"> &
    Readonly<{
      workflowId: string;
      stepIds: readonly string[];
      expiresAt: string;
    }>;
export type AgentOsControlWorkflowStartRequest =
  RequestBase<"control.workflow.start"> & Readonly<{ workflowId: string }>;
export type AgentOsControlWorkflowAdvanceRequest =
  RequestBase<"control.workflow.advance"> &
    Readonly<{
      workflowId: string;
      stepId: string;
      status: "succeeded" | "failed";
    }>;
export type AgentOsControlWorkflowCancelRequest =
  RequestBase<"control.workflow.cancel"> & Readonly<{ workflowId: string }>;
export type AgentOsControlWorkflowRequest =
  | AgentOsControlWorkflowDeclareRequest
  | AgentOsControlWorkflowStartRequest
  | AgentOsControlWorkflowAdvanceRequest
  | AgentOsControlWorkflowCancelRequest;

type WorkflowReceiptBase<
  Operation extends AgentOsControlV1ReceiptOperation,
  Code extends string,
  Fields extends object = Record<never, never>,
> = ReceiptBase<Operation, Code> & Readonly<Fields>;

type WorkflowReceiptFields = {
  workflowId?: string;
  workflowStatus?: AgentOsControlV1WorkflowStatus;
};
type WorkflowAdvanceReceiptFields = WorkflowReceiptFields & {
  stepStatus?: AgentOsControlV1WorkflowStepStatus;
};

export type AgentOsControlWorkflowDeclareReceipt = WorkflowReceiptBase<
  "control.workflow.declare.receipt",
  | "NONE"
  | "LIMIT_EXCEEDED"
  | "POLICY_DENIED"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  WorkflowReceiptFields
>;
export type AgentOsControlWorkflowStartReceipt = WorkflowReceiptBase<
  "control.workflow.start.receipt",
  | "NONE"
  | "NOT_FOUND"
  | "TERMINAL"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  WorkflowReceiptFields
>;
export type AgentOsControlWorkflowAdvanceReceipt = WorkflowReceiptBase<
  "control.workflow.advance.receipt",
  | "NONE"
  | "NOT_FOUND"
  | "TERMINAL"
  | "LIMIT_EXCEEDED"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  WorkflowAdvanceReceiptFields
>;
export type AgentOsControlWorkflowCancelReceipt = WorkflowReceiptBase<
  "control.workflow.cancel.receipt",
  | "NONE"
  | "NOT_FOUND"
  | "TERMINAL"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT",
  WorkflowReceiptFields
>;
export type AgentOsControlWorkflowReceipt =
  | AgentOsControlWorkflowDeclareReceipt
  | AgentOsControlWorkflowStartReceipt
  | AgentOsControlWorkflowAdvanceReceipt
  | AgentOsControlWorkflowCancelReceipt;

export type AgentOsControlDeclaredTeamDeclareRequest =
  RequestBase<"control.declared-team.declare"> &
    Readonly<{
      teamId: string;
      members: readonly AgentOsControlV1TeamMember[];
      expiresAt: string;
    }>;
export type AgentOsControlDeclaredTeamUpdateRequest =
  RequestBase<"control.declared-team.update"> &
    Readonly<{
      teamId: string;
      members: readonly AgentOsControlV1TeamMember[];
    }>;
export type AgentOsControlDeclaredTeamRevokeRequest =
  RequestBase<"control.declared-team.revoke"> & Readonly<{ teamId: string }>;
export type AgentOsControlDeclaredTeamRequest =
  | AgentOsControlDeclaredTeamDeclareRequest
  | AgentOsControlDeclaredTeamUpdateRequest
  | AgentOsControlDeclaredTeamRevokeRequest;

type TeamReceiptBase<
  Operation extends AgentOsControlV1ReceiptOperation,
  Code extends string,
> = ReceiptBase<Operation, Code> &
  Readonly<{
    teamId?: string;
    teamStatus?: AgentOsControlV1TeamStatus;
    memberCount?: number;
  }>;

export type AgentOsControlDeclaredTeamDeclareReceipt = TeamReceiptBase<
  "control.declared-team.declare.receipt",
  | "NONE"
  | "LIMIT_EXCEEDED"
  | "POLICY_DENIED"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
>;
export type AgentOsControlDeclaredTeamUpdateReceipt = TeamReceiptBase<
  "control.declared-team.update.receipt",
  | "NONE"
  | "LIMIT_EXCEEDED"
  | "NOT_FOUND"
  | "REVOKED"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
>;
export type AgentOsControlDeclaredTeamRevokeReceipt = TeamReceiptBase<
  "control.declared-team.revoke.receipt",
  | "NONE"
  | "NOT_FOUND"
  | "REVOKED"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
>;
export type AgentOsControlDeclaredTeamReceipt =
  | AgentOsControlDeclaredTeamDeclareReceipt
  | AgentOsControlDeclaredTeamUpdateReceipt
  | AgentOsControlDeclaredTeamRevokeReceipt;

export type AgentOsControlHumanControlDecideRequest =
  RequestBase<"control.human-control.decide"> &
    Readonly<{
      decisionId: string;
      targetId: string;
      principalId: string;
      action: AgentOsControlV1HumanAction;
      expiresAt: string;
      policyRevision: string;
    }>;
export type AgentOsControlHumanControlPolicyUpdateRequest =
  RequestBase<"control.human-control.policy.update"> &
    Readonly<{
      actorPrincipalId: string;
      policyRevision: string;
      policy: AgentOsControlV1HumanPolicy;
    }>;
export type AgentOsControlHumanControlRequest =
  | AgentOsControlHumanControlDecideRequest
  | AgentOsControlHumanControlPolicyUpdateRequest;

export type AgentOsControlHumanControlDecideReceipt = ReceiptBase<
  "control.human-control.decide.receipt",
  | "NONE"
  | "RBAC_DENIED"
  | "POLICY_DENIED"
  | "LIMIT_EXCEEDED"
  | "TERMINAL"
  | "EXPIRED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
> &
  Readonly<{
    decisionId?: string;
    targetId?: string;
    decisionStatus?: "accepted";
  }>;
export type AgentOsControlHumanControlPolicyUpdateReceipt = ReceiptBase<
  "control.human-control.policy.update.receipt",
  | "NONE"
  | "RBAC_DENIED"
  | "POLICY_DENIED"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
> &
  Readonly<{ policyRevision?: string }>;
export type AgentOsControlHumanControlReceipt =
  | AgentOsControlHumanControlDecideReceipt
  | AgentOsControlHumanControlPolicyUpdateReceipt;

export type AgentOsControlAuditAppendRequest =
  RequestBase<"control.audit.append"> &
    Readonly<{
      eventId: string;
      eventType: string;
      actorPrincipalId: string;
      details: Readonly<Record<string, AgentOsControlV1PublicValue>>;
      createdAt: string;
    }>;
export type AgentOsControlAuditAppendReceipt = ReceiptBase<
  "control.audit.append.receipt",
  | "NONE"
  | "LIMIT_EXCEEDED"
  | "INVALID_INPUT"
  | "TERMINAL"
  | "STALE_REVISION"
  | "STALE_FENCE"
  | "IDEMPOTENCY_CONFLICT"
> &
  Readonly<{
    eventId?: string;
    redactedDetails?: Readonly<Record<string, AgentOsControlV1PublicValue>>;
  }>;
export type AgentOsControlAuditRequest = AgentOsControlAuditAppendRequest;
export type AgentOsControlAuditReceipt = AgentOsControlAuditAppendReceipt;

export type AgentOsControlRequest =
  | AgentOsControlAdmissionRequest
  | AgentOsControlEnrollmentRequest
  | AgentOsControlGovernancePolicyRequest
  | AgentOsControlQueueRequest
  | AgentOsControlWorkflowRequest
  | AgentOsControlDeclaredTeamRequest
  | AgentOsControlHumanControlRequest
  | AgentOsControlAuditRequest;

export type AgentOsControlReceipt =
  | AgentOsControlAdmissionReceipt
  | AgentOsControlEnrollmentReceipt
  | AgentOsControlGovernancePolicyReceipt
  | AgentOsControlQueueReceipt
  | AgentOsControlWorkflowReceipt
  | AgentOsControlDeclaredTeamReceipt
  | AgentOsControlHumanControlReceipt
  | AgentOsControlAuditReceipt;

export type AgentOsControlMessage =
  | AgentOsControlRequest
  | AgentOsControlReceipt
  | AgentOsControlServiceRejection;
export type AgentOsControlV1Message = AgentOsControlMessage;

export type AgentOsControlV1ContractErrorCode =
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "UNKNOWN_FIELD"
  | "UNSUPPORTED_VERSION"
  | "UNSUPPORTED_OPERATION"
  | "SENSITIVE_FIELD";

export class AgentOsControlV1ContractError extends Error {
  constructor(
    readonly code: AgentOsControlV1ContractErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AgentOsControlV1ContractError";
  }
}

export { AgentOsControlV1ContractError as AgentOsControlContractError };

const REQUEST_OPERATIONS = new Set<string>(
  AGENT_OS_CONTROL_V1_REQUEST_OPERATIONS,
);
const RECEIPT_OPERATIONS = new Set<string>(
  AGENT_OS_CONTROL_V1_RECEIPT_OPERATIONS,
);
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const MAX_SAFE_COUNTER = Number.MAX_SAFE_INTEGER;
const POSIX_ABSOLUTE_PATH_PATTERN = /(?:^|[\s"'([{=,:;])\/(?!\/)(?:[^/\s]|$)/u;
const DRIVE_PATH_PATTERN = /(?:^|[^A-Za-z0-9_])[A-Za-z]:[\\/]/u;
const UNC_PATH_PATTERN =
  /(?:^|[\s"'([{=,;])(?:\\\\|\/\/)[^\\/\s]+[\\/][^\\/\s]+/u;
const RELATIVE_TRAVERSAL_PATTERN = /(?:^|[\s"'([{=,:;\\/])\.\.(?:[\\/]|$)/u;
const FILE_URI_PATTERN = /(?:^|[^A-Za-z0-9_])file:(?:\/\/|\/)/iu;
const TOKEN_SIGNATURE_PATTERN =
  /(?:^|[^A-Za-z0-9_-])(?:Bearer\s+[A-Za-z0-9._~+/=-]{20,}|(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|npm_[A-Za-z0-9]{30,}|pypi-[A-Za-z0-9_-]{30,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----)(?![A-Za-z0-9_-])/u;
const SENSITIVE_KEY_PATTERN =
  /(?:token|secret|credential|password|authorization|endpoint|localpath|path|workspace)/iu;

const ADMISSION_ADMIT_CODES = [
  "NONE",
  "RBAC_DENIED",
  "QUOTA_EXCEEDED",
  "LIMIT_EXCEEDED",
  "POLICY_DENIED",
  "EXPIRED",
  "STALE_REVISION",
  "STALE_FENCE",
  "IDEMPOTENCY_CONFLICT",
] as const;
const ADMISSION_RELEASE_CODES = [
  "NONE",
  "RBAC_DENIED",
  "NOT_FOUND",
  "TERMINAL",
  "STALE_REVISION",
  "STALE_FENCE",
  "IDEMPOTENCY_CONFLICT",
] as const;
const ENROLLMENT_ENROLL_CODES = [
  "NONE",
  "RBAC_DENIED",
  "SCOPE_MISMATCH",
  "LIMIT_EXCEEDED",
  "POLICY_DENIED",
  "EXPIRED",
  "STALE_REVISION",
  "STALE_FENCE",
  "IDEMPOTENCY_CONFLICT",
  "REVOKED",
] as const;
const ENROLLMENT_REVOKE_CODES = [
  "NONE",
  "RBAC_DENIED",
  "NOT_FOUND",
  "TERMINAL",
  "STALE_REVISION",
  "STALE_FENCE",
  "IDEMPOTENCY_CONFLICT",
] as const;
const GOVERNANCE_CODES = [
  "NONE",
  "RBAC_DENIED",
  "POLICY_DENIED",
  "STALE_REVISION",
  "STALE_FENCE",
  "IDEMPOTENCY_CONFLICT",
] as const;
const QUEUE_CODES = {
  enqueue: [
    "NONE",
    "LIMIT_EXCEEDED",
    "QUOTA_EXCEEDED",
    "POLICY_DENIED",
    "PARTITIONED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  lease: [
    "NONE",
    "NOT_FOUND",
    "PARTITIONED",
    "POLICY_DENIED",
    "QUOTA_EXCEEDED",
    "LIMIT_EXCEEDED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  complete: [
    "NONE",
    "NOT_FOUND",
    "POLICY_DENIED",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  cancel: [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  partition: [
    "NONE",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  takeover: [
    "NONE",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  reclaim: [
    "NONE",
    "NOT_FOUND",
    "POLICY_DENIED",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
} as const;
const WORKFLOW_CODES = {
  declare: [
    "NONE",
    "LIMIT_EXCEEDED",
    "POLICY_DENIED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  start: [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  advance: [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "LIMIT_EXCEEDED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  cancel: [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
} as const;
const TEAM_CODES = {
  declare: [
    "NONE",
    "LIMIT_EXCEEDED",
    "POLICY_DENIED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  update: [
    "NONE",
    "LIMIT_EXCEEDED",
    "NOT_FOUND",
    "REVOKED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  revoke: [
    "NONE",
    "NOT_FOUND",
    "REVOKED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
} as const;
const HUMAN_DECIDE_CODES = [
  "NONE",
  "RBAC_DENIED",
  "POLICY_DENIED",
  "LIMIT_EXCEEDED",
  "TERMINAL",
  "EXPIRED",
  "STALE_REVISION",
  "STALE_FENCE",
  "IDEMPOTENCY_CONFLICT",
] as const;
const HUMAN_POLICY_CODES = [
  "NONE",
  "RBAC_DENIED",
  "POLICY_DENIED",
  "STALE_REVISION",
  "STALE_FENCE",
  "IDEMPOTENCY_CONFLICT",
] as const;
const AUDIT_CODES = [
  "NONE",
  "LIMIT_EXCEEDED",
  "INVALID_INPUT",
  "TERMINAL",
  "STALE_REVISION",
  "STALE_FENCE",
  "IDEMPOTENCY_CONFLICT",
] as const;

const INVALID_SHAPE_VALUE_CODES = [
  "INVALID_SHAPE",
  "INVALID_VALUE",
] as const satisfies readonly AgentOsControlV1RequestRejectionCode[];
const INVALID_SHAPE_VALUE_EXPIRED_CODES = [
  "INVALID_SHAPE",
  "INVALID_VALUE",
  "EXPIRED",
] as const satisfies readonly AgentOsControlV1RequestRejectionCode[];
const INVALID_SHAPE_VALUE_LIMIT_CODES = [
  "INVALID_SHAPE",
  "INVALID_VALUE",
  "LIMIT_EXCEEDED",
] as const satisfies readonly AgentOsControlV1RequestRejectionCode[];

type AgentOsControlV1OperationCodeDefinition = Readonly<{
  requestRejects: readonly AgentOsControlV1RequestRejectionCode[];
  responseCodes: readonly string[];
}>;

const OPERATION_CODE_DEFINITIONS = {
  "control.admission.admit": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: ADMISSION_ADMIT_CODES,
  },
  "control.admission.release": {
    requestRejects: INVALID_SHAPE_VALUE_CODES,
    responseCodes: ADMISSION_RELEASE_CODES,
  },
  "control.enrollment.enroll": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: ENROLLMENT_ENROLL_CODES,
  },
  "control.enrollment.revoke": {
    requestRejects: INVALID_SHAPE_VALUE_CODES,
    responseCodes: ENROLLMENT_REVOKE_CODES,
  },
  "control.governance-policy.update": {
    requestRejects: INVALID_SHAPE_VALUE_LIMIT_CODES,
    responseCodes: GOVERNANCE_CODES,
  },
  "control.queue.enqueue": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: QUEUE_CODES.enqueue,
  },
  "control.queue.lease": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: QUEUE_CODES.lease,
  },
  "control.queue.complete": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: QUEUE_CODES.complete,
  },
  "control.queue.cancel": {
    requestRejects: INVALID_SHAPE_VALUE_CODES,
    responseCodes: QUEUE_CODES.cancel,
  },
  "control.queue.partition": {
    requestRejects: INVALID_SHAPE_VALUE_CODES,
    responseCodes: QUEUE_CODES.partition,
  },
  "control.queue.takeover": {
    requestRejects: INVALID_SHAPE_VALUE_CODES,
    responseCodes: QUEUE_CODES.takeover,
  },
  "control.queue.reclaim": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: QUEUE_CODES.reclaim,
  },
  "control.workflow.declare": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: WORKFLOW_CODES.declare,
  },
  "control.workflow.start": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: WORKFLOW_CODES.start,
  },
  "control.workflow.advance": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: WORKFLOW_CODES.advance,
  },
  "control.workflow.cancel": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: WORKFLOW_CODES.cancel,
  },
  "control.declared-team.declare": {
    requestRejects: INVALID_SHAPE_VALUE_LIMIT_CODES,
    responseCodes: TEAM_CODES.declare,
  },
  "control.declared-team.update": {
    requestRejects: INVALID_SHAPE_VALUE_LIMIT_CODES,
    responseCodes: TEAM_CODES.update,
  },
  "control.declared-team.revoke": {
    requestRejects: INVALID_SHAPE_VALUE_CODES,
    responseCodes: TEAM_CODES.revoke,
  },
  "control.human-control.decide": {
    requestRejects: INVALID_SHAPE_VALUE_EXPIRED_CODES,
    responseCodes: HUMAN_DECIDE_CODES,
  },
  "control.human-control.policy.update": {
    requestRejects: INVALID_SHAPE_VALUE_LIMIT_CODES,
    responseCodes: HUMAN_POLICY_CODES,
  },
  "control.audit.append": {
    requestRejects: INVALID_SHAPE_VALUE_LIMIT_CODES,
    responseCodes: AUDIT_CODES,
  },
} as const satisfies Record<
  AgentOsControlV1RequestOperation,
  AgentOsControlV1OperationCodeDefinition
>;

/**
 * Cross-repository conformance inventory. The operation matrix supplies the
 * stable order and this table supplies the request/service and authority
 * response codes; consumers must import it instead of copying the contract.
 * Audit store failures are service rejections, not authority receipts.
 */
export const AGENT_OS_CONTROL_V1_OPERATION_CODE_INVENTORY = deepFreeze(
  AGENT_OS_CONTROL_V1_OPERATION_MATRIX.map((entry) => {
    const definition = OPERATION_CODE_DEFINITIONS[entry.request];
    return {
      ...entry,
      requestRejects: definition.requestRejects,
      responseCodes: definition.responseCodes,
    };
  }),
);
export const AGENT_OS_CONTROL_V1_OPERATION_INVENTORY =
  AGENT_OS_CONTROL_V1_OPERATION_CODE_INVENTORY;
export const AGENT_OS_CONTROL_V1_CONFORMANCE_INVENTORY =
  AGENT_OS_CONTROL_V1_OPERATION_CODE_INVENTORY;

export function parseAgentOsControlAdmissionRequest(
  input: unknown,
): Readonly<AgentOsControlAdmissionRequest> {
  const operation = readRequestOperation(input, "admission");
  if (operation === "control.admission.admit") {
    const value = requestRecord(input, operation, [
      "admissionId",
      "actorPrincipalId",
      "subjectPrincipalId",
      "units",
      "expiresAt",
    ]);
    return deepFreeze({
      ...requestBase(value, operation),
      admissionId: identifier(value.admissionId, "admissionId"),
      actorPrincipalId: identifier(value.actorPrincipalId, "actorPrincipalId"),
      subjectPrincipalId: identifier(
        value.subjectPrincipalId,
        "subjectPrincipalId",
      ),
      units: positiveCounter(value.units, "units"),
      expiresAt: instant(value.expiresAt, "expiresAt"),
    }) as AgentOsControlAdmissionAdmitRequest;
  }
  const value = requestRecord(input, operation, [
    "admissionId",
    "actorPrincipalId",
  ]);
  return deepFreeze({
    ...requestBase(value, operation),
    admissionId: identifier(value.admissionId, "admissionId"),
    actorPrincipalId: identifier(value.actorPrincipalId, "actorPrincipalId"),
  }) as AgentOsControlAdmissionReleaseRequest;
}

export function parseAgentOsControlAdmissionReceipt(
  input: unknown,
): Readonly<AgentOsControlAdmissionReceipt> {
  const operation = readReceiptOperation(input, "admission");
  if (operation === "control.admission.admit.receipt") {
    const value = receiptRecord(input, operation, [
      "admissionId",
      "expiresAt",
      "units",
      "replay",
    ]);
    const base = receiptBase(value, operation, ADMISSION_ADMIT_CODES);
    const output: Record<string, unknown> = { ...base };
    optional(output, value, "admissionId", (raw) =>
      identifier(raw, "admissionId"),
    );
    optional(output, value, "expiresAt", (raw) => instant(raw, "expiresAt"));
    optional(output, value, "units", (raw) => positiveCounter(raw, "units"));
    optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
    return deepFreeze(output) as AgentOsControlAdmissionAdmitReceipt;
  }
  const value = receiptRecord(input, operation, ["admissionId", "replay"]);
  const base = receiptBase(value, operation, ADMISSION_RELEASE_CODES);
  const output: Record<string, unknown> = { ...base };
  optional(output, value, "admissionId", (raw) =>
    identifier(raw, "admissionId"),
  );
  optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
  return deepFreeze(output) as AgentOsControlAdmissionReleaseReceipt;
}

export function parseAgentOsControlEnrollmentRequest(
  input: unknown,
): Readonly<AgentOsControlEnrollmentRequest> {
  const operation = readRequestOperation(input, "enrollment");
  if (operation === "control.enrollment.enroll") {
    const value = requestRecord(input, operation, [
      "principalId",
      "roles",
      "expiresAt",
      "sponsorPrincipalId",
    ]);
    return deepFreeze({
      ...requestBase(value, operation),
      principalId: identifier(value.principalId, "principalId"),
      roles: identifierList(
        value.roles,
        "roles",
        AGENT_OS_CONTROL_V1_LIMITS.maxRoles,
      ),
      expiresAt: instant(value.expiresAt, "expiresAt"),
      sponsorPrincipalId: identifier(
        value.sponsorPrincipalId,
        "sponsorPrincipalId",
      ),
    }) as AgentOsControlEnrollmentEnrollRequest;
  }
  const value = requestRecord(input, operation, [
    "principalId",
    "actorPrincipalId",
    "reasonCode",
  ]);
  return deepFreeze({
    ...requestBase(value, operation),
    principalId: identifier(value.principalId, "principalId"),
    actorPrincipalId: identifier(value.actorPrincipalId, "actorPrincipalId"),
    reasonCode: identifier(value.reasonCode, "reasonCode"),
  }) as AgentOsControlEnrollmentRevokeRequest;
}

export function parseAgentOsControlEnrollmentReceipt(
  input: unknown,
): Readonly<AgentOsControlEnrollmentReceipt> {
  const operation = readReceiptOperation(input, "enrollment");
  if (operation === "control.enrollment.enroll.receipt") {
    const value = receiptRecord(input, operation, [
      "enrollmentId",
      "principalId",
      "expiresAt",
      "replay",
    ]);
    const base = receiptBase(value, operation, ENROLLMENT_ENROLL_CODES);
    const output: Record<string, unknown> = { ...base };
    optional(output, value, "enrollmentId", (raw) =>
      identifier(raw, "enrollmentId"),
    );
    optional(output, value, "principalId", (raw) =>
      identifier(raw, "principalId"),
    );
    optional(output, value, "expiresAt", (raw) => instant(raw, "expiresAt"));
    optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
    return deepFreeze(output) as AgentOsControlEnrollmentEnrollReceipt;
  }
  const value = receiptRecord(input, operation, [
    "enrollmentId",
    "principalId",
    "replay",
  ]);
  const base = receiptBase(value, operation, ENROLLMENT_REVOKE_CODES);
  const output: Record<string, unknown> = { ...base };
  optional(output, value, "enrollmentId", (raw) =>
    identifier(raw, "enrollmentId"),
  );
  optional(output, value, "principalId", (raw) =>
    identifier(raw, "principalId"),
  );
  optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
  return deepFreeze(output) as AgentOsControlEnrollmentRevokeReceipt;
}

export function parseAgentOsControlGovernancePolicyRequest(
  input: unknown,
): Readonly<AgentOsControlGovernancePolicyRequest> {
  const operation = readRequestOperation(input, "quota-rbac-policy");
  const value = requestRecord(input, operation, [
    "actorPrincipalId",
    "policyRevision",
    "quota",
    "rbac",
  ]);
  return deepFreeze({
    ...requestBase(value, operation),
    actorPrincipalId: identifier(value.actorPrincipalId, "actorPrincipalId"),
    policyRevision: identifier(value.policyRevision, "policyRevision"),
    quota: parseQuota(value.quota),
    rbac: parseRbac(value.rbac),
  }) as AgentOsControlGovernancePolicyRequest;
}

export function parseAgentOsControlGovernancePolicyReceipt(
  input: unknown,
): Readonly<AgentOsControlGovernancePolicyReceipt> {
  const operation = readReceiptOperation(input, "quota-rbac-policy");
  const value = receiptRecord(input, operation, ["policyRevision", "replay"]);
  const base = receiptBase(value, operation, GOVERNANCE_CODES);
  const output: Record<string, unknown> = { ...base };
  optional(output, value, "policyRevision", (raw) =>
    identifier(raw, "policyRevision"),
  );
  optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
  return deepFreeze(output) as AgentOsControlGovernancePolicyReceipt;
}

export function parseAgentOsControlQueueRequest(
  input: unknown,
): Readonly<AgentOsControlQueueRequest> {
  const operation = readRequestOperation(input, "global-queue");
  switch (operation) {
    case "control.queue.enqueue": {
      const value = requestRecord(input, operation, [
        "queueItemId",
        "priority",
        "requestedAt",
      ]);
      return deepFreeze({
        ...requestBase(value, operation),
        queueItemId: identifier(value.queueItemId, "queueItemId"),
        priority: priority(value.priority),
        requestedAt: instant(value.requestedAt, "requestedAt"),
      }) as AgentOsControlQueueEnqueueRequest;
    }
    case "control.queue.lease": {
      const value = requestRecord(
        input,
        operation,
        ["leaseId", "leaseHostId", "leaseExpiresAt"],
        ["queueItemId"],
      );
      const output: Record<string, unknown> = {
        ...requestBase(value, operation),
        leaseId: identifier(value.leaseId, "leaseId"),
        leaseHostId: identifier(value.leaseHostId, "leaseHostId"),
        leaseExpiresAt: instant(value.leaseExpiresAt, "leaseExpiresAt"),
      };
      optional(output, value, "queueItemId", (raw) =>
        identifier(raw, "queueItemId"),
      );
      return deepFreeze(output) as AgentOsControlQueueLeaseRequest;
    }
    case "control.queue.complete": {
      const value = requestRecord(input, operation, ["queueItemId", "leaseId"]);
      return deepFreeze({
        ...requestBase(value, operation),
        queueItemId: identifier(value.queueItemId, "queueItemId"),
        leaseId: identifier(value.leaseId, "leaseId"),
      }) as AgentOsControlQueueCompleteRequest;
    }
    case "control.queue.cancel": {
      const value = requestRecord(input, operation, [
        "queueItemId",
        "reasonCode",
      ]);
      return deepFreeze({
        ...requestBase(value, operation),
        queueItemId: identifier(value.queueItemId, "queueItemId"),
        reasonCode: identifier(value.reasonCode, "reasonCode"),
      }) as AgentOsControlQueueCancelRequest;
    }
    case "control.queue.partition": {
      const value = requestRecord(input, operation, ["reasonCode"]);
      return deepFreeze({
        ...requestBase(value, operation),
        reasonCode: identifier(value.reasonCode, "reasonCode"),
      }) as AgentOsControlQueuePartitionRequest;
    }
    case "control.queue.takeover": {
      const value = requestRecord(input, operation, ["replacementHostId"]);
      return deepFreeze({
        ...requestBase(value, operation),
        replacementHostId: identifier(
          value.replacementHostId,
          "replacementHostId",
        ),
      }) as AgentOsControlQueueTakeoverRequest;
    }
    case "control.queue.reclaim": {
      const value = requestRecord(input, operation, ["queueItemId", "leaseId"]);
      return deepFreeze({
        ...requestBase(value, operation),
        queueItemId: identifier(value.queueItemId, "queueItemId"),
        leaseId: identifier(value.leaseId, "leaseId"),
      }) as AgentOsControlQueueReclaimRequest;
    }
    default:
      fail(
        "UNSUPPORTED_OPERATION",
        "global-queue request operation is not supported",
      );
  }
}

export function parseAgentOsControlQueueReceipt(
  input: unknown,
): Readonly<AgentOsControlQueueReceipt> {
  const operation = readReceiptOperation(input, "global-queue");
  const key = operation.slice(
    "control.queue.".length,
    -".receipt".length,
  ) as keyof typeof QUEUE_CODES;
  const optionalFields =
    key === "enqueue" || key === "lease"
      ? ["queueItemId", "leaseId", "leaseHostId", "leaseExpiresAt", "replay"]
      : key === "complete" || key === "reclaim"
        ? ["queueItemId", "leaseId", "replay"]
        : key === "cancel"
          ? ["queueItemId", "replay"]
          : ["replay"];
  const value = receiptRecord(input, operation, optionalFields);
  const base = receiptBase(value, operation, QUEUE_CODES[key]);
  const output: Record<string, unknown> = { ...base };
  optional(output, value, "queueItemId", (raw) =>
    identifier(raw, "queueItemId"),
  );
  optional(output, value, "leaseId", (raw) => identifier(raw, "leaseId"));
  optional(output, value, "leaseHostId", (raw) =>
    identifier(raw, "leaseHostId"),
  );
  optional(output, value, "leaseExpiresAt", (raw) =>
    instant(raw, "leaseExpiresAt"),
  );
  optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
  return deepFreeze(output) as AgentOsControlQueueReceipt;
}

export function parseAgentOsControlWorkflowRequest(
  input: unknown,
): Readonly<AgentOsControlWorkflowRequest> {
  const operation = readRequestOperation(input, "bounded-workflow");
  switch (operation) {
    case "control.workflow.declare": {
      const value = requestRecord(input, operation, [
        "workflowId",
        "stepIds",
        "expiresAt",
      ]);
      return deepFreeze({
        ...requestBase(value, operation),
        workflowId: identifier(value.workflowId, "workflowId"),
        stepIds: identifierList(
          value.stepIds,
          "stepIds",
          AGENT_OS_CONTROL_V1_LIMITS.maxWorkflowSteps,
        ),
        expiresAt: instant(value.expiresAt, "expiresAt"),
      }) as AgentOsControlWorkflowDeclareRequest;
    }
    case "control.workflow.start":
    case "control.workflow.cancel": {
      const value = requestRecord(input, operation, ["workflowId"]);
      return deepFreeze({
        ...requestBase(value, operation),
        workflowId: identifier(value.workflowId, "workflowId"),
      }) as
        | AgentOsControlWorkflowStartRequest
        | AgentOsControlWorkflowCancelRequest;
    }
    case "control.workflow.advance": {
      const value = requestRecord(input, operation, [
        "workflowId",
        "stepId",
        "status",
      ]);
      if (value.status !== "succeeded" && value.status !== "failed")
        fail("INVALID_VALUE", "workflow advance status is invalid");
      return deepFreeze({
        ...requestBase(value, operation),
        workflowId: identifier(value.workflowId, "workflowId"),
        stepId: identifier(value.stepId, "stepId"),
        status: value.status,
      }) as AgentOsControlWorkflowAdvanceRequest;
    }
    default:
      fail(
        "UNSUPPORTED_OPERATION",
        "bounded-workflow request operation is not supported",
      );
  }
}

export function parseAgentOsControlWorkflowReceipt(
  input: unknown,
): Readonly<AgentOsControlWorkflowReceipt> {
  const operation = readReceiptOperation(input, "bounded-workflow");
  const key = operation.slice(
    "control.workflow.".length,
    -".receipt".length,
  ) as keyof typeof WORKFLOW_CODES;
  const optionalFields =
    key === "advance"
      ? ["workflowId", "workflowStatus", "stepStatus", "replay"]
      : ["workflowId", "workflowStatus", "replay"];
  const value = receiptRecord(input, operation, optionalFields);
  const base = receiptBase(value, operation, WORKFLOW_CODES[key]);
  const output: Record<string, unknown> = { ...base };
  optional(output, value, "workflowId", (raw) => identifier(raw, "workflowId"));
  optional(output, value, "workflowStatus", workflowStatus);
  optional(output, value, "stepStatus", workflowStepStatus);
  optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
  return deepFreeze(output) as AgentOsControlWorkflowReceipt;
}

export function parseAgentOsControlDeclaredTeamRequest(
  input: unknown,
): Readonly<AgentOsControlDeclaredTeamRequest> {
  const operation = readRequestOperation(input, "declared-team");
  if (operation === "control.declared-team.declare") {
    const value = requestRecord(input, operation, [
      "teamId",
      "members",
      "expiresAt",
    ]);
    return deepFreeze({
      ...requestBase(value, operation),
      teamId: identifier(value.teamId, "teamId"),
      members: teamMembers(value.members),
      expiresAt: instant(value.expiresAt, "expiresAt"),
    }) as AgentOsControlDeclaredTeamDeclareRequest;
  }
  if (operation === "control.declared-team.update") {
    const value = requestRecord(input, operation, ["teamId", "members"]);
    return deepFreeze({
      ...requestBase(value, operation),
      teamId: identifier(value.teamId, "teamId"),
      members: teamMembers(value.members),
    }) as AgentOsControlDeclaredTeamUpdateRequest;
  }
  const value = requestRecord(input, operation, ["teamId"]);
  return deepFreeze({
    ...requestBase(value, operation),
    teamId: identifier(value.teamId, "teamId"),
  }) as AgentOsControlDeclaredTeamRevokeRequest;
}

export function parseAgentOsControlDeclaredTeamReceipt(
  input: unknown,
): Readonly<AgentOsControlDeclaredTeamReceipt> {
  const operation = readReceiptOperation(input, "declared-team");
  const key = operation.slice(
    "control.declared-team.".length,
    -".receipt".length,
  ) as keyof typeof TEAM_CODES;
  const value = receiptRecord(input, operation, [
    "teamId",
    "teamStatus",
    "memberCount",
    "replay",
  ]);
  const base = receiptBase(value, operation, TEAM_CODES[key]);
  const output: Record<string, unknown> = { ...base };
  optional(output, value, "teamId", (raw) => identifier(raw, "teamId"));
  optional(output, value, "teamStatus", teamStatus);
  optional(output, value, "memberCount", (raw) =>
    nonNegativeCounter(raw, "memberCount"),
  );
  optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
  return deepFreeze(output) as AgentOsControlDeclaredTeamReceipt;
}

export function parseAgentOsControlHumanControlRequest(
  input: unknown,
): Readonly<AgentOsControlHumanControlRequest> {
  const operation = readRequestOperation(input, "human-control");
  if (operation === "control.human-control.decide") {
    const value = requestRecord(input, operation, [
      "decisionId",
      "targetId",
      "principalId",
      "action",
      "expiresAt",
      "policyRevision",
    ]);
    return deepFreeze({
      ...requestBase(value, operation),
      decisionId: identifier(value.decisionId, "decisionId"),
      targetId: identifier(value.targetId, "targetId"),
      principalId: identifier(value.principalId, "principalId"),
      action: humanAction(value.action),
      expiresAt: instant(value.expiresAt, "expiresAt"),
      policyRevision: identifier(value.policyRevision, "policyRevision"),
    }) as AgentOsControlHumanControlDecideRequest;
  }
  const value = requestRecord(input, operation, [
    "actorPrincipalId",
    "policyRevision",
    "policy",
  ]);
  return deepFreeze({
    ...requestBase(value, operation),
    actorPrincipalId: identifier(value.actorPrincipalId, "actorPrincipalId"),
    policyRevision: identifier(value.policyRevision, "policyRevision"),
    policy: parseHumanPolicy(value.policy),
  }) as AgentOsControlHumanControlPolicyUpdateRequest;
}

export function parseAgentOsControlHumanControlReceipt(
  input: unknown,
): Readonly<AgentOsControlHumanControlReceipt> {
  const operation = readReceiptOperation(input, "human-control");
  if (operation === "control.human-control.decide.receipt") {
    const value = receiptRecord(input, operation, [
      "decisionId",
      "targetId",
      "decisionStatus",
      "replay",
    ]);
    const base = receiptBase(value, operation, HUMAN_DECIDE_CODES);
    const output: Record<string, unknown> = { ...base };
    optional(output, value, "decisionId", (raw) =>
      identifier(raw, "decisionId"),
    );
    optional(output, value, "targetId", (raw) => identifier(raw, "targetId"));
    optional(output, value, "decisionStatus", humanDecisionStatus);
    optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
    return deepFreeze(output) as AgentOsControlHumanControlDecideReceipt;
  }
  const value = receiptRecord(input, operation, ["policyRevision", "replay"]);
  const base = receiptBase(value, operation, HUMAN_POLICY_CODES);
  const output: Record<string, unknown> = { ...base };
  optional(output, value, "policyRevision", (raw) =>
    identifier(raw, "policyRevision"),
  );
  optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
  return deepFreeze(output) as AgentOsControlHumanControlPolicyUpdateReceipt;
}

export function parseAgentOsControlAuditRequest(
  input: unknown,
): Readonly<AgentOsControlAuditRequest> {
  const operation = readRequestOperation(input, "redacted-audit");
  const value = requestRecord(input, operation, [
    "eventId",
    "eventType",
    "actorPrincipalId",
    "details",
    "createdAt",
  ]);
  return deepFreeze({
    ...requestBase(value, operation),
    eventId: identifier(value.eventId, "eventId"),
    eventType: identifier(value.eventType, "eventType"),
    actorPrincipalId: identifier(value.actorPrincipalId, "actorPrincipalId"),
    details: publicRecord(value.details, "details"),
    createdAt: instant(value.createdAt, "createdAt"),
  }) as AgentOsControlAuditRequest;
}

export function parseAgentOsControlAuditReceipt(
  input: unknown,
): Readonly<AgentOsControlAuditReceipt> {
  const operation = readReceiptOperation(input, "redacted-audit");
  const value = receiptRecord(input, operation, [
    "eventId",
    "redactedDetails",
    "replay",
  ]);
  const base = receiptBase(value, operation, AUDIT_CODES);
  const output: Record<string, unknown> = { ...base };
  optional(output, value, "eventId", (raw) => identifier(raw, "eventId"));
  optional(output, value, "redactedDetails", (raw) =>
    publicRecord(raw, "redactedDetails"),
  );
  optional(output, value, "replay", (raw) => booleanValue(raw, "replay"));
  return deepFreeze(output) as AgentOsControlAuditReceipt;
}

/**
 * Parse a pre-authority rejection. This shape is intentionally separate from
 * authority receipts because a parser/service failure has no committed
 * revision or fence to report.
 */
export function parseAgentOsControlServiceRejection(
  input: unknown,
): Readonly<AgentOsControlServiceRejection> {
  const value = record(input, "Control service rejection");
  exact(
    value,
    [
      "schemaVersion",
      "operation",
      "requestId",
      "correlationId",
      "status",
      "code",
      "origin",
    ],
    "Control service rejection",
    ["detail"],
  );
  if (value.schemaVersion !== AGENT_OS_CONTROL_V1_SCHEMA_VERSION)
    fail("UNSUPPORTED_VERSION", "schemaVersion must equal agent-os-control/v1");
  if (value.operation !== AGENT_OS_CONTROL_V1_SERVICE_REJECTION_OPERATION)
    fail("UNSUPPORTED_OPERATION", "service rejection operation is invalid");
  if (value.status !== "rejected")
    fail("INVALID_VALUE", "service rejection status must be rejected");
  if (
    typeof value.code !== "string" ||
    !AGENT_OS_CONTROL_V1_SERVICE_REJECTION_CODES.some(
      (candidate) => candidate === value.code,
    )
  )
    fail("INVALID_VALUE", "service rejection code is invalid");
  if (value.origin !== "parser" && value.origin !== "service")
    fail("INVALID_VALUE", "service rejection origin is invalid");
  if (
    (value.code === "CORRUPT_STORE" || value.code === "SERVICE_UNAVAILABLE") &&
    value.origin !== "service"
  )
    fail(
      "INVALID_VALUE",
      "store/service availability rejections must originate from service",
    );
  const output: Record<string, unknown> = {
    schemaVersion: AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
    operation: AGENT_OS_CONTROL_V1_SERVICE_REJECTION_OPERATION,
    requestId: identifier(value.requestId, "requestId"),
    correlationId: identifier(value.correlationId, "correlationId"),
    status: "rejected",
    code: value.code,
    origin: value.origin,
  };
  optional(output, value, "detail", (raw) => serviceDetail(raw));
  return deepFreeze(output) as AgentOsControlServiceRejection;
}

export function parseAgentOsControlV1ServiceRejection(
  input: unknown,
): Readonly<AgentOsControlV1ServiceRejection> {
  return parseAgentOsControlServiceRejection(input);
}

export function parseAgentOsControlRequest(
  input: unknown,
): Readonly<AgentOsControlRequest> {
  const operation = readOperation(input, "request");
  if (operation.startsWith("control.admission."))
    return parseAgentOsControlAdmissionRequest(input);
  if (operation.startsWith("control.enrollment."))
    return parseAgentOsControlEnrollmentRequest(input);
  if (operation === "control.governance-policy.update")
    return parseAgentOsControlGovernancePolicyRequest(input);
  if (operation.startsWith("control.queue."))
    return parseAgentOsControlQueueRequest(input);
  if (operation.startsWith("control.workflow."))
    return parseAgentOsControlWorkflowRequest(input);
  if (operation.startsWith("control.declared-team."))
    return parseAgentOsControlDeclaredTeamRequest(input);
  if (operation.startsWith("control.human-control."))
    return parseAgentOsControlHumanControlRequest(input);
  return parseAgentOsControlAuditRequest(input);
}

export function parseAgentOsControlReceipt(
  input: unknown,
): Readonly<AgentOsControlReceipt> {
  const operation = readOperation(input, "receipt");
  if (operation.startsWith("control.admission."))
    return parseAgentOsControlAdmissionReceipt(input);
  if (operation.startsWith("control.enrollment."))
    return parseAgentOsControlEnrollmentReceipt(input);
  if (operation === "control.governance-policy.update.receipt")
    return parseAgentOsControlGovernancePolicyReceipt(input);
  if (operation.startsWith("control.queue."))
    return parseAgentOsControlQueueReceipt(input);
  if (operation.startsWith("control.workflow."))
    return parseAgentOsControlWorkflowReceipt(input);
  if (operation.startsWith("control.declared-team."))
    return parseAgentOsControlDeclaredTeamReceipt(input);
  if (operation.startsWith("control.human-control."))
    return parseAgentOsControlHumanControlReceipt(input);
  return parseAgentOsControlAuditReceipt(input);
}

export function parseAgentOsControlV1Request(
  input: unknown,
): Readonly<AgentOsControlRequest> {
  return parseAgentOsControlRequest(input);
}

export function parseAgentOsControlV1Receipt(
  input: unknown,
): Readonly<AgentOsControlReceipt> {
  return parseAgentOsControlReceipt(input);
}

export function canonicalAgentOsControlServiceRejectionSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlServiceRejection(input));
}

export function canonicalAgentOsControlV1ServiceRejectionSource(
  input: unknown,
): string {
  return canonicalAgentOsControlServiceRejectionSource(input);
}

export function createAgentOsControlServiceRejectionDigest(
  input: unknown,
): string {
  return `sha256:${sha256Hex(canonicalAgentOsControlServiceRejectionSource(input))}`;
}

export function createAgentOsControlV1ServiceRejectionDigest(
  input: unknown,
): string {
  return createAgentOsControlServiceRejectionDigest(input);
}

export function encodeAgentOsControlServiceRejection(input: unknown): string {
  return canonicalAgentOsControlServiceRejectionSource(input);
}

export function encodeAgentOsControlV1ServiceRejection(input: unknown): string {
  return encodeAgentOsControlServiceRejection(input);
}

export function decodeAgentOsControlServiceRejection(
  source: string,
): Readonly<AgentOsControlServiceRejection> {
  if (typeof source !== "string")
    fail("INVALID_VALUE", "encoded service rejection must be a string");
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    fail("INVALID_VALUE", "encoded service rejection is not valid JSON");
  }
  return parseAgentOsControlServiceRejection(value);
}

export function decodeAgentOsControlV1ServiceRejection(
  source: string,
): Readonly<AgentOsControlV1ServiceRejection> {
  return decodeAgentOsControlServiceRejection(source);
}

export function canonicalAgentOsControlRequestSource(input: unknown): string {
  return canonicalJson(parseAgentOsControlRequest(input));
}

export function canonicalAgentOsControlReceiptSource(input: unknown): string {
  return canonicalJson(parseAgentOsControlReceipt(input));
}

export function canonicalAgentOsControlV1Source(input: unknown): string {
  const value = record(input, "Control message");
  if (value.operation === AGENT_OS_CONTROL_V1_SERVICE_REJECTION_OPERATION)
    return canonicalAgentOsControlServiceRejectionSource(value);
  const operation = readOperation(value, "Control message");
  return RECEIPT_OPERATIONS.has(operation)
    ? canonicalAgentOsControlReceiptSource(input)
    : canonicalAgentOsControlRequestSource(input);
}

export function createAgentOsControlRequestDigest(input: unknown): string {
  return `sha256:${sha256Hex(canonicalAgentOsControlRequestSource(input))}`;
}

export function createAgentOsControlReceiptDigest(input: unknown): string {
  return `sha256:${sha256Hex(canonicalAgentOsControlReceiptSource(input))}`;
}

export function createAgentOsControlV1Digest(input: unknown): string {
  return `sha256:${sha256Hex(canonicalAgentOsControlV1Source(input))}`;
}

/** Canonical JSON is the wire codec; no authority or transport is implied. */
export function encodeAgentOsControlV1(input: unknown): string {
  return canonicalAgentOsControlV1Source(input);
}

export function decodeAgentOsControlV1(
  source: string,
): Readonly<AgentOsControlMessage> {
  if (typeof source !== "string")
    fail("INVALID_VALUE", "encoded source must be a string");
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    fail("INVALID_VALUE", "encoded source is not valid JSON");
  }
  return parseAgentOsControlV1(value);
}

export function parseAgentOsControlV1(
  input: unknown,
): Readonly<AgentOsControlMessage> {
  const value = record(input, "Control message");
  if (value.operation === AGENT_OS_CONTROL_V1_SERVICE_REJECTION_OPERATION)
    return parseAgentOsControlServiceRejection(value);
  const operation = readOperation(value, "Control message");
  return RECEIPT_OPERATIONS.has(operation)
    ? parseAgentOsControlReceipt(input)
    : parseAgentOsControlRequest(input);
}

export function canonicalAgentOsControlAdmissionRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlAdmissionRequest(input));
}
export function canonicalAgentOsControlAdmissionReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlAdmissionReceipt(input));
}
export function canonicalAgentOsControlEnrollmentRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlEnrollmentRequest(input));
}
export function canonicalAgentOsControlEnrollmentReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlEnrollmentReceipt(input));
}
export function canonicalAgentOsControlGovernancePolicyRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlGovernancePolicyRequest(input));
}
export function canonicalAgentOsControlGovernancePolicyReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlGovernancePolicyReceipt(input));
}
export function canonicalAgentOsControlQueueRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlQueueRequest(input));
}
export function canonicalAgentOsControlQueueReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlQueueReceipt(input));
}
export function canonicalAgentOsControlWorkflowRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlWorkflowRequest(input));
}
export function canonicalAgentOsControlWorkflowReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlWorkflowReceipt(input));
}
export function canonicalAgentOsControlDeclaredTeamRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlDeclaredTeamRequest(input));
}
export function canonicalAgentOsControlDeclaredTeamReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlDeclaredTeamReceipt(input));
}
export function canonicalAgentOsControlHumanControlRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlHumanControlRequest(input));
}
export function canonicalAgentOsControlHumanControlReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlHumanControlReceipt(input));
}
export function canonicalAgentOsControlAuditRequestSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlAuditRequest(input));
}
export function canonicalAgentOsControlAuditReceiptSource(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsControlAuditReceipt(input));
}

function parseAgentOsControlV1FamilyOperation(
  input: unknown,
  kind: "request" | "receipt",
  capability: AgentOsControlV1Capability,
): string {
  const operation = readOperation(input, kind);
  const allowed = AGENT_OS_CONTROL_V1_OPERATION_MATRIX.filter(
    (entry) => entry.capability === capability,
  ).map((entry) => (kind === "request" ? entry.request : entry.receipt));
  if (!allowed.some((candidate) => candidate === operation))
    fail(
      "UNSUPPORTED_OPERATION",
      `${capability} ${kind} operation is not supported`,
    );
  return operation;
}

function readRequestOperation(
  input: unknown,
  capability: AgentOsControlV1Capability,
): AgentOsControlV1RequestOperation {
  const operation = parseAgentOsControlV1FamilyOperation(
    input,
    "request",
    capability,
  );
  return operation as AgentOsControlV1RequestOperation;
}

function readReceiptOperation(
  input: unknown,
  capability: AgentOsControlV1Capability,
): AgentOsControlV1ReceiptOperation {
  const operation = parseAgentOsControlV1FamilyOperation(
    input,
    "receipt",
    capability,
  );
  return operation as AgentOsControlV1ReceiptOperation;
}

function readOperation(
  input: unknown,
  kind: "request" | "receipt" | string,
): string {
  const value = record(input, "Control message");
  if (typeof value.operation !== "string")
    fail("UNSUPPORTED_OPERATION", "operation is invalid");
  const operation = value.operation;
  if (
    (kind === "request" && !REQUEST_OPERATIONS.has(operation)) ||
    (kind === "receipt" && !RECEIPT_OPERATIONS.has(operation)) ||
    (kind !== "request" &&
      kind !== "receipt" &&
      !REQUEST_OPERATIONS.has(operation) &&
      !RECEIPT_OPERATIONS.has(operation))
  )
    fail("UNSUPPORTED_OPERATION", `unsupported Control ${kind} operation`);
  return operation;
}

function requestRecord(
  input: unknown,
  operation: string,
  requiredFields: readonly string[],
  optionalFields: readonly string[] = [],
): Record<string, unknown> {
  const value = record(input, "Control request");
  exact(
    value,
    [
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
      ...requiredFields,
    ],
    "Control request",
    optionalFields,
  );
  if (value.schemaVersion !== AGENT_OS_CONTROL_V1_SCHEMA_VERSION)
    fail("UNSUPPORTED_VERSION", "schemaVersion must equal agent-os-control/v1");
  if (value.operation !== operation)
    fail(
      "UNSUPPORTED_OPERATION",
      "request operation does not match the family",
    );
  return value;
}

function receiptRecord(
  input: unknown,
  operation: string,
  optionalFields: readonly string[],
): Record<string, unknown> {
  const value = record(input, "Control receipt");
  receiptRequiredAndOptional(value, optionalFields);
  if (value.schemaVersion !== AGENT_OS_CONTROL_V1_SCHEMA_VERSION)
    fail("UNSUPPORTED_VERSION", "schemaVersion must equal agent-os-control/v1");
  if (value.operation !== operation)
    fail(
      "UNSUPPORTED_OPERATION",
      "receipt operation does not match the family",
    );
  return value;
}

function requestBase(
  value: Record<string, unknown>,
  operation: AgentOsControlV1RequestOperation,
): RequestBase<AgentOsControlV1RequestOperation> {
  return {
    schemaVersion: AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
    operation,
    requestId: identifier(value.requestId, "requestId"),
    correlationId: identifier(value.correlationId, "correlationId"),
    tenantId: identifier(value.tenantId, "tenantId"),
    workloadId: identifier(value.workloadId, "workloadId"),
    hostId: identifier(value.hostId, "hostId"),
    idempotencyKey: identifier(value.idempotencyKey, "idempotencyKey"),
    expectedRevision: nonNegativeCounter(
      value.expectedRevision,
      "expectedRevision",
    ),
    expectedFence: nonNegativeCounter(value.expectedFence, "expectedFence"),
  };
}

function receiptBase(
  value: Record<string, unknown>,
  operation: AgentOsControlV1ReceiptOperation,
  codes: readonly string[],
): ReceiptBase<AgentOsControlV1ReceiptOperation, string> {
  const status = value.status;
  if (status !== "accepted" && status !== "rejected")
    fail("INVALID_VALUE", "receipt status is invalid");
  if (typeof value.code !== "string" || !codes.includes(value.code))
    fail("INVALID_VALUE", "receipt code is invalid for the operation");
  if ((status === "accepted") !== (value.code === "NONE"))
    fail(
      "INVALID_VALUE",
      "accepted receipts must use NONE and rejected receipts a rejection code",
    );
  return {
    schemaVersion: AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
    operation,
    requestId: identifier(value.requestId, "requestId"),
    correlationId: identifier(value.correlationId, "correlationId"),
    status,
    code: value.code,
    revision: nonNegativeCounter(value.revision, "revision"),
    fence: nonNegativeCounter(value.fence, "fence"),
  };
}

function parseQuota(input: unknown): AgentOsControlV1Quota {
  const value = record(input, "quota");
  exact(
    value,
    ["revision", "maxActiveAdmissions", "maxUnits", "maxAdmissionTtlMs"],
    "quota",
  );
  const maxActiveAdmissions = positiveCounter(
    value.maxActiveAdmissions,
    "quota.maxActiveAdmissions",
  );
  const maxUnits = positiveCounter(value.maxUnits, "quota.maxUnits");
  const maxAdmissionTtlMs = positiveCounter(
    value.maxAdmissionTtlMs,
    "quota.maxAdmissionTtlMs",
  );
  return deepFreeze({
    revision: identifier(value.revision, "quota.revision"),
    maxActiveAdmissions,
    maxUnits,
    maxAdmissionTtlMs,
  });
}

function parseRbac(input: unknown): AgentOsControlV1Rbac {
  const value = record(input, "rbac");
  exact(value, ["revision", "rolePermissions"], "rbac");
  const permissions = record(value.rolePermissions, "rbac.rolePermissions");
  const roles = Object.keys(permissions);
  if (roles.length === 0 || roles.length > AGENT_OS_CONTROL_V1_LIMITS.maxRoles)
    fail("INVALID_VALUE", "rbac.rolePermissions must contain bounded roles");
  const rolePermissions: Record<string, readonly string[]> = {};
  for (const role of roles) {
    const roleId = identifier(role, "rbac role");
    defineOwn(
      rolePermissions,
      roleId,
      identifierList(
        permissions[role],
        `rbac.rolePermissions.${roleId}`,
        AGENT_OS_CONTROL_V1_LIMITS.maxPermissionsPerRole,
        false,
      ),
    );
  }
  return deepFreeze({
    revision: identifier(value.revision, "rbac.revision"),
    rolePermissions,
  });
}

function parseHumanPolicy(input: unknown): AgentOsControlV1HumanPolicy {
  const value = record(input, "human control policy");
  exact(
    value,
    [
      "revision",
      "maxDecisions",
      "maxDecisionTtlMs",
      "roleActions",
      "principalRoles",
    ],
    "human control policy",
  );
  const roleActionsValue = record(value.roleActions, "policy.roleActions");
  const roleActions: Record<
    string,
    readonly AgentOsControlV1HumanPolicyAction[]
  > = {};
  const actionRoles = Object.keys(roleActionsValue);
  if (actionRoles.length > AGENT_OS_CONTROL_V1_LIMITS.maxPolicyEntries)
    fail("INVALID_VALUE", "policy.roleActions exceeds the field limit");
  for (const role of actionRoles) {
    const roleId = identifier(role, "policy role");
    const actions = identifierList(
      roleActionsValue[role],
      `policy.roleActions.${roleId}`,
      AGENT_OS_CONTROL_V1_LIMITS.maxHumanActionsPerRole,
      false,
    );
    if (actions.some((action) => !isHumanPolicyAction(action)))
      fail(
        "INVALID_VALUE",
        `policy.roleActions.${roleId} contains an invalid action`,
      );
    defineOwn(
      roleActions,
      roleId,
      actions as readonly AgentOsControlV1HumanPolicyAction[],
    );
  }
  const principalRolesValue = record(
    value.principalRoles,
    "policy.principalRoles",
  );
  const principalRoles: Record<string, readonly string[]> = {};
  const principals = Object.keys(principalRolesValue);
  if (principals.length > AGENT_OS_CONTROL_V1_LIMITS.maxPolicyEntries)
    fail("INVALID_VALUE", "policy.principalRoles exceeds the field limit");
  for (const principal of principals) {
    const principalId = identifier(principal, "policy principal");
    defineOwn(
      principalRoles,
      principalId,
      identifierList(
        principalRolesValue[principal],
        `policy.principalRoles.${principalId}`,
        AGENT_OS_CONTROL_V1_LIMITS.maxHumanPolicyRoles,
        false,
      ),
    );
  }
  return deepFreeze({
    revision: identifier(value.revision, "policy.revision"),
    maxDecisions: positiveCounter(value.maxDecisions, "policy.maxDecisions"),
    maxDecisionTtlMs: positiveCounter(
      value.maxDecisionTtlMs,
      "policy.maxDecisionTtlMs",
    ),
    roleActions,
    principalRoles,
  });
}

function teamMembers(input: unknown): readonly AgentOsControlV1TeamMember[] {
  const value = denseArray(
    input,
    "members",
    AGENT_OS_CONTROL_V1_LIMITS.maxTeamMembers,
  );
  if (value.length === 0)
    fail("INVALID_VALUE", "members must contain at least one member");
  const seen = new Set<string>();
  const result = value.map((entry, index) => {
    const member = record(entry, `members[${index}]`);
    exact(member, ["principalId", "role"], `members[${index}]`);
    const principalId = identifier(
      member.principalId,
      `members[${index}].principalId`,
    );
    if (seen.has(principalId))
      fail("INVALID_VALUE", "members contain duplicate principals");
    seen.add(principalId);
    return Object.freeze({
      principalId,
      role: identifier(member.role, `members[${index}].role`),
    });
  });
  return Object.freeze(result);
}

function publicRecord(
  input: unknown,
  label: string,
): Readonly<Record<string, AgentOsControlV1PublicValue>> {
  const value = record(input, label);
  const result: Record<string, AgentOsControlV1PublicValue> = {};
  const keys = Object.keys(value);
  if (keys.length > AGENT_OS_CONTROL_V1_LIMITS.maxPublicObjectFields)
    fail("INVALID_VALUE", `${label} has too many fields`);
  for (const key of keys) {
    if (SENSITIVE_KEY_PATTERN.test(key))
      fail("SENSITIVE_FIELD", `${label}.${key} is not public`);
    defineOwn(result, key, publicValue(value[key], `${label}.${key}`, 1));
  }
  return deepFreeze(result);
}

function publicValue(
  input: unknown,
  label: string,
  depth: number,
  ancestors = new Set<object>(),
): AgentOsControlV1PublicValue {
  if (depth > AGENT_OS_CONTROL_V1_LIMITS.maxPublicDepth)
    fail("INVALID_VALUE", `${label} exceeds the public value depth limit`);
  if (input === null || typeof input === "boolean") return input;
  if (typeof input === "string") {
    if (input.length > AGENT_OS_CONTROL_V1_LIMITS.maxPublicStringLength)
      fail("INVALID_VALUE", `${label} is too long`);
    if (containsSensitivePublicValue(input))
      fail(
        "SENSITIVE_FIELD",
        `${label} contains a path or credential signature`,
      );
    return input;
  }
  if (typeof input === "number") {
    if (!Number.isFinite(input))
      fail("INVALID_VALUE", `${label} must be finite`);
    return input;
  }
  if (typeof input !== "object" || input === null)
    fail("INVALID_SHAPE", `${label} must be a JSON value`);
  const objectInput = input;
  if (ancestors.has(objectInput))
    fail("INVALID_VALUE", `${label} must not contain a cycle`);
  ancestors.add(objectInput);
  if (Array.isArray(objectInput)) {
    const values = denseArray(
      objectInput,
      label,
      AGENT_OS_CONTROL_V1_LIMITS.maxPublicArrayItems,
    );
    const result = Object.freeze(
      values.map((entry, index) =>
        publicValue(entry, `${label}[${index}]`, depth + 1, ancestors),
      ),
    );
    ancestors.delete(objectInput);
    return result;
  }
  const value = record(objectInput, label);
  const result: Record<string, AgentOsControlV1PublicValue> = {};
  const keys = Object.keys(value);
  if (keys.length > AGENT_OS_CONTROL_V1_LIMITS.maxPublicObjectFields)
    fail("INVALID_VALUE", `${label} has too many fields`);
  for (const key of keys) {
    if (SENSITIVE_KEY_PATTERN.test(key))
      fail("SENSITIVE_FIELD", `${label}.${key} is not public`);
    defineOwn(
      result,
      key,
      publicValue(value[key], `${label}.${key}`, depth + 1, ancestors),
    );
  }
  ancestors.delete(objectInput);
  return Object.freeze(result);
}

function serviceDetail(input: unknown): string {
  const value = publicValue(input, "detail", 1);
  if (typeof value !== "string")
    fail("INVALID_VALUE", "service rejection detail must be a string");
  return value;
}

function containsSensitivePublicValue(value: string): boolean {
  return (
    POSIX_ABSOLUTE_PATH_PATTERN.test(value) ||
    DRIVE_PATH_PATTERN.test(value) ||
    UNC_PATH_PATTERN.test(value) ||
    RELATIVE_TRAVERSAL_PATTERN.test(value) ||
    FILE_URI_PATTERN.test(value) ||
    TOKEN_SIGNATURE_PATTERN.test(value)
  );
}

function identifierList(
  input: unknown,
  label: string,
  maxLength: number,
  requireNonEmpty = true,
): readonly string[] {
  const values = denseArray(input, label, maxLength);
  if (requireNonEmpty && values.length === 0)
    fail("INVALID_VALUE", `${label} must not be empty`);
  const result = values.map((entry, index) =>
    identifier(entry, `${label}[${index}]`),
  );
  if (new Set(result).size !== result.length)
    fail("INVALID_VALUE", `${label} contains duplicates`);
  return Object.freeze(result);
}

function denseArray(
  input: unknown,
  label: string,
  maxLength: number,
): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  if (input.length > maxLength)
    fail("INVALID_VALUE", `${label} exceeds ${maxLength}`);
  if (Object.getOwnPropertySymbols(input).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (key === "length") continue;
    if (
      !/^(?:0|[1-9][0-9]*)$/u.test(key) ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data item`);
  }
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value")
    )
      fail("INVALID_SHAPE", `${label} must be dense data`);
  }
  return input;
}

function record(input: unknown, label: string): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Object.getOwnPropertySymbols(input).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data field`);
  }
  return input as Record<string, unknown>;
}

function exact(
  value: Record<string, unknown>,
  required: readonly string[],
  label: string,
  optionalFields: readonly string[] = [],
): void {
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optionalFields]);
  if (
    keys.some((key) => !allowed.has(key)) ||
    required.some((key) => !(key in value))
  )
    fail("UNKNOWN_FIELD", `${label} contains unknown or missing fields`);
}

function receiptRequiredAndOptional(
  value: Record<string, unknown>,
  optionalFields: readonly string[],
): void {
  const required = [
    "schemaVersion",
    "operation",
    "requestId",
    "correlationId",
    "status",
    "code",
    "revision",
    "fence",
  ];
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optionalFields]);
  if (
    keys.some((key) => !allowed.has(key)) ||
    required.some((key) => !(key in value))
  )
    fail("UNKNOWN_FIELD", "Control receipt contains unknown or missing fields");
}

function optional(
  output: Record<string, unknown>,
  value: Record<string, unknown>,
  key: string,
  parse: (input: unknown) => unknown,
): void {
  if (Object.prototype.hasOwnProperty.call(value, key))
    output[key] = parse(value[key]);
}

function defineOwn<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function identifier(input: unknown, label: string): string {
  if (typeof input !== "string" || !IDENTIFIER_PATTERN.test(input))
    fail("INVALID_VALUE", `${label} must be an opaque identifier`);
  return input;
}

function instant(input: unknown, label: string): string {
  if (typeof input !== "string" || !INSTANT_PATTERN.test(input))
    fail(
      "INVALID_VALUE",
      `${label} must be canonical RFC3339 UTC milliseconds`,
    );
  const date = new Date(input);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== input)
    fail("INVALID_VALUE", `${label} is invalid`);
  return input;
}

function nonNegativeCounter(input: unknown, label: string): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < 0 ||
    input > MAX_SAFE_COUNTER
  )
    fail("INVALID_VALUE", `${label} must be a non-negative safe integer`);
  return input;
}

function positiveCounter(input: unknown, label: string): number {
  const value = nonNegativeCounter(input, label);
  if (value === 0) fail("INVALID_VALUE", `${label} must be positive`);
  return value;
}

function booleanValue(input: unknown, label: string): boolean {
  if (typeof input !== "boolean")
    fail("INVALID_VALUE", `${label} must be boolean`);
  return input;
}

function priority(input: unknown): 0 | 1 | 2 {
  if (input !== 0 && input !== 1 && input !== 2)
    fail("INVALID_VALUE", "priority is invalid");
  return input;
}

function workflowStatus(input: unknown): AgentOsControlV1WorkflowStatus {
  if (
    input !== "declared" &&
    input !== "running" &&
    input !== "succeeded" &&
    input !== "failed" &&
    input !== "cancelled"
  )
    fail("INVALID_VALUE", "workflowStatus is invalid");
  return input;
}

function workflowStepStatus(
  input: unknown,
): AgentOsControlV1WorkflowStepStatus {
  if (input !== "pending" && input !== "succeeded" && input !== "failed")
    fail("INVALID_VALUE", "stepStatus is invalid");
  return input;
}

function teamStatus(input: unknown): AgentOsControlV1TeamStatus {
  if (input !== "active" && input !== "revoked")
    fail("INVALID_VALUE", "teamStatus is invalid");
  return input;
}

function humanAction(input: unknown): AgentOsControlV1HumanAction {
  if (input !== "approve" && input !== "deny" && input !== "cancel")
    fail("INVALID_VALUE", "human action is invalid");
  return input;
}

function humanDecisionStatus(input: unknown): "accepted" {
  if (input !== "accepted") fail("INVALID_VALUE", "decisionStatus is invalid");
  return input;
}

function isHumanPolicyAction(
  input: string,
): input is AgentOsControlV1HumanPolicyAction {
  return (
    input === "approve" ||
    input === "deny" ||
    input === "cancel" ||
    input === "policy.write"
  );
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail("INVALID_VALUE", "canonical value must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = record(value, "canonical value");
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

function fail(code: AgentOsControlV1ContractErrorCode, message: string): never {
  throw new AgentOsControlV1ContractError(code, message);
}
