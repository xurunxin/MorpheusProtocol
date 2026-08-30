import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";

import {
  decidePackageRelease,
  resolveReleaseContract,
} from "./release-contract.mjs";
import { packageTarballsMatch } from "./tarball-content.mjs";

const defaultRegistry = "https://npm.pkg.github.com";

export async function releasePackage({
  root,
  name,
  version,
  tarball,
  tag,
  dryRun = false,
  registry = defaultRegistry,
}) {
  const contract = resolveReleaseContract(version, tag, { requireTag: true });
  const absoluteTarball = resolve(root, tarball);
  if (!(await stat(absoluteTarball, { throwIfNoEntry: false }))?.isFile()) {
    throw new Error(`package tarball is unavailable: ${absoluteTarball}`);
  }
  const localBytes = await readFile(absoluteTarball);
  const localIntegrity = sri(localBytes);
  const packageSpec = `${name}@${version}`;
  const published = lookupExactVersion(root, registry, packageSpec);
  const registryContentMatches =
    published === undefined
      ? undefined
      : await verifyRegistryPackage({
          root,
          registry,
          packageSpec,
          expectedIntegrity: published.integrity,
          localBytes,
        });
  const tags =
    published === undefined ? {} : lookupDistTags(root, registry, name);
  const action = decidePackageRelease({
    contract,
    publishedVersion: published?.version,
    publishedIntegrity: published?.integrity,
    registryContentMatches,
    currentChannelVersion: tags[contract.channel],
  });

  if (dryRun) {
    console.info(`${packageSpec} verified; dry-run action=${action}`);
  } else if (action === "publish") {
    run(root, [
      "publish",
      absoluteTarball,
      "--tag",
      contract.channel,
      `--registry=${registry}`,
    ]);
    console.info(`${packageSpec} published to ${contract.channel}`);
  } else if (action === "tag") {
    run(root, [
      "dist-tag",
      "add",
      packageSpec,
      contract.channel,
      `--registry=${registry}`,
    ]);
    console.info(`${packageSpec} verified; ${contract.channel} updated`);
  } else {
    console.info(`${packageSpec} and ${contract.channel} already verified`);
  }

  return {
    action,
    contract,
    integrity: published?.integrity ?? localIntegrity,
  };
}

export async function findSingleTarball(directory) {
  const absoluteDirectory = resolve(directory);
  const tarballs = (await readdir(absoluteDirectory))
    .filter((entry) => entry.endsWith(".tgz"))
    .sort();
  if (tarballs.length !== 1) {
    throw new Error(
      `expected one package tarball in ${absoluteDirectory}, found ${tarballs.length}`,
    );
  }
  return resolve(absoluteDirectory, tarballs[0]);
}

function lookupExactVersion(root, registry, packageSpec) {
  const result = npm(root, [
    "view",
    packageSpec,
    "version",
    "dist.integrity",
    "--json",
    `--registry=${registry}`,
  ]);
  if (result.exitCode !== 0) {
    if (/\bE404\b/u.test(result.stderr)) return undefined;
    throw new Error(`${packageSpec} registry lookup failed`);
  }
  const value = parseJson(result.stdout, `${packageSpec} registry metadata`);
  return { version: value.version, integrity: value["dist.integrity"] };
}

function lookupDistTags(root, registry, name) {
  const result = npm(root, ["dist-tag", "ls", name, `--registry=${registry}`]);
  if (result.exitCode !== 0) throw new Error(`${name} dist-tag lookup failed`);
  return Object.fromEntries(
    result.stdout
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(": ");
        if (separator <= 0)
          throw new Error(`${name} returned invalid dist-tags`);
        return [line.slice(0, separator), line.slice(separator + 2)];
      }),
  );
}

async function verifyRegistryPackage({
  root,
  registry,
  packageSpec,
  expectedIntegrity,
  localBytes,
}) {
  if (typeof expectedIntegrity !== "string" || expectedIntegrity === "")
    throw new Error(`${packageSpec} registry integrity is unavailable`);
  const temporaryRoot = resolve(root, ".tmp");
  await mkdir(temporaryRoot, { recursive: true });
  const temporaryDirectory = await mkdtemp(
    resolve(temporaryRoot, "registry-package-"),
  );
  if (!temporaryDirectory.startsWith(`${temporaryRoot}${sep}`))
    throw new Error("registry comparison directory escaped .tmp");
  try {
    const result = npm(root, [
      "pack",
      packageSpec,
      "--pack-destination",
      temporaryDirectory,
      "--ignore-scripts",
      "--json",
      `--registry=${registry}`,
    ]);
    if (result.exitCode !== 0)
      throw new Error(`${packageSpec} registry tarball download failed`);
    const metadata = parseJson(result.stdout, `${packageSpec} npm pack`);
    const filename = Array.isArray(metadata)
      ? metadata[0]?.filename
      : undefined;
    if (typeof filename !== "string" || basename(filename) !== filename)
      throw new Error(`${packageSpec} npm pack returned an invalid filename`);
    const registryTarball = resolve(temporaryDirectory, filename);
    if (dirname(registryTarball) !== temporaryDirectory)
      throw new Error(`${packageSpec} registry tarball escaped .tmp`);
    const registryBytes = await readFile(registryTarball);
    if (sri(registryBytes) !== expectedIntegrity)
      throw new Error(`${packageSpec} downloaded tarball SRI mismatch`);
    return packageTarballsMatch(localBytes, registryBytes);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function npm(root, args) {
  const result = Bun.spawnSync({
    cmd: [npmExecutable(), ...args],
    cwd: root,
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function run(root, args) {
  const result = Bun.spawnSync({
    cmd: [npmExecutable(), ...args],
    cwd: root,
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`npm command failed with exit code ${result.exitCode}`);
  }
}

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function sri(bytes) {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}
