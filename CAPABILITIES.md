# Capability Discovery & Model Metadata

This document explains how to use the capability discovery and model metadata system in @ai-ui/core.

## Overview

The capability system provides a way to:

1. **Define model capabilities** - What features each model supports (streaming, tools, vision, etc.)
2. **Negotiate capabilities** - Check if a model supports required features before execution
3. **Derive requirements** - Automatically determine what capabilities a request needs
4. **Report errors** - Provide clear error messages when capabilities are unsupported

The key principle: **Capabilities are metadata and contracts, not provider-specific conditionals scattered throughout the code**.

## Core Concepts

### Model Capabilities

Model capabilities describe what features a model supports:

```javascript
{
  streaming: true,           // Supports streaming responses
  tools: true,               // Supports tool/function calling
  toolChoice: true,          // Supports tool choice control
  vision: true,              // Supports image input
  audioInput: false,         // Supports audio input
  audioOutput: false,        // Supports audio output
  reasoning: true,           // Supports extended reasoning
  structuredOutput: true,    // Supports JSON schema output
  jsonMode: true,            // Supports JSON mode output
  attachments: true          // Supports file attachments
}
```

### Creating Models

Use `createModel()` to normalize and validate model metadata:

```javascript
import { createModel } from "@ai-ui/core";

const gpt4 = createModel({
  id: "gpt-4",
  provider: "openai",
  displayName: "GPT-4",
  capabilities: {
    streaming: true,
    tools: true,
    vision: true,
    reasoning: true,
    structuredOutput: true
  },
  contextWindow: 8192,
  maxOutputTokens: 4096
});
```

### Creating Providers

Use `createProviderMetadata()` to organize models by provider:

```javascript
import { createProviderMetadata } from "@ai-ui/core";

const openai = createProviderMetadata({
  id: "openai",
  name: "OpenAI",
  models: [
    {
      id: "gpt-4",
      provider: "openai",
      capabilities: {
        streaming: true,
        tools: true,
        vision: true
      }
    },
    {
      id: "gpt-3.5-turbo",
      provider: "openai",
      capabilities: {
        streaming: true,
        tools: true,
        vision: false
      }
    }
  ]
});
```

## Capability Negotiation

### Negotiating Capabilities

Use `negotiateCapabilities()` to check if a model can handle a request:

```javascript
import { negotiateCapabilities } from "@ai-ui/core";

const model = {
  id: "gpt-4",
  capabilities: {
    streaming: true,
    tools: true,
    vision: true,
    reasoning: false
  }
};

const result = negotiateCapabilities({
  requested: { tools: true, vision: true },
  available: model.capabilities
});

// Returns:
// {
//   supported: true,
//   missing: [],
//   supported_capabilities: ["tools", "vision", "streaming"]
// }
```

### Checking Individual Capabilities

```javascript
import { hasCapability, supportsAllCapabilities, supportsAnyCapability } from "@ai-ui/core";

const model = {
  capabilities: { streaming: true, tools: true, vision: false }
};

// Check single capability
hasCapability(model, "streaming");  // true
hasCapability(model, "vision");     // false

// Check multiple capabilities
supportsAllCapabilities(model, ["streaming", "tools"]);  // true
supportsAllCapabilities(model, ["streaming", "vision"]); // false

// Check if any capability is supported
supportsAnyCapability(model, ["vision", "audio"]);       // false
supportsAnyCapability(model, ["vision", "streaming"]);   // true
```

### Filtering Models

```javascript
import { filterModelsByCapabilities } from "@ai-ui/core";

const models = [
  { id: "model1", capabilities: { tools: true, vision: true } },
  { id: "model2", capabilities: { tools: false, vision: true } },
  { id: "model3", capabilities: { tools: true, vision: false } }
];

// Find models that support both tools and vision
const suitable = filterModelsByCapabilities(models, ["tools", "vision"]);
// Returns: [model1]
```

## Requirement Derivation

### Automatically Detecting Requirements

Use `deriveRequirements()` to extract what capabilities a request needs:

```javascript
import { deriveRequirements } from "@ai-ui/core";

// Request with attachments
const req1 = {
  message: "analyze this image",
  attachments: [{ type: "image", url: "..." }]
};
deriveRequirements(req1);
// Returns: { vision: true, attachments: true }

// Request with tools
const req2 = {
  message: "use the calculator",
  tools: [{ name: "calculator" }]
};
deriveRequirements(req2);
// Returns: { tools: true }

// Request with structured output
const req3 = {
  message: "get data",
  responseFormat: { type: "json_schema", schema: {...} }
};
deriveRequirements(req3);
// Returns: { structuredOutput: true }

// Request with reasoning
const req4 = {
  message: "solve this problem",
  reasoning: true
};
deriveRequirements(req4);
// Returns: { reasoning: true }
```

### Specific Requirement Checks

```javascript
import {
  requiresStreaming,
  requiresTools,
  requiresVision,
  requiresStructuredOutput,
  requiresAttachments,
  requiresReasoning
} from "@ai-ui/core";

const request = { message: "...", streaming: true };

requiresStreaming(request);      // true
requiresTools(request);           // false
requiresVision(request);          // false
requiresStructuredOutput(request); // false
requiresAttachments(request);      // false
requiresReasoning(request);        // false
```

## Runtime Integration

### Using Capabilities in Sessions

Pass a model when creating an AI session:

```javascript
import { createAISession, createModel } from "@ai-ui/core";
import { createAITransport } from "@ai-ui/core";

const model = createModel({
  id: "gpt-4",
  provider: "openai",
  capabilities: {
    streaming: true,
    tools: true,
    vision: false
  }
});

const transport = createAITransport({
  url: "https://api.example.com/chat"
});

const session = createAISession({
  transport,
  model  // Include model in session
});
```

### Session State with Capabilities

The session state includes model and capabilities:

```javascript
const state = session.getState();

console.log(state.model);
// {
//   id: "gpt-4",
//   provider: "openai",
//   capabilities: { streaming: true, tools: true, vision: false }
// }

console.log(state.capabilities);
// { streaming: true, tools: true, vision: false }
```

### Capability Validation on Send

The runtime automatically validates capabilities:

```javascript
// This works - vision not required
await session.send({
  message: "Hello",
  tools: [{ name: "search" }]
});

// This fails - model doesn't support vision
try {
  await session.send({
    message: "Analyze this image",
    attachments: [{ type: "image" }]
  });
} catch (err) {
  console.error(err);
  // Error: Model does not support required capability: vision
  
  const state = session.getState();
  console.log(state.error);
  // {
  //   code: "capability_unsupported",
  //   message: "Model does not support required capability: vision",
  //   missing: ["vision"],
  //   model: "gpt-4",
  //   provider: "openai"
  // }
}
```

## Error Handling

### Canonical Error Codes

```javascript
import { ERROR_CODES } from "@ai-ui/core";

console.log(ERROR_CODES);
// {
//   CAPABILITY_UNSUPPORTED: "capability_unsupported",
//   INVALID_CAPABILITIES: "invalid_capabilities",
//   CAPABILITY_NEGOTIATION_FAILED: "capability_negotiation_failed",
//   MODEL_NOT_FOUND: "model_not_found",
//   PROVIDER_NOT_FOUND: "provider_not_found"
// }
```

### Creating Capability Errors

```javascript
import {
  createCapabilityError,
  createCapabilityNegotiationError,
  createModelNotFoundError
} from "@ai-ui/core";

// Single capability error
const error1 = createCapabilityError("vision", "gpt-3.5", "openai");
// {
//   code: "capability_unsupported",
//   message: 'Model "gpt-3.5" from provider "openai" does not support capability: vision',
//   capability: "vision",
//   model: "gpt-3.5",
//   provider: "openai"
// }

// Multiple capabilities error
const error2 = createCapabilityNegotiationError(
  ["vision", "audio"],
  "gpt-3.5",
  "openai"
);
// {
//   code: "capability_negotiation_failed",
//   message: 'Model "gpt-3.5" is missing capabilities: vision, audio',
//   missing: ["vision", "audio"],
//   model: "gpt-3.5",
//   provider: "openai"
// }

// Model not found error
const error3 = createModelNotFoundError("gpt-5", "openai");
// {
//   code: "model_not_found",
//   message: 'Model "gpt-5" not found for provider "openai"',
//   model: "gpt-5",
//   provider: "openai"
// }
```

## Practical Examples

### Complete Flow

```javascript
import {
  createModel,
  createAISession,
  deriveRequirements,
  negotiateCapabilities,
  createAITransport
} from "@ai-ui/core";

// 1. Define your model
const claude = createModel({
  id: "claude-3",
  provider: "anthropic",
  capabilities: {
    streaming: true,
    tools: true,
    vision: true,
    reasoning: false,
    structuredOutput: true
  }
});

// 2. Create transport and session
const transport = createAITransport({
  url: "https://api.anthropic.com/v1/messages"
});

const session = createAISession({
  transport,
  model: claude
});

// 3. Handle user requests with capability awareness
async function handleRequest(userInput, options = {}) {
  try {
    // The runtime will automatically:
    // - Derive requirements from the request
    // - Negotiate capabilities
    // - Throw error if unsupported
    // - Otherwise execute the request
    
    await session.send({
      message: userInput,
      ...options
    });
  } catch (err) {
    if (err.message.includes("capability")) {
      // Handle capability error gracefully
      console.log(`This model doesn't support: ${err.missing?.join(", ")}`);
      // Provide fallback or ask user to use different model
    } else {
      throw err;
    }
  }
}

// 4. Use it
await handleRequest("Hello!");
await handleRequest("Analyze this", { 
  attachments: [{ type: "image" }] 
}); // Works - vision supported
```

### UI Adaptation

```javascript
// Adapt UI based on model capabilities
function renderUI(sessionState) {
  const { capabilities } = sessionState;
  
  return (
    <div>
      {capabilities?.vision && <ImageUploadButton />}
      {capabilities?.tools && <ToolSelector />}
      {capabilities?.structuredOutput && <DataExportButton />}
      {capabilities?.streaming && <StreamingIndicator />}
    </div>
  );
}

// Subscribe to capability changes
session.subscribe((state) => {
  renderUI(state);
});
```

## API Reference

### Types

- `AIModelCapabilities` - Capability flags
- `AIModel` - Model metadata with capabilities
- `AIProviderMetadata` - Provider info with models
- `NegotiationResult` - Result of capability negotiation

### Functions

- `createCapabilities(partial)` - Create normalized capabilities
- `createModel(model)` - Create normalized model
- `createProviderMetadata(metadata)` - Create normalized provider
- `negotiateCapabilities(options)` - Check capability support
- `hasCapability(model, capability)` - Check single capability
- `supportsAllCapabilities(model, required)` - Check multiple capabilities
- `supportsAnyCapability(model, capabilities)` - Check any capability
- `filterModelsByCapabilities(models, required)` - Filter model list
- `deriveRequirements(request)` - Extract requirements from request
- `requiresStreaming/Tools/Vision/...` - Check specific requirements

### Error Functions

- `createCapabilityError()` - Single capability error
- `createCapabilityNegotiationError()` - Multiple capabilities error
- `createInvalidCapabilitiesError()` - Validation error
- `createModelNotFoundError()` - Model not found error
- `createProviderNotFoundError()` - Provider not found error

## Best Practices

1. **Define capabilities explicitly** - Always declare what your model can do
2. **Check before using features** - Use negotiation to validate capabilities
3. **Derive requirements automatically** - Let the system figure out what's needed
4. **Handle errors gracefully** - Provide fallbacks for unsupported capabilities
5. **Use canonical errors** - Check error codes rather than message text
6. **Adapt UI to capabilities** - Show/hide features based on model support

## No Silent Degradation

The system never silently drops features. Examples:

**Bad (silent degradation):**
```javascript
// Image is attached but model doesn't support vision
// Image silently disappears
```

**Correct (explicit error):**
```javascript
// Image is attached but model doesn't support vision
// System throws capability error
// UI handles error and asks user to select different model
```

This ensures data integrity and prevents confusing behavior.
