import {
  parseAgentOsV1AppProjectionPage,
  type AgentOsV1AppCompatibility,
  type AgentOsV1AppLifecycleState,
  type AgentOsV1AppProjectionPage,
  type AgentOsV1AuthorityEpoch,
  type AgentOsV1CanonicalPromptCursor,
  type AgentOsV1CanonicalPromptEvent,
  type AgentOsV1CanonicalPromptSnapshot,
} from "@morpheus/api-protocol";

export interface PromptProjectionState {
  readonly tenantId: string;
  readonly authorityEpoch: AgentOsV1AuthorityEpoch;
  readonly lifecycle: AgentOsV1AppLifecycleState;
  readonly compatibility: AgentOsV1AppCompatibility;
  readonly snapshot: Readonly<AgentOsV1CanonicalPromptSnapshot>;
  readonly events: readonly Readonly<AgentOsV1CanonicalPromptEvent>[];
  readonly cursor: Readonly<AgentOsV1CanonicalPromptCursor>;
}

export interface PromptProjectionExpectedContext {
  readonly tenantId: string;
  readonly runId: string;
  readonly authorityEpoch: AgentOsV1AuthorityEpoch;
  readonly lifecycle: AgentOsV1AppLifecycleState;
  readonly compatibility: AgentOsV1AppCompatibility;
}

export type PromptProjectionRebuildReason =
  | "initial-snapshot-required"
  | "tenant-changed"
  | "run-changed"
  | "authority-epoch-changed"
  | "lifecycle-changed"
  | "compatibility-changed"
  | "stream-epoch-changed"
  | "cursor-gap"
  | "event-conflict";

export type PromptProjectionTransition =
  | Readonly<{ kind: "committed"; state: Readonly<PromptProjectionState> }>
  | Readonly<{ kind: "rebuild-required"; reason: PromptProjectionRebuildReason }>
  | Readonly<{
      kind: "update-required";
      lifecycle: AgentOsV1AppLifecycleState;
      compatibility: "update-required";
    }>;

/**
 * 纯投影 reducer。任何漂移都在 root replacement 前返回 rebuild-required，旧投影保持不变。
 */
export function transitionPromptProjection(
  previous: Readonly<PromptProjectionState> | null,
  pageInput: unknown,
  expected: Readonly<PromptProjectionExpectedContext>
): PromptProjectionTransition {
  const page = parseAgentOsV1AppProjectionPage(pageInput);
  if (page.tenantId !== expected.tenantId) {
    return Object.freeze({ kind: "rebuild-required", reason: "tenant-changed" });
  }
  if (page.response.snapshot.runId !== expected.runId) {
    return Object.freeze({ kind: "rebuild-required", reason: "run-changed" });
  }
  if (page.authorityEpoch !== expected.authorityEpoch) {
    return Object.freeze({ kind: "rebuild-required", reason: "authority-epoch-changed" });
  }
  if (page.lifecycle !== expected.lifecycle) {
    return Object.freeze({ kind: "rebuild-required", reason: "lifecycle-changed" });
  }
  if (page.compatibility !== expected.compatibility) {
    return Object.freeze({ kind: "rebuild-required", reason: "compatibility-changed" });
  }
  if (page.compatibility === "update-required") {
    return Object.freeze({
      kind: "update-required",
      lifecycle: page.lifecycle,
      compatibility: page.compatibility,
    });
  }

  if (previous !== null && page.tenantId !== previous.tenantId) {
    return Object.freeze({ kind: "rebuild-required", reason: "tenant-changed" });
  }
  if (previous !== null && page.response.snapshot.runId !== previous.snapshot.runId) {
    return Object.freeze({ kind: "rebuild-required", reason: "run-changed" });
  }
  if (page.response.disposition === "snapshot-required") {
    return Object.freeze({ kind: "committed", state: rebuiltState(page) });
  }
  if (previous === null) {
    return Object.freeze({ kind: "rebuild-required", reason: "initial-snapshot-required" });
  }
  if (page.authorityEpoch !== previous.authorityEpoch) {
    return Object.freeze({ kind: "rebuild-required", reason: "authority-epoch-changed" });
  }
  if (page.response.snapshot.streamEpoch !== previous.snapshot.streamEpoch) {
    return Object.freeze({ kind: "rebuild-required", reason: "stream-epoch-changed" });
  }
  const previousBySequence = new Map(previous.events.map((event) => [event.sequence, event]));
  for (const event of page.response.events) {
    if (event.sequence > previous.cursor.sequence) continue;
    const committed = previousBySequence.get(event.sequence);
    if (committed === undefined || committed.digest !== event.digest) {
      return Object.freeze({ kind: "rebuild-required", reason: "event-conflict" });
    }
  }
  const freshEvents = page.response.events.filter(
    (event) => event.sequence > previous.cursor.sequence
  );
  const first = freshEvents[0];
  const expectedSequence = previous.cursor.sequence + 1;
  if (
    (first !== undefined && first.sequence !== expectedSequence) ||
    (first === undefined && page.response.cursor.sequence > previous.cursor.sequence)
  ) {
    return Object.freeze({ kind: "rebuild-required", reason: "cursor-gap" });
  }
  const events = Object.freeze([...previous.events, ...freshEvents]);
  const advanced = freshEvents.length > 0;
  return Object.freeze({
    kind: "committed",
    state: Object.freeze({
      tenantId: page.tenantId,
      authorityEpoch: page.authorityEpoch,
      lifecycle: page.lifecycle,
      compatibility: page.compatibility,
      snapshot: advanced ? page.response.snapshot : previous.snapshot,
      events,
      cursor: advanced ? page.response.cursor : previous.cursor,
    }),
  });
}

function rebuiltState(page: Readonly<AgentOsV1AppProjectionPage>): Readonly<PromptProjectionState> {
  return Object.freeze({
    tenantId: page.tenantId,
    authorityEpoch: page.authorityEpoch,
    lifecycle: page.lifecycle,
    compatibility: page.compatibility,
    snapshot: page.response.snapshot,
    events: Object.freeze([...page.response.events]),
    cursor: page.response.cursor,
  });
}
