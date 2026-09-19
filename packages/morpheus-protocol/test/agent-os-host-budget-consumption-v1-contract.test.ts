import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  createAgentOsHostBudgetConsumptionV1,
  parseAgentOsHostBudgetConsumptionV1,
  serializeAgentOsHostBudgetConsumptionV1,
  assertAgentOsHostBudgetConsumptionRelationshipV1,
  createAgentOsHostBudgetGrantDigestV1,
  createAgentOsBudgetCurrentStateDigestV1,
  parseAgentOsBudgetCurrentStateV1,
} from "../src/index.js";
import {
  hostBudgetProofFixture,
  proofEnd,
  proofZero,
} from "./fixtures/host-budget-consumption.js";

const digest = (character: string) => `sha256:${character.repeat(64)}`;
const input = {
  commandId: "consume.one",
  consumerId: "consumer.one",
  claimRevision: 1 as const,
  controlId: "control.one",
  grantId: "grant.one",
  grantDigest: digest("1"),
  reservationId: "reservation.one",
  requestDigest: digest("2"),
  reservationReceiptDigest: digest("3"),
  reservationStateDigest: digest("4"),
  hostId: "host.one",
  storeId: "store.one",
  storeGeneration: 2,
  rootRunId: "run.host-scope",
  rootAttemptId: "attempt.one",
  definitionDigest: digest("1"),
  policyDigest: digest("2"),
  capabilityDigest: digest("3"),
  budgetTreeRootRunId: "run.budget-root",
  instanceId: "instance.one",
  instanceGeneration: 1,
  placementId: "placement.one",
  placementRevision: 1,
  leaseId: "lease.one",
  leaseEpoch: "lease-epoch:one" as const,
  scope: ["prompt.execute", "tool.execute"],
  allowedEffectKinds: [
    "provider.compact",
    "provider.llm",
    "tool.dispatch",
  ] as const,
  allowRetry: true,
  createdAt: "2026-09-20T00:00:00.000Z",
  expiresAt: "2026-09-20T01:00:00.000Z",
};

test("消费绑定使用规范 bytes 和标准 SHA-256，冻结副本不授予权限", () => {
  const binding = createAgentOsHostBudgetConsumptionV1(input);
  const encoded = serializeAgentOsHostBudgetConsumptionV1(binding);
  expect(parseAgentOsHostBudgetConsumptionV1(JSON.parse(encoded))).toEqual(
    binding,
  );
  const source: Record<string, unknown> = JSON.parse(encoded);
  delete source.bindingDigest;
  expect(binding.bindingDigest).toBe(
    `sha256:${createHash("sha256").update(JSON.stringify(source)).digest("hex")}`,
  );
  expect(Object.isFrozen(binding)).toBe(true);
  expect(Object.isFrozen(binding.scope)).toBe(true);
  expect(Object.isFrozen(input.scope)).toBe(false);
  expect(binding.rootRunId).not.toBe(binding.budgetTreeRootRunId);
});

for (const changed of [
  { schemaVersion: "agent-os-host-budget-consumption/v2" },
  { extra: true },
  { consumptionKind: "worker-fleet" },
  { lineageRule: "any-descendant" },
  { claimRevision: 0 },
  { claimRevision: 2 },
  { storeGeneration: -1 },
  { instanceGeneration: 0.5 },
  { expiresAt: input.createdAt },
  { createdAt: "2026-09-20T00:00:00Z" },
  { hostId: "../another-host" },
  { leaseEpoch: "epoch:1" },
  { leaseEpoch: "lease-epoch:1" },
  { scope: [] },
  { scope: ["tool.execute", "prompt.execute"] },
  { scope: ["prompt.execute", "prompt.execute"] },
  { allowedEffectKinds: ["delegate"] },
  { allowedEffectKinds: ["tool", "provider"] },
  { grantDigest: digest("f") },
  { storeId: "store.other" },
  { rootRunId: "run.other" },
]) {
  test(`消费绑定拒绝无效字段或身份漂移 ${JSON.stringify(changed)}`, () => {
    expect(() =>
      parseAgentOsHostBudgetConsumptionV1({
        ...createAgentOsHostBudgetConsumptionV1(input),
        ...changed,
      }),
    ).toThrow();
  });
}

test("完整 grant/instance/预算 owner 关系通过，父 store generation 不等于目标 Host", () => {
  const proof = hostBudgetProofFixture();
  expect(proof.request.subject.storeGeneration).not.toBe(
    proof.binding.storeGeneration,
  );
  expect(() =>
    assertAgentOsHostBudgetConsumptionRelationshipV1(proof),
  ).not.toThrow();
  const reversed = Object.fromEntries(Object.entries(proof.grant).reverse());
  expect(createAgentOsHostBudgetGrantDigestV1(reversed)).toBe(
    proof.binding.grantDigest,
  );
  const slash = createAgentOsHostBudgetConsumptionV1({
    ...input,
    hostId: "host/one",
    scope: ["tool/read"],
  });
  expect(parseAgentOsHostBudgetConsumptionV1(slash).hostId).toBe("host/one");
});

for (const field of [
  "grant",
  "lease",
  "instance",
  "consumer",
  "reservation",
  "window",
  "scope",
  "fence",
]) {
  test(`有效对象交叉替换或范围漂移 ${field} 被拒绝`, () => {
    const proof = hostBudgetProofFixture();
    const changed = {
      ...proof,
      ...(field === "grant"
        ? {
            grant: { ...proof.grant, runId: "run.other" },
            binding: createAgentOsHostBudgetConsumptionV1({
              ...proof.bindingInput,
              grantDigest: createAgentOsHostBudgetGrantDigestV1({
                ...proof.grant,
                runId: "run.other",
              }),
            }),
          }
        : {}),
      ...(field === "lease"
        ? {
            grant: {
              ...proof.grant,
              leaseBinding: {
                ...proof.grant.leaseBinding,
                epoch: "lease-epoch:other",
              },
            },
          }
        : {}),
      ...(field === "instance"
        ? { instance: { ...proof.instance, generation: 2 } }
        : {}),
      ...(field === "consumer"
        ? { consumer: { ...proof.consumer, storeId: "store.other" } }
        : {}),
      ...(field === "reservation"
        ? {
            binding: createAgentOsHostBudgetConsumptionV1({
              ...proof.bindingInput,
              reservationId: "reservation.other",
            }),
          }
        : {}),
      ...(field === "window" ? { now: proofEnd } : {}),
      ...(field === "scope"
        ? {
            binding: createAgentOsHostBudgetConsumptionV1({
              ...proof.bindingInput,
              scope: ["prompt.execute"],
            }),
          }
        : {}),
      ...(field === "fence" ? { admissionKernelFenceDigest: digest("f") } : {}),
    };
    expect(() =>
      assertAgentOsHostBudgetConsumptionRelationshipV1(changed),
    ).toThrow();
  });
}

test("重算摘要也不能以多 Host audience 或 tool.read 扩大派发权限", () => {
  for (const mode of ["audience", "tool"]) {
    const proof = hostBudgetProofFixture();
    const scope =
      mode === "tool"
        ? ["prompt.execute", "tool.read"]
        : [...proof.grant.scope];
    const grant = {
      ...proof.grant,
      audience:
        mode === "audience"
          ? [proof.binding.hostId, "host.other"]
          : proof.grant.audience,
      scope,
      sessionGrant: { ...proof.grant.sessionGrant, scope },
      leaseBinding: { ...proof.grant.leaseBinding, scope },
    };
    const binding = createAgentOsHostBudgetConsumptionV1({
      ...proof.bindingInput,
      scope,
      grantDigest: createAgentOsHostBudgetGrantDigestV1(grant),
    });
    expect(() =>
      assertAgentOsHostBudgetConsumptionRelationshipV1({
        ...proof,
        grant,
        binding,
      }),
    ).toThrow();
  }
});

for (const field of [
  "rootAttemptId",
  "definitionDigest",
  "policyDigest",
  "capabilityDigest",
] as const) {
  test(`同一 Run 的真实 Host 根 ${field} 不同仍须拒绝`, () => {
    const proof = hostBudgetProofFixture();
    const replacement =
      field === "rootAttemptId" ? "attempt.other" : digest("f");
    const consumer = { ...proof.consumer, [field]: replacement };
    expect(() =>
      assertAgentOsHostBudgetConsumptionRelationshipV1({ ...proof, consumer }),
    ).toThrow();
    const binding = createAgentOsHostBudgetConsumptionV1({
      ...proof.bindingInput,
      [field]: replacement,
    });
    expect(() =>
      assertAgentOsHostBudgetConsumptionRelationshipV1({
        ...proof,
        consumer,
        binding,
      }),
    ).toThrow();
  });
}

for (const field of ["closed", "owner", "subdivided"]) {
  test(`即使重算 current state 和 binding 摘要，${field} 预留不可认领`, () => {
    const proof = hostBudgetProofFixture();
    const source = {
      ...proof.stateSource,
      ...(field === "closed"
        ? {
            ownerDisposition: "closed" as const,
            available: proofZero,
            releasedTotal: proof.receipt.reserved,
            reservationRevision: 2,
          }
        : {}),
      ...(field === "owner" ? { ownerReservationId: "reservation.other" } : {}),
      ...(field === "subdivided"
        ? { balanceRevision: 1, available: proofZero }
        : {}),
    };
    const state = parseAgentOsBudgetCurrentStateV1({
      ...source,
      stateDigest: createAgentOsBudgetCurrentStateDigestV1(source),
    });
    const binding = createAgentOsHostBudgetConsumptionV1({
      ...proof.bindingInput,
      reservationStateDigest: state.stateDigest,
    });
    expect(() =>
      assertAgentOsHostBudgetConsumptionRelationshipV1({
        ...proof,
        binding,
        reservationState: state,
      }),
    ).toThrow();
  });
}

test("稀疏数组、accessor 和 symbol 字段不会进入消费绑定", () => {
  const binding = createAgentOsHostBudgetConsumptionV1(input);
  expect(() =>
    parseAgentOsHostBudgetConsumptionV1({ ...binding, scope: new Array(1) }),
  ).toThrow();
  let invoked = false;
  const scope = ["prompt.execute"];
  Object.defineProperty(scope, "0", {
    get() {
      invoked = true;
      return "prompt.execute";
    },
  });
  expect(() =>
    parseAgentOsHostBudgetConsumptionV1({ ...binding, scope }),
  ).toThrow();
  expect(invoked).toBe(false);
  expect(() =>
    parseAgentOsHostBudgetConsumptionV1({
      ...binding,
      [Symbol("hidden")]: true,
    }),
  ).toThrow();
});
