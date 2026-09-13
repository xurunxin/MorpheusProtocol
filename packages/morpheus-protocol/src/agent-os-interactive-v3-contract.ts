import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import { parseAgentOsInteractiveV2Cursor } from "./agent-os-interactive-v2-contract.js";
import {
  AGENT_OS_INTERACTIVE_V3_CAPABILITIES,
  AGENT_OS_INTERACTIVE_V3_OPERATIONS,
  AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION,
  type AgentOsInteractiveV3AckOperation,
  type AgentOsInteractiveV3AckResponse,
  type AgentOsInteractiveV3CapabilityDescriptor,
  type AgentOsInteractiveV3CapabilityResponse,
  type AgentOsInteractiveV3CommandBinding,
  type AgentOsInteractiveV3CommandReceipt,
  type AgentOsInteractiveV3ExecutionTarget,
  type AgentOsInteractiveV3Operation,
  type AgentOsInteractiveV3ProviderApiFamily,
  type AgentOsInteractiveV3ReplayBinding,
  type AgentOsInteractiveV3Request,
  type AgentOsInteractiveV3Response,
} from "./agent-os-interactive-v3-types.js";

export * from "./agent-os-interactive-v3-types.js";

export const AGENT_OS_INTERACTIVE_V3_LIMITS = Object.freeze({
  maxFrameBytes: 1_048_576,
  maxJsonDepth: 32,
  maxJsonNodes: 20_000,
  maxArrayItems: 10_000,
  maxObjectProperties: 1_024,
  maxStringUtf8Bytes: 1_048_576,
  maxIdentifierBytes: 128,
  maxMessageBytes: 65_536,
  maxEvents: 256,
  maxQueueItems: 64,
  maxSessions: 256,
  maxProviders: 128,
  maxModels: 256,
  maxAgents: 256,
  maxWorkspaces: 256,
  maxExecutions: 16,
  maxTools: 256,
  maxSkills: 256,
  maxDiagnostics: 128,
  maxChanges: 10_000,
  maxCapabilities: 64,
  maxAuthorityProofBytes: 4_096,
  maxReasonBytes: 512,
} as const);

export type AgentOsInteractiveV3ContractErrorCode =
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "UNKNOWN_FIELD"
  | "INVALID_SCHEMA"
  | "UNKNOWN_OPERATION"
  | "UNKNOWN_EVENT"
  | "CORRELATION_MISMATCH"
  | "SEQUENCE_GAP"
  | "DIGEST_MISMATCH"
  | "JSON_BUDGET"
  | "IDEMPOTENCY_CONFLICT"
  | "IDEMPOTENCY_RECORD_EXPIRED";

export class AgentOsInteractiveV3ContractError extends Error {
  constructor(
    readonly code: AgentOsInteractiveV3ContractErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AgentOsInteractiveV3ContractError";
  }
}

const OPERATION_SET = new Set<string>(AGENT_OS_INTERACTIVE_V3_OPERATIONS);
const CAPABILITY_SET = new Set<string>(AGENT_OS_INTERACTIVE_V3_CAPABILITIES);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;

const READ_ONLY_OPERATIONS = new Set<AgentOsInteractiveV3Operation>([
  "session.catalog.read",
  "provider.catalog.read",
  "agent.catalog.read",
  "workspace.catalog.read",
  "execution.catalog.read",
  "config.status.read",
  "agent.definition.read",
  "workspace.change.preview",
  "transcript.read",
  "transcript.subscribe",
  "prompt.queue.read",
  "capability.read",
]);

const ACK_OPERATIONS = new Set<string>([
  "session.create",
  "session.fork",
  "session.rename",
  "turn.start",
  "turn.cancel",
  "turn.retry",
  "provider.binding.create",
  "prompt.queue.clear",
  "session.compact",
  "prompt.steer",
  "prompt.follow-up",
  "interaction.respond",
]);

function isAckOperation(
  value: string,
): value is AgentOsInteractiveV3AckOperation {
  return ACK_OPERATIONS.has(value);
}

/**
 * 命令绑定规则（冻结）：修改型 operation 必须携带 command；只读 operation
 * 禁止携带 command。幂等记录由宿主与业务 mutation 同事务维护（B06/B08）。
 */
export function isAgentOsInteractiveV3ReadOnlyOperation(
  operation: AgentOsInteractiveV3Operation,
): boolean {
  return READ_ONLY_OPERATIONS.has(operation);
}

export function parseAgentOsInteractiveV3Request(
  input: unknown,
): Readonly<AgentOsInteractiveV3Request> {
  const value = record(input, "interactive v3 request");
  const operation = operationValue(value.operation);
  const base = ["schemaVersion", "operation", "requestId"];
  const common = {
    schemaVersion: schema(value.schemaVersion),
    operation,
    requestId: identifier(value.requestId, "requestId"),
    ...parseCommandBinding(value, operation),
  };
  switch (operation) {
    case "session.catalog.read":
    case "provider.catalog.read":
    case "agent.catalog.read":
    case "workspace.catalog.read":
    case "execution.catalog.read":
    case "config.status.read":
    case "capability.read":
      exact(value, base, operation);
      return freeze(common) as AgentOsInteractiveV3Request;
    case "session.create":
      exactOptional(
        value,
        [...base, "command"],
        [
          "title",
          "parentSessionId",
          "agentId",
          "workspaceId",
          "executionTarget",
          "providerId",
          "modelId",
          "apiFamily",
        ],
        operation,
      );
      return freeze({
        ...common,
        ...optionalText(value, "title", 256),
        ...optionalIdentifier(value, "parentSessionId"),
        ...optionalIdentifier(value, "agentId"),
        ...optionalIdentifier(value, "workspaceId"),
        ...optionalExecutionTarget(value, "executionTarget"),
        ...optionalIdentifier(value, "providerId"),
        ...optionalIdentifier(value, "modelId"),
        ...optionalApiFamily(value, "apiFamily"),
      }) as AgentOsInteractiveV3Request;
    case "session.fork":
      exactOptional(
        value,
        [...base, "command", "sessionId"],
        ["title"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        ...optionalText(value, "title", 256),
      }) as AgentOsInteractiveV3Request;
    case "session.rename":
      exact(value, [...base, "command", "sessionId", "title"], operation);
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        title: text(value.title, "title", 256),
      }) as AgentOsInteractiveV3Request;
    case "turn.start":
      exact(
        value,
        [
          ...base,
          "command",
          "sessionId",
          "turnId",
          "message",
          "bindingRevision",
        ],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        turnId: identifier(value.turnId, "turnId"),
        message: text(
          value.message,
          "message",
          AGENT_OS_INTERACTIVE_V3_LIMITS.maxMessageBytes,
        ),
        bindingRevision: revision(value.bindingRevision, "bindingRevision"),
      }) as AgentOsInteractiveV3Request;
    case "turn.cancel":
      exact(
        value,
        [...base, "command", "sessionId", "runId", "turnId", "reason"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        reason: text(
          value.reason,
          "reason",
          AGENT_OS_INTERACTIVE_V3_LIMITS.maxReasonBytes,
        ),
      }) as AgentOsInteractiveV3Request;
    case "turn.retry":
      exact(
        value,
        [...base, "command", "sessionId", "runId", "turnId", "bindingRevision"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        bindingRevision: revision(value.bindingRevision, "bindingRevision"),
      }) as AgentOsInteractiveV3Request;
    case "transcript.read":
    case "transcript.subscribe":
      exactOptional(
        value,
        [...base, "sessionId", "cursor", "limit"],
        ["replay"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        cursor:
          value.cursor === null
            ? null
            : parseAgentOsInteractiveV2Cursor(value.cursor),
        limit: boundedInteger(
          value.limit,
          "limit",
          1,
          AGENT_OS_INTERACTIVE_V3_LIMITS.maxEvents,
        ),
        ...optionalReplayBinding(value),
      }) as AgentOsInteractiveV3Request;
    case "provider.binding.create":
      exact(
        value,
        [
          ...base,
          "command",
          "sessionId",
          "providerId",
          "modelId",
          "apiFamily",
          "expectedRevision",
        ],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        providerId: identifier(value.providerId, "providerId"),
        modelId: identifier(value.modelId, "modelId"),
        apiFamily: apiFamily(value.apiFamily),
        expectedRevision: revision(value.expectedRevision, "expectedRevision"),
      }) as AgentOsInteractiveV3Request;
    case "prompt.queue.read":
      exact(value, [...base, "sessionId", "runId"], operation);
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
      }) as AgentOsInteractiveV3Request;
    case "prompt.queue.clear":
      exact(
        value,
        [...base, "command", "sessionId", "runId", "expectedRevision"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        expectedRevision: revision(value.expectedRevision, "expectedRevision"),
      }) as AgentOsInteractiveV3Request;
    case "session.compact":
      exact(value, [...base, "command", "sessionId", "sourceRunId"], operation);
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        sourceRunId: identifier(value.sourceRunId, "sourceRunId"),
      }) as AgentOsInteractiveV3Request;
    case "prompt.steer":
    case "prompt.follow-up":
      exact(
        value,
        [...base, "command", "sessionId", "runId", "turnId", "instruction"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        runId: identifier(value.runId, "runId"),
        turnId: identifier(value.turnId, "turnId"),
        instruction: text(
          value.instruction,
          "instruction",
          AGENT_OS_INTERACTIVE_V3_LIMITS.maxMessageBytes,
        ),
      }) as AgentOsInteractiveV3Request;
    case "interaction.respond": {
      exactOptional(
        value,
        [...base, "command", "sessionId", "challengeId", "decision"],
        ["answer"],
        operation,
      );
      const decision = interactionDecision(value.decision);
      if (decision === "answer" && value.answer === undefined)
        fail("INVALID_VALUE", "answer is required for answer decision");
      if (decision !== "answer" && value.answer !== undefined)
        fail("INVALID_VALUE", "answer is only valid for answer decision");
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        challengeId: identifier(value.challengeId, "challengeId"),
        decision,
        ...optionalText(
          value,
          "answer",
          AGENT_OS_INTERACTIVE_V3_LIMITS.maxMessageBytes,
        ),
      }) as AgentOsInteractiveV3Request;
    }
    case "agent.definition.read":
      exact(value, [...base, "agentId"], operation);
      return freeze({
        ...common,
        agentId: identifier(value.agentId, "agentId"),
      }) as AgentOsInteractiveV3Request;
    case "context.binding.create":
      exactOptional(
        value,
        [
          ...base,
          "command",
          "sessionId",
          "agentId",
          "workspaceId",
          "executionTarget",
          "providerId",
          "modelId",
          "apiFamily",
          "expectedBindingRevision",
        ],
        ["expectedConfigRevision"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        agentId: identifier(value.agentId, "agentId"),
        workspaceId: identifier(value.workspaceId, "workspaceId"),
        executionTarget: executionTarget(value.executionTarget),
        providerId: identifier(value.providerId, "providerId"),
        modelId: identifier(value.modelId, "modelId"),
        apiFamily: apiFamily(value.apiFamily),
        expectedBindingRevision: revision(
          value.expectedBindingRevision,
          "expectedBindingRevision",
        ),
        ...optionalRevision(value, "expectedConfigRevision"),
      }) as AgentOsInteractiveV3Request;
    case "config.reconcile":
      exactOptional(
        value,
        [...base, "command"],
        ["expectedRevision"],
        operation,
      );
      return freeze({
        ...common,
        ...optionalRevision(value, "expectedRevision"),
      }) as AgentOsInteractiveV3Request;
    case "workspace.change.preview":
      exact(
        value,
        [...base, "sessionId", "workspaceId", "baselineDigest"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        workspaceId: identifier(value.workspaceId, "workspaceId"),
        baselineDigest: digest(value.baselineDigest, "baselineDigest"),
      }) as AgentOsInteractiveV3Request;
    case "workspace.change.apply":
      exactOptional(
        value,
        [
          ...base,
          "command",
          "sessionId",
          "workspaceId",
          "baselineDigest",
          "changeDigest",
          "expectedWorkspaceRevision",
        ],
        ["challengeId"],
        operation,
      );
      return freeze({
        ...common,
        sessionId: identifier(value.sessionId, "sessionId"),
        workspaceId: identifier(value.workspaceId, "workspaceId"),
        baselineDigest: digest(value.baselineDigest, "baselineDigest"),
        changeDigest: digest(value.changeDigest, "changeDigest"),
        expectedWorkspaceRevision: revision(
          value.expectedWorkspaceRevision,
          "expectedWorkspaceRevision",
        ),
        ...optionalIdentifier(value, "challengeId"),
      }) as AgentOsInteractiveV3Request;
    default:
      return exhaustive(operation);
  }
}

export const parseAgentOsInteractiveV3RequestEnvelope =
  parseAgentOsInteractiveV3Request;

function parseCommandBinding(
  value: Record<string, unknown>,
  operation: AgentOsInteractiveV3Operation,
): { command?: AgentOsInteractiveV3CommandBinding } {
  if (value.command === undefined) {
    if (!READ_ONLY_OPERATIONS.has(operation))
      fail(
        "INVALID_SHAPE",
        `${operation} requires a command binding in interactive v3`,
      );
    return {};
  }
  if (READ_ONLY_OPERATIONS.has(operation))
    fail(
      "INVALID_SHAPE",
      `${operation} must not carry a command binding in interactive v3`,
    );
  const command = record(value.command, "command binding");
  exactOptional(
    command,
    ["commandId", "principal", "payloadDigest"],
    ["authorityProof", "authorityEpoch"],
    "command binding",
  );
  const binding: AgentOsInteractiveV3CommandBinding = {
    commandId: identifier(command.commandId, "commandId"),
    principal: identifier(command.principal, "principal"),
    payloadDigest: digest(command.payloadDigest, "payloadDigest"),
    ...optionalAuthority(command),
  };
  return { command: binding };
}

function parseOptional<K extends string, T>(
  value: Record<string, unknown>,
  key: K,
  parse: (input: unknown) => T,
): Partial<Record<K, T>> {
  if (!(key in value)) return {};
  const parsed = parse(value[key]);
  const result: Partial<Record<K, T>> = {};
  result[key] = parsed;
  return result;
}

function optionalIdentifier<K extends string>(
  value: Record<string, unknown>,
  key: K,
): Partial<Record<K, string>> {
  return parseOptional(value, key, (input) => identifier(input, key));
}

function optionalText<K extends string>(
  value: Record<string, unknown>,
  key: K,
  maxBytes: number,
): Partial<Record<K, string>> {
  return parseOptional(value, key, (input) => text(input, key, maxBytes));
}

function optionalRevision<K extends string>(
  value: Record<string, unknown>,
  key: K,
): Partial<Record<K, number>> {
  return parseOptional(value, key, (input) => revision(input, key));
}

function optionalExecutionTarget<K extends string>(
  value: Record<string, unknown>,
  key: K,
): Partial<Record<K, AgentOsInteractiveV3ExecutionTarget>> {
  return parseOptional(value, key, (input) => executionTarget(input));
}

function optionalApiFamily<K extends string>(
  value: Record<string, unknown>,
  key: K,
): Partial<Record<K, AgentOsInteractiveV3ProviderApiFamily>> {
  return parseOptional(value, key, (input) => apiFamily(input));
}

function optionalAuthority(
  value: Record<string, unknown>,
): Partial<
  Pick<AgentOsInteractiveV3CommandBinding, "authorityProof" | "authorityEpoch">
> {
  const authorityProof = parseOptional(value, "authorityProof", (input) =>
    text(
      input,
      "authorityProof",
      AGENT_OS_INTERACTIVE_V3_LIMITS.maxAuthorityProofBytes,
    ),
  );
  const authorityEpoch = parseOptional(value, "authorityEpoch", (input) =>
    revision(input, "authorityEpoch"),
  );
  return { ...authorityProof, ...authorityEpoch };
}

function parseReplayBinding(input: unknown): AgentOsInteractiveV3ReplayBinding {
  const value = record(input, "replay binding");
  exact(value, ["storeGeneration", "projectionEpoch"], "replay binding");
  return freeze({
    storeGeneration: nonNegativeNumber(
      value.storeGeneration,
      "storeGeneration",
    ),
    projectionEpoch: nonNegativeNumber(
      value.projectionEpoch,
      "projectionEpoch",
    ),
  }) as AgentOsInteractiveV3ReplayBinding;
}

function optionalReplayBinding(
  value: Record<string, unknown>,
): Partial<Record<"replay", AgentOsInteractiveV3ReplayBinding>> {
  return parseOptional(value, "replay", parseReplayBinding);
}

export function parseAgentOsInteractiveV3AckResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV3AckResponse> {
  const value = record(input, "interactive v3 ack response");
  const operation = value.operation;
  if (typeof operation !== "string" || !isAckOperation(operation))
    fail(
      "UNKNOWN_OPERATION",
      "interactive v3 ack operation is not ack-capable",
    );
  exactOptional(
    value,
    ["schemaVersion", "operation", "requestId", "status", "replayed"],
    ["sessionId", "runId", "turnId", "reason", "receipt"],
    "interactive v3 ack response",
  );
  const receipt =
    value.receipt === undefined
      ? {}
      : {
          receipt: parseAgentOsInteractiveV3CommandReceipt(value.receipt),
        };
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation,
    requestId: identifier(value.requestId, "requestId"),
    status: ackStatus(value.status),
    replayed: boolean(value.replayed, "replayed"),
    ...optionalIdentifier(value, "sessionId"),
    ...optionalIdentifier(value, "runId"),
    ...optionalIdentifier(value, "turnId"),
    ...optionalText(
      value,
      "reason",
      AGENT_OS_INTERACTIVE_V3_LIMITS.maxReasonBytes,
    ),
    ...receipt,
  }) as Readonly<AgentOsInteractiveV3AckResponse>;
}

export function parseAgentOsInteractiveV3CommandReceipt(
  input: unknown,
): Readonly<AgentOsInteractiveV3CommandReceipt> {
  const value = record(input, "interactive v3 command receipt");
  exact(
    value,
    ["commandId", "disposition", "payloadDigest"],
    "interactive v3 command receipt",
  );
  if (value.disposition !== "executed" && value.disposition !== "duplicate")
    fail("INVALID_VALUE", "command receipt disposition is invalid");
  return freeze({
    commandId: identifier(value.commandId, "commandId"),
    disposition: value.disposition,
    payloadDigest: digest(value.payloadDigest, "payloadDigest"),
  }) as Readonly<AgentOsInteractiveV3CommandReceipt>;
}

export function parseAgentOsInteractiveV3CapabilityResponse(
  input: unknown,
): Readonly<AgentOsInteractiveV3CapabilityResponse> {
  const value = record(input, "interactive v3 capability response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "capabilities"],
    "interactive v3 capability response",
  );
  if (value.operation !== "capability.read")
    fail("UNKNOWN_OPERATION", "capability response operation is invalid");
  const capabilities = array(
    value.capabilities,
    "capabilities",
    AGENT_OS_INTERACTIVE_V3_LIMITS.maxCapabilities,
  ).map((item) => parseAgentOsInteractiveV3CapabilityDescriptor(item));
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "capability.read",
    requestId: identifier(value.requestId, "requestId"),
    capabilities,
  }) as Readonly<AgentOsInteractiveV3CapabilityResponse>;
}

function parseAgentOsInteractiveV3CapabilityDescriptor(
  input: unknown,
): Readonly<AgentOsInteractiveV3CapabilityDescriptor> {
  const value = record(input, "capability descriptor");
  exactOptional(
    value,
    ["capability", "implemented", "configured", "authorized", "ready"],
    ["reason"],
    "capability descriptor",
  );
  if (
    typeof value.capability !== "string" ||
    !CAPABILITY_SET.has(value.capability)
  )
    fail("INVALID_VALUE", "capability is not registered");
  const descriptor = {
    capability: value.capability,
    implemented: boolean(value.implemented, "implemented"),
    configured: boolean(value.configured, "configured"),
    authorized: boolean(value.authorized, "authorized"),
    ready: boolean(value.ready, "ready"),
    ...optionalText(value, "reason", 256),
  };
  if (
    descriptor.ready &&
    !(descriptor.implemented && descriptor.configured && descriptor.authorized)
  )
    fail(
      "INVALID_VALUE",
      "capability ready requires implemented, configured and authorized",
    );
  return freeze(
    descriptor,
  ) as Readonly<AgentOsInteractiveV3CapabilityDescriptor>;
}

export function parseAgentOsInteractiveV3Response(
  input: unknown,
): Readonly<AgentOsInteractiveV3Response> {
  const value = record(input, "interactive v3 response");
  if (value.capabilities !== undefined)
    return parseAgentOsInteractiveV3CapabilityResponse(value);
  return parseAgentOsInteractiveV3AckResponse(value);
}

export function canonicalAgentOsInteractiveV3Source(input: unknown): string {
  return canonicalJson(parseCanonicalInput(input));
}

export function serializeAgentOsInteractiveV3Request(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveV3Request(input))}\n`;
}
export function serializeAgentOsInteractiveV3Response(input: unknown): string {
  return `${canonicalJson(parseAgentOsInteractiveV3Response(input))}\n`;
}
export function serializeAgentOsInteractiveV3(input: unknown): string {
  return `${canonicalAgentOsInteractiveV3Source(input)}\n`;
}
export function decodeAgentOsInteractiveV3(
  source: string,
): Readonly<AgentOsInteractiveV3Request | AgentOsInteractiveV3Response> {
  if (typeof source !== "string")
    fail("INVALID_VALUE", "encoded source must be a string");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    fail("INVALID_VALUE", "encoded source is not valid JSON");
  }
  return parseCanonicalInput(value) as
    | AgentOsInteractiveV3Request
    | AgentOsInteractiveV3Response;
}
export const parseAgentOsInteractiveV3 = decodeAgentOsInteractiveV3;

function parseCanonicalInput(
  input: unknown,
): AgentOsInteractiveV3Request | AgentOsInteractiveV3Response {
  const value = record(input, "interactive v3 source");
  if (value.eventType !== undefined)
    fail(
      "INVALID_SHAPE",
      "interactive v3 does not carry events; transcript data remains agent-os-interactive.v2",
    );
  if (value.operation !== undefined && typeof value.operation === "string") {
    if (value.capabilities !== undefined)
      return parseAgentOsInteractiveV3CapabilityResponse(value);
    if (value.status !== undefined)
      return parseAgentOsInteractiveV3AckResponse(value);
    return parseAgentOsInteractiveV3Request(value);
  }
  fail("INVALID_SHAPE", "interactive v3 source kind is unknown");
}

/**
 * 命令 canonical 指纹（M3）：对已解析请求做 canonical JSON，剔除客户端
 * 自报的 payloadDigest 后计算 sha256。宿主必须比对指纹与 command.payloadDigest，
 * 不一致按 DIGEST_MISMATCH 拒绝；传输重试不得生成新 commandId。
 */
export function createAgentOsInteractiveV3CommandFingerprint(
  input: unknown,
): `sha256:${string}` {
  const request = parseAgentOsInteractiveV3Request(input);
  const command = request.command;
  if (!command)
    fail(
      "INVALID_VALUE",
      "command binding is required for a command fingerprint",
    );
  const unsigned: Record<string, unknown> = {
    commandId: command.commandId,
    principal: command.principal,
    ...(command.authorityEpoch !== undefined
      ? { authorityEpoch: command.authorityEpoch }
      : {}),
    ...(command.authorityProof !== undefined
      ? { authorityProof: command.authorityProof }
      : {}),
  };
  return `sha256:${sha256Hex(canonicalJson({ ...request, command: unsigned }))}`;
}

export function createAgentOsInteractiveV3RequestDigest(
  input: unknown,
): string {
  return `sha256:${sha256Hex(serializeAgentOsInteractiveV3Request(input).trim())}`;
}

function schema(value: unknown): typeof AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION {
  if (value !== AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION)
    fail("INVALID_SCHEMA", "interactive v3 schemaVersion is unsupported");
  return AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION;
}
function operationValue(value: unknown): AgentOsInteractiveV3Operation {
  if (typeof value !== "string" || !OPERATION_SET.has(value))
    fail("UNKNOWN_OPERATION", "interactive v3 operation is not registered");
  return value as AgentOsInteractiveV3Operation;
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  assertStringBudget(
    value,
    label,
    AGENT_OS_INTERACTIVE_V3_LIMITS.maxIdentifierBytes,
  );
  scalarLength(value, label);
  return value;
}
function text(
  value: unknown,
  label: string,
  maxBytes: number,
  allowEmpty = false,
): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0))
    fail(
      "INVALID_VALUE",
      `${label} must be a${allowEmpty ? "" : " non-empty"} string`,
    );
  scalarLength(value, label);
  assertStringBudget(value, label, maxBytes);
  return value;
}
function digest(value: unknown, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is not a sha256 digest`);
  return value as `sha256:${string}`;
}
function revision(value: unknown, label: string): number {
  return boundedInteger(value, label, 0, Number.MAX_SAFE_INTEGER);
}
function boundedInteger(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    fail("INVALID_VALUE", `${label} is outside its integer range`);
  return value;
}
function nonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    fail("INVALID_VALUE", `${label} must be a non-negative finite number`);
  return value;
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean")
    fail("INVALID_VALUE", `${label} must be boolean`);
  return value;
}
function apiFamily(value: unknown): AgentOsInteractiveV3ProviderApiFamily {
  if (value !== "openai-responses" && value !== "openai-completions")
    fail("INVALID_VALUE", "provider API family is invalid");
  return value;
}
function executionTarget(value: unknown): AgentOsInteractiveV3ExecutionTarget {
  if (value !== "sandbox" && value !== "host" && value !== "managed")
    fail("INVALID_VALUE", "execution target is invalid");
  return value;
}
function interactionDecision(
  value: unknown,
): "approve" | "reject" | "cancel" | "answer" {
  if (
    value !== "approve" &&
    value !== "reject" &&
    value !== "cancel" &&
    value !== "answer"
  )
    fail("INVALID_VALUE", "interaction decision is invalid");
  return value;
}
function ackStatus(value: unknown): "accepted" | "completed" | "rejected" {
  if (value !== "accepted" && value !== "completed" && value !== "rejected")
    fail("INVALID_VALUE", "ack status is invalid");
  return value;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getPrototypeOf(value) !== Object.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length > 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.keys(descriptors).length >
    AGENT_OS_INTERACTIVE_V3_LIMITS.maxObjectProperties
  )
    fail("JSON_BUDGET", `${label} has too many properties`);
  for (const [key, descriptor] of Object.entries(descriptors))
    if (
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      fail(
        "INVALID_SHAPE",
        `${label}.${key} must be an enumerable data property`,
      );
  return value as Record<string, unknown>;
}

function array(
  value: unknown,
  label: string,
  maxItems: number,
): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  )
    fail("INVALID_SHAPE", `${label} must be a plain array`);
  if (value.length > maxItems) fail("JSON_BUDGET", `${label} is too large`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors))
    if (
      key !== "length" &&
      (!/^(?:0|[1-9][0-9]*)$/u.test(key) ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined)
    )
      fail("INVALID_SHAPE", `${label} contains an unsafe item`);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor))
      fail("INVALID_SHAPE", `${label} must not contain holes`);
    result.push(descriptor.value);
  }
  return result;
}

function exact(
  value: Record<string, unknown>,
  required: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== required.length ||
    keys.some((key) => !required.includes(key)) ||
    required.some((key) => !(key in value))
  )
    fail("INVALID_SHAPE", `${label} contains unknown or missing fields`);
}
function exactOptional(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    Object.keys(value).some((key) => !allowed.has(key)) ||
    required.some((key) => !(key in value))
  )
    fail("INVALID_SHAPE", `${label} contains unknown or missing fields`);
  for (const key of optional)
    if (key in value && value[key] === undefined)
      fail("INVALID_VALUE", `${label}.${key} must not be undefined`);
}
function assertStringBudget(
  value: string,
  label: string,
  limit: number = AGENT_OS_INTERACTIVE_V3_LIMITS.maxStringUtf8Bytes,
): void {
  if (new TextEncoder().encode(value).byteLength > limit)
    fail("JSON_BUDGET", `${label} exceeds its UTF-8 byte budget`);
}
function scalarLength(value: string, label: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff)
        fail("INVALID_VALUE", `${label} contains an unpaired surrogate`);
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff)
      fail("INVALID_VALUE", `${label} contains an unpaired surrogate`);
    count += 1;
  }
  return count;
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
  const object = record(value, "canonical source");
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}
function freeze<T>(value: T): T {
  return deepFreeze(value);
}
function exhaustive(value: never): never {
  fail("INVALID_VALUE", `unsupported value: ${String(value)}`);
}
function fail(
  code: AgentOsInteractiveV3ContractErrorCode,
  message: string,
): never {
  throw new AgentOsInteractiveV3ContractError(code, message);
}
