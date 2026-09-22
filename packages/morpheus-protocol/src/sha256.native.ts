import { createHash } from "node:crypto";

/** 仅服务端构建使用；编码及同步返回值与 portable 实现一致。 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
