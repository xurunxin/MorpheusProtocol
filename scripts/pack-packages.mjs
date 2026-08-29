import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const artifactDirectory = resolve(root, ".artifacts");
const packages = ["morpheus-protocol", "morpheus-sdk"];

run([bunCommand(), "run", "build"], root, "workspace build");
await rm(artifactDirectory, { force: true, recursive: true });
await mkdir(artifactDirectory, { recursive: true });

const manifest = [];
for (const packageDirectoryName of packages) {
  const packageDirectory = resolve(root, "packages", packageDirectoryName);
  const result = Bun.spawnSync({
    cmd: [
      npmCommand(),
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      artifactDirectory,
    ],
    cwd: packageDirectory,
    env: process.env,
    stderr: "inherit",
    stdout: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(`npm pack failed for ${packageDirectoryName}`);
  }
  const output = JSON.parse(new TextDecoder().decode(result.stdout));
  const packed = output[0];
  if (output.length !== 1 || typeof packed?.filename !== "string") {
    throw new Error(`Unexpected npm pack output for ${packageDirectoryName}`);
  }
  const tarball = resolve(artifactDirectory, packed.filename);
  const digest = createHash("sha256")
    .update(await readFile(tarball))
    .digest("hex");
  manifest.push({
    name: packed.name,
    version: packed.version,
    filename: packed.filename,
    sha256: digest,
    integrity: packed.integrity,
    shasum: packed.shasum,
    size: packed.size,
    unpackedSize: packed.unpackedSize,
    fileCount: packed.files.length,
    files: packed.files.map((file) => file.path).sort(),
  });
}

await writeFile(
  resolve(artifactDirectory, "pack-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.info(`Packed ${manifest.length} packages into ${artifactDirectory}`);

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function bunCommand() {
  return process.platform === "win32" ? "bun.exe" : "bun";
}

function run(command, cwd, label) {
  const result = Bun.spawnSync({
    cmd: command,
    cwd,
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${result.exitCode}`);
  }
}
