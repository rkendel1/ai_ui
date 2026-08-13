# PR6: Composable AI Workspace

This document describes the PR6 enhancements that introduce a composable AI workspace for building complex AI interaction surfaces.

## Overview

PR6 transforms ai-ui from a single-component chat interface into a composable system where components can be independently used or combined into a unified workspace.

### Architecture

```
ai-workspace (owns layout)
├── ai-chat (messages, composer, attachments)
├── ai-artifacts-panel (artifact list and preview)
└── ai-tool-activity (tool call monitoring)
```

The workspace remains **provider-agnostic** and uses the existing `@ai-ui/core` session as its single source of truth.

## New Components

### 1. `ai-workspace`

The main container component that owns layout and orchestrates child components.

#### Usage

```html
<ai-workspace>
  <ai-chat slot="chat">
    <ai-composer slot="composer"></ai-composer>
  </ai-chat>
  <ai-artifacts-panel slot="artifacts"></ai-artifacts-panel>
  <ai-tool-activity slot="tools"></ai-tool-activity>
</ai-workspace>
```

#### JavaScript API

**Setting a session:**
```javascript
const workspace = document.querySelector("ai-workspace");
workspace.session = session;
```

**Configuring the workspace:**
```javascript
workspace.configure({
  transport,
  context,
  layout: "default" // "default" | "compact" | "wide"
});
```

**Controlling panels:**
```javascript
workspace.toggleArtifacts();      // Show/hide artifacts panel
workspace.toggleToolActivity();   // Show/hide tool activity panel
workspace.layout = "compact";     // Change layout mode
```

#### Attributes

- `layout` - Layout mode: "default" (3-column), "compact" (1-column), "wide" (wider panels)

### 2. `ai-artifacts-panel`

Displays a list of generated artifacts in a side panel.

#### Usage

```html
<ai-artifacts-panel></ai-artifacts-panel>
```

#### JavaScript API

```javascript
const panel = document.querySelector("ai-artifacts-panel");
panel.session = session;
```

#### Features

- Lists all artifacts generated in the session
- Click to preview artifact details
- Shows artifact type and title
- Collapsible panel design

### 3. `ai-tool-activity`

Displays active and completed tool calls with status monitoring.

#### Usage

```html
<ai-tool-activity></ai-tool-activity>
```

#### JavaScript API

```javascript
const toolPanel = document.querySelector("ai-tool-activity");
toolPanel.session = session;
```

#### Features

- Real-time tool execution status
- Input/output visualization
- Error display
- Status indicators: pending, running, approval_required, completed, failed

## Layout Modes

### Default Layout
3-column layout with chat, artifacts panel, and tool activity panel side-by-side.

```
┌─────────────────────────────────────────────┐
│  AI Workspace                               │
├──────────────────┬──────────────┬───────────┤
│                  │              │           │
│   ai-chat        │ Artifacts    │ Tools     │
│                  │              │           │
│                  │              │           │
└──────────────────┴──────────────┴───────────┘
```

### Compact Layout
Single column - only chat visible. Panels hidden.

```
┌─────────────────────────────────────────────┐
│  AI Workspace                               │
├─────────────────────────────────────────────┤
│                                             │
│              ai-chat (full width)           │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

### Wide Layout
3-column layout with wider panels.

```
┌─────────────────────────────────────────────┐
│  AI Workspace                               │
├──────────────────┬──────────────────┬───────┤
│                  │                  │       │
│   ai-chat        │ Artifacts (wide) │ Tools │
│                  │                  │       │
└──────────────────┴──────────────────┴───────┘
```

## Session Sharing

All workspace components share the same session instance. The session is the single source of truth for:
- Messages (user and assistant)
- Active tool calls
- Artifacts
- Citations
- Errors

Components subscribe to session updates and render independently.

```javascript
// Create a session
const session = createAISession({ transport });

// Share with workspace (and all child components)
const workspace = document.querySelector("ai-workspace");
workspace.session = session;

// All components now render from the same session state
// - ai-chat shows messages and tool calls
// - ai-artifacts-panel lists artifacts
// - ai-tool-activity monitors tools
```

## Backwards Compatibility

All existing components remain independently usable:

```html
<!-- Old way still works -->
<ai-chat>
  <ai-composer slot="composer"></ai-composer>
</ai-chat>

<!-- New way with workspace -->
<ai-workspace>
  <ai-chat slot="chat">
    <ai-composer slot="composer"></ai-composer>
  </ai-chat>
  <ai-artifacts-panel slot="artifacts"></ai-artifacts-panel>
  <ai-tool-activity slot="tools"></ai-tool-activity>
</ai-workspace>
```

## State Management

The workspace **owns the layout**, not the AI state. State is managed by `@ai-ui/core` session:

```javascript
// Get current state
const state = session.getState();

// State structure
{
  messages: Message[],           // Chat messages
  activeToolCalls: AIToolCall[], // Running tools
  artifacts: AIArtifact[],       // Generated artifacts
  citations: Citation[],         // Source citations
  status: "idle" | "streaming" | "complete" | "error",
  error?: Error
}
```

Components automatically update when state changes through subscriptions.

## Integration Example

Complete example using ai-workspace with OpenAI transport:

```javascript
import { createAISession } from "@ai-ui/core";

// Create session with your transport
const session = createAISession({
  transport: myOpenAITransport,
  context: { userId: "user-123" }
});

// Attach to workspace
const workspace = document.querySelector("ai-workspace");
workspace.session = session;

// Now you have:
// - ai-chat with streaming messages and tool rendering
// - ai-artifacts-panel with artifact list
// - ai-tool-activity with tool monitoring
// All synchronized through the session state
```

## Styling

All workspace components use CSS design tokens for customization:

```css
ai-workspace {
  /* Layout dimensions */
  --ai-font-family: system-ui;
  
  /* Colors */
  --ai-surface: #ffffff;
  --ai-surface-muted: #f9fafb;
  --ai-surface-hover: #f3f4f6;
  --ai-text: #111827;
  --ai-text-muted: #6b7280;
  --ai-border: #e5e7eb;
  --ai-accent: #3b82f6;
  
  /* Spacing */
  --ai-space-1: 4px;
  --ai-space-2: 8px;
  --ai-space-3: 12px;
  --ai-space-4: 16px;
  
  /* Radius */
  --ai-radius-sm: 6px;
  --ai-radius-md: 10px;
  --ai-radius-lg: 16px;
}
```

## Acceptance Criteria

✅ Workspace owns layout, not AI state
✅ Composes existing ai-chat component (no duplication)
✅ Displays artifacts in side panel (ai-artifacts-panel)
✅ Displays tool activity in side panel (ai-tool-activity)
✅ Optional context surface (planning for future)
✅ Session sharing between all components
✅ Multiple layout modes (default, compact, wide)
✅ Backwards compatible with existing components
✅ All tests pass
✅ No provider dependencies

## Next Steps (PR7+)

- Context surface component for session context display
- Advanced layout customization (draggable panels)
- Artifact versioning and history
- Tool execution preview/simulation
- Custom approval UI
- Streaming artifact updates
- Collaborative features
