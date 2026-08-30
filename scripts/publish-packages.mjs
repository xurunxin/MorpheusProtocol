import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const registry = "https://npm.pkg.github.com";
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
  const distTag = item.version.includes("-next.") ? "next" : "latest";
  const lookup = Bun.spawnSync({
    cmd: [
      npmCommand(),
      "view",
      `${item.name}@${item.version}`,
      "version",
      "--json",
      `--registry=${registry}`,
    ],
    cwd: root,
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (lookup.exitCode === 0) {
    const publishedVersion = JSON.parse(
      new TextDecoder().decode(lookup.stdout),
    );
    if (publishedVersion !== item.version) {
      throw new Error(`${item.name} registry version lookup drifted`);
    }
    run([
      npmCommand(),
      "dist-tag",
      "add",
      `${item.name}@${item.version}`,
      distTag,
      `--registry=${registry}`,
    ]);
    console.info(`${item.name}@${item.version} 已存在，移动 ${distTag} 标签`);
    continue;
  }

  const lookupError = new TextDecoder().decode(lookup.stderr);
  if (!/\bE404\b/u.test(lookupError)) {
    throw new Error(`${item.name}@${item.version} registry 查询失败`);
  }
  run([
    npmCommand(),
    "publish",
    resolve(root, ".artifacts", item.filename),
    "--tag",
    distTag,
    `--registry=${registry}`,
  ]);
  console.info(`${item.name}@${item.version} 已发布到 ${distTag}`);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(cmd) {
  const result = Bun.spawnSync({
    cmd,
    cwd: root,
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`npm command failed with exit code ${result.exitCode}`);
  }
}
