import type {
  AgentDefinition,
  AgentDeployment,
  AgentOsV1Contract,
  CapabilityPackageDescriptor,
  CanonicalAgentOsV1Contract,
  ExecutionGrant,
  ExecutionInstance,
  HostProfile,
  RunSpec,
} from "./agent-os-v1-types.js";

export type {
  AgentDefinition,
  AgentDeployment,
  AgentOsV1Contract,
  CapabilityPackageDescriptor,
  CanonicalAgentOsV1Contract,
  ExecutionGrant,
  ExecutionInstance,
  HostProfile,
  RunSpec,
} from "./agent-os-v1-types.js";

export const AGENT_OS_V1_SUPPORTED_FEATURES = Object.freeze([
  "capability-packages",
  "delegation-grants",
]);

const SUPPORTED_FEATURES = new Set<string>(AGENT_OS_V1_SUPPORTED_FEATURES);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const SECRET_REF_PATTERN = /^secret-ref:[a-z0-9][a-z0-9._/-]{0,127}$/u;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._/-]{0,127}$/u;
const RFC3339_MILLIS_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u;

/**
 * 供空仓 consumer 和 gate 使用的机器可读声明。运行时判定仍由
 * parseAgentOsV1Contract 的严格解析完成，避免不同 JSON Schema validator 的宽松差异。
 */
export const AGENT_OS_V1_CONTRACT_SCHEMA = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://morpheus.dev/schemas/agent-os/v1/contract.json",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "features",
    "agentDefinition",
    "hostProfile",
    "agentDeployment",
    "executionInstance",
    "runSpec",
    "executionGrant",
  ],
  properties: {
    schemaVersion: { const: "agent-os/v1" },
    features: { $ref: "#/$defs/features" },
    agentDefinition: { $ref: "#/$defs/agentDefinition" },
    hostProfile: { $ref: "#/$defs/hostProfile" },
    agentDeployment: { $ref: "#/$defs/agentDeployment" },
    executionInstance: { $ref: "#/$defs/executionInstance" },
    runSpec: { $ref: "#/$defs/runSpec" },
    executionGrant: { $ref: "#/$defs/executionGrant" },
  },
  $defs: {
    identifier: { type: "string", pattern: "^[a-z][a-z0-9._/-]{0,127}$" },
    version: { type: "string", pattern: "^1\\.[0-9]+$" },
    digest: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
    instant: {
      type: "string",
      format: "date-time",
      pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$",
    },
    identifiers: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { $ref: "#/$defs/identifier" },
    },
    features: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { enum: AGENT_OS_V1_SUPPORTED_FEATURES },
    },
    capabilityPackage: {
      type: "object",
      additionalProperties: false,
      required: [
        "packageId",
        "version",
        "digest",
        "provenance",
        "signer",
        "trust",
        "revocation",
        "disabled",
        "transport",
        "features",
        "secretRefs",
        "environment",
      ],
      properties: {
        packageId: { $ref: "#/$defs/identifier" },
        version: { const: "1.0" },
        digest: { $ref: "#/$defs/digest" },
        provenance: {
          type: "object",
          additionalProperties: false,
          required: ["repository", "revision"],
          properties: {
            repository: { $ref: "#/$defs/identifier" },
            revision: { $ref: "#/$defs/identifier" },
          },
        },
        signer: {
          type: "object",
          additionalProperties: false,
          required: ["keyId", "subject", "algorithm"],
          properties: {
            keyId: { $ref: "#/$defs/identifier" },
            subject: { $ref: "#/$defs/identifier" },
            algorithm: { const: "ed25519" },
          },
        },
        trust: {
          type: "object",
          additionalProperties: false,
          required: ["domain", "state"],
          properties: { domain: { $ref: "#/$defs/identifier" }, state: { const: "trusted" } },
        },
        revocation: {
          type: "object",
          additionalProperties: false,
          required: ["generation", "state"],
          properties: {
            generation: { type: "integer", minimum: 0, maximum: 9007199254740991 },
            state: { const: "active" },
          },
        },
        disabled: { const: false },
        transport: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "reference"],
          properties: {
            kind: { enum: ["mcp", "skill", "plugin", "provider-adapter"] },
            reference: { $ref: "#/$defs/identifier" },
          },
        },
        features: { $ref: "#/$defs/features" },
        secretRefs: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { type: "string", pattern: "^secret-ref:[a-z0-9][a-z0-9._/-]{0,127}$" },
        },
        environment: {
          type: "object",
          additionalProperties: false,
          required: ["operatingSystems", "architectures", "network"],
          properties: {
            operatingSystems: { $ref: "#/$defs/identifiers" },
            architectures: { $ref: "#/$defs/identifiers" },
            network: { enum: ["none", "egress-restricted"] },
          },
        },
      },
    },
    agentDefinition: {
      type: "object",
      additionalProperties: false,
      required: ["agentId", "version", "capabilityPackage", "requestedScopes"],
      properties: {
        agentId: { $ref: "#/$defs/identifier" },
        version: { $ref: "#/$defs/version" },
        capabilityPackage: { $ref: "#/$defs/capabilityPackage" },
        requestedScopes: { $ref: "#/$defs/identifiers" },
      },
    },
    hostProfile: {
      type: "object",
      additionalProperties: false,
      required: [
        "hostId",
        "hostKind",
        "managementMode",
        "role",
        "authorityDomain",
        "capabilityCeiling",
        "supportedFeatures",
      ],
      properties: {
        hostId: { $ref: "#/$defs/identifier" },
        hostKind: { enum: ["worker", "personal"] },
        managementMode: { enum: ["standalone", "enrolled"] },
        role: { enum: ["worker", "control", "personal"] },
        authorityDomain: { $ref: "#/$defs/identifier" },
        capabilityCeiling: { $ref: "#/$defs/identifiers" },
        supportedFeatures: { $ref: "#/$defs/features" },
      },
    },
    agentDeployment: {
      type: "object",
      additionalProperties: false,
      required: ["deploymentId", "target", "agentId", "agentVersion", "hostId", "capabilityDigest"],
      properties: {
        deploymentId: { $ref: "#/$defs/identifier" },
        target: { enum: ["worker", "control", "personal"] },
        agentId: { $ref: "#/$defs/identifier" },
        agentVersion: { $ref: "#/$defs/version" },
        hostId: { $ref: "#/$defs/identifier" },
        capabilityDigest: { $ref: "#/$defs/digest" },
      },
    },
    executionInstance: {
      type: "object",
      additionalProperties: false,
      required: ["instanceId", "deploymentId", "hostId", "generation"],
      properties: {
        instanceId: { $ref: "#/$defs/identifier" },
        deploymentId: { $ref: "#/$defs/identifier" },
        hostId: { $ref: "#/$defs/identifier" },
        generation: { type: "integer", minimum: 0, maximum: 9007199254740991 },
      },
    },
    runSpec: {
      type: "object",
      additionalProperties: false,
      required: ["runId", "deploymentId", "capabilityScopes", "requiredFeatures"],
      properties: {
        runId: { $ref: "#/$defs/identifier" },
        deploymentId: { $ref: "#/$defs/identifier" },
        capabilityScopes: { $ref: "#/$defs/identifiers" },
        requiredFeatures: { $ref: "#/$defs/features" },
      },
    },
    executionGrant: {
      type: "object",
      additionalProperties: false,
      required: [
        "grantId",
        "kind",
        "issuer",
        "audience",
        "authorityDomain",
        "hostId",
        "deploymentId",
        "runId",
        "capabilityDigest",
        "scope",
        "notBefore",
        "expiresAt",
      ],
      properties: {
        grantId: { $ref: "#/$defs/identifier" },
        kind: { enum: ["local", "remote", "delegated"] },
        issuer: { $ref: "#/$defs/identifier" },
        audience: { $ref: "#/$defs/identifiers" },
        authorityDomain: { $ref: "#/$defs/identifier" },
        hostId: { $ref: "#/$defs/identifier" },
        deploymentId: { $ref: "#/$defs/identifier" },
        runId: { $ref: "#/$defs/identifier" },
        capabilityDigest: { $ref: "#/$defs/digest" },
        scope: { $ref: "#/$defs/identifiers" },
        notBefore: { $ref: "#/$defs/instant" },
        expiresAt: { $ref: "#/$defs/instant" },
      },
    },
  },
});

export class AgentOsV1ContractError extends Error {
  constructor(
    readonly code:
      | "INVALID_SHAPE"
      | "UNKNOWN_FIELD"
      | "INVALID_VALUE"
      | "UNSUPPORTED_VERSION"
      | "UNSUPPORTED_FEATURE"
      | "DRIFT_DETECTED"
      | "GRANT_EXPANSION",
    message: string
  ) {
    super(message);
    this.name = "AgentOsV1ContractError";
  }
}

/** 解析、交叉校验、规范化并深度冻结唯一的 Greenfield v1 合约。 */
export function parseAgentOsV1Contract(input: unknown): CanonicalAgentOsV1Contract {
  const root = record(input, "contract");
  exact(
    root,
    [
      "schemaVersion",
      "features",
      "agentDefinition",
      "hostProfile",
      "agentDeployment",
      "executionInstance",
      "runSpec",
      "executionGrant",
    ],
    "contract"
  );
  if (root.schemaVersion !== "agent-os/v1") {
    fail("UNSUPPORTED_VERSION", "schemaVersion must equal agent-os/v1");
  }

  const features = featuresOf(root.features, "features");
  const agentDefinition = agentDefinitionOf(root.agentDefinition);
  const hostProfile = hostProfileOf(root.hostProfile);
  const agentDeployment = agentDeploymentOf(root.agentDeployment);
  const executionInstance = executionInstanceOf(root.executionInstance);
  const runSpec = runSpecOf(root.runSpec);
  const executionGrant = executionGrantOf(root.executionGrant);

  validateRelationships({
    features,
    agentDefinition,
    hostProfile,
    agentDeployment,
    executionInstance,
    runSpec,
    executionGrant,
  });

  const canonical = {
    schemaVersion: "agent-os/v1" as const,
    features,
    agentDefinition,
    hostProfile,
    agentDeployment,
    executionInstance,
    runSpec,
    executionGrant,
  } satisfies AgentOsV1Contract;
  const canonicalSource = canonicalAgentOsV1Source(canonical);
  return deepFreeze({ ...canonical, canonicalSource });
}

/** 将已验证合约转换为稳定的、按键排序的 JSON 源数据。 */
export function canonicalAgentOsV1Source(contract: AgentOsV1Contract): string {
  return canonicalJson(contract);
}

/** 生成 capability package descriptor 的内容地址，不接受调用方自报的 digest。 */
export function createCapabilityPackageDescriptorDigest(
  descriptor: Omit<CapabilityPackageDescriptor, "digest">
): string {
  return `sha256:${sha256Hex(canonicalJson(descriptor))}`;
}

function agentDefinitionOf(value: unknown): AgentDefinition {
  const input = record(value, "agentDefinition");
  exact(input, ["agentId", "version", "capabilityPackage", "requestedScopes"], "agentDefinition");
  return {
    agentId: identifier(input.agentId, "agentDefinition.agentId"),
    version: version(input.version, "agentDefinition.version"),
    capabilityPackage: capabilityPackageOf(input.capabilityPackage),
    requestedScopes: scopes(input.requestedScopes, "agentDefinition.requestedScopes"),
  };
}

function capabilityPackageOf(value: unknown): CapabilityPackageDescriptor {
  const input = record(value, "agentDefinition.capabilityPackage");
  exact(
    input,
    [
      "packageId",
      "version",
      "digest",
      "provenance",
      "signer",
      "trust",
      "revocation",
      "disabled",
      "transport",
      "features",
      "secretRefs",
      "environment",
    ],
    "agentDefinition.capabilityPackage"
  );
  if (input.version !== "1.0")
    fail("UNSUPPORTED_VERSION", "capability package version must equal 1.0");
  if (input.disabled !== false) fail("DRIFT_DETECTED", "disabled capability packages are rejected");
  const provenance = record(input.provenance, "capabilityPackage.provenance");
  exact(provenance, ["repository", "revision"], "capabilityPackage.provenance");
  const signer = record(input.signer, "capabilityPackage.signer");
  exact(signer, ["keyId", "subject", "algorithm"], "capabilityPackage.signer");
  if (signer.algorithm !== "ed25519")
    fail("INVALID_VALUE", "capabilityPackage.signer.algorithm is unsupported");
  const trust = record(input.trust, "capabilityPackage.trust");
  exact(trust, ["domain", "state"], "capabilityPackage.trust");
  if (trust.state !== "trusted") fail("DRIFT_DETECTED", "untrusted capability package is rejected");
  const revocation = record(input.revocation, "capabilityPackage.revocation");
  exact(revocation, ["generation", "state"], "capabilityPackage.revocation");
  if (revocation.state !== "active")
    fail("DRIFT_DETECTED", "revoked capability package is rejected");
  const transport = record(input.transport, "capabilityPackage.transport");
  exact(transport, ["kind", "reference"], "capabilityPackage.transport");
  if (
    transport.kind !== "mcp" &&
    transport.kind !== "skill" &&
    transport.kind !== "plugin" &&
    transport.kind !== "provider-adapter"
  ) {
    fail("INVALID_VALUE", "capabilityPackage.transport.kind is invalid");
  }
  const environment = record(input.environment, "capabilityPackage.environment");
  exact(
    environment,
    ["operatingSystems", "architectures", "network"],
    "capabilityPackage.environment"
  );
  if (environment.network !== "none" && environment.network !== "egress-restricted") {
    fail("INVALID_VALUE", "capabilityPackage.environment.network is invalid");
  }
  const result: CapabilityPackageDescriptor = {
    packageId: identifier(input.packageId, "capabilityPackage.packageId"),
    version: "1.0",
    digest: digest(input.digest, "capabilityPackage.digest"),
    provenance: {
      repository: identifier(provenance.repository, "capabilityPackage.provenance.repository"),
      revision: identifier(provenance.revision, "capabilityPackage.provenance.revision"),
    },
    signer: {
      keyId: identifier(signer.keyId, "capabilityPackage.signer.keyId"),
      subject: identifier(signer.subject, "capabilityPackage.signer.subject"),
      algorithm: "ed25519",
    },
    trust: { domain: identifier(trust.domain, "capabilityPackage.trust.domain"), state: "trusted" },
    revocation: {
      generation: nonNegativeInteger(
        revocation.generation,
        "capabilityPackage.revocation.generation"
      ),
      state: "active",
    },
    disabled: false,
    transport: {
      kind: transport.kind,
      reference: identifier(transport.reference, "capabilityPackage.transport.reference"),
    },
    features: featuresOf(input.features, "capabilityPackage.features"),
    secretRefs: strings(input.secretRefs, "capabilityPackage.secretRefs", SECRET_REF_PATTERN),
    environment: {
      operatingSystems: strings(
        environment.operatingSystems,
        "capabilityPackage.environment.operatingSystems",
        IDENTIFIER_PATTERN
      ),
      architectures: strings(
        environment.architectures,
        "capabilityPackage.environment.architectures",
        IDENTIFIER_PATTERN
      ),
      network: environment.network,
    },
  };
  const expected = createCapabilityPackageDescriptorDigest(withoutDigest(result));
  if (result.digest !== expected)
    fail("DRIFT_DETECTED", "capability package digest does not match pinned data");
  return result;
}

function hostProfileOf(value: unknown): HostProfile {
  const input = record(value, "hostProfile");
  exact(
    input,
    [
      "hostId",
      "hostKind",
      "managementMode",
      "role",
      "authorityDomain",
      "capabilityCeiling",
      "supportedFeatures",
    ],
    "hostProfile"
  );
  if (input.hostKind !== "worker" && input.hostKind !== "personal")
    fail("INVALID_VALUE", "hostKind is invalid");
  if (input.managementMode !== "standalone" && input.managementMode !== "enrolled")
    fail("INVALID_VALUE", "managementMode is invalid");
  if (input.role !== "worker" && input.role !== "control" && input.role !== "personal")
    fail("INVALID_VALUE", "hostProfile.role is invalid");
  return {
    hostId: identifier(input.hostId, "hostProfile.hostId"),
    hostKind: input.hostKind,
    managementMode: input.managementMode,
    role: input.role,
    authorityDomain: identifier(input.authorityDomain, "hostProfile.authorityDomain"),
    capabilityCeiling: scopes(input.capabilityCeiling, "hostProfile.capabilityCeiling"),
    supportedFeatures: featuresOf(input.supportedFeatures, "hostProfile.supportedFeatures"),
  };
}

function agentDeploymentOf(value: unknown): AgentDeployment {
  const input = record(value, "agentDeployment");
  exact(
    input,
    ["deploymentId", "target", "agentId", "agentVersion", "hostId", "capabilityDigest"],
    "agentDeployment"
  );
  if (input.target !== "worker" && input.target !== "control" && input.target !== "personal")
    fail("INVALID_VALUE", "agentDeployment.target is invalid");
  return {
    deploymentId: identifier(input.deploymentId, "agentDeployment.deploymentId"),
    target: input.target,
    agentId: identifier(input.agentId, "agentDeployment.agentId"),
    agentVersion: version(input.agentVersion, "agentDeployment.agentVersion"),
    hostId: identifier(input.hostId, "agentDeployment.hostId"),
    capabilityDigest: digest(input.capabilityDigest, "agentDeployment.capabilityDigest"),
  };
}

function executionInstanceOf(value: unknown): ExecutionInstance {
  const input = record(value, "executionInstance");
  exact(input, ["instanceId", "deploymentId", "hostId", "generation"], "executionInstance");
  return {
    instanceId: identifier(input.instanceId, "executionInstance.instanceId"),
    deploymentId: identifier(input.deploymentId, "executionInstance.deploymentId"),
    hostId: identifier(input.hostId, "executionInstance.hostId"),
    generation: nonNegativeInteger(input.generation, "executionInstance.generation"),
  };
}

function runSpecOf(value: unknown): RunSpec {
  const input = record(value, "runSpec");
  exact(input, ["runId", "deploymentId", "capabilityScopes", "requiredFeatures"], "runSpec");
  return {
    runId: identifier(input.runId, "runSpec.runId"),
    deploymentId: identifier(input.deploymentId, "runSpec.deploymentId"),
    capabilityScopes: scopes(input.capabilityScopes, "runSpec.capabilityScopes"),
    requiredFeatures: featuresOf(input.requiredFeatures, "runSpec.requiredFeatures"),
  };
}

function executionGrantOf(value: unknown): ExecutionGrant {
  const input = record(value, "executionGrant");
  exact(
    input,
    [
      "grantId",
      "kind",
      "issuer",
      "audience",
      "authorityDomain",
      "hostId",
      "deploymentId",
      "runId",
      "capabilityDigest",
      "scope",
      "notBefore",
      "expiresAt",
    ],
    "executionGrant"
  );
  if (input.kind !== "local" && input.kind !== "remote" && input.kind !== "delegated")
    fail("INVALID_VALUE", "executionGrant.kind is invalid");
  const notBefore = instant(input.notBefore, "executionGrant.notBefore");
  const expiresAt = instant(input.expiresAt, "executionGrant.expiresAt");
  if (notBefore >= expiresAt) fail("INVALID_VALUE", "executionGrant must expire after notBefore");
  return {
    grantId: identifier(input.grantId, "executionGrant.grantId"),
    kind: input.kind,
    issuer: identifier(input.issuer, "executionGrant.issuer"),
    audience: strings(input.audience, "executionGrant.audience", IDENTIFIER_PATTERN),
    authorityDomain: identifier(input.authorityDomain, "executionGrant.authorityDomain"),
    hostId: identifier(input.hostId, "executionGrant.hostId"),
    deploymentId: identifier(input.deploymentId, "executionGrant.deploymentId"),
    runId: identifier(input.runId, "executionGrant.runId"),
    capabilityDigest: digest(input.capabilityDigest, "executionGrant.capabilityDigest"),
    scope: scopes(input.scope, "executionGrant.scope"),
    notBefore,
    expiresAt,
  };
}

function validateRelationships(value: Omit<AgentOsV1Contract, "schemaVersion">): void {
  const {
    agentDefinition,
    hostProfile,
    agentDeployment,
    executionInstance,
    runSpec,
    executionGrant,
  } = value;
  if (
    agentDeployment.agentId !== agentDefinition.agentId ||
    agentDeployment.agentVersion !== agentDefinition.version
  )
    fail("DRIFT_DETECTED", "deployment does not pin the agent definition");
  if (agentDeployment.capabilityDigest !== agentDefinition.capabilityPackage.digest)
    fail("DRIFT_DETECTED", "deployment capability digest drifted");
  if (
    agentDeployment.hostId !== hostProfile.hostId ||
    executionInstance.hostId !== hostProfile.hostId
  )
    fail("DRIFT_DETECTED", "deployment and instance must pin the host");
  if (
    executionInstance.deploymentId !== agentDeployment.deploymentId ||
    runSpec.deploymentId !== agentDeployment.deploymentId
  )
    fail("DRIFT_DETECTED", "instance and run must pin the deployment");
  if (
    executionGrant.hostId !== hostProfile.hostId ||
    executionGrant.deploymentId !== agentDeployment.deploymentId ||
    executionGrant.runId !== runSpec.runId
  )
    fail("DRIFT_DETECTED", "grant does not pin the execution tuple");
  if (
    executionGrant.capabilityDigest !== agentDefinition.capabilityPackage.digest ||
    executionGrant.authorityDomain !== hostProfile.authorityDomain
  )
    fail("DRIFT_DETECTED", "grant identity pins drifted");
  if (agentDeployment.target !== hostProfile.role)
    fail("INVALID_VALUE", "deployment target must equal host role");
  if (hostProfile.hostKind === "worker") {
    if (
      hostProfile.managementMode !== "enrolled" ||
      (hostProfile.role !== "worker" && hostProfile.role !== "control")
    )
      fail("INVALID_VALUE", "worker hosts must be enrolled Worker or Control profiles");
    if (executionGrant.kind === "local")
      fail("INVALID_VALUE", "Worker and Control grants must be remotely issued");
  } else {
    if (hostProfile.role !== "personal")
      fail("INVALID_VALUE", "personal hosts must use the personal role");
    if (
      (hostProfile.managementMode === "standalone" && executionGrant.kind !== "local") ||
      (hostProfile.managementMode === "enrolled" && executionGrant.kind === "local")
    )
      fail("INVALID_VALUE", "Personal grant kind must match management mode");
  }
  if (executionGrant.audience.length !== 1 || executionGrant.audience[0] !== hostProfile.hostId)
    fail("GRANT_EXPANSION", "grant audience must narrow to exactly one execution host");
  narrow(executionGrant.scope, runSpec.capabilityScopes, "grant scope exceeds the run scope");
  narrow(
    runSpec.capabilityScopes,
    agentDefinition.requestedScopes,
    "run scope exceeds the agent definition"
  );
  if (hostProfile.hostKind === "personal")
    narrow(
      executionGrant.scope,
      hostProfile.capabilityCeiling,
      "Personal grant exceeds local capability ceiling"
    );
  narrow(runSpec.requiredFeatures, value.features, "run requires unavailable contract features");
  narrow(
    runSpec.requiredFeatures,
    hostProfile.supportedFeatures,
    "run requires unsupported host features"
  );
  narrow(
    runSpec.requiredFeatures,
    agentDefinition.capabilityPackage.features,
    "run requires unavailable package features"
  );
}

function withoutDigest(
  descriptor: CapabilityPackageDescriptor
): Omit<CapabilityPackageDescriptor, "digest"> {
  const { digest: _digest, ...unsigned } = descriptor;
  return unsigned;
}

function narrow(actual: readonly string[], ceiling: readonly string[], message: string): void {
  if (actual.some((entry) => !ceiling.includes(entry))) fail("GRANT_EXPANSION", message);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable || !("value" in descriptor) || descriptor.get || descriptor.set)
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data field`);
  }
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !(key in value))
  )
    fail("UNKNOWN_FIELD", `${label} contains unknown or missing fields`);
}

function strings(value: unknown, label: string, pattern: RegExp): readonly string[] {
  const values = arrayValues(value, label);
  const normalized: string[] = [];
  for (const entry of values) {
    if (typeof entry !== "string" || !pattern.test(entry))
      fail("INVALID_VALUE", `${label} contains an invalid value`);
    normalized.push(entry);
  }
  normalized.sort();
  if (normalized.length === 0 || new Set(normalized).size !== normalized.length)
    fail("INVALID_VALUE", `${label} must be a non-empty unique array`);
  return normalized;
}

function arrayValues(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  if (Object.getOwnPropertySymbols(value).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (key === "length") continue;
    if (
      !/^(?:0|[1-9][0-9]*)$/u.test(key) ||
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get ||
      descriptor.set
    )
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data item`);
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor))
      fail("INVALID_SHAPE", `${label} must not contain holes`);
    result.push(descriptor.value);
  }
  return result;
}

function scopes(value: unknown, label: string): readonly string[] {
  return strings(value, label, IDENTIFIER_PATTERN);
}

function featuresOf(value: unknown, label: string): readonly string[] {
  const result = strings(value, label, IDENTIFIER_PATTERN);
  if (result.some((feature) => !SUPPORTED_FEATURES.has(feature)))
    fail("UNSUPPORTED_FEATURE", `${label} contains an unsupported feature`);
  return result;
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function version(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^1\.[0-9]+$/u.test(value))
    fail("UNSUPPORTED_VERSION", `${label} is unsupported`);
  return value;
}

function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a sha256 digest`);
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    fail("INVALID_VALUE", `${label} must be a non-negative safe integer`);
  return value;
}

function instant(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !RFC3339_MILLIS_PATTERN.test(value) ||
    new Date(value).toISOString() !== value
  )
    fail("INVALID_VALUE", `${label} must be a canonical RFC3339 millisecond instant`);
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail("INVALID_VALUE", "canonical source cannot contain non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const input = record(value, "canonical source");
    return `{${Object.keys(input)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`)
      .join(",")}}`;
  }
  fail("INVALID_VALUE", "canonical source contains an unsupported value");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function fail(code: AgentOsV1ContractError["code"], message: string): never {
  throw new AgentOsV1ContractError(code, message);
}

function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLength = BigInt(bytes.length) * 8n;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  for (let index = 0; index < 8; index += 1)
    data[paddedLength - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 0xffn);
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const constants = SHA256_CONSTANTS;
  for (let offset = 0; offset < data.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1)
      words[index] =
        (data[offset + index * 4]! << 24) |
        (data[offset + index * 4 + 1]! << 16) |
        (data[offset + index * 4 + 2]! << 8) |
        data[offset + index * 4 + 3]!;
    for (let index = 16; index < 64; index += 1)
      words[index] =
        (small1(words[index - 2]!) +
          words[index - 7]! +
          small0(words[index - 15]!) +
          words[index - 16]!) >>>
        0;
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const temporary1 =
        (h! + big1(e!) + choose(e!, f!, g!) + constants[index]! + words[index]!) >>> 0;
      const temporary2 = (big0(a!) + majority(a!, b!, c!)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d! + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    state[0] = (state[0]! + a!) >>> 0;
    state[1] = (state[1]! + b!) >>> 0;
    state[2] = (state[2]! + c!) >>> 0;
    state[3] = (state[3]! + d!) >>> 0;
    state[4] = (state[4]! + e!) >>> 0;
    state[5] = (state[5]! + f!) >>> 0;
    state[6] = (state[6]! + g!) >>> 0;
    state[7] = (state[7]! + h!) >>> 0;
  }
  return [...state].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function rotate(value: number, by: number): number {
  return (value >>> by) | (value << (32 - by));
}
function choose(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}
function majority(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}
function big0(x: number): number {
  return rotate(x, 2) ^ rotate(x, 13) ^ rotate(x, 22);
}
function big1(x: number): number {
  return rotate(x, 6) ^ rotate(x, 11) ^ rotate(x, 25);
}
function small0(x: number): number {
  return rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3);
}
function small1(x: number): number {
  return rotate(x, 17) ^ rotate(x, 19) ^ (x >>> 10);
}

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;
