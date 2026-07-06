import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import type { ToolPolicy } from "@morpheus/api-protocol";

const source = readFileSync(
  path.join(import.meta.dir, "..", "src", "tool-policy-types.ts"),
  "utf8"
);

describe("tool policy sandbox-cli authority", () => {
  test("serializes sandbox-cli policy without migration modes", () => {
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

  test("does not expose dual-run, rollback, or migration policy fields", () => {
    const sandboxCliPolicyBlock = source.match(
      /export interface SandboxCliTargetPolicy \{[\s\S]*?\n\}/
    )?.[0];

    expect(sandboxCliPolicyBlock).toBeDefined();
    expect(sandboxCliPolicyBlock).not.toContain("mode");
    expect(sandboxCliPolicyBlock).not.toContain("acceptedDifferences");
    expect(sandboxCliPolicyBlock).not.toContain("rollbackReason");
    expect(sandboxCliPolicyBlock).not.toContain("migration");
  });
});
