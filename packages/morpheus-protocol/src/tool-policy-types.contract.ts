import type {
  BashExecRoutePolicy,
  ToolInvocationEnvelope,
  ToolInvocationErrorKind,
  ToolInvocationMetadata,
  ToolInvocationMode,
  ToolPolicy,
  ToolPolicyDecision,
  ToolPolicyDefinition,
  ToolResultEnvelope,
  ToolExecRoutePolicy,
  ToolcallRequest,
  ToolcallResult,
  ToolcallRoute,
} from "./tool-policy-types.js";

const _route = "wasm.exec" satisfies ToolcallRoute;
const _mode = "agent" satisfies ToolInvocationMode;
const _errorKind = "tool_failed" satisfies ToolInvocationErrorKind;
const _metadata = {
  visibleTool: "bash",
  route: "wasm.exec",
  target: "grep",
  command: "grep",
  userId: "u-1",
  apiKeyId: "key-1",
} satisfies ToolInvocationMetadata;

const _definition = {
  schemaVersion: 2,
  tools: { allowed: ["read", "workspace_files"] },
  execution: {
    defaults: {
      maxOutputBytes: 65536,
      allowedEnvVars: ["PATH"],
    },
    bindings: {
      workspace_files: {
        default: { route: "wasm.exec", target: "workspace-files" },
      },
      read: {
        default: { route: "tool.exec", target: "builtin.read" },
      },
    },
    routes: {
      "wasm.exec": {
        enabled: true,
        tools: {
          "workspace-files": {
            enabled: true,
            command: "run",
            preopens: ["/workspace"],
            network: false,
            sandboxCli: {
              enabled: true,
              manifest:
                "packages/sandbox-cli/tools/prebuilt/workspace-files/sandbox-artifact.json",
              workspaceAccess: "readWrite",
            },
          },
        },
      },
      "bash.exec": { enabled: false },
      "tool.exec": { enabled: false },
      "container.exec": { enabled: false },
    },
  },
  capabilityAccess: { allow: ["code.*"], deny: ["code.refactor"] },
  source: {
    origin: "yaml",
    yamlPath: "config/agents/default.yaml",
    yamlHash: "sha256:demo",
  },
} satisfies ToolPolicyDefinition;

const bashRoute = {
  enabled: true,
  approvalRequired: true,
  mode: "restricted",
  allowedScripts: ["node", "bun"],
  skillScriptDirs: ["config/skills", "config/skills/user"],
  allowedEnvVars: ["PATH", "HOME"],
  maxOutputBytes: 65536,
  timeoutSec: 30,
  forbidShellOperators: true,
} satisfies BashExecRoutePolicy;

const toolRoute = {
  enabled: true,
  tools: {
    "builtin.read": { enabled: true },
    "builtin.grep": { enabled: true, capabilityTags: ["code.search"] },
  },
} satisfies ToolExecRoutePolicy;

export const phase2PolicyContract = {
  schemaVersion: 2,
  tools: { allowed: ["bash", "read", "grep"] },
  execution: {
    defaults: { maxOutputBytes: 65536, allowedEnvVars: ["PATH"] },
    bindings: {
      bash: { default: { route: "bash.exec" } },
      read: { default: { route: "tool.exec", target: "builtin.read" } },
      grep: { default: { route: "tool.exec", target: "builtin.grep" } },
    },
    routes: {
      "bash.exec": bashRoute,
      "tool.exec": toolRoute,
      "container.exec": { enabled: false },
    },
  },
} satisfies ToolPolicyDefinition;

const _policy = {
  id: "agent:default",
  version: "1.0.0",
  agentId: "default",
  status: "active",
  definition: _definition,
  createdAt: "2026-06-11T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
} satisfies ToolPolicy;

const _decision = {
  allow: false,
  code: "ROUTE_DISABLED",
  reason: "Route 'wasm.exec' is disabled",
  policyId: "agent:default",
  policyVersion: "1.0.0",
  route: "wasm.exec",
  target: "grep",
  approval: {
    status: "requested",
    approvalId: "approval-1",
    requestedAt: "2026-07-09T00:00:00.000Z",
    reason: "Approval required",
  },
  resolvedBackendConfig: null,
} satisfies ToolPolicyDecision;

const _request = {
  agentId: "default",
  visibleTool: "bash",
  route: "wasm.exec",
  target: "grep",
  command: "grep",
  args: ["foo", "README.md"],
  audit: {
    userId: "u-1",
    apiKeyId: "key-1",
    sessionId: "s-1",
    toolCallId: "tc-1",
  },
  runId: "run-1",
  requestedEnvVars: ["PATH"],
  requestedMaxOutputBytes: 65536,
  resourceScopes: ["workspace:w1"],
  approval: {
    status: "approved",
    approvalId: "approval-1",
    approvedBy: "u-2",
    decidedAt: "2026-07-09T00:00:00.000Z",
  },
} satisfies ToolcallRequest;

const _result = {
  success: true,
  callId: "tc-1",
  visibleTool: "bash",
  route: "wasm.exec",
  target: "grep",
  command: "grep",
  output: "foo README.md",
  audit: { toolCallId: "tc-1" },
} satisfies ToolcallResult<string>;

const _invocationEnvelope = {
  toolId: "bash",
  callId: "tc-1",
  sessionId: "s-1",
  runId: "run-1",
  agentId: "default",
  args: ["foo", "README.md"],
  mode: "agent",
  metadata: _metadata,
  resourceScopes: ["workspace:w1"],
  approval: {
    status: "approved",
    approvalId: "approval-1",
    approvedBy: "u-2",
    decidedAt: "2026-07-09T00:00:00.000Z",
  },
} satisfies ToolInvocationEnvelope;

const _resultEnvelope = {
  callId: "tc-1",
  status: "completed",
  output: "foo README.md",
  artifacts: [{ artifactId: "artifact-1" }],
  durationMs: 12,
  auditIds: ["audit-1"],
} satisfies ToolResultEnvelope<string>;
