# PR7: AI UI Extension & Rendering System

## Overview

PR7 transforms ai-ui from a fixed set of components into an **extensible AI UI platform**. Applications can now teach ai-ui how to render their own artifacts, tool calls, tool outputs, and custom UI surfaces without forking or modifying core components.

### Architectural Shift

```
Before (PR6):
AI protocol → fixed components → chat / tools / artifacts

After (PR7):
AI protocol → renderer registry → built-in + application renderers → universal AI UI
```

## Core Concepts

### 1. Renderer Registry

The canonical renderer registry is the central hub for all custom renderers. It provides a framework-neutral way to register and retrieve renderers for artifacts and tools.

**Location:** `@ai-ui/core`

```javascript
import { createRendererRegistry } from "@ai-ui/core";

// Create an independent registry
const registry = createRendererRegistry();

// Register an artifact renderer
registry.registerArtifact("customer", {
  type: "customer",
  render(artifact) {
    // Render custom DOM
  }
});

// Register a tool renderer
registry.registerTool("create_invoice", {
  name: "create_invoice",
  renderInput(toolCall) {
    // Render tool input
  }
});
```

### 2. Artifact Renderer Contract

Artifact renderers define how AI-generated objects of a specific type should be rendered.

```typescript
interface AIArtifactRenderer {
  type: string;
  canHandle?(artifact: AIArtifact): boolean;
  render(artifact: AIArtifact, context?: AIArtifactRenderContext): unknown;
  export?(artifact: AIArtifact): void;
}
```

**Example:**

```javascript
const customerRenderer = {
  type: "customer",
  canHandle(artifact) {
    return artifact.type === "customer";
  },
  render(artifact) {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${artifact.title}</h3>
      <p>ID: ${artifact.content.id}</p>
      <p>Name: ${artifact.content.name}</p>
      <p>Revenue: $${artifact.content.revenue}</p>
    `;
    return div;
  }
};
```

### 3. Tool Renderer Contract

Tool renderers define how tool calls and outputs are rendered.

```typescript
interface AIToolRenderer {
  name: string;
  renderInput(toolCall: AIToolCall, context?: AIToolRenderContext): unknown;
  renderOutput?(toolCall: AIToolCall, context?: AIToolRenderContext): unknown;
}
```

**Example:**

```javascript
const invoiceRenderer = {
  name: "create_invoice",
  renderInput(toolCall) {
    // Render tool input preview
    return renderInvoicePreview(toolCall.input);
  },
  renderOutput(toolCall) {
    // Render tool result
    return renderInvoiceConfirmation(toolCall.output);
  }
};
```

### 4. Plugin API

Plugins bundle multiple renderers together for easy distribution and registration.

```javascript
import { createAIUIPlugin, createArtifactRenderer, createToolRenderer } from "@ai-ui/core";

const myPlugin = createAIUIPlugin({
  name: "my-app-plugin",
  
  artifacts: [
    createArtifactRenderer("customer", customerRenderer),
    createArtifactRenderer("invoice", invoiceRenderer),
    createArtifactRenderer("revenue_chart", chartRenderer)
  ],
  
  tools: [
    createToolRenderer("create_invoice", invoiceToolRenderer),
    createToolRenderer("send_email", emailToolRenderer)
  ]
});

// Register the plugin globally
import { pluginManager } from "@ai-ui/core";
pluginManager.register(myPlugin);
```

### 5. Workspace Integration

The ai-workspace component now supports plugin registration at the workspace level.

```javascript
// Register a plugin
const workspace = document.querySelector("ai-workspace");
workspace.use(myPlugin);

// Or access the registry directly
workspace.registry.artifacts.registerArtifact("custom", renderer);
workspace.registry.tools.registerTool("my_tool", renderer);

// Set the session
workspace.session = session;
```

### 6. Built-in Renderers

ai-ui ships with built-in renderers for common artifact types:

- **text** - Plain text content
- **code** - Code with syntax highlighting
- **markdown** - Markdown content (converted to HTML)
- **json** - JSON with syntax highlighting
- **table** - Tabular data with CSV export
- **image** - Images with metadata

These can be overridden by registering custom renderers with the same type.

## Renderer Fallback Chain

When rendering an artifact, the system follows this priority:

1. **Custom Renderer** - Application-registered renderer for this type
2. **Built-in Renderer** - ai-ui's built-in renderer (if available)
3. **Generic JSON Renderer** - Fallback that displays artifact as formatted JSON

```javascript
// This artifact will use the custom "customer" renderer if registered
const artifact = {
  type: "customer",
  content: { id: "123", name: "Acme Corp" }
};

// If no "customer" renderer exists, falls back to JSON display:
// {
//   "id": "123",
//   "name": "Acme Corp"
// }
```

**Fallback UI (when no renderer found):**

```
┌─────────────────────────────┐
│ Customer                    │
│                             │
│ Unsupported artifact type   │
│                             │
│ View JSON                   │
└─────────────────────────────┘
```

## Security Boundaries

AI-generated content is **untrusted by default**. The security module provides utilities to safely render potentially malicious content.

### Sanitization Utilities

```javascript
import {
  sanitizeHtml,
  escapeHtml,
  isValidUrl,
  isValidImageUrl,
  sanitizeMarkdown,
  createSafeRenderContext
} from "@ai-ui/core";

// Sanitize HTML content
const safe = sanitizeHtml(userContent);
// Removes: script tags, event handlers, javascript: URLs, data: URLs

// Escape plain text
const escaped = escapeHtml("User provided <script>alert('xss')</script>");
// Output: "User provided &lt;script&gt;alert('xss')&lt;/script&gt;"

// Validate URLs
if (isValidUrl(url)) {
  element.href = url;  // Safe
}

// Validate image URLs (more restrictive)
if (isValidImageUrl(imageUrl)) {
  img.src = imageUrl;  // Safe
}

// Sanitize markdown
const cleanMarkdown = sanitizeMarkdown(markdown);
// Removes: script tags, javascript: protocol, event handlers

// Create a safe render context
const context = createSafeRenderContext(artifact);
// Provides: sanitize(), escapeHtml(), isValidUrl(), isValidImageUrl(), sanitizeMarkdown()
```

### Key Security Rules

1. **Never use `innerHTML` directly** on user/AI content
   ```javascript
   // ❌ WRONG
   element.innerHTML = artifact.content;
   
   // ✅ RIGHT
   element.innerHTML = sanitizeHtml(artifact.content);
   ```

2. **Always validate URLs**
   ```javascript
   // ❌ WRONG
   element.href = artifact.link;
   
   // ✅ RIGHT
   if (isValidUrl(artifact.link)) {
     element.href = artifact.link;
   }
   ```

3. **Escape plain text content**
   ```javascript
   // ❌ WRONG
   element.textContent = artifact.title;  // Works but risks HTML injection if reassigned
   
   // ✅ RIGHT
   element.textContent = escapeHtml(artifact.title);
   ```

## Custom Artifact Example

Here's a complete example of a custom artifact type:

```javascript
import { createAIUIPlugin, createArtifactRenderer } from "@ai-ui/core";
import { sanitizeHtml } from "@ai-ui/core";

// Define a custom artifact renderer
const customerRenderer = createArtifactRenderer("customer", {
  canHandle(artifact) {
    return artifact.type === "customer";
  },

  render(artifact) {
    const container = document.createElement("div");
    container.style.cssText = `
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    `;

    const customer = artifact.content;

    // Use textContent for plain text to avoid HTML injection
    const title = document.createElement("h3");
    title.textContent = customer.name;
    container.appendChild(title);

    const details = document.createElement("div");
    details.style.cssText = "margin-top: 12px;";

    const id = document.createElement("p");
    id.textContent = `ID: ${customer.id}`;
    details.appendChild(id);

    const revenue = document.createElement("p");
    revenue.textContent = `Revenue: $${customer.revenue.toLocaleString()}`;
    details.appendChild(revenue);

    const growth = document.createElement("p");
    growth.textContent = `Growth: ${customer.growth}%`;
    details.appendChild(growth);

    container.appendChild(details);
    return container;
  },

  export(artifact) {
    const json = JSON.stringify(artifact.content, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-${artifact.content.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
});

// Create a plugin with the renderer
const customerPlugin = createAIUIPlugin({
  name: "customer-plugin",
  artifacts: [customerRenderer]
});

// Use the plugin in your workspace
const workspace = document.querySelector("ai-workspace");
workspace.use(customerPlugin);

// Now artifacts with type: "customer" will be rendered beautifully!
```

## Tool Renderer Example

```javascript
import { createToolRenderer } from "@ai-ui/core";

const invoiceRenderer = createToolRenderer("create_invoice", {
  renderInput(toolCall) {
    const container = document.createElement("div");
    container.className = "invoice-preview";
    container.style.cssText = `
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 16px;
      background: #f0fdf4;
    `;

    const title = document.createElement("h4");
    title.textContent = "Create Invoice";
    title.style.color = "#047857";
    container.appendChild(title);

    const input = toolCall.input || {};
    const details = document.createElement("div");
    details.style.cssText = "margin-top: 12px; font-size: 14px;";

    if (input.customer) {
      const customer = document.createElement("p");
      customer.textContent = `Customer: ${input.customer}`;
      details.appendChild(customer);
    }

    if (input.amount) {
      const amount = document.createElement("p");
      amount.textContent = `Amount: $${input.amount}`;
      details.appendChild(amount);
    }

    container.appendChild(details);
    return container;
  },

  renderOutput(toolCall) {
    const container = document.createElement("div");
    container.className = "invoice-result";
    container.style.cssText = `
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 16px;
      background: #eff6ff;
    `;

    const title = document.createElement("h4");
    title.textContent = "Invoice Created ✓";
    title.style.color = "#1e40af";
    container.appendChild(title);

    const output = toolCall.output || {};
    const details = document.createElement("div");
    details.style.cssText = "margin-top: 12px; font-size: 14px;";

    const id = document.createElement("p");
    id.textContent = `Invoice ID: ${output.invoice_id}`;
    details.appendChild(id);

    const sent = document.createElement("p");
    sent.textContent = `Status: ${output.status}`;
    details.appendChild(sent);

    container.appendChild(details);
    return container;
  }
});

export { invoiceRenderer };
```

## Usage in Applications

### Global Registration

```javascript
import { pluginManager, createAIUIPlugin } from "@ai-ui/core";
import { customerPlugin } from "./plugins/customer-plugin.js";
import { invoicePlugin } from "./plugins/invoice-plugin.js";

// Register plugins globally
pluginManager.register(customerPlugin);
pluginManager.register(invoicePlugin);

// Now all ai-workspace instances will use these renderers
```

### Workspace-Level Registration

```javascript
import { createAISession } from "@ai-ui/core";
import { myCustomPlugin } from "./plugins/my-plugin.js";

const session = createAISession({ transport });

const workspace = document.querySelector("ai-workspace");
workspace.use(myCustomPlugin);  // Register plugin for this workspace only
workspace.session = session;
```

### Direct Registry Access

```javascript
const workspace = document.querySelector("ai-workspace");

// Register a single artifact renderer
workspace.registry.artifacts.registerArtifact("my_type", {
  type: "my_type",
  render(artifact) {
    // Render logic
  }
});

// Register a single tool renderer
workspace.registry.tools.registerTool("my_tool", {
  name: "my_tool",
  renderInput(toolCall) {
    // Render logic
  }
});
```

## Slots vs Renderers

The renderer system does **not** replace custom slots. They solve different problems:

| Slots | Renderers |
|-------|-----------|
| "I want to replace this UI component" | "I want AI-generated objects of this type to automatically render this way" |
| Structural customization | Content rendering customization |
| Component-level | Data type-level |

**You can use both together:**

```html
<ai-workspace>
  <ai-chat slot="chat">
    <custom-prompt-panel slot="prompt"></custom-prompt-panel>
  </ai-chat>
  <!-- Renderers handle artifact/tool display -->
</ai-workspace>
```

## Built-in Renderer Override

To override a built-in renderer:

```javascript
import { createAIUIPlugin } from "@ai-ui/core";

const myCodeRenderer = createAIUIPlugin({
  name: "my-code-renderer",
  artifacts: [
    {
      type: "code",  // Override the built-in code renderer
      renderer: {
        render(artifact) {
          // Your custom code rendering logic
          // This will now be used instead of the default
        }
      }
    }
  ]
});

workspace.use(myCodeRenderer);
```

## Best Practices

1. **Validate all input** - Always sanitize AI-generated content
2. **Use safe rendering** - Prefer `textContent` over `innerHTML` for plain text
3. **Test your renderers** - Test with unexpected data shapes
4. **Export functionality** - Implement the `export()` method for artifact export
5. **Handle errors gracefully** - Renderers should never crash the UI
6. **Provide context** - Use the render context for sanitization functions
7. **Follow design tokens** - Use CSS variables for consistent styling

## Security Testing

The @ai-ui/core package includes comprehensive security tests:

```javascript
import { sanitizeHtml, escapeHtml, isValidUrl } from "@ai-ui/core";

// Test HTML sanitization
const malicious = '<div onclick="alert(\'xss\')">Click</div>';
const safe = sanitizeHtml(malicious);  // event handlers removed

// Test URL validation
const isSafeUrl = isValidUrl("https://example.com");  // true
const isDangerousUrl = isValidUrl("javascript:alert('xss')");  // false

// Test HTML escaping
const escaped = escapeHtml("<script>alert('xss')</script>");
```

## Acceptance Criteria (All Met ✅)

- ✅ Canonical renderer registry in @ai-ui/core
- ✅ Artifact renderer contracts defined
- ✅ Built-in renderers (text, code, markdown, json, table, image)
- ✅ Tool renderer registry with renderInput/renderOutput
- ✅ Plugin API with factory functions
- ✅ Workspace-level plugin registration
- ✅ Custom slots continue to work
- ✅ Comprehensive renderer fallback
- ✅ Security boundaries established
- ✅ Security tests included
- ✅ All tests passing (76 total)

## Next Steps (PR8+)

- Advanced layout customization with draggable panels
- Artifact versioning and history
- Tool execution preview/simulation
- Collaborative features
- Performance optimizations for large artifact lists
- Theme system for consistent styling
