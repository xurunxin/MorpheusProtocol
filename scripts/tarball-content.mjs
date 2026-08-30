import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

export function packageTarballSnapshot(bytes) {
  const archive = gunzipSync(bytes);
  const entries = [];
  let offset = 0;
  let pendingPath;
  let pendingPax = {};

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((value) => value === 0)) break;
    assertHeaderChecksum(header);

    const headerSize = parseOctal(header.subarray(124, 136));
    const data = archive.subarray(offset, offset + headerSize);
    if (data.length !== headerSize) throw new Error("truncated tar entry");
    offset += Math.ceil(headerSize / 512) * 512;

    const type = text(header.subarray(156, 157));
    if (type === "x") {
      pendingPax = parsePax(data);
      continue;
    }
    if (type === "g") continue;
    if (type === "L") {
      pendingPath = text(data).replace(/\0.*$/su, "").replace(/\n$/u, "");
      continue;
    }

    const prefix = text(header.subarray(345, 500));
    const headerPath = text(header.subarray(0, 100));
    const path = normalizePath(
      pendingPax.path ??
        pendingPath ??
        (prefix ? `${prefix}/${headerPath}` : headerPath),
    );
    const mode = parseOctal(header.subarray(100, 108)) & 0o777;
    const linkTarget = pendingPax.linkpath ?? text(header.subarray(157, 257));
    pendingPath = undefined;
    pendingPax = {};

    if (type === "5") continue;
    if (type === "" || type === "0" || type === "7") {
      entries.push({ path, mode, kind: "file", sha256: digest(data) });
    } else if (type === "1" || type === "2") {
      entries.push({
        path,
        mode,
        kind: type === "1" ? "hardlink" : "symlink",
        sha256: digest(Buffer.from(linkTarget, "utf8")),
      });
    } else {
      entries.push({ path, mode, kind: `type-${type}`, sha256: digest(data) });
    }
  }

  entries.sort((left, right) => left.path.localeCompare(right.path));
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1].path === entries[index].path)
      throw new Error(`duplicate tar entry: ${entries[index].path}`);
  }
  return entries;
}

export function packageTarballsMatch(left, right) {
  return (
    JSON.stringify(packageTarballSnapshot(left)) ===
    JSON.stringify(packageTarballSnapshot(right))
  );
}

function normalizePath(value) {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//u, "");
  if (
    normalized === "" ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..")
  )
    throw new Error(`invalid tar entry path: ${value}`);
  return normalized;
}

function parsePax(data) {
  const result = {};
  let offset = 0;
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset);
    if (space < 0) throw new Error("invalid PAX record");
    const length = Number.parseInt(
      data.subarray(offset, space).toString("ascii"),
      10,
    );
    if (
      !Number.isSafeInteger(length) ||
      length <= 0 ||
      offset + length > data.length
    )
      throw new Error("invalid PAX record length");
    const record = data
      .subarray(space + 1, offset + length - 1)
      .toString("utf8");
    const equals = record.indexOf("=");
    if (equals > 0) result[record.slice(0, equals)] = record.slice(equals + 1);
    offset += length;
  }
  return result;
}

function assertHeaderChecksum(header) {
  const expected = parseOctal(header.subarray(148, 156));
  let actual = 0;
  for (let index = 0; index < header.length; index += 1)
    actual += index >= 148 && index < 156 ? 0x20 : header[index];
  if (expected !== actual) throw new Error("invalid tar header checksum");
}

function parseOctal(bytes) {
  const value = text(bytes).trim();
  if (value === "") return 0;
  if (!/^[0-7]+$/u.test(value)) throw new Error("invalid tar octal field");
  return Number.parseInt(value, 8);
}

function text(bytes) {
  const zero = bytes.indexOf(0);
  return bytes.subarray(0, zero < 0 ? bytes.length : zero).toString("utf8");
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
