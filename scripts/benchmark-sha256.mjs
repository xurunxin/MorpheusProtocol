// Isolated implementation microbenchmark; packaged consumers are verified separately.
import { performance } from "node:perf_hooks";
const mode = process.argv[2];
if (!["portable", "native"].includes(mode))
  throw new Error("Expected portable or native");
const { sha256Hex } = await import(
  mode === "native"
    ? "../packages/morpheus-protocol/src/sha256.native.ts"
    : "../packages/morpheus-protocol/src/sha256.ts"
);
const input = "0123456789abcdef".repeat(64);
const iterations = 100000;
let result;
for (let i = 0; i < 5000; i++) result = sha256Hex(input);
Bun.gc(true);
const before = performance.now();
for (let i = 0; i < iterations; i++) result = sha256Hex(input);
console.log(
  JSON.stringify({
    mode,
    bun: Bun.version,
    bytes: 1024,
    iterations,
    elapsedMs: performance.now() - before,
    result,
  }),
);
