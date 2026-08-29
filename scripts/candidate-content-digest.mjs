import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { TextDecoder } from "node:util";

export const candidateDigestAlgorithm = "sha256";
export const candidateCanonicalization =
  "morpheus-candidate-content/v1; git tracked+unignored candidate files; UTF-8 POSIX paths byte-sorted; UTF-8 text BOM removed and CRLF/CR normalized to LF; length-prefixed path and content";
export const candidateExclusions = [
  "gates/local-gate-report.json",
  "gates/release-receipt.json",
  "gates/release-receipts/**",
  "node_modules/**",
  "**/dist/**",
  ".tmp/**",
  ".artifacts/**",
  "**/*.tgz",
  "**/*.tsbuildinfo",
];

const evidenceExactPaths = new Set([
  "gates/local-gate-report.json",
  "gates/release-receipt.json",
]);
const generatedDirectoryNames = new Set([
  "node_modules",
  "dist",
  ".tmp",
  ".artifacts",
]);
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".gitignore",
  ".html",
  ".js",
  ".json",
  ".lock",
  ".md",
  ".mjs",
  ".npmrc",
  ".sh",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const textBasenames = new Set([
  ".gitattributes",
  ".gitignore",
  ".npmrc",
  ".prettierignore",
  "LICENSE",
  "bun.lock",
]);

export async function computeCandidateContentDigest(
  root,
  { candidatePaths = null } = {},
) {
  const absoluteRoot = resolve(root);
  const files =
    candidatePaths === null
      ? await listGitCandidatePaths(absoluteRoot)
      : await validateCandidatePaths(absoluteRoot, candidatePaths);
  files.sort(compareUtf8Paths);

  const hash = createHash(candidateDigestAlgorithm);
  hash.update("morpheus-candidate-content/v1\0", "utf8");
  let totalBytes = 0;

  for (const relativePath of files) {
    const rawContent = await readFile(resolve(absoluteRoot, relativePath));
    const content = canonicalizeContent(relativePath, rawContent);
    const pathBytes = Buffer.from(relativePath, "utf8");
    hash.update(`${pathBytes.length}:`, "utf8");
    hash.update(pathBytes);
    hash.update(`\0${content.length}:`, "utf8");
    hash.update(content);
    hash.update("\0", "utf8");
    totalBytes += content.length;
  }

  return {
    algorithm: candidateDigestAlgorithm,
    canonicalization: candidateCanonicalization,
    digest: hash.digest("hex"),
    fileCount: files.length,
    totalBytes,
    exclusions: candidateExclusions,
  };
}

export async function listGitCandidatePaths(root) {
  const tracked = new Set(runGitPaths(root, ["ls-files", "--cached", "-z"]));
  const candidates = runGitPaths(root, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ]);
  return validateCandidatePaths(root, candidates, { tracked });
}

async function validateCandidatePaths(
  root,
  paths,
  { tracked = new Set() } = {},
) {
  const included = [];
  const caseFoldedPaths = new Map();

  for (const rawPath of paths) {
    const relativePath = normalizeCandidatePath(rawPath);
    const excluded = exclusionKind(relativePath);
    if (excluded !== null) {
      if (tracked.has(relativePath) && excluded === "generated") {
        throw new Error(
          `Generated output must not be tracked in candidate source: ${relativePath}`,
        );
      }
      continue;
    }

    const folded = relativePath.toLowerCase();
    const collision = caseFoldedPaths.get(folded);
    if (collision !== undefined && collision !== relativePath) {
      throw new Error(
        `Candidate paths collide under case folding: ${collision} and ${relativePath}`,
      );
    }
    caseFoldedPaths.set(folded, relativePath);

    let metadata;
    try {
      metadata = await lstat(resolve(root, relativePath));
    } catch (error) {
      if (error?.code === "ENOENT" && tracked.has(relativePath)) continue;
      throw error;
    }
    if (metadata.isSymbolicLink()) {
      throw new Error(
        `Candidate content cannot contain a symbolic link: ${relativePath}`,
      );
    }
    if (!metadata.isFile()) {
      throw new Error(`Candidate path is not a file: ${relativePath}`);
    }
    included.push(relativePath);
  }

  return [...new Set(included)];
}

function canonicalizeContent(relativePath, content) {
  if (!isTextPath(relativePath)) return content;
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch (error) {
    throw new Error(`Candidate text file is not valid UTF-8: ${relativePath}`, {
      cause: error,
    });
  }
  return Buffer.from(text.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n"));
}

function isTextPath(relativePath) {
  const basename = relativePath.slice(relativePath.lastIndexOf("/") + 1);
  if (textBasenames.has(basename)) return true;
  if (relativePath.endsWith(".d.ts")) return true;
  return textExtensions.has(extname(basename).toLowerCase());
}

function exclusionKind(relativePath) {
  if (
    evidenceExactPaths.has(relativePath) ||
    relativePath.startsWith("gates/release-receipts/")
  ) {
    return "evidence";
  }
  const segments = relativePath.split("/");
  if (
    segments.some((segment) => generatedDirectoryNames.has(segment)) ||
    relativePath.endsWith(".tgz") ||
    relativePath.endsWith(".tsbuildinfo")
  ) {
    return "generated";
  }
  return null;
}

function normalizeCandidatePath(path) {
  const normalized = path.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//u.test(normalized) ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    throw new Error(`Invalid candidate path: ${path}`);
  }
  return normalized;
}

function compareUtf8Paths(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function runGitPaths(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.slice(0, -1).join(" ")} failed: ${result.stderr.toString("utf8").trim()}`,
    );
  }
  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter((path) => path.length > 0);
}

if (import.meta.main) {
  const root = resolve(import.meta.dirname, "..");
  console.info(
    JSON.stringify(await computeCandidateContentDigest(root), null, 2),
  );
}
