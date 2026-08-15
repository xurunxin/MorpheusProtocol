import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_V1_PROMPT_CONTROL_SCHEMA,
  AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION,
  AGENT_OS_V1_PROMPT_STEER_OPERATION,
  AgentOsV1PromptControlContractError,
  assertAgentOsV1PromptControlReceiptCorrelated,
  assertAgentOsV1PromptControlRequestBindingCompatible,
  canonicalAgentOsV1PromptControlInstructionSource,
  canonicalAgentOsV1PromptControlRequestSource,
  createAgentOsV1PromptControlReferenceClient,
  createAgentOsV1PromptControlInstructionDigest,
  createAgentOsV1PromptControlRequestBinding,
  createAgentOsV1PromptControlRequestFingerprint,
  parseAgentOsV1PromptControlReceipt,
  parseAgentOsV1PromptControlRequest,
  parseAgentOsV1PromptFollowUpRequest,
  parseAgentOsV1PromptSteerRequest,
} from "../src/agent-os-v1-prompt-control.js";

const INSTRUCTION = {
  messages: [{ role: "user", content: "steer the active turn" }],
} as const;

const INSTRUCTION_DIGEST =
  "sha256:2b3f8bc9a29c8d152b60602221c2a328bb306cb06a4c64f7f9257b4d3a9e80b8";

const STEER_REQUEST = {
  schemaVersion: AGENT_OS_V1_PROMPT_CONTROL_SCHEMA,
  operation: AGENT_OS_V1_PROMPT_STEER_OPERATION,
  target: {
    sessionId: "session.demo",
    runId: "run.demo",
    attemptId: "attempt.demo",
    storeGeneration: 7,
  },
  instruction: INSTRUCTION,
  instructionDigest: INSTRUCTION_DIGEST,
} as const;

const FOLLOW_UP_INSTRUCTION = {
  messages: [{ role: "user", content: "continue after the active turn" }],
} as const;

const FOLLOW_UP_REQUEST_BASE = {
  schemaVersion: AGENT_OS_V1_PROMPT_CONTROL_SCHEMA,
  operation: AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION,
  predecessor: STEER_REQUEST.target,
  instruction: FOLLOW_UP_INSTRUCTION,
} as const;

function followUpRequest() {
  const instruction = FOLLOW_UP_REQUEST_BASE.instruction;
  return {
    ...FOLLOW_UP_REQUEST_BASE,
    instructionDigest: createAgentOsV1PromptControlInstructionDigest(instruction),
  };
}

function expectContractError(
  input: unknown,
  code: string,
  parse: (value: unknown) => unknown
): void {
  try {
    parse(input);
    throw new Error("expected contract error");
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsV1PromptControlContractError);
    expect((error as AgentOsV1PromptControlContractError).code).toBe(code);
    expect((error as Error).message).toBe(code);
  }
}

describe("agent-os execution.v1 prompt control", () => {
  test("parses the exact prompt.steer payload and freezes its copied instruction", () => {
    const request = {
      schemaVersion: AGENT_OS_V1_PROMPT_CONTROL_SCHEMA,
      operation: AGENT_OS_V1_PROMPT_STEER_OPERATION,
      target: {
        sessionId: "session.demo",
        runId: "run.demo",
        attemptId: "attempt.demo",
        storeGeneration: 7,
      },
      instruction: INSTRUCTION,
      instructionDigest: createAgentOsV1PromptControlInstructionDigest(INSTRUCTION),
    } as const;

    const parsed = parseAgentOsV1PromptSteerRequest(request);

    expect(parsed).toEqual(request);
    expect(parsed.operation).toBe("prompt.steer");
    expect(AGENT_OS_V1_PROMPT_FOLLOW_UP_OPERATION).toBe("prompt.follow-up");
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.target)).toBe(true);
    expect(Object.isFrozen(parsed.instruction)).toBe(true);
    expect(parsed).not.toBe(request);
  });

  test("parses prompt.follow-up with a predecessor and dispatches only the two operations", () => {
    const request = followUpRequest();
    const parsed = parseAgentOsV1PromptFollowUpRequest(request);
    expect(parsed).toEqual(request);
    expect(parsed.predecessor).toEqual(STEER_REQUEST.target);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.predecessor)).toBe(true);
    expect(parseAgentOsV1PromptControlRequest(request)).toEqual(parsed);
    expectContractError(
      { ...request, operation: "prompt.cancel" },
      "INPUT_INVALID",
      parseAgentOsV1PromptControlRequest
    );
  });

  test("uses the independent canonical instruction and request worked literals", () => {
    expect(canonicalAgentOsV1PromptControlInstructionSource(INSTRUCTION)).toBe(
      '{"prompt":{"messages":[{"content":"steer the active turn","role":"user"}]},"schemaVersion":"agent-os-canonical-prompt-input/v1"}'
    );
    expect(createAgentOsV1PromptControlInstructionDigest(INSTRUCTION)).toBe(INSTRUCTION_DIGEST);

    expect(
      canonicalAgentOsV1PromptControlRequestSource({
        requestId: "request.demo",
        request: STEER_REQUEST,
      })
    ).toBe(
      '{"instructionDigest":"sha256:2b3f8bc9a29c8d152b60602221c2a328bb306cb06a4c64f7f9257b4d3a9e80b8","operation":"prompt.steer","requestId":"request.demo","schemaVersion":"agent-os-prompt-control/v1","sessionId":"session.demo","target":{"attemptId":"attempt.demo","runId":"run.demo","sessionId":"session.demo","storeGeneration":7}}'
    );
    expect(
      createAgentOsV1PromptControlRequestFingerprint({
        requestId: "request.demo",
        request: STEER_REQUEST,
      })
    ).toBe("sha256:00aa43319ca8d973625f3d6aa0f5d5031d4ce350d83aedc334bb3eeba8523dbd");
  });
});

describe("agent-os execution.v1 prompt control bindings", () => {
  test("replays an identical binding and rejects same-id drift", () => {
    const first = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    const replay = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: { ...STEER_REQUEST, target: { ...STEER_REQUEST.target } },
    });
    const independent = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.other",
      request: STEER_REQUEST,
    });

    expect(first).toEqual({
      requestId: "request.demo",
      operation: "prompt.steer",
      sessionId: "session.demo",
      target: STEER_REQUEST.target,
      instructionDigest: INSTRUCTION_DIGEST,
      requestFingerprint: "sha256:00aa43319ca8d973625f3d6aa0f5d5031d4ce350d83aedc334bb3eeba8523dbd",
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.target)).toBe(true);
    expect(assertAgentOsV1PromptControlRequestBindingCompatible(first, replay)).toBe("replay");
    expect(assertAgentOsV1PromptControlRequestBindingCompatible(first, independent)).toBe(
      "independent"
    );

    expectContractError(
      createAgentOsV1PromptControlRequestBinding({
        requestId: "request.demo",
        request: { ...STEER_REQUEST, target: { ...STEER_REQUEST.target, storeGeneration: 8 } },
      }),
      "IDEMPOTENCY_CONFLICT",
      (value) => assertAgentOsV1PromptControlRequestBindingCompatible(first, value)
    );
    expectContractError(
      { ...independent, requestFingerprint: first.requestFingerprint },
      "INPUT_INVALID",
      (value) => assertAgentOsV1PromptControlRequestBindingCompatible(first, value)
    );
  });

  test("treats a supplied same-id fingerprint-only drift as an idempotency conflict", () => {
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    const forged = { ...binding, requestFingerprint: `sha256:${"f".repeat(64)}` };
    expectContractError(forged, "IDEMPOTENCY_CONFLICT", (value) =>
      assertAgentOsV1PromptControlRequestBindingCompatible(binding, value)
    );
    expectContractError(forged, "INPUT_INVALID", (value) =>
      assertAgentOsV1PromptControlRequestBindingCompatible(forged, value)
    );
    expectContractError({ ...forged, requestId: "request.other" }, "INPUT_INVALID", (value) =>
      assertAgentOsV1PromptControlRequestBindingCompatible(binding, value)
    );
  });

  test("binds operation as well as target so steer and follow-up cannot substitute", () => {
    const steer = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.same",
      request: STEER_REQUEST,
    });
    const followUp = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.same",
      request: followUpRequest(),
    });
    expect(() => assertAgentOsV1PromptControlRequestBindingCompatible(steer, followUp)).toThrow(
      "IDEMPOTENCY_CONFLICT"
    );
  });
});

describe("agent-os execution.v1 prompt control receipt", () => {
  test("strictly correlates a redacted accepted/replayed receipt", () => {
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    const receipt = {
      operation: "prompt.steer",
      sessionId: "session.demo",
      target: STEER_REQUEST.target,
      requestFingerprint: binding.requestFingerprint,
      acceptedRevision: 4,
      replayed: false,
    } as const;
    const parsed = parseAgentOsV1PromptControlReceipt(receipt);
    expect(parsed).toEqual(receipt);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.target)).toBe(true);
    expect(assertAgentOsV1PromptControlReceiptCorrelated(receipt, binding)).toEqual(receipt);
    expect("requestId" in parsed).toBe(false);
    expect("prompt" in parsed).toBe(false);
    expect("principal" in parsed).toBe(false);
    expect("transport" in parsed).toBe(false);
  });

  test("rejects response operation, target, and fingerprint drift with redacted stable errors", () => {
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    const receipt = {
      operation: "prompt.steer",
      sessionId: "session.demo",
      target: STEER_REQUEST.target,
      requestFingerprint: binding.requestFingerprint,
      acceptedRevision: 4,
      replayed: true,
    } as const;
    expectContractError({ ...receipt, operation: "prompt.follow-up" }, "STATE_CONFLICT", (value) =>
      assertAgentOsV1PromptControlReceiptCorrelated(value, binding)
    );
    expectContractError(
      { ...receipt, target: { ...receipt.target, storeGeneration: 8 } },
      "STATE_CONFLICT",
      (value) => assertAgentOsV1PromptControlReceiptCorrelated(value, binding)
    );
    expectContractError(
      { ...receipt, requestFingerprint: "sha256:" + "f".repeat(64) },
      "STATE_CONFLICT",
      (value) => assertAgentOsV1PromptControlReceiptCorrelated(value, binding)
    );
    expectContractError(
      { ...receipt, acceptedRevision: -1 },
      "INPUT_INVALID",
      parseAgentOsV1PromptControlReceipt
    );
    expectContractError(
      { ...binding, requestFingerprint: "sha256:" + "0".repeat(64) },
      "INPUT_INVALID",
      (value) => assertAgentOsV1PromptControlReceiptCorrelated(receipt, value)
    );
  });
});

describe("agent-os execution.v1 prompt control hostile data boundaries", () => {
  test("rejects accessors, proxies, symbols, non-enumerables, and inherited fields", () => {
    const accessor = { ...STEER_REQUEST } as Record<string, unknown>;
    let invoked = false;
    Object.defineProperty(accessor, "instruction", {
      enumerable: true,
      get: () => {
        invoked = true;
        throw new Error("accessor invoked");
      },
    });
    expectContractError(accessor, "INPUT_INVALID", parseAgentOsV1PromptSteerRequest);
    expect(invoked).toBe(false);
    expectContractError(
      new Proxy({ ...STEER_REQUEST }, {}),
      "INPUT_INVALID",
      parseAgentOsV1PromptSteerRequest
    );
    expectContractError(
      { ...STEER_REQUEST, [Symbol("hidden")]: true },
      "INPUT_INVALID",
      parseAgentOsV1PromptSteerRequest
    );
    const hidden = { ...STEER_REQUEST } as Record<string, unknown>;
    Object.defineProperty(hidden, "instructionDigest", {
      enumerable: false,
      value: STEER_REQUEST.instructionDigest,
    });
    expectContractError(hidden, "INPUT_INVALID", parseAgentOsV1PromptSteerRequest);
    expectContractError(
      Object.create({ ...STEER_REQUEST }),
      "INPUT_INVALID",
      parseAgentOsV1PromptSteerRequest
    );

    const instructionAccessor = { messages: INSTRUCTION.messages } as Record<string, unknown>;
    Object.defineProperty(instructionAccessor, "messages", {
      enumerable: true,
      get: () => {
        throw new Error("instruction accessor invoked");
      },
    });
    expectContractError(
      instructionAccessor,
      "INPUT_INVALID",
      createAgentOsV1PromptControlInstructionDigest
    );
  });

  test("rejects cycles, shared references, non-canonical array indexes, depth, width, and UTF-8 overflow", () => {
    const cycle = { ...STEER_REQUEST } as Record<string, unknown>;
    cycle.extra = cycle;
    expectContractError(cycle, "INPUT_INVALID", parseAgentOsV1PromptSteerRequest);

    const shared = { role: "user", content: "shared" };
    expectContractError(
      {
        ...STEER_REQUEST,
        instruction: { messages: [shared, shared] },
        instructionDigest: createAgentOsV1PromptControlInstructionDigest({
          messages: [shared],
        }),
      },
      "INPUT_INVALID",
      parseAgentOsV1PromptSteerRequest
    );

    const nonCanonical = [STEER_REQUEST.instruction.messages[0]] as unknown[];
    Object.defineProperty(nonCanonical, "01", { enumerable: true, value: "bad" });
    expectContractError(
      { ...STEER_REQUEST, instruction: { messages: nonCanonical } },
      "INPUT_INVALID",
      parseAgentOsV1PromptSteerRequest
    );

    let nested: Record<string, unknown> = {};
    for (let index = 0; index < 9; index += 1) nested = { child: nested };
    expectContractError(
      { ...STEER_REQUEST, extra: nested },
      "INPUT_INVALID",
      parseAgentOsV1PromptSteerRequest
    );

    const wide = { ...STEER_REQUEST } as Record<string, unknown>;
    for (let index = 0; index < 40; index += 1) wide[`extra${index}`] = true;
    expectContractError(wide, "INPUT_INVALID", parseAgentOsV1PromptSteerRequest);
    expectContractError(
      {
        ...STEER_REQUEST,
        instruction: { messages: [{ role: "user", content: "x".repeat(65_537) }] },
      },
      "INPUT_INVALID",
      parseAgentOsV1PromptSteerRequest
    );
  });

  test("copies before parsing and fails closed when structuredClone is unavailable", () => {
    const input = {
      ...STEER_REQUEST,
      target: { ...STEER_REQUEST.target },
      instruction: { messages: [{ ...STEER_REQUEST.instruction.messages[0] }] },
    };
    const parsed = parseAgentOsV1PromptSteerRequest(input);
    input.target.sessionId = "session.changed";
    input.instruction.messages[0]!.content = "changed";
    expect(parsed.target.sessionId).toBe("session.demo");
    expect(parsed.instruction.messages[0]!.content).toBe("steer the active turn");

    const originalStructuredClone = globalThis.structuredClone;
    try {
      globalThis.structuredClone = undefined;
      expectContractError(STEER_REQUEST, "INPUT_INVALID", parseAgentOsV1PromptSteerRequest);
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
  });

  test("rejects a Proxy when the mutable structuredClone global is replaced by identity", () => {
    const originalStructuredClone = globalThis.structuredClone;
    try {
      globalThis.structuredClone = ((value: unknown) => value) as typeof globalThis.structuredClone;
      expectContractError(
        new Proxy({ ...STEER_REQUEST }, {}),
        "INPUT_INVALID",
        parseAgentOsV1PromptSteerRequest
      );
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
  });
});

describe("agent-os execution.v1 prompt control injected reference seam", () => {
  function admissionFor(binding: ReturnType<typeof createAgentOsV1PromptControlRequestBinding>) {
    return {
      kind: "fresh-admission" as const,
      requestId: binding.requestId,
      requestFingerprint: binding.requestFingerprint,
    };
  }

  function acceptedReceipt(binding: ReturnType<typeof createAgentOsV1PromptControlRequestBinding>) {
    return {
      operation: binding.operation,
      sessionId: binding.sessionId,
      target: binding.target,
      requestFingerprint: binding.requestFingerprint,
      acceptedRevision: 1,
      replayed: false,
    };
  }

  test("rejects hostile factory seams without invoking getters or leaking raw errors", () => {
    let invoked = false;
    const hostile = {
      dispatch: () => undefined,
    } as Record<string, unknown>;
    Object.defineProperty(hostile, "admit", {
      enumerable: true,
      get: () => {
        invoked = true;
        throw new Error("raw factory getter");
      },
    });
    expectContractError(hostile, "INPUT_INVALID", (value) =>
      createAgentOsV1PromptControlReferenceClient(value as never)
    );
    expect(invoked).toBe(false);

    expectContractError(
      new Proxy(
        { admit: () => undefined, dispatch: () => undefined },
        {
          get: () => {
            throw new Error("raw factory proxy");
          },
          ownKeys: () => {
            throw new Error("raw factory ownKeys");
          },
        }
      ),
      "INPUT_INVALID",
      (value) => createAgentOsV1PromptControlReferenceClient(value as never)
    );
  });

  test("requires explicit fresh admission and never grants replay from an identical binding", async () => {
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    let dispatches = 0;
    const client = createAgentOsV1PromptControlReferenceClient({
      admit: ({ requestBinding }) => admissionFor(requestBinding),
      dispatch: (context) => {
        dispatches += 1;
        expect(context.requestId).toBe(binding.requestId);
        expect(context.requestBinding).toEqual(binding);
        expect(context.freshAdmission).toEqual(admissionFor(binding));
        return acceptedReceipt(binding);
      },
    });

    await expect(
      client.request({ requestId: binding.requestId, request: STEER_REQUEST })
    ).rejects.toMatchObject({ code: "OWNER_UNAVAILABLE" });
    expect(dispatches).toBe(0);

    const replay = await client.request(
      { requestId: binding.requestId, request: STEER_REQUEST },
      { existingBinding: binding }
    );
    expect(replay).toEqual({
      disposition: "replay_requires_fresh_admission",
      binding,
    });
    expect(dispatches).toBe(0);

    const accepted = await client.request(
      { requestId: binding.requestId, request: STEER_REQUEST },
      { existingBinding: binding, freshAdmission: true }
    );
    expect(accepted).toEqual({ disposition: "accepted", receipt: acceptedReceipt(binding) });
    expect(dispatches).toBe(1);
  });

  test("fails closed before owner admission when an existing binding request id drifts", async () => {
    const existingBinding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    let admissions = 0;
    let dispatches = 0;
    const client = createAgentOsV1PromptControlReferenceClient({
      admit: ({ requestBinding }) => {
        admissions += 1;
        return admissionFor(requestBinding);
      },
      dispatch: () => {
        dispatches += 1;
        return acceptedReceipt(existingBinding);
      },
    });

    await expect(
      client.request(
        { requestId: "request.other", request: STEER_REQUEST },
        { existingBinding, freshAdmission: true }
      )
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", message: "IDEMPOTENCY_CONFLICT" });
    expect(admissions).toBe(0);
    expect(dispatches).toBe(0);
  });

  test("does not treat a caller-supplied admission receipt as owner admission", async () => {
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    let admissions = 0;
    let dispatches = 0;
    const client = createAgentOsV1PromptControlReferenceClient({
      admit: ({ requestBinding }) => {
        admissions += 1;
        return admissionFor(requestBinding);
      },
      dispatch: () => {
        dispatches += 1;
        return acceptedReceipt(binding);
      },
    });
    await expect(
      client.request(
        { requestId: binding.requestId, request: STEER_REQUEST },
        { freshAdmission: admissionFor(binding) as unknown }
      )
    ).rejects.toMatchObject({ code: "INPUT_INVALID", message: "INPUT_INVALID" });
    expect(admissions).toBe(0);
    expect(dispatches).toBe(0);
  });

  test("pre-abort does not dispatch and in-flight abort suppresses a late resolve", async () => {
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    const input = { requestId: binding.requestId, request: STEER_REQUEST };
    let dispatches = 0;
    let dispatchStartedResolve: () => void = () => undefined;
    const dispatchStarted = new Promise<void>((resolve) => {
      dispatchStartedResolve = resolve;
    });
    let resolveDispatch: (value: unknown) => void = () => undefined;
    const client = createAgentOsV1PromptControlReferenceClient({
      admit: ({ requestBinding }) => admissionFor(requestBinding),
      dispatch: () => {
        dispatches += 1;
        dispatchStartedResolve();
        return new Promise((resolve) => {
          resolveDispatch = resolve;
        });
      },
    });

    const preAborted = new AbortController();
    preAborted.abort();
    await expect(
      client.request(input, {
        freshAdmission: true,
        signal: preAborted.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(dispatches).toBe(0);

    const inFlight = new AbortController();
    const pending = client.request(input, {
      freshAdmission: true,
      signal: inFlight.signal,
    });
    await dispatchStarted;
    expect(dispatches).toBe(1);
    inFlight.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    resolveDispatch(acceptedReceipt(binding));
    await Promise.resolve();
    expect(dispatches).toBe(1);

    let rejectDispatch: (reason: unknown) => void = () => undefined;
    let lateRejectStartedResolve: () => void = () => undefined;
    const lateRejectStarted = new Promise<void>((resolve) => {
      lateRejectStartedResolve = resolve;
    });
    const lateRejectClient = createAgentOsV1PromptControlReferenceClient({
      admit: ({ requestBinding }) => admissionFor(requestBinding),
      dispatch: () => {
        dispatches += 1;
        lateRejectStartedResolve();
        return new Promise((_resolve, reject) => {
          rejectDispatch = reject;
        });
      },
    });
    const lateRejectController = new AbortController();
    const lateRejected = lateRejectClient.request(input, {
      freshAdmission: true,
      signal: lateRejectController.signal,
    });
    await lateRejectStarted;
    lateRejectController.abort();
    await expect(lateRejected).rejects.toMatchObject({ name: "AbortError" });
    rejectDispatch(new Error("late owner failure"));
    await Promise.resolve();
    expect(dispatches).toBe(2);
  });

  test("uses AbortSignal intrinsics instead of mutable own accessors", async () => {
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    const signal = new AbortController().signal;
    Object.defineProperties(signal, {
      aborted: {
        configurable: true,
        get: () => {
          throw new Error("aborted getter invoked");
        },
      },
      addEventListener: {
        configurable: true,
        get: () => {
          throw new Error("addEventListener getter invoked");
        },
      },
      removeEventListener: {
        configurable: true,
        get: () => {
          throw new Error("removeEventListener getter invoked");
        },
      },
    });
    const client = createAgentOsV1PromptControlReferenceClient({
      admit: ({ requestBinding }) => admissionFor(requestBinding),
      dispatch: () => ({
        operation: binding.operation,
        sessionId: binding.sessionId,
        target: binding.target,
        requestFingerprint: binding.requestFingerprint,
        acceptedRevision: 1,
        replayed: false,
      }),
    });
    const result = await client.request(
      { requestId: binding.requestId, request: STEER_REQUEST },
      { freshAdmission: true, signal }
    );
    expect(result.disposition).toBe("accepted");
  });

  test("redacts mutable owner failures without inspecting their traps", async () => {
    const binding = createAgentOsV1PromptControlRequestBinding({
      requestId: "request.demo",
      request: STEER_REQUEST,
    });
    const rawOwnerError = new Proxy(
      { message: "secret owner detail" },
      {
        get: () => {
          throw new Error("owner error getter invoked");
        },
        getPrototypeOf: () => {
          throw new Error("owner error prototype trap invoked");
        },
      }
    );
    const client = createAgentOsV1PromptControlReferenceClient({
      admit: ({ requestBinding }) => admissionFor(requestBinding),
      dispatch: () => {
        throw rawOwnerError;
      },
    });
    await expect(
      client.request(
        { requestId: binding.requestId, request: STEER_REQUEST },
        { freshAdmission: true }
      )
    ).rejects.toMatchObject({ code: "OWNER_UNAVAILABLE", message: "OWNER_UNAVAILABLE" });
  });
});
