import { describe, expect, it } from "bun:test";
import {
  AgentCoreProjectedSseAbortError,
  AgentCoreProjectedSseHttpError,
  AgentCoreProjectedSseProtocolError,
  AgentCoreProjectedSseTransportError,
  agentCoreProjectedSseV2Limits,
  createAgentCoreProjectedSseClient,
  createAgentCoreProjectedSseFrameParser,
  parsePublicJsonValue,
  parseAgentCoreProjectedSseEvent,
} from "../src/index.js";

const encoder = new TextEncoder();
const request = { query: "q", sessionId: "session", requestId: "request" };

function frame(event: string, payload: object, sequence: number): string {
  return `id: c-${sequence}\nevent: ${event}\ndata: ${JSON.stringify({
    schemaVersion: "agent-core.prompt-stream.v2",
    eventId: `event-${sequence}`,
    streamId: "stream",
    sessionId: "session",
    sequence,
    createdAt: "2026-07-23T00:00:00.000Z",
    payload,
  })}\n\n`;
}

function textDelta(sequence: number): string {
  return frame(
    "text_delta",
    { contentIndex: 0, delta: "x", partial: { role: "assistant", content: [] } },
    sequence
  );
}

function done(sequence: number): string {
  return frame("done", { sessionId: "session" }, sequence);
}

function eventInput(
  event: string,
  payload: object,
  overrides: Partial<{ streamId: string; sessionId: string; createdAt: string }> = {}
) {
  return {
    event,
    cursor: "cursor",
    data: {
      schemaVersion: "agent-core.prompt-stream.v2",
      eventId: "event",
      streamId: overrides.streamId ?? "stream",
      sessionId: overrides.sessionId ?? "session",
      sequence: 1,
      createdAt: overrides.createdAt ?? "2026-07-23T00:00:00.000Z",
      payload,
    },
  };
}

function protocolCode(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(AgentCoreProjectedSseProtocolError);
  if (!(error instanceof AgentCoreProjectedSseProtocolError)) throw error;
  expect(error.code).toBe(code);
}

function client(body: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  const result = createAgentCoreProjectedSseClient({
    baseUrl: "https://example.test",
    apiKey: "key",
    fetch: async () => new Response(body, { headers: { "content-type": "text/event-stream" } }),
  });
  return { result, signal };
}

function responseWithReader(
  reader: {
    read(): Promise<ReadableStreamReadResult<Uint8Array>>;
    cancel(): Promise<void>;
    releaseLock(): void;
  },
  options: ResponseInit = { headers: { "content-type": "text/event-stream" } }
): Response {
  const response = new Response(null, options);
  return new Proxy(response, {
    get(target, property) {
      if (property === "body") return { getReader: () => reader };
      return Reflect.get(target, property, target);
    },
  });
}

function clientForResponse(response: Response) {
  return createAgentCoreProjectedSseClient({
    baseUrl: "https://example.test",
    apiKey: "key",
    fetch: async () => response,
  });
}

async function completesWithin<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), 250);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function collect(
  stream: AsyncIterable<{ cursor: string; event: string }>
): Promise<Array<{ cursor: string; event: string }>> {
  const events: Array<{ cursor: string; event: string }> = [];
  for await (const event of stream) events.push({ cursor: event.cursor, event: event.event });
  return events;
}

async function rejectedWithin(promise: Promise<unknown>, label: string): Promise<unknown> {
  try {
    await completesWithin(promise, label);
  } catch (error) {
    return error;
  }
  throw new Error(`${label} unexpectedly resolved`);
}

function expectProtocolFailure(callback: () => unknown): unknown {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new Error("expected protocol failure");
}

describe("agent core projected SSE v2 lifecycle", () => {
  it("reports a transport failure with the last confirmed cursor", async () => {
    let cancelled = 0;
    let released = 0;
    let reads = 0;
    const result = clientForResponse(
      responseWithReader({
        async read() {
          reads += 1;
          if (reads === 1) return { done: false, value: encoder.encode(textDelta(1)) };
          throw new Error("socket closed");
        },
        async cancel() {
          cancelled += 1;
        },
        releaseLock() {
          released += 1;
        },
      })
    );

    const error = await rejectedWithin(
      collect(result.streamPrompt("agent", request)),
      "transport read"
    );

    expect(error).toBeInstanceOf(AgentCoreProjectedSseTransportError);
    if (!(error instanceof AgentCoreProjectedSseTransportError)) throw error;
    expect(error.lastConfirmedCursor).toBe("c-1");
    expect(cancelled).toBe(1);
    expect(released).toBe(1);
  });

  it("does not deliver or confirm an invalid frame cursor", async () => {
    let cancelled = 0;
    const invalid = "id: c-2\nevent: done\ndata: []\n\n";
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`${textDelta(1)}${invalid}`));
      },
      cancel() {
        cancelled += 1;
      },
    });
    const { result } = client(body);
    const delivered: string[] = [];

    const error = await rejectedWithin(
      (async () => {
        for await (const event of result.streamPrompt("agent", request))
          delivered.push(event.cursor);
      })(),
      "invalid frame"
    );

    expect(error).toBeInstanceOf(AgentCoreProjectedSseProtocolError);
    expect(delivered).toEqual(["c-1"]);
    expect(cancelled).toBe(1);
    expect(body.locked).toBeFalse();
  });

  it("cancels and releases when the consumer stops early", async () => {
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(textDelta(1)));
      },
      cancel() {
        cancelled += 1;
      },
    });
    const { result } = client(body);

    await completesWithin(
      (async () => {
        for await (const _event of result.streamPrompt("agent", request)) break;
      })(),
      "consumer break"
    );

    expect(cancelled).toBe(1);
    expect(body.locked).toBeFalse();
  });

  it("cancels and releases when an in-flight read observes abort", async () => {
    const controller = new AbortController();
    let cancelled = 0;
    let released = 0;
    let reads = 0;
    let rejectRead: ((reason?: unknown) => void) | undefined;
    let notifyReadStarted: (() => void) | undefined;
    const readStarted = new Promise<void>((resolve) => {
      notifyReadStarted = resolve;
    });
    const result = clientForResponse(
      responseWithReader({
        read() {
          reads += 1;
          if (reads === 1)
            return Promise.resolve({ done: false, value: encoder.encode(textDelta(1)) });
          notifyReadStarted?.();
          return new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
            rejectRead = reject;
          });
        },
        async cancel() {
          cancelled += 1;
        },
        releaseLock() {
          released += 1;
        },
      })
    );
    const stream = result.streamPrompt("agent", request, { signal: controller.signal });
    const iterator = stream[Symbol.asyncIterator]();

    await completesWithin(iterator.next(), "first frame");
    const pending = iterator.next();
    await completesWithin(readStarted, "second read start");
    controller.abort();
    rejectRead?.(new Error("request aborted"));
    const error = await rejectedWithin(pending, "aborted read");

    expect(error).toBeInstanceOf(AgentCoreProjectedSseAbortError);
    if (!(error instanceof AgentCoreProjectedSseAbortError)) throw error;
    expect(error.lastConfirmedCursor).toBe("c-1");
    expect(cancelled).toBe(1);
    expect(released).toBe(1);
  });

  it("cancels and releases an open stream after done without delivering a delayed duplicate", async () => {
    let cancelled = 0;
    let lateDeliveryAttempted = false;
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const lateAttempt = new Promise<void>((resolve) => {
      setTimeout(() => {
        lateDeliveryAttempted = true;
        try {
          streamController?.enqueue(encoder.encode(done(2)));
        } catch {
          // The stream was cancelled after the terminal frame, which is the expected outcome.
        }
        resolve();
      }, 5);
    });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
        controller.enqueue(encoder.encode(done(1)));
      },
      cancel() {
        cancelled += 1;
      },
    });
    const { result } = client(body);

    const delivered = await completesWithin(collect(result.streamPrompt("agent", request)), "done");
    await completesWithin(lateAttempt, "late duplicate");

    expect(delivered).toEqual([{ cursor: "c-1", event: "done" }]);
    expect(lateDeliveryAttempted).toBeTrue();
    expect(cancelled).toBe(1);
    expect(body.locked).toBeFalse();
  });

  it("preserves the primary protocol failure when cancellation rejects", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("id: c-1\nevent: done\ndata: []\n\n"));
      },
      cancel() {
        return Promise.reject(new Error("cancel failed"));
      },
    });
    const { result } = client(body);

    const error = await rejectedWithin(
      collect(result.streamPrompt("agent", request)),
      "protocol error"
    );

    expect(error).toBeInstanceOf(AgentCoreProjectedSseProtocolError);
    if (!(error instanceof AgentCoreProjectedSseProtocolError)) throw error;
    expect(error.code).toBe("INVALID_SHAPE");
    expect(body.locked).toBeFalse();
  });

  it("rejects each client stream invariant with its protocol code and fetches once", async () => {
    const cases: Array<{
      name: string;
      source: string;
      code: string;
    }> = [
      {
        name: "session drift",
        source: frame(
          "text_delta",
          { contentIndex: 0, delta: "x", partial: { role: "assistant", content: [] } },
          1
        ).replace('"sessionId":"session"', '"sessionId":"other"'),
        code: "SESSION_MISMATCH",
      },
      {
        name: "stream drift",
        source: `${textDelta(1)}${frame("text_delta", { contentIndex: 0, delta: "x", partial: { role: "assistant", content: [] } }, 2).replace('"streamId":"stream"', '"streamId":"other"')}`,
        code: "STREAM_MISMATCH",
      },
      {
        name: "business event after error",
        source: `${frame("error", { code: "FAILED", message: "safe" }, 1)}${textDelta(2)}`,
        code: "DONE_REQUIRED",
      },
      {
        name: "same-batch duplicate done",
        source: `${done(1)}${done(2)}`,
        code: "DUPLICATE_DONE",
      },
    ];
    for (const testCase of cases) {
      let fetches = 0;
      const result = createAgentCoreProjectedSseClient({
        baseUrl: "https://example.test",
        apiKey: "key",
        fetch: async () => {
          fetches += 1;
          return new Response(testCase.source, {
            headers: { "content-type": "text/event-stream" },
          });
        },
      });

      const error = await rejectedWithin(
        collect(result.streamPrompt("agent", request)),
        testCase.name
      );
      protocolCode(error, testCase.code);
      expect(fetches).toBe(1);
    }
  });

  it("does not retry fetch for transport or protocol failures", async () => {
    for (const source of [undefined, "id: c-1\nevent: done\ndata: []\n\n"] as const) {
      let fetches = 0;
      const result = createAgentCoreProjectedSseClient({
        baseUrl: "https://example.test",
        apiKey: "key",
        fetch: async () => {
          fetches += 1;
          if (source === undefined) throw new Error("network failed");
          return new Response(source, { headers: { "content-type": "text/event-stream" } });
        },
      });

      const error = await rejectedWithin(
        collect(result.streamPrompt("agent", request)),
        source === undefined ? "fetch transport failure" : "stream protocol failure"
      );
      if (source === undefined) expect(error).toBeInstanceOf(AgentCoreProjectedSseTransportError);
      else protocolCode(error, "INVALID_SHAPE");
      expect(fetches).toBe(1);
    }
  });
});

describe("agent core projected SSE v2 budget boundaries", () => {
  it("accepts exactly the JSON depth limit and rejects one additional level", () => {
    let exact: unknown = null;
    for (let index = 0; index < agentCoreProjectedSseV2Limits.maxJsonDepth; index += 1) {
      exact = [exact];
    }
    let tooDeep: unknown = exact;
    tooDeep = [tooDeep];

    expect(parsePublicJsonValue(exact)).toEqual(exact);
    const error = expectProtocolFailure(() => parsePublicJsonValue(tooDeep));
    protocolCode(error, "JSON_BUDGET");
  });

  it("enforces array, object, and shared node limits at exact plus one", () => {
    const exactArray = Array.from(
      { length: agentCoreProjectedSseV2Limits.maxArrayItems },
      () => null
    );
    expect(parsePublicJsonValue(exactArray)).toHaveLength(
      agentCoreProjectedSseV2Limits.maxArrayItems
    );
    protocolCode(
      expectProtocolFailure(() => parsePublicJsonValue([...exactArray, null])),
      "JSON_BUDGET"
    );

    const exactObject = Object.fromEntries(
      Array.from({ length: agentCoreProjectedSseV2Limits.maxObjectProperties }, (_, index) => [
        `k${index}`,
        null,
      ])
    );
    expect(Object.keys(parsePublicJsonValue(exactObject))).toHaveLength(
      agentCoreProjectedSseV2Limits.maxObjectProperties
    );
    protocolCode(
      expectProtocolFailure(() => parsePublicJsonValue({ ...exactObject, overflow: null })),
      "JSON_BUDGET"
    );

    const exactNodes = [...Array.from({ length: 9_999 }, () => ({ value: null })), null];
    const tooManyNodes = Array.from({ length: 10_000 }, () => ({ value: null }));
    expect(parsePublicJsonValue(exactNodes)).toHaveLength(10_000);
    protocolCode(
      expectProtocolFailure(() => parsePublicJsonValue(tooManyNodes)),
      "JSON_BUDGET"
    );
  });

  it("enforces UTF-8 string, data, and id byte limits at exact plus one", () => {
    const exactJson = `${"€".repeat(349_525)}a`;
    const oversizedJson = `${exactJson}a`;
    expect(parsePublicJsonValue(exactJson)).toBe(exactJson);
    protocolCode(
      expectProtocolFailure(() => parsePublicJsonValue(oversizedJson)),
      "JSON_BUDGET"
    );

    const exactFrameData = JSON.stringify(`${"€".repeat(349_524)}aa`);
    const exactParser = createAgentCoreProjectedSseFrameParser();
    expect(
      exactParser.push(encoder.encode(`id: c\nevent: done\ndata: ${exactFrameData}\n\n`))
    ).toHaveLength(1);

    const oversizedFrameData = JSON.stringify(`${"€".repeat(349_524)}aaa`);
    const oversizedParser = createAgentCoreProjectedSseFrameParser();
    protocolCode(
      expectProtocolFailure(() =>
        oversizedParser.push(encoder.encode(`id: c\nevent: done\ndata: ${oversizedFrameData}\n\n`))
      ),
      "FRAME_TOO_LARGE"
    );

    const exactId = "i".repeat(agentCoreProjectedSseV2Limits.maxFrameDataBytes);
    const idParser = createAgentCoreProjectedSseFrameParser();
    expect(idParser.push(encoder.encode(`id: ${exactId}\nevent: done\ndata: {}\n\n`))).toHaveLength(
      1
    );
    protocolCode(
      expectProtocolFailure(() =>
        createAgentCoreProjectedSseFrameParser().push(
          encoder.encode(`id: ${exactId}x\nevent: done\ndata: {}\n\n`)
        )
      ),
      "FRAME_TOO_LARGE"
    );
  });

  it("rejects root, object, and array accessors without invoking them", () => {
    const inputs: unknown[] = [];
    let calls = 0;
    const root = {};
    Object.defineProperty(root, "value", { enumerable: true, get: () => ++calls });
    inputs.push(root);
    const object = { nested: {} };
    Object.defineProperty(object.nested, "value", { enumerable: true, get: () => ++calls });
    inputs.push(object);
    const array: unknown[] = [{}];
    Object.defineProperty(array[0] as object, "value", { enumerable: true, get: () => ++calls });
    inputs.push(array);
    for (const input of inputs)
      protocolCode(
        expectProtocolFailure(() => parsePublicJsonValue(input)),
        "INVALID_SHAPE"
      );
    expect(calls).toBe(0);
  });

  it("accepts offset leap seconds and arbitrary fractions, then rejects an invalid leap date", () => {
    for (const createdAt of [
      "2017-01-01T00:59:60+01:00",
      "2016-12-31T23:59:60.12345678901234567890Z",
    ]) {
      expect(
        parseAgentCoreProjectedSseEvent(eventInput("done", { sessionId: "session" }, { createdAt }))
          .data.createdAt
      ).toBe(createdAt);
    }
    protocolCode(
      expectProtocolFailure(() =>
        parseAgentCoreProjectedSseEvent(
          eventInput("done", { sessionId: "session" }, { createdAt: "2018-01-01T00:00:60Z" })
        )
      ),
      "INVALID_VALUE"
    );
  });
});

describe("agent core projected SSE v2 non-2xx body boundaries", () => {
  it("accepts an exact 64 KiB error body and rejects one additional byte", async () => {
    const emptyEnvelope = JSON.stringify({ error: { code: "E", message: "m", details: "" } });
    const exactBody = JSON.stringify({
      error: {
        code: "E",
        message: "m",
        details: "x".repeat(agentCoreProjectedSseV2Limits.maxErrorBodyBytes - emptyEnvelope.length),
      },
    });
    expect(encoder.encode(exactBody)).toHaveLength(agentCoreProjectedSseV2Limits.maxErrorBodyBytes);
    let exactReads = 0;
    const exactClient = clientForResponse(
      responseWithReader(
        {
          read: async () => {
            exactReads += 1;
            return exactReads === 1
              ? { done: false, value: encoder.encode(exactBody) }
              : { done: true, value: undefined };
          },
          cancel: async () => {},
          releaseLock: () => {},
        },
        { status: 503, headers: { "content-type": "application/json" } }
      )
    );
    const exactError = await rejectedWithin(
      collect(exactClient.streamPrompt("agent", request)),
      "exact error body"
    );
    expect(exactError).toBeInstanceOf(AgentCoreProjectedSseHttpError);

    let cancelled = 0;
    const oversizedClient = clientForResponse(
      responseWithReader(
        {
          read: async () => ({
            done: false,
            value: new Uint8Array(agentCoreProjectedSseV2Limits.maxErrorBodyBytes + 1),
          }),
          cancel: async () => {
            cancelled += 1;
          },
          releaseLock: () => {},
        },
        { status: 503, headers: { "content-type": "application/json" } }
      )
    );
    const oversizedError = await rejectedWithin(
      collect(oversizedClient.streamPrompt("agent", request)),
      "oversized error body"
    );
    protocolCode(oversizedError, "ERROR_BODY_TOO_LARGE");
    expect(cancelled).toBe(1);
  });

  it("reports malformed and invalid UTF-8 error bodies with their cleanup behavior", async () => {
    let malformedReads = 0;
    let malformedCancels = 0;
    const malformedClient = clientForResponse(
      responseWithReader(
        {
          read: async () => {
            malformedReads += 1;
            return malformedReads === 1
              ? { done: false, value: encoder.encode("{") }
              : { done: true, value: undefined };
          },
          cancel: async () => {
            malformedCancels += 1;
          },
          releaseLock: () => {},
        },
        { status: 503, headers: { "content-type": "application/json" } }
      )
    );
    const malformedError = await rejectedWithin(
      collect(malformedClient.streamPrompt("agent", request)),
      "malformed error body"
    );
    protocolCode(malformedError, "MALFORMED_ERROR_BODY");
    expect(malformedCancels).toBe(0);

    let invalidReads = 0;
    let invalidCancels = 0;
    const invalidUtf8Client = clientForResponse(
      responseWithReader(
        {
          read: async () => {
            invalidReads += 1;
            return invalidReads === 1
              ? { done: false, value: Uint8Array.of(0xff) }
              : { done: true, value: undefined };
          },
          cancel: async () => {
            invalidCancels += 1;
          },
          releaseLock: () => {},
        },
        { status: 503, headers: { "content-type": "application/json" } }
      )
    );
    const invalidUtf8Error = await rejectedWithin(
      collect(invalidUtf8Client.streamPrompt("agent", request)),
      "invalid UTF-8 error body"
    );
    protocolCode(invalidUtf8Error, "MALFORMED_ERROR_BODY");
    expect(invalidCancels).toBe(1);
  });
});
