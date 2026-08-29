import { negotiateAgentOsV1Handshake } from "@xurunxin/morpheus-protocol";

type MaybePromise<T> = T | PromiseLike<T>;
export type AgentOsAppHandshakeResult = ReturnType<
  typeof negotiateAgentOsV1Handshake
>;

export interface NegotiateAgentOsAppHandshakeOptions {
  readonly clientOffer: () => MaybePromise<unknown>;
  readonly providerOffer: () => MaybePromise<unknown>;
  readonly nowEpochMs: () => MaybePromise<number>;
}

/**
 * 只解析 caller 注入的双方 offer 与时钟，并委托协议 authority 完成协商。
 * SDK 不生成 peer、版本、feature 或 negotiated snapshot。
 */
export async function negotiateAgentOsAppHandshake(
  options: Readonly<NegotiateAgentOsAppHandshakeOptions>,
): Promise<AgentOsAppHandshakeResult> {
  const clientOffer = await options.clientOffer();
  const providerOffer = await options.providerOffer();
  const nowEpochMs = await options.nowEpochMs();
  return negotiateAgentOsV1Handshake(clientOffer, providerOffer, nowEpochMs);
}
