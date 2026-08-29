import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { computeCandidateContentDigest } from "./candidate-content-digest.mjs";

const root = resolve(import.meta.dirname, "..");
const reportPath = resolve(root, "gates/local-gate-report.json");
const report = JSON.parse(await readFile(reportPath, "utf8"));
const expected = report.candidateContent;

if (typeof expected !== "object" || expected === null) {
  throw new Error("GateReport is missing candidateContent");
}

const actual = await computeCandidateContentDigest(root);
for (const field of [
  "algorithm",
  "canonicalization",
  "digest",
  "fileCount",
  "totalBytes",
]) {
  if (expected[field] !== actual[field]) {
    throw new Error(
      `GateReport candidateContent.${field} is stale: expected ${String(expected[field])}, actual ${String(actual[field])}`,
    );
  }
}
if (JSON.stringify(expected.exclusions) !== JSON.stringify(actual.exclusions)) {
  throw new Error("GateReport candidateContent.exclusions is stale");
}

if (
  typeof report.sourceProvenance?.filteredRepositoryHead !== "string" ||
  report.sourceProvenance.filteredRepositoryHead.length === 0
) {
  throw new Error(
    "GateReport must retain the filtered-history provenance HEAD",
  );
}
if (
  report.sourceProvenance.filteredRepositoryHeadRole !== "history-provenance"
) {
  throw new Error(
    "GateReport must label filteredRepositoryHead as history provenance, not candidate identity",
  );
}

console.info(
  `Candidate content digest passed: ${actual.algorithm}:${actual.digest} (${actual.fileCount} files)`,
);
