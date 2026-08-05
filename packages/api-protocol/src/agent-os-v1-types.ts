/**
 * Greenfield Agent OS v1 的纯协议数据模型。
 *
 * 这些类型不描述现有运行时，也不包含兼容或迁移语义。
 */

export type HostKind = "worker" | "personal";
export type ManagementMode = "standalone" | "enrolled";
export type DeploymentTarget = "worker" | "control" | "personal";
export type GrantKind = "local" | "remote" | "delegated";
export type PackageTransportKind = "mcp" | "skill" | "plugin" | "provider-adapter";
export type NetworkConstraint = "none" | "egress-restricted";
export type DeploymentDesiredState = "active" | "suspended";
export type ExecutionObservedState = "pending" | "running" | "stopped" | "failed";
export type AgentOsV1ProtocolFamily =
  | "execution.v1"
  | "deployment.v1"
  | "control.v1"
  | "personal-local.v1";
export type AgentOsV1ProtocolVersion = `${number}.${number}`;
export type AgentOsV1PeerRole = "kernel" | "control" | "worker" | "personal" | "app";
export type AgentOsV1UpdateReason =
  | "UNKNOWN_VERSION"
  | "CROSS_MAJOR"
  | "NO_COMMON_VERSION"
  | "REQUIRED_FEATURE_MISSING"
  | "SCHEMA_MISMATCH"
  | "HANDLER_MISSING"
  | "HANDLER_PINNED";
export type AgentOsV1RejectionReason =
  | "AUDIENCE_MISMATCH"
  | "AUTHORITY_DOMAIN_MISMATCH"
  | "IDENTITY_MISMATCH"
  | "ENROLLMENT_MISMATCH"
  | "CLOCK_SKEW";
export type AgentOsV1HandlerLifecycle = "active" | "draining";
export type PersonalHostState =
  | "LocalOnly"
  | "EnrollmentPending"
  | "ManagedOnline"
  | "ManagedOffline"
  | "Revoked";
export type PersonalStateClassification = "clean" | "recognized-legacy" | "unknown" | "corrupt";
export type OpaqueRef = `${string}:${string}`;
export type LeaseEpochRef = `lease-epoch:${string}`;
export type RotationGenerationRef = `rotation:${string}`;
export type RevocationGenerationRef = `revocation:${string}`;

export interface EnvironmentConstraints {
  readonly operatingSystems: readonly string[];
  readonly architectures: readonly string[];
  readonly network: NetworkConstraint;
}

/** 不可解引用的内容地址引用；公开 v1 不携带本地路径、token 或 credential。 */
export interface DigestRef {
  readonly ref: OpaqueRef;
  readonly digest: string;
}

/** 一个能力需求固定其稳定标识和承载它的 package digest。 */
export interface CapabilityRequirement {
  readonly id: string;
  readonly packageDigest: string;
}

export interface AgentIdentity {
  readonly tenantId: string;
  readonly workloadId: string;
}

export interface DeploymentBinding extends DigestRef {
  readonly bindingId: string;
}

export interface SessionGrant {
  readonly grantId: string;
  readonly principalId: string;
  readonly scope: readonly string[];
  readonly notBefore: string;
  readonly expiresAt: string;
}

export interface NotApplicableLeaseBinding {
  readonly kind: "not_applicable";
}

export interface RemoteLeaseBinding {
  readonly kind: "remote";
  readonly leaseId: string;
  readonly epoch: LeaseEpochRef;
  /** ExecutionInstance.generation 的复制 pin，不是新的 lease authority generation。 */
  readonly generation: number;
  readonly scope: readonly string[];
  readonly notBefore: string;
  readonly expiresAt: string;
}

export type LeaseBinding = NotApplicableLeaseBinding | RemoteLeaseBinding;

/** 所有 secret 都只能以不可解引用的引用名表达，绝不携带 secret 值。 */
export interface CapabilityPackageDescriptor {
  readonly packageId: string;
  readonly version: "1.0";
  readonly digest: string;
  readonly provenance: Readonly<{
    readonly repository: string;
    readonly revision: string;
  }>;
  readonly signer: Readonly<{
    readonly keyId: string;
    readonly subject: string;
    readonly algorithm: "ed25519";
  }>;
  readonly trust: Readonly<{
    readonly domain: string;
    readonly state: "trusted";
  }>;
  readonly revocation: Readonly<{
    readonly generation: number;
    readonly state: "active";
  }>;
  readonly disabled: false;
  readonly transport: Readonly<{
    readonly kind: PackageTransportKind;
    readonly reference: string;
  }>;
  readonly features: readonly string[];
  readonly secretRefs: readonly string[];
  readonly environment: Readonly<EnvironmentConstraints>;
}

export interface AgentDefinition {
  readonly agentId: string;
  readonly version: string;
  readonly identity: Readonly<AgentIdentity>;
  readonly capabilityPackage: Readonly<CapabilityPackageDescriptor>;
  readonly requestedScopes: readonly string[];
  readonly skills: readonly CapabilityRequirement[];
  readonly tools: readonly CapabilityRequirement[];
  readonly securityPolicy: Readonly<DigestRef>;
}

export interface HostProfile {
  readonly hostId: string;
  readonly hostKind: HostKind;
  readonly managementMode: ManagementMode;
  readonly role: DeploymentTarget;
  readonly authorityDomain: string;
  readonly capabilityCeiling: readonly string[];
  readonly supportedFeatures: readonly string[];
  readonly providerCeiling: Readonly<DigestRef>;
  readonly workspaceCeiling: Readonly<DigestRef>;
  readonly storageCeiling: Readonly<DigestRef>;
  readonly networkCeiling: Readonly<DigestRef>;
  readonly lifecycleCeiling: Readonly<DigestRef>;
}

export interface AgentDeployment {
  readonly deploymentId: string;
  readonly target: DeploymentTarget;
  readonly agentId: string;
  readonly agentVersion: string;
  readonly hostId: string;
  readonly capabilityDigest: string;
  readonly desiredState: DeploymentDesiredState;
  readonly revision: string;
  readonly desiredReplicas: number;
  readonly placementPolicy: Readonly<DigestRef>;
  readonly bindings: readonly DeploymentBinding[];
}

export interface ExecutionInstance {
  readonly instanceId: string;
  readonly deploymentId: string;
  readonly hostId: string;
  readonly generation: number;
  readonly deploymentRevision: string;
  readonly replicaOrdinal: number;
  readonly observedState: ExecutionObservedState;
}

export interface RunSpec {
  readonly runId: string;
  readonly deploymentId: string;
  readonly capabilityScopes: readonly string[];
  readonly requiredFeatures: readonly string[];
  readonly definitionDigest: string;
  readonly policyDigest: string;
  readonly capabilityDigest: string;
}

export interface ExecutionGrant {
  readonly grantId: string;
  readonly kind: GrantKind;
  readonly issuer: string;
  readonly audience: readonly string[];
  readonly authorityDomain: string;
  readonly hostId: string;
  readonly deploymentId: string;
  readonly runId: string;
  readonly tenantId: string;
  readonly workloadId: string;
  readonly attemptId: string;
  readonly instanceId: string;
  readonly definitionDigest: string;
  readonly policyDigest: string;
  readonly capabilityDigest: string;
  readonly keyId: string;
  readonly rotationGeneration: RotationGenerationRef;
  readonly revocationGeneration: RevocationGenerationRef;
  readonly scope: readonly string[];
  readonly notBefore: string;
  readonly expiresAt: string;
  readonly sessionGrant: Readonly<SessionGrant>;
  readonly leaseBinding: Readonly<LeaseBinding>;
}

/** 协商 offer 只描述协议能力，不拥有连接或 handler 生命周期。 */
export interface AgentOsV1ProtocolOffer {
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly versions: readonly AgentOsV1ProtocolVersion[];
  readonly features: readonly string[];
  readonly requiredFeatures: readonly string[];
  readonly schemaVersion: "agent-os/v1";
  readonly handlerVersion: string;
}

/** Control 是连接 owner，但不是 Host；因此它的 hostKind/managementMode 必须为 null。 */
export interface AgentOsV1HandshakePeer {
  readonly peerId: string;
  readonly role: AgentOsV1PeerRole;
  readonly hostKind: HostKind | null;
  readonly managementMode: ManagementMode | null;
  readonly tenantId: string;
  readonly workloadId: string;
  readonly authorityDomain: string;
  readonly enrollmentRef: Readonly<DigestRef> | null;
  readonly audience: readonly string[];
}

export interface AgentOsV1HandshakeOffer {
  readonly protocol: Readonly<AgentOsV1ProtocolOffer>;
  readonly peer: Readonly<AgentOsV1HandshakePeer>;
  readonly issuedAt: string;
  readonly maxClockSkewMs: number;
}

export interface AgentOsV1NegotiatedSnapshot {
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly selectedVersion: AgentOsV1ProtocolVersion;
  readonly selectedFeatures: readonly string[];
  readonly schemaVersion: "agent-os/v1";
  readonly handlerVersion: string;
}

/** authority-bearing request 的唯一公开 envelope；trace/baggage 不参与 authority。 */
export interface AgentOsV1AuthorityRequestEnvelope {
  readonly requestId: string;
  readonly deadline: string;
  readonly expectedRevision: number;
  readonly authorityEnvelopeRef: Readonly<DigestRef>;
}

export interface AgentOsV1HandlerCatalogEntry {
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly handlerVersion: string;
  readonly lifecycle: AgentOsV1HandlerLifecycle;
  readonly operations: readonly string[];
}

export interface AgentOsV1HandlerCatalogSnapshot {
  readonly revision: number;
  readonly handlers: readonly AgentOsV1HandlerCatalogEntry[];
}

export interface AgentOsV1ActiveRunPin extends AgentOsV1NegotiatedSnapshot {
  readonly runId: string;
}

export interface AgentOsV1HandlerTransitionCommand {
  readonly action: "drain" | "unload";
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly handlerVersion: string;
}

export interface AgentOsV1PersonalTransitionCommand {
  readonly from: PersonalHostState;
  readonly to: PersonalHostState;
  readonly authorityDomainChanged: boolean;
  readonly renewRemoteAuthority: boolean;
  readonly autoRecover: boolean;
}

export interface AgentOsV1ReferenceRequest<TPayload> {
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly operation: string;
  readonly envelope: Readonly<AgentOsV1AuthorityRequestEnvelope>;
  readonly snapshot: Readonly<AgentOsV1NegotiatedSnapshot>;
  readonly payload: TPayload;
}

export interface AgentOsV1ReferenceResponse<TPayload> {
  readonly protocolId: AgentOsV1ProtocolFamily;
  readonly requestId: string;
  readonly status: "ok";
  readonly payload: TPayload;
}

/** 真实持久化由 Host owner 提供；本 DTO 仅表示严格探测结果。 */
export interface AgentOsV1PersonalStateProbe {
  readonly schemaVersion: "personal-host/v1";
  readonly state: PersonalHostState;
  readonly authorityDomain: string;
  readonly generation: number;
}

export interface AgentOsV1PersonalStateClassification {
  readonly classification: PersonalStateClassification;
  readonly state: Readonly<AgentOsV1PersonalStateProbe> | null;
  readonly allowedActions: readonly (
    | "serve"
    | "read-only-export"
    | "quarantine"
    | "explicit-reset"
  )[];
}

export interface AgentOsV1Contract {
  readonly schemaVersion: "agent-os/v1";
  readonly features: readonly string[];
  readonly agentDefinition: Readonly<AgentDefinition>;
  readonly hostProfile: Readonly<HostProfile>;
  readonly agentDeployment: Readonly<AgentDeployment>;
  readonly executionInstance: Readonly<ExecutionInstance>;
  readonly runSpec: Readonly<RunSpec>;
  readonly executionGrant: Readonly<ExecutionGrant>;
}

export interface CanonicalAgentOsV1Contract extends AgentOsV1Contract {
  /** Stable canonical JSON source; its bytes are the v1 signing/digest source. */
  readonly canonicalSource: string;
}
