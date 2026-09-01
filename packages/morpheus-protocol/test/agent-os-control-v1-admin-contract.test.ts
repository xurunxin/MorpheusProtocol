import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_CONTROL_V1_ADMIN_OPERATION_CODE_DEFINITIONS,
  AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX,
  AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
  AgentOsControlV1AdminContractError,
  canonicalAgentOsControlV1AdminSource,
  decodeAgentOsControlV1Admin,
  encodeAgentOsControlV1Admin,
  parseAgentOsControlV1,
  parseAgentOsControlV1AdminMessage,
  parseAgentOsControlV1AdminReceipt,
  parseAgentOsControlV1AdminRequest,
} from "../src/index.js";

const instant = "2026-08-30T00:00:00.000Z";

function requestBase(operation: string): Record<string, unknown> {
  return {
    schemaVersion: AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
    operation,
    requestId: "request.admin.1",
    correlationId: "correlation.admin.1",
    tenantId: "tenant.1",
    workloadId: "workload.1",
    hostId: "host.1",
    idempotencyKey: `idem.${operation}`,
    expectedRevision: 0,
    expectedFence: 0,
  };
}

function receiptBase(operation: string): Record<string, unknown> {
  return {
    schemaVersion: AGENT_OS_CONTROL_V1_SCHEMA_VERSION,
    operation,
    requestId: "request.admin.1",
    correlationId: "correlation.admin.1",
    status: "accepted",
    code: "NONE",
    revision: 1,
    fence: 0,
  };
}

function requests(): readonly Record<string, unknown>[] {
  return [
    {
      ...requestBase("control.work-item.create"),
      title: "Create",
      acceptanceCriteria: ["done"],
    },
    {
      ...requestBase("control.work-item.update"),
      workItemId: "work.1",
      title: "Updated",
    },
    { ...requestBase("control.work-item.list"), status: "pending", limit: 10 },
    {
      ...requestBase("control.work-item.block"),
      workItemId: "work.1",
      blockReason: "waiting",
    },
    {
      ...requestBase("control.work-item.complete"),
      workItemId: "work.1",
      result: { ok: true },
    },
    {
      ...requestBase("control.work-item.fail"),
      workItemId: "work.1",
      error: "failed",
    },
    {
      ...requestBase("control.work-item.spawn-subtasks"),
      parentWorkItemId: "work.1",
      subtasks: [{ title: "Child", acceptanceCriteria: ["done"] }],
    },
    {
      ...requestBase("control.task-plan.draft"),
      goal: "Ship",
      tasks: [
        {
          planTaskId: "task.1",
          title: "Build",
          acceptanceCriteria: ["built"],
          dependsOn: [],
        },
      ],
    },
    { ...requestBase("control.task-plan.accept"), planId: "plan.1" },
    {
      ...requestBase("control.task-plan.reject"),
      planId: "plan.1",
      reason: "Needs review",
    },
    {
      ...requestBase("control.message.send"),
      groupId: "group.1",
      messageType: "status",
      comment: "hello",
    },
    { ...requestBase("control.message.list"), groupId: "group.1", limit: 10 },
    {
      ...requestBase("control.schedule.create"),
      kind: "follow_up",
      schedule: { type: "daily", hour: 9, minute: 30 },
      prompt: "Check progress",
    },
    {
      ...requestBase("control.schedule.list"),
      sessionId: "session.1",
      limit: 10,
    },
    {
      ...requestBase("control.schedule.cancel"),
      scheduleId: "schedule.1",
      reason: "done",
    },
    {
      ...requestBase("control.human-control.command"),
      command: {
        commandId: "command.1",
        targetId: "work.1",
        action: "approve",
        expiresAt: instant,
      },
    },
  ];
}

function receipts(): readonly Record<string, unknown>[] {
  return AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX.map((entry) => ({
    ...receiptBase(entry.receipt),
    ...(entry.request === "control.work-item.create"
      ? { workItemId: "work.1" }
      : {}),
    ...(entry.request === "control.task-plan.draft"
      ? { planId: "plan.1", taskCount: 1 }
      : {}),
    ...(entry.request === "control.message.send"
      ? { messageId: "message.1" }
      : {}),
    ...(entry.request === "control.schedule.create"
      ? { scheduleId: "schedule.1" }
      : {}),
    ...(entry.request === "control.human-control.command"
      ? { commandId: "command.1", targetId: "work.1" }
      : {}),
  }));
}

function expectContractError(
  action: () => unknown,
): AgentOsControlV1AdminContractError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsControlV1AdminContractError);
    return error as AgentOsControlV1AdminContractError;
  }
  throw new Error("expected a contract error");
}

describe("agent-os-control/v1 Admin operations", () => {
  test("parses the complete built-in Admin operation set through the generic seam", () => {
    expect(requests()).toHaveLength(
      AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX.length,
    );
    for (const input of requests()) {
      expect(parseAgentOsControlV1AdminRequest(input).operation).toBe(
        input.operation,
      );
      expect(parseAgentOsControlV1(input).operation).toBe(input.operation);
    }
    for (const input of receipts()) {
      expect(parseAgentOsControlV1AdminReceipt(input).operation).toBe(
        input.operation,
      );
      expect(parseAgentOsControlV1(input).operation).toBe(input.operation);
    }
  });

  test("exports one code definition for every Admin operation", () => {
    expect(
      Object.keys(AGENT_OS_CONTROL_V1_ADMIN_OPERATION_CODE_DEFINITIONS),
    ).toEqual(
      AGENT_OS_CONTROL_V1_ADMIN_OPERATION_MATRIX.map((entry) => entry.request),
    );
    for (const definition of Object.values(
      AGENT_OS_CONTROL_V1_ADMIN_OPERATION_CODE_DEFINITIONS,
    )) {
      expect(definition.requestRejects).toEqual([
        "INVALID_SHAPE",
        "INVALID_VALUE",
        "LIMIT_EXCEEDED",
      ]);
      expect(definition.responseCodes).toContain("NONE");
    }
  });

  test("rejects unknown fields, schema drift, and invalid receipt status/code", () => {
    const create = requests()[0];
    if (!create) throw new Error("fixture missing");
    expectContractError(() =>
      parseAgentOsControlV1AdminRequest({ ...create, unknown: true }),
    );
    expect(
      expectContractError(() =>
        parseAgentOsControlV1AdminRequest({
          ...create,
          schemaVersion: "agent-os-control/v2",
        }),
      ).code,
    ).toBe("UNSUPPORTED_VERSION");
    const receipt = receipts()[0];
    if (!receipt) throw new Error("fixture missing");
    expectContractError(() =>
      parseAgentOsControlV1AdminReceipt({ ...receipt, status: "rejected" }),
    );
    expectContractError(() =>
      parseAgentOsControlV1AdminReceipt({ ...receipt, code: "NOT_INVENTORY" }),
    );
  });

  test("canonical codec is deterministic and dispatches through the shared message parser", () => {
    const input = requests()[15];
    if (!input) throw new Error("fixture missing");
    const reordered = {
      command: input.command,
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
    const canonical = canonicalAgentOsControlV1AdminSource(input);
    expect(canonicalAgentOsControlV1AdminSource(reordered)).toBe(canonical);
    expect(encodeAgentOsControlV1Admin(input)).toBe(`${canonical}\n`);
    expect(decodeAgentOsControlV1Admin(`${canonical}\n`)).toEqual(
      parseAgentOsControlV1AdminMessage(input),
    );
  });
});
