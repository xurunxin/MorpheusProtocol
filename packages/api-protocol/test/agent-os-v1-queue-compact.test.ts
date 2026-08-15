import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
  AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
  AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
  AGENT_OS_V1_SESSION_COMPACT_OPERATION,
  AgentOsV1QueueCompactContractError,
  assertAgentOsV1PromptQueueLifecycleTransition,
  assertAgentOsV1QueueCompactResponseCorrelated,
  assertAgentOsV1QueueCompactRequestBindingCompatible,
  canonicalAgentOsV1QueueCompactRequestSource,
  createAgentOsV1QueueCompactRequestBinding,
  createAgentOsV1QueueCompactRequestFingerprint,
  createAgentOsV1QueueCompactReferenceClient,
  parseAgentOsV1PromptQueueClearRequest,
  parseAgentOsV1PromptQueueClearReceipt,
  parseAgentOsV1PromptQueueReadResponse,
  parseAgentOsV1PromptQueueReadRequest,
  parseAgentOsV1SessionCompactRequest,
  parseAgentOsV1SessionCompactReceipt,
} from "../src/agent-os-v1-queue-compact.js";

const QUEUE_TARGET = {
  sessionId: "session.demo",
  runId: "run.demo",
  attemptId: "attempt.demo",
  storeGeneration: 3,
} as const;

const COMPACT_TARGET = {
  sessionId: "session.demo",
  sourceRunId: "run.demo",
  storeGeneration: 3,
  sourceContextDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
} as const;

function expectContractError(
  value: unknown,
  code: string,
  parse: (input: unknown) => unknown
): void {
  try {
    parse(value);
    throw new Error("expected contract error");
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsV1QueueCompactContractError);
    expect((error as AgentOsV1QueueCompactContractError).code).toBe(code);
  }
}

test("parses the strict prompt.queue.read request shape", () => {
  const request = parseAgentOsV1PromptQueueReadRequest({
    schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
    operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
    target: {
      sessionId: "session.demo",
      runId: "run.demo",
      attemptId: "attempt.demo",
      storeGeneration: 3,
    },
    cursor: null,
  });

  expect(request).toEqual({
    schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
    operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
    target: {
      sessionId: "session.demo",
      runId: "run.demo",
      attemptId: "attempt.demo",
      storeGeneration: 3,
    },
    cursor: null,
  });
  expect(Object.isFrozen(request)).toBe(true);
  expect(Object.isFrozen(request.target)).toBe(true);
});

describe("agent-os queue / compact v1 request DTOs", () => {
  test("parses clear and compact requests without scope or authority claims", () => {
    const clear = parseAgentOsV1PromptQueueClearRequest({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
      target: QUEUE_TARGET,
      filter: "all",
      expectedRevision: 9,
    });
    const compact = parseAgentOsV1SessionCompactRequest({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_SESSION_COMPACT_OPERATION,
      target: COMPACT_TARGET,
    });

    expect(clear.filter).toBe("all");
    expect(clear.expectedRevision).toBe(9);
    expect(compact.target.sourceContextDigest).toMatch(/^sha256:/u);
    expect(Object.isFrozen(clear.target)).toBe(true);
    expect(Object.isFrozen(compact.target)).toBe(true);
  });

  test("rejects unknown fields, invalid targets, and caller authority self-report", () => {
    const read = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      cursor: null,
    };
    expectContractError({ ...read, tenantId: "tenant.demo" }, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    expectContractError(
      { ...read, target: { ...QUEUE_TARGET, storeGeneration: 0 } },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadRequest(value)
    );
    expectContractError(
      { ...read, operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadRequest(value)
    );
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_SESSION_COMPACT_OPERATION,
        target: { ...COMPACT_TARGET, sourceContextDigest: "not-a-digest" },
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1SessionCompactRequest(value)
    );
  });
});

describe("agent-os queue / compact v1 read projection", () => {
  test("parses ordered redacted lifecycle items and freezes the projection", () => {
    const parsed = parseAgentOsV1PromptQueueReadResponse({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      disposition: "snapshot",
      cursor: "cursor.next",
      queueRevision: 10,
      items: [
        {
          itemId: "item.1",
          kind: "steer",
          status: "queued",
          instructionDigest:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          revision: 9,
        },
        {
          itemId: "item.2",
          kind: "follow_up",
          status: "recovery_required",
          instructionDigest:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          revision: 10,
        },
      ],
    });

    expect(parsed.disposition).toBe("snapshot");
    if (parsed.disposition !== "snapshot") throw new Error("expected snapshot");
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[1]!.status).toBe("recovery_required");
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.items)).toBe(true);
    expect(Object.isFrozen(parsed.items[0])).toBe(true);
  });

  test("represents not-modified and snapshot-required without queue items", () => {
    const notModified = parseAgentOsV1PromptQueueReadResponse({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      disposition: "not-modified",
      cursor: "cursor.same",
      queueRevision: 10,
    });
    const required = parseAgentOsV1PromptQueueReadResponse({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      disposition: "snapshot-required",
      cursor: null,
      queueRevision: 11,
    });

    expect(notModified).toEqual({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      disposition: "not-modified",
      cursor: "cursor.same",
      queueRevision: 10,
    });
    expect(required.cursor).toBeNull();
  });

  test("rejects lifecycle order drift, raw prompt content, and unknown lifecycle states", () => {
    const item = {
      itemId: "item.1",
      kind: "steer",
      status: "queued",
      instructionDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      revision: 9,
    };
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        disposition: "snapshot",
        cursor: "cursor.next",
        queueRevision: 10,
        items: [item, { ...item, itemId: "item.2", revision: 8 }],
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadResponse(value)
    );
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        disposition: "snapshot",
        cursor: "cursor.next",
        queueRevision: 10,
        items: [{ ...item, content: "raw prompt" }],
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadResponse(value)
    );
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        disposition: "snapshot",
        cursor: "cursor.next",
        queueRevision: 10,
        items: [{ ...item, status: "requeued", revision: 9 }],
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadResponse(value)
    );
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        disposition: "snapshot",
        cursor: "cursor.next",
        queueRevision: 10,
        items: [item, { ...item, itemId: "item.1", revision: 10 }],
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadResponse(value)
    );
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        disposition: "snapshot",
        cursor: "cursor.next",
        queueRevision: 10,
        items: [
          { ...item, revision: 11 },
          { ...item, itemId: "item.2", revision: 10 },
        ],
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadResponse(value)
    );
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        disposition: "snapshot",
        cursor: "cursor.next",
        queueRevision: 10,
        items: [{ ...item, revision: 11 }],
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadResponse(value)
    );
  });

  test("enforces monotonic lifecycle transitions and recovery-only cancellation", () => {
    const transition = (previousStatus: string, nextStatus: string, proven = false) =>
      assertAgentOsV1PromptQueueLifecycleTransition({
        previousStatus,
        nextStatus,
        nonApplicationProven: proven,
      });

    expect(transition("queued", "claimed")).toBe("claimed");
    expect(transition("claimed", "context_applied")).toBe("context_applied");
    expect(transition("context_applied", "applied")).toBe("applied");
    expect(transition("queued", "cancelled")).toBe("cancelled");
    expect(transition("claimed", "cancelled", true)).toBe("cancelled");
    expect(transition("context_applied", "recovery_required")).toBe("recovery_required");
    expectContractError(
      { previousStatus: "claimed", nextStatus: "cancelled", nonApplicationProven: false },
      "STATE_CONFLICT",
      (value) => assertAgentOsV1PromptQueueLifecycleTransition(value)
    );
    expectContractError(
      { previousStatus: "applied", nextStatus: "queued", nonApplicationProven: false },
      "STATE_CONFLICT",
      (value) => assertAgentOsV1PromptQueueLifecycleTransition(value)
    );
    expectContractError(
      { previousStatus: "queued", nextStatus: "unknown", nonApplicationProven: false },
      "INPUT_INVALID",
      (value) => assertAgentOsV1PromptQueueLifecycleTransition(value)
    );
    expectContractError(
      { previousStatus: "queued", nextStatus: "recovery_required", nonApplicationProven: false },
      "STATE_CONFLICT",
      (value) => assertAgentOsV1PromptQueueLifecycleTransition(value)
    );
  });
});

describe("agent-os queue / compact v1 binding", () => {
  test("binds operation fields and distinguishes replay from independent requests", () => {
    const request = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
      target: QUEUE_TARGET,
      filter: "steer",
      expectedRevision: 9,
    } as const;
    const first = createAgentOsV1QueueCompactRequestBinding({
      requestId: "request.demo",
      request,
    });
    const replay = createAgentOsV1QueueCompactRequestBinding({
      requestId: "request.demo",
      request: { ...request },
    });
    const independent = createAgentOsV1QueueCompactRequestBinding({
      requestId: "request.other",
      request,
    });

    expect(first.operation).toBe(AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION);
    expect(first.filter).toBe("steer");
    expect(assertAgentOsV1QueueCompactRequestBindingCompatible(first, replay)).toBe("replay");
    expect(assertAgentOsV1QueueCompactRequestBindingCompatible(first, independent)).toBe(
      "independent"
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.target)).toBe(true);
  });

  test("uses an independently worked canonical literal for request fingerprint", () => {
    const request = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      cursor: null,
    } as const;
    const source = canonicalAgentOsV1QueueCompactRequestSource({
      requestId: "request.demo",
      request,
    });
    const fingerprint = createAgentOsV1QueueCompactRequestFingerprint({
      requestId: "request.demo",
      request,
    });

    expect(source).toBe(
      '{"operation":"prompt.queue.read","request":{"cursor":null,"operation":"prompt.queue.read","schemaVersion":"agent-os-queue-compact/v1","target":{"attemptId":"attempt.demo","runId":"run.demo","sessionId":"session.demo","storeGeneration":3}},"requestId":"request.demo","schemaVersion":"agent-os-queue-compact/v1"}'
    );
    expect(fingerprint).toBe(
      "sha256:8490d00d3f8ca18cecd490b4bd137d14669afd3943db71e8508f50881d4a8913"
    );
  });

  test("same requestId drift conflicts and forged fingerprints are rejected", () => {
    const request = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      cursor: null,
    } as const;
    const first = createAgentOsV1QueueCompactRequestBinding({
      requestId: "request.demo",
      request,
    });
    const drifted = createAgentOsV1QueueCompactRequestBinding({
      requestId: "request.demo",
      request: { ...request, cursor: "cursor.drift" },
    });
    expect(() => assertAgentOsV1QueueCompactRequestBindingCompatible(first, drifted)).toThrow(
      "IDEMPOTENCY_CONFLICT"
    );
    const forged = { ...first, cursor: "cursor.drift" };
    expect(() => assertAgentOsV1QueueCompactRequestBindingCompatible(first, forged)).toThrow(
      "IDEMPOTENCY_CONFLICT"
    );
    expect(() =>
      assertAgentOsV1QueueCompactRequestBindingCompatible(first, {
        ...first,
        requestFingerprint:
          "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      })
    ).toThrow("IDEMPOTENCY_CONFLICT");
  });
});

describe("agent-os queue / compact v1 receipts", () => {
  test("parses clear and compact receipts with stable correlation fields", () => {
    const clear = parseAgentOsV1PromptQueueClearReceipt({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
      target: QUEUE_TARGET,
      filter: "all",
      expectedRevision: 9,
      requestFingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      acceptedRevision: 10,
      changedCount: 2,
      replayed: false,
    });
    const compact = parseAgentOsV1SessionCompactReceipt({
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_SESSION_COMPACT_OPERATION,
      target: COMPACT_TARGET,
      requestFingerprint: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      disposition: "not_needed",
      replayed: true,
    });

    expect(clear.changedCount).toBe(2);
    expect(clear.replayed).toBe(false);
    expect(compact.disposition).toBe("not_needed");
    expect(Object.isFrozen(clear)).toBe(true);
    expect(Object.isFrozen(compact.target)).toBe(true);
  });

  test("rejects clear/compact receipts with authority or transport fields", () => {
    const clear = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
      target: QUEUE_TARGET,
      filter: "all",
      expectedRevision: 9,
      requestFingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      acceptedRevision: 10,
      changedCount: 2,
      replayed: false,
    };
    expectContractError({ ...clear, tenantId: "tenant.demo" }, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueClearReceipt(value)
    );
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_SESSION_COMPACT_OPERATION,
        target: COMPACT_TARGET,
        requestFingerprint: clear.requestFingerprint,
        disposition: "applied",
        replayed: false,
        transport: "ws",
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1SessionCompactReceipt(value)
    );
  });

  test("correlates a clear receipt and rejects drifted target or fingerprint", () => {
    const request = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
      target: QUEUE_TARGET,
      filter: "all",
      expectedRevision: 9,
    } as const;
    const binding = createAgentOsV1QueueCompactRequestBinding({
      requestId: "request.clear",
      request,
    });
    const receipt = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
      target: QUEUE_TARGET,
      filter: "all",
      expectedRevision: 9,
      requestFingerprint: binding.requestFingerprint,
      acceptedRevision: 10,
      changedCount: 2,
      replayed: false,
    };
    expect(assertAgentOsV1QueueCompactResponseCorrelated(receipt, binding)).toEqual(receipt);
    expect(() =>
      assertAgentOsV1QueueCompactResponseCorrelated(
        {
          ...receipt,
          requestFingerprint:
            "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        },
        binding
      )
    ).toThrow("STATE_CONFLICT");
    expect(() =>
      assertAgentOsV1QueueCompactResponseCorrelated(
        { ...receipt, target: { ...QUEUE_TARGET, attemptId: "attempt.other" } },
        binding
      )
    ).toThrow("STATE_CONFLICT");
    expectContractError(
      {
        ...receipt,
        filter: "steer",
        expectedRevision: 0,
        acceptedRevision: 0,
        changedCount: 999,
      },
      "STATE_CONFLICT",
      (value) => assertAgentOsV1QueueCompactResponseCorrelated(value, binding)
    );
  });

  test("correlates not-modified reads to the supplied cursor", () => {
    const request = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      cursor: "cursor.same",
    } as const;
    const binding = createAgentOsV1QueueCompactRequestBinding({
      requestId: "request.read-cursor",
      request,
    });
    const response = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      disposition: "not-modified",
      cursor: "cursor.same",
      queueRevision: 10,
    } as const;
    expect(assertAgentOsV1QueueCompactResponseCorrelated(response, binding)).toEqual(response);
    expectContractError({ ...response, cursor: "cursor.other" }, "STATE_CONFLICT", (value) =>
      assertAgentOsV1QueueCompactResponseCorrelated(value, binding)
    );

    const nullCursorBinding = createAgentOsV1QueueCompactRequestBinding({
      requestId: "request.read-null",
      request: { ...request, cursor: null },
    });
    expectContractError(response, "STATE_CONFLICT", (value) =>
      assertAgentOsV1QueueCompactResponseCorrelated(value, nullCursorBinding)
    );
  });
});

describe("agent-os queue / compact v1 owner seam", () => {
  test("requires fresh admission and correlates an injected read response", async () => {
    let admissions = 0;
    let dispatches = 0;
    const client = createAgentOsV1QueueCompactReferenceClient({
      admit: (context) => {
        admissions += 1;
        expect(context.requestId).toBe("request.read");
        expect(context.request.operation).toBe(AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION);
        expect(Object.isFrozen(context)).toBe(true);
        return {
          kind: "fresh-admission",
          requestId: context.requestId,
          requestFingerprint: context.requestBinding.requestFingerprint,
        };
      },
      dispatch: (context) => {
        dispatches += 1;
        expect(context.replay).toBe(false);
        return {
          schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
          operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
          target: QUEUE_TARGET,
          disposition: "snapshot",
          cursor: "cursor.next",
          queueRevision: 10,
          items: [],
        };
      },
    });
    const result = await client.request(
      {
        requestId: "request.read",
        request: {
          schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
          operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
          target: QUEUE_TARGET,
          cursor: null,
        },
      },
      { freshAdmission: true }
    );
    expect(result.disposition).toBe("accepted");
    if (result.disposition !== "accepted") throw new Error("expected accepted result");
    expect(result.response.operation).toBe(AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION);
    expect(admissions).toBe(1);
    expect(dispatches).toBe(1);
  });

  test("same binding replay requires fresh admission; independent recovery fails closed", async () => {
    let admissions = 0;
    let dispatches = 0;
    const client = createAgentOsV1QueueCompactReferenceClient({
      admit: () => {
        admissions += 1;
        return {
          kind: "fresh-admission",
          requestId: "request.clear",
          requestFingerprint: createAgentOsV1QueueCompactRequestFingerprint({
            requestId: "request.clear",
            request: {
              schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
              operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
              target: QUEUE_TARGET,
              filter: "all",
              expectedRevision: 9,
            },
          }),
        };
      },
      dispatch: (context) => {
        dispatches += 1;
        return {
          schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
          operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
          target: QUEUE_TARGET,
          filter: "all",
          expectedRevision: 9,
          requestFingerprint: context.requestBinding.requestFingerprint,
          acceptedRevision: 10,
          changedCount: 2,
          replayed: false,
        };
      },
    });
    const envelope = {
      requestId: "request.clear",
      request: {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_CLEAR_OPERATION,
        target: QUEUE_TARGET,
        filter: "all",
        expectedRevision: 9,
      },
    } as const;
    const binding = createAgentOsV1QueueCompactRequestBinding(envelope);
    const replay = await client.request(envelope, { existingBinding: binding });
    expect(replay.disposition).toBe("replay_requires_fresh_admission");
    expect(admissions).toBe(0);
    expect(dispatches).toBe(0);

    await expect(
      client.request(envelope, { existingBinding: binding, freshAdmission: true })
    ).resolves.toMatchObject({ disposition: "accepted" });
    expect(admissions).toBe(1);
    expect(dispatches).toBe(1);

    await expect(
      client.request(envelope, {
        existingBinding: {
          ...binding,
          requestFingerprint:
            "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        },
        freshAdmission: true,
      })
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    expect(admissions).toBe(1);
    expect(dispatches).toBe(1);

    const other = { ...envelope, requestId: "request.other" };
    await expect(
      client.request(other, { existingBinding: binding, freshAdmission: true })
    ).rejects.toThrow("RECOVERY_REQUIRED");
    expect(admissions).toBe(1);
    expect(dispatches).toBe(1);
  });

  test("redacts owner failures and rejects hostile factory/envelope shapes before callbacks", async () => {
    let getterInvoked = false;
    const options = {} as Record<string, unknown>;
    Object.defineProperty(options, "admit", {
      enumerable: true,
      get: () => {
        getterInvoked = true;
        throw new Error("raw getter detail");
      },
    });
    Object.defineProperty(options, "dispatch", { enumerable: true, value: () => undefined });
    expect(() => createAgentOsV1QueueCompactReferenceClient(options)).toThrow("INPUT_INVALID");
    expect(getterInvoked).toBe(false);

    expect(() =>
      createAgentOsV1QueueCompactReferenceClient(
        new Proxy(
          { admit: () => undefined, dispatch: () => undefined },
          {
            ownKeys: () => {
              throw new Error("proxy trap detail");
            },
          }
        )
      )
    ).toThrow("INPUT_INVALID");
    expect(() =>
      createAgentOsV1QueueCompactReferenceClient(
        new Proxy({ admit: () => undefined, dispatch: () => undefined }, {})
      )
    ).toThrow("INPUT_INVALID");

    const client = createAgentOsV1QueueCompactReferenceClient({
      admit: () => {
        throw new Error("raw owner detail");
      },
      dispatch: () => undefined,
    });
    const envelope = {
      requestId: "request.raw",
      request: {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        cursor: null,
      },
    };
    await expect(client.request(envelope, { freshAdmission: true })).rejects.toThrow(
      "OWNER_UNAVAILABLE"
    );
    let wrapperGetterInvoked = false;
    const hostileEnvelope = { ...envelope } as Record<string, unknown>;
    Object.defineProperty(hostileEnvelope, "request", {
      enumerable: true,
      get: () => {
        wrapperGetterInvoked = true;
        throw new Error("raw wrapper detail");
      },
    });
    await expect(client.request(hostileEnvelope, { freshAdmission: true })).rejects.toThrow(
      "INPUT_INVALID"
    );
    expect(wrapperGetterInvoked).toBe(false);
  });

  test("supports session.compact with an exact-source target and compact disposition", async () => {
    let dispatches = 0;
    const client = createAgentOsV1QueueCompactReferenceClient({
      admit: (context) => ({
        kind: "fresh-admission",
        requestId: context.requestId,
        requestFingerprint: context.requestBinding.requestFingerprint,
      }),
      dispatch: (context) => {
        dispatches += 1;
        expect(context.request.operation).toBe(AGENT_OS_V1_SESSION_COMPACT_OPERATION);
        return {
          schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
          operation: AGENT_OS_V1_SESSION_COMPACT_OPERATION,
          target: COMPACT_TARGET,
          requestFingerprint: context.requestBinding.requestFingerprint,
          disposition: "applied",
          replayed: false,
        };
      },
    });
    const result = await client.request(
      {
        requestId: "request.compact",
        request: {
          schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
          operation: AGENT_OS_V1_SESSION_COMPACT_OPERATION,
          target: COMPACT_TARGET,
        },
      },
      { freshAdmission: true }
    );
    expect(result.disposition).toBe("accepted");
    if (result.disposition !== "accepted") throw new Error("expected accepted result");
    expect(result.response.operation).toBe(AGENT_OS_V1_SESSION_COMPACT_OPERATION);
    expect(dispatches).toBe(1);
  });

  test("fails closed for symbol/accessor/prototype/cycle/depth/width/byte and special arrays", () => {
    const read = {
      schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
      target: QUEUE_TARGET,
      cursor: null,
    };
    const accessor = { ...read } as Record<string, unknown>;
    let invoked = false;
    Object.defineProperty(accessor, "cursor", {
      enumerable: true,
      get: () => {
        invoked = true;
        throw new Error("accessor detail");
      },
    });
    expectContractError(accessor, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    expect(invoked).toBe(false);
    expectContractError({ ...read, [Symbol("hidden")]: true }, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    const dangerousKey = { ...read } as Record<string, unknown>;
    Object.defineProperty(dangerousKey, "__proto__", {
      configurable: true,
      enumerable: true,
      value: "bad",
      writable: true,
    });
    expectContractError(dangerousKey, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    const nonEnumerable = { ...read } as Record<string, unknown>;
    Object.defineProperty(nonEnumerable, "hidden", {
      configurable: true,
      enumerable: false,
      value: true,
      writable: true,
    });
    expectContractError(nonEnumerable, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    expectContractError(Object.create(read), "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    const cycle = { ...read } as Record<string, unknown>;
    cycle.extra = cycle;
    expectContractError(cycle, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    let nested: Record<string, unknown> = {};
    for (let index = 0; index < 9; index += 1) nested = { child: nested };
    expectContractError({ ...read, extra: nested }, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    const wide = { ...read } as Record<string, unknown>;
    for (let index = 0; index < 40; index += 1) wide[`extra${index}`] = true;
    expectContractError(wide, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    expectContractError({ ...read, cursor: "x".repeat(1_025) }, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    expectContractError({ ...read, cursor: "界".repeat(513) }, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    const sparse = [] as unknown[];
    Object.defineProperty(sparse, "01", { value: "bad", enumerable: true });
    expectContractError({ ...read, cursor: sparse }, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    const outOfRange = [] as unknown[];
    Object.defineProperty(outOfRange, "4294967295", { value: "bad", enumerable: true });
    expectContractError({ ...read, cursor: outOfRange }, "INPUT_INVALID", (value) =>
      parseAgentOsV1PromptQueueReadRequest(value)
    );
    const originalStructuredClone = globalThis.structuredClone;
    try {
      globalThis.structuredClone = undefined;
      expectContractError(read, "INPUT_INVALID", (value) =>
        parseAgentOsV1PromptQueueReadRequest(value)
      );
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
    const sharedItem = {
      itemId: "item.shared",
      kind: "steer",
      status: "queued",
      instructionDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      revision: 9,
    };
    expectContractError(
      {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        disposition: "snapshot",
        cursor: "cursor.next",
        queueRevision: 10,
        items: [sharedItem, sharedItem],
      },
      "INPUT_INVALID",
      (value) => parseAgentOsV1PromptQueueReadResponse(value)
    );
  });

  test("pre-abort skips owner callbacks and in-flight abort suppresses late completion", async () => {
    const envelope = {
      requestId: "request.abort",
      request: {
        schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
        operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
        target: QUEUE_TARGET,
        cursor: null,
      },
    } as const;
    let preAbortAdmissions = 0;
    const preAbortClient = createAgentOsV1QueueCompactReferenceClient({
      admit: () => {
        preAbortAdmissions += 1;
        return undefined;
      },
      dispatch: () => undefined,
    });
    const preAbort = new AbortController();
    preAbort.abort();
    await expect(
      preAbortClient.request(envelope, { freshAdmission: true, signal: preAbort.signal })
    ).rejects.toThrow("The operation was aborted");
    expect(preAbortAdmissions).toBe(0);

    let resolveAdmission: ((value: unknown) => void) | undefined;
    let admissions = 0;
    let dispatches = 0;
    const client = createAgentOsV1QueueCompactReferenceClient({
      admit: (context) => {
        admissions += 1;
        return new Promise((resolve) => {
          resolveAdmission = () =>
            resolve({
              kind: "fresh-admission",
              requestId: context.requestId,
              requestFingerprint: context.requestBinding.requestFingerprint,
            });
        });
      },
      dispatch: () => {
        dispatches += 1;
        return {
          schemaVersion: AGENT_OS_V1_QUEUE_COMPACT_SCHEMA,
          operation: AGENT_OS_V1_PROMPT_QUEUE_READ_OPERATION,
          target: QUEUE_TARGET,
          disposition: "not-modified",
          cursor: "cursor.same",
          queueRevision: 10,
        };
      },
    });
    const controller = new AbortController();
    const pending = client.request(envelope, { freshAdmission: true, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow("The operation was aborted");
    resolveAdmission?.(undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(admissions).toBe(1);
    expect(dispatches).toBe(0);
  });
});
