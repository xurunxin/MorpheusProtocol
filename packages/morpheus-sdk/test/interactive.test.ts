import { describe, expect, test } from "bun:test";

import {
  createAgentOsInteractiveCursor,
  createAgentOsInteractiveEvent,
  createAgentOsInteractiveSnapshot,
  type AgentOsInteractiveTranscriptResponse,
} from "@xurunxin/morpheus-protocol";

import {
  createInteractiveAppClient,
  transitionInteractiveProjection,
} from "../src/interactive.js";

const BASE = {
  schemaVersion: "agent-os-interactive.v1" as const,
  sessionId: "session.sdk",
  runId: "run.sdk",
  turnId: "turn.sdk",
  attemptId: "attempt.sdk",
  effectId: "effect.sdk",
  bindingRevision: 1,
  streamEpoch: "stream-epoch:sdk.1" as const,
};

function event(sequence: number, delta: string) {
  return createAgentOsInteractiveEvent({
    ...BASE,
    eventId: `event.sdk.${sequence}`,
    sequence,
    eventType: "assistant.text.delta",
    payload: { contentId: "content.sdk", delta },
    createdAt: `2026-08-31T00:00:${String(sequence).padStart(2, "0")}.000Z`,
  });
}

function page(
  start: number,
  end: number,
  disposition: "events" | "snapshot-required",
): AgentOsInteractiveTranscriptResponse {
  const events = Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, index) => event(start + index, String(start + index)),
  );
  const snapshot = createAgentOsInteractiveSnapshot({
    ...BASE,
    watermark: end,
    state: "running",
    terminal: false,
    updatedAt: `2026-08-31T00:00:${String(end).padStart(2, "0")}.000Z`,
  });
  const cursor = createAgentOsInteractiveCursor({
    schemaVersion: BASE.schemaVersion,
    sessionId: BASE.sessionId,
    streamEpoch: BASE.streamEpoch,
    sequence: end,
    watermark: end,
  });
  return {
    schemaVersion: BASE.schemaVersion,
    operation: "transcript.read",
    requestId: `request.sdk.${end}`,
    disposition,
    snapshot,
    events,
    cursor,
    replayed: false,
  };
}

describe("stateless InteractiveAppClient", () => {
  test("validates injected requests/responses and exposes stream without retaining state", async () => {
    const calls: string[] = [];
    const client = createInteractiveAppClient({
      request: async (request) => {
        calls.push(request.operation);
        return page(1, 1, "snapshot-required");
      },
      subscribe: async function* () {
        yield event(1, "x");
        yield event(2, "y");
      },
    });
    const response = await client.request({
      schemaVersion: BASE.schemaVersion,
      operation: "transcript.read",
      requestId: "request.sdk.1",
      sessionId: BASE.sessionId,
      cursor: null,
      limit: 32,
    });
    expect(response.operation).toBe("transcript.read");
    const events: string[] = [];
    for await (const item of client.subscribeTranscript({
      schemaVersion: BASE.schemaVersion,
      operation: "transcript.subscribe",
      requestId: "request.sdk.2",
      sessionId: BASE.sessionId,
      cursor: null,
      limit: 32,
    }))
      if ("eventType" in item) events.push(item.eventId);
    expect(events).toEqual(["event.sdk.1", "event.sdk.2"]);
    expect(calls).toEqual(["transcript.read"]);
  });

  test("correlates ordinary responses with the request operation and id", async () => {
    const request = {
      schemaVersion: BASE.schemaVersion,
      operation: "transcript.read" as const,
      requestId: "request.sdk.correlation",
      sessionId: BASE.sessionId,
      cursor: null,
      limit: 32,
    };
    const wrongRequestId = createInteractiveAppClient({
      request: async () => ({
        ...page(1, 1, "snapshot-required"),
        requestId: "request.sdk.other",
      }),
    });
    await expect(wrongRequestId.request(request)).rejects.toThrow(
      "requestId does not match",
    );

    const wrongOperation = createInteractiveAppClient({
      request: async () => ({
        ...page(1, 1, "snapshot-required"),
        operation: "transcript.subscribe" as const,
        requestId: request.requestId,
      }),
    });
    await expect(wrongOperation.request(request)).rejects.toThrow(
      "operation does not match",
    );
  });

  test("correlates transcript subscribe response frames", async () => {
    const request = {
      schemaVersion: BASE.schemaVersion,
      operation: "transcript.subscribe" as const,
      requestId: "request.sdk.subscribe",
      sessionId: BASE.sessionId,
      cursor: null,
      limit: 32,
    };
    const valid = {
      ...page(1, 1, "snapshot-required"),
      operation: request.operation,
      requestId: request.requestId,
    };
    const otherSnapshot = createAgentOsInteractiveSnapshot({
      ...BASE,
      sessionId: "session.other",
      watermark: 0,
      state: "idle",
      terminal: false,
      updatedAt: "2026-08-31T00:00:00.000Z",
    });
    const otherCursor = createAgentOsInteractiveCursor({
      schemaVersion: BASE.schemaVersion,
      sessionId: "session.other",
      streamEpoch: BASE.streamEpoch,
      sequence: 0,
      watermark: 0,
    });
    const invalidFrames = [
      { ...valid, requestId: "request.sdk.other" },
      { ...valid, operation: "transcript.read" as const },
      {
        ...valid,
        snapshot: otherSnapshot,
        events: [],
        cursor: otherCursor,
      },
    ];

    for (const frame of invalidFrames) {
      const client = createInteractiveAppClient({
        request: async () => frame,
        subscribe: async function* () {
          yield frame;
        },
      });
      let error: unknown;
      try {
        for await (const _event of client.subscribeTranscript(request)) {
          // The invalid frame must fail before yielding any event.
        }
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(TypeError);
    }
  });

  test("preserves snapshot-required subscribe frames for atomic rebuild", async () => {
    const request = {
      schemaVersion: BASE.schemaVersion,
      operation: "transcript.subscribe" as const,
      requestId: "request.sdk.snapshot-required",
      sessionId: BASE.sessionId,
      cursor: null,
      limit: 32,
    };
    const snapshotRequired = {
      ...page(1, 2, "snapshot-required"),
      operation: request.operation,
      requestId: request.requestId,
    };
    const client = createInteractiveAppClient({
      request: async () => snapshotRequired,
      subscribe: async function* () {
        yield snapshotRequired;
        yield event(3, "streamed");
      },
    });
    let projection = null;
    const received: string[] = [];
    for await (const item of client.subscribeTranscript(request)) {
      received.push("eventType" in item ? item.eventId : item.disposition);
      const transition = client.reduce(projection, item, {
        sessionId: BASE.sessionId,
      });
      expect(transition.kind).toBe("committed");
      if (transition.kind !== "committed")
        throw new Error("expected subscription frame to commit");
      projection = transition.state;
    }
    expect(received).toEqual(["snapshot-required", "event.sdk.3"]);
    expect(projection?.events.map((item) => item.sequence)).toEqual([1, 2, 3]);
  });

  test("commits snapshots/deltas, deduplicates replay and requests atomic rebuilds", () => {
    const initial = transitionInteractiveProjection(
      null,
      page(1, 1, "snapshot-required"),
      { sessionId: BASE.sessionId },
    );
    expect(initial.kind).toBe("committed");
    if (initial.kind !== "committed")
      throw new Error("expected initial commit");
    const duplicate = transitionInteractiveProjection(
      initial.state,
      page(1, 1, "events"),
      { sessionId: BASE.sessionId },
    );
    expect(duplicate.kind).toBe("committed");
    if (duplicate.kind !== "committed")
      throw new Error("expected duplicate commit");
    expect(duplicate.state.events).toHaveLength(1);
    const next = transitionInteractiveProjection(
      duplicate.state,
      page(2, 2, "events"),
      { sessionId: BASE.sessionId },
    );
    expect(next.kind).toBe("committed");
    if (next.kind !== "committed") throw new Error("expected delta commit");
    expect(next.state.events.map((item) => item.sequence)).toEqual([1, 2]);
    const responseReuse = {
      ...page(3, 3, "events"),
      events: [
        createAgentOsInteractiveEvent({
          ...BASE,
          eventId: event(1, "initial").eventId,
          sequence: 3,
          eventType: "assistant.text.delta",
          payload: { contentId: "content.sdk", delta: "reused" },
          createdAt: "2026-08-31T00:00:03.000Z",
        }),
      ],
    };
    expect(
      transitionInteractiveProjection(next.state, responseReuse, {
        sessionId: BASE.sessionId,
      }),
    ).toEqual({ kind: "rebuild-required", reason: "event-conflict" });
    const stale = transitionInteractiveProjection(
      next.state,
      page(1, 1, "events"),
      { sessionId: BASE.sessionId },
    );
    expect(stale.kind).toBe("committed");
    if (stale.kind !== "committed") throw new Error("expected stale replay");
    expect(stale.state.cursor).toEqual(next.state.cursor);
    expect(stale.state.snapshot).toEqual(next.state.snapshot);
    expect(
      transitionInteractiveProjection(next.state, page(4, 4, "events"), {
        sessionId: BASE.sessionId,
      }),
    ).toEqual({ kind: "rebuild-required", reason: "cursor-gap" });
    expect(
      transitionInteractiveProjection(next.state, page(3, 3, "events"), {
        sessionId: "session.other",
      }),
    ).toEqual({ kind: "rebuild-required", reason: "session-changed" });
  });

  test("commits a contiguous session page that advances to a new Run", () => {
    const initial = transitionInteractiveProjection(
      null,
      page(1, 1, "snapshot-required"),
      { sessionId: BASE.sessionId },
    );
    if (initial.kind !== "committed")
      throw new Error("expected initial commit");

    const nextBase = {
      ...BASE,
      runId: "run.sdk.2",
      turnId: "turn.sdk.2",
      attemptId: "attempt.sdk.2",
      effectId: "effect.sdk.2",
    };
    const nextEvent = createAgentOsInteractiveEvent({
      ...nextBase,
      eventId: "event.sdk.run-2",
      sequence: 2,
      eventType: "user.message",
      payload: { messageId: "message.sdk.run-2", content: "next run" },
      createdAt: "2026-08-31T00:00:02.000Z",
    });
    const nextSnapshot = createAgentOsInteractiveSnapshot({
      ...nextBase,
      watermark: 2,
      state: "running",
      terminal: false,
      updatedAt: "2026-08-31T00:00:02.000Z",
    });
    const nextCursor = createAgentOsInteractiveCursor({
      schemaVersion: BASE.schemaVersion,
      sessionId: BASE.sessionId,
      streamEpoch: BASE.streamEpoch,
      sequence: 2,
      watermark: 2,
    });
    const advanced = transitionInteractiveProjection(
      initial.state,
      {
        schemaVersion: BASE.schemaVersion,
        operation: "transcript.read",
        requestId: "request.sdk.run-2",
        disposition: "events",
        snapshot: nextSnapshot,
        events: [nextEvent],
        cursor: nextCursor,
        replayed: false,
      },
      { sessionId: BASE.sessionId },
    );
    expect(advanced.kind).toBe("committed");
    if (advanced.kind !== "committed")
      throw new Error("expected Run transition commit");
    expect(advanced.state.snapshot.runId).toBe("run.sdk.2");
    expect(advanced.state.events.map((item) => item.sequence)).toEqual([1, 2]);

    expect(
      transitionInteractiveProjection(
        initial.state,
        {
          schemaVersion: BASE.schemaVersion,
          operation: "transcript.read",
          requestId: "request.sdk.run-2-without-event",
          disposition: "events",
          snapshot: nextSnapshot,
          events: [],
          cursor: createAgentOsInteractiveCursor({
            schemaVersion: BASE.schemaVersion,
            sessionId: BASE.sessionId,
            streamEpoch: BASE.streamEpoch,
            sequence: 1,
            watermark: 2,
          }),
          replayed: false,
        },
        { sessionId: BASE.sessionId },
      ),
    ).toEqual({ kind: "rebuild-required", reason: "run-changed" });
  });

  test("accumulates snapshot page1 and overlapping page2 across a proven Run change", () => {
    const first = transitionInteractiveProjection(
      null,
      page(1, 1, "snapshot-required"),
      { sessionId: BASE.sessionId },
    );
    if (first.kind !== "committed")
      throw new Error("expected first page to commit");

    const nextBase = {
      ...BASE,
      runId: "run.sdk.page-2",
      turnId: "turn.sdk.page-2",
      attemptId: "attempt.sdk.page-2",
      effectId: "effect.sdk.page-2",
    };
    const nextEvent = createAgentOsInteractiveEvent({
      ...nextBase,
      eventId: "event.sdk.page-2",
      sequence: 2,
      eventType: "user.message",
      payload: { messageId: "message.sdk.page-2", content: "next run" },
      createdAt: "2026-08-31T00:00:02.000Z",
    });
    const second = transitionInteractiveProjection(
      first.state,
      {
        schemaVersion: BASE.schemaVersion,
        operation: "transcript.read",
        requestId: "request.sdk.page-2",
        disposition: "events",
        snapshot: createAgentOsInteractiveSnapshot({
          ...nextBase,
          watermark: 2,
          state: "running",
          terminal: false,
          updatedAt: "2026-08-31T00:00:02.000Z",
        }),
        events: [event(1, "1"), nextEvent],
        cursor: createAgentOsInteractiveCursor({
          schemaVersion: BASE.schemaVersion,
          sessionId: BASE.sessionId,
          streamEpoch: BASE.streamEpoch,
          sequence: 2,
          watermark: 2,
        }),
        replayed: false,
      },
      { sessionId: BASE.sessionId },
    );

    expect(second.kind).toBe("committed");
    if (second.kind !== "committed")
      throw new Error("expected second page to commit");
    expect(second.state.snapshot.runId).toBe(nextBase.runId);
    expect(second.state.events.map((item) => item.sequence)).toEqual([1, 2]);
    expect(second.state.events.map((item) => item.runId)).toEqual([
      BASE.runId,
      nextBase.runId,
    ]);
  });

  test("rejects metadata-only Run drift even when the page contains exact overlap", () => {
    const first = transitionInteractiveProjection(
      null,
      page(1, 1, "snapshot-required"),
      { sessionId: BASE.sessionId },
    );
    if (first.kind !== "committed")
      throw new Error("expected first page to commit");

    const driftedSnapshot = createAgentOsInteractiveSnapshot({
      ...BASE,
      runId: "run.sdk.metadata-only",
      turnId: "turn.sdk.metadata-only",
      attemptId: "attempt.sdk.metadata-only",
      effectId: "effect.sdk.metadata-only",
      watermark: 2,
      state: "running",
      terminal: false,
      updatedAt: "2026-08-31T00:00:02.000Z",
    });
    expect(
      transitionInteractiveProjection(
        first.state,
        {
          schemaVersion: BASE.schemaVersion,
          operation: "transcript.read",
          requestId: "request.sdk.metadata-only",
          disposition: "events",
          snapshot: driftedSnapshot,
          events: [event(1, "1")],
          cursor: createAgentOsInteractiveCursor({
            schemaVersion: BASE.schemaVersion,
            sessionId: BASE.sessionId,
            streamEpoch: BASE.streamEpoch,
            sequence: 1,
            watermark: 2,
          }),
          replayed: false,
        },
        { sessionId: BASE.sessionId },
      ),
    ).toEqual({ kind: "rebuild-required", reason: "run-changed" });
  });

  test("deduplicates overlap across multiple transcript pages", () => {
    const first = transitionInteractiveProjection(
      null,
      page(1, 2, "snapshot-required"),
      { sessionId: BASE.sessionId },
    );
    if (first.kind !== "committed")
      throw new Error("expected first page to commit");
    const second = transitionInteractiveProjection(
      first.state,
      page(1, 4, "events"),
      { sessionId: BASE.sessionId },
    );
    if (second.kind !== "committed")
      throw new Error("expected second page to commit");
    const third = transitionInteractiveProjection(
      second.state,
      page(2, 5, "events"),
      { sessionId: BASE.sessionId },
    );

    expect(third.kind).toBe("committed");
    if (third.kind !== "committed")
      throw new Error("expected third page to commit");
    expect(third.state.events.map((item) => item.sequence)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(new Set(third.state.events.map((item) => item.eventId)).size).toBe(
      5,
    );
  });

  test("deduplicates exact event replay and rejects eventId reuse", () => {
    const initial = transitionInteractiveProjection(
      null,
      page(1, 1, "snapshot-required"),
      { sessionId: BASE.sessionId },
    );
    if (initial.kind !== "committed")
      throw new Error("expected initial commit");
    const streamed = transitionInteractiveProjection(
      initial.state,
      event(2, "streamed"),
      { sessionId: BASE.sessionId },
    );
    expect(streamed.kind).toBe("committed");
    if (streamed.kind !== "committed") throw new Error("expected event commit");
    expect(streamed.state.events.map((item) => item.sequence)).toEqual([1, 2]);
    const replay = transitionInteractiveProjection(
      streamed.state,
      event(2, "streamed"),
      { sessionId: BASE.sessionId },
    );
    expect(replay).toEqual({ kind: "committed", state: streamed.state });
    const historical = createAgentOsInteractiveEvent({
      ...BASE,
      runId: "run.history",
      turnId: "turn.history",
      attemptId: "attempt.history",
      effectId: "effect.history",
      eventId: "event.sdk.history.3",
      sequence: 3,
      eventType: "assistant.text.delta",
      payload: { contentId: "content.sdk", delta: "historical" },
      createdAt: "2026-08-31T00:00:03.000Z",
    });
    const historicalCommit = transitionInteractiveProjection(
      streamed.state,
      historical,
      { sessionId: BASE.sessionId },
    );
    expect(historicalCommit.kind).toBe("committed");
    if (historicalCommit.kind !== "committed")
      throw new Error("expected historical event commit");
    const reusedEventId = createAgentOsInteractiveEvent({
      ...BASE,
      eventId: event(1, "initial").eventId,
      sequence: 4,
      eventType: "assistant.text.delta",
      payload: { contentId: "content.sdk", delta: "reused" },
      createdAt: "2026-08-31T00:00:04.000Z",
    });
    expect(
      transitionInteractiveProjection(historicalCommit.state, reusedEventId, {
        sessionId: BASE.sessionId,
      }),
    ).toEqual({ kind: "rebuild-required", reason: "event-conflict" });
    expect(
      transitionInteractiveProjection(null, event(1, "too-early"), {
        sessionId: BASE.sessionId,
      }),
    ).toEqual({
      kind: "rebuild-required",
      reason: "initial-snapshot-required",
    });
  });
});
