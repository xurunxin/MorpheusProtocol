import { describe, expect, test } from "bun:test";

import {
  AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
  AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
  AgentOsV1ProviderProjectionContractError,
  assertAgentOsV1ProviderProjectionResponseCorrelated,
  assertAgentOsV1ProviderProjectionRequestBindingCompatible,
  canonicalAgentOsV1ProviderProjectionRequestSource,
  canonicalAgentOsV1ProviderProjectionSource,
  createAgentOsV1ProviderProjectionDigest,
  createAgentOsV1ProviderProjectionReferenceClient,
  createAgentOsV1ProviderProjectionRequestBinding,
  createAgentOsV1ProviderProjectionRequestFingerprint,
  parseAgentOsV1ProviderProjectionReadRequest,
  parseAgentOsV1ProviderProjectionReadResponse,
} from "../src/agent-os-v1-provider-projection.js";

const TARGET = { sessionId: "session.demo", storeGeneration: 3 } as const;
const PROJECTION = {
  providerId: "provider.demo",
  modelId: "model.demo",
  selectionState: "selected",
  contentPolicy: "metadata-only.v1",
} as const;
const PROJECTION_DIGEST =
  "sha256:d9a660bff93b1ab0a77746803ad38721ec65ba318c0439d0f89054aa49ba2ded";
const REQUEST_FINGERPRINT =
  "sha256:143862a5e575203954e20edd2669418a2aad77b4fd905531da5b5130afbb5f19";

function request(cursor: string | null = null) {
  return {
    schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
    target: TARGET,
    cursor,
  } as const;
}

function envelope(requestId = "request.demo", value = request()) {
  return { requestId, request: value };
}

function snapshotResponse(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
    target: TARGET,
    disposition: "snapshot",
    cursor: "cursor.next",
    projectionRevision: 4,
    projectionDigest: PROJECTION_DIGEST,
    projection: PROJECTION,
    ...overrides,
  };
}

function notModifiedResponse(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
    target: TARGET,
    disposition: "not-modified",
    cursor: "cursor.same",
    projectionRevision: 4,
    projectionDigest: PROJECTION_DIGEST,
    ...overrides,
  };
}

function snapshotRequiredResponse(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
    target: TARGET,
    disposition: "snapshot-required",
    cursor: null,
    projectionRevision: 4,
    projectionDigest: PROJECTION_DIGEST,
    ...overrides,
  };
}

function expectCode(code: string, callback: () => unknown): void {
  try {
    callback();
    throw new Error("expected contract error");
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsV1ProviderProjectionContractError);
    expect((error as AgentOsV1ProviderProjectionContractError).code).toBe(code);
    expect((error as Error).message).toBe(code);
  }
}

async function expectAsyncCode(
  code: string,
  callback: () => Promise<unknown>,
): Promise<void> {
  try {
    await callback();
    throw new Error("expected contract error");
  } catch (error) {
    expect(error).toBeInstanceOf(AgentOsV1ProviderProjectionContractError);
    expect((error as AgentOsV1ProviderProjectionContractError).code).toBe(code);
    expect((error as Error).message).toBe(code);
  }
}

function expectAbort(callback: () => Promise<unknown>): Promise<void> {
  return expect(callback()).rejects.toMatchObject({ name: "AbortError" });
}

test("parses the exact provider.read target and cursor", () => {
  const parsed = parseAgentOsV1ProviderProjectionReadRequest(request());

  expect(parsed).toEqual({
    schemaVersion: AGENT_OS_V1_PROVIDER_PROJECTION_SCHEMA,
    operation: AGENT_OS_V1_PROVIDER_PROJECTION_OPERATION,
    target: TARGET,
    cursor: null,
  });
  expect(Object.isFrozen(parsed)).toBe(true);
  expect(Object.isFrozen(parsed.target)).toBe(true);
});

describe("provider.read response and digest contract", () => {
  test("parses a metadata-only snapshot and recursively freezes it", () => {
    const parsed =
      parseAgentOsV1ProviderProjectionReadResponse(snapshotResponse());
    expect(parsed).toEqual(snapshotResponse());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.target)).toBe(true);
    expect(Object.isFrozen(parsed.projection)).toBe(true);
    expect(parsed.projection.contentPolicy).toBe("metadata-only.v1");
  });

  test("parses not-modified and snapshot-required without provider metadata", () => {
    expect(
      parseAgentOsV1ProviderProjectionReadResponse(notModifiedResponse()),
    ).toEqual(notModifiedResponse());
    expect(
      parseAgentOsV1ProviderProjectionReadResponse(snapshotRequiredResponse()),
    ).toEqual(snapshotRequiredResponse());
  });

  test("uses an independent worked literal for projection and request digests", () => {
    expect(
      canonicalAgentOsV1ProviderProjectionSource({
        target: TARGET,
        projectionRevision: 4,
        projection: PROJECTION,
      }),
    ).toBe(
      '{"operation":"provider.read","projection":{"contentPolicy":"metadata-only.v1","modelId":"model.demo","providerId":"provider.demo","selectionState":"selected"},"projectionRevision":4,"schemaVersion":"agent-os-provider-projection/v1","target":{"sessionId":"session.demo","storeGeneration":3}}',
    );
    expect(
      createAgentOsV1ProviderProjectionDigest({
        target: TARGET,
        projectionRevision: 4,
        projection: PROJECTION,
      }),
    ).toBe(PROJECTION_DIGEST);
    expect(
      canonicalAgentOsV1ProviderProjectionRequestSource({
        requestId: "request.demo",
        request: request(),
      }),
    ).toBe(
      '{"cursor":null,"operation":"provider.read","requestId":"request.demo","schemaVersion":"agent-os-provider-projection/v1","target":{"sessionId":"session.demo","storeGeneration":3}}',
    );
    expect(
      createAgentOsV1ProviderProjectionRequestFingerprint({
        requestId: "request.demo",
        request: request(),
      }),
    ).toBe(REQUEST_FINGERPRINT);
  });

  test("rejects forged projection digests, provider-use fields, and invalid dispositions", () => {
    expectCode("METADATA_CORRUPT", () =>
      parseAgentOsV1ProviderProjectionReadResponse(
        snapshotResponse({
          projectionDigest:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      ),
    );
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadResponse(
        snapshotResponse({ endpoint: "https://provider.invalid" }),
      ),
    );
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadResponse(
        snapshotResponse({
          projection: { ...PROJECTION, credential: "secret" },
        }),
      ),
    );
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadResponse(
        snapshotResponse({ disposition: "snapshot-required" }),
      ),
    );
  });
});

describe("provider.read binding and correlation", () => {
  test("binds requestId, complete target, cursor, and a self-validating fingerprint", () => {
    const binding = createAgentOsV1ProviderProjectionRequestBinding(envelope());
    expect(binding).toEqual({
      requestId: "request.demo",
      target: TARGET,
      cursor: null,
      requestFingerprint: REQUEST_FINGERPRINT,
    });
    expect(Object.isFrozen(binding)).toBe(true);
    expect(Object.isFrozen(binding.target)).toBe(true);
  });

  test("classifies exact replay and independent identity while rejecting drift", () => {
    const first = createAgentOsV1ProviderProjectionRequestBinding(envelope());
    const replay = createAgentOsV1ProviderProjectionRequestBinding(envelope());
    const independent = createAgentOsV1ProviderProjectionRequestBinding(
      envelope("request.other"),
    );
    expect(
      assertAgentOsV1ProviderProjectionRequestBindingCompatible(first, replay),
    ).toBe("replay");
    expect(
      assertAgentOsV1ProviderProjectionRequestBindingCompatible(
        first,
        independent,
      ),
    ).toBe("independent");
    expectCode("IDEMPOTENCY_CONFLICT", () =>
      assertAgentOsV1ProviderProjectionRequestBindingCompatible(
        first,
        createAgentOsV1ProviderProjectionRequestBinding(
          envelope("request.demo", request("cursor.drift")),
        ),
      ),
    );
    expectCode("METADATA_CORRUPT", () =>
      assertAgentOsV1ProviderProjectionRequestBindingCompatible(first, {
        ...independent,
        requestFingerprint:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    );
  });

  test("correlates target and cursor semantics without trusting response metadata", () => {
    const nullCursor =
      createAgentOsV1ProviderProjectionRequestBinding(envelope());
    const cursorBinding = createAgentOsV1ProviderProjectionRequestBinding(
      envelope("request.cursor", request("cursor.same")),
    );
    expect(
      assertAgentOsV1ProviderProjectionResponseCorrelated(
        snapshotResponse(),
        nullCursor,
      ),
    ).toEqual(snapshotResponse());
    expectCode("METADATA_CORRUPT", () =>
      assertAgentOsV1ProviderProjectionResponseCorrelated(
        notModifiedResponse(),
        nullCursor,
      ),
    );
    expectCode("METADATA_CORRUPT", () =>
      assertAgentOsV1ProviderProjectionResponseCorrelated(
        notModifiedResponse({ cursor: "cursor.other" }),
        cursorBinding,
      ),
    );
    expectCode("METADATA_CORRUPT", () =>
      assertAgentOsV1ProviderProjectionResponseCorrelated(
        snapshotResponse({
          target: { sessionId: "session.other", storeGeneration: 3 },
        }),
        nullCursor,
      ),
    );
    expectCode("METADATA_CORRUPT", () =>
      assertAgentOsV1ProviderProjectionResponseCorrelated(
        snapshotRequiredResponse(),
        nullCursor,
      ),
    );
  });
});

describe("provider.read owner seam", () => {
  function owner() {
    let admissions = 0;
    let reads = 0;
    const client = createAgentOsV1ProviderProjectionReferenceClient({
      admit: (context) => {
        admissions += 1;
        expect(Object.isFrozen(context)).toBe(true);
        expect(Object.isFrozen(context.request)).toBe(true);
        expect(Object.isFrozen(context.requestBinding)).toBe(true);
        return {
          kind: "fresh-admission",
          requestId: context.requestId,
          requestFingerprint: context.requestBinding.requestFingerprint,
        };
      },
      read: (context) => {
        reads += 1;
        expect(Object.isFrozen(context)).toBe(true);
        expect(context.freshAdmission.kind).toBe("fresh-admission");
        return snapshotResponse();
      },
    });
    return { client, counts: () => ({ admissions, reads }) };
  }

  test("requires fresh owner admission before a metadata read", async () => {
    const fixture = owner();
    const result = await fixture.client.request(envelope(), {
      freshAdmission: true,
    });
    expect(result).toEqual({
      disposition: "accepted",
      response: snapshotResponse(),
    });
    expect(fixture.counts()).toEqual({ admissions: 1, reads: 1 });
  });

  test("rejects snapshot-required for a null request cursor before returning to the caller", async () => {
    const nullCursor =
      createAgentOsV1ProviderProjectionRequestBinding(envelope());
    expectCode("METADATA_CORRUPT", () =>
      assertAgentOsV1ProviderProjectionResponseCorrelated(
        snapshotRequiredResponse(),
        nullCursor,
      ),
    );

    let admissions = 0;
    let reads = 0;
    const client = createAgentOsV1ProviderProjectionReferenceClient({
      admit: (context) => {
        admissions += 1;
        return {
          kind: "fresh-admission",
          requestId: context.requestId,
          requestFingerprint: context.requestBinding.requestFingerprint,
        };
      },
      read: () => {
        reads += 1;
        return snapshotRequiredResponse();
      },
    });
    await expectAsyncCode("METADATA_CORRUPT", () =>
      client.request(envelope(), { freshAdmission: true }),
    );
    expect({ admissions, reads }).toEqual({ admissions: 1, reads: 1 });
  });

  test("redacts malformed owner admission receipts without dispatching read", async () => {
    const accessor = {} as Record<string, unknown>;
    Object.defineProperty(accessor, "kind", {
      configurable: true,
      enumerable: true,
      get: () => {
        throw new Error("raw admission getter");
      },
    });
    Object.defineProperty(accessor, "requestId", {
      configurable: true,
      enumerable: true,
      value: "request.demo",
    });
    Object.defineProperty(accessor, "requestFingerprint", {
      configurable: true,
      enumerable: true,
      value: REQUEST_FINGERPRINT,
    });
    const proxy = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("raw admission proxy trap");
        },
      },
    );
    const malformed: readonly unknown[] = [
      {},
      {
        kind: "fresh-admission",
        requestId: "request.demo",
        requestFingerprint: REQUEST_FINGERPRINT,
        extra: true,
      },
      accessor,
      proxy,
    ];

    for (const receipt of malformed) {
      let admissions = 0;
      let reads = 0;
      const client = createAgentOsV1ProviderProjectionReferenceClient({
        admit: () => {
          admissions += 1;
          return receipt;
        },
        read: () => {
          reads += 1;
          return snapshotResponse();
        },
      });
      await expectAsyncCode("OWNER_UNAVAILABLE", () =>
        client.request(envelope(), { freshAdmission: true }),
      );
      expect({ admissions, reads }).toEqual({ admissions: 1, reads: 0 });
    }
  });

  test("returns replay-required without owner callbacks and re-admits on explicit retry", async () => {
    const fixture = owner();
    const binding = createAgentOsV1ProviderProjectionRequestBinding(envelope());
    const replay = await fixture.client.request(envelope(), {
      existingBinding: binding,
    });
    expect(replay).toEqual({
      disposition: "replay_requires_fresh_admission",
      binding,
    });
    expect(fixture.counts()).toEqual({ admissions: 0, reads: 0 });
    await fixture.client.request(envelope(), {
      existingBinding: binding,
      freshAdmission: true,
    });
    expect(fixture.counts()).toEqual({ admissions: 1, reads: 1 });
  });

  test("fails closed for ambiguous different-ID recovery before owner callbacks", async () => {
    const fixture = owner();
    const existing =
      createAgentOsV1ProviderProjectionRequestBinding(envelope());
    await expectAsyncCode("RECOVERY_REQUIRED", () =>
      fixture.client.request(envelope("request.other"), {
        existingBinding: existing,
        freshAdmission: true,
      }),
    );
    expect(fixture.counts()).toEqual({ admissions: 0, reads: 0 });
  });

  test("rejects same-ID target or cursor drift before owner callbacks", async () => {
    const fixture = owner();
    const existing =
      createAgentOsV1ProviderProjectionRequestBinding(envelope());
    await expectAsyncCode("IDEMPOTENCY_CONFLICT", () =>
      fixture.client.request(
        envelope("request.demo", request("cursor.drift")),
        {
          existingBinding: existing,
          freshAdmission: true,
        },
      ),
    );
    expect(fixture.counts()).toEqual({ admissions: 0, reads: 0 });
  });

  test("maps raw, custom, and proxy owner failures to redacted OWNER_UNAVAILABLE", async () => {
    const raw = createAgentOsV1ProviderProjectionReferenceClient({
      admit: () => {
        throw new Error("raw owner detail");
      },
      read: () => snapshotResponse(),
    });
    await expectAsyncCode("OWNER_UNAVAILABLE", () =>
      raw.request(envelope(), { freshAdmission: true }),
    );

    const custom = createAgentOsV1ProviderProjectionReferenceClient({
      admit: () =>
        Promise.reject({
          code: "OWNER_UNAVAILABLE",
          message: "raw custom detail",
        }),
      read: () => snapshotResponse(),
    });
    await expectAsyncCode("OWNER_UNAVAILABLE", () =>
      custom.request(envelope(), { freshAdmission: true }),
    );

    const proxyError = new Proxy(new Error("raw proxy detail"), {
      get() {
        throw new Error("proxy trap detail");
      },
    });
    const proxied = createAgentOsV1ProviderProjectionReferenceClient({
      admit: () => Promise.reject(proxyError),
      read: () => snapshotResponse(),
    });
    await expectAsyncCode("OWNER_UNAVAILABLE", () =>
      proxied.request(envelope(), { freshAdmission: true }),
    );
  });

  test("preserves only the code of an exact typed owner error", async () => {
    const ownerError = createAgentOsV1ProviderProjectionReferenceClient({
      admit: () =>
        Promise.reject(
          new AgentOsV1ProviderProjectionContractError(
            "TARGET_NOT_CURRENT",
            "raw owner detail",
          ),
        ),
      read: () => snapshotResponse(),
    });
    await expectAsyncCode("TARGET_NOT_CURRENT", () =>
      ownerError.request(envelope(), { freshAdmission: true }),
    );
  });

  test("redacts a mutated branded owner error code", async () => {
    const ownerError = new AgentOsV1ProviderProjectionContractError(
      "TARGET_NOT_CURRENT",
    );
    try {
      Object.defineProperty(ownerError, "code", {
        configurable: true,
        enumerable: true,
        value: "SECRET_CODE",
        writable: true,
      });
    } catch {
      // The repaired branded error is intentionally immutable.
    }
    try {
      (ownerError as { code: string }).code = "SECRET_CODE";
    } catch {
      // Strict-mode assignment must not make the branded code mutable.
    }
    const client = createAgentOsV1ProviderProjectionReferenceClient({
      admit: () => Promise.reject(ownerError),
      read: () => snapshotResponse(),
    });
    await expectAsyncCode("TARGET_NOT_CURRENT", () =>
      client.request(envelope(), { freshAdmission: true }),
    );
  });
});

describe("provider.read hostile input and captured intrinsics", () => {
  test("rejects accessors, symbols, prototypes, cycles, shared references, sparse arrays, and unknown authority fields", () => {
    let getterCalls = 0;
    const accessor = request();
    Object.defineProperty(accessor, "cursor", {
      enumerable: true,
      configurable: true,
      get: () => {
        getterCalls += 1;
        throw new Error("raw getter");
      },
    });
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest(accessor),
    );
    expect(getterCalls).toBe(0);

    const symbolValue = { ...request(), [Symbol("authority")]: "tenant.demo" };
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest(symbolValue),
    );
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest(
        Object.assign(Object.create(null), request()),
      ),
    );
    const cycle: Record<string, unknown> = { ...request() };
    cycle.target = cycle;
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest(cycle),
    );

    const shared = { sessionId: "session.demo", storeGeneration: 3 };
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest({
        ...request(),
        target: shared,
        cursor: shared,
      }),
    );
    const sparse: unknown[] = [];
    sparse.length = 1;
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest({
        ...request(),
        cursor: sparse,
      }),
    );
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest({
        ...request(),
        tenantId: "tenant.demo",
      }),
    );
  });

  test("rejects transparent proxy, depth, width, UTF-8, and oversized cursor input", () => {
    const proxy = new Proxy(request(), {
      get() {
        throw new Error("raw proxy detail");
      },
      ownKeys() {
        throw new Error("raw ownKeys detail");
      },
    });
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest(proxy),
    );

    let nested: Record<string, unknown> = { value: "x" };
    for (let index = 0; index < 10; index += 1) nested = { value: nested };
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest({
        ...request(),
        target: nested,
      }),
    );

    const width: Record<string, unknown> = { ...request() };
    for (let index = 0; index < 40; index += 1)
      width[`unknown${index}`] = index;
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest(width),
    );
    expectCode("INPUT_INVALID", () =>
      parseAgentOsV1ProviderProjectionReadRequest({
        ...request(),
        cursor: "😀".repeat(400),
      }),
    );
  });

  test("does not execute hostile factory or signal option accessors", async () => {
    let admitGetterCalls = 0;
    const factoryInput = {} as Record<string, unknown>;
    Object.defineProperty(factoryInput, "admit", {
      enumerable: true,
      configurable: true,
      get: () => {
        admitGetterCalls += 1;
        throw new Error("raw admit getter");
      },
    });
    Object.defineProperty(factoryInput, "read", {
      enumerable: true,
      configurable: true,
      value: () => snapshotResponse(),
    });
    expectCode("INPUT_INVALID", () =>
      createAgentOsV1ProviderProjectionReferenceClient(factoryInput),
    );
    expect(admitGetterCalls).toBe(0);

    const proxiedFactory = new Proxy(
      { admit: () => ({}), read: () => snapshotResponse() },
      {
        ownKeys() {
          throw new Error("raw factory proxy detail");
        },
      },
    );
    expectCode("INPUT_INVALID", () =>
      createAgentOsV1ProviderProjectionReferenceClient(proxiedFactory),
    );

    let signalGetterCalls = 0;
    const options = { freshAdmission: true } as Record<string, unknown>;
    Object.defineProperty(options, "signal", {
      enumerable: true,
      configurable: true,
      get: () => {
        signalGetterCalls += 1;
        throw new Error("raw signal getter");
      },
    });
    const fixture = createAgentOsV1ProviderProjectionReferenceClient({
      admit: () => ({}),
      read: () => snapshotResponse(),
    });
    await expectAsyncCode("INPUT_INVALID", () =>
      fixture.request(envelope(), options),
    );
    expect(signalGetterCalls).toBe(0);
  });

  test("fails closed if the global structuredClone intrinsic is replaced", () => {
    const original = globalThis.structuredClone;
    try {
      globalThis.structuredClone = (() => {
        throw new Error("raw replacement");
      }) as typeof globalThis.structuredClone;
      expectCode("INPUT_INVALID", () =>
        parseAgentOsV1ProviderProjectionReadRequest(request()),
      );
    } finally {
      globalThis.structuredClone = original;
    }
  });

  test("uses captured Reflect.apply and rejects a transparent Proxy without traps", () => {
    const originalReflectApply = Reflect.apply;
    let traps = 0;
    const proxy = new Proxy(request(), {
      get() {
        traps += 1;
        throw new Error("raw proxy get");
      },
      ownKeys() {
        traps += 1;
        throw new Error("raw proxy ownKeys");
      },
    });
    try {
      Reflect.apply = (() => false) as typeof Reflect.apply;
      expectCode("INPUT_INVALID", () =>
        parseAgentOsV1ProviderProjectionReadRequest(proxy),
      );
      expect(traps).toBe(0);
    } finally {
      Reflect.apply = originalReflectApply;
    }
  });

  test("uses captured AbortSignal intrinsics for pre-abort owner0", async () => {
    const originalReflectApply = Reflect.apply;
    const controller = new AbortController();
    controller.abort();
    let admissions = 0;
    let reads = 0;
    const client = createAgentOsV1ProviderProjectionReferenceClient({
      admit: () => {
        admissions += 1;
        return {
          kind: "fresh-admission",
          requestId: "request.demo",
          requestFingerprint: REQUEST_FINGERPRINT,
        };
      },
      read: () => {
        reads += 1;
        return snapshotResponse();
      },
    });
    try {
      Reflect.apply = (() => false) as typeof Reflect.apply;
      await expectAbort(() =>
        client.request(envelope(), {
          freshAdmission: true,
          signal: controller.signal,
        }),
      );
      expect({ admissions, reads }).toEqual({ admissions: 0, reads: 0 });
    } finally {
      Reflect.apply = originalReflectApply;
    }
  });

  test("uses captured TextEncoder byte counts for oversized UTF-8 cursors", () => {
    const originalTextEncoder = globalThis.TextEncoder;
    class ZeroByteTextEncoder {
      encode(): Uint8Array {
        return new Uint8Array(0);
      }
    }
    try {
      globalThis.TextEncoder =
        ZeroByteTextEncoder as typeof globalThis.TextEncoder;
      expectCode("INPUT_INVALID", () =>
        parseAgentOsV1ProviderProjectionReadRequest({
          ...request(),
          cursor: "😀".repeat(20_000),
        }),
      );
    } finally {
      globalThis.TextEncoder = originalTextEncoder;
    }
  });
});

describe("provider.read AbortSignal wait semantics", () => {
  test("pre-abort performs no admission or read", async () => {
    let admissions = 0;
    let reads = 0;
    const controller = new AbortController();
    controller.abort();
    const client = createAgentOsV1ProviderProjectionReferenceClient({
      admit: () => {
        admissions += 1;
        return {};
      },
      read: () => {
        reads += 1;
        return snapshotResponse();
      },
    });
    await expectAbort(() =>
      client.request(envelope(), {
        freshAdmission: true,
        signal: controller.signal,
      }),
    );
    expect({ admissions, reads }).toEqual({ admissions: 0, reads: 0 });
  });

  test("in-flight abort suppresses late admission and read resolve/reject", async () => {
    const controller = new AbortController();
    let resolveAdmission: ((value: unknown) => void) | undefined;
    let rejectRead: ((reason?: unknown) => void) | undefined;
    let reads = 0;
    const client = createAgentOsV1ProviderProjectionReferenceClient({
      admit: (context) =>
        new Promise((resolve) => {
          resolveAdmission = () =>
            resolve({
              kind: "fresh-admission",
              requestId: context.requestId,
              requestFingerprint: context.requestBinding.requestFingerprint,
            });
        }),
      read: () => {
        reads += 1;
        return new Promise((_resolve, reject) => {
          rejectRead = reject;
        });
      },
    });
    const pending = client.request(envelope(), {
      freshAdmission: true,
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();
    await expectAbort(() => pending);
    resolveAdmission?.({});
    await Promise.resolve();
    expect(reads).toBe(0);

    const secondController = new AbortController();
    const second = createAgentOsV1ProviderProjectionReferenceClient({
      admit: (context) => ({
        kind: "fresh-admission",
        requestId: context.requestId,
        requestFingerprint: context.requestBinding.requestFingerprint,
      }),
      read: () =>
        (() => {
          const pendingRead = new Promise((_resolve, reject) => {
            rejectRead = reject;
          });
          pendingRead.catch(() => undefined);
          return pendingRead;
        })(),
    });
    const secondPending = second.request(envelope(), {
      freshAdmission: true,
      signal: secondController.signal,
    });
    await Promise.resolve();
    secondController.abort();
    await expectAbort(() => secondPending);
    rejectRead?.(new Error("late raw read rejection"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
