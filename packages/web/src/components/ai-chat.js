import { createAISession } from "@ai-ui/core/runtime";

const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIChatElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._session = null;
    this._config = {};
    this._state = null;
    this._unsubscribe = null;
    this._composerValue = "";
    this._lastScrollTop = 0;
    this._isUserScrolling = false;
    this._pendingScroll = false;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
    this._setupEventListeners();
    
    // Create session if we have a transport
    if (this._config.transport) {
      this._initializeSession();
    }
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  /**
   * Configure the chat component
   */
  configure({ transport, context, tools, ...config } = {}) {
    this._config = { transport, context, tools, ...config };
    if (transport && !this._session) {
      this._initializeSession();
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
        this._renderMessages();
        this._scrollToBottom();
      });
      this._state = session.getState();
      this._renderMessages();
    }
  }

  /**
   * Get the current session
   */
  get session() {
    return this._session;
  }

  /**
   * Initialize session from config
   */
  _initializeSession() {
    const { transport, context, tools } = this._config;
    if (!transport) return;

    this._session = createAISession({ transport, context, tools });
    this._unsubscribe = this._session.subscribe((state) => {
      this._state = state;
      this._renderMessages();
      this._updateComposerState();
      this._renderApprovalDialog();
      this._renderErrorBanner();
      this._scrollToBottom();
      this._emitStateEvents(state);
    });
    this._state = this._session.getState();
    this._renderMessages();
  }

  /**
   * Send a message
   */
  async send(message) {
    if (!this._session || !message) return;
    
    this._composerValue = "";
    this._updateComposerState();
    
    this._emitEvent("ai-submit", { message });
    
    try {
      this._emitEvent("ai-response-start");
      await this._session.send(message);
      this._emitEvent("ai-response-complete");
    } catch (error) {
      this._emitEvent("ai-error", { error });
    }
  }

  /**
   * Cancel current operation
   */
  cancel() {
    if (this._session) {
      this._session.cancel();
    }
  }

  /**
   * Retry last request
   */
  retry() {
    if (this._session) {
      this._session.retry();
    }
  }

  /**
   * Approve a tool call
   */
  approve(toolCallId) {
    this._emitEvent("ai-tool-approved", { toolCallId });
  }

  /**
   * Reject a tool call
   */
  reject(toolCallId) {
    this._emitEvent("ai-tool-rejected", { toolCallId });
  }

  /**
   * Clear all messages
   */
  clear() {
    if (this._session) {
      this._session.clear();
    }
  }

  /**
   * Setup DOM event listeners
   */
  _setupEventListeners() {
    const root = this.shadowRoot;
    
    // Composer events
    root.addEventListener("ai-composer-submit", (e) => {
      this.send(e.detail.message);
    });

    root.addEventListener("ai-composer-cancel", () => {
      this.cancel();
    });

    // Composer value tracking
    root.addEventListener("ai-composer-input", (e) => {
      this._composerValue = e.detail.value;
    });

    // Scroll tracking for auto-scroll
    root.addEventListener("scroll", (e) => {
      this._trackScroll(e);
    }, true);

    // Approval dialog events
    root.addEventListener("ai-approval-approved", (e) => {
      this.approve(e.detail.toolCallId);
    });

    root.addEventListener("ai-approval-rejected", (e) => {
      this.reject(e.detail.toolCallId);
    });

    // Error banner retry
    root.addEventListener("ai-retry", () => {
      this.retry();
    });
  }

  /**
   * Track scroll position
   */
  _trackScroll(e) {
    const container = e.target;
    if (container.getAttribute && container.getAttribute("part") !== "messages-container") {
      return;
    }
    const isAtBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    
    this._isUserScrolling = !isAtBottom;
  }

  /**
   * Emit a custom event
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
   * Emit state change events
   */
  _emitStateEvents(state) {
    if (state.status === "streaming") {
      // Already emitted on send
    }
    if (state.activeToolCalls.length > 0) {
      state.activeToolCalls.forEach((call) => {
        if (call.status === "running") {
          this._emitEvent("ai-tool-start", { toolCall: call });
        }
      });
    }
    if (state.status === "error" && state.error) {
      this._emitEvent("ai-error", { error: state.error });
    }
  }

  /**
   * Render the main UI
   */
  _render() {
    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        :host {
          --ai-font-family: system-ui, -apple-system, sans-serif;
          --ai-radius-sm: 6px;
          --ai-radius-md: 10px;
          --ai-radius-lg: 16px;
          --ai-space-1: 4px;
          --ai-space-2: 8px;
          --ai-space-3: 12px;
          --ai-space-4: 16px;
          --ai-surface: #ffffff;
          --ai-surface-muted: #f9fafb;
          --ai-surface-hover: #f3f4f6;
          --ai-text: #111827;
          --ai-text-muted: #6b7280;
          --ai-border: #e5e7eb;
          --ai-accent: #3b82f6;
          --ai-error: #ef4444;
          --ai-success: #10b981;
          
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 100%;
          font-family: var(--ai-font-family);
          font-size: 14px;
          line-height: 1.5;
          color: var(--ai-text);
          background-color: var(--ai-surface);
          border-radius: var(--ai-radius-lg);
          border: 1px solid var(--ai-border);
          overflow: hidden;
        }

        @media (prefers-color-scheme: dark) {
          :host {
            --ai-surface: #1f2937;
            --ai-surface-muted: #111827;
            --ai-surface-hover: #374151;
            --ai-text: #f3f4f6;
            --ai-text-muted: #9ca3af;
            --ai-border: #374151;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        [part="header"] {
          padding: var(--ai-space-4);
          border-bottom: 1px solid var(--ai-border);
          flex-shrink: 0;
        }

        [part="messages-container"] {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: var(--ai-space-4);
          display: flex;
          flex-direction: column;
          gap: var(--ai-space-3);
        }

        [part="empty-state"] {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: var(--ai-space-3);
          color: var(--ai-text-muted);
        }

        [part="empty-state"] .title {
          font-size: 16px;
          font-weight: 500;
          color: var(--ai-text);
        }

        [part="error-banner"] {
          padding: var(--ai-space-3);
          margin: var(--ai-space-3);
          background-color: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: var(--ai-radius-md);
          color: #991b1b;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ai-space-3);
        }

        @media (prefers-color-scheme: dark) {
          [part="error-banner"] {
            background-color: #7f1d1d;
            border-color: #b91c1c;
            color: #fecaca;
          }
        }

        [part="error-banner"] button {
          background-color: transparent;
          border: 1px solid currentColor;
          color: inherit;
          padding: var(--ai-space-2) var(--ai-space-3);
          border-radius: var(--ai-radius-sm);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
        }

        [part="error-banner"] button:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }

        [part="composer-container"] {
          padding: var(--ai-space-4);
          border-top: 1px solid var(--ai-border);
          flex-shrink: 0;
        }

        [part="approval-dialog"] {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        [part="approval-content"] {
          background-color: var(--ai-surface);
          border-radius: var(--ai-radius-lg);
          padding: var(--ai-space-4);
          max-width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        [part="approval-actions"] {
          display: flex;
          gap: var(--ai-space-3);
          margin-top: var(--ai-space-4);
          justify-content: flex-end;
        }

        [part="approval-actions"] button {
          padding: var(--ai-space-2) var(--ai-space-3);
          border-radius: var(--ai-radius-md);
          border: 1px solid var(--ai-border);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          background-color: transparent;
          color: inherit;
        }

        [part="approval-actions"] button:hover {
          background-color: var(--ai-surface-hover);
        }

        [part="approval-actions"] [data-approve] {
          background-color: var(--ai-accent);
          color: white;
          border-color: var(--ai-accent);
        }

        [part="approval-actions"] [data-approve]:hover {
          opacity: 0.9;
        }

        [part="new-response-indicator"] {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--ai-space-2) var(--ai-space-3);
          background-color: var(--ai-accent);
          color: white;
          border-radius: var(--ai-radius-md);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          margin: var(--ai-space-2) 0;
        }

        [part="new-response-indicator"]:hover {
          opacity: 0.9;
        }
      </style>

      <div part="header">
        <slot name="header"></slot>
      </div>

      <div part="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
        <slot name="empty"></slot>
      </div>

      <div part="composer-container">
        <slot name="composer"></slot>
      </div>
    `;
  }

  /**
   * Render messages
   */
  _renderMessages() {
    if (!this._state) return;

    const container = this.shadowRoot.querySelector('[part="messages-container"]');
    const { messages, status, error, activeToolCalls } = this._state;

    if (messages.length === 0) {
      container.innerHTML = `
        <div part="empty-state">
          <div class="title">Ask anything</div>
          <div style="font-size: 12px; opacity: 0.7; text-align: center;">
            <div>Summarize a document</div>
            <div>Analyze this customer</div>
            <div>Help me write something</div>
          </div>
        </div>
      `;
      return;
    }

    // Show error banner if present
    if (error) {
      this._renderErrorBanner();
    }

    // Render messages
    const messageHTML = messages.map((message, index) => {
      const isStreaming = status === "streaming" && index === messages.length - 1 && message.role === "assistant";
      return this._renderMessage(message, isStreaming);
    }).join("");

    container.innerHTML = messageHTML;

    // Show new response indicator if not at bottom
    if (this._isUserScrolling && status === "streaming") {
      const indicator = document.createElement("div");
      indicator.setAttribute("part", "new-response-indicator");
      indicator.textContent = "↓ New response";
      indicator.role = "button";
      indicator.tabIndex = 0;
      indicator.addEventListener("click", () => this._scrollToBottom());
      indicator.addEventListener("keypress", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          this._scrollToBottom();
        }
      });
      container.appendChild(indicator);
    }

    // Render tool calls
    if (activeToolCalls.length > 0) {
      const toolsHTML = activeToolCalls.map((call) => this._renderToolCall(call)).join("");
      container.innerHTML += toolsHTML;
    }
  }

  /**
   * Render a single message
   */
  _renderMessage(message, isStreaming = false) {
    const role = message.role === "user" ? "user" : "assistant";
    const isUser = role === "user";

    let contentHTML = this._escapeHtml(message.content);
    if (role === "assistant" && message.content) {
      contentHTML = this._renderMarkdown(message.content);
    }

    const streamingIndicator = isStreaming ? 
      `<div style="opacity: 0.5; font-size: 12px; margin-top: 8px;">Generating...</div>` : "";

    const reasoningHTML = message.reasoning ? 
      `<details style="margin-top: 12px; opacity: 0.8;">
        <summary style="cursor: pointer; font-weight: 500; font-size: 13px;">
          Thinking...
        </summary>
        <div style="margin-top: 8px; padding: 8px; background-color: var(--ai-surface-muted); border-radius: 4px; font-size: 13px; font-family: monospace;">
          ${this._escapeHtml(message.reasoning)}
        </div>
      </details>` : "";

    return `
      <div style="
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        align-items: flex-start;
      " role="article" aria-label="${isUser ? 'Your message' : 'Assistant message'}">
        <div style="
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: ${isUser ? 'var(--ai-accent)' : 'var(--ai-surface-muted)'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${isUser ? 'white' : 'var(--ai-text)'};
          font-weight: 500;
          font-size: 14px;
        ">
          ${isUser ? 'U' : 'A'}
        </div>
        <div style="flex: 1;">
          <div style="
            background-color: ${isUser ? 'var(--ai-accent)' : 'var(--ai-surface-muted)'};
            color: ${isUser ? 'white' : 'var(--ai-text)'};
            padding: 12px;
            border-radius: var(--ai-radius-md);
            word-break: break-word;
            overflow-wrap: break-word;
          ">
            ${contentHTML}
            ${streamingIndicator}
          </div>
          ${reasoningHTML}
        </div>
      </div>
    `;
  }

  /**
   * Render a tool call
   */
  _renderToolCall(toolCall) {
    return `
      <div style="
        margin: 12px 0;
        padding: 12px;
        border: 1px solid var(--ai-border);
        border-radius: var(--ai-radius-md);
        background-color: var(--ai-surface-muted);
      " role="article" aria-label="Tool call: ${toolCall.name}">
        <details>
          <summary style="cursor: pointer; font-weight: 500;">
            📞 Using tool: ${this._escapeHtml(toolCall.name)}
          </summary>
          <div style="margin-top: 12px; font-family: monospace; font-size: 12px; overflow-x: auto;">
            <pre style="margin: 0;">${this._escapeHtml(JSON.stringify({
              name: toolCall.name,
              input: toolCall.input,
              output: toolCall.output
            }, null, 2))}</pre>
          </div>
        </details>
      </div>
    `;
  }

  /**
   * Render error banner
   */
  _renderErrorBanner() {
    if (!this._state || !this._state.error) return;

    const container = this.shadowRoot.querySelector('[part="messages-container"]');
    const existingBanner = container.querySelector('[part="error-banner"]');
    if (existingBanner) return; // Don't render twice

    const banner = document.createElement("div");
    banner.setAttribute("part", "error-banner");
    banner.setAttribute("role", "alert");
    const messageText = this._escapeHtml(this._state.error.message);
    banner.innerHTML = `
      <div>${messageText}</div>
      <button aria-label="Try again">Try again</button>
    `;
    banner.querySelector("button").addEventListener("click", () => {
      this.retry();
    });
    container.insertBefore(banner, container.firstChild);
  }

  /**
   * Render approval dialog
   */
  _renderApprovalDialog() {
    if (!this._state || !this._state.activeToolCalls.some(c => c.status === "approval_required")) {
      // Hide dialog if no approval needed
      const dialog = this.shadowRoot.querySelector('[part="approval-dialog"]');
      if (dialog) dialog.remove();
      return;
    }

    const pendingCall = this._state.activeToolCalls.find(c => c.status === "approval_required");
    if (!pendingCall) return;

    const existingDialog = this.shadowRoot.querySelector('[part="approval-dialog"]');
    if (existingDialog) return; // Already showing

    const dialog = document.createElement("div");
    dialog.setAttribute("part", "approval-dialog");
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-label", "Approval required");
    const reasonText = this._escapeHtml(pendingCall.reason || `The AI wants to perform: ${pendingCall.name}`);
    dialog.innerHTML = `
      <div part="approval-content">
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px;">
          Approval Required
        </div>
        <div style="margin-bottom: 20px; line-height: 1.6;">
          ${reasonText}
        </div>
        <div part="approval-actions">
          <button aria-label="Reject this action" style="background-color: transparent;">
            Cancel
          </button>
          <button data-approve aria-label="Approve this action" style="">
            Approve
          </button>
        </div>
      </div>
    `;

    const cancelBtn = dialog.querySelector('button:first-child');
    const approveBtn = dialog.querySelector('[data-approve]');

    cancelBtn.addEventListener("click", () => {
      this.reject(pendingCall.id);
      dialog.remove();
    });

    approveBtn.addEventListener("click", () => {
      this.approve(pendingCall.id);
      dialog.remove();
    });

    this.shadowRoot.appendChild(dialog);
  }

  /**
   * Update composer state
   */
  _updateComposerState() {
    // Composer state is managed by the slot
  }

  /**
   * Simple markdown renderer (basic support)
   */
  _renderMarkdown(text) {
    let html = this._escapeHtml(text);

    // Code blocks (must be before inline code)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre style="background-color: var(--ai-surface-muted); padding: 12px; border-radius: 4px; overflow-x: auto; margin: 8px 0; font-family: monospace; font-size: 12px;"><code>${this._escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background-color: var(--ai-surface-muted); padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">$1</code>');

    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h3 style="margin: 16px 0 8px 0; font-size: 16px; font-weight: 600;">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 style="margin: 20px 0 10px 0; font-size: 18px; font-weight: 600;">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 style="margin: 24px 0 12px 0; font-size: 20px; font-weight: 700;">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--ai-accent); text-decoration: underline;">$1</a>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p style="margin: 12px 0;">');
    html = '<p style="margin: 0 0 12px 0;">' + html + '</p>';

    return html;
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

  /**
   * Scroll to bottom of messages
   */
  _scrollToBottom() {
    if (!this._pendingScroll) {
      this._pendingScroll = true;
      requestAnimationFrame(() => {
        const container = this.shadowRoot.querySelector('[part="messages-container"]');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
        this._pendingScroll = false;
        this._isUserScrolling = false;
      });
    }
  }
}

export function defineAIChatElement(tagName = "ai-chat") {
  if (typeof customElements === "undefined") {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, AIChatElement);
  }
}

// Auto-register by default
if (typeof customElements !== "undefined") {
  defineAIChatElement();
}
