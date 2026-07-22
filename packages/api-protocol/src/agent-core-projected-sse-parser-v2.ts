import { agentCoreProjectedSseV2Limits } from "./agent-core-projected-sse-v2.js";
import { AgentCoreProjectedSseProtocolError } from "./agent-core-projected-sse-v2-errors.js";

export interface AgentCoreProjectedSseRawFrame {
  readonly cursor: string;
  readonly event: string;
  readonly data: string;
}

/** Incremental strict parser: every decoded character is scanned at most once. */
export class AgentCoreProjectedSseFrameParser {
  private readonly decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  private firstDecodedCharacter = true;
  private pendingCarriageReturn = false;
  private lineParts: string[] = [];
  private linePrefix = "";
  private lineBytes = 0;
  private dataLine = false;
  private dataValueStarted = false;
  private dataBytes = 0;
  private fields: Partial<Record<"id" | "event" | "data", string>> = {};

  push(chunk: Uint8Array): AgentCoreProjectedSseRawFrame[] {
    let decoded: string;
    try {
      decoded = this.decoder.decode(chunk, { stream: true });
    } catch (error) {
      throw new AgentCoreProjectedSseProtocolError(
        "INVALID_UTF8",
        "SSE stream is not valid UTF-8",
        { cause: error }
      );
    }
    return this.consume(decoded, false);
  }

  finish(): AgentCoreProjectedSseRawFrame[] {
    let decoded: string;
    try {
      decoded = this.decoder.decode();
    } catch (error) {
      throw new AgentCoreProjectedSseProtocolError(
        "INVALID_UTF8",
        "SSE stream is not valid UTF-8",
        { cause: error }
      );
    }
    const frames = this.consume(decoded, true);
    if (this.pendingCarriageReturn) {
      this.pendingCarriageReturn = false;
      const frame = this.completeLine();
      if (frame) frames.push(frame);
    }
    if (this.lineParts.length !== 0 || Object.keys(this.fields).length !== 0) {
      throw new AgentCoreProjectedSseProtocolError(
        "INCOMPLETE_FRAME",
        "SSE stream ended mid-frame"
      );
    }
    return frames;
  }

  private consume(value: string, final: boolean): AgentCoreProjectedSseRawFrame[] {
    if (this.firstDecodedCharacter && value.length > 0) {
      this.firstDecodedCharacter = false;
      if (value.startsWith("\ufeff")) value = value.slice(1);
    }
    if (value.includes("\ufeff")) {
      throw new AgentCoreProjectedSseProtocolError(
        "INVALID_BOM",
        "BOM is only permitted at stream start"
      );
    }
    const frames: AgentCoreProjectedSseRawFrame[] = [];
    for (const character of value) {
      if (this.pendingCarriageReturn) {
        this.pendingCarriageReturn = false;
        const frame = this.completeLine();
        if (frame) frames.push(frame);
        if (character === "\n") continue;
      }
      if (character === "\r") {
        this.pendingCarriageReturn = true;
      } else if (character === "\n") {
        const frame = this.completeLine();
        if (frame) frames.push(frame);
      } else {
        this.append(character);
      }
    }
    if (final && this.pendingCarriageReturn) {
      this.pendingCarriageReturn = false;
      const frame = this.completeLine();
      if (frame) frames.push(frame);
    }
    return frames;
  }

  private append(character: string): void {
    this.lineParts.push(character);
    const bytes = new TextEncoder().encode(character).byteLength;
    this.lineBytes += bytes;
    if (this.linePrefix.length < 5) this.linePrefix += character;
    if (this.linePrefix === "data:") this.dataLine = true;
    if (!"data:".startsWith(this.linePrefix)) this.dataLine = false;
    if (this.dataLine && this.lineParts.length > 5) {
      if (!this.dataValueStarted && character === " ") {
        this.dataValueStarted = true;
      } else {
        this.dataValueStarted = true;
        this.dataBytes += bytes;
        if (this.dataBytes > agentCoreProjectedSseV2Limits.maxFrameDataBytes) {
          throw new AgentCoreProjectedSseProtocolError(
            "FRAME_TOO_LARGE",
            "SSE data exceeds byte limit"
          );
        }
      }
    } else if (
      !this.dataLine &&
      this.lineBytes > agentCoreProjectedSseV2Limits.maxFrameDataBytes + 16
    ) {
      throw new AgentCoreProjectedSseProtocolError(
        "FRAME_TOO_LARGE",
        "SSE line exceeds byte limit"
      );
    }
  }

  private completeLine(): AgentCoreProjectedSseRawFrame | undefined {
    const line = this.lineParts.join("");
    this.lineParts = [];
    this.linePrefix = "";
    this.lineBytes = 0;
    this.dataLine = false;
    this.dataValueStarted = false;
    this.dataBytes = 0;
    if (line.length === 0) return this.dispatch();
    if (line.startsWith(":"))
      throw new AgentCoreProjectedSseProtocolError(
        "COMMENT_NOT_ALLOWED",
        "SSE comments are not allowed"
      );
    const separator = line.indexOf(":");
    if (separator < 1)
      throw new AgentCoreProjectedSseProtocolError("MALFORMED_FRAME", "SSE field is malformed");
    const name = line.slice(0, separator);
    let value = line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (name !== "id" && name !== "event" && name !== "data") {
      throw new AgentCoreProjectedSseProtocolError(
        name === "retry" ? "RETRY_NOT_ALLOWED" : "UNKNOWN_FIELD",
        `SSE field ${name} is not allowed`
      );
    }
    if (this.fields[name] !== undefined)
      throw new AgentCoreProjectedSseProtocolError(
        "DUPLICATE_FIELD",
        `Duplicate SSE ${name} field`
      );
    if (
      (name === "id" || name === "data") &&
      new TextEncoder().encode(value).byteLength > agentCoreProjectedSseV2Limits.maxFrameDataBytes
    ) {
      throw new AgentCoreProjectedSseProtocolError(
        "FRAME_TOO_LARGE",
        `SSE ${name} exceeds byte limit`
      );
    }
    if (name === "data") {
      try {
        JSON.parse(value);
      } catch (error) {
        throw new AgentCoreProjectedSseProtocolError("MALFORMED_JSON", "SSE data must be JSON", {
          cause: error,
        });
      }
    }
    this.fields[name] = value;
    return undefined;
  }

  private dispatch(): AgentCoreProjectedSseRawFrame | undefined {
    const { id, event, data } = this.fields;
    if (id === undefined && event === undefined && data === undefined) {
      throw new AgentCoreProjectedSseProtocolError(
        "HEARTBEAT_NOT_ALLOWED",
        "Empty SSE heartbeat is not allowed"
      );
    }
    this.fields = {};
    if (id === undefined || event === undefined || data === undefined) {
      throw new AgentCoreProjectedSseProtocolError(
        "INCOMPLETE_FRAME",
        "SSE frame must contain id, event, and data"
      );
    }
    return Object.freeze({ cursor: id, event, data });
  }
}

export function createAgentCoreProjectedSseFrameParser(): AgentCoreProjectedSseFrameParser {
  return new AgentCoreProjectedSseFrameParser();
}
