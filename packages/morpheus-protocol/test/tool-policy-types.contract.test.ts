import { describe, expect, test } from "bun:test";
import type {
  ToolPolicy,
  ToolResultEnvelope,
} from "@xurunxin/morpheus-protocol";
import {
  decodeToolResultEnvelope,
  encodeToolResultEnvelope,
  parseToolResultEnvelope,
} from "@xurunxin/morpheus-protocol";

describe("tool policy sandbox-cli authority", () => {
  test("serializes the current sandbox-cli policy", () => {
    const policy = {
      tools: {
        execute_wasm: {
          target: "wasm",
          sandboxCli: {
            enabled: true,
            manifest: "dist/manifest.json",
            binaryPath: "packages/sandbox-cli/target/debug/sandbox-cli.exe",
            workspaceGuestRoot: "/workspace",
            workspaceAccess: "readWrite",
          },
        },
      },
    } satisfies ToolPolicy;

    expect(JSON.parse(JSON.stringify(policy))).toEqual({
      tools: {
        execute_wasm: {
          target: "wasm",
          sandboxCli: {
            enabled: true,
            manifest: "dist/manifest.json",
            binaryPath: "packages/sandbox-cli/target/debug/sandbox-cli.exe",
            workspaceGuestRoot: "/workspace",
            workspaceAccess: "readWrite",
          },
        },
      },
    });
  });

  test("represents completed, denied and failed results with envelopes", () => {
    const results = [
      {
        callId: "call.completed",
        status: "completed",
        output: "done",
        artifacts: [],
        auditIds: ["audit.completed"],
      },
      {
        callId: "call.denied",
        status: "denied",
        artifacts: [],
        error: { kind: "policy_denied", message: "需要批准" },
        auditIds: ["audit.denied"],
      },
      {
        callId: "call.failed",
        status: "failed",
        artifacts: [{ artifactId: "artifact.failed" }],
        error: { kind: "tool_failed", message: "执行失败" },
        durationMs: 7,
        auditIds: ["audit.failed"],
      },
    ] satisfies readonly ToolResultEnvelope<string>[];

    expect(results.map((result) => result.status)).toEqual([
      "completed",
      "denied",
      "failed",
    ]);
    expect(
      decodeToolResultEnvelope(encodeToolResultEnvelope(results[0])),
    ).toEqual(results[0]);
    expect(() =>
      parseToolResultEnvelope({ ...results[0], unexpected: true }),
    ).toThrow("unknown field unexpected");
    expect(() =>
      parseToolResultEnvelope({
        ...results[1],
        output: "must not be accepted",
      }),
    ).toThrow("cannot contain output");
  });
});
