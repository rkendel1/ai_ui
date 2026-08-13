/**
 * Tool approval component
 * First-class primitive for requesting user authorization
 */

const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIToolApprovalElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._toolCall = null;
    this._approved = false;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
    this._setupEventListeners();
  }

  /**
   * Set the tool call requiring approval
   */
  set toolCall(value) {
    this._toolCall = value;
    this._render();
  }

  /**
   * Get the tool call
   */
  get toolCall() {
    return this._toolCall;
  }

  /**
   * Approve the action
   */
  approve() {
    this._approved = true;
    this._emitEvent("ai-approval-approved", { toolCallId: this._toolCall?.id });
  }

  /**
   * Reject the action
   */
  reject(reason) {
    this._approved = false;
    this._emitEvent("ai-approval-rejected", { toolCallId: this._toolCall?.id, reason });
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    const root = this.shadowRoot;
    const approveBtn = root.querySelector("[data-approve]");
    const rejectBtn = root.querySelector("[data-reject]");
    
    if (approveBtn) {
      approveBtn.addEventListener("click", () => this.approve());
      approveBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.approve();
        }
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => this.reject());
      rejectBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.reject();
        }
      });
    }

    // Escape to cancel
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this._approved) {
        this.reject("Cancelled");
      }
    });
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
    const reasonText = this._toolCall.reason || `The AI wants to execute: ${this._escapeHtml(this._toolCall.name)}`;
    
    root.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          --ai-surface: #ffffff;
          --ai-border: #e5e7eb;
          --ai-text: #111827;
          --ai-text-muted: #6b7280;
          --ai-accent: #3b82f6;
          --ai-error: #ef4444;
          --ai-radius-md: 10px;
          --ai-space-2: 8px;
          --ai-space-3: 12px;
          --ai-space-4: 16px;
          font-size: 14px;
          line-height: 1.5;
        }

        @media (prefers-color-scheme: dark) {
          :host {
            --ai-surface: #1f2937;
            --ai-border: #374151;
            --ai-text: #f3f4f6;
            --ai-text-muted: #9ca3af;
          }
        }

        [part="approval-dialog"] {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        [part="approval-content"] {
          background-color: var(--ai-surface);
          border-radius: var(--ai-radius-md);
          padding: var(--ai-space-4);
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--ai-border);
        }

        [part="approval-title"] {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: var(--ai-space-3);
          color: var(--ai-text);
        }

        [part="approval-reason"] {
          color: var(--ai-text-muted);
          margin-bottom: var(--ai-space-4);
          line-height: 1.6;
        }

        [part="approval-input-preview"] {
          background-color: #f9fafb;
          border: 1px solid var(--ai-border);
          border-radius: 6px;
          padding: var(--ai-space-3);
          margin-bottom: var(--ai-space-4);
          font-family: monospace;
          font-size: 12px;
          max-height: 200px;
          overflow-y: auto;
        }

        @media (prefers-color-scheme: dark) {
          [part="approval-input-preview"] {
            background-color: #111827;
          }
        }

        [part="approval-actions"] {
          display: flex;
          gap: var(--ai-space-3);
          justify-content: flex-end;
        }

        [part="approval-actions"] button {
          padding: var(--ai-space-2) var(--ai-space-3);
          border-radius: 6px;
          border: 1px solid var(--ai-border);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          background-color: transparent;
          color: var(--ai-text);
          min-width: 100px;
        }

        [part="approval-actions"] button:hover {
          background-color: var(--ai-border);
        }

        [part="approval-actions"] button:focus {
          outline: none;
          ring: 2px var(--ai-accent);
        }

        [part="approval-actions"] [data-approve] {
          background-color: var(--ai-accent);
          color: white;
          border-color: var(--ai-accent);
        }

        [part="approval-actions"] [data-approve]:hover {
          opacity: 0.9;
        }

        [part="approval-actions"] [data-reject] {
          background-color: transparent;
          border-color: var(--ai-border);
          color: var(--ai-text);
        }

        [part="approval-actions"] [data-reject]:hover {
          background-color: var(--ai-error);
          color: white;
          border-color: var(--ai-error);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      </style>

      <div part="approval-dialog" role="alertdialog" aria-modal="true" aria-labelledby="approval-title">
        <div part="approval-content">
          <div part="approval-title" id="approval-title">
            Approval Required
          </div>
          
          <div part="approval-reason">
            ${reasonText}
          </div>

          ${this._toolCall.input ? `
            <div>
              <div style="font-weight: 500; font-size: 12px; color: var(--ai-text-muted); margin-bottom: var(--ai-space-2);">
                Input:
              </div>
              <div part="approval-input-preview">
                <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">
${this._escapeHtml(JSON.stringify(this._toolCall.input, null, 2))}
                </pre>
              </div>
            </div>
          ` : ""}

          <div part="approval-actions">
            <button data-reject aria-label="Reject this action">
              Cancel
            </button>
            <button data-approve aria-label="Approve this action">
              Approve
            </button>
          </div>
        </div>
      </div>
    `;

    this._setupEventListeners();
  }
}

export function defineAIToolApprovalElement() {
  if (!customElements.get("ai-tool-approval")) {
    customElements.define("ai-tool-approval", AIToolApprovalElement);
  }
}

export { AIToolApprovalElement };
