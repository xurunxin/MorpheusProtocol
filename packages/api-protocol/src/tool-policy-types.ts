import type { CapabilityTag } from "./agent-registry-types.js";

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
  origin?: "yaml" | "api" | "migration";
  yamlPath?: string;
  yamlHash?: string;
}

export interface CapabilityAccessRule {
  allow?: string[];
  deny?: string[];
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

export type ToolPolicyDecisionCode =
  | "ALLOWED"
  | "POLICY_NOT_FOUND"
  | "POLICY_INACTIVE"
  | "TOOL_NOT_ALLOWED"
  | "ROUTE_NOT_FOUND"
  | "ROUTE_DISABLED"
  | "TARGET_NOT_ALLOWED"
  | "CAPABILITY_NOT_ALLOWED"
  | "CAPABILITY_DENIED"
  | "ENV_VAR_NOT_ALLOWED"
  | "QUOTA_EXHAUSTED"
  | "RATE_LIMITED"
  | "CIRCUIT_OPEN"
  | "BACKEND_NOT_IMPLEMENTED"
  | "WASM_EXEC_FAILED"
  | "BASH_EXEC_FAILED"
  | "TOOL_EXEC_FAILED"
  | "CONTAINER_EXEC_UNAVAILABLE";

export interface ToolPolicyDecision {
  allow: boolean;
  code: ToolPolicyDecisionCode;
  reason: string;
  policyId: string | null;
  policyVersion: string | null;
  route?: ToolcallRoute;
  target?: string;
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
  audit: { userId: string | null; sessionId: string; toolCallId: string };
  requestedEnvVars?: string[];
  requestedMaxOutputBytes?: number;
}

export interface ToolcallResult<T = unknown> {
  success: boolean;
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
  visibleTool: string;
  command: string;
  args?: unknown[];
  route?: ToolcallRoute;
  target?: string;
  requestedEnvVars?: string[];
  requestedMaxOutputBytes?: number;
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
}
