import { expect, test } from "bun:test";
import { createWorkerPromptClientV1 } from "../src/worker-prompt-v1.js";
import { createAgentOsWorkerPromptRequestDigestV1 } from "@xurunxin/morpheus-protocol";

const request = {
  schemaVersion: "agent-os-worker-prompt/v1",
  requestId: "request.read",
  operation: "prompt.read",
  runId: "run.demo",
  cursor: null,
  limit: 1,
};
const rejected = {
  schemaVersion: request.schemaVersion,
  requestId: request.requestId,
  operation: request.operation,
  requestDigest: createAgentOsWorkerPromptRequestDigestV1(request),
  status: "rejected",
  code: "NOT_FOUND",
};

test("SDK validates input before transport and rejects mismatched response without retry", async () => {
  let calls = 0;
  let response = rejected;
  const client = createWorkerPromptClientV1({
    request: () => {
      calls++;
      return response;
    },
  });
  await expect(
    client.request({ ...request, grant: "forged" }),
  ).rejects.toThrow();
  expect(calls).toBe(0);
  expect(await client.request(request)).toEqual(rejected);
  response = { ...rejected, requestId: "request.other" };
  await expect(client.request(request)).rejects.toThrow();
  expect(calls).toBe(2);
});

test("aborting transport never synthesizes a Run cancellation", async () => {
  const controller = new AbortController();
  const operations: string[] = [];
  const client = createWorkerPromptClientV1({
    request: (input, signal) => {
      operations.push(input.operation);
      expect(signal).toBe(controller.signal);
      controller.abort();
      return rejected;
    },
  });
  await expect(client.request(request, controller.signal)).rejects.toThrow(
    "WORKER_PROMPT_TRANSPORT_ABORTED",
  );
  await expect(client.request(request, controller.signal)).rejects.toThrow(
    "WORKER_PROMPT_TRANSPORT_ABORTED",
  );
  expect(operations).toEqual(["prompt.read"]);
});
