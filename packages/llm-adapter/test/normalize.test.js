import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCapabilities,
  normalizeModel,
  normalizeModels,
  extractContextWindow,
  extractMaxOutputTokens,
  extractProvider,
  extractDisplayName,
  extractMetadata
} from "../src/normalize.js";

test("normalizeCapabilities", async (t) => {
  await t.test("should normalize camelCase capabilities", () => {
    const result = normalizeCapabilities({
      streaming: true,
      tools: true,
      vision: false
    });

    assert.equal(result.streaming, true);
    assert.equal(result.tools, true);
    assert.equal(result.vision, false);
  });

  await t.test("should normalize snake_case capabilities", () => {
    const result = normalizeCapabilities({
      supports_streaming: true,
      supports_tools: true,
      supports_vision: false
    });

    assert.equal(result.streaming, true);
    assert.equal(result.tools, true);
    assert.equal(result.vision, false);
  });

  await t.test("should handle empty capabilities", () => {
    const result = normalizeCapabilities({});
    assert.equal(result.streaming, false);
    assert.equal(result.tools, false);
  });

  await t.test("should return default for null input", () => {
    const result = normalizeCapabilities(null);
    assert.equal(result.streaming, false);
  });
});

test("extractContextWindow", async (t) => {
  await t.test("should extract contextWindow", () => {
    const result = extractContextWindow({
      contextWindow: 8192
    });
    assert.equal(result, 8192);
  });

  await t.test("should extract context_window (snake_case)", () => {
    const result = extractContextWindow({
      context_window: 16384
    });
    assert.equal(result, 16384);
  });

  await t.test("should extract maxContextTokens", () => {
    const result = extractContextWindow({
      maxContextTokens: 4096
    });
    assert.equal(result, 4096);
  });

  await t.test("should return undefined if not found", () => {
    const result = extractContextWindow({
      id: "test"
    });
    assert.equal(result, undefined);
  });

  await t.test("should return undefined for invalid values", () => {
    const result = extractContextWindow({
      contextWindow: -1
    });
    assert.equal(result, undefined);
  });
});

test("extractMaxOutputTokens", async (t) => {
  await t.test("should extract maxOutputTokens", () => {
    const result = extractMaxOutputTokens({
      maxOutputTokens: 2048
    });
    assert.equal(result, 2048);
  });

  await t.test("should extract max_output_tokens (snake_case)", () => {
    const result = extractMaxOutputTokens({
      max_output_tokens: 1024
    });
    assert.equal(result, 1024);
  });

  await t.test("should extract maxCompletionTokens", () => {
    const result = extractMaxOutputTokens({
      maxCompletionTokens: 512
    });
    assert.equal(result, 512);
  });

  await t.test("should return undefined if not found", () => {
    const result = extractMaxOutputTokens({
      id: "test"
    });
    assert.equal(result, undefined);
  });
});

test("extractProvider", async (t) => {
  await t.test("should extract provider directly", () => {
    const result = extractProvider({
      provider: "openai"
    });
    assert.equal(result, "openai");
  });

  await t.test("should extract provider from model ID", () => {
    const result = extractProvider({
      id: "openai:gpt-4"
    });
    assert.equal(result, "openai");
  });

  await t.test("should return default if not found", () => {
    const result = extractProvider({
      id: "unknown"
    }, "mydefault");
    assert.equal(result, "mydefault");
  });

  await t.test("should lowercase provider", () => {
    const result = extractProvider({
      provider: "OpenAI"
    });
    assert.equal(result, "openai");
  });
});

test("extractDisplayName", async (t) => {
  await t.test("should extract displayName", () => {
    const result = extractDisplayName({
      displayName: "GPT-4"
    });
    assert.equal(result, "GPT-4");
  });

  await t.test("should extract display_name (snake_case)", () => {
    const result = extractDisplayName({
      display_name: "Claude 3"
    });
    assert.equal(result, "Claude 3");
  });

  await t.test("should fall back to name", () => {
    const result = extractDisplayName({
      name: "LLaMA 2"
    });
    assert.equal(result, "LLaMA 2");
  });

  await t.test("should fall back to model ID", () => {
    const result = extractDisplayName({}, "openai:gpt-4");
    assert.equal(result, "openai:gpt-4");
  });

  await t.test("should return undefined if nothing found", () => {
    const result = extractDisplayName({});
    assert.equal(result, undefined);
  });
});

test("extractMetadata", async (t) => {
  await t.test("should extract non-standard fields", () => {
    const result = extractMetadata({
      id: "test:1",
      provider: "openai",
      customField: "value",
      pricing: { input: 0.01, output: 0.03 }
    });

    assert(result);
    assert.equal(result.customField, "value");
    assert.equal(result.pricing.output, 0.03);
    assert.equal(result.id, undefined);
    assert.equal(result.provider, undefined);
  });

  await t.test("should exclude standard fields", () => {
    const result = extractMetadata({
      id: "test",
      provider: "test",
      displayName: "Test",
      capabilities: {},
      contextWindow: 8192,
      customField: "value"
    });

    assert(result);
    assert.equal(result.customField, "value");
    assert(!("id" in result));
    assert(!("provider" in result));
    assert(!("capabilities" in result));
  });

  await t.test("should return undefined if no custom fields", () => {
    const result = extractMetadata({
      id: "test",
      provider: "openai",
      displayName: "Test"
    });

    assert.equal(result, undefined);
  });

  await t.test("should return undefined for null input", () => {
    const result = extractMetadata(null);
    assert.equal(result, undefined);
  });
});

test("normalizeModel", async (t) => {
  await t.test("should normalize a complete model", () => {
    const result = normalizeModel({
      id: "openai:gpt-4",
      provider: "openai",
      displayName: "GPT-4",
      capabilities: {
        streaming: true,
        tools: true,
        vision: true
      },
      contextWindow: 8192,
      maxOutputTokens: 4096
    });

    assert.equal(result.id, "openai:gpt-4");
    assert.equal(result.provider, "openai");
    assert.equal(result.displayName, "GPT-4");
    assert.equal(result.capabilities.streaming, true);
    assert.equal(result.contextWindow, 8192);
  });

  await t.test("should normalize with ID extracted from model_id field", () => {
    const result = normalizeModel({
      model_id: "test:1",
      capabilities: {}
    });

    assert.equal(result.id, "test:1");
  });

  await t.test("should throw if ID is missing", () => {
    assert.throws(() => {
      normalizeModel({
        provider: "openai",
        capabilities: {}
      });
    });
  });

  await t.test("should preserve custom metadata", () => {
    const result = normalizeModel({
      id: "openai:gpt-4",
      provider: "openai",
      capabilities: {},
      costPerToken: 0.00003,
      releaseDate: "2023-03-14"
    });

    assert.equal(result.metadata?.costPerToken, 0.00003);
    assert.equal(result.metadata?.releaseDate, "2023-03-14");
  });
});

test("normalizeModels", async (t) => {
  await t.test("should normalize multiple models", () => {
    const models = [
      {
        id: "openai:gpt-4",
        provider: "openai",
        capabilities: { streaming: true }
      },
      {
        id: "anthropic:claude-3",
        provider: "anthropic",
        capabilities: { streaming: true }
      }
    ];

    const result = normalizeModels(models);

    assert.equal(result.length, 2);
    assert.equal(result[0].id, "openai:gpt-4");
    assert.equal(result[1].id, "anthropic:claude-3");
  });

  await t.test("should skip invalid models", () => {
    const models = [
      {
        id: "valid:1",
        provider: "test",
        capabilities: {}
      },
      {
        // Missing id
        provider: "test",
        capabilities: {}
      },
      {
        id: "valid:2",
        provider: "test",
        capabilities: {}
      }
    ];

    const result = normalizeModels(models);

    assert.equal(result.length, 2);
    assert.equal(result[0].id, "valid:1");
    assert.equal(result[1].id, "valid:2");
  });

  await t.test("should return empty array for null input", () => {
    const result = normalizeModels(null);
    assert.equal(result.length, 0);
  });
});
