import { deepFreeze, sha256Hex } from "./contract-primitives.js";

/** 只读、脱敏投影；摘要不是授权，不包含原始请求、路径或工具正文。 */
export const REQUEST_INSPECTOR_SCHEMA_V1 =
  "agent-os-request-inspector/v1" as const;
export type InspectorOpaqueIdV1 = `hmac-sha256:${string}`;
export type InspectorDigestV1 = `sha256:${string}`;
export const INSPECTOR_REASON_CODES_V1 = [
  "prepared",
  "committed",
  "request-rejected",
  "context-limit",
  "maintenance",
  "waiting-budget",
  "cancelled",
  "unknown",
  "guard-reminder",
  "unavailable",
] as const;
export type InspectorReasonV1 = (typeof INSPECTOR_REASON_CODES_V1)[number];
export interface InspectorSourceV1 {
  readonly kind: "system" | "user" | "assistant" | "tool";
  readonly reference: InspectorOpaqueIdV1;
  readonly bytes: number;
  readonly protected: boolean;
  readonly archived: boolean;
}
export interface InspectorRequestV1 {
  readonly requestSnapshotId: InspectorOpaqueIdV1;
  readonly effectId: InspectorOpaqueIdV1 | null;
  readonly bindingRevision: InspectorOpaqueIdV1 | null;
  readonly contextRevision: InspectorOpaqueIdV1 | null;
  readonly toolRevision: InspectorOpaqueIdV1 | null;
  readonly consumedInput: InspectorOpaqueIdV1 | null;
  readonly reasonCode: InspectorReasonV1;
  readonly serializedBytes: number;
  readonly tokenCount: number | null;
  readonly tokenMeasurement: "exact" | "estimated" | "unobserved";
  readonly sources: readonly InspectorSourceV1[];
  readonly sourcesTruncated: boolean;
  readonly budget:
    | "unavailable"
    | "reserved"
    | "settled"
    | "exhausted"
    | "unknown";
  readonly guardSignal:
    | "exact-repeat"
    | "error-family"
    | "abab-cycle"
    | "polling"
    | null;
  readonly previousSnapshotId: InspectorOpaqueIdV1 | null;
  readonly prefixStructureChanged: boolean | null;
  readonly cacheReadTokens: number | null;
  readonly cacheWriteTokens: number | null;
  readonly cacheEvidence: "provider-usage" | "unobserved";
}
export interface InspectorEventV1 {
  readonly schemaVersion: typeof REQUEST_INSPECTOR_SCHEMA_V1;
  /** Host 每次启用/重启创建新 epoch；旧 epoch cursor 不能复用。 */
  readonly epoch: InspectorOpaqueIdV1;
  readonly sequence: number;
  readonly sourceRevision: number;
  readonly request: InspectorRequestV1;
  readonly eventDigest: InspectorDigestV1;
}
export interface InspectorSnapshotV1 {
  readonly schemaVersion: typeof REQUEST_INSPECTOR_SCHEMA_V1;
  readonly epoch: InspectorOpaqueIdV1;
  readonly sequence: number;
  /** 已不在该快照中的连续事件前缀长度；观察器丢弃计数不混入此字段。 */
  readonly dropped: number;
  readonly events: readonly InspectorEventV1[];
}

export function parseInspectorRequestV1(
  input: unknown,
): Readonly<InspectorRequestV1> {
  const v = record(input, [
    "requestSnapshotId",
    "effectId",
    "bindingRevision",
    "contextRevision",
    "toolRevision",
    "consumedInput",
    "reasonCode",
    "serializedBytes",
    "tokenCount",
    "tokenMeasurement",
    "sources",
    "sourcesTruncated",
    "budget",
    "guardSignal",
    "previousSnapshotId",
    "prefixStructureChanged",
    "cacheReadTokens",
    "cacheWriteTokens",
    "cacheEvidence",
  ]);
  const sources = array(v.sources, 64).map((input) => {
    const s = record(input, [
      "kind",
      "reference",
      "bytes",
      "protected",
      "archived",
    ]);
    return {
      kind: choice(s.kind, ["system", "user", "assistant", "tool"]),
      reference: opaque(s.reference),
      bytes: count(s.bytes),
      protected: boolean(s.protected),
      archived: boolean(s.archived),
    };
  });
  const parsed: InspectorRequestV1 = {
    requestSnapshotId: opaque(v.requestSnapshotId),
    effectId: nullableOpaque(v.effectId),
    bindingRevision: nullableOpaque(v.bindingRevision),
    contextRevision: nullableOpaque(v.contextRevision),
    toolRevision: nullableOpaque(v.toolRevision),
    consumedInput: nullableOpaque(v.consumedInput),
    reasonCode: choice(v.reasonCode, INSPECTOR_REASON_CODES_V1),
    serializedBytes: count(v.serializedBytes),
    tokenCount: nullableCount(v.tokenCount),
    tokenMeasurement: choice(v.tokenMeasurement, [
      "exact",
      "estimated",
      "unobserved",
    ]),
    sources,
    sourcesTruncated: boolean(v.sourcesTruncated),
    budget: choice(v.budget, [
      "unavailable",
      "reserved",
      "settled",
      "exhausted",
      "unknown",
    ]),
    guardSignal:
      v.guardSignal === null
        ? null
        : choice(v.guardSignal, [
            "exact-repeat",
            "error-family",
            "abab-cycle",
            "polling",
          ]),
    previousSnapshotId: nullableOpaque(v.previousSnapshotId),
    prefixStructureChanged:
      v.prefixStructureChanged === null
        ? null
        : boolean(v.prefixStructureChanged),
    cacheReadTokens: nullableCount(v.cacheReadTokens),
    cacheWriteTokens: nullableCount(v.cacheWriteTokens),
    cacheEvidence: choice(v.cacheEvidence, ["provider-usage", "unobserved"]),
  };
  if (
    (parsed.tokenMeasurement === "unobserved") !==
    (parsed.tokenCount === null)
  )
    fail();
  if (
    parsed.cacheEvidence === "unobserved" &&
    (parsed.cacheReadTokens !== null || parsed.cacheWriteTokens !== null)
  )
    fail();
  if (
    parsed.cacheEvidence === "provider-usage" &&
    parsed.cacheReadTokens === null &&
    parsed.cacheWriteTokens === null
  )
    fail();
  if (
    parsed.previousSnapshotId === null &&
    parsed.prefixStructureChanged !== null
  )
    fail();
  return deepFreeze(parsed);
}

export function createInspectorEventV1(
  input: Omit<InspectorEventV1, "schemaVersion" | "eventDigest">,
): Readonly<InspectorEventV1> {
  const unsigned = parseUnsigned({
    ...input,
    schemaVersion: REQUEST_INSPECTOR_SCHEMA_V1,
  });
  return deepFreeze({ ...unsigned, eventDigest: checksum(unsigned) });
}
export function parseInspectorEventV1(
  input: unknown,
): Readonly<InspectorEventV1> {
  const v = record(input, [
    "schemaVersion",
    "epoch",
    "sequence",
    "sourceRevision",
    "request",
    "eventDigest",
  ]);
  const { eventDigest, ...unsigned } = v;
  const parsed = parseUnsigned(unsigned);
  if (eventDigest !== checksum(parsed)) fail();
  return deepFreeze({ ...parsed, eventDigest: checksum(parsed) });
}
export function serializeInspectorEventV1(input: unknown): string {
  return JSON.stringify(parseInspectorEventV1(input));
}
export function parseInspectorSnapshotV1(
  input: unknown,
): Readonly<InspectorSnapshotV1> {
  const v = record(input, [
    "schemaVersion",
    "epoch",
    "sequence",
    "dropped",
    "events",
  ]);
  if (v.schemaVersion !== REQUEST_INSPECTOR_SCHEMA_V1) fail();
  const epoch = opaque(v.epoch);
  const sequence = count(v.sequence);
  const dropped = count(v.dropped);
  const events = array(v.events, 128).map(parseInspectorEventV1);
  if (dropped + events.length !== sequence) fail();
  let previous = dropped;
  const revisions = new Map<InspectorOpaqueIdV1, number>();
  for (const event of events) {
    if (
      event.epoch !== epoch ||
      event.sequence !== previous + 1 ||
      event.sequence > sequence
    )
      fail();
    const revision = revisions.get(event.request.requestSnapshotId);
    if (revision !== undefined && event.sourceRevision < revision) fail();
    revisions.set(event.request.requestSnapshotId, event.sourceRevision);
    previous = event.sequence;
  }
  return deepFreeze({
    schemaVersion: REQUEST_INSPECTOR_SCHEMA_V1,
    epoch,
    sequence,
    dropped,
    events,
  });
}
export function serializeInspectorSnapshotV1(input: unknown): string {
  return JSON.stringify(parseInspectorSnapshotV1(input));
}
function parseUnsigned(input: unknown): Omit<InspectorEventV1, "eventDigest"> {
  const v = record(input, [
    "schemaVersion",
    "epoch",
    "sequence",
    "sourceRevision",
    "request",
  ]);
  if (
    v.schemaVersion !== REQUEST_INSPECTOR_SCHEMA_V1 ||
    count(v.sequence) === 0
  )
    fail();
  return {
    schemaVersion: REQUEST_INSPECTOR_SCHEMA_V1,
    epoch: opaque(v.epoch),
    sequence: count(v.sequence),
    sourceRevision: count(v.sourceRevision),
    request: parseInspectorRequestV1(v.request),
  };
}
function checksum(input: unknown): InspectorDigestV1 {
  return `sha256:${sha256Hex(JSON.stringify(input))}`;
}
function opaque(value: unknown): InspectorOpaqueIdV1 {
  if (typeof value !== "string" || !/^hmac-sha256:[a-f0-9]{64}$/.test(value))
    fail();
  return value as InspectorOpaqueIdV1;
}
function nullableOpaque(value: unknown) {
  return value === null ? null : opaque(value);
}
function nullableCount(value: unknown) {
  return value === null ? null : count(value);
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    fail();
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") fail();
  return value;
}
function choice<const T extends readonly string[]>(
  value: unknown,
  choices: T,
): T[number] {
  if (typeof value !== "string" || !choices.includes(value)) fail();
  return value as T[number];
}
function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).length !== value.length + 1) fail();
  for (let index = 0; index < value.length; index++) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor)) fail();
  }
  return value;
}
function record(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  )
    fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(value).length !== keys.length ||
    keys.some((key) => !descriptors[key] || !("value" in descriptors[key]))
  )
    fail();
  return value as Record<string, unknown>;
}
function fail(): never {
  throw new TypeError("INSPECTOR_CONTRACT_INVALID");
}
