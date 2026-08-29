import {
  AgentOsV1ContractError,
  parseAgentOsV1Contract,
  parseAgentOsV1ExecutionClaimBinding,
  type AgentOsV1Contract,
  type ExecutionClaimBinding,
} from "./agent-os-v1-contract.js";
import type {
  AgentOsEffectAdapterKind,
  AgentOsEffectAuthorityBindingV1,
  AgentOsEffectCapabilityBindingV1,
  AgentOsEffectDispatchDispositionV1,
  AgentOsEffectDispatchReceiptV1,
  AgentOsEffectDispatchReceiptUnsignedV1,
  AgentOsEffectIntentV1,
  AgentOsEffectPermitRequestV1,
  AgentOsEffectPermitV1,
  AgentOsEffectPermitUnsignedV1,
  AgentOsEffectUsageV1,
  AgentOsUnknownEffectRecoveryDecisionV1,
  AgentOsUnknownEffectRecoveryResolutionV1,
} from "./agent-os-effect-v1-types.js";
import { deepFreeze, sha256Hex } from "./contract-primitives.js";

export type {
  AgentOsEffectAdapterKind,
  AgentOsEffectAuthorityBindingV1,
  AgentOsEffectCapabilityBindingV1,
  AgentOsEffectDispatchDispositionV1,
  AgentOsEffectDispatchReceiptV1,
  AgentOsEffectDispatchReceiptUnsignedV1,
  AgentOsEffectIntentV1,
  AgentOsEffectPermitRequestV1,
  AgentOsEffectPermitV1,
  AgentOsEffectPermitUnsignedV1,
  AgentOsEffectUsageV1,
  AgentOsUnknownEffectRecoveryDecisionV1,
  AgentOsUnknownEffectRecoveryResolutionV1,
} from "./agent-os-effect-v1-types.js";

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._-]{0,127}$/u;
const OPAQUE_REF_PATTERN = /^[a-z][a-z0-9._-]{0,63}:[a-z][a-z0-9._-]{0,127}$/u;
const LEASE_EPOCH_PATTERN = /^lease-epoch:[a-z][a-z0-9._-]{0,127}$/u;
const ROTATION_GENERATION_PATTERN = /^rotation:[a-z][a-z0-9._-]{0,127}$/u;
const REVOCATION_GENERATION_PATTERN = /^revocation:[a-z][a-z0-9._-]{0,127}$/u;
const RFC3339_MILLIS_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u;
const MAX_BINDING_ITEMS = 32;

const EFFECT_PERMIT_UNSIGNED_KEYS = [
  "schemaVersion",
  "permitId",
  "issuerKind",
  "issuerId",
  "requestDigest",
  "intentDigest",
  "effectId",
  "adapterKind",
  "adapterId",
  "targetRef",
  "logicalKey",
  "authority",
  "capability",
  "requestSchemaDigest",
  "responseSchemaDigest",
  "handlerDigest",
  "inputDigest",
  "idempotencyKey",
  "audience",
  "scope",
  "notBefore",
  "expiresAt",
  "issuedAt",
] as const;

const EFFECT_RECEIPT_UNSIGNED_KEYS = [
  "schemaVersion",
  "receiptId",
  "disposition",
  "intentDigest",
  "permitDigest",
  "effectId",
  "runId",
  "attemptId",
  "adapterKind",
  "adapterId",
  "operation",
  "idempotencyKey",
  "requestDigest",
  "responseDigest",
  "authority",
  "usage",
  "dispatchedAt",
  "completedAt",
] as const;

export interface AgentOsEffectIntentAuthorityInputV1 {
  readonly contract: unknown;
  readonly claim: unknown;
  readonly intent: unknown;
}

export interface AgentOsEffectPermitRequestRelationshipInputV1 extends AgentOsEffectIntentAuthorityInputV1 {
  readonly request: unknown;
}

export interface AgentOsEffectPermitRelationshipInputV1 extends AgentOsEffectPermitRequestRelationshipInputV1 {
  readonly permit: unknown;
}

export interface AgentOsEffectDispatchReceiptRelationshipInputV1 {
  readonly intent: unknown;
  readonly permit: unknown;
  readonly receipt: unknown;
}

export interface AgentOsUnknownEffectRecoveryDecisionRelationshipInputV1 extends AgentOsEffectDispatchReceiptRelationshipInputV1 {
  readonly decision: unknown;
}

/** 严格解析并深度冻结统一 Effect Intent。 */
export function parseAgentOsEffectIntentV1(
  input: unknown,
): Readonly<AgentOsEffectIntentV1> {
  const value = effectRecord(input, "effect intent", [
    "schemaVersion",
    "effectId",
    "adapterKind",
    "adapterId",
    "operation",
    "targetRef",
    "logicalKey",
    "authority",
    "capability",
    "audience",
    "scope",
    "requestSchemaDigest",
    "responseSchemaDigest",
    "handlerDigest",
    "inputDigest",
    "idempotencyKey",
    "createdAt",
  ]);
  return deepFreeze({
    schemaVersion: "agent-os-effect/v1",
    effectId: identifier(value.effectId, "effect intent effectId"),
    adapterKind: adapterKind(value.adapterKind, "effect intent adapterKind"),
    adapterId: identifier(value.adapterId, "effect intent adapterId"),
    operation: identifier(value.operation, "effect intent operation"),
    targetRef: opaqueRef(value.targetRef, "effect intent targetRef"),
    logicalKey: opaqueRef(value.logicalKey, "effect intent logicalKey"),
    authority: authorityBinding(value.authority, "effect intent authority"),
    capability: capabilityBinding(value.capability, "effect intent capability"),
    audience: singletonAudience(value.audience, "effect intent audience"),
    scope: identifiers(value.scope, "effect intent scope"),
    requestSchemaDigest: digest(
      value.requestSchemaDigest,
      "effect intent requestSchemaDigest",
    ),
    responseSchemaDigest: digest(
      value.responseSchemaDigest,
      "effect intent responseSchemaDigest",
    ),
    handlerDigest: digest(value.handlerDigest, "effect intent handlerDigest"),
    inputDigest: digest(value.inputDigest, "effect intent inputDigest"),
    idempotencyKey: qualifiedRef(
      value.idempotencyKey,
      "idempotency",
      "effect intent idempotencyKey",
    ),
    createdAt: instant(value.createdAt, "effect intent createdAt"),
  });
}

/** 严格解析 Control 签发前的 permit request。 */
export function parseAgentOsEffectPermitRequestV1(
  input: unknown,
): Readonly<AgentOsEffectPermitRequestV1> {
  const value = effectRecord(input, "effect permit request", [
    "schemaVersion",
    "requestId",
    "intentDigest",
    "effectId",
    "adapterKind",
    "adapterId",
    "targetRef",
    "logicalKey",
    "authority",
    "capability",
    "requestSchemaDigest",
    "responseSchemaDigest",
    "handlerDigest",
    "inputDigest",
    "idempotencyKey",
    "requestedAudience",
    "requestedScope",
    "requestedAt",
    "notBefore",
    "expiresAt",
  ]);
  const notBefore = instant(value.notBefore, "effect permit request notBefore");
  const expiresAt = instant(value.expiresAt, "effect permit request expiresAt");
  assertOrderedWindow(notBefore, expiresAt, "effect permit request");
  return deepFreeze({
    schemaVersion: "agent-os-effect/v1",
    requestId: identifier(value.requestId, "effect permit request requestId"),
    intentDigest: digest(
      value.intentDigest,
      "effect permit request intentDigest",
    ),
    effectId: identifier(value.effectId, "effect permit request effectId"),
    adapterKind: adapterKind(
      value.adapterKind,
      "effect permit request adapterKind",
    ),
    adapterId: identifier(value.adapterId, "effect permit request adapterId"),
    targetRef: opaqueRef(value.targetRef, "effect permit request targetRef"),
    logicalKey: opaqueRef(value.logicalKey, "effect permit request logicalKey"),
    authority: authorityBinding(
      value.authority,
      "effect permit request authority",
    ),
    capability: capabilityBinding(
      value.capability,
      "effect permit request capability",
    ),
    requestSchemaDigest: digest(
      value.requestSchemaDigest,
      "effect permit request requestSchemaDigest",
    ),
    responseSchemaDigest: digest(
      value.responseSchemaDigest,
      "effect permit request responseSchemaDigest",
    ),
    handlerDigest: digest(
      value.handlerDigest,
      "effect permit request handlerDigest",
    ),
    inputDigest: digest(value.inputDigest, "effect permit request inputDigest"),
    idempotencyKey: qualifiedRef(
      value.idempotencyKey,
      "idempotency",
      "effect permit request idempotencyKey",
    ),
    requestedAudience: singletonAudience(
      value.requestedAudience,
      "effect permit request requestedAudience",
    ),
    requestedScope: identifiers(
      value.requestedScope,
      "effect permit request requestedScope",
    ),
    requestedAt: instant(
      value.requestedAt,
      "effect permit request requestedAt",
    ),
    notBefore,
    expiresAt,
  });
}

/** issuerKind 被固定为 control；本模块不持有或验证签名材料。 */
export function parseAgentOsEffectPermitV1(
  input: unknown,
): Readonly<AgentOsEffectPermitV1> {
  const value = record(input, "effect permit");
  exact(
    value,
    [...EFFECT_PERMIT_UNSIGNED_KEYS, "permitDigest"],
    "effect permit",
  );
  const unsigned = permitUnsigned(value);
  const permitDigest = digest(value.permitDigest, "effect permit permitDigest");
  const expectedDigest = contentDigest(canonicalJson(unsigned));
  if (permitDigest !== expectedDigest)
    fail("DRIFT_DETECTED", "effect permit permitDigest is self-inconsistent");
  return deepFreeze({ ...unsigned, permitDigest });
}

/** receipt 是 adapter outcome 的不可变摘要，不携带原始 request、response 或错误 payload。 */
export function parseAgentOsEffectDispatchReceiptV1(
  input: unknown,
): Readonly<AgentOsEffectDispatchReceiptV1> {
  const value = record(input, "effect dispatch receipt");
  exact(
    value,
    [...EFFECT_RECEIPT_UNSIGNED_KEYS, "receiptDigest"],
    "effect dispatch receipt",
  );
  const unsigned = receiptUnsigned(value);
  const receiptDigest = digest(
    value.receiptDigest,
    "effect dispatch receipt receiptDigest",
  );
  const expectedDigest = contentDigest(canonicalJson(unsigned));
  if (receiptDigest !== expectedDigest)
    fail(
      "DRIFT_DETECTED",
      "effect dispatch receipt receiptDigest is self-inconsistent",
    );
  return deepFreeze({ ...unsigned, receiptDigest });
}

/** Unknown Effect 只能收敛为四个显式终态；没有 retry 或 redispatch 字段。 */
export function parseAgentOsUnknownEffectRecoveryDecisionV1(
  input: unknown,
): Readonly<AgentOsUnknownEffectRecoveryDecisionV1> {
  const value = effectRecord(input, "unknown effect recovery decision", [
    "schemaVersion",
    "decisionId",
    "actorId",
    "revision",
    "effectId",
    "resolution",
    "intentDigest",
    "permitDigest",
    "dispatchReceiptDigest",
    "authority",
    "evidenceDigest",
    "reason",
    "decidedAt",
  ]);
  return deepFreeze({
    schemaVersion: "agent-os-effect/v1",
    decisionId: identifier(
      value.decisionId,
      "unknown effect recovery decision decisionId",
    ),
    actorId: identifier(
      value.actorId,
      "unknown effect recovery decision actorId",
    ),
    revision: positiveInteger(
      value.revision,
      "unknown effect recovery decision revision",
    ),
    effectId: identifier(
      value.effectId,
      "unknown effect recovery decision effectId",
    ),
    resolution: recoveryResolution(value.resolution),
    intentDigest: digest(
      value.intentDigest,
      "unknown effect recovery decision intentDigest",
    ),
    permitDigest: digest(
      value.permitDigest,
      "unknown effect recovery decision permitDigest",
    ),
    dispatchReceiptDigest: digest(
      value.dispatchReceiptDigest,
      "unknown effect recovery decision dispatchReceiptDigest",
    ),
    authority: authorityBinding(
      value.authority,
      "unknown effect recovery decision authority",
    ),
    evidenceDigest: digest(
      value.evidenceDigest,
      "unknown effect recovery decision evidenceDigest",
    ),
    reason: canonicalText(
      value.reason,
      "unknown effect recovery decision reason",
      1_024,
    ),
    decidedAt: instant(
      value.decidedAt,
      "unknown effect recovery decision decidedAt",
    ),
  });
}

export function serializeAgentOsEffectIntentV1(input: unknown): string {
  return canonicalJson(parseAgentOsEffectIntentV1(input));
}

export function serializeAgentOsEffectPermitRequestV1(input: unknown): string {
  return canonicalJson(parseAgentOsEffectPermitRequestV1(input));
}

export function serializeAgentOsEffectPermitV1(input: unknown): string {
  return canonicalJson(parseAgentOsEffectPermitV1(input));
}

export function serializeAgentOsEffectDispatchReceiptV1(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsEffectDispatchReceiptV1(input));
}

export function serializeAgentOsUnknownEffectRecoveryDecisionV1(
  input: unknown,
): string {
  return canonicalJson(parseAgentOsUnknownEffectRecoveryDecisionV1(input));
}

export function createAgentOsEffectIntentDigestV1(input: unknown): string {
  return contentDigest(serializeAgentOsEffectIntentV1(input));
}

export function createAgentOsEffectPermitRequestDigestV1(
  input: unknown,
): string {
  return contentDigest(serializeAgentOsEffectPermitRequestV1(input));
}

export function createAgentOsEffectPermitDigestV1(input: unknown): string {
  const value = record(input, "effect permit digest input");
  if ("permitDigest" in value)
    return parseAgentOsEffectPermitV1(input).permitDigest;
  exact(value, EFFECT_PERMIT_UNSIGNED_KEYS, "effect permit digest input");
  return contentDigest(canonicalJson(permitUnsigned(value)));
}

export function createAgentOsEffectDispatchReceiptDigestV1(
  input: unknown,
): string {
  const value = record(input, "effect dispatch receipt digest input");
  if ("receiptDigest" in value)
    return parseAgentOsEffectDispatchReceiptV1(input).receiptDigest;
  exact(
    value,
    EFFECT_RECEIPT_UNSIGNED_KEYS,
    "effect dispatch receipt digest input",
  );
  return contentDigest(canonicalJson(receiptUnsigned(value)));
}

export function createAgentOsUnknownEffectRecoveryDecisionDigestV1(
  input: unknown,
): string {
  return contentDigest(serializeAgentOsUnknownEffectRecoveryDecisionV1(input));
}

/**
 * 将 Effect Intent 固定到既有 agent-os/v1 authority。协议摘要不是授权；这里仅做纯关系校验。
 */
export function assertAgentOsEffectIntentAuthorityV1(
  input: AgentOsEffectIntentAuthorityInputV1,
): void {
  const intent = parseAgentOsEffectIntentV1(input.intent);
  const context = authorityContext(
    input.contract,
    input.claim,
    intent.authority.turnId,
  );
  assertSame(
    "effect intent authority pins drifted",
    intent.authority,
    context.authority,
  );
  const descriptor = context.contract.agentDefinition.capabilityPackage;
  if (
    intent.capability.packageId !== descriptor.packageId ||
    intent.capability.packageDigest !== descriptor.digest ||
    intent.capability.capabilityId !== intent.adapterId
  )
    fail("DRIFT_DETECTED", "effect intent capability package pins drifted");
  assertAdapterTransport(intent.adapterKind, descriptor.transport.kind);
  const declaredCapabilities =
    intent.adapterKind === "skill"
      ? context.contract.agentDefinition.skills
      : context.contract.agentDefinition.tools;
  if (
    !declaredCapabilities.some(
      (candidate) =>
        candidate.id === intent.capability.capabilityId &&
        candidate.packageDigest === intent.capability.packageDigest,
    )
  )
    fail(
      "DRIFT_DETECTED",
      "effect intent capability is not declared by the agent definition",
    );
  narrow(
    intent.audience,
    context.contract.executionGrant.audience,
    "effect audience expands grant",
  );
  narrow(
    intent.scope,
    context.contract.executionGrant.scope,
    "effect scope expands grant",
  );
  narrow(
    intent.scope,
    context.contract.executionGrant.sessionGrant.scope,
    "effect scope expands session grant",
  );
  narrow(
    intent.scope,
    context.lease.scope,
    "effect scope expands remote lease",
  );
  narrow(
    intent.scope,
    context.contract.runSpec.capabilityScopes,
    "effect scope expands run capability scopes",
  );
  assertWithinAuthorityWindow(
    intent.createdAt,
    context,
    "effect intent createdAt",
  );
}

export function assertAgentOsEffectPermitRequestRelationshipV1(
  input: AgentOsEffectPermitRequestRelationshipInputV1,
): void {
  assertAgentOsEffectIntentAuthorityV1(input);
  const intent = parseAgentOsEffectIntentV1(input.intent);
  const context = authorityContext(
    input.contract,
    input.claim,
    intent.authority.turnId,
  );
  const request = parseAgentOsEffectPermitRequestV1(input.request);
  if (request.intentDigest !== createAgentOsEffectIntentDigestV1(intent))
    fail(
      "DRIFT_DETECTED",
      "effect permit request intentDigest is inconsistent",
    );
  if (request.effectId !== intent.effectId)
    fail("DRIFT_DETECTED", "effect permit request effectId drifted");
  assertSame(
    "effect permit request authority drifted",
    request.authority,
    intent.authority,
  );
  assertSame(
    "effect permit request capability drifted",
    request.capability,
    intent.capability,
  );
  if (
    request.adapterKind !== intent.adapterKind ||
    request.adapterId !== intent.adapterId ||
    request.targetRef !== intent.targetRef ||
    request.logicalKey !== intent.logicalKey ||
    request.requestSchemaDigest !== intent.requestSchemaDigest ||
    request.responseSchemaDigest !== intent.responseSchemaDigest ||
    request.handlerDigest !== intent.handlerDigest ||
    request.inputDigest !== intent.inputDigest ||
    request.idempotencyKey !== intent.idempotencyKey
  )
    fail("DRIFT_DETECTED", "effect permit request operation pins drifted");
  narrow(
    request.requestedAudience,
    intent.audience,
    "effect permit request audience expands intent",
  );
  narrow(
    request.requestedScope,
    intent.scope,
    "effect permit request scope expands intent",
  );
  if (
    request.requestedAt < intent.createdAt ||
    request.requestedAt > request.notBefore ||
    request.notBefore < intent.createdAt
  )
    fail(
      "GRANT_EXPANSION",
      "effect permit request timing precedes its intent or request",
    );
  assertWindowWithinAuthority(
    request.notBefore,
    request.expiresAt,
    context,
    "permit request",
  );
}

export function assertAgentOsEffectPermitRelationshipV1(
  input: AgentOsEffectPermitRelationshipInputV1,
): void {
  assertAgentOsEffectPermitRequestRelationshipV1(input);
  const contract = parseAgentOsV1Contract(input.contract);
  const intent = parseAgentOsEffectIntentV1(input.intent);
  const request = parseAgentOsEffectPermitRequestV1(input.request);
  const permit = parseAgentOsEffectPermitV1(input.permit);
  if (permit.issuerId !== contract.executionGrant.issuer)
    fail(
      "DRIFT_DETECTED",
      "effect permit Control issuer differs from the execution grant issuer",
    );
  if (
    permit.requestDigest !== createAgentOsEffectPermitRequestDigestV1(request)
  )
    fail("DRIFT_DETECTED", "effect permit requestDigest is inconsistent");
  if (permit.intentDigest !== createAgentOsEffectIntentDigestV1(intent))
    fail("DRIFT_DETECTED", "effect permit intentDigest is inconsistent");
  if (permit.effectId !== request.effectId)
    fail("DRIFT_DETECTED", "effect permit effectId drifted");
  assertSame(
    "effect permit authority drifted",
    permit.authority,
    request.authority,
  );
  assertSame(
    "effect permit capability drifted",
    permit.capability,
    request.capability,
  );
  if (
    permit.adapterKind !== request.adapterKind ||
    permit.adapterId !== request.adapterId ||
    permit.targetRef !== request.targetRef ||
    permit.logicalKey !== request.logicalKey ||
    permit.requestSchemaDigest !== request.requestSchemaDigest ||
    permit.responseSchemaDigest !== request.responseSchemaDigest ||
    permit.handlerDigest !== request.handlerDigest ||
    permit.inputDigest !== request.inputDigest ||
    permit.idempotencyKey !== request.idempotencyKey
  )
    fail("DRIFT_DETECTED", "effect permit operation and schema pins drifted");
  narrow(
    permit.audience,
    request.requestedAudience,
    "effect permit audience expands request",
  );
  narrow(
    permit.scope,
    request.requestedScope,
    "effect permit scope expands request",
  );
  narrowWindow(
    permit.notBefore,
    permit.expiresAt,
    request.notBefore,
    request.expiresAt,
    "effect permit validity expands request",
  );
  if (permit.issuedAt < request.notBefore || permit.issuedAt > permit.expiresAt)
    fail(
      "DRIFT_DETECTED",
      "effect permit issuedAt is outside the requested validity window",
    );
}

export function assertAgentOsEffectDispatchReceiptRelationshipV1(
  input: AgentOsEffectDispatchReceiptRelationshipInputV1,
): void {
  const intent = parseAgentOsEffectIntentV1(input.intent);
  const permit = parseAgentOsEffectPermitV1(input.permit);
  const receipt = parseAgentOsEffectDispatchReceiptV1(input.receipt);
  if (
    receipt.intentDigest !== createAgentOsEffectIntentDigestV1(intent) ||
    receipt.permitDigest !== permit.permitDigest
  )
    fail(
      "DRIFT_DETECTED",
      "effect dispatch receipt digest binding is inconsistent",
    );
  if (
    receipt.effectId !== intent.effectId ||
    receipt.runId !== intent.authority.runId ||
    receipt.attemptId !== intent.authority.attemptId ||
    receipt.adapterKind !== intent.adapterKind ||
    receipt.adapterId !== intent.adapterId ||
    receipt.operation !== intent.operation ||
    receipt.idempotencyKey !== intent.idempotencyKey ||
    receipt.requestDigest !== intent.inputDigest
  )
    fail("DRIFT_DETECTED", "effect dispatch receipt operation binding drifted");
  assertSame(
    "effect dispatch receipt authority drifted",
    receipt.authority,
    intent.authority,
  );
  assertSame(
    "effect permit does not bind the dispatched intent",
    permit.authority,
    intent.authority,
  );
  assertSame(
    "effect permit capability differs from the dispatched intent",
    permit.capability,
    intent.capability,
  );
  if (
    permit.intentDigest !== receipt.intentDigest ||
    permit.effectId !== receipt.effectId ||
    permit.adapterKind !== intent.adapterKind ||
    permit.adapterId !== intent.adapterId ||
    permit.targetRef !== intent.targetRef ||
    permit.logicalKey !== intent.logicalKey ||
    permit.requestSchemaDigest !== intent.requestSchemaDigest ||
    permit.responseSchemaDigest !== intent.responseSchemaDigest ||
    permit.handlerDigest !== intent.handlerDigest ||
    permit.inputDigest !== intent.inputDigest ||
    permit.idempotencyKey !== intent.idempotencyKey
  )
    fail("DRIFT_DETECTED", "effect dispatch receipt differs from its permit");
  narrow(
    permit.audience,
    intent.audience,
    "effect permit audience expands dispatched intent",
  );
  narrow(
    permit.scope,
    intent.scope,
    "effect permit scope expands dispatched intent",
  );
  if (permit.issuedAt < intent.createdAt || permit.notBefore < intent.createdAt)
    fail("DRIFT_DETECTED", "effect permit predates the dispatched intent");
  if (
    receipt.dispatchedAt < permit.notBefore ||
    receipt.dispatchedAt > permit.expiresAt
  )
    fail("DRIFT_DETECTED", "effect dispatch began outside permit validity");
}

export function assertAgentOsUnknownEffectRecoveryDecisionRelationshipV1(
  input: AgentOsUnknownEffectRecoveryDecisionRelationshipInputV1,
): void {
  assertAgentOsEffectDispatchReceiptRelationshipV1(input);
  const intent = parseAgentOsEffectIntentV1(input.intent);
  const permit = parseAgentOsEffectPermitV1(input.permit);
  const receipt = parseAgentOsEffectDispatchReceiptV1(input.receipt);
  const decision = parseAgentOsUnknownEffectRecoveryDecisionV1(input.decision);
  if (receipt.disposition !== "unknown")
    fail(
      "INVALID_VALUE",
      "unknown effect recovery requires an unknown dispatch receipt",
    );
  if (
    decision.intentDigest !== createAgentOsEffectIntentDigestV1(intent) ||
    decision.permitDigest !== permit.permitDigest ||
    decision.dispatchReceiptDigest !== receipt.receiptDigest
  )
    fail(
      "DRIFT_DETECTED",
      "unknown effect recovery decision digest binding is inconsistent",
    );
  if (decision.effectId !== intent.effectId)
    fail("DRIFT_DETECTED", "unknown effect recovery decision effectId drifted");
  assertSame(
    "unknown effect recovery decision authority drifted",
    decision.authority,
    intent.authority,
  );
  if (decision.decidedAt < receipt.completedAt)
    fail(
      "DRIFT_DETECTED",
      "unknown effect recovery decision predates dispatch completion",
    );
}

function authorityContext(
  contractInput: unknown,
  claimInput: unknown,
  turnIdInput: unknown,
): {
  readonly contract: Readonly<AgentOsV1Contract>;
  readonly claim: Readonly<ExecutionClaimBinding>;
  readonly lease: Extract<
    AgentOsV1Contract["executionGrant"]["leaseBinding"],
    { kind: "remote" }
  >;
  readonly authority: Readonly<AgentOsEffectAuthorityBindingV1>;
} {
  const contract = parseAgentOsV1Contract(contractInput);
  const claim = parseAgentOsV1ExecutionClaimBinding(claimInput);
  const turnId = identifier(turnIdInput, "effect authority turnId");
  const grant = contract.executionGrant;
  const lease = grant.leaseBinding;
  if (grant.kind === "local" || lease.kind !== "remote")
    fail(
      "GRANT_EXPANSION",
      "effect dispatch requires a remote or delegated grant and lease",
    );
  if (
    claim.grantId !== grant.grantId ||
    claim.leaseId !== lease.leaseId ||
    claim.leaseEpoch !== lease.epoch ||
    claim.authorityDomain !== grant.authorityDomain ||
    claim.runId !== grant.runId ||
    claim.attemptId !== grant.attemptId ||
    claim.instanceId !== contract.executionInstance.instanceId ||
    claim.instanceGeneration !== contract.executionInstance.generation ||
    lease.generation !== contract.executionInstance.generation
  )
    fail(
      "DRIFT_DETECTED",
      "effect claim does not pin the current execution authority",
    );
  if (claim.expiresAt > grant.expiresAt || claim.expiresAt > lease.expiresAt)
    fail("GRANT_EXPANSION", "effect claim validity expands its grant or lease");
  const authority = deepFreeze({
    grantId: grant.grantId,
    sessionGrantId: grant.sessionGrant.grantId,
    leaseId: lease.leaseId,
    leaseEpoch: lease.epoch,
    rotationGeneration: grant.rotationGeneration,
    revocationGeneration: grant.revocationGeneration,
    tenantId: grant.tenantId,
    workloadId: grant.workloadId,
    principalId: grant.sessionGrant.principalId,
    authorityDomain: grant.authorityDomain,
    hostId: grant.hostId,
    deploymentId: grant.deploymentId,
    runId: grant.runId,
    turnId,
    attemptId: grant.attemptId,
    instanceId: grant.instanceId,
    instanceGeneration: claim.instanceGeneration,
    claimId: claim.claimId,
    claimFence: claim.claimFence,
    storeId: claim.storeId,
    storeGeneration: claim.storeGeneration,
    definitionDigest: grant.definitionDigest,
    policyDigest: grant.policyDigest,
    capabilityDigest: grant.capabilityDigest,
    keyId: grant.keyId,
  } satisfies AgentOsEffectAuthorityBindingV1);
  return { contract, claim, lease, authority };
}

function assertWithinAuthorityWindow(
  value: string,
  context: ReturnType<typeof authorityContext>,
  label: string,
): void {
  const grant = context.contract.executionGrant;
  if (
    value < grant.notBefore ||
    value < grant.sessionGrant.notBefore ||
    value < context.lease.notBefore ||
    value > grant.expiresAt ||
    value > grant.sessionGrant.expiresAt ||
    value > context.lease.expiresAt ||
    value > context.claim.expiresAt
  )
    fail("GRANT_EXPANSION", `${label} is outside the current authority window`);
}

function assertWindowWithinAuthority(
  notBefore: string,
  expiresAt: string,
  context: ReturnType<typeof authorityContext>,
  label: string,
): void {
  const grant = context.contract.executionGrant;
  narrowWindow(
    notBefore,
    expiresAt,
    grant.notBefore,
    grant.expiresAt,
    `${label} expands grant`,
  );
  narrowWindow(
    notBefore,
    expiresAt,
    grant.sessionGrant.notBefore,
    grant.sessionGrant.expiresAt,
    `${label} expands session grant`,
  );
  narrowWindow(
    notBefore,
    expiresAt,
    context.lease.notBefore,
    context.lease.expiresAt,
    `${label} expands remote lease`,
  );
  if (expiresAt > context.claim.expiresAt)
    fail("GRANT_EXPANSION", `${label} expands the active claim`);
}

function permitUnsigned(
  value: Record<string, unknown>,
): Readonly<AgentOsEffectPermitUnsignedV1> {
  if (value.schemaVersion !== "agent-os-effect/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "effect permit schemaVersion must equal agent-os-effect/v1",
    );
  if (value.issuerKind !== "control")
    fail("INVALID_VALUE", "effect permit issuerKind must equal control");
  const notBefore = instant(value.notBefore, "effect permit notBefore");
  const expiresAt = instant(value.expiresAt, "effect permit expiresAt");
  assertOrderedWindow(notBefore, expiresAt, "effect permit");
  return deepFreeze({
    schemaVersion: "agent-os-effect/v1",
    permitId: identifier(value.permitId, "effect permit permitId"),
    issuerKind: "control",
    issuerId: identifier(value.issuerId, "effect permit issuerId"),
    requestDigest: digest(value.requestDigest, "effect permit requestDigest"),
    intentDigest: digest(value.intentDigest, "effect permit intentDigest"),
    effectId: identifier(value.effectId, "effect permit effectId"),
    adapterKind: adapterKind(value.adapterKind, "effect permit adapterKind"),
    adapterId: identifier(value.adapterId, "effect permit adapterId"),
    targetRef: opaqueRef(value.targetRef, "effect permit targetRef"),
    logicalKey: opaqueRef(value.logicalKey, "effect permit logicalKey"),
    authority: authorityBinding(value.authority, "effect permit authority"),
    capability: capabilityBinding(value.capability, "effect permit capability"),
    requestSchemaDigest: digest(
      value.requestSchemaDigest,
      "effect permit requestSchemaDigest",
    ),
    responseSchemaDigest: digest(
      value.responseSchemaDigest,
      "effect permit responseSchemaDigest",
    ),
    handlerDigest: digest(value.handlerDigest, "effect permit handlerDigest"),
    inputDigest: digest(value.inputDigest, "effect permit inputDigest"),
    idempotencyKey: qualifiedRef(
      value.idempotencyKey,
      "idempotency",
      "effect permit idempotencyKey",
    ),
    audience: singletonAudience(value.audience, "effect permit audience"),
    scope: identifiers(value.scope, "effect permit scope"),
    notBefore,
    expiresAt,
    issuedAt: instant(value.issuedAt, "effect permit issuedAt"),
  });
}

function receiptUnsigned(
  value: Record<string, unknown>,
): Readonly<AgentOsEffectDispatchReceiptUnsignedV1> {
  if (value.schemaVersion !== "agent-os-effect/v1")
    fail(
      "UNSUPPORTED_VERSION",
      "effect dispatch receipt schemaVersion must equal agent-os-effect/v1",
    );
  const disposition = dispatchDisposition(value.disposition);
  const dispatchedAt = instant(
    value.dispatchedAt,
    "effect dispatch receipt dispatchedAt",
  );
  const completedAt = instant(
    value.completedAt,
    "effect dispatch receipt completedAt",
  );
  if (completedAt < dispatchedAt)
    fail(
      "DRIFT_DETECTED",
      "effect dispatch receipt completion predates dispatch",
    );
  const usage = effectUsage(value.usage);
  if (disposition === "unknown" && usage.totalUnits !== 0)
    fail(
      "DRIFT_DETECTED",
      "unknown effect dispatch receipt must not claim usage",
    );
  return deepFreeze({
    schemaVersion: "agent-os-effect/v1",
    receiptId: identifier(value.receiptId, "effect dispatch receipt receiptId"),
    disposition,
    intentDigest: digest(
      value.intentDigest,
      "effect dispatch receipt intentDigest",
    ),
    permitDigest: digest(
      value.permitDigest,
      "effect dispatch receipt permitDigest",
    ),
    effectId: identifier(value.effectId, "effect dispatch receipt effectId"),
    runId: identifier(value.runId, "effect dispatch receipt runId"),
    attemptId: identifier(value.attemptId, "effect dispatch receipt attemptId"),
    adapterKind: adapterKind(
      value.adapterKind,
      "effect dispatch receipt adapterKind",
    ),
    adapterId: identifier(value.adapterId, "effect dispatch receipt adapterId"),
    operation: identifier(value.operation, "effect dispatch receipt operation"),
    idempotencyKey: qualifiedRef(
      value.idempotencyKey,
      "idempotency",
      "effect dispatch receipt idempotencyKey",
    ),
    requestDigest: digest(
      value.requestDigest,
      "effect dispatch receipt requestDigest",
    ),
    responseDigest: digest(
      value.responseDigest,
      "effect dispatch receipt responseDigest",
    ),
    authority: authorityBinding(
      value.authority,
      "effect dispatch receipt authority",
    ),
    usage,
    dispatchedAt,
    completedAt,
  });
}

function effectUsage(input: unknown): Readonly<AgentOsEffectUsageV1> {
  const value = record(input, "effect dispatch receipt usage");
  exact(
    value,
    ["inputUnits", "outputUnits", "totalUnits"],
    "effect dispatch receipt usage",
  );
  const inputUnits = nonNegativeInteger(
    value.inputUnits,
    "effect usage inputUnits",
  );
  const outputUnits = nonNegativeInteger(
    value.outputUnits,
    "effect usage outputUnits",
  );
  const totalUnits = nonNegativeInteger(
    value.totalUnits,
    "effect usage totalUnits",
  );
  if (
    !Number.isSafeInteger(inputUnits + outputUnits) ||
    totalUnits !== inputUnits + outputUnits
  )
    fail("DRIFT_DETECTED", "effect usage totalUnits is inconsistent");
  return deepFreeze({ inputUnits, outputUnits, totalUnits });
}

function authorityBinding(
  input: unknown,
  label: string,
): AgentOsEffectAuthorityBindingV1 {
  const value = record(input, label);
  exact(
    value,
    [
      "grantId",
      "sessionGrantId",
      "leaseId",
      "leaseEpoch",
      "rotationGeneration",
      "revocationGeneration",
      "tenantId",
      "workloadId",
      "principalId",
      "authorityDomain",
      "hostId",
      "deploymentId",
      "runId",
      "turnId",
      "attemptId",
      "instanceId",
      "instanceGeneration",
      "claimId",
      "claimFence",
      "storeId",
      "storeGeneration",
      "definitionDigest",
      "policyDigest",
      "capabilityDigest",
      "keyId",
    ],
    label,
  );
  return deepFreeze({
    grantId: identifier(value.grantId, `${label} grantId`),
    sessionGrantId: identifier(value.sessionGrantId, `${label} sessionGrantId`),
    leaseId: identifier(value.leaseId, `${label} leaseId`),
    leaseEpoch: leaseEpoch(value.leaseEpoch, `${label} leaseEpoch`),
    rotationGeneration: rotationGeneration(
      value.rotationGeneration,
      `${label} rotationGeneration`,
    ),
    revocationGeneration: revocationGeneration(
      value.revocationGeneration,
      `${label} revocationGeneration`,
    ),
    tenantId: identifier(value.tenantId, `${label} tenantId`),
    workloadId: identifier(value.workloadId, `${label} workloadId`),
    principalId: identifier(value.principalId, `${label} principalId`),
    authorityDomain: identifier(
      value.authorityDomain,
      `${label} authorityDomain`,
    ),
    hostId: identifier(value.hostId, `${label} hostId`),
    deploymentId: identifier(value.deploymentId, `${label} deploymentId`),
    runId: identifier(value.runId, `${label} runId`),
    turnId: identifier(value.turnId, `${label} turnId`),
    attemptId: identifier(value.attemptId, `${label} attemptId`),
    instanceId: identifier(value.instanceId, `${label} instanceId`),
    instanceGeneration: nonNegativeInteger(
      value.instanceGeneration,
      `${label} instanceGeneration`,
    ),
    claimId: identifier(value.claimId, `${label} claimId`),
    claimFence: positiveInteger(value.claimFence, `${label} claimFence`),
    storeId: identifier(value.storeId, `${label} storeId`),
    storeGeneration: positiveInteger(
      value.storeGeneration,
      `${label} storeGeneration`,
    ),
    definitionDigest: digest(
      value.definitionDigest,
      `${label} definitionDigest`,
    ),
    policyDigest: digest(value.policyDigest, `${label} policyDigest`),
    capabilityDigest: digest(
      value.capabilityDigest,
      `${label} capabilityDigest`,
    ),
    keyId: identifier(value.keyId, `${label} keyId`),
  });
}

function capabilityBinding(
  input: unknown,
  label: string,
): AgentOsEffectCapabilityBindingV1 {
  const value = record(input, label);
  exact(value, ["packageId", "packageDigest", "capabilityId"], label);
  return deepFreeze({
    packageId: identifier(value.packageId, `${label} packageId`),
    packageDigest: digest(value.packageDigest, `${label} packageDigest`),
    capabilityId: identifier(value.capabilityId, `${label} capabilityId`),
  });
}

function effectRecord(
  input: unknown,
  label: string,
  keys: readonly string[],
): Record<string, unknown> {
  const value = record(input, label);
  exact(value, keys, label);
  if (value.schemaVersion !== "agent-os-effect/v1")
    fail(
      "UNSUPPORTED_VERSION",
      `${label} schemaVersion must equal agent-os-effect/v1`,
    );
  return value;
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

function identifiers(value: unknown, label: string): readonly string[] {
  const values = arrayValues(value, label);
  if (values.length === 0 || values.length > MAX_BINDING_ITEMS)
    fail(
      "INVALID_VALUE",
      `${label} must contain 1 to ${MAX_BINDING_ITEMS} items`,
    );
  const result = values
    .map((item, index) => identifier(item, `${label}[${index}]`))
    .sort();
  if (new Set(result).size !== result.length)
    fail("INVALID_VALUE", `${label} must not contain duplicates`);
  return deepFreeze(result);
}

function singletonAudience(value: unknown, label: string): readonly [string] {
  const result = identifiers(value, label);
  if (result.length !== 1)
    fail("GRANT_EXPANSION", `${label} must contain exactly one principal`);
  return deepFreeze([result[0]!] as [string]);
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

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a path-free canonical identifier`);
  return value;
}

function opaqueRef(value: unknown, label: string): `${string}:${string}` {
  if (typeof value !== "string" || !OPAQUE_REF_PATTERN.test(value))
    fail(
      "INVALID_VALUE",
      `${label} must be a path-free namespace-qualified opaque ref`,
    );
  return value as `${string}:${string}`;
}

function qualifiedRef(
  value: unknown,
  namespace: string,
  label: string,
): `idempotency:${string}` {
  if (
    typeof value !== "string" ||
    !OPAQUE_REF_PATTERN.test(value) ||
    !value.startsWith(`${namespace}:`)
  )
    fail("INVALID_VALUE", `${label} must be a ${namespace} opaque ref`);
  return value as `idempotency:${string}`;
}

function leaseEpoch(
  value: unknown,
  label: string,
): AgentOsEffectAuthorityBindingV1["leaseEpoch"] {
  if (typeof value !== "string" || !LEASE_EPOCH_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a lease epoch ref`);
  return value as AgentOsEffectAuthorityBindingV1["leaseEpoch"];
}

function rotationGeneration(
  value: unknown,
  label: string,
): AgentOsEffectAuthorityBindingV1["rotationGeneration"] {
  if (typeof value !== "string" || !ROTATION_GENERATION_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a rotation generation ref`);
  return value as AgentOsEffectAuthorityBindingV1["rotationGeneration"];
}

function revocationGeneration(
  value: unknown,
  label: string,
): AgentOsEffectAuthorityBindingV1["revocationGeneration"] {
  if (typeof value !== "string" || !REVOCATION_GENERATION_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a revocation generation ref`);
  return value as AgentOsEffectAuthorityBindingV1["revocationGeneration"];
}

function adapterKind(value: unknown, label: string): AgentOsEffectAdapterKind {
  if (
    value !== "provider" &&
    value !== "mcp" &&
    value !== "skill" &&
    value !== "plugin" &&
    value !== "tool"
  )
    fail("INVALID_VALUE", `${label} is invalid`);
  return value;
}

function dispatchDisposition(
  value: unknown,
): AgentOsEffectDispatchDispositionV1 {
  if (value !== "succeeded" && value !== "failed" && value !== "unknown")
    fail("INVALID_VALUE", "effect dispatch receipt disposition is invalid");
  return value;
}

function recoveryResolution(
  value: unknown,
): AgentOsUnknownEffectRecoveryResolutionV1 {
  if (
    value !== "confirm_succeeded" &&
    value !== "confirm_failed" &&
    value !== "compensated" &&
    value !== "abandoned"
  )
    fail("INVALID_VALUE", "unknown effect recovery resolution is invalid");
  return value;
}

function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a sha256 digest`);
  return value;
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

function canonicalText(
  value: unknown,
  label: string,
  maxBytes: number,
): string {
  const forbiddenText =
    typeof value === "string" &&
    (/(?:authorization\s*:|bearer\s+|(?:password|passwd|api[_-]?key|secret|token)["']?\s*[:=]|https?:\/\/|[a-z]:\\|\\\\|\/(?:home|users|etc|tmp|var|opt|srv|root|proc|sys|dev)\/)/iu.test(
      value,
    ) ||
      /^(?:\{[\s\S]*\}|\[[\s\S]*\])$/u.test(value));
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    new TextEncoder().encode(value).byteLength > maxBytes ||
    forbiddenText
  )
    fail(
      "INVALID_VALUE",
      `${label} must be canonical trimmed text within ${maxBytes} bytes`,
    );
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

function assertOrderedWindow(
  notBefore: string,
  expiresAt: string,
  label: string,
): void {
  if (notBefore >= expiresAt)
    fail("INVALID_VALUE", `${label} validity window is empty or reversed`);
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

function assertSame(message: string, left: unknown, right: unknown): void {
  if (canonicalJson(left) !== canonicalJson(right))
    fail("DRIFT_DETECTED", message);
}

function assertAdapterTransport(
  adapter: AgentOsEffectAdapterKind,
  transport: AgentOsV1Contract["agentDefinition"]["capabilityPackage"]["transport"]["kind"],
): void {
  const matches =
    (adapter === "provider" && transport === "provider-adapter") ||
    (adapter === "mcp" && transport === "mcp") ||
    (adapter === "skill" && transport === "skill") ||
    (adapter === "plugin" && transport === "plugin") ||
    adapter === "tool";
  if (!matches)
    fail(
      "DRIFT_DETECTED",
      "effect adapter kind differs from capability transport",
    );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      fail("INVALID_VALUE", "canonical source contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const input = record(value, "canonical effect source");
    return `{${Object.keys(input)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`)
      .join(",")}}`;
  }
  fail(
    "INVALID_VALUE",
    "canonical effect source contains an unsupported value",
  );
}

function contentDigest(source: string): string {
  return `sha256:${sha256Hex(source)}`;
}

function fail(code: AgentOsV1ContractError["code"], message: string): never {
  throw new AgentOsV1ContractError(code, message);
}
