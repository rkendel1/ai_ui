/**
 * Testing Guide for Capability-Aware Code
 *
 * This file demonstrates how to test code that uses the capability system.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createModel,
  createAISession,
  deriveRequirements,
  negotiateCapabilities,
  filterModelsByCapabilities,
  createCapabilityError,
  requiresVision,
  requiresTools
} from "@ai-ui/core";
import { createMockTransport } from "@ai-ui/core/test/mock-transport";

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Helper to create a test model with custom capabilities
 */
function createTestModel(overrides = {}) {
  return createModel({
    id: "test-model",
    provider: "test-provider",
    capabilities: {
      streaming: true,
      tools: true,
      vision: false,
      reasoning: false,
      structuredOutput: false,
      ...overrides.capabilities
    },
    ...overrides
  });
}

// ============================================================================
// Tests: Model Creation
// ============================================================================

test("createModel validates required fields", () => {
  assert.throws(
    () => createModel({ provider: "test", capabilities: {} }),
    /id/
  );

  assert.throws(
    () => createModel({ id: "test", capabilities: {} }),
    /provider/
  );

  assert.throws(
    () => createModel({ id: "test", provider: "test" }),
    /capabilities/
  );
});

test("createModel normalizes capabilities", () => {
  const model = createTestModel({
    capabilities: { streaming: true, tools: false }
  });

  assert.equal(model.capabilities.streaming, true);
  assert.equal(model.capabilities.tools, false);
  assert.equal(model.capabilities.vision, false);
});

// ============================================================================
// Tests: Requirement Derivation
// ============================================================================

test("deriveRequirements identifies vision requirement from attachments", () => {
  const reqs = deriveRequirements({
    attachments: [{ type: "image" }]
  });

  assert.equal(reqs.vision, true);
  assert.equal(reqs.attachments, true);
});

test("deriveRequirements identifies tools requirement", () => {
  const reqs = deriveRequirements({
    tools: [{ name: "search" }]
  });

  assert.equal(reqs.tools, true);
});

test("deriveRequirements identifies structuredOutput requirement", () => {
  const reqs = deriveRequirements({
    responseFormat: { type: "json_schema" }
  });

  assert.equal(reqs.structuredOutput, true);
});

test("deriveRequirements handles empty requests", () => {
  const reqs = deriveRequirements({});
  assert.deepEqual(reqs, {});
});

// ============================================================================
// Tests: Capability Negotiation
// ============================================================================

test("negotiateCapabilities succeeds when all requirements met", () => {
  const result = negotiateCapabilities({
    requested: { tools: true, vision: true },
    available: { tools: true, vision: true, streaming: true }
  });

  assert.equal(result.supported, true);
  assert.deepEqual(result.missing, []);
});

test("negotiateCapabilities fails when requirements not met", () => {
  const result = negotiateCapabilities({
    requested: { tools: true, vision: true },
    available: { tools: true, vision: false, streaming: true }
  });

  assert.equal(result.supported, false);
  assert.deepEqual(result.missing, ["vision"]);
});

test("negotiateCapabilities ignores non-requested capabilities", () => {
  const result = negotiateCapabilities({
    requested: { tools: true, vision: false },
    available: { tools: true }
  });

  assert.equal(result.supported, true);
  assert.deepEqual(result.missing, []);
});

// ============================================================================
// Tests: Model Filtering
// ============================================================================

test("filterModelsByCapabilities returns only matching models", () => {
  const models = [
    createTestModel({ id: "m1", capabilities: { tools: true, vision: true } }),
    createTestModel({ id: "m2", capabilities: { tools: false, vision: true } }),
    createTestModel({ id: "m3", capabilities: { tools: true, vision: false } })
  ];

  const result = filterModelsByCapabilities(models, ["tools", "vision"]);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "m1");
});

test("filterModelsByCapabilities handles empty requirements", () => {
  const models = [
    createTestModel({ id: "m1" }),
    createTestModel({ id: "m2" })
  ];

  const result = filterModelsByCapabilities(models, []);

  assert.equal(result.length, 2);
});

// ============================================================================
// Tests: Runtime Integration
// ============================================================================

test("session with model includes model in state", () => {
  const model = createTestModel({ id: "test-gpt4" });
  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  const state = session.getState();
  assert.equal(state.model.id, "test-gpt4");
  assert.deepEqual(state.capabilities, model.capabilities);
});

test("session without model has null model in state", () => {
  const session = createAISession({
    transport: createMockTransport()
  });

  const state = session.getState();
  assert.equal(state.model, null);
  assert.equal(state.capabilities, null);
});

test("session validates capabilities on send", async () => {
  const model = createTestModel({
    capabilities: { streaming: true, tools: false, vision: false }
  });

  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  // This should throw because tools are not supported
  try {
    await session.send({
      message: "test",
      tools: [{ name: "search" }]
    });
    assert.fail("Should have thrown");
  } catch (err) {
    assert(err.message.includes("capability"));
  }
});

test("session allows requests with supported capabilities", async () => {
  const model = createTestModel({
    capabilities: { streaming: true, tools: true }
  });

  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  // This should succeed
  await session.send({
    message: "test",
    tools: [{ name: "search" }]
  });

  const state = session.getState();
  assert(state.messages.length > 0);
});

// ============================================================================
// Tests: Error Handling
// ============================================================================

test("createCapabilityError contains required fields", () => {
  const error = createCapabilityError("vision", "gpt-4", "openai");

  assert.equal(error.code, "capability_unsupported");
  assert.equal(error.capability, "vision");
  assert.equal(error.model, "gpt-4");
  assert.equal(error.provider, "openai");
  assert(error.message.includes("vision"));
});

// ============================================================================
// Tests: Requirement Checking Functions
// ============================================================================

test("requiresVision detects image requirements", () => {
  assert.equal(
    requiresVision({ attachments: [{ type: "image" }] }),
    true
  );
  assert.equal(requiresVision({}), false);
});

test("requiresTools detects tool requirements", () => {
  assert.equal(
    requiresTools({ tools: [{ name: "search" }] }),
    true
  );
  assert.equal(requiresTools({}), false);
});

// ============================================================================
// Integration Tests
// ============================================================================

test("complete workflow: model selection and validation", async () => {
  // Create test models
  const basicModel = createTestModel({
    id: "basic",
    capabilities: { streaming: true, tools: false, vision: false }
  });

  const advancedModel = createTestModel({
    id: "advanced",
    capabilities: { streaming: true, tools: true, vision: true }
  });

  const models = [basicModel, advancedModel];

  // Scenario 1: Simple request works with any model
  const simpleReqs = deriveRequirements({ message: "Hello" });
  const simpleModels = filterModelsByCapabilities(models, 
    Object.keys(simpleReqs).filter(k => simpleReqs[k])
  );
  assert.equal(simpleModels.length, 2);

  // Scenario 2: Complex request needs advanced model
  const complexReqs = deriveRequirements({
    message: "Analyze this",
    attachments: [{ type: "image" }],
    tools: [{ name: "search" }]
  });
  const complexModels = filterModelsByCapabilities(models,
    Object.keys(complexReqs).filter(k => complexReqs[k])
  );
  assert.equal(complexModels.length, 1);
  assert.equal(complexModels[0].id, "advanced");
});

test("capability error contains actionable information", async () => {
  const model = createTestModel({
    id: "gpt-3.5",
    capabilities: { streaming: true, tools: false, vision: false }
  });

  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  try {
    await session.send({
      message: "Search for this",
      tools: [{ name: "search" }]
    });
  } catch (err) {
    const state = session.getState();
    // Error state should contain useful debugging info
    assert(state.error.code);
    assert(state.error.model);
    assert(state.error.provider);
  }
});

// ============================================================================
// Mocking and Test Fixtures
// ============================================================================

/**
 * Create a mock model registry for testing
 */
function createMockRegistry() {
  return {
    "text-only": createTestModel({
      id: "text-only",
      capabilities: { streaming: true, tools: false, vision: false }
    }),
    "with-tools": createTestModel({
      id: "with-tools",
      capabilities: { streaming: true, tools: true, vision: false }
    }),
    "with-vision": createTestModel({
      id: "with-vision",
      capabilities: { streaming: true, tools: false, vision: true }
    }),
    "full-featured": createTestModel({
      id: "full-featured",
      capabilities: { streaming: true, tools: true, vision: true }
    })
  };
}

test("example: using mock registry", () => {
  const registry = createMockRegistry();

  // Find models for image analysis
  const imageModels = filterModelsByCapabilities(
    Object.values(registry),
    ["vision"]
  );

  assert.equal(imageModels.length, 2); // with-vision and full-featured
});
