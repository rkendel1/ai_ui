import test from "node:test";
import assert from "node:assert/strict";

import { createAIRuntime } from "../src/index.js";
import { createMockProvider } from "../src/providers/mock.js";
import { AI_EVENT_TYPES } from "@ai-ui/core/protocol";

test("Runtime with mock provider emits canonical events", async () => {
  const provider = createMockProvider({ scenario: "streaming" });
  const runtime = createAIRuntime({ provider });

  const events = [];
  const stream = runtime.execute({
    messages: [{ role: "user", content: "Hello" }]
  });

  for await (const event of stream) {
    events.push(event);
  }

  // Check canonical event sequence
  assert.equal(events[0].type, AI_EVENT_TYPES.SESSION_STARTED);
  assert.equal(events[1].type, AI_EVENT_TYPES.MESSAGE_STARTED);

  // Should have some text deltas
  const textDeltas = events.filter((e) => e.type === AI_EVENT_TYPES.TEXT_DELTA);
  assert(textDeltas.length > 0, "Should have text delta events");

  // Should end with message completed and session completed
  assert.equal(
    events[events.length - 2].type,
    AI_EVENT_TYPES.MESSAGE_COMPLETED
  );
  assert.equal(events[events.length - 1].type, AI_EVENT_TYPES.SESSION_COMPLETED);
});

test("Runtime with mock tool scenario", async () => {
  const provider = createMockProvider({ scenario: "tool" });
  const runtime = createAIRuntime({ provider });

  const events = [];
  const stream = runtime.execute({
    messages: [{ role: "user", content: "Get weather" }]
  });

  for await (const event of stream) {
    events.push(event);
  }

  // Check for tool call events
  const toolStarted = events.find((e) => e.type === AI_EVENT_TYPES.TOOL_CALL_STARTED);
  assert(toolStarted, "Should have tool call started event");
  assert.equal(toolStarted.name, "get_weather");

  const toolCompleted = events.find(
    (e) => e.type === AI_EVENT_TYPES.TOOL_CALL_COMPLETED
  );
  assert(toolCompleted, "Should have tool call completed event");
});

test("Runtime respects cancellation signal", async () => {
  const provider = createMockProvider({ scenario: "streaming" });
  const runtime = createAIRuntime({ provider });

  const controller = new AbortController();
  const events = [];

  // Schedule abort after a short delay
  const timeoutId = setTimeout(() => controller.abort(), 50);

  try {
    const stream = runtime.execute(
      {
        messages: [{ role: "user", content: "Hello" }]
      },
      { signal: controller.signal }
    );

    for await (const event of stream) {
      events.push(event);
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Should have some events but not all
  assert(events.length > 0, "Should have at least some events");
  assert(events.length < 100, "Should not have all events due to cancellation");
});
