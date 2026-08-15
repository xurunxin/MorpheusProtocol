import { describe, expect, test } from "bun:test";

import {
  AgentOsV1SessionProjectionContractError,
  assertAgentOsV1SessionProjectionRequestBindingCompatible,
  canonicalAgentOsV1SessionProjectionRequestSource,
  canonicalAgentOsV1SessionProjectionSource,
  createAgentOsV1SessionProjectionRequestBinding,
  createAgentOsV1SessionProjectionRequestFingerprint,
  createAgentOsV1SessionProjectionDigest,
  parseAgentOsV1SessionProjectionReadResponse,
  parseAgentOsV1SessionProjectionReadRequest,
} from "../src/agent-os-v1-session-projection.js";

const REQUEST = {
  schemaVersion: "agent-os-session-projection/v1",
  operation: "session.read",
  sessionId: "session.demo",
  cursor: null,
} as const;

const PROJECTION = {
  generation: 7,
  projectionDigest: "sha256:1bd3650b9fc4017a3b28d10af1d5565a2be899ed3c5a502d8516c2f6a19c6bfa",
  contentPolicy: "omitted.v1",
  turns: [
    {
      turnId: "turn-1",
      runId: "run-1",
      turnSequence: 1,
      checkpointRevision: 2,
      status: "succeeded",
    },
  ],
} as const;

function expectContractError(
  value: unknown,
  code: string,
  parse: (input: unknown) => unknown = parseAgentOsV1SessionProjectionReadRequest
): void {
  try {
    parse(value);
    throw new Error("expected contract error");
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsV1SessionProjectionContractError);
    expect((error as AgentOsV1SessionProjectionContractError).code).toBe(code);
  }
}

describe("agent-os session projection v1 request", () => {
  test("strictly parses, copies, and freezes the read payload", () => {
    const parsed = parseAgentOsV1SessionProjectionReadRequest({ ...REQUEST });

    expect(parsed).toEqual(REQUEST);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(parsed).not.toBe(REQUEST);
  });

  test("accepts an opaque bounded cursor without interpreting it", () => {
    const parsed = parseAgentOsV1SessionProjectionReadRequest({
      ...REQUEST,
      cursor: "opaque.cursor~with=padding",
    });

    expect(parsed.cursor).toBe("opaque.cursor~with=padding");
  });

  test("rejects unknown or missing fields and all non-session operations", () => {
    expectContractError({ ...REQUEST, extra: true }, "INPUT_INVALID");
    const missing = { ...REQUEST } as Record<string, unknown>;
    delete missing.cursor;
    expectContractError(missing, "INPUT_INVALID");
    expectContractError({ ...REQUEST, operation: "session.write" }, "INPUT_INVALID");
    expectContractError(
      { ...REQUEST, schemaVersion: "agent-os-session-projection/v2" },
      "INPUT_INVALID"
    );
    expectContractError({ ...REQUEST, sessionId: " " }, "INPUT_INVALID");
    expectContractError({ requestId: " ", request: REQUEST }, "INPUT_INVALID", (value) =>
      createAgentOsV1SessionProjectionRequestFingerprint(value as never)
    );
  });

  test("rejects hostile plain-data shapes without invoking accessors", () => {
    const accessor = { ...REQUEST } as Record<string, unknown>;
    Object.defineProperty(accessor, "cursor", {
      enumerable: true,
      get: () => {
        throw new Error("accessor invoked");
      },
    });
    expectContractError(accessor, "INPUT_INVALID");

    const symbol = { ...REQUEST, [Symbol("hidden")]: true };
    expectContractError(symbol, "INPUT_INVALID");

    const hidden = { ...REQUEST } as Record<string, unknown>;
    Object.defineProperty(hidden, "cursor", { value: null, enumerable: false });
    expectContractError(hidden, "INPUT_INVALID");

    expectContractError(Object.create({ ...REQUEST }), "INPUT_INVALID");

    const proxied = new Proxy({ ...REQUEST }, {});
    expectContractError(proxied, "INPUT_INVALID");
  });

  test("does not retain mutable input references", () => {
    const input = { ...REQUEST } as {
      schemaVersion: string;
      operation: string;
      sessionId: string;
      cursor: string | null;
    };
    const parsed = parseAgentOsV1SessionProjectionReadRequest(input);
    input.sessionId = "session.changed";
    input.cursor = "cursor.changed";

    expect(parsed.sessionId).toBe("session.demo");
    expect(parsed.cursor).toBeNull();
  });

  test("fails closed for cycles, depth, width, and byte budgets", () => {
    const cycle = { ...REQUEST } as Record<string, unknown>;
    cycle.extra = cycle;
    expectContractError(cycle, "INPUT_INVALID");

    let nested: Record<string, unknown> = {};
    for (let index = 0; index < 9; index += 1) nested = { child: nested };
    expectContractError({ ...REQUEST, extra: nested }, "INPUT_INVALID");

    const wide = { ...REQUEST } as Record<string, unknown>;
    for (let index = 0; index < 40; index += 1) wide[`extra${index}`] = true;
    expectContractError(wide, "INPUT_INVALID");

    expectContractError({ ...REQUEST, cursor: "x".repeat(1_025) }, "INPUT_INVALID");

    const sparse = [] as unknown[];
    Object.defineProperty(sparse, "01", { value: "bad", enumerable: true });
    expectContractError({ ...REQUEST, cursor: sparse }, "INPUT_INVALID");

    const tooLargeKey = [] as unknown[];
    Object.defineProperty(tooLargeKey, "4294967295", { value: "bad", enumerable: true });
    expectContractError({ ...REQUEST, cursor: tooLargeKey }, "INPUT_INVALID");

    const sharedTurn = { ...PROJECTION.turns[0] };
    expectContractError(
      {
        schemaVersion: "agent-os-session-projection/v1",
        operation: "session.read",
        sessionId: "session.demo",
        disposition: "snapshot",
        cursor: "cursor.next",
        projection: { ...PROJECTION, turns: [sharedTurn, sharedTurn] },
      },
      "INPUT_INVALID",
      parseAgentOsV1SessionProjectionReadResponse
    );

    const originalStructuredClone = globalThis.structuredClone;
    try {
      globalThis.structuredClone = undefined;
      expectContractError(REQUEST, "INPUT_INVALID");
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
  });

  test("rejects a wrapper getter or unknown wrapper field without invoking it", () => {
    let invoked = false;
    const wrapper = { requestId: "request.demo", request: REQUEST } as Record<string, unknown>;
    Object.defineProperty(wrapper, "request", {
      enumerable: true,
      get: () => {
        invoked = true;
        throw new Error("wrapper getter invoked");
      },
    });
    expectContractError(wrapper, "INPUT_INVALID", (value) =>
      createAgentOsV1SessionProjectionRequestFingerprint(value as never)
    );
    expect(invoked).toBe(false);
    expectContractError(
      { requestId: "request.demo", request: REQUEST, extra: true },
      "INPUT_INVALID",
      (value) => createAgentOsV1SessionProjectionRequestFingerprint(value as never)
    );
    expectContractError(
      Object.create({ requestId: "request.demo", request: REQUEST }),
      "INPUT_INVALID",
      (value) => createAgentOsV1SessionProjectionRequestFingerprint(value as never)
    );
  });
});

describe("agent-os session projection v1 response", () => {
  test("parses and freezes an atomic snapshot with ordered turns", () => {
    const parsed = parseAgentOsV1SessionProjectionReadResponse({
      schemaVersion: "agent-os-session-projection/v1",
      operation: "session.read",
      sessionId: "session.demo",
      disposition: "snapshot",
      cursor: "cursor.next",
      projection: PROJECTION,
    });

    expect(parsed.disposition).toBe("snapshot");
    if (parsed.disposition !== "snapshot") throw new Error("expected snapshot");
    expect(parsed.projection).toEqual(PROJECTION);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.projection)).toBe(true);
    expect(Object.isFrozen(parsed.projection.turns)).toBe(true);
  });

  test("accepts not-modified and snapshot-required without projection data", () => {
    const notModified = parseAgentOsV1SessionProjectionReadResponse({
      schemaVersion: "agent-os-session-projection/v1",
      operation: "session.read",
      sessionId: "session.demo",
      disposition: "not-modified",
      cursor: "cursor.same",
    });
    expect(notModified).toEqual({
      schemaVersion: "agent-os-session-projection/v1",
      operation: "session.read",
      sessionId: "session.demo",
      disposition: "not-modified",
      cursor: "cursor.same",
    });

    const required = parseAgentOsV1SessionProjectionReadResponse({
      schemaVersion: "agent-os-session-projection/v1",
      operation: "session.read",
      sessionId: "session.demo",
      disposition: "snapshot-required",
      cursor: null,
    });
    expect(required).toEqual({
      schemaVersion: "agent-os-session-projection/v1",
      operation: "session.read",
      sessionId: "session.demo",
      disposition: "snapshot-required",
      cursor: null,
    });
  });

  test("rejects projection order drift and fields that could self-report authority", () => {
    expectContractError(
      {
        schemaVersion: "agent-os-session-projection/v1",
        operation: "session.read",
        sessionId: "session.demo",
        disposition: "snapshot",
        cursor: "cursor.next",
        projection: {
          ...PROJECTION,
          turns: [
            PROJECTION.turns[0],
            { ...PROJECTION.turns[0], turnId: "turn-2", turnSequence: 1 },
          ],
        },
      },
      "INPUT_INVALID",
      parseAgentOsV1SessionProjectionReadResponse
    );
    expectContractError(
      {
        schemaVersion: "agent-os-session-projection/v1",
        operation: "session.read",
        sessionId: "session.demo",
        disposition: "not-modified",
        cursor: "cursor.same",
        tenantId: "tenant.demo",
      },
      "INPUT_INVALID",
      parseAgentOsV1SessionProjectionReadResponse
    );
    expectContractError(
      {
        schemaVersion: "agent-os-session-projection/v1",
        operation: "session.read",
        sessionId: "session.demo",
        disposition: "snapshot-required",
        cursor: null,
        projection: PROJECTION,
      },
      "INPUT_INVALID",
      parseAgentOsV1SessionProjectionReadResponse
    );
  });

  test("rejects a mutable response input without retaining nested references", () => {
    const input = {
      schemaVersion: "agent-os-session-projection/v1",
      operation: "session.read",
      sessionId: "session.demo",
      disposition: "snapshot",
      cursor: "cursor.next",
      projection: {
        ...PROJECTION,
        turns: PROJECTION.turns.map((turn) => ({ ...turn })),
      },
    };
    const parsed = parseAgentOsV1SessionProjectionReadResponse(input);
    input.projection.turns[0]!.turnId = "turn.changed";
    expect(parsed.disposition).toBe("snapshot");
    if (parsed.disposition !== "snapshot") throw new Error("expected snapshot");
    expect(parsed.projection.turns[0]!.turnId).toBe("turn-1");
  });
});

describe("agent-os session projection v1 binding", () => {
  test("uses an independently worked canonical digest for the projection and request", () => {
    expect(
      canonicalAgentOsV1SessionProjectionSource({
        sessionId: "session.demo",
        projection: PROJECTION,
      })
    ).toBe(
      '{"contentPolicy":"omitted.v1","generation":7,"operation":"session.read","schemaVersion":"agent-os-session-projection/v1","sessionId":"session.demo","turns":[{"checkpointRevision":2,"runId":"run-1","status":"succeeded","turnId":"turn-1","turnSequence":1}]}'
    );
    expect(
      createAgentOsV1SessionProjectionDigest({
        sessionId: "session.demo",
        projection: PROJECTION,
      })
    ).toBe("sha256:1bd3650b9fc4017a3b28d10af1d5565a2be899ed3c5a502d8516c2f6a19c6bfa");
    expect(
      canonicalAgentOsV1SessionProjectionRequestSource({
        requestId: "request.demo",
        request: REQUEST,
      })
    ).toBe(
      '{"cursor":null,"operation":"session.read","requestId":"request.demo","schemaVersion":"agent-os-session-projection/v1","sessionId":"session.demo"}'
    );
    expect(
      createAgentOsV1SessionProjectionRequestFingerprint({
        requestId: "request.demo",
        request: REQUEST,
      })
    ).toBe("sha256:3590685dfb813aec9a9b4f2a787148453697ef9874dec9f0b31f67f9bccf5e0d");
  });

  test("binds request identity and classifies exact replay versus independent requests", () => {
    const first = createAgentOsV1SessionProjectionRequestBinding({
      requestId: "request.demo",
      request: REQUEST,
    });
    const replay = createAgentOsV1SessionProjectionRequestBinding({
      requestId: "request.demo",
      request: { ...REQUEST },
    });
    const independent = createAgentOsV1SessionProjectionRequestBinding({
      requestId: "request.other",
      request: REQUEST,
    });

    expect(first).toEqual({
      requestId: "request.demo",
      sessionId: "session.demo",
      cursor: null,
      requestFingerprint: "sha256:3590685dfb813aec9a9b4f2a787148453697ef9874dec9f0b31f67f9bccf5e0d",
    });
    expect(assertAgentOsV1SessionProjectionRequestBindingCompatible(first, replay)).toBe("replay");
    expect(assertAgentOsV1SessionProjectionRequestBindingCompatible(first, independent)).toBe(
      "independent"
    );
    const tamperedIndependent = {
      ...independent,
      requestFingerprint: first.requestFingerprint,
    };
    expect(() =>
      assertAgentOsV1SessionProjectionRequestBindingCompatible(first, tamperedIndependent)
    ).toThrow("METADATA_CORRUPT");
    expect(Object.isFrozen(first)).toBe(true);
  });

  test("rejects same requestId drift as a stable idempotency conflict", () => {
    const first = createAgentOsV1SessionProjectionRequestBinding({
      requestId: "request.demo",
      request: REQUEST,
    });
    const drifted = createAgentOsV1SessionProjectionRequestBinding({
      requestId: "request.demo",
      request: { ...REQUEST, cursor: "cursor.drift" },
    });
    expect(() => assertAgentOsV1SessionProjectionRequestBindingCompatible(first, drifted)).toThrow(
      "IDEMPOTENCY_CONFLICT"
    );

    const forged = {
      ...first,
      cursor: "cursor.drift",
      requestFingerprint: first.requestFingerprint,
    };
    expect(() => assertAgentOsV1SessionProjectionRequestBindingCompatible(first, forged)).toThrow(
      "IDEMPOTENCY_CONFLICT"
    );
  });

  test("rejects forged or corrupt signed projection metadata", () => {
    expectContractError(
      {
        sessionId: "session.demo",
        projection: { ...PROJECTION, projectionDigest: "sha256:" + "0".repeat(64) },
      },
      "METADATA_CORRUPT",
      (value) => createAgentOsV1SessionProjectionDigest(value as never)
    );
  });

  test("keeps response disposition outcomes and transport metadata separate", () => {
    const outcomes = {
      nullCursor: parseAgentOsV1SessionProjectionReadRequest(REQUEST),
      equal: parseAgentOsV1SessionProjectionReadResponse({
        schemaVersion: "agent-os-session-projection/v1",
        operation: "session.read",
        sessionId: "session.demo",
        disposition: "not-modified",
        cursor: "cursor.same",
      }),
      extension: parseAgentOsV1SessionProjectionReadResponse({
        schemaVersion: "agent-os-session-projection/v1",
        operation: "session.read",
        sessionId: "session.demo",
        disposition: "snapshot",
        cursor: "cursor.next",
        projection: PROJECTION,
      }),
      stale: parseAgentOsV1SessionProjectionReadResponse({
        schemaVersion: "agent-os-session-projection/v1",
        operation: "session.read",
        sessionId: "session.demo",
        disposition: "snapshot-required",
        cursor: null,
      }),
      conflict: parseAgentOsV1SessionProjectionReadResponse({
        schemaVersion: "agent-os-session-projection/v1",
        operation: "session.read",
        sessionId: "session.demo",
        disposition: "snapshot-required",
        cursor: null,
      }),
    };
    expect(outcomes.nullCursor.cursor).toBeNull();
    expect(outcomes.equal.disposition).toBe("not-modified");
    expect(outcomes.extension.disposition).toBe("snapshot");
    expect(outcomes.stale.disposition).toBe("snapshot-required");
    expect(outcomes.conflict.disposition).toBe("snapshot-required");
    for (const response of [
      outcomes.equal,
      outcomes.extension,
      outcomes.stale,
      outcomes.conflict,
    ]) {
      expect("execution" in response).toBe(false);
      expect("transport" in response).toBe(false);
      expect("cancelled" in response).toBe(false);
      expect("lateResponse" in response).toBe(false);
    }
  });
});
