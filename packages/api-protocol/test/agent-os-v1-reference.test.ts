import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import type {
  AgentOsV1HandshakeOffer,
  AgentOsV1NegotiatedSnapshot,
  AgentOsV1ProtocolFamily,
} from "../src/agent-os-v1-types.js";
import { AgentOsV1ContractError } from "../src/agent-os-v1-contract.js";
import {
  AGENT_OS_V1_PROTOCOL_REGISTRY,
  AgentOsV1ReferenceError,
  createAgentOsV1ReferenceClient,
  dispatchAgentOsV1Reference,
  negotiateAgentOsV1Handshake,
  planAgentOsV1HandlerTransition,
  planAgentOsV1PersonalTransition,
  resolveAgentOsV1PinnedHandler,
} from "../src/agent-os-v1-reference.js";

const NOW = Date.parse("2026-08-05T12:00:00.000Z");
const FAMILIES = ["execution.v1", "deployment.v1", "control.v1", "personal-local.v1"] as const;

function digest(seed: string): string {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function offer(
  protocolId: AgentOsV1ProtocolFamily,
  side: "client" | "provider"
): AgentOsV1HandshakeOffer {
  const providerRole =
    protocolId === "execution.v1"
      ? "kernel"
      : protocolId === "personal-local.v1"
        ? "personal"
        : "control";
  const peerId = side === "client" ? `app-${protocolId}` : `${providerRole}-${protocolId}`;
  const audience = [side === "client" ? `${providerRole}-${protocolId}` : `app-${protocolId}`];
  const isPersonalProvider = side === "provider" && providerRole === "personal";
  return {
    protocol: {
      protocolId,
      versions: side === "client" ? ["1.0", "1.1"] : ["1.1"],
      features: side === "client" ? ["cancel", "recover"] : ["artifact", "recover"],
      requiredFeatures: side === "client" ? ["recover"] : [],
      schemaVersion: "agent-os/v1",
      handlerVersion: `handler-${protocolId}-1.1.0`,
    },
    peer: {
      peerId,
      role: side === "client" ? "app" : providerRole,
      hostKind: isPersonalProvider ? "personal" : null,
      managementMode: isPersonalProvider ? "enrolled" : null,
      tenantId: "tenant.demo",
      workloadId: "workload.demo",
      authorityDomain: "authority.demo",
      enrollmentRef: isPersonalProvider
        ? { ref: "enrollment:personal-demo", digest: digest("enrollment") }
        : null,
      audience,
    },
    issuedAt: "2026-08-05T12:00:00.000Z",
    maxClockSkewMs: 30_000,
  };
}

function acceptedSnapshot(protocolId: AgentOsV1ProtocolFamily): AgentOsV1NegotiatedSnapshot {
  const result = negotiateAgentOsV1Handshake(
    offer(protocolId, "client"),
    offer(protocolId, "provider"),
    NOW
  );
  if (result.status !== "accepted")
    throw new Error(`expected accepted handshake: ${result.status}`);
  return result.snapshot;
}

function authorityEnvelope() {
  return {
    requestId: "request-0001",
    deadline: "2026-08-05T12:01:00.000Z",
    expectedRevision: 4,
    authorityEnvelopeRef: { ref: "authority:request-0001", digest: digest("authority") },
  };
}

function activePin(snapshot: AgentOsV1NegotiatedSnapshot) {
  return { runId: "run-0001", ...snapshot };
}

function catalog(snapshot: AgentOsV1NegotiatedSnapshot) {
  return {
    revision: 1,
    handlers: [
      {
        protocolId: snapshot.protocolId,
        handlerVersion: snapshot.handlerVersion,
        lifecycle: "active",
        operations: ["invoke"],
      },
    ],
  };
}

function strictRecord(input: unknown, key: string, valueType: "string" | "boolean") {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    throw new Error("payload must be a plain object");
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Object.keys(descriptors);
  const descriptor = descriptors[key];
  if (
    keys.length !== 1 ||
    keys[0] !== key ||
    descriptor === undefined ||
    !descriptor.enumerable ||
    !("value" in descriptor) ||
    typeof descriptor.value !== valueType
  )
    throw new Error("payload shape is invalid");
  return Object.freeze({ [key]: descriptor.value });
}

const ECHO_CODECS = Object.freeze({
  request: (input: unknown) =>
    strictRecord(input, "value", "string") as Readonly<{ value: string }>,
  response: (input: unknown) => strictRecord(input, "echo", "string") as Readonly<{ echo: string }>,
});

const OK_CODECS = Object.freeze({
  request: (input: unknown) => strictRecord(input, "ok", "boolean") as Readonly<{ ok: boolean }>,
  response: (input: unknown) => strictRecord(input, "ok", "boolean") as Readonly<{ ok: boolean }>,
});

describe("Agent OS v1 negotiation", () => {
  test("registers exactly four families and chooses the highest common minor with sorted features", () => {
    expect(Object.keys(AGENT_OS_V1_PROTOCOL_REGISTRY)).toEqual(FAMILIES);
    for (const family of FAMILIES) {
      const result = negotiateAgentOsV1Handshake(
        offer(family, "client"),
        offer(family, "provider"),
        NOW
      );
      expect(result).toEqual({
        status: "accepted",
        snapshot: {
          protocolId: family,
          selectedVersion: "1.1",
          selectedFeatures: ["recover"],
          schemaVersion: "agent-os/v1",
          handlerVersion: `handler-${family}-1.1.0`,
        },
      });
      if (result.status === "accepted") {
        expect(Object.isFrozen(result.snapshot)).toBe(true);
        expect(Object.isFrozen(result.snapshot.selectedFeatures)).toBe(true);
      }
    }
  });

  test("returns UPDATE_REQUIRED for unknown, cross-major, no-common and required-feature mismatch", () => {
    const baseClient = offer("execution.v1", "client");
    const provider = offer("execution.v1", "provider");
    expect(
      negotiateAgentOsV1Handshake(
        { ...baseClient, protocol: { ...baseClient.protocol, versions: ["1.99"] } },
        provider,
        NOW
      )
    ).toEqual({ status: "UPDATE_REQUIRED", reason: "UNKNOWN_VERSION" });
    expect(
      negotiateAgentOsV1Handshake(
        { ...baseClient, protocol: { ...baseClient.protocol, versions: ["2.0"] } },
        provider,
        NOW
      )
    ).toEqual({ status: "UPDATE_REQUIRED", reason: "CROSS_MAJOR" });
    expect(
      negotiateAgentOsV1Handshake(
        { ...baseClient, protocol: { ...baseClient.protocol, versions: ["1.0"] } },
        provider,
        NOW
      )
    ).toEqual({ status: "UPDATE_REQUIRED", reason: "NO_COMMON_VERSION" });
    expect(
      negotiateAgentOsV1Handshake(
        baseClient,
        {
          ...provider,
          protocol: {
            ...provider.protocol,
            features: ["cancel"],
            requiredFeatures: ["cancel"],
          },
        },
        NOW
      )
    ).toEqual({ status: "UPDATE_REQUIRED", reason: "REQUIRED_FEATURE_MISSING" });
  });

  test("fails closed on audience, authority domain, identity, enrollment and clock skew", () => {
    const client = offer("personal-local.v1", "client");
    const provider = offer("personal-local.v1", "provider");
    expect(
      negotiateAgentOsV1Handshake(
        { ...client, peer: { ...client.peer, audience: ["someone-else"] } },
        provider,
        NOW
      )
    ).toEqual({ status: "rejected", reason: "AUDIENCE_MISMATCH" });
    expect(
      negotiateAgentOsV1Handshake(
        client,
        { ...provider, peer: { ...provider.peer, authorityDomain: "authority.other" } },
        NOW
      )
    ).toEqual({ status: "rejected", reason: "AUTHORITY_DOMAIN_MISMATCH" });
    expect(
      negotiateAgentOsV1Handshake(
        client,
        { ...provider, peer: { ...provider.peer, workloadId: "workload.other" } },
        NOW
      )
    ).toEqual({ status: "rejected", reason: "IDENTITY_MISMATCH" });

    const workerClient = {
      ...offer("execution.v1", "client"),
      peer: {
        ...offer("execution.v1", "client").peer,
        role: "worker" as const,
        hostKind: "worker" as const,
        managementMode: "enrolled" as const,
        enrollmentRef: { ref: "enrollment:worker-a" as const, digest: digest("a") },
      },
    };
    const workerProvider = {
      ...offer("execution.v1", "provider"),
      peer: {
        ...offer("execution.v1", "provider").peer,
        role: "worker" as const,
        hostKind: "worker" as const,
        managementMode: "enrolled" as const,
        enrollmentRef: { ref: "enrollment:worker-b" as const, digest: digest("b") },
      },
    };
    expect(negotiateAgentOsV1Handshake(workerClient, workerProvider, NOW)).toEqual({
      status: "rejected",
      reason: "ENROLLMENT_MISMATCH",
    });
    expect(
      negotiateAgentOsV1Handshake(
        { ...client, issuedAt: "2026-08-05T11:58:00.000Z" },
        provider,
        NOW
      )
    ).toEqual({ status: "rejected", reason: "CLOCK_SKEW" });
  });
});

describe("Agent OS v1 stateless clients and providers", () => {
  test("round-trips every protocol family through injected transport and owner-provided handlers", async () => {
    for (const protocolId of FAMILIES) {
      const snapshot = acceptedSnapshot(protocolId);
      const ownerCatalog = catalog(snapshot);
      const pin = activePin(snapshot);
      const transport = async (request: {
        readonly protocolId: AgentOsV1ProtocolFamily;
        readonly operation: string;
        readonly envelope: ReturnType<typeof authorityEnvelope>;
        readonly snapshot: AgentOsV1NegotiatedSnapshot;
        readonly payload: Readonly<{ value: string }>;
      }) =>
        dispatchAgentOsV1Reference(
          request,
          ownerCatalog,
          pin,
          [
            {
              protocolId,
              handlerVersion: snapshot.handlerVersion,
              operation: "invoke",
              handle: (payload: Readonly<{ value: string }>) => ({ echo: payload.value }),
            },
          ],
          NOW,
          ECHO_CODECS
        );
      const client = createAgentOsV1ReferenceClient<
        typeof protocolId,
        Readonly<{ value: string }>,
        Readonly<{ echo: string }>
      >(protocolId, transport, ECHO_CODECS);
      await expect(
        client.request("invoke", authorityEnvelope(), snapshot, { value: protocolId }, NOW)
      ).resolves.toEqual({
        protocolId,
        requestId: "request-0001",
        status: "ok",
        payload: { echo: protocolId },
      });
    }
  });

  test("rejects expired deadlines, snapshot drift and missing pinned handlers", async () => {
    const snapshot = acceptedSnapshot("execution.v1");
    const transport = async () => ({
      protocolId: "execution.v1" as const,
      requestId: "request-0001",
      status: "ok" as const,
      payload: { ok: true },
    });
    const client = createAgentOsV1ReferenceClient("execution.v1", transport, OK_CODECS);
    await expect(
      client.request(
        "invoke",
        { ...authorityEnvelope(), deadline: "2026-08-05T12:00:00.000Z" },
        snapshot,
        { ok: true },
        NOW
      )
    ).rejects.toBeInstanceOf(AgentOsV1ReferenceError);

    await expect(
      dispatchAgentOsV1Reference(
        {
          protocolId: "execution.v1",
          operation: "invoke",
          envelope: authorityEnvelope(),
          snapshot: { ...snapshot, selectedFeatures: [] },
          payload: { ok: true },
        },
        catalog(snapshot),
        activePin(snapshot),
        [],
        NOW,
        OK_CODECS
      )
    ).rejects.toMatchObject({ code: "PIN_DRIFT" });
    expect(
      resolveAgentOsV1PinnedHandler({ revision: 0, handlers: [] }, activePin(snapshot))
    ).toEqual({
      status: "UPDATE_REQUIRED",
      reason: "HANDLER_MISSING",
    });
  });

  test("strictly parses snapshots, payloads, transport correlation and owner handler tables", async () => {
    const snapshot = acceptedSnapshot("execution.v1");
    let transportCalls = 0;
    const forgedClient = createAgentOsV1ReferenceClient(
      "execution.v1",
      async () => {
        transportCalls += 1;
        return {
          protocolId: "execution.v1",
          requestId: "request-0001",
          status: "ok",
          payload: { ok: true },
        };
      },
      OK_CODECS
    );
    await expect(
      forgedClient.request(
        "invoke",
        authorityEnvelope(),
        { ...snapshot, selectedFeatures: ["recover", "recover"] },
        { ok: true },
        NOW
      )
    ).rejects.toBeInstanceOf(AgentOsV1ContractError);
    await expect(
      forgedClient.request(
        "invoke",
        authorityEnvelope(),
        { ...snapshot, handlerVersion: "handler-forged" },
        Object.create({ ok: true }),
        NOW
      )
    ).rejects.toThrow("payload must be a plain object");
    expect(transportCalls).toBe(0);

    for (const response of [
      {
        protocolId: "control.v1",
        requestId: "request-0001",
        status: "ok",
        payload: { ok: true },
      },
      {
        protocolId: "execution.v1",
        requestId: "request-other",
        status: "ok",
        payload: { ok: true },
      },
      {
        protocolId: "execution.v1",
        requestId: "request-0001",
        status: "ok",
        payload: { ok: true },
        extra: true,
      },
    ]) {
      const client = createAgentOsV1ReferenceClient(
        "execution.v1",
        async () => response,
        OK_CODECS
      );
      await expect(
        client.request("invoke", authorityEnvelope(), snapshot, { ok: true }, NOW)
      ).rejects.toBeInstanceOf(AgentOsV1ContractError);
    }

    const request = {
      protocolId: "execution.v1",
      operation: "invoke",
      envelope: authorityEnvelope(),
      snapshot,
      payload: { ok: true },
    };
    const handler = {
      protocolId: "execution.v1" as const,
      handlerVersion: snapshot.handlerVersion,
      operation: "invoke",
      handle: () => ({ ok: true }),
    };
    await expect(
      dispatchAgentOsV1Reference(
        request,
        catalog(snapshot),
        activePin(snapshot),
        [handler, handler],
        NOW,
        OK_CODECS
      )
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("Agent OS v1 handler and Personal transitions", () => {
  test("drains before unload and rejects unload while active Runs remain pinned", () => {
    const snapshot = acceptedSnapshot("execution.v1");
    const initial = catalog(snapshot);
    const pin = activePin(snapshot);
    const draining = planAgentOsV1HandlerTransition(initial, [pin], {
      action: "drain",
      protocolId: "execution.v1",
      handlerVersion: snapshot.handlerVersion,
    });
    expect(draining).toMatchObject({
      status: "accepted",
      snapshot: { revision: 2, handlers: [{ lifecycle: "draining" }] },
    });
    expect(
      planAgentOsV1HandlerTransition(initial, [pin], {
        action: "unload",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      })
    ).toEqual({ status: "UPDATE_REQUIRED", reason: "HANDLER_PINNED" });
    expect(
      planAgentOsV1HandlerTransition(initial, [], {
        action: "unload",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      })
    ).toEqual({ status: "accepted", snapshot: { revision: 2, handlers: [] } });
  });

  test("rejects malformed commands, sparse or duplicate pins, unregistered pins and revision overflow", () => {
    const snapshot = acceptedSnapshot("execution.v1");
    const initial = catalog(snapshot);
    const pin = activePin(snapshot);
    expect(() =>
      planAgentOsV1HandlerTransition(initial, [], {
        action: "bogus",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      })
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      planAgentOsV1HandlerTransition(initial, new Array(1), {
        action: "unload",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      })
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      planAgentOsV1HandlerTransition(initial, [pin, pin], {
        action: "unload",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      })
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      resolveAgentOsV1PinnedHandler(initial, { ...pin, selectedVersion: "2.0" })
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      planAgentOsV1HandlerTransition({ ...initial, revision: Number.MAX_SAFE_INTEGER }, [], {
        action: "drain",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      })
    ).toThrow(AgentOsV1ReferenceError);
  });

  test("implements exactly the frozen Personal transitions and recovery denials", () => {
    const accepted = [
      ["LocalOnly", "EnrollmentPending"],
      ["EnrollmentPending", "ManagedOnline"],
      ["ManagedOnline", "ManagedOffline"],
      ["ManagedOffline", "ManagedOnline"],
      ["ManagedOffline", "Revoked"],
    ] as const;
    for (const [from, to] of accepted) {
      expect(
        planAgentOsV1PersonalTransition({
          from,
          to,
          authorityDomainChanged: false,
          renewRemoteAuthority: false,
          autoRecover: false,
        })
      ).toEqual({ status: "accepted", state: to });
    }
    expect(
      planAgentOsV1PersonalTransition({
        from: "ManagedOffline",
        to: "ManagedOnline",
        authorityDomainChanged: false,
        renewRemoteAuthority: true,
        autoRecover: false,
      })
    ).toEqual({ status: "rejected", reason: "REMOTE_RENEWAL_DENIED" });
    expect(
      planAgentOsV1PersonalTransition({
        from: "Revoked",
        to: "ManagedOnline",
        authorityDomainChanged: false,
        renewRemoteAuthority: false,
        autoRecover: true,
      })
    ).toEqual({ status: "rejected", reason: "REVOKED_AUTO_RECOVERY_DENIED" });
    expect(
      planAgentOsV1PersonalTransition({
        from: "ManagedOnline",
        to: "ManagedOnline",
        authorityDomainChanged: true,
        renewRemoteAuthority: false,
        autoRecover: false,
      })
    ).toEqual({
      status: "migration_required",
      actions: ["drain", "fence", "new-generation", "takeover"],
    });
    expect(
      planAgentOsV1PersonalTransition({
        from: "LocalOnly",
        to: "ManagedOnline",
        authorityDomainChanged: false,
        renewRemoteAuthority: false,
        autoRecover: false,
      })
    ).toEqual({ status: "rejected", reason: "INVALID_TRANSITION" });
    expect(() =>
      planAgentOsV1PersonalTransition({
        authorityDomainChanged: true,
        renewRemoteAuthority: false,
        autoRecover: false,
      })
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      planAgentOsV1PersonalTransition({
        from: "ManagedOffline",
        to: "ManagedOnline",
        authorityDomainChanged: false,
        renewRemoteAuthority: "false",
        autoRecover: false,
      })
    ).toThrow(AgentOsV1ContractError);
    expect(
      planAgentOsV1PersonalTransition({
        from: "Revoked",
        to: "ManagedOnline",
        authorityDomainChanged: true,
        renewRemoteAuthority: false,
        autoRecover: false,
      })
    ).toEqual({ status: "rejected", reason: "INVALID_TRANSITION" });
  });
});
