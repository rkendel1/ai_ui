# AI UI Reference Application

End-to-end reference implementation demonstrating the complete AI UI protocol.

## Quick Start

### Zero-Key Mode (with Mock Provider)

```bash
cd apps/reference
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

No API keys required. Demonstrates:
- Streaming text responses
- Tool calls (get_weather, get_customer)
- Artifact generation
- Custom renderers
- Full protocol lifecycle

### With Real Provider (OpenAI-compatible)

```bash
cd apps/reference
AI_BASE_URL=https://api.openai.com/v1 \
AI_API_KEY=sk-... \
AI_MODEL=gpt-4 \
npm run dev
```

Supports any OpenAI-compatible backend:
- OpenAI
- OpenRouter
- vLLM
- Ollama
- LM Studio
- Custom gateways

## Architecture

```
Browser (http://localhost:3000)
    ↓ (send message to /api/ai)
Reference Server (Node.js)
    ↓ (createAIRuntime)
AI Runtime
    ↓ (provider.stream())
Provider (Mock or OpenAI-compatible)
    ↓ (streaming response)
Runtime Event Translator
    ↓ (canonical events)
HTTP Stream (NDJSON)
    ↓ (browser receives)
UI Updates
```

## Tools

The reference app includes two tools:

### get_weather

Get weather for a location.

```
User: "Get weather in San Francisco"
→ Runtime calls get_weather
→ Returns artifact with weather data
```

### get_customer

Get customer details by ID.

```
User: "Customer details for C001"
→ Runtime calls get_customer
→ Returns custom artifact (customer card)
→ Browser renders with custom renderer
```

## Protocol Flow

When you send a message, the complete event sequence is:

```
1. session.started
2. message.started
3. text.delta (x N)
4. tool.call.started
5. tool.call.completed
6. artifact.created
7. text.delta (x N)
8. message.completed
9. session.completed
```

All events are visible in the sidebar "Protocol Events" section.

## Environment Variables

- `PORT` - Server port (default: 3000)
- `AI_BASE_URL` - API provider base URL (defaults to mock mode)
- `AI_API_KEY` - API key for provider
- `AI_MODEL` - Model name

## Files

- `src/api/server.js` - HTTP server and runtime integration
- `public/index.html` - Browser UI
- `package.json` - Dependencies

## What This Demonstrates

✅ **End-to-End Protocol**: Full message → tool → artifact → completion flow
✅ **Provider Adapter**: OpenAI-compatible abstraction
✅ **Mock Provider**: Zero-key development and testing
✅ **Artifact System**: Custom renderers for rich content
✅ **Streaming**: Real-time text and events
✅ **Security**: No API keys in client code
✅ **Cancellation**: Request cancellation support
✅ **Error Handling**: Provider error normalization

## Next Steps

To extend this reference app:

1. Add more tools (database lookups, API calls, etc.)
2. Create custom artifact renderers
3. Implement tool approval workflows
4. Add structured output support
5. Wire up real provider integrations
