import test from "node:test";
import assert from "node:assert/strict";
import { createAISession } from "@ai-ui/core/runtime";

// Mock React's useSyncExternalStore
let mockListeners = [];

const mockReact = {
  useSyncExternalStore: (subscribe, getSnapshot, getServerSnapshot) => {
    // Store the subscribe callback for testing
    mockListeners.push(subscribe);
    // Return initial snapshot
    return getSnapshot();
  }
};

// Create a minimal mock for import purposes
const createTestEnv = () => {
  return {
    mockTransport: {
      async *send() {
        yield { type: "session.started" };
        yield { type: "message.started", messageId: "m1" };
        yield { type: "text.delta", messageId: "m1", text: "Hello" };
        yield { type: "message.completed", messageId: "m1" };
        yield { type: "session.completed" };
      }
    }
  };
};

test("useAIState hook integration", () => {
  const { mockTransport } = createTestEnv();
  const session = createAISession({ transport: mockTransport });

  // Verify session has required methods for useAIState
  assert(typeof session.subscribe === "function", "session should have subscribe method");
  assert(typeof session.getState === "function", "session should have getState method");

  // Test subscribe callback works
  const states = [];
  const unsubscribe = session.subscribe((state) => {
    states.push(state);
  });

  assert(states.length > 0, "subscribe should immediately call listener with initial state");
  assert(states[0].status === "idle", "initial state should have idle status");

  // Test unsubscribe works
  unsubscribe();
  const initialLength = states.length;

  // Create another state change
  session.cancel();
  assert(
    states.length === initialLength,
    "after unsubscribe, listener should not be called"
  );
});

test("useAISession hook contract", async () => {
  const { mockTransport } = createTestEnv();
  const session = createAISession({ transport: mockTransport });

  // Verify the contract that useAISession expects
  assert(
    typeof session.send === "function",
    "session should have send method"
  );
  assert(
    typeof session.cancel === "function",
    "session should have cancel method"
  );
  assert(
    typeof session.retry === "function",
    "session should have retry method"
  );
  assert(
    typeof session.clear === "function",
    "session should have clear method"
  );
  assert(
    typeof session.subscribe === "function",
    "session should have subscribe method"
  );
  assert(
    typeof session.getState === "function",
    "session should have getState method"
  );
});

test("session state updates flow through subscriptions", async () => {
  const { mockTransport } = createTestEnv();
  const session = createAISession({ transport: mockTransport });

  const states = [];
  session.subscribe((state) => {
    states.push({
      status: state.status,
      messageCount: state.messages.length
    });
  });

  // Initial state
  assert.equal(states[0].status, "idle", "should start idle");

  // Send message
  await session.send("Test message");

  // Verify state progression
  assert(states.length > 1, "should have multiple state updates");
  assert(
    states.some((s) => s.status === "streaming"),
    "should have streaming status"
  );
  assert(
    states.some((s) => s.status === "complete"),
    "should have complete status"
  );
  assert(
    states[states.length - 1].messageCount > 0,
    "final state should have messages"
  );
});

test("cancel operation works through session API", () => {
  const { mockTransport } = createTestEnv();
  const session = createAISession({ transport: mockTransport });

  // Verify cancel method exists and is callable
  assert(typeof session.cancel === "function", "session.cancel should be a function");

  // Calling cancel when idle should not throw
  session.cancel();

  const state = session.getState();
  assert(state.status === "idle", "cancel when idle should remain idle");

  // Cancel is tested more thoroughly via integration tests
  // This verifies the React hook contract that session.cancel exists
});

test("clear operation works through session API", async () => {
  const { mockTransport } = createTestEnv();
  const session = createAISession({ transport: mockTransport });

  // Add a message
  await session.send("Test");

  let state = session.getState();
  assert(state.messages.length > 0, "should have messages after send");

  // Clear
  session.clear();

  state = session.getState();
  assert.equal(
    state.messages.length,
    0,
    "clear should remove all messages"
  );
  assert.equal(state.status, "idle", "clear should reset to idle");
});

test("external store pattern contract verification", () => {
  const { mockTransport } = createTestEnv();
  const session = createAISession({ transport: mockTransport });

  // Verify the pattern expected by useSyncExternalStore
  let subscribed = false;
  let subscribedState = null;

  const unsubscribe = session.subscribe((state) => {
    subscribed = true;
    subscribedState = state;
  });

  assert(subscribed, "subscribe should immediately call listener");
  assert(subscribedState !== null, "listener should receive state");

  // Verify getState returns same structure
  const state = session.getState();
  assert(
    state.status !== undefined,
    "getState should return state with status"
  );
  assert(Array.isArray(state.messages), "state should have messages array");
  assert(
    Array.isArray(state.activeToolCalls),
    "state should have activeToolCalls array"
  );
  assert(Array.isArray(state.artifacts), "state should have artifacts array");
});
