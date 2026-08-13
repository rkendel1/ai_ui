/**
 * First-class tool call component
 * Renders tool invocations as composable UI primitives
 */

const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIToolCallElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._toolCall = null;
    this._expanded = false;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    
    // Initialize from attributes if _toolCall is not set
    if (!this._toolCall) {
      const toolId = this.getAttribute("tool-id");
      const toolName = this.getAttribute("tool-name");
      const toolStatus = this.getAttribute("tool-status") || "pending";
      const toolInput = this.getAttribute("tool-input");
      const toolOutput = this.getAttribute("tool-output");
      const toolError = this.getAttribute("tool-error");
      
      this._toolCall = {
        id: toolId,
        name: toolName,
        status: toolStatus,
        input: toolInput ? JSON.parse(toolInput) : undefined,
        output: toolOutput ? JSON.parse(toolOutput) : undefined,
        error: toolError ? JSON.parse(toolError) : undefined
      };
    }
    
    this._render();
    this._setupEventListeners();
  }

  /**
   * Set the tool call data
   */
  set toolCall(value) {
    this._toolCall = value;
    this._render();
  }

  /**
   * Get the tool call data
   */
  get toolCall() {
    return this._toolCall;
  }

  /**
   * Toggle expanded state
   */
  toggleExpanded() {
    this._expanded = !this._expanded;
    this._render();
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    const details = this.shadowRoot.querySelector("details");
    if (details) {
      details.addEventListener("toggle", (e) => {
        this._expanded = e.target.open;
        this._emitEvent("ai-tool-expanded", { expanded: this._expanded });
      });
    }
  }

  /**
   * Emit custom event
   */
  _emitEvent(type, detail = {}) {
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Escape HTML
   */
  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render the component
   */
  _render() {
    if (!this._toolCall) return;

    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          --ai-surface-muted: #f9fafb;
          --ai-border: #e5e7eb;
          --ai-text: #111827;
          --ai-text-muted: #6b7280;
          --ai-radius-md: 10px;
          --ai-space-2: 8px;
          --ai-space-3: 12px;
          --ai-space-4: 16px;
          font-size: 14px;
          line-height: 1.5;
        }

        @media (prefers-color-scheme: dark) {
          :host {
            --ai-surface-muted: #111827;
            --ai-border: #374151;
            --ai-text: #f3f4f6;
            --ai-text-muted: #9ca3af;
          }
        }

        [part="tool-container"] {
          margin: var(--ai-space-3) 0;
          padding: var(--ai-space-3);
          border: 1px solid var(--ai-border);
          border-radius: var(--ai-radius-md);
          background-color: var(--ai-surface-muted);
        }

        [part="tool-summary"] {
          cursor: pointer;
          font-weight: 500;
          user-select: none;
          display: flex;
          align-items: center;
          gap: var(--ai-space-2);
        }

        [part="tool-icon"] {
          font-size: 16px;
        }

        [part="tool-details"] {
          margin-top: var(--ai-space-3);
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
        }

        [part="tool-details"] pre {
          margin: 0;
          color: var(--ai-text);
        }

        [part="tool-actions"] {
          display: flex;
          gap: var(--ai-space-2);
          margin-top: var(--ai-space-3);
          flex-wrap: wrap;
        }

        [part="tool-actions"] button {
          padding: var(--ai-space-2) var(--ai-space-3);
          border: 1px solid var(--ai-border);
          border-radius: 4px;
          background-color: transparent;
          color: var(--ai-text);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        [part="tool-actions"] button:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        @media (prefers-color-scheme: dark) {
          [part="tool-actions"] button:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        }

        [part="status"] {
          display: inline-block;
          font-size: 11px;
          padding: var(--ai-space-1) var(--ai-space-2);
          border-radius: 3px;
          margin-left: var(--ai-space-2);
          background-color: rgba(59, 130, 246, 0.1);
          color: var(--ai-text);
        }
      </style>

      <div part="tool-container" role="article" aria-label="Tool call: ${this._escapeHtml(this._toolCall.name)}">
        <details ?open="${this._expanded}">
          <summary part="tool-summary">
            <span part="tool-icon">📞</span>
            <span>${this._escapeHtml(this._toolCall.name)}</span>
            ${this._toolCall.status ? `<span part="status">${this._escapeHtml(this._toolCall.status)}</span>` : ""}
          </summary>
          
          <div part="tool-details">
            <pre>${this._escapeHtml(JSON.stringify({
              input: this._toolCall.input,
              output: this._toolCall.output,
              status: this._toolCall.status
            }, null, 2))}</pre>
          </div>

          <div part="tool-actions">
            <button data-action="copy-input" aria-label="Copy input">Copy Input</button>
            ${this._toolCall.output ? `<button data-action="copy-output" aria-label="Copy output">Copy Output</button>` : ""}
            <button data-action="copy-all" aria-label="Copy all">Copy All</button>
          </div>
        </details>
      </div>
    `;

    this._setupActionListeners();
  }

  /**
   * Setup action button listeners
   */
  _setupActionListeners() {
    const buttons = this.shadowRoot.querySelectorAll("button[data-action]");
    buttons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        this._handleAction(button.dataset.action);
      });
    });
  }

  /**
   * Handle button actions
   */
  _handleAction(action) {
    if (!this._toolCall) return;

    let content = "";
    switch (action) {
      case "copy-input":
        content = JSON.stringify(this._toolCall.input, null, 2);
        break;
      case "copy-output":
        content = JSON.stringify(this._toolCall.output, null, 2);
        break;
      case "copy-all":
        content = JSON.stringify({
          input: this._toolCall.input,
          output: this._toolCall.output
        }, null, 2);
        break;
      default:
        return;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(content).then(() => {
        this._emitEvent("ai-tool-action", { action, success: true });
      });
    }
  }
}

export function defineAIToolCallElement() {
  if (!customElements.get("ai-tool-call")) {
    customElements.define("ai-tool-call", AIToolCallElement);
  }
}

export { AIToolCallElement };
