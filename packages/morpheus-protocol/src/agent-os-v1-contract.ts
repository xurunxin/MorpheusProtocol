import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import type {
  AgentDefinition,
  AgentDeployment,
  AgentOsV1Contract,
  AgentOsV1ActiveRunPin,
  AgentOsV1AuthorityRequestEnvelope,
  AgentOsV1CanonicalPromptStartRequest,
  AgentOsV1CanonicalPromptCursor,
  AgentOsV1CanonicalPromptCancelRequest,
  AgentOsV1CanonicalPromptEvent,
  AgentOsV1CanonicalPromptEventPayload,
  AgentOsV1CanonicalPromptEventType,
  AgentOsV1CanonicalPromptInput,
  AgentOsV1CanonicalPromptSnapshot,
  AgentOsV1CanonicalPromptState,
  AgentOsV1CanonicalPromptStreamEpoch,
  AgentOsV1CanonicalPromptReadRequest,
  AgentOsV1CanonicalPromptRequest,
  AgentOsV1CanonicalPromptResponse,
  AgentOsV1AppCompatibility,
  AgentOsV1AppLifecycleState,
  AgentOsV1AppProjectionPage,
  AgentOsV1AuthorityEpoch,
  AgentOsV1DestructiveCommandConfirmation,
  AgentOsV1DestructiveCommandIntent,
  AgentOsV1DestructiveCommandReceipt,
  AgentOsV1DestructiveCommandRejection,
  AgentOsV1DestructiveCommandRisk,
  AgentOsV1DestructiveCommandStepUpProof,
  AgentOsV1DestructiveCommandSubmission,
  AgentOsV1TerminalExitCode,
  AgentOsV1TerminalFrame,
  AgentOsV1TerminalStatus,
  AgentOsV1HandlerCatalogEntry,
  AgentOsV1HandlerCatalogSnapshot,
  AgentOsV1HandlerTransitionCommand,
  AgentOsV1HandshakeOffer,
  AgentOsV1HandshakePeer,
  AgentOsV1NegotiatedSnapshot,
  AgentOsV1PeerRole,
  AgentOsV1PersonalTransitionCommand,
  AgentOsV1PersonalStateClassification,
  AgentOsV1PersonalStateProbe,
  AgentOsV1ProtocolFamily,
  AgentOsV1ProtocolOffer,
  AgentOsV1ProtocolVersion,
  AgentOsV1ReferenceRequest,
  AgentOsV1ReferenceResponse,
  CapabilityRequirement,
  CapabilityPackageDescriptor,
  CanonicalAgentOsV1Contract,
  DeploymentBinding,
  DeploymentDesiredState,
  DigestRef,
  ExecutionClaimBinding,
  ExecutionGrant,
  ExecutionInstance,
  ExecutionObservedState,
  HostProfile,
  HostKind,
  LeaseEpochRef,
  LeaseBinding,
  ManagementMode,
  OpaqueRef,
  RemoteLeaseBinding,
  RevocationGenerationRef,
  RotationGenerationRef,
  RunSpec,
  SessionGrant,
  PersonalHostState,
} from "./agent-os-v1-types.js";

export type {
  AgentDefinition,
  AgentDeployment,
  AgentOsV1Contract,
  AgentOsV1ActiveRunPin,
  AgentOsV1AuthorityRequestEnvelope,
  AgentOsV1CanonicalPromptStartRequest,
  AgentOsV1CanonicalPromptCursor,
  AgentOsV1CanonicalPromptCancelRequest,
  AgentOsV1CanonicalPromptEvent,
  AgentOsV1CanonicalPromptEventPayload,
  AgentOsV1CanonicalPromptEventType,
  AgentOsV1CanonicalPromptInput,
  AgentOsV1CanonicalPromptSnapshot,
  AgentOsV1CanonicalPromptState,
  AgentOsV1CanonicalPromptStreamEpoch,
  AgentOsV1CanonicalPromptReadRequest,
  AgentOsV1CanonicalPromptRequest,
  AgentOsV1CanonicalPromptResponse,
  AgentOsV1AppCompatibility,
  AgentOsV1AppLifecycleState,
  AgentOsV1AppProjectionPage,
  AgentOsV1AuthorityEpoch,
  AgentOsV1DestructiveCommandConfirmation,
  AgentOsV1DestructiveCommandIntent,
  AgentOsV1DestructiveCommandReceipt,
  AgentOsV1DestructiveCommandRejection,
  AgentOsV1DestructiveCommandRisk,
  AgentOsV1DestructiveCommandStepUpProof,
  AgentOsV1DestructiveCommandSubmission,
  AgentOsV1TerminalExitCode,
  AgentOsV1TerminalFrame,
  AgentOsV1TerminalStatus,
  AgentOsV1HandlerCatalogEntry,
  AgentOsV1HandlerCatalogSnapshot,
  AgentOsV1HandlerTransitionCommand,
  AgentOsV1HandshakeOffer,
  AgentOsV1HandshakePeer,
  AgentOsV1NegotiatedSnapshot,
  AgentOsV1PeerRole,
  AgentOsV1PersonalTransitionCommand,
  AgentOsV1PersonalStateClassification,
  AgentOsV1PersonalStateProbe,
  AgentOsV1ProtocolFamily,
  AgentOsV1ProtocolOffer,
  AgentOsV1ProtocolVersion,
  AgentOsV1ReferenceRequest,
  AgentOsV1ReferenceResponse,
  AgentOsV1RejectionReason,
  AgentOsV1UpdateReason,
  CapabilityRequirement,
  CapabilityPackageDescriptor,
  CanonicalAgentOsV1Contract,
  DeploymentBinding,
  DeploymentDesiredState,
  DigestRef,
  ExecutionClaimBinding,
  ExecutionGrant,
  ExecutionInstance,
  ExecutionObservedState,
  HostProfile,
  HostKind,
  LeaseEpochRef,
  LeaseBinding,
  ManagementMode,
  OpaqueRef,
  RemoteLeaseBinding,
  RevocationGenerationRef,
  RotationGenerationRef,
  RunSpec,
  SessionGrant,
  PersonalHostState,
  PersonalStateClassification,
} from "./agent-os-v1-types.js";

export type {
  AgentOsV1CanonicalPromptAuthorityBinding,
  AgentOsV1CanonicalPromptMessage,
} from "./agent-os-v1-types.js";

export const AGENT_OS_V1_SUPPORTED_FEATURES = Object.freeze([
  "capability-packages",
  "delegation-grants",
]);

const SUPPORTED_FEATURES = new Set<string>(AGENT_OS_V1_SUPPORTED_FEATURES);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const ZERO_SHA256 = `sha256:${"0".repeat(64)}`;
const SECRET_REF_PATTERN = /^secret-ref:[a-z0-9][a-z0-9._/-]{0,127}$/u;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._/-]{0,127}$/u;
const OPAQUE_REF_PATTERN = /^[a-z][a-z0-9._-]{0,63}:[a-z][a-z0-9._-]{0,127}$/u;
const LEASE_EPOCH_REF_PATTERN = /^lease-epoch:[a-z][a-z0-9._-]{0,127}$/u;
const ROTATION_GENERATION_REF_PATTERN = /^rotation:[a-z][a-z0-9._-]{0,127}$/u;
const REVOCATION_GENERATION_REF_PATTERN =
  /^revocation:[a-z][a-z0-9._-]{0,127}$/u;
const PROMPT_STREAM_EPOCH_PATTERN = /^stream-epoch:[a-z][a-z0-9._-]{0,127}$/u;
const AUTHORITY_EPOCH_PATTERN = /^authority-epoch:[a-z][a-z0-9._-]{0,127}$/u;
const RFC3339_MILLIS_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u;
const PROTOCOL_VERSION_PATTERN = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u;

export const AGENT_OS_V1_PROTOCOL_FAMILIES = Object.freeze([
  "execution.v1",
  "deployment.v1",
  "control.v1",
  "personal-local.v1",
] as const);

export const AGENT_OS_V1_PROTOCOL_REGISTRY = deepFreeze({
  "execution.v1": ["1.0", "1.1"],
  "deployment.v1": ["1.0", "1.1"],
  "control.v1": ["1.0", "1.1"],
  "personal-local.v1": ["1.0", "1.1"],
} satisfies Readonly<
  Record<AgentOsV1ProtocolFamily, readonly AgentOsV1ProtocolVersion[]>
>);

/**
 * 供空仓 consumer 和 gate 使用的机器可读声明。运行时判定仍由
 * parseAgentOsV1Contract 的严格解析完成，避免不同 JSON Schema validator 的宽松差异。
 */
export const AGENT_OS_V1_CONTRACT_SCHEMA = deepFreeze({
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
    opaqueRef: {
      type: "string",
      pattern: "^[a-z][a-z0-9._-]{0,63}:[a-z][a-z0-9._-]{0,127}$",
    },
    leaseEpochRef: {
      type: "string",
      pattern: "^lease-epoch:[a-z][a-z0-9._-]{0,127}$",
    },
    rotationGenerationRef: {
      type: "string",
      pattern: "^rotation:[a-z][a-z0-9._-]{0,127}$",
    },
    revocationGenerationRef: {
      type: "string",
      pattern: "^revocation:[a-z][a-z0-9._-]{0,127}$",
    },
    digestRef: {
      type: "object",
      additionalProperties: false,
      required: ["ref", "digest"],
      properties: {
        ref: { $ref: "#/$defs/opaqueRef" },
        digest: { $ref: "#/$defs/digest" },
      },
    },
    capabilityRequirement: {
      type: "object",
      additionalProperties: false,
      required: ["id", "packageDigest"],
      properties: {
        id: { $ref: "#/$defs/identifier" },
        packageDigest: { $ref: "#/$defs/digest" },
      },
    },
    capabilityRequirements: {
      type: "array",
      uniqueItems: true,
      items: { $ref: "#/$defs/capabilityRequirement" },
    },
    deploymentBinding: {
      type: "object",
      additionalProperties: false,
      required: ["bindingId", "ref", "digest"],
      properties: {
        bindingId: { $ref: "#/$defs/identifier" },
        ref: { $ref: "#/$defs/opaqueRef" },
        digest: { $ref: "#/$defs/digest" },
      },
    },
    deploymentBindings: {
      type: "array",
      uniqueItems: true,
      items: { $ref: "#/$defs/deploymentBinding" },
    },
    agentIdentity: {
      type: "object",
      additionalProperties: false,
      required: ["tenantId", "workloadId"],
      properties: {
        tenantId: { $ref: "#/$defs/identifier" },
        workloadId: { $ref: "#/$defs/identifier" },
      },
    },
    desiredDeploymentState: { enum: ["active", "suspended"] },
    observedInstanceState: {
      enum: ["pending", "running", "stopped", "failed"],
    },
    instant: {
      type: "string",
      format: "date-time",
      pattern:
        "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$",
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
    sessionGrant: {
      type: "object",
      additionalProperties: false,
      required: ["grantId", "principalId", "scope", "notBefore", "expiresAt"],
      properties: {
        grantId: { $ref: "#/$defs/identifier" },
        principalId: { $ref: "#/$defs/identifier" },
        scope: { $ref: "#/$defs/identifiers" },
        notBefore: { $ref: "#/$defs/instant" },
        expiresAt: { $ref: "#/$defs/instant" },
      },
    },
    notApplicableLeaseBinding: {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: { kind: { const: "not_applicable" } },
    },
    remoteLeaseBinding: {
      type: "object",
      additionalProperties: false,
      required: [
        "kind",
        "leaseId",
        "epoch",
        "generation",
        "scope",
        "notBefore",
        "expiresAt",
      ],
      properties: {
        kind: { const: "remote" },
        leaseId: { $ref: "#/$defs/identifier" },
        epoch: { $ref: "#/$defs/leaseEpochRef" },
        generation: {
          type: "integer",
          minimum: 0,
          maximum: 9007199254740991,
          description:
            "Copied ExecutionInstance.generation pin; not a lease authority generation.",
        },
        scope: { $ref: "#/$defs/identifiers" },
        notBefore: { $ref: "#/$defs/instant" },
        expiresAt: { $ref: "#/$defs/instant" },
      },
    },
    leaseBinding: {
      oneOf: [
        { $ref: "#/$defs/notApplicableLeaseBinding" },
        { $ref: "#/$defs/remoteLeaseBinding" },
      ],
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
          properties: {
            domain: { $ref: "#/$defs/identifier" },
            state: { const: "trusted" },
          },
        },
        revocation: {
          type: "object",
          additionalProperties: false,
          required: ["generation", "state"],
          properties: {
            generation: {
              type: "integer",
              minimum: 0,
              maximum: 9007199254740991,
            },
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
          items: {
            type: "string",
            pattern: "^secret-ref:[a-z0-9][a-z0-9._/-]{0,127}$",
          },
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
      required: [
        "agentId",
        "version",
        "identity",
        "capabilityPackage",
        "requestedScopes",
        "skills",
        "tools",
        "securityPolicy",
      ],
      properties: {
        agentId: { $ref: "#/$defs/identifier" },
        version: { $ref: "#/$defs/version" },
        identity: { $ref: "#/$defs/agentIdentity" },
        capabilityPackage: { $ref: "#/$defs/capabilityPackage" },
        requestedScopes: { $ref: "#/$defs/identifiers" },
        skills: { $ref: "#/$defs/capabilityRequirements" },
        tools: { $ref: "#/$defs/capabilityRequirements" },
        securityPolicy: { $ref: "#/$defs/digestRef" },
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
        "providerCeiling",
        "workspaceCeiling",
        "storageCeiling",
        "networkCeiling",
        "lifecycleCeiling",
      ],
      properties: {
        hostId: { $ref: "#/$defs/identifier" },
        hostKind: { enum: ["worker", "personal"] },
        managementMode: { enum: ["standalone", "enrolled"] },
        role: { enum: ["worker", "control", "personal"] },
        authorityDomain: { $ref: "#/$defs/identifier" },
        capabilityCeiling: { $ref: "#/$defs/identifiers" },
        supportedFeatures: { $ref: "#/$defs/features" },
        providerCeiling: { $ref: "#/$defs/digestRef" },
        workspaceCeiling: { $ref: "#/$defs/digestRef" },
        storageCeiling: { $ref: "#/$defs/digestRef" },
        networkCeiling: { $ref: "#/$defs/digestRef" },
        lifecycleCeiling: { $ref: "#/$defs/digestRef" },
      },
    },
    agentDeployment: {
      type: "object",
      additionalProperties: false,
      required: [
        "deploymentId",
        "target",
        "agentId",
        "agentVersion",
        "hostId",
        "capabilityDigest",
        "desiredState",
        "revision",
        "desiredReplicas",
        "placementPolicy",
        "bindings",
      ],
      properties: {
        deploymentId: { $ref: "#/$defs/identifier" },
        target: { enum: ["worker", "control", "personal"] },
        agentId: { $ref: "#/$defs/identifier" },
        agentVersion: { $ref: "#/$defs/version" },
        hostId: { $ref: "#/$defs/identifier" },
        capabilityDigest: { $ref: "#/$defs/digest" },
        desiredState: { $ref: "#/$defs/desiredDeploymentState" },
        revision: { $ref: "#/$defs/identifier" },
        desiredReplicas: {
          type: "integer",
          minimum: 0,
          maximum: 9007199254740991,
        },
        placementPolicy: { $ref: "#/$defs/digestRef" },
        bindings: { $ref: "#/$defs/deploymentBindings" },
      },
    },
    executionInstance: {
      type: "object",
      additionalProperties: false,
      required: [
        "instanceId",
        "deploymentId",
        "hostId",
        "generation",
        "deploymentRevision",
        "replicaOrdinal",
        "observedState",
      ],
      properties: {
        instanceId: { $ref: "#/$defs/identifier" },
        deploymentId: { $ref: "#/$defs/identifier" },
        hostId: { $ref: "#/$defs/identifier" },
        generation: { type: "integer", minimum: 0, maximum: 9007199254740991 },
        deploymentRevision: { $ref: "#/$defs/identifier" },
        replicaOrdinal: {
          type: "integer",
          minimum: 0,
          maximum: 9007199254740991,
        },
        observedState: { $ref: "#/$defs/observedInstanceState" },
      },
    },
    runSpec: {
      type: "object",
      additionalProperties: false,
      required: [
        "runId",
        "deploymentId",
        "capabilityScopes",
        "requiredFeatures",
        "definitionDigest",
        "policyDigest",
        "capabilityDigest",
      ],
      properties: {
        runId: { $ref: "#/$defs/identifier" },
        deploymentId: { $ref: "#/$defs/identifier" },
        capabilityScopes: { $ref: "#/$defs/identifiers" },
        requiredFeatures: { $ref: "#/$defs/features" },
        definitionDigest: { $ref: "#/$defs/digest" },
        policyDigest: { $ref: "#/$defs/digest" },
        capabilityDigest: { $ref: "#/$defs/digest" },
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
        "tenantId",
        "workloadId",
        "attemptId",
        "instanceId",
        "definitionDigest",
        "policyDigest",
        "capabilityDigest",
        "keyId",
        "rotationGeneration",
        "revocationGeneration",
        "scope",
        "notBefore",
        "expiresAt",
        "sessionGrant",
        "leaseBinding",
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
        tenantId: { $ref: "#/$defs/identifier" },
        workloadId: { $ref: "#/$defs/identifier" },
        attemptId: { $ref: "#/$defs/identifier" },
        instanceId: { $ref: "#/$defs/identifier" },
        definitionDigest: { $ref: "#/$defs/digest" },
        policyDigest: { $ref: "#/$defs/digest" },
        capabilityDigest: { $ref: "#/$defs/digest" },
        keyId: { $ref: "#/$defs/identifier" },
        rotationGeneration: { $ref: "#/$defs/rotationGenerationRef" },
        revocationGeneration: { $ref: "#/$defs/revocationGenerationRef" },
        scope: { $ref: "#/$defs/identifiers" },
        notBefore: { $ref: "#/$defs/instant" },
        expiresAt: { $ref: "#/$defs/instant" },
        sessionGrant: { $ref: "#/$defs/sessionGrant" },
        leaseBinding: { $ref: "#/$defs/leaseBinding" },
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
    message: string,
  ) {
    super(message);
    this.name = "AgentOsV1ContractError";
  }
}

/** 解析、交叉校验、规范化并深度冻结 v1 合约。 */
export function parseAgentOsV1Contract(
  input: unknown,
): CanonicalAgentOsV1Contract {
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
    "contract",
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

/** 严格解析既有 ExecutionGrant，供 Host owner 在独立持久化边界复用同一 schema。 */
export function parseAgentOsV1ExecutionGrant(
  input: unknown,
): Readonly<ExecutionGrant> {
  return deepFreeze(executionGrantOf(input));
}

/** 严格解析既有 ExecutionInstance，不引入第二套 placement schema。 */
export function parseAgentOsV1ExecutionInstance(
  input: unknown,
): Readonly<ExecutionInstance> {
  return deepFreeze(executionInstanceOf(input));
}

/** Worker 只接受 remote lease；personal/local 的 not_applicable 不能误入接管路径。 */
export function parseAgentOsV1RemoteLeaseBinding(
  input: unknown,
): Readonly<RemoteLeaseBinding> {
  const lease = leaseBindingOf(input);
  if (lease.kind !== "remote")
    fail("INVALID_VALUE", "executionGrant.leaseBinding must be remote");
  return deepFreeze(lease);
}

/** 解析 Worker 的本地 claim pin；授权关系与陈旧 fence 仍由持久化 owner 校验。 */
export function parseAgentOsV1ExecutionClaimBinding(
  input: unknown,
): Readonly<ExecutionClaimBinding> {
  const value = record(input, "execution claim binding");
  exact(
    value,
    [
      "grantId",
      "leaseId",
      "leaseEpoch",
      "authorityDomain",
      "runId",
      "attemptId",
      "instanceId",
      "instanceGeneration",
      "storeId",
      "storeGeneration",
      "writerIncarnationId",
      "claimId",
      "claimFence",
      "expiresAt",
    ],
    "execution claim binding",
  );
  return deepFreeze({
    grantId: identifier(value.grantId, "execution claim binding grantId"),
    leaseId: identifier(value.leaseId, "execution claim binding leaseId"),
    leaseEpoch: leaseEpochRef(
      value.leaseEpoch,
      "execution claim binding leaseEpoch",
    ),
    authorityDomain: identifier(
      value.authorityDomain,
      "execution claim binding authorityDomain",
    ),
    runId: identifier(value.runId, "execution claim binding runId"),
    attemptId: identifier(value.attemptId, "execution claim binding attemptId"),
    instanceId: identifier(
      value.instanceId,
      "execution claim binding instanceId",
    ),
    instanceGeneration: nonNegativeInteger(
      value.instanceGeneration,
      "execution claim binding instanceGeneration",
    ),
    storeId: identifier(value.storeId, "execution claim binding storeId"),
    storeGeneration: positiveInteger(
      value.storeGeneration,
      "execution claim binding storeGeneration",
    ),
    writerIncarnationId: identifier(
      value.writerIncarnationId,
      "execution claim binding writerIncarnationId",
    ),
    claimId: identifier(value.claimId, "execution claim binding claimId"),
    claimFence: positiveInteger(
      value.claimFence,
      "execution claim binding claimFence",
    ),
    expiresAt: instant(value.expiresAt, "execution claim binding expiresAt"),
  });
}

/** prompt.start 只接收规范化纯数据，并复制/冻结所有 authority-bearing 输入。 */
export function parseAgentOsV1CanonicalPromptStartRequest(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptStartRequest> {
  return parseCanonicalPromptStartRequest(input, true);
}

function parseCanonicalPromptStartRequest(
  input: unknown,
  enforceSemanticDigests: boolean,
): Readonly<AgentOsV1CanonicalPromptStartRequest> {
  const value = record(input, "canonical prompt.start request");
  exact(
    value,
    [
      "schemaVersion",
      "operation",
      "runId",
      "turnId",
      "attemptId",
      "instanceId",
      "storeGeneration",
      "claimId",
      "requestedAt",
      "authority",
      "grant",
      "instance",
      "prompt",
      "promptDigest",
      "intentDigest",
    ],
    "canonical prompt.start request",
  );
  if (value.schemaVersion !== "agent-os-canonical-prompt/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "canonical prompt.start schemaVersion is unsupported",
    );
  if (value.operation !== "prompt.start")
    fail(
      "INVALID_VALUE",
      "canonical prompt.start operation must equal prompt.start",
    );

  const authority = record(value.authority, "canonical prompt.start authority");
  exact(
    authority,
    [
      "tenantId",
      "workloadId",
      "authorityDomain",
      "audience",
      "definitionDigest",
      "policyDigest",
      "capabilityDigest",
    ],
    "canonical prompt.start authority",
  );
  const canonicalPrompt = canonicalPromptInput(value.prompt);

  const parsed: Readonly<AgentOsV1CanonicalPromptStartRequest> = deepFreeze({
    schemaVersion: "agent-os-canonical-prompt/v1",
    operation: "prompt.start",
    runId: identifier(value.runId, "canonical prompt.start runId"),
    turnId: identifier(value.turnId, "canonical prompt.start turnId"),
    attemptId: identifier(value.attemptId, "canonical prompt.start attemptId"),
    instanceId: identifier(
      value.instanceId,
      "canonical prompt.start instanceId",
    ),
    storeGeneration: positiveInteger(
      value.storeGeneration,
      "canonical prompt.start storeGeneration",
    ),
    claimId: identifier(value.claimId, "canonical prompt.start claimId"),
    requestedAt: instant(
      value.requestedAt,
      "canonical prompt.start requestedAt",
    ),
    authority: {
      tenantId: identifier(
        authority.tenantId,
        "canonical prompt.start authority tenantId",
      ),
      workloadId: identifier(
        authority.workloadId,
        "canonical prompt.start authority workloadId",
      ),
      authorityDomain: identifier(
        authority.authorityDomain,
        "canonical prompt.start authority authorityDomain",
      ),
      audience: scopes(
        authority.audience,
        "canonical prompt.start authority audience",
      ),
      definitionDigest: digest(
        authority.definitionDigest,
        "canonical prompt.start authority definitionDigest",
      ),
      policyDigest: digest(
        authority.policyDigest,
        "canonical prompt.start authority policyDigest",
      ),
      capabilityDigest: digest(
        authority.capabilityDigest,
        "canonical prompt.start authority capabilityDigest",
      ),
    },
    grant: parseAgentOsV1ExecutionGrant(value.grant),
    instance: parseAgentOsV1ExecutionInstance(value.instance),
    prompt: canonicalPrompt,
    promptDigest: digest(
      value.promptDigest,
      "canonical prompt.start promptDigest",
    ),
    intentDigest: digest(
      value.intentDigest,
      "canonical prompt.start intentDigest",
    ),
  });
  if (
    enforceSemanticDigests &&
    parsed.promptDigest !== canonicalPromptDigest(parsed.prompt)
  ) {
    fail(
      "DRIFT_DETECTED",
      "canonical prompt.start promptDigest does not match its prompt",
    );
  }
  if (
    enforceSemanticDigests &&
    parsed.intentDigest !== canonicalPromptIntentDigest(parsed)
  ) {
    fail(
      "DRIFT_DETECTED",
      "canonical prompt.start intentDigest does not match its intent",
    );
  }
  return parsed;
}

export interface AgentOsV1CanonicalPromptSemanticBinding {
  readonly payload: Readonly<AgentOsV1CanonicalPromptRequest>;
  readonly authorityEnvelopeRef: Readonly<DigestRef>;
}

/** 为 canonical Prompt 生成唯一的 prompt、intent 与 authority envelope 语义绑定。 */
export function createAgentOsV1CanonicalPromptSemanticBinding(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptSemanticBinding> {
  const value = record(input, "canonical prompt semantic binding");
  exact(
    value,
    ["requestId", "expectedRevision", "snapshot", "payload"],
    "canonical prompt semantic binding",
  );
  const requestId = identifier(
    value.requestId,
    "canonical prompt semantic binding requestId",
  );
  const expectedRevision = nonNegativeInteger(
    value.expectedRevision,
    "canonical prompt semantic binding expectedRevision",
  );
  const snapshot = parseAgentOsV1NegotiatedSnapshot(value.snapshot);
  if (snapshot.protocolId !== "execution.v1") {
    fail(
      "DRIFT_DETECTED",
      "canonical prompt semantic binding requires execution.v1",
    );
  }
  const payloadValue = record(
    value.payload,
    "canonical prompt semantic binding payload",
  );
  let payload: Readonly<AgentOsV1CanonicalPromptRequest>;
  if (payloadValue.operation === "prompt.start") {
    const promptDigest = canonicalPromptDigest(payloadValue.prompt);
    const structural = parseCanonicalPromptStartRequest(
      {
        ...payloadValue,
        promptDigest: payloadValue.promptDigest ?? promptDigest,
        intentDigest: payloadValue.intentDigest ?? ZERO_SHA256,
      },
      false,
    );
    const intentDigest = canonicalPromptIntentDigest({
      ...structural,
      promptDigest,
    });
    if (
      payloadValue.promptDigest !== undefined &&
      structural.promptDigest !== promptDigest
    ) {
      fail(
        "DRIFT_DETECTED",
        "canonical prompt semantic binding promptDigest drifted",
      );
    }
    if (
      payloadValue.intentDigest !== undefined &&
      structural.intentDigest !== intentDigest
    ) {
      fail(
        "DRIFT_DETECTED",
        "canonical prompt semantic binding intentDigest drifted",
      );
    }
    payload = parseCanonicalPromptStartRequest(
      { ...structural, promptDigest, intentDigest },
      true,
    );
  } else {
    payload = parseAgentOsV1CanonicalPromptRequest(payloadValue);
  }
  const authorityEnvelopeRef = deepFreeze({
    ref: opaqueRef(
      `authority:canonical-prompt.${requestId}`,
      "canonical prompt semantic binding authorityEnvelopeRef",
    ),
    digest: canonicalPromptProjectionDigest({
      schemaVersion: "agent-os-canonical-prompt-authority/v1",
      requestId,
      expectedRevision,
      snapshot,
      payload: canonicalPromptAuthoritySubset(payload),
    }),
  });
  return deepFreeze({ payload, authorityEnvelopeRef });
}

export function assertAgentOsV1CanonicalPromptSemanticBinding(
  envelopeInput: unknown,
  snapshotInput: unknown,
  payloadInput: unknown,
): Readonly<AgentOsV1CanonicalPromptSemanticBinding> {
  const envelope = parseAgentOsV1AuthorityRequestEnvelope(envelopeInput);
  const binding = createAgentOsV1CanonicalPromptSemanticBinding({
    requestId: envelope.requestId,
    expectedRevision: envelope.expectedRevision,
    snapshot: snapshotInput,
    payload: payloadInput,
  });
  if (
    envelope.authorityEnvelopeRef.ref !== binding.authorityEnvelopeRef.ref ||
    envelope.authorityEnvelopeRef.digest !== binding.authorityEnvelopeRef.digest
  ) {
    fail(
      "DRIFT_DETECTED",
      "canonical prompt authorityEnvelopeRef does not match the request",
    );
  }
  return binding;
}

export function createAgentOsV1CanonicalPromptEvent(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptEvent> {
  const unsigned = canonicalPromptEventUnsignedOf(input);
  return deepFreeze({
    ...unsigned,
    digest: canonicalPromptProjectionDigest(unsigned),
  });
}

export function parseAgentOsV1CanonicalPromptEvent(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptEvent> {
  const value = record(input, "canonical prompt event");
  exact(
    value,
    [
      "schemaVersion",
      "eventId",
      "runId",
      "attemptId",
      "streamEpoch",
      "sequence",
      "eventType",
      "payload",
      "createdAt",
      "digest",
    ],
    "canonical prompt event",
  );
  const unsigned = canonicalPromptEventUnsignedOf({
    schemaVersion: value.schemaVersion,
    eventId: value.eventId,
    runId: value.runId,
    attemptId: value.attemptId,
    streamEpoch: value.streamEpoch,
    sequence: value.sequence,
    eventType: value.eventType,
    payload: value.payload,
    createdAt: value.createdAt,
  });
  const suppliedDigest = digest(value.digest, "canonical prompt event digest");
  if (suppliedDigest !== canonicalPromptProjectionDigest(unsigned))
    fail(
      "DRIFT_DETECTED",
      "canonical prompt event digest does not match its content",
    );
  return deepFreeze({ ...unsigned, digest: suppliedDigest });
}

export function createAgentOsV1CanonicalPromptCursor(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptCursor> {
  const unsigned = canonicalPromptCursorUnsignedOf(input);
  return deepFreeze({
    ...unsigned,
    digest: canonicalPromptProjectionDigest(unsigned),
  });
}

export function parseAgentOsV1CanonicalPromptCursor(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptCursor> {
  const value = record(input, "canonical prompt cursor");
  exact(
    value,
    [
      "schemaVersion",
      "runId",
      "streamEpoch",
      "sequence",
      "watermark",
      "digest",
    ],
    "canonical prompt cursor",
  );
  const unsigned = canonicalPromptCursorUnsignedOf({
    schemaVersion: value.schemaVersion,
    runId: value.runId,
    streamEpoch: value.streamEpoch,
    sequence: value.sequence,
    watermark: value.watermark,
  });
  const suppliedDigest = digest(value.digest, "canonical prompt cursor digest");
  if (suppliedDigest !== canonicalPromptProjectionDigest(unsigned))
    fail(
      "DRIFT_DETECTED",
      "canonical prompt cursor digest does not match its content",
    );
  return deepFreeze({ ...unsigned, digest: suppliedDigest });
}

export function createAgentOsV1CanonicalPromptSnapshot(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptSnapshot> {
  const unsigned = canonicalPromptSnapshotUnsignedOf(input);
  return deepFreeze({
    ...unsigned,
    digest: canonicalPromptProjectionDigest(unsigned),
  });
}

export function parseAgentOsV1CanonicalPromptSnapshot(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptSnapshot> {
  const value = record(input, "canonical prompt snapshot");
  exact(
    value,
    [
      "schemaVersion",
      "runId",
      "attemptId",
      "instanceId",
      "storeGeneration",
      "streamEpoch",
      "watermark",
      "state",
      "terminal",
      "updatedAt",
      "digest",
    ],
    "canonical prompt snapshot",
  );
  const unsigned = canonicalPromptSnapshotUnsignedOf({
    schemaVersion: value.schemaVersion,
    runId: value.runId,
    attemptId: value.attemptId,
    instanceId: value.instanceId,
    storeGeneration: value.storeGeneration,
    streamEpoch: value.streamEpoch,
    watermark: value.watermark,
    state: value.state,
    terminal: value.terminal,
    updatedAt: value.updatedAt,
  });
  const suppliedDigest = digest(
    value.digest,
    "canonical prompt snapshot digest",
  );
  if (suppliedDigest !== canonicalPromptProjectionDigest(unsigned))
    fail(
      "DRIFT_DETECTED",
      "canonical prompt snapshot digest does not match its content",
    );
  return deepFreeze({ ...unsigned, digest: suppliedDigest });
}

export function parseAgentOsV1CanonicalPromptReadRequest(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptReadRequest> {
  const value = record(input, "canonical prompt.read request");
  exact(
    value,
    ["schemaVersion", "operation", "runId", "cursor", "limit", "readAt"],
    "canonical prompt.read request",
  );
  if (value.schemaVersion !== "agent-os-canonical-prompt/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "canonical prompt.read schemaVersion is unsupported",
    );
  if (value.operation !== "prompt.read")
    fail(
      "INVALID_VALUE",
      "canonical prompt.read operation must equal prompt.read",
    );
  const runId = identifier(value.runId, "canonical prompt.read runId");
  const cursor =
    value.cursor === null
      ? null
      : parseAgentOsV1CanonicalPromptCursor(value.cursor);
  if (cursor !== null && cursor.runId !== runId)
    fail(
      "DRIFT_DETECTED",
      "canonical prompt.read cursor belongs to another Run",
    );
  const limit = positiveInteger(value.limit, "canonical prompt.read limit");
  if (limit > 256)
    fail("INVALID_VALUE", "canonical prompt.read limit exceeds 256 events");
  return deepFreeze({
    schemaVersion: "agent-os-canonical-prompt/v1",
    operation: "prompt.read",
    runId,
    cursor,
    limit,
    readAt: instant(value.readAt, "canonical prompt.read readAt"),
  });
}

export function parseAgentOsV1CanonicalPromptCancelRequest(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptCancelRequest> {
  const value = record(input, "canonical prompt.cancel request");
  exact(
    value,
    [
      "schemaVersion",
      "operation",
      "runId",
      "claimId",
      "claimFence",
      "reason",
      "resultDigest",
      "cancelledAt",
    ],
    "canonical prompt.cancel request",
  );
  if (value.schemaVersion !== "agent-os-canonical-prompt/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "canonical prompt.cancel schemaVersion is unsupported",
    );
  if (value.operation !== "prompt.cancel")
    fail(
      "INVALID_VALUE",
      "canonical prompt.cancel operation must equal prompt.cancel",
    );
  return deepFreeze({
    schemaVersion: "agent-os-canonical-prompt/v1",
    operation: "prompt.cancel",
    runId: identifier(value.runId, "canonical prompt.cancel runId"),
    claimId: identifier(value.claimId, "canonical prompt.cancel claimId"),
    claimFence: positiveInteger(
      value.claimFence,
      "canonical prompt.cancel claimFence",
    ),
    reason: boundedUtf8String(
      value.reason,
      "canonical prompt.cancel reason",
      1_024,
    ),
    resultDigest: digest(
      value.resultDigest,
      "canonical prompt.cancel resultDigest",
    ),
    cancelledAt: instant(
      value.cancelledAt,
      "canonical prompt.cancel cancelledAt",
    ),
  });
}

export function parseAgentOsV1CanonicalPromptRequest(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptRequest> {
  const value = record(input, "canonical prompt request");
  switch (value.operation) {
    case "prompt.start":
      return parseAgentOsV1CanonicalPromptStartRequest(input);
    case "prompt.read":
      return parseAgentOsV1CanonicalPromptReadRequest(input);
    case "prompt.cancel":
      return parseAgentOsV1CanonicalPromptCancelRequest(input);
    default:
      fail("INVALID_VALUE", "canonical prompt request operation is invalid");
  }
}

export function parseAgentOsV1CanonicalPromptResponse(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptResponse> {
  const value = record(input, "canonical prompt response");
  exact(
    value,
    [
      "schemaVersion",
      "operation",
      "disposition",
      "snapshot",
      "events",
      "cursor",
      "replayed",
    ],
    "canonical prompt response",
  );
  if (value.schemaVersion !== "agent-os-canonical-prompt/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "canonical prompt response schemaVersion is unsupported",
    );
  if (
    value.operation !== "prompt.start" &&
    value.operation !== "prompt.read" &&
    value.operation !== "prompt.cancel"
  )
    fail("INVALID_VALUE", "canonical prompt response operation is invalid");
  if (
    value.disposition !== "events" &&
    value.disposition !== "snapshot-required"
  )
    fail("INVALID_VALUE", "canonical prompt response disposition is invalid");
  if (
    value.operation !== "prompt.read" &&
    value.disposition === "snapshot-required"
  )
    fail("INVALID_VALUE", "only prompt.read may require an atomic snapshot");
  const snapshot = parseAgentOsV1CanonicalPromptSnapshot(value.snapshot);
  const cursor = parseAgentOsV1CanonicalPromptCursor(value.cursor);
  const events = arrayValues(
    value.events,
    "canonical prompt response events",
  ).map((event) => parseAgentOsV1CanonicalPromptEvent(event));
  if (events.length > 256)
    fail(
      "INVALID_VALUE",
      "canonical prompt response exceeds the 256-event budget",
    );
  if (
    cursor.runId !== snapshot.runId ||
    cursor.streamEpoch !== snapshot.streamEpoch ||
    cursor.watermark !== snapshot.watermark
  )
    fail(
      "DRIFT_DETECTED",
      "canonical prompt response cursor differs from its snapshot",
    );
  if (
    events.some(
      (event) =>
        event.runId !== snapshot.runId ||
        event.attemptId !== snapshot.attemptId ||
        event.streamEpoch !== snapshot.streamEpoch ||
        event.sequence > snapshot.watermark,
    )
  )
    fail(
      "DRIFT_DETECTED",
      "canonical prompt response event differs from its snapshot",
    );
  if (
    events.some(
      (event, index) =>
        index > 0 && event.sequence !== events[index - 1]!.sequence + 1,
    )
  )
    fail(
      "DRIFT_DETECTED",
      "canonical prompt response events are not contiguous",
    );
  const lastEvent = events.at(-1);
  if (lastEvent !== undefined && lastEvent.sequence !== cursor.sequence)
    fail(
      "DRIFT_DETECTED",
      "canonical prompt response cursor does not follow its last event",
    );
  if (
    value.disposition === "snapshot-required" &&
    (cursor.sequence !== snapshot.watermark ||
      events.length !== snapshot.watermark ||
      (events.length > 0 && events[0]?.sequence !== 1))
  )
    fail(
      "DRIFT_DETECTED",
      "snapshot-required must atomically rebuild every fact through its snapshot watermark",
    );
  return deepFreeze({
    schemaVersion: "agent-os-canonical-prompt/v1",
    operation: value.operation,
    disposition: value.disposition,
    snapshot,
    events,
    cursor,
    replayed: booleanValue(
      value.replayed,
      "canonical prompt response replayed",
    ),
  });
}

export function parseAgentOsV1AppProjectionPage(
  input: unknown,
): Readonly<AgentOsV1AppProjectionPage> {
  const value = record(input, "App projection page");
  exact(
    value,
    [
      "schemaVersion",
      "tenantId",
      "authorityEpoch",
      "lifecycle",
      "compatibility",
      "response",
    ],
    "App projection page",
  );
  if (value.schemaVersion !== "agent-os-app-projection/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "App projection page schemaVersion is unsupported",
    );
  return deepFreeze({
    schemaVersion: "agent-os-app-projection/v1",
    tenantId: identifier(value.tenantId, "App projection page tenantId"),
    authorityEpoch: authorityEpoch(
      value.authorityEpoch,
      "App projection page authorityEpoch",
    ),
    lifecycle: appLifecycle(value.lifecycle, "App projection page lifecycle"),
    compatibility: appCompatibility(
      value.compatibility,
      "App projection page compatibility",
    ),
    response: parseAgentOsV1CanonicalPromptResponse(value.response),
  });
}

/** 解析 owner 提供的 App lifecycle fact；handshake 与 cache 均不得自行推导该状态。 */
export function parseAgentOsV1AppLifecycleState(
  input: unknown,
): AgentOsV1AppLifecycleState {
  return appLifecycle(input, "App lifecycle fact");
}

export function parseAgentOsV1TerminalFrame(
  input: unknown,
): AgentOsV1TerminalFrame {
  const value = record(input, "Terminal JSONL frame");
  if (value.schemaVersion !== "terminal-jsonl.v1")
    fail(
      "UNSUPPORTED_VERSION",
      "Terminal JSONL frame schemaVersion is unsupported",
    );
  const requestId = identifier(
    value.requestId,
    "Terminal JSONL frame requestId",
  );
  const sequence = positiveInteger(
    value.sequence,
    "Terminal JSONL frame sequence",
  );
  const timestamp = instant(value.timestamp, "Terminal JSONL frame timestamp");
  switch (value.kind) {
    case "lifecycle":
      exact(
        value,
        [
          "schemaVersion",
          "requestId",
          "kind",
          "sequence",
          "timestamp",
          "lifecycle",
        ],
        "Terminal lifecycle frame",
      );
      return deepFreeze({
        schemaVersion: "terminal-jsonl.v1",
        requestId,
        kind: "lifecycle",
        sequence,
        timestamp,
        lifecycle: appLifecycle(
          value.lifecycle,
          "Terminal lifecycle frame lifecycle",
        ),
      });
    case "event":
      exact(
        value,
        [
          "schemaVersion",
          "requestId",
          "kind",
          "sequence",
          "timestamp",
          "event",
        ],
        "Terminal event frame",
      );
      return deepFreeze({
        schemaVersion: "terminal-jsonl.v1",
        requestId,
        kind: "event",
        sequence,
        timestamp,
        event: parseAgentOsV1CanonicalPromptEvent(value.event),
      });
    case "error":
      exact(
        value,
        [
          "schemaVersion",
          "requestId",
          "kind",
          "sequence",
          "timestamp",
          "code",
          "message",
          "retryable",
        ],
        "Terminal error frame",
      );
      return deepFreeze({
        schemaVersion: "terminal-jsonl.v1",
        requestId,
        kind: "error",
        sequence,
        timestamp,
        code: identifier(value.code, "Terminal error frame code"),
        message: boundedUtf8String(
          value.message,
          "Terminal error frame message",
          4_096,
        ),
        retryable: booleanValue(
          value.retryable,
          "Terminal error frame retryable",
        ),
      });
    case "terminal": {
      exact(
        value,
        [
          "schemaVersion",
          "requestId",
          "kind",
          "sequence",
          "timestamp",
          "runId",
          "status",
          "exitCode",
        ],
        "Terminal terminal frame",
      );
      const status = terminalStatus(value.status);
      const exitCode = terminalExitCode(value.exitCode, status);
      return deepFreeze({
        schemaVersion: "terminal-jsonl.v1",
        requestId,
        kind: "terminal",
        sequence,
        timestamp,
        runId:
          value.runId === null
            ? null
            : identifier(value.runId, "Terminal terminal frame runId"),
        status,
        exitCode,
      });
    }
    default:
      fail("INVALID_VALUE", "Terminal JSONL frame kind is invalid");
  }
}

export function serializeAgentOsV1TerminalFrame(input: unknown): string {
  return `${JSON.stringify(parseAgentOsV1TerminalFrame(input))}\n`;
}

export function parseAgentOsV1DestructiveCommandIntent(
  input: unknown,
): Readonly<AgentOsV1DestructiveCommandIntent> {
  const value = destructiveCommandRecord(input, "destructive command intent", [
    "schemaVersion",
    "tenantId",
    "targets",
    "commandId",
    "operation",
    "commandDigest",
    "expectedRevision",
    "idempotencyKey",
    "risk",
    "reason",
    "requestId",
    "authority",
  ]);
  return deepFreeze({
    schemaVersion: "agent-os-destructive-command/v1",
    ...destructiveCommandBindingOf(value, "destructive command intent"),
    ...destructiveCommandOperationOf(value, "destructive command intent"),
  });
}

export const AGENT_OS_V1_DESTRUCTIVE_CONFIRMATION_MAX_TTL_MS = 5 * 60 * 1_000;
export const AGENT_OS_V1_DESTRUCTIVE_STEP_UP_PROOF_MAX_TTL_MS =
  AGENT_OS_V1_DESTRUCTIVE_CONFIRMATION_MAX_TTL_MS;

export function parseAgentOsV1DestructiveCommandConfirmation(
  input: unknown,
): Readonly<AgentOsV1DestructiveCommandConfirmation> {
  const value = destructiveCommandRecord(
    input,
    "destructive command confirmation",
    [
      "schemaVersion",
      "confirmationRef",
      "stepUpRef",
      "tenantId",
      "targets",
      "commandId",
      "operation",
      "commandDigest",
      "expectedRevision",
      "idempotencyKey",
      "risk",
      "reason",
      "requestId",
      "authority",
      "issuedAt",
      "expiresAt",
    ],
  );
  const issuedAt = instant(
    value.issuedAt,
    "destructive command confirmation issuedAt",
  );
  const expiresAt = instant(
    value.expiresAt,
    "destructive command confirmation expiresAt",
  );
  const confirmationTtlMs = Date.parse(expiresAt) - Date.parse(issuedAt);
  if (confirmationTtlMs <= 0)
    fail(
      "INVALID_VALUE",
      "destructive command confirmation must expire after issuance",
    );
  if (confirmationTtlMs > AGENT_OS_V1_DESTRUCTIVE_CONFIRMATION_MAX_TTL_MS)
    fail(
      "INVALID_VALUE",
      "destructive command confirmation exceeds the fixed maximum TTL",
    );
  return deepFreeze({
    schemaVersion: "agent-os-destructive-command/v1",
    confirmationRef: qualifiedRef(
      value.confirmationRef,
      "confirmation",
      "destructive command confirmation confirmationRef",
    ),
    stepUpRef: qualifiedRef(
      value.stepUpRef,
      "step-up",
      "destructive command confirmation stepUpRef",
    ),
    ...destructiveCommandBindingOf(value, "destructive command confirmation"),
    ...destructiveCommandOperationOf(value, "destructive command confirmation"),
    issuedAt,
    expiresAt,
  });
}

export function parseAgentOsV1DestructiveCommandStepUpProof(
  input: unknown,
): Readonly<AgentOsV1DestructiveCommandStepUpProof> {
  const value = destructiveCommandRecord(
    input,
    "destructive command step-up proof",
    [
      "schemaVersion",
      "confirmationRef",
      "stepUpRef",
      "stepUpProofRef",
      "tenantId",
      "targets",
      "commandId",
      "operation",
      "commandDigest",
      "expectedRevision",
      "idempotencyKey",
      "risk",
      "reason",
      "requestId",
      "authority",
      "completedAt",
      "expiresAt",
    ],
  );
  const completedAt = instant(
    value.completedAt,
    "destructive command step-up proof completedAt",
  );
  const expiresAt = instant(
    value.expiresAt,
    "destructive command step-up proof expiresAt",
  );
  const proofTtlMs = Date.parse(expiresAt) - Date.parse(completedAt);
  if (proofTtlMs <= 0)
    fail(
      "INVALID_VALUE",
      "destructive command step-up proof must expire after completion",
    );
  if (proofTtlMs > AGENT_OS_V1_DESTRUCTIVE_STEP_UP_PROOF_MAX_TTL_MS)
    fail(
      "INVALID_VALUE",
      "destructive command step-up proof exceeds the fixed maximum TTL",
    );
  return deepFreeze({
    schemaVersion: "agent-os-destructive-command/v1",
    confirmationRef: qualifiedRef(
      value.confirmationRef,
      "confirmation",
      "destructive command step-up proof confirmationRef",
    ),
    stepUpRef: qualifiedRef(
      value.stepUpRef,
      "step-up",
      "destructive command step-up proof stepUpRef",
    ),
    stepUpProofRef: qualifiedRef(
      value.stepUpProofRef,
      "step-up-proof",
      "destructive command step-up proof stepUpProofRef",
    ),
    ...destructiveCommandBindingOf(value, "destructive command step-up proof"),
    ...destructiveCommandOperationOf(
      value,
      "destructive command step-up proof",
    ),
    completedAt,
    expiresAt,
  });
}

export function parseAgentOsV1DestructiveCommandSubmission(
  input: unknown,
): Readonly<AgentOsV1DestructiveCommandSubmission> {
  const value = destructiveCommandRecord(
    input,
    "destructive command submission",
    [
      "schemaVersion",
      "confirmationRef",
      "stepUpRef",
      "stepUpProofRef",
      "tenantId",
      "targets",
      "commandId",
      "operation",
      "commandDigest",
      "expectedRevision",
      "idempotencyKey",
      "risk",
      "reason",
      "requestId",
      "authority",
      "submittedAt",
    ],
  );
  return deepFreeze({
    schemaVersion: "agent-os-destructive-command/v1",
    confirmationRef: qualifiedRef(
      value.confirmationRef,
      "confirmation",
      "destructive command submission confirmationRef",
    ),
    stepUpRef: qualifiedRef(
      value.stepUpRef,
      "step-up",
      "destructive command submission stepUpRef",
    ),
    stepUpProofRef: qualifiedRef(
      value.stepUpProofRef,
      "step-up-proof",
      "destructive command submission stepUpProofRef",
    ),
    ...destructiveCommandBindingOf(value, "destructive command submission"),
    ...destructiveCommandOperationOf(value, "destructive command submission"),
    submittedAt: instant(
      value.submittedAt,
      "destructive command submission submittedAt",
    ),
  });
}

export function parseAgentOsV1DestructiveCommandReceipt(
  input: unknown,
): Readonly<AgentOsV1DestructiveCommandReceipt> {
  const value = destructiveCommandRecord(input, "destructive command receipt", [
    "schemaVersion",
    "receiptRef",
    "confirmationRef",
    "stepUpProofRef",
    "tenantId",
    "targets",
    "commandId",
    "operation",
    "commandDigest",
    "expectedRevision",
    "idempotencyKey",
    "risk",
    "commandReason",
    "requestId",
    "authority",
    "status",
    "reason",
    "effectPerformed",
  ]);
  if (value.status !== "accepted-no-effect" && value.status !== "rejected")
    fail("INVALID_VALUE", "destructive command receipt status is invalid");
  const reason = destructiveCommandRejection(value.reason);
  if (
    (value.status === "accepted-no-effect" && reason !== null) ||
    (value.status === "rejected" && reason === null)
  )
    fail(
      "INVALID_VALUE",
      "destructive command receipt status and reason disagree",
    );
  if (value.effectPerformed !== false)
    fail(
      "INVALID_VALUE",
      "DAR-479 destructive command receipt must prove no real effect",
    );
  return deepFreeze({
    schemaVersion: "agent-os-destructive-command/v1",
    receiptRef: qualifiedRef(
      value.receiptRef,
      "receipt",
      "destructive command receipt receiptRef",
    ),
    confirmationRef: qualifiedRef(
      value.confirmationRef,
      "confirmation",
      "destructive command receipt confirmationRef",
    ),
    stepUpProofRef: qualifiedRef(
      value.stepUpProofRef,
      "step-up-proof",
      "destructive command receipt stepUpProofRef",
    ),
    ...destructiveCommandBindingOf(value, "destructive command receipt"),
    commandId: identifier(
      value.commandId,
      "destructive command receipt commandId",
    ),
    operation: identifier(
      value.operation,
      "destructive command receipt operation",
    ),
    commandDigest: digest(
      value.commandDigest,
      "destructive command receipt commandDigest",
    ),
    commandReason: destructiveCommandReason(
      value.commandReason,
      "destructive command receipt commandReason",
    ),
    status: value.status,
    reason,
    effectPerformed: false,
  });
}

function canonicalPromptEventUnsignedOf(
  input: unknown,
): Omit<AgentOsV1CanonicalPromptEvent, "digest"> {
  const value = record(input, "canonical prompt event unsigned");
  exact(
    value,
    [
      "schemaVersion",
      "eventId",
      "runId",
      "attemptId",
      "streamEpoch",
      "sequence",
      "eventType",
      "payload",
      "createdAt",
    ],
    "canonical prompt event unsigned",
  );
  if (value.schemaVersion !== "agent-os-canonical-prompt/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "canonical prompt event schemaVersion is unsupported",
    );
  const eventType = canonicalPromptEventType(value.eventType);
  return {
    schemaVersion: "agent-os-canonical-prompt/v1",
    eventId: identifier(value.eventId, "canonical prompt event eventId"),
    runId: identifier(value.runId, "canonical prompt event runId"),
    attemptId: identifier(value.attemptId, "canonical prompt event attemptId"),
    streamEpoch: canonicalPromptStreamEpoch(
      value.streamEpoch,
      "canonical prompt event streamEpoch",
    ),
    sequence: positiveInteger(
      value.sequence,
      "canonical prompt event sequence",
    ),
    eventType,
    payload: canonicalPromptEventPayload(value.payload, eventType),
    createdAt: instant(value.createdAt, "canonical prompt event createdAt"),
  };
}

function canonicalPromptCursorUnsignedOf(
  input: unknown,
): Omit<AgentOsV1CanonicalPromptCursor, "digest"> {
  const value = record(input, "canonical prompt cursor unsigned");
  exact(
    value,
    ["schemaVersion", "runId", "streamEpoch", "sequence", "watermark"],
    "canonical prompt cursor unsigned",
  );
  if (value.schemaVersion !== "agent-os-canonical-prompt/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "canonical prompt cursor schemaVersion is unsupported",
    );
  const sequence = nonNegativeInteger(
    value.sequence,
    "canonical prompt cursor sequence",
  );
  const watermark = nonNegativeInteger(
    value.watermark,
    "canonical prompt cursor watermark",
  );
  if (sequence > watermark)
    fail(
      "INVALID_VALUE",
      "canonical prompt cursor sequence exceeds its watermark",
    );
  return {
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId: identifier(value.runId, "canonical prompt cursor runId"),
    streamEpoch: canonicalPromptStreamEpoch(
      value.streamEpoch,
      "canonical prompt cursor streamEpoch",
    ),
    sequence,
    watermark,
  };
}

function canonicalPromptSnapshotUnsignedOf(
  input: unknown,
): Omit<AgentOsV1CanonicalPromptSnapshot, "digest"> {
  const value = record(input, "canonical prompt snapshot unsigned");
  exact(
    value,
    [
      "schemaVersion",
      "runId",
      "attemptId",
      "instanceId",
      "storeGeneration",
      "streamEpoch",
      "watermark",
      "state",
      "terminal",
      "updatedAt",
    ],
    "canonical prompt snapshot unsigned",
  );
  if (value.schemaVersion !== "agent-os-canonical-prompt/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "canonical prompt snapshot schemaVersion is unsupported",
    );
  const state = canonicalPromptState(value.state);
  const terminal = booleanValue(
    value.terminal,
    "canonical prompt snapshot terminal",
  );
  if (terminal !== (state !== "running"))
    fail(
      "INVALID_VALUE",
      "canonical prompt snapshot terminal flag differs from state",
    );
  return {
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId: identifier(value.runId, "canonical prompt snapshot runId"),
    attemptId: identifier(
      value.attemptId,
      "canonical prompt snapshot attemptId",
    ),
    instanceId: identifier(
      value.instanceId,
      "canonical prompt snapshot instanceId",
    ),
    storeGeneration: positiveInteger(
      value.storeGeneration,
      "canonical prompt snapshot storeGeneration",
    ),
    streamEpoch: canonicalPromptStreamEpoch(
      value.streamEpoch,
      "canonical prompt snapshot streamEpoch",
    ),
    watermark: nonNegativeInteger(
      value.watermark,
      "canonical prompt snapshot watermark",
    ),
    state,
    terminal,
    updatedAt: instant(value.updatedAt, "canonical prompt snapshot updatedAt"),
  };
}

function canonicalPromptEventType(
  value: unknown,
): AgentOsV1CanonicalPromptEventType {
  if (
    value !== "prompt.accepted" &&
    value !== "provider.output" &&
    value !== "provider.failure" &&
    value !== "provider.usage" &&
    value !== "provider.receipt" &&
    value !== "run.unknown" &&
    value !== "run.terminal"
  )
    fail("INVALID_VALUE", "canonical prompt eventType is invalid");
  return value;
}

function canonicalPromptEventPayload(
  input: unknown,
  eventType: AgentOsV1CanonicalPromptEventType,
): AgentOsV1CanonicalPromptEventPayload {
  const value = record(input, `canonical prompt ${eventType} payload`);
  switch (eventType) {
    case "prompt.accepted":
      exact(
        value,
        [
          "requestId",
          "promptDigest",
          "intentDigest",
          "grantId",
          "claimId",
          "claimFence",
          "storeGeneration",
        ],
        "canonical prompt accepted payload",
      );
      return {
        requestId: identifier(
          value.requestId,
          "canonical prompt accepted requestId",
        ),
        promptDigest: digest(
          value.promptDigest,
          "canonical prompt accepted promptDigest",
        ),
        intentDigest: digest(
          value.intentDigest,
          "canonical prompt accepted intentDigest",
        ),
        grantId: identifier(value.grantId, "canonical prompt accepted grantId"),
        claimId: identifier(value.claimId, "canonical prompt accepted claimId"),
        claimFence: positiveInteger(
          value.claimFence,
          "canonical prompt accepted claimFence",
        ),
        storeGeneration: positiveInteger(
          value.storeGeneration,
          "canonical prompt accepted storeGeneration",
        ),
      };
    case "provider.output":
      exact(value, ["text"], "canonical prompt output payload");
      return {
        text: boundedUtf8String(
          value.text,
          "canonical prompt output text",
          262_144,
        ),
      };
    case "provider.failure":
      exact(value, ["code", "message"], "canonical prompt failure payload");
      return {
        code: identifier(value.code, "canonical prompt failure code"),
        message: boundedUtf8String(
          value.message,
          "canonical prompt failure message",
          8_192,
        ),
      };
    case "provider.usage":
      exact(
        value,
        ["inputTokens", "outputTokens"],
        "canonical prompt usage payload",
      );
      return {
        inputTokens: nonNegativeInteger(
          value.inputTokens,
          "canonical prompt usage inputTokens",
        ),
        outputTokens: nonNegativeInteger(
          value.outputTokens,
          "canonical prompt usage outputTokens",
        ),
      };
    case "provider.receipt":
      exact(
        value,
        ["providerId", "receiptDigest"],
        "canonical prompt receipt payload",
      );
      return {
        providerId: identifier(
          value.providerId,
          "canonical prompt receipt providerId",
        ),
        receiptDigest: digest(
          value.receiptDigest,
          "canonical prompt receipt receiptDigest",
        ),
      };
    case "run.unknown":
      exact(value, ["reason"], "canonical prompt unknown payload");
      return {
        reason: boundedUtf8String(
          value.reason,
          "canonical prompt unknown reason",
          8_192,
        ),
      };
    case "run.terminal": {
      exact(
        value,
        ["status", "resultDigest"],
        "canonical prompt terminal payload",
      );
      if (
        value.status !== "succeeded" &&
        value.status !== "failed" &&
        value.status !== "cancelled" &&
        value.status !== "unknown"
      )
        fail("INVALID_VALUE", "canonical prompt terminal status is invalid");
      return {
        status: value.status,
        resultDigest: digest(
          value.resultDigest,
          "canonical prompt terminal resultDigest",
        ),
      };
    }
  }
}

function canonicalPromptState(value: unknown): AgentOsV1CanonicalPromptState {
  if (
    value !== "running" &&
    value !== "succeeded" &&
    value !== "failed" &&
    value !== "cancelled" &&
    value !== "unknown"
  )
    fail("INVALID_VALUE", "canonical prompt snapshot state is invalid");
  return value;
}

function canonicalPromptStreamEpoch(
  value: unknown,
  label: string,
): AgentOsV1CanonicalPromptStreamEpoch {
  if (typeof value !== "string" || !PROMPT_STREAM_EPOCH_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  return value as AgentOsV1CanonicalPromptStreamEpoch;
}

function canonicalPromptProjectionDigest(value: unknown): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}

function canonicalPromptInput(
  input: unknown,
): Readonly<AgentOsV1CanonicalPromptInput> {
  const prompt = record(input, "canonical prompt.start prompt");
  exact(prompt, ["messages"], "canonical prompt.start prompt");
  const messages = arrayValues(
    prompt.messages,
    "canonical prompt.start prompt messages",
  );
  if (messages.length === 0 || messages.length > 32)
    fail(
      "INVALID_VALUE",
      "canonical prompt.start must contain between 1 and 32 messages",
    );
  let promptBytes = 0;
  const canonicalMessages = messages.map((message, index) => {
    const item = record(
      message,
      `canonical prompt.start prompt messages[${index}]`,
    );
    exact(
      item,
      ["role", "content"],
      `canonical prompt.start prompt messages[${index}]`,
    );
    if (item.role !== "user")
      fail(
        "INVALID_VALUE",
        `canonical prompt.start prompt messages[${index}].role is invalid`,
      );
    if (typeof item.content !== "string" || item.content.length === 0)
      fail(
        "INVALID_VALUE",
        `canonical prompt.start prompt messages[${index}].content is invalid`,
      );
    promptBytes += new TextEncoder().encode(item.content).byteLength;
    return { role: "user" as const, content: item.content };
  });
  if (promptBytes > 65_536)
    fail(
      "INVALID_VALUE",
      "canonical prompt.start prompt exceeds the 65536-byte budget",
    );
  return deepFreeze({ messages: canonicalMessages });
}

function canonicalPromptDigest(prompt: unknown): string {
  return canonicalPromptProjectionDigest({
    schemaVersion: "agent-os-canonical-prompt-input/v1",
    prompt: canonicalPromptInput(prompt),
  });
}

function canonicalPromptIntentDigest(
  payload: Readonly<AgentOsV1CanonicalPromptStartRequest>,
): string {
  return canonicalPromptProjectionDigest({
    schemaVersion: payload.schemaVersion,
    operation: payload.operation,
    runId: payload.runId,
    turnId: payload.turnId,
    attemptId: payload.attemptId,
    instanceId: payload.instanceId,
    storeGeneration: payload.storeGeneration,
    claimId: payload.claimId,
    requestedAt: payload.requestedAt,
    authority: payload.authority,
    grant: payload.grant,
    instance: payload.instance,
    promptDigest: payload.promptDigest,
  });
}

function canonicalPromptAuthoritySubset(
  payload: Readonly<AgentOsV1CanonicalPromptRequest>,
): unknown {
  switch (payload.operation) {
    case "prompt.start":
      return {
        operation: payload.operation,
        runId: payload.runId,
        turnId: payload.turnId,
        attemptId: payload.attemptId,
        instanceId: payload.instanceId,
        storeGeneration: payload.storeGeneration,
        claimId: payload.claimId,
        requestedAt: payload.requestedAt,
        authority: payload.authority,
        promptDigest: payload.promptDigest,
        intentDigest: payload.intentDigest,
      };
    case "prompt.read":
      return {
        operation: payload.operation,
        runId: payload.runId,
        cursorDigest: payload.cursor?.digest ?? null,
        limit: payload.limit,
        readAt: payload.readAt,
      };
    case "prompt.cancel":
      return {
        operation: payload.operation,
        runId: payload.runId,
        claimId: payload.claimId,
        claimFence: payload.claimFence,
        reason: payload.reason,
        resultDigest: payload.resultDigest,
        cancelledAt: payload.cancelledAt,
      };
  }
}

/** 严格解析一个协议 offer；版本是否已注册由 negotiation registry 决定。 */
export function parseAgentOsV1ProtocolOffer(
  input: unknown,
): AgentOsV1ProtocolOffer {
  const value = record(input, "protocol offer");
  exact(
    value,
    [
      "protocolId",
      "versions",
      "features",
      "requiredFeatures",
      "schemaVersion",
      "handlerVersion",
    ],
    "protocol offer",
  );
  if (value.schemaVersion !== "agent-os/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "protocol offer schemaVersion must equal agent-os/v1",
    );
  const features = strings(
    value.features,
    "protocol offer features",
    IDENTIFIER_PATTERN,
  );
  const requiredFeatures = stringsAllowEmpty(
    value.requiredFeatures,
    "protocol offer requiredFeatures",
    IDENTIFIER_PATTERN,
  );
  if (requiredFeatures.some((feature) => !features.includes(feature)))
    fail(
      "INVALID_VALUE",
      "protocol offer requiredFeatures must be included in features",
    );
  return deepFreeze({
    protocolId: protocolFamily(value.protocolId, "protocol offer protocolId"),
    versions: protocolVersions(value.versions, "protocol offer versions"),
    features,
    requiredFeatures,
    schemaVersion: "agent-os/v1",
    handlerVersion: identifier(
      value.handlerVersion,
      "protocol offer handlerVersion",
    ),
  });
}

/** 严格解析 peer identity/enrollment；Control 永远不是 HostKind。 */
export function parseAgentOsV1HandshakePeer(
  input: unknown,
): AgentOsV1HandshakePeer {
  const value = record(input, "handshake peer");
  exact(
    value,
    [
      "peerId",
      "role",
      "hostKind",
      "managementMode",
      "tenantId",
      "workloadId",
      "authorityDomain",
      "enrollmentRef",
      "audience",
    ],
    "handshake peer",
  );
  const role = peerRole(value.role, "handshake peer role");
  const hostKind = nullableHostKind(value.hostKind, "handshake peer hostKind");
  const managementMode = nullableManagementMode(
    value.managementMode,
    "handshake peer managementMode",
  );
  const enrollmentRef =
    value.enrollmentRef === null
      ? null
      : digestRefOf(value.enrollmentRef, "handshake peer enrollmentRef");
  if (role === "worker" || role === "personal") {
    if (hostKind !== role || managementMode === null)
      fail(
        "INVALID_VALUE",
        `${role} peer must carry its matching HostKind and managementMode`,
      );
    if (
      (managementMode === "enrolled" && enrollmentRef === null) ||
      (managementMode === "standalone" && enrollmentRef !== null)
    )
      fail("INVALID_VALUE", "peer enrollmentRef must match managementMode");
  } else if (
    hostKind !== null ||
    managementMode !== null ||
    enrollmentRef !== null
  ) {
    fail(
      "INVALID_VALUE",
      `${role} is not a Host and cannot carry HostKind or enrollment state`,
    );
  }
  return deepFreeze({
    peerId: identifier(value.peerId, "handshake peer peerId"),
    role,
    hostKind,
    managementMode,
    tenantId: identifier(value.tenantId, "handshake peer tenantId"),
    workloadId: identifier(value.workloadId, "handshake peer workloadId"),
    authorityDomain: identifier(
      value.authorityDomain,
      "handshake peer authorityDomain",
    ),
    enrollmentRef,
    audience: scopes(value.audience, "handshake peer audience"),
  });
}

export function parseAgentOsV1HandshakeOffer(
  input: unknown,
): AgentOsV1HandshakeOffer {
  const value = record(input, "handshake offer");
  exact(
    value,
    ["protocol", "peer", "issuedAt", "maxClockSkewMs"],
    "handshake offer",
  );
  return deepFreeze({
    protocol: parseAgentOsV1ProtocolOffer(value.protocol),
    peer: parseAgentOsV1HandshakePeer(value.peer),
    issuedAt: instant(value.issuedAt, "handshake offer issuedAt"),
    maxClockSkewMs: nonNegativeInteger(
      value.maxClockSkewMs,
      "handshake offer maxClockSkewMs",
    ),
  });
}

/** 解析 authority-bearing request；未知字段（包括 trace/baggage/secret/token/path）一律拒绝。 */
export function parseAgentOsV1AuthorityRequestEnvelope(
  input: unknown,
): AgentOsV1AuthorityRequestEnvelope {
  const value = record(input, "authority request envelope");
  exact(
    value,
    ["requestId", "deadline", "expectedRevision", "authorityEnvelopeRef"],
    "authority request envelope",
  );
  return deepFreeze({
    requestId: identifier(
      value.requestId,
      "authority request envelope requestId",
    ),
    deadline: instant(value.deadline, "authority request envelope deadline"),
    expectedRevision: nonNegativeInteger(
      value.expectedRevision,
      "authority request envelope expectedRevision",
    ),
    authorityEnvelopeRef: digestRefOf(
      value.authorityEnvelopeRef,
      "authority request envelope authorityEnvelopeRef",
    ),
  });
}

/** owner 提供 catalog snapshot；协议层只复制、校验、排序和冻结。 */
export function parseAgentOsV1HandlerCatalogSnapshot(
  input: unknown,
): AgentOsV1HandlerCatalogSnapshot {
  const value = record(input, "handler catalog snapshot");
  exact(value, ["revision", "handlers"], "handler catalog snapshot");
  const handlers = arrayValues(
    value.handlers,
    "handler catalog snapshot handlers",
  )
    .map((entry) => handlerCatalogEntry(entry))
    .sort((left, right) =>
      `${left.protocolId}:${left.handlerVersion}`.localeCompare(
        `${right.protocolId}:${right.handlerVersion}`,
      ),
    );
  const identities = handlers.map(
    (entry) => `${entry.protocolId}:${entry.handlerVersion}`,
  );
  if (new Set(identities).size !== identities.length)
    fail(
      "INVALID_VALUE",
      "handler catalog snapshot contains duplicate handlers",
    );
  return deepFreeze({
    revision: nonNegativeInteger(
      value.revision,
      "handler catalog snapshot revision",
    ),
    handlers,
  });
}

export function parseAgentOsV1ActiveRunPin(
  input: unknown,
): AgentOsV1ActiveRunPin {
  const value = record(input, "active run pin");
  exact(
    value,
    [
      "runId",
      "protocolId",
      "selectedVersion",
      "selectedFeatures",
      "schemaVersion",
      "handlerVersion",
    ],
    "active run pin",
  );
  const snapshot = negotiatedSnapshotOf(
    {
      protocolId: value.protocolId,
      selectedVersion: value.selectedVersion,
      selectedFeatures: value.selectedFeatures,
      schemaVersion: value.schemaVersion,
      handlerVersion: value.handlerVersion,
    },
    "active run pin",
  );
  return deepFreeze({
    runId: identifier(value.runId, "active run pin runId"),
    ...snapshot,
  });
}

export function parseAgentOsV1NegotiatedSnapshot(
  input: unknown,
): AgentOsV1NegotiatedSnapshot {
  return negotiatedSnapshotOf(input, "negotiated snapshot");
}

export function parseAgentOsV1ActiveRunPins(
  input: unknown,
): readonly AgentOsV1ActiveRunPin[] {
  const pins = arrayValues(input, "active run pins").map((entry) =>
    parseAgentOsV1ActiveRunPin(entry),
  );
  const runIds = pins.map((pin) => pin.runId);
  if (new Set(runIds).size !== runIds.length)
    fail("INVALID_VALUE", "active run pins contain duplicate runId values");
  return deepFreeze(pins);
}

export function parseAgentOsV1HandlerTransitionCommand(
  input: unknown,
): AgentOsV1HandlerTransitionCommand {
  const value = record(input, "handler transition command");
  exact(
    value,
    ["action", "protocolId", "handlerVersion"],
    "handler transition command",
  );
  if (value.action !== "drain" && value.action !== "unload")
    fail("INVALID_VALUE", "handler transition command action is invalid");
  return deepFreeze({
    action: value.action,
    protocolId: protocolFamily(
      value.protocolId,
      "handler transition command protocolId",
    ),
    handlerVersion: identifier(
      value.handlerVersion,
      "handler transition command handlerVersion",
    ),
  });
}

export function parseAgentOsV1PersonalTransitionCommand(
  input: unknown,
): AgentOsV1PersonalTransitionCommand {
  const value = record(input, "Personal transition command");
  exact(
    value,
    [
      "from",
      "to",
      "authorityDomainChanged",
      "renewRemoteAuthority",
      "autoRecover",
    ],
    "Personal transition command",
  );
  return deepFreeze({
    from: personalHostState(value.from, "Personal transition command from"),
    to: personalHostState(value.to, "Personal transition command to"),
    authorityDomainChanged: booleanValue(
      value.authorityDomainChanged,
      "Personal transition command authorityDomainChanged",
    ),
    renewRemoteAuthority: booleanValue(
      value.renewRemoteAuthority,
      "Personal transition command renewRemoteAuthority",
    ),
    autoRecover: booleanValue(
      value.autoRecover,
      "Personal transition command autoRecover",
    ),
  });
}

export function parseAgentOsV1ReferenceRequest<TPayload>(
  input: unknown,
  parsePayload: (input: unknown) => TPayload,
): AgentOsV1ReferenceRequest<TPayload> {
  const value = record(input, "reference request");
  exact(
    value,
    ["protocolId", "operation", "envelope", "snapshot", "payload"],
    "reference request",
  );
  const protocolId = protocolFamily(
    value.protocolId,
    "reference request protocolId",
  );
  const snapshot = parseAgentOsV1NegotiatedSnapshot(value.snapshot);
  if (snapshot.protocolId !== protocolId)
    fail(
      "DRIFT_DETECTED",
      "reference request protocolId differs from its negotiated snapshot",
    );
  return deepFreeze({
    protocolId,
    operation: identifier(value.operation, "reference request operation"),
    envelope: parseAgentOsV1AuthorityRequestEnvelope(value.envelope),
    snapshot,
    payload: parsePayload(value.payload),
  });
}

export function parseAgentOsV1ReferenceResponse<TPayload>(
  input: unknown,
  expectedProtocolId: AgentOsV1ProtocolFamily,
  expectedRequestId: string,
  parsePayload: (input: unknown) => TPayload,
): AgentOsV1ReferenceResponse<TPayload> {
  const value = record(input, "reference response");
  exact(
    value,
    ["protocolId", "requestId", "status", "payload"],
    "reference response",
  );
  const protocolId = protocolFamily(
    value.protocolId,
    "reference response protocolId",
  );
  const requestId = identifier(value.requestId, "reference response requestId");
  if (protocolId !== expectedProtocolId || requestId !== expectedRequestId)
    fail(
      "DRIFT_DETECTED",
      "reference response correlation differs from the request",
    );
  if (value.status !== "ok")
    fail("INVALID_VALUE", "reference response status must equal ok");
  return deepFreeze({
    protocolId,
    requestId,
    status: "ok",
    payload: parsePayload(value.payload),
  });
}

export function parseAgentOsV1PersonalStateProbe(
  input: unknown,
): AgentOsV1PersonalStateProbe {
  const value = record(input, "Personal state probe");
  exact(
    value,
    ["schemaVersion", "state", "authorityDomain", "generation"],
    "Personal state probe",
  );
  if (value.schemaVersion !== "personal-host/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "Personal state probe schemaVersion must equal personal-host/v1",
    );
  return deepFreeze({
    schemaVersion: "personal-host/v1",
    state: personalHostState(value.state, "Personal state probe state"),
    authorityDomain: identifier(
      value.authorityDomain,
      "Personal state probe authorityDomain",
    ),
    generation: nonNegativeInteger(
      value.generation,
      "Personal state probe generation",
    ),
  });
}

/** 探测只分类并给出脱离 serving path 的动作；绝不把未知或损坏状态解析为 v1。 */
export function classifyAgentOsV1PersonalState(
  input: unknown,
): AgentOsV1PersonalStateClassification {
  let value: Record<string, unknown>;
  try {
    value = record(input, "Personal persisted state");
  } catch (error) {
    if (!(error instanceof AgentOsV1ContractError)) throw error;
    return deepFreeze({
      classification: "unknown",
      state: null,
      allowedActions: ["quarantine", "explicit-reset"],
    });
  }
  if (value.schemaVersion !== "personal-host/v1") {
    return deepFreeze({
      classification: "unknown",
      state: null,
      allowedActions: ["quarantine", "explicit-reset"],
    });
  }
  try {
    return deepFreeze({
      classification: "clean",
      state: parseAgentOsV1PersonalStateProbe(value),
      allowedActions: ["serve"],
    });
  } catch (error) {
    if (!(error instanceof AgentOsV1ContractError)) throw error;
    return deepFreeze({
      classification: "corrupt",
      state: null,
      allowedActions: ["quarantine", "explicit-reset"],
    });
  }
}

/** 将已验证合约转换为稳定的、按键排序的 JSON 源数据。 */
export function canonicalAgentOsV1Source(contract: AgentOsV1Contract): string {
  return canonicalJson({
    schemaVersion: contract.schemaVersion,
    features: contract.features,
    agentDefinition: contract.agentDefinition,
    hostProfile: contract.hostProfile,
    agentDeployment: contract.agentDeployment,
    executionInstance: contract.executionInstance,
    runSpec: contract.runSpec,
    executionGrant: contract.executionGrant,
  });
}

/** 生成 capability package descriptor 的内容地址，不接受调用方自报的 digest。 */
export function createCapabilityPackageDescriptorDigest(
  descriptor: Omit<CapabilityPackageDescriptor, "digest">,
): string {
  return `sha256:${sha256Hex(canonicalJson(descriptor))}`;
}

/** 生成 AgentDefinition 的内容地址；RunSpec 必须固定此精确 public definition。 */
export function createAgentDefinitionDigest(
  definition: AgentDefinition,
): string {
  return `sha256:${sha256Hex(canonicalJson(agentDefinitionOf(definition)))}`;
}

function agentDefinitionOf(value: unknown): AgentDefinition {
  const input = record(value, "agentDefinition");
  exact(
    input,
    [
      "agentId",
      "version",
      "identity",
      "capabilityPackage",
      "requestedScopes",
      "skills",
      "tools",
      "securityPolicy",
    ],
    "agentDefinition",
  );
  const identity = record(input.identity, "agentDefinition.identity");
  exact(identity, ["tenantId", "workloadId"], "agentDefinition.identity");
  return {
    agentId: identifier(input.agentId, "agentDefinition.agentId"),
    version: version(input.version, "agentDefinition.version"),
    identity: {
      tenantId: identifier(
        identity.tenantId,
        "agentDefinition.identity.tenantId",
      ),
      workloadId: identifier(
        identity.workloadId,
        "agentDefinition.identity.workloadId",
      ),
    },
    capabilityPackage: capabilityPackageOf(input.capabilityPackage),
    requestedScopes: scopes(
      input.requestedScopes,
      "agentDefinition.requestedScopes",
    ),
    skills: capabilityRequirements(input.skills, "agentDefinition.skills"),
    tools: capabilityRequirements(input.tools, "agentDefinition.tools"),
    securityPolicy: digestRefOf(
      input.securityPolicy,
      "agentDefinition.securityPolicy",
    ),
  };
}

function digestRefOf(value: unknown, label: string): DigestRef {
  const input = record(value, label);
  exact(input, ["ref", "digest"], label);
  return {
    ref: opaqueRef(input.ref, `${label}.ref`),
    digest: digest(input.digest, `${label}.digest`),
  };
}

function capabilityRequirements(
  value: unknown,
  label: string,
): readonly CapabilityRequirement[] {
  const requirements: CapabilityRequirement[] = [];
  for (const [index, item] of arrayValues(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const input = record(item, itemLabel);
    exact(input, ["id", "packageDigest"], itemLabel);
    requirements.push({
      id: identifier(input.id, `${itemLabel}.id`),
      packageDigest: digest(input.packageDigest, `${itemLabel}.packageDigest`),
    });
  }
  requirements.sort(compareById);
  if (
    requirements.some(
      (requirement, index) => requirement.id === requirements[index - 1]?.id,
    )
  )
    fail("INVALID_VALUE", `${label} must not contain duplicate ids`);
  return requirements;
}

function deploymentBindings(
  value: unknown,
  label: string,
): readonly DeploymentBinding[] {
  const bindings: DeploymentBinding[] = [];
  for (const [index, item] of arrayValues(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const input = record(item, itemLabel);
    exact(input, ["bindingId", "ref", "digest"], itemLabel);
    bindings.push({
      bindingId: identifier(input.bindingId, `${itemLabel}.bindingId`),
      ref: opaqueRef(input.ref, `${itemLabel}.ref`),
      digest: digest(input.digest, `${itemLabel}.digest`),
    });
  }
  bindings.sort(compareByBindingId);
  if (
    bindings.some(
      (binding, index) => binding.bindingId === bindings[index - 1]?.bindingId,
    )
  )
    fail("INVALID_VALUE", `${label} must not contain duplicate bindingIds`);
  return bindings;
}

function compareById(
  left: Pick<CapabilityRequirement, "id">,
  right: Pick<CapabilityRequirement, "id">,
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function compareByBindingId(
  left: Pick<DeploymentBinding, "bindingId">,
  right: Pick<DeploymentBinding, "bindingId">,
): number {
  return left.bindingId < right.bindingId
    ? -1
    : left.bindingId > right.bindingId
      ? 1
      : 0;
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
    "agentDefinition.capabilityPackage",
  );
  if (input.version !== "1.0")
    fail("UNSUPPORTED_VERSION", "capability package version must equal 1.0");
  if (input.disabled !== false)
    fail("DRIFT_DETECTED", "disabled capability packages are rejected");
  const provenance = record(input.provenance, "capabilityPackage.provenance");
  exact(provenance, ["repository", "revision"], "capabilityPackage.provenance");
  const signer = record(input.signer, "capabilityPackage.signer");
  exact(signer, ["keyId", "subject", "algorithm"], "capabilityPackage.signer");
  if (signer.algorithm !== "ed25519")
    fail("INVALID_VALUE", "capabilityPackage.signer.algorithm is unsupported");
  const trust = record(input.trust, "capabilityPackage.trust");
  exact(trust, ["domain", "state"], "capabilityPackage.trust");
  if (trust.state !== "trusted")
    fail("DRIFT_DETECTED", "untrusted capability package is rejected");
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
  const environment = record(
    input.environment,
    "capabilityPackage.environment",
  );
  exact(
    environment,
    ["operatingSystems", "architectures", "network"],
    "capabilityPackage.environment",
  );
  if (
    environment.network !== "none" &&
    environment.network !== "egress-restricted"
  ) {
    fail("INVALID_VALUE", "capabilityPackage.environment.network is invalid");
  }
  const result: CapabilityPackageDescriptor = {
    packageId: identifier(input.packageId, "capabilityPackage.packageId"),
    version: "1.0",
    digest: digest(input.digest, "capabilityPackage.digest"),
    provenance: {
      repository: identifier(
        provenance.repository,
        "capabilityPackage.provenance.repository",
      ),
      revision: identifier(
        provenance.revision,
        "capabilityPackage.provenance.revision",
      ),
    },
    signer: {
      keyId: identifier(signer.keyId, "capabilityPackage.signer.keyId"),
      subject: identifier(signer.subject, "capabilityPackage.signer.subject"),
      algorithm: "ed25519",
    },
    trust: {
      domain: identifier(trust.domain, "capabilityPackage.trust.domain"),
      state: "trusted",
    },
    revocation: {
      generation: nonNegativeInteger(
        revocation.generation,
        "capabilityPackage.revocation.generation",
      ),
      state: "active",
    },
    disabled: false,
    transport: {
      kind: transport.kind,
      reference: identifier(
        transport.reference,
        "capabilityPackage.transport.reference",
      ),
    },
    features: featuresOf(input.features, "capabilityPackage.features"),
    secretRefs: strings(
      input.secretRefs,
      "capabilityPackage.secretRefs",
      SECRET_REF_PATTERN,
    ),
    environment: {
      operatingSystems: strings(
        environment.operatingSystems,
        "capabilityPackage.environment.operatingSystems",
        IDENTIFIER_PATTERN,
      ),
      architectures: strings(
        environment.architectures,
        "capabilityPackage.environment.architectures",
        IDENTIFIER_PATTERN,
      ),
      network: environment.network,
    },
  };
  const expected = createCapabilityPackageDescriptorDigest(
    withoutDigest(result),
  );
  if (result.digest !== expected)
    fail(
      "DRIFT_DETECTED",
      "capability package digest does not match pinned data",
    );
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
      "providerCeiling",
      "workspaceCeiling",
      "storageCeiling",
      "networkCeiling",
      "lifecycleCeiling",
    ],
    "hostProfile",
  );
  if (input.hostKind !== "worker" && input.hostKind !== "personal")
    fail("INVALID_VALUE", "hostKind is invalid");
  if (
    input.managementMode !== "standalone" &&
    input.managementMode !== "enrolled"
  )
    fail("INVALID_VALUE", "managementMode is invalid");
  if (
    input.role !== "worker" &&
    input.role !== "control" &&
    input.role !== "personal"
  )
    fail("INVALID_VALUE", "hostProfile.role is invalid");
  return {
    hostId: identifier(input.hostId, "hostProfile.hostId"),
    hostKind: input.hostKind,
    managementMode: input.managementMode,
    role: input.role,
    authorityDomain: identifier(
      input.authorityDomain,
      "hostProfile.authorityDomain",
    ),
    capabilityCeiling: scopes(
      input.capabilityCeiling,
      "hostProfile.capabilityCeiling",
    ),
    supportedFeatures: featuresOf(
      input.supportedFeatures,
      "hostProfile.supportedFeatures",
    ),
    providerCeiling: digestRefOf(
      input.providerCeiling,
      "hostProfile.providerCeiling",
    ),
    workspaceCeiling: digestRefOf(
      input.workspaceCeiling,
      "hostProfile.workspaceCeiling",
    ),
    storageCeiling: digestRefOf(
      input.storageCeiling,
      "hostProfile.storageCeiling",
    ),
    networkCeiling: digestRefOf(
      input.networkCeiling,
      "hostProfile.networkCeiling",
    ),
    lifecycleCeiling: digestRefOf(
      input.lifecycleCeiling,
      "hostProfile.lifecycleCeiling",
    ),
  };
}

function agentDeploymentOf(value: unknown): AgentDeployment {
  const input = record(value, "agentDeployment");
  exact(
    input,
    [
      "deploymentId",
      "target",
      "agentId",
      "agentVersion",
      "hostId",
      "capabilityDigest",
      "desiredState",
      "revision",
      "desiredReplicas",
      "placementPolicy",
      "bindings",
    ],
    "agentDeployment",
  );
  if (
    input.target !== "worker" &&
    input.target !== "control" &&
    input.target !== "personal"
  )
    fail("INVALID_VALUE", "agentDeployment.target is invalid");
  return {
    deploymentId: identifier(
      input.deploymentId,
      "agentDeployment.deploymentId",
    ),
    target: input.target,
    agentId: identifier(input.agentId, "agentDeployment.agentId"),
    agentVersion: version(input.agentVersion, "agentDeployment.agentVersion"),
    hostId: identifier(input.hostId, "agentDeployment.hostId"),
    capabilityDigest: digest(
      input.capabilityDigest,
      "agentDeployment.capabilityDigest",
    ),
    desiredState: deploymentDesiredState(
      input.desiredState,
      "agentDeployment.desiredState",
    ),
    revision: identifier(input.revision, "agentDeployment.revision"),
    desiredReplicas: nonNegativeInteger(
      input.desiredReplicas,
      "agentDeployment.desiredReplicas",
    ),
    placementPolicy: digestRefOf(
      input.placementPolicy,
      "agentDeployment.placementPolicy",
    ),
    bindings: deploymentBindings(input.bindings, "agentDeployment.bindings"),
  };
}

function executionInstanceOf(value: unknown): ExecutionInstance {
  const input = record(value, "executionInstance");
  exact(
    input,
    [
      "instanceId",
      "deploymentId",
      "hostId",
      "generation",
      "deploymentRevision",
      "replicaOrdinal",
      "observedState",
    ],
    "executionInstance",
  );
  return {
    instanceId: identifier(input.instanceId, "executionInstance.instanceId"),
    deploymentId: identifier(
      input.deploymentId,
      "executionInstance.deploymentId",
    ),
    hostId: identifier(input.hostId, "executionInstance.hostId"),
    generation: nonNegativeInteger(
      input.generation,
      "executionInstance.generation",
    ),
    deploymentRevision: identifier(
      input.deploymentRevision,
      "executionInstance.deploymentRevision",
    ),
    replicaOrdinal: nonNegativeInteger(
      input.replicaOrdinal,
      "executionInstance.replicaOrdinal",
    ),
    observedState: executionObservedState(
      input.observedState,
      "executionInstance.observedState",
    ),
  };
}

function runSpecOf(value: unknown): RunSpec {
  const input = record(value, "runSpec");
  exact(
    input,
    [
      "runId",
      "deploymentId",
      "capabilityScopes",
      "requiredFeatures",
      "definitionDigest",
      "policyDigest",
      "capabilityDigest",
    ],
    "runSpec",
  );
  return {
    runId: identifier(input.runId, "runSpec.runId"),
    deploymentId: identifier(input.deploymentId, "runSpec.deploymentId"),
    capabilityScopes: scopes(
      input.capabilityScopes,
      "runSpec.capabilityScopes",
    ),
    requiredFeatures: featuresOf(
      input.requiredFeatures,
      "runSpec.requiredFeatures",
    ),
    definitionDigest: digest(
      input.definitionDigest,
      "runSpec.definitionDigest",
    ),
    policyDigest: digest(input.policyDigest, "runSpec.policyDigest"),
    capabilityDigest: digest(
      input.capabilityDigest,
      "runSpec.capabilityDigest",
    ),
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
      "tenantId",
      "workloadId",
      "attemptId",
      "instanceId",
      "definitionDigest",
      "policyDigest",
      "capabilityDigest",
      "keyId",
      "rotationGeneration",
      "revocationGeneration",
      "scope",
      "notBefore",
      "expiresAt",
      "sessionGrant",
      "leaseBinding",
    ],
    "executionGrant",
  );
  if (
    input.kind !== "local" &&
    input.kind !== "remote" &&
    input.kind !== "delegated"
  )
    fail("INVALID_VALUE", "executionGrant.kind is invalid");
  const notBefore = instant(input.notBefore, "executionGrant.notBefore");
  const expiresAt = instant(input.expiresAt, "executionGrant.expiresAt");
  if (notBefore >= expiresAt)
    fail("INVALID_VALUE", "executionGrant must expire after notBefore");
  return {
    grantId: identifier(input.grantId, "executionGrant.grantId"),
    kind: input.kind,
    issuer: identifier(input.issuer, "executionGrant.issuer"),
    audience: strings(
      input.audience,
      "executionGrant.audience",
      IDENTIFIER_PATTERN,
    ),
    authorityDomain: identifier(
      input.authorityDomain,
      "executionGrant.authorityDomain",
    ),
    hostId: identifier(input.hostId, "executionGrant.hostId"),
    deploymentId: identifier(input.deploymentId, "executionGrant.deploymentId"),
    runId: identifier(input.runId, "executionGrant.runId"),
    tenantId: identifier(input.tenantId, "executionGrant.tenantId"),
    workloadId: identifier(input.workloadId, "executionGrant.workloadId"),
    attemptId: identifier(input.attemptId, "executionGrant.attemptId"),
    instanceId: identifier(input.instanceId, "executionGrant.instanceId"),
    definitionDigest: digest(
      input.definitionDigest,
      "executionGrant.definitionDigest",
    ),
    policyDigest: digest(input.policyDigest, "executionGrant.policyDigest"),
    capabilityDigest: digest(
      input.capabilityDigest,
      "executionGrant.capabilityDigest",
    ),
    keyId: identifier(input.keyId, "executionGrant.keyId"),
    rotationGeneration: rotationGenerationRef(
      input.rotationGeneration,
      "executionGrant.rotationGeneration",
    ),
    revocationGeneration: revocationGenerationRef(
      input.revocationGeneration,
      "executionGrant.revocationGeneration",
    ),
    scope: scopes(input.scope, "executionGrant.scope"),
    notBefore,
    expiresAt,
    sessionGrant: sessionGrantOf(input.sessionGrant),
    leaseBinding: leaseBindingOf(input.leaseBinding),
  };
}

function sessionGrantOf(value: unknown): SessionGrant {
  const input = record(value, "executionGrant.sessionGrant");
  exact(
    input,
    ["grantId", "principalId", "scope", "notBefore", "expiresAt"],
    "executionGrant.sessionGrant",
  );
  const notBefore = instant(
    input.notBefore,
    "executionGrant.sessionGrant.notBefore",
  );
  const expiresAt = instant(
    input.expiresAt,
    "executionGrant.sessionGrant.expiresAt",
  );
  if (notBefore >= expiresAt)
    fail(
      "INVALID_VALUE",
      "executionGrant.sessionGrant must expire after notBefore",
    );
  return {
    grantId: identifier(input.grantId, "executionGrant.sessionGrant.grantId"),
    principalId: identifier(
      input.principalId,
      "executionGrant.sessionGrant.principalId",
    ),
    scope: scopes(input.scope, "executionGrant.sessionGrant.scope"),
    notBefore,
    expiresAt,
  };
}

function leaseBindingOf(value: unknown): LeaseBinding {
  const input = record(value, "executionGrant.leaseBinding");
  if (input.kind === "not_applicable") {
    exact(input, ["kind"], "executionGrant.leaseBinding");
    return { kind: "not_applicable" };
  }
  if (input.kind !== "remote")
    fail("INVALID_VALUE", "executionGrant.leaseBinding.kind is invalid");
  exact(
    input,
    [
      "kind",
      "leaseId",
      "epoch",
      "generation",
      "scope",
      "notBefore",
      "expiresAt",
    ],
    "executionGrant.leaseBinding",
  );
  const notBefore = instant(
    input.notBefore,
    "executionGrant.leaseBinding.notBefore",
  );
  const expiresAt = instant(
    input.expiresAt,
    "executionGrant.leaseBinding.expiresAt",
  );
  if (notBefore >= expiresAt)
    fail(
      "INVALID_VALUE",
      "executionGrant.leaseBinding must expire after notBefore",
    );
  return {
    kind: "remote",
    leaseId: identifier(input.leaseId, "executionGrant.leaseBinding.leaseId"),
    epoch: leaseEpochRef(input.epoch, "executionGrant.leaseBinding.epoch"),
    generation: nonNegativeInteger(
      input.generation,
      "executionGrant.leaseBinding.generation",
    ),
    scope: scopes(input.scope, "executionGrant.leaseBinding.scope"),
    notBefore,
    expiresAt,
  };
}

function validateRelationships(
  value: Omit<AgentOsV1Contract, "schemaVersion">,
): void {
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
  if (
    agentDeployment.capabilityDigest !==
    agentDefinition.capabilityPackage.digest
  )
    fail("DRIFT_DETECTED", "deployment capability digest drifted");
  if (runSpec.definitionDigest !== createAgentDefinitionDigest(agentDefinition))
    fail("DRIFT_DETECTED", "run definition digest drifted");
  if (runSpec.policyDigest !== agentDefinition.securityPolicy.digest)
    fail("DRIFT_DETECTED", "run policy digest drifted");
  if (runSpec.capabilityDigest !== agentDefinition.capabilityPackage.digest)
    fail("DRIFT_DETECTED", "run capability digest drifted");
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
  if (executionInstance.deploymentRevision !== agentDeployment.revision)
    fail("DRIFT_DETECTED", "instance must pin the deployment revision");
  if (
    executionGrant.hostId !== hostProfile.hostId ||
    executionGrant.deploymentId !== agentDeployment.deploymentId ||
    executionGrant.runId !== runSpec.runId ||
    executionGrant.instanceId !== executionInstance.instanceId
  )
    fail("DRIFT_DETECTED", "grant does not pin the execution tuple");
  if (
    executionGrant.tenantId !== agentDefinition.identity.tenantId ||
    executionGrant.workloadId !== agentDefinition.identity.workloadId ||
    executionGrant.authorityDomain !== hostProfile.authorityDomain
  )
    fail("DRIFT_DETECTED", "grant identity pins drifted");
  if (
    executionGrant.definitionDigest !== runSpec.definitionDigest ||
    executionGrant.policyDigest !== runSpec.policyDigest ||
    executionGrant.capabilityDigest !== runSpec.capabilityDigest
  )
    fail("DRIFT_DETECTED", "grant digest pins drifted");
  if (agentDeployment.target !== hostProfile.role)
    fail("INVALID_VALUE", "deployment target must equal host role");
  if (hostProfile.hostKind === "worker") {
    if (
      hostProfile.managementMode !== "enrolled" ||
      (hostProfile.role !== "worker" && hostProfile.role !== "control")
    )
      fail(
        "INVALID_VALUE",
        "worker hosts must be enrolled Worker or Control profiles",
      );
    if (executionGrant.kind === "local")
      fail(
        "INVALID_VALUE",
        "Worker and Control grants must be remotely issued",
      );
  } else {
    if (hostProfile.role !== "personal")
      fail("INVALID_VALUE", "personal hosts must use the personal role");
    if (
      (hostProfile.managementMode === "standalone" &&
        executionGrant.kind !== "local") ||
      (hostProfile.managementMode === "enrolled" &&
        executionGrant.kind === "local")
    )
      fail("INVALID_VALUE", "Personal grant kind must match management mode");
  }
  if (hostProfile.managementMode === "standalone") {
    if (executionGrant.leaseBinding.kind !== "not_applicable")
      fail(
        "INVALID_VALUE",
        "standalone local grants require a not_applicable lease binding",
      );
  } else {
    if (executionGrant.leaseBinding.kind !== "remote")
      fail(
        "INVALID_VALUE",
        "remote and delegated grants require a remote lease binding",
      );
    if (executionGrant.leaseBinding.generation !== executionInstance.generation)
      fail(
        "DRIFT_DETECTED",
        "lease binding generation must equal the copied execution instance generation",
      );
  }
  if (
    executionGrant.audience.length !== 1 ||
    executionGrant.audience[0] !== hostProfile.hostId
  )
    fail(
      "GRANT_EXPANSION",
      "grant audience must narrow to exactly one execution host",
    );
  narrow(
    executionGrant.scope,
    runSpec.capabilityScopes,
    "grant scope exceeds the run scope",
  );
  narrow(
    executionGrant.scope,
    executionGrant.sessionGrant.scope,
    "grant scope exceeds the session grant scope",
  );
  narrowWindow(
    executionGrant.notBefore,
    executionGrant.expiresAt,
    executionGrant.sessionGrant.notBefore,
    executionGrant.sessionGrant.expiresAt,
    "grant validity exceeds the session grant validity",
  );
  if (executionGrant.leaseBinding.kind === "remote") {
    narrow(
      executionGrant.scope,
      executionGrant.leaseBinding.scope,
      "grant scope exceeds the remote lease scope",
    );
    narrowWindow(
      executionGrant.notBefore,
      executionGrant.expiresAt,
      executionGrant.leaseBinding.notBefore,
      executionGrant.leaseBinding.expiresAt,
      "grant validity exceeds the remote lease validity",
    );
  }
  narrow(
    runSpec.capabilityScopes,
    agentDefinition.requestedScopes,
    "run scope exceeds the agent definition",
  );
  narrow(
    executionGrant.scope,
    hostProfile.capabilityCeiling,
    "grant exceeds the host capability ceiling",
  );
  narrow(
    runSpec.requiredFeatures,
    value.features,
    "run requires unavailable contract features",
  );
  narrow(
    runSpec.requiredFeatures,
    hostProfile.supportedFeatures,
    "run requires unsupported host features",
  );
  narrow(
    runSpec.requiredFeatures,
    agentDefinition.capabilityPackage.features,
    "run requires unavailable package features",
  );
}

function withoutDigest(
  descriptor: CapabilityPackageDescriptor,
): Omit<CapabilityPackageDescriptor, "digest"> {
  const { digest: _digest, ...unsigned } = descriptor;
  return unsigned;
}

function narrow(
  actual: readonly string[],
  ceiling: readonly string[],
  message: string,
): void {
  if (actual.some((entry) => !ceiling.includes(entry)))
    fail("GRANT_EXPANSION", message);
}

function narrowWindow(
  notBefore: string,
  expiresAt: string,
  ceilingNotBefore: string,
  ceilingExpiresAt: string,
  message: string,
): void {
  if (notBefore < ceilingNotBefore || expiresAt > ceilingExpiresAt)
    fail("GRANT_EXPANSION", message);
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
  for (const [key, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(value),
  )) {
    if (
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get ||
      descriptor.set
    )
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data field`);
  }
  return value as Record<string, unknown>;
}

function exact(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !(key in value))
  )
    fail("UNKNOWN_FIELD", `${label} contains unknown or missing fields`);
}

function strings(
  value: unknown,
  label: string,
  pattern: RegExp,
): readonly string[] {
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

function stringsAllowEmpty(
  value: unknown,
  label: string,
  pattern: RegExp,
): readonly string[] {
  const values = arrayValues(value, label);
  const normalized: string[] = [];
  for (const entry of values) {
    if (typeof entry !== "string" || !pattern.test(entry))
      fail("INVALID_VALUE", `${label} contains an invalid value`);
    normalized.push(entry);
  }
  normalized.sort();
  if (new Set(normalized).size !== normalized.length)
    fail("INVALID_VALUE", `${label} must contain unique values`);
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

function protocolFamily(
  value: unknown,
  label: string,
): AgentOsV1ProtocolFamily {
  if (
    value !== "execution.v1" &&
    value !== "deployment.v1" &&
    value !== "control.v1" &&
    value !== "personal-local.v1"
  )
    fail("INVALID_VALUE", `${label} is not a registered protocol family`);
  return value;
}

function protocolVersion(
  value: unknown,
  label: string,
): AgentOsV1ProtocolVersion {
  if (typeof value !== "string" || !PROTOCOL_VERSION_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a canonical major.minor version`);
  return value as AgentOsV1ProtocolVersion;
}

function protocolVersions(
  value: unknown,
  label: string,
): readonly AgentOsV1ProtocolVersion[] {
  const versions = arrayValues(value, label).map((entry) =>
    protocolVersion(entry, label),
  );
  versions.sort(compareProtocolVersions);
  if (versions.length === 0 || new Set(versions).size !== versions.length)
    fail("INVALID_VALUE", `${label} must be a non-empty unique array`);
  return versions;
}

function compareProtocolVersions(
  left: AgentOsV1ProtocolVersion,
  right: AgentOsV1ProtocolVersion,
): number {
  const leftSeparator = left.indexOf(".");
  const rightSeparator = right.indexOf(".");
  const leftMajor = Number(left.slice(0, leftSeparator));
  const rightMajor = Number(right.slice(0, rightSeparator));
  const leftMinor = Number(left.slice(leftSeparator + 1));
  const rightMinor = Number(right.slice(rightSeparator + 1));
  return leftMajor - rightMajor || leftMinor - rightMinor;
}

function peerRole(value: unknown, label: string): AgentOsV1PeerRole {
  if (
    value !== "kernel" &&
    value !== "control" &&
    value !== "worker" &&
    value !== "personal" &&
    value !== "app"
  )
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function nullableHostKind(value: unknown, label: string): HostKind | null {
  if (value === null || value === "worker" || value === "personal")
    return value;
  fail("INVALID_VALUE", `${label} is invalid`);
}

function nullableManagementMode(
  value: unknown,
  label: string,
): ManagementMode | null {
  if (value === null || value === "standalone" || value === "enrolled")
    return value;
  fail("INVALID_VALUE", `${label} is invalid`);
}

function handlerCatalogEntry(value: unknown): AgentOsV1HandlerCatalogEntry {
  const input = record(value, "handler catalog entry");
  exact(
    input,
    ["protocolId", "handlerVersion", "lifecycle", "operations"],
    "handler catalog entry",
  );
  if (input.lifecycle !== "active" && input.lifecycle !== "draining")
    fail("INVALID_VALUE", "handler catalog entry lifecycle is invalid");
  return deepFreeze({
    protocolId: protocolFamily(
      input.protocolId,
      "handler catalog entry protocolId",
    ),
    handlerVersion: identifier(
      input.handlerVersion,
      "handler catalog entry handlerVersion",
    ),
    lifecycle: input.lifecycle,
    operations: strings(
      input.operations,
      "handler catalog entry operations",
      IDENTIFIER_PATTERN,
    ),
  });
}

function negotiatedSnapshotOf(
  value: unknown,
  label: string,
): AgentOsV1NegotiatedSnapshot {
  const input = record(value, label);
  exact(
    input,
    [
      "protocolId",
      "selectedVersion",
      "selectedFeatures",
      "schemaVersion",
      "handlerVersion",
    ],
    label,
  );
  if (input.schemaVersion !== "agent-os/v1")
    fail(
      "UNSUPPORTED_VERSION",
      `${label} schemaVersion must equal agent-os/v1`,
    );
  const protocolId = protocolFamily(input.protocolId, `${label} protocolId`);
  const selectedVersion = protocolVersion(
    input.selectedVersion,
    `${label} selectedVersion`,
  );
  const registered: readonly AgentOsV1ProtocolVersion[] =
    AGENT_OS_V1_PROTOCOL_REGISTRY[protocolId];
  if (!registered.includes(selectedVersion))
    fail("UNSUPPORTED_VERSION", `${label} selectedVersion is not registered`);
  return deepFreeze({
    protocolId,
    selectedVersion,
    selectedFeatures: stringsAllowEmpty(
      input.selectedFeatures,
      `${label} selectedFeatures`,
      IDENTIFIER_PATTERN,
    ),
    schemaVersion: "agent-os/v1",
    handlerVersion: identifier(input.handlerVersion, `${label} handlerVersion`),
  });
}

function personalHostState(value: unknown, label: string): PersonalHostState {
  if (
    value !== "LocalOnly" &&
    value !== "EnrollmentPending" &&
    value !== "ManagedOnline" &&
    value !== "ManagedOffline" &&
    value !== "Revoked"
  )
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== "boolean")
    fail("INVALID_VALUE", `${label} must be boolean`);
  return value;
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function opaqueRef(value: unknown, label: string): OpaqueRef {
  if (typeof value !== "string" || !OPAQUE_REF_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a namespace-qualified opaque ref`);
  return value as OpaqueRef;
}

function authorityEpoch(
  value: unknown,
  label: string,
): AgentOsV1AuthorityEpoch {
  if (typeof value !== "string" || !AUTHORITY_EPOCH_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be an authority epoch opaque ref`);
  return value as AgentOsV1AuthorityEpoch;
}

function appLifecycle(
  value: unknown,
  label: string,
): AgentOsV1AppLifecycleState {
  if (
    value !== "first-run" &&
    value !== "awaiting-consent" &&
    value !== "offline-local" &&
    value !== "connected-managed" &&
    value !== "policy-stale" &&
    value !== "revoked" &&
    value !== "recovery-required"
  )
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function appCompatibility(
  value: unknown,
  label: string,
): AgentOsV1AppCompatibility {
  if (value !== "compatible" && value !== "update-required")
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function terminalStatus(value: unknown): AgentOsV1TerminalStatus {
  if (
    value !== "succeeded" &&
    value !== "failed" &&
    value !== "usage-error" &&
    value !== "cancelled" &&
    value !== "recovery-required" &&
    value !== "update-required" &&
    value !== "unavailable" &&
    value !== "auth-denied" &&
    value !== "policy-denied"
  )
    fail("INVALID_VALUE", "Terminal terminal frame status is invalid");
  return value;
}

function terminalExitCode(
  value: unknown,
  status: AgentOsV1TerminalStatus,
): AgentOsV1TerminalExitCode {
  if (
    value !== 0 &&
    value !== 1 &&
    value !== 2 &&
    value !== 64 &&
    value !== 69 &&
    value !== 77 &&
    value !== 130
  )
    fail("INVALID_VALUE", "Terminal terminal frame exitCode is invalid");
  const matches =
    (status === "succeeded" && value === 0) ||
    (status === "failed" && value === 1) ||
    (status === "usage-error" && value === 2) ||
    (status === "recovery-required" && value === 64) ||
    ((status === "update-required" || status === "unavailable") &&
      value === 69) ||
    ((status === "auth-denied" || status === "policy-denied") &&
      value === 77) ||
    (status === "cancelled" && value === 130);
  if (!matches)
    fail(
      "DRIFT_DETECTED",
      "Terminal terminal frame status and exitCode disagree",
    );
  return value;
}

function qualifiedRef(
  value: unknown,
  namespace: string,
  label: string,
): OpaqueRef {
  const parsed = opaqueRef(value, label);
  if (!parsed.startsWith(`${namespace}:`))
    fail("INVALID_VALUE", `${label} must use the ${namespace} namespace`);
  return parsed;
}

function destructiveCommandRecord(
  input: unknown,
  label: string,
  keys: readonly string[],
): Record<string, unknown> {
  const value = record(input, label);
  exact(value, keys, label);
  if (value.schemaVersion !== "agent-os-destructive-command/v1")
    fail("UNSUPPORTED_VERSION", `${label} schemaVersion is unsupported`);
  return value;
}

function destructiveCommandBindingOf(
  value: Record<string, unknown>,
  label: string,
) {
  return {
    tenantId: identifier(value.tenantId, `${label} tenantId`),
    targets: destructiveCommandTargets(value.targets, `${label} targets`),
    expectedRevision: nonNegativeInteger(
      value.expectedRevision,
      `${label} expectedRevision`,
    ),
    idempotencyKey: qualifiedRef(
      value.idempotencyKey,
      "idempotency",
      `${label} idempotencyKey`,
    ),
    risk: destructiveCommandRisk(value.risk, `${label} risk`),
    requestId: identifier(value.requestId, `${label} requestId`),
    authority: digestRefOf(value.authority, `${label} authority`),
  };
}

function destructiveCommandOperationOf(
  value: Record<string, unknown>,
  label: string,
) {
  return {
    commandId: identifier(value.commandId, `${label} commandId`),
    operation: identifier(value.operation, `${label} operation`),
    commandDigest: digest(value.commandDigest, `${label} commandDigest`),
    reason: destructiveCommandReason(value.reason, `${label} reason`),
  };
}

function destructiveCommandTargets(
  value: unknown,
  label: string,
): readonly OpaqueRef[] {
  const targets = arrayValues(value, label).map((target, index) =>
    opaqueRef(target, `${label}[${index}]`),
  );
  if (targets.length === 0 || targets.length > 64)
    fail("INVALID_VALUE", `${label} must contain 1 to 64 targets`);
  const sorted = [...targets].sort((left, right) => left.localeCompare(right));
  if (sorted.some((target, index) => target === sorted[index - 1]))
    fail("INVALID_VALUE", `${label} must not contain duplicates`);
  if (targets.some((target, index) => target !== sorted[index]))
    fail("INVALID_VALUE", `${label} must use canonical lexical order`);
  return sorted;
}

function destructiveCommandRisk(
  value: unknown,
  label: string,
): AgentOsV1DestructiveCommandRisk {
  if (value !== "high" && value !== "critical")
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function destructiveCommandReason(value: unknown, label: string): string {
  const reason = boundedUtf8String(value, label, 1_024);
  if (reason.trim() !== reason)
    fail("INVALID_VALUE", `${label} must be canonical trimmed text`);
  return reason;
}

function destructiveCommandRejection(
  value: unknown,
): AgentOsV1DestructiveCommandRejection | null {
  if (value === null) return null;
  if (
    value !== "expired" &&
    value !== "reused" &&
    value !== "revoked" &&
    value !== "cross-tenant" &&
    value !== "step-up-mismatch" &&
    value !== "revision-conflict" &&
    value !== "intent-drift"
  )
    fail("INVALID_VALUE", "destructive command receipt reason is invalid");
  return value;
}

function leaseEpochRef(value: unknown, label: string): LeaseEpochRef {
  if (typeof value !== "string" || !LEASE_EPOCH_REF_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a lease epoch opaque ref`);
  return value as LeaseEpochRef;
}

function rotationGenerationRef(
  value: unknown,
  label: string,
): RotationGenerationRef {
  if (typeof value !== "string" || !ROTATION_GENERATION_REF_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a rotation opaque ref`);
  return value as RotationGenerationRef;
}

function revocationGenerationRef(
  value: unknown,
  label: string,
): RevocationGenerationRef {
  if (
    typeof value !== "string" ||
    !REVOCATION_GENERATION_REF_PATTERN.test(value)
  )
    fail("INVALID_VALUE", `${label} must be a revocation opaque ref`);
  return value as RevocationGenerationRef;
}

function version(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^1\.[0-9]+$/u.test(value))
    fail("UNSUPPORTED_VERSION", `${label} is unsupported`);
  return value;
}

function deploymentDesiredState(
  value: unknown,
  label: string,
): DeploymentDesiredState {
  if (value !== "active" && value !== "suspended")
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function executionObservedState(
  value: unknown,
  label: string,
): ExecutionObservedState {
  if (
    value !== "pending" &&
    value !== "running" &&
    value !== "stopped" &&
    value !== "failed"
  )
    fail("INVALID_VALUE", `${label} is invalid`);
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

function positiveInteger(value: unknown, label: string): number {
  const result = nonNegativeInteger(value, label);
  if (result === 0) fail("INVALID_VALUE", `${label} must be positive`);
  return result;
}

function instant(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !RFC3339_MILLIS_PATTERN.test(value) ||
    new Date(value).toISOString() !== value
  )
    fail(
      "INVALID_VALUE",
      `${label} must be a canonical RFC3339 millisecond instant`,
    );
  return value;
}

function boundedUtf8String(
  value: unknown,
  label: string,
  maxBytes: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    new TextEncoder().encode(value).byteLength > maxBytes
  )
    fail(
      "INVALID_VALUE",
      `${label} must be a non-empty string within ${maxBytes} UTF-8 bytes`,
    );
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail(
        "INVALID_VALUE",
        "canonical source cannot contain non-finite numbers",
      );
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

function fail(code: AgentOsV1ContractError["code"], message: string): never {
  throw new AgentOsV1ContractError(code, message);
}
