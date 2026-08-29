import { describe, expect, test } from "bun:test";

import type { AgentOsV1CanonicalPromptReferenceClient } from "@xurunxin/morpheus-protocol";

import {
  negotiateAgentOsAppHandshake,
  runPromptWithAbort,
  type PromptCancelArguments,
  type PromptCancelResponse,
  type PromptStartArguments,
  type PromptStartResponse,
} from "../src/index.js";
import { createCanonicalPromptFixture } from "./canonical-prompt-fixture.js";

const HANDSHAKE_NOW = Date.parse("2026-08-06T00:00:00.000Z");
const CANONICAL_FIXTURE = createCanonicalPromptFixture();

function handshakeOffer(
  side: "client" | "provider",
  versions: readonly string[] = ["1.1"],
) {
  const peerId = side === "client" ? "terminal.execution" : "kernel.execution";
  const audience = [
    side === "client" ? "kernel.execution" : "terminal.execution",
  ];
  return {
    protocol: {
      protocolId: "execution.v1",
      versions,
      features: ["recover"],
      requiredFeatures: ["recover"],
      schemaVersion: "agent-os/v1",
      handlerVersion: "handler-execution-1.1.0",
    },
    peer: {
      peerId,
      role: side === "client" ? "app" : "kernel",
      hostKind: null,
      managementMode: null,
      tenantId: "tenant.sdk",
      workloadId: "workload.sdk",
      authorityDomain: "authority.sdk",
      enrollmentRef: null,
      audience,
    },
    issuedAt: "2026-08-06T00:00:00.000Z",
    maxClockSkewMs: 30_000,
  };
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("SDK Prompt AbortSignal orchestration", () => {
  test("does not create inputs or dispatch when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    let dispatches = 0;
    const client = {
      start: async () => {
        dispatches += 1;
        throw new Error("start must not run");
      },
      cancel: async () => {
        dispatches += 1;
        throw new Error("cancel must not run");
      },
    } satisfies Pick<
      AgentOsV1CanonicalPromptReferenceClient,
      "start" | "cancel"
    >;

    const outcome = await runPromptWithAbort({
      client,
      signal: controller.signal,
      startArguments: () => {
        throw new Error("start arguments must not be created");
      },
      cancelArguments: () => {
        throw new Error("cancel arguments must not be created");
      },
    });

    expect(outcome).toEqual({ kind: "aborted-before-start" });
    expect(dispatches).toBe(0);
  });

  test("forwards caller inputs and dispatches exactly one cancel for a mid-flight abort", async () => {
    const controller = new AbortController();
    const started = deferred<PromptStartResponse>();
    const { startResponse, cancelResponse, startArguments, cancelArguments } =
      CANONICAL_FIXTURE;
    const observedStarts: PromptStartArguments[] = [];
    const observedCancels: PromptCancelArguments[] = [];
    const client = {
      start: (...arguments_: PromptStartArguments) => {
        observedStarts.push(arguments_);
        return started.promise;
      },
      cancel: async (...arguments_: PromptCancelArguments) => {
        observedCancels.push(arguments_);
        return cancelResponse;
      },
    } satisfies Pick<
      AgentOsV1CanonicalPromptReferenceClient,
      "start" | "cancel"
    >;

    const running = runPromptWithAbort({
      client,
      signal: controller.signal,
      startArguments: () => startArguments,
      cancelArguments: () => cancelArguments,
    });
    await Promise.resolve();
    controller.abort();
    controller.abort();
    started.resolve(startResponse);

    await expect(running).resolves.toEqual({
      kind: "cancelled",
      response: cancelResponse,
    });
    expect(observedStarts).toEqual([startArguments]);
    expect(observedCancels).toEqual([cancelArguments]);
  });

  test("removes abort handling after completion so a late abort cannot cancel", async () => {
    const controller = new AbortController();
    const response = CANONICAL_FIXTURE.startResponse;
    let cancels = 0;
    let cancelArgumentsCreated = 0;
    const client = {
      start: async () => response,
      cancel: async () => {
        cancels += 1;
        return CANONICAL_FIXTURE.cancelResponse;
      },
    } satisfies Pick<
      AgentOsV1CanonicalPromptReferenceClient,
      "start" | "cancel"
    >;

    await expect(
      runPromptWithAbort({
        client,
        signal: controller.signal,
        startArguments: () => CANONICAL_FIXTURE.startArguments,
        cancelArguments: () => {
          cancelArgumentsCreated += 1;
          return CANONICAL_FIXTURE.cancelArguments;
        },
      }),
    ).resolves.toEqual({ kind: "completed", response });
    controller.abort();
    await Promise.resolve();

    expect(cancels).toBe(0);
    expect(cancelArgumentsCreated).toBe(0);
  });

  test("keeps the cancellation outcome authoritative after abort even if start settles first", async () => {
    const controller = new AbortController();
    const started = deferred<PromptStartResponse>();
    const cancelled = deferred<PromptCancelResponse>();
    const startResponse = CANONICAL_FIXTURE.startResponse;
    const cancelResponse = CANONICAL_FIXTURE.cancelResponse;
    const running = runPromptWithAbort({
      client: {
        start: () => started.promise,
        cancel: () => cancelled.promise,
      },
      signal: controller.signal,
      startArguments: () => CANONICAL_FIXTURE.startArguments,
      cancelArguments: () => CANONICAL_FIXTURE.cancelArguments,
    });
    await Promise.resolve();
    controller.abort();
    started.resolve(startResponse);
    let settled = false;
    void running.finally(() => {
      settled = true;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(settled).toBe(false);
    cancelled.resolve(cancelResponse);
    await expect(running).resolves.toEqual({
      kind: "cancelled",
      response: cancelResponse,
    });
  });

  test("propagates start and cancel failures without converting them to outcomes", async () => {
    const startFailure = new Error("start transport failed");
    const startController = new AbortController();
    await expect(
      runPromptWithAbort({
        client: {
          start: async () => Promise.reject(startFailure),
          cancel: async () => CANONICAL_FIXTURE.cancelResponse,
        },
        signal: startController.signal,
        startArguments: () => CANONICAL_FIXTURE.startArguments,
        cancelArguments: () => CANONICAL_FIXTURE.cancelArguments,
      }),
    ).rejects.toBe(startFailure);

    const cancelFailure = new Error("cancel transport failed");
    const cancelController = new AbortController();
    const started = deferred<PromptStartResponse>();
    const running = runPromptWithAbort({
      client: {
        start: () => started.promise,
        cancel: async () => Promise.reject(cancelFailure),
      },
      signal: cancelController.signal,
      startArguments: () => CANONICAL_FIXTURE.startArguments,
      cancelArguments: () => CANONICAL_FIXTURE.cancelArguments,
    });
    await Promise.resolve();
    cancelController.abort();

    await expect(running).rejects.toBe(cancelFailure);
  });

  test("removes abort handling after a synchronous start failure", async () => {
    const controller = new AbortController();
    const failure = new Error("synchronous start failure");
    let cancels = 0;
    let cancelArgumentsCreated = 0;
    const running = runPromptWithAbort({
      client: {
        start: () => {
          throw failure;
        },
        cancel: async () => {
          cancels += 1;
          return CANONICAL_FIXTURE.cancelResponse;
        },
      },
      signal: controller.signal,
      startArguments: () => CANONICAL_FIXTURE.startArguments,
      cancelArguments: () => {
        cancelArgumentsCreated += 1;
        return CANONICAL_FIXTURE.cancelArguments;
      },
    });

    await expect(running).rejects.toBe(failure);
    controller.abort();
    await Promise.resolve();

    expect(cancels).toBe(0);
    expect(cancelArgumentsCreated).toBe(0);
  });
});

describe("SDK typed App handshake", () => {
  test("delegates strict negotiation and exposes accepted and UPDATE_REQUIRED outcomes", async () => {
    await expect(
      negotiateAgentOsAppHandshake({
        clientOffer: () => handshakeOffer("client"),
        providerOffer: () => handshakeOffer("provider"),
        nowEpochMs: () => HANDSHAKE_NOW,
      }),
    ).resolves.toMatchObject({
      status: "accepted",
      snapshot: { protocolId: "execution.v1", selectedVersion: "1.1" },
    });

    await expect(
      negotiateAgentOsAppHandshake({
        clientOffer: async () => handshakeOffer("client", ["1.99"]),
        providerOffer: async () => handshakeOffer("provider"),
        nowEpochMs: async () => HANDSHAKE_NOW,
      }),
    ).resolves.toEqual({
      status: "UPDATE_REQUIRED",
      reason: "UNKNOWN_VERSION",
    });
  });

  test("propagates synchronous and asynchronous input-provider failures", async () => {
    const synchronousFailure = new Error("handshake sync failed");
    await expect(
      negotiateAgentOsAppHandshake({
        clientOffer: () => {
          throw synchronousFailure;
        },
        providerOffer: () => handshakeOffer("provider"),
        nowEpochMs: () => HANDSHAKE_NOW,
      }),
    ).rejects.toBe(synchronousFailure);

    const asynchronousFailure = new Error("handshake async failed");
    await expect(
      negotiateAgentOsAppHandshake({
        clientOffer: () => handshakeOffer("client"),
        providerOffer: async () => Promise.reject(asynchronousFailure),
        nowEpochMs: () => HANDSHAKE_NOW,
      }),
    ).rejects.toBe(asynchronousFailure);
  });
});
