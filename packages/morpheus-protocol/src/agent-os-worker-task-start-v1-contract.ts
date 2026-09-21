import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import {
  parseAgentOsV1CanonicalPromptInput,
  type AgentOsV1CanonicalPromptInput,
} from "./agent-os-v1-contract.js";
import {
  parseAgentOsTaskHandleV1,
  type AgentOsTaskHandleV1,
} from "./agent-os-task-handle-v1-contract.js";

export const AGENT_OS_WORKER_TASK_START_V1 =
  "agent-os-worker-task-start/v1" as const;
/** Business intent only. The owner selects the parent/child Runs, budget and immutable target. */
export interface AgentOsWorkerTaskStartRequestV1 {
  readonly schemaVersion: typeof AGENT_OS_WORKER_TASK_START_V1;
  readonly operation: "task.start";
  readonly requestId: string;
  readonly commandId: string;
  readonly prompt: Readonly<AgentOsV1CanonicalPromptInput>;
  readonly title: string;
  readonly acceptanceCriteria: readonly string[];
  readonly mode: "foreground" | "background";
}
export type AgentOsWorkerTaskStartResponseV1 = Readonly<{
  schemaVersion: typeof AGENT_OS_WORKER_TASK_START_V1;
  operation: "task.start";
  requestId: string;
  requestDigest: string;
}> &
  (
    | Readonly<{ status: "accepted"; handle: Readonly<AgentOsTaskHandleV1> }>
    | Readonly<{
        status: "rejected";
        code: "UNAVAILABLE" | "IDEMPOTENCY_CONFLICT" | "BUSY";
      }>
  );

export function parseAgentOsWorkerTaskStartRequestV1(
  input: unknown,
): Readonly<AgentOsWorkerTaskStartRequestV1> {
  const value = object(input, [
    "schemaVersion",
    "operation",
    "requestId",
    "commandId",
    "prompt",
    "title",
    "acceptanceCriteria",
    "mode",
  ]);
  if (
    value.schemaVersion !== AGENT_OS_WORKER_TASK_START_V1 ||
    value.operation !== "task.start" ||
    (value.mode !== "foreground" && value.mode !== "background") ||
    !Array.isArray(value.acceptanceCriteria) ||
    value.acceptanceCriteria.length < 1 ||
    value.acceptanceCriteria.length > 32
  )
    invalid();
  const acceptanceCriteria = value.acceptanceCriteria.map((value) =>
    text(value, 2048),
  );
  if (new Set(acceptanceCriteria).size !== acceptanceCriteria.length) invalid();
  return deepFreeze({
    schemaVersion: AGENT_OS_WORKER_TASK_START_V1,
    operation: "task.start",
    requestId: id(value.requestId),
    commandId: id(value.commandId),
    prompt: parseAgentOsV1CanonicalPromptInput(value.prompt),
    title: text(value.title, 512),
    acceptanceCriteria,
    mode: value.mode,
  });
}
export function parseAgentOsWorkerTaskStartResponseV1(
  input: unknown,
): Readonly<AgentOsWorkerTaskStartResponseV1> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    invalid();
  const accepted = "status" in input && input.status === "accepted";
  const value = object(input, [
    "schemaVersion",
    "operation",
    "requestId",
    "requestDigest",
    "status",
    accepted ? "handle" : "code",
  ]);
  if (
    value.schemaVersion !== AGENT_OS_WORKER_TASK_START_V1 ||
    value.operation !== "task.start"
  )
    invalid();
  const base = {
    schemaVersion: AGENT_OS_WORKER_TASK_START_V1,
    operation: "task.start" as const,
    requestId: id(value.requestId),
    requestDigest: digest(value.requestDigest),
  };
  if (accepted)
    return deepFreeze({
      ...base,
      status: "accepted",
      handle: parseAgentOsTaskHandleV1(value.handle),
    });
  if (
    value.status !== "rejected" ||
    (value.code !== "UNAVAILABLE" &&
      value.code !== "IDEMPOTENCY_CONFLICT" &&
      value.code !== "BUSY")
  )
    invalid();
  return deepFreeze({ ...base, status: "rejected", code: value.code });
}
export function encodeAgentOsWorkerTaskStartRequestV1(input: unknown): string {
  return JSON.stringify(parseAgentOsWorkerTaskStartRequestV1(input));
}
export function encodeAgentOsWorkerTaskStartResponseV1(input: unknown): string {
  return JSON.stringify(parseAgentOsWorkerTaskStartResponseV1(input));
}
export function decodeAgentOsWorkerTaskStartRequestV1(
  input: string | Uint8Array,
) {
  return parseAgentOsWorkerTaskStartRequestV1(decode(input));
}
export function decodeAgentOsWorkerTaskStartResponseV1(
  input: string | Uint8Array,
) {
  return parseAgentOsWorkerTaskStartResponseV1(decode(input));
}
export function createAgentOsWorkerTaskStartRequestDigestV1(
  input: unknown,
): string {
  return hash(encodeAgentOsWorkerTaskStartRequestV1(input));
}
export function createAgentOsWorkerTaskStartCommandDigestV1(
  input: unknown,
): string {
  const { requestId, ...command } = parseAgentOsWorkerTaskStartRequestV1(input);
  void requestId;
  return hash(JSON.stringify(command));
}
export function assertAgentOsWorkerTaskStartResponseBindingV1(
  input: unknown,
  output: unknown,
): void {
  const request = parseAgentOsWorkerTaskStartRequestV1(input);
  const response = parseAgentOsWorkerTaskStartResponseV1(output);
  if (
    response.requestId !== request.requestId ||
    response.requestDigest !==
      createAgentOsWorkerTaskStartRequestDigestV1(request)
  )
    invalid();
  if (
    response.status === "accepted" &&
    response.handle.identity.inputDigest !==
      createAgentOsWorkerTaskPromptDigestV1(request.prompt)
  )
    invalid();
}
export function createAgentOsWorkerTaskPromptDigestV1(input: unknown): string {
  return hash(
    canonical({
      schemaVersion: "agent-os-canonical-prompt-input/v1",
      prompt: parseAgentOsV1CanonicalPromptInput(input),
    }),
  );
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const result = JSON.stringify(value);
    if (result === undefined) invalid();
    return result;
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${JSON.stringify(key)}:${canonical(value)}`)
    .join(",")}}`;
}
function object(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !== [...keys].sort().join("|")
  )
    invalid();
  for (const key of keys) {
    const property = Object.getOwnPropertyDescriptor(input, key);
    if (!property || !("value" in property)) invalid();
  }
  const encoded = JSON.stringify(input);
  if (
    encoded === undefined ||
    new TextEncoder().encode(encoded).byteLength > 1_048_576
  )
    invalid();
  return input as Record<string, unknown>;
}
function text(input: unknown, maximum: number): string {
  if (
    typeof input !== "string" ||
    !input.length ||
    input.trim() !== input ||
    input.includes("\0") ||
    new TextEncoder().encode(input).length > maximum
  )
    invalid();
  return input;
}
function id(input: unknown): string {
  if (typeof input !== "string" || !/^[a-z][a-z0-9._-]{0,127}$/u.test(input))
    invalid();
  return input;
}
function digest(input: unknown): string {
  if (typeof input !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(input))
    invalid();
  return input;
}
function hash(input: string) {
  return `sha256:${sha256Hex(input)}`;
}
function decode(input: string | Uint8Array): unknown {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > 1_048_576) invalid();
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
function invalid(): never {
  throw new Error("INVALID_WORKER_TASK_START");
}
