import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const { Response } = globalThis;
if (!process.argv[2]) throw new Error("Expected new output directory");
const output = resolve(process.argv[2]);
await mkdir(output);
const results = [];
for (let sample = 0; sample < 5; sample++) {
  for (const mode of sample % 2 === 0
    ? ["portable", "native"]
    : ["native", "portable"]) {
    const child = Bun.spawn(
      [
        process.execPath,
        "--no-env-file",
        resolve(import.meta.dir, "benchmark-sha256.mjs"),
        mode,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (code !== 0) throw new Error(`HASH_CHILD_FAILED ${stderr}`);
    const result = JSON.parse(stdout.trim());
    results.push({ sample, ...result });
    await writeFile(
      join(output, "raw.json"),
      JSON.stringify(results, null, 2) + "\n",
    );
  }
}
if (new Set(results.map((r) => r.result)).size !== 1)
  throw new Error("HASH_VECTOR_MISMATCH");
const median = (values) =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
const portable = median(
  results.filter((r) => r.mode === "portable").map((r) => r.elapsedMs),
);
const native = median(
  results.filter((r) => r.mode === "native").map((r) => r.elapsedMs),
);
const summary = {
  bytes: 1024,
  iterations: 100000,
  processesPerVariant: 5,
  portableMedianMs: portable,
  nativeMedianMs: native,
  reductionPercent: 100 * (1 - native / portable),
  targetReductionPercent: 80,
  passed: native <= portable * 0.2,
};
await writeFile(
  join(output, "summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(summary));
