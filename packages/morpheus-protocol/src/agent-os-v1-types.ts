/**
 * Greenfield Agent OS v1 的纯协议数据模型。
 *
 * 这些类型不描述现有运行时，也不包含兼容或迁移语义。
 */

export type HostKind = "worker" | "personal";
export type ManagementMode = "standalone" | "enrolled";
export type DeploymentTarget = "worker" | "control" | "personal";
export type GrantKind = "local" | "remote" | "delegated";
export type PackageTransportKind =
  | "mcp"
  | "skill"
  | "plugin"
  | "provider-adapter";
export type NetworkConstraint = "none" | "egress-restricted";
export type DeploymentDesiredState = "active" | "suspended";
export type ExecutionObservedState =
  | "pending"
  | "running"
  | "stopped"
  | "failed";
export type AgentOsV1ProtocolFamily =
  | "execution.v1"
  | "deployment.v1"
  | "control.v1"
  | "personal-local.v1";
export type AgentOsV1ProtocolVersion = `${number}.${number}`;
export type AgentOsV1PeerRole =
  | "kernel"
  | "control"
  | "worker"
  | "personal"
  | "app";
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
export type PersonalStateClassification =
  | "clean"
  | "recognized-legacy"
  | "unknown"
  | "corrupt";
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

/** Worker 持久化的执行所有权 pin；它绑定现有授权与 Kernel fence，不创建新的 authority。 */
export interface ExecutionClaimBinding {
  readonly grantId: string;
  readonly leaseId: string;
  readonly leaseEpoch: LeaseEpochRef;
  readonly authorityDomain: string;
  readonly runId: string;
  readonly attemptId: string;
  readonly instanceId: string;
  readonly instanceGeneration: number;
  readonly storeId: string;
  readonly storeGeneration: number;
  readonly writerIncarnationId: string;
  readonly claimId: string;
  readonly claimFence: number;
  readonly expiresAt: string;
}

export interface AgentOsV1CanonicalPromptAuthorityBinding {
  readonly tenantId: string;
  readonly workloadId: string;
  readonly authorityDomain: string;
  readonly audience: readonly string[];
  readonly definitionDigest: string;
  readonly policyDigest: string;
  readonly capabilityDigest: string;
}

export interface AgentOsV1CanonicalPromptMessage {
  readonly role: "user";
  readonly content: string;
}

export interface AgentOsV1CanonicalPromptInput {
  readonly messages: readonly AgentOsV1CanonicalPromptMessage[];
}

/** Control 提交给 Worker 的 canonical prompt.start；生命周期写入仍只由 Kernel 完成。 */
export interface AgentOsV1CanonicalPromptStartRequest {
  readonly schemaVersion: "agent-os-canonical-prompt/v1";
  readonly operation: "prompt.start";
  readonly runId: string;
  readonly turnId: string;
  readonly attemptId: string;
  readonly instanceId: string;
  readonly storeGeneration: number;
  readonly claimId: string;
  readonly requestedAt: string;
  readonly authority: Readonly<AgentOsV1CanonicalPromptAuthorityBinding>;
  readonly grant: Readonly<ExecutionGrant>;
  readonly instance: Readonly<ExecutionInstance>;
  readonly prompt: Readonly<AgentOsV1CanonicalPromptInput>;
  readonly promptDigest: string;
  readonly intentDigest: string;
}

export type AgentOsV1CanonicalPromptStreamEpoch = `stream-epoch:${string}`;
export type AgentOsV1CanonicalPromptEventType =
  | "prompt.accepted"
  | "provider.output"
  | "provider.failure"
  | "provider.usage"
  | "provider.receipt"
  | "run.unknown"
  | "run.terminal";

export type AgentOsV1CanonicalPromptEventPayload =
  | Readonly<{
      requestId: string;
      promptDigest: string;
      intentDigest: string;
      grantId: string;
      claimId: string;
      claimFence: number;
      storeGeneration: number;
    }>
  | Readonly<{ text: string }>
  | Readonly<{ code: string; message: string }>
  | Readonly<{ inputTokens: number; outputTokens: number }>
  | Readonly<{ providerId: string; receiptDigest: string }>
  | Readonly<{ reason: string }>
  | Readonly<{
      status: "succeeded" | "failed" | "cancelled" | "unknown";
      resultDigest: string;
    }>;

export interface AgentOsV1CanonicalPromptEvent {
  readonly schemaVersion: "agent-os-canonical-prompt/v1";
  readonly eventId: string;
  readonly runId: string;
  readonly attemptId: string;
  readonly streamEpoch: AgentOsV1CanonicalPromptStreamEpoch;
  readonly sequence: number;
  readonly eventType: AgentOsV1CanonicalPromptEventType;
  readonly payload: AgentOsV1CanonicalPromptEventPayload;
  readonly createdAt: string;
  readonly digest: string;
}

export interface AgentOsV1CanonicalPromptCursor {
  readonly schemaVersion: "agent-os-canonical-prompt/v1";
  readonly runId: string;
  readonly streamEpoch: AgentOsV1CanonicalPromptStreamEpoch;
  readonly sequence: number;
  readonly watermark: number;
  readonly digest: string;
}

export type AgentOsV1CanonicalPromptState =
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export interface AgentOsV1CanonicalPromptSnapshot {
  readonly schemaVersion: "agent-os-canonical-prompt/v1";
  readonly runId: string;
  readonly attemptId: string;
  readonly instanceId: string;
  readonly storeGeneration: number;
  readonly streamEpoch: AgentOsV1CanonicalPromptStreamEpoch;
  readonly watermark: number;
  readonly state: AgentOsV1CanonicalPromptState;
  readonly terminal: boolean;
  readonly updatedAt: string;
  readonly digest: string;
}

export interface AgentOsV1CanonicalPromptReadRequest {
  readonly schemaVersion: "agent-os-canonical-prompt/v1";
  readonly operation: "prompt.read";
  readonly runId: string;
  readonly cursor: Readonly<AgentOsV1CanonicalPromptCursor> | null;
  readonly limit: number;
  readonly readAt: string;
}

export interface AgentOsV1CanonicalPromptCancelRequest {
  readonly schemaVersion: "agent-os-canonical-prompt/v1";
  readonly operation: "prompt.cancel";
  readonly runId: string;
  readonly claimId: string;
  readonly claimFence: number;
  readonly reason: string;
  readonly resultDigest: string;
  readonly cancelledAt: string;
}

export type AgentOsV1CanonicalPromptRequest =
  | AgentOsV1CanonicalPromptStartRequest
  | AgentOsV1CanonicalPromptReadRequest
  | AgentOsV1CanonicalPromptCancelRequest;

export interface AgentOsV1CanonicalPromptResponse {
  readonly schemaVersion: "agent-os-canonical-prompt/v1";
  readonly operation: "prompt.start" | "prompt.read" | "prompt.cancel";
  readonly disposition: "events" | "snapshot-required";
  readonly snapshot: Readonly<AgentOsV1CanonicalPromptSnapshot>;
  readonly events: readonly Readonly<AgentOsV1CanonicalPromptEvent>[];
  readonly cursor: Readonly<AgentOsV1CanonicalPromptCursor>;
  readonly replayed: boolean;
}

export type AgentOsV1AuthorityEpoch = `authority-epoch:${string}`;
export type AgentOsV1AppLifecycleState =
  | "first-run"
  | "awaiting-consent"
  | "offline-local"
  | "connected-managed"
  | "policy-stale"
  | "revoked"
  | "recovery-required";
export type AgentOsV1AppCompatibility = "compatible" | "update-required";

/** App 消费的原子投影页；事实仍由 canonical Prompt snapshot/cursor 提供。 */
export interface AgentOsV1AppProjectionPage {
  readonly schemaVersion: "agent-os-app-projection/v1";
  readonly tenantId: string;
  readonly authorityEpoch: AgentOsV1AuthorityEpoch;
  readonly lifecycle: AgentOsV1AppLifecycleState;
  readonly compatibility: AgentOsV1AppCompatibility;
  readonly response: Readonly<AgentOsV1CanonicalPromptResponse>;
}

export type AgentOsV1TerminalExitCode = 0 | 1 | 2 | 64 | 69 | 77 | 130;
export type AgentOsV1TerminalStatus =
  | "succeeded"
  | "failed"
  | "usage-error"
  | "cancelled"
  | "recovery-required"
  | "update-required"
  | "unavailable"
  | "auth-denied"
  | "policy-denied";
export type AgentOsV1TerminalFrame =
  | Readonly<{
      schemaVersion: "terminal-jsonl.v1";
      requestId: string;
      kind: "lifecycle";
      sequence: number;
      timestamp: string;
      lifecycle: AgentOsV1AppLifecycleState;
    }>
  | Readonly<{
      schemaVersion: "terminal-jsonl.v1";
      requestId: string;
      kind: "event";
      sequence: number;
      timestamp: string;
      event: Readonly<AgentOsV1CanonicalPromptEvent>;
    }>
  | Readonly<{
      schemaVersion: "terminal-jsonl.v1";
      requestId: string;
      kind: "error";
      sequence: number;
      timestamp: string;
      code: string;
      message: string;
      retryable: boolean;
    }>
  | Readonly<{
      schemaVersion: "terminal-jsonl.v1";
      requestId: string;
      kind: "terminal";
      sequence: number;
      timestamp: string;
      runId: string | null;
      status: AgentOsV1TerminalStatus;
      exitCode: AgentOsV1TerminalExitCode;
    }>;

export type AgentOsV1DestructiveCommandRisk = "high" | "critical";

export interface AgentOsV1DestructiveCommandIntent {
  readonly schemaVersion: "agent-os-destructive-command/v1";
  readonly tenantId: string;
  readonly targets: readonly OpaqueRef[];
  readonly commandId: string;
  readonly operation: string;
  readonly commandDigest: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: OpaqueRef;
  readonly risk: AgentOsV1DestructiveCommandRisk;
  readonly reason: string;
  readonly requestId: string;
  readonly authority: Readonly<DigestRef>;
}

/** 只能由服务端或显式 deterministic fake 签发；App 不得生成或延长该引用。 */
export interface AgentOsV1DestructiveCommandConfirmation {
  readonly schemaVersion: "agent-os-destructive-command/v1";
  readonly confirmationRef: OpaqueRef;
  readonly stepUpRef: OpaqueRef;
  readonly tenantId: string;
  readonly targets: readonly OpaqueRef[];
  readonly commandId: string;
  readonly operation: string;
  readonly commandDigest: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: OpaqueRef;
  readonly risk: AgentOsV1DestructiveCommandRisk;
  readonly reason: string;
  readonly requestId: string;
  readonly authority: Readonly<DigestRef>;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface AgentOsV1DestructiveCommandStepUpProof {
  readonly schemaVersion: "agent-os-destructive-command/v1";
  readonly confirmationRef: OpaqueRef;
  readonly stepUpRef: OpaqueRef;
  readonly stepUpProofRef: OpaqueRef;
  readonly tenantId: string;
  readonly targets: readonly OpaqueRef[];
  readonly commandId: string;
  readonly operation: string;
  readonly commandDigest: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: OpaqueRef;
  readonly risk: AgentOsV1DestructiveCommandRisk;
  readonly reason: string;
  readonly requestId: string;
  readonly authority: Readonly<DigestRef>;
  readonly completedAt: string;
  readonly expiresAt: string;
}

export interface AgentOsV1DestructiveCommandSubmission {
  readonly schemaVersion: "agent-os-destructive-command/v1";
  readonly confirmationRef: OpaqueRef;
  readonly stepUpRef: OpaqueRef;
  readonly stepUpProofRef: OpaqueRef;
  readonly tenantId: string;
  readonly targets: readonly OpaqueRef[];
  readonly commandId: string;
  readonly operation: string;
  readonly commandDigest: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: OpaqueRef;
  readonly risk: AgentOsV1DestructiveCommandRisk;
  readonly reason: string;
  readonly requestId: string;
  readonly authority: Readonly<DigestRef>;
  readonly submittedAt: string;
}

export type AgentOsV1DestructiveCommandRejection =
  | "expired"
  | "reused"
  | "revoked"
  | "cross-tenant"
  | "step-up-mismatch"
  | "revision-conflict"
  | "intent-drift";

/** DAR-479 reference journey 永不执行真实 effect，receipt 必须固定为 false。 */
export interface AgentOsV1DestructiveCommandReceipt {
  readonly schemaVersion: "agent-os-destructive-command/v1";
  readonly receiptRef: OpaqueRef;
  readonly confirmationRef: OpaqueRef;
  readonly stepUpProofRef: OpaqueRef;
  readonly tenantId: string;
  readonly targets: readonly OpaqueRef[];
  readonly commandId: string;
  readonly operation: string;
  readonly commandDigest: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: OpaqueRef;
  readonly risk: AgentOsV1DestructiveCommandRisk;
  readonly commandReason: string;
  readonly requestId: string;
  readonly authority: Readonly<DigestRef>;
  readonly status: "accepted-no-effect" | "rejected";
  readonly reason: AgentOsV1DestructiveCommandRejection | null;
  readonly effectPerformed: false;
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
