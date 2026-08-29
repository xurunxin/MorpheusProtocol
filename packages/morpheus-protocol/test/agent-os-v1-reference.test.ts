import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import type {
  AgentOsV1CanonicalPromptResponse,
  AgentOsV1HandshakeOffer,
  AgentOsV1NegotiatedSnapshot,
  AgentOsV1ProtocolFamily,
} from "../src/agent-os-v1-types.js";
import {
  AgentOsV1ContractError,
  createAgentOsV1CanonicalPromptEvent,
  createAgentOsV1CanonicalPromptSemanticBinding,
  createAgentOsV1CanonicalPromptCursor,
  createAgentOsV1CanonicalPromptSnapshot,
} from "../src/agent-os-v1-contract.js";
import {
  AGENT_OS_V1_IMMUTABLE_PROMPT_REFERENCE_ARTIFACT,
  AGENT_OS_V1_PROTOCOL_REGISTRY,
  AgentOsV1ReferenceError,
  bindAgentOsV1ImmutablePromptReferenceEnvelope,
  createAgentOsV1ReferenceClient,
  createAgentOsV1CanonicalPromptReferenceClient,
  dispatchAgentOsV1CanonicalPromptReference,
  dispatchAgentOsV1Reference,
  negotiateAgentOsV1Handshake,
  planAgentOsV1HandlerTransition,
  planAgentOsV1PersonalTransition,
  resolveAgentOsV1PinnedHandler,
} from "../src/agent-os-v1-reference.js";

const NOW = Date.parse("2026-08-05T12:00:00.000Z");
const FAMILIES = [
  "execution.v1",
  "deployment.v1",
  "control.v1",
  "personal-local.v1",
] as const;

function digest(seed: string): string {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function offer(
  protocolId: AgentOsV1ProtocolFamily,
  side: "client" | "provider",
): AgentOsV1HandshakeOffer {
  const providerRole =
    protocolId === "execution.v1"
      ? "kernel"
      : protocolId === "personal-local.v1"
        ? "personal"
        : "control";
  const peerId =
    side === "client" ? `app-${protocolId}` : `${providerRole}-${protocolId}`;
  const audience = [
    side === "client" ? `${providerRole}-${protocolId}` : `app-${protocolId}`,
  ];
  const isPersonalProvider = side === "provider" && providerRole === "personal";
  return {
    protocol: {
      protocolId,
      versions: side === "client" ? ["1.0", "1.1"] : ["1.1"],
      features:
        side === "client" ? ["cancel", "recover"] : ["artifact", "recover"],
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

function acceptedSnapshot(
  protocolId: AgentOsV1ProtocolFamily,
): AgentOsV1NegotiatedSnapshot {
  const result = negotiateAgentOsV1Handshake(
    offer(protocolId, "client"),
    offer(protocolId, "provider"),
    NOW,
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
    authorityEnvelopeRef: {
      ref: "authority:request-0001",
      digest: digest("authority"),
    },
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

function strictRecord(
  input: unknown,
  key: string,
  valueType: "string" | "boolean",
) {
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
  response: (input: unknown) =>
    strictRecord(input, "echo", "string") as Readonly<{ echo: string }>,
});

describe("Agent OS v1 immutable prompt reference artifact", () => {
  test("is a deeply frozen strict no-live-issuer artifact with bind-only envelopes", () => {
    const artifact = AGENT_OS_V1_IMMUTABLE_PROMPT_REFERENCE_ARTIFACT;
    const envelopeRef = {
      ref: "authority:prompt-test",
      digest: digest("prompt-test"),
    };
    const envelope = bindAgentOsV1ImmutablePromptReferenceEnvelope(
      "start",
      envelopeRef,
    );

    expect(artifact.kind).toBe("deterministic-no-effect");
    expect(artifact.renewable).toBe(false);
    expect(artifact.rotatable).toBe(false);
    expect(artifact.liveIssuer).toBe(false);
    expect(artifact.lifecycle).toBe("connected-managed");
    expect(artifact.handshake.snapshot.protocolId).toBe("execution.v1");
    expect(artifact.authority.grant.kind).toBe("remote");
    expect(artifact.authority.instance.observedState).toBe("running");
    expect(Object.isFrozen(artifact)).toBe(true);
    expect(Object.isFrozen(artifact.authority.grant.sessionGrant)).toBe(true);
    expect(Object.isFrozen(artifact.handshake.snapshot)).toBe(true);
    expect(envelope).toEqual({
      ...artifact.envelopes.start,
      authorityEnvelopeRef: envelopeRef,
    });
    expect(JSON.stringify(artifact)).not.toMatch(
      /credential|accessToken|refreshToken|clientSecret/i,
    );
    expect(() =>
      bindAgentOsV1ImmutablePromptReferenceEnvelope("start", {
        ref: "authority:prompt-test",
        digest: "not-a-digest",
      }),
    ).toThrow(AgentOsV1ContractError);
  });
});

describe("Agent OS v1 canonical prompt reference transport", () => {
  test("passes the same strict fixture through an injected client and full-context provider", async () => {
    const snapshot = acceptedSnapshot("execution.v1");
    const pin = activePin(snapshot);
    const ownerCatalog = {
      revision: 1,
      handlers: [
        {
          protocolId: "execution.v1",
          handlerVersion: snapshot.handlerVersion,
          lifecycle: "active",
          operations: ["prompt.cancel", "prompt.read", "prompt.start"],
        },
      ],
    };
    const projection = createAgentOsV1CanonicalPromptSnapshot({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      attemptId: "attempt-0001",
      instanceId: "instance-0001",
      storeGeneration: 1,
      streamEpoch: "stream-epoch:epoch-0001",
      watermark: 0,
      state: "running",
      terminal: false,
      updatedAt: "2026-08-05T12:00:00.000Z",
    });
    const cursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      streamEpoch: "stream-epoch:epoch-0001",
      sequence: 0,
      watermark: 0,
    });
    const readPayload = {
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.read",
      runId: "run-0001",
      cursor: null,
      limit: 16,
      readAt: "2026-08-05T12:00:00.000Z",
    } as const;
    const semanticBinding = createAgentOsV1CanonicalPromptSemanticBinding({
      requestId: "request-0001",
      expectedRevision: 4,
      snapshot,
      payload: readPayload,
    });
    const canonicalEnvelope = {
      ...authorityEnvelope(),
      authorityEnvelopeRef: semanticBinding.authorityEnvelopeRef,
    };
    const seen: unknown[] = [];
    const transport = async (request: unknown) =>
      dispatchAgentOsV1CanonicalPromptReference(
        request,
        ownerCatalog,
        pin,
        [
          {
            protocolId: "execution.v1",
            handlerVersion: snapshot.handlerVersion,
            operation: "prompt.read",
            handle(fullRequest) {
              seen.push(fullRequest);
              return {
                schemaVersion: "agent-os-canonical-prompt/v1",
                operation: "prompt.read",
                disposition: "events",
                snapshot: projection,
                events: [],
                cursor,
                replayed: false,
              };
            },
          },
        ],
        NOW,
      );
    const client = createAgentOsV1CanonicalPromptReferenceClient(transport);
    const response = await client.read(
      canonicalEnvelope,
      snapshot,
      readPayload,
      NOW,
    );

    expect(response.payload.snapshot).toEqual(projection);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      protocolId: "execution.v1",
      operation: "prompt.read",
      envelope: { requestId: "request-0001" },
      snapshot,
    });
    expect(JSON.stringify(seen[0])).not.toContain("baseUrl");
    await expect(
      dispatchAgentOsV1CanonicalPromptReference(
        seen[0],
        ownerCatalog,
        { ...pin, runId: "run-cross-authority" },
        [
          {
            protocolId: "execution.v1",
            handlerVersion: snapshot.handlerVersion,
            operation: "prompt.read",
            handle() {
              return response.payload;
            },
          },
        ],
        NOW,
      ),
    ).rejects.toMatchObject({ code: "PIN_DRIFT" });
    await expect(
      client.request(
        canonicalEnvelope,
        snapshot,
        {
          schemaVersion: "agent-os-canonical-prompt/v1",
          operation: "prompt.read",
          runId: "run-0001",
          cursor: null,
          limit: 16,
          readAt: "2026-08-05T12:00:00.000Z",
          baseUrl: "https://forbidden.example",
        },
        NOW,
      ),
    ).rejects.toThrow(AgentOsV1ContractError);
  });

  test("rejects cross-Run and leading-gap prompt responses at specialized boundaries", async () => {
    const negotiated = acceptedSnapshot("execution.v1");
    const pin = activePin(negotiated);
    const ownerCatalog = {
      revision: 1,
      handlers: [
        {
          protocolId: "execution.v1",
          handlerVersion: negotiated.handlerVersion,
          lifecycle: "active",
          operations: ["prompt.read"],
        },
      ],
    };
    const projection = createAgentOsV1CanonicalPromptSnapshot({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      attemptId: "attempt-0001",
      instanceId: "instance-0001",
      storeGeneration: 1,
      streamEpoch: "stream-epoch:epoch-0001",
      watermark: 3,
      state: "running",
      terminal: false,
      updatedAt: "2026-08-05T12:00:00.000Z",
    });
    const requestCursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      streamEpoch: projection.streamEpoch,
      sequence: 1,
      watermark: projection.watermark,
    });
    const readPayload = {
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.read",
      runId: "run-0001",
      cursor: requestCursor,
      limit: 16,
      readAt: "2026-08-05T12:00:00.000Z",
    } as const;
    const binding = createAgentOsV1CanonicalPromptSemanticBinding({
      requestId: "request-0001",
      expectedRevision: 4,
      snapshot: negotiated,
      payload: readPayload,
    });
    const envelope = {
      ...authorityEnvelope(),
      authorityEnvelopeRef: binding.authorityEnvelopeRef,
    };
    const event3 = createAgentOsV1CanonicalPromptEvent({
      schemaVersion: "agent-os-canonical-prompt/v1",
      eventId: "event-0003",
      runId: "run-0001",
      attemptId: "attempt-0001",
      streamEpoch: projection.streamEpoch,
      sequence: 3,
      eventType: "provider.output",
      payload: { text: "gap" },
      createdAt: "2026-08-05T12:00:00.000Z",
    });
    const responseCursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      streamEpoch: projection.streamEpoch,
      sequence: 3,
      watermark: projection.watermark,
    });
    const gapResponse = {
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.read",
      disposition: "events",
      snapshot: projection,
      events: [event3],
      cursor: responseCursor,
      replayed: false,
    } as const;
    const foreignProjection = createAgentOsV1CanonicalPromptSnapshot({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-other",
      attemptId: projection.attemptId,
      instanceId: projection.instanceId,
      storeGeneration: projection.storeGeneration,
      streamEpoch: projection.streamEpoch,
      watermark: projection.watermark,
      state: projection.state,
      terminal: projection.terminal,
      updatedAt: projection.updatedAt,
    });
    const foreignCursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-other",
      streamEpoch: foreignProjection.streamEpoch,
      sequence: 0,
      watermark: foreignProjection.watermark,
    });
    const foreignResponse = {
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.read",
      disposition: "events",
      snapshot: foreignProjection,
      events: [],
      cursor: foreignCursor,
      replayed: false,
    } as const;
    const clientFor = (payload: AgentOsV1CanonicalPromptResponse) =>
      createAgentOsV1CanonicalPromptReferenceClient(async () => ({
        protocolId: "execution.v1",
        requestId: "request-0001",
        status: "ok",
        payload,
      }));
    const dispatchFor = (payload: AgentOsV1CanonicalPromptResponse) =>
      dispatchAgentOsV1CanonicalPromptReference(
        {
          protocolId: "execution.v1",
          operation: "prompt.read",
          envelope,
          snapshot: negotiated,
          payload: readPayload,
        },
        ownerCatalog,
        pin,
        [
          {
            protocolId: "execution.v1",
            handlerVersion: negotiated.handlerVersion,
            operation: "prompt.read",
            handle: () => payload,
          },
        ],
        NOW,
      );

    for (const response of [foreignResponse, gapResponse] as const) {
      await expect(
        clientFor(response).read(envelope, negotiated, readPayload, NOW),
      ).rejects.toMatchObject({ code: "PIN_DRIFT" });
      await expect(dispatchFor(response)).rejects.toMatchObject({
        code: "PIN_DRIFT",
      });
    }

    const emptyPage = {
      ...gapResponse,
      events: [],
      cursor: requestCursor,
    } as const;
    await expect(
      clientFor(emptyPage).read(envelope, negotiated, readPayload, NOW),
    ).resolves.toMatchObject({
      payload: { events: [], cursor: requestCursor },
    });

    const regressedProjection = createAgentOsV1CanonicalPromptSnapshot({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      attemptId: "attempt-0001",
      instanceId: "instance-0001",
      storeGeneration: 1,
      streamEpoch: projection.streamEpoch,
      watermark: 2,
      state: "running",
      terminal: false,
      updatedAt: "2026-08-05T12:00:00.000Z",
    });
    const event2 = createAgentOsV1CanonicalPromptEvent({
      schemaVersion: "agent-os-canonical-prompt/v1",
      eventId: "event-0002",
      runId: "run-0001",
      attemptId: "attempt-0001",
      streamEpoch: projection.streamEpoch,
      sequence: 2,
      eventType: "provider.output",
      payload: { text: "regressed" },
      createdAt: "2026-08-05T12:00:00.000Z",
    });
    const regressedCursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      streamEpoch: projection.streamEpoch,
      sequence: 2,
      watermark: 2,
    });
    await expect(
      clientFor({
        ...gapResponse,
        snapshot: regressedProjection,
        events: [event2],
        cursor: regressedCursor,
      }).read(envelope, negotiated, readPayload, NOW),
    ).rejects.toMatchObject({ code: "PIN_DRIFT" });

    const nullRead = { ...readPayload, cursor: null } as const;
    const nullBinding = createAgentOsV1CanonicalPromptSemanticBinding({
      requestId: "request-0001",
      expectedRevision: 4,
      snapshot: negotiated,
      payload: nullRead,
    });
    const nullEnvelope = {
      ...authorityEnvelope(),
      authorityEnvelopeRef: nullBinding.authorityEnvelopeRef,
    };
    await expect(
      clientFor(gapResponse).read(nullEnvelope, negotiated, nullRead, NOW),
    ).rejects.toMatchObject({ code: "PIN_DRIFT" });
    const nullCursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      streamEpoch: projection.streamEpoch,
      sequence: 0,
      watermark: projection.watermark,
    });
    await expect(
      clientFor({ ...gapResponse, events: [], cursor: nullCursor }).read(
        nullEnvelope,
        negotiated,
        nullRead,
        NOW,
      ),
    ).resolves.toMatchObject({ payload: { events: [], cursor: nullCursor } });

    const retiredCursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run-0001",
      streamEpoch: "stream-epoch:retired",
      sequence: 1,
      watermark: 1,
    });
    const retiredRead = { ...readPayload, cursor: retiredCursor } as const;
    const retiredBinding = createAgentOsV1CanonicalPromptSemanticBinding({
      requestId: "request-0001",
      expectedRevision: 4,
      snapshot: negotiated,
      payload: retiredRead,
    });
    const retiredEnvelope = {
      ...authorityEnvelope(),
      authorityEnvelopeRef: retiredBinding.authorityEnvelopeRef,
    };
    const rebuiltEvents = [1, 2, 3].map((sequence) =>
      createAgentOsV1CanonicalPromptEvent({
        schemaVersion: "agent-os-canonical-prompt/v1",
        eventId: `event-rebuilt-${sequence}`,
        runId: "run-0001",
        attemptId: "attempt-0001",
        streamEpoch: projection.streamEpoch,
        sequence,
        eventType: "provider.output",
        payload: { text: `rebuilt-${sequence}` },
        createdAt: "2026-08-05T12:00:00.000Z",
      }),
    );
    const snapshotRequired = {
      ...gapResponse,
      disposition: "snapshot-required",
      events: rebuiltEvents,
    } as const;
    const snapshotClient = createAgentOsV1CanonicalPromptReferenceClient(
      async () => ({
        protocolId: "execution.v1",
        requestId: "request-0001",
        status: "ok",
        payload: snapshotRequired,
      }),
    );
    await expect(
      snapshotClient.read(retiredEnvelope, negotiated, retiredRead, NOW),
    ).resolves.toMatchObject({ payload: { disposition: "snapshot-required" } });
  });
});

const OK_CODECS = Object.freeze({
  request: (input: unknown) =>
    strictRecord(input, "ok", "boolean") as Readonly<{ ok: boolean }>,
  response: (input: unknown) =>
    strictRecord(input, "ok", "boolean") as Readonly<{ ok: boolean }>,
});

describe("Agent OS v1 negotiation", () => {
  test("registers exactly four families and chooses the highest common minor with sorted features", () => {
    expect(Object.keys(AGENT_OS_V1_PROTOCOL_REGISTRY)).toEqual(FAMILIES);
    for (const family of FAMILIES) {
      const result = negotiateAgentOsV1Handshake(
        offer(family, "client"),
        offer(family, "provider"),
        NOW,
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
        {
          ...baseClient,
          protocol: { ...baseClient.protocol, versions: ["1.99"] },
        },
        provider,
        NOW,
      ),
    ).toEqual({ status: "UPDATE_REQUIRED", reason: "UNKNOWN_VERSION" });
    expect(
      negotiateAgentOsV1Handshake(
        {
          ...baseClient,
          protocol: { ...baseClient.protocol, versions: ["2.0"] },
        },
        provider,
        NOW,
      ),
    ).toEqual({ status: "UPDATE_REQUIRED", reason: "CROSS_MAJOR" });
    expect(
      negotiateAgentOsV1Handshake(
        {
          ...baseClient,
          protocol: { ...baseClient.protocol, versions: ["1.0"] },
        },
        provider,
        NOW,
      ),
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
        NOW,
      ),
    ).toEqual({
      status: "UPDATE_REQUIRED",
      reason: "REQUIRED_FEATURE_MISSING",
    });
  });

  test("fails closed on audience, authority domain, identity, enrollment and clock skew", () => {
    const client = offer("personal-local.v1", "client");
    const provider = offer("personal-local.v1", "provider");
    expect(
      negotiateAgentOsV1Handshake(
        { ...client, peer: { ...client.peer, audience: ["someone-else"] } },
        provider,
        NOW,
      ),
    ).toEqual({ status: "rejected", reason: "AUDIENCE_MISMATCH" });
    expect(
      negotiateAgentOsV1Handshake(
        client,
        {
          ...provider,
          peer: { ...provider.peer, authorityDomain: "authority.other" },
        },
        NOW,
      ),
    ).toEqual({ status: "rejected", reason: "AUTHORITY_DOMAIN_MISMATCH" });
    expect(
      negotiateAgentOsV1Handshake(
        client,
        {
          ...provider,
          peer: { ...provider.peer, workloadId: "workload.other" },
        },
        NOW,
      ),
    ).toEqual({ status: "rejected", reason: "IDENTITY_MISMATCH" });

    const workerClient = {
      ...offer("execution.v1", "client"),
      peer: {
        ...offer("execution.v1", "client").peer,
        role: "worker" as const,
        hostKind: "worker" as const,
        managementMode: "enrolled" as const,
        enrollmentRef: {
          ref: "enrollment:worker-a" as const,
          digest: digest("a"),
        },
      },
    };
    const workerProvider = {
      ...offer("execution.v1", "provider"),
      peer: {
        ...offer("execution.v1", "provider").peer,
        role: "worker" as const,
        hostKind: "worker" as const,
        managementMode: "enrolled" as const,
        enrollmentRef: {
          ref: "enrollment:worker-b" as const,
          digest: digest("b"),
        },
      },
    };
    expect(
      negotiateAgentOsV1Handshake(workerClient, workerProvider, NOW),
    ).toEqual({
      status: "rejected",
      reason: "ENROLLMENT_MISMATCH",
    });
    expect(
      negotiateAgentOsV1Handshake(
        { ...client, issuedAt: "2026-08-05T11:58:00.000Z" },
        provider,
        NOW,
      ),
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
              handle: (payload: Readonly<{ value: string }>) => ({
                echo: payload.value,
              }),
            },
          ],
          NOW,
          ECHO_CODECS,
        );
      const client = createAgentOsV1ReferenceClient<
        typeof protocolId,
        Readonly<{ value: string }>,
        Readonly<{ echo: string }>
      >(protocolId, transport, ECHO_CODECS);
      await expect(
        client.request(
          "invoke",
          authorityEnvelope(),
          snapshot,
          { value: protocolId },
          NOW,
        ),
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
    const client = createAgentOsV1ReferenceClient(
      "execution.v1",
      transport,
      OK_CODECS,
    );
    await expect(
      client.request(
        "invoke",
        { ...authorityEnvelope(), deadline: "2026-08-05T12:00:00.000Z" },
        snapshot,
        { ok: true },
        NOW,
      ),
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
        OK_CODECS,
      ),
    ).rejects.toMatchObject({ code: "PIN_DRIFT" });
    expect(
      resolveAgentOsV1PinnedHandler(
        { revision: 0, handlers: [] },
        activePin(snapshot),
      ),
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
      OK_CODECS,
    );
    await expect(
      forgedClient.request(
        "invoke",
        authorityEnvelope(),
        { ...snapshot, selectedFeatures: ["recover", "recover"] },
        { ok: true },
        NOW,
      ),
    ).rejects.toBeInstanceOf(AgentOsV1ContractError);
    await expect(
      forgedClient.request(
        "invoke",
        authorityEnvelope(),
        { ...snapshot, handlerVersion: "handler-forged" },
        Object.create({ ok: true }),
        NOW,
      ),
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
        OK_CODECS,
      );
      await expect(
        client.request(
          "invoke",
          authorityEnvelope(),
          snapshot,
          { ok: true },
          NOW,
        ),
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
        OK_CODECS,
      ),
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
      }),
    ).toEqual({ status: "UPDATE_REQUIRED", reason: "HANDLER_PINNED" });
    expect(
      planAgentOsV1HandlerTransition(initial, [], {
        action: "unload",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      }),
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
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      planAgentOsV1HandlerTransition(initial, new Array(1), {
        action: "unload",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      planAgentOsV1HandlerTransition(initial, [pin, pin], {
        action: "unload",
        protocolId: "execution.v1",
        handlerVersion: snapshot.handlerVersion,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      resolveAgentOsV1PinnedHandler(initial, {
        ...pin,
        selectedVersion: "2.0",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      planAgentOsV1HandlerTransition(
        { ...initial, revision: Number.MAX_SAFE_INTEGER },
        [],
        {
          action: "drain",
          protocolId: "execution.v1",
          handlerVersion: snapshot.handlerVersion,
        },
      ),
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
        }),
      ).toEqual({ status: "accepted", state: to });
    }
    expect(
      planAgentOsV1PersonalTransition({
        from: "ManagedOffline",
        to: "ManagedOnline",
        authorityDomainChanged: false,
        renewRemoteAuthority: true,
        autoRecover: false,
      }),
    ).toEqual({ status: "rejected", reason: "REMOTE_RENEWAL_DENIED" });
    expect(
      planAgentOsV1PersonalTransition({
        from: "Revoked",
        to: "ManagedOnline",
        authorityDomainChanged: false,
        renewRemoteAuthority: false,
        autoRecover: true,
      }),
    ).toEqual({ status: "rejected", reason: "REVOKED_AUTO_RECOVERY_DENIED" });
    expect(
      planAgentOsV1PersonalTransition({
        from: "ManagedOnline",
        to: "ManagedOnline",
        authorityDomainChanged: true,
        renewRemoteAuthority: false,
        autoRecover: false,
      }),
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
      }),
    ).toEqual({ status: "rejected", reason: "INVALID_TRANSITION" });
    expect(() =>
      planAgentOsV1PersonalTransition({
        authorityDomainChanged: true,
        renewRemoteAuthority: false,
        autoRecover: false,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      planAgentOsV1PersonalTransition({
        from: "ManagedOffline",
        to: "ManagedOnline",
        authorityDomainChanged: false,
        renewRemoteAuthority: "false",
        autoRecover: false,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(
      planAgentOsV1PersonalTransition({
        from: "Revoked",
        to: "ManagedOnline",
        authorityDomainChanged: true,
        renewRemoteAuthority: false,
        autoRecover: false,
      }),
    ).toEqual({ status: "rejected", reason: "INVALID_TRANSITION" });
  });
});
