import {
  parseInspectorEventV1,
  parseInspectorSnapshotV1,
  type InspectorSnapshotV1,
} from "@xurunxin/morpheus-protocol";

export type InspectorTransitionV1 =
  | Readonly<{
      kind: "applied" | "duplicate";
      projection: Readonly<InspectorSnapshotV1>;
    }>
  | Readonly<{
      kind: "snapshot-required";
      reason:
        | "epoch-changed"
        | "cursor-gap"
        | "conflict"
        | "expired-duplicate"
        | "source-regression";
    }>;

/** 有界纯 reducer；任何漂移都保留旧 projection，不猜测缺失事件或执行结果。 */
export function reduceInspectorEventV1(
  previousInput: unknown,
  eventInput: unknown,
): InspectorTransitionV1 {
  const previous = parseInspectorSnapshotV1(previousInput);
  const event = parseInspectorEventV1(eventInput);
  const rebuild = (
    reason: Extract<
      InspectorTransitionV1,
      { kind: "snapshot-required" }
    >["reason"],
  ): InspectorTransitionV1 =>
    Object.freeze({ kind: "snapshot-required", reason });
  if (event.epoch !== previous.epoch) return rebuild("epoch-changed");
  if (event.sequence <= previous.sequence) {
    const original = previous.events.find(
      (item) => item.sequence === event.sequence,
    );
    if (original === undefined) return rebuild("expired-duplicate");
    return original.eventDigest === event.eventDigest
      ? Object.freeze({ kind: "duplicate", projection: previous })
      : rebuild("conflict");
  }
  if (event.sequence !== previous.sequence + 1) return rebuild("cursor-gap");
  const source = previous.events.findLast(
    (item) =>
      item.request.requestSnapshotId === event.request.requestSnapshotId,
  );
  if (source !== undefined && event.sourceRevision < source.sourceRevision)
    return rebuild("source-regression");
  return Object.freeze({
    kind: "applied",
    projection: parseInspectorSnapshotV1({
      ...previous,
      sequence: event.sequence,
      events: [...previous.events, event].slice(-128),
    }),
  });
}

/** 调用方提供已授权只读 transport；无原始捕获、重试或执行端口。 */
export function createRequestInspectorClientV1(
  transport: Readonly<{
    snapshot: (signal?: AbortSignal) => Promise<unknown> | unknown;
  }>,
) {
  if (typeof transport.snapshot !== "function")
    throw new TypeError("INSPECTOR_TRANSPORT_REQUIRED");
  return Object.freeze({
    snapshot: async (signal?: AbortSignal) => {
      if (signal?.aborted) throw new Error("INSPECTOR_READ_ABORTED");
      const snapshot = parseInspectorSnapshotV1(
        await transport.snapshot(signal),
      );
      if (signal?.aborted) throw new Error("INSPECTOR_READ_ABORTED");
      return snapshot;
    },
    reduce: reduceInspectorEventV1,
  });
}
