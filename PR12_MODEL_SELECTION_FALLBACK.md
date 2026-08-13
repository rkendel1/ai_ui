# PR12 — Model Selection + Fallback

This document explains the model selection and routing system in @ai-ui/core.

## Overview

PR12 establishes the operational model selection system:

**PR11 established**: "Can this model do what I need?" (Capability negotiation)

**PR12 establishes**: "Given what I need, which model should execute it—and what happens if it fails?" (Model selection & fallback)

The key architectural principle: **ai-ui does not become a model catalog or pricing service. It consumes model metadata and routing decisions supplied by a registry/router.**

## Core Concepts

### Model Selector

A `AIModelSelector` can be:

1. **Predefined policy** - A routing strategy name:
   - `"auto"` - Automatically select best model based on capabilities
   - `"fast"` - Select fastest available model
   - `"cheap"` - Select most cost-effective model
   - `"reasoning"` - Select model with reasoning capabilities
   - `"vision"` - Select model with vision capabilities
   - `"local"` - Select locally-running model

2. **Explicit model ID** - A specific model in format `"provider:model-id"`:
   ```javascript
   "openai:gpt-5"
   "anthropic:claude-3-opus"
   "local:llama2"
   ```

### Model Catalog Interface

A provider-neutral interface for accessing available models:

```javascript
interface AIModelCatalog {
  // List all available models
  list(): AIModel[] | Promise<AIModel[]>;
  
  // Get a specific model by ID (optional)
  get?(id: string): AIModel | undefined;
  
  // Filter models by criteria (optional)
  filter?(predicate: (model: AIModel) => boolean): AIModel[];
  
  // Get default model for a selector (optional)
  getDefault?(selector: AIModelSelector): AIModel | undefined;
}
```

## Architecture: Separation of Concerns

The selection architecture cleanly separates concerns:

```
AIRequest
    │
    ↓
Model Selector (routing/selector.ts)
    │
    ↓
Model Candidate (AIModel)
    │
    ↓
Capability Negotiation (capabilities/negotiation.ts)
    │
    ↓
AI Transport (transports/*)
    │
    ↓
AI Runtime
```

**Critical constraint**: 
- The selector does **not** execute the model
- The transport/runtime does **not** decide which model to use
- That separation is important for flexibility and testability

## Usage

### Basic Model Selection

```javascript
import { selectModel } from "@ai-ui/core/routing";

const catalog = {
  list: () => [
    createModel({
      id: "openai:gpt-4",
      provider: "openai",
      capabilities: { streaming: true, vision: true, reasoning: true }
    }),
    createModel({
      id: "anthropic:claude-3",
      provider: "anthropic",
      capabilities: { streaming: true, vision: false, reasoning: true }
    })
  ]
};

// Select using policy
const route = selectModel("auto", catalog, {
  requirements: { vision: true }
});
console.log(route.model.id); // "openai:gpt-4"
console.log(route.confidence); // 0.8
console.log(route.reason); // Selection rationale

// Select using explicit ID
const route2 = selectModel("openai:gpt-4", catalog);
console.log(route2.confidence); // 1.0 (explicit selection has highest confidence)
```

### Routing Policies

Built-in routing policies automatically evaluate models:

```javascript
import { BUILT_IN_POLICIES } from "@ai-ui/core/routing";

// Each policy has:
// - name: string
// - description: string
// - evaluate: (catalog, context) => AIRouteResult | null

// Auto policy: Smart selection based on capabilities
const autoPolicyEvaluate = BUILT_IN_POLICIES.auto.evaluate;

// Reasoning policy: Prioritize reasoning models
const reasoningResult = BUILT_IN_POLICIES.reasoning.evaluate(catalog, {
  availableModels: [...models]
});

// Vision policy: Prioritize vision-capable models
const visionResult = BUILT_IN_POLICIES.vision.evaluate(catalog, {
  requirements: { vision: true },
  availableModels: [...models]
});
```

### Model Selection with Fallback

When primary model selection fails, automatically try alternatives:

```javascript
import { executeWithFallback } from "@ai-ui/core/routing";

const result = await executeWithFallback({
  // Primary selector with fallback chain
  selector: ["auto", "fast", "cheap"],  // Try these in order
  
  // Model catalog
  catalog: myModelCatalog,
  
  // Capability requirements
  requirements: { reasoning: true, vision: true },
  
  // Function to execute with selected model
  execute: async (model) => {
    // Execute using selected model
    const session = createAISession({ model, transport });
    return session.send("Analyze this image...");
  },
  
  // Optional callbacks
  onFallback: (selector, model, error, attempt) => {
    console.log(`Fallback attempt ${attempt} with ${selector}`);
  },
  
  maxRetries: 3
});
```

### Integration with createAISession

Model selection is separate from session creation for flexibility:

```javascript
import { createAISession } from "@ai-ui/core";
import { selectModel } from "@ai-ui/core/routing";

// Step 1: Select model
const route = selectModel("auto", catalog, {
  requirements: deriveRequirements({ message: userMessage })
});

// Step 2: Create session with selected model
const session = createAISession({
  transport,
  model: route.model  // Pass selected model
});

// Step 3: Execute
const state = await session.send(userMessage);
```

## Routing Policies in Detail

### Auto Policy

Automatically selects the best model for a task:

1. If no requirements, returns first available
2. Filters by required capabilities
3. Prefers models with: reasoning > vision > general capability
4. High confidence (0.8) when suitable models found

```javascript
const route = selectModel("auto", catalog, {
  requirements: { reasoning: true, vision: false }
});
// Selects model with reasoning, returns high confidence
```

### Fast Policy

Selects fastest available model:

1. Filters by requirements
2. Looks for "fast" in model ID or uses first in list
3. Medium confidence (0.7)

```javascript
const route = selectModel("fast", catalog);
// Selects fastest model regardless of capability cost
```

### Cheap Policy

Selects most cost-effective model:

1. Filters by requirements
2. Looks for "cheap" in model ID
3. Falls back to smallest context window (cost proxy)
4. Medium-low confidence (0.6-0.7)

```javascript
const route = selectModel("cheap", catalog);
// Selects smallest/cheapest model that meets requirements
```

### Reasoning Policy

Prioritizes models with reasoning capability:

```javascript
const route = selectModel("reasoning", catalog);
// Only returns models with reasoning: true
// Highest confidence (0.9)
```

### Vision Policy

Prioritizes models with vision capability:

```javascript
const route = selectModel("vision", catalog);
// Only returns models with vision: true
// Highest confidence (0.9)
```

### Local Policy

Selects locally-running models:

```javascript
const route = selectModel("local", catalog);
// Only returns models with provider: "local"
// Highest confidence (0.9)
```

## Error Handling

The routing system provides detailed error codes:

```javascript
import { ROUTING_ERROR_CODES } from "@ai-ui/core/routing";

// NO_MODEL_SELECTED - Policy couldn't select a model
// INVALID_SELECTOR - Selector format is invalid
// NO_SUITABLE_MODEL - No model matches criteria
// MODEL_FALLBACK_EXHAUSTED - All fallback attempts failed
// CATALOG_NOT_PROVIDED - Catalog required but not supplied
// POLICY_EVALUATION_ERROR - Policy execution failed
// INVALID_POLICY - Policy doesn't exist or is malformed
```

## Custom Routing Policies

Create custom routing policies for specialized scenarios:

```javascript
import { selectModel } from "@ai-ui/core/routing";

const customPolicies = new Map();
customPolicies.set("gpu-accelerated", {
  name: "gpu-accelerated",
  description: "Select models with GPU acceleration",
  evaluate: (catalog, context) => {
    const models = context.availableModels || catalog.list();
    const gpuModels = models.filter(m => m.gpu === true);
    return gpuModels.length > 0 
      ? { model: gpuModels[0], reason: "GPU acceleration", confidence: 0.8 }
      : null;
  }
});

const route = selectModel("gpu-accelerated", catalog, {
  policies: customPolicies
});
```

## Best Practices

1. **Always provide a catalog**: Models must come from a registry/catalog, never hardcoded
2. **Derive requirements from request**: Use `deriveRequirements()` to automatically detect needs
3. **Use fallback chains**: Always provide fallback selectors for reliability
4. **Separate selection from execution**: Never mix model selection with request execution
5. **Validate model capabilities**: Check capability negotiation before execution
6. **Log selection decisions**: Use the selection result's `reason` and `confidence` for observability

## Integration with PR11 (Capabilities)

The model selection system builds on PR11's capability framework:

```javascript
import { 
  deriveRequirements,      // PR11: Determine what capabilities are needed
  negotiateCapabilities    // PR11: Check if model supports requirements
} from "@ai-ui/core";

import { 
  selectModel              // PR12: Select which model to use
} from "@ai-ui/core/routing";

// Flow:
// 1. User makes request
// 2. deriveRequirements() → determine needed capabilities
// 3. selectModel() → choose best model for requirements
// 4. negotiateCapabilities() → verify model can do it
// 5. Execute with selected model
```

## File Structure

```
packages/core/src/routing/
├── types.js          # Type definitions and interfaces
├── errors.js         # Error creation functions
├── policies.js       # Built-in routing policies
├── selector.js       # Model selection logic
├── fallback.js       # Fallback execution mechanism
└── index.js          # Public API exports
```

## API Reference

### selectModel(selector, catalog, options)

Select a model using a routing policy or explicit ID.

**Parameters:**
- `selector` (string): Policy name or explicit model ID
- `catalog` (AIModelCatalog): Model catalog
- `options` (object):
  - `requirements` (object): Capability requirements
  - `availableModels` (AIModel[]): Pre-filtered models
  - `policies` (Map): Custom routing policies

**Returns:** `AIRouteResult` - Selected model with reason and confidence

### selectModelFromCandidates(selector, candidates, options)

Select from a pre-filtered list of candidate models.

**Parameters:**
- `selector` (string): Policy name or explicit model ID
- `candidates` (AIModel[]): List of candidate models
- `options` (object): Same as selectModel

**Returns:** `AIRouteResult` - Selected model

### executeWithFallback(options)

Execute a request with automatic fallback to alternative models.

**Parameters:**
- `selector` (string|string[]): Selector or fallback chain
- `catalog` (AIModelCatalog): Model catalog
- `execute` (function): Async function receiving selected model
- `requirements` (object): Capability requirements
- `maxRetries` (number): Maximum fallback attempts (default: 3)
- `requireAllCapabilities` (boolean): Require all capabilities (default: true)
- `onFallback` (function): Callback for fallback events

**Returns:** `Promise` - Result from execute function

### buildFallbackChain(requirements)

Build an appropriate fallback chain based on requirements.

**Parameters:**
- `requirements` (object): Capability requirements

**Returns:** `string[]` - Fallback selector chain

---

**This PR turns the capability system into something operational, enabling intelligent model selection and automatic fallback strategies while maintaining clean separation of concerns.**
