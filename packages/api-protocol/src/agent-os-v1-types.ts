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

export interface EnvironmentConstraints {
  readonly operatingSystems: readonly string[];
  readonly architectures: readonly string[];
  readonly network: NetworkConstraint;
}

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
  readonly capabilityPackage: Readonly<CapabilityPackageDescriptor>;
  readonly requestedScopes: readonly string[];
}

export interface HostProfile {
  readonly hostId: string;
  readonly hostKind: HostKind;
  readonly managementMode: ManagementMode;
  readonly role: DeploymentTarget;
  readonly authorityDomain: string;
  readonly capabilityCeiling: readonly string[];
  readonly supportedFeatures: readonly string[];
}

export interface AgentDeployment {
  readonly deploymentId: string;
  readonly target: DeploymentTarget;
  readonly agentId: string;
  readonly agentVersion: string;
  readonly hostId: string;
  readonly capabilityDigest: string;
}

export interface ExecutionInstance {
  readonly instanceId: string;
  readonly deploymentId: string;
  readonly hostId: string;
  readonly generation: number;
}

export interface RunSpec {
  readonly runId: string;
  readonly deploymentId: string;
  readonly capabilityScopes: readonly string[];
  readonly requiredFeatures: readonly string[];
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
  readonly capabilityDigest: string;
  readonly scope: readonly string[];
  readonly notBefore: string;
  readonly expiresAt: string;
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
