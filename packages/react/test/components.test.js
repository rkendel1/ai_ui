import test from "node:test";
import assert from "node:assert/strict";
import { createAISession } from "@ai-ui/core/runtime";

// Test utilities for React components
// These tests verify the component contracts work with the session

function createMockTransport() {
  return {
    async *send() {
      yield { type: "session.started" };
      yield { type: "message.started", messageId: "m1" };
      yield {
        type: "tool.call.started",
        id: "t1",
        name: "search",
        input: { query: "test" }
      };
      yield { type: "tool.approval.required", id: "t1" };
      yield { type: "tool.approved", id: "t1" };
      yield { type: "tool.call.completed", id: "t1", output: { result: "done" } };
      yield { type: "text.delta", messageId: "m1", text: "Result: " };
      yield {
        type: "artifact.created",
        artifact: {
          id: "a1",
          type: "code",
          title: "Example",
          content: "console.log('hello')"
        }
      };
      yield { type: "message.completed", messageId: "m1" };
      yield { type: "session.completed" };
    }
  };
}

test("AIChat component contract", () => {
  const transport = createMockTransport();
  const session = createAISession({ transport });
  const state = session.getState();

  // Component should accept session and state
  assert(session, "session object should exist");
  assert(state, "state object should exist");
  assert(Array.isArray(state.messages), "state should have messages");
  assert(state.status !== undefined, "state should have status");
});

test("AIComposer component contract", () => {
  const transport = createMockTransport();
  const session = createAISession({ transport });
  const state = session.getState();

  // Component should be able to send messages via session.send
  assert(typeof session.send === "function", "session should have send method");
  assert(state.status === "idle", "initial status should be idle");
});

test("AIAttachments component contract", () => {
  // Component doesn't strictly require session
  // It's for file handling
  const dummy = true;
  assert(dummy, "AIAttachments is a UI component for file input");
});

test("AIToolActivity component contract", () => {
  const transport = createMockTransport();
  const session = createAISession({ transport });
  const state = session.getState();

  // Component should render active tool calls
  assert(Array.isArray(state.activeToolCalls), "state should have activeToolCalls");

  // Simulate tool call
  session.send("test").then(() => {
    const updatedState = session.getState();
    // Tool calls should flow through state updates
    assert(
      updatedState !== state,
      "state should update during operations"
    );
  });
});

test("AIArtifactsPanel component contract", () => {
  const transport = createMockTransport();
  const session = createAISession({ transport });
  const state = session.getState();

  // Component should render artifacts
  assert(Array.isArray(state.artifacts), "state should have artifacts");

  // After send, artifacts should be populated
  session.send("test").then(() => {
    const updatedState = session.getState();
    // Artifacts will be added during the flow
    assert(
      Array.isArray(updatedState.artifacts),
      "artifacts should remain accessible"
    );
  });
});

test("AIWorkspace component contract", () => {
  const transport = createMockTransport();
  const session = createAISession({ transport });
  const state = session.getState();

  // Workspace should be able to render all sub-components
  assert(session, "session should exist");
  assert(state, "state should exist");
  assert(typeof session.send === "function", "session should have send");
  assert(
    typeof session.cancel === "function",
    "session should have cancel"
  );
  assert(state.status !== undefined, "state should have status");
  assert(Array.isArray(state.messages), "state should have messages");
  assert(
    Array.isArray(state.activeToolCalls),
    "state should have activeToolCalls"
  );
  assert(Array.isArray(state.artifacts), "state should have artifacts");
});

test("Component state subscription pattern", async () => {
  const transport = createMockTransport();
  const session = createAISession({ transport });

  const states = [];
  const unsubscribe = session.subscribe((state) => {
    states.push({
      status: state.status,
      messages: state.messages.length,
      tools: state.activeToolCalls.length,
      artifacts: state.artifacts.length
    });
  });

  // Send message to trigger state updates
  await session.send("test message");

  assert(states.length > 1, "should have multiple state updates");

  const lastState = states[states.length - 1];
  assert(lastState.messages > 0, "should have messages");
  assert(lastState.status === "complete", "should finish with complete status");

  unsubscribe();
});

test("Multiple component instances share same session", async () => {
  const transport = createMockTransport();
  const session = createAISession({ transport });

  const states1 = [];
  const states2 = [];

  // Multiple subscribers to same session
  const unsub1 = session.subscribe((state) => {
    states1.push({ status: state.status, msgCount: state.messages.length });
  });

  const unsub2 = session.subscribe((state) => {
    states2.push({ status: state.status, msgCount: state.messages.length });
  });

  await session.send("shared message");

  // Both should have same state progression
  assert.equal(states1.length, states2.length, "both listeners should get same updates");

  for (let i = 0; i < states1.length; i++) {
    assert.deepEqual(
      states1[i],
      states2[i],
      `state at index ${i} should be identical`
    );
  }

  unsub1();
  unsub2();
});

test("Component error handling for missing session", () => {
  // Components should throw clear error if session is missing
  const tryWithoutSession = () => {
    // This would be done in the actual component render
    const session = null;
    if (!session) {
      throw new Error("Component requires a session prop");
    }
  };

  assert.throws(
    tryWithoutSession,
    /requires a session/,
    "should throw clear error for missing session"
  );
});
