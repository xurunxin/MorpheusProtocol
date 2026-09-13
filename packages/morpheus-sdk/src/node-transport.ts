import type { InteractiveV3AppTransport } from "./interactive-v3.js";

/**
 * `@xurunxin/morpheus-sdk/node` · Node IPC / named-pipe 专属入口。
 *
 * 本入口不 import 任何 `node:*` 模块：连接由调用方注入（`net.connect`、
 * `fs.createReadStream/WriteStream`、worker fd 等任意 duplex 都满足结构
 * 类型），因此真实 browser bundle 也可以携带本入口而不泄漏 Node builtins。
 * wire 为 JSONL：每个请求/响应/流帧是一行 canonical JSON。
 */
export interface InteractiveJsonlDuplex {
  /** 字节或字符串块序列；由调用方的 Node stream/socket 提供。 */
  readonly readable: AsyncIterable<Uint8Array | string>;
  /** 写出一块（不含自动换行）；返回值（如 backpressure 标记）由调用方语义决定。 */
  readonly write: (chunk: string) => unknown;
  /** 可选的优雅半关闭；EOF 只拆除连接，不合成任何协议命令。 */
  readonly end?: () => unknown;
}

export interface CreateInteractiveJsonlTransportOptions {
  /** 每个请求/订阅建立专属连接；连接建立方式完全由调用方注入。 */
  readonly connect: () =>
    | InteractiveJsonlDuplex
    | PromiseLike<InteractiveJsonlDuplex>;
}

/**
 * 把注入的 JSONL duplex 适配为 v3 App transport（同样满足 v2 transport 形状）。
 * - `request`：写入请求行，按 requestId 关联响应行后关闭连接。
 * - `subscribe`：写入订阅请求，随后把收到的每一帧原样产出；abort 或
 *   消费者关闭只做 `end()`，绝不写入 `turn.cancel`。
 */
export function createInteractiveJsonlStreamTransport(
  options: Readonly<CreateInteractiveJsonlTransportOptions>,
): Readonly<InteractiveV3AppTransport> {
  if (typeof options.connect !== "function")
    throw new TypeError(
      "CreateInteractiveJsonlTransportOptions.connect must be a function",
    );

  const request = async (
    request: Readonly<unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    const io = await options.connect();
    const end = connectionEnd(io);
    try {
      return await requestOnce(io, request, signal, end);
    } finally {
      end();
    }
  };

  return Object.freeze({
    request,
    subscribe: (
      request: Readonly<unknown>,
      signal?: AbortSignal,
    ): AsyncIterable<unknown> => subscribeStream(options, request, signal),
  });
}

async function requestOnce(
  io: InteractiveJsonlDuplex,
  request: Readonly<unknown>,
  signal: AbortSignal | undefined,
  end: () => void,
): Promise<unknown> {
  const expectedId = correlationId(request);
  const lines = readJsonLines(io);
  io.write(`${JSON.stringify(request)}\n`);
  if (signal?.aborted) throw new Error("interactive request aborted");
  const abort = (): void => {
    end();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    for await (const line of lines) {
      const frame = JSON.parse(line);
      if (correlationId(frame) === expectedId) return frame;
    }
  } finally {
    signal?.removeEventListener("abort", abort);
  }
  if (signal?.aborted) throw new Error("interactive request aborted");
  throw new Error("connection closed before the interactive response arrived");
}

async function* subscribeStream(
  options: Readonly<CreateInteractiveJsonlTransportOptions>,
  request: Readonly<unknown>,
  signal: AbortSignal | undefined,
): AsyncGenerator<unknown> {
  const io = await options.connect();
  const end = connectionEnd(io);
  const abort = (): void => {
    // abort 只做 EOF 拆除（同时解除阻塞中的读取），绝不写入 turn.cancel。
    end();
  };
  try {
    if (signal?.aborted) return;
    signal?.addEventListener("abort", abort, { once: true });
    io.write(`${JSON.stringify(request)}\n`);
    for await (const line of readJsonLines(io)) {
      if (signal?.aborted) return;
      yield JSON.parse(line);
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    end();
  }
}

async function* readJsonLines(
  io: InteractiveJsonlDuplex,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of io.readable) {
    buffer +=
      typeof chunk === "string"
        ? chunk
        : decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.trim().length > 0) yield line;
      newline = buffer.indexOf("\n");
    }
  }
  buffer += decoder.decode();
  if (buffer.trim().length > 0) yield buffer;
}

function correlationId(frame: unknown): unknown {
  if (frame === null || typeof frame !== "object" || Array.isArray(frame))
    return undefined;
  return (frame as Record<string, unknown>).requestId;
}

/** 幂等 teardown：abort 与 finally 共用同一 end，避免对已关闭连接二次 end。 */
function connectionEnd(io: InteractiveJsonlDuplex): () => void {
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    // EOF/半关闭只拆除 wire 连接；协议层取消必须是显式的 turn.cancel 请求。
    io.end?.();
  };
}
