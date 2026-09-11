# scripts/

开发与发布辅助脚本。验证类脚本（N 系列）的参数与报告契约由 owner 任务在对应 PR 固定。

## 验证脚本（N 系列）

| ID  | 入口                                                | Owner                                                    | 说明                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N01 | `bun scripts/verify-interactive-remote-contract.ts` | B02 建立，B03 交付 browser-bundle，B04 交付 mixed-packed | strict/negative（interactive v3、remote ingress v1、attachment v1 严格解析/拒绝/幂等指纹）；browser bundle（B03：真实 browser 目标 bundle 无 Node builtins/Host imports、外部模块仅 Protocol）；mixed-packed（B04：root/protocol/sdk 版本锁步、SDK exact 依赖声明层拒绝混合版本、node/browser subpath exports、v3 出口存在性、packed 矩阵报告交叉校验与陈旧检测） |

### N01 用法

```text
bun scripts/verify-interactive-remote-contract.ts [--help]
    [--stage strict|browser-bundle|mixed-packed|all]
    [--out <报告 JSON 路径>] [--json]
```

- `--help` 显示帮助（先实现并自检 help 后才可执行）。
- 阶段 `browser-bundle` 由 B03 交付（真实 bundle 构建 + 泄漏扫描 + v3 导出面自检）；
  阶段 `mixed-packed` 由 B04 交付（进程内声明层检查 + `.artifacts/packed-consumer-report.json`
  交叉校验；报告缺失时该项显式 `deferred`，不计为通过）。
- 安装级 old-old/new-new/mixed 真实矩阵由 `bun run test:packed-consumer`
  （`verify-packed-consumer.mjs`）执行：旧基线取 `v0.4.0` tag（按 commit 缓存于
  `.tmp/packed-matrix-cache/`），产出 mixed 版本拒绝矩阵与候选工件 SRI 报告。
- 纯进程内合成数据；不读取 `.env` / 真实 provider 凭据 / 本地敏感路径。
- 退出码：0 = 所有非 deferred 检查通过；1 = 存在 fail；2 = 参数非法。

## 构建与发布脚本

| 脚本                              | 说明                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `clean.mjs`                       | 清理构建产物                                                                                               |
| `check-boundaries.mjs`            | 包边界检查                                                                                                 |
| `check-package-versions.mjs`      | Protocol/SDK 版本锁步检查                                                                                  |
| `check-release-dependencies.mjs`  | 发布依赖形态检查（禁止 workspace/link 等）                                                                 |
| `pack-packages.mjs`               | 打包 npm tgz                                                                                               |
| `publish-packages.mjs`            | 发布                                                                                                       |
| `npm-package-release.mjs`         | npm 包发布契约                                                                                             |
| `release-contract.mjs`            | 发布契约检查                                                                                               |
| `release-dependency-contract.mjs` | 发布依赖契约检查                                                                                           |
| `tarball-content.mjs`             | tgz 内容检查                                                                                               |
| `verify-packed-consumer.mjs`      | packed consumer 验证 + old-old/new-new/mixed 版本拒绝矩阵；报告写 `.artifacts/packed-consumer-report.json` |
