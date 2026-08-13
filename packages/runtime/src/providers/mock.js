import { PROVIDER_EVENT_TYPES } from "./interface.js";

/**
 * Mock provider for testing and development without API keys.
 * Supports multiple scenarios demonstrating different AI interaction patterns.
 * 
 * Scenarios:
 * - simple: Single text response
 * - streaming: Streamed text response
 * - reasoning: Reasoning delta followed by response
 * - tool: Tool call and execution
 * - approval: Tool call requiring approval
 * - artifact: Response with artifact creation
 * - error: Simulated error
 * - multi-tool: Multiple tool calls
 */

const SCENARIOS = {
  simple: async function* () {
    yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta: "This is a simple response.",
      role: "assistant"
    };
    yield { type: PROVIDER_EVENT_TYPES.STREAM_COMPLETED };
  },

  streaming: async function* () {
    yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };
    const text = "This is a streaming response generated word by word";
    for (const word of text.split(" ")) {
      yield {
        type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
        delta: word + " ",
        role: "assistant"
      };
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    yield { type: PROVIDER_EVENT_TYPES.STREAM_COMPLETED };
  },

  reasoning: async function* () {
    yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };
    yield {
      type: PROVIDER_EVENT_TYPES.REASONING_DELTA,
      delta: "I need to think about this step by step. First, let me analyze the question. Then I'll develop a solution."
    };
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta: "Based on my analysis, here's the answer: ",
      role: "assistant"
    };
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta: "The best approach is to break this down into smaller components.",
      role: "assistant"
    };
    yield { type: PROVIDER_EVENT_TYPES.STREAM_COMPLETED };
  },

  tool: async function* () {
    yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };
    yield {
      type: PROVIDER_EVENT_TYPES.TOOL_CALL_STARTED,
      id: "tool-1",
      name: "get_weather",
      input: { location: "San Francisco" }
    };
    yield {
      type: PROVIDER_EVENT_TYPES.TOOL_CALL_COMPLETED,
      id: "tool-1",
      output: { temperature: 72, condition: "Sunny" }
    };
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta: "The weather in San Francisco is sunny with a temperature of 72°F.",
      role: "assistant"
    };
    yield { type: PROVIDER_EVENT_TYPES.STREAM_COMPLETED };
  },

  approval: async function* () {
    yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };
    yield {
      type: PROVIDER_EVENT_TYPES.TOOL_CALL_STARTED,
      id: "tool-1",
      name: "send_email",
      input: {
        to: "user@example.com",
        subject: "Important Update",
        body: "This is a test email"
      },
      requiresApproval: true
    };
    // The runtime will handle the approval request
    // When approved, we continue
    yield {
      type: PROVIDER_EVENT_TYPES.TOOL_CALL_COMPLETED,
      id: "tool-1",
      output: { success: true, messageId: "msg-123" }
    };
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta: "Email sent successfully!",
      role: "assistant"
    };
    yield { type: PROVIDER_EVENT_TYPES.STREAM_COMPLETED };
  },

  artifact: async function* () {
    yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta: "Here are the results: ",
      role: "assistant"
    };
    yield {
      type: PROVIDER_EVENT_TYPES.ARTIFACT,
      id: "artifact-1",
      type: "table",
      title: "Customer Results",
      content: [
        { id: "C1", name: "Alice", status: "active" },
        { id: "C2", name: "Bob", status: "active" },
        { id: "C3", name: "Charlie", status: "inactive" }
      ]
    };
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta: "These customers are in our database.",
      role: "assistant"
    };
    yield { type: PROVIDER_EVENT_TYPES.STREAM_COMPLETED };
  },

  error: async function* () {
    yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };
    yield {
      type: PROVIDER_EVENT_TYPES.STREAM_ERROR,
      error: "Simulated API error",
      code: "INTERNAL_ERROR"
    };
  },

  "multi-tool": async function* () {
    yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };
    yield {
      type: PROVIDER_EVENT_TYPES.TOOL_CALL_STARTED,
      id: "tool-1",
      name: "get_weather",
      input: { location: "San Francisco" }
    };
    yield {
      type: PROVIDER_EVENT_TYPES.TOOL_CALL_STARTED,
      id: "tool-2",
      name: "get_weather",
      input: { location: "New York" }
    };
    yield {
      type: PROVIDER_EVENT_TYPES.TOOL_CALL_COMPLETED,
      id: "tool-1",
      output: { temperature: 72, condition: "Sunny" }
    };
    yield {
      type: PROVIDER_EVENT_TYPES.TOOL_CALL_COMPLETED,
      id: "tool-2",
      output: { temperature: 65, condition: "Rainy" }
    };
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta:
        "San Francisco is 72°F and sunny, while New York is 65°F and rainy.",
      role: "assistant"
    };
    yield { type: PROVIDER_EVENT_TYPES.STREAM_COMPLETED };
  }
};

/**
 * Create a mock provider for testing and development.
 * 
 * @param {Object} options - Configuration
 * @param {string} [options.scenario="full"] - Scenario name: "full", "simple", "streaming", etc.
 * @returns {Object} Provider instance
 * 
 * @example
 * const provider = createMockProvider({ scenario: "streaming" });
 * const runtime = createAIRuntime({ provider });
 */
export function createMockProvider({ scenario = "full" } = {}) {
  return {
    async *stream(request, options = {}) {
      // If using "full" scenario, choose one based on request
      let scenarioFn;
      if (scenario === "full") {
        const message = request.messages?.[request.messages.length - 1]?.content || "";
        
        if (message.includes("weather")) {
          scenarioFn = SCENARIOS.streaming;
        } else if (message.includes("email")) {
          scenarioFn = SCENARIOS.approval;
        } else if (message.includes("customer")) {
          scenarioFn = SCENARIOS.artifact;
        } else if (message.includes("analyze")) {
          scenarioFn = SCENARIOS.reasoning;
        } else if (message.includes("error")) {
          scenarioFn = SCENARIOS.error;
        } else {
          scenarioFn = SCENARIOS.streaming;
        }
      } else {
        scenarioFn = SCENARIOS[scenario];
        if (!scenarioFn) {
          throw new Error(`Unknown scenario: ${scenario}`);
        }
      }

      // Respect cancellation signal
      if (options.signal?.aborted) {
        return;
      }

      // Forward all events from scenario
      for await (const event of scenarioFn()) {
        if (options.signal?.aborted) {
          break;
        }
        yield event;
      }
    }
  };
}
