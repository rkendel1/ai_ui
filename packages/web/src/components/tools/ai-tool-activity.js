/**
 * Tool activity panel component
 * Displays active and completed tool calls in a panel format
 */

const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIToolActivityElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._session = null;
    this._state = null;
    this._unsubscribe = null;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  /**
   * Set a pre-created session
   */
  set session(session) {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
    this._session = session;
    if (session) {
      this._unsubscribe = session.subscribe((state) => {
        this._state = state;
        this._renderToolCalls();
      });
      this._state = session.getState();
      this._renderToolCalls();
    }
  }

  /**
   * Get the current session
   */
  get session() {
    return this._session;
  }

  /**
   * Main render template
   */
  _render() {
    const styles = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--ai-surface);
          border-left: 1px solid var(--ai-border);
          font-family: var(--ai-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
          font-size: 13px;
          color: var(--ai-text);
        }

        [part="header"] {
          padding: var(--ai-space-3);
          border-bottom: 1px solid var(--ai-border);
          font-weight: 600;
          font-size: 14px;
          background-color: var(--ai-surface-muted);
        }

        [part="container"] {
          flex: 1;
          overflow-y: auto;
          padding: var(--ai-space-3);
        }

        [part="empty-state"] {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--ai-text-muted);
          text-align: center;
          padding: var(--ai-space-3);
        }

        [part="tool-item"] {
          margin-bottom: var(--ai-space-3);
          padding: var(--ai-space-2);
          border: 1px solid var(--ai-border);
          border-radius: var(--ai-radius-md);
          background-color: var(--ai-surface-muted);
          overflow: hidden;
        }

        [part="tool-header"] {
          display: flex;
          align-items: center;
          gap: var(--ai-space-2);
          margin-bottom: var(--ai-space-2);
          cursor: pointer;
          user-select: none;
        }

        [part="tool-status-icon"] {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
        }

        [part="tool-status-pending"] {
          background-color: #e5e7eb;
          color: #6b7280;
        }

        [part="tool-status-running"] {
          background-color: #fbbf24;
          color: white;
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        [part="tool-status-approval_required"] {
          background-color: #f87171;
          color: white;
        }

        [part="tool-status-completed"] {
          background-color: #34d399;
          color: white;
        }

        [part="tool-status-failed"] {
          background-color: #ef4444;
          color: white;
        }

        [part="tool-name"] {
          flex: 1;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        [part="tool-status-text"] {
          font-size: 11px;
          color: var(--ai-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        [part="tool-content"] {
          margin-top: var(--ai-space-2);
          padding: var(--ai-space-2);
          background-color: var(--ai-surface);
          border-radius: var(--ai-radius-sm);
          font-family: monospace;
          font-size: 11px;
          overflow-x: auto;
          max-height: 150px;
          overflow-y: auto;
          color: var(--ai-text-muted);
          white-space: pre-wrap;
          word-break: break-all;
        }

        [part="scroll-indicator"] {
          text-align: center;
          padding: var(--ai-space-3);
          color: var(--ai-text-muted);
          font-size: 12px;
        }
      </style>

      <div part="header">Tool Activity</div>
      <div part="container" role="log" aria-live="polite" aria-label="Tool activity">
        <div part="empty-state">No tools running</div>
      </div>
    `;

    this.shadowRoot.innerHTML = styles;
  }

  /**
   * Render tool calls
   */
  _renderToolCalls() {
    if (!this._state) return;

    const container = this.shadowRoot.querySelector('[part="container"]');
    const { activeToolCalls } = this._state;

    if (!activeToolCalls || activeToolCalls.length === 0) {
      container.innerHTML = `
        <div part="empty-state">No tools running</div>
      `;
      return;
    }

    container.innerHTML = "";

    activeToolCalls.forEach((toolCall) => {
      const item = document.createElement("div");
      item.setAttribute("part", "tool-item");
      item.innerHTML = this._renderToolCallItem(toolCall);
      container.appendChild(item);
    });
  }

  /**
   * Render a single tool call item
   */
  _renderToolCallItem(toolCall) {
    const statusIcon = this._getStatusIcon(toolCall.status);
    const statusText = this._getStatusText(toolCall.status);
    const statusPart = `tool-status-${toolCall.status || "pending"}`;
    
    let content = "";
    if (toolCall.input) {
      content += `<div part="tool-content"><strong>Input:</strong>\n${this._escapeHtml(JSON.stringify(toolCall.input, null, 2))}</div>`;
    }
    
    if (toolCall.output) {
      content += `<div part="tool-content"><strong>Output:</strong>\n${this._escapeHtml(JSON.stringify(toolCall.output, null, 2))}</div>`;
    }
    
    if (toolCall.error) {
      content += `<div part="tool-content"><strong>Error:</strong>\n${this._escapeHtml(JSON.stringify(toolCall.error, null, 2))}</div>`;
    }

    return `
      <div part="tool-header">
        <div part="tool-status-icon" part="${statusPart}">${statusIcon}</div>
        <div part="tool-name" title="${this._escapeHtml(toolCall.name)}">${this._escapeHtml(toolCall.name)}</div>
        <div part="tool-status-text">${statusText}</div>
      </div>
      ${content}
    `;
  }

  /**
   * Get status icon for tool call
   */
  _getStatusIcon(status) {
    switch (status) {
      case "pending": return "◯";
      case "running": return "⟳";
      case "approval_required": return "⚠";
      case "completed": return "✓";
      case "failed": return "✕";
      case "rejected": return "✕";
      default: return "•";
    }
  }

  /**
   * Get status text for tool call
   */
  _getStatusText(status) {
    switch (status) {
      case "pending": return "Pending";
      case "running": return "Running";
      case "approval_required": return "Needs approval";
      case "completed": return "Done";
      case "failed": return "Failed";
      case "rejected": return "Rejected";
      default: return status;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  _escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

export function defineAIToolActivityElement(tagName = "ai-tool-activity") {
  if (typeof customElements === "undefined") {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, AIToolActivityElement);
  }
}

// Auto-register by default
if (typeof customElements !== "undefined") {
  defineAIToolActivityElement();
}
