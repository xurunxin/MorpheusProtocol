import {
  createAgentOsInteractiveV3CommandFingerprint,
  parseAgentOsInteractiveV2Event,
  parseAgentOsInteractiveV2TranscriptResponse,
  parseAgentOsInteractiveV3Request,
  parseAgentOsInteractiveV3Response,
  type AgentOsInteractiveV2Event,
  type AgentOsInteractiveV2TranscriptResponse,
  type AgentOsInteractiveV3CapabilityResponse,
  type AgentOsInteractiveV3Request,
  type AgentOsInteractiveV3Response,
} from "@xurunxin/morpheus-protocol";

import {
  transitionInteractiveV2Projection,
  type InteractiveV2ProjectionExpectedContext,
  type InteractiveV2ProjectionState,
  type InteractiveV2ProjectionTransition,
} from "./interactive-v2.js";

/**
 * v3 transport 与 v2 形状一致：request/subscribe 都由调用方注入。
 * Node IPC、浏览器 fetch/WSS 等环境入口（./node、./browser 子路径）产出的
 * 都是同一个 transport 形状，注入同一客户端工厂。
 */
export interface InteractiveV3AppTransport {
  readonly request: (
    request: Readonly<AgentOsInteractiveV3Request>,
    signal?: AbortSignal,
  ) => Promise<unknown> | unknown;
  readonly subscribe?: (
    request: Readonly<AgentOsInteractiveV3Request>,
    signal?: AbortSignal,
  ) => AsyncIterable<unknown> | PromiseLike<AsyncIterable<unknown>> | unknown;
}

export interface InteractiveV3AppRequestOptions {
  readonly signal?: AbortSignal;
}

/**
 * transcript 数据面 wire identity 保持 `agent-os-interactive.v2`（B02 冻结）：
 * 流帧用 v2 严格解析器解码，快照页与事件直接交给同一个确定性 reducer。
 */
export type InteractiveV3TranscriptStreamItem = Readonly<
  AgentOsInteractiveV2TranscriptResponse | AgentOsInteractiveV2Event
>;

export type InteractiveV3ProjectionState = InteractiveV2ProjectionState;
export type InteractiveV3ProjectionExpectedContext =
  InteractiveV2ProjectionExpectedContext;
export type InteractiveV3ProjectionTransition =
  InteractiveV2ProjectionTransition;

export interface InteractiveV3AppClient {
  readonly request: (
    input: Readonly<AgentOsInteractiveV3Request>,
    options?: Readonly<InteractiveV3AppRequestOptions>,
  ) => Promise<Readonly<AgentOsInteractiveV3Response>>;
  readonly subscribeTranscript: (
    input: Readonly<AgentOsInteractiveV3Request>,
    options?: Readonly<InteractiveV3AppRequestOptions>,
  ) => AsyncIterable<InteractiveV3TranscriptStreamItem>;
  readonly reduce: (
    previous: Readonly<InteractiveV3ProjectionState> | null,
    input: unknown,
    expected?: Readonly<InteractiveV3ProjectionExpectedContext>,
  ) => InteractiveV3ProjectionTransition;
  readonly readCapabilities: (
    request: Readonly<
      Extract<AgentOsInteractiveV3Request, { operation: "capability.read" }>
    >,
    options?: Readonly<InteractiveV3AppRequestOptions>,
  ) => Promise<Readonly<AgentOsInteractiveV3CapabilityResponse>>;
}

/**
 * 创建无状态 v3 App 客户端。去重、乱序、缺口与背压重建共用 v2 的唯一
 * 确定性 reducer；订阅关闭（break/return/abort）只拆除 wire 订阅，
 * 绝不合成 `turn.cancel`——取消必须是携带 command binding 的显式请求。
 */
export function createInteractiveV3AppClient(
  transport: Readonly<InteractiveV3AppTransport>,
): Readonly<InteractiveV3AppClient> {
  if (typeof transport.request !== "function")
    throw new TypeError("InteractiveV3AppTransport.request must be a function");

  const request = async (
    input: Readonly<AgentOsInteractiveV3Request>,
    options: Readonly<InteractiveV3AppRequestOptions> = {},
  ): Promise<Readonly<AgentOsInteractiveV3Response>> => {
    const parsedRequest = parseAgentOsInteractiveV3Request(input);
    const response = parseAgentOsInteractiveV3Response(
      await transport.request(parsedRequest, options.signal),
    );
    if (response.operation !== parsedRequest.operation)
      throw new TypeError(
        "interactive v3 response operation does not match request",
      );
    if (response.requestId !== parsedRequest.requestId)
      throw new TypeError(
        "interactive v3 response requestId does not match request",
      );
    if (parsedRequest.command !== undefined)
      verifyCommandReceipt(parsedRequest, response);
    return response;
  };

  return Object.freeze({
    request,
    subscribeTranscript: (
      input: Readonly<AgentOsInteractiveV3Request>,
      options: Readonly<InteractiveV3AppRequestOptions> = {},
    ) => subscribeTranscript(transport, input, options.signal),
    reduce: transitionInteractiveV3Projection,
    readCapabilities: async (
      input: Readonly<
        Extract<AgentOsInteractiveV3Request, { operation: "capability.read" }>
      >,
      options?: Readonly<InteractiveV3AppRequestOptions>,
    ): Promise<Readonly<AgentOsInteractiveV3CapabilityResponse>> => {
      const response = await request(input, options);
      if (response.operation !== "capability.read")
        throw new TypeError(
          "interactive v3 capability response operation does not match request",
        );
      return response;
    },
  });
}

export const createAgentOsInteractiveV3AppClient = createInteractiveV3AppClient;

/**
 * M3/M4 客户端侧完整性：宿主回执必须回显本端 commandId，且 payloadDigest
 * 等于按同一 canonical 指纹算法重算的结果；不一致视为 transport 篡改。
 *
 * 回执强制（审查 P01）：携带 command binding 的请求，凡以成功终态
 * （accepted/completed）返回都必须携带 receipt——省略回执即绕过命令结果
 * 绑定，视为协议违例。rejected 是独立的拒绝语义，允许没有回执。
 */
function verifyCommandReceipt(
  request: Readonly<AgentOsInteractiveV3Request>,
  response: Readonly<AgentOsInteractiveV3Response>,
): void {
  const command = request.command;
  if (command === undefined) return;
  const receipt = "receipt" in response ? response.receipt : undefined;
  const status = "status" in response ? response.status : undefined;
  if (status !== "rejected" && receipt === undefined)
    throw new TypeError(
      "interactive v3 command success requires a command receipt",
    );
  if (receipt === undefined) return;
  if (receipt.commandId !== command.commandId)
    throw new TypeError(
      "interactive v3 command receipt commandId does not match request",
    );
  const fingerprint = createAgentOsInteractiveV3CommandFingerprint(request);
  if (receipt.payloadDigest !== fingerprint)
    throw new TypeError(
      "interactive v3 command receipt payloadDigest does not match the canonical command fingerprint",
    );
}

async function* subscribeTranscript(
  transport: Readonly<InteractiveV3AppTransport>,
  input: Readonly<AgentOsInteractiveV3Request>,
  signal: AbortSignal | undefined,
): AsyncGenerator<InteractiveV3TranscriptStreamItem> {
  const request = parseAgentOsInteractiveV3Request(input);
  if (request.operation !== "transcript.subscribe")
    throw new TypeError("subscribeTranscript requires transcript.subscribe");
  if (transport.subscribe !== undefined) {
    const source = await transport.subscribe(request, signal);
    if (!isAsyncIterable(source))
      throw new TypeError(
        "InteractiveV3AppTransport.subscribe must return an async iterable",
      );
    for await (const item of source)
      yield decodeTranscriptItem(item, request.requestId, request.sessionId);
    return;
  }
  const response = parseAgentOsInteractiveV2TranscriptResponse(
    await transport.request(request, signal),
  );
  assertTranscriptResponse(response, request.requestId, request.sessionId);
  yield response;
}

function decodeTranscriptItem(
  input: unknown,
  requestId: string,
  sessionId: string,
): InteractiveV3TranscriptStreamItem {
  if (isRecord(input) && input.eventType !== undefined) {
    const event = parseAgentOsInteractiveV2Event(input);
    if (event.sessionId !== sessionId)
      throw new TypeError("transcript event belongs to another session");
    return event;
  }
  const response = parseAgentOsInteractiveV2TranscriptResponse(input);
  assertTranscriptResponse(response, requestId, sessionId);
  return response;
}

function assertTranscriptResponse(
  response: Readonly<AgentOsInteractiveV2TranscriptResponse>,
  requestId: string,
  sessionId: string,
): void {
  if (response.operation !== "transcript.subscribe")
    throw new TypeError("transcript response operation does not match request");
  if (response.requestId !== requestId)
    throw new TypeError("transcript response requestId does not match request");
  if (response.snapshot.sessionId !== sessionId)
    throw new TypeError("transcript response belongs to another session");
}

/**
 * 与 v2 完全相同的确定性 reducer：dedup、乱序窗口、缺口 rebuild 与
 * 恢复快照一致都在这一份实现里，v3 不维护平行投影状态。
 */
export const transitionInteractiveV3Projection =
  transitionInteractiveV2Projection;
export const reduceInteractiveV3Transcript = transitionInteractiveV2Projection;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    value !== null && typeof value === "object" && Symbol.asyncIterator in value
  );
}
