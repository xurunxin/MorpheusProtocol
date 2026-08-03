import { describe, expect, it } from "bun:test";
import {
  AgentCoreProjectedSseAbortError,
  AgentCoreProjectedSseHttpError,
  AgentCoreProjectedSseProtocolError,
  createAgentCoreProjectedSseClient,
  createAgentCoreProjectedSseFrameParser,
  parseAgentCoreProjectedPromptStreamRequest,
  parseAgentCoreProjectedSseEvent,
} from "../src/index.js";

const partial = { role: "assistant", content: [{ type: "text", text: "hello" }] };

function event(eventName: string, payload: object, sequence = 2) {
  return {
    event: eventName,
    cursor: `v1.stream-1.${sequence}`,
    data: {
      schemaVersion: "agent-core.prompt-stream.v2",
      eventId: `event-${sequence}`,
      streamId: "stream-1",
      sessionId: "session-1",
      sequence,
      createdAt: "2026-07-23T00:00:00.000Z",
      payload,
    },
  };
}

function wire(frame: ReturnType<typeof event>): string {
  return `id: ${frame.cursor}\nevent: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`;
}

function response(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}

describe("agent core projected SSE v2 contract", () => {
  it("validates every frozen public event variant", () => {
    const toolCall = { type: "toolCall", id: "call-1", name: "search", arguments: { q: "x" } };
    const variants: Array<[string, object]> = [
      ["session", { sessionId: "session-1" }],
      ["text_start", { contentIndex: 0, partial }],
      ["text_delta", { contentIndex: 0, delta: "x", partial }],
      ["text_end", { contentIndex: 0, content: "x", partial }],
      ["thinking_start", { contentIndex: 0, partial }],
      ["thinking_delta", { contentIndex: 0, delta: "x", partial }],
      ["thinking_end", { contentIndex: 0, content: "x", partial }],
      ["tool_start", { toolCallId: "call-1", toolName: "search", arguments: { q: "x" } }],
      [
        "tool_update",
        { toolCallId: "call-1", toolName: "search", arguments: { q: "x" }, partialResult: null },
      ],
      [
        "tool_end",
        { toolCallId: "call-1", toolName: "search", result: { ok: true }, isError: false },
      ],
      ["toolcall_start", { contentIndex: 0, toolCall, partial }],
      ["toolcall_delta", { contentIndex: 0, delta: "x", partial }],
      ["toolcall_end", { contentIndex: 0, toolCall, partial }],
      ["agent_end", { messages: [{ role: "assistant", content: "done", timestamp: 1 }] }],
      ["error", { code: "FAILED", message: "safe" }],
      ["done", { sessionId: "session-1" }],
    ];
    for (const [eventName, payload] of variants) {
      expect(parseAgentCoreProjectedSseEvent(event(eventName, payload)).event).toBe(eventName);
    }
  });

  it("rejects unknown fields, unsafe descriptors, malformed request ids and unsafe JSON", () => {
    expect(() =>
      parseAgentCoreProjectedPromptStreamRequest({ query: "  ", sessionId: "s", requestId: "r" })
    ).toThrow(AgentCoreProjectedSseProtocolError);
    expect(() =>
      parseAgentCoreProjectedPromptStreamRequest({
        query: "q",
        sessionId: "s",
        requestId: "r",
        extra: true,
      })
    ).toThrow(AgentCoreProjectedSseProtocolError);
    const unsafe = {} as { value?: unknown };
    Object.defineProperty(unsafe, "value", { enumerable: true, get: () => "x" });
    expect(() =>
      parseAgentCoreProjectedSseEvent(
        event("tool_update", {
          toolCallId: "c",
          toolName: "n",
          arguments: unsafe,
          partialResult: 1,
        })
      )
    ).toThrow(AgentCoreProjectedSseProtocolError);
    class ArraySubclass extends Array<unknown> {}
    expect(() =>
      parseAgentCoreProjectedSseEvent(
        event("tool_update", {
          toolCallId: "c",
          toolName: "n",
          arguments: { items: new ArraySubclass(1) },
          partialResult: 1,
        })
      )
    ).toThrow(AgentCoreProjectedSseProtocolError);
    const proxied = new Proxy({ safe: true }, {});
    expect(() =>
      parseAgentCoreProjectedSseEvent(
        event("tool_update", {
          toolCallId: "c",
          toolName: "n",
          arguments: proxied,
          partialResult: 1,
        })
      )
    ).toThrow(AgentCoreProjectedSseProtocolError);
    expect(() =>
      parseAgentCoreProjectedSseEvent(
        event("tool_end", { toolCallId: "c", toolName: "n", result: Number.NaN, isError: false })
      )
    ).toThrow(AgentCoreProjectedSseProtocolError);
  });

  it("parses fragmented UTF-8 SSE and rejects comments, retry, duplicates and incomplete frames", () => {
    const parser = createAgentCoreProjectedSseFrameParser();
    const bytes = new TextEncoder().encode(
      wire(event("text_delta", { contentIndex: 0, delta: "你", partial }))
    );
    const split = bytes.indexOf(0xe4) + 1;
    expect(parser.push(bytes.slice(0, split))).toEqual([]);
    expect(parser.push(bytes.slice(split))).toHaveLength(1);
    expect(parser.finish()).toEqual([]);
    for (const body of [
      ": ping\n\n",
      "retry: 1\n\n",
      "id: a\nid: b\nevent: done\ndata: {}\n\n",
      "id: a\nevent: done\n",
    ]) {
      const strict = createAgentCoreProjectedSseFrameParser();
      expect(() => {
        strict.push(new TextEncoder().encode(body));
        strict.finish();
      }).toThrow(AgentCoreProjectedSseProtocolError);
    }
  });

  it("enforces shared frame budgets, RFC3339 dates, CR split, BOM and fatal UTF-8", () => {
    const parser = createAgentCoreProjectedSseFrameParser();
    const cr = wire(event("done", { sessionId: "session-1" })).replaceAll("\n", "\r\n");
    expect(parser.push(new TextEncoder().encode(cr.slice(0, -1)))).toEqual([]);
    expect(parser.push(new TextEncoder().encode(cr.slice(-1)))).toHaveLength(1);
    expect(parser.finish()).toEqual([]);
    const bom = createAgentCoreProjectedSseFrameParser();
    expect(
      bom.push(new TextEncoder().encode(`\ufeff${wire(event("done", { sessionId: "session-1" }))}`))
    ).toHaveLength(1);
    const invalid = createAgentCoreProjectedSseFrameParser();
    expect(() => invalid.push(Uint8Array.from([0xff]))).toThrow(AgentCoreProjectedSseProtocolError);
    const tooLarge = createAgentCoreProjectedSseFrameParser();
    expect(() =>
      tooLarge.push(new TextEncoder().encode(`data: "${"x".repeat(1_048_576)}"`))
    ).toThrow(AgentCoreProjectedSseProtocolError);
    for (const createdAt of ["2024-02-29T01:02:03Z", "2024-02-29T01:02:03.123+05:30"]) {
      expect(
        parseAgentCoreProjectedSseEvent({
          ...event("done", { sessionId: "session-1" }),
          data: { ...event("done", { sessionId: "session-1" }).data, createdAt },
        }).data.createdAt
      ).toBe(createdAt);
    }
    expect(() =>
      parseAgentCoreProjectedSseEvent({
        ...event("done", { sessionId: "session-1" }),
        data: {
          ...event("done", { sessionId: "session-1" }).data,
          createdAt: "2024-02-30T25:00:00+25:00",
        },
      })
    ).toThrow(AgentCoreProjectedSseProtocolError);
  });

  it("uses encoded canonical AgentRef, sends exact headers, and parses typed errors", async () => {
    let requestedUrl: string | URL | Request | undefined;
    let init: RequestInit | undefined;
    const frames = `${wire(event("error", { code: "FAILED", message: "safe" }))}${wire(event("done", { sessionId: "session-1" }, 3))}`;
    const client = createAgentCoreProjectedSseClient({
      baseUrl: "https://example.test/",
      apiKey: "key-1",
      fetch: async (url, request) => {
        requestedUrl = url;
        init = request;
        return response(frames);
      },
    });
    const delivered: string[] = [];
    for await (const frame of client.streamPrompt(
      "agent/a",
      { query: " raw ", sessionId: "session-1", requestId: "req-1" },
      { lastEventId: "opaque" }
    )) {
      delivered.push(frame.event);
    }
    expect(delivered).toEqual(["error", "done"]);
    expect(String(requestedUrl)).toBe(
      "https://example.test/api/v1/agents/by-ref/agent%2Fa/prompt/stream"
    );
    expect(init?.headers).toEqual({
      "X-API-Key": "key-1",
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "Last-Event-ID": "opaque",
    });
    const failure = createAgentCoreProjectedSseClient({
      baseUrl: "https://example.test",
      apiKey: "key",
      fetch: async () =>
        new Response(JSON.stringify({ error: { code: "NOPE", message: "no" } }), {
          status: 409,
          headers: { "content-type": "application/json" },
        }),
    });
    await expect(async () => {
      for await (const _frame of failure.streamPrompt("agent", {
        query: "q",
        sessionId: "session-1",
        requestId: "r",
      })) {
        throw new Error("unreachable");
      }
    }).toThrow(AgentCoreProjectedSseHttpError);
  });

  it("reports abort as typed and rejects an error stream without done", async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = createAgentCoreProjectedSseClient({
      baseUrl: "https://example.test",
      apiKey: "key",
      fetch: async () => {
        throw new Error("aborted");
      },
    });
    await expect(async () => {
      for await (const _frame of aborted.streamPrompt(
        "agent",
        { query: "q", sessionId: "session-1", requestId: "r" },
        { signal: controller.signal }
      )) {
        throw new Error("unreachable");
      }
    }).toThrow(AgentCoreProjectedSseAbortError);
    const missingDone = createAgentCoreProjectedSseClient({
      baseUrl: "https://example.test",
      apiKey: "key",
      fetch: async () => response(wire(event("error", { code: "FAILED", message: "safe" }))),
    });
    await expect(async () => {
      for await (const _frame of missingDone.streamPrompt("agent", {
        query: "q",
        sessionId: "session-1",
        requestId: "r",
      })) {
        // consume to completion
      }
    }).toThrow(AgentCoreProjectedSseProtocolError);
  });

  it("requires JSON non-2xx content type and preserves protocol error when cleanup rejects", async () => {
    const nonJson = createAgentCoreProjectedSseClient({
      baseUrl: "https://example.test",
      apiKey: "key",
      fetch: async () =>
        new Response("no", { status: 503, headers: { "content-type": "text/plain" } }),
    });
    await expect(async () => {
      for await (const _frame of nonJson.streamPrompt("agent", {
        query: "q",
        sessionId: "session-1",
        requestId: "r",
      })) {
        throw new Error("unreachable");
      }
    }).toThrow(AgentCoreProjectedSseProtocolError);
  });
});
