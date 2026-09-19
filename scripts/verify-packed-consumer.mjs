import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const artifactDirectory = resolve(root, ".artifacts");
const matrixCacheRoot = resolve(root, ".tmp", "packed-matrix-cache");
// 混合版本矩阵的"旧发布"基线：interactive v1（0.4.0）。
const OLD_RELEASE_TAG = "v0.4.0";
const REPORT_SCHEMA = "morpheus-protocol/packed-consumer-report/v1";

async function main() {
  run(["bun", "run", "pack"], root, "package build");
  const candidateManifest = JSON.parse(
    await readFile(resolve(artifactDirectory, "pack-manifest.json"), "utf8"),
  );
  assert(
    candidateManifest.length === 2,
    "pack manifest must contain exactly two packages",
  );
  assertArtifactContents(candidateManifest, "candidate");

  const matrix = [];
  const candidateProtocol = packageArtifact(
    candidateManifest,
    "@xurunxin/morpheus-protocol",
    artifactDirectory,
  );
  const candidateSdk = packageArtifact(
    candidateManifest,
    "@xurunxin/morpheus-sdk",
    artifactDirectory,
  );

  // ── new-new：候选 0.5.0 协议 + 候选 0.5.0 SDK（含 v3 出口与 subpath） ──
  await runConsumerCase({
    matrix,
    caseName: "new-new",
    expected: "accept",
    protocol: candidateProtocol,
    sdk: candidateSdk,
    consumerKind: "v3",
    strictFrozenReinstall: true,
  });

  // ── 旧发布工件（v0.4.0，按 tag commit 缓存） ─────────────────────────
  const old = await ensureOldArtifacts();
  assertArtifactContents(old.manifest, "old release");

  // ── old-old：0.4.0 + 0.4.0（v1 出口保持） ────────────────────────────
  await runConsumerCase({
    matrix,
    caseName: "old-old",
    expected: "accept",
    protocol: packageArtifact(
      old.manifest,
      "@xurunxin/morpheus-protocol",
      old.directory,
    ),
    sdk: packageArtifact(old.manifest, "@xurunxin/morpheus-sdk", old.directory),
    consumerKind: "v1",
  });

  // ── mixed（前进）：旧 protocol + 候选 SDK → 必须被拒绝 ────────────────
  await runConsumerCase({
    matrix,
    caseName: "mixed-protocol-old-sdk-new",
    expected: "reject",
    protocol: packageArtifact(
      old.manifest,
      "@xurunxin/morpheus-protocol",
      old.directory,
    ),
    sdk: candidateSdk,
    consumerKind: "v3",
    rejectReason:
      "候选 SDK 只消费 0.5.0 协议出口；0.4.0 协议缺 v2/v3 符号，安装或导入必须失败",
  });

  // ── mixed（向后兼容）：候选 protocol + 旧 SDK → v1 出口保持 ───────────
  await runConsumerCase({
    matrix,
    caseName: "mixed-protocol-new-sdk-old",
    expected: "accept",
    protocol: candidateProtocol,
    sdk: packageArtifact(old.manifest, "@xurunxin/morpheus-sdk", old.directory),
    consumerKind: "v1",
    note: "向后兼容：旧 SDK 只消费 v1 出口，0.5.0 协议全部保持",
  });

  const failed = matrix.some((entry) => entry.outcome !== "pass");
  const report = {
    schemaVersion: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    oldRelease: { tag: OLD_RELEASE_TAG, commit: old.commit },
    artifacts: {
      candidate: candidateManifest.map(artifactIdentity),
      old: old.manifest.map(artifactIdentity),
    },
    matrix,
    result: failed ? "fail" : "pass",
  };
  await writeFile(
    resolve(artifactDirectory, "packed-consumer-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  for (const entry of matrix) {
    console.info(
      `matrix ${entry.expected.padEnd(6)} ${entry.caseName}: ${entry.outcome}`,
    );
  }
  if (failed) throw new Error("packed consumer matrix has failing cases");
  console.info("Packed empty-consumer verification passed");
}

function artifactIdentity(packed) {
  return {
    name: packed.name,
    version: packed.version,
    filename: packed.filename,
    sha256: packed.sha256,
    integrity: packed.integrity,
  };
}

function assertArtifactContents(manifest, label) {
  for (const packed of manifest) {
    const required = [
      "package.json",
      "README.md",
      "CHANGELOG.md",
      "LICENSE",
      "dist/index.js",
      "dist/index.d.ts",
    ];
    for (const path of required) {
      assert(packed.files.includes(path), `${packed.name} is missing ${path}`);
    }
    assert(
      packed.files.every(
        (path) =>
          !path.startsWith("src/") &&
          !path.startsWith("test/") &&
          !path.includes("node_modules") &&
          !path.endsWith(".tsbuildinfo"),
      ),
      `${packed.name} contains source, tests or node_modules`,
    );
    assert(
      typeof packed.integrity === "string" &&
        packed.integrity.startsWith("sha512-"),
      `${label} ${packed.name} 必须携带真实 npm SRI`,
    );
  }
}

async function ensureOldArtifacts() {
  const commit = runCapture(
    ["git", "rev-parse", `${OLD_RELEASE_TAG}^{commit}`],
    root,
    "resolve old release commit",
  ).trim();
  const cacheRoot = resolve(matrixCacheRoot, commit);
  const manifestPath = resolve(cacheRoot, "pack-manifest.json");
  if (await fileExists(manifestPath)) {
    return {
      tag: OLD_RELEASE_TAG,
      commit,
      directory: cacheRoot,
      manifest: JSON.parse(await readFile(manifestPath, "utf8")),
    };
  }
  await mkdir(cacheRoot, { recursive: true });
  const treeDirectory = resolve(cacheRoot, "tree");
  await rm(treeDirectory, { force: true, recursive: true });
  await mkdir(treeDirectory, { recursive: true });
  const archivePath = resolve(cacheRoot, "tree.tar");
  run(
    [
      "git",
      "archive",
      "--format=tar",
      "--output",
      archivePath,
      OLD_RELEASE_TAG,
    ],
    root,
    "git archive old release",
  );
  run(
    ["tar", "-xf", archivePath, "-C", treeDirectory],
    root,
    "extract old tree",
  );
  await rm(archivePath, { force: true });
  run(
    ["bun", "install", "--frozen-lockfile"],
    treeDirectory,
    "old tree install",
  );
  run(["bun", "run", "pack"], treeDirectory, "old tree pack");
  const treeManifest = JSON.parse(
    await readFile(
      resolve(treeDirectory, ".artifacts", "pack-manifest.json"),
      "utf8",
    ),
  );
  const manifest = [];
  for (const packed of treeManifest) {
    const source = resolve(treeDirectory, ".artifacts", packed.filename);
    const bytes = await readFile(source);
    await writeFile(resolve(cacheRoot, packed.filename), bytes);
    manifest.push({
      ...packed,
      sha256: packed.sha256 ?? createHash("sha256").update(bytes).digest("hex"),
    });
  }
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return { tag: OLD_RELEASE_TAG, commit, directory: cacheRoot, manifest };
}

async function runConsumerCase(specification) {
  const consumer = await mkdtemp(resolve(tmpdir(), "morpheus-packed-matrix-"));
  const entry = {
    caseName: specification.caseName,
    expected: specification.expected,
    protocol: identityOf(specification.protocol),
    sdk: identityOf(specification.sdk),
    layers: {},
  };
  try {
    const protocolSpecifier = fileSpecifier(specification.protocol);
    const sdkSpecifier = fileSpecifier(specification.sdk);
    await writeFile(
      resolve(consumer, "package.json"),
      `${JSON.stringify(
        {
          name: `morpheus-packed-matrix-${specification.caseName}`,
          private: true,
          type: "module",
          dependencies: {
            "@xurunxin/morpheus-protocol": protocolSpecifier,
            "@xurunxin/morpheus-sdk": sdkSpecifier,
          },
          overrides: {
            "@xurunxin/morpheus-protocol": protocolSpecifier,
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    if (specification.consumerKind === "v3") await writeV3Consumer(consumer);
    if (specification.consumerKind === "v1") await writeV1Consumer(consumer);

    entry.layers.install = attempt(
      ["bun", "install", "--frozen-lockfile", "--no-cache"],
      consumer,
      "consumer install",
    );
    if (
      specification.strictFrozenReinstall === true &&
      entry.layers.install.ok
    ) {
      await rm(resolve(consumer, "node_modules"), {
        force: true,
        recursive: true,
      });
      entry.layers.frozenReinstall = attempt(
        ["bun", "install", "--frozen-lockfile", "--no-cache"],
        consumer,
        "frozen reinstall",
      );
      entry.layers.install = entry.layers.frozenReinstall;
    }
    if (entry.layers.install.ok && specification.consumerKind !== "none") {
      entry.layers.import = attempt(
        ["bun", "consumer.mjs"],
        consumer,
        "consumer import",
      );
    }
    const rejected =
      !entry.layers.install.ok || entry.layers.import?.ok === false;
    if (specification.expected === "accept") {
      entry.outcome =
        entry.layers.install.ok && entry.layers.import?.ok !== false
          ? "pass"
          : "fail";
      if (entry.outcome === "fail")
        entry.detail = `期望接受但被拒绝：${JSON.stringify(entry.layers)}`;
    } else {
      entry.outcome = rejected ? "pass" : "fail";
      entry.detail = rejected
        ? (specification.rejectReason ?? "按预期被拒绝")
        : "期望拒绝但安装与导入均成功";
    }
    if (specification.note) entry.note = specification.note;
  } finally {
    await rm(consumer, { force: true, recursive: true });
  }
  specification.matrix.push(entry);
}

function identityOf(packed) {
  return `${packed.name}@${packed.version}`;
}

function writeV3Consumer(consumerDirectory) {
  return writeFile(
    resolve(consumerDirectory, "consumer.mjs"),
    `import { AGENT_OS_CONTROL_V1_OPERATION_MATRIX, AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION, AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION, AGENT_OS_INTERACTIVE_V3_OPERATIONS, AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION, AGENT_OS_V1_PROTOCOL_REGISTRY, parseAgentOsInteractiveV2Request, parseAgentOsInteractiveV3Request } from "@xurunxin/morpheus-protocol";\n` +
      `import { createInteractiveAppClient, createInteractiveV2AppClient, createInteractiveV3AppClient, reduceInteractiveTranscript, runInteractiveV3TurnWithAbort, transitionInteractiveV3Projection } from "@xurunxin/morpheus-sdk";\n` +
      `import { createInteractiveJsonlStreamTransport } from "@xurunxin/morpheus-sdk/node";\n` +
      `import { createBrowserInteractiveTransport } from "@xurunxin/morpheus-sdk/browser";\n` +
      `if (!AGENT_OS_V1_PROTOCOL_REGISTRY) throw new Error("missing protocol registry");\n` +
      `if (AGENT_OS_CONTROL_V1_OPERATION_MATRIX.length !== 38) throw new Error("missing Control operation matrix");\n` +
      `if (AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION !== "agent-os-interactive.v1") throw new Error("missing interactive v1 schema");\n` +
      `if (AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION !== "agent-os-interactive.v2" || typeof parseAgentOsInteractiveV2Request !== "function") throw new Error("missing interactive v2 contract");\n` +
      `if (AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION !== "agent-os-interactive.v3") throw new Error("missing interactive v3 schema");\n` +
      `if (!Array.isArray(AGENT_OS_INTERACTIVE_V3_OPERATIONS) || AGENT_OS_INTERACTIVE_V3_OPERATIONS.length === 0) throw new Error("missing interactive v3 operations");\n` +
      `if (typeof parseAgentOsInteractiveV3Request !== "function") throw new Error("missing interactive v3 parser");\n` +
      `if (typeof createInteractiveAppClient !== "function" || typeof reduceInteractiveTranscript !== "function") throw new Error("missing Interactive App SDK");\n` +
      `if (typeof createInteractiveV2AppClient !== "function") throw new Error("missing Interactive v2 App SDK");\n` +
      `if (typeof createInteractiveV3AppClient !== "function" || typeof transitionInteractiveV3Projection !== "function" || typeof runInteractiveV3TurnWithAbort !== "function") throw new Error("missing Interactive v3 App SDK");\n` +
      `if (typeof createInteractiveJsonlStreamTransport !== "function") throw new Error("missing sdk/node transport");\n` +
      `if (typeof createBrowserInteractiveTransport !== "function") throw new Error("missing sdk/browser transport");\n` +
      `const p4 = await import("@xurunxin/morpheus-protocol");\n` +
      `const s4 = await import("@xurunxin/morpheus-sdk");\n` +
      `const owner = {sessionId:"s",runId:"r",turnId:"t",bindingRevision:1,fence:1};\n` +
      `const request = {schemaVersion:"agent-os-interactive.v4",operation:"prompt.queue.read",requestId:"q",owner};\n` +
      `p4.decodeAgentOsInteractiveV4Request(p4.serializeAgentOsInteractiveV4Request(request));\n` +
      `p4.parseAgentOsInteractiveV4Request({schemaVersion:"agent-os-interactive.v4",operation:"prompt.queue.owner.read",requestId:"discover",sessionId:"s"});\n` +
      `p4.parseAgentOsInteractiveV4Response({schemaVersion:"agent-os-interactive.v4",operation:"prompt.queue.owner.read",requestId:"discover",sessionId:"s",owner,sealed:false});\n` +
      `let refused = false; try { parseAgentOsInteractiveV3Request(request); } catch { refused = true; }\n` +
      `if (!refused) throw new Error("v3 accepted v4 input");\n` +
      `const state = s4.transitionInteractiveV4Queue(null,{owner,queueRevision:0,inputs:[]},owner,"snapshot");\n` +
      `if (state.kind !== "committed" || typeof s4.createInteractiveV4AppClient !== "function") throw new Error("v4 consumer failed");\n`,
    "utf8",
  );
}

function writeV1Consumer(consumerDirectory) {
  return writeFile(
    resolve(consumerDirectory, "consumer.mjs"),
    `import { AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION, AGENT_OS_V1_PROTOCOL_REGISTRY } from "@xurunxin/morpheus-protocol";\n` +
      `import { createAgentOsAppClient, createInteractiveAppClient, reduceInteractiveTranscript, runPromptWithAbort, transitionPromptProjection } from "@xurunxin/morpheus-sdk";\n` +
      `if (!AGENT_OS_V1_PROTOCOL_REGISTRY) throw new Error("missing protocol registry");\n` +
      `if (AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION !== "agent-os-interactive.v1") throw new Error("missing interactive v1 schema");\n` +
      `if (typeof createAgentOsAppClient !== "function") throw new Error("missing App SDK");\n` +
      `if (typeof createInteractiveAppClient !== "function" || typeof reduceInteractiveTranscript !== "function") throw new Error("missing Interactive App SDK");\n` +
      `if (typeof runPromptWithAbort !== "function" || typeof transitionPromptProjection !== "function") throw new Error("missing prompt abort/projection SDK");\n`,
    "utf8",
  );
}

function packageArtifact(manifest, name, directory) {
  const packed = manifest.find((entry) => entry.name === name);
  assert(packed !== undefined, `missing package artifact for ${name}`);
  return { ...packed, path: resolve(directory, packed.filename) };
}

function fileSpecifier(packed) {
  return `file:${packed.path.replaceAll("\\", "/")}`;
}

async function fileExists(path) {
  return await Bun.file(path).exists();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function spawnSync(command, cwd) {
  const normalized =
    process.platform === "win32" && command[0] === "bun"
      ? ["bun.exe", ...command.slice(1)]
      : command;
  return Bun.spawnSync({
    cmd: normalized,
    cwd,
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
}

function run(command, cwd, label) {
  const result = spawnSync(command, cwd);
  if (result.exitCode !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`${label} failed with exit code ${result.exitCode}`);
  }
  process.stdout.write(result.stdout);
}

function runCapture(command, cwd, label) {
  const result = spawnSync(command, cwd);
  if (result.exitCode !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`${label} failed with exit code ${result.exitCode}`);
  }
  return new TextDecoder().decode(result.stdout);
}

function attempt(command, cwd, label) {
  const result = spawnSync(command, cwd);
  if (result.exitCode === 0) return { ok: true };
  return {
    ok: false,
    detail: `${label} exited with ${result.exitCode}: ${clip(result.stderr)}`,
  };
}

function clip(bytes) {
  const text = new TextDecoder().decode(bytes).replaceAll(/\s+/gu, " ").trim();
  return text.length > 400 ? `${text.slice(0, 400)}...` : text;
}

await main();
