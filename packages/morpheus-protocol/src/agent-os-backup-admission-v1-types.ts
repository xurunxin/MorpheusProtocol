/** Backup admission application 是 Control 发给 Host 的脱敏不可变授权引用。 */
export interface AgentOsBackupAdmissionApplicationUnsignedV1 {
  readonly schemaVersion: "agent-os-control-backup-admission/v1";
  readonly commandId: string;
  readonly policyDigest: string;
  readonly checkpointDigest: string;
}

export interface AgentOsBackupAdmissionApplicationV1 extends AgentOsBackupAdmissionApplicationUnsignedV1 {
  readonly applicationRef: string;
  readonly applicationDigest: string;
}
