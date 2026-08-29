import {
  AgentOsV1,
  createAgentOsV1CanonicalPromptCursor,
  createAgentOsV1CanonicalPromptSemanticBinding,
  createAgentOsV1CanonicalPromptSnapshot,
  parseAgentOsV1CanonicalPromptCancelRequest,
  parseAgentOsV1CanonicalPromptResponse,
  parseAgentOsV1CanonicalPromptStartRequest,
  type AgentOsV1CanonicalPromptResponse,
  type AgentOsV1ReferenceResponse,
} from "@xurunxin/morpheus-protocol";

import type {
  PromptCancelArguments,
  PromptCancelResponse,
  PromptStartArguments,
  PromptStartResponse,
} from "../src/index.js";

const NOW_TEXT = "2026-08-06T00:00:00.000Z";
const NOW = Date.parse(NOW_TEXT);
const START_REQUEST_ID = "request.sdk.fixture.start";
const CANCEL_REQUEST_ID = "request.sdk.fixture.cancel";
const RUN_ID = "run.sdk.fixture";
const ATTEMPT_ID = "attempt.sdk.fixture";
const INSTANCE_ID = "instance.sdk.fixture";
const CLAIM_ID = "claim.sdk.fixture";
const STREAM_EPOCH = "stream-epoch:sdk.fixture.1";
const DEFINITION_DIGEST = `sha256:${"1".repeat(64)}`;
const POLICY_DIGEST = `sha256:${"2".repeat(64)}`;
const CAPABILITY_DIGEST = `sha256:${"3".repeat(64)}`;
const RESULT_DIGEST = `sha256:${"4".repeat(64)}`;

export function createCanonicalPromptFixture(): {
  readonly startArguments: PromptStartArguments;
  readonly cancelArguments: PromptCancelArguments;
  readonly startResponse: PromptStartResponse;
  readonly cancelResponse: PromptCancelResponse;
} {
  const snapshot = AgentOsV1.parseAgentOsV1NegotiatedSnapshot({
    protocolId: "execution.v1",
    selectedVersion: "1.1",
    selectedFeatures: ["recover"],
    schemaVersion: "agent-os/v1",
    handlerVersion: "handler-execution-1.1.0",
  } satisfies AgentOsV1.AgentOsV1NegotiatedSnapshot);
  const grant = AgentOsV1.parseAgentOsV1ExecutionGrant({
    grantId: "grant.sdk.fixture",
    kind: "remote",
    issuer: "control.sdk.fixture",
    audience: ["kernel.execution"],
    authorityDomain: "authority.sdk.fixture",
    hostId: "host.sdk.fixture",
    deploymentId: "deployment.sdk.fixture",
    runId: RUN_ID,
    tenantId: "tenant.sdk.fixture",
    workloadId: "workload.sdk.fixture",
    attemptId: ATTEMPT_ID,
    instanceId: INSTANCE_ID,
    definitionDigest: DEFINITION_DIGEST,
    policyDigest: POLICY_DIGEST,
    capabilityDigest: CAPABILITY_DIGEST,
    keyId: "grant-key.sdk.fixture",
    rotationGeneration: "rotation:sdk.fixture",
    revocationGeneration: "revocation:sdk.fixture",
    scope: ["prompt.execute"],
    notBefore: "2026-08-05T23:59:00.000Z",
    expiresAt: "2026-08-06T00:05:00.000Z",
    sessionGrant: {
      grantId: "session-grant.sdk.fixture",
      principalId: "principal.sdk.fixture",
      scope: ["prompt.execute"],
      notBefore: "2026-08-05T23:59:00.000Z",
      expiresAt: "2026-08-06T00:05:00.000Z",
    },
    leaseBinding: {
      kind: "remote",
      leaseId: "lease.sdk.fixture",
      epoch: "lease-epoch:sdk.fixture",
      generation: 1,
      scope: ["prompt.execute"],
      notBefore: "2026-08-05T23:59:00.000Z",
      expiresAt: "2026-08-06T00:05:00.000Z",
    },
  } satisfies AgentOsV1.ExecutionGrant);
  const instance = AgentOsV1.parseAgentOsV1ExecutionInstance({
    instanceId: INSTANCE_ID,
    deploymentId: "deployment.sdk.fixture",
    hostId: "host.sdk.fixture",
    generation: 1,
    deploymentRevision: "revision.sdk.fixture",
    replicaOrdinal: 0,
    observedState: "running",
  } satisfies AgentOsV1.ExecutionInstance);
  const startBinding = createAgentOsV1CanonicalPromptSemanticBinding({
    requestId: START_REQUEST_ID,
    expectedRevision: 0,
    snapshot,
    payload: {
      schemaVersion: "agent-os-canonical-prompt/v1",
      operation: "prompt.start",
      runId: RUN_ID,
      turnId: "turn.sdk.fixture",
      attemptId: ATTEMPT_ID,
      instanceId: INSTANCE_ID,
      storeGeneration: 1,
      claimId: CLAIM_ID,
      requestedAt: NOW_TEXT,
      authority: {
        tenantId: grant.tenantId,
        workloadId: grant.workloadId,
        authorityDomain: grant.authorityDomain,
        audience: grant.audience,
        definitionDigest: grant.definitionDigest,
        policyDigest: grant.policyDigest,
        capabilityDigest: grant.capabilityDigest,
      },
      grant,
      instance,
      prompt: { messages: [{ role: "user", content: "hello" }] },
    } satisfies Omit<
      AgentOsV1.AgentOsV1CanonicalPromptStartRequest,
      "promptDigest" | "intentDigest"
    >,
  });
  const startPayload = parseAgentOsV1CanonicalPromptStartRequest(
    startBinding.payload,
  );
  const startEnvelope = AgentOsV1.parseAgentOsV1AuthorityRequestEnvelope({
    requestId: START_REQUEST_ID,
    deadline: "2026-08-06T00:01:00.000Z",
    expectedRevision: 0,
    authorityEnvelopeRef: startBinding.authorityEnvelopeRef,
  } satisfies AgentOsV1.AgentOsV1AuthorityRequestEnvelope);

  const cancelPayload = parseAgentOsV1CanonicalPromptCancelRequest({
    schemaVersion: "agent-os-canonical-prompt/v1",
    operation: "prompt.cancel",
    runId: RUN_ID,
    claimId: CLAIM_ID,
    claimFence: 1,
    reason: "SDK AbortSignal",
    resultDigest: RESULT_DIGEST,
    cancelledAt: NOW_TEXT,
  } satisfies AgentOsV1.AgentOsV1CanonicalPromptCancelRequest);
  const cancelBinding = createAgentOsV1CanonicalPromptSemanticBinding({
    requestId: CANCEL_REQUEST_ID,
    expectedRevision: 0,
    snapshot,
    payload: cancelPayload,
  });
  const cancelEnvelope = AgentOsV1.parseAgentOsV1AuthorityRequestEnvelope({
    requestId: CANCEL_REQUEST_ID,
    deadline: "2026-08-06T00:01:00.000Z",
    expectedRevision: 0,
    authorityEnvelopeRef: cancelBinding.authorityEnvelopeRef,
  } satisfies AgentOsV1.AgentOsV1AuthorityRequestEnvelope);

  return {
    startArguments: [
      startEnvelope,
      snapshot,
      startPayload,
      NOW,
    ] satisfies PromptStartArguments,
    cancelArguments: [
      cancelEnvelope,
      snapshot,
      cancelPayload,
      NOW,
    ] satisfies PromptCancelArguments,
    startResponse: createResponse(
      "prompt.start",
      "succeeded",
      START_REQUEST_ID,
    ),
    cancelResponse: createResponse(
      "prompt.cancel",
      "cancelled",
      CANCEL_REQUEST_ID,
    ),
  };
}

function createResponse(
  operation: AgentOsV1CanonicalPromptResponse["operation"],
  state: "succeeded" | "cancelled",
  requestId: string,
): PromptStartResponse {
  const snapshot = createAgentOsV1CanonicalPromptSnapshot({
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId: RUN_ID,
    attemptId: ATTEMPT_ID,
    instanceId: INSTANCE_ID,
    storeGeneration: 1,
    streamEpoch: STREAM_EPOCH,
    watermark: 0,
    state,
    terminal: true,
    updatedAt: NOW_TEXT,
  });
  const cursor = createAgentOsV1CanonicalPromptCursor({
    schemaVersion: "agent-os-canonical-prompt/v1",
    runId: RUN_ID,
    streamEpoch: STREAM_EPOCH,
    sequence: 0,
    watermark: 0,
  });
  const payload = parseAgentOsV1CanonicalPromptResponse({
    schemaVersion: "agent-os-canonical-prompt/v1",
    operation,
    disposition: "events",
    snapshot,
    events: [],
    cursor,
    replayed: false,
  } satisfies AgentOsV1CanonicalPromptResponse);
  return AgentOsV1.parseAgentOsV1ReferenceResponse(
    {
      protocolId: "execution.v1",
      requestId,
      status: "ok",
      payload,
    } satisfies AgentOsV1ReferenceResponse<AgentOsV1CanonicalPromptResponse>,
    "execution.v1",
    requestId,
    parseAgentOsV1CanonicalPromptResponse,
  );
}
