import type {
  BashExecRoutePolicy,
  ToolPolicy,
  ToolPolicyDecision,
  ToolPolicyDefinition,
  ToolExecRoutePolicy,
  ToolcallRequest,
  ToolcallResult,
  ToolcallRoute,
} from "./tool-policy-types.js";

const _route = "wasm.exec" satisfies ToolcallRoute;

const _definition = {
  schemaVersion: 2,
  tools: { allowed: ["read", "bash"] },
  execution: {
    defaults: {
      maxOutputBytes: 65536,
      allowedEnvVars: ["PATH"],
    },
    bindings: {
      bash: {
        default: { route: "bash.exec" },
        commands: {
          grep: { route: "wasm.exec", target: "grep" },
        },
      },
      read: {
        default: { route: "tool.exec", target: "builtin.read" },
      },
    },
    routes: {
      "wasm.exec": {
        enabled: true,
        tools: {
          grep: { enabled: true, preopens: ["/workspace"], network: false },
        },
      },
      "bash.exec": { enabled: false },
      "tool.exec": { enabled: false },
      "container.exec": { enabled: false },
    },
  },
  capabilityAccess: { allow: ["code.*"], deny: ["code.refactor"] },
  source: {
    origin: "migration",
    yamlPath: "config/agents/default.yaml",
    yamlHash: "sha256:demo",
  },
} satisfies ToolPolicyDefinition;

const bashRoute = {
  enabled: true,
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
  resolvedBackendConfig: null,
} satisfies ToolPolicyDecision;

const _request = {
  agentId: "default",
  visibleTool: "bash",
  route: "wasm.exec",
  target: "grep",
  command: "grep",
  args: ["foo", "README.md"],
  audit: { userId: "u-1", apiKeyId: "key-1", sessionId: "s-1", toolCallId: "tc-1" },
  requestedEnvVars: ["PATH"],
  requestedMaxOutputBytes: 65536,
} satisfies ToolcallRequest;

const _result = {
  success: true,
  visibleTool: "bash",
  route: "wasm.exec",
  target: "grep",
  command: "grep",
  output: "foo README.md",
  audit: { toolCallId: "tc-1" },
} satisfies ToolcallResult<string>;
