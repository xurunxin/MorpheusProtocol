import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
  AgentOsInteractiveV2ContractError,
  createAgentOsInteractiveV2Cursor,
  parseAgentOsInteractiveV2Request,
  AGENT_OS_INTERACTIVE_V3_CAPABILITIES,
  AGENT_OS_INTERACTIVE_V3_DECLARED_CAPABILITIES,
  AGENT_OS_INTERACTIVE_V3_EVENT_SCHEMA_VERSION,
  AGENT_OS_INTERACTIVE_V3_LIMITS,
  AGENT_OS_INTERACTIVE_V3_OPERATIONS,
  AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
  AgentOsInteractiveV3ContractError,
  canonicalAgentOsInteractiveV3Source,
  createAgentOsInteractiveV3CommandFingerprint,
  decodeAgentOsInteractiveV3,
  isAgentOsInteractiveV3ReadOnlyOperation,
  parseAgentOsInteractiveV3,
  parseAgentOsInteractiveV3AckResponse,
  parseAgentOsInteractiveV3CapabilityResponse,
  parseAgentOsInteractiveV3Request,
  serializeAgentOsInteractiveV3,
  serializeAgentOsInteractiveV3Request,
  serializeAgentOsInteractiveV3Response,
} from "../src/index.js";

const digest = (letter: string): `sha256:${string}` =>
  `sha256:${letter.repeat(64)}`;

function base(
  operation: string,
  requestId = `request.${operation}`,
): Record<string, unknown> {
  return {
    schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
    operation,
    requestId,
  };
}

function command(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    commandId: "command.1",
    principal: "principal.owner",
    payloadDigest: digest("a"),
    ...overrides,
  };
}

function mutatingRequests(): readonly Record<string, unknown>[] {
  return [
    { ...base("session.create"), title: "Demo", command: command() },
    {
      ...base("session.fork"),
      sessionId: "session.1",
      command: command(),
    },
    {
      ...base("session.rename"),
      sessionId: "session.1",
      title: "Renamed",
      command: command(),
    },
    {
      ...base("turn.start"),
      sessionId: "session.1",
      turnId: "turn.1",
      message: "hello",
      bindingRevision: 1,
      command: command(),
    },
    {
      ...base("turn.cancel"),
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      reason: "stop",
      command: command({ authorityEpoch: 3, authorityProof: "proof.token" }),
    },
    {
      ...base("turn.retry"),
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      bindingRevision: 1,
      command: command(),
    },
    {
      ...base("provider.binding.create"),
      sessionId: "session.1",
      providerId: "minimax-cn",
      modelId: "MiniMax-M3",
      apiFamily: "openai-responses",
      expectedRevision: 1,
      command: command(),
    },
    {
      ...base("prompt.queue.clear"),
      sessionId: "session.1",
      runId: "run.1",
      expectedRevision: 1,
      command: command(),
    },
    {
      ...base("session.compact"),
      sessionId: "session.1",
      sourceRunId: "run.1",
      command: command(),
    },
    {
      ...base("prompt.steer"),
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      instruction: "steer",
      command: command(),
    },
    {
      ...base("prompt.follow-up"),
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      instruction: "follow-up",
      command: command(),
    },
    {
      ...base("interaction.respond"),
      sessionId: "session.1",
      challengeId: "challenge.1",
      decision: "approve",
      command: command(),
    },
    {
      ...base("context.binding.create"),
      sessionId: "session.1",
      agentId: "agent.1",
      workspaceId: "workspace.1",
      executionTarget: "host",
      providerId: "minimax-cn",
      modelId: "MiniMax-M3",
      apiFamily: "openai-completions",
      expectedBindingRevision: 1,
      command: command(),
    },
    { ...base("config.reconcile"), command: command() },
    {
      ...base("workspace.change.apply"),
      sessionId: "session.1",
      workspaceId: "workspace.1",
      baselineDigest: digest("b"),
      changeDigest: digest("c"),
      expectedWorkspaceRevision: 2,
      command: command(),
    },
  ];
}

function readOnlyRequests(): readonly Record<string, unknown>[] {
  return [
    base("session.catalog.read"),
    base("provider.catalog.read"),
    base("agent.catalog.read"),
    base("workspace.catalog.read"),
    base("execution.catalog.read"),
    base("config.status.read"),
    { ...base("agent.definition.read"), agentId: "agent.1" },
    {
      ...base("workspace.change.preview"),
      sessionId: "session.1",
      workspaceId: "workspace.1",
      baselineDigest: digest("b"),
    },
    {
      ...base("transcript.read"),
      sessionId: "session.1",
      cursor: null,
      limit: 20,
      replay: { storeGeneration: 1, projectionEpoch: 2 },
    },
    {
      ...base("transcript.subscribe"),
      sessionId: "session.1",
      cursor: createAgentOsInteractiveV2Cursor({
        schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
        sessionId: "session.1",
        streamEpoch: "stream-epoch:s.1",
        sequence: 3,
        watermark: 3,
      }),
      limit: 20,
    },
    { ...base("prompt.queue.read"), sessionId: "session.1", runId: "run.1" },
    base("capability.read"),
  ];
}

describe("agent-os-interactive v3 contract", () => {
  test("registers v3 operations as a strict superset of v2", () => {
    expect(AGENT_OS_INTERACTIVE_V3_OPERATIONS.length).toBe(27);
    expect(AGENT_OS_INTERACTIVE_V3_OPERATIONS.includes("capability.read")).toBe(
      true,
    );
    expect(
      AGENT_OS_INTERACTIVE_V3_CAPABILITIES.includes("remote.observe"),
    ).toBe(true);
    expect(AGENT_OS_INTERACTIVE_V3_CAPABILITIES.length).toBe(25);
    expect(
      AGENT_OS_INTERACTIVE_V3_DECLARED_CAPABILITIES.includes(
        "attachment.image",
      ),
    ).toBe(true);
    expect(AGENT_OS_INTERACTIVE_V3_EVENT_SCHEMA_VERSION).toBe(
      AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
    );
  });

  test("parses every valid v3 request and round-trips canonical serialization", () => {
    for (const request of [...mutatingRequests(), ...readOnlyRequests()]) {
      const parsed = parseAgentOsInteractiveV3Request(request);
      const serialized = serializeAgentOsInteractiveV3Request(request);
      expect(serialized.endsWith("\n")).toBe(true);
      const reparsed = parseAgentOsInteractiveV3Request(JSON.parse(serialized));
      expect(canonicalAgentOsInteractiveV3Source(parsed)).toBe(
        canonicalAgentOsInteractiveV3Source(reparsed),
      );
    }
  });

  test("requires command bindings on mutating operations", () => {
    const request = {
      ...base("turn.start"),
      sessionId: "session.1",
      turnId: "turn.1",
      message: "hello",
      bindingRevision: 1,
    };
    expect(() => parseAgentOsInteractiveV3Request(request)).toThrow(
      AgentOsInteractiveV3ContractError,
    );
    try {
      parseAgentOsInteractiveV3Request(request);
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_SHAPE",
      );
    }
  });

  test("forbids command bindings on read-only operations", () => {
    const request = { ...base("session.catalog.read"), command: command() };
    expect(isAgentOsInteractiveV3ReadOnlyOperation("capability.read")).toBe(
      true,
    );
    try {
      parseAgentOsInteractiveV3Request(request);
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_SHAPE",
      );
    }
  });

  test("rejects unknown fields at every object level", () => {
    const cases: readonly Record<string, unknown>[] = [
      { ...base("capability.read"), extra: true },
      {
        ...base("turn.start"),
        sessionId: "session.1",
        turnId: "turn.1",
        message: "hello",
        bindingRevision: 1,
        command: command({ unexpected: 1 }),
      },
      {
        ...base("transcript.read"),
        sessionId: "session.1",
        cursor: null,
        limit: 1,
        replay: { storeGeneration: 1, projectionEpoch: 1, extra: 1 },
      },
    ];
    for (const request of cases) {
      try {
        parseAgentOsInteractiveV3Request(request);
        throw new Error("unreachable");
      } catch (error) {
        expect((error as AgentOsInteractiveV3ContractError).code).toBe(
          "INVALID_SHAPE",
        );
      }
    }
  });

  test("rejects unknown operations and malformed command digests", () => {
    try {
      parseAgentOsInteractiveV3Request(base("session.tree.read"));
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "UNKNOWN_OPERATION",
      );
    }
    try {
      parseAgentOsInteractiveV3Request({
        ...base("session.create"),
        command: command({ payloadDigest: "deadbeef" }),
      });
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_VALUE",
      );
    }
  });

  test("denies cross-version envelopes in both directions", () => {
    for (const version of [
      "agent-os-interactive.v1",
      AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
    ]) {
      try {
        parseAgentOsInteractiveV3Request({
          ...base("session.create"),
          schemaVersion: version,
          command: command(),
        });
        throw new Error("unreachable");
      } catch (error) {
        expect((error as AgentOsInteractiveV3ContractError).code).toBe(
          "INVALID_SCHEMA",
        );
      }
    }
    try {
      parseAgentOsInteractiveV2Request({
        ...base("session.create"),
        command: command(),
      });
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV2ContractError).code).toBe(
        "INVALID_SCHEMA",
      );
    }
    try {
      parseAgentOsInteractiveV2Request(base("capability.read"));
      throw new Error("unreachable");
    } catch (error) {
      // capability.read 未注册于 v2 operation 清单，按 UNKNOWN_OPERATION 拒绝。
      expect((error as AgentOsInteractiveV2ContractError).code).toBe(
        "UNKNOWN_OPERATION",
      );
    }
  });

  test("computes the command fingerprint without the self-reported digest", () => {
    const request = {
      ...base("turn.start"),
      sessionId: "session.1",
      turnId: "turn.1",
      message: "hello",
      bindingRevision: 1,
      command: command(),
    };
    const fingerprint = createAgentOsInteractiveV3CommandFingerprint(request);
    const withOtherDigest = {
      ...request,
      command: command({ payloadDigest: digest("f") }),
    };
    expect(fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(createAgentOsInteractiveV3CommandFingerprint(withOtherDigest)).toBe(
      fingerprint,
    );
    const bound = {
      ...request,
      command: command({ payloadDigest: fingerprint }),
    };
    expect(createAgentOsInteractiveV3CommandFingerprint(bound)).toBe(
      fingerprint,
    );
    const parsed = parseAgentOsInteractiveV3Request(bound);
    expect(parsed.command?.payloadDigest).toBe(fingerprint);
    try {
      createAgentOsInteractiveV3CommandFingerprint(base("capability.read"));
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_VALUE",
      );
    }
  });

  test("validates replay bindings", () => {
    const request = {
      ...base("transcript.read"),
      sessionId: "session.1",
      cursor: null,
      limit: 1,
      replay: { storeGeneration: -1, projectionEpoch: 0 },
    };
    try {
      parseAgentOsInteractiveV3Request(request);
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_VALUE",
      );
    }
  });

  test("parses ack responses with idempotency receipts", () => {
    const ack = {
      schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
      operation: "turn.start",
      requestId: "request.turn.start",
      status: "accepted",
      replayed: false,
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      receipt: {
        commandId: "command.1",
        disposition: "duplicate",
        payloadDigest: digest("a"),
      },
    };
    const parsed = parseAgentOsInteractiveV3AckResponse(ack);
    expect(parsed.receipt?.disposition).toBe("duplicate");
    expect(serializeAgentOsInteractiveV3Response(ack)).toContain("duplicate");
    const decoded = decodeAgentOsInteractiveV3(
      JSON.stringify(JSON.parse(serializeAgentOsInteractiveV3Response(ack))),
    );
    expect(decoded.schemaVersion).toBe(AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION);
    const roundTripped = parseAgentOsInteractiveV3(
      serializeAgentOsInteractiveV3(ack),
    ) as { status?: string };
    expect(roundTripped.status).toBe("accepted");

    const badReceipt = {
      ...ack,
      receipt: { ...ack.receipt, disposition: "replayed" },
    };
    try {
      parseAgentOsInteractiveV3AckResponse(badReceipt);
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_VALUE",
      );
    }
    try {
      parseAgentOsInteractiveV3AckResponse({
        ...ack,
        operation: "session.catalog.read",
      });
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "UNKNOWN_OPERATION",
      );
    }
  });

  test("parses capability responses with four-dimension states", () => {
    const response = {
      schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
      operation: "capability.read",
      requestId: "request.capability.read",
      capabilities: [
        {
          capability: "prompt.start",
          implemented: true,
          configured: true,
          authorized: true,
          ready: true,
        },
        {
          capability: "attachment.image",
          implemented: false,
          configured: false,
          authorized: false,
          ready: false,
          reason: "declared in first slice, implemented by B16",
        },
      ],
    };
    const parsed = parseAgentOsInteractiveV3CapabilityResponse(response);
    expect(parsed.capabilities.length).toBe(2);
    expect(serializeAgentOsInteractiveV3Response(response)).toContain(
      "capability.read",
    );

    const unready = {
      ...response,
      capabilities: [
        {
          capability: "prompt.start",
          implemented: true,
          configured: false,
          authorized: true,
          ready: true,
        },
      ],
    };
    try {
      parseAgentOsInteractiveV3CapabilityResponse(unready);
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_VALUE",
      );
    }
    const unknown = {
      ...response,
      capabilities: [
        {
          capability: "session.tree.read",
          implemented: true,
          configured: true,
          authorized: true,
          ready: true,
        },
      ],
    };
    try {
      parseAgentOsInteractiveV3CapabilityResponse(unknown);
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_VALUE",
      );
    }
    const overLimit = {
      ...response,
      capabilities: Array.from(
        { length: AGENT_OS_INTERACTIVE_V3_LIMITS.maxCapabilities + 1 },
        () => ({
          capability: "prompt.start",
          implemented: true,
          configured: true,
          authorized: true,
          ready: true,
        }),
      ),
    };
    try {
      parseAgentOsInteractiveV3CapabilityResponse(overLimit);
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "JSON_BUDGET",
      );
    }
  });

  test("rejects event envelopes in the v3 decode path", () => {
    try {
      parseAgentOsInteractiveV3(
        JSON.stringify({
          eventType: "assistant.text.delta",
          schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
        }),
      );
      throw new Error("unreachable");
    } catch (error) {
      expect((error as AgentOsInteractiveV3ContractError).code).toBe(
        "INVALID_SHAPE",
      );
    }
  });
});
