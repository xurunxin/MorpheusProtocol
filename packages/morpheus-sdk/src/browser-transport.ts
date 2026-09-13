import type { InteractiveV3AppTransport } from "./interactive-v3.js";

/**
 * `@xurunxin/morpheus-sdk/browser` · browser-safe 入口。
 *
 * fetch 与 WebSocket 全部由调用方注入；endpoint 是调用方显式提供的字面量，
 * 本包不构造 URL、cookie 或凭据。除结构类型外不 import 任何模块，
 * bundle 后不含 Node builtins 与 Host 实现。
 */
export interface BrowserResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
}

export interface BrowserFetchLike {
  (
    input: string,
    init: {
      readonly method: "POST";
      readonly headers: Readonly<Record<string, string>>;
      readonly body: string;
      readonly signal?: AbortSignal;
    },
  ): Promise<BrowserResponseLike>;
}

export type BrowserWebSocketEventName = "open" | "message" | "error" | "close";

export interface BrowserWebSocketLike {
  readonly send: (data: string) => unknown;
  readonly close: (code?: number, reason?: string) => unknown;
  readonly addEventListener: (
    type: BrowserWebSocketEventName,
    listener: (event: { readonly data?: unknown }) => void,
  ) => void;
  readonly removeEventListener?: (
    type: BrowserWebSocketEventName,
    listener: (event: { readonly data?: unknown }) => void,
  ) => void;
}

export interface CreateBrowserInteractiveTransportOptions {
  /** 控制面请求端点（调用方显式提供）。 */
  readonly requestEndpoint: string;
  /** 订阅连接工厂（WSS 等）；连接建立方式完全由调用方注入。 */
  readonly webSocketFactory: () =>
    | BrowserWebSocketLike
    | PromiseLike<BrowserWebSocketLike>;
  /** 注入的 fetch 实现；不提供全局默认。 */
  readonly fetch: BrowserFetchLike;
}

/**
 * 把注入的 fetch + WebSocket 适配为 v3 App transport（同样满足 v2 transport
 * 形状）。请求走 POST JSON；订阅在 WebSocket 上先发送订阅请求帧，随后把
 * 收到的每个文本帧原样产出。关闭订阅、abort、socket EOF 都只拆除连接，
 * 绝不合成 `turn.cancel`。
 */
export function createBrowserInteractiveTransport(
  options: Readonly<CreateBrowserInteractiveTransportOptions>,
): Readonly<InteractiveV3AppTransport> {
  if (typeof options.fetch !== "function")
    throw new TypeError(
      "CreateBrowserInteractiveTransportOptions.fetch must be a function",
    );
  if (typeof options.webSocketFactory !== "function")
    throw new TypeError(
      "CreateBrowserInteractiveTransportOptions.webSocketFactory must be a function",
    );
  if (typeof options.requestEndpoint !== "string")
    throw new TypeError(
      "CreateBrowserInteractiveTransportOptions.requestEndpoint must be a string",
    );

  const request = async (
    request: Readonly<unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    const response = await options.fetch(options.requestEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    const text = await response.text();
    if (!response.ok)
      throw new Error(
        `interactive browser transport request failed with status ${response.status}`,
      );
    return JSON.parse(text);
  };

  return Object.freeze({
    request,
    subscribe: (
      request: Readonly<unknown>,
      signal?: AbortSignal,
    ): AsyncIterable<unknown> => subscribeStream(options, request, signal),
  });
}

async function* subscribeStream(
  options: Readonly<CreateBrowserInteractiveTransportOptions>,
  request: Readonly<unknown>,
  signal: AbortSignal | undefined,
): AsyncGenerator<unknown> {
  const socket = await options.webSocketFactory();
  try {
    if (signal?.aborted) return;
    await waitForOpen(socket, signal);
    socket.send(JSON.stringify(request));
    for await (const frame of socketFrames(socket, signal))
      yield JSON.parse(frame);
  } finally {
    socket.close(1000, "client closed subscription");
  }
}

async function waitForOpen(
  socket: BrowserWebSocketLike,
  signal: AbortSignal | undefined,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const settle = (error: Error | null): void => {
      remove("open", onOpen);
      remove("error", onError);
      remove("close", onError);
      signal?.removeEventListener("abort", onAbort);
      if (error === null) resolve();
      else reject(error);
    };
    const onOpen = (): void => settle(null);
    const onError = (): void =>
      settle(new Error("browser websocket failed before open"));
    const onAbort = (): void =>
      settle(new Error("interactive subscription aborted before open"));
    const remove = (
      type: BrowserWebSocketEventName,
      listener: (event: { readonly data?: unknown }) => void,
    ): void => socket.removeEventListener?.(type, listener);
    socket.addEventListener("open", onOpen);
    socket.addEventListener("error", onError);
    socket.addEventListener("close", onError);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function* socketFrames(
  socket: BrowserWebSocketLike,
  signal: AbortSignal | undefined,
): AsyncGenerator<string> {
  const queue: string[] = [];
  let done = false;
  let failure: Error | undefined;
  let wake: (() => void) | undefined;
  const notify = (): void => wake?.();
  const onMessage = (event: { readonly data?: unknown }): void => {
    if (typeof event.data === "string") queue.push(event.data);
    notify();
  };
  const onClose = (): void => {
    done = true;
    notify();
  };
  const onError = (): void => {
    done = true;
    failure = new Error("browser websocket failed during subscription");
    notify();
  };
  const onAbort = (): void => {
    done = true;
    notify();
  };
  socket.addEventListener("message", onMessage);
  socket.addEventListener("close", onClose);
  socket.addEventListener("error", onError);
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    while (true) {
      if (signal?.aborted) return;
      const next = queue.shift();
      if (next !== undefined) {
        yield next;
        continue;
      }
      if (done) {
        if (failure !== undefined) throw failure;
        return;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
      wake = undefined;
    }
  } finally {
    socket.removeEventListener?.("message", onMessage);
    socket.removeEventListener?.("close", onClose);
    socket.removeEventListener?.("error", onError);
    signal?.removeEventListener("abort", onAbort);
  }
}
