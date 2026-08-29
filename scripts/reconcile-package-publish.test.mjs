import { describe, expect, test } from "bun:test";

import { reconcilePackagePublications } from "./reconcile-package-publish.mjs";

const candidates = [
  {
    name: "@xurunxin/morpheus-protocol",
    version: "0.2.0",
    integrity: "sha512-protocol",
  },
  {
    name: "@xurunxin/morpheus-sdk",
    version: "0.2.0",
    integrity: "sha512-sdk",
  },
];

describe("package publication reconciliation", () => {
  test("publishes missing versions and exposes next only after both verify", async () => {
    const client = createRegistryClient();

    const results = await reconcilePackagePublications({
      packages: candidates,
      client,
      wait: noWait,
    });

    expect(results.map((result) => result.action)).toEqual([
      "published",
      "published",
    ]);
    const firstTag = client.events.findIndex((event) =>
      event.startsWith("tag:"),
    );
    const lastPublish = client.events.findLastIndex((event) =>
      event.startsWith("publish:"),
    );
    expect(firstTag).toBeGreaterThan(lastPublish);
    expect(client.tags.get("@xurunxin/morpheus-protocol:next")).toBe("0.2.0");
    expect(client.tags.get("@xurunxin/morpheus-sdk:next")).toBe("0.2.0");
  });

  test("skips a matching version and publishes only the missing peer", async () => {
    const client = createRegistryClient({
      versions: new Map([
        ["@xurunxin/morpheus-protocol@0.2.0", "sha512-protocol"],
      ]),
    });

    const results = await reconcilePackagePublications({
      packages: candidates,
      client,
      wait: noWait,
    });

    expect(results.map((result) => result.action)).toEqual([
      "skipped-existing",
      "published",
    ]);
    expect(
      client.events.filter((event) => event.startsWith("publish:")),
    ).toEqual(["publish:@xurunxin/morpheus-sdk@0.2.0:candidate-staging"]);
  });

  test("reconciles tags without publishing when both versions match", async () => {
    const client = createRegistryClient({
      versions: registryVersions(),
    });

    const results = await reconcilePackagePublications({
      packages: candidates,
      client,
      wait: noWait,
    });

    expect(
      results.every((result) => result.action === "skipped-existing"),
    ).toBe(true);
    expect(client.events.some((event) => event.startsWith("publish:"))).toBe(
      false,
    );
    expect(
      client.events.filter((event) => event.startsWith("tag:")),
    ).toHaveLength(2);
  });

  test("is a no-op when versions and next tags already match", async () => {
    const client = createRegistryClient({
      versions: registryVersions(),
      tags: registryTags(),
    });

    await reconcilePackagePublications({
      packages: candidates,
      client,
      wait: noWait,
    });

    expect(
      client.events.some((event) => /^(?:publish|tag):/u.test(event)),
    ).toBe(false);
  });

  test("fails every write when a preflight integrity conflicts", async () => {
    const client = createRegistryClient({
      versions: new Map([["@xurunxin/morpheus-sdk@0.2.0", "sha512-different"]]),
    });

    await expect(
      reconcilePackagePublications({
        packages: candidates,
        client,
        wait: noWait,
      }),
    ).rejects.toThrow("Immutable package conflict");
    expect(
      client.events.some((event) => /^(?:publish|tag):/u.test(event)),
    ).toBe(false);
  });

  test("fails every write when a registry preflight is unknown", async () => {
    const client = createRegistryClient({
      preflightErrorName: "@xurunxin/morpheus-sdk",
    });

    await expect(
      reconcilePackagePublications({
        packages: candidates,
        client,
        wait: noWait,
      }),
    ).rejects.toThrow("registry unavailable");
    expect(
      client.events.some((event) => /^(?:publish|tag):/u.test(event)),
    ).toBe(false);
  });

  test("recovers when a concurrent publisher wins with identical bytes", async () => {
    const client = createRegistryClient({ publishRace: true });

    const results = await reconcilePackagePublications({
      packages: candidates,
      client,
      wait: noWait,
    });

    expect(results.map((result) => result.action)).toEqual([
      "reconciled-publish-race",
      "reconciled-publish-race",
    ]);
    expect(
      client.events.filter((event) => event.startsWith("tag:")),
    ).toHaveLength(2);
  });

  test("fails before tags when a published version is not observable", async () => {
    const client = createRegistryClient({ publishInvisible: true });

    await expect(
      reconcilePackagePublications({
        packages: candidates,
        client,
        verificationAttempts: 2,
        wait: noWait,
      }),
    ).rejects.toThrow("did not expose");
    expect(client.events.some((event) => event.startsWith("tag:"))).toBe(false);
  });

  test("fails before tags when publish exposes different bytes", async () => {
    const client = createRegistryClient({ publishMismatch: true });

    await expect(
      reconcilePackagePublications({
        packages: candidates,
        client,
        wait: noWait,
      }),
    ).rejects.toThrow("Immutable package conflict");
    expect(client.events.some((event) => event.startsWith("tag:"))).toBe(false);
  });

  test("fails when next cannot be verified", async () => {
    const client = createRegistryClient({
      versions: registryVersions(),
      tagInvisible: true,
    });

    await expect(
      reconcilePackagePublications({
        packages: candidates,
        client,
        verificationAttempts: 2,
        wait: noWait,
      }),
    ).rejects.toThrow("dist-tag");
  });

  test("resumes a partial tag update without republishing or rewriting the first tag", async () => {
    const client = createRegistryClient({
      versions: registryVersions(),
      failTagOnceName: "@xurunxin/morpheus-sdk",
    });

    await expect(
      reconcilePackagePublications({
        packages: candidates,
        client,
        wait: noWait,
      }),
    ).rejects.toThrow("tag update interrupted");
    await reconcilePackagePublications({
      packages: candidates,
      client,
      wait: noWait,
    });

    expect(client.events.some((event) => event.startsWith("publish:"))).toBe(
      false,
    );
    expect(
      client.events.filter((event) =>
        event.startsWith("tag:@xurunxin/morpheus-protocol"),
      ),
    ).toHaveLength(1);
    expect(client.tags).toEqual(registryTags());
  });

  test("refuses to roll next back to an older candidate", async () => {
    const client = createRegistryClient({
      versions: registryVersions(),
      tags: new Map([
        ["@xurunxin/morpheus-protocol:next", "0.3.0"],
        ["@xurunxin/morpheus-sdk:next", "0.3.0"],
      ]),
    });

    await expect(
      reconcilePackagePublications({
        packages: candidates,
        client,
        wait: noWait,
      }),
    ).rejects.toThrow("backward");
    expect(client.events.some((event) => event.startsWith("tag:"))).toBe(false);
  });
});

function createRegistryClient({
  versions = new Map(),
  tags = new Map(),
  publishRace = false,
  publishInvisible = false,
  publishMismatch = false,
  tagInvisible = false,
  preflightErrorName = null,
  failTagOnceName = null,
} = {}) {
  const state = new Map(versions);
  const tagState = new Map(tags);
  const events = [];
  let tagFailurePending = failTagOnceName !== null;

  return {
    events,
    tags: tagState,
    async getVersionIntegrity(name, version) {
      events.push(`get:${name}@${version}`);
      if (name === preflightErrorName) throw new Error("registry unavailable");
      return state.get(`${name}@${version}`) ?? null;
    },
    async publish(candidate, stagingTag) {
      events.push(
        `publish:${candidate.name}@${candidate.version}:${stagingTag}`,
      );
      if (!publishInvisible) {
        state.set(
          `${candidate.name}@${candidate.version}`,
          publishMismatch ? "sha512-different" : candidate.integrity,
        );
      }
      if (publishRace) throw new Error("version already exists");
    },
    async setDistTag(name, version, distTag) {
      events.push(`tag:${name}@${version}:${distTag}`);
      if (tagFailurePending && name === failTagOnceName) {
        tagFailurePending = false;
        throw new Error("tag update interrupted");
      }
      if (!tagInvisible) tagState.set(`${name}:${distTag}`, version);
    },
    async getDistTag(name, distTag) {
      events.push(`get-tag:${name}:${distTag}`);
      return tagState.get(`${name}:${distTag}`) ?? null;
    },
  };
}

function registryTags() {
  return new Map(
    candidates.map((candidate) => [
      `${candidate.name}:next`,
      candidate.version,
    ]),
  );
}

function registryVersions() {
  return new Map(
    candidates.map((candidate) => [
      `${candidate.name}@${candidate.version}`,
      candidate.integrity,
    ]),
  );
}

async function noWait() {}
