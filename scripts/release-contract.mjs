const stableVersionPattern =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;

export function resolveReleaseContract(version, tag, options = {}) {
  if (typeof version !== "string" || !stableVersionPattern.test(version)) {
    throw new Error("package version must be stable semver");
  }

  if (tag === undefined || tag === "") {
    if (options.requireTag === true) {
      throw new Error("release tag is required");
    }
    return {
      kind: "local",
      version,
      tag: undefined,
      channel: undefined,
      releaseLabel: version,
    };
  }

  const stableTag = `v${version}`;
  if (tag === stableTag) {
    return {
      kind: "stable",
      version,
      tag,
      channel: "latest",
      releaseLabel: version,
    };
  }

  const candidateMatch = tag.match(
    new RegExp(`^${escapeRegExp(stableTag)}-next\\.([1-9]\\d*)$`, "u"),
  );
  if (candidateMatch !== null) {
    return {
      kind: "candidate",
      version,
      tag,
      channel: "next",
      releaseLabel: `${version}-next.${candidateMatch[1]}`,
    };
  }

  throw new Error(
    `release tag ${tag} must be ${stableTag} or ${stableTag}-next.N`,
  );
}

export function decidePackageRelease({
  contract,
  publishedVersion,
  publishedIntegrity,
  registryContentMatches,
  currentChannelVersion,
}) {
  if (contract.channel !== "next" && contract.channel !== "latest") {
    throw new Error("package publication requires a release tag");
  }
  if (publishedVersion === undefined) return "publish";
  if (publishedVersion !== contract.version) {
    throw new Error("registry version lookup drifted");
  }
  if (typeof publishedIntegrity !== "string" || publishedIntegrity === "") {
    throw new Error("registry package integrity is unavailable");
  }
  if (registryContentMatches !== true) {
    throw new Error("registry package contents do not match the local pack");
  }
  return currentChannelVersion === contract.version ? "skip" : "tag";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
