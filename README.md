# AI UI

AI interaction primitives for every web app.

One component for chat. A universal protocol for AI interactions. Beautiful defaults, complete control, and no dependency on a particular AI provider or framework.

## Packages

- `@ai-ui/core` — provider-neutral interaction protocol and headless runtime
- `@ai-ui/web` — framework-independent Web Components

## Quick Start

### Web Component

```html
<script type="module" src="@ai-ui/web"></script>
<ai-chat></ai-chat>
<ai-composer slot="composer"></ai-composer>
```

### With a Transport

```javascript
import { createAISession } from "@ai-ui/core";
import { defineAIChatElement } from "@ai-ui/web";

// Define the components
defineAIChatElement();

// Create a session with your transport
const session = createAISession({
  transport: myTransport,
  context: { userId: "user-123" }
});

// Connect it to the UI
document.querySelector("ai-chat").session = session;

// Send a message
await session.send("Hello!");
```

### Headless API

Don't want the UI? Use the protocol directly:

```javascript
import { createAISession } from "@ai-ui/core";

const session = createAISession({ transport });

session.subscribe((state) => {
  console.log("Status:", state.status);
  console.log("Messages:", state.messages);
  console.log("Active tools:", state.activeToolCalls);
});

await session.send("Ask me anything");
```

## Features

### User Experience

- ✅ Streaming responses with incremental token rendering
- ✅ Markdown, code blocks, and syntax highlighting
- ✅ Reasoning state with expandable details
- ✅ Tool call visibility and lifecycle tracking
- ✅ Error handling with automatic retry
- ✅ Empty state with customizable suggestions
- ✅ Intelligent auto-scroll behavior
- ✅ Responsive design

### Accessibility

- ✅ ARIA labels and live regions
- ✅ Keyboard navigation (Enter to send, Shift+Enter for newline)
- ✅ Focus management
- ✅ Screen reader support
- ✅ Reduced motion support

### Customization

- ✅ CSS design tokens for complete styling control
- ✅ Light/dark mode support via `prefers-color-scheme`
- ✅ Named slots for header and footer
- ✅ Custom event system

### Developer Experience

- ✅ No provider lock-in
- ✅ Framework-agnostic Web Components
- ✅ Zero dependencies in `@ai-ui/web`
- ✅ Clean separation of concerns (core/web boundary)

## Component API

### `<ai-chat>`

Main chat interface Web Component.

**Attributes:**
```html
<ai-chat 
  placeholder="Ask me anything..."
  disabled="false"
  show-reasoning="true"
  show-tools="true">
</ai-chat>
```

**Methods:**
```javascript
const chat = document.querySelector("ai-chat");

// Set or change the session
chat.session = session;

// Send a message programmatically
await chat.send("Hello!");

// Retry the last message
await chat.retry();

// Cancel ongoing operations
chat.cancel();

// Clear all messages
chat.clear();

// Control approvals
chat.approve(toolCallId);
chat.reject(toolCallId);
```

**Events:**
```javascript
chat.addEventListener("ai-submit", (e) => {
  console.log("User message:", e.detail.message);
});

chat.addEventListener("ai-response-start", () => {
  console.log("AI started responding");
});

chat.addEventListener("ai-response-complete", () => {
  console.log("AI finished");
});

chat.addEventListener("ai-error", (e) => {
  console.log("Error:", e.detail.error);
});

chat.addEventListener("ai-tool-start", (e) => {
  console.log("Tool called:", e.detail.toolCall.name);
});

chat.addEventListener("ai-approval-required", (e) => {
  console.log("Approval needed for:", e.detail.toolCallId);
});
```

### `<ai-composer>`

Multiline message input component.

**Methods:**
```javascript
const composer = document.querySelector("ai-composer");

// Get or set the current text
console.log(composer.value);
composer.value = "Prefilled message";

// Focus the input
composer.focus();

// Clear the input
composer.clear();
```

**Events:**
```javascript
composer.addEventListener("ai-composer-submit", (e) => {
  console.log("Submit:", e.detail.message);
});

composer.addEventListener("ai-composer-input", (e) => {
  console.log("Input:", e.detail.value);
});
```

## Styling

### Design Tokens

Customize the appearance with CSS custom properties:

```css
ai-chat {
  --ai-font-family: system-ui;
  --ai-radius-sm: 6px;
  --ai-radius-md: 10px;
  --ai-radius-lg: 16px;
  --ai-space-1: 4px;
  --ai-space-2: 8px;
  --ai-space-3: 12px;
  --ai-space-4: 16px;
  
  /* Colors */
  --ai-surface: #ffffff;
  --ai-surface-muted: #f9fafb;
  --ai-surface-hover: #f3f4f6;
  --ai-text: #111827;
  --ai-text-muted: #6b7280;
  --ai-border: #e5e7eb;
  --ai-accent: #3b82f6;
  --ai-error: #ef4444;
  --ai-success: #10b981;
}

@media (prefers-color-scheme: dark) {
  ai-chat {
    --ai-surface: #1f2937;
    --ai-surface-muted: #111827;
    --ai-text: #f3f4f6;
    --ai-text-muted: #9ca3af;
    --ai-border: #374151;
  }
}
```

### Shadow DOM Parts

Target component internals with `::part()`:

```css
ai-chat::part(messages-container) {
  background: custom-color;
}

ai-chat::part(error-banner) {
  border: 2px solid red;
}

ai-chat::part(empty-state) {
  text-align: center;
}
```

## Protocol-first Architecture

`@ai-ui/core` exposes a canonical event stream (`AIEvent`) that the UI can render independent of provider:

### Events

- `session.started` — Session initialized
- `message.started` — Assistant message began
- `text.delta` — Text chunk arrived
- `reasoning.delta` — Reasoning state update
- `tool.call.started` — Tool invocation began
- `tool.call.delta` — Tool input assembled
- `tool.call.completed` — Tool returned result
- `tool.approval.required` — Awaiting user authorization
- `artifact.created` — Structured output created
- `citation.added` — Source attribution
- `message.completed` — Message finished streaming
- `error.occurred` — Error in protocol
- `session.completed` — Session ended

### Transport Interface

Implement this interface to connect any AI provider:

```typescript
interface AITransport {
  send(request: AIRequest): AsyncIterable<AIEvent>;
}

interface AIRequest {
  message: string;
  context?: Record<string, unknown>;
  tools?: Record<string, unknown>[];
  signal?: AbortSignal;
}
```

### Example: OpenAI Transport (Pseudo-code)

```javascript
const transport = {
  async *send({ message, context, tools, signal }) {
    yield { type: "session.started", sessionId: crypto.randomUUID() };
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
      stream: true,
      signal
    });

    yield { type: "message.started", messageId: crypto.randomUUID() };

    for await (const chunk of response) {
      if (signal?.aborted) break;
      
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        yield { type: "text.delta", messageId: messageId, text };
      }
    }

    yield { type: "message.completed", messageId: messageId };
    yield { type: "session.completed" };
  }
};
```

## No Provider Dependencies

This package contains **zero** imports from:
- OpenAI
- Anthropic
- Google
- Any AI provider

The Web Components layer knows nothing about your backend. Your transport is responsible for that. This separation is core to the design.

## Playground

Try the interactive playground:

```bash
# Start a local server and open apps/playground/index.html
npx http-server apps/playground
```

The playground demonstrates:
- Streaming responses
- Markdown rendering
- Code blocks
- Tool calls
- Reasoning UI
- Error handling
- Auto-scroll
- All UI states

## Testing

Run the test suite:

```bash
npm test
```

This runs tests for:
- Protocol compliance
- Runtime state management
- Web Component functionality
- Integration scenarios
- Accessibility features
