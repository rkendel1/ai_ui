/**
 * Complete example: Building a capability-aware AI chat
 *
 * This example demonstrates how to use the capability system to:
 * 1. Define models with their capabilities
 * 2. Create sessions with model awareness
 * 3. Validate user requests against model capabilities
 * 4. Adapt UI based on available capabilities
 * 5. Handle capability errors gracefully
 */

import {
  createModel,
  createProviderMetadata,
  createAISession,
  createAITransport,
  negotiateCapabilities,
  deriveRequirements,
  filterModelsByCapabilities,
  requiresVision,
  requiresTools,
  requiresStructuredOutput
} from "@ai-ui/core";

// ============================================================================
// Step 1: Define Your Models
// ============================================================================

// Model 1: Full-featured model
const gpt4Turbo = createModel({
  id: "gpt-4-turbo",
  provider: "openai",
  displayName: "GPT-4 Turbo",
  capabilities: {
    streaming: true,
    tools: true,
    toolChoice: true,
    vision: true,
    audioInput: false,
    audioOutput: false,
    reasoning: true,
    structuredOutput: true,
    jsonMode: true,
    attachments: true
  },
  contextWindow: 128000,
  maxOutputTokens: 4096,
  input: { text: true, image: true },
  output: { text: true }
});

// Model 2: Limited model
const gpt35Turbo = createModel({
  id: "gpt-3.5-turbo",
  provider: "openai",
  displayName: "GPT-3.5 Turbo",
  capabilities: {
    streaming: true,
    tools: true,
    toolChoice: false,
    vision: false,
    reasoning: false,
    structuredOutput: false,
    jsonMode: true,
    attachments: false
  },
  contextWindow: 16385,
  maxOutputTokens: 2048,
  input: { text: true },
  output: { text: true }
});

// Model 3: Reasoning model
const o1Preview = createModel({
  id: "o1-preview",
  provider: "openai",
  displayName: "OpenAI o1 (Preview)",
  capabilities: {
    streaming: false,  // o1 doesn't support streaming
    tools: false,
    vision: false,
    reasoning: true,
    structuredOutput: true,
    jsonMode: false,
    attachments: false
  },
  contextWindow: 128000,
  maxOutputTokens: 32000,
  input: { text: true },
  output: { text: true }
});

// ============================================================================
// Step 2: Create Provider Registry
// ============================================================================

const openaiProvider = createProviderMetadata({
  id: "openai",
  name: "OpenAI",
  models: [gpt4Turbo, gpt35Turbo, o1Preview]
});

// Model registry (in real app, this would be a database)
const modelRegistry = {
  "gpt-4-turbo": gpt4Turbo,
  "gpt-3.5-turbo": gpt35Turbo,
  "o1-preview": o1Preview
};

// ============================================================================
// Step 3: Create Capability-Aware AI Session
// ============================================================================

class CapabilityAwareSession {
  constructor(transport, model) {
    this.model = model;
    this.session = createAISession({ transport, model });
    this.capabilities = model.capabilities;
  }

  /**
   * Send a message with automatic capability validation
   */
  async send(userInput, options = {}) {
    try {
      // Derive what capabilities are needed
      const requirements = deriveRequirements({
        message: userInput,
        ...options
      });

      // Check if model supports requirements
      const negotiation = negotiateCapabilities({
        requested: requirements,
        available: this.capabilities
      });

      if (!negotiation.supported) {
        throw new Error(
          `This model (${this.model.displayName}) doesn't support: ${negotiation.missing.join(", ")}`
        );
      }

      // Send the request
      await this.session.send({ message: userInput, ...options });
    } catch (err) {
      // Re-throw with better error message
      throw new Error(
        `Failed to send message with ${this.model.displayName}: ${err.message}`
      );
    }
  }

  subscribe(listener) {
    return this.session.subscribe(listener);
  }

  getState() {
    return this.session.getState();
  }

  clear() {
    this.session.clear();
  }
}

// ============================================================================
// Step 4: Model Selection Helper
// ============================================================================

/**
 * Select the best model for a request
 */
function selectBestModel(userInput, options = {}) {
  const requirements = deriveRequirements({
    message: userInput,
    ...options
  });

  // Get available models sorted by capability match
  const availableModels = Object.values(modelRegistry);

  const suitable = filterModelsByCapabilities(
    availableModels,
    Object.keys(requirements).filter((k) => requirements[k] === true)
  );

  if (suitable.length === 0) {
    // No model supports requirements
    const needed = Object.keys(requirements)
      .filter((k) => requirements[k])
      .join(", ");
    throw new Error(`No model supports: ${needed}`);
  }

  // Return first suitable model (or implement scoring logic)
  return suitable[0];
}

// ============================================================================
// Step 5: Usage Examples
// ============================================================================

// Example 1: Simple text message
async function example1SimpleMessage() {
  console.log("Example 1: Simple text message");

  const transport = createAITransport({
    url: "https://api.example.com/chat",
    format: "ndjson"
  });

  const session = new CapabilityAwareSession(transport, gpt35Turbo);

  try {
    await session.send("What is the capital of France?");
    console.log("✓ Message sent successfully");
  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

// Example 2: Image analysis (requires vision)
async function example2ImageAnalysis() {
  console.log("\nExample 2: Image analysis");

  const transport = createAITransport({
    url: "https://api.example.com/chat"
  });

  // Try with GPT-3.5 (no vision support)
  const session35 = new CapabilityAwareSession(transport, gpt35Turbo);
  try {
    await session35.send("Analyze this image", {
      attachments: [{ type: "image", url: "https://example.com/image.jpg" }]
    });
  } catch (err) {
    console.log("✓ Expected error with GPT-3.5:", err.message);
  }

  // Try with GPT-4 Turbo (has vision support)
  const session4 = new CapabilityAwareSession(transport, gpt4Turbo);
  try {
    await session4.send("Analyze this image", {
      attachments: [{ type: "image", url: "https://example.com/image.jpg" }]
    });
    console.log("✓ Image analysis successful with GPT-4 Turbo");
  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

// Example 3: Tool use (requires tools support)
async function example3ToolUse() {
  console.log("\nExample 3: Tool use");

  const transport = createAITransport({
    url: "https://api.example.com/chat"
  });

  const tools = [
    {
      name: "calculator",
      description: "Perform math calculations",
      parameters: { type: "object" }
    }
  ];

  // Try with o1 (no tools support)
  const sessionO1 = new CapabilityAwareSession(transport, o1Preview);
  try {
    await sessionO1.send("Calculate 2+2", { tools });
  } catch (err) {
    console.log("✓ Expected error with o1:", err.message);
  }

  // Try with GPT-4 Turbo (supports tools)
  const session4 = new CapabilityAwareSession(transport, gpt4Turbo);
  try {
    await session4.send("Calculate 2+2", { tools });
    console.log("✓ Tool use successful with GPT-4 Turbo");
  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

// Example 4: Structured output (requires structuredOutput)
async function example4StructuredOutput() {
  console.log("\nExample 4: Structured output");

  const transport = createAITransport({
    url: "https://api.example.com/chat"
  });

  const responseFormat = {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" }
      }
    }
  };

  // Try with GPT-3.5 (no structured output)
  const session35 = new CapabilityAwareSession(transport, gpt35Turbo);
  try {
    await session35.send("Extract person data", { responseFormat });
  } catch (err) {
    console.log("✓ Expected error with GPT-3.5:", err.message);
  }

  // Try with GPT-4 Turbo (supports structured output)
  const session4 = new CapabilityAwareSession(transport, gpt4Turbo);
  try {
    await session4.send("Extract person data", { responseFormat });
    console.log("✓ Structured output successful with GPT-4 Turbo");
  } catch (err) {
    console.error("✗ Error:", err.message);
  }
}

// Example 5: Smart model selection
async function example5SmartSelection() {
  console.log("\nExample 5: Smart model selection");

  // Request 1: Simple text (any model works)
  try {
    const model1 = selectBestModel("What is AI?");
    console.log("✓ For text-only: selected", model1.displayName);
  } catch (err) {
    console.error("✗ Error:", err.message);
  }

  // Request 2: Image + text (needs vision)
  try {
    const model2 = selectBestModel("Analyze this image", {
      attachments: [{ type: "image" }]
    });
    console.log("✓ For image analysis: selected", model2.displayName);
  } catch (err) {
    console.error("✗ Error:", err.message);
  }

  // Request 3: Complex reasoning (needs reasoning)
  try {
    const model3 = selectBestModel("Solve this complex problem", {
      reasoning: true
    });
    console.log("✓ For reasoning: selected", model3.displayName);
  } catch (err) {
    console.error("✗ Error:", err.message);
  }

  // Request 4: Impossible combination (no model)
  try {
    const model4 = selectBestModel("Analyze audio", {
      attachments: [{ type: "audio" }],  // audioInput not supported by any model
      reasoning: true
    });
  } catch (err) {
    console.log("✓ Expected error for audio:", err.message);
  }
}

// Example 6: UI Adaptation
function example6UIAdaptation() {
  console.log("\nExample 6: UI adaptation based on capabilities");

  function renderCapabilityUI(state) {
    const { capabilities } = state;

    const features = [];

    if (capabilities?.vision) {
      features.push("📷 Image Upload");
    }
    if (capabilities?.tools) {
      features.push("🔧 Tool Use");
    }
    if (capabilities?.structuredOutput) {
      features.push("📋 Structured Output");
    }
    if (capabilities?.reasoning) {
      features.push("🧠 Extended Reasoning");
    }
    if (capabilities?.streaming) {
      features.push("⚡ Streaming");
    }

    return features;
  }

  // Show capabilities for each model
  [gpt4Turbo, gpt35Turbo, o1Preview].forEach((model) => {
    const features = renderCapabilityUI({ capabilities: model.capabilities });
    console.log(`\n${model.displayName}:`);
    features.forEach((f) => console.log(`  ${f}`));
  });
}

// ============================================================================
// Run Examples
// ============================================================================

// Uncomment to run examples:
// await example1SimpleMessage();
// await example2ImageAnalysis();
// await example3ToolUse();
// await example4StructuredOutput();
// await example5SmartSelection();
// example6UIAdaptation();

export {
  CapabilityAwareSession,
  selectBestModel,
  gpt4Turbo,
  gpt35Turbo,
  o1Preview,
  modelRegistry
};
