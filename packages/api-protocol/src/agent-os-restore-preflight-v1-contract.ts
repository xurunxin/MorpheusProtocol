import { AgentOsV1ContractError } from "./agent-os-v1-contract.js";

export const AGENT_OS_RESTORE_PREFLIGHT_MANIFEST_SCHEMA_V1 =
  "agent-os-g7-backup-capture-manifest/v1" as const;
export const AGENT_OS_RESTORE_PREFLIGHT_REQUEST_SCHEMA_V1 =
  "agent-os-restore-preflight-request/v1" as const;
export const AGENT_OS_RESTORE_PREFLIGHT_RECEIPT_SCHEMA_V1 =
  "agent-os-g7-restore-preflight-receipt/v1" as const;

export const AGENT_OS_RESTORE_PREFLIGHT_EXCLUSIONS_V1 = Object.freeze([
  "real-or-default-runtime-data",
  "production-backup",
  "restore-erasure-release-deploy-or-traffic",
  "retention-or-key-management",
  "network-or-object-store",
  "operational-g7-or-security-proof",
] as const);

export type AgentOsRestorePreflightDiagnosticCodeV1 =
  | "RESTORE_PREFLIGHT_ADMITTED"
  | "RESTORE_PREFLIGHT_REPLAYED"
  | "RESTORE_PREFLIGHT_MANIFEST_INVALID"
  | "RESTORE_PREFLIGHT_TARGET_NOT_NEW"
  | "RESTORE_PREFLIGHT_IDEMPOTENCY_CONFLICT";

export interface AgentOsRestorePreflightManifestUnsignedV1 {
  readonly schemaVersion: typeof AGENT_OS_RESTORE_PREFLIGHT_MANIFEST_SCHEMA_V1;
  readonly sourceAuthorityDomain: string;
  readonly storeId: string;
  readonly storeGeneration: number;
  readonly unifiedSchemaGeneration: string;
  readonly journalWatermark: number;
  readonly outboxWatermark: number;
  readonly journalDigest: string;
  readonly outboxDigest: string;
  readonly payloadDigest: string;
  readonly auditEventDigest: string;
  readonly verificationState: "payload-and-manifest-verified";
  readonly exclusions: typeof AGENT_OS_RESTORE_PREFLIGHT_EXCLUSIONS_V1;
}

export interface AgentOsRestorePreflightManifestV1 extends AgentOsRestorePreflightManifestUnsignedV1 {
  readonly manifestDigest: string;
}

export interface AgentOsRestorePreflightTargetV1 {
  readonly targetStoreId: string;
  readonly targetObjectId: string;
  readonly targetGeneration: number;
  readonly disposable: true;
}

export interface AgentOsRestorePreflightRequestUnsignedV1 {
  readonly schemaVersion: typeof AGENT_OS_RESTORE_PREFLIGHT_REQUEST_SCHEMA_V1;
  readonly authorityId: string;
  readonly authorityDigest: string;
  readonly manifest: Readonly<AgentOsRestorePreflightManifestV1>;
  readonly target: Readonly<AgentOsRestorePreflightTargetV1>;
  readonly preflightEvidenceDigest: string;
}

export interface AgentOsRestorePreflightRequestV1 extends AgentOsRestorePreflightRequestUnsignedV1 {
  readonly requestDigest: string;
}

export interface AgentOsRestorePreflightReceiptUnsignedV1 {
  readonly schemaVersion: typeof AGENT_OS_RESTORE_PREFLIGHT_RECEIPT_SCHEMA_V1;
  readonly authorityId: string;
  readonly requestDigest: string;
  readonly manifestDigest: string;
  readonly sourceStoreId: string;
  readonly sourceStoreGeneration: number;
  readonly targetStoreId: string;
  readonly targetObjectId: string;
  readonly targetGeneration: number;
  readonly disposition: "admitted" | "replayed" | "rejected";
  readonly diagnosticCode: AgentOsRestorePreflightDiagnosticCodeV1;
}

export interface AgentOsRestorePreflightReceiptV1 extends AgentOsRestorePreflightReceiptUnsignedV1 {
  readonly receiptDigest: string;
}

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z][a-z0-9._-]{0,127}$/u;
const MANIFEST_UNSIGNED_KEYS = [
  "schemaVersion",
  "sourceAuthorityDomain",
  "storeId",
  "storeGeneration",
  "unifiedSchemaGeneration",
  "journalWatermark",
  "outboxWatermark",
  "journalDigest",
  "outboxDigest",
  "payloadDigest",
  "auditEventDigest",
  "verificationState",
  "exclusions",
] as const;
const MANIFEST_KEYS = [...MANIFEST_UNSIGNED_KEYS, "manifestDigest"] as const;
const TARGET_KEYS = ["targetStoreId", "targetObjectId", "targetGeneration", "disposable"] as const;
const REQUEST_UNSIGNED_KEYS = [
  "schemaVersion",
  "authorityId",
  "authorityDigest",
  "manifest",
  "target",
  "preflightEvidenceDigest",
] as const;
const REQUEST_KEYS = [...REQUEST_UNSIGNED_KEYS, "requestDigest"] as const;
const RECEIPT_UNSIGNED_KEYS = [
  "schemaVersion",
  "authorityId",
  "requestDigest",
  "manifestDigest",
  "sourceStoreId",
  "sourceStoreGeneration",
  "targetStoreId",
  "targetObjectId",
  "targetGeneration",
  "disposition",
  "diagnosticCode",
] as const;
const RECEIPT_KEYS = [...RECEIPT_UNSIGNED_KEYS, "receiptDigest"] as const;

export function createAgentOsRestorePreflightManifestV1(
  input: Omit<AgentOsRestorePreflightManifestUnsignedV1, "schemaVersion">
): Readonly<AgentOsRestorePreflightManifestV1> {
  const unsigned = manifestUnsigned({
    schemaVersion: AGENT_OS_RESTORE_PREFLIGHT_MANIFEST_SCHEMA_V1,
    ...input,
  });
  return parseAgentOsRestorePreflightManifestV1({
    ...unsigned,
    manifestDigest: digestOf(unsigned),
  });
}

export function parseAgentOsRestorePreflightManifestV1(
  input: unknown
): Readonly<AgentOsRestorePreflightManifestV1> {
  const value = record(input, "restore preflight manifest");
  exact(value, MANIFEST_KEYS, "restore preflight manifest");
  const unsigned = manifestUnsigned({
    schemaVersion: value.schemaVersion,
    sourceAuthorityDomain: value.sourceAuthorityDomain,
    storeId: value.storeId,
    storeGeneration: value.storeGeneration,
    unifiedSchemaGeneration: value.unifiedSchemaGeneration,
    journalWatermark: value.journalWatermark,
    outboxWatermark: value.outboxWatermark,
    journalDigest: value.journalDigest,
    outboxDigest: value.outboxDigest,
    payloadDigest: value.payloadDigest,
    auditEventDigest: value.auditEventDigest,
    verificationState: value.verificationState,
    exclusions: value.exclusions,
  });
  const manifestDigest = sha256(value.manifestDigest, "restore preflight manifestDigest");
  if (manifestDigest !== digestOf(unsigned)) drift("restore preflight manifest seal is invalid");
  return deepFreeze({ ...unsigned, manifestDigest });
}

export function createAgentOsRestorePreflightRequestV1(
  input: Omit<AgentOsRestorePreflightRequestUnsignedV1, "schemaVersion">
): Readonly<AgentOsRestorePreflightRequestV1> {
  const unsigned = requestUnsigned({
    schemaVersion: AGENT_OS_RESTORE_PREFLIGHT_REQUEST_SCHEMA_V1,
    ...input,
  });
  return parseAgentOsRestorePreflightRequestV1({
    ...unsigned,
    requestDigest: digestOf(unsigned),
  });
}

export function parseAgentOsRestorePreflightRequestV1(
  input: unknown
): Readonly<AgentOsRestorePreflightRequestV1> {
  const value = record(input, "restore preflight request");
  exact(value, REQUEST_KEYS, "restore preflight request");
  const unsigned = requestUnsigned({
    schemaVersion: value.schemaVersion,
    authorityId: value.authorityId,
    authorityDigest: value.authorityDigest,
    manifest: value.manifest,
    target: value.target,
    preflightEvidenceDigest: value.preflightEvidenceDigest,
  });
  const requestDigest = sha256(value.requestDigest, "restore preflight requestDigest");
  if (requestDigest !== digestOf(unsigned)) drift("restore preflight request digest is invalid");
  return deepFreeze({ ...unsigned, requestDigest });
}

export function createAgentOsRestorePreflightReceiptV1(
  input: Omit<AgentOsRestorePreflightReceiptUnsignedV1, "schemaVersion">
): Readonly<AgentOsRestorePreflightReceiptV1> {
  const unsigned = receiptUnsigned({
    schemaVersion: AGENT_OS_RESTORE_PREFLIGHT_RECEIPT_SCHEMA_V1,
    ...input,
  });
  return parseAgentOsRestorePreflightReceiptV1({
    ...unsigned,
    receiptDigest: digestOf(unsigned),
  });
}

export function parseAgentOsRestorePreflightReceiptV1(
  input: unknown
): Readonly<AgentOsRestorePreflightReceiptV1> {
  const value = record(input, "restore preflight receipt");
  exact(value, RECEIPT_KEYS, "restore preflight receipt");
  const unsigned = receiptUnsigned({
    schemaVersion: value.schemaVersion,
    authorityId: value.authorityId,
    requestDigest: value.requestDigest,
    manifestDigest: value.manifestDigest,
    sourceStoreId: value.sourceStoreId,
    sourceStoreGeneration: value.sourceStoreGeneration,
    targetStoreId: value.targetStoreId,
    targetObjectId: value.targetObjectId,
    targetGeneration: value.targetGeneration,
    disposition: value.disposition,
    diagnosticCode: value.diagnosticCode,
  });
  const receiptDigest = sha256(value.receiptDigest, "restore preflight receiptDigest");
  if (receiptDigest !== digestOf(unsigned)) drift("restore preflight receipt digest is invalid");
  return deepFreeze({ ...unsigned, receiptDigest });
}

export function serializeAgentOsRestorePreflightRequestV1(input: unknown): string {
  return canonicalJson(parseAgentOsRestorePreflightRequestV1(input));
}

export function serializeAgentOsRestorePreflightReceiptV1(input: unknown): string {
  return canonicalJson(parseAgentOsRestorePreflightReceiptV1(input));
}

function manifestUnsigned(
  value: Record<string, unknown>
): Readonly<AgentOsRestorePreflightManifestUnsignedV1> {
  exact(value, MANIFEST_UNSIGNED_KEYS, "restore preflight manifest unsigned");
  if (value.schemaVersion !== AGENT_OS_RESTORE_PREFLIGHT_MANIFEST_SCHEMA_V1)
    unsupported("restore preflight manifest schemaVersion is unsupported");
  if (value.verificationState !== "payload-and-manifest-verified")
    invalid("restore preflight manifest verificationState is invalid");
  const suppliedExclusions = tuple(value.exclusions, "restore preflight manifest exclusions");
  if (
    suppliedExclusions.length !== AGENT_OS_RESTORE_PREFLIGHT_EXCLUSIONS_V1.length ||
    suppliedExclusions.some(
      (item, index) => item !== AGENT_OS_RESTORE_PREFLIGHT_EXCLUSIONS_V1[index]
    )
  )
    invalid("restore preflight manifest exclusions are invalid");
  return deepFreeze({
    schemaVersion: AGENT_OS_RESTORE_PREFLIGHT_MANIFEST_SCHEMA_V1,
    sourceAuthorityDomain: identifier(
      value.sourceAuthorityDomain,
      "restore preflight sourceAuthorityDomain"
    ),
    storeId: identifier(value.storeId, "restore preflight storeId"),
    storeGeneration: positiveInteger(value.storeGeneration, "restore preflight storeGeneration"),
    unifiedSchemaGeneration: identifier(
      value.unifiedSchemaGeneration,
      "restore preflight unifiedSchemaGeneration"
    ),
    journalWatermark: nonNegativeInteger(
      value.journalWatermark,
      "restore preflight journalWatermark"
    ),
    outboxWatermark: nonNegativeInteger(value.outboxWatermark, "restore preflight outboxWatermark"),
    journalDigest: sha256(value.journalDigest, "restore preflight journalDigest"),
    outboxDigest: sha256(value.outboxDigest, "restore preflight outboxDigest"),
    payloadDigest: sha256(value.payloadDigest, "restore preflight payloadDigest"),
    auditEventDigest: sha256(value.auditEventDigest, "restore preflight auditEventDigest"),
    verificationState: "payload-and-manifest-verified",
    exclusions: AGENT_OS_RESTORE_PREFLIGHT_EXCLUSIONS_V1,
  });
}

function requestUnsigned(
  value: Record<string, unknown>
): Readonly<AgentOsRestorePreflightRequestUnsignedV1> {
  exact(value, REQUEST_UNSIGNED_KEYS, "restore preflight request unsigned");
  if (value.schemaVersion !== AGENT_OS_RESTORE_PREFLIGHT_REQUEST_SCHEMA_V1)
    unsupported("restore preflight request schemaVersion is unsupported");
  return deepFreeze({
    schemaVersion: AGENT_OS_RESTORE_PREFLIGHT_REQUEST_SCHEMA_V1,
    authorityId: identifier(value.authorityId, "restore preflight authorityId"),
    authorityDigest: sha256(value.authorityDigest, "restore preflight authorityDigest"),
    manifest: parseAgentOsRestorePreflightManifestV1(value.manifest),
    target: target(value.target),
    preflightEvidenceDigest: sha256(
      value.preflightEvidenceDigest,
      "restore preflight preflightEvidenceDigest"
    ),
  });
}

function target(value: unknown): Readonly<AgentOsRestorePreflightTargetV1> {
  const source = record(value, "restore preflight target");
  exact(source, TARGET_KEYS, "restore preflight target");
  if (source.disposable !== true) invalid("restore preflight target must be explicitly disposable");
  return deepFreeze({
    targetStoreId: identifier(source.targetStoreId, "restore preflight targetStoreId"),
    targetObjectId: identifier(source.targetObjectId, "restore preflight targetObjectId"),
    targetGeneration: positiveInteger(
      source.targetGeneration,
      "restore preflight targetGeneration"
    ),
    disposable: true,
  });
}

function receiptUnsigned(
  value: Record<string, unknown>
): Readonly<AgentOsRestorePreflightReceiptUnsignedV1> {
  exact(value, RECEIPT_UNSIGNED_KEYS, "restore preflight receipt unsigned");
  if (value.schemaVersion !== AGENT_OS_RESTORE_PREFLIGHT_RECEIPT_SCHEMA_V1)
    unsupported("restore preflight receipt schemaVersion is unsupported");
  const disposition = dispositionValue(value.disposition);
  const diagnosticCode = diagnostic(value.diagnosticCode);
  if (
    (disposition === "admitted" && diagnosticCode !== "RESTORE_PREFLIGHT_ADMITTED") ||
    (disposition === "replayed" && diagnosticCode !== "RESTORE_PREFLIGHT_REPLAYED") ||
    (disposition === "rejected" &&
      diagnosticCode !== "RESTORE_PREFLIGHT_MANIFEST_INVALID" &&
      diagnosticCode !== "RESTORE_PREFLIGHT_TARGET_NOT_NEW" &&
      diagnosticCode !== "RESTORE_PREFLIGHT_IDEMPOTENCY_CONFLICT")
  )
    invalid("restore preflight disposition and diagnosticCode are inconsistent");
  return deepFreeze({
    schemaVersion: AGENT_OS_RESTORE_PREFLIGHT_RECEIPT_SCHEMA_V1,
    authorityId: identifier(value.authorityId, "restore preflight receipt authorityId"),
    requestDigest: sha256(value.requestDigest, "restore preflight receipt requestDigest"),
    manifestDigest: sha256(value.manifestDigest, "restore preflight receipt manifestDigest"),
    sourceStoreId: identifier(value.sourceStoreId, "restore preflight receipt sourceStoreId"),
    sourceStoreGeneration: positiveInteger(
      value.sourceStoreGeneration,
      "restore preflight receipt sourceStoreGeneration"
    ),
    targetStoreId: identifier(value.targetStoreId, "restore preflight receipt targetStoreId"),
    targetObjectId: identifier(value.targetObjectId, "restore preflight receipt targetObjectId"),
    targetGeneration: positiveInteger(
      value.targetGeneration,
      "restore preflight receipt targetGeneration"
    ),
    disposition,
    diagnosticCode,
  });
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    shape(`${label} must be a plain object`);
  try {
    structuredClone(value);
  } catch {
    shape(`${label} must be cloneable plain data`);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) shape(`${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length !== 0) shape(`${label} must not contain symbols`);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable || !("value" in descriptor) || descriptor.get || descriptor.set)
      shape(`${label}.${key} must be an enumerable data field`);
  }
  return value as Record<string, unknown>;
}

function tuple(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) shape(`${label} must be an array`);
  try {
    structuredClone(value);
  } catch {
    shape(`${label} must be cloneable plain data`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor))
      shape(`${label} must contain enumerable data items`);
    if (typeof descriptor.value !== "string") invalid(`${label} items must be strings`);
  }
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some(
      (key) =>
        typeof key === "symbol" ||
        (key !== "length" && (!/^\d+$/u.test(key) || Number(key) >= value.length))
    )
  )
    shape(`${label} contains invalid fields`);
  return Object.freeze([...value] as string[]);
}

function exact(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !(key in value))
  )
    unknown(`${label} contains unknown or missing fields`);
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !IDENTIFIER.test(value))
    invalid(`${label} must be a path-free canonical identifier`);
  return value;
}

function sha256(value: unknown, label: string): string {
  if (typeof value !== "string" || !DIGEST.test(value))
    invalid(`${label} must be a canonical SHA-256 digest`);
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0)
    invalid(`${label} must be a positive safe integer`);
  return value as number;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    invalid(`${label} must be a non-negative safe integer`);
  return value as number;
}

function dispositionValue(value: unknown): AgentOsRestorePreflightReceiptUnsignedV1["disposition"] {
  if (value !== "admitted" && value !== "replayed" && value !== "rejected")
    invalid("restore preflight receipt disposition is invalid");
  return value;
}

function diagnostic(value: unknown): AgentOsRestorePreflightDiagnosticCodeV1 {
  if (
    value !== "RESTORE_PREFLIGHT_ADMITTED" &&
    value !== "RESTORE_PREFLIGHT_REPLAYED" &&
    value !== "RESTORE_PREFLIGHT_MANIFEST_INVALID" &&
    value !== "RESTORE_PREFLIGHT_TARGET_NOT_NEW" &&
    value !== "RESTORE_PREFLIGHT_IDEMPOTENCY_CONFLICT"
  )
    invalid("restore preflight receipt diagnosticCode is invalid");
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) invalid("canonical source is invalid");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const input = record(value, "canonical restore preflight source");
    return `{${Object.keys(input)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`)
      .join(",")}}`;
  }
  invalid("canonical source contains an unsupported value");
}

function digestOf(value: unknown): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function shape(message: string): never {
  throw new AgentOsV1ContractError("INVALID_SHAPE", message);
}
function unknown(message: string): never {
  throw new AgentOsV1ContractError("UNKNOWN_FIELD", message);
}
function unsupported(message: string): never {
  throw new AgentOsV1ContractError("UNSUPPORTED_VERSION", message);
}
function invalid(message: string): never {
  throw new AgentOsV1ContractError("INVALID_VALUE", message);
}
function drift(message: string): never {
  throw new AgentOsV1ContractError("DRIFT_DETECTED", message);
}

function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLength = BigInt(bytes.length) * 8n;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  for (let index = 0; index < 8; index += 1)
    data[paddedLength - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 0xffn);
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  for (let offset = 0; offset < data.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1)
      words[index] =
        (data[offset + index * 4]! << 24) |
        (data[offset + index * 4 + 1]! << 16) |
        (data[offset + index * 4 + 2]! << 8) |
        data[offset + index * 4 + 3]!;
    for (let index = 16; index < 64; index += 1)
      words[index] =
        (small1(words[index - 2]!) +
          words[index - 7]! +
          small0(words[index - 15]!) +
          words[index - 16]!) >>>
        0;
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const temporary1 =
        (h! + big1(e!) + choose(e!, f!, g!) + SHA256_CONSTANTS[index]! + words[index]!) >>> 0;
      const temporary2 = (big0(a!) + majority(a!, b!, c!)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d! + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    state[0] = (state[0]! + a!) >>> 0;
    state[1] = (state[1]! + b!) >>> 0;
    state[2] = (state[2]! + c!) >>> 0;
    state[3] = (state[3]! + d!) >>> 0;
    state[4] = (state[4]! + e!) >>> 0;
    state[5] = (state[5]! + f!) >>> 0;
    state[6] = (state[6]! + g!) >>> 0;
    state[7] = (state[7]! + h!) >>> 0;
  }
  return [...state].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function rotate(value: number, by: number): number {
  return (value >>> by) | (value << (32 - by));
}
function choose(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}
function majority(x: number, y: number, z: number): number {
  return (x & y) ^ (y & z) ^ (x & z);
}
function big0(x: number): number {
  return rotate(x, 2) ^ rotate(x, 13) ^ rotate(x, 22);
}
function big1(x: number): number {
  return rotate(x, 6) ^ rotate(x, 11) ^ rotate(x, 25);
}
function small0(x: number): number {
  return rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3);
}
function small1(x: number): number {
  return rotate(x, 17) ^ rotate(x, 19) ^ (x >>> 10);
}

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;
