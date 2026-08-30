import { describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import { gzipSync } from "node:zlib";

import {
  packageTarballSnapshot,
  packageTarballsMatch,
} from "./tarball-content.mjs";

describe("normalized package tarball comparison", () => {
  test("ignores archive metadata and entry order", () => {
    const left = tarball(
      [
        ["package/package.json", '{"name":"fixture"}\n', 0o644],
        ["package/bin/fixture", "#!/usr/bin/env node\n", 0o755],
      ],
      { uid: 1, mtime: 10 },
    );
    const right = tarball(
      [
        ["package/bin/fixture", "#!/usr/bin/env node\n", 0o755],
        ["package/package.json", '{"name":"fixture"}\n', 0o644],
      ],
      { uid: 42, mtime: 99 },
    );
    expect(packageTarballsMatch(left, right)).toBe(true);
    expect(packageTarballSnapshot(left)).toHaveLength(2);
  });

  test("detects content and executable-mode changes", () => {
    const baseline = tarball([["package/index.js", "export {};\n", 0o644]]);
    const changedContent = tarball([
      ["package/index.js", "export const changed = true;\n", 0o644],
    ]);
    const changedMode = tarball([["package/index.js", "export {};\n", 0o755]]);
    expect(packageTarballsMatch(baseline, changedContent)).toBe(false);
    expect(packageTarballsMatch(baseline, changedMode)).toBe(false);
  });
});

function tarball(entries, metadata = {}) {
  const blocks = [];
  for (const [path, content, mode] of entries) {
    const data = Buffer.from(content, "utf8");
    const header = Buffer.alloc(512);
    writeText(header, 0, 100, path);
    writeOctal(header, 100, 8, mode);
    writeOctal(header, 108, 8, metadata.uid ?? 0);
    writeOctal(header, 116, 8, metadata.uid ?? 0);
    writeOctal(header, 124, 12, data.length);
    writeOctal(header, 136, 12, metadata.mtime ?? 0);
    header.fill(0x20, 148, 156);
    header[156] = "0".charCodeAt(0);
    writeText(header, 257, 6, "ustar");
    writeText(header, 263, 2, "00");
    const checksum = header.reduce((sum, value) => sum + value, 0);
    const encodedChecksum = checksum.toString(8).padStart(6, "0");
    header.write(encodedChecksum, 148, 6, "ascii");
    header[154] = 0;
    header[155] = 0x20;
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

function writeText(buffer, offset, length, value) {
  buffer.write(value, offset, length, "utf8");
}

function writeOctal(buffer, offset, length, value) {
  const encoded = value.toString(8).padStart(length - 1, "0");
  buffer.write(encoded, offset, length - 1, "ascii");
  buffer[offset + length - 1] = 0;
}
