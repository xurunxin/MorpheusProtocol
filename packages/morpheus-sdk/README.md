# @xurunxin/morpheus-sdk

Morpheus App Plane 的轻量 SDK。它只编排已解析的公开 DTO 与调用方注入的 client/transport，不保存 credential、URL、storage、timer、lifecycle、policy 或 authority。

```ts
import { createAgentOsAppClient } from "@xurunxin/morpheus-sdk";

const app = createAgentOsAppClient(promptClient);
```
