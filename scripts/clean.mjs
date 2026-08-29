import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const targets = [
  resolve(root, "packages/morpheus-protocol/dist"),
  resolve(root, "packages/morpheus-sdk/dist"),
  resolve(root, ".artifacts"),
];

for (const target of targets) {
  if (!target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
    throw new Error(`Refusing to clean outside repository: ${target}`);
  }
  await rm(target, { force: true, recursive: true });
}
