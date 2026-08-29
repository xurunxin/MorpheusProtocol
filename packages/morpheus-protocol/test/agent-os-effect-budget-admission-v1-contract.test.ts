import { createHash } from "node:crypto";
import { describe, expect, test } from "bun:test";
import {
  AGENT_OS_EFFECT_BUDGET_ADMISSION_APPLICATION_SCHEMA_V1,
  AgentOsV1ContractError,
  createAgentOsEffectBudgetAdmissionApplicationDigestV1,
  createAgentOsEffectBudgetAdmissionApplicationRefV1,
  createAgentOsEffectBudgetAdmissionApplicationV1,
  parseAgentOsEffectBudgetAdmissionApplicationV1,
  serializeAgentOsEffectBudgetAdmissionApplicationV1,
} from "../src/index.js";

const digest = (character: string) => `sha256:${character.repeat(64)}`;

const unsigned = Object.freeze({
  schemaVersion: AGENT_OS_EFFECT_BUDGET_ADMISSION_APPLICATION_SCHEMA_V1,
  commandId: "command.effect-1",
  effectId: "effect-1",
  reservationId: "reservation-1",
  requestDigest: digest("1"),
  reservationReceiptDigest: digest("2"),
  effectPermitDigest: digest("3"),
  kernelFenceDigest: digest("4"),
});

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(source[key])}`)
    .join(",")}}`;
}

describe("agent-os effect budget admission application v1", () => {
  test("重现 DAR-565 的确定性 bytes、ref 与标准 SHA-256", () => {
    const application = createAgentOsEffectBudgetAdmissionApplicationV1({
      commandId: unsigned.commandId,
      effectId: unsigned.effectId,
      reservationId: unsigned.reservationId,
      requestDigest: unsigned.requestDigest,
      reservationReceiptDigest: unsigned.reservationReceiptDigest,
      effectPermitDigest: unsigned.effectPermitDigest,
      kernelFenceDigest: unsigned.kernelFenceDigest,
    });
    const expectedDigest = `sha256:${createHash("sha256")
      .update(canonicalJson(unsigned))
      .digest("hex")}`;
    expect(application.applicationDigest).toBe(expectedDigest);
    expect(application.applicationRef).toBe(
      `agent-os-effect-budget-admission/v1/effect-1/reservation-1/${digest("1")}/${digest("2")}`,
    );
    expect(
      createAgentOsEffectBudgetAdmissionApplicationDigestV1(unsigned),
    ).toBe(expectedDigest);
    expect(createAgentOsEffectBudgetAdmissionApplicationRefV1(unsigned)).toBe(
      application.applicationRef,
    );
    expect(parseAgentOsEffectBudgetAdmissionApplicationV1(application)).toEqual(
      application,
    );
    expect(Object.isFrozen(application)).toBe(true);
    expect(
      serializeAgentOsEffectBudgetAdmissionApplicationV1(application),
    ).toBe(canonicalJson(application));
  });

  test("未知、缺失、非法和漂移输入全部 fail closed", () => {
    const application = createAgentOsEffectBudgetAdmissionApplicationV1({
      commandId: unsigned.commandId,
      effectId: unsigned.effectId,
      reservationId: unsigned.reservationId,
      requestDigest: unsigned.requestDigest,
      reservationReceiptDigest: unsigned.reservationReceiptDigest,
      effectPermitDigest: unsigned.effectPermitDigest,
      kernelFenceDigest: unsigned.kernelFenceDigest,
    });
    const invalid: unknown[] = [
      { ...application, secret: "raw" },
      { ...application, workspacePath: "C:/secret" },
      Object.fromEntries(
        Object.entries(application).filter(([key]) => key !== "commandId"),
      ),
      { ...application, effectId: "../effect" },
      { ...application, requestDigest: "sha256:not-a-digest" },
      { ...application, applicationRef: `${application.applicationRef}/drift` },
      { ...application, applicationDigest: digest("f") },
      Object.assign(Object.create(null), application),
      Object.assign(Object.create({ inherited: true }), application),
      Object.defineProperty({ ...application }, "commandId", {
        get: () => "command.effect-1",
      }),
      Object.assign({ ...application }, { [Symbol("hidden")]: true }),
    ];
    for (const value of invalid)
      expect(() =>
        parseAgentOsEffectBudgetAdmissionApplicationV1(value),
      ).toThrow(AgentOsV1ContractError);
  });

  test("unsigned constructors 同样拒绝额外字段和非普通对象", () => {
    expect(() =>
      createAgentOsEffectBudgetAdmissionApplicationDigestV1({
        ...unsigned,
        rawToken: "secret",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      createAgentOsEffectBudgetAdmissionApplicationRefV1(
        Object.assign(Object.create(null), unsigned),
      ),
    ).toThrow(AgentOsV1ContractError);
  });
});
