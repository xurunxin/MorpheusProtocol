import {
  parseAgentOsWorkerTaskStartRequestV1,
  parseAgentOsWorkerTaskStartResponseV1,
  assertAgentOsWorkerTaskStartResponseBindingV1,
  type AgentOsWorkerTaskStartRequestV1,
} from "@xurunxin/morpheus-protocol";

/** Stateless business client. Aborting transport does not cancel the accepted Task. */
export function createWorkerTaskStartClientV1(
  transport: Readonly<{
    request: (
      input: Readonly<AgentOsWorkerTaskStartRequestV1>,
      signal?: AbortSignal,
    ) => unknown | Promise<unknown>;
  }>,
) {
  if (typeof transport.request !== "function")
    throw new TypeError("TASK_TRANSPORT_REQUIRED");
  return Object.freeze({
    async request(input: unknown, signal?: AbortSignal) {
      const request = parseAgentOsWorkerTaskStartRequestV1(input);
      if (signal?.aborted) throw new Error("TASK_TRANSPORT_ABORTED");
      const response = parseAgentOsWorkerTaskStartResponseV1(
        await transport.request(request, signal),
      );
      if (signal?.aborted) throw new Error("TASK_TRANSPORT_ABORTED");
      assertAgentOsWorkerTaskStartResponseBindingV1(request, response);
      return response;
    },
  });
}
