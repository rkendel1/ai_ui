import test from "node:test";
import assert from "node:assert/strict";

import { createLLMCatalog } from "../src/catalog.js";
import { createInvalidRegistryError } from "../src/errors.js";

// Test data
const testModels = [
  {
    id: "openai:gpt-4",
    provider: "openai",
    displayName: "GPT-4",
    capabilities: {
      streaming: true,
      tools: true,
      vision: true,
      reasoning: true
    },
    contextWindow: 8192,
    maxOutputTokens: 4096
  },
  {
    id: "openai:gpt-4-fast",
    provider: "openai",
    displayName: "GPT-4 Fast",
    capabilities: {
      streaming: true,
      tools: true,
      vision: false
    },
    contextWindow: 4096
  },
  {
    id: "anthropic:claude-3",
    provider: "anthropic",
    displayName: "Claude 3",
    capabilities: {
      streaming: true,
      tools: true,
      reasoning: true
    },
    contextWindow: 16384
  },
  {
    id: "local:llama2",
    provider: "local",
    displayName: "LLaMA 2",
    capabilities: {
      streaming: true,
      tools: false
    },
    contextWindow: 2048
  }
];

test("createLLMCatalog validation", async (t) => {
  await t.test("should throw if config is missing", () => {
    assert.throws(() => {
      createLLMCatalog();
    });
  });

  await t.test("should throw if registry is missing", () => {
    assert.throws(() => {
      createLLMCatalog({});
    });
  });

  await t.test("should throw if registry has no list or get", () => {
    assert.throws(() => {
      createLLMCatalog({
        registry: {
          // No list or get method
        }
      });
    });
  });

  await t.test("should accept registry with list method", () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => []
      }
    });
    assert.ok(catalog);
    assert.ok(typeof catalog.list === "function");
  });

  await t.test("should accept registry with get method", () => {
    const catalog = createLLMCatalog({
      registry: {
        get: (id) => null
      }
    });
    assert.ok(catalog);
    assert.ok(typeof catalog.get === "function");
  });
});

test("createLLMCatalog - list()", async (t) => {
  await t.test("should list models from registry", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const models = await catalog.list();
    assert.equal(models.length, 4);
    assert.equal(models[0].id, "openai:gpt-4");
  });

  await t.test("should normalize models on list", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => [
          {
            model_id: "test:1",
            provider: "test",
            capabilities: { supports_streaming: true }
          }
        ]
      }
    });

    const models = await catalog.list();
    assert.equal(models.length, 1);
    assert.equal(models[0].id, "test:1");
    assert.equal(models[0].capabilities.streaming, true);
  });

  await t.test("should cache models on subsequent calls", async () => {
    let callCount = 0;
    const catalog = createLLMCatalog({
      registry: {
        list: () => {
          callCount++;
          return testModels;
        }
      },
      cache: true
    });

    await catalog.list();
    await catalog.list();
    assert.equal(callCount, 1, "Should call registry.list() only once");
  });

  await t.test("should not cache if cache is disabled", async () => {
    let callCount = 0;
    const catalog = createLLMCatalog({
      registry: {
        list: () => {
          callCount++;
          return testModels;
        }
      },
      cache: false
    });

    await catalog.list();
    await catalog.list();
    assert.equal(callCount, 2, "Should call registry.list() twice");
  });

  await t.test("should handle { models: [...] } response format", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => ({
          models: testModels
        })
      }
    });

    const models = await catalog.list();
    assert.equal(models.length, 4);
  });

  await t.test("should handle async registry.list()", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: async () => testModels
      }
    });

    const models = await catalog.list();
    assert.equal(models.length, 4);
  });
});

test("createLLMCatalog - get()", async (t) => {
  await t.test("should get model by ID from registry.get()", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels,
        get: (id) => testModels.find((m) => m.id === id)
      }
    });

    const model = await catalog.get("openai:gpt-4");
    assert.ok(model);
    assert.equal(model.id, "openai:gpt-4");
  });

  await t.test("should return undefined if model not found", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels,
        get: () => null
      }
    });

    const model = await catalog.get("unknown:model");
    assert.equal(model, undefined);
  });

  await t.test("should fall back to list search", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
        // No get method
      }
    });

    const model = await catalog.get("openai:gpt-4");
    assert.ok(model);
    assert.equal(model.id, "openai:gpt-4");
  });

  await t.test("should return undefined for invalid ID", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const model = await catalog.get(null);
    assert.equal(model, undefined);
  });
});

test("createLLMCatalog - filter()", async (t) => {
  await t.test("should filter models by predicate", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const filtered = await catalog.filter((m) => m.capabilities.vision === true);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "openai:gpt-4");
  });

  await t.test("should use registry.filter() if available", async () => {
    let registryFilterCalled = false;
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels,
        filter: (predicate) => {
          registryFilterCalled = true;
          return testModels.filter(predicate);
        }
      }
    });

    await catalog.filter((m) => m.provider === "openai");
    assert.ok(registryFilterCalled);
  });

  await t.test("should filter by provider", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const filtered = await catalog.filter((m) => m.provider === "openai");
    assert.equal(filtered.length, 2);
  });
});

test("createLLMCatalog - getDefault()", async (t) => {
  await t.test("should get default for 'fast' selector", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const model = await catalog.getDefault("fast");
    assert.ok(model);
    // Should prefer model with "fast" in ID
    assert(model.id.includes("fast") || model.contextWindow <= 4096);
  });

  await t.test("should get default for 'reasoning' selector", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const model = await catalog.getDefault("reasoning");
    assert.ok(model);
    assert.equal(model.capabilities.reasoning, true);
  });

  await t.test("should get default for 'vision' selector", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const model = await catalog.getDefault("vision");
    assert.ok(model);
    assert.equal(model.capabilities.vision, true);
  });

  await t.test("should get default for 'local' selector", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const model = await catalog.getDefault("local");
    assert.ok(model);
    assert.equal(model.provider, "local");
  });

  await t.test("should get default for 'cheap' selector", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const model = await catalog.getDefault("cheap");
    assert.ok(model);
    // Should be the model with smallest context window
    assert.equal(model.contextWindow, 2048);
  });

  await t.test("should get default for 'auto' selector", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const model = await catalog.getDefault("auto");
    assert.ok(model);
    // Should return first model
    assert.equal(model.id, "openai:gpt-4");
  });

  await t.test("should use registry.getDefault() if available", async () => {
    let registryGetDefaultCalled = false;
    const expectedModel = testModels[0];

    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels,
        getDefault: (selector) => {
          registryGetDefaultCalled = true;
          return expectedModel;
        }
      }
    });

    const model = await catalog.getDefault("auto");
    assert.ok(registryGetDefaultCalled);
    assert.equal(model.id, expectedModel.id);
  });
});

test("createLLMCatalog - invalidateCache()", async (t) => {
  await t.test("should invalidate cache", async () => {
    let callCount = 0;
    const catalog = createLLMCatalog({
      registry: {
        list: () => {
          callCount++;
          return testModels;
        }
      },
      cache: true
    });

    await catalog.list();
    assert.equal(callCount, 1);

    await catalog.list();
    assert.equal(callCount, 1, "Should use cache");

    catalog.invalidateCache();
    await catalog.list();
    assert.equal(callCount, 2, "Should call registry after cache invalidation");
  });
});
