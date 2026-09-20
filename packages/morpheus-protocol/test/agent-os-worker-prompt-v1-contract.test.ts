import { expect, test } from "bun:test";
import {
  AGENT_OS_WORKER_PROMPT_V1,
  parseAgentOsWorkerPromptRequestV1,
  parseAgentOsWorkerPromptResponseV1,
  encodeAgentOsWorkerPromptRequestV1,
  encodeAgentOsWorkerPromptResponseV1,
  decodeAgentOsWorkerPromptRequestV1,
  decodeAgentOsWorkerPromptResponseV1,
  createAgentOsWorkerPromptRequestDigestV1,
  createAgentOsWorkerPromptCommandDigestV1,
  assertAgentOsWorkerPromptResponseBindingV1,
} from "../src/agent-os-worker-prompt-v1-contract.js";
import {
  createAgentOsV1CanonicalPromptEvent,
  createAgentOsV1CanonicalPromptCursor,
  createAgentOsV1CanonicalPromptSnapshot,
} from "../src/agent-os-v1-contract.js";

const start = {
  schemaVersion: AGENT_OS_WORKER_PROMPT_V1,
  requestId: "request.start",
  operation: "prompt.start",
  commandId: "command.start",
  runId: "run.demo",
  turnId: "turn.demo",
  attemptId: "attempt.demo",
  prompt: { messages: [{ role: "user", content: "hello" }] },
};
const read = {
  schemaVersion: AGENT_OS_WORKER_PROMPT_V1,
  requestId: "request.read",
  operation: "prompt.read",
  runId: "run.demo",
  cursor: null,
  limit: 1,
};
const cancel = {
  schemaVersion: AGENT_OS_WORKER_PROMPT_V1,
  requestId: "request.cancel",
  operation: "prompt.cancel",
  commandId: "command.cancel",
  runId: "run.demo",
  attemptId: "attempt.demo",
  reason: "user requested",
};

function accepted(request: typeof start | typeof read | typeof cancel) {
  const snapshot = createAgentOsV1CanonicalPromptSnapshot({
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId: request.runId,
    attemptId: "attempt.demo",
    instanceId: "instance.demo",
    storeGeneration: 1,
    streamEpoch: "stream-epoch:demo",
    watermark: 0,
    state: "running",
    terminal: false,
    updatedAt: "2026-09-20T00:00:00.000Z",
  });
  const cursor = createAgentOsV1CanonicalPromptCursor({
    schemaVersion: snapshot.schemaVersion,
    runId: snapshot.runId,
    streamEpoch: snapshot.streamEpoch,
    sequence: 0,
    watermark: 0,
  });
  return {
    schemaVersion: AGENT_OS_WORKER_PROMPT_V1,
    requestId: request.requestId,
    requestDigest: createAgentOsWorkerPromptRequestDigestV1(request),
    operation: request.operation,
    status: "accepted",
    response: {
      schemaVersion: snapshot.schemaVersion,
      operation: request.operation,
      disposition: "events",
      snapshot,
      cursor,
      events: [],
      replayed: false,
    },
  };
}

test("business commands round trip canonically and freeze nested data", () => {
  for (const request of [start, read, cancel]) {
    const parsed = parseAgentOsWorkerPromptRequestV1(request);
    expect(
      decodeAgentOsWorkerPromptRequestV1(
        new TextEncoder().encode(encodeAgentOsWorkerPromptRequestV1(parsed)),
      ),
    ).toEqual(request);
    expect(Object.isFrozen(parsed)).toBe(true);
    const response = accepted(request);
    expect(
      decodeAgentOsWorkerPromptResponseV1(
        encodeAgentOsWorkerPromptResponseV1(response),
      ),
    ).toEqual(response);
    expect(() =>
      assertAgentOsWorkerPromptResponseBindingV1(request, response),
    ).not.toThrow();
  }
  const parsed = parseAgentOsWorkerPromptRequestV1(start);
  expect(
    parsed.operation === "prompt.start" &&
      Object.isFrozen(parsed.prompt.messages[0]),
  ).toBe(true);
  const reordered = Object.fromEntries(Object.entries(start).reverse());
  expect(createAgentOsWorkerPromptRequestDigestV1(reordered)).toBe(
    createAgentOsWorkerPromptRequestDigestV1(start),
  );
});

test("command digest survives transport retry but binds every business input", () => {
  for (const request of [start, cancel]) {
    expect(
      createAgentOsWorkerPromptCommandDigestV1({
        ...request,
        requestId: "request.retry",
      }),
    ).toBe(createAgentOsWorkerPromptCommandDigestV1(request));
    expect(
      createAgentOsWorkerPromptRequestDigestV1({
        ...request,
        requestId: "request.retry",
      }),
    ).not.toBe(createAgentOsWorkerPromptRequestDigestV1(request));
    for (const key of ["commandId", "runId", "attemptId"])
      expect(
        createAgentOsWorkerPromptCommandDigestV1({
          ...request,
          [key]: "changed.id",
        }),
      ).not.toBe(createAgentOsWorkerPromptCommandDigestV1(request));
  }
  expect(
    createAgentOsWorkerPromptCommandDigestV1({
      ...start,
      prompt: { messages: [{ role: "user", content: "different" }] },
    }),
  ).not.toBe(createAgentOsWorkerPromptCommandDigestV1(start));
  expect(() => createAgentOsWorkerPromptCommandDigestV1(read)).toThrow();
});

test("reject caller-supplied authority, policy, timestamps and malformed business inputs", () => {
  for (const request of [start, read, cancel]) {
    for (const key of [
      "grant",
      "instance",
      "authority",
      "claimId",
      "claimFence",
      "approval",
      "provider",
      "requestedAt",
      "cancelledAt",
      "readAt",
    ])
      expect(() =>
        parseAgentOsWorkerPromptRequestV1({ ...request, [key]: "forged" }),
      ).toThrow();
    expect(() =>
      parseAgentOsWorkerPromptRequestV1({
        ...request,
        schemaVersion: "agent-os-worker-prompt/v2",
      }),
    ).toThrow();
    expect(() =>
      parseAgentOsWorkerPromptRequestV1({ ...request, runId: "../bad" }),
    ).toThrow();
  }
  for (const messages of [
    [],
    [{ role: "system", content: "forged" }],
    [{ role: "user", content: "" }],
    [{ role: "user", content: "x".repeat(65537) }],
    Array.from({ length: 33 }, () => ({ role: "user", content: "x" })),
  ])
    expect(() =>
      parseAgentOsWorkerPromptRequestV1({ ...start, prompt: { messages } }),
    ).toThrow();
  for (const limit of [0, -1, 257, 1.5, "1"])
    expect(() =>
      parseAgentOsWorkerPromptRequestV1({ ...read, limit }),
    ).toThrow();
  for (const reason of ["", " ", "中".repeat(342)])
    expect(() =>
      parseAgentOsWorkerPromptRequestV1({ ...cancel, reason }),
    ).toThrow();
  const wrongCursor = createAgentOsV1CanonicalPromptCursor({
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId: "run.other",
    streamEpoch: "stream-epoch:demo",
    sequence: 0,
    watermark: 0,
  });
  expect(() =>
    parseAgentOsWorkerPromptRequestV1({ ...read, cursor: wrongCursor }),
  ).toThrow();
});

test("response binding rejects replay to another request, operation, Run or attempt", () => {
  const response = accepted(start);
  for (const mutation of [
    { requestId: "request.other" },
    { requestDigest: `sha256:${"0".repeat(64)}` },
    { operation: "prompt.cancel" },
  ])
    expect(() =>
      assertAgentOsWorkerPromptResponseBindingV1(start, {
        ...response,
        ...mutation,
      }),
    ).toThrow();
  for (const request of [
    { ...start, runId: "run.other" },
    { ...start, attemptId: "attempt.other" },
  ])
    expect(() =>
      assertAgentOsWorkerPromptResponseBindingV1(request, {
        ...response,
        requestDigest: createAgentOsWorkerPromptRequestDigestV1(request),
      }),
    ).toThrow();
  const rejection = {
    schemaVersion: AGENT_OS_WORKER_PROMPT_V1,
    requestId: start.requestId,
    requestDigest: createAgentOsWorkerPromptRequestDigestV1(start),
    operation: start.operation,
    status: "rejected",
    code: "UNAVAILABLE",
  };
  expect(() =>
    assertAgentOsWorkerPromptResponseBindingV1(start, rejection),
  ).not.toThrow();
  expect(() =>
    parseAgentOsWorkerPromptResponseV1({ ...rejection, detail: "secret" }),
  ).toThrow();
  expect(() =>
    parseAgentOsWorkerPromptResponseV1({ ...rejection, code: "RAW_ERROR" }),
  ).toThrow();
});

test("read binding preserves pagination and allows atomic snapshot replacement", () => {
  const schemaVersion = "agent-os-canonical-prompt/v1";
  const runId = read.runId;
  const streamEpoch = "stream-epoch:demo";
  const cursor = (
    sequence: number,
    watermark = sequence,
    epoch = streamEpoch,
  ) =>
    createAgentOsV1CanonicalPromptCursor({
      schemaVersion,
      runId,
      streamEpoch: epoch,
      sequence,
      watermark,
    });
  const request = { ...read, cursor: cursor(1) };
  function page(
    sequences: number[],
    sequence: number,
    watermark: number,
    epoch = streamEpoch,
    disposition = "events",
  ) {
    const base = accepted(read);
    const snapshot = base.response.snapshot;
    return {
      ...base,
      requestDigest: createAgentOsWorkerPromptRequestDigestV1(request),
      response: {
        ...base.response,
        disposition,
        snapshot: createAgentOsV1CanonicalPromptSnapshot({
          schemaVersion,
          runId,
          attemptId: "attempt.demo",
          instanceId: "instance.demo",
          storeGeneration: 1,
          streamEpoch: epoch,
          watermark,
          state: snapshot.state,
          terminal: false,
          updatedAt: snapshot.updatedAt,
        }),
        cursor: cursor(sequence, watermark, epoch),
        events: sequences.map((n) =>
          createAgentOsV1CanonicalPromptEvent({
            schemaVersion,
            eventId: `event.demo.${n}`,
            runId,
            attemptId: "attempt.demo",
            streamEpoch: epoch,
            sequence: n,
            eventType: "provider.output",
            payload: { text: "x" },
            createdAt: "2026-09-20T00:00:00.000Z",
          }),
        ),
      },
    };
  }
  expect(() =>
    assertAgentOsWorkerPromptResponseBindingV1(request, page([2], 2, 2)),
  ).not.toThrow();
  expect(() =>
    assertAgentOsWorkerPromptResponseBindingV1(request, page([], 1, 2)),
  ).not.toThrow();
  for (const response of [
    page([3], 3, 3),
    page([], 2, 2),
    page([], 0, 0),
    page([2], 2, 2, "stream-epoch:other"),
    page([2, 3], 3, 3),
  ])
    expect(() =>
      assertAgentOsWorkerPromptResponseBindingV1(request, response),
    ).toThrow();
  const snapshot = page(
    [1, 2],
    2,
    2,
    "stream-epoch:replacement",
    "snapshot-required",
  );
  expect(() =>
    assertAgentOsWorkerPromptResponseBindingV1(request, snapshot),
  ).not.toThrow();
  for (const response of [page([2], 2, 2), page([], 1, 1)])
    expect(() =>
      assertAgentOsWorkerPromptResponseBindingV1(read, {
        ...response,
        requestDigest: createAgentOsWorkerPromptRequestDigestV1(read),
      }),
    ).toThrow();
});

test("wire decoder rejects invalid UTF-8, malformed JSON and oversize frames", () => {
  for (const decode of [
    decodeAgentOsWorkerPromptRequestV1,
    decodeAgentOsWorkerPromptResponseV1,
  ]) {
    for (const source of [
      new Uint8Array([0xff]),
      "{",
      " ".repeat(1048577),
      new Uint8Array(1048577),
    ])
      expect(() => decode(source)).toThrow();
  }
});
