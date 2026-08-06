import type { AgentOsV1CanonicalPromptReferenceClient } from "@morpheus/api-protocol";

export type PromptStartArguments = Parameters<AgentOsV1CanonicalPromptReferenceClient["start"]>;
export type PromptCancelArguments = Parameters<AgentOsV1CanonicalPromptReferenceClient["cancel"]>;
export type PromptStartResponse = Awaited<
  ReturnType<AgentOsV1CanonicalPromptReferenceClient["start"]>
>;
export type PromptCancelResponse = Awaited<
  ReturnType<AgentOsV1CanonicalPromptReferenceClient["cancel"]>
>;

export interface RunPromptWithAbortOptions {
  readonly client: Pick<AgentOsV1CanonicalPromptReferenceClient, "start" | "cancel">;
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
  options: Readonly<RunPromptWithAbortOptions>
): Promise<RunPromptWithAbortOutcome> {
  if (options.signal.aborted) return Object.freeze({ kind: "aborted-before-start" });
  const startArguments = options.startArguments();
  if (options.signal.aborted) return Object.freeze({ kind: "aborted-before-start" });

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
      .then((response) => Object.freeze({ kind: "completed" as const, response }));
    const winner = await Promise.race([completed, abortRequested]);
    if (winner.kind === "completed") return winner;
    return Object.freeze({ kind: "cancelled", response: await winner.operation });
  } finally {
    options.signal.removeEventListener("abort", abort);
  }
}
