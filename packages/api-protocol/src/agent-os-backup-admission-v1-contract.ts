import { AgentOsV1ContractError } from "./agent-os-v1-contract.js";
import { deepFreeze, sha256Hex } from "./contract-primitives.js";
import type {
  AgentOsBackupAdmissionApplicationUnsignedV1,
  AgentOsBackupAdmissionApplicationV1,
} from "./agent-os-backup-admission-v1-types.js";

export type {
  AgentOsBackupAdmissionApplicationUnsignedV1,
  AgentOsBackupAdmissionApplicationV1,
} from "./agent-os-backup-admission-v1-types.js";

export const AGENT_OS_BACKUP_ADMISSION_APPLICATION_SCHEMA_V1 =
  "agent-os-control-backup-admission/v1" as const;

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9._-]{0,127}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const APPLICATION_REF_PATTERN =
  /^agent-os-backup-admission\/v1\/[a-z][a-z0-9._-]{0,127}\/sha256:[0-9a-f]{64}\/sha256:[0-9a-f]{64}$/u;
const UNSIGNED_KEYS = ["schemaVersion", "commandId", "policyDigest", "checkpointDigest"] as const;
const APPLICATION_KEYS = [...UNSIGNED_KEYS, "applicationRef", "applicationDigest"] as const;

export function parseAgentOsBackupAdmissionApplicationV1(
  input: unknown
): Readonly<AgentOsBackupAdmissionApplicationV1> {
  const value = record(input, "backup admission application");
  exact(value, APPLICATION_KEYS, "backup admission application");
  const unsigned = applicationUnsigned({
    schemaVersion: value.schemaVersion,
    commandId: value.commandId,
    policyDigest: value.policyDigest,
    checkpointDigest: value.checkpointDigest,
  });
  const applicationRef = ref(value.applicationRef, "backup admission applicationRef");
  const applicationDigest = digest(value.applicationDigest, "backup admission applicationDigest");
  if (applicationRef !== createAgentOsBackupAdmissionApplicationRefV1(unsigned))
    fail("DRIFT_DETECTED", "backup admission applicationRef is self-inconsistent");
  if (applicationDigest !== createAgentOsBackupAdmissionApplicationDigestV1(unsigned))
    fail("DRIFT_DETECTED", "backup admission applicationDigest is self-inconsistent");
  return deepFreeze({ ...unsigned, applicationRef, applicationDigest });
}

export function createAgentOsBackupAdmissionApplicationV1(
  input: Omit<AgentOsBackupAdmissionApplicationUnsignedV1, "schemaVersion">
): Readonly<AgentOsBackupAdmissionApplicationV1> {
  const unsigned = applicationUnsigned({
    schemaVersion: AGENT_OS_BACKUP_ADMISSION_APPLICATION_SCHEMA_V1,
    ...input,
  });
  return parseAgentOsBackupAdmissionApplicationV1({
    ...unsigned,
    applicationRef: createAgentOsBackupAdmissionApplicationRefV1(unsigned),
    applicationDigest: createAgentOsBackupAdmissionApplicationDigestV1(unsigned),
  });
}

export function createAgentOsBackupAdmissionApplicationRefV1(input: unknown): string {
  const value = applicationUnsigned(record(input, "backup admission application unsigned"));
  return `agent-os-backup-admission/v1/${value.commandId}/${value.policyDigest}/${value.checkpointDigest}`;
}

export function createAgentOsBackupAdmissionApplicationDigestV1(input: unknown): string {
  return `sha256:${sha256Hex(
    canonicalJson(applicationUnsigned(record(input, "backup admission application unsigned")))
  )}`;
}

export function serializeAgentOsBackupAdmissionApplicationV1(input: unknown): string {
  return canonicalJson(parseAgentOsBackupAdmissionApplicationV1(input));
}

function applicationUnsigned(
  value: Record<string, unknown>
): Readonly<AgentOsBackupAdmissionApplicationUnsignedV1> {
  exact(value, UNSIGNED_KEYS, "backup admission application unsigned");
  if (value.schemaVersion !== AGENT_OS_BACKUP_ADMISSION_APPLICATION_SCHEMA_V1)
    fail(
      "UNSUPPORTED_VERSION",
      `backup admission schemaVersion must equal ${AGENT_OS_BACKUP_ADMISSION_APPLICATION_SCHEMA_V1}`
    );
  return deepFreeze({
    schemaVersion: AGENT_OS_BACKUP_ADMISSION_APPLICATION_SCHEMA_V1,
    commandId: identifier(value.commandId, "backup admission commandId"),
    policyDigest: digest(value.policyDigest, "backup admission policyDigest"),
    checkpointDigest: digest(value.checkpointDigest, "backup admission checkpointDigest"),
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
    const input = record(value, "canonical backup admission source");
    return `{${Object.keys(input)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`)
      .join(",")}}`;
  }
  fail("INVALID_VALUE", "canonical source contains an unsupported value");
}

function fail(code: AgentOsV1ContractError["code"], message: string): never {
  throw new AgentOsV1ContractError(code, message);
}
