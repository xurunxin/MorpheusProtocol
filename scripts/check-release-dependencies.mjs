import { lstat, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

import {
  findForbiddenLockLocators,
  findForbiddenManifestDependencies,
} from "./release-dependency-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const manifestPaths = [
  "package.json",
  "packages/morpheus-protocol/package.json",
  "packages/morpheus-sdk/package.json",
];
const failures = [];

for (const manifestPath of manifestPaths) {
  const absolutePath = resolve(root, manifestPath);
  const manifest = JSON.parse(await readFile(absolutePath, "utf8"));
  failures.push(
    ...findForbiddenManifestDependencies(
      manifest,
      relative(root, absolutePath).replaceAll("\\", "/"),
    ),
  );
}

const lockPath = resolve(root, "bun.lock");
failures.push(
  ...findForbiddenLockLocators(await readFile(lockPath, "utf8"), "bun.lock"),
);

for (const packageName of ["morpheus-protocol", "morpheus-sdk"]) {
  const linkedPath = resolve(root, "node_modules/@xurunxin", packageName);
  try {
    await lstat(linkedPath);
    failures.push(
      `node_modules/@xurunxin/${packageName} exists; root validation must not use workspace linking`,
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

if (failures.length > 0) {
  throw new Error(
    `Release dependency contract failed:\n${failures
      .map((failure) => `- ${failure}`)
      .join("\n")}`,
  );
}

console.info(
  "Release dependency contract passed: no workspace, local-file, or Git locators",
);
