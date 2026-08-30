/** Public contract primitives needed by tool-policy DTOs. */
export interface CapabilityTag {
  tag: string;
  domain:
    | "code"
    | "security"
    | "report"
    | "image"
    | "data"
    | "workflow"
    | "general"
    | "shell"
    | "local"
    | "browser"
    | "desktop";
  level: "basic" | "intermediate" | "advanced" | "expert";
  description: string;
  parent?: string;
  system: boolean;
}

export type AgentOpsToolTrustStatus =
  | "trusted"
  | "needs_review"
  | "quarantined"
  | "revoked";

export interface EffectiveCapabilitySourcesV1 {
  manifest: readonly string[];
  safeMode: readonly string[];
  runtime: readonly string[];
  allowed: readonly string[];
  denied: readonly string[];
}

export interface EffectiveCapabilitySnapshotV1 {
  version: 1;
  agentId: string;
  agentVersion?: string;
  manifestFingerprint?: string;
  policyId?: string;
  policyVersion?: string;
  capabilities: readonly string[];
  sources: EffectiveCapabilitySourcesV1;
  resolvedAt: string;
  fingerprint: string;
}

export type BreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";
export type ToolRiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

export interface ProviderExecutionBinding {
  providerId: string;
  version: string;
}

export type ToolPolicyStatus = "active" | "deprecated" | "draft";

export const TOOLCALL_ROUTES = [
  "wasm.exec",
  "bash.exec",
  "tool.exec",
  "container.exec",
] as const;
export type ToolcallRoute = (typeof TOOLCALL_ROUTES)[number];
export function isToolcallRoute(value: unknown): value is ToolcallRoute {
  return (
    typeof value === "string" &&
    TOOLCALL_ROUTES.includes(value as ToolcallRoute)
  );
}

export interface ToolRouteBinding {
  route: ToolcallRoute;
  target?: string;
}

export interface ToolExecutionBinding {
  default?: ToolRouteBinding;
  commands?: Record<string, ToolRouteBinding>;
}

export interface ToolExecutionDefaults {
  maxOutputBytes: number;
  allowedEnvVars: string[];
}

export interface SandboxCliTargetPolicy {
  enabled: true;
  manifest: string;
  binaryPath?: string;
  workspaceGuestRoot?: string;
  workspaceAccess?: "readOnly" | "readWrite";
}

export interface WasmToolTargetPolicy {
  enabled: boolean;
  command?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  preopens?: string[];
  env?: string[];
  network?: boolean;
  allowedHosts?: string[];
  capabilityTags?: string[];
  riskLevel?: ToolRiskLevel;
  approvalRequired?: boolean;
  resourceScopes?: string[];
  sandboxCli?: SandboxCliTargetPolicy;
}

export interface WasmExecRoutePolicy {
  enabled: boolean;
  tools: Record<string, WasmToolTargetPolicy>;
}

export interface BashExecRoutePolicy {
  enabled: boolean;
  approvalRequired?: boolean;
  mode?: "restricted" | "full";
  allowedScripts?: string[];
  skillScriptDirs?: string[];
  allowedEnvVars?: string[];
  maxOutputBytes?: number;
  timeoutSec?: number;
  forbidShellOperators?: boolean;
}

export interface ToolExecTargetPolicy {
  enabled: boolean;
  capabilityTags?: string[];
  riskLevel?: ToolRiskLevel;
  approvalRequired?: boolean;
  resourceScopes?: string[];
  maxOutputBytes?: number;
}

export interface ToolExecRoutePolicy {
  enabled: boolean;
  tools?: Record<string, ToolExecTargetPolicy>;
}

export interface ContainerExecRecipePolicy {
  enabled: boolean;
  capabilityTags?: string[];
  riskLevel?: ToolRiskLevel;
  approvalRequired?: boolean;
  resourceScopes?: string[];
  timeoutMs?: number;
  maxOutputBytes?: number;
}

export interface ContainerExecRoutePolicy {
  enabled: boolean;
  recipes?: Record<string, ContainerExecRecipePolicy>;
}

export interface BackendPolicyPlaceholder {
  enabled: boolean;
}

export interface ToolPolicySourceMetadata {
  origin?: "yaml" | "api" | "builtin";
  yamlPath?: string;
  yamlHash?: string;
}

export interface CapabilityAccessRule {
  allow?: string[];
  deny?: string[];
  risk?: {
    deny?: ToolRiskLevel[];
    requireApproval?: ToolRiskLevel[];
  };
}

export type LocalCapabilityGrantStatus = "active" | "revoked";

export type LocalCapability =
  | "filesystem.read"
  | "filesystem.write"
  | "process.spawn"
  | "network.egress"
  | "provider.use"
  | "local.provider"
  | "local.workspace"
  | "local.filesystem"
  | "browser.control"
  | "desktop.control";

export interface LocalCapabilityGrant {
  id: string;
  capability: LocalCapability;
  subjectId: string;
  status: LocalCapabilityGrantStatus;
  resourceScopes: string[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revision: number;
}

export interface CreateLocalCapabilityGrantRequest {
  id?: string;
  capability: LocalCapability;
  subjectId: string;
  resourceScopes: string[];
  expiresAt?: string;
}

export interface RevokeLocalCapabilityGrantRequest {
  expectedRevision: number;
}

export interface LocalCapabilityGrantResponse {
  grant: LocalCapabilityGrant;
}

export interface LocalCapabilityGrantListResponse {
  grants: LocalCapabilityGrant[];
}

export interface ToolPolicyDefinition {
  schemaVersion: 2;
  tools: {
    allowed: string[];
  };
  execution: {
    defaults: ToolExecutionDefaults;
    bindings: Record<string, ToolExecutionBinding>;
    routes: Partial<{
      "wasm.exec": WasmExecRoutePolicy;
      "bash.exec": BashExecRoutePolicy;
      "tool.exec": ToolExecRoutePolicy;
      "container.exec": ContainerExecRoutePolicy;
    }>;
  };
  capabilityAccess?: CapabilityAccessRule;
  source?: ToolPolicySourceMetadata;
}

export interface ToolPolicy {
  id: string;
  version: string;
  agentId: string | null;
  status: ToolPolicyStatus;
  definition: ToolPolicyDefinition;
  createdAt: string;
  updatedAt: string;
}

/** Frozen run-scoped policy ceiling plus the source identity used for live CAS validation. */
export interface ToolPolicyExecutionSnapshot {
  id: string;
  version: string;
  sourceFingerprint: string;
  fingerprint: string;
  definition: Readonly<ToolPolicyDefinition>;
}

export type ToolRegistrySource = "builtin" | "skill" | "mcp" | "plugin";

export interface ToolRegistryExecutionTarget {
  route: ToolcallRoute;
  target?: string;
}

export interface ToolRegistryPolicyBinding extends ToolRegistryExecutionTarget {
  visibleTool: string;
}

export type ToolRegistryExecutorType = "wasm" | "bash" | "tool" | "container";

export interface ToolRegistryPolicyReference extends ToolRegistryExecutionTarget {
  visibleTool: string;
}

export interface ToolRegistryMetadata {
  capabilityId: string;
  providerId: string;
  /** 发现时固定的 Provider 版本，执行前必须由受信任 resolver 重新验证。 */
  providerBinding?: ProviderExecutionBinding;
  executorType: ToolRegistryExecutorType;
  riskLevel: ToolRiskLevel;
  policyRef: ToolRegistryPolicyReference;
}

export interface ToolRegistryDeprecation {
  replacementToolId?: string;
  sinceVersion?: string;
  message?: string;
}

export interface ToolRegistryEntry {
  id: string;
  version: string;
  source: ToolRegistrySource;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  riskLevel: ToolRiskLevel;
  capabilities: string[];
  executionTarget: ToolRegistryExecutionTarget;
  policyBinding: ToolRegistryPolicyBinding;
  metadata?: ToolRegistryMetadata;
  deprecation?: ToolRegistryDeprecation;
}

/**
 * 返回 registry 条目声明的能力与当前策略目标补充能力的规范并集。
 *
 * discovery、有效权限快照和执行 gate 必须共用这一解析规则，避免同一工具
 * 在不同阶段被赋予不同的 capability 语义。
 */
export function resolveToolRegistryEntryCapabilities(
  entry: ToolRegistryEntry,
  policy: ToolPolicyDefinition | undefined,
): string[] {
  const target = entry.executionTarget.target;
  let policyCapabilities: readonly string[] = [];

  if (target !== undefined && entry.executionTarget.route === "tool.exec") {
    policyCapabilities =
      policy?.execution.routes["tool.exec"]?.tools?.[target]?.capabilityTags ??
      [];
  } else if (
    target !== undefined &&
    entry.executionTarget.route === "wasm.exec"
  ) {
    policyCapabilities =
      policy?.execution.routes["wasm.exec"]?.tools?.[target]?.capabilityTags ??
      [];
  }

  return [...new Set([...entry.capabilities, ...policyCapabilities])];
}

export interface DiscoveredTool {
  id: string;
  version: string;
  source: ToolRegistrySource;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  riskLevel: ToolRiskLevel;
  capabilities: string[];
  executionTarget: ToolRegistryExecutionTarget;
  policyBinding: ToolRegistryPolicyBinding;
  metadata?: ToolRegistryMetadata;
  deprecation?: ToolRegistryDeprecation;
}

export interface ToolDiscoveryRequest {
  policy: ToolPolicyDefinition;
  capabilityTags?: string[];
  /** Server-resolved effective authority. Discovery without it is fail-closed. */
  effectiveCapabilitySnapshot: Readonly<EffectiveCapabilitySnapshotV1>;
}

export interface ToolDiscoveryResponse {
  tools: DiscoveredTool[];
}

export type ToolPolicyDecisionCode =
  | "ALLOWED"
  | "POLICY_NOT_FOUND"
  | "POLICY_INACTIVE"
  | "TOOL_NOT_ALLOWED"
  | "TOOL_NOT_REGISTERED"
  | "TOOL_REGISTRY_INVALID"
  | "ROUTE_NOT_FOUND"
  | "ROUTE_DISABLED"
  | "TARGET_NOT_ALLOWED"
  | "CAPABILITY_NOT_ALLOWED"
  | "CAPABILITY_DENIED"
  | "EFFECTIVE_CAPABILITY_DENIED"
  | "EFFECTIVE_CAPABILITY_UNKNOWN"
  | "PROVIDER_BINDING_MISSING"
  | "PROVIDER_NOT_FOUND"
  | "PROVIDER_VERSION_MISMATCH"
  | "PROVIDER_INACTIVE"
  | "PROVIDER_FAILED"
  | "PROVIDER_UNHEALTHY"
  | "PROVIDER_UNKNOWN"
  | "PROVIDER_RESOLVER_UNAVAILABLE"
  | "APPROVAL_REQUIRED"
  | "TOOL_TRUST_QUARANTINED"
  | "TOOL_TRUST_REVOKED"
  | "TOOL_TRUST_REVIEW_REQUIRED"
  | "ENV_VAR_NOT_ALLOWED"
  | "QUOTA_EXHAUSTED"
  | "RATE_LIMITED"
  | "CIRCUIT_OPEN"
  | "BACKEND_NOT_IMPLEMENTED"
  | "WASM_EXEC_FAILED"
  | "BASH_EXEC_FAILED"
  | "TOOL_EXEC_FAILED"
  | "CONTAINER_EXEC_UNAVAILABLE";

export type ToolInvocationMode = "agent" | "rpc" | "simulation" | "system";

export type ToolInvocationErrorKind =
  | "policy_denied"
  | "timeout"
  | "quota_exceeded"
  | "rate_limited"
  | "tool_failed"
  | "cancelled";

export interface ToolArtifactRef {
  artifactId: string;
}

export interface ToolInvocationMetadata {
  visibleTool: string;
  route: ToolcallRoute;
  target?: string;
  command: string;
  userId?: string | null;
  apiKeyId?: string | null;
}

export type ToolApprovalStatus =
  | "not_required"
  | "missing_marker"
  | "requested"
  | "approved"
  | "denied"
  | "expired";

export interface ToolApprovalMarker {
  status: Exclude<ToolApprovalStatus, "not_required" | "missing_marker">;
  approvalId?: string;
  approvedBy?: string;
  deniedBy?: string;
  decidedAt?: string;
  requestedAt?: string;
  expiresAt?: string;
  reason?: string;
}

export interface ToolApprovalDecisionMetadata {
  status: ToolApprovalStatus;
  approvalId: string;
  approvedBy?: string;
  deniedBy?: string;
  decidedAt?: string;
  requestedAt?: string;
  expiresAt?: string;
  reason: string;
}

export interface ToolInvocationEnvelope {
  toolId: string;
  callId: string;
  sessionId: string;
  runId: string;
  agentId: string | null;
  args: unknown[];
  mode: ToolInvocationMode;
  metadata: ToolInvocationMetadata;
  requestedEnvVars?: string[];
  requestedMaxOutputBytes?: number;
  resourceScopes?: string[];
  approval?: ToolApprovalMarker;
}

export interface ToolResultEnvelopeError {
  kind: ToolInvocationErrorKind;
  message: string;
  originalCode?: string;
}

export interface ToolResultEnvelope<T = unknown> {
  callId: string;
  status: "completed" | "denied" | "failed";
  output?: T;
  artifacts: ToolArtifactRef[];
  error?: ToolResultEnvelopeError;
  durationMs?: number;
  auditIds: string[];
}

/** 严格解析工具结果信封；拒绝未知字段和互相矛盾的状态。 */
export function parseToolResultEnvelope<T = unknown>(
  input: unknown,
): ToolResultEnvelope<T> {
  const value = requireRecord(input, "tool result envelope");
  assertExactKeys(
    value,
    [
      "callId",
      "status",
      "output",
      "artifacts",
      "error",
      "durationMs",
      "auditIds",
    ],
    "tool result envelope",
  );

  const callId = requireNonEmptyString(value.callId, "callId");
  const status = value.status;
  if (status !== "completed" && status !== "denied" && status !== "failed") {
    throw new Error("[tool-result] status is invalid");
  }
  if (!Array.isArray(value.artifacts)) {
    throw new Error("[tool-result] artifacts must be an array");
  }
  const artifacts = value.artifacts.map((artifact, index) => {
    const record = requireRecord(artifact, `artifacts[${index}]`);
    assertExactKeys(record, ["artifactId"], `artifacts[${index}]`);
    return {
      artifactId: requireNonEmptyString(
        record.artifactId,
        `artifacts[${index}].artifactId`,
      ),
    };
  });
  if (!Array.isArray(value.auditIds)) {
    throw new Error("[tool-result] auditIds must be an array");
  }
  const auditIds = value.auditIds.map((auditId, index) =>
    requireNonEmptyString(auditId, `auditIds[${index}]`),
  );
  const durationMs = value.durationMs;
  if (
    durationMs !== undefined &&
    (typeof durationMs !== "number" ||
      !Number.isFinite(durationMs) ||
      durationMs < 0)
  ) {
    throw new Error(
      "[tool-result] durationMs must be a finite non-negative number",
    );
  }

  if (status === "completed") {
    if (value.error !== undefined) {
      throw new Error("[tool-result] completed result cannot contain error");
    }
    return {
      callId,
      status,
      ...(Object.hasOwn(value, "output") ? { output: value.output as T } : {}),
      artifacts,
      ...(durationMs !== undefined ? { durationMs } : {}),
      auditIds,
    };
  }

  if (Object.hasOwn(value, "output")) {
    throw new Error(
      "[tool-result] denied or failed result cannot contain output",
    );
  }
  const error = parseToolResultEnvelopeError(value.error);
  if (status === "denied" && error.kind !== "policy_denied") {
    throw new Error("[tool-result] denied result requires policy_denied error");
  }
  if (status === "failed" && error.kind === "policy_denied") {
    throw new Error(
      "[tool-result] failed result cannot use policy_denied error",
    );
  }
  if (status === "denied" && artifacts.length > 0) {
    throw new Error("[tool-result] denied result cannot contain artifacts");
  }
  return {
    callId,
    status,
    artifacts,
    error,
    ...(durationMs !== undefined ? { durationMs } : {}),
    auditIds,
  };
}

export function encodeToolResultEnvelope<T = unknown>(
  input: ToolResultEnvelope<T>,
): string {
  return JSON.stringify(parseToolResultEnvelope<T>(input));
}

export function decodeToolResultEnvelope<T = unknown>(
  source: string,
): ToolResultEnvelope<T> {
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch {
    throw new Error("[tool-result] source must be valid JSON");
  }
  return parseToolResultEnvelope<T>(input);
}

export interface CapabilityPolicyAudit {
  tags: string[];
  riskLevel?: ToolRiskLevel;
  approvalRequired: boolean;
  resourceScopes: string[];
  matchedAllow: string[];
  matchedDeny: string[];
}

export interface ToolPolicyDecision {
  allow: boolean;
  code: ToolPolicyDecisionCode;
  reason: string;
  policyId: string | null;
  policyVersion: string | null;
  route?: ToolcallRoute;
  target?: string;
  capabilityAudit?: CapabilityPolicyAudit;
  approval?: ToolApprovalDecisionMetadata;
  trustAudit?: {
    toolId: string;
    providerId?: string;
    status: AgentOpsToolTrustStatus | "missing";
  };
  resolvedBackendConfig:
    | WasmToolTargetPolicy
    | BashExecRoutePolicy
    | ToolExecTargetPolicy
    | ContainerExecRecipePolicy
    | BackendPolicyPlaceholder
    | null;
}

export interface ToolcallRequest {
  agentId: string | null;
  visibleTool: string;
  route: ToolcallRoute;
  target?: string;
  command: string;
  args: unknown[];
  audit: {
    userId: string | null;
    apiKeyId?: string | null;
    sessionId: string;
    toolCallId: string;
  };
  runId?: string;
  resourceScopes?: string[];
  approval?: ToolApprovalMarker;
  requestedEnvVars?: string[];
  requestedMaxOutputBytes?: number;
}

export interface CreateToolPolicyRequest {
  id: string;
  agentId: string | null;
  definition: ToolPolicyDefinition;
  changeSummary?: string;
}

export interface UpdateToolPolicyRequest {
  definition: ToolPolicyDefinition;
  changeSummary?: string;
}

export interface ListToolPoliciesResponse {
  policies: ToolPolicy[];
  total: number;
}

export interface ToolPolicyVersionEntry {
  id: number;
  policyId: string;
  version: string;
  changedFields: string[];
  changeSummary: string | null;
  definition: ToolPolicyDefinition;
  createdAt: string;
}

export interface ListToolPolicyVersionsResponse {
  versions: ToolPolicyVersionEntry[];
  total: number;
}

export type ToolPolicySimulationSource =
  | "agent"
  | "default"
  | "provided"
  | "none";

export interface ToolPolicySimulationRequest {
  agentId: string | null;
  sessionId?: string;
  visibleTool: string;
  command: string;
  args?: unknown[];
  route?: ToolcallRoute;
  target?: string;
  requestedEnvVars?: string[];
  requestedMaxOutputBytes?: number;
  resourceScopes?: string[];
  approval?: ToolApprovalMarker;
  policy?: ToolPolicy;
  definition?: ToolPolicyDefinition;
  capabilityTags?: CapabilityTag[];
}

export interface ToolPolicySimulationResponse {
  request: ToolcallRequest;
  policySource: ToolPolicySimulationSource;
  policyId: string | null;
  policyVersion: string | null;
  decision: ToolPolicyDecision;
  wouldExecuteBackend: boolean;
  runtimePreview?: ToolPolicySimulationRuntimePreview;
}

export type ToolPolicySimulationRuntimeGateStatus = "pass" | "fail" | "skipped";
export type ToolPolicySimulationRuntimeGateCode =
  | "CIRCUIT_OPEN"
  | "RATE_LIMITED"
  | "QUOTA_EXHAUSTED";

export interface ToolPolicySimulationCircuitPreview {
  status: ToolPolicySimulationRuntimeGateStatus;
  code?: ToolPolicySimulationRuntimeGateCode;
  reason: string;
  state?: BreakerState;
  consecutiveFailures?: number;
}

export interface ToolPolicySimulationRateLimitPreview {
  status: ToolPolicySimulationRuntimeGateStatus;
  code?: ToolPolicySimulationRuntimeGateCode;
  reason: string;
  remaining?: number;
  resetAt?: number;
}

export interface ToolPolicySimulationQuotaPreview {
  status: ToolPolicySimulationRuntimeGateStatus;
  code?: ToolPolicySimulationRuntimeGateCode;
  reason: string;
  scope?: "agent" | "session";
  callsLeft?: number;
  tokensLeft?: number;
  durationMsLeft?: number;
}

export interface ToolPolicySimulationRuntimePreview {
  status: ToolPolicySimulationRuntimeGateStatus;
  code?: ToolPolicySimulationRuntimeGateCode;
  reason: string;
  agentId: string;
  circuit: ToolPolicySimulationCircuitPreview;
  rateLimit: ToolPolicySimulationRateLimitPreview;
  quota: ToolPolicySimulationQuotaPreview;
}

const POLICY_DENIED_DECISION_CODES = new Set<ToolPolicyDecisionCode>([
  "POLICY_NOT_FOUND",
  "POLICY_INACTIVE",
  "TOOL_NOT_ALLOWED",
  "TOOL_NOT_REGISTERED",
  "TOOL_REGISTRY_INVALID",
  "ROUTE_NOT_FOUND",
  "ROUTE_DISABLED",
  "TARGET_NOT_ALLOWED",
  "CAPABILITY_NOT_ALLOWED",
  "CAPABILITY_DENIED",
  "EFFECTIVE_CAPABILITY_DENIED",
  "EFFECTIVE_CAPABILITY_UNKNOWN",
  "APPROVAL_REQUIRED",
  "TOOL_TRUST_QUARANTINED",
  "TOOL_TRUST_REVOKED",
  "TOOL_TRUST_REVIEW_REQUIRED",
  "ENV_VAR_NOT_ALLOWED",
]);

const ADDITIONAL_POLICY_DENIED_CODES = new Set<string>([
  "SCRIPT_NOT_ALLOWED",
  "TOOL_DISABLED_IN_SANDBOX",
]);

const TOOL_FAILURE_DECISION_CODES = new Set<ToolPolicyDecisionCode>([
  "CIRCUIT_OPEN",
  "BACKEND_NOT_IMPLEMENTED",
  "WASM_EXEC_FAILED",
  "BASH_EXEC_FAILED",
  "TOOL_EXEC_FAILED",
  "CONTAINER_EXEC_UNAVAILABLE",
]);

export function mapToolPolicyDecisionCodeToInvocationErrorKind(
  code: ToolPolicyDecisionCode | string,
): ToolInvocationErrorKind {
  const normalizedCode = normalizeInvocationCode(code);
  if (normalizedCode === "TIMEOUT") {
    return "timeout";
  }
  if (normalizedCode === "CANCELLED") {
    return "cancelled";
  }
  if (normalizedCode === "QUOTA_EXHAUSTED") {
    return "quota_exceeded";
  }
  if (normalizedCode === "RATE_LIMITED") {
    return "rate_limited";
  }
  if (
    (isToolPolicyDecisionCode(normalizedCode) &&
      POLICY_DENIED_DECISION_CODES.has(normalizedCode)) ||
    ADDITIONAL_POLICY_DENIED_CODES.has(normalizedCode)
  ) {
    return "policy_denied";
  }
  if (
    isToolPolicyDecisionCode(normalizedCode) &&
    TOOL_FAILURE_DECISION_CODES.has(normalizedCode)
  ) {
    return "tool_failed";
  }
  return "tool_failed";
}

export function toToolInvocationEnvelope(
  request: ToolcallRequest,
  mode: ToolInvocationMode = "agent",
): ToolInvocationEnvelope {
  const toolId = requireNonEmptyString(request.visibleTool, "visibleTool");
  const callId = requireNonEmptyString(request.audit.toolCallId, "toolCallId");
  const sessionId = requireNonEmptyString(request.audit.sessionId, "sessionId");
  const runId = requireNonEmptyString(request.runId ?? "", "runId");
  const command = requireNonEmptyString(request.command, "command");
  if (!Array.isArray(request.args)) {
    throw new Error("[tool-invocation] args must be an array");
  }

  return {
    toolId,
    callId,
    sessionId,
    runId,
    agentId: request.agentId,
    args: request.args,
    mode,
    metadata: {
      visibleTool: toolId,
      route: request.route,
      ...(request.target !== undefined ? { target: request.target } : {}),
      command,
      userId: request.audit.userId,
      apiKeyId: request.audit.apiKeyId ?? null,
    },
    ...(request.requestedEnvVars !== undefined
      ? { requestedEnvVars: request.requestedEnvVars }
      : {}),
    ...(request.requestedMaxOutputBytes !== undefined
      ? { requestedMaxOutputBytes: request.requestedMaxOutputBytes }
      : {}),
    ...(request.resourceScopes !== undefined
      ? { resourceScopes: request.resourceScopes }
      : {}),
    ...(request.approval !== undefined ? { approval: request.approval } : {}),
  };
}

export function toToolcallRequestFromInvocation(
  invocation: ToolInvocationEnvelope,
): ToolcallRequest {
  return {
    agentId: invocation.agentId,
    visibleTool: invocation.metadata.visibleTool,
    route: invocation.metadata.route,
    ...(invocation.metadata.target !== undefined
      ? { target: invocation.metadata.target }
      : {}),
    command: invocation.metadata.command,
    args: invocation.args,
    audit: {
      userId: invocation.metadata.userId ?? null,
      ...(invocation.metadata.apiKeyId !== undefined
        ? { apiKeyId: invocation.metadata.apiKeyId }
        : {}),
      sessionId: invocation.sessionId,
      toolCallId: invocation.callId,
    },
    runId: invocation.runId,
    ...(invocation.resourceScopes !== undefined
      ? { resourceScopes: invocation.resourceScopes }
      : {}),
    ...(invocation.approval !== undefined
      ? { approval: invocation.approval }
      : {}),
    ...(invocation.requestedEnvVars !== undefined
      ? { requestedEnvVars: invocation.requestedEnvVars }
      : {}),
    ...(invocation.requestedMaxOutputBytes !== undefined
      ? { requestedMaxOutputBytes: invocation.requestedMaxOutputBytes }
      : {}),
  };
}

function normalizeInvocationCode(code: string): string {
  return code
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`[tool-invocation] ${field} must be a non-empty string`);
  }
  return value;
}

function isToolPolicyDecisionCode(
  value: string,
): value is ToolPolicyDecisionCode {
  return (
    value === "ALLOWED" ||
    value === "POLICY_NOT_FOUND" ||
    value === "POLICY_INACTIVE" ||
    value === "TOOL_NOT_ALLOWED" ||
    value === "TOOL_NOT_REGISTERED" ||
    value === "TOOL_REGISTRY_INVALID" ||
    value === "ROUTE_NOT_FOUND" ||
    value === "ROUTE_DISABLED" ||
    value === "TARGET_NOT_ALLOWED" ||
    value === "CAPABILITY_NOT_ALLOWED" ||
    value === "CAPABILITY_DENIED" ||
    value === "EFFECTIVE_CAPABILITY_DENIED" ||
    value === "EFFECTIVE_CAPABILITY_UNKNOWN" ||
    value === "APPROVAL_REQUIRED" ||
    value === "TOOL_TRUST_QUARANTINED" ||
    value === "TOOL_TRUST_REVOKED" ||
    value === "TOOL_TRUST_REVIEW_REQUIRED" ||
    value === "ENV_VAR_NOT_ALLOWED" ||
    value === "QUOTA_EXHAUSTED" ||
    value === "RATE_LIMITED" ||
    value === "CIRCUIT_OPEN" ||
    value === "BACKEND_NOT_IMPLEMENTED" ||
    value === "WASM_EXEC_FAILED" ||
    value === "BASH_EXEC_FAILED" ||
    value === "TOOL_EXEC_FAILED" ||
    value === "CONTAINER_EXEC_UNAVAILABLE"
  );
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`[tool-result] ${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  label: string,
): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    throw new Error(`[tool-result] ${label} contains unknown field ${unknown}`);
  }
}

function parseToolResultEnvelopeError(input: unknown): ToolResultEnvelopeError {
  const value = requireRecord(input, "error");
  assertExactKeys(value, ["kind", "message", "originalCode"], "error");
  const kind = value.kind;
  if (
    kind !== "policy_denied" &&
    kind !== "timeout" &&
    kind !== "quota_exceeded" &&
    kind !== "rate_limited" &&
    kind !== "tool_failed" &&
    kind !== "cancelled"
  ) {
    throw new Error("[tool-result] error.kind is invalid");
  }
  const originalCode = value.originalCode;
  return {
    kind,
    message: requireNonEmptyString(value.message, "error.message"),
    ...(originalCode !== undefined
      ? {
          originalCode: requireNonEmptyString(
            originalCode,
            "error.originalCode",
          ),
        }
      : {}),
  };
}
