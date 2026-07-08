import type { CapabilityTag } from "./agent-registry-types.js";
import type { BreakerState } from "./quota-types.js";
import type { ToolRiskLevel } from "./observability-types.js";

export type ToolPolicyStatus = "active" | "deprecated" | "draft";

export type ToolcallRoute = "wasm.exec" | "bash.exec" | "tool.exec" | "container.exec";

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

export interface BackendPolicyPlaceholder {
  enabled: boolean;
}

export interface ToolPolicySourceMetadata {
  origin?: "yaml" | "api" | "migration" | "builtin";
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
}

export interface CreateLocalCapabilityGrantRequest {
  id?: string;
  capability: LocalCapability;
  subjectId: string;
  resourceScopes: string[];
  expiresAt?: string;
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
      "container.exec": BackendPolicyPlaceholder;
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
  | "APPROVAL_REQUIRED"
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
  resolvedBackendConfig:
    | WasmToolTargetPolicy
    | BashExecRoutePolicy
    | ToolExecTargetPolicy
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
  requestedEnvVars?: string[];
  requestedMaxOutputBytes?: number;
}

export interface ToolcallResult<T = unknown> {
  success: boolean;
  callId?: string;
  visibleTool: string;
  route: ToolcallRoute;
  target?: string;
  command: string;
  output?: T;
  error?: { code: ToolPolicyDecisionCode | string; message: string };
  audit?: unknown;
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

export type ToolPolicySimulationSource = "agent" | "default" | "provided" | "none";

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
  "APPROVAL_REQUIRED",
  "ENV_VAR_NOT_ALLOWED",
]);

const LEGACY_POLICY_DENIED_CODES = new Set<string>([
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
  code: ToolPolicyDecisionCode | string
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
    LEGACY_POLICY_DENIED_CODES.has(normalizedCode)
  ) {
    return "policy_denied";
  }
  if (isToolPolicyDecisionCode(normalizedCode) && TOOL_FAILURE_DECISION_CODES.has(normalizedCode)) {
    return "tool_failed";
  }
  return "tool_failed";
}

export function toToolInvocationEnvelope(
  request: ToolcallRequest,
  mode: ToolInvocationMode = "agent"
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
    ...(request.resourceScopes !== undefined ? { resourceScopes: request.resourceScopes } : {}),
  };
}

export function toToolcallRequestFromInvocation(
  invocation: ToolInvocationEnvelope
): ToolcallRequest {
  return {
    agentId: invocation.agentId,
    visibleTool: invocation.metadata.visibleTool,
    route: invocation.metadata.route,
    ...(invocation.metadata.target !== undefined ? { target: invocation.metadata.target } : {}),
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
    ...(invocation.requestedEnvVars !== undefined
      ? { requestedEnvVars: invocation.requestedEnvVars }
      : {}),
    ...(invocation.requestedMaxOutputBytes !== undefined
      ? { requestedMaxOutputBytes: invocation.requestedMaxOutputBytes }
      : {}),
  };
}

export function toToolResultEnvelope<T = unknown>(
  request: ToolcallRequest,
  result: ToolcallResult<T>
): ToolResultEnvelope<T> {
  const callId = resolveToolCallId(request, result);
  const auditRecord = asRecord(result.audit);
  const durationMs = getOptionalNumber(auditRecord, "durationMs");
  const auditIds = getStringArray(auditRecord, "auditIds");
  const artifacts = getStringArray(auditRecord, "artifactIds").map((artifactId) => ({
    artifactId,
  }));

  if (result.success) {
    return {
      callId,
      status: "completed",
      output: result.output,
      artifacts,
      durationMs,
      auditIds,
    };
  }

  const code = result.error?.code;
  const message = result.error?.message ?? "Tool execution failed";
  const kind =
    code === undefined ? "tool_failed" : mapToolPolicyDecisionCodeToInvocationErrorKind(code);

  return {
    callId,
    status: kind === "policy_denied" ? "denied" : "failed",
    output: undefined,
    artifacts: kind === "policy_denied" ? [] : artifacts,
    error: {
      kind,
      ...(code !== undefined ? { originalCode: code } : {}),
      message,
    },
    durationMs,
    auditIds,
  };
}

export function toLegacyToolcallResult<T = unknown>(
  invocation: ToolInvocationEnvelope,
  result: ToolResultEnvelope<T>
): ToolcallResult<T> {
  return {
    success: result.status === "completed",
    callId: result.callId,
    visibleTool: invocation.metadata.visibleTool,
    route: invocation.metadata.route,
    ...(invocation.metadata.target !== undefined ? { target: invocation.metadata.target } : {}),
    command: invocation.metadata.command,
    ...(result.output !== undefined ? { output: result.output } : {}),
    ...(result.error !== undefined
      ? {
          error: {
            code: result.error.originalCode ?? result.error.kind,
            message: result.error.message,
          },
        }
      : {}),
    audit: {
      auditIds: result.auditIds,
      durationMs: result.durationMs,
      artifactIds: result.artifacts.map((artifact) => artifact.artifactId),
    },
  };
}

function resolveToolCallId(request: ToolcallRequest, result: ToolcallResult): string {
  if (request.audit.toolCallId.length > 0) {
    return request.audit.toolCallId;
  }
  if (result.callId !== undefined && result.callId.length > 0) {
    return result.callId;
  }
  const auditRecord = asRecord(result.audit);
  const auditToolCallId = getOptionalString(auditRecord, "toolCallId");
  if (auditToolCallId !== undefined) {
    return auditToolCallId;
  }
  throw new Error("[tool-invocation] Missing stable callId");
}

function normalizeInvocationCode(code: string): string {
  return code
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function requireNonEmptyString(value: string, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`[tool-invocation] ${field} must be a non-empty string`);
  }
  return value;
}

function isToolPolicyDecisionCode(value: string): value is ToolPolicyDecisionCode {
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
    value === "APPROVAL_REQUIRED" ||
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function getOptionalString(
  record: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  if (record === undefined) {
    return undefined;
  }
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getOptionalNumber(
  record: Record<string, unknown> | undefined,
  key: string
): number | undefined {
  if (record === undefined) {
    return undefined;
  }
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function getStringArray(record: Record<string, unknown> | undefined, key: string): string[] {
  if (record === undefined) {
    return [];
  }
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}
