import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  AgentOsWorkerLeaseV1ContractError,
  canonicalAgentOsWorkerLeaseV1Source,
  createAgentOsWorkerLeaseV1Envelope,
  parseAgentOsWorkerLeaseV1Envelope,
} from "../src/agent-os-worker-lease-v1-contract.js";
import { AGENT_OS_V1_IMMUTABLE_PROMPT_REFERENCE_ARTIFACT } from "../src/agent-os-v1-reference.js";
import type {
  AgentOsWorkerLeaseV1Operation,
  AgentOsWorkerLeaseV1PayloadByOperation,
  ExecutionClaimBinding,
  ExecutionGrant,
  ExecutionInstance,
} from "../src/index.js";
import {
  AgentOsWorkerLeaseV1,
  AgentOsWorkerLeaseV1Reference,
  parseAgentOsWorkerLeaseV1Envelope as parseFromPackage,
} from "@morpheus/api-protocol";

const digest = (seed: string): string =>
  `sha256:${createHash("sha256").update(seed).digest("hex")}`;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

const instance: ExecutionInstance = {
  instanceId: "instance.worker-1",
  deploymentId: "deployment.demo",
  hostId: "worker-1",
  generation: 3,
  deploymentRevision: "revision.3",
  replicaOrdinal: 0,
  observedState: "running",
};

const grant: ExecutionGrant = {
  grantId: "grant.demo",
  kind: "remote",
  issuer: "control",
  audience: ["worker-1"],
  authorityDomain: "authority.demo",
  hostId: "worker-1",
  deploymentId: "deployment.demo",
  runId: "run.demo",
  tenantId: "tenant.demo",
  workloadId: "workload.demo",
  attemptId: "attempt.demo",
  instanceId: "instance.worker-1",
  definitionDigest: digest("definition"),
  policyDigest: digest("policy"),
  capabilityDigest: digest("capability"),
  keyId: "key.demo",
  rotationGeneration: "rotation:current",
  revocationGeneration: "revocation:current",
  scope: ["workspace.read"],
  notBefore: "2026-08-07T00:00:00.000Z",
  expiresAt: "2026-08-07T00:10:00.000Z",
  sessionGrant: {
    grantId: "session.demo",
    principalId: "principal.demo",
    scope: ["workspace.read"],
    notBefore: "2026-08-07T00:00:00.000Z",
    expiresAt: "2026-08-07T00:20:00.000Z",
  },
  leaseBinding: {
    kind: "remote",
    leaseId: "lease.demo",
    epoch: "lease-epoch:current",
    generation: 3,
    scope: ["workspace.read"],
    notBefore: "2026-08-07T00:00:00.000Z",
    expiresAt: "2026-08-07T00:10:00.000Z",
  },
};

const claim: ExecutionClaimBinding = {
  grantId: "grant.demo",
  leaseId: "lease.demo",
  leaseEpoch: "lease-epoch:current",
  authorityDomain: "authority.demo",
  runId: "run.demo",
  attemptId: "attempt.demo",
  instanceId: "instance.worker-1",
  instanceGeneration: 3,
  storeId: "store.demo",
  storeGeneration: 7,
  writerIncarnationId: "writer.demo",
  claimId: "claim.demo",
  claimFence: 11,
  expiresAt: "2026-08-07T00:08:00.000Z",
};

const manifest = {
  packageId: "package.demo",
  packageDigest: digest("package"),
  capabilityDigest: grant.capabilityDigest,
};

function envelope<Operation extends AgentOsWorkerLeaseV1Operation>(
  operation: Operation,
  payload: AgentOsWorkerLeaseV1PayloadByOperation[Operation],
  sequence = 1,
  tenantId = "tenant.demo"
) {
  return createAgentOsWorkerLeaseV1Envelope({
    operation,
    sender:
      operation === "worker.availability" ||
      operation === "claim.request" ||
      operation === "execution.progress" ||
      operation === "execution.resource-health" ||
      operation === "execution.result"
        ? "worker"
        : "control",
    messageId: `message.${sequence}`,
    correlationId: "correlation.demo",
    sequence,
    leaderTerm: 2,
    controlId: "control",
    tenantId,
    workloadId: "workload.demo",
    workerId: "worker-1",
    requestedAt: "2026-08-07T00:01:00.000Z",
    deadline: "2026-08-07T00:09:00.000Z",
    payload,
  });
}

const availability = {
  identity: {
    issuer: "identity.demo",
    subject: "worker-1",
    audience: ["control"] as const,
    keyId: "identity-key.demo",
    rotationGeneration: "rotation:identity-current" as const,
    revocationGeneration: "revocation:identity-current" as const,
  },
  manifest,
  capacity: { maxActiveRuns: 4, activeRuns: 1 },
  draining: false,
  observedAt: "2026-08-07T00:01:00.000Z",
};

describe("agent-os-worker-lease/v1 strict contract", () => {
  test("canonicalizes and freezes every operation in the v1 family", () => {
    const messages = [
      envelope("worker.availability", availability, 1),
      envelope(
        "placement.offer",
        {
          commandId: "command.offer",
          grant,
          instance,
          manifest,
          offeredAt: "2026-08-07T00:01:00.000Z",
          expiresAt: "2026-08-07T00:09:00.000Z",
        },
        2
      ),
      envelope("claim.request", { commandId: "command.claim", grant, instance, claim }, 3),
      envelope(
        "claim.ack",
        { commandId: "command.claim", claim, accepted: true, rejection: null },
        4
      ),
      envelope("lease.renew", { commandId: "command.renew", grant, instance, claim }, 5),
      envelope(
        "execution.progress",
        {
          commandId: "command.progress",
          claim,
          revision: 1,
          progressDigest: digest("progress"),
          observedAt: "2026-08-07T00:02:00.000Z",
        },
        6
      ),
      envelope(
        "execution.resource-health",
        {
          commandId: "command.resource-health",
          claim,
          revision: 1,
          acquiredResourceCount: 2,
          observedAt: "2026-08-07T00:02:30.000Z",
        },
        7
      ),
      envelope(
        "execution.result",
        {
          commandId: "command.result",
          claim,
          status: "succeeded",
          resultDigest: digest("result"),
          artifactDigest: digest("artifact"),
          completedAt: "2026-08-07T00:03:00.000Z",
        },
        8
      ),
      envelope(
        "execution.cancel",
        { commandId: "command.cancel", claim, reasonDigest: digest("cancel") },
        9
      ),
      envelope(
        "worker.drain",
        {
          commandId: "command.drain",
          mode: "graceful",
          reasonDigest: digest("drain"),
          deadline: "2026-08-07T00:08:00.000Z",
        },
        10
      ),
      envelope(
        "worker.quarantine",
        {
          commandId: "command.quarantine",
          targetMessageId: "message.7",
          reason: "artifact_corrupt",
          evidenceDigest: digest("evidence"),
        },
        11
      ),
    ];

    expect(messages.map((message) => message.operation)).toEqual([
      "worker.availability",
      "placement.offer",
      "claim.request",
      "claim.ack",
      "lease.renew",
      "execution.progress",
      "execution.resource-health",
      "execution.result",
      "execution.cancel",
      "worker.drain",
      "worker.quarantine",
    ]);
    expect(messages.every((message) => Object.isFrozen(message))).toBe(true);
    expect(messages.every((message) => Object.isFrozen(message.payload))).toBe(true);
    expect(new Set(messages.map((message) => message.payloadDigest)).size).toBe(11);
    expect(new Set(messages.map((message) => message.envelopeDigest)).size).toBe(11);
  });

  test("is deterministic and does not mutate the immutable agent-os/v1 fixture", () => {
    const before = JSON.stringify(AGENT_OS_V1_IMMUTABLE_PROMPT_REFERENCE_ARTIFACT);
    const first = envelope("worker.availability", availability);
    const second = envelope("worker.availability", {
      ...availability,
      capacity: { activeRuns: 1, maxActiveRuns: 4 },
    });
    expect(canonicalAgentOsWorkerLeaseV1Source(first)).toBe(
      canonicalAgentOsWorkerLeaseV1Source(second)
    );
    expect(first.envelopeDigest).toBe(second.envelopeDigest);
    expect(JSON.stringify(AGENT_OS_V1_IMMUTABLE_PROMPT_REFERENCE_ARTIFACT)).toBe(before);
  });

  test("matches an independent SHA-256 implementation and exports equivalent parser behavior", () => {
    const message = envelope("worker.availability", availability);
    const { envelopeDigest, ...unsigned } = message;
    expect(message.payloadDigest).toBe(
      digest(canonical({ operation: message.operation, payload: message.payload }))
    );
    expect(envelopeDigest).toBe(digest(canonical(unsigned)));
    expect(parseFromPackage(message)).toEqual(parseAgentOsWorkerLeaseV1Envelope(message));
    expect(AgentOsWorkerLeaseV1.parseAgentOsWorkerLeaseV1Envelope(message)).toEqual(
      parseAgentOsWorkerLeaseV1Envelope(message)
    );
    expect(() => parseFromPackage({})).toThrow(AgentOsWorkerLeaseV1ContractError);
    expect(() => parseFromPackage({ ...message, envelopeDigest: digest("mismatch") })).toThrow(
      "DIGEST_MISMATCH"
    );
    expect(AgentOsWorkerLeaseV1Reference.runAgentOsWorkerLeaseV1Conformance).toBeFunction();
  });

  test("rejects unknown, secret-like and sparse fields", () => {
    const valid = envelope("worker.availability", availability);
    expect(() => parseAgentOsWorkerLeaseV1Envelope({ ...valid, token: "secret" })).toThrow(
      AgentOsWorkerLeaseV1ContractError
    );
    expect(() =>
      envelope("worker.availability", {
        ...availability,
        identity: { ...availability.identity, audience: Array(1) as readonly [string] },
      })
    ).toThrow(AgentOsWorkerLeaseV1ContractError);
    expect(() =>
      envelope("worker.availability", { ...availability, credential: "secret" } as never)
    ).toThrow(AgentOsWorkerLeaseV1ContractError);
  });

  test("rejects payload and envelope digest tamper", () => {
    const valid = envelope("worker.availability", availability);
    expect(() =>
      parseAgentOsWorkerLeaseV1Envelope({ ...valid, payloadDigest: digest("tampered") })
    ).toThrow("DIGEST_MISMATCH");
    expect(() => parseAgentOsWorkerLeaseV1Envelope({ ...valid, tenantId: "tenant.other" })).toThrow(
      "DIGEST_MISMATCH"
    );
  });

  test("rejects envelope, grant, manifest, instance and claim drift", () => {
    expect(() =>
      envelope(
        "placement.offer",
        {
          commandId: "command.offer",
          grant,
          instance,
          manifest,
          offeredAt: "2026-08-07T00:01:00.000Z",
          expiresAt: "2026-08-07T00:09:00.000Z",
        },
        1,
        "tenant.other"
      )
    ).toThrow("GRANT_EXPANSION");
    expect(() =>
      envelope("placement.offer", {
        commandId: "command.offer",
        grant,
        instance,
        manifest: { ...manifest, capabilityDigest: digest("different") },
        offeredAt: "2026-08-07T00:01:00.000Z",
        expiresAt: "2026-08-07T00:09:00.000Z",
      })
    ).toThrow("GRANT_EXPANSION");
    expect(() =>
      envelope("claim.request", {
        commandId: "command.claim",
        grant,
        instance,
        claim: { ...claim, instanceGeneration: 2 },
      })
    ).toThrow("DRIFT_DETECTED");
  });

  test("rejects Grant audience, scope and validity expansion", () => {
    const offer = (expandedGrant: ExecutionGrant) =>
      envelope("placement.offer", {
        commandId: "command.offer",
        grant: expandedGrant,
        instance,
        manifest,
        offeredAt: "2026-08-07T00:01:00.000Z",
        expiresAt: "2026-08-07T00:09:00.000Z",
      });

    expect(() => offer({ ...grant, audience: ["worker-1", "worker-2"] })).toThrow(
      "GRANT_EXPANSION"
    );
    expect(() =>
      offer({
        ...grant,
        scope: ["workspace.read", "workspace.write"],
        leaseBinding: {
          ...grant.leaseBinding,
          scope: ["workspace.read", "workspace.write"],
        },
      })
    ).toThrow("GRANT_EXPANSION");
    expect(() =>
      offer({
        ...grant,
        scope: ["workspace.read", "workspace.write"],
        sessionGrant: {
          ...grant.sessionGrant,
          scope: ["workspace.read", "workspace.write"],
        },
      })
    ).toThrow("GRANT_EXPANSION");
    expect(() =>
      offer({
        ...grant,
        sessionGrant: {
          ...grant.sessionGrant,
          expiresAt: "2026-08-07T00:09:00.000Z",
        },
      })
    ).toThrow("GRANT_EXPANSION");
    expect(() =>
      offer({
        ...grant,
        leaseBinding: {
          ...grant.leaseBinding,
          notBefore: "2026-08-07T00:00:01.000Z",
        },
      })
    ).toThrow("GRANT_EXPANSION");
  });

  test("rejects an expired claim for ack, progress and result", () => {
    const expiredClaim = { ...claim, expiresAt: "2026-08-07T00:01:00.000Z" };
    expect(() =>
      envelope("claim.ack", {
        commandId: "command.claim",
        claim: expiredClaim,
        accepted: true,
        rejection: null,
      })
    ).toThrow("DRIFT_DETECTED");
    expect(() =>
      envelope("execution.progress", {
        commandId: "command.progress",
        claim: expiredClaim,
        revision: 1,
        progressDigest: digest("progress"),
        observedAt: "2026-08-07T00:02:00.000Z",
      })
    ).toThrow("DRIFT_DETECTED");
    expect(() =>
      envelope("execution.result", {
        commandId: "command.result",
        claim: expiredClaim,
        status: "succeeded",
        resultDigest: digest("result"),
        artifactDigest: digest("artifact"),
        completedAt: "2026-08-07T00:03:00.000Z",
      })
    ).toThrow("DRIFT_DETECTED");
    expect(
      envelope("claim.ack", {
        commandId: "command.claim",
        claim: expiredClaim,
        accepted: false,
        rejection: "expired",
      }).payload
    ).toMatchObject({ accepted: false, rejection: "expired" });
  });

  test("rejects unsafe counters, invalid time windows and inconsistent terminal facts", () => {
    const valid = envelope("worker.availability", availability);
    expect(() =>
      parseAgentOsWorkerLeaseV1Envelope({ ...valid, sequence: Number.MAX_SAFE_INTEGER + 1 })
    ).toThrow(AgentOsWorkerLeaseV1ContractError);
    expect(() =>
      envelope("worker.availability", { ...availability, observedAt: "2026-08-07T00:01:00Z" })
    ).toThrow(AgentOsWorkerLeaseV1ContractError);
    expect(() =>
      envelope("claim.ack", {
        commandId: "command.claim",
        claim,
        accepted: true,
        rejection: "fenced",
      })
    ).toThrow("DRIFT_DETECTED");
    expect(() =>
      envelope("execution.result", {
        commandId: "command.result",
        claim,
        status: "succeeded",
        resultDigest: digest("result"),
        artifactDigest: null,
        completedAt: "2026-08-07T00:03:00.000Z",
      })
    ).toThrow("DRIFT_DETECTED");
    expect(() =>
      createAgentOsWorkerLeaseV1Envelope({
        operation: "execution.result",
        sender: "control",
        messageId: "message.wrong-sender",
        correlationId: "correlation.demo",
        sequence: 1,
        leaderTerm: 2,
        controlId: "control",
        tenantId: "tenant.demo",
        workloadId: "workload.demo",
        workerId: "worker-1",
        requestedAt: "2026-08-07T00:01:00.000Z",
        deadline: "2026-08-07T00:09:00.000Z",
        payload: {
          commandId: "command.result",
          claim,
          status: "failed",
          resultDigest: digest("result"),
          artifactDigest: null,
          completedAt: "2026-08-07T00:03:00.000Z",
        },
      })
    ).toThrow("DRIFT_DETECTED");
  });

  test("rejects unsafe or authority-drifting resource health observations", () => {
    const resourceHealth = {
      commandId: "command.resource-health",
      claim,
      revision: 1,
      acquiredResourceCount: 2,
      observedAt: "2026-08-07T00:02:00.000Z",
    };
    const valid = envelope("execution.resource-health", resourceHealth);

    for (const forbidden of [
      "resources",
      "identity",
      "data",
      "token",
      "path",
      "payload",
      "errorText",
    ]) {
      expect(() =>
        envelope("execution.resource-health", {
          ...resourceHealth,
          [forbidden]: "forbidden",
        } as never)
      ).toThrow(AgentOsWorkerLeaseV1ContractError);
    }
    expect(() => envelope("execution.resource-health", { ...resourceHealth, revision: 0 })).toThrow(
      AgentOsWorkerLeaseV1ContractError
    );
    expect(() =>
      envelope("execution.resource-health", { ...resourceHealth, acquiredResourceCount: -1 })
    ).toThrow(AgentOsWorkerLeaseV1ContractError);
    expect(() =>
      envelope("execution.resource-health", {
        ...resourceHealth,
        acquiredResourceCount: Number.MAX_SAFE_INTEGER + 1,
      })
    ).toThrow(AgentOsWorkerLeaseV1ContractError);
    expect(() =>
      envelope("execution.resource-health", {
        ...resourceHealth,
        observedAt: "2026-08-07T00:00:59.999Z",
      })
    ).toThrow("DRIFT_DETECTED");
    expect(() =>
      envelope("execution.resource-health", {
        ...resourceHealth,
        observedAt: "2026-08-07T00:09:00.001Z",
      })
    ).toThrow("DRIFT_DETECTED");
    expect(() =>
      envelope("execution.resource-health", {
        ...resourceHealth,
        claim: { ...claim, expiresAt: "2026-08-07T00:01:00.000Z" },
      })
    ).toThrow("DRIFT_DETECTED");
    expect(() =>
      createAgentOsWorkerLeaseV1Envelope({
        operation: "execution.resource-health",
        sender: "control",
        messageId: "message.resource-health.wrong-sender",
        correlationId: "correlation.demo",
        sequence: 1,
        leaderTerm: 2,
        controlId: "control",
        tenantId: "tenant.demo",
        workloadId: "workload.demo",
        workerId: "worker-1",
        requestedAt: "2026-08-07T00:01:00.000Z",
        deadline: "2026-08-07T00:09:00.000Z",
        payload: resourceHealth,
      })
    ).toThrow("DRIFT_DETECTED");
    expect(() =>
      parseAgentOsWorkerLeaseV1Envelope({ ...valid, payloadDigest: digest("forged") })
    ).toThrow("DIGEST_MISMATCH");
    expect(() =>
      parseAgentOsWorkerLeaseV1Envelope({ ...valid, operation: "execution.progress" })
    ).toThrow(AgentOsWorkerLeaseV1ContractError);
  });
});
