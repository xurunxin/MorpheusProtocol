import { AgentOsV1ContractError } from "./agent-os-v1-contract.js";
import { deepFreeze, sha256Hex } from "./contract-primitives.js";
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

function contentDigest(source: string): string {
  return `sha256:${sha256Hex(source)}`;
}

function fail(code: AgentOsV1ContractError["code"], message: string): never {
  throw new AgentOsV1ContractError(code, message);
}
