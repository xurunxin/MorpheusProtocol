import { expect, test } from "bun:test";
import {
  createInspectorEventV1,
  parseInspectorEventV1,
  parseInspectorRequestV1,
  parseInspectorSnapshotV1,
  serializeInspectorEventV1,
  type InspectorRequestV1,
  parseInspectorReadRequestV1,
  parseInspectorReadResponseV1,
  serializeInspectorReadResponseV1,
} from "../src/request-inspector-v1.js";

test("Inspector wire 仅允许有界只读快照，不接受 capture/执行或不一致 ready", () => {
  const request = {
    schemaVersion: "agent-os-request-inspector/v1",
    operation: "snapshot.read",
    requestId: "inspector.read.1",
    limit: 32,
  };
  expect(parseInspectorReadRequestV1(request).limit).toBe(32);
  for (const patch of [
    { operation: "capture.start" },
    { operation: "turn.retry" },
    { limit: 129 },
    { limit: 0 },
    { limit: 1.5 },
    { requestId: "private/path" },
    { raw: true },
  ])
    expect(() =>
      parseInspectorReadRequestV1({ ...request, ...patch }),
    ).toThrow();
  const response = {
    schemaVersion: request.schemaVersion,
    operation: request.operation,
    requestId: request.requestId,
    ready: false,
    reasonCode: "unavailable",
    snapshot: null,
  };
  expect(
    parseInspectorReadResponseV1(
      JSON.parse(serializeInspectorReadResponseV1(response)),
    ),
  ).toEqual(response);
  expect(() =>
    parseInspectorReadResponseV1({ ...response, ready: true }),
  ).toThrow();
  expect(() =>
    parseInspectorReadResponseV1({ ...response, reasonCode: null }),
  ).toThrow();
});

const id = `hmac-sha256:${"a".repeat(64)}` as const;
const request: InspectorRequestV1 = {
  requestSnapshotId: id,
  effectId: id,
  bindingRevision: id,
  contextRevision: id,
  toolRevision: id,
  consumedInput: null,
  reasonCode: "prepared",
  serializedBytes: 32,
  tokenCount: 32,
  tokenMeasurement: "estimated",
  sources: [
    {
      kind: "user",
      reference: id,
      bytes: 10,
      protected: true,
      archived: false,
    },
  ],
  sourcesTruncated: false,
  budget: "reserved",
  guardSignal: null,
  previousSnapshotId: null,
  prefixStructureChanged: null,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  cacheEvidence: "unobserved",
};
test("Inspector 规范编码、不可变投影与摘要漂移", () => {
  const event = createInspectorEventV1({
    epoch: id,
    sequence: 1,
    sourceRevision: 2,
    request,
  });
  expect(
    parseInspectorEventV1(JSON.parse(serializeInspectorEventV1(event))),
  ).toEqual(event);
  expect(Object.isFrozen(event.request.sources[0])).toBe(true);
  expect(() => parseInspectorEventV1({ ...event, sourceRevision: 3 })).toThrow(
    "INSPECTOR_CONTRACT_INVALID",
  );
  const reversed = Object.fromEntries(Object.entries(event).reverse());
  expect(serializeInspectorEventV1(reversed)).toBe(
    serializeInspectorEventV1(event),
  );
});
test("Inspector 拒绝原文诱饵、未观测缓存猜测、非法数值与无界来源", () => {
  for (const patch of [
    { prompt: "PRIVATE_PROMPT" },
    { path: "C:\\private\\credential" },
    { credential: "sk-secret" },
    { requestSnapshotId: "PRIVATE_ID" },
    { reasonCode: "PRIVATE_ERROR" },
    { tokenCount: -1 },
    { serializedBytes: Infinity },
    { tokenCount: null },
    { cacheReadTokens: 10 },
    { cacheEvidence: "provider-usage" },
    { prefixStructureChanged: true },
    { sources: Array.from({ length: 65 }, () => request.sources[0]) },
    { sources: [{ ...request.sources[0], raw: "PRIVATE_TOOL" }] },
  ])
    expect(() => parseInspectorRequestV1({ ...request, ...patch })).toThrow(
      "INSPECTOR_CONTRACT_INVALID",
    );
  let accesses = 0;
  expect(() =>
    parseInspectorRequestV1({
      ...request,
      get tokenCount() {
        accesses++;
        return 1;
      },
    }),
  ).toThrow();
  expect(accesses).toBe(0);
  expect(
    parseInspectorRequestV1({
      ...request,
      previousSnapshotId: id,
      prefixStructureChanged: true,
    }).cacheEvidence,
  ).toBe("unobserved");
  expect(
    parseInspectorRequestV1({
      ...request,
      cacheReadTokens: 0,
      cacheEvidence: "provider-usage",
    }).cacheReadTokens,
  ).toBe(0);
});
test("Inspector snapshot 限制容量并拒绝跨 epoch、乱序或越界事件", () => {
  const event = createInspectorEventV1({
    epoch: id,
    sequence: 1,
    sourceRevision: 0,
    request,
  });
  const snapshot = {
    schemaVersion: event.schemaVersion,
    epoch: id,
    sequence: 1,
    dropped: 0,
    events: [event],
  };
  expect(parseInspectorSnapshotV1(snapshot).events).toHaveLength(1);
  expect(() =>
    parseInspectorSnapshotV1({
      ...snapshot,
      sequence: 2,
      events: [
        createInspectorEventV1({
          epoch: id,
          sequence: 1,
          sourceRevision: 2,
          request,
        }),
        createInspectorEventV1({
          epoch: id,
          sequence: 2,
          sourceRevision: 1,
          request,
        }),
      ],
    }),
  ).toThrow("INSPECTOR_CONTRACT_INVALID");
  for (const patch of [
    { events: [event, event] },
    { sequence: 0 },
    { sequence: 2 },
    { dropped: 1 },
    { epoch: `hmac-sha256:${"b".repeat(64)}` },
    { events: Array(129).fill(event) },
  ])
    expect(() => parseInspectorSnapshotV1({ ...snapshot, ...patch })).toThrow();
});
