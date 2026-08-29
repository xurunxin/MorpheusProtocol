import { describe, expect, test } from "bun:test";

import {
  createAgentOsV1CanonicalPromptCursor,
  createAgentOsV1CanonicalPromptEvent,
  createAgentOsV1CanonicalPromptSnapshot,
  type AgentOsV1AppProjectionPage,
} from "@xurunxin/morpheus-protocol";

import {
  transitionPromptProjection as reducePromptProjection,
  type PromptProjectionExpectedContext,
  type PromptProjectionState,
} from "../src/projection.js";

const EXPECTED = Object.freeze({
  tenantId: "tenant.sdk",
  runId: "run.sdk",
  authorityEpoch: "authority-epoch:sdk.1" as const,
  lifecycle: "connected-managed" as const,
  compatibility: "compatible" as const,
}) satisfies Readonly<PromptProjectionExpectedContext>;

function transitionPromptProjection(
  previous: Readonly<PromptProjectionState> | null,
  pageInput: unknown,
  expected: Readonly<PromptProjectionExpectedContext> = EXPECTED,
) {
  return reducePromptProjection(previous, pageInput, expected);
}

function page(options: {
  tenantId?: string;
  runId?: string;
  authorityEpoch: `authority-epoch:${string}`;
  lifecycle?: "connected-managed" | "offline-local" | "revoked";
  compatibility?: "compatible" | "update-required";
  streamEpoch: `stream-epoch:${string}`;
  disposition: "events" | "snapshot-required";
  start: number;
  end: number;
  payloadPrefix?: string;
}): AgentOsV1AppProjectionPage {
  const tenantId = options.tenantId ?? "tenant.sdk";
  const runId = options.runId ?? "run.sdk";
  const events = Array.from(
    { length: Math.max(0, options.end - options.start + 1) },
    (_, index) => {
      const sequence = options.start + index;
      return createAgentOsV1CanonicalPromptEvent({
        schemaVersion: "agent-os-canonical-prompt/v1",
        eventId: `event.sdk.${sequence}`,
        runId,
        attemptId: "attempt.sdk",
        streamEpoch: options.streamEpoch,
        sequence,
        eventType: "provider.output",
        payload: { text: `${options.payloadPrefix ?? "chunk"}-${sequence}` },
        createdAt: `2026-08-06T00:00:${String(sequence).padStart(2, "0")}.000Z`,
      });
    },
  );
  const snapshot = createAgentOsV1CanonicalPromptSnapshot({
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId,
    attemptId: "attempt.sdk",
    instanceId: "instance.sdk",
    storeGeneration: 1,
    streamEpoch: options.streamEpoch,
    watermark: options.end,
    state: "running",
    terminal: false,
    updatedAt: `2026-08-06T00:00:${String(options.end).padStart(2, "0")}.000Z`,
  });
  const cursor = createAgentOsV1CanonicalPromptCursor({
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId,
    streamEpoch: options.streamEpoch,
    sequence: options.end,
    watermark: options.end,
  });
  return {
    schemaVersion: "agent-os-app-projection/v1",
    tenantId,
    authorityEpoch: options.authorityEpoch,
    lifecycle: options.lifecycle ?? "connected-managed",
    compatibility: options.compatibility ?? "compatible",
    response: {
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.read",
      disposition: options.disposition,
      snapshot,
      events,
      cursor,
      replayed: false,
    },
  };
}

describe("SDK immutable Prompt projection", () => {
  test("commits contiguous deltas without mutating the previous projection", () => {
    const initial = transitionPromptProjection(
      null,
      page({
        authorityEpoch: "authority-epoch:sdk.1",
        streamEpoch: "stream-epoch:sdk.1",
        disposition: "snapshot-required",
        start: 1,
        end: 1,
      }),
    );
    expect(initial.kind).toBe("committed");
    if (initial.kind !== "committed")
      throw new Error("expected committed projection");
    const previousEvents = initial.state.events;

    const next = transitionPromptProjection(
      initial.state,
      page({
        authorityEpoch: "authority-epoch:sdk.1",
        streamEpoch: "stream-epoch:sdk.1",
        disposition: "events",
        start: 2,
        end: 2,
      }),
    );

    expect(next.kind).toBe("committed");
    if (next.kind !== "committed")
      throw new Error("expected committed projection");
    expect(next.state.events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(previousEvents.map((event) => event.sequence)).toEqual([1]);
    expect(Object.isFrozen(next.state.events)).toBe(true);
  });

  test("drops partial deltas and requires an atomic rebuild after authority epoch drift", () => {
    const initial = transitionPromptProjection(
      null,
      page({
        authorityEpoch: "authority-epoch:sdk.1",
        streamEpoch: "stream-epoch:sdk.1",
        disposition: "snapshot-required",
        start: 1,
        end: 1,
      }),
    );
    if (initial.kind !== "committed")
      throw new Error("expected committed projection");

    const stale = transitionPromptProjection(
      initial.state,
      page({
        authorityEpoch: "authority-epoch:sdk.2",
        streamEpoch: "stream-epoch:sdk.2",
        disposition: "events",
        start: 2,
        end: 2,
      }),
    );
    expect(stale).toEqual({
      kind: "rebuild-required",
      reason: "authority-epoch-changed",
    });
    expect(initial.state.events.map((event) => event.sequence)).toEqual([1]);

    const rebuilt = transitionPromptProjection(
      initial.state,
      page({
        authorityEpoch: "authority-epoch:sdk.2",
        streamEpoch: "stream-epoch:sdk.2",
        disposition: "snapshot-required",
        start: 1,
        end: 2,
      }),
      { ...EXPECTED, authorityEpoch: "authority-epoch:sdk.2" },
    );
    expect(rebuilt.kind).toBe("committed");
    if (rebuilt.kind !== "committed")
      throw new Error("expected committed rebuild");
    expect(rebuilt.state.events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(rebuilt.state.authorityEpoch).toBe("authority-epoch:sdk.2");
  });

  test("rejects cross-tenant and cross-run pages before replacing committed state", () => {
    const initial = transitionPromptProjection(
      null,
      page({
        authorityEpoch: "authority-epoch:sdk.1",
        streamEpoch: "stream-epoch:sdk.1",
        disposition: "snapshot-required",
        start: 1,
        end: 1,
      }),
    );
    if (initial.kind !== "committed")
      throw new Error("expected committed projection");

    expect(
      transitionPromptProjection(
        initial.state,
        page({
          tenantId: "tenant.other",
          authorityEpoch: "authority-epoch:sdk.2",
          streamEpoch: "stream-epoch:sdk.2",
          disposition: "snapshot-required",
          start: 1,
          end: 1,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "tenant-changed" });
    expect(
      transitionPromptProjection(
        initial.state,
        page({
          runId: "run.other",
          authorityEpoch: "authority-epoch:sdk.1",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "events",
          start: 2,
          end: 2,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "run-changed" });
    expect(
      transitionPromptProjection(
        initial.state,
        page({
          runId: "run.other",
          authorityEpoch: "authority-epoch:sdk.2",
          streamEpoch: "stream-epoch:sdk.2",
          disposition: "snapshot-required",
          start: 1,
          end: 1,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "run-changed" });
    expect(initial.state.snapshot.runId).toBe("run.sdk");
  });

  test("requires caller expected tenant, Run, authority epoch, lifecycle and compatibility", () => {
    expect(
      transitionPromptProjection(
        null,
        page({
          tenantId: "tenant.other",
          authorityEpoch: "authority-epoch:sdk.1",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "snapshot-required",
          start: 1,
          end: 1,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "tenant-changed" });
    expect(
      transitionPromptProjection(
        null,
        page({
          runId: "run.other",
          authorityEpoch: "authority-epoch:sdk.1",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "snapshot-required",
          start: 1,
          end: 1,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "run-changed" });
    expect(
      transitionPromptProjection(
        null,
        page({
          authorityEpoch: "authority-epoch:self-reported",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "snapshot-required",
          start: 1,
          end: 1,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "authority-epoch-changed" });
    expect(
      transitionPromptProjection(
        null,
        page({
          authorityEpoch: "authority-epoch:sdk.1",
          lifecycle: "revoked",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "snapshot-required",
          start: 1,
          end: 1,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "lifecycle-changed" });
    expect(
      transitionPromptProjection(
        null,
        page({
          authorityEpoch: "authority-epoch:sdk.1",
          compatibility: "update-required",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "snapshot-required",
          start: 1,
          end: 1,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "compatibility-changed" });
    expect(
      transitionPromptProjection(
        null,
        page({
          authorityEpoch: "authority-epoch:sdk.1",
          compatibility: "update-required",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "snapshot-required",
          start: 1,
          end: 1,
        }),
        { ...EXPECTED, compatibility: "update-required" },
      ),
    ).toEqual({
      kind: "update-required",
      lifecycle: "connected-managed",
      compatibility: "update-required",
    });
  });

  test("deduplicates identical event digests and rejects conflicting replay or a future cursor", () => {
    const initial = transitionPromptProjection(
      null,
      page({
        authorityEpoch: "authority-epoch:sdk.1",
        streamEpoch: "stream-epoch:sdk.1",
        disposition: "snapshot-required",
        start: 1,
        end: 1,
      }),
    );
    if (initial.kind !== "committed")
      throw new Error("expected committed projection");

    const duplicate = transitionPromptProjection(
      initial.state,
      page({
        authorityEpoch: "authority-epoch:sdk.1",
        streamEpoch: "stream-epoch:sdk.1",
        disposition: "events",
        start: 1,
        end: 1,
      }),
    );
    expect(duplicate.kind).toBe("committed");
    if (duplicate.kind !== "committed")
      throw new Error("expected idempotent projection");
    expect(duplicate.state.events).toHaveLength(1);

    expect(
      transitionPromptProjection(
        initial.state,
        page({
          authorityEpoch: "authority-epoch:sdk.1",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "events",
          start: 1,
          end: 1,
          payloadPrefix: "tampered",
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "event-conflict" });
    expect(
      transitionPromptProjection(
        initial.state,
        page({
          authorityEpoch: "authority-epoch:sdk.1",
          streamEpoch: "stream-epoch:sdk.1",
          disposition: "events",
          start: 3,
          end: 2,
        }),
      ),
    ).toEqual({ kind: "rebuild-required", reason: "cursor-gap" });
  });
});
