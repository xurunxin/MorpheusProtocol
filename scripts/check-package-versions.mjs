import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rootManifest = await manifest("package.json");
const protocol = await manifest("packages/morpheus-protocol/package.json");
const sdk = await manifest("packages/morpheus-sdk/package.json");
const versionPattern =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-next\.[1-9]\d*)?$/u;

assert(
  versionPattern.test(rootManifest.version),
  "版本必须是稳定 semver 或 -next.N",
);
assert(rootManifest.packageManager === "bun@1.3.14", "根仓必须固定 Bun 1.3.14");
assert(
  rootManifest.engines?.bun === "1.3.14",
  "根仓必须固定 Bun engine 1.3.14",
);
assert(
  protocol.version === rootManifest.version,
  "Protocol 版本必须与根版本一致",
);
assert(sdk.version === rootManifest.version, "SDK 版本必须与根版本一致");
assert(
  sdk.dependencies?.["@xurunxin/morpheus-protocol"] === rootManifest.version,
  "SDK 必须精确依赖同版本 Protocol",
);

for (const [name, value] of [
  ["Protocol", protocol],
  ["SDK", sdk],
]) {
  assert(value.license === "Apache-2.0", `${name} 必须使用 Apache-2.0`);
  assert(value.packageManager === "bun@1.3.14", `${name} 必须固定 Bun 1.3.14`);
  assert(value.engines?.bun === "1.3.14", `${name} 必须固定 Bun engine 1.3.14`);
  assert(value.repository?.url, `${name} 缺少 repository`);
  assert(value.description, `${name} 缺少 description`);
  assert(value.exports?.["."], `${name} 缺少根 exports`);
  assert(
    Array.isArray(value.files) && value.files.length > 0,
    `${name} 缺少 files`,
  );
}

if (process.env.GITHUB_REF_TYPE === "tag") {
  assert(
    process.env.GITHUB_REF_NAME === `v${rootManifest.version}`,
    "tag 必须与 package 版本一致",
  );
}

console.info(`Protocol 与 SDK 版本检查通过：${rootManifest.version}`);

async function manifest(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
