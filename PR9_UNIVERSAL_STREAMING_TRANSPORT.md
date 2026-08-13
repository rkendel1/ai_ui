# PR9 — Universal HTTP Streaming Transport

## Objective

Establish the production transport boundary by providing a universal HTTP streaming transport. This enables any adopter to easily connect a session to a backend without having to implement their own transport layer.

**The Problem:** Every adopter still had to invent their own way to get a session connected to a backend.

**The Solution:** `createAITransport()` - a single function that handles all HTTP streaming details.

## What's Included

### 1. `createAITransport(endpoint, options)`

A universal HTTP streaming transport factory that works with any HTTP-based AI backend.

```javascript
import { createAITransport } from "@ai-ui/core/transports";
import { useAISession } from "@ai-ui/react";

// Simple usage
const transport = createAITransport("/api/ai");
const { session, state } = useAISession({ transport });

// Advanced usage
const transport = createAITransport("https://api.example.com/chat", {
  format: "sse",
  timeout: 60000,
  headers: { "Authorization": "******" },
  transformRequest: (req) => ({ ...req, model: "gpt-4" }),
  transformEvent: (evt) => evt
});
```

### 2. Streaming Formats

The transport supports two streaming formats for maximum compatibility:

#### Newline-Delimited JSON (NDJSON) - Default

```javascript
const transport = createAITransport("/api/ai");
// or explicitly:
const transport = createAITransport("/api/ai", { format: "ndjson" });
```

**Expected backend response format:**
```
{"type":"session.started"}
{"type":"message.started","messageId":"m1"}
{"type":"text.delta","messageId":"m1","text":"Hello"}
{"type":"message.completed","messageId":"m1"}
{"type":"session.completed"}
```

Each line must be a complete JSON object representing an event. Empty lines are ignored.

#### Server-Sent Events (SSE)

```javascript
const transport = createAITransport("/api/ai", { format: "sse" });
```

**Expected backend response format:**
```
event: session.started
data: {"type":"session.started"}

data: {"type":"message.started","messageId":"m1"}

event: text.delta
data: {"type":"text.delta","messageId":"m1","text":"Hello"}

event: message.completed
data: {"type":"message.completed","messageId":"m1"}

event: session.completed
data: {"type":"session.completed"}
```

Supports standard SSE fields: `event`, `data`, `id`, and `retry`.

## Architecture

### Transport Boundary

```
        Client Application
              ↓
    ┌─────────────────────┐
    │   React/Web/etc     │  Framework adapters
    │  (useAISession,     │
    │   AIWorkspace)      │
    └─────────────────────┘
              ↓
    ┌─────────────────────┐
    │  createAISession    │  Core session runtime
    │   (protocol)        │
    └─────────────────────┘
              ↓
    ┌─────────────────────┐ ← TRANSPORT BOUNDARY (PR9)
    │  Transport Layer    │
    │ createAITransport   │
    └─────────────────────┘
              ↓
         HTTP/HTTPS
              ↓
    Backend API Server
  (Any AI provider/platform)
```

### Request/Response Flow

**Client Request (HTTP POST):**
```javascript
POST /api/ai
Content-Type: application/json

{
  "message": "What is quantum computing?",
  "context": { "userId": "user-123", "sessionId": "s-456" },
  "tools": [
    { "name": "search", "description": "Search the web" },
    { "name": "calculate", "description": "Perform math" }
  ]
}
```

**Server Response (Streaming):**
Events streamed as either NDJSON or SSE, using the protocol events from `@ai-ui/core/protocol`:

```javascript
// Each event follows the AI_EVENT_TYPES structure
{
  type: "session.started",        // or any AI_EVENT_TYPES value
  messageId?: string,              // varies by event type
  text?: string,                   // varies by event type
  // ... other event-specific fields
}
```

## Configuration Options

```javascript
createAITransport(endpoint, {
  // Response format: "ndjson" (default) or "sse"
  format: "ndjson",

  // Request timeout in milliseconds (default: 30000 = 30s)
  timeout: 30000,

  // Custom headers sent with every request
  headers: {
    "Authorization": "******",
    "X-Custom-Header": "value"
  },

  // Transform request before sending
  transformRequest: (request) => {
    return {
      ...request,
      model: "gpt-4",  // Add custom fields
      temperature: 0.7
    };
  },

  // Transform events after receiving
  transformEvent: (event) => {
    return {
      ...event,
      // Modify events if needed
    };
  }
});
```

## Usage Examples

### Basic Chat Example

```javascript
import { createAITransport } from "@ai-ui/core/transports";
import { useAISession } from "@ai-ui/react";

export default function ChatApp() {
  const { session, state, send } = useAISession({
    transport: createAITransport("/api/ai")
  });

  const handleSend = async (message) => {
    await send(message);
  };

  return (
    <div>
      <div className="messages">
        {state.messages.map(msg => (
          <div key={msg.id} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      <input 
        onSend={handleSend}
        disabled={state.status === "streaming"}
      />
    </div>
  );
}
```

### With Authentication

```javascript
const transport = createAITransport("/api/ai", {
  headers: {
    "Authorization": `******
  }
});

const { session } = useAISession({ transport });
```

### Custom Transformations

```javascript
const transport = createAITransport("/api/ai", {
  // Add model specification
  transformRequest: (req) => ({
    ...req,
    model: "gpt-4-turbo",
    max_tokens: 2000
  }),

  // Post-process events
  transformEvent: (event) => {
    // Add timestamps or modify content
    return {
      ...event,
      timestamp: new Date().toISOString()
    };
  }
});
```

### With Context and Tools

```javascript
const { session, state, send } = useAISession({
  transport: createAITransport("/api/ai"),
  context: {
    userId: "user-123",
    organizationId: "org-456",
    locale: "en-US"
  },
  tools: [
    {
      name: "search",
      description: "Search the knowledge base",
      schema: { /* ... */ }
    },
    {
      name: "calculate",
      description: "Perform calculations",
      schema: { /* ... */ }
    }
  ]
});
```

### Headless Integration

```javascript
import { createAISession } from "@ai-ui/core/runtime";
import { createAITransport } from "@ai-ui/core/transports";

const transport = createAITransport("https://api.example.com/chat");
const session = createAISession({ transport });

session.subscribe((state) => {
  console.log("Status:", state.status);
  console.log("Messages:", state.messages.length);
  console.log("Active tools:", state.activeToolCalls.length);
});

await session.send("Hello!");
```

## Protocol

### Events

The transport expects events following the `AI_EVENT_TYPES` from `@ai-ui/core/protocol`:

```javascript
import { AI_EVENT_TYPES, CANONICAL_EVENT_SEQUENCE } from "@ai-ui/core/protocol";

// Available event types:
// - session.started
// - message.started
// - text.delta
// - reasoning.delta
// - tool.call.started
// - tool.call.delta
// - tool.call.completed
// - tool.approval.required
// - tool.approved
// - tool.rejected
// - artifact.created
// - artifact.updated
// - artifact.completed
// - artifact.failed
// - citation.added
// - message.completed
// - error.occurred
// - session.completed
```

### Request Format

```typescript
interface TransportRequest {
  message: string;           // User message
  context?: Record<string, any>;  // Optional context
  tools?: Array<{            // Optional tools
    name: string;
    description: string;
    schema?: any;
  }>;
  signal: AbortSignal;       // For cancellation
}
```

### Response Format

Events can be streamed as:

1. **NDJSON**: One JSON event per line
2. **SSE**: Standard Server-Sent Events format

Both formats produce the same event objects following `AI_EVENT_TYPES`.

## Error Handling

The transport emits error events when issues occur:

```javascript
for await (const event of transport.send(request)) {
  if (event.type === "error.occurred") {
    console.error("Transport error:", event.message);
    // Handle error...
  }
}
```

Common errors:

- **Network errors** - Fetch fails (invalid domain, CORS, etc.)
- **HTTP errors** - Server returns 4xx/5xx status
- **JSON parse errors** - Invalid event JSON (logged to console, stream continues)
- **Timeout** - Request exceeds configured timeout

## Backend Implementation

Backends can implement the transport endpoint in any language. Here are the key requirements:

### Endpoint Requirements

1. **Accept POST requests** with JSON body containing `message`, `context`, and `tools`
2. **Stream responses** as either NDJSON or SSE
3. **Emit events** that match the `AI_EVENT_TYPES` protocol
4. **Use async/await-friendly format** (streaming lines or events)

### Example Node.js/Express Backend

```javascript
import express from "express";

app.post("/api/ai", async (req, res) => {
  const { message, context, tools } = req.body;

  // Set response headers for streaming
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    // Emit events as NDJSON
    res.write(JSON.stringify({ type: "session.started" }) + "\n");
    res.write(JSON.stringify({ type: "message.started", messageId: "m1" }) + "\n");

    // Stream from AI provider
    const stream = await yourAIProvider.streamChat(message, { context, tools });
    
    for await (const chunk of stream) {
      res.write(JSON.stringify({
        type: "text.delta",
        messageId: "m1",
        text: chunk.text
      }) + "\n");
    }

    res.write(JSON.stringify({ type: "message.completed", messageId: "m1" }) + "\n");
    res.write(JSON.stringify({ type: "session.completed" }) + "\n");
    res.end();
  } catch (error) {
    res.write(JSON.stringify({
      type: "error.occurred",
      message: error.message,
      code: "INTERNAL_ERROR"
    }) + "\n");
    res.end();
  }
});
```

### Example Python/FastAPI Backend

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

app = FastAPI()

@app.post("/api/ai")
async def chat(request: dict):
    async def generate():
        yield json.dumps({"type": "session.started"}) + "\n"
        yield json.dumps({"type": "message.started", "messageId": "m1"}) + "\n"
        
        # Stream from AI provider
        async for chunk in ai_provider.stream_chat(request["message"]):
            yield json.dumps({
                "type": "text.delta",
                "messageId": "m1",
                "text": chunk.text
            }) + "\n"
        
        yield json.dumps({"type": "message.completed", "messageId": "m1"}) + "\n"
        yield json.stringify({"type": "session.completed"}) + "\n"
    
    return StreamingResponse(generate(), media_type="application/x-ndjson")
```

## Compatibility

- ✅ Works with any HTTP-based AI backend
- ✅ Supports HTTP/1.1 streaming
- ✅ Browser and Node.js compatible
- ✅ Works with fetch API (widely supported)
- ✅ Handles timeouts and cancellations
- ✅ Recovers from network errors gracefully

## Testing

The transport can be tested with mock backends:

```javascript
import test from "node:test";
import { createAITransport } from "@ai-ui/core/transports";

test("custom transport", async () => {
  // Mock fetch
  global.fetch = async () => {
    const events = [
      { type: "session.started" },
      { type: "message.started", messageId: "m1" },
      { type: "text.delta", messageId: "m1", text: "Test" },
      { type: "message.completed", messageId: "m1" },
      { type: "session.completed" }
    ];
    
    return new Response(
      events.map(e => JSON.stringify(e)).join("\n")
    );
  };

  const transport = createAITransport("/api/ai");
  const events = [];
  for await (const event of transport.send({})) {
    events.push(event);
  }
  
  assert.strictEqual(events.length, 5);
});
```

## Breaking Changes

None. This PR is purely additive:
- New `@ai-ui/core/transports` export
- New `createAITransport` function
- All existing APIs remain unchanged
- Fully backward compatible

## Files Added

- `packages/core/src/transports/createAITransport.js` - Transport implementation
- `packages/core/src/transports/index.js` - Transports exports
- `packages/core/test/transports.test.js` - Comprehensive tests
- `PR9_UNIVERSAL_STREAMING_TRANSPORT.md` - This documentation

## Files Modified

- `packages/core/src/index.js` - Export `createAITransport`
- `packages/core/package.json` - Add `./transports` export

## Summary

PR9 delivers the universal HTTP streaming transport, establishing the production transport boundary. Adopters can now easily connect to any HTTP-based AI backend with a single, well-defined API:

```javascript
const { session } = useAISession({
  transport: createAITransport("/api/ai")
});
```

Key achievements:
✅ Simple, universal transport factory
✅ Support for NDJSON and Server-Sent Events
✅ Handles errors, timeouts, and cancellations
✅ Works with any HTTP-based backend
✅ Request/response transformation hooks
✅ Comprehensive test coverage
✅ Clear backend integration guide
✅ Zero breaking changes
✅ Ready for production use

The transport completes the picture: UI (Web Components/React) + Protocol + Session + Transport = Production-ready AI interaction framework.
