import {
  parseAgentOsTaskRequestV1,
  parseAgentOsTaskResponseV1,
  assertAgentOsTaskResponseBindingV1,
  type AgentOsTaskRequestV1,
} from "@xurunxin/morpheus-protocol";

/** Stateless transport. Aborting an observation never creates a cancellation command. */
export function createTaskHandleClientV1(
  transport: Readonly<{
    request: (
      request: AgentOsTaskRequestV1,
      signal?: AbortSignal,
    ) => unknown | Promise<unknown>;
  }>,
) {
  if (typeof transport.request !== "function")
    throw new TypeError("TASK_TRANSPORT_REQUIRED");
  return Object.freeze({
    request: async (input: unknown, signal?: AbortSignal) => {
      const request = parseAgentOsTaskRequestV1(input);
      if (signal?.aborted) throw new Error("TASK_TRANSPORT_ABORTED");
      const response = parseAgentOsTaskResponseV1(
        await transport.request(request, signal),
      );
      if (signal?.aborted) throw new Error("TASK_TRANSPORT_ABORTED");
      assertAgentOsTaskResponseBindingV1(request, response);
      return response;
    },
  });
}
