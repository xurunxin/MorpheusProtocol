import { describe, expect, test } from "bun:test";
import {
  AGENT_OS_INTERACTIVE_V4_SCHEMA_VERSION as schemaVersion,
  createAgentOsInteractiveV4CommandFingerprint,
  decodeAgentOsInteractiveV4Request,
  parseAgentOsInteractiveV3Request,
  parseAgentOsInteractiveRequest,
  parseAgentOsInteractiveV2Request,
  parseAgentOsInteractiveV4Request,
  parseAgentOsInteractiveV4Response,
  parseInteractiveV4InputReceipt,
  parseInteractiveV4QueueSnapshot,
  serializeAgentOsInteractiveV4Request,
} from "../src/index.js";

const owner = {
  sessionId: "s1",
  runId: "r1",
  turnId: "t1",
  bindingRevision: 3,
  fence: 7,
};
const digest = `sha256:${"a".repeat(64)}` as const;
const request = {
  schemaVersion,
  operation: "prompt.steer",
  requestId: "req1",
  owner,
  command: { commandId: "c1", principal: "user1", payloadDigest: digest },
  inputId: "i1",
  instruction: "下一步请保留约束",
};
const receipt = {
  inputId: "i1",
  requestId: "req1",
  commandId: "c1",
  payloadDigest: digest,
  owner,
  source: "user",
  kind: "steer",
  acceptedSequence: 1,
  queueRevision: 1,
  status: "queued",
  binding: null,
  reason: "waiting-safe-boundary",
};

describe("Harness v4 input contract", () => {
  test("owner discovery carries Host-issued lineage and rejects cross-session or forged request owners", () => {
    const read = {
      schemaVersion,
      operation: "prompt.queue.owner.read",
      requestId: "owner1",
      sessionId: "s1",
    };
    expect(parseAgentOsInteractiveV4Request(read)).toEqual(read);
    expect(() =>
      parseAgentOsInteractiveV4Request({ ...read, owner }),
    ).toThrow();
    expect(
      parseAgentOsInteractiveV4Response({ ...read, owner, sealed: false }),
    ).toMatchObject({ owner });
    expect(
      parseAgentOsInteractiveV4Response({
        ...read,
        owner: null,
        sealed: false,
      }),
    ).toMatchObject({ owner: null });
    expect(() =>
      parseAgentOsInteractiveV4Response({
        ...read,
        owner: { ...owner, sessionId: "other" },
        sealed: false,
      }),
    ).toThrow();
    expect(() =>
      parseAgentOsInteractiveV4Response({ ...read, owner: null, sealed: true }),
    ).toThrow();
  });
  test("published JSON fixtures retain exact command identity and all six states", async () => {
    const fixture = (await Bun.file(
      new URL("./fixtures/interactive-v4.json", import.meta.url),
    ).json()) as { request: typeof request; receipts: unknown[] };
    expect(createAgentOsInteractiveV4CommandFingerprint(fixture.request)).toBe(
      fixture.request.command.payloadDigest,
    );
    expect(
      fixture.receipts.map(
        (value) => parseInteractiveV4InputReceipt(value).status,
      ),
    ).toEqual([
      "queued",
      "bound",
      "unknown",
      "settled",
      "cancelled",
      "rejected",
    ]);
  });
  test("canonical codec preserves UTF-8, snapshots ownership, and binds command content", () => {
    const parsed = parseAgentOsInteractiveV4Request(request);
    expect(
      decodeAgentOsInteractiveV4Request(
        serializeAgentOsInteractiveV4Request(parsed),
      ),
    ).toEqual(parsed);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect("owner" in parsed && Object.isFrozen(parsed.owner)).toBe(true);
    const fp = createAgentOsInteractiveV4CommandFingerprint(request);
    expect(
      createAgentOsInteractiveV4CommandFingerprint({
        ...request,
        command: { ...request.command, payloadDigest: fp },
      }),
    ).toBe(fp);
    for (const changed of [
      { ...request, instruction: "different" },
      { ...request, inputId: "other" },
      { ...request, owner: { ...owner, fence: 8 } },
      { ...request, owner: { ...owner, bindingRevision: 4 } },
    ])
      expect(createAgentOsInteractiveV4CommandFingerprint(changed)).not.toBe(
        fp,
      );
  });
  test("old parsers reject the new profile; source cannot be forged by callers", () => {
    expect(() => parseAgentOsInteractiveV3Request(request)).toThrow();
    expect(() => parseAgentOsInteractiveRequest(request)).toThrow();
    expect(() => parseAgentOsInteractiveV2Request(request)).toThrow();
    for (const field of ["source", "binding", "status", "capabilities"])
      expect(() =>
        parseAgentOsInteractiveV4Request({ ...request, [field]: "system" }),
      ).toThrow();
    expect(() =>
      parseAgentOsInteractiveV4Request({
        ...request,
        schemaVersion: "agent-os-interactive.v3",
      }),
    ).toThrow();
    expect(() =>
      parseAgentOsInteractiveV4Request({
        ...request,
        owner: { ...owner, fence: -1 },
      }),
    ).toThrow();
  });
  test("rejects getters without executing them, cycles, unsafe arrays and oversized payloads", () => {
    let calls = 0;
    const unsafe = {
      ...request,
      get source() {
        calls++;
        return "system";
      },
    };
    expect(() => parseAgentOsInteractiveV4Request(unsafe)).toThrow();
    expect(calls).toBe(0);
    const cycle: Record<string, unknown> = { ...request };
    cycle.cycle = cycle;
    expect(() => parseAgentOsInteractiveV4Request(cycle)).toThrow();
    expect(() =>
      parseAgentOsInteractiveV4Request({
        ...request,
        instruction: "中".repeat(22_000),
      }),
    ).toThrow();
    expect(() =>
      parseInteractiveV4QueueSnapshot({
        owner,
        queueRevision: 1,
        inputs: new Array(1),
      }),
    ).toThrow();
  });
  test("all consumption states have unambiguous binding evidence", () => {
    const binding = {
      requestSnapshotId: "snap1",
      effectId: "e1",
      requestDigest: digest,
    };
    for (const status of ["queued", "cancelled", "rejected"])
      expect(
        parseInteractiveV4InputReceipt({ ...receipt, status }).binding,
      ).toBeNull();
    for (const status of ["bound", "unknown", "settled"]) {
      expect(
        parseInteractiveV4InputReceipt({ ...receipt, status, binding }).binding,
      ).toEqual(binding);
      expect(() =>
        parseInteractiveV4InputReceipt({ ...receipt, status }),
      ).toThrow();
    }
    expect(() =>
      parseInteractiveV4InputReceipt({ ...receipt, binding }),
    ).toThrow();
  });
  test("snapshot rejects cross-owner, duplicate input/command, unsorted and future receipts", () => {
    const snapshot = { owner, queueRevision: 1, inputs: [receipt] };
    expect(parseInteractiveV4QueueSnapshot(snapshot).inputs).toHaveLength(1);
    for (const inputs of [
      [receipt, receipt],
      [{ ...receipt, owner: { ...owner, sessionId: "other" } }],
      [{ ...receipt, queueRevision: 2 }],
      [receipt, { ...receipt, inputId: "i2", acceptedSequence: 2 }],
    ])
      expect(() =>
        parseInteractiveV4QueueSnapshot({ ...snapshot, inputs }),
      ).toThrow();
  });
  test("success receipts and capabilities require end-to-end evidence", () => {
    const response = {
      schemaVersion,
      operation: "prompt.steer",
      requestId: "req1",
      owner,
      status: "accepted",
      reason: null,
      command: request.command,
      replayed: false,
      input: receipt,
    };
    expect(parseAgentOsInteractiveV4Response(response)).toEqual(response);
    for (const input of [
      null,
      { ...receipt, commandId: "wrong" },
      { ...receipt, kind: "follow-up" },
      { ...receipt, owner: { ...owner, fence: 8 } },
    ])
      expect(() =>
        parseAgentOsInteractiveV4Response({ ...response, input }),
      ).toThrow();
    const capability = {
      operation: "prompt.steer",
      hostImplemented: true,
      runtimeImplemented: false,
      configured: true,
      authorized: true,
      ready: true,
    };
    expect(() =>
      parseAgentOsInteractiveV4Response({
        schemaVersion,
        operation: "capability.read",
        requestId: "req1",
        capabilities: [capability],
      }),
    ).toThrow();
    expect(
      parseAgentOsInteractiveV4Response({
        schemaVersion,
        operation: "capability.read",
        requestId: "req1",
        capabilities: [{ ...capability, ready: false }],
      }),
    ).toBeDefined();
  });
  test("clear requires CAS, cancellation is separate, unsupported operations reject", () => {
    const common = {
      schemaVersion,
      requestId: "q",
      owner,
      command: request.command,
    };
    expect(
      parseAgentOsInteractiveV4Request({
        ...common,
        operation: "prompt.queue.clear",
        expectedRevision: 8,
      }),
    ).toBeDefined();
    expect(() =>
      parseAgentOsInteractiveV4Request({
        ...common,
        operation: "prompt.queue.clear",
      }),
    ).toThrow();
    expect(
      parseAgentOsInteractiveV4Request({
        ...common,
        operation: "turn.cancel",
        reason: "user",
      }),
    ).toBeDefined();
    expect(() =>
      parseAgentOsInteractiveV4Request({
        ...common,
        operation: "turn.start",
        instruction: "implicit fallback",
      }),
    ).toThrow();
  });
});
