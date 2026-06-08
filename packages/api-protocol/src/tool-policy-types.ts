export type ToolPolicyStatus = "active" | "deprecated" | "draft";
export type ExecMode = "restricted" | "full";

export interface SandboxToolPermissions {
  enabled: boolean;
  preopens?: string[];
  env?: string[];
  network?: boolean;
}

/** Phase 6: Capability 级别的访问控制规则 */
export interface CapabilityAccessRule {
  /** 允许的 capability 模式，支持通配符 "code.*" */
  allow?: string[];
  /** 拒绝的 capability 模式，优先级高于 allow */
  deny?: string[];
}

export interface ToolPolicyDefinition {
  enabledTools: string[];
  execMode: ExecMode;
  allowedScripts: string[];
  skillScriptDirs: string[];
  maxOutputBytes: number;
  allowedEnvVars: string[];
  sandboxTools: Record<string, SandboxToolPermissions>;
  /** Phase 6: capability 级别的访问控制（可选，不配置=向后兼容） */
  capabilityAccess?: CapabilityAccessRule;
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

export type PolicyDecisionCode =
  | "ALLOWED"
  | "POLICY_NOT_FOUND"
  | "POLICY_INACTIVE"
  | "TOOL_NOT_ALLOWED"
  | "TOOL_DISABLED_IN_SANDBOX"
  | "EXEC_MODE_RESTRICTED"
  | "SCRIPT_NOT_ALLOWED"
  | "ENV_VAR_NOT_ALLOWED"
  | "QUOTA_EXHAUSTED"
  | "RATE_LIMITED"
  | "CIRCUIT_OPEN"
  | "CAPABILITY_NOT_ALLOWED"
  | "CAPABILITY_DENIED";

export interface PolicyDecision {
  allow: boolean;
  code: PolicyDecisionCode;
  reason: string;
  policyId: string | null;
  policyVersion: string | null;
  resolvedSandboxConfig: SandboxToolPermissions | null;
}

export interface ToolGatewayRequest {
  agentId: string | null;
  tool: string;
  command: string;
  args: unknown[];
  audit: { userId: string | null; sessionId: string; toolCallId: string };
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
