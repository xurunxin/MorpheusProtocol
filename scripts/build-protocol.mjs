import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../packages/morpheus-protocol");
for (const native of [false, true]) {
  const result = await Bun.build({
    entrypoints: [resolve(root, "src/index.ts")],
    outdir: resolve(root, "dist"),
    naming: native ? "index.node.js" : "index.js",
    target: native ? "node" : "browser",
    format: "esm",
    plugins: native
      ? [
          {
            name: "protocol-native-sha256",
            setup(build) {
              build.onResolve({ filter: /^\.\/sha256\.js$/ }, (args) => {
                if (
                  resolve(args.importer) !==
                  resolve(root, "src/contract-primitives.ts")
                )
                  return;
                return { path: resolve(root, "src/sha256.native.ts") };
              });
            },
          },
        ]
      : [],
  });
  if (!result.success)
    throw new AggregateError(result.logs, "PROTOCOL_BUILD_FAILED");
}
