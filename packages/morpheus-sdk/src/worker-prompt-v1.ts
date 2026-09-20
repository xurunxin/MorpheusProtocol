import {
  parseAgentOsWorkerPromptRequestV1,
  parseAgentOsWorkerPromptResponseV1,
  assertAgentOsWorkerPromptResponseBindingV1,
  type AgentOsWorkerPromptRequestV1,
} from "@xurunxin/morpheus-protocol";

/** Stateless private-channel client. Aborting transport does not cancel a Run. */
export function createWorkerPromptClientV1(
  transport: Readonly<{
    request: (
      request: AgentOsWorkerPromptRequestV1,
      signal?: AbortSignal,
    ) => unknown | Promise<unknown>;
  }>,
) {
  if (typeof transport.request !== "function")
    throw new TypeError("WORKER_PROMPT_TRANSPORT_REQUIRED");
  return Object.freeze({
    request: async (input: unknown, signal?: AbortSignal) => {
      const request = parseAgentOsWorkerPromptRequestV1(input);
      if (signal?.aborted) throw new Error("WORKER_PROMPT_TRANSPORT_ABORTED");
      const response = parseAgentOsWorkerPromptResponseV1(
        await transport.request(request, signal),
      );
      if (signal?.aborted) throw new Error("WORKER_PROMPT_TRANSPORT_ABORTED");
      assertAgentOsWorkerPromptResponseBindingV1(request, response);
      return response;
    },
  });
}
