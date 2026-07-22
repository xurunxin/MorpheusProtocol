import { describe, expect, it } from "bun:test";
import {
  AgentCoreProjectedSseHttpError,
  AgentCoreProjectedSseProtocolError,
  createAgentCoreProjectedSseClient,
  createAgentCoreProjectedSseFrameParser,
  parseAgentCoreProjectedSseEvent,
} from "../src/index.js";

const base = (event: string, payload: object, sequence = 1) => ({
  event,
  cursor: `c-${sequence}`,
  data: {
    schemaVersion: "agent-core.prompt-stream.v2",
    eventId: `e-${sequence}`,
    streamId: "stream",
    sessionId: "session",
    sequence,
    createdAt: "0001-01-01T00:00:00.12345678901234567890Z",
    payload,
  },
});
const wire = (frame: ReturnType<typeof base>) =>
  `id: ${frame.cursor}\nevent: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`;
const request = { query: "q", sessionId: "session", requestId: "request" };

describe("v2 validator budget and unsafe-value matrix", () => {
  for (const [name, value] of [
    ["symbol", Object.assign({ ok: true }, { [Symbol("x")]: 1 })],
    ["non-enumerable", Object.defineProperty({}, "hidden", { value: 1 })],
    ["Date", new Date()],
    ["Map", new Map()],
    ["typed array", new Uint8Array(1)],
    [
      "sparse array",
      (() => {
        const sparse = Array<unknown>(2);
        sparse[1] = 1;
        return sparse;
      })(),
    ],
    ["NaN", Number.NaN],
    ["Infinity", Infinity],
  ] as const) {
    it(`rejects ${name}`, () =>
      expect(() =>
        parseAgentCoreProjectedSseEvent(
          base("tool_end", { toolCallId: "x", toolName: "x", result: value, isError: false })
        )
      ).toThrow(AgentCoreProjectedSseProtocolError));
  }
  it("rejects a cyclic JSON value", () => {
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    expect(() =>
      parseAgentCoreProjectedSseEvent(
        base("tool_end", { toolCallId: "x", toolName: "x", result: cycle, isError: false })
      )
    ).toThrow();
  });
});

describe("v2 parser matrix", () => {
  for (const source of [
    "id: a\r\nevent: done\r\ndata: {}\r\n\r\n",
    "id: a\revent: done\rdata: {}\r\r",
  ]) {
    it("accepts CR framing at every chunk boundary", () => {
      const parser = createAgentCoreProjectedSseFrameParser();
      const frames = [];
      for (const byte of new TextEncoder().encode(source))
        frames.push(...parser.push(Uint8Array.of(byte)));
      frames.push(...parser.finish());
      expect(frames).toHaveLength(1);
    });
  }
  it("rejects a duplicate frame field with DUPLICATE_FIELD", () => {
    const parser = createAgentCoreProjectedSseFrameParser();
    let error: unknown;
    try {
      parser.push(new TextEncoder().encode("id: a\nid: b\nevent: done\ndata: {}\n\n"));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AgentCoreProjectedSseProtocolError);
    expect((error as AgentCoreProjectedSseProtocolError).code).toBe("DUPLICATE_FIELD");
  });

  it("rejects a complete unknown event discriminator with UNKNOWN_EVENT", () => {
    let error: unknown;
    try {
      parseAgentCoreProjectedSseEvent(base("not_frozen", { sessionId: "session" }));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AgentCoreProjectedSseProtocolError);
    expect((error as AgentCoreProjectedSseProtocolError).code).toBe("UNKNOWN_EVENT");
  });

  it("rejects an unknown schema with INVALID_SCHEMA", () => {
    let error: unknown;
    try {
      parseAgentCoreProjectedSseEvent({
        ...base("done", { sessionId: "session" }),
        data: { ...base("done", { sessionId: "session" }).data, schemaVersion: "other" },
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AgentCoreProjectedSseProtocolError);
    expect((error as AgentCoreProjectedSseProtocolError).code).toBe("INVALID_SCHEMA");
  });

  it("rejects malformed JSON data with MALFORMED_JSON", () => {
    const parser = createAgentCoreProjectedSseFrameParser();
    let error: unknown;
    try {
      parser.push(new TextEncoder().encode("id: a\nevent: done\ndata: not-json\n\n"));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AgentCoreProjectedSseProtocolError);
    expect((error as AgentCoreProjectedSseProtocolError).code).toBe("MALFORMED_JSON");
  });

  it("rejects an incomplete frame with INCOMPLETE_FRAME", () => {
    const parser = createAgentCoreProjectedSseFrameParser();
    parser.push(new TextEncoder().encode("id: a\nevent: done\ndata: {}\n"));
    let error: unknown;
    try {
      parser.finish();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AgentCoreProjectedSseProtocolError);
    expect((error as AgentCoreProjectedSseProtocolError).code).toBe("INCOMPLETE_FRAME");
  });
});

describe("v2 client non-2xx matrix", () => {
  for (const status of [400, 401, 403, 404, 406, 409, 413, 415, 503]) {
    it(`types HTTP ${status}`, async () => {
      const client = createAgentCoreProjectedSseClient({
        baseUrl: "https://x",
        apiKey: "k",
        fetch: async () =>
          new Response(JSON.stringify({ error: { code: `E_${status}`, message: "m" } }), {
            status,
            headers: { "content-type": "application/json" },
          }),
      });
      await expect(async () => {
        for await (const event of client.streamPrompt("a", request)) void event;
      }).toThrow(AgentCoreProjectedSseHttpError);
    });
  }
  it("permits duplicate delivery and sequence gaps before an error and done", async () => {
    const frames = `${wire(base("text_delta", { contentIndex: 0, delta: "a", partial: { role: "assistant", content: [] } }, 3))}${wire(base("text_delta", { contentIndex: 0, delta: "a", partial: { role: "assistant", content: [] } }, 3))}${wire(base("error", { code: "E", message: "m" }, 5))}${wire(base("done", { sessionId: "session" }, 9))}`;
    const client = createAgentCoreProjectedSseClient({
      baseUrl: "https://x",
      apiKey: "k",
      fetch: async () => new Response(frames, { headers: { "content-type": "text/event-stream" } }),
    });
    const events: string[] = [];
    for await (const event of client.streamPrompt("a", request)) events.push(event.event);
    expect(events).toEqual(["text_delta", "text_delta", "error", "done"]);
  });
  it("cancels on done and preserves the primary error when cancellation rejects", async () => {
    const encoder = new TextEncoder();
    const makeResponse = (source: string, rejecting = false, close = false) => {
      let cancelled = 0;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(source));
          if (close) controller.close();
        },
        cancel() {
          cancelled += 1;
          if (rejecting) return Promise.reject(new Error("cancel"));
        },
      });
      return {
        response: new Response(body, { headers: { "content-type": "text/event-stream" } }),
        cancelled: () => cancelled,
      };
    };
    const done = makeResponse(wire(base("done", { sessionId: "session" })));
    const client = createAgentCoreProjectedSseClient({
      baseUrl: "https://x",
      apiKey: "k",
      fetch: async () => done.response,
    });
    for await (const event of client.streamPrompt("a", request)) void event;
    expect(done.cancelled()).toBe(1);
    const broken = makeResponse("id: bad\nevent: done\ndata: []\n\n", true);
    const brokenClient = createAgentCoreProjectedSseClient({
      baseUrl: "https://x",
      apiKey: "k",
      fetch: async () => broken.response,
    });
    await expect(async () => {
      for await (const event of brokenClient.streamPrompt("a", request)) void event;
    }).toThrow(AgentCoreProjectedSseProtocolError);
    expect(broken.cancelled()).toBe(1);
  });
});
