import { describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadPackCandidates } from "./reconcile-package-publish.mjs";

describe("local pack candidate validation", () => {
  test("accepts the exact lockstep package set with verified tarballs", async () => {
    const fixture = await createFixture();
    try {
      const candidates = await loadPackCandidates(fixture.root);
      expect(candidates.map((candidate) => candidate.name)).toEqual([
        "@xurunxin/morpheus-protocol",
        "@xurunxin/morpheus-sdk",
      ]);
      expect(
        candidates.every((candidate) => candidate.version === "0.2.0"),
      ).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });

  test.each([
    [
      "duplicate entry",
      (manifest) => {
        manifest[1] = { ...manifest[0] };
      },
      "exactly once",
    ],
    [
      "unknown entry",
      (manifest) => {
        manifest.push({ ...manifest[0], name: "@xurunxin/unexpected" });
      },
      "unexpected package entry",
    ],
    [
      "path traversal",
      (manifest) => {
        manifest[0].filename = "../outside.tgz";
      },
      "filename is unsafe",
    ],
    [
      "tampered digest",
      (manifest) => {
        manifest[0].sha256 = "0".repeat(64);
      },
      "digest does not match",
    ],
    [
      "split version",
      (manifest) => {
        manifest[1].version = "0.3.0";
      },
      "lockstep version",
    ],
  ])("rejects %s before registry access", async (_label, mutate, message) => {
    const fixture = await createFixture(mutate);
    try {
      await expect(loadPackCandidates(fixture.root)).rejects.toThrow(message);
    } finally {
      await fixture.cleanup();
    }
  });
});

async function createFixture(mutate = () => {}) {
  const root = await mkdtemp(join(tmpdir(), "morpheus-pack-candidate-"));
  const artifactRoot = join(root, ".artifacts");
  const protocolRoot = join(root, "packages/morpheus-protocol");
  const sdkRoot = join(root, "packages/morpheus-sdk");
  await Promise.all([
    mkdir(artifactRoot, { recursive: true }),
    mkdir(protocolRoot, { recursive: true }),
    mkdir(sdkRoot, { recursive: true }),
  ]);

  const entries = [];
  for (const [name, filename, content] of [
    [
      "@xurunxin/morpheus-protocol",
      "xurunxin-morpheus-protocol-0.2.0.tgz",
      "protocol tarball",
    ],
    [
      "@xurunxin/morpheus-sdk",
      "xurunxin-morpheus-sdk-0.2.0.tgz",
      "sdk tarball",
    ],
  ]) {
    const bytes = Buffer.from(content);
    await writeFile(join(artifactRoot, filename), bytes);
    entries.push({
      name,
      version: "0.2.0",
      filename,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      integrity: `sha512-${createHash("sha512")
        .update(bytes)
        .digest("base64")}`,
    });
  }

  mutate(entries);
  await Promise.all([
    writeFile(
      join(artifactRoot, "pack-manifest.json"),
      `${JSON.stringify(entries, null, 2)}\n`,
    ),
    writeFile(
      join(protocolRoot, "package.json"),
      `${JSON.stringify({
        name: "@xurunxin/morpheus-protocol",
        version: "0.2.0",
      })}\n`,
    ),
    writeFile(
      join(sdkRoot, "package.json"),
      `${JSON.stringify({
        name: "@xurunxin/morpheus-sdk",
        version: "0.2.0",
        dependencies: { "@xurunxin/morpheus-protocol": "0.2.0" },
      })}\n`,
    ),
  ]);

  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
