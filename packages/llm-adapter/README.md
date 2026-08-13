# @ai-ui/llm-adapter

Integration adapter for external LLM model registries with @ai-ui/core.

This adapter bridges the gap between external model intelligence systems (like the `llm` package) and the ai-ui core, normalizing model metadata into a canonical format while preserving external metadata without contaminating core semantics.

## Installation

```bash
npm install @ai-ui/llm-adapter
```

## Quick Start

```javascript
import { createLLMCatalog, createLLMRouter } from "@ai-ui/llm-adapter";
import { createAISession } from "@ai-ui/core/runtime";
import { selectModel } from "@ai-ui/core/routing";

// 1. Create a catalog from your external registry
const catalog = createLLMCatalog({
  registry: {
    list: async () => {
      // Return models from your external registry
      return [
        {
          id: "openai:gpt-4",
          provider: "openai",
          capabilities: { streaming: true, vision: true },
          contextWindow: 8192
        }
      ];
    }
  }
});

// 2. Use the catalog with model selection
const route = await selectModel("auto", catalog);
console.log(`Selected model: ${route.model.id}`);

// 3. Create a router for intelligent model routing
const router = createLLMRouter({ catalog });
const selectedModel = await router.route({ selector: "vision" });

// 4. Use with AI sessions
const session = createAISession({
  transport: myTransport,
  model: selectedModel.model
});

await session.send("Analyze this image...");
```

## Features

### 1. Catalog Adapter (`createLLMCatalog`)

Adapts any external model registry into an `AIModelCatalog`:

```javascript
const catalog = createLLMCatalog({
  registry: myExternalRegistry,
  defaultProvider: "openai",
  cache: true  // Enable model caching
});

// List all models
const models = await catalog.list();

// Get specific model by ID
const model = await catalog.get("openai:gpt-4");

// Filter models
const visionModels = await catalog.filter(m => m.capabilities.vision);

// Get default model for selector
const fastModel = await catalog.getDefault("fast");

// Invalidate cache
catalog.invalidateCache();
```

### 2. Router Adapter (`createLLMRouter`)

Intelligent routing with fallback support:

```javascript
const router = createLLMRouter({
  catalog,
  onRoute: ({ route, selector, source }) => {
    console.log(`Routed to ${route.model.id} using ${selector}`);
  },
  onFallback: ({ selector, error, attempt }) => {
    console.log(`Fallback attempt ${attempt} with ${selector} failed`);
  }
});

// Route with auto-selection
const result = await router.route({ selector: "auto" });

// Route with capability requirements
const result = await router.route({
  selector: "auto",
  requirements: { vision: true, reasoning: true }
});

// Route with fallback chain
const result = await router.route({
  selector: "vision",
  fallbackChain: ["vision", "reasoning", "auto"]
});

// Convenience methods
const model = await router.getModel("openai:gpt-4");
const allModels = await router.listModels();
const recommended = await router.getRecommendedModel("cheap");
```

### 3. Model Normalization

The adapter handles various external model formats and normalizes them:

```javascript
import {
  normalizeModel,
  normalizeModels,
  normalizeCapabilities,
  extractProvider,
  extractContextWindow
} from "@ai-ui/llm-adapter";

// Normalize a single model from any format
const normalized = normalizeModel({
  model_id: "llama2",
  provider_name: "meta",
  supports_streaming: true,
  max_context_tokens: 4096
});

// Normalize multiple models
const models = normalizeModels([...]);

// Just normalize capabilities
const caps = normalizeCapabilities({
  supports_streaming: true,
  supportsVision: true
});
```

### 4. Metadata Preservation

External metadata is preserved without contaminating core semantics:

```javascript
const model = await catalog.get("openai:gpt-4");

console.log(model.id);              // "openai:gpt-4"
console.log(model.provider);        // "openai"
console.log(model.capabilities);    // { streaming: true, ... }
console.log(model.metadata);        // { pricing: {...}, beta: true, ... }
```

## Supported External Formats

The adapter automatically normalizes various external model formats:

### Standard Format
```javascript
{
  id: "provider:model-id",
  provider: "provider-name",
  displayName: "Display Name",
  capabilities: { streaming: true, vision: true },
  contextWindow: 8192,
  maxOutputTokens: 4096
}
```

### Snake_case Format
```javascript
{
  model_id: "provider:model-id",
  provider_name: "provider-name",
  supports_streaming: true,
  max_context_tokens: 8192,
  max_output_tokens: 4096
}
```

### Mixed Format
```javascript
{
  id: "provider:model-id",
  provider: "provider-name",
  supportsStreaming: true,
  supportsVision: true,
  contextWindow: 8192
}
```

### Root-level Capabilities
```javascript
{
  id: "provider:model-id",
  provider: "provider-name",
  streaming: true,
  vision: true,
  reasoning: true
}
```

## Capability Mappings

The adapter supports various external capability names:

| External Names | Mapped To |
|---|---|
| `streaming`, `supports_streaming`, `stream` | `streaming` |
| `tools`, `supports_tools`, `function_calling` | `tools` |
| `vision`, `supports_vision`, `image_input` | `vision` |
| `reasoning`, `supports_reasoning` | `reasoning` |
| `audioInput`, `supports_audio_input` | `audioInput` |
| `audioOutput`, `supports_audio_output` | `audioOutput` |
| `structuredOutput`, `json_schema` | `structuredOutput` |
| `jsonMode`, `json_mode` | `jsonMode` |
| `attachments`, `file_support` | `attachments` |

## Error Handling

```javascript
import { ADAPTER_ERROR_CODES, LLMAdapterError } from "@ai-ui/llm-adapter";

try {
  const catalog = createLLMCatalog({ registry: null });
} catch (error) {
  if (error instanceof LLMAdapterError) {
    console.log(error.code);     // ADAPTER_ERROR_CODES.INVALID_REGISTRY
    console.log(error.context);  // Additional context
  }
}
```

## Integration with @ai-ui/core

The adapter is designed to work seamlessly with core ai-ui features:

```javascript
import { selectModel, BUILT_IN_POLICIES } from "@ai-ui/core/routing";
import { deriveRequirements } from "@ai-ui/core/capabilities";

// Detect requirements from user message
const requirements = deriveRequirements({
  message: "Analyze this image using advanced reasoning"
});

// Select best model for requirements
const route = selectModel("auto", catalog, { requirements });

// Create session with selected model
const session = createAISession({
  transport,
  model: route.model
});
```

## Architecture

```
External LLM Registry
        ↓
   @ai-ui/llm-adapter
   ├─ createLLMCatalog()    → normalizes registry
   ├─ createLLMRouter()     → intelligent routing
   └─ normalizeModel()      → converts formats
        ↓
   AIModelCatalog (interface)
        ↓
   @ai-ui/core
   ├─ selectModel()         → model selection
   ├─ capabilities          → capability negotiation
   └─ createAISession()     → runtime session
        ↓
   Transport Layer
```

## Best Practices

1. **Always cache models** - Set `cache: true` (default) to avoid repeated registry calls
2. **Handle async registries** - The adapter supports both sync and async registry methods
3. **Use fallback chains** - Provide multiple selectors for robustness
4. **Preserve metadata** - External metadata is automatically preserved without core contamination
5. **Validate external formats** - The adapter handles various formats, but consistent formats are recommended

## License

Same as @ai-ui/core
