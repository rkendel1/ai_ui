# PR5: Universal Tool & Artifact System

This document describes the architecture and usage of PR5, which transforms ai-ui from a chat-only component into a universal renderer for AI interactions.

## Overview

PR5 introduces first-class, composable UI primitives for tools and artifacts, with an extensible plugin system that enables host applications to render complex AI interactions as reusable components.

### Architecture

```
                    @ai-ui/core
                         │
            Universal Protocol & State
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     Messages          Tools           Artifacts
        │                │                │
        │          ┌─────┴─────┐       ┌──┴────┐
        │          │           │       │       │
        │       Approval     Output   Table   Code
        │          │           │       │
        └──────────┼───────────┴───────┴──────┘
                   │
              @ai-ui/web
                   │
         First-class Components
              (Composable)
                   │
           Host Application
```

## Core Components

### 1. Tool Invocation Lifecycle

Tools follow a deterministic state machine:

```
pending → running → approval_required → approved → completed
                         ↓
                      rejected
                         ↓
                      completed (as rejected)

Running state can also lead directly to:
completed (successful)
failed (error)
```

#### Component: `<ai-tool-call>`

Renders tool invocations with full state visibility:

```html
<ai-tool-call
  tool-id="t1"
  tool-name="search_customers"
  tool-status="completed"
  tool-input='{"query":"acme"}'
  tool-output='{"count":3}'></ai-tool-call>
```

**Props:**
- `tool-id` (string): Unique identifier
- `tool-name` (string): Display name
- `tool-status` (string): pending | running | approval_required | completed | rejected | failed
- `tool-input` (JSON string): Input parameters
- `tool-output` (JSON string): Execution result
- `tool-error` (JSON string): Error information if failed

**Properties:**
- `toolCall`: Set/get the tool call object directly
- `toggleExpanded()`: Toggle expanded state

**Events:**
- `ai-tool-expanded`: { expanded: boolean }

### 2. Approval Primitive

Approval is a first-class primitive with proper security boundaries:

#### Component: `<ai-tool-approval>`

Requests user authorization before tool execution:

```html
<ai-tool-approval
  tool-id="t1"
  tool-name="delete_file"
  reason="This will permanently delete 2.4GB"
  input='{"path":"/data/archive.zip"}'></ai-tool-approval>
```

**Props:**
- `tool-id` (string): Unique identifier
- `tool-name` (string): Tool name
- `reason` (string): Why approval is needed
- `input` (JSON string): Input parameters to preview

**Methods:**
- `approve()`: User approves the action
- `reject(reason)`: User rejects the action

**Events:**
- `ai-approval-approved`: { toolCallId: string }
- `ai-approval-rejected`: { toolCallId: string, reason: string }

**Features:**
- Focus trapping (modal behavior)
- Keyboard support (Enter to approve, Escape to cancel)
- ARIA accessibility labels
- Custom approval UI support planned

### 3. Artifact System

Artifacts are structured outputs from AI that can be rendered by type-specific renderers.

#### Canonical Type

```typescript
interface AIArtifact {
  id: string;
  type: "text" | "code" | "json" | "table" | "image" | "chart" | "document" | "custom";
  title?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
}
```

#### Component: `<ai-artifact>`

Universal renderer that finds and applies the appropriate renderer for any artifact type:

```html
<ai-artifact
  artifact-id="a1"
  artifact-type="table"
  artifact-title="Customer Report"
  artifact-content='[{"name":"Acme","revenue":"$4.2M"}]'></ai-artifact>
```

**Props:**
- `artifact-id` (string): Unique identifier
- `artifact-type` (string): Type of artifact
- `artifact-title` (string): Display title
- `artifact-content` (JSON string): Structured content
- `artifact-metadata` (JSON string): Type-specific metadata

**Properties:**
- `artifact`: Set/get the artifact object directly
- `toggleExpanded()`: Toggle expanded state

**Events:**
- `ai-artifact-expanded`: { expanded: boolean }
- `ai-artifact-copy`: { content: string }
- `ai-artifact-export`: { filename: string, blob: Blob }
- `ai-artifact-action`: { actionId: string }

### 4. Built-in Renderers

#### Table Renderer

Renders array data as interactive tables:

```json
{
  "type": "table",
  "title": "Customers Q3",
  "content": [
    { "name": "Acme", "revenue": "$4.2M", "growth": "12%" },
    { "name": "Globex", "revenue": "$2.8M", "growth": "8%" }
  ]
}
```

Features:
- Responsive layout
- CSV export
- Column headers
- Horizontal scrolling

#### JSON Renderer

Renders structured data with expansion controls:

```json
{
  "type": "json",
  "title": "Analysis Summary",
  "content": {
    "totalCustomers": 3,
    "avgRevenue": "$2.97M",
    "recommendation": "Focus on Initech"
  }
}
```

Features:
- Expandable nodes
- Syntax highlighting
- Copy to clipboard
- Depth limiting

#### Code Renderer

Renders code blocks and entire code artifacts:

```json
{
  "type": "code",
  "title": "Generated Function",
  "content": "function calculate() { return 42; }",
  "metadata": { "language": "javascript" }
}
```

Features:
- Language detection
- Syntax highlighting
- Copy to clipboard
- Download support planned

#### Text Renderer

Simple text rendering with copy support.

## Registry System

### ToolRegistry

Register custom tool renderers:

```javascript
import { toolRegistry } from "@ai-ui/core";

toolRegistry.register("my_tool", {
  canHandle: (tool) => tool.name === "my_tool",
  render: (tool) => {
    const div = document.createElement("div");
    div.textContent = `Tool: ${tool.name}`;
    return div;
  }
});
```

### ArtifactRegistry

Register custom artifact renderers:

```javascript
import { artifactRegistry } from "@ai-ui/core";

artifactRegistry.register("customer", {
  canHandle: (artifact) => artifact.type === "customer",
  render: (artifact) => {
    const div = document.createElement("div");
    // Render customer card
    return div;
  },
  export: (artifact) => {
    return {
      filename: `customer-${artifact.id}.json`,
      blob: new Blob([JSON.stringify(artifact.content)])
    };
  }
});
```

## Extension System

### Plugin Manager

Register plugins that provide custom renderers:

```javascript
import { pluginManager } from "@ai-ui/core";

const customerPlugin = {
  name: "customer-plugin",
  artifacts: [
    {
      type: "customer",
      renderer: {
        canHandle: (artifact) => artifact.type === "customer",
        render: (artifact) => { /* ... */ }
      }
    }
  ]
};

pluginManager.register(customerPlugin);
```

## Protocol Events

### Tool Events

```typescript
// Tool invocation started
{ type: "tool.call.started", id: string, name: string, input: unknown }

// Tool execution approved by user
{ type: "tool.approved", id: string }

// Tool execution rejected by user
{ type: "tool.rejected", id: string, reason?: string }

// Tool execution completed
{ type: "tool.call.completed", id: string, output: unknown }

// Tool execution failed
{ type: "tool.call.failed", id: string, error: unknown }

// Approval needed before execution
{ type: "tool.approval.required", id: string, reason?: string }
```

### Artifact Events

```typescript
// Artifact created
{ type: "artifact.created", artifact: AIArtifact }

// Artifact updated (for streaming artifacts)
{ type: "artifact.updated", artifact: AIArtifact }

// Artifact generation complete
{ type: "artifact.completed", artifactId: string }

// Artifact generation failed
{ type: "artifact.failed", artifactId: string, error: unknown }
```

## Integration with ai-chat

The `<ai-chat>` component automatically:

1. Renders tool calls using `<ai-tool-call>` component
2. Renders artifacts using `<ai-artifact>` component
3. Shows approval dialogs using `<ai-tool-approval>` component
4. Handles all event lifecycle transitions

Example flow:

```javascript
const chat = document.querySelector("ai-chat");
chat.session = createAISession({ transport });

// Session state automatically updates components
// Tool calls render as <ai-tool-call>
// Artifacts render as <ai-artifact>
// Approval needed? <ai-tool-approval> shows modal
```

## Custom Renderer Example

Create a domain-specific artifact renderer:

```javascript
// Define custom renderer
const InvoiceRenderer = {
  canHandle: (artifact) => artifact.type === "invoice",
  
  render: (artifact) => {
    const div = document.createElement("div");
    const inv = artifact.content;
    
    div.innerHTML = `
      <div style="border: 1px solid #ccc; padding: 20px; border-radius: 8px;">
        <h3>Invoice #${inv.id}</h3>
        <p>Customer: ${inv.customer}</p>
        <p>Amount: $${inv.amount}</p>
        <p>Date: ${inv.date}</p>
      </div>
    `;
    
    return div;
  },
  
  export: (artifact) => {
    const csv = `Invoice,${artifact.content.id}\n...`;
    return {
      filename: `invoice-${artifact.content.id}.csv`,
      blob: new Blob([csv], { type: "text/csv" })
    };
  }
};

// Register it
artifactRegistry.register("invoice", InvoiceRenderer);

// Now AI can create invoices
{
  type: "artifact.created",
  artifact: {
    id: "inv_123",
    type: "invoice",
    content: {
      id: "INV-001",
      customer: "Acme Corp",
      amount: 5000,
      date: "2024-08-13"
    }
  }
}
```

## State Management

Session state tracks:

```typescript
{
  messages: Message[],
  activeToolCalls: AIToolCall[],
  artifacts: AIArtifact[],
  status: "idle" | "streaming" | "complete" | "error",
  error?: Error,
  citations?: Citation[]
}
```

Tool calls remain in `activeToolCalls` throughout their lifecycle, with `status` field tracking state changes.

Artifacts accumulate in the `artifacts` array as they're created and updated.

## Security Boundaries

1. **AI does not execute**: AI requests tool execution, it never actually executes
2. **Approval is real**: User must explicitly approve via `<ai-tool-approval>` 
3. **Host controls transport**: The host application manages how approval is communicated to AI
4. **No provider SDKs**: Zero dependencies on OpenAI, Anthropic, Google, or other providers

Example flow:

```
AI: "I'll search for customers"
     ↓
<ai-tool-call> renders
     ↓
AI: approval_required event
     ↓
<ai-tool-approval> modal shows
     ↓
User: clicks Approve
     ↓
Host app: sends approval to transport
     ↓
Transport: tells AI: "approved"
     ↓
AI: executes (in host's runtime, not ai-ui's)
     ↓
Transport: sends output back
     ↓
<ai-tool-call> updates with output
```

## Acceptance Criteria Met

✅ Message → Tool → Approval → Artifact workflow completes
✅ Tool calls render as first-class components
✅ Artifacts render with appropriate renderers
✅ Custom renderers can be registered
✅ Plugin system enables extensibility
✅ Approval is a real primitive with UX
✅ No provider dependencies
✅ All tests pass
✅ Accessibility maintained throughout

## Next Steps (PR6+)

- **ai-workspace**: Composable AI surfaces (chat + artifacts + tool activity)
- **Artifact panel**: Optional side-by-side layout
- **Tool execution preview**: Before/after visualization
- **Artifact versioning**: Track artifact updates over time
- **Advanced approval UI**: Customizable approval flows
- **Streaming artifacts**: Update artifacts as they're generated
- **Collaborative features**: Real-time artifact updates
