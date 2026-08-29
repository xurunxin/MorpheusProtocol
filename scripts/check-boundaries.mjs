import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const protocolRoot = resolve(root, "packages/morpheus-protocol");
const sdkRoot = resolve(root, "packages/morpheus-sdk");

const protocolPackage = JSON.parse(
  await readFile(resolve(protocolRoot, "package.json"), "utf8"),
);
const sdkPackage = JSON.parse(
  await readFile(resolve(sdkRoot, "package.json"), "utf8"),
);

assert(
  protocolPackage.name === "@xurunxin/morpheus-protocol",
  "unexpected Protocol identity",
);
assert(protocolPackage.version === "0.2.0", "unexpected Protocol version");
assert(
  protocolPackage.private !== true,
  "Protocol package must be publishable",
);
assert(
  Object.keys(protocolPackage.dependencies ?? {}).length === 0,
  "Protocol must not have production dependencies",
);
assert(sdkPackage.name === "@xurunxin/morpheus-sdk", "unexpected SDK identity");
assert(
  sdkPackage.version === protocolPackage.version,
  "Protocol and SDK must be lockstep",
);
assert(sdkPackage.private !== true, "SDK package must be publishable");
assert(
  JSON.stringify(sdkPackage.dependencies) ===
    JSON.stringify({ "@xurunxin/morpheus-protocol": "0.2.0" }),
  "SDK must depend only on exact @xurunxin/morpheus-protocol@0.2.0",
);

for (const file of await typescriptFiles(resolve(protocolRoot, "src"))) {
  const source = await readFile(file, "utf8");
  for (const specifier of importSpecifiers(source)) {
    assert(
      specifier.startsWith("."),
      `Protocol external import is forbidden: ${specifier} (${file})`,
    );
  }
}

for (const file of await typescriptFiles(resolve(sdkRoot, "src"))) {
  const source = await readFile(file, "utf8");
  for (const specifier of importSpecifiers(source)) {
    assert(
      specifier.startsWith(".") || specifier === "@xurunxin/morpheus-protocol",
      `SDK import is outside its public boundary: ${specifier} (${file})`,
    );
  }
}

const legacyScope = ["@", "morpheus", "/"].join("");
for (const file of await repositoryTextFiles(root)) {
  const source = await readFile(file, "utf8");
  assert(
    !source.includes(legacyScope),
    `legacy package identity remains in ${file}`,
  );
}

console.info("Protocol/SDK boundary check passed");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function importSpecifiers(source) {
  return [
    ...source.matchAll(
      /\b(?:import|export)\s+(?:type\s+)?(?:[^"']+?\s+from\s+)?["']([^"']+)["']/gu,
    ),
  ].map((match) => match[1]);
}

async function typescriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await typescriptFiles(path)));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
}

async function repositoryTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", ".artifacts"].includes(entry.name))
      continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await repositoryTextFiles(path)));
    else if (/\.(?:ts|mjs|json|md|ya?ml)$/u.test(entry.name)) files.push(path);
  }
  return files;
}
