import { expect, test } from "bun:test";
import {
  createAgentOsInteractiveV4CommandFingerprint,
  type InteractiveV4InputReceipt,
  type InteractiveV4QueueSnapshot,
} from "@xurunxin/morpheus-protocol";
import {
  createInteractiveV4AppClient,
  transitionInteractiveV4Queue,
} from "../src/interactive-v4.js";

const schemaVersion = "agent-os-interactive.v4" as const;
const digest = `sha256:${"a".repeat(64)}` as const;
const owner = {
  sessionId: "s1",
  runId: "r1",
  turnId: "t1",
  bindingRevision: 1,
  fence: 1,
};
const item: InteractiveV4InputReceipt = {
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
  reason: null,
};
const snapshot: InteractiveV4QueueSnapshot = {
  owner,
  queueRevision: 1,
  inputs: [item],
};
const binding = {
  requestSnapshotId: "snap1",
  effectId: "e1",
  requestDigest: digest,
};
const capabilities = {
  schemaVersion,
  operation: "capability.read" as const,
  requestId: "cap1",
  capabilities: [
    {
      operation: "prompt.steer" as const,
      hostImplemented: true,
      runtimeImplemented: true,
      configured: true,
      authorized: true,
      ready: true,
    },
  ],
};

test("owner discovery requires queue-read capability and rejects another session without retry", async () => {
  const request = {
    schemaVersion,
    operation: "prompt.queue.owner.read",
    requestId: "owner1",
    sessionId: "s1",
  };
  const readCapability = {
    ...capabilities,
    capabilities: capabilities.capabilities.map((c) => ({
      ...c,
      operation: "prompt.queue.read" as const,
    })),
  };
  let calls = 0;
  const client = createInteractiveV4AppClient({
    request: () => {
      calls += 1;
      return { ...request, owner, sealed: false };
    },
  });
  await expect(client.request(request)).rejects.toThrow(
    "CAPABILITY_UNAVAILABLE",
  );
  expect(calls).toBe(0);
  expect(
    await client.request(request, { capabilities: readCapability }),
  ).toMatchObject({ owner });
  const wrong = createInteractiveV4AppClient({
    request: () => {
      calls += 1;
      return { ...request, sessionId: "other", owner: null, sealed: false };
    },
  });
  await expect(
    wrong.request(request, { capabilities: readCapability }),
  ).rejects.toThrow("OWNER_MISMATCH");
  expect(calls).toBe(2);
});

test("snapshot rebuild, duplicate idempotence, revision gaps, and owner mismatch", () => {
  expect(transitionInteractiveV4Queue(null, snapshot, owner).kind).toBe(
    "rebuild-required",
  );
  expect(
    transitionInteractiveV4Queue(null, snapshot, owner, "snapshot").kind,
  ).toBe("committed");
  expect(transitionInteractiveV4Queue(snapshot, snapshot, owner).kind).toBe(
    "committed",
  );
  expect(
    transitionInteractiveV4Queue(
      snapshot,
      { ...snapshot, queueRevision: 3 },
      owner,
    ),
  ).toEqual({ kind: "rebuild-required", reason: "revision-gap" });
  expect(
    transitionInteractiveV4Queue(snapshot, snapshot, { ...owner, fence: 2 })
      .kind,
  ).toBe("rebuild-required");
  expect(
    transitionInteractiveV4Queue(
      snapshot,
      { ...snapshot, inputs: [{ ...item, source: "system" }] },
      owner,
    ).kind,
  ).toBe("rebuild-required");
});
test("bound input never regresses, disappears, rebinds, or changes immutable identity", () => {
  const bound = {
    owner,
    queueRevision: 2,
    inputs: [{ ...item, queueRevision: 2, status: "bound", binding }],
  };
  const transition = transitionInteractiveV4Queue(snapshot, bound, owner);
  expect(transition.kind).toBe("committed");
  if (transition.kind !== "committed") return;
  const old = transition.state;
  for (const inputs of [
    [],
    [{ ...item, queueRevision: 3 }],
    [
      {
        ...old.inputs[0]!,
        queueRevision: 3,
        binding: { ...binding, effectId: "other" },
      },
    ],
    [{ ...old.inputs[0]!, queueRevision: 3, commandId: "changed" }],
    [{ ...old.inputs[0]!, queueRevision: 2, reason: "recovery-required" }],
  ])
    expect(
      transitionInteractiveV4Queue(
        old,
        { owner, queueRevision: 3, inputs },
        owner,
      ).kind,
    ).toBe("rebuild-required");
  expect(
    transitionInteractiveV4Queue(
      old,
      {
        owner,
        queueRevision: 4,
        inputs: [{ ...old.inputs[0]!, queueRevision: 4, status: "settled" }],
      },
      owner,
      "snapshot",
    ).kind,
  ).toBe("committed");
});

test("new input cannot reuse a retained command or accepted sequence", () => {
  for (const next of [
    { ...item, inputId: "new", commandId: "new-command", queueRevision: 2 },
    { ...item, inputId: "new", acceptedSequence: 2, queueRevision: 2 },
  ]) {
    const old = {
      ...snapshot,
      inputs: [{ ...item, status: "cancelled" as const }],
    };
    expect(
      transitionInteractiveV4Queue(
        old,
        { owner, queueRevision: 2, inputs: [next] },
        owner,
      ).kind,
    ).toBe("rebuild-required");
  }
});
test("explicit commands require capabilities and exact receipts; transport errors never trigger resends", async () => {
  let calls = 0;
  const unsigned = {
    schemaVersion,
    operation: "prompt.steer" as const,
    requestId: "req1",
    owner,
    inputId: "i1",
    instruction: "hello",
    command: { commandId: "c1", principal: "user1", payloadDigest: digest },
  };
  const request = {
    ...unsigned,
    command: {
      ...unsigned.command,
      payloadDigest: createAgentOsInteractiveV4CommandFingerprint(unsigned),
    },
  };
  const good = {
    schemaVersion,
    operation: "prompt.steer",
    requestId: "req1",
    owner,
    status: "accepted",
    reason: null,
    command: request.command,
    replayed: false,
    input: { ...item, payloadDigest: request.command.payloadDigest },
  };
  let response: unknown = good;
  const client = createInteractiveV4AppClient({
    request: () => {
      calls++;
      return response;
    },
  });
  await expect(client.request(request)).rejects.toThrow(
    "CAPABILITY_UNAVAILABLE",
  );
  expect(calls).toBe(0);
  await expect(client.request(unsigned, { capabilities })).rejects.toThrow(
    "DIGEST_MISMATCH",
  );
  expect(calls).toBe(0);
  await expect(client.request(request, { capabilities })).resolves.toEqual(
    good,
  );
  for (const change of [
    { input: { ...good.input, inputId: "other" } },
    { input: { ...good.input, source: "system" } },
    { owner: { ...owner, sessionId: "other" } },
    { command: { ...request.command, principal: "other" } },
  ]) {
    response = { ...good, ...change };
    await expect(client.request(request, { capabilities })).rejects.toThrow();
  }
  let sends = 0;
  const disconnected = createInteractiveV4AppClient({
    request: () => {
      sends++;
      throw new Error("disconnected");
    },
  });
  await expect(disconnected.request(request, { capabilities })).rejects.toThrow(
    "disconnected",
  );
  expect(sends).toBe(1);
});
