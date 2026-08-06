import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  AGENT_OS_V1_DESTRUCTIVE_CONFIRMATION_MAX_TTL_MS,
  AGENT_OS_V1_DESTRUCTIVE_STEP_UP_PROOF_MAX_TTL_MS,
  AgentOsV1ContractError,
  createAgentOsV1CanonicalPromptCursor,
  createAgentOsV1CanonicalPromptEvent,
  createAgentOsV1CanonicalPromptSnapshot,
  parseAgentOsV1AppProjectionPage,
  parseAgentOsV1DestructiveCommandConfirmation,
  parseAgentOsV1DestructiveCommandIntent,
  parseAgentOsV1DestructiveCommandReceipt,
  parseAgentOsV1DestructiveCommandStepUpProof,
  parseAgentOsV1DestructiveCommandSubmission,
  parseAgentOsV1TerminalFrame,
  serializeAgentOsV1TerminalFrame,
} from "../src/agent-os-v1-contract.js";

function digest(seed: string): string {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function promptPage() {
  const event = createAgentOsV1CanonicalPromptEvent({
    schemaVersion: "agent-os-canonical-prompt/v1",
    eventId: "event.delivery.1",
    runId: "run.delivery",
    attemptId: "attempt.delivery",
    streamEpoch: "stream-epoch:delivery.1",
    sequence: 1,
    eventType: "provider.output",
    payload: { text: "hello" },
    createdAt: "2026-08-06T00:00:01.000Z",
  });
  const snapshot = createAgentOsV1CanonicalPromptSnapshot({
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId: "run.delivery",
    attemptId: "attempt.delivery",
    instanceId: "instance.delivery",
    storeGeneration: 1,
    streamEpoch: "stream-epoch:delivery.1",
    watermark: 1,
    state: "running",
    terminal: false,
    updatedAt: "2026-08-06T00:00:01.000Z",
  });
  const cursor = createAgentOsV1CanonicalPromptCursor({
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId: "run.delivery",
    streamEpoch: "stream-epoch:delivery.1",
    sequence: 1,
    watermark: 1,
  });
  return {
    schemaVersion: "agent-os-app-projection/v1" as const,
    tenantId: "tenant.delivery",
    authorityEpoch: "authority-epoch:delivery.1" as const,
    lifecycle: "connected-managed" as const,
    compatibility: "compatible" as const,
    response: {
      schemaVersion: "agent-os-canonical-prompt/v1" as const,
      operation: "prompt.read" as const,
      disposition: "snapshot-required" as const,
      snapshot,
      events: [event],
      cursor,
      replayed: false,
    },
  };
}

describe("Agent OS v1 App delivery DTO authority", () => {
  test("strictly parses, copies and freezes an atomic App projection page", () => {
    const input = promptPage();
    const parsed = parseAgentOsV1AppProjectionPage(input);

    expect(parsed).toEqual(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.response.events)).toBe(true);
    expect(parsed).not.toBe(input);
    expect(() => parseAgentOsV1AppProjectionPage({ ...input, cacheKey: "local" })).toThrow(
      AgentOsV1ContractError
    );
    expect(() =>
      parseAgentOsV1AppProjectionPage({
        ...input,
        authorityEpoch: "delivery.1",
      })
    ).toThrow(AgentOsV1ContractError);
  });

  test("owns strict versioned JSONL frame parsing and canonical serialization", () => {
    const frame = {
      schemaVersion: "terminal-jsonl.v1" as const,
      requestId: "request.delivery.1",
      kind: "terminal" as const,
      sequence: 2,
      timestamp: "2026-08-06T00:00:02.000Z",
      runId: "run.delivery",
      status: "cancelled" as const,
      exitCode: 130 as const,
    };

    expect(parseAgentOsV1TerminalFrame(frame)).toEqual(frame);
    expect(serializeAgentOsV1TerminalFrame(frame)).toBe(`${JSON.stringify(frame)}\n`);
    expect(() => parseAgentOsV1TerminalFrame({ ...frame, exitCode: 0 })).toThrow(
      AgentOsV1ContractError
    );
    expect(() => parseAgentOsV1TerminalFrame({ ...frame, token: "secret" })).toThrow(
      AgentOsV1ContractError
    );
  });

  test("strictly binds destructive confirmation, submission and no-effect receipt DTOs", () => {
    const intent = parseAgentOsV1DestructiveCommandIntent({
      schemaVersion: "agent-os-destructive-command/v1",
      tenantId: "tenant.demo",
      targets: ["deployment:demo", "run:demo"],
      commandId: "command.demo",
      operation: "deployment.delete",
      commandDigest: digest("command.demo"),
      expectedRevision: 4,
      idempotencyKey: "idempotency:demo.1",
      risk: "critical",
      reason: "Remove the compromised deployment.",
      requestId: "request.demo.1",
      authority: {
        ref: "authority:operator.demo",
        digest: digest("authority.operator.demo"),
      },
    });
    const confirmation = parseAgentOsV1DestructiveCommandConfirmation({
      schemaVersion: "agent-os-destructive-command/v1",
      confirmationRef: "confirmation:demo.1",
      stepUpRef: "step-up:demo.1",
      ...intent,
      issuedAt: "2026-08-06T00:00:00.000Z",
      expiresAt: "2026-08-06T00:01:00.000Z",
    });
    const stepUpProof = parseAgentOsV1DestructiveCommandStepUpProof({
      schemaVersion: "agent-os-destructive-command/v1",
      confirmationRef: confirmation.confirmationRef,
      stepUpRef: confirmation.stepUpRef,
      stepUpProofRef: "step-up-proof:demo.1",
      tenantId: confirmation.tenantId,
      targets: confirmation.targets,
      commandId: confirmation.commandId,
      operation: confirmation.operation,
      commandDigest: confirmation.commandDigest,
      expectedRevision: confirmation.expectedRevision,
      idempotencyKey: confirmation.idempotencyKey,
      risk: confirmation.risk,
      reason: confirmation.reason,
      requestId: confirmation.requestId,
      authority: confirmation.authority,
      completedAt: "2026-08-06T00:00:20.000Z",
      expiresAt: confirmation.expiresAt,
    });
    const submission = parseAgentOsV1DestructiveCommandSubmission({
      schemaVersion: "agent-os-destructive-command/v1",
      confirmationRef: confirmation.confirmationRef,
      stepUpRef: confirmation.stepUpRef,
      stepUpProofRef: stepUpProof.stepUpProofRef,
      tenantId: intent.tenantId,
      targets: intent.targets,
      commandId: intent.commandId,
      operation: intent.operation,
      commandDigest: intent.commandDigest,
      expectedRevision: intent.expectedRevision,
      idempotencyKey: intent.idempotencyKey,
      risk: intent.risk,
      reason: intent.reason,
      requestId: intent.requestId,
      authority: intent.authority,
      submittedAt: "2026-08-06T00:00:30.000Z",
    });
    const receipt = parseAgentOsV1DestructiveCommandReceipt({
      schemaVersion: "agent-os-destructive-command/v1",
      receiptRef: "receipt:demo.1",
      confirmationRef: submission.confirmationRef,
      stepUpProofRef: submission.stepUpProofRef,
      tenantId: intent.tenantId,
      targets: intent.targets,
      commandId: intent.commandId,
      operation: intent.operation,
      commandDigest: intent.commandDigest,
      expectedRevision: intent.expectedRevision,
      idempotencyKey: intent.idempotencyKey,
      risk: intent.risk,
      commandReason: intent.reason,
      requestId: intent.requestId,
      authority: intent.authority,
      status: "accepted-no-effect",
      reason: null,
      effectPerformed: false,
    });

    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(confirmation)).toBe(true);
    expect(Object.isFrozen(stepUpProof)).toBe(true);
    expect(Object.isFrozen(submission)).toBe(true);
    expect(receipt.status).toBe("accepted-no-effect");
    expect(() =>
      parseAgentOsV1DestructiveCommandReceipt({ ...receipt, effectPerformed: true })
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1DestructiveCommandConfirmation({
        ...confirmation,
        expiresAt: confirmation.issuedAt,
      })
    ).toThrow(AgentOsV1ContractError);
  });

  test("fails closed when confirmation or step-up proof exceeds the named five-minute TTL", () => {
    expect(AGENT_OS_V1_DESTRUCTIVE_CONFIRMATION_MAX_TTL_MS).toBe(5 * 60 * 1_000);
    expect(AGENT_OS_V1_DESTRUCTIVE_STEP_UP_PROOF_MAX_TTL_MS).toBe(5 * 60 * 1_000);
    const confirmation = {
      schemaVersion: "agent-os-destructive-command/v1" as const,
      confirmationRef: "confirmation:ttl.1",
      stepUpRef: "step-up:ttl.1",
      tenantId: "tenant.demo",
      targets: ["deployment:demo"],
      commandId: "command.ttl",
      operation: "deployment.delete",
      commandDigest: digest("command.ttl"),
      expectedRevision: 4,
      idempotencyKey: "idempotency:ttl.1",
      risk: "critical" as const,
      reason: "Remove the compromised deployment.",
      requestId: "request.ttl.1",
      authority: {
        ref: "authority:operator.demo",
        digest: digest("authority.operator.demo"),
      },
      issuedAt: "2026-08-06T00:00:00.000Z",
      expiresAt: "2026-08-06T00:05:00.000Z",
    };

    expect(parseAgentOsV1DestructiveCommandConfirmation(confirmation).expiresAt).toBe(
      confirmation.expiresAt
    );
    expect(() =>
      parseAgentOsV1DestructiveCommandConfirmation({
        ...confirmation,
        expiresAt: "2026-08-06T00:05:00.001Z",
      })
    ).toThrow(AgentOsV1ContractError);

    const proof = {
      schemaVersion: "agent-os-destructive-command/v1" as const,
      confirmationRef: confirmation.confirmationRef,
      stepUpRef: confirmation.stepUpRef,
      stepUpProofRef: "step-up-proof:ttl.1",
      tenantId: confirmation.tenantId,
      targets: confirmation.targets,
      commandId: confirmation.commandId,
      operation: confirmation.operation,
      commandDigest: confirmation.commandDigest,
      expectedRevision: confirmation.expectedRevision,
      idempotencyKey: confirmation.idempotencyKey,
      risk: confirmation.risk,
      reason: confirmation.reason,
      requestId: confirmation.requestId,
      authority: confirmation.authority,
      completedAt: "2026-08-06T00:00:00.000Z",
      expiresAt: "2026-08-06T00:05:00.000Z",
    };
    expect(parseAgentOsV1DestructiveCommandStepUpProof(proof).expiresAt).toBe(proof.expiresAt);
    expect(() =>
      parseAgentOsV1DestructiveCommandStepUpProof({
        ...proof,
        expiresAt: "2026-08-06T00:05:00.001Z",
      })
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1DestructiveCommandStepUpProof({
        ...proof,
        confirmationRef: undefined,
      })
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsV1DestructiveCommandStepUpProof({
        ...proof,
        localApproval: true,
      })
    ).toThrow(AgentOsV1ContractError);
  });
});
