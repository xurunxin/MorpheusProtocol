import { deepFreeze, sha256Hex } from "./contract-primitives.js";

/** v4 输入控制 profile；其他操作和 transcript 继续使用已协商的 v3/v2。 */
export const AGENT_OS_INTERACTIVE_V4_SCHEMA_VERSION =
  "agent-os-interactive.v4" as const;
export const AGENT_OS_INTERACTIVE_V4_REASONS = [
  "waiting-safe-boundary",
  "waiting-budget",
  "waiting-maintenance",
  "target-sealed",
  "stale-target",
  "stale-revision",
  "queue-full",
  "already-bound",
  "capability-unavailable",
  "cancel-pending-settlement",
  "recovery-required",
  "idempotency-conflict",
  "completed",
] as const;
export type InteractiveV4Reason =
  (typeof AGENT_OS_INTERACTIVE_V4_REASONS)[number];
export type InteractiveV4Digest = `sha256:${string}`;
export interface InteractiveV4Owner {
  readonly sessionId: string;
  readonly runId: string;
  readonly turnId: string;
  readonly bindingRevision: number;
  readonly fence: number;
}
export interface InteractiveV4Command {
  readonly commandId: string;
  readonly principal: string;
  readonly payloadDigest: InteractiveV4Digest;
}
interface Base {
  readonly schemaVersion: typeof AGENT_OS_INTERACTIVE_V4_SCHEMA_VERSION;
  readonly requestId: string;
}
export type AgentOsInteractiveV4Request =
  | (Base & { readonly operation: "capability.read" })
  | (Base & {
      readonly operation: "prompt.queue.owner.read";
      readonly sessionId: string;
    })
  | (Base & {
      readonly operation: "prompt.queue.read";
      readonly owner: InteractiveV4Owner;
    })
  | (Base & {
      readonly operation: "prompt.steer" | "prompt.follow-up";
      readonly owner: InteractiveV4Owner;
      readonly command: InteractiveV4Command;
      readonly inputId: string;
      readonly instruction: string;
    })
  | (Base & {
      readonly operation: "prompt.queue.clear";
      readonly owner: InteractiveV4Owner;
      readonly command: InteractiveV4Command;
      readonly expectedRevision: number;
    })
  | (Base & {
      readonly operation: "turn.cancel";
      readonly owner: InteractiveV4Owner;
      readonly command: InteractiveV4Command;
      readonly reason: string;
    });

export interface InteractiveV4InputReceipt {
  readonly inputId: string;
  readonly requestId: string;
  readonly commandId: string;
  readonly payloadDigest: InteractiveV4Digest;
  readonly owner: InteractiveV4Owner;
  /** Host ingress 赋值；request 无此字段。 */
  readonly source: "user" | "system";
  readonly kind: "steer" | "follow-up";
  readonly acceptedSequence: number;
  readonly queueRevision: number;
  readonly status:
    | "queued"
    | "bound"
    | "unknown"
    | "settled"
    | "rejected"
    | "cancelled";
  readonly binding: null | Readonly<{
    requestSnapshotId: string;
    requestDigest: InteractiveV4Digest;
    effectId: string;
  }>;
  readonly reason: InteractiveV4Reason | null;
}
export interface InteractiveV4QueueSnapshot {
  readonly owner: InteractiveV4Owner;
  readonly queueRevision: number;
  readonly inputs: readonly InteractiveV4InputReceipt[];
}
export interface InteractiveV4Capability {
  readonly operation:
    | "prompt.steer"
    | "prompt.follow-up"
    | "prompt.queue.read"
    | "prompt.queue.clear"
    | "turn.cancel";
  readonly hostImplemented: boolean;
  readonly runtimeImplemented: boolean;
  readonly configured: boolean;
  readonly authorized: boolean;
  readonly ready: boolean;
}
export type AgentOsInteractiveV4Response =
  | (Base & {
      readonly operation: "prompt.queue.owner.read";
      readonly sessionId: string;
      readonly owner: InteractiveV4Owner | null;
      readonly sealed: boolean;
    })
  | (Base & {
      readonly operation: "capability.read";
      readonly capabilities: readonly InteractiveV4Capability[];
    })
  | (Base & {
      readonly operation: "prompt.queue.read";
      readonly snapshot: InteractiveV4QueueSnapshot;
    })
  | (Base & {
      readonly operation:
        | "prompt.steer"
        | "prompt.follow-up"
        | "prompt.queue.clear"
        | "turn.cancel";
      readonly owner: InteractiveV4Owner;
      readonly status: "accepted" | "rejected";
      readonly reason: InteractiveV4Reason | null;
      readonly command: InteractiveV4Command;
      readonly replayed: boolean;
      readonly input: InteractiveV4InputReceipt | null;
    });

function fail(): never {
  throw new TypeError("INVALID_INTERACTIVE_V4");
}
const encoder = new TextEncoder();
/** 不运行 getter/toJSON；先有界复制，后验证，调用方不能修改已解析证据。 */
function safe(input: unknown): unknown {
  let nodes = 0;
  let bytes = 0;
  const ancestors = new Set<object>();
  const visit = (value: unknown, depth: number): unknown => {
    if (++nodes > 20_000 || depth > 20) fail();
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value < 0) fail();
      return value;
    }
    if (typeof value === "string") {
      bytes += encoder.encode(value).length;
      if (bytes > 1_048_576) fail();
      return value;
    }
    if (typeof value !== "object" || ancestors.has(value)) fail();
    const array = Array.isArray(value);
    if (
      !array &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      fail();
    const keys = Reflect.ownKeys(value);
    if (keys.length > 1025) fail();
    ancestors.add(value);
    const result: Record<string, unknown> = Object.create(null) as Record<
      string,
      unknown
    >;
    for (const key of keys) {
      if (array && key === "length") continue;
      if (typeof key !== "string") fail();
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
        fail();
      bytes += encoder.encode(key).length;
      if (bytes > 1_048_576) fail();
      result[key] = visit(descriptor.value, depth + 1);
    }
    ancestors.delete(value);
    if (array) {
      if (Object.keys(result).length !== value.length) fail();
      return Array.from({ length: value.length }, (_, index) => {
        if (!Object.hasOwn(result, String(index))) fail();
        return result[String(index)];
      });
    }
    return result;
  };
  return visit(input, 0);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  return value as Record<string, unknown>;
}
function keys(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  if (
    JSON.stringify(Object.keys(value).sort()) !==
    JSON.stringify([...expected].sort())
  )
    fail();
}
function id(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u.test(value)
  )
    fail();
  return value;
}
function integer(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    fail();
  return value;
}
function digest(value: unknown): InteractiveV4Digest {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value))
    fail();
  return value as InteractiveV4Digest;
}
function text(value: unknown, max: number): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    encoder.encode(value).length > max
  )
    fail();
  return value;
}
function bool(value: unknown): boolean {
  if (typeof value !== "boolean") fail();
  return value;
}
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) fail();
  return value as T;
}
function reason(value: unknown): InteractiveV4Reason | null {
  return value === null ? null : oneOf(value, AGENT_OS_INTERACTIVE_V4_REASONS);
}
function owner(value: unknown): InteractiveV4Owner {
  const v = record(value);
  keys(v, ["sessionId", "runId", "turnId", "bindingRevision", "fence"]);
  return {
    sessionId: id(v.sessionId),
    runId: id(v.runId),
    turnId: id(v.turnId),
    bindingRevision: integer(v.bindingRevision),
    fence: integer(v.fence),
  };
}
function command(value: unknown): InteractiveV4Command {
  const v = record(value);
  keys(v, ["commandId", "principal", "payloadDigest"]);
  return {
    commandId: id(v.commandId),
    principal: id(v.principal),
    payloadDigest: digest(v.payloadDigest),
  };
}
function base(v: Record<string, unknown>): Base {
  if (v.schemaVersion !== AGENT_OS_INTERACTIVE_V4_SCHEMA_VERSION) fail();
  return {
    schemaVersion: AGENT_OS_INTERACTIVE_V4_SCHEMA_VERSION,
    requestId: id(v.requestId),
  };
}
export function parseAgentOsInteractiveV4Request(
  input: unknown,
): AgentOsInteractiveV4Request {
  const v = record(safe(input));
  const b = base(v);
  const operation = oneOf(v.operation, [
    "capability.read",
    "prompt.queue.owner.read",
    "prompt.queue.read",
    "prompt.steer",
    "prompt.follow-up",
    "prompt.queue.clear",
    "turn.cancel",
  ]);
  const common = ["schemaVersion", "requestId", "operation"];
  if (operation === "capability.read") {
    keys(v, common);
    return deepFreeze({ ...b, operation });
  }
  if (operation === "prompt.queue.owner.read") {
    keys(v, [...common, "sessionId"]);
    return deepFreeze({ ...b, operation, sessionId: id(v.sessionId) });
  }
  if (operation === "prompt.queue.read") {
    keys(v, [...common, "owner"]);
    return deepFreeze({ ...b, operation, owner: owner(v.owner) });
  }
  const fields = [...common, "owner", "command"];
  const c = { ...b, owner: owner(v.owner), command: command(v.command) };
  if (operation === "prompt.steer" || operation === "prompt.follow-up") {
    keys(v, [...fields, "inputId", "instruction"]);
    return deepFreeze({
      ...c,
      operation,
      inputId: id(v.inputId),
      instruction: text(v.instruction, 65_536),
    });
  }
  if (operation === "prompt.queue.clear") {
    keys(v, [...fields, "expectedRevision"]);
    return deepFreeze({
      ...c,
      operation,
      expectedRevision: integer(v.expectedRevision),
    });
  }
  keys(v, [...fields, "reason"]);
  return deepFreeze({ ...c, operation, reason: text(v.reason, 512) });
}
function receipt(value: unknown): InteractiveV4InputReceipt {
  const v = record(value);
  keys(v, [
    "inputId",
    "requestId",
    "commandId",
    "payloadDigest",
    "owner",
    "source",
    "kind",
    "acceptedSequence",
    "queueRevision",
    "status",
    "binding",
    "reason",
  ]);
  const status = oneOf(v.status, [
    "queued",
    "bound",
    "unknown",
    "settled",
    "rejected",
    "cancelled",
  ]);
  const bound =
    status === "bound" || status === "unknown" || status === "settled";
  if (bound !== (v.binding !== null)) fail();
  let binding: InteractiveV4InputReceipt["binding"] = null;
  if (v.binding !== null) {
    const b = record(v.binding);
    keys(b, ["requestSnapshotId", "requestDigest", "effectId"]);
    binding = {
      requestSnapshotId: id(b.requestSnapshotId),
      requestDigest: digest(b.requestDigest),
      effectId: id(b.effectId),
    };
  }
  return {
    inputId: id(v.inputId),
    requestId: id(v.requestId),
    commandId: id(v.commandId),
    payloadDigest: digest(v.payloadDigest),
    owner: owner(v.owner),
    source: oneOf(v.source, ["user", "system"]),
    kind: oneOf(v.kind, ["steer", "follow-up"]),
    acceptedSequence: integer(v.acceptedSequence),
    queueRevision: integer(v.queueRevision),
    status,
    binding,
    reason: reason(v.reason),
  };
}
export function parseInteractiveV4InputReceipt(
  input: unknown,
): InteractiveV4InputReceipt {
  return deepFreeze(receipt(safe(input)));
}
export function canonicalInteractiveV4(value: unknown): string {
  const encode = (v: unknown): string => {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(encode).join(",")}]`;
    return `{${Object.entries(v)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, x]) => `${JSON.stringify(k)}:${encode(x)}`)
      .join(",")}}`;
  };
  return encode(safe(value));
}
export function parseInteractiveV4QueueSnapshot(
  input: unknown,
): InteractiveV4QueueSnapshot {
  const v = record(safe(input));
  keys(v, ["owner", "queueRevision", "inputs"]);
  const o = owner(v.owner);
  const revision = integer(v.queueRevision);
  if (!Array.isArray(v.inputs) || v.inputs.length > 64) fail();
  const inputs = v.inputs.map(receipt);
  const ids = new Set<string>();
  const commands = new Set<string>();
  let previous = -1;
  for (const item of inputs) {
    if (
      canonicalInteractiveV4(item.owner) !== canonicalInteractiveV4(o) ||
      item.queueRevision > revision ||
      item.acceptedSequence <= previous ||
      ids.has(item.inputId) ||
      commands.has(item.commandId)
    )
      fail();
    previous = item.acceptedSequence;
    ids.add(item.inputId);
    commands.add(item.commandId);
  }
  return deepFreeze({ owner: o, queueRevision: revision, inputs });
}
export function parseAgentOsInteractiveV4Response(
  input: unknown,
): AgentOsInteractiveV4Response {
  const v = record(safe(input));
  const b = base(v);
  const common = ["schemaVersion", "requestId", "operation"];
  if (v.operation === "prompt.queue.owner.read") {
    keys(v, [...common, "sessionId", "owner", "sealed"]);
    const sessionId = id(v.sessionId);
    const currentOwner = v.owner === null ? null : owner(v.owner);
    const sealed = bool(v.sealed);
    if (
      (currentOwner !== null && currentOwner.sessionId !== sessionId) ||
      (currentOwner === null && sealed)
    )
      fail();
    return deepFreeze({
      ...b,
      operation: "prompt.queue.owner.read",
      sessionId,
      owner: currentOwner,
      sealed,
    });
  }
  if (v.operation === "capability.read") {
    keys(v, [...common, "capabilities"]);
    if (!Array.isArray(v.capabilities) || v.capabilities.length > 5) fail();
    const seen = new Set<string>();
    const capabilities = v.capabilities.map((raw): InteractiveV4Capability => {
      const c = record(raw);
      keys(c, [
        "operation",
        "hostImplemented",
        "runtimeImplemented",
        "configured",
        "authorized",
        "ready",
      ]);
      const operation = oneOf(c.operation, [
        "prompt.steer",
        "prompt.follow-up",
        "prompt.queue.read",
        "prompt.queue.clear",
        "turn.cancel",
      ]);
      if (seen.has(operation)) fail();
      seen.add(operation);
      const result = {
        operation,
        hostImplemented: bool(c.hostImplemented),
        runtimeImplemented: bool(c.runtimeImplemented),
        configured: bool(c.configured),
        authorized: bool(c.authorized),
        ready: bool(c.ready),
      };
      if (
        result.ready &&
        !(
          result.hostImplemented &&
          result.runtimeImplemented &&
          result.configured &&
          result.authorized
        )
      )
        fail();
      return result;
    });
    return deepFreeze({ ...b, operation: "capability.read", capabilities });
  }
  if (v.operation === "prompt.queue.read") {
    keys(v, [...common, "snapshot"]);
    return deepFreeze({
      ...b,
      operation: "prompt.queue.read",
      snapshot: parseInteractiveV4QueueSnapshot(v.snapshot),
    });
  }
  keys(v, [
    ...common,
    "owner",
    "status",
    "reason",
    "command",
    "replayed",
    "input",
  ]);
  const operation = oneOf(v.operation, [
    "prompt.steer",
    "prompt.follow-up",
    "prompt.queue.clear",
    "turn.cancel",
  ]);
  const status = oneOf(v.status, ["accepted", "rejected"]);
  const o = owner(v.owner);
  const c = command(v.command);
  const r = reason(v.reason);
  const i = v.input === null ? null : receipt(v.input);
  const isInput =
    operation === "prompt.steer" || operation === "prompt.follow-up";
  if ((isInput && status === "accepted") !== (i !== null)) fail();
  if (status === "rejected" && r === null) fail();
  if (
    i !== null &&
    (canonicalInteractiveV4(i.owner) !== canonicalInteractiveV4(o) ||
      i.commandId !== c.commandId ||
      i.payloadDigest !== c.payloadDigest ||
      i.requestId !== b.requestId ||
      i.kind !== (operation === "prompt.steer" ? "steer" : "follow-up"))
  )
    fail();
  return deepFreeze({
    ...b,
    operation,
    owner: o,
    status,
    reason: r,
    command: c,
    replayed: bool(v.replayed),
    input: i,
  });
}
export function createAgentOsInteractiveV4CommandFingerprint(
  input: unknown,
): InteractiveV4Digest {
  const request = parseAgentOsInteractiveV4Request(input);
  if (!("command" in request)) fail();
  return `sha256:${sha256Hex(canonicalInteractiveV4({ ...request, command: { commandId: request.command.commandId, principal: request.command.principal } }))}`;
}
export function serializeAgentOsInteractiveV4Request(input: unknown): string {
  return `${canonicalInteractiveV4(parseAgentOsInteractiveV4Request(input))}\n`;
}
export function serializeAgentOsInteractiveV4Response(input: unknown): string {
  return `${canonicalInteractiveV4(parseAgentOsInteractiveV4Response(input))}\n`;
}
export function decodeAgentOsInteractiveV4Request(
  source: string,
): AgentOsInteractiveV4Request {
  if (encoder.encode(source).length > 1_048_576) fail();
  return parseAgentOsInteractiveV4Request(JSON.parse(source) as unknown);
}
export function decodeAgentOsInteractiveV4Response(
  source: string,
): AgentOsInteractiveV4Response {
  if (encoder.encode(source).length > 1_048_576) fail();
  return parseAgentOsInteractiveV4Response(JSON.parse(source) as unknown);
}
