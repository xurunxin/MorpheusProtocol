import { expect, test } from "bun:test";
import { createAgentOsWorkerTaskStartRequestDigestV1 } from "@xurunxin/morpheus-protocol";
import { createWorkerTaskStartClientV1 } from "../src/worker-task-start-v1.js";
const input = {
  schemaVersion: "agent-os-worker-task-start/v1",
  operation: "task.start",
  requestId: "rpc.one",
  commandId: "command.one",
  prompt: { messages: [{ role: "user", content: "Inspect" }] },
  title: "Inspect",
  acceptanceCriteria: ["Evidence"],
  mode: "background",
};
test("task start client preserves rejection and never retries or synthesizes cancellation on abort", async () => {
  let calls = 0;
  const abort = new AbortController();
  const client = createWorkerTaskStartClientV1({
    request(request) {
      calls++;
      return {
        schemaVersion: request.schemaVersion,
        operation: request.operation,
        requestId: request.requestId,
        requestDigest: createAgentOsWorkerTaskStartRequestDigestV1(request),
        status: "rejected",
        code: "BUSY",
      };
    },
  });
  expect(await client.request(input)).toMatchObject({
    status: "rejected",
    code: "BUSY",
  });
  abort.abort();
  await expect(client.request(input, abort.signal)).rejects.toThrow(
    "TASK_TRANSPORT_ABORTED",
  );
  expect(calls).toBe(1);
});
