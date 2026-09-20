import { expect, test } from "bun:test";
import {
  createInspectorEventV1,
  type InspectorRequestV1,
} from "@xurunxin/morpheus-protocol";
import {
  reduceInspectorEventV1,
  createRequestInspectorClientV1,
  createRequestInspectorWireClientV1,
} from "../src/request-inspector-v1.js";

test("Inspector wire client 校验请求关联、读取上限与取消", async () => {
  const request = {
    schemaVersion: "agent-os-request-inspector/v1",
    operation: "snapshot.read",
    requestId: "inspector.1",
    limit: 1,
  };
  const response = {
    schemaVersion: request.schemaVersion,
    operation: request.operation,
    requestId: request.requestId,
    ready: false,
    reasonCode: "unavailable",
    snapshot: null,
  };
  expect(
    (
      await createRequestInspectorWireClientV1({
        request: () => response,
      }).read(request)
    ).ready,
  ).toBe(false);
  await expect(
    createRequestInspectorWireClientV1({
      request: () => ({ ...response, requestId: "other" }),
    }).read(request),
  ).rejects.toThrow("INSPECTOR_RESPONSE_MISMATCH");
  await expect(
    createRequestInspectorWireClientV1({
      request: () => ({
        ...response,
        ready: true,
        reasonCode: null,
        snapshot: { ...empty, sequence: 2, events: [event(1), event(2)] },
      }),
    }).read(request),
  ).rejects.toThrow("INSPECTOR_RESPONSE_MISMATCH");
  let reads = 0;
  const abort = new AbortController();
  abort.abort();
  await expect(
    createRequestInspectorWireClientV1({
      request: () => {
        reads++;
        return response;
      },
    }).read(request, abort.signal),
  ).rejects.toThrow("INSPECTOR_READ_ABORTED");
  expect(reads).toBe(0);
});
const id = `hmac-sha256:${"a".repeat(64)}` as const;
const request: InspectorRequestV1 = {
  requestSnapshotId: id,
  effectId: null,
  bindingRevision: null,
  contextRevision: null,
  toolRevision: null,
  consumedInput: null,
  reasonCode: "unavailable",
  serializedBytes: 0,
  tokenCount: null,
  tokenMeasurement: "unobserved",
  sources: [],
  sourcesTruncated: false,
  budget: "unavailable",
  guardSignal: null,
  previousSnapshotId: null,
  prefixStructureChanged: null,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  cacheEvidence: "unobserved",
};
const event = (sequence: number, sourceRevision = sequence) =>
  createInspectorEventV1({ epoch: id, sequence, sourceRevision, request });
const empty = {
  schemaVersion: "agent-os-request-inspector/v1",
  epoch: id,
  sequence: 0,
  dropped: 0,
  events: [],
};
test("Inspector reducer 幂等、gap/conflict/epoch/revision 明确要求快照", () => {
  const first = reduceInspectorEventV1(empty, event(1));
  expect(first.kind).toBe("applied");
  if (first.kind !== "applied") throw new Error("fixture");
  expect(reduceInspectorEventV1(first.projection, event(1)).kind).toBe(
    "duplicate",
  );
  expect(reduceInspectorEventV1(first.projection, event(3))).toEqual({
    kind: "snapshot-required",
    reason: "cursor-gap",
  });
  expect(reduceInspectorEventV1(first.projection, event(1, 2))).toEqual({
    kind: "snapshot-required",
    reason: "conflict",
  });
  expect(reduceInspectorEventV1(first.projection, event(2, 0))).toEqual({
    kind: "snapshot-required",
    reason: "source-regression",
  });
  expect(
    reduceInspectorEventV1(
      first.projection,
      createInspectorEventV1({
        sequence: 2,
        sourceRevision: 2,
        request,
        epoch: `hmac-sha256:${"b".repeat(64)}`,
      }),
    ),
  ).toEqual({ kind: "snapshot-required", reason: "epoch-changed" });
  expect(first.projection.sequence).toBe(1);
});
test("Inspector reducer 容量有界，过期重复不能猜测幂等", () => {
  let projection = { ...empty, events: [] as ReturnType<typeof event>[] };
  for (let sequence = 1; sequence <= 130; sequence++) {
    const next = reduceInspectorEventV1(projection, event(sequence));
    if (next.kind !== "applied") throw new Error("fixture");
    projection = { ...next.projection, events: [...next.projection.events] };
  }
  expect(projection.events).toHaveLength(128);
  expect(projection.dropped).toBe(2);
  expect(reduceInspectorEventV1(projection, event(3)).kind).toBe("duplicate");
  expect(reduceInspectorEventV1(projection, event(1))).toEqual({
    kind: "snapshot-required",
    reason: "expired-duplicate",
  });
});
test("Inspector client 仅调用注入的只读 transport，取消不调用 transport", async () => {
  let reads = 0;
  const client = createRequestInspectorClientV1({
    snapshot: () => {
      reads++;
      return empty;
    },
  });
  expect((await client.snapshot()).sequence).toBe(0);
  const abort = new AbortController();
  abort.abort();
  await expect(client.snapshot(abort.signal)).rejects.toThrow(
    "INSPECTOR_READ_ABORTED",
  );
  expect(reads).toBe(1);
  const corrupt = createRequestInspectorClientV1({
    snapshot: () => ({
      ...empty,
      sequence: 2,
      events: [event(1, 2), event(2, 1)],
    }),
  });
  await expect(corrupt.snapshot()).rejects.toThrow(
    "INSPECTOR_CONTRACT_INVALID",
  );
});
