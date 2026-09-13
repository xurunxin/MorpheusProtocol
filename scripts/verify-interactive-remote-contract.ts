/**
 * N01 · verify-interactive-remote-contract（B02 建立，B03/B04 扩充）
 *
 * 阶段门（04-execution.md N01）：
 *   1. strict   —— 已实现协议子集（agent-os-interactive.v3、
 *                  agent-os-remote-ingress.v1、agent-os-attachment.v1）的
 *                  严格解析 / 拒绝 / 幂等指纹自检（本任务交付）。
 *   2. browser-bundle —— 浏览器 bundle 消费自检（B03 交付）。
 *   3. mixed-packed   —— 版本锁步 / 混合版本声明层拒绝 / packed 矩阵报告
 *                        交叉校验（B04 交付；安装级矩阵由
 *                        `bun run test:packed-consumer` 产出报告）。
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
  browser-bundle   B03 交付：真实 SDK browser bundle 构建自检——不含
                   Node builtins 与 Host imports，只消费 Protocol。
  mixed-packed     B04 交付：root/protocol/sdk 版本锁步、SDK 对 Protocol 的
                   exact 依赖（混合版本在声明层被拒绝）、node/browser
                   subpath exports、v3 出口存在性，以及 packed-consumer
                   矩阵报告（.artifacts/packed-consumer-report.json）的
                   交叉校验与陈旧检测；报告缺失时该项显式 deferred。
                   安装级 old-old/new-new/mixed 真实矩阵由
                   bun run test:packed-consumer 执行。

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

  async expectAsync(action: () => Promise<void>, name: string): Promise<void> {
    try {
      await action();
      this.checks.push({ name, status: "pass", detail: "通过" });
    } catch (error) {
      this.checks.push({
        name,
        status: "fail",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
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

  const failed = runner.checks.some((check) => check.status === "fail");
  return {
    stage: "strict",
    status: failed ? "fail" : "pass",
    checks: runner.checks,
  };
}

const SDK_SRC_ROOT = path.resolve(
  import.meta.dirname,
  "../packages/morpheus-sdk/src",
);
const NODE_BUILTIN_PATTERN = /["']node:[A-Za-z][^"']*["']/u;
const HOST_IMPORT_PATTERN =
  /["']@xurunxin\/morpheus-(?:sdk|runtime|kernel|control|worker|personal-host|foundation|terminal|desktop|console|operator|integration)[^"']*["']/u;
const IMPORT_SPECIFIER_PATTERN =
  /(?:^|[\s;}])(?:import|export)\s[^;]*?from\s*["']([^"']+)["']/gu;

/**
 * B03 browser-bundle 阶段：用真实 bundler 以 browser 目标构建 SDK 的
 * index / browser / node 三个入口，验证 bundle 不含 Node builtins、不引用
 * Host 实现、外部模块只允许 Protocol（保持 external 不内联）。
 */
async function runBrowserBundleStage(): Promise<StageResult> {
  const runner = new CheckRunner();
  const entrypoints = [
    path.join(SDK_SRC_ROOT, "index.ts"),
    path.join(SDK_SRC_ROOT, "browser-transport.ts"),
    path.join(SDK_SRC_ROOT, "node-transport.ts"),
  ];
  await runner.expectAsync(async () => {
    const built = await Bun.build({
      entrypoints,
      target: "browser",
      format: "esm",
      external: ["@xurunxin/morpheus-protocol"],
    });
    if (!built.success) {
      const detail = built.logs.map((log) => String(log)).join("; ");
      throw new Error(`browser bundle 构建失败：${detail}`);
    }
    const outputs = await Promise.all(
      built.outputs.map(async (artifact) => ({
        artifactPath: artifact.path,
        text: await artifact.text(),
      })),
    );
    if (outputs.length !== entrypoints.length)
      throw new Error(`输出数量不符：${outputs.length}`);
    for (const output of outputs) {
      if (NODE_BUILTIN_PATTERN.test(output.text))
        throw new Error(`bundle 泄漏 Node builtin：${output.artifactPath}`);
      if (HOST_IMPORT_PATTERN.test(output.text))
        throw new Error(`bundle 泄漏 Host/SDK import：${output.artifactPath}`);
      for (const match of output.text.matchAll(IMPORT_SPECIFIER_PATTERN)) {
        const specifier = match[1];
        if (
          specifier !== "@xurunxin/morpheus-protocol" &&
          !specifier.startsWith(".")
        )
          throw new Error(
            `bundle 引入非法外部模块 ${specifier}：${output.artifactPath}`,
          );
      }
    }
    const indexBundle = outputs.find((output) =>
      output.artifactPath.endsWith("index.js"),
    );
    if (!indexBundle) throw new Error("缺少 index bundle 输出");
    if (!indexBundle.text.includes("@xurunxin/morpheus-protocol"))
      throw new Error("Protocol 未保持 external，可能被内联进 bundle");
  }, "SDK browser bundle 构建（index/browser/node 入口）");

  await runner.expectAsync(async () => {
    const sdkIndex = await import("../packages/morpheus-sdk/src/index.js");
    if (typeof sdkIndex.createInteractiveV3AppClient !== "function")
      throw new Error("SDK index 未导出 createInteractiveV3AppClient");
    if (typeof sdkIndex.transitionInteractiveV3Projection !== "function")
      throw new Error("SDK index 未导出 transitionInteractiveV3Projection");
    if (typeof sdkIndex.runInteractiveV3TurnWithAbort !== "function")
      throw new Error("SDK index 未导出 runInteractiveV3TurnWithAbort");
    const nodeEntry =
      await import("../packages/morpheus-sdk/src/node-transport.js");
    if (typeof nodeEntry.createInteractiveJsonlStreamTransport !== "function")
      throw new Error("node 入口未导出 createInteractiveJsonlStreamTransport");
    const browserEntry =
      await import("../packages/morpheus-sdk/src/browser-transport.js");
    if (typeof browserEntry.createBrowserInteractiveTransport !== "function")
      throw new Error("browser 入口未导出 createBrowserInteractiveTransport");
  }, "SDK v3 导出面与 node/browser transport 入口存在");

  const failed = runner.checks.some((check) => check.status === "fail");
  return {
    stage: "browser-bundle",
    status: failed ? "fail" : "pass",
    checks: runner.checks,
  };
}

const PACKED_REPORT_SCHEMA =
  "morpheus-protocol/packed-consumer-report/v1" as const;
const EXACT_SEMVER = /^\d+\.\d+\.\d+$/u;
const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");

interface PackageManifest {
  readonly version: string;
  readonly dependencies?: Record<string, string>;
  readonly exports?: Record<string, unknown>;
}

async function readPackageManifest(
  relativePath: string,
): Promise<PackageManifest> {
  return (await Bun.file(
    path.join(REPOSITORY_ROOT, relativePath),
  ).json()) as PackageManifest;
}

/**
 * B04 mixed-packed 阶段：进程内版本矩阵声明层自检 + packed 矩阵报告交叉校验。
 * 安装级 old-old/new-new/mixed 真实矩阵由 scripts/verify-packed-consumer.mjs
 * （`bun run test:packed-consumer`）执行并产出报告；本阶段负责锁步与陈旧检测。
 */
async function runMixedPackedStage(): Promise<StageResult> {
  const runner = new CheckRunner();
  const rootManifest = await readPackageManifest("package.json");
  const protocolManifest = await readPackageManifest(
    "packages/morpheus-protocol/package.json",
  );
  const sdkManifest = await readPackageManifest(
    "packages/morpheus-sdk/package.json",
  );

  runner.expect(() => {
    if (
      rootManifest.version !== protocolManifest.version ||
      protocolManifest.version !== sdkManifest.version
    )
      throw new Error(
        `版本未锁步：root=${rootManifest.version} protocol=${protocolManifest.version} sdk=${sdkManifest.version}`,
      );
  }, "root/protocol/sdk 版本锁步");

  runner.expect(() => {
    const spec = sdkManifest.dependencies?.["@xurunxin/morpheus-protocol"];
    if (spec !== protocolManifest.version || !EXACT_SEMVER.test(spec ?? ""))
      throw new Error(
        `sdk 必须以 exact ${protocolManifest.version} 依赖 protocol（禁止 workspace/file/link/git/范围），实际 ${String(spec)}`,
      );
  }, "sdk 依赖 protocol 为 exact 同版本（混合版本在声明层被拒绝）");

  runner.expect(() => {
    const nodeEntry = sdkManifest.exports?.["./node"];
    const browserEntry = sdkManifest.exports?.["./browser"];
    if (!nodeEntry || !browserEntry)
      throw new Error("sdk 缺少 ./node 或 ./browser subpath exports");
  }, "sdk node/browser subpath exports 就绪（packed 消费前提）");

  await runner.expectAsync(async () => {
    const protocol = await import("../packages/morpheus-protocol/src/index.js");
    if (
      protocol.AGENT_OS_INTERACTIVE_V3_SCHEMA_VERSION !==
      "agent-os-interactive.v3"
    )
      throw new Error("缺少 interactive v3 schema 常量");
    if (typeof protocol.parseAgentOsInteractiveV3Request !== "function")
      throw new Error("缺少 interactive v3 解析器");
    const sdk = await import("../packages/morpheus-sdk/src/index.js");
    if (typeof sdk.createInteractiveV3AppClient !== "function")
      throw new Error("SDK 缺少 createInteractiveV3AppClient");
    const nodeEntry =
      await import("../packages/morpheus-sdk/src/node-transport.js");
    if (typeof nodeEntry.createInteractiveJsonlStreamTransport !== "function")
      throw new Error(
        "SDK node 入口缺少 createInteractiveJsonlStreamTransport",
      );
    const browserEntry =
      await import("../packages/morpheus-sdk/src/browser-transport.js");
    if (typeof browserEntry.createBrowserInteractiveTransport !== "function")
      throw new Error("SDK browser 入口缺少 createBrowserInteractiveTransport");
  }, "v3 契约与 SDK node/browser 出口存在");

  const packedReportPath = path.join(
    REPOSITORY_ROOT,
    ".artifacts",
    "packed-consumer-report.json",
  );
  const packedReport = (await Bun.file(packedReportPath)
    .json()
    .catch(() => null)) as {
    schemaVersion: string;
    result: string;
    artifacts: { candidate: ReadonlyArray<{ name: string; version: string }> };
  } | null;
  if (packedReport === null) {
    runner.deferred(
      "packed-consumer 矩阵报告交叉校验",
      "deferred：.artifacts/packed-consumer-report.json 不存在；先运行 bun run test:packed-consumer",
    );
  } else {
    runner.expect(() => {
      if (packedReport.schemaVersion !== PACKED_REPORT_SCHEMA)
        throw new Error(`报告 schema 不符：${packedReport.schemaVersion}`);
      if (packedReport.result !== "pass")
        throw new Error(`packed 矩阵结果为 ${packedReport.result}`);
      const versions: Record<string, string> = {
        "@xurunxin/morpheus-protocol": protocolManifest.version,
        "@xurunxin/morpheus-sdk": sdkManifest.version,
      };
      for (const artifact of packedReport.artifacts.candidate) {
        const expected = versions[artifact.name];
        if (expected === undefined)
          throw new Error(`报告出现未知候选包：${artifact.name}`);
        if (artifact.version !== expected)
          throw new Error(
            `报告陈旧：${artifact.name}@${artifact.version} ≠ 当前 ${expected}；重新运行 bun run test:packed-consumer`,
          );
      }
    }, "packed-consumer 矩阵报告交叉校验（含陈旧检测）");
  }

  const failed = runner.checks.some((check) => check.status === "fail");
  return {
    stage: "mixed-packed",
    status: failed ? "fail" : "pass",
    checks: runner.checks,
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
    stages.push(await runBrowserBundleStage());
  if (args.stage === "all" || args.stage === "mixed-packed")
    stages.push(await runMixedPackedStage());

  const failed = stages.some((stage) => stage.status === "fail");
  const [protocolVersion, sdkVersion] = await Promise.all([
    readPackageManifest("packages/morpheus-protocol/package.json"),
    readPackageManifest("packages/morpheus-sdk/package.json"),
  ]);
  const report = {
    script: "scripts/verify-interactive-remote-contract.ts",
    gate: "N01",
    owner: "B02 建立（B03 扩充 browser-bundle；B04 交付 mixed-packed）",
    generatedAt: new Date().toISOString(),
    result: failed ? "fail" : "pass",
    candidateIdentity: {
      maturity: "candidate",
      packages: [
        {
          name: "@xurunxin/morpheus-protocol",
          version: protocolVersion.version,
          integrity: null,
          note: "未发布候选：SRI 由 pack 后的 packed-consumer-report 与 Integration 候选账本记录，此处不伪造",
        },
        {
          name: "@xurunxin/morpheus-sdk",
          version: sdkVersion.version,
          integrity: null,
          note: "未发布候选：SRI 由 pack 后的 packed-consumer-report 与 Integration 候选账本记录，此处不伪造",
        },
      ],
    },
    stages,
  } as Record<string, unknown>;

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
