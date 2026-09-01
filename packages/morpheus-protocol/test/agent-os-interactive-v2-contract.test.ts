import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
  AgentOsInteractiveV2ContractError,
  canonicalAgentOsInteractiveV2Source,
  createAgentOsInteractiveV2ContextBinding,
  createAgentOsInteractiveV2Event,
  createAgentOsInteractiveV2Snapshot,
  decodeAgentOsInteractiveV2,
  serializeAgentOsInteractiveV2Request,
  parseAgentOsInteractiveV2,
  parseAgentOsInteractiveV2Event,
  parseAgentOsInteractiveV2Request,
  parseAgentOsInteractiveV2TranscriptResponse,
} from "../src/index.js";

const digest = (letter: string): `sha256:${string}` =>
  `sha256:${letter.repeat(64)}`;
const instant = "2026-08-30T00:00:00.000Z";

function base(
  operation: string,
  requestId = `request.${operation}`,
): Record<string, unknown> {
  return {
    schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
    operation,
    requestId,
  };
}

function requests(): readonly Record<string, unknown>[] {
  return [
    base("session.catalog.read"),
    { ...base("session.create"), title: "Demo" },
    { ...base("session.fork"), sessionId: "session.1" },
    { ...base("session.rename"), sessionId: "session.1", title: "Renamed" },
    {
      ...base("turn.start"),
      sessionId: "session.1",
      turnId: "turn.1",
      message: "hello",
      bindingRevision: 1,
    },
    {
      ...base("turn.cancel"),
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      reason: "stop",
    },
    {
      ...base("turn.retry"),
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      bindingRevision: 1,
    },
    {
      ...base("transcript.read"),
      sessionId: "session.1",
      cursor: null,
      limit: 20,
    },
    {
      ...base("transcript.subscribe"),
      sessionId: "session.1",
      cursor: null,
      limit: 20,
    },
    base("provider.catalog.read"),
    {
      ...base("provider.binding.create"),
      sessionId: "session.1",
      providerId: "minimax-cn",
      modelId: "MiniMax-M3",
      apiFamily: "openai-responses",
      expectedRevision: 1,
    },
    { ...base("prompt.queue.read"), sessionId: "session.1", runId: "run.1" },
    {
      ...base("prompt.queue.clear"),
      sessionId: "session.1",
      runId: "run.1",
      expectedRevision: 1,
    },
    {
      ...base("session.compact"),
      sessionId: "session.1",
      sourceRunId: "run.1",
    },
    {
      ...base("prompt.steer"),
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      instruction: "focus",
    },
    {
      ...base("prompt.follow-up"),
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      instruction: "continue",
    },
    {
      ...base("interaction.respond"),
      sessionId: "session.1",
      challengeId: "challenge.1",
      decision: "answer",
      answer: "yes",
    },
    base("agent.catalog.read"),
    { ...base("agent.definition.read"), agentId: "build" },
    base("workspace.catalog.read"),
    base("execution.catalog.read"),
    {
      ...base("context.binding.create"),
      sessionId: "session.1",
      agentId: "build",
      workspaceId: "workspace.1",
      executionTarget: "sandbox",
      providerId: "minimax-cn",
      modelId: "MiniMax-M3",
      apiFamily: "openai-responses",
      expectedBindingRevision: 1,
    },
    base("config.status.read"),
    { ...base("config.reconcile"), expectedRevision: 1 },
    {
      ...base("workspace.change.preview"),
      sessionId: "session.1",
      workspaceId: "workspace.1",
      baselineDigest: digest("a"),
    },
    {
      ...base("workspace.change.apply"),
      sessionId: "session.1",
      workspaceId: "workspace.1",
      baselineDigest: digest("a"),
      changeDigest: digest("b"),
      expectedWorkspaceRevision: 1,
      challengeId: "challenge.1",
    },
  ];
}

function binding() {
  return createAgentOsInteractiveV2ContextBinding({
    bindingId: "binding.1",
    revision: 1,
    agentId: "build",
    agentRevision: 2,
    configRevision: 3,
    promptDigest: digest("a"),
    toolsDigest: digest("b"),
    skillsDigest: digest("c"),
    workspaceId: "workspace.1",
    executionTarget: "sandbox",
    provider: {
      providerId: "minimax-cn",
      modelId: "MiniMax-M3",
      apiFamily: "openai-responses",
      revision: 1,
    },
    policyDigest: digest("d"),
    capabilityDigest: digest("e"),
    createdAt: instant,
  });
}

function event(
  sequence: number,
  eventType: "user.message" | "assistant.text.delta",
) {
  return createAgentOsInteractiveV2Event({
    schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
    eventId: `event.${sequence}`,
    sessionId: "session.1",
    runId: "run.1",
    turnId: "turn.1",
    attemptId: "attempt.1",
    effectId: "effect.1",
    bindingRevision: 1,
    streamEpoch: "stream-epoch:1",
    sequence,
    eventType,
    payload:
      eventType === "user.message"
        ? { messageId: "message.1", content: "hello" }
        : { contentId: "content.1", delta: "world" },
    createdAt: instant,
  });
}

function expectContractError(
  action: () => unknown,
): AgentOsInteractiveV2ContractError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsInteractiveV2ContractError);
    return error as AgentOsInteractiveV2ContractError;
  }
  throw new Error("expected a contract error");
}

describe("agent-os-interactive.v2 contract", () => {
  test("accepts every operation and freezes parsed requests", () => {
    for (const input of requests()) {
      const parsed = parseAgentOsInteractiveV2Request(input);
      expect(parsed.operation).toBe(input.operation);
      expect(Object.isFrozen(parsed)).toBe(true);
    }
  });

  test("constructs and verifies binding, event, snapshot, and transcript identities", () => {
    const first = event(1, "user.message");
    const second = event(2, "assistant.text.delta");
    expect(parseAgentOsInteractiveV2Event(first)).toEqual(first);
    expect(parseAgentOsInteractiveV2Event(second)).toEqual(second);
    const snapshot = createAgentOsInteractiveV2Snapshot({
      schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
      sessionId: "session.1",
      providerId: "minimax-cn",
      modelId: "MiniMax-M3",
      apiFamily: "openai-responses",
      runId: "run.1",
      turnId: "turn.1",
      attemptId: "attempt.1",
      effectId: "effect.1",
      binding: binding(),
      bindingRevision: 1,
      streamEpoch: "stream-epoch:1",
      watermark: 2,
      state: "running",
      terminal: false,
      updatedAt: instant,
    });
    const response = {
      schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
      operation: "transcript.read",
      requestId: "request.transcript.read",
      disposition: "events",
      snapshot,
      events: [first, second],
      cursor: second.cursor,
      replayed: false,
    } as const;
    expect(
      parseAgentOsInteractiveV2TranscriptResponse(response).events,
    ).toHaveLength(2);
  });

  test("rejects malformed schema, unknown fields, digest tampering, and sequence gaps", () => {
    const input = requests()[0];
    if (!input) throw new Error("fixture missing");
    expectContractError(() =>
      parseAgentOsInteractiveV2Request({ ...input, unknown: true }),
    );
    expect(
      expectContractError(() =>
        parseAgentOsInteractiveV2Request({
          ...input,
          schemaVersion: "agent-os-interactive.v1",
        }),
      ).code,
    ).toBe("INVALID_SCHEMA");
    const first = event(1, "user.message");
    expect(
      expectContractError(() =>
        parseAgentOsInteractiveV2Event({ ...first, digest: digest("f") }),
      ).code,
    ).toBe("DIGEST_MISMATCH");
    const second = event(3, "assistant.text.delta");
    const snapshot = createAgentOsInteractiveV2Snapshot({
      schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
      sessionId: "session.1",
      runId: "run.1",
      turnId: "turn.1",
      attemptId: "attempt.1",
      effectId: "effect.1",
      binding: null,
      bindingRevision: 1,
      streamEpoch: "stream-epoch:1",
      watermark: 3,
      state: "running",
      terminal: false,
      updatedAt: instant,
    });
    expectContractError(() =>
      parseAgentOsInteractiveV2TranscriptResponse({
        schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
        operation: "transcript.read",
        requestId: "request.1",
        disposition: "events",
        snapshot,
        events: [first, second],
        cursor: second.cursor,
        replayed: false,
      }),
    );
  });

  test("canonical codec round-trips requests and events", () => {
    const input = requests()[21];
    if (!input) throw new Error("fixture missing");
    const canonical = canonicalAgentOsInteractiveV2Source(input);
    expect(serializeAgentOsInteractiveV2Request(input)).toBe(`${canonical}\n`);
    expect(decodeAgentOsInteractiveV2(`${canonical}\n`)).toEqual(
      parseAgentOsInteractiveV2(`${canonical}\n`),
    );
    const encodedEvent = JSON.stringify(event(1, "user.message"));
    expect(parseAgentOsInteractiveV2(encodedEvent)).toEqual(
      event(1, "user.message"),
    );
  });
});
