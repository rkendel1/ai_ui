# PR5 API Reference

Quick reference for all new PR5 components and systems.

## Components

### `<ai-tool-call>`

Renders a tool invocation with its complete lifecycle.

```html
<ai-tool-call
  tool-id="t1"
  tool-name="search_customers"
  tool-status="completed"
  tool-input='{"query":"acme"}'
  tool-output='{"count":3,"matches":[...]}'></ai-tool-call>
```

**All Props:**
- `tool-id` (string, required)
- `tool-name` (string, required)
- `tool-status` (string): pending | running | approval_required | completed | rejected | failed
- `tool-input` (JSON): Input parameters
- `tool-output` (JSON): Output data
- `tool-error` (JSON): Error information

**Setting via Property:**
```javascript
const el = document.querySelector("ai-tool-call");
el.toolCall = {
  id: "t1",
  name: "search",
  status: "completed",
  input: { query: "acme" },
  output: { count: 3 }
};
```

**Events:**
```javascript
el.addEventListener("ai-tool-expanded", (e) => {
  console.log("Expanded:", e.detail.expanded);
});
```

---

### `<ai-tool-approval>`

Modal dialog requesting user approval before tool execution.

```html
<ai-tool-approval
  tool-id="t1"
  tool-name="delete_file"
  reason="This will permanently delete the file"
  input='{"path":"/data/archive.zip","size":"2.4GB"}'></ai-tool-approval>
```

**All Props:**
- `tool-id` (string, required)
- `tool-name` (string, required)
- `reason` (string): Why approval is needed
- `input` (JSON): Input to preview

**Methods:**
```javascript
const el = document.querySelector("ai-tool-approval");

// User approved
el.approve();
// → dispatches: ai-approval-approved event

// User rejected
el.reject("User cancelled");
// → dispatches: ai-approval-rejected event
```

**Events:**
```javascript
el.addEventListener("ai-approval-approved", (e) => {
  console.log("Approved:", e.detail.toolCallId);
});

el.addEventListener("ai-approval-rejected", (e) => {
  console.log("Rejected:", e.detail.toolCallId, e.detail.reason);
});
```

**Keyboard Support:**
- Enter: Approve
- Escape: Cancel/Reject
- Tab: Navigate between buttons

---

### `<ai-artifact>`

Universal renderer for any artifact type.

```html
<ai-artifact
  artifact-id="a1"
  artifact-type="table"
  artifact-title="Customer Report"
  artifact-content='[{"name":"Acme","revenue":"$4.2M"}]'
  artifact-metadata='{"sortable":true}'></ai-artifact>
```

**All Props:**
- `artifact-id` (string, required)
- `artifact-type` (string, required)
- `artifact-title` (string): Display title
- `artifact-content` (JSON): Artifact data
- `artifact-metadata` (JSON): Type-specific metadata

**Setting via Property:**
```javascript
const el = document.querySelector("ai-artifact");
el.artifact = {
  id: "a1",
  type: "json",
  title: "Analysis",
  content: { totalCustomers: 3, revenue: "$2.97M" }
};
```

**Events:**
```javascript
el.addEventListener("ai-artifact-expanded", (e) => {
  console.log("Expanded:", e.detail.expanded);
});

el.addEventListener("ai-artifact-copy", (e) => {
  console.log("Copied:", e.detail.content);
});

el.addEventListener("ai-artifact-export", (e) => {
  console.log("Export:", e.detail.filename, e.detail.blob);
});

el.addEventListener("ai-artifact-action", (e) => {
  console.log("Custom action:", e.detail.actionId);
});
```

**Supported Types (Built-in):**
- `text`: Plain text
- `code`: Code blocks with syntax highlighting
- `json`: Structured data with expansion
- `table`: Array of objects or array of arrays
- `image`: Image URLs (planned)
- `chart`: Chart data (planned)
- `custom`: Any registered custom type

---

## Registries

### ToolRegistry

```javascript
import { toolRegistry } from "@ai-ui/core";

// Register a custom tool renderer
toolRegistry.register("my_tool", {
  canHandle: (tool) => tool.name === "my_tool",
  render: (tool) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${tool.name}</strong>`;
    return div;
  }
});

// Check if type is registered
if (toolRegistry.has("my_tool")) {
  // ...
}

// Get renderer
const renderer = toolRegistry.get("my_tool");

// List all registered types
const types = toolRegistry.list();

// Subscribe to changes
const unsubscribe = toolRegistry.subscribe((event) => {
  console.log("Registry updated:", event.type, event.typeName);
});

// Unregister
toolRegistry.unregister("my_tool");
unsubscribe();
```

### ArtifactRegistry

```javascript
import { artifactRegistry } from "@ai-ui/core";

// Register custom artifact renderer
artifactRegistry.register("customer", {
  canHandle: (artifact) => artifact.type === "customer",
  
  render: (artifact) => {
    const div = document.createElement("div");
    const customer = artifact.content;
    div.innerHTML = `
      <div class="customer-card">
        <h3>${customer.name}</h3>
        <p>Email: ${customer.email}</p>
      </div>
    `;
    return div;
  },
  
  export: (artifact) => {
    const json = JSON.stringify(artifact.content, null, 2);
    return {
      filename: `customer-${artifact.id}.json`,
      blob: new Blob([json], { type: "application/json" })
    };
  }
});

// Get renderer
const renderer = artifactRegistry.get("customer");

// List all types
const types = artifactRegistry.list(); // ["text", "code", "json", "table", "customer"]

// Check if registered
const has = artifactRegistry.has("customer");

// Subscribe
const unsubscribe = artifactRegistry.subscribe((event) => {
  console.log("Artifact registry changed:", event);
});

// Unregister
artifactRegistry.unregister("customer");
```

---

## Plugin System

### PluginManager

```javascript
import { pluginManager } from "@ai-ui/core";

// Define a plugin
const analyticsPlugin = {
  name: "analytics-plugin",
  
  artifacts: [
    {
      type: "chart",
      renderer: {
        canHandle: (a) => a.type === "chart",
        render: (a) => { /* ... */ }
      }
    },
    {
      type: "report",
      renderer: {
        canHandle: (a) => a.type === "report",
        render: (a) => { /* ... */ }
      }
    }
  ],
  
  tools: [
    {
      name: "generate_chart",
      renderer: {
        canHandle: (t) => t.name === "generate_chart",
        render: (t) => { /* ... */ }
      }
    }
  ]
};

// Register plugin
pluginManager.register(analyticsPlugin);

// List plugins
const plugins = pluginManager.list();
console.log(plugins); // [{ name: "analytics-plugin", ... }]

// Unregister
pluginManager.unregister("analytics-plugin");
```

---

## Protocol Events

### Creating a Session

```javascript
import { createAISession } from "@ai-ui/core";

// Create session with transport
const session = createAISession({ transport });

// Subscribe to state changes
session.subscribe((state) => {
  console.log("State updated:", {
    status: state.status,
    messageCount: state.messages.length,
    toolCount: state.activeToolCalls.length,
    artifactCount: state.artifacts.length,
    toolsNeedingApproval: state.activeToolCalls
      .filter(t => t.status === "approval_required")
      .map(t => t.id)
  });
});

// Send message
await session.send("Analyze my data");

// Approve a tool
session.approve("t1");

// Reject a tool
session.reject("t1", "Too risky");

// Cancel/retry
session.cancel();
session.retry();

// Clear conversation
session.clear();
```

### Transport Protocol

Your transport receives and yields events:

```javascript
// Transport interface
const transport = {
  async *send(messages) {
    // Send messages to AI
    const stream = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages })
    });
    
    // Yield events
    for await (const chunk of stream) {
      const event = JSON.parse(chunk);
      yield event;
    }
  }
};
```

**Tool Event Flow:**
```javascript
// 1. AI requests tool
yield {
  type: "tool.call.started",
  id: "t1",
  name: "search_customers",
  input: { query: "acme" }
};

// 2. AI waits for approval (if configured)
yield {
  type: "tool.approval.required",
  id: "t1",
  reason: "This will search your customer database"
};

// 3. User approves via ai-chat
// (session automatically handles approval)

// 4. You execute tool and send result
yield {
  type: "tool.call.completed",
  id: "t1",
  output: { customers: 3, results: [...] }
};

// Or if rejected:
yield {
  type: "tool.call.failed",
  id: "t1",
  error: { message: "User rejected the tool" }
};
```

**Artifact Event Flow:**
```javascript
// 1. Create artifact
yield {
  type: "artifact.created",
  artifact: {
    id: "a1",
    type: "table",
    title: "Customer Report",
    content: [
      { name: "Acme", revenue: "$4.2M" },
      { name: "Globex", revenue: "$2.8M" }
    ]
  }
};

// 2. Update (for streaming artifacts)
yield {
  type: "artifact.updated",
  artifact: {
    id: "a1",
    type: "table",
    title: "Customer Report",
    content: [
      { name: "Acme", revenue: "$4.2M" },
      { name: "Globex", revenue: "$2.8M" },
      { name: "Initech", revenue: "$1.9M" }
    ]
  }
};

// 3. Complete
yield {
  type: "artifact.completed",
  artifactId: "a1"
};
```

---

## Integration Example

Complete example integrating tools and artifacts:

```javascript
import { createAISession } from "@ai-ui/core";
import { defineAIChatElement } from "@ai-ui/web";

// 1. Define transport
const transport = {
  async *send(messages) {
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages })
    });
    
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const event = JSON.parse(new TextDecoder().decode(value));
      yield event;
    }
  }
};

// 2. Create session
const session = createAISession({ transport });

// 3. Connect to chat
const chat = document.querySelector("ai-chat");
chat.session = session;

// 4. Send message
await session.send("Analyze my customers and create a report");

// Result: 
// - Tool call renders in chat
// - If approval needed, modal appears
// - Artifacts render with appropriate renderers
// - All events flow through session state
```

---

## Renderer Interface

All renderers implement:

```typescript
interface Renderer {
  canHandle(item: any): boolean;
  render(item: any): HTMLElement;
  export?(item: any): { filename: string; blob: Blob };
}
```

Example custom renderer:

```javascript
const MyRenderer = {
  canHandle: (artifact) => {
    return artifact.type === "my_type" && artifact.content?.version === 2;
  },
  
  render: (artifact) => {
    const div = document.createElement("div");
    div.className = "my-artifact";
    div.innerHTML = `<pre>${JSON.stringify(artifact.content, null, 2)}</pre>`;
    return div;
  },
  
  export: (artifact) => {
    const data = JSON.stringify(artifact.content, null, 2);
    return {
      filename: `artifact-${artifact.id}.json`,
      blob: new Blob([data], { type: "application/json" })
    };
  }
};

artifactRegistry.register("my_type", MyRenderer);
```
