import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  AGENT_OS_V1_CONTRACT_SCHEMA,
  AgentOsV1ContractError,
  createCapabilityPackageDescriptorDigest,
  parseAgentOsV1Contract,
} from "../src/agent-os-v1-contract.js";
import type { AgentOsV1Contract, CapabilityPackageDescriptor } from "../src/agent-os-v1-types.js";
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

function fixture(
  target: "worker" | "control" | "personal" = "worker",
  managementMode: "standalone" | "enrolled" = "enrolled",
  transportKind: CapabilityPackageDescriptor["transport"]["kind"] = "plugin"
): AgentOsV1Contract {
  const hostKind = target === "personal" ? "personal" : "worker";
  const grantKind = target === "personal" && managementMode === "standalone" ? "local" : "remote";
  const packageDescriptor = capabilityPackage(transportKind);
  return {
    schemaVersion: "agent-os/v1",
    features: ["capability-packages", "delegation-grants"],
    agentDefinition: {
      agentId: "agent.demo",
      version: "1.0",
      capabilityPackage: packageDescriptor,
      requestedScopes: ["workspace.read"],
    },
    hostProfile: {
      hostId: "host.demo",
      hostKind,
      managementMode,
      role: target,
      authorityDomain: "authority.demo",
      capabilityCeiling: ["workspace.read"],
      supportedFeatures: ["capability-packages", "delegation-grants"],
    },
    agentDeployment: {
      deploymentId: "deployment.demo",
      target,
      agentId: "agent.demo",
      agentVersion: "1.0",
      hostId: "host.demo",
      capabilityDigest: packageDescriptor.digest,
    },
    executionInstance: {
      instanceId: "instance.demo",
      deploymentId: "deployment.demo",
      hostId: "host.demo",
      generation: 1,
    },
    runSpec: {
      runId: "run.demo",
      deploymentId: "deployment.demo",
      capabilityScopes: ["workspace.read"],
      requiredFeatures: ["capability-packages", "delegation-grants"],
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
      capabilityDigest: packageDescriptor.digest,
      scope: ["workspace.read"],
      notBefore: "2026-08-05T00:00:00.000Z",
      expiresAt: "2026-08-05T00:05:00.000Z",
    },
  };
}

function copy(value: AgentOsV1Contract): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
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
    expect(AGENT_OS_V1_CONTRACT_SCHEMA.$defs.executionGrant.required).toContain("scope");
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

  test("returns canonical deeply immutable source data", () => {
    const parsed = parseAgentOsV1Contract(fixture());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.agentDefinition.capabilityPackage.environment)).toBe(true);
    expect(Object.isFrozen(parsed.executionGrant.scope)).toBe(true);
    expect(parsed.canonicalSource).toBe(parseAgentOsV1Contract(fixture()).canonicalSource);
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

  test("fails closed on remote/delegated scope or audience expansion and Personal ceiling expansion", () => {
    const scope = copy(fixture());
    (scope.executionGrant as Record<string, unknown>).scope = ["workspace.read", "workspace.write"];
    expectReject(scope);
    const audience = copy(fixture());
    (audience.executionGrant as Record<string, unknown>).audience = ["host.demo", "host.other"];
    expectReject(audience);
    const personal = copy(fixture("personal", "enrolled"));
    (personal.executionGrant as Record<string, unknown>).scope = ["workspace.write"];
    (personal.runSpec as Record<string, unknown>).capabilityScopes = ["workspace.write"];
    (personal.agentDefinition as Record<string, unknown>).requestedScopes = ["workspace.write"];
    expectReject(personal);
  });
});
