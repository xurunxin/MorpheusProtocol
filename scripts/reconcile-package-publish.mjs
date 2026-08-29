import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const defaultRegistry = "https://npm.pkg.github.com";
const defaultDistTag = "next";
const defaultStagingTag = "candidate-staging";
const expectedPackages = [
  "@xurunxin/morpheus-protocol",
  "@xurunxin/morpheus-sdk",
];

export async function reconcilePackagePublications({
  packages,
  client,
  distTag = defaultDistTag,
  stagingTag = defaultStagingTag,
  verificationAttempts = 5,
  wait = defaultWait,
}) {
  assertPackageSet(packages);
  if (!Number.isInteger(verificationAttempts) || verificationAttempts < 1) {
    throw new Error("verificationAttempts must be a positive integer");
  }

  const results = [];
  const preflight = [];

  // Finish every read-only preflight before the first registry mutation. A known
  // conflict therefore cannot leave the other package partially published.
  for (const candidate of packages) {
    const registryIntegrity = await client.getVersionIntegrity(
      candidate.name,
      candidate.version,
    );
    assertRegistryIntegrity(registryIntegrity, candidate);
    preflight.push({ candidate, registryIntegrity });
  }

  for (const { candidate, registryIntegrity } of preflight) {
    if (registryIntegrity !== null) {
      results.push({
        name: candidate.name,
        version: candidate.version,
        action: "skipped-existing",
      });
      continue;
    }

    let publishError = null;
    try {
      await client.publish(candidate, stagingTag);
    } catch (error) {
      publishError = error;
    }

    const publishedIntegrity = await waitForVersionIntegrity({
      candidate,
      client,
      verificationAttempts,
      wait,
    });
    if (publishedIntegrity === null) {
      throw new Error(
        `Registry did not expose ${candidate.name}@${candidate.version} after publish reconciliation`,
        publishError === null ? undefined : { cause: publishError },
      );
    }
    assertMatchingIntegrity(publishedIntegrity, candidate);

    results.push({
      name: candidate.name,
      version: candidate.version,
      action: publishError === null ? "published" : "reconciled-publish-race",
    });
  }

  // Reconfirm the immutable version bytes for the complete set before exposing
  // either candidate through the shared next tag.
  for (const candidate of packages) {
    const registryIntegrity = await client.getVersionIntegrity(
      candidate.name,
      candidate.version,
    );
    if (registryIntegrity === null) {
      throw new Error(
        `Registry lost ${candidate.name}@${candidate.version} before dist-tag reconciliation`,
      );
    }
    assertMatchingIntegrity(registryIntegrity, candidate);
  }

  const tagPreflight = [];
  for (const candidate of packages) {
    const taggedVersion = await client.getDistTag(candidate.name, distTag);
    if (
      taggedVersion !== null &&
      taggedVersion !== candidate.version &&
      compareSemver(taggedVersion, candidate.version) >= 0
    ) {
      throw new Error(
        `Refusing to move ${candidate.name}@${distTag} backward from ${taggedVersion} to ${candidate.version}`,
      );
    }
    tagPreflight.push({ candidate, taggedVersion });
  }

  for (const { candidate, taggedVersion: existingTag } of tagPreflight) {
    if (existingTag === candidate.version) continue;
    await client.setDistTag(candidate.name, candidate.version, distTag);
    const taggedVersion = await waitForDistTag({
      candidate,
      client,
      distTag,
      verificationAttempts,
      wait,
    });
    if (taggedVersion !== candidate.version) {
      throw new Error(
        `Registry dist-tag ${candidate.name}@${distTag} resolved to ${String(taggedVersion)} instead of ${candidate.version}`,
      );
    }
  }

  return results;
}

export function createNpmRegistryClient({ registry = defaultRegistry } = {}) {
  return {
    async getVersionIntegrity(name, version) {
      const output = runNpm(
        [
          "view",
          `${name}@${version}`,
          "dist.integrity",
          "--json",
          "--registry",
          registry,
        ],
        { notFoundIsNull: true },
      );
      if (output === null) return null;
      const parsed = parseJsonOutput(output, `${name}@${version} integrity`);
      if (typeof parsed !== "string" || !parsed.startsWith("sha512-")) {
        throw new Error(
          `Registry returned an invalid integrity for ${name}@${version}`,
        );
      }
      return parsed;
    },

    async publish(candidate, stagingTag) {
      runNpm([
        "publish",
        candidate.tarballPath,
        "--tag",
        stagingTag,
        "--ignore-scripts",
        "--access",
        "public",
        "--registry",
        registry,
      ]);
    },

    async setDistTag(name, version, distTag) {
      runNpm([
        "dist-tag",
        "add",
        `${name}@${version}`,
        distTag,
        "--registry",
        registry,
      ]);
    },

    async getDistTag(name, distTag) {
      const output = runNpm(
        [
          "view",
          `${name}@${distTag}`,
          "version",
          "--json",
          "--registry",
          registry,
        ],
        { notFoundIsNull: true },
      );
      if (output === null || output.trim() === "") return null;
      const parsed = parseJsonOutput(output, `${name}@${distTag} dist-tag`);
      if (parsed === null || parsed === undefined) return null;
      if (typeof parsed !== "string") {
        throw new Error(
          `Registry returned an invalid ${distTag} tag for ${name}`,
        );
      }
      return parsed;
    },
  };
}

export async function loadPackCandidates(
  root,
  manifestPath = resolve(root, ".artifacts/pack-manifest.json"),
) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest)) {
    throw new Error("Pack manifest must contain an array");
  }

  const candidates = [];
  const artifactRoot = resolve(root, ".artifacts");
  for (const name of expectedPackages) {
    const matches = manifest.filter((candidate) => candidate.name === name);
    if (matches.length !== 1) {
      throw new Error(
        `Pack manifest must contain ${name} exactly once; found ${matches.length}`,
      );
    }
    const [entry] = matches;
    if (entry === undefined)
      throw new Error(`Pack manifest is missing ${name}`);
    if (
      typeof entry.version !== "string" ||
      typeof entry.filename !== "string" ||
      typeof entry.sha256 !== "string" ||
      typeof entry.integrity !== "string"
    ) {
      throw new Error(`Pack manifest entry for ${name} is incomplete`);
    }
    if (
      basename(entry.filename) !== entry.filename ||
      !entry.filename.endsWith(".tgz")
    ) {
      throw new Error(`Pack manifest filename is unsafe for ${name}`);
    }
    if (
      !/^[a-f\d]{64}$/u.test(entry.sha256) ||
      !/^sha512-[A-Za-z\d+/]+={0,2}$/u.test(entry.integrity)
    ) {
      throw new Error(`Pack manifest digest is malformed for ${name}`);
    }

    const tarballPath = resolve(artifactRoot, entry.filename);
    if (dirname(tarballPath) !== artifactRoot) {
      throw new Error(`Pack manifest filename escapes .artifacts for ${name}`);
    }
    const tarball = await readFile(tarballPath);
    const sha256 = createHash("sha256").update(tarball).digest("hex");
    const integrity = `sha512-${createHash("sha512")
      .update(tarball)
      .digest("base64")}`;
    if (sha256 !== entry.sha256 || integrity !== entry.integrity) {
      throw new Error(
        `Local tarball digest does not match pack manifest for ${name}`,
      );
    }

    candidates.push({
      name,
      version: entry.version,
      integrity: entry.integrity,
      sha256: entry.sha256,
      tarballPath,
    });
  }

  if (manifest.length !== expectedPackages.length) {
    throw new Error("Pack manifest contains an unexpected package entry");
  }
  assertPackageSet(candidates);
  await assertLocalPackageContracts(root, candidates[0].version);
  return candidates;
}

async function runCli() {
  const root = resolve(import.meta.dirname, "..");
  const packages = await loadPackCandidates(root);
  const results = await reconcilePackagePublications({
    packages,
    client: createNpmRegistryClient(),
  });
  for (const result of results) {
    console.info(
      `${result.name}@${result.version}: ${result.action}; next reconciled`,
    );
  }
}

function assertPackageSet(packages) {
  if (!Array.isArray(packages) || packages.length !== expectedPackages.length) {
    throw new Error(
      `Expected exactly ${expectedPackages.length} package candidates`,
    );
  }
  const names = packages.map((candidate) => candidate.name);
  if (
    names.some((name, index) => name !== expectedPackages[index]) ||
    new Set(names).size !== names.length
  ) {
    throw new Error(
      `Package candidates must be ordered as ${expectedPackages.join(", ")}`,
    );
  }
  for (const candidate of packages) {
    if (
      typeof candidate.version !== "string" ||
      typeof candidate.integrity !== "string" ||
      !candidate.integrity.startsWith("sha512-")
    ) {
      throw new Error(`Invalid local package candidate for ${candidate.name}`);
    }
  }
  if (new Set(packages.map((candidate) => candidate.version)).size !== 1) {
    throw new Error(
      "Protocol and SDK candidates must use one lockstep version",
    );
  }
}

function assertRegistryIntegrity(registryIntegrity, candidate) {
  if (registryIntegrity === null) return;
  if (typeof registryIntegrity !== "string") {
    throw new Error(
      `Registry returned an invalid integrity for ${candidate.name}@${candidate.version}`,
    );
  }
  assertMatchingIntegrity(registryIntegrity, candidate);
}

function assertMatchingIntegrity(registryIntegrity, candidate) {
  if (registryIntegrity !== candidate.integrity) {
    throw new Error(
      `Immutable package conflict for ${candidate.name}@${candidate.version}: registry integrity ${registryIntegrity} does not match local ${candidate.integrity}`,
    );
  }
}

async function waitForVersionIntegrity({
  candidate,
  client,
  verificationAttempts,
  wait,
}) {
  for (let attempt = 1; attempt <= verificationAttempts; attempt += 1) {
    const integrity = await client.getVersionIntegrity(
      candidate.name,
      candidate.version,
    );
    if (integrity !== null) return integrity;
    if (attempt < verificationAttempts) await wait(attempt);
  }
  return null;
}

async function waitForDistTag({
  candidate,
  client,
  distTag,
  verificationAttempts,
  wait,
}) {
  for (let attempt = 1; attempt <= verificationAttempts; attempt += 1) {
    const version = await client.getDistTag(candidate.name, distTag);
    if (version === candidate.version) return version;
    if (attempt < verificationAttempts) await wait(attempt);
  }
  return null;
}

function defaultWait(attempt) {
  return delay(Math.min(1_000 * 2 ** (attempt - 1), 8_000));
}

async function assertLocalPackageContracts(root, version) {
  const protocol = JSON.parse(
    await readFile(
      resolve(root, "packages/morpheus-protocol/package.json"),
      "utf8",
    ),
  );
  const sdk = JSON.parse(
    await readFile(resolve(root, "packages/morpheus-sdk/package.json"), "utf8"),
  );
  if (
    protocol.name !== expectedPackages[0] ||
    sdk.name !== expectedPackages[1] ||
    protocol.version !== version ||
    sdk.version !== version ||
    JSON.stringify(sdk.dependencies) !==
      JSON.stringify({ "@xurunxin/morpheus-protocol": version })
  ) {
    throw new Error(
      "Local package manifests do not match the lockstep pack candidates",
    );
  }
}

function compareSemver(left, right) {
  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts.core[index] - rightParts.core[index];
    if (difference !== 0) return Math.sign(difference);
  }
  if (leftParts.prerelease.length === 0) {
    return rightParts.prerelease.length === 0 ? 0 : 1;
  }
  if (rightParts.prerelease.length === 0) return -1;
  const length = Math.max(
    leftParts.prerelease.length,
    rightParts.prerelease.length,
  );
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = leftParts.prerelease[index];
    const rightIdentifier = rightParts.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    if (leftIdentifier === rightIdentifier) continue;
    const leftNumeric = /^\d+$/u.test(leftIdentifier);
    const rightNumeric = /^\d+$/u.test(rightIdentifier);
    if (leftNumeric && rightNumeric) {
      return Number(leftIdentifier) < Number(rightIdentifier) ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftIdentifier < rightIdentifier ? -1 : 1;
  }
  return 0;
}

function parseSemver(version) {
  const match =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u.exec(
      version,
    );
  if (match === null) {
    throw new Error(
      `Registry dist-tag returned non-SemVer version: ${version}`,
    );
  }
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? [],
  };
}

function runNpm(args, { notFoundIsNull = false } = {}) {
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status === 0) return result.stdout.trim();

  const diagnostic = `${result.stderr}\n${result.stdout}`.trim();
  if (
    notFoundIsNull &&
    /(?:\bE404\b|404 Not Found|is not in this registry)/iu.test(diagnostic)
  ) {
    return null;
  }
  throw new Error(
    `npm ${args[0]} failed with exit ${String(result.status)}: ${diagnostic}`,
  );
}

function parseJsonOutput(output, label) {
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Registry returned invalid JSON for ${label}`, {
      cause: error,
    });
  }
}

if (import.meta.main) {
  await runCli();
}
