import { expect, test } from "bun:test";
import { sha256Hex } from "../src/contract-primitives.js";
import { createAgentOsWorkerChildAuthorizationInputV1 } from "../src/agent-os-worker-child-authority-v1-contract.js";
import {
  createAgentOsWorkerTaskBindingInputDigestV1,
  createAgentOsWorkerTaskBindingReceiptV1,
  parseAgentOsWorkerTaskBindingInputV1,
  parseAgentOsWorkerTaskBindingReceiptV1,
  assertAgentOsWorkerTaskBindingV1,
} from "../src/agent-os-worker-task-binding-v1-contract.js";
import {
  AGENT_OS_WORKER_AUTHORITY_V1,
  createAgentOsWorkerAuthorityRequestDigestV1,
  assertAgentOsWorkerAuthorityResponseBindingV1,
  encodeAgentOsWorkerAuthorityRequestV1,
  decodeAgentOsWorkerAuthorityRequestV1,
} from "../src/agent-os-worker-authority-v1-contract.js";

const hash = (value: string) => `sha256:${sha256Hex(value)}`;
const child = createAgentOsWorkerChildAuthorizationInputV1({
  schemaVersion: "agent-os-worker-child-authority/v1",
  commandId: "child.authorize",
  admissionId: "child.admission",
  parentClaim: {
    grantId: "grant.parent",
    leaseId: "lease.parent",
    leaseEpoch: "lease-epoch:current",
    authorityDomain: "authority.demo",
    runId: "run.parent",
    attemptId: "attempt.parent",
    instanceId: "instance.worker",
    instanceGeneration: 1,
    storeId: "store.parent",
    storeGeneration: 1,
    writerIncarnationId: "writer.parent",
    claimId: "claim.parent",
    claimFence: 1,
    expiresAt: "2026-09-20T00:05:00.000Z",
  },
  parentGrantDigest: hash("grant"),
  parentTurnId: "turn.parent",
  parentRunRevision: 3,
  parentDefinitionDigest: hash("definition"),
  kernelChildId: "child.one",
  logicalChildKey: "one",
  runId: "run.child",
  turnId: "turn.child",
  attemptId: "attempt.child",
  inputDigest: hash("prompt"),
  definitionDigest: hash("definition"),
  capabilityDigest: hash("capability"),
  policyDigest: hash("policy"),
  requestedBudget: {
    inputTokens: 10,
    outputTokens: 10,
    toolCalls: 1,
    costUsdMicros: 10,
  },
  preparedAt: "2026-09-20T00:00:01.000Z",
});
const input = parseAgentOsWorkerTaskBindingInputV1({
  schemaVersion: "agent-os-worker-task-binding/v1",
  commandId: "task.bind.one",
  child,
  title: "Inspect source",
  acceptanceCriteria: ["Return verified evidence"],
  targetRevision: "commit:0123456789abcdef",
});
const root = {
  workItemId: "work.root",
  title: "Parent",
  type: "workflow_run",
  status: "pending",
  rootWorkItemId: "work.root",
  acceptanceCriteria: ["Manage children"],
  input: { parentRunId: child.parentClaim.runId },
};
const item = {
  workItemId: "work.child",
  title: input.title,
  type: "subagent_task",
  status: "pending",
  parentWorkItemId: root.workItemId,
  rootWorkItemId: root.workItemId,
  acceptanceCriteria: input.acceptanceCriteria,
  input: {
    parentRunId: child.parentClaim.runId,
    childRunId: child.runId,
    childAttemptId: child.attemptId,
    kernelChildId: child.kernelChildId,
    inputDigest: child.inputDigest,
    targetRevision: input.targetRevision,
  },
};
const base = {
  schemaVersion: "agent-os-control/v1",
  requestId: "request.work",
  correlationId: "correlation.work",
  status: "accepted",
  code: "NONE",
  fence: 0,
};
const unsigned = {
  schemaVersion: input.schemaVersion,
  commandId: input.commandId,
  requestDigest: createAgentOsWorkerTaskBindingInputDigestV1(input),
  ownerRevision: 1,
  ownerDigest: hash("owner"),
  scope: {
    tenantId: "tenant.one",
    workloadId: "workload.one",
    hostId: "worker.one",
  },
  rootReceipt: {
    ...base,
    operation: "control.work-item.create.receipt",
    revision: 1,
    workItemId: root.workItemId,
    workItemIds: [root.workItemId],
    item: root,
    items: [root],
  },
  childReceipt: {
    ...base,
    operation: "control.work-item.spawn-subtasks.receipt",
    revision: 2,
    workItemId: root.workItemId,
    workItemIds: [item.workItemId],
    items: [item],
  },
};

test("task binding preserves real WorkItem receipt lineage and exact private request binding", () => {
  const receipt = createAgentOsWorkerTaskBindingReceiptV1(unsigned);
  expect(parseAgentOsWorkerTaskBindingReceiptV1(receipt)).toEqual(receipt);
  expect(() => assertAgentOsWorkerTaskBindingV1(input, receipt)).not.toThrow();
  expect(Object.isFrozen(receipt.childReceipt.items)).toBe(true);
  expect(
    createAgentOsWorkerTaskBindingInputDigestV1(
      Object.fromEntries(Object.entries(input).reverse()),
    ),
  ).toBe(receipt.requestDigest);
  for (const operation of ["task.bind", "task.bind.read"] as const) {
    const request = {
      schemaVersion: AGENT_OS_WORKER_AUTHORITY_V1,
      requestId: "rpc.task",
      workerId: "worker.one",
      operation,
      payload: input,
    };
    const response = {
      ...request,
      payload: undefined,
      operation: `${operation}.receipt`,
      requestDigest: createAgentOsWorkerAuthorityRequestDigestV1(request),
      status: "accepted",
      authorityNow: "2026-09-20T00:00:02.000Z",
      receipt,
    };
    const { payload: ignored, ...wireResponse } = response;
    void ignored;
    expect(
      decodeAgentOsWorkerAuthorityRequestV1(
        encodeAgentOsWorkerAuthorityRequestV1(request),
      ),
    ).toEqual(request);
    expect(() =>
      assertAgentOsWorkerAuthorityResponseBindingV1(request, wireResponse),
    ).not.toThrow();
    expect(() =>
      assertAgentOsWorkerAuthorityResponseBindingV1(request, {
        ...wireResponse,
        operation:
          operation === "task.bind"
            ? "task.bind.read.receipt"
            : "task.bind.receipt",
      }),
    ).toThrow();
  }
});

test("task metadata and control lineage cannot be substituted or supplied as authority", () => {
  const receipt = createAgentOsWorkerTaskBindingReceiptV1(unsigned);
  for (const changed of [
    { ...input, title: "Other" },
    { ...input, targetRevision: "other" },
    { ...input, acceptanceCriteria: ["Other"] },
  ])
    expect(() => assertAgentOsWorkerTaskBindingV1(changed, receipt)).toThrow();
  expect(() =>
    parseAgentOsWorkerTaskBindingInputV1({ ...input, planTaskId: "invented" }),
  ).toThrow();
  expect(() =>
    parseAgentOsWorkerTaskBindingInputV1({ ...input, acceptanceCriteria: [] }),
  ).toThrow();
  expect(() =>
    parseAgentOsWorkerTaskBindingReceiptV1({
      ...receipt,
      receiptDigest: hash("wrong"),
    }),
  ).toThrow();
  expect(() =>
    createAgentOsWorkerTaskBindingReceiptV1({
      ...unsigned,
      childReceipt: {
        ...unsigned.childReceipt,
        items: [{ ...item, parentWorkItemId: "work.other" }],
      },
    }),
  ).toThrow();
  expect(() =>
    createAgentOsWorkerTaskBindingReceiptV1({
      ...unsigned,
      rootReceipt: { ...unsigned.rootReceipt, status: "rejected" },
    }),
  ).toThrow();
  const changedInput = { ...item.input, inputDigest: hash("other") };
  expect(() =>
    createAgentOsWorkerTaskBindingReceiptV1({
      ...unsigned,
      childReceipt: { ...unsigned.childReceipt, item: root },
    }),
  ).toThrow();
  const forged = createAgentOsWorkerTaskBindingReceiptV1({
    ...unsigned,
    childReceipt: {
      ...unsigned.childReceipt,
      items: [{ ...item, input: changedInput }],
    },
  });
  expect(() => assertAgentOsWorkerTaskBindingV1(input, forged)).toThrow();
});
