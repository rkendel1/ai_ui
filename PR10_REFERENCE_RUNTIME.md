# PR10 — Reference AI Runtime + OpenAI-Compatible Adapter

## Objective

Provide a production-shaped reference implementation that connects:

```
AIWorkspace (React)
    ↓
@ai-ui/core session
    ↓
createAITransport() (HTTP)
    ↓
Reference AI Runtime (@ai-ui/runtime)
    ↓
Provider Adapter (OpenAI-compatible or Mock)
    ↓
Model
```

**The critical outcome:** A developer can clone the repo, configure one provider, run the example, and experience the entire AI UI protocol end-to-end.

---

## What's Included

### 1. @ai-ui/runtime Package

New core package (`packages/runtime/`) with:

- **Provider-neutral interface** (`AIProvider`)
- **Core runtime** (`createAIRuntime()`)
- **OpenAI-compatible adapter** (`createOpenAICompatibleProvider()`)
- **Mock provider** (`createMockProvider()`)
- **Event translator** (provider events → canonical events)

### 2. Core Runtime Features

```javascript
import { createAIRuntime } from "@ai-ui/runtime";
import { createMockProvider } from "@ai-ui/runtime/providers";

const runtime = createAIRuntime({
  provider: createMockProvider({ scenario: "full" }),
  tools: {
    get_weather: { /* ... */ },
    get_customer: { /* ... */ }
  },
  approval: "never",
  hooks: {
    onRequest: async (req) => {},
    onToolCall: async (tool) => {},
    onArtifact: async (artifact) => {},
    onError: async (error) => {},
    onComplete: async () => {}
  }
});

// Stream canonical events
for await (const event of runtime.execute({ messages: [...] })) {
  // event.type: "session.started", "message.started", "text.delta", etc.
  // event matches canonical AI_EVENT_TYPES
}
```

### 3. Provider Interface

All providers implement this interface:

```javascript
interface AIProvider {
  async *stream(request, options) {
    // Yield provider-native events
    // Runtime translates to canonical events
  }
}
```

Supports:
- Messages and history
- Tools and structured calls
- Attachments
- Streaming responses
- Structured output
- Cancellation signals

### 4. OpenAI-Compatible Adapter

Works with any OpenAI-compatible backend:

```javascript
import { createOpenAICompatibleProvider } from "@ai-ui/runtime/providers";

const provider = createOpenAICompatibleProvider({
  baseURL: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4"
});

// Also works with:
// - OpenRouter
// - vLLM
// - Ollama
// - LM Studio
// - Custom gateways
```

Automatically:
- Translates tool calls
- Normalizes error codes
- Handles streaming chunks
- Manages timeouts
- Respects cancellation signals

### 5. Mock Provider

Perfect for development and testing without API keys:

```javascript
import { createMockProvider } from "@ai-ui/runtime/providers";

const provider = createMockProvider({
  scenario: "full" // or: "simple", "streaming", "reasoning", "tool", "approval", "artifact", "error", "multi-tool"
});
```

**Scenarios:**
- `simple` - Single response
- `streaming` - Word-by-word text
- `reasoning` - Thinking before responding
- `tool` - Tool call and execution
- `approval` - Tool requiring user approval
- `artifact` - Rich content artifact
- `error` - Simulated error
- `multi-tool` - Multiple concurrent tools

### 6. Event Translation

Provider events are normalized to canonical protocol events:

```
Provider Event            Canonical Event
─────────────────────────────────────────
stream.started         → session.started
content.delta          → text.delta
reasoning.delta        → reasoning.delta
tool.call.started      → tool.call.started
tool.call.delta        → tool.call.delta
tool.call.completed    → tool.call.completed
artifact               → artifact.created
stream.error           → error.occurred
stream.completed       → (implicit) message.completed
                          session.completed
```

The UI never sees provider-native events.

### 7. Tool Execution

Tools are first-class primitives in the runtime:

```javascript
const tools = {
  get_weather: {
    name: "get_weather",
    description: "Get current weather",
    inputSchema: { /* JSON Schema */ },
    
    // Approval policy: "never", "always", function, or per-tool config
    approval: "never",
    
    // Execute tool implementation
    async execute(input, context) {
      const result = await fetchWeather(input.location);
      
      // Optionally return artifacts
      return {
        result,
        artifacts: [
          {
            type: "table",
            title: "Weather",
            content: result
          }
        ]
      };
    }
  }
};
```

### 8. Approval Workflow

Critical for safe tool execution:

```javascript
// Global approval policy
const runtime = createAIRuntime({
  provider,
  tools,
  approval: "always" // or "never", or (toolName, input) => boolean
});

// Per-tool approval
const tools = {
  send_email: {
    approval: "always"  // Always require approval
  },
  get_weather: {
    approval: "never"   // Never require approval
  },
  transfer_funds: {
    approval: async (toolName, input) => {
      // Custom logic
      return input.amount > 10000;
    }
  }
};

// Flow:
// 1. Tool call arrives
// 2. Runtime checks approval policy
// 3. If approval needed: emit tool.approval.required
// 4. Caller responds with tool.approved or tool.rejected
// 5. Runtime continues or aborts
```

### 9. Artifact Generation

Tools and runtime emit rich content:

```javascript
// From tool
return {
  result: data,
  artifacts: [
    {
      id: "customer-123",
      type: "customer",           // Custom type
      title: "Customer Details",
      content: customerData
    }
  ]
};

// Runtime emits
{
  type: "artifact.created",
  artifact: {
    id: "customer-123",
    type: "customer",
    title: "Customer Details",
    content: customerData,
    status: "created"
  }
}

// UI renders with registered custom renderer
```

### 10. Error Normalization

Provider errors become canonical error codes:

```
OpenAI 429            →  AIError { code: "rate_limit" }
OpenAI 401            →  AIError { code: "authentication_error" }
Timeout               →  AIError { code: "timeout" }
Network abort         →  AIError { code: "cancelled" }
Invalid request       →  AIError { code: "invalid_request" }
500 service error     →  AIError { code: "service_error" }
```

The UI knows nothing about provider-specific errors.

### 11. Cancellation Support

Full chain cancellation:

```javascript
const controller = new AbortController();

setTimeout(() => controller.abort(), 5000);

// In runtime.execute(request, { signal: controller.signal })
// → Cancels HTTP request
// → Stops provider stream
// → Emits error.occurred with code: "cancelled"
// → Stops event emission
```

### 12. Observability Hooks

Vendor-neutral event hooks:

```javascript
const runtime = createAIRuntime({
  provider,
  tools,
  hooks: {
    async onRequest(req) {
      console.log("Request:", req);
    },
    async onToolCall(tool) {
      console.log("Tool call:", tool.name);
    },
    async onArtifact(artifact) {
      console.log("Artifact:", artifact.type);
    },
    async onError(error) {
      console.error("Error:", error);
    },
    async onComplete() {
      console.log("Complete");
    }
  }
});

// No logging dependency, pure events
```

### 13. Reference Application

Full-stack example (`apps/reference/`):

**Backend:**
- HTTP server (Node.js)
- Runtime integration
- Tool implementations (get_weather, get_customer)
- Zero-key mode (mock provider)
- Real provider mode (OpenAI-compatible)

**Frontend:**
- HTML/CSS/JS (no framework required for demo)
- Message streaming
- Tool call display
- Artifact rendering
- Custom renderer for "customer" artifacts
- Protocol event log

**Run:** `npm run dev` (no API key needed)

### 14. Security Boundaries

Explicitly documented and tested:

- Provider credentials stay on server (never sent to client)
- Client cannotaccess provider configuration
- Transport is provider-agnostic
- Frontend can work with any runtime backend

```javascript
// Server only
const runtime = createAIRuntime({
  provider: createOpenAICompatibleProvider({
    apiKey: process.env.OPENAI_API_KEY  // Never reaches client
  })
});

// Browser sends
fetch("/api/ai", { body: JSON.stringify({ message: "..." }) });

// Browser never knows about provider or credentials
```

### 15. End-to-End Test Fixture

Golden protocol fixture (`fixtures/protocol/full-session.ndjson`):

Canonical event sequence demonstrating complete lifecycle:

```ndjson
{"type":"session.started","timestamp":1694000000000}
{"type":"message.started","messageId":"msg-1","timestamp":1694000000001}
{"type":"text.delta","messageId":"msg-1","text":"The ","timestamp":1694000000002}
{"type":"text.delta","messageId":"msg-1","text":"weather ","timestamp":1694000000003}
{"type":"tool.call.started","id":"t1","name":"get_weather","timestamp":1694000000004}
{"type":"tool.call.completed","id":"t1","output":{...},"timestamp":1694000000005}
{"type":"artifact.created","artifact":{...},"timestamp":1694000000006}
{"type":"text.delta","messageId":"msg-1","text":"is sunny.","timestamp":1694000000007}
{"type":"message.completed","messageId":"msg-1","timestamp":1694000000008}
{"type":"session.completed","timestamp":1694000000009}
```

Used by:
- Core tests
- React tests
- Web Component tests
- Runtime tests
- Transport tests
- This fixture proves every layer speaks the same protocol.

---

## Testing

### Runtime Tests

```bash
cd packages/runtime
npm test
```

Tests cover:
- Mock provider scenarios
- Event translation
- Tool execution
- Error handling
- Cancellation
- Approval workflows

### Reference App

```bash
cd apps/reference
npm run dev
```

Then in browser:
- "Get weather in San Francisco" → tool call + artifact
- "Customer details for C001" → custom renderer
- All protocol events logged in sidebar

### Zero-Key Mode

```bash
cd apps/reference
npm run dev
```

Works immediately without any API keys.

---

## Documentation

- `runtime.md` - Core runtime API reference
- `providers.md` - Provider adapter guide
- `tools.md` - Tool definition and execution
- `approvals.md` - Approval workflow patterns
- `artifacts.md` - Artifact generation and rendering
- `end-to-end.md` - Complete lifecycle walkthrough

---

## Configuration

**Mock Provider (default):**
```bash
cd apps/reference
npm run dev
```

**OpenAI:**
```bash
cd apps/reference
AI_BASE_URL=https://api.openai.com/v1 \
AI_API_KEY=sk-... \
AI_MODEL=gpt-4 \
npm run dev
```

**OpenRouter:**
```bash
AI_BASE_URL=https://openrouter.ai/api/v1 \
AI_API_KEY=... \
AI_MODEL=gpt-3.5-turbo \
npm run dev
```

**Local Ollama:**
```bash
AI_BASE_URL=http://localhost:11434/v1 \
AI_API_KEY=not-needed \
AI_MODEL=mistral \
npm run dev
```

Provider switching requires only environment variable changes. No code changes.

---

## Key Achievements

✅ **Provider Independence** - Runtime knows nothing about specific providers
✅ **Zero-Key Development** - Full feature demo with mock provider
✅ **Production-Ready** - Real provider support
✅ **End-to-End** - Complete lifecycle from UI through streaming to completion
✅ **Security** - Credentials never reach client
✅ **Extensibility** - Custom tools, renderers, approval logic
✅ **Observability** - Event hooks for monitoring
✅ **Error Handling** - Normalized error codes
✅ **Cancellation** - Full chain abort support
✅ **Protocol Fixture** - Golden reference for all implementations

---

## What This Proves

The complete AI UI protocol survives a **real AI execution lifecycle**:

1. Frontend sends message via HTTP
2. Runtime processes request
3. Provider (real or mock) streams response
4. Runtime translates events
5. Tool execution boundary respected
6. Approval workflow functions
7. Artifacts generated and rendered
8. Errors normalized
9. Cancellation propagates
10. UI updates in real-time
11. Session completes
12. Browser sees only canonical protocol events

**No layer sees provider-native details.**
**No provider implementation leaks into the protocol.**
**Every layer can be swapped without affecting others.**

This is the foundation for an AI interaction standard.
