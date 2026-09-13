import type {
  AgentOsInteractiveV3Request,
  AgentOsInteractiveV3Response,
  AgentOsV1CanonicalPromptReferenceClient,
} from "@xurunxin/morpheus-protocol";

import type { InteractiveV3AppClient } from "./interactive-v3.js";

export type PromptStartArguments = Parameters<
  AgentOsV1CanonicalPromptReferenceClient["start"]
>;
export type PromptCancelArguments = Parameters<
  AgentOsV1CanonicalPromptReferenceClient["cancel"]
>;
export type PromptStartResponse = Awaited<
  ReturnType<AgentOsV1CanonicalPromptReferenceClient["start"]>
>;
export type PromptCancelResponse = Awaited<
  ReturnType<AgentOsV1CanonicalPromptReferenceClient["cancel"]>
>;

export interface RunPromptWithAbortOptions {
  readonly client: Pick<
    AgentOsV1CanonicalPromptReferenceClient,
    "start" | "cancel"
  >;
  readonly signal: AbortSignal;
  readonly startArguments: () => PromptStartArguments;
  readonly cancelArguments: () => PromptCancelArguments;
}

export type RunPromptWithAbortOutcome =
  | Readonly<{ kind: "aborted-before-start" }>
  | Readonly<{ kind: "completed"; response: PromptStartResponse }>
  | Readonly<{ kind: "cancelled"; response: PromptCancelResponse }>;

/**
 * 只编排 caller 注入的 Prompt client、参数与 AbortSignal，不生成任何 wire 或 authority 字段。
 */
export async function runPromptWithAbort(
  options: Readonly<RunPromptWithAbortOptions>,
): Promise<RunPromptWithAbortOutcome> {
  if (options.signal.aborted)
    return Object.freeze({ kind: "aborted-before-start" });
  const startArguments = options.startArguments();
  if (options.signal.aborted)
    return Object.freeze({ kind: "aborted-before-start" });

  let cancelStarted = false;
  let resolveAbort: (request: {
    readonly kind: "abort-requested";
    readonly operation: Promise<PromptCancelResponse>;
  }) => void = () => undefined;
  const abortRequested = new Promise<{
    readonly kind: "abort-requested";
    readonly operation: Promise<PromptCancelResponse>;
  }>((resolve) => {
    resolveAbort = resolve;
  });
  const abort = (): void => {
    if (cancelStarted) return;
    cancelStarted = true;
    let operation: Promise<PromptCancelResponse>;
    try {
      operation = options.client.cancel(...options.cancelArguments());
    } catch (error: unknown) {
      operation = Promise.reject(error);
    }
    resolveAbort(Object.freeze({ kind: "abort-requested", operation }));
  };
  options.signal.addEventListener("abort", abort, { once: true });
  try {
    const completed = options.client
      .start(...startArguments)
      .then((response) =>
        Object.freeze({ kind: "completed" as const, response }),
      );
    const winner = await Promise.race([completed, abortRequested]);
    if (winner.kind === "completed") return winner;
    return Object.freeze({
      kind: "cancelled",
      response: await winner.operation,
    });
  } finally {
    options.signal.removeEventListener("abort", abort);
  }
}

export interface RunInteractiveV3TurnWithAbortOptions {
  /** 只需要 request 能力的 v3 App 客户端。 */
  readonly client: Pick<InteractiveV3AppClient, "request">;
  readonly signal: AbortSignal;
  /** 完整的 turn.start 请求（含调用方构造的 command binding）。 */
  readonly startRequest: Readonly<AgentOsInteractiveV3Request>;
  /** 完整的 turn.cancel 请求（独立 command binding；中止时作为显式命令发送）。 */
  readonly cancelRequest: Readonly<AgentOsInteractiveV3Request>;
}

export type RunInteractiveV3TurnWithAbortOutcome =
  | Readonly<{ kind: "aborted-before-start" }>
  | Readonly<{
      kind: "completed";
      response: Readonly<AgentOsInteractiveV3Response>;
    }>
  | Readonly<{
      kind: "cancelled";
      response: Readonly<AgentOsInteractiveV3Response>;
    }>;

/**
 * v3 取消编排：AbortSignal 只触发一个显式的 `turn.cancel` 命令请求；
 * 关闭订阅、断开 transport 或超时都不会在本函数内合成取消命令。
 * start/cancel 的 commandId 与 payload 由调用方固定，重试不得漂移。
 */
export async function runInteractiveV3TurnWithAbort(
  options: Readonly<RunInteractiveV3TurnWithAbortOptions>,
): Promise<RunInteractiveV3TurnWithAbortOutcome> {
  if (
    (options.startRequest as { operation?: unknown }).operation !== "turn.start"
  )
    throw new TypeError("startRequest must be a turn.start operation");
  if (
    (options.cancelRequest as { operation?: unknown }).operation !==
    "turn.cancel"
  )
    throw new TypeError("cancelRequest must be a turn.cancel operation");
  if (options.signal.aborted)
    return Object.freeze({ kind: "aborted-before-start" });

  let cancelStarted = false;
  let resolveAbort: (request: {
    readonly kind: "abort-requested";
    readonly operation: Promise<Readonly<AgentOsInteractiveV3Response>>;
  }) => void = () => undefined;
  const abortRequested = new Promise<{
    readonly kind: "abort-requested";
    readonly operation: Promise<Readonly<AgentOsInteractiveV3Response>>;
  }>((resolve) => {
    resolveAbort = resolve;
  });
  const abort = (): void => {
    if (cancelStarted) return;
    cancelStarted = true;
    let operation: Promise<Readonly<AgentOsInteractiveV3Response>>;
    try {
      operation = options.client.request(options.cancelRequest);
    } catch (error: unknown) {
      operation = Promise.reject(error);
    }
    resolveAbort(Object.freeze({ kind: "abort-requested", operation }));
  };
  options.signal.addEventListener("abort", abort, { once: true });
  try {
    const completed = options.client
      .request(options.startRequest)
      .then((response) =>
        Object.freeze({ kind: "completed" as const, response }),
      );
    const winner = await Promise.race([completed, abortRequested]);
    if (winner.kind === "completed") return winner;
    return Object.freeze({
      kind: "cancelled",
      response: await winner.operation,
    });
  } finally {
    options.signal.removeEventListener("abort", abort);
  }
}
