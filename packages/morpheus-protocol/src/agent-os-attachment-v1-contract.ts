/**
 * agent-os-attachment.v1（M14 契约骨架，B02）：图像附件的版本化契约。
 *
 * 首切片裁定（08-semantic-freeze.md §9）：本契约只冻结 wire 形状与限额，
 * capability `attachment.image` 由宿主声明 implemented:false；upload 通道、
 * 内容寻址存储、provider 适配由 B16 实现。图像是后端持久化的内容引用，
 * 只允许 opaque attachmentId，不允许外部任意 URL 或本地路径进入 wire。
 */
import { deepFreeze } from "./contract-primitives.js";

export const AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION =
  "agent-os-attachment.v1" as const;

export type AgentOsAttachmentV1SchemaVersion =
  typeof AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION;

export const AGENT_OS_ATTACHMENT_V1_OPERATIONS = Object.freeze([
  "attachment.init",
  "attachment.chunk",
  "attachment.commit",
  "attachment.read",
] as const);

export type AgentOsAttachmentV1Operation =
  (typeof AGENT_OS_ATTACHMENT_V1_OPERATIONS)[number];

export const AGENT_OS_ATTACHMENT_V1_LIMITS = Object.freeze({
  maxIdentifierBytes: 128,
  maxMimeBytes: 128,
  /** 默认每张上限（03-protocol 拟定值，B16 可按模型能力收窄）。 */
  maxAttachmentBytes: 10_485_760,
  /** 默认每 prompt 张数上限（拟定值）。 */
  maxAttachmentsPerPrompt: 4,
  maxChunkBytes: 1_048_576,
  maxChunksPerAttachment: 16,
  maxObjectProperties: 1_024,
} as const);

export type AgentOsAttachmentV1ContractErrorCode =
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "UNKNOWN_FIELD"
  | "INVALID_SCHEMA"
  | "UNKNOWN_OPERATION"
  | "JSON_BUDGET";

export class AgentOsAttachmentV1ContractError extends Error {
  constructor(
    readonly code: AgentOsAttachmentV1ContractErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AgentOsAttachmentV1ContractError";
  }
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MIME_PATTERN =
  /^[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]{0,127}\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]{0,127}$/u;

export interface AgentOsAttachmentV1RequestBase {
  readonly schemaVersion: AgentOsAttachmentV1SchemaVersion;
  readonly operation: AgentOsAttachmentV1Operation;
  readonly requestId: string;
  readonly sessionId: string;
}

export interface AgentOsAttachmentV1InitRequest extends AgentOsAttachmentV1RequestBase {
  readonly operation: "attachment.init";
  readonly uploadId: string;
  readonly mime: string;
  readonly totalBytes: number;
  readonly totalDigest: `sha256:${string}`;
}

export interface AgentOsAttachmentV1ChunkRequest extends AgentOsAttachmentV1RequestBase {
  readonly operation: "attachment.chunk";
  readonly uploadId: string;
  readonly chunkIndex: number;
  readonly chunkDigest: `sha256:${string}`;
}

export interface AgentOsAttachmentV1CommitRequest extends AgentOsAttachmentV1RequestBase {
  readonly operation: "attachment.commit";
  readonly uploadId: string;
}

export interface AgentOsAttachmentV1ReadRequest extends AgentOsAttachmentV1RequestBase {
  readonly operation: "attachment.read";
  readonly attachmentId: string;
}

export type AgentOsAttachmentV1Request =
  | Readonly<AgentOsAttachmentV1InitRequest>
  | Readonly<AgentOsAttachmentV1ChunkRequest>
  | Readonly<AgentOsAttachmentV1CommitRequest>
  | Readonly<AgentOsAttachmentV1ReadRequest>;

/** 未 commit 的内容不得进入 prompt；重复 commit 幂等（03-protocol §图像）。 */
export interface AgentOsAttachmentV1CommitResponse {
  readonly schemaVersion: AgentOsAttachmentV1SchemaVersion;
  readonly operation: "attachment.commit";
  readonly requestId: string;
  readonly attachmentId: string;
  readonly digest: `sha256:${string}`;
}

export function parseAgentOsAttachmentV1Request(
  input: unknown,
): Readonly<AgentOsAttachmentV1Request> {
  const value = record(input, "attachment request");
  const base = ["schemaVersion", "operation", "requestId", "sessionId"];
  const common = {
    schemaVersion: schema(value.schemaVersion),
    operation: operationValue(value.operation),
    requestId: identifier(value.requestId, "requestId"),
    sessionId: identifier(value.sessionId, "sessionId"),
  };
  switch (common.operation) {
    case "attachment.init":
      exact(
        value,
        [...base, "uploadId", "mime", "totalBytes", "totalDigest"],
        "attachment.init",
      );
      return freeze({
        ...common,
        uploadId: identifier(value.uploadId, "uploadId"),
        mime: mime(value.mime),
        totalBytes: boundedInteger(
          value.totalBytes,
          "totalBytes",
          1,
          AGENT_OS_ATTACHMENT_V1_LIMITS.maxAttachmentBytes,
        ),
        totalDigest: digest(value.totalDigest, "totalDigest"),
      }) as Readonly<AgentOsAttachmentV1InitRequest>;
    case "attachment.chunk":
      exact(
        value,
        [...base, "uploadId", "chunkIndex", "chunkDigest"],
        "attachment.chunk",
      );
      return freeze({
        ...common,
        uploadId: identifier(value.uploadId, "uploadId"),
        chunkIndex: boundedInteger(
          value.chunkIndex,
          "chunkIndex",
          0,
          AGENT_OS_ATTACHMENT_V1_LIMITS.maxChunksPerAttachment - 1,
        ),
        chunkDigest: digest(value.chunkDigest, "chunkDigest"),
      }) as Readonly<AgentOsAttachmentV1ChunkRequest>;
    case "attachment.commit":
      exact(value, [...base, "uploadId"], "attachment.commit");
      return freeze({
        ...common,
        uploadId: identifier(value.uploadId, "uploadId"),
      }) as Readonly<AgentOsAttachmentV1CommitRequest>;
    case "attachment.read":
      exact(value, [...base, "attachmentId"], "attachment.read");
      return freeze({
        ...common,
        attachmentId: identifier(value.attachmentId, "attachmentId"),
      }) as Readonly<AgentOsAttachmentV1ReadRequest>;
    default:
      return exhaustive(common.operation);
  }
}

export function parseAgentOsAttachmentV1CommitResponse(
  input: unknown,
): Readonly<AgentOsAttachmentV1CommitResponse> {
  const value = record(input, "attachment commit response");
  exact(
    value,
    ["schemaVersion", "operation", "requestId", "attachmentId", "digest"],
    "attachment commit response",
  );
  if (value.operation !== "attachment.commit")
    fail(
      "UNKNOWN_OPERATION",
      "attachment commit response operation is invalid",
    );
  return freeze({
    schemaVersion: schema(value.schemaVersion),
    operation: "attachment.commit",
    requestId: identifier(value.requestId, "requestId"),
    attachmentId: identifier(value.attachmentId, "attachmentId"),
    digest: digest(value.digest, "digest"),
  }) as Readonly<AgentOsAttachmentV1CommitResponse>;
}

function schema(value: unknown): typeof AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION {
  if (value !== AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION)
    fail("INVALID_SCHEMA", "attachment schemaVersion is unsupported");
  return AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION;
}
function operationValue(value: unknown): AgentOsAttachmentV1Operation {
  if (
    typeof value !== "string" ||
    !AGENT_OS_ATTACHMENT_V1_OPERATIONS.includes(
      value as AgentOsAttachmentV1Operation,
    )
  )
    fail("UNKNOWN_OPERATION", "attachment operation is not registered");
  return value as AgentOsAttachmentV1Operation;
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  if (
    new TextEncoder().encode(value).byteLength >
    AGENT_OS_ATTACHMENT_V1_LIMITS.maxIdentifierBytes
  )
    fail("JSON_BUDGET", `${label} exceeds its byte budget`);
  return value;
}
function mime(value: unknown): string {
  if (typeof value !== "string" || !MIME_PATTERN.test(value))
    fail("INVALID_VALUE", "mime is invalid");
  if (
    new TextEncoder().encode(value).byteLength >
    AGENT_OS_ATTACHMENT_V1_LIMITS.maxMimeBytes
  )
    fail("JSON_BUDGET", "mime exceeds its byte budget");
  return value;
}
function digest(value: unknown, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is not a sha256 digest`);
  return value as `sha256:${string}`;
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
    AGENT_OS_ATTACHMENT_V1_LIMITS.maxObjectProperties
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

function freeze<T>(value: T): T {
  return deepFreeze(value);
}

function exhaustive(value: never): never {
  fail("INVALID_VALUE", `unsupported value: ${String(value)}`);
}

function fail(
  code: AgentOsAttachmentV1ContractErrorCode,
  message: string,
): never {
  throw new AgentOsAttachmentV1ContractError(code, message);
}
