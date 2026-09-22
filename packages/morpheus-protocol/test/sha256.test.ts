import { expect, test } from "bun:test";
import { sha256Hex } from "../src/sha256.js";
import { sha256Hex as nativeSha256Hex } from "../src/sha256.native.js";

test("portable and native SHA-256 preserve UTF-8 and block boundaries", () => {
  expect(sha256Hex("")).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  expect(nativeSha256Hex("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  const vectors = [
    "",
    "abc",
    "中文",
    "👩‍💻",
    "\ud800",
    "\udfff",
    "a\ud800中\udfff",
    "\u0000\ufeff\r\n",
  ];
  for (const size of [
    55,
    56,
    63,
    64,
    65,
    119,
    120,
    127,
    128,
    129,
    1024,
    16384,
    1024 * 1024,
  ])
    vectors.push("x".repeat(size));
  for (let i = 0; i < 100; i++)
    vectors.push(
      String.fromCharCode(
        ...Array.from(
          { length: i + 1 },
          (_, j) => (i * 7919 + j * 313) % 65536,
        ),
      ),
    );
  for (const text of vectors)
    expect(nativeSha256Hex(text)).toBe(sha256Hex(text));
});
