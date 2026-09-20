import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import { assertCanonicalPromptResponseCorrelation } from "./agent-os-v1-reference.js";
import {
  parseAgentOsV1CanonicalPromptInput,
  parseAgentOsV1CanonicalPromptCursor,
  parseAgentOsV1CanonicalPromptResponse,
  type AgentOsV1CanonicalPromptInput,
  type AgentOsV1CanonicalPromptCursor,
  type AgentOsV1CanonicalPromptResponse,
} from "./agent-os-v1-contract.js";

/** Business requests on an owner-controlled private channel; parsing grants no authority. */
export const AGENT_OS_WORKER_PROMPT_V1 = "agent-os-worker-prompt/v1" as const;
export const AGENT_OS_WORKER_PROMPT_MAX_BYTES = 1_048_576;

type PromptCommand =
  | {
      readonly operation: "prompt.start";
      readonly commandId: string;
      readonly runId: string;
      readonly turnId: string;
      readonly attemptId: string;
      readonly prompt: Readonly<AgentOsV1CanonicalPromptInput>;
    }
  | {
      readonly operation: "prompt.read";
      readonly runId: string;
      readonly cursor: Readonly<AgentOsV1CanonicalPromptCursor> | null;
      readonly limit: number;
    }
  | {
      readonly operation: "prompt.cancel";
      readonly commandId: string;
      readonly runId: string;
      readonly attemptId: string;
      readonly reason: string;
    };

export type AgentOsWorkerPromptRequestV1 = Readonly<{
  schemaVersion: typeof AGENT_OS_WORKER_PROMPT_V1;
  requestId: string;
}> &
  PromptCommand;

export type AgentOsWorkerPromptRejectionV1 =
  | "UNAVAILABLE"
  | "NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "ATTEMPT_MISMATCH"
  | "WRITER_FENCED"
  | "BUSY";
export type AgentOsWorkerPromptResponseV1 = Readonly<{
  schemaVersion: typeof AGENT_OS_WORKER_PROMPT_V1;
  requestId: string;
  requestDigest: string;
  operation: PromptCommand["operation"];
}> &
  (
    | {
        readonly status: "accepted";
        readonly response: Readonly<AgentOsV1CanonicalPromptResponse>;
      }
    | {
        readonly status: "rejected";
        readonly code: AgentOsWorkerPromptRejectionV1;
      }
  );

export class AgentOsWorkerPromptContractError extends Error {
  constructor() {
    super("INVALID_WORKER_PROMPT_CONTRACT");
    this.name = "AgentOsWorkerPromptContractError";
  }
}

export function parseAgentOsWorkerPromptRequestV1(
  input: unknown,
): AgentOsWorkerPromptRequestV1 {
  bounded(input);
  const value = object(input);
  const common = {
    schemaVersion: version(value.schemaVersion),
    requestId: id(value.requestId),
  };
  const runId = id(value.runId);
  switch (value.operation) {
    case "prompt.start":
      exact(value, [
        "schemaVersion",
        "requestId",
        "operation",
        "commandId",
        "runId",
        "turnId",
        "attemptId",
        "prompt",
      ]);
      return deepFreeze({
        ...common,
        operation: value.operation,
        commandId: id(value.commandId),
        runId,
        turnId: id(value.turnId),
        attemptId: id(value.attemptId),
        prompt: parseAgentOsV1CanonicalPromptInput(value.prompt),
      });
    case "prompt.read": {
      exact(value, [
        "schemaVersion",
        "requestId",
        "operation",
        "runId",
        "cursor",
        "limit",
      ]);
      const cursor =
        value.cursor === null
          ? null
          : parseAgentOsV1CanonicalPromptCursor(value.cursor);
      if (cursor !== null && cursor.runId !== runId) invalid();
      if (
        typeof value.limit !== "number" ||
        !Number.isSafeInteger(value.limit) ||
        value.limit < 1 ||
        value.limit > 256
      )
        invalid();
      return deepFreeze({
        ...common,
        operation: value.operation,
        runId,
        cursor,
        limit: value.limit,
      });
    }
    case "prompt.cancel":
      exact(value, [
        "schemaVersion",
        "requestId",
        "operation",
        "commandId",
        "runId",
        "attemptId",
        "reason",
      ]);
      if (
        typeof value.reason !== "string" ||
        value.reason.trim().length === 0 ||
        new TextEncoder().encode(value.reason).length > 1024
      )
        invalid();
      return deepFreeze({
        ...common,
        operation: value.operation,
        commandId: id(value.commandId),
        runId,
        attemptId: id(value.attemptId),
        reason: value.reason,
      });
    default:
      return invalid();
  }
}

export function parseAgentOsWorkerPromptResponseV1(
  input: unknown,
): AgentOsWorkerPromptResponseV1 {
  bounded(input);
  const value = object(input);
  if (
    value.operation !== "prompt.start" &&
    value.operation !== "prompt.read" &&
    value.operation !== "prompt.cancel"
  )
    invalid();
  if (
    typeof value.requestDigest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/u.test(value.requestDigest)
  )
    invalid();
  const common = {
    schemaVersion: version(value.schemaVersion),
    requestId: id(value.requestId),
    requestDigest: value.requestDigest,
    operation: value.operation,
  };
  if (value.status === "accepted") {
    exact(value, [
      "schemaVersion",
      "requestId",
      "requestDigest",
      "operation",
      "status",
      "response",
    ]);
    const response = parseAgentOsV1CanonicalPromptResponse(value.response);
    if (response.operation !== value.operation) invalid();
    return deepFreeze({
      ...common,
      operation: response.operation,
      status: "accepted",
      response,
    });
  }
  exact(value, [
    "schemaVersion",
    "requestId",
    "requestDigest",
    "operation",
    "status",
    "code",
  ]);
  if (value.status !== "rejected") invalid();
  const code = value.code;
  if (
    code !== "UNAVAILABLE" &&
    code !== "NOT_FOUND" &&
    code !== "IDEMPOTENCY_CONFLICT" &&
    code !== "ATTEMPT_MISMATCH" &&
    code !== "WRITER_FENCED" &&
    code !== "BUSY"
  )
    invalid();
  return deepFreeze({
    ...common,
    operation: value.operation,
    status: "rejected",
    code,
  });
}

export function encodeAgentOsWorkerPromptRequestV1(input: unknown): string {
  return JSON.stringify(parseAgentOsWorkerPromptRequestV1(input));
}
export function encodeAgentOsWorkerPromptResponseV1(input: unknown): string {
  return JSON.stringify(parseAgentOsWorkerPromptResponseV1(input));
}
export function createAgentOsWorkerPromptRequestDigestV1(
  input: unknown,
): string {
  return `sha256:${sha256Hex(encodeAgentOsWorkerPromptRequestV1(input))}`;
}
/** Command identity excludes transport requestId; persist before requesting Control writes. */
export function createAgentOsWorkerPromptCommandDigestV1(
  input: unknown,
): string {
  const request = parseAgentOsWorkerPromptRequestV1(input);
  if (request.operation === "prompt.read") invalid();
  const { requestId: _requestId, ...command } = request;
  return `sha256:${sha256Hex(JSON.stringify(command))}`;
}
export function assertAgentOsWorkerPromptResponseBindingV1(
  requestInput: unknown,
  responseInput: unknown,
): void {
  const request = parseAgentOsWorkerPromptRequestV1(requestInput);
  const result = parseAgentOsWorkerPromptResponseV1(responseInput);
  if (
    result.requestId !== request.requestId ||
    result.operation !== request.operation ||
    result.requestDigest !== createAgentOsWorkerPromptRequestDigestV1(request)
  )
    invalid();
  if (result.status === "accepted") {
    assertCanonicalPromptResponseCorrelation(request, result.response);
    if (result.response.snapshot.runId !== request.runId) invalid();
    if (
      request.operation !== "prompt.read" &&
      result.response.snapshot.attemptId !== request.attemptId
    )
      invalid();
    if (
      request.operation === "prompt.read" &&
      result.response.disposition === "events" &&
      result.response.events.length > request.limit
    )
      invalid();
  }
}

export function decodeAgentOsWorkerPromptRequestV1(
  source: string | Uint8Array,
): AgentOsWorkerPromptRequestV1 {
  return parseAgentOsWorkerPromptRequestV1(decode(source));
}
export function decodeAgentOsWorkerPromptResponseV1(
  source: string | Uint8Array,
): AgentOsWorkerPromptResponseV1 {
  return parseAgentOsWorkerPromptResponseV1(decode(source));
}
function decode(source: string | Uint8Array): unknown {
  if (typeof source !== "string" && !(source instanceof Uint8Array)) invalid();
  if (
    (typeof source === "string"
      ? new TextEncoder().encode(source).length
      : source.byteLength) > AGENT_OS_WORKER_PROMPT_MAX_BYTES
  )
    invalid();
  try {
    return JSON.parse(
      typeof source === "string"
        ? source
        : new TextDecoder("utf-8", { fatal: true }).decode(source),
    );
  } catch {
    return invalid();
  }
}
function version(input: unknown): typeof AGENT_OS_WORKER_PROMPT_V1 {
  if (input !== AGENT_OS_WORKER_PROMPT_V1) invalid();
  return input;
}
function object(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    invalid();
  return input as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).sort().join("|") !== [...keys].sort().join("|"))
    invalid();
}
function id(input: unknown): string {
  if (typeof input !== "string" || !/^[a-z][a-z0-9._/-]{0,127}$/u.test(input))
    invalid();
  return input;
}
function bounded(input: unknown): void {
  let json: string | undefined;
  try {
    json = JSON.stringify(input);
  } catch {
    return invalid();
  }
  if (
    json === undefined ||
    new TextEncoder().encode(json).length > AGENT_OS_WORKER_PROMPT_MAX_BYTES
  )
    invalid();
}
function invalid(): never {
  throw new AgentOsWorkerPromptContractError();
}
