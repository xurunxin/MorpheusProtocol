# 发布约定

仓库中的 Protocol 与 SDK 始终保持相同的稳定版本。发布候选不修改 package manifest：

- `v0.3.0-next.1` 将 `0.3.0` 发布到 `next`。
- `v0.3.0` 将同一份 `0.3.0` 发布或提升到 `latest`。

发布脚本会先打包，再读取 GitHub Packages 中同名同版本的权威 SRI 并下载对应 tarball。版本已存在时，脚本忽略 gzip 与 tar 元数据，只比较条目路径、权限 mode 和内容 hash；内容一致才会确认目标 dist-tag，目标 dist-tag 已正确时直接结束。候选流程只读取和更新 `next`，不会写入 `latest`。

tag 之前运行 `bun run release:check`。实际发布仅由 tag 工作流执行，不复用已发布版本承载不同内容。
