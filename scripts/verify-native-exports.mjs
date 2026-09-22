import { readFile, writeFile, mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL, URL } from "node:url";
const { Response } = globalThis;

const sourceRoot = resolve(
  process.argv[2] ?? resolve(import.meta.dir, "../packages/morpheus-protocol"),
);
// Isolate consumers from the repository's deliberate source tsconfig aliases.
const packageRoot = await mkdtemp(
  resolve(tmpdir(), "morpheus-native-consumer-"),
);
await cp(resolve(sourceRoot, "dist"), resolve(packageRoot, "dist"), {
  recursive: true,
});
await cp(
  resolve(sourceRoot, "package.json"),
  resolve(packageRoot, "package.json"),
);
const pkg = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8"),
);
const browser = await readFile(resolve(packageRoot, "dist/index.js"), "utf8");
const native = await readFile(
  resolve(packageRoot, "dist/index.node.js"),
  "utf8",
);
const builtinImport =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["'](?:node:|bun:)/;
if (builtinImport.test(browser) || !native.includes("node:crypto"))
  throw new Error("PLATFORM_BUNDLE_INVALID");
if (
  pkg.exports["."].browser !== "./dist/index.js" ||
  pkg.exports["."].node !== "./dist/index.node.js" ||
  pkg.exports["."].bun !== "./dist/index.node.js"
)
  throw new Error("PLATFORM_EXPORTS_INVALID");
const portableExports = await import(
  pathToFileURL(resolve(packageRoot, "dist/index.js")).href
);
const nativeExports = await import(
  pathToFileURL(resolve(packageRoot, "dist/index.node.js")).href
);
if (
  JSON.stringify(Object.keys(portableExports).sort()) !==
  JSON.stringify(Object.keys(nativeExports).sort())
)
  throw new Error("EXPORT_PARITY_FAILED");
// 用临时消费者经 package exports 解析，而非直接路径测试替代条件选择。
const source = `import * as protocol from "${pkg.name}"; if (!protocol.AGENT_OS_V1_PROTOCOL_REGISTRY) throw new Error("missing registry"); console.log(import.meta.resolve("${pkg.name}"));`;
const digestRequest = {
  schemaVersion: "agent-os-task-handle/v1",
  operation: "task.observe",
  requestId: "packed.digest",
  handleId: `task.${"1".repeat(64)}`,
};
// Bind the public packaged contract, not only private implementation vectors.
const expectedDigest =
  portableExports.createAgentOsTaskRequestDigestV1(digestRequest);
if (
  nativeExports.createAgentOsTaskRequestDigestV1(digestRequest) !==
  expectedDigest
)
  throw new Error("PACKAGED_DIGEST_MISMATCH");
await writeFile(resolve(packageRoot, ".native-exports-probe.mjs"), source, {
  flag: "wx",
});
try {
  for (const runtime of [process.execPath, "node"]) {
    const result = Bun.spawnSync(
      [runtime, resolve(packageRoot, ".native-exports-probe.mjs")],
      { stdout: "pipe", stderr: "pipe" },
    );
    if (
      result.exitCode !== 0 ||
      !new TextDecoder().decode(result.stdout).includes("index.node.js")
    )
      throw new Error(
        `NATIVE_CONSUMER_RESOLUTION_FAILED ${runtime}: ${new TextDecoder().decode(result.stdout)} ${new TextDecoder().decode(result.stderr)}`,
      );
  }
  const built = await Bun.build({
    entrypoints: [resolve(packageRoot, ".native-exports-probe.mjs")],
    target: "browser",
    write: false,
  });
  if (!built.success)
    throw new AggregateError(built.logs, "BROWSER_BUNDLE_FAILED");
  for (const artifact of built.outputs)
    if (builtinImport.test(await artifact.text()))
      throw new Error("BROWSER_BUILTIN_LEAK");
  if (process.env.MORPHEUS_TEST_BROWSER) {
    const entry = resolve(packageRoot, ".browser-digest-probe.mjs");
    await writeFile(
      entry,
      `import {createAgentOsTaskRequestDigestV1} from "${pkg.name}"; document.body.textContent=createAgentOsTaskRequestDigestV1(${JSON.stringify(digestRequest)});`,
    );
    const bundle = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      write: false,
    });
    if (!bundle.success)
      throw new AggregateError(bundle.logs, "BROWSER_DIGEST_BUILD_FAILED");
    const javascript = await bundle.outputs[0].text();
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        return new URL(request.url).pathname === "/probe.js"
          ? new Response(javascript, {
              headers: { "content-type": "text/javascript" },
            })
          : new Response(
              '<!doctype html><body>pending<script type="module" src="/probe.js"></script></body>',
              { headers: { "content-type": "text/html" } },
            );
      },
    });
    try {
      const child = Bun.spawn(
        [
          process.env.MORPHEUS_TEST_BROWSER,
          "--headless",
          "--disable-gpu",
          "--no-first-run",
          `--user-data-dir=${resolve(packageRoot, "browser-profile")}`,
          "--dump-dom",
          "--virtual-time-budget=3000",
          `http://127.0.0.1:${server.port}`,
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      const [dom, , exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      if (exitCode !== 0 || !dom.includes(expectedDigest))
        throw new Error("REAL_BROWSER_DIGEST_FAILED");
      console.log("real headless browser packaged digest: PASS");
    } finally {
      await server.stop(true);
    }
  }
} finally {
  await rm(packageRoot, { recursive: true });
}
console.log("native/browser export parity: PASS");
