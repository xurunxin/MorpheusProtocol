import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import { createAgentOsWorkerLeaseV1Envelope } from "../src/agent-os-worker-lease-v1-contract.js";
import {
  AGENT_OS_WORKER_LEASE_V1_CONFORMANCE_SCENARIOS,
  AgentOsWorkerLeaseV1ReferenceError,
  createAgentOsWorkerLeaseV1ReferenceClient,
  dispatchAgentOsWorkerLeaseV1Reference,
  runAgentOsWorkerLeaseV1Conformance,
} from "../src/agent-os-worker-lease-v1-reference.js";

const digest = (seed: string): string =>
  `sha256:${createHash("sha256").update(seed).digest("hex")}`;

function availability(sequence = 1, leaderTerm = 1, correlationId = "correlation.demo") {
  return createAgentOsWorkerLeaseV1Envelope({
    operation: "worker.availability",
    sender: "worker",
    messageId: `message.${sequence}`,
    correlationId,
    sequence,
    leaderTerm,
    controlId: "control",
    tenantId: "tenant.demo",
    workloadId: "workload.demo",
    workerId: "worker-1",
    requestedAt: "2026-08-07T00:00:00.000Z",
    deadline: "2026-08-07T00:01:00.000Z",
    payload: {
      identity: {
        issuer: "identity.demo",
        subject: "worker-1",
        audience: ["control"],
        keyId: "key.demo",
        rotationGeneration: "rotation:current",
        revocationGeneration: "revocation:current",
      },
      manifest: {
        packageId: "package.demo",
        packageDigest: digest("package"),
        capabilityDigest: digest("capability"),
      },
      capacity: { maxActiveRuns: 2, activeRuns: 0 },
      draining: false,
      observedAt: "2026-08-07T00:00:00.000Z",
    },
  });
}

function resourceHealth() {
  return createAgentOsWorkerLeaseV1Envelope({
    operation: "execution.resource-health",
    sender: "worker",
    messageId: "message.resource-health.1",
    correlationId: "correlation.resource-health",
    sequence: 1,
    leaderTerm: 1,
    controlId: "control",
    tenantId: "tenant.demo",
    workloadId: "workload.demo",
    workerId: "worker-1",
    requestedAt: "2026-08-07T00:00:00.000Z",
    deadline: "2026-08-07T00:01:00.000Z",
    payload: {
      commandId: "command.resource-health",
      claim: {
        grantId: "grant.demo",
        leaseId: "lease.demo",
        leaseEpoch: "lease-epoch:current",
        authorityDomain: "authority.demo",
        runId: "run.demo",
        attemptId: "attempt.demo",
        instanceId: "instance.demo",
        instanceGeneration: 1,
        storeId: "store.demo",
        storeGeneration: 1,
        writerIncarnationId: "writer.demo",
        claimId: "claim.demo",
        claimFence: 1,
        expiresAt: "2026-08-07T00:02:00.000Z",
      },
      revision: 1,
      acquiredResourceCount: 2,
      observedAt: "2026-08-07T00:00:30.000Z",
    },
  });
}

describe("agent-os-worker-lease/v1 reference layer", () => {
  test("dispatches only through an injected transport and preserves correlation", async () => {
    let calls = 0;
    const client = createAgentOsWorkerLeaseV1ReferenceClient({
      dispatch(request) {
        calls += 1;
        return Promise.resolve(request);
      },
    });
    const request = availability();
    const response = await client.dispatch(request);
    expect(calls).toBe(1);
    expect(response).toEqual(request);
  });

  test("dispatches resource health once without owning retry or changing correlation", async () => {
    let calls = 0;
    const client = createAgentOsWorkerLeaseV1ReferenceClient({
      dispatch(request) {
        calls += 1;
        return Promise.resolve(request);
      },
    });
    const request = resourceHealth();
    const response = await client.dispatch(request);
    expect(calls).toBe(1);
    expect(response.correlationId).toBe(request.correlationId);
    expect(response).toEqual(request);
  });

  test("strictly reparses an injected handler response", async () => {
    const request = availability();
    await expect(dispatchAgentOsWorkerLeaseV1Reference(request, () => request)).resolves.toEqual(
      request
    );
    await expect(
      dispatchAgentOsWorkerLeaseV1Reference(request, () => ({ ...request, token: "secret" }))
    ).rejects.toBeInstanceOf(Error);
  });

  test("rejects response authority and correlation drift", async () => {
    const request = availability();
    const different = availability(2, 1, "correlation.other");
    const client = createAgentOsWorkerLeaseV1ReferenceClient({
      dispatch: () => Promise.resolve(different),
    });
    await expect(client.dispatch(request)).rejects.toBeInstanceOf(
      AgentOsWorkerLeaseV1ReferenceError
    );
  });

  test("wraps injected transport failures without owning retry", async () => {
    let calls = 0;
    const client = createAgentOsWorkerLeaseV1ReferenceClient({
      dispatch() {
        calls += 1;
        return Promise.reject(new Error("partition"));
      },
    });
    await expect(client.dispatch(availability())).rejects.toMatchObject({
      code: "TRANSPORT_FAILURE",
    });
    expect(calls).toBe(1);
  });

  test("publishes the complete deterministic conformance matrix", async () => {
    const visited: string[] = [];
    const results = await runAgentOsWorkerLeaseV1Conformance({
      execute(scenario) {
        visited.push(scenario.id);
        return {
          id: scenario.id,
          actual: scenario.expected,
          rejectionCode: scenario.rejectionCode,
          forbiddenSideEffectCalls: 0,
        };
      },
    });
    expect(visited).toEqual(AGENT_OS_WORKER_LEASE_V1_CONFORMANCE_SCENARIOS.map(({ id }) => id));
    expect(results).toHaveLength(11);
    expect(Object.isFrozen(results)).toBe(true);
    expect(results.every((result) => Object.isFrozen(result))).toBe(true);
  });

  test("fails closed on a wrong disposition or forbidden external call", async () => {
    await expect(
      runAgentOsWorkerLeaseV1Conformance({
        execute(scenario) {
          return {
            id: scenario.id,
            actual: scenario.expected === "accept" ? "reject" : "accept",
            rejectionCode: scenario.rejectionCode,
            forbiddenSideEffectCalls: 0,
          };
        },
      })
    ).rejects.toMatchObject({ code: "INVALID_RESULT" });
    await expect(
      runAgentOsWorkerLeaseV1Conformance({
        execute(scenario) {
          return {
            id: scenario.id,
            actual: scenario.expected,
            rejectionCode: scenario.rejectionCode,
            forbiddenSideEffectCalls: 1,
          };
        },
      })
    ).rejects.toMatchObject({ code: "INVALID_RESULT" });
  });
});
