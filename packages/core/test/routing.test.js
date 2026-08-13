import test from "node:test";
import assert from "node:assert/strict";

import {
  ROUTING_ERROR_CODES,
  ROUTING_POLICY_NAMES,
  createInvalidSelectorError,
  createNoSuitableModelError,
  BUILT_IN_POLICIES,
  selectModel,
  selectModelFromCandidates,
  isPredefinedPolicy,
  isExplicitModelId,
  buildFallbackChain,
  createFallbackConfig,
  executeWithFallback
} from "../src/routing/index.js";

import { createModel } from "../src/capabilities/index.js";

// Test data
const testModels = [
  createModel({
    id: "openai:gpt-4",
    provider: "openai",
    displayName: "GPT-4",
    capabilities: {
      streaming: true,
      tools: true,
      vision: true,
      reasoning: true
    }
  }),
  createModel({
    id: "anthropic:claude-3",
    provider: "anthropic",
    displayName: "Claude 3",
    capabilities: {
      streaming: true,
      tools: true,
      vision: false,
      reasoning: true
    }
  }),
  createModel({
    id: "openai:gpt-4-vision",
    provider: "openai",
    displayName: "GPT-4 Vision",
    capabilities: {
      streaming: true,
      tools: true,
      vision: true,
      reasoning: false
    }
  }),
  createModel({
    id: "local:llama2",
    provider: "local",
    displayName: "Llama 2",
    capabilities: {
      streaming: true,
      tools: false,
      vision: false,
      reasoning: false
    }
  })
];

const mockCatalog = {
  list: () => testModels,
  get: (id) => testModels.find(m => m.id === id)
};

test("ROUTING_ERROR_CODES contains expected codes", () => {
  assert.equal(typeof ROUTING_ERROR_CODES.NO_MODEL_SELECTED, "string");
  assert.equal(typeof ROUTING_ERROR_CODES.INVALID_SELECTOR, "string");
  assert.equal(typeof ROUTING_ERROR_CODES.NO_SUITABLE_MODEL, "string");
});

test("ROUTING_POLICY_NAMES contains expected policy names", () => {
  assert.equal(ROUTING_POLICY_NAMES.AUTO, "auto");
  assert.equal(ROUTING_POLICY_NAMES.FAST, "fast");
  assert.equal(ROUTING_POLICY_NAMES.CHEAP, "cheap");
  assert.equal(ROUTING_POLICY_NAMES.REASONING, "reasoning");
  assert.equal(ROUTING_POLICY_NAMES.VISION, "vision");
  assert.equal(ROUTING_POLICY_NAMES.LOCAL, "local");
});

test("isPredefinedPolicy returns true for valid policy names", () => {
  assert.equal(isPredefinedPolicy("auto"), true);
  assert.equal(isPredefinedPolicy("fast"), true);
  assert.equal(isPredefinedPolicy("cheap"), true);
  assert.equal(isPredefinedPolicy("reasoning"), true);
  assert.equal(isPredefinedPolicy("vision"), true);
  assert.equal(isPredefinedPolicy("local"), true);
  assert.equal(isPredefinedPolicy("invalid"), false);
});

test("isExplicitModelId returns true for model IDs with colon", () => {
  assert.equal(isExplicitModelId("openai:gpt-4"), true);
  assert.equal(isExplicitModelId("anthropic:claude-3"), true);
  assert.equal(isExplicitModelId("local:llama2"), true);
  assert.equal(isExplicitModelId("auto"), false);
  assert.equal(isExplicitModelId("fast"), false);
});

test("selectModel with 'auto' policy selects reasoning model", () => {
  const result = selectModel("auto", mockCatalog, {
    requirements: { reasoning: true },
    availableModels: testModels
  });

  assert.equal(result.model.id, "openai:gpt-4");
  assert.equal(result.confidence > 0, true);
  assert.equal(typeof result.reason, "string");
});

test("selectModel with 'vision' policy selects vision-capable model", () => {
  const result = selectModel("vision", mockCatalog, {
    availableModels: testModels
  });

  assert.equal(result.model.capabilities.vision, true);
  assert.equal(result.confidence > 0, true);
});

test("selectModel with 'reasoning' policy selects reasoning-capable model", () => {
  const result = selectModel("reasoning", mockCatalog, {
    availableModels: testModels
  });

  assert.equal(result.model.capabilities.reasoning, true);
  assert.equal(result.confidence > 0, true);
});

test("selectModel with 'local' policy selects local model", () => {
  const result = selectModel("local", mockCatalog, {
    availableModels: testModels
  });

  assert.equal(result.model.provider, "local");
  assert.equal(result.confidence > 0, true);
});

test("selectModel with explicit model ID", () => {
  const result = selectModel("openai:gpt-4", mockCatalog, {
    availableModels: testModels
  });

  assert.equal(result.model.id, "openai:gpt-4");
  assert.equal(result.confidence, 1.0);
});

test("selectModel throws on invalid selector", () => {
  assert.throws(() => {
    selectModel("invalid_selector", mockCatalog, {
      availableModels: testModels
    });
  }, (error) => {
    return error.code === ROUTING_ERROR_CODES.INVALID_SELECTOR;
  });
});

test("selectModel throws on explicit model not found", () => {
  assert.throws(() => {
    selectModel("openai:nonexistent", mockCatalog, {
      availableModels: testModels
    });
  }, (error) => {
    return error.code === ROUTING_ERROR_CODES.NO_SUITABLE_MODEL;
  });
});

test("selectModelFromCandidates selects from candidate list", () => {
  const candidates = testModels.slice(0, 2);
  const result = selectModelFromCandidates("reasoning", candidates);

  assert.equal(result.model.capabilities.reasoning, true);
});

test("selectModelFromCandidates throws when no candidates", () => {
  assert.throws(() => {
    selectModelFromCandidates("auto", []);
  }, (error) => {
    return error.code === ROUTING_ERROR_CODES.NO_SUITABLE_MODEL;
  });
});

test("buildFallbackChain returns appropriate chain", () => {
  const chain = buildFallbackChain({
    reasoning: true,
    vision: false
  });

  assert.equal(chain[0], "auto");
  assert.equal(chain.includes("reasoning"), true);
});

test("createFallbackConfig creates valid config", () => {
  const config = createFallbackConfig({
    selector: "auto",
    maxRetries: 5,
    requireAllCapabilities: false
  });

  assert.equal(config.enabled, true);
  assert.equal(config.maxRetries, 5);
  assert.equal(config.requireAllCapabilities, false);
  assert.equal(config.chain.length, 1);
  assert.equal(config.chain[0], "auto");
});

test("createFallbackConfig with array of selectors", () => {
  const config = createFallbackConfig({
    selector: ["auto", "fast", "cheap"]
  });

  assert.equal(config.chain.length, 3);
  assert.equal(config.chain[0], "auto");
  assert.equal(config.chain[2], "cheap");
});

test("executeWithFallback executes successfully with first model", async () => {
  let executionModel = null;

  const result = await executeWithFallback({
    selector: "auto",
    catalog: mockCatalog,
    availableModels: testModels,
    execute: async (model) => {
      executionModel = model;
      return "success";
    }
  });

  assert.equal(result, "success");
  assert.equal(executionModel !== null, true);
  assert.equal(typeof executionModel.id, "string");
});

test("executeWithFallback tries fallback on execution failure", async () => {
  const executedModels = [];

  const result = await executeWithFallback({
    selector: ["auto", "fast"],
    catalog: mockCatalog,
    availableModels: testModels,
    maxRetries: 2,
    execute: async (model) => {
      executedModels.push(model.id);
      if (executedModels.length === 1) {
        throw new Error("First model failed");
      }
      return "success";
    }
  });

  assert.equal(result, "success");
  assert.equal(executedModels.length, 2);
});

test("executeWithFallback throws when all fallbacks exhausted", async () => {
  assert.rejects(async () => {
    await executeWithFallback({
      selector: "auto",
      catalog: mockCatalog,
      availableModels: testModels,
      maxRetries: 1,
      execute: async (model) => {
        throw new Error("Always fails");
      }
    });
  }, (error) => {
    return error.code === ROUTING_ERROR_CODES.MODEL_FALLBACK_EXHAUSTED;
  });
});

test("BUILT_IN_POLICIES contains all required policies", () => {
  assert.equal(typeof BUILT_IN_POLICIES.auto, "object");
  assert.equal(typeof BUILT_IN_POLICIES.fast, "object");
  assert.equal(typeof BUILT_IN_POLICIES.cheap, "object");
  assert.equal(typeof BUILT_IN_POLICIES.reasoning, "object");
  assert.equal(typeof BUILT_IN_POLICIES.vision, "object");
  assert.equal(typeof BUILT_IN_POLICIES.local, "object");

  for (const policy of Object.values(BUILT_IN_POLICIES)) {
    assert.equal(typeof policy.name, "string");
    assert.equal(typeof policy.description, "string");
    assert.equal(typeof policy.evaluate, "function");
  }
});
