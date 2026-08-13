import test from "node:test";
import assert from "node:assert/strict";

import { createAISession } from "../src/runtime/createAISession.js";

function createMockTransport(events) {
  return {
    async *send() {
      for (const event of events) {
        yield event;
      }
    }
  };
}

test("createAISession streams events into state", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "text.delta", messageId: "m1", text: "Hello" },
    { type: "tool.call.started", id: "t1", name: "lookup" },
    { type: "tool.approval.required", id: "t1" },
    { type: "tool.call.completed", id: "t1" },
    { type: "text.delta", messageId: "m1", text: " world" },
    { type: "citation.added", citation: { id: "c1", href: "https://example.com" } },
    {
      type: "artifact.created",
      artifact: { id: "a1", type: "json", content: { ok: true } }
    },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport, context: { page: "customer" } });
  await session.send("Summarize this");

  const state = session.getState();
  assert.equal(state.status, "complete");
  assert.equal(state.messages[0].role, "user");
  assert.equal(state.messages[1].content, "Hello world");
  assert.equal(state.activeToolCalls.length, 0);
  assert.equal(state.artifacts.length, 1);
  assert.equal(state.citations.length, 1);
});

test("session retry resends previous user message", async () => {
  const sentMessages = [];
  const transport = {
    async *send(request) {
      sentMessages.push(request.message);
      yield { type: "session.started" };
      yield { type: "message.started", messageId: `m-${sentMessages.length}` };
      yield { type: "message.completed", messageId: `m-${sentMessages.length}` };
      yield { type: "session.completed" };
    }
  };

  const session = createAISession({ transport });
  await session.send("First");
  await session.retry();

  assert.deepEqual(sentMessages, ["First", "First"]);
});
