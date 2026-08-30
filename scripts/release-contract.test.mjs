import { describe, expect, test } from "bun:test";

import {
  decidePackageRelease,
  resolveReleaseContract,
} from "./release-contract.mjs";

describe("release contract", () => {
  test("maps a candidate tag for a stable manifest to next", () => {
    expect(resolveReleaseContract("0.3.0", "v0.3.0-next.2")).toEqual({
      kind: "candidate",
      version: "0.3.0",
      tag: "v0.3.0-next.2",
      channel: "next",
      releaseLabel: "0.3.0-next.2",
    });
  });

  test("maps the stable tag to latest", () => {
    expect(resolveReleaseContract("0.3.0", "v0.3.0").channel).toBe("latest");
  });

  test.each([
    ["0.3.0-next.1", "v0.3.0-next.1"],
    ["0.3.0", "v0.3.1-next.1"],
    ["0.3.0", "v0.3.0-next.0"],
    ["0.3.0", "v0.3.0-rc.1"],
  ])("rejects unsupported version/tag pair %s %s", (version, tag) => {
    expect(() => resolveReleaseContract(version, tag)).toThrow();
  });

  test("publishes a missing version and skips a matching existing channel", () => {
    const contract = resolveReleaseContract("0.3.0", "v0.3.0-next.1");
    expect(
      decidePackageRelease({
        contract,
        publishedVersion: undefined,
        publishedIntegrity: undefined,
        registryContentMatches: undefined,
        currentChannelVersion: undefined,
      }),
    ).toBe("publish");
    expect(
      decidePackageRelease({
        contract,
        publishedVersion: "0.3.0",
        publishedIntegrity: "sha512-registry",
        registryContentMatches: true,
        currentChannelVersion: "0.3.0",
      }),
    ).toBe("skip");
  });

  test("only updates the resolved channel after content comparison", () => {
    const contract = resolveReleaseContract("0.3.0", "v0.3.0-next.1");
    expect(
      decidePackageRelease({
        contract,
        publishedVersion: "0.3.0",
        publishedIntegrity: "sha512-registry",
        registryContentMatches: true,
        currentChannelVersion: "0.2.1",
      }),
    ).toBe("tag");
    expect(() =>
      decidePackageRelease({
        contract,
        publishedVersion: "0.3.0",
        publishedIntegrity: "sha512-registry",
        registryContentMatches: false,
        currentChannelVersion: "0.3.0",
      }),
    ).toThrow("contents");
    expect(contract.channel).toBe("next");
  });
});
