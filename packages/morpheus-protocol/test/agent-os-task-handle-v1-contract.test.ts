import { expect, test } from "bun:test";
import {
  createAgentOsTaskHandleV1,
  parseAgentOsTaskHandleV1,
  parseAgentOsTaskViewV1,
  assertAgentOsTaskViewSuccessorV1,
  type AgentOsTaskViewV1,
  parseAgentOsTaskRequestV1,
  encodeAgentOsTaskRequestV1,
  decodeAgentOsTaskRequestV1,
  decodeAgentOsTaskResponseV1,
  encodeAgentOsTaskResponseV1,
  createAgentOsTaskRequestDigestV1,
  createAgentOsTaskCommandDigestV1,
  assertAgentOsTaskResponseBindingV1,
} from "../src/agent-os-task-handle-v1-contract.js";
const hash = `sha256:${"1".repeat(64)}`;
const other = `sha256:${"2".repeat(64)}`;
test("business commands are strict, canonically bound and never contain authority", () => {
  const view = fixture();
  const base = {
    schemaVersion: view.handle.schemaVersion,
    requestId: "request.one",
    handleId: view.handle.handleId,
  };
  for (const request of [
    { ...base, operation: "task.observe" },
    {
      ...base,
      operation: "task.set-delivery",
      commandId: "command.one",
      expectedRevision: 1,
      mode: "background",
    },
    {
      ...base,
      operation: "task.cancel",
      commandId: "command.two",
      expectedRevision: 1,
      reason: "stop",
      scope: "task-and-descendants",
    },
  ]) {
    expect(
      decodeAgentOsTaskRequestV1(
        new TextEncoder().encode(encodeAgentOsTaskRequestV1(request)),
      ),
    ).toEqual(request);
    const response = {
      schemaVersion: base.schemaVersion,
      requestId: base.requestId,
      operation: request.operation,
      requestDigest: createAgentOsTaskRequestDigestV1(request),
      status: "accepted",
      view:
        request.operation === "task.set-delivery"
          ? { ...view, delivery: { ...view.delivery, mode: "background" } }
          : view,
    };
    expect(
      decodeAgentOsTaskResponseV1(encodeAgentOsTaskResponseV1(response)),
    ).toEqual(response);
    expect(() =>
      assertAgentOsTaskResponseBindingV1(request, response),
    ).not.toThrow();
    if (request.operation === "task.set-delivery") {
      expect(() =>
        assertAgentOsTaskResponseBindingV1(request, { ...response, view }),
      ).toThrow();
    }
    expect(() =>
      assertAgentOsTaskResponseBindingV1(request, {
        ...response,
        requestId: "request.other",
      }),
    ).toThrow();
    expect(() =>
      parseAgentOsTaskRequestV1({ ...request, grant: {} }),
    ).toThrow();
    if (request.operation !== "task.observe") {
      expect(
        createAgentOsTaskCommandDigestV1({
          ...request,
          requestId: "request.retry",
        }),
      ).toBe(createAgentOsTaskCommandDigestV1(request));
      expect(
        createAgentOsTaskRequestDigestV1({
          ...request,
          requestId: "request.retry",
        }),
      ).not.toBe(createAgentOsTaskRequestDigestV1(request));
      expect(() =>
        assertAgentOsTaskResponseBindingV1(request, {
          ...response,
          view: { ...view, revision: 0 },
        }),
      ).toThrow();
    }
  }
  expect(() =>
    createAgentOsTaskCommandDigestV1({ ...base, operation: "task.observe" }),
  ).toThrow();
  expect(() => decodeAgentOsTaskRequestV1(new Uint8Array([0xff]))).toThrow();
  expect(() => decodeAgentOsTaskRequestV1(" ".repeat(1_048_577))).toThrow();
});
test("terminal audit revisions preserve facts, settlement and acknowledgment evidence", () => {
  const base = fixture();
  const terminal = {
    ...base,
    execution: {
      ...base.execution,
      runStatus: "cancelled",
      attemptStatus: "cancelled",
      resultDigest: hash,
    },
  };
  expect(() =>
    assertAgentOsTaskViewSuccessorV1(terminal, {
      ...terminal,
      revision: 2,
      execution: { ...terminal.execution, runRevision: 2 },
    }),
  ).not.toThrow();
  const applied = {
    commandId: "settle.one",
    disposition: "applied",
    mutationReceiptDigest: hash,
  };
  expect(() =>
    parseAgentOsTaskViewV1({ ...base, settlementAttempts: [applied] }),
  ).toThrow();
  const settled = {
    ...terminal,
    parentChild: { status: "cancelled", resultDigest: hash, wakeEmitted: true },
    settlementAttempts: [applied],
  };
  expect(() => parseAgentOsTaskViewV1(settled)).not.toThrow();
  expect(() =>
    parseAgentOsTaskViewV1({ ...settled, settlementAttempts: [] }),
  ).toThrow();
  expect(() =>
    parseAgentOsTaskViewV1({
      ...settled,
      parentChild: { ...settled.parentChild, wakeEmitted: false },
    }),
  ).toThrow();
  const acknowledged = {
    ...base,
    delivery: {
      ...base.delivery,
      status: "acknowledged",
      acknowledgmentDigest: hash,
    },
  };
  expect(() =>
    assertAgentOsTaskViewSuccessorV1(acknowledged, { ...base, revision: 2 }),
  ).toThrow();
  const { artifact, check } = evidence();
  expect(() =>
    parseAgentOsTaskViewV1({
      ...base,
      execution: {
        ...base.execution,
        runStatus: "succeeded",
        attemptStatus: "succeeded",
      },
      artifacts: [artifact],
      checks: [{ ...check, artifactDigests: [] }],
      validation: { ...base.validation, status: "passed" },
    }),
  ).toThrow();
});
function fixture(): AgentOsTaskViewV1 {
  const identity = {
    tenantId: "tenant.one",
    ownerId: "host.one",
    workItemId: "work.one",
    planTaskId: null,
    parentRunId: "run.parent",
    parentTurnId: "turn.parent",
    parentAttemptId: "attempt.parent",
    parentStoreGeneration: 1,
    kernelChildId: "child.one",
    childRunId: "run.child",
    childAttemptId: "attempt.child",
    inputDigest: hash,
    definitionDigest: hash,
    targetRevision: "code.revision-one",
  };
  return {
    handle: createAgentOsTaskHandleV1(identity),
    revision: 1,
    execution: {
      runStatus: "running",
      attemptStatus: "active",
      runRevision: 1,
      resultDigest: null,
    },
    parentChild: { status: "pending", resultDigest: null, wakeEmitted: false },
    settlementAttempts: [],
    delivery: {
      mode: "foreground",
      recipientId: "client.one",
      status: "pending",
      acknowledgmentDigest: null,
    },
    validation: {
      status: "unverified",
      policyDigest: hash,
      requiredCheckIds: ["check.build"],
      requiredArtifactIds: ["artifact.one"],
    },
    outputCursor: null,
    artifacts: [],
    checks: [],
  };
}
function evidence() {
  const identity = fixture().handle.identity;
  const binding = {
    childRunId: identity.childRunId,
    childAttemptId: identity.childAttemptId,
    inputDigest: identity.inputDigest,
    targetRevision: identity.targetRevision,
    effectReceiptDigest: hash,
  };
  return {
    artifact: {
      ...binding,
      artifactId: "artifact.one",
      artifactRef: "artifact:one",
      contentDigest: hash,
      bytes: 42,
    },
    check: {
      ...binding,
      receiptId: "receipt.build",
      checkId: "check.build",
      artifactDigests: [hash],
      commandDisplay: "bun run build",
      commandDigest: hash,
      reportDigest: hash,
      status: "passed" as const,
      exitCode: 0,
    },
  };
}
test("task identity is canonical, immutable and independent of delivery preference", () => {
  const view = fixture();
  expect(parseAgentOsTaskHandleV1(view.handle)).toEqual(view.handle);
  expect(
    createAgentOsTaskHandleV1(
      Object.fromEntries(Object.entries(view.handle.identity).reverse()),
    ),
  ).toEqual(view.handle);
  expect(
    createAgentOsTaskHandleV1({
      ...view.handle.identity,
      targetRevision: "code.revision-two",
    }).handleId,
  ).not.toBe(view.handle.handleId);
  expect(() =>
    parseAgentOsTaskHandleV1({ ...view.handle, grant: {} }),
  ).toThrow();
  expect(() =>
    parseAgentOsTaskHandleV1({
      ...view.handle,
      identity: { ...view.handle.identity, childRunId: "run.other" },
    }),
  ).toThrow();
  const background = {
    ...view,
    revision: 2,
    delivery: { ...view.delivery, mode: "background" },
  };
  expect(() =>
    assertAgentOsTaskViewSuccessorV1(view, background),
  ).not.toThrow();
});
test("delivery failures and audit-only settlements do not convert execution or parent state", () => {
  const view = fixture();
  const next = {
    ...view,
    revision: 2,
    delivery: { ...view.delivery, status: "failed" },
    settlementAttempts: [
      {
        commandId: "settle.late",
        disposition: "audit_only",
        mutationReceiptDigest: hash,
      },
    ],
  };
  const parsed = parseAgentOsTaskViewV1(next);
  expect(parsed.parentChild.status).toBe("pending");
  expect(parsed.execution.runStatus).toBe("running");
  expect(() => assertAgentOsTaskViewSuccessorV1(view, next)).not.toThrow();
  expect(() =>
    parseAgentOsTaskViewV1({
      ...next,
      delivery: { ...next.delivery, status: "acknowledged" },
    }),
  ).toThrow();
});
test("passing validation requires current artifacts and real check receipt references", () => {
  const base = fixture();
  const { artifact, check } = evidence();
  const passed = {
    ...base,
    execution: {
      ...base.execution,
      runStatus: "succeeded",
      attemptStatus: "succeeded",
      resultDigest: hash,
    },
    artifacts: [artifact],
    checks: [check],
    validation: { ...base.validation, status: "passed" },
  };
  expect(parseAgentOsTaskViewV1(passed).validation.status).toBe("passed");
  for (const invalid of [
    { ...passed, checks: [] },
    { ...passed, artifacts: [] },
    { ...passed, checks: [{ ...check, inputDigest: other }] },
    { ...passed, artifacts: [{ ...artifact, targetRevision: "code.old" }] },
    { ...passed, checks: [{ ...check, artifactDigests: [other] }] },
    { ...passed, checks: [{ ...check, status: "unknown", exitCode: null }] },
    { ...passed, execution: { ...passed.execution, attemptStatus: "unknown" } },
    {
      ...passed,
      artifacts: [{ ...artifact, artifactRef: "file:/private/path" }],
    },
    { ...passed, checks: [{ ...check, childAttemptId: "attempt.other" }] },
  ])
    expect(() => parseAgentOsTaskViewV1(invalid)).toThrow();
});
test("late evidence is append-only and cannot reverse cancellation or unknown attempt", () => {
  const base = fixture();
  const { artifact, check } = evidence();
  const cancelled = {
    ...base,
    execution: {
      ...base.execution,
      runStatus: "cancelled",
      attemptStatus: "cancelled",
      resultDigest: hash,
    },
  };
  const late = {
    ...cancelled,
    revision: 2,
    artifacts: [artifact],
    checks: [check],
  };
  expect(() => assertAgentOsTaskViewSuccessorV1(cancelled, late)).not.toThrow();
  expect(() =>
    assertAgentOsTaskViewSuccessorV1(late, {
      ...late,
      revision: 3,
      artifacts: [],
    }),
  ).toThrow();
  expect(() =>
    assertAgentOsTaskViewSuccessorV1(late, {
      ...late,
      revision: 3,
      execution: { ...late.execution, runStatus: "succeeded" },
    }),
  ).toThrow();
  const unknown = {
    ...base,
    execution: { ...base.execution, attemptStatus: "unknown" },
  };
  expect(() =>
    assertAgentOsTaskViewSuccessorV1(unknown, { ...base, revision: 2 }),
  ).toThrow();
  const withTwoChecks = {
    ...base,
    checks: [
      check,
      { ...check, receiptId: "receipt.later", status: "failed", exitCode: 1 },
    ],
  };
  expect(() =>
    assertAgentOsTaskViewSuccessorV1(withTwoChecks, {
      ...withTwoChecks,
      revision: 2,
      checks: [...withTwoChecks.checks].reverse(),
    }),
  ).toThrow();
});
