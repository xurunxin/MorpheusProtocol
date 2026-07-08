import { describe, expect, it } from "bun:test";
import {
  defineProviderExtension,
  validateProviderExtensionManifest,
  type ProviderExtensionManifest,
} from "@morpheus/extension-sdk";

function validManifest(): ProviderExtensionManifest {
  return {
    schemaVersion: 1,
    id: "weather-enterprise",
    version: "1.2.3",
    displayName: "Weather Enterprise Connector",
    kind: "enterprise-connector",
    capabilities: [
      {
        id: "weather.query",
        domain: "weather",
        level: "read",
        description: "Query current weather conditions",
      },
    ],
    tools: [
      {
        id: "weather.current",
        version: "1.0.0",
        capabilities: ["weather.query"],
        inputSchema: {
          type: "object",
          properties: {
            city: { type: "string" },
          },
          required: ["city"],
        },
        riskLevel: "low",
        executor: {
          route: "tool.exec",
          target: "weather.current",
        },
      },
    ],
    permissions: {
      resourceScopes: ["weather:read"],
      env: [{ name: "WEATHER_API_KEY", required: true }],
      approvalRequired: false,
    },
    lifecycle: {
      onInstall: "scripts/install.ts",
      healthCheck: "scripts/health.ts",
    },
    executor: {
      type: "tool",
      route: "tool.exec",
      targetPrefix: "weather.",
    },
  };
}

describe("Provider Extension SDK manifest", () => {
  it("accepts a valid provider extension manifest", () => {
    const manifest = defineProviderExtension(validManifest());

    expect(manifest.id).toBe("weather-enterprise");
    expect(manifest.capabilities[0]?.id).toBe("weather.query");
    expect(manifest.tools[0]?.capabilities).toEqual(["weather.query"]);
    expect(validateProviderExtensionManifest(manifest)).toEqual({
      valid: true,
      diagnostics: [],
    });
  });

  it("rejects duplicate tool ids and undeclared capability references", () => {
    const manifest = validManifest();
    manifest.tools = [
      ...manifest.tools,
      {
        id: "weather.current",
        capabilities: ["weather.forecast"],
        inputSchema: { type: "object" },
        executor: {
          route: "tool.exec",
          target: "weather.forecast",
        },
      },
    ];

    const result = validateProviderExtensionManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("DUPLICATE_TOOL_ID");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("UNKNOWN_CAPABILITY");
  });

  it("rejects invalid provider kind and unsupported executor routes", () => {
    const result = validateProviderExtensionManifest({
      ...validManifest(),
      kind: "unknown",
      executor: {
        type: "tool",
        route: "http.exec",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "INVALID_PROVIDER_KIND"
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "INVALID_EXECUTOR_ROUTE"
    );
  });

  it("rejects invalid risk levels", () => {
    const result = validateProviderExtensionManifest({
      ...validManifest(),
      tools: [
        {
          id: "weather.current",
          capabilities: ["weather.query"],
          inputSchema: { type: "object" },
          riskLevel: "severe",
          executor: {
            route: "tool.exec",
            target: "weather.current",
          },
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("INVALID_RISK_LEVEL");
  });

  it("rejects routes without complete policy target support", () => {
    const result = validateProviderExtensionManifest({
      ...validManifest(),
      executor: {
        type: "bash",
        route: "bash.exec",
      },
      tools: [
        {
          id: "weather.current",
          capabilities: ["weather.query"],
          inputSchema: { type: "object" },
          executor: {
            route: "bash.exec",
            target: "weather.current",
          },
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNSUPPORTED_EXECUTOR_ROUTE"
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNSUPPORTED_TOOL_ROUTE"
    );
  });

  it("rejects mismatched executor type and route pairs", () => {
    const result = validateProviderExtensionManifest({
      ...validManifest(),
      executor: {
        type: "wasm",
        route: "tool.exec",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "MISMATCHED_EXECUTOR_ROUTE"
    );
  });

  it("rejects invalid tool executor target and command values", () => {
    const result = validateProviderExtensionManifest({
      ...validManifest(),
      tools: [
        {
          id: "weather.current",
          capabilities: ["weather.query"],
          inputSchema: { type: "object" },
          executor: {
            route: "tool.exec",
            target: "",
            command: 123,
          },
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "INVALID_TOOL_TARGET"
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "INVALID_TOOL_COMMAND"
    );
  });
});
