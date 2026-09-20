import { expect, test } from "bun:test";
import { createTaskHandleClientV1 } from "../src/task-handle-v1.js";
import { createAgentOsTaskRequestDigestV1 } from "@xurunxin/morpheus-protocol";
const request = {
  schemaVersion: "agent-os-task-handle/v1",
  requestId: "request.one",
  handleId: `task.${"1".repeat(64)}`,
  operation: "task.observe",
};
const rejected = {
  schemaVersion: request.schemaVersion,
  requestId: request.requestId,
  operation: request.operation,
  requestDigest: createAgentOsTaskRequestDigestV1(request),
  status: "rejected",
  code: "NOT_FOUND",
};
test("task SDK validates before IO, correlates replies and never retries", async () => {
  let calls = 0;
  let response = rejected;
  const client = createTaskHandleClientV1({
    request: () => {
      calls++;
      return response;
    },
  });
  await expect(client.request({ ...request, authority: {} })).rejects.toThrow();
  expect(calls).toBe(0);
  expect(await client.request(request)).toEqual(rejected);
  response = { ...rejected, requestId: "request.foreign" };
  await expect(client.request(request)).rejects.toThrow();
  expect(calls).toBe(2);
});
test("aborting observation does not send task.cancel", async () => {
  const controller = new AbortController();
  const operations: string[] = [];
  const client = createTaskHandleClientV1({
    request: (input, signal) => {
      expect(signal).toBe(controller.signal);
      operations.push(input.operation);
      controller.abort();
      return rejected;
    },
  });
  await expect(client.request(request, controller.signal)).rejects.toThrow(
    "TASK_TRANSPORT_ABORTED",
  );
  await expect(client.request(request, controller.signal)).rejects.toThrow(
    "TASK_TRANSPORT_ABORTED",
  );
  expect(operations).toEqual(["task.observe"]);
});
