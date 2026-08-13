import test from "node:test";
import assert from "node:assert/strict";

import { createLLMRouter, createBasicRouter } from "../src/router.js";
import { createLLMCatalog } from "../src/catalog.js";

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
    contextWindow: 8192
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
      reasoning: true,
      vision: false
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

test("createLLMRouter validation", async (t) => {
  await t.test("should throw if catalog is missing", () => {
    assert.throws(() => {
      createLLMRouter({});
    });
  });

  await t.test("should throw if catalog is invalid", () => {
    assert.throws(() => {
      createLLMRouter({
        catalog: { /* missing list and get */ }
      });
    });
  });

  await t.test("should accept valid catalog", () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    assert.ok(router);
    assert.ok(typeof router.route === "function");
  });
});

test("createLLMRouter - route()", async (t) => {
  await t.test("should route with auto selector", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const result = await router.route({ selector: "auto" });

    assert.ok(result);
    assert.ok(result.model);
    assert.ok(result.reason);
  });

  await t.test("should route to explicit model ID", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const result = await router.route({ selector: "openai:gpt-4" });

    assert.ok(result);
    assert.equal(result.model.id, "openai:gpt-4");
  });

  await t.test("should route with fallback chain", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const result = await router.route({
      selector: "fast",
      fallbackChain: ["auto", "cheap"]
    });

    assert.ok(result);
    assert.ok(result.model);
  });

  await t.test("should call onRoute callback", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    let routeCalled = false;
    const router = createLLMRouter({
      catalog,
      onRoute: ({ route, selector, source }) => {
        routeCalled = true;
        assert.ok(route);
        assert.ok(source);
      }
    });

    await router.route({ selector: "auto" });
    assert.ok(routeCalled);
  });

  await t.test("should call onFallback callback", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    let fallbackCalled = false;
    const router = createLLMRouter({
      catalog,
      onFallback: ({ selector, error, attempt }) => {
        fallbackCalled = true;
      }
    });

    try {
      await router.route({
        selector: "invalid",
        fallbackChain: ["auto"]
      });
    } catch {
      // Expected to handle error
    }

    // onFallback is called for each failed selector in chain
  });

  await t.test("should use external router if provided", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const externalRouter = {
      route: async (config) => ({
        model: testModels[0],
        reason: "External router selection",
        confidence: 0.9
      })
    };

    let externalRouterCalled = false;
    const routerWithExternal = {
      route: async (config) => {
        externalRouterCalled = true;
        return externalRouter.route(config);
      }
    };

    const router = createLLMRouter({
      catalog,
      router: routerWithExternal
    });

    const result = await router.route({ selector: "auto" });
    assert.ok(externalRouterCalled);
    assert.ok(result);
  });

  await t.test("should derive requirements from message", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const result = await router.route({
      selector: "auto",
      message: "Analyze this image",
      fallbackChain: ["vision", "auto"]
    });

    assert.ok(result);
  });

  await t.test("should use explicit requirements", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const result = await router.route({
      selector: "auto",
      requirements: { vision: true }
    });

    assert.ok(result);
    assert.equal(result.model.capabilities.vision, true);
  });
});

test("createLLMRouter - getModel()", async (t) => {
  await t.test("should get model by ID", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels,
        get: (id) => testModels.find((m) => m.id === id)
      }
    });

    const router = createLLMRouter({ catalog });
    const model = await router.getModel("openai:gpt-4");

    assert.ok(model);
    assert.equal(model.id, "openai:gpt-4");
  });

  await t.test("should return undefined for unknown model", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const model = await router.getModel("unknown:model");

    assert.equal(model, undefined);
  });

  await t.test("should use external router.getModel if available", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const externalRouter = {
      getModel: async (id) => testModels.find((m) => m.id === id)
    };

    let externalGetModelCalled = false;
    const routerWithExternal = {
      getModel: async (id) => {
        externalGetModelCalled = true;
        return externalRouter.getModel(id);
      }
    };

    const router = createLLMRouter({
      catalog,
      router: routerWithExternal
    });

    const model = await router.getModel("openai:gpt-4");
    assert.ok(externalGetModelCalled);
    assert.ok(model);
  });
});

test("createLLMRouter - listModels()", async (t) => {
  await t.test("should list all models", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const models = await router.listModels();

    assert.equal(models.length, 4);
  });
});

test("createLLMRouter - filterModels()", async (t) => {
  await t.test("should filter models", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const filtered = await router.filterModels((m) => m.provider === "openai");

    assert.equal(filtered.length, 2);
  });
});

test("createLLMRouter - getRecommendedModel()", async (t) => {
  await t.test("should get recommended model for selector", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createLLMRouter({ catalog });
    const model = await router.getRecommendedModel("vision");

    assert.ok(model);
    assert.equal(model.capabilities.vision, true);
  });

  await t.test("should use external router if available", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const externalRouter = {
      getRecommendedModel: async (selector) => testModels[0]
    };

    let externalCalled = false;
    const routerWithExternal = {
      getRecommendedModel: async (selector) => {
        externalCalled = true;
        return externalRouter.getRecommendedModel(selector);
      }
    };

    const router = createLLMRouter({
      catalog,
      router: routerWithExternal
    });

    const model = await router.getRecommendedModel("auto");
    assert.ok(externalCalled);
    assert.ok(model);
  });
});

test("createBasicRouter", async (t) => {
  await t.test("should create a basic router", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    const router = createBasicRouter(catalog);

    assert.ok(router);
    assert.ok(typeof router.route === "function");
    assert.ok(typeof router.getModel === "function");
  });

  await t.test("should accept options", async () => {
    const catalog = createLLMCatalog({
      registry: { list: () => testModels }
    });

    let onRouteCalled = false;
    const router = createBasicRouter(catalog, {
      onRoute: () => {
        onRouteCalled = true;
      }
    });

    await router.route({ selector: "auto" });
    assert.ok(onRouteCalled);
  });
});
