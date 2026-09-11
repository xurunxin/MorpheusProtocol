import { describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";

import {
  createBrowserInteractiveTransport,
  type BrowserWebSocketLike,
} from "../src/browser-transport.js";
import {
  createInteractiveJsonlStreamTransport,
  type InteractiveJsonlDuplex,
} from "../src/node-transport.js";

const SUBSCRIBE_REQUEST = {
  schemaVersion: "agent-os-interactive.v3",
  operation: "transcript.subscribe",
  requestId: "request.subscribe.wire",
  sessionId: "session.wire",
  cursor: null,
  limit: 16,
};

const READ_REQUEST = {
  schemaVersion: "agent-os-interactive.v3",
  operation: "capability.read",
  requestId: "request.capability.wire",
};

function line(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

/** 宏任务屏障：保证微任务与注入 duplex 的异步读取先行排空后再断言。 */
function flushMacrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** 模拟调用方注入的 Node duplex（真实场景为 net.connect 的 IPC socket）。 */
function createInjectedDuplex() {
  const clientToServer = new PassThrough();
  const serverToClient = new PassThrough();
  const received: string[] = [];
  let buffer = "";
  void (async () => {
    for await (const chunk of clientToServer) {
      buffer += String(chunk);
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const current = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (current.trim().length > 0) received.push(current);
        newline = buffer.indexOf("\n");
      }
    }
  })();
  const duplex: InteractiveJsonlDuplex = {
    readable: serverToClient,
    write: (chunk) => clientToServer.write(chunk),
    end: () => {
      serverToClient.end();
    },
  };
  return { duplex, received, serverToClient };
}

describe("createInteractiveJsonlStreamTransport", () => {
  test("correlates a JSONL response by requestId over an injected duplex", async () => {
    const { duplex } = createInjectedDuplex();
    const transport = createInteractiveJsonlStreamTransport({
      connect: () => duplex,
    });
    const responseFrame = {
      schemaVersion: "agent-os-interactive.v3",
      operation: "capability.read",
      requestId: "request.capability.wire",
      capabilities: [],
    };
    const pending = transport.request(READ_REQUEST);
    // 服务端先写一条无关帧再写响应；两行位于同一 chunk，按 requestId 关联。
    (duplex.readable as PassThrough).write(
      line({ requestId: "other.frame", note: "unrelated" }) +
        line(responseFrame),
    );
    const response = await pending;
    expect(response).toEqual(responseFrame);
  });

  test("streams subscription frames, aborts cleanly, and never writes turn.cancel", async () => {
    const { duplex, received } = createInjectedDuplex();
    const transport = createInteractiveJsonlStreamTransport({
      connect: () => duplex,
    });
    const controller = new AbortController();
    const iterator = transport
      .subscribe(SUBSCRIBE_REQUEST, controller.signal)
      [Symbol.asyncIterator]();
    const pending = iterator.next();
    (duplex.readable as PassThrough).write(line(SUBSCRIBE_REQUEST));
    const first = await pending;
    expect(first.value).toEqual(SUBSCRIBE_REQUEST);
    controller.abort();
    const drained = await iterator.next();
    expect(drained.done).toBe(true);
    await flushMacrotasks();
    expect(received).toHaveLength(1);
    expect(received[0]).not.toContain("turn.cancel");
  });

  test("closing the consumer tears down the connection without cancel", async () => {
    const { duplex, received } = createInjectedDuplex();
    const transport = createInteractiveJsonlStreamTransport({
      connect: () => duplex,
    });
    const iterator = transport
      .subscribe(SUBSCRIBE_REQUEST)
      [Symbol.asyncIterator]();
    const pending = iterator.next();
    (duplex.readable as PassThrough).write(line(SUBSCRIBE_REQUEST));
    const first = await pending;
    expect(first.value).toEqual(SUBSCRIBE_REQUEST);
    await iterator.return?.(undefined);
    await flushMacrotasks();
    expect(received).toHaveLength(1);
    expect(received[0]).not.toContain("turn.cancel");
  });

  test("rejects when the connection closes before the response", async () => {
    const { duplex } = createInjectedDuplex();
    const transport = createInteractiveJsonlStreamTransport({
      connect: () => duplex,
    });
    const pending = transport.request(READ_REQUEST);
    (duplex.readable as PassThrough).end();
    expect(pending).rejects.toThrow(
      "connection closed before the interactive response arrived",
    );
  });

  test("rejects a non-function connect option", () => {
    expect(() =>
      createInteractiveJsonlStreamTransport(
        {} as unknown as { connect: () => InteractiveJsonlDuplex },
      ),
    ).toThrow("connect must be a function");
  });
});

class FakeWebSocket implements BrowserWebSocketLike {
  readonly sent: string[] = [];
  closed: { code?: number; reason?: string } | null = null;
  private readonly listeners = new Map<
    string,
    ((event: { data?: unknown }) => void)[]
  >();

  emit(type: string, event: { data?: unknown } = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closed = { code, reason };
    this.emit("close");
  }

  addEventListener(
    type: "open" | "message" | "error" | "close",
    listener: (event: { data?: unknown }) => void,
  ): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(
    type: "open" | "message" | "error" | "close",
    listener: (event: { data?: unknown }) => void,
  ): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== listener),
    );
  }
}

describe("createBrowserInteractiveTransport", () => {
  test("posts the request JSON to the injected endpoint", async () => {
    const calls: { input: string; init: unknown }[] = [];
    const ack = {
      schemaVersion: "agent-os-interactive.v3",
      operation: "capability.read",
      requestId: "request.capability.wire",
      capabilities: [],
    };
    const transport = createBrowserInteractiveTransport({
      requestEndpoint: "https://bridge.example/interactive",
      webSocketFactory: () => new FakeWebSocket(),
      fetch: async (input, init) => {
        calls.push({ input, init });
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(ack),
        };
      },
    });
    const response = await transport.request(READ_REQUEST);
    expect(response).toEqual(ack);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("https://bridge.example/interactive");
    const init = calls[0]?.init as {
      method: string;
      headers: Record<string, string>;
      body: string;
    };
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(READ_REQUEST);
  });

  test("surfaces non-ok responses as transport errors", async () => {
    const transport = createBrowserInteractiveTransport({
      requestEndpoint: "https://bridge.example/interactive",
      webSocketFactory: () => new FakeWebSocket(),
      fetch: async () => ({
        ok: false,
        status: 503,
        text: async () => "unavailable",
      }),
    });
    expect(transport.request(READ_REQUEST)).rejects.toThrow("503");
  });

  test("streams websocket frames and closes on abort without cancel", async () => {
    const socket = new FakeWebSocket();
    const transport = createBrowserInteractiveTransport({
      requestEndpoint: "https://bridge.example/interactive",
      webSocketFactory: () => socket,
      fetch: async () => {
        throw new Error("unexpected fetch");
      },
    });
    const controller = new AbortController();
    const iterator = transport
      .subscribe(SUBSCRIBE_REQUEST, controller.signal)
      [Symbol.asyncIterator]();
    const pending = iterator.next();
    // 屏障 1：让 generator 完成 factory await 并挂上 open 监听（真实浏览器
    // 中 open 事件总是异步到达，此处用宏任务屏障复现同一时序）。
    await flushMacrotasks();
    socket.emit("open");
    // 屏障 2：waitForOpen 解决 → send → socketFrames 挂上 message 监听。
    await flushMacrotasks();
    // 服务端回包：首帧是 transcript response（此处用订阅帧代表 wire 透传）。
    socket.emit("message", { data: JSON.stringify(SUBSCRIBE_REQUEST) });
    const first = await pending;
    expect(first.value).toEqual(SUBSCRIBE_REQUEST);
    expect(socket.sent).toEqual([JSON.stringify(SUBSCRIBE_REQUEST)]);
    const secondPending = iterator.next();
    socket.emit("message", {
      data: JSON.stringify({
        schemaVersion: "agent-os-interactive.v2",
        eventType: "assistant.text.delta",
      }),
    });
    const second = await secondPending;
    expect((second.value as { eventType?: string }).eventType).toBe(
      "assistant.text.delta",
    );
    controller.abort();
    const drained = await iterator.next();
    expect(drained.done).toBe(true);
    expect(socket.closed?.code).toBe(1000);
    expect(socket.sent).toHaveLength(1);
  });

  test("rejects missing injected dependencies", () => {
    expect(() =>
      createBrowserInteractiveTransport({
        requestEndpoint: "https://bridge.example/interactive",
        webSocketFactory: () => new FakeWebSocket(),
        fetch: undefined as unknown as Parameters<
          typeof createBrowserInteractiveTransport
        >[0]["fetch"],
      }),
    ).toThrow("fetch must be a function");
  });
});
