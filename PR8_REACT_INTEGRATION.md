# PR8 — React Integration + Framework Adapter Foundation

## Objective

Make ai-ui feel native inside React/Next.js while preserving the existing framework-neutral architecture.

**The critical rule: React is an adapter, not the source of truth.**
- No AI state is duplicated in React
- The session remains the single source of truth
- React components efficiently subscribe to session state changes

## What's Included

### 1. @ai-ui/react Package

A new React package providing:
- Thin adapter components
- React hooks for state management
- No state duplication or second state machine

**Directory Structure:**
```
packages/react/
├── src/
│   ├── hooks/
│   │   ├── useAISession.js
│   │   ├── useAIState.js
│   │   └── index.js
│   ├── components/
│   │   ├── AIChat.js
│   │   ├── AIComposer.js
│   │   ├── AIAttachments.js
│   │   ├── AIWorkspace.js
│   │   ├── AIToolActivity.js
│   │   ├── AIArtifactsPanel.js
│   │   └── index.js
│   └── index.js
├── test/
│   ├── hooks.test.js
│   └── components.test.js
├── package.json
└── README.md
```

### 2. Core Hooks

#### `useAIState(session)`

Subscribes to session state using React's `useSyncExternalStore`.

```jsx
function DebugPanel({ session }) {
  const state = useAIState(session);
  return <div>{state.status}</div>;
}
```

**Why useSyncExternalStore?**
- Preserves single-source-of-truth architecture
- No state duplication
- Efficient re-renders only when session state changes
- Proper hydration support for SSR
- Maintains consistency across server/client boundaries

#### `useAISession(options)`

Creates and manages an AI session with lifecycle handling.

```jsx
const {
  session,
  state,
  send,
  cancel,
  retry,
  clear
} = useAISession({
  transport,
  context,
  tools
});

await send("Analyze this");
```

**Features:**
- Creates session once, reuses across renders
- Manages lifecycle (cleanup on unmount)
- Returns both session object and computed state
- No duplicate state machine

### 3. React Components

All components are thin adapters that:
- Accept session and state as props
- Don't manage their own state
- Delegate to the core session
- Share state with other implementations

**Components:**
- `AIChat` - Displays conversation messages
- `AIComposer` - Text input for sending messages
- `AIAttachments` - File attachment interface
- `AIToolActivity` - Shows tool invocations and approvals
- `AIArtifactsPanel` - Displays generated artifacts
- `AIWorkspace` - Composable workspace combining all components

Example usage:
```jsx
import { AIWorkspace, useAISession } from "@ai-ui/react";

function App() {
  const { session, state } = useAISession({ transport });
  
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

## Architecture

### Thin Adapter Pattern

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

**Key Principle:**
- Same core session
- Multiple rendering implementations
- Unified state management
- Framework-agnostic protocol

### What React Doesn't Do

❌ Create its own state machine
❌ Duplicate AI state
❌ Override session behavior
❌ Provide non-standard contracts

### What React Does Do

✅ Provide ergonomic React hooks
✅ Subscribe to session changes efficiently
✅ Render components based on session state
✅ Handle React lifecycle properly
✅ Maintain single source of truth

## Design Decisions

### 1. External Store Pattern

Using `useSyncExternalStore` instead of `useState`:
- Preserves single-source-of-truth architecture
- No state duplication
- Automatic cleanup of subscriptions
- Proper hydration for SSR
- Avoids stale closure problems

### 2. Session Passed as Prop

Components require session as a prop rather than context:
- Explicit dependencies
- Easier to test
- Enables multiple sessions in same app
- Clearer data flow

### 3. Thin Components

React components are adapters over the core protocol:
- Web Components can exist alongside React components
- Same state is shared
- No re-implementing logic
- Framework-agnostic core

### 4. Hooks for State Management

Two focused hooks instead of wrapper context:
- `useAIState(session)` - Subscribe to state
- `useAISession(options)` - Create and manage session
- Composable and testable
- Clear contracts

## Usage Examples

### Simple Chat Component

```jsx
import { AIWorkspace, useAISession } from "@ai-ui/react";

export default function App() {
  const { session, state } = useAISession({
    transport: myTransport
  });

  return <AIWorkspace session={session} state={state} />;
}
```

### Custom Component with Hooks

```jsx
import { useAISession, useAIState } from "@ai-ui/react/hooks";

function CustomChat() {
  const { session, state, send } = useAISession({ transport });

  return (
    <div>
      <div className="messages">
        {state.messages.map(msg => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>
      <button onClick={() => send("hello")}>
        Send
      </button>
    </div>
  );
}
```

### Integrating with Existing Session

```jsx
import { createAISession } from "@ai-ui/core/runtime";
import { useAIState } from "@ai-ui/react/hooks";

const session = createAISession({ transport });

function App() {
  const state = useAIState(session);
  
  return (
    <div>
      <div>Status: {state.status}</div>
      <div>Messages: {state.messages.length}</div>
    </div>
  );
}
```

## Testing

The package includes comprehensive tests:

### Hook Tests (`test/hooks.test.js`)
- `useAIState` integration with session
- `useAISession` contract verification
- State update flow
- Cancel and clear operations
- External store pattern verification

### Component Tests (`test/components.test.js`)
- Component contracts with session
- State subscription patterns
- Multiple component instances sharing session
- Error handling for missing session

All tests verify:
- Hooks work with core session
- Components accept and use session correctly
- State flows properly through React
- No state duplication occurs

Run tests with:
```bash
npm test
```

## Migration Path

For projects using `@ai-ui/web`:

```jsx
// Before: Web Components
import "@ai-ui/web";

<ai-workspace id="workspace"></ai-workspace>
<script>
  document.getElementById('workspace').configure({ transport });
</script>

// After: React
import { AIWorkspace, useAISession } from "@ai-ui/react";

export default function App() {
  const { session } = useAISession({ transport });
  return <AIWorkspace session={session} />;
}
```

## Compatibility

- React 18+
- Works with Next.js
- Server-side rendering compatible
- TypeScript ready (types can be added)

## Future Enhancements

Potential additions without modifying core architecture:
- TypeScript definitions
- Accessibility improvements
- Theme/styling hooks
- Advanced component library
- Render prop patterns
- Headless component versions

All of these would follow the same principles:
- Thin adapters over core
- No state duplication
- Session remains source of truth
- Framework-agnostic protocol

## Breaking Changes

None. This PR is purely additive:
- Existing `@ai-ui/core` remains unchanged
- Existing `@ai-ui/web` remains unchanged
- New `@ai-ui/react` package is independent
- All existing code continues to work

## Files Modified

### New Files
- `packages/react/` - Complete React package
- `packages/react/src/hooks/useAIState.js`
- `packages/react/src/hooks/useAISession.js`
- `packages/react/src/components/AIChat.js`
- `packages/react/src/components/AIComposer.js`
- `packages/react/src/components/AIAttachments.js`
- `packages/react/src/components/AIWorkspace.js`
- `packages/react/src/components/AIToolActivity.js`
- `packages/react/src/components/AIArtifactsPanel.js`
- `packages/react/test/hooks.test.js`
- `packages/react/test/components.test.js`
- `packages/react/README.md`
- `PR8_REACT_INTEGRATION.md` (this file)

### Existing Files
- No modifications to existing files
- No breaking changes to core APIs
- Fully backward compatible

## Summary

PR8 delivers React integration that makes ai-ui feel native in React applications while preserving the framework-neutral architecture. The implementation follows a thin adapter pattern where React components subscribe to the core session without duplicating state.

Key achievements:
✅ React hooks for session management (`useAISession`, `useAIState`)
✅ Six React components (AIChat, AIComposer, AIAttachments, AIWorkspace, AIToolActivity, AIArtifactsPanel)
✅ No state duplication - session is single source of truth
✅ Efficient subscriptions using `useSyncExternalStore`
✅ Comprehensive tests validating hook contracts
✅ Full documentation and examples
✅ Zero breaking changes

The architecture enables using React, Web Components, or other frameworks with the exact same underlying session and protocol.
