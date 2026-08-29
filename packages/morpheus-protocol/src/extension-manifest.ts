import { isToolcallRoute } from "./tool-policy-types.js";
import type {
  SandboxCliTargetPolicy,
  ToolRegistryExecutorType,
  ToolRiskLevel,
  ToolcallRoute,
} from "./tool-policy-types.js";

export type SupportedProviderToolcallRoute = Extract<
  ToolcallRoute,
  "wasm.exec" | "tool.exec"
>;
export type SupportedProviderExecutorType = Extract<
  ToolRegistryExecutorType,
  "wasm" | "tool"
>;

export type ExtensionProviderKind =
  | "enterprise-connector"
  | "mcp-adapter"
  | "sandbox-artifact"
  | "local-connector";

export interface ProviderCapabilityDeclaration {
  id: string;
  domain?: string;
  level?: string;
  description?: string;
  parent?: string;
}

export interface ProviderPermissionEnvVar {
  name: string;
  required?: boolean;
}

export interface ProviderPermissionMetadata {
  resourceScopes?: string[];
  env?: ProviderPermissionEnvVar[];
  approvalRequired?: boolean;
}

export interface ProviderLifecycleHooks {
  onInstall?: string;
  onActivate?: string;
  onDeactivate?: string;
  onUpgrade?: string;
  healthCheck?: string;
}

export interface ProviderToolExecutorBinding {
  route: SupportedProviderToolcallRoute;
  target?: string;
  command?: string;
}

export interface ProviderToolDeclaration {
  id: string;
  version?: string;
  displayName?: string;
  description?: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  riskLevel?: ToolRiskLevel;
  executor: ProviderToolExecutorBinding;
  deprecation?: {
    replacementToolId?: string;
    sinceVersion?: string;
    message?: string;
  };
}

export interface ProviderExecutorAdapterDeclaration {
  type: SupportedProviderExecutorType;
  route: SupportedProviderToolcallRoute;
  targetPrefix?: string;
  sandboxCli?: {
    manifest: string;
    binaryPath?: string;
    workspaceGuestRoot?: string;
    workspaceAccess?: SandboxCliTargetPolicy["workspaceAccess"];
  };
}

export interface ProviderExtensionManifest {
  schemaVersion: 1;
  id: string;
  version: string;
  displayName: string;
  kind: ExtensionProviderKind;
  capabilities: ProviderCapabilityDeclaration[];
  tools: ProviderToolDeclaration[];
  permissions?: ProviderPermissionMetadata;
  lifecycle?: ProviderLifecycleHooks;
  executor: ProviderExecutorAdapterDeclaration;
  metadata?: Record<string, unknown>;
}

export type ProviderExtensionDiagnosticCode =
  | "INVALID_MANIFEST"
  | "INVALID_SCHEMA_VERSION"
  | "INVALID_PROVIDER_ID"
  | "INVALID_PROVIDER_VERSION"
  | "INVALID_DISPLAY_NAME"
  | "INVALID_PROVIDER_KIND"
  | "INVALID_EXECUTOR_ROUTE"
  | "INVALID_EXECUTOR_TYPE"
  | "UNSUPPORTED_EXECUTOR_ROUTE"
  | "UNSUPPORTED_EXECUTOR_TYPE"
  | "MISMATCHED_EXECUTOR_ROUTE"
  | "MISSING_CAPABILITY"
  | "DUPLICATE_CAPABILITY_ID"
  | "INVALID_TOOL_ID"
  | "DUPLICATE_TOOL_ID"
  | "DUPLICATE_POLICY_TARGET"
  | "INVALID_TOOL_SCHEMA"
  | "INVALID_RISK_LEVEL"
  | "INVALID_TOOL_TARGET"
  | "INVALID_TOOL_COMMAND"
  | "UNKNOWN_CAPABILITY"
  | "INVALID_TOOL_ROUTE"
  | "UNSUPPORTED_TOOL_ROUTE"
  | "MISMATCHED_TOOL_ROUTE";

export interface ProviderExtensionDiagnostic {
  code: ProviderExtensionDiagnosticCode;
  path: string;
  message: string;
}

export interface ProviderExtensionValidationResult {
  valid: boolean;
  diagnostics: ProviderExtensionDiagnostic[];
}

export function defineProviderExtension(
  manifest: ProviderExtensionManifest,
): ProviderExtensionManifest {
  const result = validateProviderExtensionManifest(manifest);
  if (!result.valid) {
    throw new Error(
      `Invalid provider extension manifest: ${result.diagnostics
        .map((diagnostic) => diagnostic.message)
        .join("; ")}`,
    );
  }
  return manifest;
}

export function validateProviderExtensionManifest(
  value: unknown,
): ProviderExtensionValidationResult {
  const diagnostics: ProviderExtensionDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push({
      code: "INVALID_MANIFEST",
      path: "$",
      message: "provider extension manifest must be an object",
    });
    return { valid: false, diagnostics };
  }

  validateTopLevel(value, diagnostics);
  validateExecutor(value.executor, diagnostics, "executor");
  const capabilityIds = validateCapabilities(value.capabilities, diagnostics);
  const providerRoute =
    isRecord(value.executor) && isSupportedProviderRoute(value.executor.route)
      ? value.executor.route
      : undefined;
  validateTools(value.tools, capabilityIds, providerRoute, diagnostics);

  return { valid: diagnostics.length === 0, diagnostics };
}

function validateTopLevel(
  value: Record<string, unknown>,
  diagnostics: ProviderExtensionDiagnostic[],
): void {
  if (value.schemaVersion !== 1) {
    diagnostics.push({
      code: "INVALID_SCHEMA_VERSION",
      path: "schemaVersion",
      message: "schemaVersion must be 1",
    });
  }
  if (!isNonEmptyString(value.id)) {
    diagnostics.push({
      code: "INVALID_PROVIDER_ID",
      path: "id",
      message: "id must be a non-empty string",
    });
  }
  if (!isNonEmptyString(value.version)) {
    diagnostics.push({
      code: "INVALID_PROVIDER_VERSION",
      path: "version",
      message: "version must be a non-empty string",
    });
  }
  if (!isNonEmptyString(value.displayName)) {
    diagnostics.push({
      code: "INVALID_DISPLAY_NAME",
      path: "displayName",
      message: "displayName must be a non-empty string",
    });
  }
  if (!isExtensionProviderKind(value.kind)) {
    diagnostics.push({
      code: "INVALID_PROVIDER_KIND",
      path: "kind",
      message: "kind must be a supported extension provider kind",
    });
  }
}

function validateCapabilities(
  value: unknown,
  diagnostics: ProviderExtensionDiagnostic[],
): Set<string> {
  const capabilityIds = new Set<string>();
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push({
      code: "MISSING_CAPABILITY",
      path: "capabilities",
      message: "capabilities must contain at least one declaration",
    });
    return capabilityIds;
  }

  for (const [index, capability] of value.entries()) {
    const path = `capabilities[${index}]`;
    if (!isRecord(capability) || !isNonEmptyString(capability.id)) {
      diagnostics.push({
        code: "MISSING_CAPABILITY",
        path,
        message: `${path}.id must be a non-empty string`,
      });
      continue;
    }
    if (capabilityIds.has(capability.id)) {
      diagnostics.push({
        code: "DUPLICATE_CAPABILITY_ID",
        path: `${path}.id`,
        message: `duplicate capability id "${capability.id}"`,
      });
      continue;
    }
    capabilityIds.add(capability.id);
  }
  return capabilityIds;
}

function validateTools(
  value: unknown,
  capabilityIds: Set<string>,
  providerRoute: SupportedProviderToolcallRoute | undefined,
  diagnostics: ProviderExtensionDiagnostic[],
): void {
  if (!Array.isArray(value)) {
    diagnostics.push({
      code: "INVALID_TOOL_ID",
      path: "tools",
      message: "tools must be an array",
    });
    return;
  }

  const toolIds = new Set<string>();
  const policyTargetKeys = new Set<string>();
  for (const [index, tool] of value.entries()) {
    const path = `tools[${index}]`;
    if (!isRecord(tool)) {
      diagnostics.push({
        code: "INVALID_TOOL_ID",
        path,
        message: `${path} must be an object`,
      });
      continue;
    }
    const toolId = tool.id;
    if (!isNonEmptyString(toolId)) {
      diagnostics.push({
        code: "INVALID_TOOL_ID",
        path: `${path}.id`,
        message: `${path}.id must be a non-empty string`,
      });
    } else if (toolIds.has(toolId)) {
      diagnostics.push({
        code: "DUPLICATE_TOOL_ID",
        path: `${path}.id`,
        message: `duplicate tool id "${toolId}"`,
      });
    } else {
      toolIds.add(toolId);
    }
    if (!isRecord(tool.inputSchema)) {
      diagnostics.push({
        code: "INVALID_TOOL_SCHEMA",
        path: `${path}.inputSchema`,
        message: `${path}.inputSchema must be an object`,
      });
    }
    if (tool.riskLevel !== undefined && !isToolRiskLevel(tool.riskLevel)) {
      diagnostics.push({
        code: "INVALID_RISK_LEVEL",
        path: `${path}.riskLevel`,
        message: `${path}.riskLevel must be a supported risk level`,
      });
    }
    if (isRecord(tool.executor) && isNonEmptyString(toolId)) {
      const route = tool.executor.route;
      const target = isNonEmptyString(tool.executor.target)
        ? tool.executor.target
        : toolId;
      if (isSupportedProviderRoute(route)) {
        if (providerRoute !== undefined && route !== providerRoute) {
          diagnostics.push({
            code: "MISMATCHED_TOOL_ROUTE",
            path: `${path}.executor.route`,
            message: `${path}.executor.route must match provider executor route "${providerRoute}"`,
          });
        }
        const policyTargetKey = `${route}:${target}`;
        if (policyTargetKeys.has(policyTargetKey)) {
          diagnostics.push({
            code: "DUPLICATE_POLICY_TARGET",
            path: `${path}.executor.target`,
            message: `duplicate policy target "${target}" for route "${route}"`,
          });
        } else {
          policyTargetKeys.add(policyTargetKey);
        }
      }
    }
    validateToolCapabilities(
      tool.capabilities,
      capabilityIds,
      diagnostics,
      `${path}.capabilities`,
    );
    validateToolExecutor(tool.executor, diagnostics, `${path}.executor`);
  }
}

function validateToolCapabilities(
  value: unknown,
  capabilityIds: Set<string>,
  diagnostics: ProviderExtensionDiagnostic[],
  path: string,
): void {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push({
      code: "UNKNOWN_CAPABILITY",
      path,
      message: `${path} must contain at least one capability id`,
    });
    return;
  }
  for (const capability of value) {
    if (typeof capability !== "string" || !capabilityIds.has(capability)) {
      diagnostics.push({
        code: "UNKNOWN_CAPABILITY",
        path,
        message: `${path} references undeclared capability "${String(capability)}"`,
      });
    }
  }
}

function validateExecutor(
  value: unknown,
  diagnostics: ProviderExtensionDiagnostic[],
  path: string,
): void {
  if (!isRecord(value)) {
    diagnostics.push({
      code: "INVALID_EXECUTOR_TYPE",
      path,
      message: `${path} must be an object`,
    });
    return;
  }
  if (!isToolRegistryExecutorType(value.type)) {
    diagnostics.push({
      code: "INVALID_EXECUTOR_TYPE",
      path: `${path}.type`,
      message: `${path}.type must be a supported executor type`,
    });
  } else if (!isSupportedProviderExecutorType(value.type)) {
    diagnostics.push({
      code: "UNSUPPORTED_EXECUTOR_TYPE",
      path: `${path}.type`,
      message: `${path}.type is not supported by provider extension policy artifacts yet`,
    });
  }
  if (!isToolcallRoute(value.route)) {
    diagnostics.push({
      code: "INVALID_EXECUTOR_ROUTE",
      path: `${path}.route`,
      message: `${path}.route must be a supported toolcall route`,
    });
  } else if (!isSupportedProviderRoute(value.route)) {
    diagnostics.push({
      code: "UNSUPPORTED_EXECUTOR_ROUTE",
      path: `${path}.route`,
      message: `${path}.route is not supported by provider extension policy artifacts yet`,
    });
  }
  if (
    isSupportedProviderExecutorType(value.type) &&
    isSupportedProviderRoute(value.route) &&
    !executorTypeMatchesRoute(value.type, value.route)
  ) {
    diagnostics.push({
      code: "MISMATCHED_EXECUTOR_ROUTE",
      path: path,
      message: `${path}.type "${value.type}" does not match route "${value.route}"`,
    });
  }
}

function validateToolExecutor(
  value: unknown,
  diagnostics: ProviderExtensionDiagnostic[],
  path: string,
): void {
  if (!isRecord(value)) {
    diagnostics.push({
      code: "INVALID_TOOL_ROUTE",
      path,
      message: `${path} must be an object`,
    });
    return;
  }
  if (!isToolcallRoute(value.route)) {
    diagnostics.push({
      code: "INVALID_TOOL_ROUTE",
      path: `${path}.route`,
      message: `${path}.route must be a supported toolcall route`,
    });
  } else if (!isSupportedProviderRoute(value.route)) {
    diagnostics.push({
      code: "UNSUPPORTED_TOOL_ROUTE",
      path: `${path}.route`,
      message: `${path}.route is not supported by provider extension policy artifacts yet`,
    });
  }
  if ("target" in value && !isNonEmptyString(value.target)) {
    diagnostics.push({
      code: "INVALID_TOOL_TARGET",
      path: `${path}.target`,
      message: `${path}.target must be a non-empty string when provided`,
    });
  }
  if ("command" in value && !isNonEmptyString(value.command)) {
    diagnostics.push({
      code: "INVALID_TOOL_COMMAND",
      path: `${path}.command`,
      message: `${path}.command must be a non-empty string when provided`,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isExtensionProviderKind(
  value: unknown,
): value is ExtensionProviderKind {
  return (
    value === "enterprise-connector" ||
    value === "mcp-adapter" ||
    value === "sandbox-artifact" ||
    value === "local-connector"
  );
}

function isToolRegistryExecutorType(
  value: unknown,
): value is ToolRegistryExecutorType {
  return (
    value === "wasm" ||
    value === "bash" ||
    value === "tool" ||
    value === "container"
  );
}

function isSupportedProviderExecutorType(
  value: unknown,
): value is SupportedProviderExecutorType {
  return value === "wasm" || value === "tool";
}

function isSupportedProviderRoute(
  value: unknown,
): value is SupportedProviderToolcallRoute {
  return value === "wasm.exec" || value === "tool.exec";
}

function isToolRiskLevel(value: unknown): value is ToolRiskLevel {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical" ||
    value === "unknown"
  );
}

function executorTypeMatchesRoute(
  type: SupportedProviderExecutorType,
  route: SupportedProviderToolcallRoute,
): boolean {
  return (
    (type === "wasm" && route === "wasm.exec") ||
    (type === "tool" && route === "tool.exec")
  );
}
