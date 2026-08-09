import { AgentOsV1ContractError } from "./agent-os-v1-contract.js";
import type {
  AgentOsEffectBudgetAdmissionApplicationUnsignedV1,
  AgentOsEffectBudgetAdmissionApplicationV1,
} from "./agent-os-effect-budget-admission-v1-types.js";

export type {
  AgentOsEffectBudgetAdmissionApplicationUnsignedV1,
  AgentOsEffectBudgetAdmissionApplicationV1,
} from "./agent-os-effect-budget-admission-v1-types.js";

export const AGENT_OS_EFFECT_BUDGET_ADMISSION_APPLICATION_SCHEMA_V1 =
  "agent-os-control-effect-budget-admission/v1" as const;

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._-]{0,127}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const APPLICATION_REF_PATTERN =
  /^agent-os-effect-budget-admission\/v1\/[a-z][a-z0-9._-]{0,127}\/[a-z][a-z0-9._-]{0,127}\/sha256:[0-9a-f]{64}\/sha256:[0-9a-f]{64}$/u;
const UNSIGNED_KEYS = [
  "schemaVersion",
  "commandId",
  "effectId",
  "reservationId",
  "requestDigest",
  "reservationReceiptDigest",
  "effectPermitDigest",
  "kernelFenceDigest",
] as const;
const APPLICATION_KEYS = [...UNSIGNED_KEYS, "applicationRef", "applicationDigest"] as const;

export function parseAgentOsEffectBudgetAdmissionApplicationV1(
  input: unknown
): Readonly<AgentOsEffectBudgetAdmissionApplicationV1> {
  const value = record(input, "effect budget admission application");
  exact(value, APPLICATION_KEYS, "effect budget admission application");
  const unsigned = applicationUnsigned({
    schemaVersion: value.schemaVersion,
    commandId: value.commandId,
    effectId: value.effectId,
    reservationId: value.reservationId,
    requestDigest: value.requestDigest,
    reservationReceiptDigest: value.reservationReceiptDigest,
    effectPermitDigest: value.effectPermitDigest,
    kernelFenceDigest: value.kernelFenceDigest,
  });
  const applicationRef = ref(value.applicationRef, "effect budget admission applicationRef");
  const applicationDigest = digest(
    value.applicationDigest,
    "effect budget admission applicationDigest"
  );
  if (applicationRef !== createAgentOsEffectBudgetAdmissionApplicationRefV1(unsigned))
    fail("DRIFT_DETECTED", "effect budget admission applicationRef is self-inconsistent");
  if (applicationDigest !== createAgentOsEffectBudgetAdmissionApplicationDigestV1(unsigned))
    fail("DRIFT_DETECTED", "effect budget admission applicationDigest is self-inconsistent");
  return deepFreeze({ ...unsigned, applicationRef, applicationDigest });
}

export function createAgentOsEffectBudgetAdmissionApplicationV1(
  input: Omit<AgentOsEffectBudgetAdmissionApplicationUnsignedV1, "schemaVersion">
): Readonly<AgentOsEffectBudgetAdmissionApplicationV1> {
  const unsigned = applicationUnsigned({
    schemaVersion: AGENT_OS_EFFECT_BUDGET_ADMISSION_APPLICATION_SCHEMA_V1,
    ...input,
  });
  return parseAgentOsEffectBudgetAdmissionApplicationV1({
    ...unsigned,
    applicationRef: createAgentOsEffectBudgetAdmissionApplicationRefV1(unsigned),
    applicationDigest: createAgentOsEffectBudgetAdmissionApplicationDigestV1(unsigned),
  });
}

export function createAgentOsEffectBudgetAdmissionApplicationRefV1(input: unknown): string {
  const value = applicationUnsigned(record(input, "effect budget admission application unsigned"));
  return `agent-os-effect-budget-admission/v1/${value.effectId}/${value.reservationId}/${value.requestDigest}/${value.reservationReceiptDigest}`;
}

export function createAgentOsEffectBudgetAdmissionApplicationDigestV1(input: unknown): string {
  return contentDigest(
    canonicalJson(
      applicationUnsigned(record(input, "effect budget admission application unsigned"))
    )
  );
}

export function serializeAgentOsEffectBudgetAdmissionApplicationV1(input: unknown): string {
  return canonicalJson(parseAgentOsEffectBudgetAdmissionApplicationV1(input));
}

function applicationUnsigned(
  value: Record<string, unknown>
): Readonly<AgentOsEffectBudgetAdmissionApplicationUnsignedV1> {
  exact(value, UNSIGNED_KEYS, "effect budget admission application unsigned");
  if (value.schemaVersion !== AGENT_OS_EFFECT_BUDGET_ADMISSION_APPLICATION_SCHEMA_V1)
    fail(
      "UNSUPPORTED_VERSION",
      `effect budget admission schemaVersion must equal ${AGENT_OS_EFFECT_BUDGET_ADMISSION_APPLICATION_SCHEMA_V1}`
    );
  return deepFreeze({
    schemaVersion: AGENT_OS_EFFECT_BUDGET_ADMISSION_APPLICATION_SCHEMA_V1,
    commandId: identifier(value.commandId, "effect budget admission commandId"),
    effectId: identifier(value.effectId, "effect budget admission effectId"),
    reservationId: identifier(value.reservationId, "effect budget admission reservationId"),
    requestDigest: digest(value.requestDigest, "effect budget admission requestDigest"),
    reservationReceiptDigest: digest(
      value.reservationReceiptDigest,
      "effect budget admission reservationReceiptDigest"
    ),
    effectPermitDigest: digest(
      value.effectPermitDigest,
      "effect budget admission effectPermitDigest"
    ),
    kernelFenceDigest: digest(value.kernelFenceDigest, "effect budget admission kernelFenceDigest"),
  });
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail("INVALID_SHAPE", `${label} must be a plain object`);
  if (Object.getOwnPropertySymbols(value).length !== 0)
    fail("INVALID_SHAPE", `${label} must not contain symbols`);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable || !("value" in descriptor) || descriptor.get || descriptor.set)
      fail("INVALID_SHAPE", `${label}.${key} must be an enumerable data field`);
  }
  return value as Record<string, unknown>;
}

function exact(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key)) ||
    expected.some((key) => !(key in value))
  )
    fail("UNKNOWN_FIELD", `${label} contains unknown or missing fields`);
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a path-free canonical identifier`);
  return value;
}

function digest(value: unknown, label: string): string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a canonical SHA-256 digest`);
  return value;
}

function ref(value: unknown, label: string): string {
  if (typeof value !== "string" || !APPLICATION_REF_PATTERN.test(value))
    fail("INVALID_VALUE", `${label} must be a canonical path-free application ref`);
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("INVALID_VALUE", "canonical source is invalid");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const input = record(value, "canonical effect budget admission source");
    return `{${Object.keys(input)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`)
      .join(",")}}`;
  }
  fail("INVALID_VALUE", "canonical source contains an unsupported value");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function contentDigest(source: string): string {
  return `sha256:${sha256Hex(source)}`;
}

function fail(code: AgentOsV1ContractError["code"], message: string): never {
  throw new AgentOsV1ContractError(code, message);
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
  return (x & y) ^ (x & z) ^ (y & z);
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
