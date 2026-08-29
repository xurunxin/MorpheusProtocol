import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  AGENT_OS_V1_CONTRACT_SCHEMA,
  AgentOsV1ContractError,
  canonicalAgentOsV1Source,
  assertAgentOsV1CanonicalPromptSemanticBinding,
  createAgentOsV1CanonicalPromptSemanticBinding,
  createAgentDefinitionDigest,
  createCapabilityPackageDescriptorDigest,
  classifyAgentOsV1PersonalState,
  createAgentOsV1CanonicalPromptCursor,
  createAgentOsV1CanonicalPromptEvent,
  createAgentOsV1CanonicalPromptSnapshot,
  parseAgentOsV1ActiveRunPin,
  parseAgentOsV1ActiveRunPins,
  parseAgentOsV1AuthorityRequestEnvelope,
  parseAgentOsV1CanonicalPromptStartRequest,
  parseAgentOsV1CanonicalPromptCursor,
  parseAgentOsV1CanonicalPromptCancelRequest,
  parseAgentOsV1CanonicalPromptEvent,
  parseAgentOsV1CanonicalPromptReadRequest,
  parseAgentOsV1CanonicalPromptResponse,
  parseAgentOsV1CanonicalPromptSnapshot,
  parseAgentOsV1Contract,
  parseAgentOsV1ExecutionClaimBinding,
  parseAgentOsV1ExecutionGrant,
  parseAgentOsV1ExecutionInstance,
  parseAgentOsV1HandlerCatalogSnapshot,
  parseAgentOsV1HandlerTransitionCommand,
  parseAgentOsV1HandshakeOffer,
  parseAgentOsV1HandshakePeer,
  parseAgentOsV1NegotiatedSnapshot,
  parseAgentOsV1PersonalTransitionCommand,
  parseAgentOsV1ProtocolOffer,
  parseAgentOsV1RemoteLeaseBinding,
  parseAgentOsV1ReferenceRequest,
  parseAgentOsV1ReferenceResponse,
} from "../src/agent-os-v1-contract.js";
import type {
  AgentOsV1Contract,
  CapabilityPackageDescriptor,
  DigestRef,
} from "../src/agent-os-v1-types.js";
import {
  AGENT_OS_V1_SUPPORTED_FEATURES,
  AgentOsV1,
  AgentOsV1ContractError as PackageAgentOsV1ContractError,
  parseAgentOsV1Contract as parseFromPackage,
} from "@xurunxin/morpheus-protocol";

function capabilityPackage(
  transportKind: CapabilityPackageDescriptor["transport"]["kind"] = "plugin",
): CapabilityPackageDescriptor {
  const unsigned = {
    packageId: "pkg.demo",
    version: "1.0" as const,
    provenance: { repository: "repo.demo", revision: "rev.1" },
    signer: {
      keyId: "key.demo",
      subject: "builder.demo",
      algorithm: "ed25519" as const,
    },
    trust: { domain: "trust.demo", state: "trusted" as const },
    revocation: { generation: 1, state: "active" as const },
    disabled: false as const,
    transport: { kind: transportKind, reference: "package.demo" },
    features: ["capability-packages", "delegation-grants"],
    secretRefs: ["secret-ref:provider.demo"],
    environment: {
      operatingSystems: ["linux"],
      architectures: ["x64"],
      network: "none" as const,
    },
  };
  return {
    ...unsigned,
    digest: createCapabilityPackageDescriptorDigest(unsigned),
  };
}

function digest(seed: string): string {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function digestRef(ref: DigestRef["ref"]): DigestRef {
  return { ref, digest: digest(ref) };
}

function fixture(
  target: "worker" | "control" | "personal" = "worker",
  managementMode: "standalone" | "enrolled" = "enrolled",
  transportKind: CapabilityPackageDescriptor["transport"]["kind"] = "plugin",
): AgentOsV1Contract {
  const hostKind = target === "personal" ? "personal" : "worker";
  const grantKind =
    target === "personal" && managementMode === "standalone"
      ? "local"
      : "remote";
  const packageDescriptor = capabilityPackage(transportKind);
  const agentDefinition = {
    agentId: "agent.demo",
    version: "1.0",
    identity: { tenantId: "tenant.demo", workloadId: "workload.demo" },
    capabilityPackage: packageDescriptor,
    requestedScopes: ["workspace.read"],
    skills: [{ id: "skill.demo", packageDigest: packageDescriptor.digest }],
    tools: [{ id: "tool.demo", packageDigest: packageDescriptor.digest }],
    securityPolicy: digestRef("policy:baseline"),
  } satisfies AgentOsV1Contract["agentDefinition"];
  const definitionDigest = createAgentDefinitionDigest(agentDefinition);
  const sessionGrant = {
    grantId: "session-grant.demo",
    principalId: "principal.demo",
    scope: ["workspace.read"],
    notBefore: "2026-08-05T00:00:00.000Z",
    expiresAt: "2026-08-05T00:10:00.000Z",
  };
  const leaseBinding =
    grantKind === "local"
      ? ({ kind: "not_applicable" } as const)
      : {
          kind: "remote" as const,
          leaseId: "lease.demo",
          epoch: "lease-epoch:current" as const,
          generation: 1,
          scope: ["workspace.read"],
          notBefore: "2026-08-05T00:00:00.000Z",
          expiresAt: "2026-08-05T00:10:00.000Z",
        };
  return {
    schemaVersion: "agent-os/v1",
    features: ["capability-packages", "delegation-grants"],
    agentDefinition,
    hostProfile: {
      hostId: "host.demo",
      hostKind,
      managementMode,
      role: target,
      authorityDomain: "authority.demo",
      capabilityCeiling: ["workspace.read"],
      supportedFeatures: ["capability-packages", "delegation-grants"],
      providerCeiling: digestRef("ceiling:provider"),
      workspaceCeiling: digestRef("ceiling:workspace"),
      storageCeiling: digestRef("ceiling:storage"),
      networkCeiling: digestRef("ceiling:network"),
      lifecycleCeiling: digestRef("ceiling:lifecycle"),
    },
    agentDeployment: {
      deploymentId: "deployment.demo",
      target,
      agentId: "agent.demo",
      agentVersion: "1.0",
      hostId: "host.demo",
      capabilityDigest: packageDescriptor.digest,
      desiredState: "active",
      revision: "revision.demo",
      desiredReplicas: 1,
      placementPolicy: digestRef("placement:default"),
      bindings: [],
    },
    executionInstance: {
      instanceId: "instance.demo",
      deploymentId: "deployment.demo",
      hostId: "host.demo",
      generation: 1,
      deploymentRevision: "revision.demo",
      replicaOrdinal: 0,
      observedState: "running",
    },
    runSpec: {
      runId: "run.demo",
      deploymentId: "deployment.demo",
      capabilityScopes: ["workspace.read"],
      requiredFeatures: ["capability-packages", "delegation-grants"],
      definitionDigest,
      policyDigest: agentDefinition.securityPolicy.digest,
      capabilityDigest: packageDescriptor.digest,
    },
    executionGrant: {
      grantId: "grant.demo",
      kind: grantKind,
      issuer: grantKind === "local" ? "host.demo" : "control.demo",
      audience: ["host.demo"],
      authorityDomain: "authority.demo",
      hostId: "host.demo",
      deploymentId: "deployment.demo",
      runId: "run.demo",
      tenantId: "tenant.demo",
      workloadId: "workload.demo",
      attemptId: "attempt.demo",
      instanceId: "instance.demo",
      definitionDigest,
      policyDigest: agentDefinition.securityPolicy.digest,
      capabilityDigest: packageDescriptor.digest,
      keyId: "grant-key.demo",
      rotationGeneration: "rotation:key-current",
      revocationGeneration: "revocation:key-current",
      scope: ["workspace.read"],
      notBefore: "2026-08-05T00:00:00.000Z",
      expiresAt: "2026-08-05T00:05:00.000Z",
      sessionGrant,
      leaseBinding,
    },
  };
}

function copy(value: AgentOsV1Contract): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function rebindDefinitionDigest(value: Record<string, unknown>): void {
  const definition =
    value.agentDefinition as AgentOsV1Contract["agentDefinition"];
  const definitionDigest = createAgentDefinitionDigest(definition);
  (value.runSpec as Record<string, unknown>).definitionDigest =
    definitionDigest;
  (value.executionGrant as Record<string, unknown>).definitionDigest =
    definitionDigest;
}

function expectReject(value: unknown): void {
  expect(() => parseAgentOsV1Contract(value)).toThrow(AgentOsV1ContractError);
}

function canonicalJsonForTest(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(canonicalJsonForTest).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJsonForTest(record[key])}`,
      )
      .join(",")}}`;
  }
  throw new Error("test fixture contains an unsupported value");
}

describe("Greenfield Agent OS v1 contract", () => {
  test("exposes one strict machine schema and parser namespace", () => {
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.additionalProperties).toBe(false);
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.capabilityPackage.additionalProperties,
    ).toBe(false);
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.agentDefinition.required).toEqual(
      expect.arrayContaining(["identity", "skills", "tools", "securityPolicy"]),
    );
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.hostProfile.required).toEqual(
      expect.arrayContaining([
        "providerCeiling",
        "workspaceCeiling",
        "storageCeiling",
        "networkCeiling",
        "lifecycleCeiling",
      ]),
    );
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.leaseBinding.oneOf).toHaveLength(
      2,
    );
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.digestRef.properties.ref.$ref,
    ).toBe("#/$defs/opaqueRef");
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.properties
        .rotationGeneration.$ref,
    ).toBe("#/$defs/rotationGenerationRef");
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.properties
        .revocationGeneration.$ref,
    ).toBe("#/$defs/revocationGenerationRef");
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.remoteLeaseBinding.properties.epoch
        .$ref,
    ).toBe("#/$defs/leaseEpochRef");
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.remoteLeaseBinding.properties.generation
        .type,
    ).toBe("integer");
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.remoteLeaseBinding.properties.generation
        .description,
    ).toContain("not a lease authority generation");
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.required).toContain(
      "scope",
    );
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.required).toEqual(
      expect.arrayContaining([
        "sessionGrant",
        "leaseBinding",
        "attemptId",
        "instanceId",
      ]),
    );
    expect(Object.isFrozen(AGENT_OS_V1_CONTRACT_SCHEMA)).toBe(true);
    expect(Object.isFrozen(AGENT_OS_V1_CONTRACT_SCHEMA.$defs)).toBe(true);
    expect(
      Object.isFrozen(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant),
    ).toBe(true);
    expect(
      Object.isFrozen(
        AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.required,
      ),
    ).toBe(true);
    expect(
      Object.isFrozen(
        AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.properties.kind.enum,
      ),
    ).toBe(true);
    const input = fixture();
    const definition: AgentOsV1.AgentDefinition = input.agentDefinition;
    expect(definition.agentId).toBe("agent.demo");
    expect(
      canonicalAgentOsV1Source(AgentOsV1.parseAgentOsV1Contract(input)),
    ).toBe(canonicalAgentOsV1Source(parseAgentOsV1Contract(input)));
    expect(canonicalAgentOsV1Source(parseFromPackage(input))).toBe(
      canonicalAgentOsV1Source(parseAgentOsV1Contract(input)),
    );
    expect(() => parseFromPackage({})).toThrow(PackageAgentOsV1ContractError);
    expect(() =>
      parseFromPackage({ ...input, digest: digest("mismatch") }),
    ).toThrow(PackageAgentOsV1ContractError);
    expect(AGENT_OS_V1_SUPPORTED_FEATURES).toContain("delegation-grants");
  });

  test("accepts canonical Worker, Control and Personal combinations", () => {
    const worker = parseAgentOsV1Contract(fixture("worker"));
    const control = parseAgentOsV1Contract(fixture("control"));
    const personal = parseAgentOsV1Contract(fixture("personal", "standalone"));
    expect(worker.hostProfile.hostKind).toBe("worker");
    expect(control.hostProfile.role).toBe("control");
    expect(personal.executionGrant.kind).toBe("local");
    expect(
      parseAgentOsV1Contract(fixture("worker", "enrolled", "provider-adapter"))
        .agentDefinition.capabilityPackage.transport.kind,
    ).toBe("provider-adapter");
  });

  test("exposes standalone strict execution authority codecs without changing v1 contract data", () => {
    const contract = parseAgentOsV1Contract(fixture("worker"));
    const source = canonicalAgentOsV1Source(contract);
    const lease = contract.executionGrant.leaseBinding;
    if (lease.kind !== "remote")
      throw new Error("Worker fixture requires a remote lease");

    expect(parseAgentOsV1ExecutionGrant(contract.executionGrant)).toEqual(
      contract.executionGrant,
    );
    expect(parseAgentOsV1ExecutionInstance(contract.executionInstance)).toEqual(
      contract.executionInstance,
    );
    expect(parseAgentOsV1RemoteLeaseBinding(lease)).toEqual(lease);
    expect(
      parseAgentOsV1ExecutionClaimBinding({
        grantId: contract.executionGrant.grantId,
        leaseId: lease.leaseId,
        leaseEpoch: lease.epoch,
        authorityDomain: contract.executionGrant.authorityDomain,
        runId: contract.executionGrant.runId,
        attemptId: contract.executionGrant.attemptId,
        instanceId: contract.executionGrant.instanceId,
        instanceGeneration: contract.executionInstance.generation,
        storeId: "store.demo",
        storeGeneration: 7,
        writerIncarnationId: "writer.demo",
        claimId: "claim.demo",
        claimFence: 3,
        expiresAt: "2026-08-05T00:04:00.000Z",
      }),
    ).toEqual({
      grantId: "grant.demo",
      leaseId: "lease.demo",
      leaseEpoch: "lease-epoch:current",
      authorityDomain: "authority.demo",
      runId: "run.demo",
      attemptId: "attempt.demo",
      instanceId: "instance.demo",
      instanceGeneration: 1,
      storeId: "store.demo",
      storeGeneration: 7,
      writerIncarnationId: "writer.demo",
      claimId: "claim.demo",
      claimFence: 3,
      expiresAt: "2026-08-05T00:04:00.000Z",
    });
    expect(
      canonicalAgentOsV1Source(parseAgentOsV1Contract(fixture("worker"))),
    ).toBe(source);
    expect(
      Object.isFrozen(parseAgentOsV1ExecutionGrant(contract.executionGrant)),
    ).toBe(true);
  });

  test("standalone execution authority codecs reject unknown, sparse and invalid fence values", () => {
    const contract = parseAgentOsV1Contract(fixture("worker"));
    const lease = contract.executionGrant.leaseBinding;
    if (lease.kind !== "remote")
      throw new Error("Worker fixture requires a remote lease");
    const claim = {
      grantId: contract.executionGrant.grantId,
      leaseId: lease.leaseId,
      leaseEpoch: lease.epoch,
      authorityDomain: contract.executionGrant.authorityDomain,
      runId: contract.executionGrant.runId,
      attemptId: contract.executionGrant.attemptId,
      instanceId: contract.executionGrant.instanceId,
      instanceGeneration: contract.executionInstance.generation,
      storeId: "store.demo",
      storeGeneration: 7,
      writerIncarnationId: "writer.demo",
      claimId: "claim.demo",
      claimFence: 3,
      expiresAt: "2026-08-05T00:04:00.000Z",
    };

    expect(() =>
      parseAgentOsV1ExecutionGrant({
        ...contract.executionGrant,
        token: "raw",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1ExecutionGrant({
        ...contract.executionGrant,
        audience: Object.assign(new Array(2), { 1: "host.demo" }),
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1RemoteLeaseBinding({ ...lease, path: "C:\\secret" }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1ExecutionClaimBinding({
        ...claim,
        storeGeneration: 0,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1ExecutionClaimBinding({ ...claim, claimFence: 0 }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1ExecutionClaimBinding({
        ...claim,
        expiresAt: "2026-08-05T00:04:00Z",
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("requires the five public field families while preserving explicit bounded empty arrays", () => {
    const bounded = copy(fixture());
    (bounded.agentDefinition as Record<string, unknown>).skills = [];
    (bounded.agentDefinition as Record<string, unknown>).tools = [];
    (bounded.agentDeployment as Record<string, unknown>).bindings = [];
    rebindDefinitionDigest(bounded);
    const parsed = parseAgentOsV1Contract(bounded);
    expect(parsed.agentDefinition.skills).toEqual([]);
    expect(parsed.agentDefinition.tools).toEqual([]);
    expect(parsed.agentDeployment.bindings).toEqual([]);
    expect(parsed.executionInstance.deploymentRevision).toBe(
      parsed.agentDeployment.revision,
    );
    expect(parsed.executionGrant.tenantId).toBe(
      parsed.agentDefinition.identity.tenantId,
    );
    expect(parsed.executionGrant.definitionDigest).toBe(
      parsed.runSpec.definitionDigest,
    );

    const oldNarrowPayload = copy(fixture());
    delete (oldNarrowPayload.agentDefinition as Record<string, unknown>)
      .identity;
    expectReject(oldNarrowPayload);
  });

  test("normalizes definition collections before deriving a digest", () => {
    const unordered = copy(fixture());
    const definition = unordered.agentDefinition as Record<string, unknown>;
    const packageDigest = fixture().agentDefinition.capabilityPackage.digest;
    definition.requestedScopes = ["workspace.write", "workspace.read"];
    definition.skills = [
      { id: "skill.z", packageDigest },
      { id: "skill.a", packageDigest },
    ];
    definition.tools = [
      { id: "tool.z", packageDigest },
      { id: "tool.a", packageDigest },
    ];

    const normalized = copy(unordered);
    const normalizedDefinition = normalized.agentDefinition as Record<
      string,
      unknown
    >;
    normalizedDefinition.requestedScopes = [
      "workspace.read",
      "workspace.write",
    ];
    normalizedDefinition.skills = [
      { id: "skill.a", packageDigest },
      { id: "skill.z", packageDigest },
    ];
    normalizedDefinition.tools = [
      { id: "tool.a", packageDigest },
      { id: "tool.z", packageDigest },
    ];

    const helperDigest = createAgentDefinitionDigest(
      definition as AgentOsV1Contract["agentDefinition"],
    );
    expect(helperDigest).toBe(
      createAgentDefinitionDigest(
        normalizedDefinition as AgentOsV1Contract["agentDefinition"],
      ),
    );
    (unordered.runSpec as Record<string, unknown>).definitionDigest =
      helperDigest;
    (unordered.executionGrant as Record<string, unknown>).definitionDigest =
      helperDigest;

    const parsed = parseAgentOsV1Contract(unordered);
    expect(parsed.runSpec.definitionDigest).toBe(helperDigest);
    expect(parsed.agentDefinition.requestedScopes).toEqual([
      "workspace.read",
      "workspace.write",
    ]);
    expect(parsed.agentDefinition.skills.map(({ id }) => id)).toEqual([
      "skill.a",
      "skill.z",
    ]);
    expect(parsed.agentDefinition.tools.map(({ id }) => id)).toEqual([
      "tool.a",
      "tool.z",
    ]);
  });

  test("returns canonical deeply immutable source data", () => {
    const parsed = parseAgentOsV1Contract(fixture());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(
      Object.isFrozen(parsed.agentDefinition.capabilityPackage.environment),
    ).toBe(true);
    expect(Object.isFrozen(parsed.executionGrant.scope)).toBe(true);
    expect(parsed.canonicalSource).toBe(
      parseAgentOsV1Contract(fixture()).canonicalSource,
    );
    expect(canonicalAgentOsV1Source(parsed)).toBe(parsed.canonicalSource);
  });

  test("matches an independent standard SHA-256 implementation for descriptor pins", () => {
    const { digest, ...unsigned } = capabilityPackage();
    const expected = `sha256:${createHash("sha256")
      .update(canonicalJsonForTest(unsigned))
      .digest("hex")}`;
    expect(digest).toBe(expected);
  });

  test("rejects unknown fields, runtime mode and old aliases", () => {
    const unknown = copy(fixture());
    unknown.unknown = true;
    expectReject(unknown);
    const runtimeMode = copy(fixture());
    (runtimeMode.agentDefinition as Record<string, unknown>).runtime = {
      mode: "legacy",
    };
    expectReject(runtimeMode);
    const alias = copy(fixture());
    alias.schemaVersion = "v1";
    expectReject(alias);
    const managed = copy(fixture());
    (managed.hostProfile as Record<string, unknown>).hostKind = "managed";
    expectReject(managed);
  });

  test("rejects unsupported versions and features", () => {
    const version = copy(fixture());
    (version.agentDefinition as Record<string, unknown>).version = "2.0";
    expectReject(version);
    const feature = copy(fixture());
    (feature.runSpec as Record<string, unknown>).requiredFeatures = [
      "unknown-feature",
    ];
    expectReject(feature);
  });

  test("rejects holes and accessor-backed array fields", () => {
    const hole = copy(fixture());
    const scopes: string[] = [];
    scopes.length = 1;
    (hole.runSpec as Record<string, unknown>).capabilityScopes = scopes;
    expectReject(hole);
    const accessor = copy(fixture());
    const features = ["capability-packages", "delegation-grants"];
    Object.defineProperty(features, "0", {
      configurable: true,
      enumerable: true,
      get: () => "capability-packages",
    });
    (accessor.runSpec as Record<string, unknown>).requiredFeatures = features;
    expectReject(accessor);
  });

  test("rejects raw secrets, revoked or disabled packages and a forged digest", () => {
    const rawSecret = copy(fixture());
    (rawSecret.agentDefinition as Record<string, unknown>).token = "raw-token";
    expectReject(rawSecret);
    const revoked = copy(fixture());
    (
      (revoked.agentDefinition as Record<string, unknown>)
        .capabilityPackage as Record<string, unknown>
    ).revocation = { generation: 2, state: "revoked" };
    expectReject(revoked);
    const disabled = copy(fixture());
    (
      (disabled.agentDefinition as Record<string, unknown>)
        .capabilityPackage as Record<string, unknown>
    ).disabled = true;
    expectReject(disabled);
    const forged = copy(fixture());
    (
      (forged.agentDefinition as Record<string, unknown>)
        .capabilityPackage as Record<string, unknown>
    ).digest =
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expectReject(forged);
  });

  test("rejects duplicate capability or binding requirements and local path refs", () => {
    const duplicateSkill = copy(fixture());
    const skills = (duplicateSkill.agentDefinition as Record<string, unknown>)
      .skills as Record<string, unknown>[];
    skills.push({ ...skills[0]! });
    expectReject(duplicateSkill);

    const duplicateBinding = copy(fixture());
    (duplicateBinding.agentDeployment as Record<string, unknown>).bindings = [
      {
        bindingId: "binding.demo",
        ref: "binding:demo",
        digest: digest("binding.demo"),
      },
      {
        bindingId: "binding.demo",
        ref: "binding:other",
        digest: digest("binding.other"),
      },
    ];
    expectReject(duplicateBinding);

    for (const ref of [
      "workspace/demo",
      "home/user/repo",
      "workspace\\demo",
      "/workspace/demo",
    ]) {
      const localPath = copy(fixture());
      (localPath.hostProfile as Record<string, unknown>).workspaceCeiling = {
        ref,
        digest: digest("workspace-path"),
      };
      expectReject(localPath);
    }

    const bindingPath = copy(fixture());
    (bindingPath.agentDeployment as Record<string, unknown>).bindings = [
      {
        bindingId: "binding.demo",
        ref: "home/user/repo",
        digest: digest("binding-path"),
      },
    ];
    expectReject(bindingPath);
  });

  test("rejects swapped, missing or malformed opaque key generation refs", () => {
    const swappedRotation = copy(fixture());
    (
      swappedRotation.executionGrant as Record<string, unknown>
    ).rotationGeneration = "revocation:key-current";
    expectReject(swappedRotation);

    const swappedRevocation = copy(fixture());
    (
      swappedRevocation.executionGrant as Record<string, unknown>
    ).revocationGeneration = "rotation:key-current";
    expectReject(swappedRevocation);

    const missingRotation = copy(fixture());
    delete (missingRotation.executionGrant as Record<string, unknown>)
      .rotationGeneration;
    expectReject(missingRotation);

    const malformedRevocation = copy(fixture());
    (
      malformedRevocation.executionGrant as Record<string, unknown>
    ).revocationGeneration = 1;
    expectReject(malformedRevocation);
  });

  test("keeps lease epoch, copied instance generation and key generation domains distinct", () => {
    const parsed = parseAgentOsV1Contract(fixture());
    if (parsed.executionGrant.leaseBinding.kind !== "remote")
      throw new Error("worker fixture must bind a remote lease");
    expect(parsed.executionGrant.leaseBinding.epoch).toBe(
      "lease-epoch:current",
    );
    expect(parsed.executionGrant.leaseBinding.generation).toBe(
      parsed.executionInstance.generation,
    );
    expect(
      parsed.executionGrant.leaseBinding.epoch.startsWith("lease-epoch:"),
    ).toBe(true);
    expect(
      parsed.executionGrant.rotationGeneration.startsWith("rotation:"),
    ).toBe(true);

    const swappedLeaseEpoch = copy(fixture());
    (
      (swappedLeaseEpoch.executionGrant as Record<string, unknown>)
        .leaseBinding as Record<string, unknown>
    ).epoch = "rotation:key-current";
    expectReject(swappedLeaseEpoch);

    const interchangedKeyDomain = copy(fixture());
    (
      interchangedKeyDomain.executionGrant as Record<string, unknown>
    ).rotationGeneration = "lease-epoch:current";
    expectReject(interchangedKeyDomain);
  });

  test("fails closed when grant tuple, scope, time, generation or lease binding drifts", () => {
    const tuple = copy(fixture());
    (tuple.executionGrant as Record<string, unknown>).instanceId =
      "instance.other";
    expectReject(tuple);

    const sessionScope = copy(fixture());
    (
      (sessionScope.executionGrant as Record<string, unknown>)
        .sessionGrant as Record<string, unknown>
    ).scope = ["workspace.write"];
    expectReject(sessionScope);

    const sessionTime = copy(fixture());
    (
      (sessionTime.executionGrant as Record<string, unknown>)
        .sessionGrant as Record<string, unknown>
    ).expiresAt = "2026-08-05T00:03:00.000Z";
    expectReject(sessionTime);

    const generation = copy(fixture());
    (
      (generation.executionGrant as Record<string, unknown>)
        .leaseBinding as Record<string, unknown>
    ).generation = 2;
    expectReject(generation);

    const remoteWithoutLease = copy(fixture());
    (
      remoteWithoutLease.executionGrant as Record<string, unknown>
    ).leaseBinding = {
      kind: "not_applicable",
    };
    expectReject(remoteWithoutLease);

    const localWithRemoteLease = copy(fixture("personal", "standalone"));
    (
      localWithRemoteLease.executionGrant as Record<string, unknown>
    ).leaseBinding = {
      kind: "remote",
      leaseId: "lease.demo",
      epoch: "lease-epoch:current",
      generation: 1,
      scope: ["workspace.read"],
      notBefore: "2026-08-05T00:00:00.000Z",
      expiresAt: "2026-08-05T00:10:00.000Z",
    };
    expectReject(localWithRemoteLease);
  });

  test("fails closed on remote/delegated scope or audience expansion and Personal ceiling expansion", () => {
    const scope = copy(fixture());
    (scope.executionGrant as Record<string, unknown>).scope = [
      "workspace.read",
      "workspace.write",
    ];
    expectReject(scope);
    const audience = copy(fixture());
    (audience.executionGrant as Record<string, unknown>).audience = [
      "host.demo",
      "host.other",
    ];
    expectReject(audience);
    const delegatedScope = copy(fixture());
    (delegatedScope.executionGrant as Record<string, unknown>).kind =
      "delegated";
    (delegatedScope.executionGrant as Record<string, unknown>).scope = [
      "workspace.read",
      "workspace.write",
    ];
    expectReject(delegatedScope);
    const delegatedAudience = copy(fixture());
    (delegatedAudience.executionGrant as Record<string, unknown>).kind =
      "delegated";
    (delegatedAudience.executionGrant as Record<string, unknown>).audience = [
      "host.demo",
      "host.other",
    ];
    expectReject(delegatedAudience);
    const personal = copy(fixture("personal", "enrolled"));
    (personal.executionGrant as Record<string, unknown>).scope = [
      "workspace.write",
    ];
    (personal.runSpec as Record<string, unknown>).capabilityScopes = [
      "workspace.write",
    ];
    (personal.agentDefinition as Record<string, unknown>).requestedScopes = [
      "workspace.write",
    ];
    rebindDefinitionDigest(personal);
    expectReject(personal);
  });
});

describe("Agent OS v1 strict reference DTO codecs", () => {
  const authorityEnvelope = () => ({
    requestId: "request-0001",
    deadline: "2026-08-05T12:00:00.000Z",
    expectedRevision: 7,
    authorityEnvelopeRef: digestRef("authority:request-0001"),
  });

  const protocolOffer = () => ({
    protocolId: "execution.v1",
    versions: ["1.1", "1.0"],
    features: ["recover", "cancel"],
    requiredFeatures: ["recover"],
    schemaVersion: "agent-os/v1",
    handlerVersion: "handler-1.1.0",
  });

  test("canonicalizes and deeply freezes protocol offers, envelopes, catalogs and active pins", () => {
    const offer = parseAgentOsV1ProtocolOffer(protocolOffer());
    expect(offer.versions).toEqual(["1.0", "1.1"]);
    expect(offer.features).toEqual(["cancel", "recover"]);
    expect(Object.isFrozen(offer)).toBe(true);
    expect(Object.isFrozen(offer.versions)).toBe(true);

    const envelope =
      parseAgentOsV1AuthorityRequestEnvelope(authorityEnvelope());
    expect(envelope.expectedRevision).toBe(7);
    expect(Object.isFrozen(envelope.authorityEnvelopeRef)).toBe(true);

    const catalog = parseAgentOsV1HandlerCatalogSnapshot({
      revision: 3,
      handlers: [
        {
          protocolId: "execution.v1",
          handlerVersion: "handler-1.1.0",
          lifecycle: "active",
          operations: ["run", "cancel"],
        },
      ],
    });
    expect(catalog.handlers[0]?.operations).toEqual(["cancel", "run"]);
    expect(Object.isFrozen(catalog.handlers)).toBe(true);

    const pin = parseAgentOsV1ActiveRunPin({
      runId: "run-0001",
      protocolId: "execution.v1",
      selectedVersion: "1.1",
      selectedFeatures: ["recover"],
      schemaVersion: "agent-os/v1",
      handlerVersion: "handler-1.1.0",
    });
    expect(Object.isFrozen(pin.selectedFeatures)).toBe(true);
  });

  test("uses one strict authority for negotiated snapshots, transition commands and reference correlation", () => {
    const snapshot = {
      protocolId: "execution.v1",
      selectedVersion: "1.1",
      selectedFeatures: ["recover"],
      schemaVersion: "agent-os/v1",
      handlerVersion: "handler-1.1.0",
    };
    expect(parseAgentOsV1NegotiatedSnapshot(snapshot)).toEqual(snapshot);
    expect(() =>
      parseAgentOsV1NegotiatedSnapshot({ ...snapshot, selectedVersion: "2.0" }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1NegotiatedSnapshot({
        ...snapshot,
        selectedFeatures: ["recover", "recover"],
      }),
    ).toThrow(AgentOsV1ContractError);

    const pin = { runId: "run-0001", ...snapshot };
    expect(parseAgentOsV1ActiveRunPins([pin])).toEqual([pin]);
    expect(() => parseAgentOsV1ActiveRunPins([pin, pin])).toThrow(
      AgentOsV1ContractError,
    );
    expect(() => parseAgentOsV1ActiveRunPins(new Array(1))).toThrow(
      AgentOsV1ContractError,
    );
    expect(
      parseAgentOsV1HandlerTransitionCommand({
        action: "drain",
        protocolId: "execution.v1",
        handlerVersion: "handler-1.1.0",
      }),
    ).toEqual({
      action: "drain",
      protocolId: "execution.v1",
      handlerVersion: "handler-1.1.0",
    });
    expect(() =>
      parseAgentOsV1HandlerTransitionCommand({
        action: "future",
        protocolId: "execution.v1",
        handlerVersion: "handler-1.1.0",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1PersonalTransitionCommand({
        from: "ManagedOffline",
        to: "ManagedOnline",
        authorityDomainChanged: false,
        renewRemoteAuthority: "false",
        autoRecover: false,
      }),
    ).toThrow(AgentOsV1ContractError);

    const parsePayload = (input: unknown) => {
      if (
        input === null ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).length !== 1 ||
        typeof Reflect.get(input, "value") !== "string"
      )
        throw new AgentOsV1ContractError("INVALID_SHAPE", "payload is invalid");
      return Object.freeze({ value: Reflect.get(input, "value") as string });
    };
    const request = parseAgentOsV1ReferenceRequest(
      {
        protocolId: "execution.v1",
        operation: "invoke",
        envelope: authorityEnvelope(),
        snapshot,
        payload: { value: "request" },
      },
      parsePayload,
    );
    expect(Object.isFrozen(request.payload)).toBe(true);
    expect(
      parseAgentOsV1ReferenceResponse(
        {
          protocolId: "execution.v1",
          requestId: "request-0001",
          status: "ok",
          payload: { value: "response" },
        },
        "execution.v1",
        "request-0001",
        parsePayload,
      ).payload,
    ).toEqual({ value: "response" });
    expect(() =>
      parseAgentOsV1ReferenceResponse(
        {
          protocolId: "control.v1",
          requestId: "request-0001",
          status: "ok",
          payload: { value: "response" },
        },
        "execution.v1",
        "request-0001",
        parsePayload,
      ),
    ).toThrow(AgentOsV1ContractError);
  });

  test("rejects unknown families, malformed versions, missing required features and authority smuggling", () => {
    expect(() =>
      parseAgentOsV1ProtocolOffer({
        ...protocolOffer(),
        protocolId: "runtime.v0",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1ProtocolOffer({ ...protocolOffer(), versions: ["01.1"] }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1ProtocolOffer({
        ...protocolOffer(),
        requiredFeatures: ["artifact"],
      }),
    ).toThrow(AgentOsV1ContractError);
    for (const field of [
      "secret",
      "token",
      "claims",
      "localPath",
      "traceparent",
      "baggage",
    ]) {
      expect(() =>
        parseAgentOsV1AuthorityRequestEnvelope({
          ...authorityEnvelope(),
          [field]: "forbidden",
        }),
      ).toThrow(AgentOsV1ContractError);
    }
    expect(() =>
      parseAgentOsV1AuthorityRequestEnvelope({
        ...authorityEnvelope(),
        deadline: "2026-08-05T12:00:00Z",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1AuthorityRequestEnvelope({
        ...authorityEnvelope(),
        expectedRevision: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("enforces Host identity and keeps Control outside HostKind", () => {
    const control = parseAgentOsV1HandshakePeer({
      peerId: "control-0001",
      role: "control",
      hostKind: null,
      managementMode: null,
      tenantId: "tenant.demo",
      workloadId: "workload.demo",
      authorityDomain: "authority.demo",
      enrollmentRef: null,
      audience: ["worker-0001"],
    });
    expect(control.hostKind).toBeNull();
    expect(() =>
      parseAgentOsV1HandshakePeer({ ...control, hostKind: "worker" }),
    ).toThrow(AgentOsV1ContractError);

    const personal = parseAgentOsV1HandshakePeer({
      peerId: "personal-0001",
      role: "personal",
      hostKind: "personal",
      managementMode: "enrolled",
      tenantId: "tenant.demo",
      workloadId: "workload.demo",
      authorityDomain: "authority.demo",
      enrollmentRef: digestRef("enrollment:personal-0001"),
      audience: ["control-0001"],
    });
    expect(personal.managementMode).toBe("enrolled");
    expect(() =>
      parseAgentOsV1HandshakePeer({ ...personal, enrollmentRef: null }),
    ).toThrow(AgentOsV1ContractError);

    const handshake = parseAgentOsV1HandshakeOffer({
      protocol: protocolOffer(),
      peer: personal,
      issuedAt: "2026-08-05T11:59:59.000Z",
      maxClockSkewMs: 30_000,
    });
    expect(handshake.protocol.protocolId).toBe("execution.v1");
  });

  test("classifies clean, recognized legacy, unknown and corrupt state without fallback", () => {
    expect(
      classifyAgentOsV1PersonalState({
        schemaVersion: "personal-host/v1",
        state: "ManagedOffline",
        authorityDomain: "authority.demo",
        generation: 4,
      }),
    ).toEqual({
      classification: "clean",
      state: {
        schemaVersion: "personal-host/v1",
        state: "ManagedOffline",
        authorityDomain: "authority.demo",
        generation: 4,
      },
      allowedActions: ["serve"],
    });
    expect(
      classifyAgentOsV1PersonalState({ schemaVersion: "personal-host/v0" }),
    ).toEqual({
      classification: "recognized-legacy",
      state: null,
      allowedActions: ["read-only-export", "quarantine", "explicit-reset"],
    });
    expect(
      classifyAgentOsV1PersonalState({ schemaVersion: "foreign/v9" })
        .classification,
    ).toBe("unknown");
    expect(
      classifyAgentOsV1PersonalState({
        schemaVersion: "personal-host/v1",
        state: "ManagedOffline",
        authorityDomain: "authority.demo",
        generation: -1,
      }).classification,
    ).toBe("corrupt");
  });

  test("strictly parses and freezes the canonical prompt.start authority binding", () => {
    const contract = fixture();
    const startDraft = {
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.start",
      runId: contract.executionGrant.runId,
      turnId: "turn.demo",
      attemptId: contract.executionGrant.attemptId,
      instanceId: contract.executionInstance.instanceId,
      storeGeneration: 1,
      claimId: "claim.demo",
      requestedAt: "2026-08-05T00:00:01.000Z",
      authority: {
        tenantId: contract.executionGrant.tenantId,
        workloadId: contract.executionGrant.workloadId,
        authorityDomain: contract.executionGrant.authorityDomain,
        audience: contract.executionGrant.audience,
        definitionDigest: contract.executionGrant.definitionDigest,
        policyDigest: contract.executionGrant.policyDigest,
        capabilityDigest: contract.executionGrant.capabilityDigest,
      },
      grant: contract.executionGrant,
      instance: contract.executionInstance,
      prompt: { messages: [{ role: "user", content: "hello" }] },
    };
    const start = createAgentOsV1CanonicalPromptSemanticBinding({
      requestId: "request-start",
      expectedRevision: 0,
      snapshot: {
        protocolId: "execution.v1",
        selectedVersion: "1.1",
        selectedFeatures: ["recover"],
        schemaVersion: "agent-os/v1",
        handlerVersion: "handler-1.1.0",
      },
      payload: startDraft,
    }).payload;

    const parsed = parseAgentOsV1CanonicalPromptStartRequest(start);
    expect(parsed).toEqual(start);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.prompt.messages)).toBe(true);
    expect(Object.isFrozen(parsed.grant)).toBe(true);

    expect(() =>
      parseAgentOsV1CanonicalPromptStartRequest({
        ...start,
        apiKey: "raw-secret",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1CanonicalPromptStartRequest({
        ...start,
        storeGeneration: 2 ** 53,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1CanonicalPromptStartRequest({
        ...start,
        requestedAt: "2026-08-05T00:00:01Z",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1CanonicalPromptStartRequest({
        ...start,
        prompt: { messages: new Array(1) },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1CanonicalPromptStartRequest({
        ...start,
        prompt: { messages: [{ role: "user", content: "x".repeat(65_537) }] },
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("binds prompt, intent and execution envelope semantics with canonical digests", () => {
    const contract = fixture();
    const snapshot = {
      protocolId: "execution.v1",
      selectedVersion: "1.1",
      selectedFeatures: ["recover"],
      schemaVersion: "agent-os/v1",
      handlerVersion: "handler-1.1.0",
    } as const;
    const draft = {
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.start",
      runId: contract.executionGrant.runId,
      turnId: "turn.semantic",
      attemptId: contract.executionGrant.attemptId,
      instanceId: contract.executionInstance.instanceId,
      storeGeneration: 1,
      claimId: "claim.semantic",
      requestedAt: "2026-08-05T00:00:01.000Z",
      authority: {
        tenantId: contract.executionGrant.tenantId,
        workloadId: contract.executionGrant.workloadId,
        authorityDomain: contract.executionGrant.authorityDomain,
        audience: contract.executionGrant.audience,
        definitionDigest: contract.executionGrant.definitionDigest,
        policyDigest: contract.executionGrant.policyDigest,
        capabilityDigest: contract.executionGrant.capabilityDigest,
      },
      grant: contract.executionGrant,
      instance: contract.executionInstance,
      prompt: { messages: [{ role: "user", content: "semantic hello" }] },
    } as const;
    const bound = createAgentOsV1CanonicalPromptSemanticBinding({
      requestId: "request-semantic",
      expectedRevision: 0,
      snapshot,
      payload: draft,
    });
    const envelope = {
      requestId: "request-semantic",
      deadline: "2026-08-05T00:01:00.000Z",
      expectedRevision: 0,
      authorityEnvelopeRef: bound.authorityEnvelopeRef,
    };

    expect(
      assertAgentOsV1CanonicalPromptSemanticBinding(
        envelope,
        snapshot,
        bound.payload,
      ),
    ).toEqual(bound);
    for (const payload of [
      { ...bound.payload, promptDigest: digest("forged-prompt") },
      { ...bound.payload, intentDigest: digest("forged-intent") },
      {
        ...bound.payload,
        prompt: { messages: [{ role: "user", content: "tampered" }] },
      },
    ]) {
      expect(() =>
        assertAgentOsV1CanonicalPromptSemanticBinding(
          envelope,
          snapshot,
          payload,
        ),
      ).toThrow(AgentOsV1ContractError);
    }
    expect(() =>
      assertAgentOsV1CanonicalPromptSemanticBinding(
        {
          ...envelope,
          authorityEnvelopeRef: {
            ...bound.authorityEnvelopeRef,
            digest: digest("forged-envelope"),
          },
        },
        snapshot,
        bound.payload,
      ),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsV1CanonicalPromptSemanticBinding(
        { ...envelope, authorityEnvelopeRef: digestRef("authority:forged") },
        snapshot,
        bound.payload,
      ),
    ).toThrow(AgentOsV1ContractError);
  });

  test("creates tamper-evident immutable event, cursor and snapshot DTOs", () => {
    const event = createAgentOsV1CanonicalPromptEvent({
      schemaVersion: "agent-os-canonical-prompt/v1",
      eventId: "event.demo.1",
      runId: "run.demo",
      attemptId: "attempt.demo",
      streamEpoch: "stream-epoch:epoch.demo",
      sequence: 1,
      eventType: "provider.usage",
      payload: { inputTokens: 2, outputTokens: 3 },
      createdAt: "2026-08-05T00:00:02.000Z",
    });
    const cursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run.demo",
      streamEpoch: "stream-epoch:epoch.demo",
      sequence: 1,
      watermark: 1,
    });
    const snapshot = createAgentOsV1CanonicalPromptSnapshot({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run.demo",
      attemptId: "attempt.demo",
      instanceId: "instance.demo",
      storeGeneration: 1,
      streamEpoch: "stream-epoch:epoch.demo",
      watermark: 1,
      state: "running",
      terminal: false,
      updatedAt: "2026-08-05T00:00:02.000Z",
    });

    expect(parseAgentOsV1CanonicalPromptEvent(event)).toEqual(event);
    expect(parseAgentOsV1CanonicalPromptCursor(cursor)).toEqual(cursor);
    expect(parseAgentOsV1CanonicalPromptSnapshot(snapshot)).toEqual(snapshot);
    expect(Object.isFrozen(event.payload)).toBe(true);
    expect(Object.isFrozen(cursor)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);

    expect(() =>
      parseAgentOsV1CanonicalPromptEvent({ ...event, sequence: 2 }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1CanonicalPromptCursor({ ...cursor, watermark: 2 }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1CanonicalPromptSnapshot({
        ...snapshot,
        state: "succeeded",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      createAgentOsV1CanonicalPromptEvent({
        ...event,
        digest: undefined,
        payload: { inputTokens: 2, outputTokens: 3, rawUsage: "secret" },
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("strictly correlates prompt.read, prompt.cancel and atomic snapshot-required responses", () => {
    const snapshot = createAgentOsV1CanonicalPromptSnapshot({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run.demo",
      attemptId: "attempt.demo",
      instanceId: "instance.demo",
      storeGeneration: 2,
      streamEpoch: "stream-epoch:epoch.demo",
      watermark: 3,
      state: "running",
      terminal: false,
      updatedAt: "2026-08-05T00:00:03.000Z",
    });
    const cursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run.demo",
      streamEpoch: "stream-epoch:epoch.demo",
      sequence: 3,
      watermark: 3,
    });
    const read = parseAgentOsV1CanonicalPromptReadRequest({
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.read",
      runId: "run.demo",
      cursor,
      limit: 64,
      readAt: "2026-08-05T00:00:04.000Z",
    });
    const cancel = parseAgentOsV1CanonicalPromptCancelRequest({
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.cancel",
      runId: "run.demo",
      claimId: "claim.demo",
      claimFence: 2,
      reason: "user-requested",
      resultDigest: digest("cancelled"),
      cancelledAt: "2026-08-05T00:00:04.000Z",
    });
    const snapshotEvents = [1, 2, 3].map((sequence) =>
      createAgentOsV1CanonicalPromptEvent({
        schemaVersion: "agent-os-canonical-prompt/v1",
        eventId: `event.demo.${sequence}`,
        runId: "run.demo",
        attemptId: "attempt.demo",
        streamEpoch: "stream-epoch:epoch.demo",
        sequence,
        eventType: "provider.output",
        payload: { text: `rebuilt-${sequence}` },
        createdAt: `2026-08-05T00:00:0${sequence}.000Z`,
      }),
    );
    expect(read.cursor).toEqual(cursor);
    expect(cancel.claimFence).toBe(2);
    expect(
      parseAgentOsV1CanonicalPromptResponse({
        schemaVersion: "agent-os-canonical-prompt/v1",
        operation: "prompt.read",
        disposition: "snapshot-required",
        snapshot,
        events: snapshotEvents,
        cursor,
        replayed: false,
      }),
    ).toEqual({
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.read",
      disposition: "snapshot-required",
      snapshot,
      events: snapshotEvents,
      cursor,
      replayed: false,
    });

    const crossRunCursor = createAgentOsV1CanonicalPromptCursor({
      schemaVersion: "agent-os-canonical-prompt/v1",
      runId: "run.other",
      streamEpoch: "stream-epoch:epoch.demo",
      sequence: 3,
      watermark: 3,
    });
    expect(() =>
      parseAgentOsV1CanonicalPromptReadRequest({
        ...read,
        cursor: crossRunCursor,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1CanonicalPromptCancelRequest({
        ...cancel,
        claimFence: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1CanonicalPromptResponse({
        schemaVersion: "agent-os-canonical-prompt/v1",
        operation: "prompt.read",
        disposition: "snapshot-required",
        snapshot,
        events: snapshotEvents.slice(1),
        cursor,
        replayed: false,
      }),
    ).toThrow(AgentOsV1ContractError);
  });
});
