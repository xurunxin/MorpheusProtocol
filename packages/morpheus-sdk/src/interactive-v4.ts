import {
  canonicalInteractiveV4,
  createAgentOsInteractiveV4CommandFingerprint,
  parseAgentOsInteractiveV4Request,
  parseAgentOsInteractiveV4Response,
  parseInteractiveV4QueueSnapshot,
  type AgentOsInteractiveV4Request,
  type AgentOsInteractiveV4Response,
  type InteractiveV4InputReceipt,
  type InteractiveV4Owner,
  type InteractiveV4QueueSnapshot,
} from "@xurunxin/morpheus-protocol";

export interface InteractiveV4AppTransport {
  readonly request: (
    request: AgentOsInteractiveV4Request,
    signal?: AbortSignal,
  ) => Promise<unknown> | unknown;
}
export type InteractiveV4Capabilities = Extract<
  AgentOsInteractiveV4Response,
  { operation: "capability.read" }
>;

/** 无持久化、无隐式重试；capabilities 由调用方从同一可信连接读取。 */
export function createInteractiveV4AppClient(
  transport: InteractiveV4AppTransport,
) {
  if (typeof transport.request !== "function")
    throw new TypeError("transport.request required");
  return Object.freeze({
    request: async (
      input: unknown,
      options: {
        readonly capabilities?: InteractiveV4Capabilities;
        readonly signal?: AbortSignal;
      } = {},
    ): Promise<AgentOsInteractiveV4Response> => {
      const request = parseAgentOsInteractiveV4Request(input);
      if (request.operation !== "capability.read") {
        if (!options.capabilities)
          throw new TypeError("CAPABILITY_UNAVAILABLE");
        const capabilities = parseAgentOsInteractiveV4Response(
          options.capabilities,
        );
        if (
          capabilities.operation !== "capability.read" ||
          !capabilities.capabilities.some(
            (c) =>
              c.operation ===
                (request.operation === "prompt.queue.owner.read"
                  ? "prompt.queue.read"
                  : request.operation) && c.ready,
          )
        )
          throw new TypeError("CAPABILITY_UNAVAILABLE");
      }
      if (
        "command" in request &&
        request.command.payloadDigest !==
          createAgentOsInteractiveV4CommandFingerprint(request)
      )
        throw new TypeError("DIGEST_MISMATCH");
      const response = parseAgentOsInteractiveV4Response(
        await transport.request(request, options.signal),
      );
      if (
        response.operation !== request.operation ||
        response.requestId !== request.requestId
      )
        throw new TypeError("CORRELATION_MISMATCH");
      if (
        request.operation === "prompt.queue.owner.read" &&
        (response.operation !== "prompt.queue.owner.read" ||
          response.sessionId !== request.sessionId)
      ) {
        throw new TypeError("OWNER_MISMATCH");
      }
      if ("owner" in request) {
        const responseOwner =
          "owner" in response
            ? response.owner
            : "snapshot" in response
              ? response.snapshot.owner
              : null;
        if (
          canonicalInteractiveV4(request.owner) !==
          canonicalInteractiveV4(responseOwner)
        )
          throw new TypeError("OWNER_MISMATCH");
      }
      if ("command" in request) {
        if (
          !("command" in response) ||
          canonicalInteractiveV4(request.command) !==
            canonicalInteractiveV4(response.command)
        )
          throw new TypeError("COMMAND_MISMATCH");
        if (
          "inputId" in request &&
          response.input !== null &&
          (response.input.inputId !== request.inputId ||
            response.input.source !== "user")
        )
          throw new TypeError("INPUT_MISMATCH");
      }
      return response;
    },
    reduce: transitionInteractiveV4Queue,
  });
}

export type InteractiveV4QueueTransition =
  | Readonly<{ kind: "committed"; state: InteractiveV4QueueSnapshot }>
  | Readonly<{
      kind: "rebuild-required";
      reason:
        | "owner-changed"
        | "revision-gap"
        | "conflict"
        | "state-regression";
    }>;

const NEXT: Readonly<
  Record<
    InteractiveV4InputReceipt["status"],
    readonly InteractiveV4InputReceipt["status"][]
  >
> = {
  queued: ["queued", "bound", "unknown", "settled", "cancelled", "rejected"],
  bound: ["bound", "unknown", "settled"],
  unknown: ["unknown", "settled"],
  settled: ["settled"],
  cancelled: ["cancelled"],
  rejected: ["rejected"],
};
function immutableIdentity(input: InteractiveV4InputReceipt): string {
  const {
    status: _status,
    binding: _binding,
    queueRevision: _revision,
    reason: _reason,
    ...identity
  } = input;
  void _status;
  void _binding;
  void _revision;
  void _reason;
  return canonicalInteractiveV4(identity);
}
/** snapshot 为 Host 完整有界页；delta 同样携带完整页，必须连续 revision。
 * 重建时调用方显式使用 snapshot。Reducer 从不发送命令或判定模型已理解。
 */
export function transitionInteractiveV4Queue(
  previous: InteractiveV4QueueSnapshot | null,
  input: unknown,
  expected: InteractiveV4Owner,
  mode: "snapshot" | "delta" = "delta",
): InteractiveV4QueueTransition {
  const next = parseInteractiveV4QueueSnapshot(input);
  const rebuild = (
    reason: Extract<
      InteractiveV4QueueTransition,
      { kind: "rebuild-required" }
    >["reason"],
  ): InteractiveV4QueueTransition =>
    Object.freeze({ kind: "rebuild-required", reason });
  if (canonicalInteractiveV4(next.owner) !== canonicalInteractiveV4(expected))
    return rebuild("owner-changed");
  if (previous === null)
    return mode === "snapshot"
      ? Object.freeze({ kind: "committed", state: next })
      : rebuild("revision-gap");
  const old = parseInteractiveV4QueueSnapshot(previous);
  if (canonicalInteractiveV4(old.owner) !== canonicalInteractiveV4(next.owner))
    return rebuild("owner-changed");
  if (next.queueRevision === old.queueRevision)
    return canonicalInteractiveV4(old) === canonicalInteractiveV4(next)
      ? Object.freeze({ kind: "committed", state: old })
      : rebuild("conflict");
  if (next.queueRevision < old.queueRevision)
    return rebuild("state-regression");
  if (mode === "delta" && next.queueRevision !== old.queueRevision + 1)
    return rebuild("revision-gap");
  const byId = new Map(next.inputs.map((item) => [item.inputId, item]));
  const oldIds = new Set(old.inputs.map((item) => item.inputId));
  const oldCommands = new Set(old.inputs.map((item) => item.commandId));
  const lastAccepted = old.inputs.at(-1)?.acceptedSequence ?? -1;
  for (const item of next.inputs) {
    if (
      !oldIds.has(item.inputId) &&
      (item.acceptedSequence <= lastAccepted || oldCommands.has(item.commandId))
    )
      return rebuild("conflict");
  }
  for (const item of old.inputs) {
    const current = byId.get(item.inputId);
    if (!current) {
      if (
        item.status !== "settled" &&
        item.status !== "cancelled" &&
        item.status !== "rejected"
      )
        return rebuild("conflict");
      continue;
    }
    if (immutableIdentity(item) !== immutableIdentity(current))
      return rebuild("conflict");
    if (
      current.queueRevision < item.queueRevision ||
      !NEXT[item.status].includes(current.status)
    )
      return rebuild("state-regression");
    if (
      item.binding !== null &&
      canonicalInteractiveV4(item.binding) !==
        canonicalInteractiveV4(current.binding)
    )
      return rebuild("conflict");
    if (
      current.queueRevision === item.queueRevision &&
      canonicalInteractiveV4(item) !== canonicalInteractiveV4(current)
    )
      return rebuild("conflict");
  }
  return Object.freeze({ kind: "committed", state: next });
}
