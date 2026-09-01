import { describe, expect, test } from "bun:test";

import {
  AgentOsInteractiveContractError,
  canonicalAgentOsInteractiveSource,
  createAgentOsInteractiveCursor,
  createAgentOsInteractiveEvent,
  createAgentOsInteractiveSnapshot,
  parseAgentOsInteractiveEvent,
  parseAgentOsInteractiveRequest,
  parseAgentOsInteractiveResponse,
  parseAgentOsInteractiveSnapshot,
  serializeAgentOsInteractiveEvent,
} from "../src/index.js";

const BASE = {
  schemaVersion: "agent-os-interactive.v1" as const,
  sessionId: "session.demo",
  runId: "run.demo",
  turnId: "turn.demo",
  attemptId: "attempt.demo",
  effectId: "effect.demo",
  bindingRevision: 1,
  streamEpoch: "stream-epoch:demo.1" as const,
};

function event(
  sequence: number,
  payload: object,
  eventType = "assistant.text.delta" as const,
) {
  return createAgentOsInteractiveEvent({
    ...BASE,
    eventId: `event.demo.${sequence}`,
    sequence,
    eventType,
    payload,
    createdAt: `2026-08-31T00:00:${String(sequence).padStart(2, "0")}.000Z`,
  });
}

function transcript() {
  const first = event(1, { contentId: "content.demo", delta: "hi" });
  const second = event(2, { contentId: "content.demo", delta: "!" });
  const snapshot = createAgentOsInteractiveSnapshot({
    ...BASE,
    watermark: 2,
    state: "running",
    terminal: false,
    updatedAt: "2026-08-31T00:00:02.000Z",
  });
  const cursor = createAgentOsInteractiveCursor({
    schemaVersion: BASE.schemaVersion,
    sessionId: BASE.sessionId,
    streamEpoch: BASE.streamEpoch,
    sequence: 2,
    watermark: 2,
  });
  return {
    schemaVersion: BASE.schemaVersion,
    operation: "transcript.read" as const,
    requestId: "request.demo",
    disposition: "snapshot-required" as const,
    snapshot,
    events: [first, second],
    cursor,
    replayed: false,
  };
}

describe("agent-os-interactive.v1 contract", () => {
  test("binds optional session and provider metadata into the snapshot digest", () => {
    const snapshot = createAgentOsInteractiveSnapshot({
      ...BASE,
      sessionTitle: "Demo workspace",
      providerId: "minimax-cn-responses",
      modelId: "MiniMax-M3",
      apiFamily: "openai-responses",
      watermark: 0,
      state: "idle",
      terminal: false,
      updatedAt: "2026-08-31T00:00:00.000Z",
    });
    expect(parseAgentOsInteractiveSnapshot(snapshot)).toEqual(snapshot);
    expect(snapshot).toMatchObject({
      sessionTitle: "Demo workspace",
      providerId: "minimax-cn-responses",
      modelId: "MiniMax-M3",
      apiFamily: "openai-responses",
    });
    expect(() =>
      createAgentOsInteractiveSnapshot({
        ...BASE,
        providerId: "minimax-cn-responses",
        watermark: 0,
        state: "idle",
        terminal: false,
        updatedAt: "2026-08-31T00:00:00.000Z",
      } as never),
    ).toThrow(AgentOsInteractiveContractError);
  });

  test("creates, parses, freezes and canonically serializes rich events", () => {
    const value = event(1, {
      contentId: "content.demo",
      delta: "你好",
    });
    const parsed = parseAgentOsInteractiveEvent(value);
    expect(parsed).toEqual(value);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.payload)).toBe(true);
    expect(parsed.cursor.sequence).toBe(1);
    expect(parsed.cursor.digest).toMatch(/^sha256:/u);
    expect(canonicalAgentOsInteractiveSource(parsed)).toContain('"digest"');
    expect(serializeAgentOsInteractiveEvent(parsed).endsWith("\n")).toBe(true);
  });

  test("supports every rich transcript event family", () => {
    const variants = [
      ["user.message", { messageId: "message.demo", content: "hello" }],
      ["assistant.text.start", { contentId: "content.demo" }],
      ["assistant.text.delta", { contentId: "content.demo", delta: "x" }],
      ["assistant.text.end", { contentId: "content.demo", content: "x" }],
      ["assistant.reasoning.start", { contentId: "reasoning.demo" }],
      [
        "assistant.reasoning.delta",
        { contentId: "reasoning.demo", delta: "x" },
      ],
      [
        "assistant.reasoning.end",
        { contentId: "reasoning.demo", content: "x" },
      ],
      [
        "tool.call.started",
        {
          toolCallId: "call.demo",
          toolName: "read",
          arguments: { path: "README.md" },
        },
      ],
      ["tool.call.args.delta", { toolCallId: "call.demo", delta: "x" }],
      [
        "tool.call.terminal",
        {
          toolCallId: "call.demo",
          status: "succeeded",
          result: { ok: true },
          isError: false,
        },
      ],
      [
        "tool.result",
        { toolCallId: "call.demo", result: { ok: true }, isError: false },
      ],
      [
        "artifact.reference",
        { artifactId: "artifact.demo", kind: "diff", uri: "artifact://demo" },
      ],
      [
        "interaction.requested",
        {
          challengeId: "challenge.demo",
          kind: "approval",
          prompt: "Allow?",
          capability: "interaction.respond",
        },
      ],
      [
        "interaction.resolved",
        { challengeId: "challenge.demo", decision: "approve" },
      ],
      ["usage", { inputTokens: 1, outputTokens: 2 }],
      [
        "compaction.checkpoint",
        { checkpointId: "checkpoint.demo", sourceWatermark: 2 },
      ],
      ["turn.terminal", { status: "succeeded" }],
    ] as const;
    for (const [eventType, payload] of variants) {
      expect(
        parseAgentOsInteractiveEvent(event(1, payload, eventType)).eventType,
      ).toBe(eventType);
    }
  });

  test("strictly rejects unknown fields, invalid digests, gaps and cross-stream data", () => {
    const value = event(1, { contentId: "content.demo", delta: "x" });
    expect(() =>
      parseAgentOsInteractiveEvent({ ...value, extra: true }),
    ).toThrow(AgentOsInteractiveContractError);
    const { cursor: _cursor, ...withoutCursor } = value;
    expect(() => parseAgentOsInteractiveEvent(withoutCursor)).toThrow(
      AgentOsInteractiveContractError,
    );
    expect(() =>
      parseAgentOsInteractiveEvent({
        ...value,
        cursor: createAgentOsInteractiveCursor({
          schemaVersion: BASE.schemaVersion,
          sessionId: BASE.sessionId,
          streamEpoch: BASE.streamEpoch,
          sequence: 2,
          watermark: 2,
        }),
      }),
    ).toThrow(AgentOsInteractiveContractError);
    expect(() =>
      parseAgentOsInteractiveEvent({
        ...value,
        digest: "sha256:" + "0".repeat(64),
      }),
    ).toThrow(AgentOsInteractiveContractError);
    expect(() =>
      parseAgentOsInteractiveRequest({
        schemaVersion: BASE.schemaVersion,
        operation: "turn.start",
        requestId: "request.demo",
        sessionId: BASE.sessionId,
        turnId: BASE.turnId,
        message: "hello",
        bindingRevision: 1,
        unknown: true,
      }),
    ).toThrow(AgentOsInteractiveContractError);
    expect(() =>
      parseAgentOsInteractiveEvent(
        event(
          1,
          {
            challengeId: "challenge.demo",
            kind: "approval",
            prompt: "Allow?",
            capability: "grant.create",
          },
          "interaction.requested",
        ),
      ),
    ).toThrow(AgentOsInteractiveContractError);
    expect(() =>
      parseAgentOsInteractiveResponse({
        ...transcript(),
        snapshot: createAgentOsInteractiveSnapshot({
          ...BASE,
          watermark: 4,
          state: "running",
          terminal: false,
          updatedAt: "2026-08-31T00:00:04.000Z",
        }),
        events: [
          event(2, { contentId: "content.demo", delta: "x" }),
          event(4, { contentId: "content.demo", delta: "y" }),
        ],
        cursor: createAgentOsInteractiveCursor({
          schemaVersion: BASE.schemaVersion,
          sessionId: BASE.sessionId,
          streamEpoch: BASE.streamEpoch,
          sequence: 4,
          watermark: 4,
        }),
      }),
    ).toThrow(AgentOsInteractiveContractError);
    expect(() =>
      parseAgentOsInteractiveResponse({
        ...transcript(),
        events: [
          event(1, { contentId: "content.demo", delta: "x" }),
          createAgentOsInteractiveEvent({
            ...BASE,
            eventId: "event.demo.1",
            sequence: 2,
            eventType: "assistant.text.delta",
            payload: { contentId: "content.demo", delta: "y" },
            createdAt: "2026-08-31T00:00:02.000Z",
          }),
        ],
      }),
    ).toThrow(AgentOsInteractiveContractError);
    expect(() =>
      parseAgentOsInteractiveResponse({
        ...transcript(),
        cursor: createAgentOsInteractiveCursor({
          schemaVersion: BASE.schemaVersion,
          sessionId: BASE.sessionId,
          streamEpoch: BASE.streamEpoch,
          sequence: 1,
          watermark: 2,
        }),
      }),
    ).toThrow(AgentOsInteractiveContractError);
    expect(
      parseAgentOsInteractiveResponse({
        ...transcript(),
        events: [event(2, { contentId: "content.demo", delta: "x" })],
      }).events,
    ).toHaveLength(1);
  });

  test("accepts bounded snapshot windows beyond 256 and historical identities", () => {
    const firstSequence = 745;
    const watermark = 1000;
    const events = Array.from({ length: 256 }, (_, index) =>
      createAgentOsInteractiveEvent({
        ...BASE,
        runId: "run.history",
        turnId: "turn.history",
        attemptId: "attempt.history",
        effectId: "effect.history",
        eventId: `event.history.${index}`,
        sequence: firstSequence + index,
        eventType: "assistant.text.delta",
        payload: { contentId: "content.history", delta: "x" },
        createdAt: "2026-08-31T00:10:00.000Z",
      }),
    );
    const snapshot = createAgentOsInteractiveSnapshot({
      ...BASE,
      runId: "run.current",
      turnId: "turn.current",
      attemptId: "attempt.current",
      effectId: "effect.current",
      watermark,
      state: "running",
      terminal: false,
      updatedAt: "2026-08-31T00:10:00.000Z",
    });
    const cursor = createAgentOsInteractiveCursor({
      schemaVersion: BASE.schemaVersion,
      sessionId: BASE.sessionId,
      streamEpoch: BASE.streamEpoch,
      sequence: watermark,
      watermark,
    });
    const response = parseAgentOsInteractiveResponse({
      schemaVersion: BASE.schemaVersion,
      operation: "transcript.read",
      requestId: "request.window",
      disposition: "snapshot-required",
      snapshot,
      events,
      cursor,
      replayed: false,
    });
    expect(response.events).toHaveLength(256);
    expect(response.events[0]?.sequence).toBe(firstSequence);
    expect(response.events.at(-1)?.sequence).toBe(watermark);
  });

  test("rejects cycles, shared references, accessors and non-finite public values", () => {
    const value = event(1, { contentId: "content.demo", delta: "x" });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() =>
      parseAgentOsInteractiveEvent(
        event(
          1,
          { toolCallId: "call.demo", result: cyclic, isError: false },
          "tool.result",
        ),
      ),
    ).toThrow(AgentOsInteractiveContractError);
    const shared: Record<string, unknown> = { ok: true };
    expect(() =>
      parseAgentOsInteractiveEvent(
        event(
          1,
          {
            toolCallId: "call.demo",
            result: { a: shared, b: shared },
            isError: false,
          },
          "tool.result",
        ),
      ),
    ).toThrow(AgentOsInteractiveContractError);
    const unsafe: Record<string, unknown> = {};
    Object.defineProperty(unsafe, "value", {
      enumerable: true,
      get: () => "secret",
    });
    expect(() =>
      parseAgentOsInteractiveEvent(
        event(
          1,
          { toolCallId: "call.demo", result: unsafe, isError: false },
          "tool.result",
        ),
      ),
    ).toThrow(AgentOsInteractiveContractError);
    expect(() =>
      parseAgentOsInteractiveEvent(
        event(
          1,
          { toolCallId: "call.demo", result: Number.NaN, isError: false },
          "tool.result",
        ),
      ),
    ).toThrow(AgentOsInteractiveContractError);
    const proxy = new Proxy(value, {
      getPrototypeOf: () => {
        throw new Error("trap");
      },
    });
    expect(() => parseAgentOsInteractiveEvent(proxy)).toThrow(
      AgentOsInteractiveContractError,
    );
  });

  test("strictly parses the operation surface", () => {
    const request = parseAgentOsInteractiveRequest({
      schemaVersion: BASE.schemaVersion,
      operation: "transcript.subscribe",
      requestId: "request.demo",
      sessionId: BASE.sessionId,
      cursor: null,
      limit: 32,
    });
    expect(request.operation).toBe("transcript.subscribe");
    expect(() =>
      parseAgentOsInteractiveRequest({
        schemaVersion: BASE.schemaVersion,
        operation: "unknown",
        requestId: "request.demo",
      }),
    ).toThrow(AgentOsInteractiveContractError);
  });

  test("rejects explicitly undefined optional fields", () => {
    expect(() =>
      parseAgentOsInteractiveRequest({
        schemaVersion: BASE.schemaVersion,
        operation: "session.create",
        requestId: "request.demo",
        title: undefined,
      }),
    ).toThrow(AgentOsInteractiveContractError);
  });
});
