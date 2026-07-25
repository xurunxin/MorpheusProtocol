import { AgentCoreProjectedSseProtocolError } from "./agent-core-projected-sse-v2-errors.js";

export const maxFrameDataBytes = 1_048_576;
export const maxJsonDepth = 32;
export const maxJsonNodes = 20_000;
export const maxArrayItems = 10_000;
export const maxObjectProperties = 1_024;
export const maxStringUtf8Bytes = 1_048_576;
export const maxErrorBodyBytes = 65_536;

export const agentCoreProjectedSseV2Limits = Object.freeze({
  maxFrameDataBytes,
  maxJsonDepth,
  maxJsonNodes,
  maxArrayItems,
  maxObjectProperties,
  maxStringUtf8Bytes,
  maxErrorBodyBytes,
});

export type PublicJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly PublicJsonValue[]
  | { readonly [key: string]: PublicJsonValue };

export interface AgentCoreProjectedPromptStreamRequest {
  readonly query: string;
  readonly sessionId: string;
  readonly requestId: string;
}

export interface AgentCoreProjectedSseMeta {
  readonly schemaVersion: "agent-core.prompt-stream.v2";
  readonly eventId: string;
  readonly streamId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly createdAt: string;
}

export type PublicContent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "thinking"; readonly thinking: string }
  | {
      readonly type: "toolCall";
      readonly id: string;
      readonly name: string;
      readonly arguments: Readonly<Record<string, PublicJsonValue>>;
    };

export interface AssistantPartial {
  readonly role: "assistant";
  readonly content: readonly PublicContent[];
}

export type AgentCoreProjectedSseEvent =
  | Frame<"session", { readonly sessionId: string }>
  | Frame<"text_start", { readonly contentIndex: number; readonly partial: AssistantPartial }>
  | Frame<
      "text_delta",
      { readonly contentIndex: number; readonly delta: string; readonly partial: AssistantPartial }
    >
  | Frame<
      "text_end",
      {
        readonly contentIndex: number;
        readonly content: string;
        readonly partial: AssistantPartial;
      }
    >
  | Frame<"thinking_start", { readonly contentIndex: number; readonly partial: AssistantPartial }>
  | Frame<
      "thinking_delta",
      { readonly contentIndex: number; readonly delta: string; readonly partial: AssistantPartial }
    >
  | Frame<
      "thinking_end",
      {
        readonly contentIndex: number;
        readonly content: string;
        readonly partial: AssistantPartial;
      }
    >
  | Frame<
      "tool_start",
      {
        readonly toolCallId: string;
        readonly toolName: string;
        readonly arguments: Readonly<Record<string, PublicJsonValue>>;
        readonly workDescription?: string;
      }
    >
  | Frame<
      "tool_update",
      {
        readonly toolCallId: string;
        readonly toolName: string;
        readonly arguments: Readonly<Record<string, PublicJsonValue>>;
        readonly partialResult: PublicJsonValue;
      }
    >
  | Frame<
      "tool_end",
      {
        readonly toolCallId: string;
        readonly toolName: string;
        readonly result: PublicJsonValue;
        readonly isError: boolean;
      }
    >
  | Frame<
      "toolcall_start",
      {
        readonly contentIndex: number;
        readonly toolCall: Extract<PublicContent, { type: "toolCall" }> | null;
        readonly partial: AssistantPartial;
        readonly workDescription?: string;
      }
    >
  | Frame<
      "toolcall_delta",
      { readonly contentIndex: number; readonly delta: string; readonly partial: AssistantPartial }
    >
  | Frame<
      "toolcall_end",
      {
        readonly contentIndex: number;
        readonly toolCall: Extract<PublicContent, { type: "toolCall" }>;
        readonly partial: AssistantPartial;
      }
    >
  | Frame<
      "agent_end",
      {
        readonly messages: readonly {
          readonly role: "user" | "assistant" | "toolResult";
          readonly content: string;
          readonly timestamp: number;
        }[];
      }
    >
  | Frame<"error", { readonly code: string; readonly message: string }>
  | Frame<"done", { readonly sessionId: string }>;

export type AgentCoreProjectedSseEventName = AgentCoreProjectedSseEvent["event"];

export type AgentCoreProjectedSseWireFrame = {
  readonly event: string;
  readonly data: unknown;
  readonly cursor: string;
};

type Frame<K extends string, T> = {
  readonly event: K;
  readonly data: AgentCoreProjectedSseMeta & { readonly payload: T };
  readonly cursor: string;
};

export function parseAgentCoreProjectedPromptStreamRequest(
  input: unknown
): AgentCoreProjectedPromptStreamRequest {
  const value = object(input, "request");
  exactKeys(value, ["query", "sessionId", "requestId"], "request");
  const query = string(value.query, "query");
  const sessionId = string(value.sessionId, "sessionId");
  const requestId = string(value.requestId, "requestId");
  if (query.trim().length === 0) fail("INVALID_REQUEST", "query must not be blank");
  if (scalarLength(requestId) < 1 || scalarLength(requestId) > 256) {
    fail("INVALID_REQUEST", "requestId must contain 1..256 Unicode scalar values");
  }
  assertStringBudget(query, "query");
  assertStringBudget(sessionId, "sessionId");
  assertStringBudget(requestId, "requestId");
  return Object.freeze({ query, sessionId, requestId });
}

export function parseAgentCoreProjectedSseEvent(input: unknown): AgentCoreProjectedSseEvent {
  const copiedWire = copyPublicJson(input, 0, { nodes: 0 });
  probeClone(input, "SSE frame");
  const wire = object(copiedWire, "SSE frame");
  exactKeys(wire, ["event", "data", "cursor"], "SSE frame");
  const event = string(wire.event, "SSE event");
  const cursor = string(wire.cursor, "SSE cursor");
  const budget = { nodes: 0 };
  const copiedData = copyPublicJson(wire.data, 0, budget);
  const data = object(copiedData, "SSE data");
  exactKeys(
    data,
    ["schemaVersion", "eventId", "streamId", "sessionId", "sequence", "createdAt", "payload"],
    "SSE data"
  );
  if (data.schemaVersion !== "agent-core.prompt-stream.v2") fail("INVALID_SCHEMA");
  const meta: AgentCoreProjectedSseMeta = Object.freeze({
    schemaVersion: "agent-core.prompt-stream.v2",
    eventId: string(data.eventId, "eventId"),
    streamId: string(data.streamId, "streamId"),
    sessionId: string(data.sessionId, "sessionId"),
    sequence: sequence(data.sequence),
    createdAt: timestamp(data.createdAt),
  });
  const payload = object(data.payload, "SSE payload");
  const parsed = parsePayload(event, payload);
  if (event === "session" || event === "done") {
    const sessionPayload = parsed as { sessionId: string };
    if (sessionPayload.sessionId !== meta.sessionId) {
      fail("SESSION_MISMATCH", `${event} payload sessionId does not match SSE data`);
    }
  }
  return Object.freeze({
    event: event as AgentCoreProjectedSseEventName,
    data: Object.freeze({ ...meta, payload: parsed }),
    cursor,
  }) as AgentCoreProjectedSseEvent;
}

export function parsePublicJsonValue(input: unknown): PublicJsonValue {
  const state = { nodes: 0 };
  const copy = copyPublicJson(input, 0, state);
  probeClone(input, "JSON value");
  return deepFreeze(copy);
}

function parsePayload(event: string, payload: Record<string, unknown>): object {
  switch (event) {
    case "session":
    case "done":
      return strict(payload, ["sessionId"], { sessionId: string(payload.sessionId, "sessionId") });
    case "text_start":
    case "thinking_start":
      return strict(payload, ["contentIndex", "partial"], {
        contentIndex: index(payload.contentIndex),
        partial: partial(payload.partial),
      });
    case "text_delta":
    case "thinking_delta":
    case "toolcall_delta":
      return strict(payload, ["contentIndex", "delta", "partial"], {
        contentIndex: index(payload.contentIndex),
        delta: string(payload.delta, "delta"),
        partial: partial(payload.partial),
      });
    case "text_end":
    case "thinking_end":
      return strict(payload, ["contentIndex", "content", "partial"], {
        contentIndex: index(payload.contentIndex),
        content: string(payload.content, "content"),
        partial: partial(payload.partial),
      });
    case "tool_start":
      return toolBase(payload, ["toolCallId", "toolName", "arguments"], true);
    case "tool_update":
      return strict(payload, ["toolCallId", "toolName", "arguments", "partialResult"], {
        toolCallId: string(payload.toolCallId, "toolCallId"),
        toolName: string(payload.toolName, "toolName"),
        arguments: publicObject(payload.arguments, "arguments"),
        partialResult: publicValue(payload.partialResult),
      });
    case "tool_end":
      return strict(payload, ["toolCallId", "toolName", "result", "isError"], {
        toolCallId: string(payload.toolCallId, "toolCallId"),
        toolName: string(payload.toolName, "toolName"),
        result: publicValue(payload.result),
        isError: boolean(payload.isError, "isError"),
      });
    case "toolcall_start":
      exactKeysOptional(
        payload,
        ["contentIndex", "toolCall", "partial"],
        ["workDescription"],
        "toolcall_start payload"
      );
      return Object.freeze({
        contentIndex: index(payload.contentIndex),
        toolCall: payload.toolCall === null ? null : toolCall(payload.toolCall),
        partial: partial(payload.partial),
        ...(payload.workDescription === undefined
          ? {}
          : { workDescription: string(payload.workDescription, "workDescription") }),
      });
    case "toolcall_end":
      return strict(payload, ["contentIndex", "toolCall", "partial"], {
        contentIndex: index(payload.contentIndex),
        toolCall: toolCall(payload.toolCall),
        partial: partial(payload.partial),
      });
    case "agent_end": {
      exactKeys(payload, ["messages"], "agent_end payload");
      const messages = arrayValues(payload.messages, "messages");
      return Object.freeze({
        messages: Object.freeze(
          messages.map((message) => {
            const item = object(message, "agent_end message");
            exactKeys(item, ["role", "content", "timestamp"], "agent_end message");
            if (item.role !== "user" && item.role !== "assistant" && item.role !== "toolResult") {
              fail("INVALID_PAYLOAD", "agent_end message role is invalid");
            }
            return Object.freeze({
              role: item.role,
              content: string(item.content, "content"),
              timestamp: finite(item.timestamp, "timestamp"),
            });
          })
        ),
      });
    }
    case "error":
      return strict(payload, ["code", "message"], {
        code: string(payload.code, "error code"),
        message: string(payload.message, "error message"),
      });
    default:
      fail("UNKNOWN_EVENT", `Unknown projected SSE event: ${event}`);
  }
}

function toolBase(
  payload: Record<string, unknown>,
  keys: string[],
  optionalWorkDescription: boolean
): object {
  exactKeysOptional(
    payload,
    keys,
    optionalWorkDescription ? ["workDescription"] : [],
    "tool payload"
  );
  return Object.freeze({
    toolCallId: string(payload.toolCallId, "toolCallId"),
    toolName: string(payload.toolName, "toolName"),
    arguments: publicObject(payload.arguments, "arguments"),
    ...(payload.workDescription === undefined
      ? {}
      : { workDescription: string(payload.workDescription, "workDescription") }),
  });
}

function partial(input: unknown): AssistantPartial {
  const value = object(input, "partial");
  exactKeys(value, ["role", "content"], "partial");
  if (value.role !== "assistant") fail("INVALID_PAYLOAD");
  const items = arrayValues(value.content, "partial content");
  return Object.freeze({ role: "assistant", content: Object.freeze(items.map(content)) });
}

function content(input: unknown): PublicContent {
  const value = object(input, "content item");
  const type = string(value.type, "content type");
  if (type === "text")
    return strict(value, ["type", "text"], {
      type,
      text: string(value.text, "text"),
    }) as PublicContent;
  if (type === "thinking")
    return strict(value, ["type", "thinking"], {
      type,
      thinking: string(value.thinking, "thinking"),
    }) as PublicContent;
  if (type === "toolCall") return toolCall(value);
  fail("INVALID_PAYLOAD", `Unknown content type: ${type}`);
}

function toolCall(input: unknown): Extract<PublicContent, { type: "toolCall" }> {
  const value = object(input, "toolCall");
  return strict(value, ["type", "id", "name", "arguments"], {
    type: expect(value.type, "toolCall", "toolCall type"),
    id: string(value.id, "toolCall id"),
    name: string(value.name, "toolCall name"),
    arguments: publicObject(value.arguments, "toolCall arguments"),
  }) as Extract<PublicContent, { type: "toolCall" }>;
}

function publicObject(input: unknown, label: string): Readonly<Record<string, PublicJsonValue>> {
  if (input === null || Array.isArray(input) || typeof input !== "object")
    fail("INVALID_PAYLOAD", `${label} must be an object`);
  return input as Readonly<Record<string, PublicJsonValue>>;
}

function publicValue(input: unknown): PublicJsonValue {
  return input as PublicJsonValue;
}

function copyPublicJson(value: unknown, depth: number, state: { nodes: number }): PublicJsonValue {
  if (depth > agentCoreProjectedSseV2Limits.maxJsonDepth)
    fail("JSON_BUDGET", "JSON nesting is too deep");
  state.nodes += 1;
  if (state.nodes > agentCoreProjectedSseV2Limits.maxJsonNodes)
    fail("JSON_BUDGET", "JSON has too many nodes");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return finite(value, "JSON number");
  if (typeof value === "string") {
    assertStringBudget(value, "JSON string");
    return value;
  }
  if (Array.isArray(value)) {
    const items = arrayValues(value, "JSON array");
    if (items.length > agentCoreProjectedSseV2Limits.maxArrayItems)
      fail("JSON_BUDGET", "JSON array is too large");
    const copy: PublicJsonValue[] = [];
    for (const item of items) copy.push(copyPublicJson(item, depth + 1, state));
    return Object.freeze(copy);
  }
  const entries = objectEntries(value, "JSON object");
  if (entries.length > agentCoreProjectedSseV2Limits.maxObjectProperties)
    fail("JSON_BUDGET", "JSON object is too large");
  const copy: Record<string, PublicJsonValue> = {};
  for (const [key, item] of entries) {
    assertStringBudget(key, "JSON key");
    copy[key] = copyPublicJson(item, depth + 1, state);
  }
  return Object.freeze(copy);
}

function object(input: unknown, label: string): Record<string, unknown> {
  if (ArrayBuffer.isView(input)) {
    const length = "length" in input && typeof input.length === "number" ? input.length : 0;
    if (length > agentCoreProjectedSseV2Limits.maxArrayItems) {
      fail("JSON_BUDGET", `${label} exceeds the collection budget`);
    }
    fail("INVALID_SHAPE", `${label} must not be a typed array`);
  }
  if (input === null || typeof input !== "object" || Array.isArray(input))
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null)
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(input).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !("value" in descriptor) || descriptor.get || descriptor.set) {
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data property`);
    }
  }
  return input as Record<string, unknown>;
}

function arrayValues(input: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(input)) fail("INVALID_SHAPE", `${label} must be an array`);
  if (Object.getPrototypeOf(input) !== Array.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  if (Object.getOwnPropertySymbols(input).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (key === "length") continue;
    if (
      !/^(?:0|[1-9][0-9]*)$/u.test(key) ||
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get ||
      descriptor.set
    ) {
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data item`);
    }
  }
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input)) fail("INVALID_SHAPE", `${label} must not contain holes`);
  }
  const values: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor))
      fail("INVALID_SHAPE", `${label} must not contain holes`);
    values.push(descriptor.value);
  }
  return values;
}

function objectEntries(input: unknown, label: string): readonly (readonly [string, unknown])[] {
  const value = object(input, label);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries: Array<readonly [string, unknown]> = [];
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!("value" in descriptor)) fail("INVALID_SHAPE", `${label}.${key} must be a data property`);
    entries.push([key, descriptor.value]);
  }
  return entries;
}

function probeClone(input: unknown, label: string): void {
  if (input === null || typeof input !== "object") return;
  try {
    structuredClone(input);
  } catch (error) {
    throw new AgentCoreProjectedSseProtocolError(
      "INVALID_SHAPE",
      `${label} cannot be safely cloned`,
      { cause: error }
    );
  }
}

function timestamp(value: unknown): string {
  const input = string(value, "createdAt");
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/u.exec(input);
  if (!match) fail("INVALID_VALUE", "createdAt must be RFC3339 with timezone");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const timezone = match[8];
  if (timezone === undefined) fail("INVALID_VALUE", "createdAt timezone is required");
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 60
  ) {
    fail("INVALID_VALUE", "createdAt is not a real RFC3339 timestamp");
  }
  if (second === 60) {
    const utc = utcDateForOffset(year, month, day, hour, minute, timezone);
    const utcDate = `${utc.year.toString().padStart(4, "0")}-${utc.month.toString().padStart(2, "0")}-${utc.day.toString().padStart(2, "0")}`;
    if (!publishedLeapSecondDates.has(utcDate) || utc.hour !== 23 || utc.minute !== 59)
      fail("INVALID_VALUE", "createdAt leap second is invalid");
  }
  if (timezone !== "Z") {
    const offsetHour = Number(timezone.slice(1, 3));
    const offsetMinute = Number(timezone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) fail("INVALID_VALUE", "createdAt offset is invalid");
  }
  return input;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

const publishedLeapSecondDates = new Set([
  "1972-06-30",
  "1972-12-31",
  "1973-12-31",
  "1974-12-31",
  "1975-12-31",
  "1976-12-31",
  "1977-12-31",
  "1978-12-31",
  "1979-12-31",
  "1981-06-30",
  "1982-06-30",
  "1983-06-30",
  "1985-06-30",
  "1987-12-31",
  "1989-12-31",
  "1990-12-31",
  "1992-06-30",
  "1993-06-30",
  "1994-06-30",
  "1995-12-31",
  "1997-06-30",
  "1998-12-31",
  "2005-12-31",
  "2008-12-31",
  "2012-06-30",
  "2015-06-30",
  "2016-12-31",
]);

function utcDateForOffset(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  if (timezone === "Z") return { year, month, day, hour, minute };
  const offset =
    (Number(timezone.slice(1, 3)) * 60 + Number(timezone.slice(4, 6))) *
    (timezone[0] === "+" ? 1 : -1);
  let total = hour * 60 + minute - offset;
  while (total < 0) {
    total += 1_440;
    ({ year, month, day } = previousDay(year, month, day));
  }
  while (total >= 1_440) {
    total -= 1_440;
    ({ year, month, day } = nextDay(year, month, day));
  }
  return { year, month, day, hour: Math.floor(total / 60), minute: total % 60 };
}

function previousDay(
  year: number,
  month: number,
  day: number
): { year: number; month: number; day: number } {
  if (day > 1) return { year, month, day: day - 1 };
  if (month > 1) return { year, month: month - 1, day: daysInMonth(year, month - 1) };
  return { year: year - 1, month: 12, day: 31 };
}

function nextDay(
  year: number,
  month: number,
  day: number
): { year: number; month: number; day: number } {
  if (day < daysInMonth(year, month)) return { year, month, day: day + 1 };
  if (month < 12) return { year, month: month + 1, day: 1 };
  return { year: year + 1, month: 1, day: 1 };
}

function strict(value: Record<string, unknown>, keys: string[], result: object): object {
  exactKeys(value, keys, "payload");
  return Object.freeze(result);
}

function exactKeys(value: Record<string, unknown>, expected: string[], label: string): void {
  exactKeysOptional(value, expected, [], label);
}

function exactKeysOptional(
  value: Record<string, unknown>,
  required: string[],
  optional: string[],
  label: string
): void {
  const keys = Object.keys(value);
  if (
    keys.length < required.length ||
    keys.some((key) => !required.includes(key) && !optional.includes(key)) ||
    required.some((key) => !(key in value))
  ) {
    fail("UNKNOWN_FIELD", `${label} contains unknown or missing fields`);
  }
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0)
    fail("INVALID_VALUE", `${label} must be a non-empty string`);
  assertStringBudget(value, label);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail("INVALID_VALUE", `${label} must be a boolean`);
  return value;
}

function finite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    fail("INVALID_NUMBER", `${label} must be finite`);
  return value;
}

function sequence(value: unknown): number {
  const result = finite(value, "sequence");
  if (!Number.isSafeInteger(result) || result < 0)
    fail("INVALID_VALUE", "sequence must be a non-negative safe integer");
  return result;
}

function index(value: unknown): number {
  const result = sequence(value);
  return result;
}

function expect(value: unknown, expected: string, label: string): string {
  if (value !== expected) fail("INVALID_VALUE", `${label} must equal ${expected}`);
  return expected;
}

function scalarLength(value: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff)
        fail("INVALID_REQUEST", "requestId contains an unpaired surrogate");
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      fail("INVALID_REQUEST", "requestId contains an unpaired surrogate");
    }
    count += 1;
  }
  return count;
}

function assertStringBudget(value: string, label: string): void {
  if (
    new TextEncoder().encode(value).byteLength > agentCoreProjectedSseV2Limits.maxStringUtf8Bytes
  ) {
    fail("JSON_BUDGET", `${label} exceeds the UTF-8 byte budget`);
  }
}

function deepFreeze<T>(value: T): T {
  return value;
}

function fail(code: string, message = code): never {
  throw new AgentCoreProjectedSseProtocolError(code, message);
}
