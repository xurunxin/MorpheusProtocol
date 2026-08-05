import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  AGENT_OS_V1_CONTRACT_SCHEMA,
  AgentOsV1ContractError,
  canonicalAgentOsV1Source,
  createAgentDefinitionDigest,
  createCapabilityPackageDescriptorDigest,
  parseAgentOsV1Contract,
} from "../src/agent-os-v1-contract.js";
import type {
  AgentOsV1Contract,
  CapabilityPackageDescriptor,
  DigestRef,
} from "../src/agent-os-v1-types.js";
import {
  AGENT_OS_V1_SUPPORTED_FEATURES,
  AgentOsV1,
  parseAgentOsV1Contract as parseFromPackage,
} from "@morpheus/api-protocol";

function capabilityPackage(
  transportKind: CapabilityPackageDescriptor["transport"]["kind"] = "plugin"
): CapabilityPackageDescriptor {
  const unsigned = {
    packageId: "pkg.demo",
    version: "1.0" as const,
    provenance: { repository: "repo.demo", revision: "rev.1" },
    signer: { keyId: "key.demo", subject: "builder.demo", algorithm: "ed25519" as const },
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
  return { ...unsigned, digest: createCapabilityPackageDescriptorDigest(unsigned) };
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
  transportKind: CapabilityPackageDescriptor["transport"]["kind"] = "plugin"
): AgentOsV1Contract {
  const hostKind = target === "personal" ? "personal" : "worker";
  const grantKind = target === "personal" && managementMode === "standalone" ? "local" : "remote";
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
          instanceGeneration: 1,
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
  const definition = value.agentDefinition as AgentOsV1Contract["agentDefinition"];
  const definitionDigest = createAgentDefinitionDigest(definition);
  (value.runSpec as Record<string, unknown>).definitionDigest = definitionDigest;
  (value.executionGrant as Record<string, unknown>).definitionDigest = definitionDigest;
}

function expectReject(value: unknown): void {
  expect(() => parseAgentOsV1Contract(value)).toThrow(AgentOsV1ContractError);
}

function canonicalJsonForTest(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJsonForTest).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJsonForTest(record[key])}`)
      .join(",")}}`;
  }
  throw new Error("test fixture contains an unsupported value");
}

describe("Greenfield Agent OS v1 contract", () => {
  test("exposes one strict machine schema and parser namespace", () => {
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema"
    );
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.additionalProperties).toBe(false);
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.capabilityPackage.additionalProperties).toBe(false);
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.agentDefinition.required).toEqual(
      expect.arrayContaining(["identity", "skills", "tools", "securityPolicy"])
    );
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.hostProfile.required).toEqual(
      expect.arrayContaining([
        "providerCeiling",
        "workspaceCeiling",
        "storageCeiling",
        "networkCeiling",
        "lifecycleCeiling",
      ])
    );
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.leaseBinding.oneOf).toHaveLength(2);
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.digestRef.properties.ref.$ref).toBe(
      "#/$defs/opaqueRef"
    );
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.properties.rotationGeneration.$ref
    ).toBe("#/$defs/rotationGenerationRef");
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.properties.revocationGeneration.$ref
    ).toBe("#/$defs/revocationGenerationRef");
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.remoteLeaseBinding.properties.epoch.$ref).toBe(
      "#/$defs/leaseEpochRef"
    );
    expect(
      AGENT_OS_V1_CONTRACT_SCHEMA.$defs.remoteLeaseBinding.properties.instanceGeneration.type
    ).toBe("integer");
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.required).toContain("scope");
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.required).toEqual(
      expect.arrayContaining(["sessionGrant", "leaseBinding", "attemptId", "instanceId"])
    );
    expect(Object.isFrozen(AGENT_OS_V1_CONTRACT_SCHEMA)).toBe(true);
    expect(Object.isFrozen(AGENT_OS_V1_CONTRACT_SCHEMA.$defs)).toBe(true);
    expect(Object.isFrozen(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant)).toBe(true);
    expect(Object.isFrozen(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.required)).toBe(true);
    expect(
      Object.isFrozen(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.properties.kind.enum)
    ).toBe(true);
    const definition: AgentOsV1.AgentDefinition = fixture().agentDefinition;
    expect(definition.agentId).toBe("agent.demo");
    expect(AgentOsV1.parseAgentOsV1Contract).toBe(parseAgentOsV1Contract);
    expect(parseFromPackage).toBe(parseAgentOsV1Contract);
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
      parseAgentOsV1Contract(fixture("worker", "enrolled", "provider-adapter")).agentDefinition
        .capabilityPackage.transport.kind
    ).toBe("provider-adapter");
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
    expect(parsed.executionInstance.deploymentRevision).toBe(parsed.agentDeployment.revision);
    expect(parsed.executionGrant.tenantId).toBe(parsed.agentDefinition.identity.tenantId);
    expect(parsed.executionGrant.definitionDigest).toBe(parsed.runSpec.definitionDigest);

    const oldNarrowPayload = copy(fixture());
    delete (oldNarrowPayload.agentDefinition as Record<string, unknown>).identity;
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
    const normalizedDefinition = normalized.agentDefinition as Record<string, unknown>;
    normalizedDefinition.requestedScopes = ["workspace.read", "workspace.write"];
    normalizedDefinition.skills = [
      { id: "skill.a", packageDigest },
      { id: "skill.z", packageDigest },
    ];
    normalizedDefinition.tools = [
      { id: "tool.a", packageDigest },
      { id: "tool.z", packageDigest },
    ];

    const helperDigest = createAgentDefinitionDigest(
      definition as AgentOsV1Contract["agentDefinition"]
    );
    expect(helperDigest).toBe(
      createAgentDefinitionDigest(normalizedDefinition as AgentOsV1Contract["agentDefinition"])
    );
    (unordered.runSpec as Record<string, unknown>).definitionDigest = helperDigest;
    (unordered.executionGrant as Record<string, unknown>).definitionDigest = helperDigest;

    const parsed = parseAgentOsV1Contract(unordered);
    expect(parsed.runSpec.definitionDigest).toBe(helperDigest);
    expect(parsed.agentDefinition.requestedScopes).toEqual(["workspace.read", "workspace.write"]);
    expect(parsed.agentDefinition.skills.map(({ id }) => id)).toEqual(["skill.a", "skill.z"]);
    expect(parsed.agentDefinition.tools.map(({ id }) => id)).toEqual(["tool.a", "tool.z"]);
  });

  test("returns canonical deeply immutable source data", () => {
    const parsed = parseAgentOsV1Contract(fixture());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.agentDefinition.capabilityPackage.environment)).toBe(true);
    expect(Object.isFrozen(parsed.executionGrant.scope)).toBe(true);
    expect(parsed.canonicalSource).toBe(parseAgentOsV1Contract(fixture()).canonicalSource);
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
    (runtimeMode.agentDefinition as Record<string, unknown>).runtime = { mode: "legacy" };
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
    (feature.runSpec as Record<string, unknown>).requiredFeatures = ["unknown-feature"];
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
      (revoked.agentDefinition as Record<string, unknown>).capabilityPackage as Record<
        string,
        unknown
      >
    ).revocation = { generation: 2, state: "revoked" };
    expectReject(revoked);
    const disabled = copy(fixture());
    (
      (disabled.agentDefinition as Record<string, unknown>).capabilityPackage as Record<
        string,
        unknown
      >
    ).disabled = true;
    expectReject(disabled);
    const forged = copy(fixture());
    (
      (forged.agentDefinition as Record<string, unknown>).capabilityPackage as Record<
        string,
        unknown
      >
    ).digest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expectReject(forged);
  });

  test("rejects duplicate capability or binding requirements and local path refs", () => {
    const duplicateSkill = copy(fixture());
    const skills = (duplicateSkill.agentDefinition as Record<string, unknown>).skills as Record<
      string,
      unknown
    >[];
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

    for (const ref of ["workspace/demo", "home/user/repo", "workspace\\demo", "/workspace/demo"]) {
      const localPath = copy(fixture());
      (localPath.hostProfile as Record<string, unknown>).workspaceCeiling = {
        ref,
        digest: digest("workspace-path"),
      };
      expectReject(localPath);
    }

    const bindingPath = copy(fixture());
    (bindingPath.agentDeployment as Record<string, unknown>).bindings = [
      { bindingId: "binding.demo", ref: "home/user/repo", digest: digest("binding-path") },
    ];
    expectReject(bindingPath);
  });

  test("rejects swapped, missing or malformed opaque key generation refs", () => {
    const swappedRotation = copy(fixture());
    (swappedRotation.executionGrant as Record<string, unknown>).rotationGeneration =
      "revocation:key-current";
    expectReject(swappedRotation);

    const swappedRevocation = copy(fixture());
    (swappedRevocation.executionGrant as Record<string, unknown>).revocationGeneration =
      "rotation:key-current";
    expectReject(swappedRevocation);

    const missingRotation = copy(fixture());
    delete (missingRotation.executionGrant as Record<string, unknown>).rotationGeneration;
    expectReject(missingRotation);

    const malformedRevocation = copy(fixture());
    (malformedRevocation.executionGrant as Record<string, unknown>).revocationGeneration = 1;
    expectReject(malformedRevocation);
  });

  test("keeps lease epoch, instance generation and key generation domains distinct", () => {
    const parsed = parseAgentOsV1Contract(fixture());
    if (parsed.executionGrant.leaseBinding.kind !== "remote")
      throw new Error("worker fixture must bind a remote lease");
    expect(parsed.executionGrant.leaseBinding.epoch).toBe("lease-epoch:current");
    expect(parsed.executionGrant.leaseBinding.instanceGeneration).toBe(
      parsed.executionInstance.generation
    );
    expect(parsed.executionGrant.leaseBinding.epoch.startsWith("lease-epoch:")).toBe(true);
    expect(parsed.executionGrant.rotationGeneration.startsWith("rotation:")).toBe(true);

    const swappedLeaseEpoch = copy(fixture());
    (
      (swappedLeaseEpoch.executionGrant as Record<string, unknown>).leaseBinding as Record<
        string,
        unknown
      >
    ).epoch = "rotation:key-current";
    expectReject(swappedLeaseEpoch);

    const interchangedKeyDomain = copy(fixture());
    (interchangedKeyDomain.executionGrant as Record<string, unknown>).rotationGeneration =
      "lease-epoch:current";
    expectReject(interchangedKeyDomain);
  });

  test("fails closed when grant tuple, scope, time, generation or lease binding drifts", () => {
    const tuple = copy(fixture());
    (tuple.executionGrant as Record<string, unknown>).instanceId = "instance.other";
    expectReject(tuple);

    const sessionScope = copy(fixture());
    (
      (sessionScope.executionGrant as Record<string, unknown>).sessionGrant as Record<
        string,
        unknown
      >
    ).scope = ["workspace.write"];
    expectReject(sessionScope);

    const sessionTime = copy(fixture());
    (
      (sessionTime.executionGrant as Record<string, unknown>).sessionGrant as Record<
        string,
        unknown
      >
    ).expiresAt = "2026-08-05T00:03:00.000Z";
    expectReject(sessionTime);

    const generation = copy(fixture());
    (
      (generation.executionGrant as Record<string, unknown>).leaseBinding as Record<string, unknown>
    ).instanceGeneration = 2;
    expectReject(generation);

    const remoteWithoutLease = copy(fixture());
    (remoteWithoutLease.executionGrant as Record<string, unknown>).leaseBinding = {
      kind: "not_applicable",
    };
    expectReject(remoteWithoutLease);

    const localWithRemoteLease = copy(fixture("personal", "standalone"));
    (localWithRemoteLease.executionGrant as Record<string, unknown>).leaseBinding = {
      kind: "remote",
      leaseId: "lease.demo",
      epoch: "lease-epoch:current",
      instanceGeneration: 1,
      scope: ["workspace.read"],
      notBefore: "2026-08-05T00:00:00.000Z",
      expiresAt: "2026-08-05T00:10:00.000Z",
    };
    expectReject(localWithRemoteLease);
  });

  test("fails closed on remote/delegated scope or audience expansion and Personal ceiling expansion", () => {
    const scope = copy(fixture());
    (scope.executionGrant as Record<string, unknown>).scope = ["workspace.read", "workspace.write"];
    expectReject(scope);
    const audience = copy(fixture());
    (audience.executionGrant as Record<string, unknown>).audience = ["host.demo", "host.other"];
    expectReject(audience);
    const delegatedScope = copy(fixture());
    (delegatedScope.executionGrant as Record<string, unknown>).kind = "delegated";
    (delegatedScope.executionGrant as Record<string, unknown>).scope = [
      "workspace.read",
      "workspace.write",
    ];
    expectReject(delegatedScope);
    const delegatedAudience = copy(fixture());
    (delegatedAudience.executionGrant as Record<string, unknown>).kind = "delegated";
    (delegatedAudience.executionGrant as Record<string, unknown>).audience = [
      "host.demo",
      "host.other",
    ];
    expectReject(delegatedAudience);
    const personal = copy(fixture("personal", "enrolled"));
    (personal.executionGrant as Record<string, unknown>).scope = ["workspace.write"];
    (personal.runSpec as Record<string, unknown>).capabilityScopes = ["workspace.write"];
    (personal.agentDefinition as Record<string, unknown>).requestedScopes = ["workspace.write"];
    rebindDefinitionDigest(personal);
    expectReject(personal);
  });
});
