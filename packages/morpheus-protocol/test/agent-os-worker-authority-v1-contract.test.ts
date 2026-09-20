import { expect, test } from "bun:test";
import {
  AGENT_OS_WORKER_AUTHORITY_V1,
  assertAgentOsWorkerAuthorityResponseBindingV1,
  createAgentOsWorkerAuthorityRequestDigestV1,
  decodeAgentOsWorkerAuthorityRequestV1,
  encodeAgentOsWorkerAuthorityRequestV1,
  encodeAgentOsWorkerAuthorityResponseV1,
  parseAgentOsWorkerAuthorityRequestV1,
  parseAgentOsWorkerAuthorityResponseV1,
} from "../src/agent-os-worker-authority-v1-contract.js";

const identity = {
  commandId: "command.activate",
  grantId: "grant.demo",
  runId: "run.demo",
  storeId: "store.demo",
  writerIncarnationId: "writer.demo",
  claimId: "claim.demo",
};
const request = {
  schemaVersion: AGENT_OS_WORKER_AUTHORITY_V1,
  requestId: "request.demo",
  workerId: "worker.demo",
  operation: "writer.activate",
  payload: identity,
};
const receipt = {
  grantId: identity.grantId,
  runId: identity.runId,
  storeId: identity.storeId,
  leaseId: "lease.demo",
  leaseEpoch: "lease-epoch:current",
  instanceId: "instance.demo",
  writerIncarnationId: identity.writerIncarnationId,
  claimId: identity.claimId,
  claimFence: 1,
  deadline: "2026-09-20T12:05:00.000Z",
  authorityCommittedAt: "2026-09-20T12:00:00.000Z",
  state: "active",
  duplicate: false,
};
const response = {
  schemaVersion: AGENT_OS_WORKER_AUTHORITY_V1,
  requestId: request.requestId,
  workerId: request.workerId,
  requestDigest: createAgentOsWorkerAuthorityRequestDigestV1(request),
  operation: "writer.activate.receipt",
  authorityNow: "2026-09-20T12:00:01.000Z",
  status: "accepted",
  receipt,
};

test("writer authority wire is canonical and binds the exact request", () => {
  const encoded = encodeAgentOsWorkerAuthorityRequestV1(request);
  expect(decodeAgentOsWorkerAuthorityRequestV1(encoded)).toEqual(request);
  expect(
    Object.isFrozen(decodeAgentOsWorkerAuthorityRequestV1(encoded).payload),
  ).toBe(true);
  expect(
    createAgentOsWorkerAuthorityRequestDigestV1({
      ...request,
      payload: Object.fromEntries(Object.entries(identity).reverse()),
    }),
  ).toBe(response.requestDigest);
  expect(() =>
    assertAgentOsWorkerAuthorityResponseBindingV1(request, response),
  ).not.toThrow();
  expect(JSON.parse(encodeAgentOsWorkerAuthorityResponseV1(response))).toEqual(
    response,
  );
});

test.each(["authority", "approval", "policy", "current", "snapshot"])(
  "external %s injection is rejected at both envelope and payload",
  (field) => {
    expect(() =>
      parseAgentOsWorkerAuthorityRequestV1({ ...request, [field]: {} }),
    ).toThrow();
    expect(() =>
      parseAgentOsWorkerAuthorityRequestV1({
        ...request,
        payload: { ...identity, [field]: {} },
      }),
    ).toThrow();
  },
);

test.each(["requestId", "workerId", "requestDigest", "operation"])(
  "response %s cannot be rebound",
  (field) => {
    const value =
      field === "requestDigest"
        ? `sha256:${"0".repeat(64)}`
        : field === "operation"
          ? "writer.consume.receipt"
          : "other.id";
    expect(() =>
      assertAgentOsWorkerAuthorityResponseBindingV1(request, {
        ...response,
        [field]: value,
      }),
    ).toThrow();
  },
);

test.each(["grantId", "runId", "storeId", "writerIncarnationId", "claimId"])(
  "writer %s must match the pending request",
  (field) => {
    expect(() =>
      assertAgentOsWorkerAuthorityResponseBindingV1(request, {
        ...response,
        receipt: { ...receipt, [field]: "other.id" },
      }),
    ).toThrow();
  },
);

test("recovery preserves source and recovery command and requires a higher fence", () => {
  const recovery = {
    ...request,
    operation: "writer.recover",
    payload: {
      source: { ...identity, expectedClaimFence: 1 },
      recovery: { commandId: "command.recover" },
    },
  };
  const reply = {
    ...response,
    operation: "writer.recover.receipt",
    requestDigest: createAgentOsWorkerAuthorityRequestDigestV1(recovery),
    receipt: { ...receipt, claimFence: 2 },
  };
  expect(parseAgentOsWorkerAuthorityRequestV1(recovery)).toEqual(recovery);
  expect(() =>
    assertAgentOsWorkerAuthorityResponseBindingV1(recovery, reply),
  ).not.toThrow();
  expect(() =>
    assertAgentOsWorkerAuthorityResponseBindingV1(recovery, {
      ...reply,
      receipt,
    }),
  ).toThrow();
});

test("consumption binds the operation digest, exact fence, and consumed state", () => {
  const consume = {
    ...request,
    operation: "writer.consume",
    payload: {
      ...identity,
      claimFence: 1,
      operationDigest: `sha256:${"a".repeat(64)}`,
    },
  };
  const reply = {
    ...response,
    operation: "writer.consume.receipt",
    requestDigest: createAgentOsWorkerAuthorityRequestDigestV1(consume),
    receipt: { ...receipt, state: "consumed" },
  };
  expect(() =>
    assertAgentOsWorkerAuthorityResponseBindingV1(consume, reply),
  ).not.toThrow();
  expect(() =>
    assertAgentOsWorkerAuthorityResponseBindingV1(
      {
        ...consume,
        payload: {
          ...consume.payload,
          operationDigest: `sha256:${"b".repeat(64)}`,
        },
      },
      reply,
    ),
  ).toThrow();
  expect(() =>
    assertAgentOsWorkerAuthorityResponseBindingV1(consume, {
      ...reply,
      receipt: { ...reply.receipt, claimFence: 2 },
    }),
  ).toThrow();
  expect(() =>
    assertAgentOsWorkerAuthorityResponseBindingV1(consume, {
      ...reply,
      receipt,
    }),
  ).toThrow();
});

test("wire rejects unsupported versions, malformed time, oversized frames and mixed results", () => {
  expect(() =>
    parseAgentOsWorkerAuthorityRequestV1({
      ...request,
      schemaVersion: "morpheus-control/acceptance-transport/v2",
    }),
  ).toThrow();
  expect(() =>
    parseAgentOsWorkerAuthorityResponseV1({
      ...response,
      authorityNow: "2026-02-30T12:00:00.000Z",
    }),
  ).toThrow();
  expect(() =>
    parseAgentOsWorkerAuthorityResponseV1({ ...response, code: "UNAVAILABLE" }),
  ).toThrow();
  expect(() =>
    decodeAgentOsWorkerAuthorityRequestV1(" ".repeat(1_048_577)),
  ).toThrow();
  expect(() => decodeAgentOsWorkerAuthorityRequestV1("not-json")).toThrow();
});
