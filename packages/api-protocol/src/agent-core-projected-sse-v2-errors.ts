export class AgentCoreProjectedSseProtocolError extends Error {
  constructor(
    readonly code: string,
    message = code,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "AgentCoreProjectedSseProtocolError";
  }
}

export class AgentCoreProjectedSseHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown | undefined
  ) {
    super(message);
    this.name = "AgentCoreProjectedSseHttpError";
  }
}

export class AgentCoreProjectedSseTransportError extends Error {
  constructor(
    readonly lastConfirmedCursor: string | undefined,
    cause: unknown
  ) {
    super("Projected SSE transport failed", { cause });
    this.name = "AgentCoreProjectedSseTransportError";
  }
}

export class AgentCoreProjectedSseAbortError extends Error {
  constructor(
    readonly lastConfirmedCursor: string | undefined,
    cause: unknown
  ) {
    super("Projected SSE stream aborted", { cause });
    this.name = "AgentCoreProjectedSseAbortError";
  }
}
