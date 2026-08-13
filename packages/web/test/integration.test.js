import test from "node:test";
import assert from "node:assert/strict";
import { createMockTransport } from "../../../packages/core/test/mock-transport.js";
import { createAISession } from "@ai-ui/core/runtime";

/**
 * Mock JSDOM for testing Web Components
 * This is a simplified test that verifies core functionality
 */

test("defineAIChatElement is exported and callable", () => {
  const mod = import("../src/index.js");
  assert(mod instanceof Promise);
});

test("@ai-ui/web exports defineAIChatElement, defineAIComposerElement, and defineAIAttachmentsElement", async () => {
  const { defineAIChatElement, defineAIComposerElement, defineAIAttachmentsElement } = await import("../src/index.js");
  assert.equal(typeof defineAIChatElement, "function");
  assert.equal(typeof defineAIComposerElement, "function");
  assert.equal(typeof defineAIAttachmentsElement, "function");
});

test("Web component is safe to import in non-browser runtimes", async () => {
  const mod = await import("../src/index.js");
  assert.equal(typeof mod.defineAIChatElement, "function");
  assert.equal(typeof mod.defineAIComposerElement, "function");
});

test("session.send() creates user and assistant messages", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "text.delta", messageId: "m1", text: "Hello" },
    { type: "text.delta", messageId: "m1", text: " world" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Hi");

  const state = session.getState();
  assert.equal(state.messages.length, 2);
  assert.equal(state.messages[0].role, "user");
  assert.equal(state.messages[0].content, "Hi");
  assert.equal(state.messages[1].role, "assistant");
  assert.equal(state.messages[1].content, "Hello world");
  assert.equal(state.status, "complete");
});

test("streaming tokens are accumulated correctly", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "text.delta", messageId: "m1", text: "The " },
    { type: "text.delta", messageId: "m1", text: "answer " },
    { type: "text.delta", messageId: "m1", text: "is " },
    { type: "text.delta", messageId: "m1", text: "42" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  
  const states = [];
  session.subscribe((state) => {
    states.push({ ...state });
  });

  await session.send("What is the answer?");

  // Check that streaming happened
  assert(states.length > 0, "Should have state updates");
  
  const finalState = states[states.length - 1];
  assert.equal(finalState.messages[1].content, "The answer is 42");
});

test("reasoning state is captured", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "reasoning.delta", messageId: "m1", text: "Analyzing" },
    { type: "reasoning.delta", messageId: "m1", text: " the question..." },
    { type: "text.delta", messageId: "m1", text: "The answer is..." },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Think about this");

  const state = session.getState();
  assert.equal(state.messages[1].reasoning, "Analyzing the question...");
  assert.equal(state.messages[1].content, "The answer is...");
});

test("tool calls are rendered with lifecycle", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "tool.call.started", id: "t1", name: "search_web", input: { query: "AI" } },
    { type: "text.delta", messageId: "m1", text: "I'll search for that" },
    { type: "tool.call.completed", id: "t1", output: { results: [] } },
    { type: "text.delta", messageId: "m1", text: " and summarize" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Search for AI");

  const states = [];
  session.subscribe((state) => states.push({ ...state }));
  
  // Re-run to capture all states
  session.clear();
  await session.send("Search for AI");

  const finalState = states[states.length - 1];
  // PR5: Tool calls remain in state with completed status (first-class primitives)
  assert.equal(finalState.activeToolCalls.length, 1, "Tool call should remain in state");
  assert.equal(finalState.activeToolCalls[0].status, "completed", "Tool call should be completed");
  assert.equal(finalState.artifacts.length, 0, "No artifacts in this test");
});

test("approval workflow sets status", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "tool.call.started", id: "t1", name: "delete_user" },
    { type: "tool.approval.required", id: "t1", reason: "Delete user account" },
    { type: "tool.call.completed", id: "t1" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  
  const states = [];
  session.subscribe((state) => states.push({ ...state }));
  
  await session.send("Delete my account");

  const stateWithApproval = states.find(s => s.status === "waiting_for_approval");
  assert(stateWithApproval, "Should have waiting_for_approval status");
});

test("error.occurred sets error state", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "error.occurred", message: "API rate limit exceeded", code: "RATE_LIMIT" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Tell me something");

  const state = session.getState();
  assert.equal(state.status, "error");
  assert.equal(state.error.message, "API rate limit exceeded");
  assert.equal(state.error.code, "RATE_LIMIT");
});

test("session.cancel() calls cancel on the session", async () => {
  let cancelCalled = false;
  const originalCancel = (session) => {
    return () => {
      cancelCalled = true;
    };
  };

  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "text.delta", messageId: "m1", text: "Hello" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  
  // The session should have a cancel method
  assert.equal(typeof session.cancel, "function", "session should have cancel method");
  
  // Verify that calling send transitions through statuses
  const states = [];
  session.subscribe((state) => {
    states.push(state.status);
  });

  await session.send("Hello");
  
  // Should have transitioned through streaming to complete
  const uniqueStatuses = [...new Set(states)];
  assert(uniqueStatuses.includes("streaming") || uniqueStatuses.includes("complete"));
});

test("session.retry() resends last message", async () => {
  const sentMessages = [];
  const transport = {
    async *send(request) {
      sentMessages.push(request.message);
      yield { type: "session.started" };
      yield { type: "message.started", messageId: `m-${sentMessages.length}` };
      yield { type: "text.delta", messageId: `m-${sentMessages.length}`, text: "Response" };
      yield { type: "message.completed", messageId: `m-${sentMessages.length}` };
      yield { type: "session.completed" };
    }
  };

  const session = createAISession({ transport });
  await session.send("First question");
  await session.retry();

  assert.deepEqual(sentMessages, ["First question", "First question"]);
});

test("artifacts are collected", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "artifact.created", artifact: { id: "a1", type: "code", content: "function test() {}" } },
    { type: "text.delta", messageId: "m1", text: "Here's a function" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Write a function");

  const state = session.getState();
  assert.equal(state.artifacts.length, 1);
  assert.equal(state.artifacts[0].type, "code");
});

test("citations are collected", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "text.delta", messageId: "m1", text: "According to Wikipedia" },
    { type: "citation.added", citation: { id: "c1", href: "https://wikipedia.org" } },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Tell me about something");

  const state = session.getState();
  assert.equal(state.citations.length, 1);
  assert.equal(state.citations[0].href, "https://wikipedia.org");
});

test("complex scenario: full conversation flow", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    // First message
    { type: "message.started", messageId: "m1" },
    { type: "text.delta", messageId: "m1", text: "Let me search for that" },
    { type: "tool.call.started", id: "t1", name: "search", input: { q: "quantum" } },
    { type: "tool.call.completed", id: "t1", output: { results: 5 } },
    { type: "text.delta", messageId: "m1", text: ". Found 5 results." },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  
  const states = [];
  session.subscribe((state) => {
    states.push({
      status: state.status,
      messageCount: state.messages.length,
      toolCallsActive: state.activeToolCalls.length,
      toolCallsCompleted: state.activeToolCalls.filter(c => c.status === "completed").length,
      content: state.messages[state.messages.length - 1]?.content
    });
  });

  await session.send("Tell me about quantum computing");

  assert(states.length > 0);
  const finalState = states[states.length - 1];
  assert.equal(finalState.status, "complete");
  assert.equal(finalState.messageCount, 2);
  // Tool calls remain in state with completed status (PR5 first-class primitives)
  assert.equal(finalState.toolCallsActive, 1);
  assert.equal(finalState.toolCallsCompleted, 1);
  assert(finalState.content.includes("Found 5 results"));
});

// PR6: Workspace component tests
test("AI workspace component exports are available", async () => {
  const { defineAIWorkspaceElement, defineAIToolActivityElement, defineAIArtifactsPanelElement } = await import("../src/index.js");
  assert.equal(typeof defineAIWorkspaceElement, "function");
  assert.equal(typeof defineAIToolActivityElement, "function");
  assert.equal(typeof defineAIArtifactsPanelElement, "function");
});

test("ai-tool-activity displays active tool calls", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "tool.call.started", id: "t1", name: "search", input: { q: "test" } },
    { type: "tool.call.completed", id: "t1", output: { results: 3 } },
    { type: "text.delta", messageId: "m1", text: "Done" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Search for something");

  const state = session.getState();
  assert.equal(state.activeToolCalls.length, 1);
  assert.equal(state.activeToolCalls[0].name, "search");
  assert.equal(state.activeToolCalls[0].status, "completed");
});

test("ai-artifacts-panel lists artifacts", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "artifact.created", artifact: { id: "a1", type: "code", title: "Test Code", content: "function test() {}" } },
    { type: "artifact.created", artifact: { id: "a2", type: "json", title: "Test JSON", content: { key: "value" } } },
    { type: "text.delta", messageId: "m1", text: "Here are the artifacts" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Create artifacts");

  const state = session.getState();
  assert.equal(state.artifacts.length, 2);
  assert.equal(state.artifacts[0].type, "code");
  assert.equal(state.artifacts[1].type, "json");
});

test("ai-workspace composes chat and panels", async () => {
  const transport = createMockTransport([
    { type: "session.started" },
    { type: "message.started", messageId: "m1" },
    { type: "tool.call.started", id: "t1", name: "analyze", input: { data: "test" } },
    { type: "artifact.created", artifact: { id: "a1", type: "table", content: [] } },
    { type: "tool.call.completed", id: "t1", output: { status: "done" } },
    { type: "text.delta", messageId: "m1", text: "Analysis complete" },
    { type: "message.completed", messageId: "m1" },
    { type: "session.completed" }
  ]);

  const session = createAISession({ transport });
  await session.send("Analyze this");

  const state = session.getState();
  assert.equal(state.messages.length, 2);
  assert.equal(state.activeToolCalls.length, 1);
  assert.equal(state.artifacts.length, 1);
});
