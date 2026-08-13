/**
 * Mock transport for deterministic testing of the AI session runtime.
 * Allows defining a sequence of AIEvents that will be streamed.
 *
 * @example
 * const transport = createMockTransport([
 *   { type: "session.started" },
 *   { type: "message.started", messageId: "m1" },
 *   { type: "text.delta", messageId: "m1", text: "Hello" },
 *   { type: "text.delta", messageId: "m1", text: " world" },
 *   { type: "message.completed", messageId: "m1" },
 *   { type: "session.completed" }
 * ]);
 */
export function createMockTransport(events = []) {
  return {
    async *send() {
      for (const event of events) {
        yield event;
      }
    }
  };
}
