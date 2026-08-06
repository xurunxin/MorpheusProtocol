import type { AgentOsV1CanonicalPromptReferenceClient } from "@morpheus/api-protocol";

import {
  transitionPromptProjection,
  type PromptProjectionExpectedContext,
  type PromptProjectionState,
} from "./projection.js";

export interface AgentOsAppClient {
  readonly prompt: AgentOsV1CanonicalPromptReferenceClient;
  readonly project: (
    previous: Readonly<PromptProjectionState> | null,
    page: unknown,
    expected: Readonly<PromptProjectionExpectedContext>
  ) => ReturnType<typeof transitionPromptProjection>;
}

/** 只接受已注入的 reference client；本包不构造 URL、credential 或默认 transport。 */
export function createAgentOsAppClient(
  prompt: AgentOsV1CanonicalPromptReferenceClient
): Readonly<AgentOsAppClient> {
  return Object.freeze({ prompt, project: transitionPromptProjection });
}
