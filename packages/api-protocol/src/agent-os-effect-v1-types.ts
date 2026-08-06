import type {
  LeaseEpochRef,
  RevocationGenerationRef,
  RotationGenerationRef,
} from "./agent-os-v1-types.js";

/** Effect v1 只描述统一副作用边界，不选择或构造实际 adapter。 */
export type AgentOsEffectAdapterKind = "provider" | "mcp" | "skill" | "plugin" | "tool";

/** Unknown Effect 只能被人工或权威恢复流程收敛为终态，不允许隐式重试。 */
export type AgentOsUnknownEffectRecoveryResolutionV1 =
  | "confirm_succeeded"
  | "confirm_failed"
  | "compensated"
  | "abandoned";

/**
 * 从既有 ExecutionGrant、SessionGrant、RemoteLease 与 ExecutionClaimBinding 复制的不可变 pin。
 * digest 本身不是 authority；Worker 仍须向 Control 与 Kernel 的当前持久状态复核。
 */
export interface AgentOsEffectAuthorityBindingV1 {
  readonly grantId: string;
  readonly sessionGrantId: string;
  readonly leaseId: string;
  readonly leaseEpoch: LeaseEpochRef;
  readonly rotationGeneration: RotationGenerationRef;
  readonly revocationGeneration: RevocationGenerationRef;
  readonly tenantId: string;
  readonly workloadId: string;
  readonly principalId: string;
  readonly authorityDomain: string;
  readonly hostId: string;
  readonly deploymentId: string;
  readonly runId: string;
  readonly turnId: string;
  readonly attemptId: string;
  readonly instanceId: string;
  readonly instanceGeneration: number;
  readonly claimId: string;
  readonly claimFence: number;
  readonly storeId: string;
  readonly storeGeneration: number;
  readonly definitionDigest: string;
  readonly policyDigest: string;
  readonly capabilityDigest: string;
  readonly keyId: string;
}

/** 只固定 capability package 身份；不承载 secret、header、路径或 transport 配置。 */
export interface AgentOsEffectCapabilityBindingV1 {
  readonly packageId: string;
  readonly packageDigest: string;
  readonly capabilityId: string;
}

export interface AgentOsEffectIntentV1 {
  readonly schemaVersion: "agent-os-effect/v1";
  readonly effectId: string;
  readonly adapterKind: AgentOsEffectAdapterKind;
  readonly adapterId: string;
  readonly operation: string;
  readonly targetRef: `${string}:${string}`;
  readonly logicalKey: `${string}:${string}`;
  readonly authority: Readonly<AgentOsEffectAuthorityBindingV1>;
  readonly capability: Readonly<AgentOsEffectCapabilityBindingV1>;
  readonly audience: readonly string[];
  readonly scope: readonly string[];
  readonly requestSchemaDigest: string;
  readonly responseSchemaDigest: string;
  readonly handlerDigest: string;
  readonly inputDigest: string;
  readonly idempotencyKey: `idempotency:${string}`;
  readonly createdAt: string;
}

export interface AgentOsEffectPermitRequestV1 {
  readonly schemaVersion: "agent-os-effect/v1";
  readonly requestId: string;
  readonly intentDigest: string;
  readonly effectId: string;
  readonly adapterKind: AgentOsEffectAdapterKind;
  readonly adapterId: string;
  readonly targetRef: `${string}:${string}`;
  readonly logicalKey: `${string}:${string}`;
  readonly authority: Readonly<AgentOsEffectAuthorityBindingV1>;
  readonly capability: Readonly<AgentOsEffectCapabilityBindingV1>;
  readonly requestSchemaDigest: string;
  readonly responseSchemaDigest: string;
  readonly handlerDigest: string;
  readonly inputDigest: string;
  readonly idempotencyKey: `idempotency:${string}`;
  readonly requestedAudience: readonly [string];
  readonly requestedScope: readonly string[];
  readonly requestedAt: string;
  readonly notBefore: string;
  readonly expiresAt: string;
}

export interface AgentOsEffectPermitUnsignedV1 {
  readonly schemaVersion: "agent-os-effect/v1";
  readonly permitId: string;
  readonly issuerKind: "control";
  readonly issuerId: string;
  readonly requestDigest: string;
  readonly intentDigest: string;
  readonly effectId: string;
  readonly adapterKind: AgentOsEffectAdapterKind;
  readonly adapterId: string;
  readonly targetRef: `${string}:${string}`;
  readonly logicalKey: `${string}:${string}`;
  readonly authority: Readonly<AgentOsEffectAuthorityBindingV1>;
  readonly capability: Readonly<AgentOsEffectCapabilityBindingV1>;
  readonly requestSchemaDigest: string;
  readonly responseSchemaDigest: string;
  readonly handlerDigest: string;
  readonly inputDigest: string;
  readonly idempotencyKey: `idempotency:${string}`;
  readonly audience: readonly [string];
  readonly scope: readonly string[];
  readonly notBefore: string;
  readonly expiresAt: string;
  readonly issuedAt: string;
}

/** Control 是 EffectPermit 的唯一 issuer；协议层不持有签名密钥或签发状态。 */
export interface AgentOsEffectPermitV1 extends AgentOsEffectPermitUnsignedV1 {
  readonly permitDigest: string;
}

export interface AgentOsEffectUsageV1 {
  readonly inputUnits: number;
  readonly outputUnits: number;
  readonly totalUnits: number;
}

export type AgentOsEffectDispatchDispositionV1 = "succeeded" | "failed" | "unknown";

export interface AgentOsEffectDispatchReceiptUnsignedV1 {
  readonly schemaVersion: "agent-os-effect/v1";
  readonly receiptId: string;
  readonly disposition: AgentOsEffectDispatchDispositionV1;
  readonly intentDigest: string;
  readonly permitDigest: string;
  readonly effectId: string;
  readonly runId: string;
  readonly attemptId: string;
  readonly adapterKind: AgentOsEffectAdapterKind;
  readonly adapterId: string;
  readonly operation: string;
  readonly idempotencyKey: `idempotency:${string}`;
  readonly requestDigest: string;
  readonly responseDigest: string;
  readonly authority: Readonly<AgentOsEffectAuthorityBindingV1>;
  readonly usage: Readonly<AgentOsEffectUsageV1>;
  readonly dispatchedAt: string;
  readonly completedAt: string;
}

export interface AgentOsEffectDispatchReceiptV1 extends AgentOsEffectDispatchReceiptUnsignedV1 {
  readonly receiptDigest: string;
}

export interface AgentOsUnknownEffectRecoveryDecisionV1 {
  readonly schemaVersion: "agent-os-effect/v1";
  readonly decisionId: string;
  readonly actorId: string;
  readonly revision: number;
  readonly effectId: string;
  readonly resolution: AgentOsUnknownEffectRecoveryResolutionV1;
  readonly intentDigest: string;
  readonly permitDigest: string;
  readonly dispatchReceiptDigest: string;
  readonly authority: Readonly<AgentOsEffectAuthorityBindingV1>;
  readonly evidenceDigest: string;
  readonly reason: string;
  readonly decidedAt: string;
}
