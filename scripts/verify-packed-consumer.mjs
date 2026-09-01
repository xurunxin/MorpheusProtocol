import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const artifactDirectory = resolve(root, ".artifacts");

run(["bun", "run", "pack"], root, "package build");
const manifest = JSON.parse(
  await readFile(resolve(artifactDirectory, "pack-manifest.json"), "utf8"),
);
assert(
  manifest.length === 2,
  "pack manifest must contain exactly two packages",
);

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
}

const consumer = await mkdtemp(
  resolve(tmpdir(), "morpheus-protocol-consumer-"),
);
try {
  const protocol = packageArtifact("@xurunxin/morpheus-protocol");
  const sdk = packageArtifact("@xurunxin/morpheus-sdk");
  await writeFile(
    resolve(consumer, "package.json"),
    `${JSON.stringify(
      {
        name: "morpheus-protocol-empty-consumer",
        private: true,
        type: "module",
        dependencies: {
          "@xurunxin/morpheus-protocol": fileSpecifier(protocol),
          "@xurunxin/morpheus-sdk": fileSpecifier(sdk),
        },
        overrides: {
          "@xurunxin/morpheus-protocol": fileSpecifier(protocol),
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    resolve(consumer, "consumer.mjs"),
    `import { AGENT_OS_CONTROL_V1_OPERATION_CODE_INVENTORY, AGENT_OS_CONTROL_V1_OPERATION_MATRIX, AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION, AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION, AGENT_OS_V1_PROTOCOL_REGISTRY, createAgentOsInteractiveEvent, parseAgentOsControlServiceRejection, parseAgentOsControlV1, parseAgentOsInteractiveEvent, parseAgentOsInteractiveV2Request, validateProviderExtensionManifest } from "@xurunxin/morpheus-protocol";\n` +
      `import { createAgentOsAppClient, createInteractiveAppClient, createInteractiveV2AppClient, reduceInteractiveTranscript, reduceInteractiveV2Transcript } from "@xurunxin/morpheus-sdk";\n` +
      `if (!AGENT_OS_V1_PROTOCOL_REGISTRY) throw new Error("missing protocol registry");\n` +
      `if (AGENT_OS_CONTROL_V1_OPERATION_MATRIX.length !== 38) throw new Error("missing Control operation matrix");\n` +
      `if (AGENT_OS_CONTROL_V1_OPERATION_CODE_INVENTORY.length !== 38) throw new Error("missing Control code inventory");\n` +
      `if (typeof parseAgentOsControlServiceRejection !== "function") throw new Error("missing Control service rejection parser");\n` +
      `if (typeof parseAgentOsControlV1 !== "function") throw new Error("missing Control parser");\n` +
      `if (typeof validateProviderExtensionManifest !== "function") throw new Error("missing extension manifest contract");\n` +
      `if (AGENT_OS_INTERACTIVE_V1_SCHEMA_VERSION !== "agent-os-interactive.v1") throw new Error("missing interactive schema");\n` +
      `if (AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION !== "agent-os-interactive.v2" || typeof parseAgentOsInteractiveV2Request !== "function") throw new Error("missing interactive v2 contract");\n` +
      `if (typeof createAgentOsInteractiveEvent !== "function" || typeof parseAgentOsInteractiveEvent !== "function") throw new Error("missing interactive contract");\n` +
      `if (typeof createAgentOsAppClient !== "function") throw new Error("missing App SDK");\n` +
      `if (typeof createInteractiveAppClient !== "function" || typeof reduceInteractiveTranscript !== "function") throw new Error("missing Interactive App SDK");\n` +
      `if (typeof createInteractiveV2AppClient !== "function" || typeof reduceInteractiveV2Transcript !== "function") throw new Error("missing Interactive v2 App SDK");\n`,
    "utf8",
  );

  run(["bun", "install", "--no-cache"], consumer, "empty-consumer install");
  await rm(resolve(consumer, "node_modules"), { force: true, recursive: true });
  run(
    ["bun", "install", "--frozen-lockfile", "--no-cache"],
    consumer,
    "frozen reinstall",
  );
  run(["bun", "consumer.mjs"], consumer, "packed-consumer import");
  console.info("Packed empty-consumer verification passed");
} finally {
  await rm(consumer, { force: true, recursive: true });
}

function packageArtifact(name) {
  const packed = manifest.find((entry) => entry.name === name);
  assert(packed !== undefined, `missing package artifact for ${name}`);
  return resolve(artifactDirectory, packed.filename);
}

function fileSpecifier(path) {
  return `file:${path.replaceAll("\\", "/")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, cwd, label) {
  const normalized =
    process.platform === "win32" && command[0] === "bun"
      ? ["bun.exe", ...command.slice(1)]
      : command;
  const result = Bun.spawnSync({
    cmd: normalized,
    cwd,
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0)
    throw new Error(`${label} failed with exit code ${result.exitCode}`);
}
