/** Effect budget admission application 是 Control 产出的不可变跨服务引用。 */
export interface AgentOsEffectBudgetAdmissionApplicationUnsignedV1 {
  readonly schemaVersion: "agent-os-control-effect-budget-admission/v1";
  readonly commandId: string;
  readonly effectId: string;
  readonly reservationId: string;
  readonly requestDigest: string;
  readonly reservationReceiptDigest: string;
  readonly effectPermitDigest: string;
  readonly kernelFenceDigest: string;
}

export interface AgentOsEffectBudgetAdmissionApplicationV1 extends AgentOsEffectBudgetAdmissionApplicationUnsignedV1 {
  readonly applicationRef: string;
  readonly applicationDigest: string;
}
