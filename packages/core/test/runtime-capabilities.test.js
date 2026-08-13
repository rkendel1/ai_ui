import test from "node:test";
import assert from "node:assert/strict";

import { createAISession } from "../src/runtime/index.js";
import { createMockTransport } from "./mock-transport.js";

test("createAISession with model includes model in state", async () => {
  const model = {
    id: "test-model",
    provider: "test-provider",
    capabilities: {
      streaming: true,
      tools: true,
      vision: false
    }
  };

  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  const state = session.getState();
  assert.deepEqual(state.model, model);
  assert.deepEqual(state.capabilities, model.capabilities);
});

test("createAISession state includes model and capabilities on subscribe", () => {
  const model = {
    id: "test-model",
    provider: "test-provider",
    capabilities: {
      streaming: true,
      tools: true,
      vision: false
    }
  };

  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  return new Promise((resolve) => {
    session.subscribe((state) => {
      assert(state.model);
      assert.equal(state.model.id, "test-model");
      assert(state.capabilities);
      assert.equal(state.capabilities.streaming, true);
      resolve();
    });
  });
});

test("createAISession without model has null model in state", () => {
  const session = createAISession({
    transport: createMockTransport()
  });

  const state = session.getState();
  assert.equal(state.model, null);
  assert.equal(state.capabilities, null);
});

test("createAISession performs capability negotiation on send", async () => {
  const model = {
    id: "test-model",
    provider: "test-provider",
    capabilities: {
      streaming: true,
      tools: false,
      vision: true
    }
  };

  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  try {
    await session.send({
      message: "test",
      tools: [{ name: "test-tool" }]
    });
    assert.fail("Should have thrown an error for unsupported tools capability");
  } catch (err) {
    assert(err.message.includes("capability"));
    const state = session.getState();
    assert.equal(state.status, "error");
    assert(state.error.code === "capability_unsupported");
    assert(state.error.message.includes("tool"));
  }
});

test("createAISession allows request with supported capabilities", async () => {
  const model = {
    id: "test-model",
    provider: "test-provider",
    capabilities: {
      streaming: true,
      tools: true,
      vision: true
    }
  };

  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  await session.send({
    message: "test",
    tools: [{ name: "test-tool" }]
  });

  const state = session.getState();
  assert(state.messages.length > 0);
  assert(state.status === "complete" || state.status === "idle");
});

test("createAISession clear preserves model and capabilities", () => {
  const model = {
    id: "test-model",
    provider: "test-provider",
    capabilities: {
      streaming: true,
      tools: true,
      vision: false
    }
  };

  const session = createAISession({
    transport: createMockTransport(),
    model
  });

  session.clear();
  const state = session.getState();

  assert.deepEqual(state.model, model);
  assert.deepEqual(state.capabilities, model.capabilities);
  assert.equal(state.messages.length, 0);
});
