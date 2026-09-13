import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
  AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
  createAgentOsInteractiveV2Event,
  createAgentOsInteractiveV2Snapshot,
  createAgentOsInteractiveV3CommandFingerprint,
  type AgentOsInteractiveV2TranscriptResponse,
} from "@xurunxin/morpheus-protocol";

import { runInteractiveV3TurnWithAbort } from "../src/abort.js";
import { transitionInteractiveV2Projection } from "../src/interactive-v2.js";
import {
  createInteractiveV3AppClient,
  transitionInteractiveV3Projection,
} from "../src/interactive-v3.js";

const V2_BASE = {
  schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
  sessionId: "session.sdk.v3",
  runId: "run.sdk.v3",
  turnId: "turn.sdk.v3",
  attemptId: "attempt.sdk.v3",
  effectId: "effect.sdk.v3",
  bindingRevision: 1,
  streamEpoch: "stream-epoch:sdk.v3" as const,
};

function v2Event(sequence: number, delta: string) {
  return createAgentOsInteractiveV2Event({
    ...V2_BASE,
    eventId: `event.sdk.v3.${sequence}`,
    sequence,
    eventType: "assistant.text.delta",
    payload: { contentId: "content.sdk.v3", delta },
    createdAt: `2026-08-31T00:00:${String(sequence).padStart(2, "0")}.000Z`,
  });
}

function v2Page(
  start: number,
  end: number,
  disposition: "events" | "snapshot-required",
): AgentOsInteractiveV2TranscriptResponse {
  const events = Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, index) => v2Event(start + index, String(start + index)),
  );
  const snapshot = createAgentOsInteractiveV2Snapshot({
    ...V2_BASE,
    binding: null,
    watermark: end,
    state: "running",
    terminal: false,
    updatedAt: `2026-08-31T00:00:${String(end).padStart(2, "0")}.000Z`,
  });
  const last =
    events.at(-1) ?? v2Event(Math.max(end, 1), String(Math.max(end, 1)));
  return {
    schemaVersion: V2_BASE.schemaVersion,
    operation: "transcript.subscribe",
    requestId: "request.subscribe.v3",
    disposition,
    snapshot,
    events,
    cursor: last.cursor,
    replayed: false,
  };
}

/** turn.start：先算 canonical 指纹再回填 payloadDigest（重试保持同一 commandId）。 */
function v3TurnStart(
  requestId = "request.turn.start.v3",
  commandId = "command.turn.start.v3",
) {
  const unsigned = {
    schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
    operation: "turn.start" as const,
    requestId,
    sessionId: V2_BASE.sessionId,
    turnId: V2_BASE.turnId,
    message: "hello",
    bindingRevision: 1,
    command: {
      commandId,
      principal: "principal.owner",
      payloadDigest: ("sha256:" + "0".repeat(64)) as `sha256:${string}`,
    },
  };
  const payloadDigest = createAgentOsInteractiveV3CommandFingerprint(unsigned);
  return { ...unsigned, command: { ...unsigned.command, payloadDigest } };
}

function v3TurnCancel() {
  const unsigned = {
    schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
    operation: "turn.cancel" as const,
    requestId: "request.turn.cancel.v3",
    sessionId: V2_BASE.sessionId,
    runId: V2_BASE.runId,
    turnId: V2_BASE.turnId,
    reason: "user aborted",
    command: {
      commandId: "command.turn.cancel.v3",
      principal: "principal.owner",
      payloadDigest: ("sha256:" + "0".repeat(64)) as `sha256:${string}`,
    },
  };
  const payloadDigest = createAgentOsInteractiveV3CommandFingerprint(unsigned);
  return { ...unsigned, command: { ...unsigned.command, payloadDigest } };
}

type V3CommandRequestLike = {
  readonly requestId: string;
  readonly operation: string;
  readonly command: {
    readonly commandId: string;
    readonly payloadDigest: `sha256:${string}`;
  };
};

function v3Ack(
  request: V3CommandRequestLike,
  overrides: Record<string, unknown> = {},
  receiptOverrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
    operation: request.operation,
    requestId: request.requestId,
    status: "accepted" as const,
    replayed: false,
    sessionId: V2_BASE.sessionId,
    receipt: {
      commandId: request.command.commandId,
      disposition: "executed" as const,
      payloadDigest: request.command.payloadDigest,
      ...receiptOverrides,
    },
    ...overrides,
  };
}

function committedState(
  page: AgentOsInteractiveV2TranscriptResponse,
): ReturnType<typeof transitionInteractiveV3Projection> {
  const transition = transitionInteractiveV3Projection(null, page, {
    sessionId: V2_BASE.sessionId,
  });
  if (transition.kind !== "committed") throw new Error("expected committed");
  return transition;
}

const SUBSCRIBE_REQUEST = {
  schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
  operation: "transcript.subscribe" as const,
  requestId: "request.subscribe.v3",
  sessionId: V2_BASE.sessionId,
  cursor: null,
  limit: 16,
};

describe("stateless InteractiveV3AppClient", () => {
  test("reads capabilities through the v3 profile", async () => {
    const client = createInteractiveV3AppClient({
      request: async (request) => ({
        schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
        operation: "capability.read",
        requestId: request.requestId,
        capabilities: [
          {
            capability: "session.create",
            implemented: true,
            configured: true,
            authorized: true,
            ready: true,
          },
        ],
      }),
    });
    const response = await client.readCapabilities({
      schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
      operation: "capability.read",
      requestId: "request.capability.v3",
    });
    expect(response.operation).toBe("capability.read");
    expect(response.capabilities[0]?.ready).toBe(true);
  });

  test("verifies the ack receipt echoes commandId and canonical fingerprint", async () => {
    const request = v3TurnStart();
    const client = createInteractiveV3AppClient({
      request: async () => v3Ack(request),
    });
    const response = await client.request(request);
    expect(response.status).toBe("accepted");
  });

  test("rejects a receipt digest that is not the canonical command fingerprint", () => {
    const request = v3TurnStart();
    const client = createInteractiveV3AppClient({
      request: async () =>
        v3Ack(request, {}, { payloadDigest: `sha256:${"f".repeat(64)}` }),
    });
    expect(client.request(request)).rejects.toBeInstanceOf(TypeError);
  });

  test("rejects a receipt with a foreign commandId", () => {
    const request = v3TurnStart();
    const client = createInteractiveV3AppClient({
      request: async () => v3Ack(request, {}, { commandId: "command.other" }),
    });
    expect(client.request(request)).rejects.toBeInstanceOf(TypeError);
  });

  test("rejects a success terminal ack that omits the command receipt (P01)", () => {
    const request = v3TurnStart();
    // completed + 无 receipt：省略回执不能绕过命令结果绑定。
    const completedNoReceipt = createInteractiveV3AppClient({
      request: async () => ({
        schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
        operation: "turn.start",
        requestId: request.requestId,
        status: "completed",
        replayed: false,
        sessionId: request.sessionId,
        turnId: request.turnId,
      }),
    });
    expect(completedNoReceipt.request(request)).rejects.toThrow(
      "requires a command receipt",
    );
    // accepted + 无 receipt：同样视为协议违例。
    const acceptedNoReceipt = createInteractiveV3AppClient({
      request: async () => ({
        schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
        operation: "turn.start",
        requestId: request.requestId,
        status: "accepted",
        replayed: false,
        sessionId: request.sessionId,
      }),
    });
    expect(acceptedNoReceipt.request(request)).rejects.toThrow(
      "requires a command receipt",
    );
  });

  test("defines rejection semantics separately: a rejected ack needs no receipt", async () => {
    const request = v3TurnStart();
    const client = createInteractiveV3AppClient({
      request: async () => ({
        schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
        operation: "turn.start",
        requestId: request.requestId,
        status: "rejected",
        replayed: false,
        sessionId: request.sessionId,
        reason: "policy denied",
      }),
    });
    const response = await client.request(request);
    expect(response.status).toBe("rejected");
    expect(response).not.toHaveProperty("receipt");
  });

  test("rejects mismatched requestId and operation correlation", () => {
    const request = v3TurnStart();
    const mismatchedId = createInteractiveV3AppClient({
      request: async () => v3Ack(request, { requestId: "request.other" }),
    });
    expect(mismatchedId.request(request)).rejects.toBeInstanceOf(TypeError);
    const mismatchedOp = createInteractiveV3AppClient({
      request: async () => ({ ...v3Ack(request), operation: "session.rename" }),
    });
    expect(mismatchedOp.request(request)).rejects.toBeInstanceOf(TypeError);
  });

  test("enforces command binding rules at the strict parser", () => {
    const request = v3TurnStart();
    const client = createInteractiveV3AppClient({
      request: async () => v3Ack(request),
    });
    expect(client.request({ ...request, command: undefined })).rejects.toThrow(
      "requires a command binding",
    );
    expect(
      client.request({
        schemaVersion: AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
        operation: "session.catalog.read",
        requestId: "request.catalog.v3",
        command: request.command,
      }),
    ).rejects.toThrow("must not carry a command binding");
  });

  test("subscribeTranscript yields v2 data-plane frames into the shared reducer", async () => {
    const client = createInteractiveV3AppClient({
      request: async () => {
        throw new Error("unexpected request");
      },
      subscribe: async function* () {
        yield v2Page(1, 1, "snapshot-required");
        yield v2Event(2, "delta-2");
        yield v2Event(3, "delta-3");
      },
    });
    const frames: unknown[] = [];
    for await (const frame of client.subscribeTranscript(SUBSCRIBE_REQUEST))
      frames.push(frame);
    expect(frames).toHaveLength(3);

    let state: ReturnType<typeof transitionInteractiveV3Projection> | null =
      null;
    let projection: unknown = null;
    for (const frame of frames) {
      const transition = client.reduce(
        state?.kind === "committed" ? state.state : null,
        frame,
        { sessionId: V2_BASE.sessionId },
      );
      expect(transition.kind).toBe("committed");
      if (transition.kind === "committed") {
        state = transition;
        projection = transition.state;
      }
    }
    const events = (projection as { events: { sequence: number }[] } | null)
      ?.events;
    expect(events?.map((event) => event.sequence)).toEqual([1, 2, 3]);
  });

  test("closing the subscription never sends turn.cancel", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sent: unknown[] = [];
    const client = createInteractiveV3AppClient({
      request: async (request) => {
        sent.push(request);
        return v3Ack(v3TurnStart());
      },
      subscribe: async function* () {
        yield v2Page(1, 1, "snapshot-required");
        await gate;
      },
    });
    const iterator = client
      .subscribeTranscript(SUBSCRIBE_REQUEST)
      [Symbol.asyncIterator]();
    let seen = 0;
    for await (const _frame of iterator) {
      seen += 1;
      break;
    }
    release?.();
    expect(seen).toBe(1);
    expect(sent).toHaveLength(0);
  });

  test("aborting the subscription tears down the stream without cancel", async () => {
    const controller = new AbortController();
    let sourceAborted = false;
    let observed = 0;
    const client = createInteractiveV3AppClient({
      request: async () => {
        observed += 1;
        return v2Page(1, 1, "snapshot-required");
      },
      subscribe: async function* (_request, signal) {
        try {
          for (let sequence = 1; sequence <= 8; sequence += 1) {
            if (signal?.aborted) return;
            yield v2Event(sequence, `delta-${sequence}`);
            await new Promise<void>((resolve) => setTimeout(resolve, 1));
          }
        } finally {
          sourceAborted = signal?.aborted ?? false;
        }
      },
    });
    const collected: unknown[] = [];
    for await (const frame of client.subscribeTranscript(
      { ...SUBSCRIBE_REQUEST, requestId: "request.subscribe.abort" },
      { signal: controller.signal },
    )) {
      collected.push(frame);
      if (collected.length === 2) controller.abort();
    }
    expect(collected).toHaveLength(2);
    expect(observed).toBe(0);
    expect(sourceAborted).toBe(true);
  });

  test("uses the exact same reducer as v2 and rebuilds consistently from snapshots", () => {
    expect(transitionInteractiveV3Projection).toBe(
      transitionInteractiveV2Projection,
    );

    const incremental = committedState(v2Page(1, 1, "snapshot-required"));
    const throughEvents = transitionInteractiveV3Projection(
      incremental.state,
      v2Page(2, 3, "events"),
      { sessionId: V2_BASE.sessionId },
    );
    if (throughEvents.kind !== "committed")
      throw new Error("expected committed");
    // 恢复快照一致：增量路径的事件 4 内容必须与单页重放内容相同。
    const snapshotPath = transitionInteractiveV3Projection(
      throughEvents.state,
      v2Event(4, "4"),
      { sessionId: V2_BASE.sessionId },
    );

    const rebuilt = committedState(v2Page(1, 1, "snapshot-required"));
    const singlePagePath = transitionInteractiveV3Projection(
      rebuilt.state,
      v2Page(1, 4, "events"),
      { sessionId: V2_BASE.sessionId },
    );

    expect(snapshotPath.kind).toBe("committed");
    expect(singlePagePath.kind).toBe("committed");
    if (
      snapshotPath.kind !== "committed" ||
      singlePagePath.kind !== "committed"
    )
      throw new Error("expected committed transitions");
    expect(snapshotPath.state.cursor).toEqual(singlePagePath.state.cursor);
    expect(
      snapshotPath.state.events.map((event) => [event.sequence, event.digest]),
    ).toEqual(
      singlePagePath.state.events.map((event) => [
        event.sequence,
        event.digest,
      ]),
    );
  });
});

describe("runInteractiveV3TurnWithAbort", () => {
  test("returns aborted-before-start when the signal is already aborted", async () => {
    const outcome = await runInteractiveV3TurnWithAbort({
      client: { request: async () => v3Ack(v3TurnStart()) },
      signal: AbortSignal.abort(),
      startRequest: v3TurnStart(),
      cancelRequest: v3TurnCancel(),
    });
    expect(outcome.kind).toBe("aborted-before-start");
  });

  test("sends an explicit turn.cancel command on abort and reports cancelled", async () => {
    const sent: unknown[] = [];
    const startAck = v3Ack(v3TurnStart());
    const cancelAck = v3Ack(v3TurnCancel(), { status: "completed" });
    const controller = new AbortController();
    const client = {
      request: async (request: unknown) => {
        sent.push(request);
        const requestId = (request as { requestId?: unknown }).requestId;
        if (requestId === "request.turn.start.v3") {
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
          return startAck;
        }
        return cancelAck;
      },
    };
    setTimeout(() => controller.abort(), 1);
    const outcome = await runInteractiveV3TurnWithAbort({
      client,
      signal: controller.signal,
      startRequest: v3TurnStart(),
      cancelRequest: v3TurnCancel(),
    });
    expect(outcome.kind).toBe("cancelled");
    expect(sent).toHaveLength(2);
    expect((sent[1] as { operation?: string }).operation).toBe("turn.cancel");
  });

  test("rejects non-turn operations up front", () => {
    const request = v3TurnStart();
    expect(
      runInteractiveV3TurnWithAbort({
        client: { request: async () => v3Ack(request) },
        signal: new AbortController().signal,
        startRequest: request,
        cancelRequest: request,
      }),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
