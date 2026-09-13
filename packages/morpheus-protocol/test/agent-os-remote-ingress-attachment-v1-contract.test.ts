import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
  AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION,
  AgentOsAttachmentV1ContractError,
  AgentOsRemoteIngressV1ContractError,
  createAgentOsRemoteIngressV1ProofSigningPayload,
  parseAgentOsAttachmentV1CommitResponse,
  parseAgentOsAttachmentV1Request,
  parseAgentOsRemoteIngressV1Proof,
  validateAgentOsRemoteIngressV1ProofWindow,
} from "../src/index.js";

const digest = (letter: string): `sha256:${string}` =>
  `sha256:${letter.repeat(64)}`;

function proof(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION,
    proofId: "proof.1",
    principal: "principal.owner",
    deviceId: "device.1",
    hostKind: "personal",
    operation: "turn.start",
    payloadDigest: digest("a"),
    nonce: "nonce.1",
    issuedAt: "2026-08-30T00:00:00.000Z",
    expiresAt: "2026-08-30T00:00:20.000Z",
    authorityEpoch: 1,
    keyId: "control-signing.1",
    signature: "ab".repeat(64),
    ...overrides,
  };
}

function expectIngressError(
  action: () => unknown,
): AgentOsRemoteIngressV1ContractError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsRemoteIngressV1ContractError);
    return error as AgentOsRemoteIngressV1ContractError;
  }
  throw new Error("expected a remote ingress contract error");
}

function expectAttachmentError(
  action: () => unknown,
): AgentOsAttachmentV1ContractError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsAttachmentV1ContractError);
    return error as AgentOsAttachmentV1ContractError;
  }
  throw new Error("expected an attachment contract error");
}

describe("agent-os-remote-ingress.v1 contract", () => {
  test("parses a valid proof and freezes it", () => {
    const parsed = parseAgentOsRemoteIngressV1Proof(proof());
    expect(parsed.proofId).toBe("proof.1");
    expect(parsed.hostKind).toBe("personal");
    expect(Object.isFrozen(parsed)).toBe(true);
    const withSession = parseAgentOsRemoteIngressV1Proof(
      proof({ sessionId: "session.1", hostKind: "worker" }),
    );
    expect(withSession.sessionId).toBe("session.1");
  });

  test("rejects unknown fields, bad schema, bad digest and bad timestamps", () => {
    expect(
      expectIngressError(() =>
        parseAgentOsRemoteIngressV1Proof(proof({ extra: 1 })),
      ).code,
    ).toBe("INVALID_SHAPE");
    expect(
      expectIngressError(() =>
        parseAgentOsRemoteIngressV1Proof(proof({ schemaVersion: "v2" })),
      ).code,
    ).toBe("INVALID_SCHEMA");
    expect(
      expectIngressError(() =>
        parseAgentOsRemoteIngressV1Proof(proof({ payloadDigest: "deadbeef" })),
      ).code,
    ).toBe("INVALID_VALUE");
    expect(
      expectIngressError(() =>
        parseAgentOsRemoteIngressV1Proof(
          proof({ issuedAt: "2026-08-30 00:00:00" }),
        ),
      ).code,
    ).toBe("INVALID_VALUE");
    expect(
      expectIngressError(() =>
        parseAgentOsRemoteIngressV1Proof(proof({ hostKind: "edge" })),
      ).code,
    ).toBe("INVALID_VALUE");
  });

  test("rejects missing or malformed signing key bindings", () => {
    // 缺少 keyId/signature 的未签名 proof 一律拒绝（S01：签发方真实性强制）。
    const { keyId: _keyId, ...unsigned } = proof();
    expect(
      expectIngressError(() => parseAgentOsRemoteIngressV1Proof(unsigned)).code,
    ).toBe("INVALID_SHAPE");
    const { signature: _signature, ...unsignedProof } = proof();
    expect(
      expectIngressError(() => parseAgentOsRemoteIngressV1Proof(unsignedProof))
        .code,
    ).toBe("INVALID_SHAPE");
    expect(
      expectIngressError(() =>
        parseAgentOsRemoteIngressV1Proof(proof({ signature: "zz".repeat(64) })),
      ).code,
    ).toBe("INVALID_VALUE");
    expect(
      expectIngressError(() =>
        parseAgentOsRemoteIngressV1Proof(proof({ signature: "ab".repeat(63) })),
      ).code,
    ).toBe("INVALID_VALUE");
    expect(
      expectIngressError(() =>
        parseAgentOsRemoteIngressV1Proof(proof({ keyId: "" })),
      ).code,
    ).toBe("INVALID_VALUE");
  });

  test("builds a deterministic canonical signing payload that excludes the signature", () => {
    const parsed = parseAgentOsRemoteIngressV1Proof(proof());
    const { signature: _signature, ...unsigned } = parsed;
    const payload = createAgentOsRemoteIngressV1ProofSigningPayload(unsigned);
    const expected = JSON.stringify({
      authorityEpoch: 1,
      deviceId: "device.1",
      expiresAt: "2026-08-30T00:00:20.000Z",
      hostKind: "personal",
      issuedAt: "2026-08-30T00:00:00.000Z",
      keyId: "control-signing.1",
      nonce: "nonce.1",
      operation: "turn.start",
      payloadDigest: digest("a"),
      principal: "principal.owner",
      proofId: "proof.1",
      schemaVersion: AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION,
    });
    expect(new TextDecoder().decode(payload)).toBe(expected);
    // 可选 sessionId 参与规范编码；字段顺序不影响输出。
    const withSession = parseAgentOsRemoteIngressV1Proof(
      proof({ sessionId: "session.1" }),
    );
    const { signature: _ignored, ...unsignedSession } = withSession;
    const sessionPayload =
      createAgentOsRemoteIngressV1ProofSigningPayload(unsignedSession);
    expect(
      new TextDecoder()
        .decode(sessionPayload)
        .includes('"sessionId":"session.1"'),
    ).toBe(true);
  });

  test("validates the proof window and fails closed", () => {
    const valid = proof();
    expect(
      validateAgentOsRemoteIngressV1ProofWindow(
        parseAgentOsRemoteIngressV1Proof(valid),
        "2026-08-30T00:00:10.000Z",
      ),
    ).toBe("valid");
    expect(
      expectIngressError(() =>
        validateAgentOsRemoteIngressV1ProofWindow(
          parseAgentOsRemoteIngressV1Proof(valid),
          "2026-08-30T00:00:21.000Z",
        ),
      ).code,
    ).toBe("PROOF_EXPIRED");
    expect(
      expectIngressError(() =>
        validateAgentOsRemoteIngressV1ProofWindow(
          parseAgentOsRemoteIngressV1Proof(valid),
          "2026-08-29T23:59:59.000Z",
        ),
      ).code,
    ).toBe("PROOF_WINDOW_INVALID");
    const overTtl = proof({
      issuedAt: "2026-08-30T00:00:00.000Z",
      expiresAt: "2026-08-30T00:00:31.000Z",
    });
    expect(
      expectIngressError(() =>
        validateAgentOsRemoteIngressV1ProofWindow(
          parseAgentOsRemoteIngressV1Proof(overTtl),
          "2026-08-30T00:00:10.000Z",
        ),
      ).code,
    ).toBe("PROOF_WINDOW_INVALID");
  });
});

describe("agent-os-attachment.v1 contract", () => {
  test("parses every attachment operation", () => {
    const init = {
      schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
      operation: "attachment.init",
      requestId: "request.init",
      sessionId: "session.1",
      uploadId: "upload.1",
      mime: "image/png",
      totalBytes: 1024,
      totalDigest: digest("a"),
    };
    const chunk = {
      schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
      operation: "attachment.chunk",
      requestId: "request.chunk",
      sessionId: "session.1",
      uploadId: "upload.1",
      chunkIndex: 0,
      chunkDigest: digest("b"),
    };
    const commit = {
      schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
      operation: "attachment.commit",
      requestId: "request.commit",
      sessionId: "session.1",
      uploadId: "upload.1",
    };
    const read = {
      schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
      operation: "attachment.read",
      requestId: "request.read",
      sessionId: "session.1",
      attachmentId: "attachment.1",
    };
    for (const request of [init, chunk, commit, read]) {
      const parsed = parseAgentOsAttachmentV1Request(request);
      expect(Object.isFrozen(parsed)).toBe(true);
    }
    const response = {
      schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
      operation: "attachment.commit",
      requestId: "request.commit",
      attachmentId: "attachment.1",
      digest: digest("c"),
    };
    expect(parseAgentOsAttachmentV1CommitResponse(response).attachmentId).toBe(
      "attachment.1",
    );
  });

  test("rejects unknown fields, bad schema, bad mime and range violations", () => {
    const init = {
      schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
      operation: "attachment.init",
      requestId: "request.init",
      sessionId: "session.1",
      uploadId: "upload.1",
      mime: "image/png",
      totalBytes: 1024,
      totalDigest: digest("a"),
    };
    expect(
      expectAttachmentError(() =>
        parseAgentOsAttachmentV1Request({ ...init, extra: true }),
      ).code,
    ).toBe("INVALID_SHAPE");
    expect(
      expectAttachmentError(() =>
        parseAgentOsAttachmentV1Request({
          ...init,
          schemaVersion: "agent-os-attachment.v2",
        }),
      ).code,
    ).toBe("INVALID_SCHEMA");
    expect(
      expectAttachmentError(() =>
        parseAgentOsAttachmentV1Request({ ...init, mime: "not a mime" }),
      ).code,
    ).toBe("INVALID_VALUE");
    expect(
      expectAttachmentError(() =>
        parseAgentOsAttachmentV1Request({
          ...init,
          totalBytes: 20_485_760,
        }),
      ).code,
    ).toBe("INVALID_VALUE");
    expect(
      expectAttachmentError(() =>
        parseAgentOsAttachmentV1Request({
          schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
          operation: "attachment.chunk",
          requestId: "request.chunk",
          sessionId: "session.1",
          uploadId: "upload.1",
          chunkIndex: 16,
          chunkDigest: digest("b"),
        }),
      ).code,
    ).toBe("INVALID_VALUE");
    expect(
      expectAttachmentError(() =>
        parseAgentOsAttachmentV1Request(base("attachment.tree.read")),
      ).code,
    ).toBe("UNKNOWN_OPERATION");
    expect(
      expectAttachmentError(() =>
        parseAgentOsAttachmentV1CommitResponse({
          schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
          operation: "attachment.read",
          requestId: "request.1",
          attachmentId: "attachment.1",
          digest: digest("c"),
        }),
      ).code,
    ).toBe("UNKNOWN_OPERATION");
  });
});

function base(operation: string): Record<string, unknown> {
  return {
    schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
    operation,
    requestId: "request.1",
    sessionId: "session.1",
  };
}
