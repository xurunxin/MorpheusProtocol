import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
  createAgentOsInteractiveV2Event,
  createAgentOsInteractiveV2Snapshot,
  type AgentOsInteractiveV2TranscriptResponse,
} from "@xurunxin/morpheus-protocol";

import {
  createInteractiveV2AppClient,
  transitionInteractiveV2Projection,
} from "../src/interactive-v2.js";

const BASE = {
  schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
  sessionId: "session.sdk.v2",
  runId: "run.sdk.v2",
  turnId: "turn.sdk.v2",
  attemptId: "attempt.sdk.v2",
  effectId: "effect.sdk.v2",
  bindingRevision: 1,
  streamEpoch: "stream-epoch:sdk.v2" as const,
};

function event(sequence: number, delta: string) {
  return createAgentOsInteractiveV2Event({
    ...BASE,
    eventId: `event.sdk.v2.${sequence}`,
    sequence,
    eventType: "assistant.text.delta",
    payload: { contentId: "content.sdk.v2", delta },
    createdAt: `2026-08-31T00:00:${String(sequence).padStart(2, "0")}.000Z`,
  });
}

function page(
  start: number,
  end: number,
  disposition: "events" | "snapshot-required",
): AgentOsInteractiveV2TranscriptResponse {
  const events = Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, index) => event(start + index, String(start + index)),
  );
  const snapshot = createAgentOsInteractiveV2Snapshot({
    ...BASE,
    binding: null,
    watermark: end,
    state: "running",
    terminal: false,
    updatedAt: `2026-08-31T00:00:${String(end).padStart(2, "0")}.000Z`,
  });
  const last = events.at(-1) ?? event(end, String(end));
  return {
    schemaVersion: BASE.schemaVersion,
    operation: "transcript.read",
    requestId: `request.sdk.v2.${end}`,
    disposition,
    snapshot,
    events,
    cursor: last.cursor,
    replayed: false,
  };
}

describe("stateless InteractiveV2AppClient", () => {
  test("validates typed catalog requests and responses", async () => {
    const client = createInteractiveV2AppClient({
      request: async (request) => ({
        schemaVersion: BASE.schemaVersion,
        operation: request.operation,
        requestId: request.requestId,
        status: "completed",
        replayed: false,
        sessionId: BASE.sessionId,
      }),
    });
    const response = await client.request({
      schemaVersion: BASE.schemaVersion,
      operation: "turn.cancel",
      requestId: "request.cancel.v2",
      sessionId: BASE.sessionId,
      runId: BASE.runId,
      turnId: BASE.turnId,
      reason: "stop",
    });
    expect(response.operation).toBe("turn.cancel");
    expect(response.status).toBe("completed");
  });

  test("commits snapshots/deltas, deduplicates replay, and requests rebuild on gaps", () => {
    const initial = transitionInteractiveV2Projection(
      null,
      page(1, 1, "snapshot-required"),
      { sessionId: BASE.sessionId },
    );
    expect(initial.kind).toBe("committed");
    if (initial.kind !== "committed")
      throw new Error("expected initial commit");

    const duplicate = transitionInteractiveV2Projection(
      initial.state,
      page(1, 1, "events"),
      { sessionId: BASE.sessionId },
    );
    expect(duplicate.kind).toBe("committed");
    if (duplicate.kind !== "committed")
      throw new Error("expected duplicate commit");
    expect(duplicate.state.events).toHaveLength(1);

    const next = transitionInteractiveV2Projection(
      duplicate.state,
      page(2, 2, "events"),
      { sessionId: BASE.sessionId },
    );
    expect(next.kind).toBe("committed");
    if (next.kind !== "committed") throw new Error("expected delta commit");
    expect(next.state.events.map((item) => item.sequence)).toEqual([1, 2]);

    const gap = transitionInteractiveV2Projection(
      next.state,
      page(4, 4, "events"),
      { sessionId: BASE.sessionId },
    );
    expect(gap).toEqual({ kind: "rebuild-required", reason: "cursor-gap" });
  });
});
