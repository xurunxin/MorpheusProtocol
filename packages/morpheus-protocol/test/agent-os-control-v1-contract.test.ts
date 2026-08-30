import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_CONTROL_V1_OPERATION_MATRIX,
  AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
  AgentOsControlV1ContractError,
  AgentOsControlV1,
  canonicalAgentOsControlV1Source,
  decodeAgentOsControlV1,
  encodeAgentOsControlV1,
  parseAgentOsControlV1,
  parseAgentOsControlAdmissionRequest,
  parseAgentOsControlAuditReceipt,
  parseAgentOsControlDeclaredTeamRequest,
  parseAgentOsControlGovernancePolicyRequest,
  parseAgentOsControlHumanControlRequest,
  parseAgentOsControlQueueRequest,
  parseAgentOsControlWorkflowRequest,
} from "../src/index.js";

const instant = "2026-08-30T00:00:00.000Z";

function requestBase(operation: string): Record<string, unknown> {
  return {
    schemaVersion: AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
    operation,
    requestId: "request.1",
    correlationId: "correlation.1",
    tenantId: "tenant.1",
    workloadId: "workload.1",
    hostId: "host.1",
    idempotencyKey: "idempotency.1",
    expectedRevision: 0,
    expectedFence: 0,
  };
}

function receiptBase(operation: string): Record<string, unknown> {
  return {
    schemaVersion: AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
    operation,
    requestId: "request.1",
    correlationId: "correlation.1",
    status: "accepted",
    code: "NONE",
    revision: 1,
    fence: 0,
  };
}

function requests(): readonly Record<string, unknown>[] {
  return [
    {
      ...requestBase("control.admission.admit"),
      admissionId: "admission.1",
      actorPrincipalId: "principal.actor",
      subjectPrincipalId: "principal.subject",
      units: 1,
      expiresAt: instant,
    },
    {
      ...requestBase("control.admission.release"),
      admissionId: "admission.1",
      actorPrincipalId: "principal.actor",
    },
    {
      ...requestBase("control.enrollment.enroll"),
      principalId: "principal.subject",
      roles: ["operator"],
      expiresAt: instant,
      sponsorPrincipalId: "principal.actor",
    },
    {
      ...requestBase("control.enrollment.revoke"),
      principalId: "principal.subject",
      actorPrincipalId: "principal.actor",
      reasonCode: "operator.request",
    },
    {
      ...requestBase("control.governance-policy.update"),
      actorPrincipalId: "principal.actor",
      policyRevision: "policy.1",
      quota: {
        revision: "quota.1",
        maxActiveAdmissions: 2,
        maxUnits: 4,
        maxAdmissionTtlMs: 60_000,
      },
      rbac: {
        revision: "rbac.1",
        rolePermissions: { operator: ["control.admission.admit"] },
      },
    },
    {
      ...requestBase("control.queue.enqueue"),
      queueItemId: "queue.1",
      priority: 1,
      requestedAt: instant,
    },
    {
      ...requestBase("control.queue.lease"),
      leaseId: "lease.1",
      leaseHostId: "host.1",
      leaseExpiresAt: instant,
      queueItemId: "queue.1",
    },
    {
      ...requestBase("control.queue.complete"),
      queueItemId: "queue.1",
      leaseId: "lease.1",
    },
    {
      ...requestBase("control.queue.cancel"),
      queueItemId: "queue.1",
      reasonCode: "operator.request",
    },
    {
      ...requestBase("control.queue.partition"),
      reasonCode: "network.partition",
    },
    {
      ...requestBase("control.queue.takeover"),
      replacementHostId: "host.2",
    },
    {
      ...requestBase("control.queue.reclaim"),
      queueItemId: "queue.1",
      leaseId: "lease.1",
    },
    {
      ...requestBase("control.workflow.declare"),
      workflowId: "workflow.1",
      stepIds: ["step.1"],
      expiresAt: instant,
    },
    {
      ...requestBase("control.workflow.start"),
      workflowId: "workflow.1",
    },
    {
      ...requestBase("control.workflow.advance"),
      workflowId: "workflow.1",
      stepId: "step.1",
      status: "succeeded",
    },
    {
      ...requestBase("control.workflow.cancel"),
      workflowId: "workflow.1",
    },
    {
      ...requestBase("control.declared-team.declare"),
      teamId: "team.1",
      members: [{ principalId: "principal.subject", role: "operator" }],
      expiresAt: instant,
    },
    {
      ...requestBase("control.declared-team.update"),
      teamId: "team.1",
      members: [{ principalId: "principal.subject", role: "operator" }],
    },
    {
      ...requestBase("control.declared-team.revoke"),
      teamId: "team.1",
    },
    {
      ...requestBase("control.human-control.decide"),
      decisionId: "decision.1",
      targetId: "workflow.1",
      principalId: "principal.subject",
      action: "approve",
      expiresAt: instant,
      policyRevision: "human-policy.1",
    },
    {
      ...requestBase("control.human-control.policy.update"),
      actorPrincipalId: "principal.actor",
      policyRevision: "human-policy.1",
      policy: {
        revision: "human-policy.1",
        maxDecisions: 2,
        maxDecisionTtlMs: 60_000,
        roleActions: { operator: ["approve", "deny"] },
        principalRoles: { "principal.subject": ["operator"] },
      },
    },
    {
      ...requestBase("control.audit.append"),
      eventId: "event.1",
      eventType: "control.accepted",
      actorPrincipalId: "principal.actor",
      details: { operation: "control.admission.admit", count: 1 },
      createdAt: instant,
    },
  ];
}

function receipts(): readonly Record<string, unknown>[] {
  return [
    {
      ...receiptBase("control.admission.admit.receipt"),
      admissionId: "admission.1",
      expiresAt: instant,
      units: 1,
      replay: false,
    },
    {
      ...receiptBase("control.admission.release.receipt"),
      admissionId: "admission.1",
      replay: false,
    },
    {
      ...receiptBase("control.enrollment.enroll.receipt"),
      enrollmentId: "enrollment.1",
      principalId: "principal.subject",
      expiresAt: instant,
      replay: false,
    },
    {
      ...receiptBase("control.enrollment.revoke.receipt"),
      enrollmentId: "enrollment.1",
      principalId: "principal.subject",
      replay: false,
    },
    {
      ...receiptBase("control.governance-policy.update.receipt"),
      policyRevision: "policy.1",
      replay: false,
    },
    {
      ...receiptBase("control.queue.enqueue.receipt"),
      queueItemId: "queue.1",
      leaseId: "lease.1",
      leaseHostId: "host.1",
      leaseExpiresAt: instant,
      replay: false,
    },
    {
      ...receiptBase("control.queue.lease.receipt"),
      queueItemId: "queue.1",
      leaseId: "lease.1",
      leaseHostId: "host.1",
      leaseExpiresAt: instant,
      replay: false,
    },
    {
      ...receiptBase("control.queue.complete.receipt"),
      queueItemId: "queue.1",
      leaseId: "lease.1",
      replay: false,
    },
    {
      ...receiptBase("control.queue.cancel.receipt"),
      queueItemId: "queue.1",
      replay: false,
    },
    { ...receiptBase("control.queue.partition.receipt"), replay: false },
    { ...receiptBase("control.queue.takeover.receipt"), replay: false },
    {
      ...receiptBase("control.queue.reclaim.receipt"),
      queueItemId: "queue.1",
      leaseId: "lease.1",
      replay: false,
    },
    {
      ...receiptBase("control.workflow.declare.receipt"),
      workflowId: "workflow.1",
      workflowStatus: "declared",
      replay: false,
    },
    {
      ...receiptBase("control.workflow.start.receipt"),
      workflowId: "workflow.1",
      workflowStatus: "running",
      replay: false,
    },
    {
      ...receiptBase("control.workflow.advance.receipt"),
      workflowId: "workflow.1",
      workflowStatus: "succeeded",
      stepStatus: "succeeded",
      replay: false,
    },
    {
      ...receiptBase("control.workflow.cancel.receipt"),
      workflowId: "workflow.1",
      workflowStatus: "cancelled",
      replay: false,
    },
    {
      ...receiptBase("control.declared-team.declare.receipt"),
      teamId: "team.1",
      teamStatus: "active",
      memberCount: 1,
      replay: false,
    },
    {
      ...receiptBase("control.declared-team.update.receipt"),
      teamId: "team.1",
      teamStatus: "active",
      memberCount: 1,
      replay: false,
    },
    {
      ...receiptBase("control.declared-team.revoke.receipt"),
      teamId: "team.1",
      teamStatus: "revoked",
      memberCount: 1,
      replay: false,
    },
    {
      ...receiptBase("control.human-control.decide.receipt"),
      decisionId: "decision.1",
      targetId: "workflow.1",
      decisionStatus: "accepted",
      replay: false,
    },
    {
      ...receiptBase("control.human-control.policy.update.receipt"),
      policyRevision: "human-policy.1",
      replay: false,
    },
    {
      ...receiptBase("control.audit.append.receipt"),
      eventId: "event.1",
      redactedDetails: { operation: "control.admission.admit", count: 1 },
      replay: false,
    },
  ];
}

const EXPECTED_OPERATION_MATRIX = [
  ["admission", "control.admission.admit", "control.admission.admit.receipt"],
  [
    "admission",
    "control.admission.release",
    "control.admission.release.receipt",
  ],
  [
    "enrollment",
    "control.enrollment.enroll",
    "control.enrollment.enroll.receipt",
  ],
  [
    "enrollment",
    "control.enrollment.revoke",
    "control.enrollment.revoke.receipt",
  ],
  [
    "quota-rbac-policy",
    "control.governance-policy.update",
    "control.governance-policy.update.receipt",
  ],
  ["global-queue", "control.queue.enqueue", "control.queue.enqueue.receipt"],
  ["global-queue", "control.queue.lease", "control.queue.lease.receipt"],
  ["global-queue", "control.queue.complete", "control.queue.complete.receipt"],
  ["global-queue", "control.queue.cancel", "control.queue.cancel.receipt"],
  [
    "global-queue",
    "control.queue.partition",
    "control.queue.partition.receipt",
  ],
  ["global-queue", "control.queue.takeover", "control.queue.takeover.receipt"],
  ["global-queue", "control.queue.reclaim", "control.queue.reclaim.receipt"],
  [
    "bounded-workflow",
    "control.workflow.declare",
    "control.workflow.declare.receipt",
  ],
  [
    "bounded-workflow",
    "control.workflow.start",
    "control.workflow.start.receipt",
  ],
  [
    "bounded-workflow",
    "control.workflow.advance",
    "control.workflow.advance.receipt",
  ],
  [
    "bounded-workflow",
    "control.workflow.cancel",
    "control.workflow.cancel.receipt",
  ],
  [
    "declared-team",
    "control.declared-team.declare",
    "control.declared-team.declare.receipt",
  ],
  [
    "declared-team",
    "control.declared-team.update",
    "control.declared-team.update.receipt",
  ],
  [
    "declared-team",
    "control.declared-team.revoke",
    "control.declared-team.revoke.receipt",
  ],
  [
    "human-control",
    "control.human-control.decide",
    "control.human-control.decide.receipt",
  ],
  [
    "human-control",
    "control.human-control.policy.update",
    "control.human-control.policy.update.receipt",
  ],
  ["redacted-audit", "control.audit.append", "control.audit.append.receipt"],
] as const;

const RECEIPT_CODES: readonly (readonly string[])[] = [
  [
    "NONE",
    "RBAC_DENIED",
    "QUOTA_EXCEEDED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "RBAC_DENIED",
    "NOT_FOUND",
    "TERMINAL",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "RBAC_DENIED",
    "SCOPE_MISMATCH",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
    "REVOKED",
  ],
  [
    "NONE",
    "RBAC_DENIED",
    "NOT_FOUND",
    "TERMINAL",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "RBAC_DENIED",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "LIMIT_EXCEEDED",
    "QUOTA_EXCEEDED",
    "PARTITIONED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "NOT_FOUND",
    "PARTITIONED",
    "POLICY_DENIED",
    "QUOTA_EXCEEDED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "NOT_FOUND",
    "POLICY_DENIED",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  ["NONE", "STALE_REVISION", "STALE_FENCE", "IDEMPOTENCY_CONFLICT"],
  [
    "NONE",
    "LIMIT_EXCEEDED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "LIMIT_EXCEEDED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "NOT_FOUND",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "LIMIT_EXCEEDED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "LIMIT_EXCEEDED",
    "NOT_FOUND",
    "REVOKED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "NOT_FOUND",
    "REVOKED",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "RBAC_DENIED",
    "POLICY_DENIED",
    "TERMINAL",
    "EXPIRED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "RBAC_DENIED",
    "POLICY_DENIED",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
  ],
  [
    "NONE",
    "LIMIT_EXCEEDED",
    "INVALID_INPUT",
    "STALE_REVISION",
    "STALE_FENCE",
    "IDEMPOTENCY_CONFLICT",
    "CORRUPT_STORE",
  ],
];

function expectContractError(
  action: () => unknown,
): AgentOsControlV1ContractError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsControlV1ContractError);
    return error as AgentOsControlV1ContractError;
  }
  throw new Error("expected a contract error");
}

function expectDeepFrozen(value: unknown): void {
  expect(Object.isFrozen(value)).toBe(true);
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) expectDeepFrozen(child);
  }
}

describe("agent-os-control/v1 contract", () => {
  test("keeps the exact ordered 8-family/22-operation matrix", () => {
    expect(
      AGENT_OS_CONTROL_V1_OPERATION_MATRIX.map((entry) => [
        entry.capability,
        entry.request,
        entry.receipt,
      ]),
    ).toEqual(EXPECTED_OPERATION_MATRIX);
    expect(
      AGENT_OS_CONTROL_V1_OPERATION_MATRIX.map((entry) => entry.request),
    ).toEqual(requests().map((entry) => entry.operation));
    expect(AGENT_OS_CONTROL_V1_OPERATION_MATRIX).toHaveLength(22);
    expect(AgentOsControlV1.AGENT_OS_CONTROL_V1_OPERATION_MATRIX).toBe(
      AGENT_OS_CONTROL_V1_OPERATION_MATRIX,
    );
  });

  test("accepts every response code in the authoritative operation matrix", () => {
    const baseReceipts = receipts();
    expect(RECEIPT_CODES).toHaveLength(baseReceipts.length);
    for (let index = 0; index < baseReceipts.length; index += 1) {
      const receipt = baseReceipts[index];
      const codes = RECEIPT_CODES[index];
      if (receipt === undefined || codes === undefined)
        throw new Error("receipt matrix drift");
      for (const code of codes) {
        const parsed = parseAgentOsControlV1({
          ...receipt,
          status: code === "NONE" ? "accepted" : "rejected",
          code,
        });
        expect(parsed.code).toBe(code);
      }
    }
  });

  test("parses every request and receipt discriminant and deep freezes output", () => {
    const parsedRequests = requests().map((input) =>
      parseAgentOsControlV1(input),
    );
    const parsedReceipts = receipts().map((input) =>
      parseAgentOsControlV1(input),
    );
    expect(parsedRequests).toHaveLength(22);
    expect(parsedReceipts).toHaveLength(22);
    for (const value of [...parsedRequests, ...parsedReceipts])
      expectDeepFrozen(value);
  });

  test("supports each family parser at its public seam", () => {
    expect(parseAgentOsControlAdmissionRequest(requests()[0]).operation).toBe(
      "control.admission.admit",
    );
    expect(
      parseAgentOsControlGovernancePolicyRequest(requests()[4]).operation,
    ).toBe("control.governance-policy.update");
    expect(parseAgentOsControlQueueRequest(requests()[6]).operation).toBe(
      "control.queue.lease",
    );
    expect(parseAgentOsControlWorkflowRequest(requests()[13]).operation).toBe(
      "control.workflow.start",
    );
    expect(
      parseAgentOsControlDeclaredTeamRequest(requests()[17]).operation,
    ).toBe("control.declared-team.update");
    expect(
      parseAgentOsControlHumanControlRequest(requests()[19]).operation,
    ).toBe("control.human-control.decide");
    expect(parseAgentOsControlAuditReceipt(receipts()[21]).operation).toBe(
      "control.audit.append.receipt",
    );
  });

  test("canonicalizes deterministically and round-trips the codec", () => {
    const input = requests()[4];
    const reordered = {
      rbac: input.rbac,
      quota: input.quota,
      policyRevision: input.policyRevision,
      actorPrincipalId: input.actorPrincipalId,
      expectedFence: input.expectedFence,
      expectedRevision: input.expectedRevision,
      idempotencyKey: input.idempotencyKey,
      hostId: input.hostId,
      workloadId: input.workloadId,
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      requestId: input.requestId,
      operation: input.operation,
      schemaVersion: input.schemaVersion,
    };
    const canonical = canonicalAgentOsControlV1Source(input);
    expect(canonical).toBe(canonicalAgentOsControlV1Source(reordered));
    expect(encodeAgentOsControlV1(input)).toBe(canonical);
    expect(decodeAgentOsControlV1(canonical)).toEqual(
      parseAgentOsControlV1(input),
    );
  });

  test.each([
    [
      "unknown field",
      (value: Record<string, unknown>) => ({ ...value, token: "secret" }),
    ],
    [
      "wrong version",
      (value: Record<string, unknown>) => ({
        ...value,
        schemaVersion: "agent-os/v1",
      }),
    ],
    [
      "wrong operation",
      (value: Record<string, unknown>) => ({
        ...value,
        operation: "control.queue.enqueue",
      }),
    ],
    [
      "missing required",
      (value: Record<string, unknown>) => {
        const copy = { ...value };
        delete copy.actorPrincipalId;
        return copy;
      },
    ],
    [
      "forbidden receipt field",
      (value: Record<string, unknown>) => ({ ...value, expectedFence: 0 }),
    ],
  ])("rejects %s", (_name, mutate) => {
    const source =
      _name === "forbidden receipt field" ? receipts()[0] : requests()[0];
    const error = expectContractError(() =>
      parseAgentOsControlV1(mutate(source)),
    );
    expect([
      "UNKNOWN_FIELD",
      "UNSUPPORTED_VERSION",
      "UNSUPPORTED_OPERATION",
    ]).toContain(error.code);
  });

  test("rejects invalid primitives, enums, sparse arrays and sensitive nested values", () => {
    expectContractError(() =>
      parseAgentOsControlV1({ ...requests()[0], expectedRevision: -1 }),
    );
    expectContractError(() =>
      parseAgentOsControlV1({
        ...requests()[0],
        expiresAt: "2026-08-30T00:00:00Z",
      }),
    );
    expectContractError(() =>
      parseAgentOsControlV1({ ...requests()[5], priority: 3 }),
    );
    expectContractError(() =>
      parseAgentOsControlV1({
        ...requests()[12],
        stepIds: Object.assign([], { 1: "step.2", length: 2 }),
      }),
    );
    const decoratedStepIds = ["step.1"];
    Object.defineProperty(decoratedStepIds, "metadata", {
      enumerable: true,
      value: "unexpected",
    });
    expectContractError(() =>
      parseAgentOsControlV1({
        ...requests()[12],
        stepIds: decoratedStepIds,
      }),
    );
    expectContractError(() =>
      parseAgentOsControlV1({
        ...requests()[4],
        rbac: { revision: "rbac.1", rolePermissions: { operator: [1] } },
      }),
    );
    expectContractError(() =>
      parseAgentOsControlV1({
        ...requests()[20],
        policy: {
          revision: "human-policy.1",
          maxDecisions: 2,
          maxDecisionTtlMs: 60_000,
          roleActions: { operator: ["delete"] },
          principalRoles: { "principal.subject": ["operator"] },
        },
      }),
    );
    expectContractError(() =>
      parseAgentOsControlV1({
        ...requests()[21],
        details: { nested: { workspace: "C:\\private" } },
      }),
    );
    const cyclicDetails: Record<string, unknown> = {};
    cyclicDetails.self = cyclicDetails;
    expectContractError(() =>
      parseAgentOsControlV1({
        ...requests()[21],
        details: cyclicDetails,
      }),
    );
    expectContractError(() =>
      parseAgentOsControlV1({
        ...requests()[17],
        members: [
          { principalId: "principal.subject", role: "operator", token: "x" },
        ],
      }),
    );
  });

  test("requires receipt status and code to agree", () => {
    const error = expectContractError(() =>
      parseAgentOsControlV1({ ...receipts()[0], status: "rejected" }),
    );
    expect(error.code).toBe("INVALID_VALUE");
  });

  test("enforces operation-specific optional and forbidden receipt fields", () => {
    expectContractError(() =>
      parseAgentOsControlV1({
        ...receipts()[9],
        queueItemId: "queue.1",
      }),
    );
    expectContractError(() =>
      parseAgentOsControlV1({
        ...receipts()[12],
        stepStatus: "succeeded",
      }),
    );
    expect(parseAgentOsControlV1({ ...receipts()[6] })).toMatchObject({
      operation: "control.queue.lease.receipt",
    });
  });
});
