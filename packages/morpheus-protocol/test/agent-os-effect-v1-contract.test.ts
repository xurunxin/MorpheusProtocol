import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  AgentOsV1ContractError,
  createAgentDefinitionDigest,
  createCapabilityPackageDescriptorDigest,
  type AgentOsV1Contract,
  type CapabilityPackageDescriptor,
  type ExecutionClaimBinding,
} from "../src/agent-os-v1-contract.js";
import {
  assertAgentOsEffectDispatchReceiptRelationshipV1,
  assertAgentOsEffectIntentAuthorityV1,
  assertAgentOsEffectPermitRelationshipV1,
  assertAgentOsEffectPermitRequestRelationshipV1,
  assertAgentOsUnknownEffectRecoveryDecisionRelationshipV1,
  createAgentOsEffectDispatchReceiptDigestV1,
  createAgentOsEffectIntentDigestV1,
  createAgentOsEffectPermitDigestV1,
  createAgentOsEffectPermitRequestDigestV1,
  createAgentOsUnknownEffectRecoveryDecisionDigestV1,
  parseAgentOsEffectDispatchReceiptV1,
  parseAgentOsEffectIntentV1,
  parseAgentOsEffectPermitRequestV1,
  parseAgentOsEffectPermitV1,
  parseAgentOsUnknownEffectRecoveryDecisionV1,
  serializeAgentOsEffectIntentV1,
} from "../src/agent-os-effect-v1-contract.js";
import type {
  AgentOsEffectAuthorityBindingV1,
  AgentOsEffectDispatchReceiptV1,
  AgentOsEffectDispatchReceiptUnsignedV1,
  AgentOsEffectIntentV1,
  AgentOsEffectPermitRequestV1,
  AgentOsEffectPermitV1,
  AgentOsEffectPermitUnsignedV1,
  AgentOsUnknownEffectRecoveryDecisionV1,
} from "../src/agent-os-effect-v1-types.js";
import {
  AgentOsEffectV1,
  parseAgentOsEffectIntentV1 as parseAgentOsEffectIntentV1FromPackage,
} from "../src/index.js";

function digest(seed: string): string {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function contractFixture(): AgentOsV1Contract {
  const unsignedPackage = {
    packageId: "pkg.effect-demo",
    version: "1.0" as const,
    provenance: { repository: "repo.effect-demo", revision: "rev.1" },
    signer: {
      keyId: "key.effect-demo",
      subject: "builder.demo",
      algorithm: "ed25519" as const,
    },
    trust: { domain: "trust.demo", state: "trusted" as const },
    revocation: { generation: 1, state: "active" as const },
    disabled: false as const,
    transport: {
      kind: "provider-adapter" as const,
      reference: "provider.effect-demo",
    },
    features: ["capability-packages", "delegation-grants"],
    secretRefs: ["secret-ref:provider.effect-demo"],
    environment: {
      operatingSystems: ["linux"],
      architectures: ["x64"],
      network: "egress-restricted" as const,
    },
  };
  const capabilityPackage: CapabilityPackageDescriptor = {
    ...unsignedPackage,
    digest: createCapabilityPackageDescriptorDigest(unsignedPackage),
  };
  const agentDefinition = {
    agentId: "agent.effect-demo",
    version: "1.0",
    identity: { tenantId: "tenant.demo", workloadId: "workload.demo" },
    capabilityPackage,
    requestedScopes: ["model.invoke"],
    skills: [
      { id: "skill.effect-demo", packageDigest: capabilityPackage.digest },
    ],
    tools: [
      { id: "provider.effect-demo", packageDigest: capabilityPackage.digest },
    ],
    securityPolicy: {
      ref: "policy:effect-demo" as const,
      digest: digest("policy.effect-demo"),
    },
  };
  const definitionDigest = createAgentDefinitionDigest(agentDefinition);
  return {
    schemaVersion: "agent-os/v1",
    features: ["capability-packages", "delegation-grants"],
    agentDefinition,
    hostProfile: {
      hostId: "host.demo",
      hostKind: "worker",
      managementMode: "enrolled",
      role: "worker",
      authorityDomain: "authority.demo",
      capabilityCeiling: ["model.invoke"],
      supportedFeatures: ["capability-packages", "delegation-grants"],
      providerCeiling: {
        ref: "ceiling:provider",
        digest: digest("ceiling.provider"),
      },
      workspaceCeiling: {
        ref: "ceiling:workspace",
        digest: digest("ceiling.workspace"),
      },
      storageCeiling: {
        ref: "ceiling:storage",
        digest: digest("ceiling.storage"),
      },
      networkCeiling: {
        ref: "ceiling:network",
        digest: digest("ceiling.network"),
      },
      lifecycleCeiling: {
        ref: "ceiling:lifecycle",
        digest: digest("ceiling.lifecycle"),
      },
    },
    agentDeployment: {
      deploymentId: "deployment.demo",
      target: "worker",
      agentId: "agent.effect-demo",
      agentVersion: "1.0",
      hostId: "host.demo",
      capabilityDigest: capabilityPackage.digest,
      desiredState: "active",
      revision: "revision.demo",
      desiredReplicas: 1,
      placementPolicy: {
        ref: "placement:effect-demo",
        digest: digest("placement.effect-demo"),
      },
      bindings: [],
    },
    executionInstance: {
      instanceId: "instance.demo",
      deploymentId: "deployment.demo",
      hostId: "host.demo",
      generation: 3,
      deploymentRevision: "revision.demo",
      replicaOrdinal: 0,
      observedState: "running",
    },
    runSpec: {
      runId: "run.demo",
      deploymentId: "deployment.demo",
      capabilityScopes: ["model.invoke"],
      requiredFeatures: ["capability-packages", "delegation-grants"],
      definitionDigest,
      policyDigest: agentDefinition.securityPolicy.digest,
      capabilityDigest: capabilityPackage.digest,
    },
    executionGrant: {
      grantId: "grant.demo",
      kind: "remote",
      issuer: "control.demo",
      audience: ["host.demo"],
      authorityDomain: "authority.demo",
      hostId: "host.demo",
      deploymentId: "deployment.demo",
      runId: "run.demo",
      tenantId: "tenant.demo",
      workloadId: "workload.demo",
      attemptId: "attempt.demo",
      instanceId: "instance.demo",
      definitionDigest,
      policyDigest: agentDefinition.securityPolicy.digest,
      capabilityDigest: capabilityPackage.digest,
      keyId: "grant-key.demo",
      rotationGeneration: "rotation:key-current",
      revocationGeneration: "revocation:key-current",
      scope: ["model.invoke"],
      notBefore: "2026-08-06T00:00:00.000Z",
      expiresAt: "2026-08-06T00:05:00.000Z",
      sessionGrant: {
        grantId: "session-grant.demo",
        principalId: "principal.demo",
        scope: ["model.invoke"],
        notBefore: "2026-08-06T00:00:00.000Z",
        expiresAt: "2026-08-06T00:10:00.000Z",
      },
      leaseBinding: {
        kind: "remote",
        leaseId: "lease.demo",
        epoch: "lease-epoch:current",
        generation: 3,
        scope: ["model.invoke"],
        notBefore: "2026-08-06T00:00:00.000Z",
        expiresAt: "2026-08-06T00:06:00.000Z",
      },
    },
  };
}

function claimFixture(): ExecutionClaimBinding {
  return {
    grantId: "grant.demo",
    leaseId: "lease.demo",
    leaseEpoch: "lease-epoch:current",
    authorityDomain: "authority.demo",
    runId: "run.demo",
    attemptId: "attempt.demo",
    instanceId: "instance.demo",
    instanceGeneration: 3,
    storeId: "store.demo",
    storeGeneration: 4,
    writerIncarnationId: "writer.demo",
    claimId: "claim.demo",
    claimFence: 5,
    expiresAt: "2026-08-06T00:04:30.000Z",
  };
}

function authorityFixture(): AgentOsEffectAuthorityBindingV1 {
  const contract = contractFixture();
  const grant = contract.executionGrant;
  const lease = grant.leaseBinding;
  if (lease.kind !== "remote")
    throw new Error("fixture requires a remote lease");
  const claim = claimFixture();
  return {
    grantId: grant.grantId,
    sessionGrantId: grant.sessionGrant.grantId,
    leaseId: lease.leaseId,
    leaseEpoch: lease.epoch,
    rotationGeneration: grant.rotationGeneration,
    revocationGeneration: grant.revocationGeneration,
    tenantId: grant.tenantId,
    workloadId: grant.workloadId,
    principalId: grant.sessionGrant.principalId,
    authorityDomain: grant.authorityDomain,
    hostId: grant.hostId,
    deploymentId: grant.deploymentId,
    runId: grant.runId,
    turnId: "turn.demo",
    attemptId: grant.attemptId,
    instanceId: grant.instanceId,
    instanceGeneration: claim.instanceGeneration,
    claimId: claim.claimId,
    claimFence: claim.claimFence,
    storeId: claim.storeId,
    storeGeneration: claim.storeGeneration,
    definitionDigest: grant.definitionDigest,
    policyDigest: grant.policyDigest,
    capabilityDigest: grant.capabilityDigest,
    keyId: grant.keyId,
  };
}

function intentFixture(): AgentOsEffectIntentV1 {
  const capabilityPackage = contractFixture().agentDefinition.capabilityPackage;
  return {
    schemaVersion: "agent-os-effect/v1",
    effectId: "effect.demo",
    adapterKind: "provider",
    adapterId: "provider.effect-demo",
    operation: "model.invoke",
    targetRef: "effect-target:provider-demo",
    logicalKey: "effect-logical:run-demo-turn-demo",
    authority: authorityFixture(),
    capability: {
      packageId: capabilityPackage.packageId,
      packageDigest: capabilityPackage.digest,
      capabilityId: "provider.effect-demo",
    },
    audience: ["host.demo"],
    scope: ["model.invoke"],
    requestSchemaDigest: digest("schema.effect.request"),
    responseSchemaDigest: digest("schema.effect.response"),
    handlerDigest: digest("handler.provider.effect-demo"),
    inputDigest: digest("effect.input"),
    idempotencyKey: "idempotency:effect-demo",
    createdAt: "2026-08-06T00:00:05.000Z",
  };
}

function requestFixture(
  intent = intentFixture(),
): AgentOsEffectPermitRequestV1 {
  return {
    schemaVersion: "agent-os-effect/v1",
    requestId: "request.effect-demo",
    intentDigest: createAgentOsEffectIntentDigestV1(intent),
    effectId: intent.effectId,
    adapterKind: intent.adapterKind,
    adapterId: intent.adapterId,
    targetRef: intent.targetRef,
    logicalKey: intent.logicalKey,
    authority: intent.authority,
    capability: intent.capability,
    requestSchemaDigest: intent.requestSchemaDigest,
    responseSchemaDigest: intent.responseSchemaDigest,
    handlerDigest: intent.handlerDigest,
    inputDigest: intent.inputDigest,
    idempotencyKey: intent.idempotencyKey,
    requestedAudience: [intent.audience[0]!],
    requestedScope: intent.scope,
    requestedAt: "2026-08-06T00:00:09.000Z",
    notBefore: "2026-08-06T00:00:10.000Z",
    expiresAt: "2026-08-06T00:04:00.000Z",
  };
}

function permitFixture(
  intent = intentFixture(),
  request = requestFixture(intent),
): AgentOsEffectPermitV1 {
  const unsigned: AgentOsEffectPermitUnsignedV1 = {
    schemaVersion: "agent-os-effect/v1",
    permitId: "permit.effect-demo",
    issuerKind: "control",
    issuerId: "control.demo",
    requestDigest: createAgentOsEffectPermitRequestDigestV1(request),
    intentDigest: createAgentOsEffectIntentDigestV1(intent),
    effectId: intent.effectId,
    adapterKind: intent.adapterKind,
    adapterId: intent.adapterId,
    targetRef: intent.targetRef,
    logicalKey: intent.logicalKey,
    authority: intent.authority,
    capability: intent.capability,
    requestSchemaDigest: intent.requestSchemaDigest,
    responseSchemaDigest: intent.responseSchemaDigest,
    handlerDigest: intent.handlerDigest,
    inputDigest: intent.inputDigest,
    idempotencyKey: intent.idempotencyKey,
    audience: [intent.audience[0]!],
    scope: request.requestedScope,
    notBefore: "2026-08-06T00:00:12.000Z",
    expiresAt: "2026-08-06T00:03:00.000Z",
    issuedAt: "2026-08-06T00:00:11.000Z",
  };
  return {
    ...unsigned,
    permitDigest: createAgentOsEffectPermitDigestV1(unsigned),
  };
}

function receiptFixture(
  intent = intentFixture(),
  permit = permitFixture(intent),
  disposition: AgentOsEffectDispatchReceiptUnsignedV1["disposition"] = "unknown",
): AgentOsEffectDispatchReceiptV1 {
  const usage =
    disposition === "unknown"
      ? { inputUnits: 0, outputUnits: 0, totalUnits: 0 }
      : { inputUnits: 2, outputUnits: 3, totalUnits: 5 };
  const unsigned: AgentOsEffectDispatchReceiptUnsignedV1 = {
    schemaVersion: "agent-os-effect/v1",
    receiptId: "receipt.effect-demo",
    disposition,
    intentDigest: createAgentOsEffectIntentDigestV1(intent),
    permitDigest: permit.permitDigest,
    effectId: intent.effectId,
    runId: intent.authority.runId,
    attemptId: intent.authority.attemptId,
    adapterKind: intent.adapterKind,
    adapterId: intent.adapterId,
    operation: intent.operation,
    idempotencyKey: intent.idempotencyKey,
    requestDigest: intent.inputDigest,
    responseDigest: digest(`effect.response.${disposition}`),
    authority: intent.authority,
    usage,
    dispatchedAt: "2026-08-06T00:00:13.000Z",
    completedAt: "2026-08-06T00:00:14.000Z",
  };
  return {
    ...unsigned,
    receiptDigest: createAgentOsEffectDispatchReceiptDigestV1(unsigned),
  };
}

function decisionFixture(
  intent = intentFixture(),
  permit = permitFixture(intent),
  receipt = receiptFixture(intent, permit),
): AgentOsUnknownEffectRecoveryDecisionV1 {
  return {
    schemaVersion: "agent-os-effect/v1",
    decisionId: "decision.effect-demo",
    actorId: "operator.demo",
    revision: 1,
    effectId: intent.effectId,
    resolution: "confirm_succeeded",
    intentDigest: createAgentOsEffectIntentDigestV1(intent),
    permitDigest: permit.permitDigest,
    dispatchReceiptDigest: receipt.receiptDigest,
    authority: intent.authority,
    evidenceDigest: digest("effect.recovery-evidence"),
    reason: "Provider evidence confirms the original dispatch completed.",
    decidedAt: "2026-08-06T00:04:00.000Z",
  };
}

describe("Agent OS effect/v1 protocol boundary", () => {
  test("strictly canonicalizes, copies and deep-freezes an Effect Intent", () => {
    const input = {
      ...intentFixture(),
      scope: ["workspace.write", "model.invoke"],
    };
    const parsed = parseAgentOsEffectIntentV1(input);

    expect(parsed.audience).toEqual(["host.demo"]);
    expect(parsed.scope).toEqual(["model.invoke", "workspace.write"]);
    expect(parsed).not.toBe(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.authority)).toBe(true);
    expect(Object.isFrozen(parsed.capability)).toBe(true);
    expect(Object.isFrozen(parsed.scope)).toBe(true);
    const source = serializeAgentOsEffectIntentV1(input);
    expect(source).toBe(serializeAgentOsEffectIntentV1(parsed));
    expect(createAgentOsEffectIntentDigestV1(input)).toBe(
      `sha256:${createHash("sha256").update(source).digest("hex")}`,
    );
  });

  test("recognizes all five closed adapter kinds", () => {
    for (const adapterKind of [
      "provider",
      "mcp",
      "skill",
      "plugin",
      "tool",
    ] as const) {
      expect(
        parseAgentOsEffectIntentV1({ ...intentFixture(), adapterKind })
          .adapterKind,
      ).toBe(adapterKind);
    }
  });

  test("pins an intent to the accepted ExecutionGrant, SessionGrant, RemoteLease, Claim and package", () => {
    const contract = contractFixture();
    const claim = claimFixture();
    const intent = intentFixture();

    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({ contract, claim, intent }),
    ).not.toThrow();
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: {
          ...intent,
          authority: { ...intent.authority, claimFence: 6 },
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: {
          ...intent,
          authority: { ...intent.authority, instanceGeneration: 4 },
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: {
          ...intent,
          authority: { ...intent.authority, storeGeneration: 10 },
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: {
          ...intent,
          authority: {
            ...intent.authority,
            definitionDigest: digest("stale.definition"),
          },
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: {
          ...intent,
          authority: {
            ...intent.authority,
            rotationGeneration: "rotation:stale",
          },
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: {
          ...intent,
          capability: {
            ...intent.capability,
            packageDigest: digest("wrong.package"),
          },
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: {
          ...intent,
          adapterId: "provider.undeclared",
          capability: {
            ...intent.capability,
            capabilityId: "provider.undeclared",
          },
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: { ...intent, adapterKind: "tool" },
      }),
    ).not.toThrow();
    expect(() =>
      assertAgentOsEffectIntentAuthorityV1({
        contract,
        claim,
        intent: { ...intent, adapterKind: "skill" },
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("allows only monotonic Permit Request narrowing", () => {
    const contract = contractFixture();
    const claim = claimFixture();
    const intent = intentFixture();
    const request = requestFixture(intent);

    expect(() =>
      assertAgentOsEffectPermitRequestRelationshipV1({
        contract,
        claim,
        intent,
        request,
      }),
    ).not.toThrow();
    expect(() =>
      assertAgentOsEffectPermitRequestRelationshipV1({
        contract,
        claim,
        intent,
        request: {
          ...request,
          requestedScope: [...request.requestedScope, "workspace.write"],
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectPermitRequestRelationshipV1({
        contract,
        claim,
        intent,
        request: { ...request, handlerDigest: digest("stale.handler") },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectPermitRequestRelationshipV1({
        contract,
        claim,
        intent,
        request: {
          ...request,
          requestSchemaDigest: digest("stale.request-schema"),
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectPermitRequestRelationshipV1({
        contract,
        claim,
        intent,
        request: {
          ...request,
          responseSchemaDigest: digest("stale.response-schema"),
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectPermitRequestRelationshipV1({
        contract,
        claim,
        intent,
        request: { ...request, expiresAt: "2026-08-06T00:05:01.000Z" },
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("allows only Control to issue a request- and intent-bound permit", () => {
    const contract = contractFixture();
    const claim = claimFixture();
    const intent = intentFixture();
    const request = requestFixture(intent);
    const permit = permitFixture(intent, request);

    expect(() =>
      assertAgentOsEffectPermitRelationshipV1({
        contract,
        claim,
        intent,
        request,
        permit,
      }),
    ).not.toThrow();
    expect(() =>
      parseAgentOsEffectPermitV1({ ...permit, issuerKind: "worker" }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectPermitV1({
        ...permit,
        permitDigest: digest("tampered.permit"),
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectPermitV1({
        ...permit,
        audience: ["host.demo", "worker.other"],
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectPermitRelationshipV1({
        contract,
        claim,
        intent,
        request,
        permit: { ...permit, requestDigest: digest("wrong.request") },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectPermitRelationshipV1({
        contract,
        claim,
        intent,
        request,
        permit: { ...permit, issuerId: "worker.demo" },
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("binds succeeded, failed and unknown receipts to adapter identity, usage and time", () => {
    const intent = intentFixture();
    const permit = permitFixture(intent);
    const receipt = receiptFixture(intent, permit);

    expect(() =>
      assertAgentOsEffectDispatchReceiptRelationshipV1({
        intent,
        permit,
        receipt,
      }),
    ).not.toThrow();
    const parsed = parseAgentOsEffectDispatchReceiptV1(receipt);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.usage)).toBe(true);
    expect(
      parseAgentOsEffectDispatchReceiptV1(
        receiptFixture(intent, permit, "succeeded"),
      ).disposition,
    ).toBe("succeeded");
    expect(
      parseAgentOsEffectDispatchReceiptV1(
        receiptFixture(intent, permit, "failed"),
      ).disposition,
    ).toBe("failed");
    expect(() =>
      parseAgentOsEffectDispatchReceiptV1({
        ...receipt,
        usage: { inputUnits: 1, outputUnits: 0, totalUnits: 1 },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectDispatchReceiptV1({
        ...receipt,
        usage: {
          inputUnits: Number.MAX_SAFE_INTEGER + 1,
          outputUnits: 0,
          totalUnits: Number.MAX_SAFE_INTEGER + 1,
        },
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectDispatchReceiptV1({
        ...receipt,
        completedAt: "2026-08-06T00:00:12.000Z",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectDispatchReceiptV1({
        ...receipt,
        receiptDigest: digest("tampered.receipt"),
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsEffectDispatchReceiptRelationshipV1({
        intent,
        permit,
        receipt: { ...receipt, permitDigest: digest("wrong.permit") },
      }),
    ).toThrow(AgentOsV1ContractError);
    const { permitDigest: _permitDigest, ...permitUnsigned } = permit;
    const driftedPermitUnsigneds: AgentOsEffectPermitUnsignedV1[] = [
      {
        ...permitUnsigned,
        adapterId: "provider.other",
        capability: { ...permit.capability, capabilityId: "provider.other" },
      },
      { ...permitUnsigned, targetRef: "effect-target:other" },
      { ...permitUnsigned, logicalKey: "effect-logical:other" },
      {
        ...permitUnsigned,
        capability: {
          ...permit.capability,
          packageDigest: digest("drifted.package"),
        },
      },
      {
        ...permitUnsigned,
        responseSchemaDigest: digest("drifted.response-schema"),
      },
      { ...permitUnsigned, handlerDigest: digest("drifted.handler") },
      { ...permitUnsigned, scope: ["workspace.write"] },
    ];
    for (const driftedUnsigned of driftedPermitUnsigneds) {
      const driftedPermit: AgentOsEffectPermitV1 = {
        ...driftedUnsigned,
        permitDigest: createAgentOsEffectPermitDigestV1(driftedUnsigned),
      };
      expect(() =>
        assertAgentOsEffectDispatchReceiptRelationshipV1({
          intent,
          permit: driftedPermit,
          receipt: receiptFixture(intent, driftedPermit),
        }),
      ).toThrow(AgentOsV1ContractError);
    }
  });

  test("limits unknown-effect recovery to explicit terminal resolutions with bound evidence", () => {
    const intent = intentFixture();
    const permit = permitFixture(intent);
    const receipt = receiptFixture(intent, permit);
    const decision = decisionFixture(intent, permit, receipt);

    expect(() =>
      assertAgentOsUnknownEffectRecoveryDecisionRelationshipV1({
        intent,
        permit,
        receipt,
        decision,
      }),
    ).not.toThrow();
    expect(
      createAgentOsUnknownEffectRecoveryDecisionDigestV1(decision),
    ).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(() =>
      parseAgentOsUnknownEffectRecoveryDecisionV1({
        ...decision,
        resolution: "retry",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsUnknownEffectRecoveryDecisionV1({
        ...decision,
        redispatch: true,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsUnknownEffectRecoveryDecisionV1({
        ...decision,
        replay: true,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsUnknownEffectRecoveryDecisionV1({ ...decision, revision: 0 }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsUnknownEffectRecoveryDecisionV1({
        ...decision,
        revision: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      assertAgentOsUnknownEffectRecoveryDecisionRelationshipV1({
        intent,
        permit,
        receipt: receiptFixture(intent, permit, "succeeded"),
        decision,
      }),
    ).toThrow(AgentOsV1ContractError);
  });

  test("rejects unknown credentials, paths, noncanonical values and collection limits", () => {
    const intent = intentFixture();
    const request = requestFixture(intent);
    const decision = decisionFixture();
    const sparseScope = new Array<string>(2);
    sparseScope[0] = "model.invoke";
    const accessorIntent = { ...intent };
    Object.defineProperty(accessorIntent, "effectId", {
      enumerable: true,
      get: () => intent.effectId,
    });
    const symbolIntent = { ...intent };
    Object.defineProperty(symbolIntent, Symbol("credential"), {
      enumerable: true,
      value: "raw-secret",
    });

    expect(() =>
      parseAgentOsEffectIntentV1({ ...intent, token: "raw-secret" }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectPermitRequestV1({ ...request, headers: {} }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectIntentV1({
        ...intent,
        endpoint: "https://example.invalid",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectIntentV1({ ...intent, path: "C:\\private" }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectPermitRequestV1({
        ...request,
        requestedAudience: ["host.demo", "host.other"],
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectIntentV1({ ...intent, adapterId: "C:\\private\\tool" }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectIntentV1({
        ...intent,
        createdAt: "2026-08-06T00:00:05Z",
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectIntentV1({
        ...intent,
        scope: Array(33).fill("scope.demo"),
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectIntentV1({ ...intent, scope: sparseScope }),
    ).toThrow(AgentOsV1ContractError);
    expect(() =>
      parseAgentOsEffectIntentV1({
        ...intent,
        scope: ["model.invoke", "model.invoke"],
      }),
    ).toThrow(AgentOsV1ContractError);
    expect(() => parseAgentOsEffectIntentV1(accessorIntent)).toThrow(
      AgentOsV1ContractError,
    );
    expect(() => parseAgentOsEffectIntentV1(symbolIntent)).toThrow(
      AgentOsV1ContractError,
    );
    expect(() =>
      parseAgentOsUnknownEffectRecoveryDecisionV1({
        ...decision,
        reason: ` ${decision.reason}`,
      }),
    ).toThrow(AgentOsV1ContractError);
    for (const reason of [
      "password=hunter2",
      "api_key:demo-value",
      "Evidence is stored under /tmp/effect-result.json",
      '{"status":"confirmed"}',
    ]) {
      expect(() =>
        parseAgentOsUnknownEffectRecoveryDecisionV1({ ...decision, reason }),
      ).toThrow(AgentOsV1ContractError);
    }
  });

  test("exposes all strict DTO parsers and canonical digest helpers", () => {
    const intent = parseAgentOsEffectIntentV1(intentFixture());
    const request = parseAgentOsEffectPermitRequestV1(requestFixture(intent));
    const permit = parseAgentOsEffectPermitV1(permitFixture(intent, request));
    const receipt = parseAgentOsEffectDispatchReceiptV1(
      receiptFixture(intent, permit),
    );
    const decision = parseAgentOsUnknownEffectRecoveryDecisionV1(
      decisionFixture(intent, permit, receipt),
    );

    expect(createAgentOsEffectIntentDigestV1(intent)).toMatch(
      /^sha256:[0-9a-f]{64}$/u,
    );
    expect(createAgentOsEffectPermitRequestDigestV1(request)).toMatch(
      /^sha256:[0-9a-f]{64}$/u,
    );
    expect(createAgentOsEffectPermitDigestV1(permit)).toMatch(
      /^sha256:[0-9a-f]{64}$/u,
    );
    expect(createAgentOsEffectDispatchReceiptDigestV1(receipt)).toMatch(
      /^sha256:[0-9a-f]{64}$/u,
    );
    expect(
      createAgentOsUnknownEffectRecoveryDecisionDigestV1(decision),
    ).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(Object.isFrozen(request.authority)).toBe(true);
    expect(Object.isFrozen(request.requestedAudience)).toBe(true);
    expect(Object.isFrozen(request.requestedScope)).toBe(true);
    expect(Object.isFrozen(permit.capability)).toBe(true);
    expect(Object.isFrozen(permit.audience)).toBe(true);
    expect(Object.isFrozen(permit.scope)).toBe(true);
    expect(Object.isFrozen(decision.authority)).toBe(true);
    expect(parseAgentOsEffectIntentV1FromPackage(intent)).toEqual(intent);
    expect(AgentOsEffectV1.parseAgentOsEffectPermitV1(permit)).toEqual(permit);
  });
});
