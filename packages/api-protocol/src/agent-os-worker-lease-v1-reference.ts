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
}

export interface AgentOsWorkerLeaseV1ReferenceClient {
  readonly dispatch: (request: unknown) => Promise<Readonly<AgentOsWorkerLeaseV1Envelope>>;
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
  return Object.freeze({
    async dispatch(request: unknown) {
      const parsedRequest = parseAgentOsWorkerLeaseV1Envelope(request);
      let rawResponse: unknown;
      try {
        rawResponse = await transport.dispatch(parsedRequest);
      } catch (error) {
        throw new AgentOsWorkerLeaseV1ReferenceError(
          "TRANSPORT_FAILURE",
          "injected dispatch failed",
          { cause: error }
        );
      }
      return assertCorrelatedResponse(parsedRequest, rawResponse);
    },
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

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
