import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { releasePackage } from "./npm-package-release.mjs";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(resolve(root, ".artifacts", "pack-manifest.json"), "utf8"),
);

for (const item of manifest) {
  if (
    typeof item?.name !== "string" ||
    typeof item?.version !== "string" ||
    typeof item?.filename !== "string"
  ) {
    throw new Error("pack manifest contains an invalid package entry");
  }
  await releasePackage({
    root,
    name: item.name,
    version: item.version,
    tarball: resolve(root, ".artifacts", item.filename),
    tag: process.env.GITHUB_REF_NAME,
    dryRun: process.env.MORPHEUS_RELEASE_DRY_RUN === "1",
  });
}
