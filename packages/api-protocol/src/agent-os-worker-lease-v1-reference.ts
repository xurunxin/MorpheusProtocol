import { deepFreeze } from "./contract-primitives.js";
import { parseAgentOsWorkerLeaseV1Envelope } from "./agent-os-worker-lease-v1-contract.js";
import type {
  AgentOsWorkerLeaseV1ConformanceResult,
  AgentOsWorkerLeaseV1ConformanceScenario,
  AgentOsWorkerLeaseV1ConformanceScenarioId,
  AgentOsWorkerLeaseV1Envelope,
} from "./agent-os-worker-lease-v1-types.js";

export class AgentOsWorkerLeaseV1ReferenceError extends Error {
  constructor(
    readonly code: "DRIFT_DETECTED" | "INVALID_RESULT" | "TRANSPORT_FAILURE",
    message: string,
    options?: ErrorOptions
  ) {
    super(`${code}: ${message}`, options);
    this.name = "AgentOsWorkerLeaseV1ReferenceError";
  }
}

export interface AgentOsWorkerLeaseV1Transport {
  readonly dispatch: (request: Readonly<AgentOsWorkerLeaseV1Envelope>) => Promise<unknown>;
  readonly readCheckpoint: (
    request: Readonly<AgentOsWorkerLeaseV1CheckpointRequest>
  ) => Promise<unknown>;
}

export interface AgentOsWorkerLeaseV1ReferenceClient {
  readonly dispatch: (request: unknown) => Promise<Readonly<AgentOsWorkerLeaseV1Envelope>>;
  readonly readCheckpoint: (
    request: AgentOsWorkerLeaseV1CheckpointRequestInput
  ) => Promise<Readonly<AgentOsWorkerLeaseV1Checkpoint>>;
}

export interface AgentOsWorkerLeaseV1CheckpointRequestInput {
  readonly controlId: string;
  readonly tenantId: string;
  readonly workloadId: string;
  readonly workerId: string;
  readonly sender: "worker";
}

export interface AgentOsWorkerLeaseV1CheckpointRequest extends AgentOsWorkerLeaseV1CheckpointRequestInput {
  readonly schemaVersion: "agent-os-worker-lease-checkpoint-request/v1";
}

export interface AgentOsWorkerLeaseV1CheckpointInput extends AgentOsWorkerLeaseV1CheckpointRequestInput {
  readonly sequence: number;
  readonly lastMessageId: string | null;
  readonly leaderTerm: number;
  readonly observedAt: string;
}

export interface AgentOsWorkerLeaseV1Checkpoint extends AgentOsWorkerLeaseV1CheckpointInput {
  readonly schemaVersion: "agent-os-worker-lease-checkpoint/v1";
}

export type AgentOsWorkerLeaseV1ReferenceHandler = (
  request: Readonly<AgentOsWorkerLeaseV1Envelope>
) => unknown | Promise<unknown>;

export function createAgentOsWorkerLeaseV1ReferenceClient(
  transport: AgentOsWorkerLeaseV1Transport
): AgentOsWorkerLeaseV1ReferenceClient {
  if (typeof transport.dispatch !== "function")
    throw new AgentOsWorkerLeaseV1ReferenceError(
      "TRANSPORT_FAILURE",
      "an injected dispatch function is required"
    );
  if (typeof transport.readCheckpoint !== "function")
    throw new AgentOsWorkerLeaseV1ReferenceError(
      "TRANSPORT_FAILURE",
      "an injected checkpoint reader is required"
    );
  return Object.freeze({
    async dispatch(request: unknown) {
      const parsedRequest = parseAgentOsWorkerLeaseV1Envelope(request);
      let rawResponse: unknown;
      try {
        rawResponse = await transport.dispatch(parsedRequest);
      } catch {
        throw new AgentOsWorkerLeaseV1ReferenceError(
          "TRANSPORT_FAILURE",
          "injected dispatch failed"
        );
      }
      return assertCorrelatedResponse(parsedRequest, rawResponse);
    },
    async readCheckpoint(requestInput: AgentOsWorkerLeaseV1CheckpointRequestInput) {
      const request = parseCheckpointRequest(requestInput);
      let rawResponse: unknown;
      try {
        rawResponse = await transport.readCheckpoint(request);
      } catch {
        throw new AgentOsWorkerLeaseV1ReferenceError(
          "TRANSPORT_FAILURE",
          "injected checkpoint read failed"
        );
      }
      const response = parseCheckpoint(rawResponse);
      if (
        response.controlId !== request.controlId ||
        response.tenantId !== request.tenantId ||
        response.workloadId !== request.workloadId ||
        response.workerId !== request.workerId ||
        response.sender !== request.sender
      )
        throw new AgentOsWorkerLeaseV1ReferenceError(
          "DRIFT_DETECTED",
          "checkpoint does not preserve the requested Worker authority pins"
        );
      return response;
    },
  });
}

export function createAgentOsWorkerLeaseV1Checkpoint(
  input: AgentOsWorkerLeaseV1CheckpointInput
): Readonly<AgentOsWorkerLeaseV1Checkpoint> {
  return parseCheckpoint({
    schemaVersion: "agent-os-worker-lease-checkpoint/v1",
    ...input,
  });
}

export async function dispatchAgentOsWorkerLeaseV1Reference(
  requestInput: unknown,
  handler: AgentOsWorkerLeaseV1ReferenceHandler
): Promise<Readonly<AgentOsWorkerLeaseV1Envelope>> {
  if (typeof handler !== "function")
    throw new AgentOsWorkerLeaseV1ReferenceError(
      "TRANSPORT_FAILURE",
      "an injected handler is required"
    );
  const request = parseAgentOsWorkerLeaseV1Envelope(requestInput);
  const response = await handler(request);
  return assertCorrelatedResponse(request, response);
}

export const AGENT_OS_WORKER_LEASE_V1_CONFORMANCE_SCENARIOS = deepFreeze([
  { id: "artifact-corruption", expected: "reject", rejectionCode: "artifact_corrupt" },
  { id: "cancel", expected: "accept", rejectionCode: null },
  { id: "claim-race", expected: "reject", rejectionCode: "fenced" },
  { id: "duplicate", expected: "accept", rejectionCode: null },
  { id: "leader-switch", expected: "reject", rejectionCode: "stale_leader" },
  { id: "lease-expiry", expected: "reject", rejectionCode: "expired" },
  { id: "old-generation-writer", expected: "reject", rejectionCode: "fenced" },
  { id: "out-of-order", expected: "reject", rejectionCode: "sequence_gap" },
  { id: "partition-reconnect", expected: "accept", rejectionCode: null },
  { id: "rolling-drain", expected: "accept", rejectionCode: null },
  { id: "tenant-isolation", expected: "reject", rejectionCode: "tenant_mismatch" },
] satisfies readonly AgentOsWorkerLeaseV1ConformanceScenario[]);

export interface AgentOsWorkerLeaseV1ConformanceExecutor {
  readonly execute: (
    scenario: Readonly<AgentOsWorkerLeaseV1ConformanceScenario>
  ) => AgentOsWorkerLeaseV1ConformanceResult | Promise<AgentOsWorkerLeaseV1ConformanceResult>;
}

export async function runAgentOsWorkerLeaseV1Conformance(
  executor: AgentOsWorkerLeaseV1ConformanceExecutor
): Promise<readonly Readonly<AgentOsWorkerLeaseV1ConformanceResult>[]> {
  if (typeof executor.execute !== "function")
    throw new AgentOsWorkerLeaseV1ReferenceError(
      "INVALID_RESULT",
      "a deterministic scenario executor is required"
    );
  const results: Readonly<AgentOsWorkerLeaseV1ConformanceResult>[] = [];
  for (const scenario of AGENT_OS_WORKER_LEASE_V1_CONFORMANCE_SCENARIOS) {
    const result = await executor.execute(scenario);
    assertScenarioResult(scenario, result);
    results.push(deepFreeze({ ...result }));
  }
  return deepFreeze(results);
}

function assertCorrelatedResponse(
  request: Readonly<AgentOsWorkerLeaseV1Envelope>,
  responseInput: unknown
): Readonly<AgentOsWorkerLeaseV1Envelope> {
  const response = parseAgentOsWorkerLeaseV1Envelope(responseInput);
  if (
    response.correlationId !== request.correlationId ||
    response.tenantId !== request.tenantId ||
    response.workloadId !== request.workloadId ||
    response.workerId !== request.workerId ||
    response.controlId !== request.controlId ||
    response.leaderTerm < request.leaderTerm ||
    response.sequence < request.sequence
  )
    throw new AgentOsWorkerLeaseV1ReferenceError(
      "DRIFT_DETECTED",
      "response does not preserve request correlation and authority pins"
    );
  return response;
}

function parseCheckpointRequest(input: unknown): Readonly<AgentOsWorkerLeaseV1CheckpointRequest> {
  const value = requireExactRecord(input, [
    "controlId",
    "tenantId",
    "workloadId",
    "workerId",
    "sender",
  ]);
  const request = {
    schemaVersion: "agent-os-worker-lease-checkpoint-request/v1" as const,
    controlId: requireNonEmptyString(value.controlId, "controlId"),
    tenantId: requireNonEmptyString(value.tenantId, "tenantId"),
    workloadId: requireNonEmptyString(value.workloadId, "workloadId"),
    workerId: requireNonEmptyString(value.workerId, "workerId"),
    sender: value.sender,
  };
  if (request.sender !== "worker") invalidCheckpoint("sender must be worker");
  return Object.freeze({ ...request, sender: "worker" });
}

function parseCheckpoint(input: unknown): Readonly<AgentOsWorkerLeaseV1Checkpoint> {
  const value = requireExactRecord(input, [
    "schemaVersion",
    "controlId",
    "tenantId",
    "workloadId",
    "workerId",
    "sender",
    "sequence",
    "lastMessageId",
    "leaderTerm",
    "observedAt",
  ]);
  if (value.schemaVersion !== "agent-os-worker-lease-checkpoint/v1")
    invalidCheckpoint("schemaVersion is invalid");
  if (value.sender !== "worker") invalidCheckpoint("sender must be worker");
  if (!Number.isSafeInteger(value.sequence) || (value.sequence as number) < 0)
    invalidCheckpoint("sequence must be a non-negative safe integer");
  if (!Number.isSafeInteger(value.leaderTerm) || (value.leaderTerm as number) <= 0)
    invalidCheckpoint("leaderTerm must be a positive safe integer");
  if (
    (value.sequence === 0 && value.lastMessageId !== null) ||
    (value.sequence !== 0 &&
      (typeof value.lastMessageId !== "string" || value.lastMessageId.length === 0))
  )
    invalidCheckpoint("lastMessageId must be null exactly at sequence zero");
  const observedAt = requireNonEmptyString(value.observedAt, "observedAt");
  if (new Date(observedAt).toISOString() !== observedAt)
    invalidCheckpoint("observedAt must be a canonical timestamp");
  return Object.freeze({
    schemaVersion: "agent-os-worker-lease-checkpoint/v1",
    controlId: requireNonEmptyString(value.controlId, "controlId"),
    tenantId: requireNonEmptyString(value.tenantId, "tenantId"),
    workloadId: requireNonEmptyString(value.workloadId, "workloadId"),
    workerId: requireNonEmptyString(value.workerId, "workerId"),
    sender: "worker",
    sequence: value.sequence as number,
    lastMessageId: value.lastMessageId as string | null,
    leaderTerm: value.leaderTerm as number,
    observedAt,
  });
}

function requireExactRecord(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    invalidCheckpoint("value must be an object");
  const value = input as Record<string, unknown>;
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  )
    invalidCheckpoint("value has missing or unknown fields");
  return value;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0)
    invalidCheckpoint(`${field} must be a non-empty string`);
  return value;
}

function invalidCheckpoint(message: string): never {
  throw new AgentOsWorkerLeaseV1ReferenceError("INVALID_RESULT", message);
}

function assertScenarioResult(
  scenario: Readonly<AgentOsWorkerLeaseV1ConformanceScenario>,
  result: AgentOsWorkerLeaseV1ConformanceResult
): void {
  if (!isScenarioId(result.id) || result.id !== scenario.id)
    throw new AgentOsWorkerLeaseV1ReferenceError(
      "INVALID_RESULT",
      `scenario ${scenario.id} returned a mismatched id`
    );
  if (
    result.actual !== scenario.expected ||
    result.rejectionCode !== scenario.rejectionCode ||
    !Number.isSafeInteger(result.forbiddenSideEffectCalls) ||
    result.forbiddenSideEffectCalls !== 0
  )
    throw new AgentOsWorkerLeaseV1ReferenceError(
      "INVALID_RESULT",
      `scenario ${scenario.id} did not satisfy its expected fail-closed disposition`
    );
}

function isScenarioId(value: unknown): value is AgentOsWorkerLeaseV1ConformanceScenarioId {
  return AGENT_OS_WORKER_LEASE_V1_CONFORMANCE_SCENARIOS.some((scenario) => scenario.id === value);
}
