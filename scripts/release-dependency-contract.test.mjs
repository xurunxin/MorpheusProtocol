import { describe, expect, test } from "bun:test";

import {
  findForbiddenLockLocators,
  findForbiddenManifestDependencies,
  forbiddenDependencyReason,
  forbiddenLockLocatorReason,
} from "./release-dependency-contract.mjs";

describe("release dependency contract", () => {
  test("accepts registry versions and ignores repository metadata", () => {
    const manifest = {
      dependencies: { "@xurunxin/morpheus-protocol": "0.3.0" },
      devDependencies: { typescript: "6.0.3" },
      repository: {
        type: "git",
        url: "git+https://github.com/xurunxin/MorpheusProtocol.git",
      },
    };

    expect(findForbiddenManifestDependencies(manifest, "package.json")).toEqual(
      [],
    );
    expect(
      findForbiddenLockLocators(
        '"typescript": ["typescript@6.0.3", "", {}, "sha512-example"],',
      ),
    ).toEqual([]);
  });

  test.each([
    ["workspace:0.3.0", "local/workspace"],
    ["file:../protocol", "local/workspace"],
    ["link:../protocol", "local/workspace"],
    ["portal:../protocol", "local/workspace"],
    ["git+https://github.com/x/repo.git#main", "Git"],
    ["git://github.com/x/repo.git", "Git"],
    ["github:x/repo", "Git"],
    ["git@github.com:x/repo.git", "Git"],
    ["https://github.com/x/repo.git", "Git"],
  ])("rejects %s", (specifier, reason) => {
    expect(forbiddenDependencyReason(specifier)).toBe(reason);
    expect(
      findForbiddenManifestDependencies(
        { dependencies: { candidate: specifier } },
        "package.json",
      ),
    ).toHaveLength(1);
  });

  test("checks committed lock locator strings", () => {
    const failures = findForbiddenLockLocators(
      [
        '"protocol": ["@x/protocol@workspace:packages/protocol"],',
        '"local": ["local@file:../local"],',
        '"source": ["source@git+https://github.com/x/source.git#abc"],',
      ].join("\n"),
    );

    expect(failures).toHaveLength(3);
    expect(failures[0]).toContain("bun.lock:1");
    expect(failures[1]).toContain("bun.lock:2");
    expect(failures[2]).toContain("bun.lock:3");
    expect(
      forbiddenLockLocatorReason(
        "@xurunxin/morpheus-protocol@workspace:packages/morpheus-protocol",
      ),
    ).toBe("local/workspace");
  });
});
