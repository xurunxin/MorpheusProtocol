/**
 * agent-os-remote-ingress.v1（M15 骨架，B02）：远端授权 proof 的版本化契约。
 *
 * 信任路径冻结（08-semantic-freeze.md §6）：Browser → Bridge（Control
 * src/client-bridge/）→ Connector（PersonalHost src/remote-client-connector.ts，
 * 出站 mTLS WSS）→ Host remote ingress（src/remote-app-ingress.ts）。Bridge 无
 * lifecycle authority（R2）；本契约只冻结 proof 字段与有效期上限（R4），
 * 签发与撤销 port 由 B18 实现，Connector/ingress 校验由 B19/B20 实现。
 * nonce 单次消费由 Host 强制（B20），契约不维护状态。
 */
import { deepFreeze } from "./contract-primitives.js";

export const AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION =
  "agent-os-remote-ingress.v1" as const;

export type AgentOsRemoteIngressV1SchemaVersion =
  typeof AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION;

export const AGENT_OS_REMOTE_INGRESS_V1_LIMITS = Object.freeze({
  maxFrameBytes: 1_048_576,
  maxIdentifierBytes: 128,
  maxNonceBytes: 128,
  maxAuthorityProofBytes: 4_096,
  /** grant/proof 有效窗口上限（R4 拟定值，B18 固化前 reviewer 可调整）。 */
  maxProofTtlSeconds: 30,
  /** 健康连接下撤销传播目标上限（R4）；无法在预算内验证即 fail closed。 */
  revocationPropagationSeconds: 5,
} as const);

/**
 * Ed25519 签名的 hex 长度（64 字节 → 128 hex 字符）。签发方（Control
 * client-session authority）以签发私钥对规范签名载荷签名；验证方（Host
 * Connector）以 enrollment 时钉扎的同源公钥复验。
 */
const SIGNATURE_PATTERN = /^[0-9a-f]{128}$/u;

export type AgentOsRemoteIngressV1ContractErrorCode =
  | "INVALID_SHAPE"
  | "INVALID_VALUE"
  | "UNKNOWN_FIELD"
  | "INVALID_SCHEMA"
  | "JSON_BUDGET"
  | "PROOF_EXPIRED"
  | "PROOF_WINDOW_INVALID";

export class AgentOsRemoteIngressV1ContractError extends Error {
  constructor(
    readonly code: AgentOsRemoteIngressV1ContractErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AgentOsRemoteIngressV1ContractError";
  }
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const RFC3339_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/u;

/**
 * 操作绑定 proof（03-protocol §远程传输 4–5）：绑定具体 command payload
 * digest、target 与短有效期；Host ingress 校验签名/主体/target/nonce/epoch/
 * 有效期与最新本地 consent，dispatch 前再次确认。
 *
 * 签发方真实性（S01）：`signature` 是签发方 Ed25519 私钥对
 * {@link createAgentOsRemoteIngressV1ProofSigningPayload} 输出字节的签名，
 * `keyId` 标识签发密钥。Bridge 只是转发者，无法伪造或改写 proof 字段——
 * 任何字段漂移都会破坏签名。
 */
export interface AgentOsRemoteIngressV1Proof {
  readonly schemaVersion: AgentOsRemoteIngressV1SchemaVersion;
  readonly proofId: string;
  readonly principal: string;
  readonly deviceId: string;
  readonly hostKind: "personal" | "worker";
  readonly operation: string;
  readonly sessionId?: string;
  readonly payloadDigest: `sha256:${string}`;
  readonly nonce: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly authorityEpoch: number;
  /** 签发密钥标识；验证方只接受与钉扎公钥一致的 keyId。 */
  readonly keyId: string;
  /** Ed25519 签名（hex，128 字符），覆盖除自身外的全部 proof 字段。 */
  readonly signature: string;
}

export function parseAgentOsRemoteIngressV1Proof(
  input: unknown,
): Readonly<AgentOsRemoteIngressV1Proof> {
  const value = record(input, "remote ingress proof");
  exactOptional(
    value,
    [
      "schemaVersion",
      "proofId",
      "principal",
      "deviceId",
      "hostKind",
      "operation",
      "payloadDigest",
      "nonce",
      "issuedAt",
      "expiresAt",
      "authorityEpoch",
      "keyId",
      "signature",
    ],
    ["sessionId"],
    "remote ingress proof",
  );
  if (value.schemaVersion !== AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION)
    fail("INVALID_SCHEMA", "remote ingress schemaVersion is unsupported");
  const hostKind = value.hostKind;
  if (hostKind !== "personal" && hostKind !== "worker")
    fail("INVALID_VALUE", "hostKind is invalid");
  if (
    typeof value.signature !== "string" ||
    !SIGNATURE_PATTERN.test(value.signature)
  )
    fail("INVALID_VALUE", "proof signature is invalid");
  return freeze({
    schemaVersion: AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION,
    proofId: identifier(value.proofId, "proofId"),
    principal: identifier(value.principal, "principal"),
    deviceId: identifier(value.deviceId, "deviceId"),
    hostKind,
    operation: identifier(value.operation, "operation"),
    ...optionalIdentifier(value, "sessionId"),
    payloadDigest: digest(value.payloadDigest, "payloadDigest"),
    nonce: text(
      value.nonce,
      "nonce",
      AGENT_OS_REMOTE_INGRESS_V1_LIMITS.maxNonceBytes,
    ),
    issuedAt: timestamp(value.issuedAt, "issuedAt"),
    expiresAt: timestamp(value.expiresAt, "expiresAt"),
    authorityEpoch: nonNegativeNumber(value.authorityEpoch, "authorityEpoch"),
    keyId: identifier(value.keyId, "keyId"),
    signature: value.signature,
  }) as Readonly<AgentOsRemoteIngressV1Proof>;
}

/**
 * proof 的规范签名载荷（S01）：字段名按 ASCII 排序、排除 `signature` 自身、
 * 紧凑 JSON、UTF-8 字节。签发方与验证方必须基于同一份字节序列；
 * 本函数是唯一的规范编码来源。
 */
export function createAgentOsRemoteIngressV1ProofSigningPayload(
  proof: Omit<AgentOsRemoteIngressV1Proof, "signature">,
): Uint8Array {
  const canonical: Record<string, unknown> = {};
  for (const key of Object.keys(proof).sort()) {
    canonical[key] = proof[key as keyof typeof proof];
  }
  return new TextEncoder().encode(JSON.stringify(canonical));
}

/**
 * proof 有效窗口校验：issuedAt < expiresAt、窗口 ≤ maxProofTtlSeconds，
 * 且 now 落在窗口内。过期抛 PROOF_EXPIRED；窗口非法抛 PROOF_WINDOW_INVALID。
 * 时钟比较基于 RFC3339 解析值；无法解析即拒绝（fail closed）。
 */
export function validateAgentOsRemoteIngressV1ProofWindow(
  proof: Readonly<AgentOsRemoteIngressV1Proof>,
  now: string,
): "valid" {
  const issued = Date.parse(proof.issuedAt);
  const expires = Date.parse(proof.expiresAt);
  const current = Date.parse(timestamp(now, "now"));
  const ttlSeconds = (expires - issued) / 1_000;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0 || issued >= expires)
    fail("PROOF_WINDOW_INVALID", "proof window is empty or reversed");
  if (ttlSeconds > AGENT_OS_REMOTE_INGRESS_V1_LIMITS.maxProofTtlSeconds)
    fail(
      "PROOF_WINDOW_INVALID",
      `proof window exceeds ${AGENT_OS_REMOTE_INGRESS_V1_LIMITS.maxProofTtlSeconds}s`,
    );
  if (current > expires) fail("PROOF_EXPIRED", "proof has expired");
  if (current < issued)
    fail("PROOF_WINDOW_INVALID", "now precedes proof issuance");
  return "valid";
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getPrototypeOf(value) !== Object.prototype)
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length > 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length > 1_024)
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

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is invalid`);
  if (
    new TextEncoder().encode(value).byteLength >
    AGENT_OS_REMOTE_INGRESS_V1_LIMITS.maxIdentifierBytes
  )
    fail("JSON_BUDGET", `${label} exceeds its byte budget`);
  return value;
}

function text(value: unknown, label: string, maxBytes: number): string {
  if (typeof value !== "string" || value.length === 0)
    fail("INVALID_VALUE", `${label} must be a non-empty string`);
  if (new TextEncoder().encode(value).byteLength > maxBytes)
    fail("JSON_BUDGET", `${label} exceeds its byte budget`);
  return value;
}

function digest(value: unknown, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} is not a sha256 digest`);
  return value as `sha256:${string}`;
}

function timestamp(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !RFC3339_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    fail("INVALID_VALUE", `${label} is not RFC3339`);
  return value;
}

function nonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    fail("INVALID_VALUE", `${label} must be a non-negative integer`);
  return value;
}

function optionalIdentifier(
  value: Record<string, unknown>,
  key: string,
): Partial<Record<string, string>> {
  return value[key] === undefined ? {} : { [key]: identifier(value[key], key) };
}

function freeze<T>(value: T): T {
  return deepFreeze(value);
}

function fail(
  code: AgentOsRemoteIngressV1ContractErrorCode,
  message: string,
): never {
  throw new AgentOsRemoteIngressV1ContractError(code, message);
}
