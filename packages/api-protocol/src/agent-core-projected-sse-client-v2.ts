import {
  agentCoreProjectedSseV2Limits,
  parseAgentCoreProjectedPromptStreamRequest,
  parseAgentCoreProjectedSseEvent,
  parsePublicJsonValue,
  type AgentCoreProjectedPromptStreamRequest,
  type AgentCoreProjectedSseEvent,
} from "./agent-core-projected-sse-v2.js";
import {
  AgentCoreProjectedSseAbortError,
  AgentCoreProjectedSseHttpError,
  AgentCoreProjectedSseProtocolError,
  AgentCoreProjectedSseTransportError,
} from "./agent-core-projected-sse-v2-errors.js";
import { createAgentCoreProjectedSseFrameParser } from "./agent-core-projected-sse-parser-v2.js";

export interface AgentCoreProjectedSseClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly fetch?: typeof fetch;
}

export interface AgentCoreProjectedSseStreamOptions {
  readonly lastEventId?: string;
  readonly signal?: AbortSignal;
}

export interface AgentCoreProjectedSseClient {
  streamPrompt(
    agentRef: string,
    request: AgentCoreProjectedPromptStreamRequest,
    options?: AgentCoreProjectedSseStreamOptions
  ): AsyncIterable<AgentCoreProjectedSseEvent>;
}

export function createAgentCoreProjectedSseClient(
  options: AgentCoreProjectedSseClientOptions
): AgentCoreProjectedSseClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  if (options.apiKey.length === 0) {
    throw new AgentCoreProjectedSseProtocolError(
      "INVALID_CLIENT_OPTIONS",
      "apiKey must not be empty"
    );
  }
  const fetchImpl = options.fetch ?? fetch;
  return Object.freeze({
    streamPrompt(
      agentRef: string,
      request: AgentCoreProjectedPromptStreamRequest,
      streamOptions: AgentCoreProjectedSseStreamOptions = {}
    ) {
      return stream(baseUrl, options.apiKey, fetchImpl, agentRef, request, streamOptions);
    },
  });
}

async function* stream(
  baseUrl: string,
  apiKey: string,
  fetchImpl: typeof fetch,
  agentRef: string,
  requestInput: AgentCoreProjectedPromptStreamRequest,
  options: AgentCoreProjectedSseStreamOptions
): AsyncGenerator<AgentCoreProjectedSseEvent> {
  const request = parseAgentCoreProjectedPromptStreamRequest(requestInput);
  if (agentRef.length === 0) {
    throw new AgentCoreProjectedSseProtocolError("INVALID_REQUEST", "agentRef must not be empty");
  }
  if (
    options.lastEventId !== undefined &&
    (options.lastEventId.length === 0 || /[\r\n]/u.test(options.lastEventId))
  ) {
    throw new AgentCoreProjectedSseProtocolError("INVALID_CURSOR", "lastEventId is invalid");
  }
  let lastConfirmedCursor: string | undefined;
  let reader: { cancel(): Promise<void>; releaseLock?(): void } | undefined;
  try {
    const response = await fetchImpl(
      `${baseUrl}/api/v1/agents/by-ref/${encodeURIComponent(agentRef)}/prompt/stream`,
      {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(options.lastEventId === undefined ? {} : { "Last-Event-ID": options.lastEventId }),
        },
        body: JSON.stringify(request),
        signal: options.signal,
      }
    );
    if (!response.ok) throw await parseHttpError(response);
    if (!isEventStream(response.headers.get("content-type"))) {
      await cancelBody(response.body);
      throw new AgentCoreProjectedSseProtocolError(
        "INVALID_CONTENT_TYPE",
        "Projected SSE response must have text/event-stream content type"
      );
    }
    if (!response.body) {
      throw new AgentCoreProjectedSseProtocolError(
        "MISSING_BODY",
        "Projected SSE response has no body"
      );
    }
    const responseReader = response.body.getReader();
    reader = responseReader;
    const parser = createAgentCoreProjectedSseFrameParser();
    let expectedDone = false;
    let streamId: string | undefined;
    for (;;) {
      const chunk = await responseReader.read();
      const frames = chunk.done ? parser.finish() : parser.push(chunk.value);
      for (let index = 0; index < frames.length; index += 1) {
        const frame = frames[index];
        if (!frame) continue;
        let data: unknown;
        try {
          data = JSON.parse(frame.data);
        } catch (error) {
          throw new AgentCoreProjectedSseProtocolError("MALFORMED_JSON", "SSE data must be JSON", {
            cause: error,
          });
        }
        const event = parseAgentCoreProjectedSseEvent({
          event: frame.event,
          data,
          cursor: frame.cursor,
        });
        if (event.data.sessionId !== request.sessionId) {
          throw new AgentCoreProjectedSseProtocolError(
            "SESSION_MISMATCH",
            "SSE frame session does not match request"
          );
        }
        if (streamId === undefined) streamId = event.data.streamId;
        if (event.data.streamId !== streamId) {
          throw new AgentCoreProjectedSseProtocolError(
            "STREAM_MISMATCH",
            "SSE stream id changed mid-stream"
          );
        }
        if (expectedDone && event.event !== "done") {
          throw new AgentCoreProjectedSseProtocolError(
            "DONE_REQUIRED",
            "Only done may follow error"
          );
        }
        if (event.event === "error") expectedDone = true;
        if (event.event === "done") {
          if (index + 1 < frames.length) {
            throw new AgentCoreProjectedSseProtocolError(
              "DUPLICATE_DONE",
              "No frame may follow done"
            );
          }
          if (event.data.payload.sessionId !== request.sessionId) {
            throw new AgentCoreProjectedSseProtocolError(
              "SESSION_MISMATCH",
              "done session does not match request"
            );
          }
          lastConfirmedCursor = event.cursor;
          yield event;
          return;
        }
        lastConfirmedCursor = event.cursor;
        yield event;
      }
      if (chunk.done) {
        throw new AgentCoreProjectedSseProtocolError(
          "DONE_MISSING",
          "SSE stream ended before done"
        );
      }
    }
  } catch (error) {
    if (
      error instanceof AgentCoreProjectedSseProtocolError ||
      error instanceof AgentCoreProjectedSseHttpError ||
      error instanceof AgentCoreProjectedSseTransportError ||
      error instanceof AgentCoreProjectedSseAbortError
    ) {
      throw error;
    }
    if (options.signal?.aborted) {
      throw new AgentCoreProjectedSseAbortError(lastConfirmedCursor, error);
    }
    throw new AgentCoreProjectedSseTransportError(lastConfirmedCursor, error);
  } finally {
    if (reader) {
      try {
        await reader.cancel();
      } catch (cancelError) {
        // Cleanup is best-effort and must never replace protocol, abort, or consumer-break semantics.
        void cancelError;
      } finally {
        reader.releaseLock?.();
      }
    }
  }
}

async function parseHttpError(response: Response): Promise<AgentCoreProjectedSseHttpError> {
  if (!isJson(response.headers.get("content-type"))) {
    await cancelBody(response.body);
    throw new AgentCoreProjectedSseProtocolError(
      "INVALID_ERROR_CONTENT_TYPE",
      "Non-2xx response must have application/json content type"
    );
  }
  const body = await readBodyLimit(response, agentCoreProjectedSseV2Limits.maxErrorBodyBytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new AgentCoreProjectedSseProtocolError(
      "MALFORMED_ERROR_BODY",
      "Non-2xx response body is not JSON",
      {
        cause: error,
      }
    );
  }
  const envelope = strictObject(parsed, "error response", ["error"]);
  const error = strictObject(envelope.error, "error", ["code", "message"], ["details"]);
  if (
    typeof error.code !== "string" ||
    error.code.length === 0 ||
    typeof error.message !== "string" ||
    error.message.length === 0
  ) {
    throw new AgentCoreProjectedSseProtocolError(
      "MALFORMED_ERROR_BODY",
      "Non-2xx error is malformed"
    );
  }
  const details = error.details === undefined ? undefined : parsePublicJsonValue(error.details);
  return new AgentCoreProjectedSseHttpError(response.status, error.code, error.message, details);
}

async function readBodyLimit(response: Response, limit: number): Promise<string> {
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let failed = false;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) {
        failed = true;
        throw new AgentCoreProjectedSseProtocolError(
          "ERROR_BODY_TOO_LARGE",
          "Non-2xx error body exceeds byte limit"
        );
      }
      chunks.push(chunk.value);
    }
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(output);
    } catch (error) {
      failed = true;
      throw new AgentCoreProjectedSseProtocolError(
        "MALFORMED_ERROR_BODY",
        "Non-2xx error body is not UTF-8",
        { cause: error }
      );
    }
  } finally {
    if (failed) {
      try {
        await reader.cancel();
      } catch (cancelError) {
        // The size violation remains authoritative if stream cancellation also fails.
        void cancelError;
      }
    }
    reader.releaseLock();
  }
}

function strictObject(
  input: unknown,
  label: string,
  required: string[],
  optional: string[] = []
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new AgentCoreProjectedSseProtocolError(
      "MALFORMED_ERROR_BODY",
      `${label} must be an object`
    );
  }
  const object = input as Record<string, unknown>;
  const keys = Object.keys(object);
  if (
    keys.some((key) => !required.includes(key) && !optional.includes(key)) ||
    required.some((key) => !(key in object))
  ) {
    throw new AgentCoreProjectedSseProtocolError(
      "MALFORMED_ERROR_BODY",
      `${label} has invalid fields`
    );
  }
  return object;
}

function isEventStream(contentType: string | null): boolean {
  return contentType !== null && /^text\/event-stream(?:\s*;|$)/iu.test(contentType);
}

function isJson(contentType: string | null): boolean {
  return contentType !== null && /^application\/json(?:\s*;|$)/iu.test(contentType);
}

async function cancelBody(body: ReadableStream<Uint8Array> | null): Promise<void> {
  if (body === null) return;
  try {
    await body.cancel();
  } catch (cancelError) {
    // A content-type violation remains authoritative when transport cleanup fails.
    void cancelError;
  }
}

function normalizeBaseUrl(value: string): string {
  if (value.length === 0) {
    throw new AgentCoreProjectedSseProtocolError(
      "INVALID_CLIENT_OPTIONS",
      "baseUrl must not be empty"
    );
  }
  return value.replace(/\/+$/u, "");
}
