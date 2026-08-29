import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { computeCandidateContentDigest } from "./candidate-content-digest.mjs";

describe("candidate content digest", () => {
  test("is stable across creation order and includes source/config/workflow", async () => {
    const first = await createFixture([
      ["src/index.ts", "export const value = 1;\n"],
      ["package.json", '{"name":"candidate"}\n'],
      [".github/workflows/publish.yml", "name: publish\n"],
      ["bun.lock", '{"lockfileVersion":1}\n'],
    ]);
    const second = await createFixture([
      ["bun.lock", '{"lockfileVersion":1}\r\n'],
      [".github/workflows/publish.yml", "name: publish\r\n"],
      ["package.json", '{"name":"candidate"}\r\n'],
      ["src/index.ts", "export const value = 1;\r\n"],
    ]);

    try {
      const firstDigest = await computeCandidateContentDigest(first);
      const secondDigest = await computeCandidateContentDigest(second);
      expect(firstDigest).toEqual(secondDigest);

      await writeFile(
        join(second, ".github/workflows/publish.yml"),
        "name: changed\n",
      );
      expect((await computeCandidateContentDigest(second)).digest).not.toBe(
        firstDigest.digest,
      );
    } finally {
      await Promise.all([
        rm(first, { recursive: true, force: true }),
        rm(second, { recursive: true, force: true }),
      ]);
    }
  }, 20_000);

  test("ignores excluded secrets but tracks additions, deletions and checker changes", async () => {
    const root = await createFixture([
      ["src/index.ts", "export const value = 1;\n"],
      ["scripts/check-candidate-content.mjs", "export const checker = 1;\n"],
      [".env", "SECRET=first\n"],
    ]);

    try {
      const baseline = await computeCandidateContentDigest(root);
      await writeFile(join(root, ".env"), "SECRET=second\n");
      expect(await computeCandidateContentDigest(root)).toEqual(baseline);

      await writeCandidateFile(root, "docs/new.md", "new candidate\n");
      const withAddition = await computeCandidateContentDigest(root);
      expect(withAddition.digest).not.toBe(baseline.digest);
      await rm(join(root, "docs/new.md"));
      expect(await computeCandidateContentDigest(root)).toEqual(baseline);

      await writeFile(
        join(root, "scripts/check-candidate-content.mjs"),
        "export const checker = 2;\n",
      );
      expect((await computeCandidateContentDigest(root)).digest).not.toBe(
        baseline.digest,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);

  test("excludes reports, receipts, build output, temporary files and tarballs", async () => {
    const root = await createFixture([
      ["src/index.ts", "export const value = 1;\n"],
      ["gates/local-gate-report.json", "{}\n"],
      ["gates/release-receipt.json", "{}\n"],
      ["gates/release-receipts/v0.2.0.json", "{}\n"],
      ["dist/index.js", "generated\n"],
      ["packages/sdk/dist/index.js", "generated\n"],
      ["node_modules/dependency/index.js", "installed\n"],
      [".tmp/evidence.json", "{}\n"],
      [".artifacts/package.tgz", "tarball\n"],
      ["candidate.tgz", "tarball\n"],
      ["packages/sdk/.tsbuildinfo", "generated\n"],
    ]);

    try {
      const before = await computeCandidateContentDigest(root);
      for (const [path, content] of [
        ["gates/local-gate-report.json", '{"changed":true}\n'],
        ["gates/release-receipt.json", '{"changed":true}\n'],
        ["gates/release-receipts/v0.2.0.json", '{"changed":true}\n'],
        ["dist/index.js", "changed\n"],
        ["packages/sdk/dist/index.js", "changed\n"],
        ["node_modules/dependency/index.js", "changed\n"],
        [".tmp/evidence.json", "changed\n"],
        [".artifacts/package.tgz", "changed\n"],
        ["candidate.tgz", "changed\n"],
        ["packages/sdk/.tsbuildinfo", "changed\n"],
      ]) {
        await writeFile(join(root, path), content);
      }
      expect(await computeCandidateContentDigest(root)).toEqual(before);

      runGit(root, ["add", "--force", "dist/index.js"]);
      await expect(computeCandidateContentDigest(root)).rejects.toThrow(
        "Generated output must not be tracked",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);

  test("rejects case-folding collisions", async () => {
    const root = await createFixture([["src/Foo.ts", "export {};\n"]]);
    try {
      await expect(
        computeCandidateContentDigest(root, {
          candidatePaths: ["src/Foo.ts", "src/foo.ts"],
        }),
      ).rejects.toThrow("collide under case folding");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);

  test("rejects symbolic links", async () => {
    const root = await createFixture([["src/index.ts", "export {};\n"]]);
    await mkdir(join(root, "target"));
    await symlink(join(root, "target"), join(root, "linked"), "junction");
    try {
      await expect(
        computeCandidateContentDigest(root, { candidatePaths: ["linked"] }),
      ).rejects.toThrow("symbolic link");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);
});

async function createFixture(files) {
  const root = await mkdtemp(join(tmpdir(), "morpheus-candidate-"));
  runGit(root, ["init", "--quiet"]);
  await writeFile(
    join(root, ".gitignore"),
    [
      ".env",
      "node_modules/",
      "**/dist/",
      ".tmp/",
      ".artifacts/",
      "*.tgz",
      "*.tsbuildinfo",
      "",
    ].join("\n"),
  );
  for (const [path, content] of files) {
    await writeCandidateFile(root, path, content);
  }
  return root;
}

async function writeCandidateFile(root, path, content) {
  const absolutePath = join(root, path);
  await mkdir(join(absolutePath, ".."), { recursive: true });
  await writeFile(absolutePath, content);
}

function runGit(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}
