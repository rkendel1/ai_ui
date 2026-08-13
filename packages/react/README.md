# @ai-ui/react

React bindings and framework adapter for the ai-ui platform.

## Design Principles

**React is an adapter, not the source of truth.**

- No AI state is duplicated in React
- The session object remains the single source of truth
- React components subscribe to session state efficiently using `useSyncExternalStore`
- Both Web Components and React components render the same underlying state

## Installation

```bash
npm install @ai-ui/react react@18+
```

## Quick Start

```jsx
import {
  AIWorkspace,
  useAISession,
  AIChat,
  AIComposer,
} from "@ai-ui/react";

function App() {
  const { session, state } = useAISession({
    transport: myTransport,
  });

  return (
    <AIWorkspace
      session={session}
      state={state}
      layout="default"
      showArtifacts
      showToolActivity
    />
  );
}
```

## Core Hooks

### `useAISession(options)`

Creates and manages an AI session with lifecycle management.

**Options:**
- `transport` (required): Transport implementation with `send(request)` method
- `context`: Context data to send with requests
- `tools`: Array of tool definitions

**Returns:**
```javascript
{
  session,      // The session object
  state,        // Current session state
  send,         // Send a message
  cancel,       // Cancel current operation
  retry,        // Retry the last message
  clear         // Clear all messages
}
```

**Example:**
```jsx
const { send, state, cancel } = useAISession({
  transport: mockTransport,
  context: { userId: "123" },
});

await send("Analyze this data");
if (state.status === "streaming") {
  cancel();
}
```

### `useAIState(session)`

Subscribe to session state using React's external store mechanism.

This hook enables efficient re-renders only when the session state changes.

**Parameters:**
- `session`: The AI session object

**Returns:** Current session state

**Example:**
```jsx
function DebugPanel({ session }) {
  const state = useAIState(session);
  
  return (
    <div>
      <div>Status: {state.status}</div>
      <div>Messages: {state.messages.length}</div>
      <div>Tool Calls: {state.activeToolCalls.length}</div>
    </div>
  );
}
```

## Components

### `AIWorkspace`

Composable workspace combining chat, composer, tool activity, and artifacts.

**Props:**
- `session` (required): The AI session
- `state`: Pre-computed state (optional, computed via hook if not provided)
- `layout`: "default" | "compact" | "wide"
- `showArtifacts`: boolean (default: true)
- `showToolActivity`: boolean (default: true)
- `onApprove`: Callback when tool is approved
- `onReject`: Callback when tool is rejected
- `style`: Custom CSS styles
- `className`: CSS class name

**Example:**
```jsx
<AIWorkspace
  session={session}
  layout="default"
  showArtifacts
  showToolActivity
/>
```

### `AIChat`

Displays conversation messages.

**Props:**
- `session` (required): The AI session
- `state`: Pre-computed state
- `onSend`: Callback when user sends message
- `style`: Custom styles
- `className`: CSS class name

### `AIComposer`

Text input for composing and sending messages.

**Props:**
- `session` (required): The AI session
- `state`: Pre-computed state
- `onSubmit`: Callback when message is submitted
- `placeholder`: Input placeholder text
- `style`: Custom styles
- `className`: CSS class name

### `AIAttachments`

File attachment interface.

**Props:**
- `state`: Pre-computed state
- `onAttach`: Callback when files are attached
- `accept`: File type filter (e.g., ".pdf,.doc")
- `multiple`: Allow multiple files (default: true)
- `style`: Custom styles
- `className`: CSS class name

### `AIToolActivity`

Displays tool invocations and approval requests.

**Props:**
- `state`: Pre-computed state
- `onApprove`: Callback when tool is approved
- `onReject`: Callback when tool is rejected
- `style`: Custom styles
- `className`: CSS class name

### `AIArtifactsPanel`

Displays generated artifacts (code, tables, images, JSON).

**Props:**
- `state`: Pre-computed state
- `onArtifactSelect`: Callback when artifact is selected
- `style`: Custom styles
- `className`: CSS class name

## Advanced Usage

### Building a Custom Component

Since React is just an adapter, you can easily build custom components using the same hooks:

```jsx
import { useAIState } from "@ai-ui/react/hooks";

function CustomUI({ session }) {
  const state = useAIState(session);

  return (
    <div>
      {state.messages.map((msg) => (
        <div key={msg.id} className={`message-${msg.role}`}>
          {msg.content}
        </div>
      ))}
    </div>
  );
}
```

### Using with External Session

You can pass a pre-created session from `@ai-ui/core`:

```jsx
import { createAISession } from "@ai-ui/core/runtime";
import { AIWorkspace } from "@ai-ui/react";

const session = createAISession({ transport });

export default function App() {
  return <AIWorkspace session={session} />;
}
```

### Managing Tool Approvals

```jsx
function ChatWithApprovals() {
  const { session, state } = useAISession({ transport });

  const handleApprove = (toolCallId) => {
    // Implementation would depend on your backend
    console.log("Approving tool:", toolCallId);
  };

  return (
    <AIWorkspace
      session={session}
      state={state}
      onApprove={handleApprove}
      onReject={(id) => console.log("Rejecting:", id)}
    />
  );
}
```

## State Structure

The session state object has this structure:

```javascript
{
  status: "idle" | "streaming" | "complete" | "error" | "waiting_for_approval",
  messages: [
    { id: string, role: "user" | "assistant", content: string, reasoning?: string }
  ],
  activeToolCalls: [
    {
      id: string,
      name: string,
      input: object,
      status: "running" | "approval_required" | "completed" | "rejected",
      output?: any,
      error?: string
    }
  ],
  artifacts: [
    {
      id: string,
      type: string,
      title: string,
      content: any,
      status?: string,
      error?: string
    }
  ],
  citations: [
    { id: string, source: string, content: string }
  ],
  error: { message: string, code?: string } | null
}
```

## Architecture

```
                 @ai-ui/core
                      │
              protocol + session
                      │
          ┌───────────┴───────────┐
          │                       │
      @ai-ui/web             @ai-ui/react
          │                       │
     Web Components          React components
          │                       │
          └───────────┬───────────┘
                      ↓
               Host Application
```

Both Web Components and React components consume the same core session,
ensuring a unified state management approach across different frameworks.

## Testing

```bash
npm test
```

The React package includes comprehensive tests for:
- Hook integration and contracts
- Component rendering with session state
- State subscription patterns
- Error handling

## Best Practices

1. **Create session once**: Use `useAISession` at the app level, not in every component
2. **Pass session as prop**: Avoid creating multiple session instances
3. **Use state prop**: For custom components, pass pre-computed state to avoid extra renders
4. **Handle loading states**: Check `state.status` for "streaming" to show loading UI
5. **Clean up properly**: The hook handles cleanup on unmount

## Migration from Web Components

If migrating from `@ai-ui/web`, the API is similar:

```jsx
// Web Components
<ai-workspace id="workspace"></ai-workspace>
<script>
  const ws = document.getElementById('workspace');
  ws.configure({ transport });
</script>

// React
import { AIWorkspace, useAISession } from "@ai-ui/react";

function App() {
  const { session } = useAISession({ transport });
  return <AIWorkspace session={session} />;
}
```

## License

See LICENSE in root directory.
