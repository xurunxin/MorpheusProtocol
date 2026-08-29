import { describe, expect, test } from "bun:test";
import {
  AGENT_OS_BACKUP_ADMISSION_APPLICATION_SCHEMA_V1,
  AgentOsV1ContractError,
  createAgentOsBackupAdmissionApplicationDigestV1,
  createAgentOsBackupAdmissionApplicationRefV1,
  createAgentOsBackupAdmissionApplicationV1,
  parseAgentOsBackupAdmissionApplicationV1,
  serializeAgentOsBackupAdmissionApplicationV1,
} from "../src/index.js";

const digest = (character: string) => `sha256:${character.repeat(64)}`;

describe("agent-os backup admission application v1", () => {
  test("creates deterministic frozen bytes bound only to policy and checkpoint digests", () => {
    const application = createAgentOsBackupAdmissionApplicationV1({
      commandId: "backup-command-one",
      policyDigest: digest("a"),
      checkpointDigest: digest("b"),
    });

    expect(application).toEqual({
      schemaVersion: AGENT_OS_BACKUP_ADMISSION_APPLICATION_SCHEMA_V1,
      commandId: "backup-command-one",
      policyDigest: digest("a"),
      checkpointDigest: digest("b"),
      applicationRef: `agent-os-backup-admission/v1/backup-command-one/${digest("a")}/${digest("b")}`,
      applicationDigest:
        "sha256:3d7876437b4e693181eabad8e1954f37515dcab98e1c2cd428f235a2277998a7",
    });
    expect(parseAgentOsBackupAdmissionApplicationV1(application)).toEqual(
      application,
    );
    const unsigned = {
      schemaVersion: application.schemaVersion,
      commandId: application.commandId,
      policyDigest: application.policyDigest,
      checkpointDigest: application.checkpointDigest,
    };
    expect(createAgentOsBackupAdmissionApplicationRefV1(unsigned)).toBe(
      application.applicationRef,
    );
    expect(createAgentOsBackupAdmissionApplicationDigestV1(unsigned)).toBe(
      application.applicationDigest,
    );
    expect(Object.isFrozen(application)).toBe(true);
    expect(serializeAgentOsBackupAdmissionApplicationV1(application)).toBe(
      `{"applicationDigest":"sha256:3d7876437b4e693181eabad8e1954f37515dcab98e1c2cd428f235a2277998a7","applicationRef":"agent-os-backup-admission/v1/backup-command-one/${digest("a")}/${digest("b")}","checkpointDigest":"${digest("b")}","commandId":"backup-command-one","policyDigest":"${digest("a")}","schemaVersion":"agent-os-control-backup-admission/v1"}`,
    );
  });

  test("rejects unknown, missing, path-bearing, malformed and self-drifting applications", () => {
    const application = createAgentOsBackupAdmissionApplicationV1({
      commandId: "backup-command-one",
      policyDigest: digest("a"),
      checkpointDigest: digest("b"),
    });
    const invalid: unknown[] = [
      { ...application, payload: "raw" },
      Object.fromEntries(
        Object.entries(application).filter(([key]) => key !== "policyDigest"),
      ),
      { ...application, commandId: "../backup-command" },
      { ...application, checkpointDigest: "sha256:not-a-digest" },
      { ...application, applicationRef: `${application.applicationRef}/drift` },
      { ...application, applicationDigest: digest("f") },
      Object.assign(Object.create(null), application),
      Object.defineProperty({ ...application }, "commandId", {
        get: () => "backup-command-one",
      }),
      Object.assign({ ...application }, { [Symbol("hidden")]: true }),
    ];

    for (const value of invalid)
      expect(() => parseAgentOsBackupAdmissionApplicationV1(value)).toThrow(
        AgentOsV1ContractError,
      );
    expect(() =>
      createAgentOsBackupAdmissionApplicationDigestV1({
        ...application,
        credential: "raw",
      }),
    ).toThrow(AgentOsV1ContractError);
  });
});
