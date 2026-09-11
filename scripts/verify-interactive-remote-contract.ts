/**
 * N01 · verify-interactive-remote-contract（B02 建立，B03/B04 扩充）
 *
 * 阶段门（04-execution.md N01）：
 *   1. strict   —— 已实现协议子集（agent-os-interactive.v3、
 *                  agent-os-remote-ingress.v1、agent-os-attachment.v1）的
 *                  严格解析 / 拒绝 / 幂等指纹自检（本任务交付）。
 *   2. browser-bundle —— 浏览器 bundle 消费自检（B03/B04 扩充，当前 deferred）。
 *   3. mixed-packed   —— 混合版本 / packed consumer 矩阵（B04 扩充，当前 deferred）。
 *
 * 约束：纯进程内合成数据；不读取 .env / 真实 provider 凭据 / 本地敏感路径；
 * 未实现阶段必须显式报告 deferred，不得伪造通过。
 *
 * 用法：
 *   bun scripts/verify-interactive-remote-contract.ts [--help]
 *       [--stage strict|browser-bundle|mixed-packed|all]
 *       [--out <报告 JSON 路径>] [--json]
 *
 * 退出码：0 = 所有非 deferred 检查通过；1 = 存在 fail；2 = 参数非法。
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
  AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
  AGENT_OS_INTERACTIVE_V3_DECLARED_CAPABILITIES,
  AGENT_OS_INTERACTIVE_V3_OPERATIONS,
  AGENT_OS_REMOTE_INGRESS_V1_LIMITS,
  AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION,
  AgentOsAttachmentV1ContractError,
  AgentOsInteractiveV3ContractError,
  AgentOsRemoteIngressV1ContractError,
  canonicalAgentOsInteractiveV3Source,
  createAgentOsInteractiveV3CommandFingerprint,
  parseAgentOsAttachmentV1Request,
  parseAgentOsInteractiveV3Request,
  parseAgentOsRemoteIngressV1Proof,
  validateAgentOsRemoteIngressV1ProofWindow,
} from "../packages/morpheus-protocol/src/index.js";

type CheckStatus = "pass" | "fail" | "deferred";

interface CheckResult {
  readonly name: string;
  readonly status: CheckStatus;
  readonly detail: string;
}

interface StageResult {
  readonly stage: string;
  readonly status: "pass" | "fail" | "deferred";
  readonly checks: readonly CheckResult[];
}

const digest = (letter: string): `sha256:${string}` =>
  `sha256:${letter.repeat(64)}`;
const INSTANT = "2026-08-30T00:00:00.000Z";

const HELP_TEXT = `N01 verify-interactive-remote-contract

用法：
  bun scripts/verify-interactive-remote-contract.ts [选项]

选项：
  --help                          显示本帮助并退出（退出码 0）
  --stage <name|all>              只运行指定阶段（默认 all）
                                  strict | browser-bundle | mixed-packed | all
  --out <path>                    将 JSON 报告写入指定路径（默认仅 stdout）
  --json                          stdout 仅输出 JSON 报告

阶段：
  strict           B02 交付：interactive v3 / remote ingress v1 / attachment v1
                   的严格解析、拒绝与幂等指纹自检。
  browser-bundle   B03/B04 扩充（当前 deferred）。
  mixed-packed     B04 扩充（当前 deferred）。

约束：进程内合成数据；不读取 .env 或真实凭据；deferred 阶段显式报告。
`;

function parseArgs(argv: readonly string[]): {
  help: boolean;
  stage: string;
  out?: string;
  json: boolean;
} {
  let help = false;
  let stage = "all";
  let out: string | undefined;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") help = true;
    else if (arg === "--json") json = true;
    else if (arg === "--stage") {
      stage = argv[index + 1];
      index += 1;
    } else if (arg === "--out") {
      out = argv[index + 1];
      index += 1;
    } else failUsage(`未知参数：${String(arg)}`);
  }
  if (
    stage !== "all" &&
    stage !== "strict" &&
    stage !== "browser-bundle" &&
    stage !== "mixed-packed"
  )
    failUsage(`未知阶段：${stage}`);
  return { help, stage, out, json };
}

function failUsage(message: string): never {
  process.stderr.write(`参数错误：${message}\n${HELP_TEXT}`);
  process.exit(2);
}

class CheckRunner {
  readonly checks: CheckResult[] = [];

  expect(action: () => void, name: string): void {
    try {
      action();
      this.checks.push({ name, status: "pass", detail: "通过" });
    } catch (error) {
      this.checks.push({
        name,
        status: "fail",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  expectContractError(
    action: () => unknown,
    name: string,
    expectedCode: string,
    errorType: new (...args: never[]) => Error,
  ): void {
    try {
      action();
      this.checks.push({
        name,
        status: "fail",
        detail: `未拒绝；期望错误码 ${expectedCode}`,
      });
    } catch (error) {
      if (error instanceof errorType && error.code === expectedCode)
        this.checks.push({ name, status: "pass", detail: expectedCode });
      else
        this.checks.push({
          name,
          status: "fail",
          detail: `错误码不符：${error instanceof Error ? error.message : String(error)}`,
        });
    }
  }

  deferred(name: string, detail: string): void {
    this.checks.push({ name, status: "deferred", detail });
  }
}

function v3Command(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    commandId: "command.1",
    principal: "principal.owner",
    payloadDigest: digest("a"),
    ...overrides,
  };
}

function v3TurnStart(
  commandOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: "agent-os-interactive.v3",
    operation: "turn.start",
    requestId: "request.turn.start",
    sessionId: "session.1",
    turnId: "turn.1",
    message: "hello",
    bindingRevision: 1,
    command: v3Command(commandOverrides),
  };
}

function runStrictStage(): StageResult {
  const runner = new CheckRunner();

  // ── interactive v3：注册表冻结 ────────────────────────────────────────
  runner.expect(() => {
    if (AGENT_OS_INTERACTIVE_V3_OPERATIONS.length !== 27)
      throw new Error(
        `operation 数量漂移：${AGENT_OS_INTERACTIVE_V3_OPERATIONS.length}`,
      );
    if (!AGENT_OS_INTERACTIVE_V3_OPERATIONS.includes("capability.read"))
      throw new Error("缺少 capability.read");
  }, "interactive v3 operation 清单冻结");
  runner.expect(() => {
    if (
      !AGENT_OS_INTERACTIVE_V3_DECLARED_CAPABILITIES.includes(
        "attachment.image",
      )
    )
      throw new Error("attachment.image 必须为 declared capability");
  }, "declared capability 包含 attachment.image");

  // ── interactive v3：严格解析与拒绝 ────────────────────────────────────
  runner.expect(() => {
    const parsed = parseAgentOsInteractiveV3Request(v3TurnStart());
    if (!Object.isFrozen(parsed)) throw new Error("解析结果未冻结");
  }, "v3 turn.start（含 command binding）严格解析");
  runner.expectContractError(
    () =>
      parseAgentOsInteractiveV3Request({
        ...v3TurnStart(),
        extra: true,
      }),
    "v3 请求拒绝未知字段",
    "INVALID_SHAPE",
    AgentOsInteractiveV3ContractError,
  );
  runner.expectContractError(
    () =>
      parseAgentOsInteractiveV3Request({
        ...v3TurnStart(),
        schemaVersion: AGENT_OS_INTERACTIVE_V2_SCHEMA_VERSION,
      }),
    "v3 拒绝 v2 schemaVersion",
    "INVALID_SCHEMA",
    AgentOsInteractiveV3ContractError,
  );
  runner.expectContractError(
    () => {
      const request = v3TurnStart();
      delete (request as { command?: unknown }).command;
      parseAgentOsInteractiveV3Request(request);
    },
    "v3 修改型 operation 必须携带 command binding",
    "INVALID_SHAPE",
    AgentOsInteractiveV3ContractError,
  );
  runner.expectContractError(
    () =>
      parseAgentOsInteractiveV3Request({
        schemaVersion: "agent-os-interactive.v3",
        operation: "session.catalog.read",
        requestId: "request.read",
        command: v3Command(),
      }),
    "v3 只读 operation 禁止携带 command binding",
    "INVALID_SHAPE",
    AgentOsInteractiveV3ContractError,
  );

  // ── interactive v3：幂等指纹（M3/M4） ────────────────────────────────
  runner.expect(() => {
    const base = v3TurnStart();
    const fingerprint = createAgentOsInteractiveV3CommandFingerprint(base);
    if (!/^sha256:[0-9a-f]{64}$/u.test(fingerprint))
      throw new Error("指纹格式非法");
    const rebound = v3TurnStart({ payloadDigest: fingerprint });
    if (createAgentOsInteractiveV3CommandFingerprint(rebound) !== fingerprint)
      throw new Error("指纹未剔除自报 payloadDigest");
    const parsed = parseAgentOsInteractiveV3Request(rebound);
    if (parsed.command?.payloadDigest !== fingerprint)
      throw new Error("digest 绑定失败");
  }, "v3 命令指纹幂等且可绑定");
  runner.expect(() => {
    const source = canonicalAgentOsInteractiveV3Source(v3TurnStart());
    if (source !== canonicalAgentOsInteractiveV3Source(JSON.parse(source)))
      throw new Error("canonical source 不稳定");
  }, "v3 canonical source 幂等");

  // ── remote ingress v1：proof 解析与窗口 ──────────────────────────────
  const validProof = {
    schemaVersion: AGENT_OS_REMOTE_INGRESS_V1_SCHEMA_VERSION,
    proofId: "proof.1",
    principal: "principal.owner",
    deviceId: "device.1",
    hostKind: "worker" as const,
    operation: "turn.start",
    payloadDigest: digest("a"),
    nonce: "nonce.1",
    issuedAt: INSTANT,
    expiresAt: "2026-08-30T00:00:30.000Z",
    authorityEpoch: 1,
  };
  runner.expect(() => {
    const parsed = parseAgentOsRemoteIngressV1Proof(validProof);
    if (!Object.isFrozen(parsed)) throw new Error("proof 解析结果未冻结");
  }, "remote ingress proof 严格解析");
  runner.expectContractError(
    () => parseAgentOsRemoteIngressV1Proof({ ...validProof, extra: 1 }),
    "remote ingress proof 拒绝未知字段",
    "INVALID_SHAPE",
    AgentOsRemoteIngressV1ContractError,
  );
  runner.expect(() => {
    const proof = parseAgentOsRemoteIngressV1Proof(validProof);
    if (
      validateAgentOsRemoteIngressV1ProofWindow(
        proof,
        "2026-08-30T00:00:10.000Z",
      ) !== "valid"
    )
      throw new Error("有效窗口未通过");
  }, "remote ingress proof 窗口校验通过");
  runner.expectContractError(
    () =>
      validateAgentOsRemoteIngressV1ProofWindow(
        parseAgentOsRemoteIngressV1Proof(validProof),
        "2026-08-30T00:01:00.000Z",
      ),
    "remote ingress 过期 proof 拒绝",
    "PROOF_EXPIRED",
    AgentOsRemoteIngressV1ContractError,
  );
  runner.expectContractError(
    () =>
      validateAgentOsRemoteIngressV1ProofWindow(
        parseAgentOsRemoteIngressV1Proof({
          ...validProof,
          expiresAt: `2026-08-30T00:00:${String(
            AGENT_OS_REMOTE_INGRESS_V1_LIMITS.maxProofTtlSeconds + 1,
          ).padStart(2, "0")}.000Z`,
        }),
        INSTANT,
      ),
    "remote ingress 超出 TTL 上限拒绝",
    "PROOF_WINDOW_INVALID",
    AgentOsRemoteIngressV1ContractError,
  );

  // ── attachment v1：契约骨架解析 ──────────────────────────────────────
  runner.expect(() => {
    const parsed = parseAgentOsAttachmentV1Request({
      schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
      operation: "attachment.init",
      requestId: "request.init",
      sessionId: "session.1",
      uploadId: "upload.1",
      mime: "image/png",
      totalBytes: 1024,
      totalDigest: digest("a"),
    });
    if (!Object.isFrozen(parsed)) throw new Error("attachment 解析结果未冻结");
  }, "attachment.init 契约骨架解析");
  runner.expectContractError(
    () =>
      parseAgentOsAttachmentV1Request({
        schemaVersion: AGENT_OS_ATTACHMENT_V1_SCHEMA_VERSION,
        operation: "attachment.init",
        requestId: "request.init",
        sessionId: "session.1",
        uploadId: "upload.1",
        mime: "image/png",
        totalBytes: 1024,
        totalDigest: digest("a"),
        extra: 1,
      }),
    "attachment 请求拒绝未知字段",
    "INVALID_SHAPE",
    AgentOsAttachmentV1ContractError,
  );

  // ── 未实现阶段（B03/B04 交付）────────────────────────────────────────
  const bundleAndPackedDeferred = (runner: CheckRunner): void => {
    runner.deferred(
      "browser-bundle 消费自检",
      "deferred：由 B03/B04 扩充（browser bundle / packed 矩阵）",
    );
  };
  bundleAndPackedDeferred(runner);

  const failed = runner.checks.some((check) => check.status === "fail");
  return {
    stage: "strict",
    status: failed ? "fail" : "pass",
    checks: runner.checks,
  };
}

function deferredStage(stage: string, detail: string): StageResult {
  return {
    stage,
    status: "deferred",
    checks: [{ name: stage, status: "deferred", detail }],
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
  }

  const stages: StageResult[] = [];
  if (args.stage === "all" || args.stage === "strict")
    stages.push(runStrictStage());
  if (args.stage === "all" || args.stage === "browser-bundle")
    stages.push(
      deferredStage(
        "browser-bundle",
        "deferred：由 B03/B04 扩充（browser bundle 自检）",
      ),
    );
  if (args.stage === "all" || args.stage === "mixed-packed")
    stages.push(
      deferredStage(
        "mixed-packed",
        "deferred：由 B04 扩充（混合版本 / packed 矩阵）",
      ),
    );

  const failed = stages.some((stage) => stage.status === "fail");
  const report = {
    script: "scripts/verify-interactive-remote-contract.ts",
    gate: "N01",
    owner: "B02（B03/B04 扩充）",
    generatedAt: new Date().toISOString(),
    result: failed ? "fail" : "pass",
    stages,
  };

  if (args.out) {
    const resolved = path.resolve(args.out);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (args.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else {
    process.stdout.write("N01 verify-interactive-remote-contract\n");
    for (const stage of stages) {
      process.stdout.write(`\n[stage] ${stage.stage}: ${stage.status}\n`);
      for (const check of stage.checks)
        process.stdout.write(`  ${check.status.padEnd(8)} ${check.name}\n`);
    }
    process.stdout.write(`\nresult: ${report.result}\n`);
  }
  process.exit(failed ? 1 : 0);
}

await main();
