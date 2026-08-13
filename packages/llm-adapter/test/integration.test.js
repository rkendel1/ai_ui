import test from "node:test";
import assert from "node:assert/strict";

import { createLLMCatalog, createLLMRouter } from "../src/index.js";
import { createAISession } from "@ai-ui/core/runtime";

// Mock transport for testing
class MockTransport {
  async *send(request) {
    yield { type: "session_started" };
    yield {
      type: "message_started",
      messageId: "msg-1"
    };
    yield {
      type: "text_delta",
      messageId: "msg-1",
      text: "This is a test response"
    };
    yield { type: "session_completed" };
  }
}

// Test models
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
  }
];

test("Integration with @ai-ui/core", async (t) => {
  await t.test("should create a catalog from LLM registry", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    assert.ok(catalog);
    assert.ok(typeof catalog.list === "function");

    const models = await catalog.list();
    assert.equal(models.length, 2);
    assert.equal(models[0].id, "openai:gpt-4");
  });

  await t.test("should create a router with the catalog", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const router = createLLMRouter({ catalog });

    assert.ok(router);
    assert.ok(typeof router.route === "function");

    const route = await router.route({ selector: "auto" });
    assert.ok(route);
    assert.ok(route.model);
  });

  await t.test("should route to specific model by ID", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const router = createLLMRouter({ catalog });
    const route = await router.route({ selector: "openai:gpt-4" });

    assert.equal(route.model.id, "openai:gpt-4");
    assert.equal(route.confidence, 1.0);
  });

  await t.test("should route with capability requirements", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const router = createLLMRouter({ catalog });
    const route = await router.route({
      selector: "vision",
      requirements: { vision: true }
    });

    assert.equal(route.model.capabilities.vision, true);
  });

  await t.test("should integrate with createAISession", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const router = createLLMRouter({ catalog });
    const route = await router.route({ selector: "auto" });

    // Create session with the selected model
    const session = createAISession({
      transport: new MockTransport(),
      model: route.model
    });

    assert.ok(session);
    assert.ok(typeof session.send === "function");

    // The model capabilities should be available
    const state = session.getState();
    assert.ok(state.model);
    assert.equal(state.model.id, "openai:gpt-4");
  });

  await t.test("should handle async registry", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return testModels;
        }
      }
    });

    const models = await catalog.list();
    assert.equal(models.length, 2);
  });

  await t.test("should preserve model metadata", async () => {
    const modelsWithMetadata = [
      {
        id: "custom:model-1",
        provider: "custom",
        capabilities: {},
        pricing: { input: 0.01, output: 0.02 },
        releaseDate: "2024-01-01",
        beta: true
      }
    ];

    const catalog = createLLMCatalog({
      registry: {
        list: () => modelsWithMetadata
      }
    });

    const models = await catalog.list();
    assert.equal(models[0].id, "custom:model-1");
    assert.ok(models[0].metadata);
    assert.equal(models[0].metadata.pricing.output, 0.02);
    assert.equal(models[0].metadata.releaseDate, "2024-01-01");
    assert.equal(models[0].metadata.beta, true);
  });

  await t.test("should work with filter methods", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const router = createLLMRouter({ catalog });
    const filtered = await router.filterModels(
      (m) => m.provider === "openai"
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "openai:gpt-4");
  });

  await t.test("should normalize different external formats", async () => {
    const externalModels = [
      {
        // Standard format
        id: "provider:model1",
        provider: "provider",
        capabilities: { streaming: true }
      },
      {
        // Snake_case format
        model_id: "provider:model2",
        provider_name: "provider",
        supports_streaming: true,
        max_output_tokens: 1000
      },
      {
        // Mixed format
        id: "provider:model3",
        provider: "provider",
        supportsStreaming: true,
        contextWindow: 4096
      }
    ];

    const catalog = createLLMCatalog({
      registry: {
        list: () => externalModels
      }
    });

    const models = await catalog.list();
    assert.equal(models.length, 3);

    // All should have streaming capability normalized
    assert.equal(models[0].capabilities.streaming, true);
    assert.equal(models[1].capabilities.streaming, true);
    assert.equal(models[2].capabilities.streaming, true);

    // Context/output tokens should be extracted
    assert.equal(models[1].maxOutputTokens, 1000);
    assert.equal(models[2].contextWindow, 4096);
  });

  await t.test("should handle fallback chain", async () => {
    const catalog = createLLMCatalog({
      registry: {
        list: () => testModels
      }
    });

    const router = createLLMRouter({ catalog });

    // Try to route with fallback chain
    const route = await router.route({
      selector: "vision",
      fallbackChain: ["vision", "reasoning", "auto"]
    });

    assert.ok(route);
    assert.ok(route.model);
  });
});
