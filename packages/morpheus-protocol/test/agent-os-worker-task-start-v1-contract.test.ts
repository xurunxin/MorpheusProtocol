import { expect, test } from "bun:test";
import { createAgentOsTaskHandleV1 } from "../src/agent-os-task-handle-v1-contract.js";
import { sha256Hex } from "../src/contract-primitives.js";
import {
  parseAgentOsWorkerTaskStartRequestV1,
  parseAgentOsWorkerTaskStartResponseV1,
  encodeAgentOsWorkerTaskStartRequestV1,
  decodeAgentOsWorkerTaskStartRequestV1,
  createAgentOsWorkerTaskStartRequestDigestV1,
  createAgentOsWorkerTaskStartCommandDigestV1,
  assertAgentOsWorkerTaskStartResponseBindingV1,
  createAgentOsWorkerTaskPromptDigestV1,
} from "../src/agent-os-worker-task-start-v1-contract.js";

const input = {
  schemaVersion: "agent-os-worker-task-start/v1",
  operation: "task.start",
  requestId: "rpc.one",
  commandId: "command.one",
  prompt: { messages: [{ role: "user", content: "Inspect repository" }] },
  title: "Inspect repository",
  acceptanceCriteria: ["Report verified checks"],
  mode: "foreground",
};
const hash = `sha256:${"a".repeat(64)}`;
const handle = createAgentOsTaskHandleV1({
  tenantId: "tenant.one",
  ownerId: "worker.one",
  workItemId: "work.one",
  planTaskId: null,
  parentRunId: "run.parent",
  parentTurnId: "turn.parent",
  parentAttemptId: "attempt.parent",
  parentStoreGeneration: 1,
  kernelChildId: "child.one",
  childRunId: "run.child",
  childAttemptId: "attempt.child",
  inputDigest: createAgentOsWorkerTaskPromptDigestV1(input.prompt),
  definitionDigest: hash,
  targetRevision: "git:abc123",
});
const response = {
  schemaVersion: input.schemaVersion,
  operation: input.operation,
  requestId: input.requestId,
  requestDigest: createAgentOsWorkerTaskStartRequestDigestV1(input),
  status: "accepted",
  handle,
};
test("task start canonical business intent binds prompt identity and excludes transport identity from command", () => {
  const parsed = parseAgentOsWorkerTaskStartRequestV1(input);
  expect(
    decodeAgentOsWorkerTaskStartRequestV1(
      encodeAgentOsWorkerTaskStartRequestV1(input),
    ),
  ).toEqual(parsed);
  expect(Object.isFrozen(parsed.acceptanceCriteria)).toBe(true);
  expect(parseAgentOsWorkerTaskStartResponseV1(response)).toEqual(response);
  expect(() =>
    assertAgentOsWorkerTaskStartResponseBindingV1(input, response),
  ).not.toThrow();
  expect(
    createAgentOsWorkerTaskStartCommandDigestV1({
      ...input,
      requestId: "rpc.other",
    }),
  ).toBe(createAgentOsWorkerTaskStartCommandDigestV1(input));
  for (const changed of [
    { ...input, title: "Changed" },
    { ...input, mode: "background" },
    { ...input, acceptanceCriteria: ["Other"] },
  ]) {
    expect(createAgentOsWorkerTaskStartCommandDigestV1(changed)).not.toBe(
      createAgentOsWorkerTaskStartCommandDigestV1(input),
    );
  }
  const canonical =
    '{"prompt":{"messages":[{"content":"Inspect repository","role":"user"}]},"schemaVersion":"agent-os-canonical-prompt-input/v1"}';
  expect(handle.identity.inputDigest).toBe(`sha256:${sha256Hex(canonical)}`);
});
test("task start rejects caller authority, altered response and malformed bounded frames", () => {
  for (const field of [
    "runId",
    "workItemId",
    "targetRevision",
    "claim",
    "budget",
    "grant",
    "planTaskId",
    "ownerId",
    "timestamp",
  ]) {
    expect(() =>
      parseAgentOsWorkerTaskStartRequestV1({ ...input, [field]: "caller" }),
    ).toThrow();
  }
  for (const acceptanceCriteria of [[], ["duplicate", "duplicate"], [" "]])
    expect(() =>
      parseAgentOsWorkerTaskStartRequestV1({ ...input, acceptanceCriteria }),
    ).toThrow();
  expect(() =>
    assertAgentOsWorkerTaskStartResponseBindingV1(input, {
      ...response,
      requestId: "rpc.other",
    }),
  ).toThrow();
  expect(() =>
    assertAgentOsWorkerTaskStartResponseBindingV1(input, {
      ...response,
      handle: createAgentOsTaskHandleV1({
        ...handle.identity,
        inputDigest: hash,
      }),
    }),
  ).toThrow();
  expect(() =>
    parseAgentOsWorkerTaskStartResponseV1({
      ...response,
      status: "rejected",
      code: "BUSY",
    }),
  ).toThrow();
  expect(() =>
    decodeAgentOsWorkerTaskStartRequestV1(new Uint8Array([0xff])),
  ).toThrow();
  expect(() =>
    decodeAgentOsWorkerTaskStartRequestV1(" ".repeat(1_048_577)),
  ).toThrow();
});
