export const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const localLocatorPattern = /^(?:workspace|file|link|portal):/iu;
const gitLocatorPattern =
  /^(?:git(?:\+[a-z][a-z\d+.-]*)?:|github:|gitlab:|bitbucket:|git@(?:github|gitlab|bitbucket)\.com:|https?:\/\/(?:www\.)?(?:github|gitlab|bitbucket)\.com\/)/iu;
const lockLocalLocatorPattern = /(?:^|@)(?:workspace|file|link|portal):/iu;
const lockGitLocatorPattern =
  /(?:^|@)(?:git(?:\+[a-z][a-z\d+.-]*)?:|github:|gitlab:|bitbucket:)|(?:^|@)git@(?:github|gitlab|bitbucket)\.com:|https?:\/\/(?:www\.)?(?:github|gitlab|bitbucket)\.com\//iu;

export function findForbiddenManifestDependencies(manifest, manifestPath) {
  const failures = [];

  for (const section of dependencySections) {
    const dependencies = manifest[section];
    if (dependencies === undefined) continue;
    if (!isRecord(dependencies)) {
      failures.push(`${manifestPath}#${section} must be an object`);
      continue;
    }

    for (const [name, specifier] of Object.entries(dependencies)) {
      if (typeof specifier !== "string") {
        failures.push(
          `${manifestPath}#${section}.${name} must be a string dependency specifier`,
        );
        continue;
      }
      const reason = forbiddenDependencyReason(specifier);
      if (reason !== null) {
        failures.push(
          `${manifestPath}#${section}.${name} uses forbidden ${reason} locator: ${specifier}`,
        );
      }
    }
  }

  return failures;
}

export function findForbiddenLockLocators(lockText, lockPath = "bun.lock") {
  const failures = [];
  for (const [index, line] of lockText.split(/\r?\n/u).entries()) {
    const quotedValues = [...line.matchAll(/"([^"\r\n]*)"/gu)].map(
      (match) => match[1],
    );
    for (const value of quotedValues) {
      const reason = forbiddenLockLocatorReason(value);
      if (reason !== null) {
        failures.push(
          `${lockPath}:${index + 1} contains forbidden ${reason} locator: ${value}`,
        );
      }
    }
  }
  return failures;
}

export function forbiddenDependencyReason(specifier) {
  const normalized = specifier.trim();
  if (localLocatorPattern.test(normalized)) return "local/workspace";
  if (gitLocatorPattern.test(normalized)) return "Git";
  return null;
}

export function forbiddenLockLocatorReason(locator) {
  const normalized = locator.trim();
  if (lockLocalLocatorPattern.test(normalized)) return "local/workspace";
  if (lockGitLocatorPattern.test(normalized)) return "Git";
  return null;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
