import test from "node:test";
import assert from "node:assert/strict";

import {
  CAPABILITY_KEYS,
  createCapabilities,
  createModel,
  createProviderMetadata,
  ERROR_CODES,
  createCapabilityError,
  createInvalidCapabilitiesError,
  createCapabilityNegotiationError,
  createModelNotFoundError,
  createProviderNotFoundError,
  negotiateCapabilities,
  hasCapability,
  supportsAllCapabilities,
  supportsAnyCapability,
  filterModelsByCapabilities,
  deriveRequirements,
  requiresStreaming,
  requiresTools,
  requiresVision,
  requiresStructuredOutput,
  requiresAttachments,
  requiresReasoning
} from "../src/capabilities/index.js";

test("CAPABILITY_KEYS contains expected keys", () => {
  assert.equal(typeof CAPABILITY_KEYS.STREAMING, "string");
  assert.equal(typeof CAPABILITY_KEYS.TOOLS, "string");
  assert.equal(typeof CAPABILITY_KEYS.VISION, "string");
  assert.equal(typeof CAPABILITY_KEYS.TOOLS, "string");
  assert.equal(CAPABILITY_KEYS.STREAMING, "streaming");
  assert.equal(CAPABILITY_KEYS.TOOLS, "tools");
  assert.equal(CAPABILITY_KEYS.VISION, "vision");
});

test("createCapabilities returns normalized capabilities", () => {
  const caps = createCapabilities({
    streaming: true,
    tools: true,
    vision: false
  });

  assert.equal(caps.streaming, true);
  assert.equal(caps.tools, true);
  assert.equal(caps.vision, false);
  assert.equal(caps.attachments, undefined);
});

test("createCapabilities fills in defaults", () => {
  const caps = createCapabilities({});

  assert.equal(caps.streaming, false);
  assert.equal(caps.tools, false);
  assert.equal(caps.vision, false);
});

test("createModel validates required fields", () => {
  assert.throws(
    () => createModel({ provider: "openai" }),
    /requires a valid string id/
  );
  assert.throws(
    () => createModel({ id: "gpt-4" }),
    /requires a valid string provider/
  );
  assert.throws(
    () => createModel({ id: "gpt-4", provider: "openai" }),
    /requires valid capabilities object/
  );
});

test("createModel normalizes valid model", () => {
  const model = createModel({
    id: "gpt-4",
    provider: "openai",
    displayName: "GPT-4",
    capabilities: {
      streaming: true,
      tools: true,
      vision: true
    },
    contextWindow: 8192
  });

  assert.equal(model.id, "gpt-4");
  assert.equal(model.provider, "openai");
  assert.equal(model.displayName, "GPT-4");
  assert.equal(model.capabilities.streaming, true);
  assert.equal(model.contextWindow, 8192);
});

test("createProviderMetadata validates required fields", () => {
  assert.throws(
    () => createProviderMetadata({ name: "OpenAI" }),
    /requires a valid string id/
  );
  assert.throws(
    () => createProviderMetadata({ id: "openai" }),
    /requires a valid string name/
  );
});

test("createProviderMetadata normalizes valid provider", () => {
  const provider = createProviderMetadata({
    id: "openai",
    name: "OpenAI",
    models: [
      {
        id: "gpt-4",
        provider: "openai",
        capabilities: { streaming: true, tools: true, vision: true }
      }
    ]
  });

  assert.equal(provider.id, "openai");
  assert.equal(provider.name, "OpenAI");
  assert.equal(provider.models.length, 1);
});

test("ERROR_CODES contains expected codes", () => {
  assert.equal(ERROR_CODES.CAPABILITY_UNSUPPORTED, "capability_unsupported");
  assert.equal(ERROR_CODES.INVALID_CAPABILITIES, "invalid_capabilities");
});

test("createCapabilityError generates proper error", () => {
  const error = createCapabilityError("vision", "gpt-4", "openai");

  assert.equal(error.code, "capability_unsupported");
  assert.equal(error.capability, "vision");
  assert.equal(error.model, "gpt-4");
  assert.equal(error.provider, "openai");
  assert(error.message.includes("vision"));
});

test("createInvalidCapabilitiesError generates proper error", () => {
  const error = createInvalidCapabilitiesError("Custom message");

  assert.equal(error.code, "invalid_capabilities");
  assert.equal(error.message, "Custom message");
});

test("createCapabilityNegotiationError generates proper error", () => {
  const error = createCapabilityNegotiationError(["vision", "tools"], "gpt-4", "openai");

  assert.equal(error.code, "capability_negotiation_failed");
  assert.deepEqual(error.missing, ["vision", "tools"]);
  assert.equal(error.model, "gpt-4");
});

test("createModelNotFoundError generates proper error", () => {
  const error1 = createModelNotFoundError("gpt-4");
  assert.equal(error1.code, "model_not_found");
  assert(error1.message.includes("gpt-4"));

  const error2 = createModelNotFoundError("gpt-4", "openai");
  assert(error2.message.includes("openai"));
});

test("createProviderNotFoundError generates proper error", () => {
  const error = createProviderNotFoundError("openai");

  assert.equal(error.code, "provider_not_found");
  assert(error.message.includes("openai"));
});

test("negotiateCapabilities returns supported when all capabilities present", () => {
  const result = negotiateCapabilities({
    requested: { streaming: true, tools: true },
    available: { streaming: true, tools: true, vision: true }
  });

  assert.equal(result.supported, true);
  assert.deepEqual(result.missing, []);
});

test("negotiateCapabilities returns missing when capabilities absent", () => {
  const result = negotiateCapabilities({
    requested: { vision: true, tools: true },
    available: { streaming: true, tools: true }
  });

  assert.equal(result.supported, false);
  assert.deepEqual(result.missing, ["vision"]);
});

test("negotiateCapabilities only checks requested=true capabilities", () => {
  const result = negotiateCapabilities({
    requested: { streaming: false, vision: false, tools: true },
    available: { tools: true }
  });

  assert.equal(result.supported, true);
  assert.deepEqual(result.missing, []);
});

test("hasCapability validates model and capability", () => {
  const model = {
    capabilities: { streaming: true, tools: false }
  };

  assert.equal(hasCapability(model, "streaming"), true);
  assert.equal(hasCapability(model, "tools"), false);
  assert.equal(hasCapability(model, "vision"), false);

  assert.throws(
    () => hasCapability(null, "streaming"),
    /model must be an object/
  );
  assert.throws(
    () => hasCapability({}, "streaming"),
    /model must have a capabilities object/
  );
});

test("supportsAllCapabilities checks all required capabilities", () => {
  const model = {
    capabilities: { streaming: true, tools: true, vision: false }
  };

  assert.equal(supportsAllCapabilities(model, ["streaming", "tools"]), true);
  assert.equal(supportsAllCapabilities(model, ["streaming", "vision"]), false);
  assert.equal(supportsAllCapabilities(model, []), true);
});

test("supportsAnyCapability checks any required capability", () => {
  const model = {
    capabilities: { streaming: true, tools: true, vision: false }
  };

  assert.equal(supportsAnyCapability(model, ["vision"]), false);
  assert.equal(supportsAnyCapability(model, ["streaming", "vision"]), true);
  assert.equal(supportsAnyCapability(model, ["tools", "vision"]), true);
});

test("filterModelsByCapabilities filters models correctly", () => {
  const models = [
    {
      id: "model1",
      capabilities: { streaming: true, tools: true, vision: true }
    },
    {
      id: "model2",
      capabilities: { streaming: true, tools: false, vision: true }
    },
    {
      id: "model3",
      capabilities: { streaming: true, tools: true, vision: false }
    }
  ];

  const result = filterModelsByCapabilities(models, ["tools", "streaming"]);

  assert.equal(result.length, 2);
  assert.equal(result[0].id, "model1");
  assert.equal(result[1].id, "model3");
});

test("deriveRequirements from attachments", () => {
  const req = {
    attachments: [{ type: "image" }]
  };

  const reqs = deriveRequirements(req);

  assert.equal(reqs.vision, true);
  assert.equal(reqs.attachments, true);
});

test("deriveRequirements from tools", () => {
  const req = {
    tools: [{ name: "test" }]
  };

  const reqs = deriveRequirements(req);

  assert.equal(reqs.tools, true);
});

test("deriveRequirements from responseFormat", () => {
  const req1 = {
    responseFormat: { type: "json_schema" }
  };

  const reqs1 = deriveRequirements(req1);
  assert.equal(reqs1.structuredOutput, true);

  const req2 = {
    responseFormat: { type: "json" }
  };

  const reqs2 = deriveRequirements(req2);
  assert.equal(reqs2.jsonMode, true);
});

test("deriveRequirements from reasoning", () => {
  const req = { reasoning: true };

  const reqs = deriveRequirements(req);

  assert.equal(reqs.reasoning, true);
});

test("deriveRequirements from streaming", () => {
  const req = { streaming: true };

  const reqs = deriveRequirements(req);

  assert.equal(reqs.streaming, true);
});

test("deriveRequirements from message content", () => {
  const req = {
    messages: [
      {
        role: "user",
        content: [{ type: "image_url", image_url: { url: "..." } }]
      }
    ]
  };

  const reqs = deriveRequirements(req);

  assert.equal(reqs.vision, true);
});

test("deriveRequirements returns empty object for null", () => {
  assert.deepEqual(deriveRequirements(null), {});
  assert.deepEqual(deriveRequirements(undefined), {});
});

test("requiresStreaming checks for streaming requirement", () => {
  assert.equal(requiresStreaming({ streaming: true }), true);
  assert.equal(requiresStreaming({ streaming: false }), false);
  assert.equal(requiresStreaming({}), false);
});

test("requiresTools checks for tools requirement", () => {
  assert.equal(requiresTools({ tools: [{ name: "test" }] }), true);
  assert.equal(requiresTools({ tools: [] }), false);
  assert.equal(requiresTools({}), false);
});

test("requiresVision checks for vision requirement", () => {
  assert.equal(requiresVision({ attachments: [{ type: "image" }] }), true);
  assert.equal(requiresVision({ attachments: [] }), false);
  assert.equal(requiresVision({}), false);
});

test("requiresStructuredOutput checks for structured output requirement", () => {
  assert.equal(
    requiresStructuredOutput({ responseFormat: { type: "json_schema" } }),
    true
  );
  assert.equal(requiresStructuredOutput({ responseFormat: { type: "json" } }), false);
  assert.equal(requiresStructuredOutput({}), false);
});

test("requiresAttachments checks for attachments requirement", () => {
  assert.equal(requiresAttachments({ attachments: [{ type: "image" }] }), true);
  assert.equal(requiresAttachments({ attachments: [] }), false);
  assert.equal(requiresAttachments({}), false);
});

test("requiresReasoning checks for reasoning requirement", () => {
  assert.equal(requiresReasoning({ reasoning: true }), true);
  assert.equal(requiresReasoning({ reasoning: false }), false);
  assert.equal(requiresReasoning({}), false);
});
