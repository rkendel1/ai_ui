const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIComposerElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._value = "";
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
    this._setupEventListeners();
  }

  /**
   * Get the composer value
   */
  get value() {
    return this._value;
  }

  /**
   * Set the composer value
   */
  set value(val) {
    this._value = val;
    const textarea = this.shadowRoot.querySelector('textarea');
    if (textarea) {
      textarea.value = val;
    }
  }

  /**
   * Focus the composer
   */
  focus() {
    const textarea = this.shadowRoot.querySelector('textarea');
    if (textarea) {
      textarea.focus();
    }
  }

  /**
   * Clear the composer
   */
  clear() {
    this._value = "";
    const textarea = this.shadowRoot.querySelector('textarea');
    if (textarea) {
      textarea.value = "";
    }
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    const textarea = this.shadowRoot.querySelector('textarea');
    const sendBtn = this.shadowRoot.querySelector('[data-send]');

    textarea.addEventListener('input', (e) => {
      this._value = e.target.value;
      this._emitEvent('ai-composer-input', { value: this._value });
      this._updateHeight();
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._submit();
      }
    });

    sendBtn.addEventListener('click', () => {
      this._submit();
    });
  }

  /**
   * Submit the message
   */
  _submit() {
    if (!this._value.trim()) return;
    this._emitEvent('ai-composer-submit', { message: this._value });
    this.clear();
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
   * Update textarea height
   */
  _updateHeight() {
    const textarea = this.shadowRoot.querySelector('textarea');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  /**
   * Render the composer
   */
  _render() {
    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }

        [part="composer"] {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          background-color: var(--ai-surface);
          padding: 8px;
          border-radius: var(--ai-radius-md);
          border: 1px solid var(--ai-border);
        }

        textarea {
          flex: 1;
          min-height: 44px;
          max-height: 120px;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          background-color: var(--ai-surface-muted);
          color: var(--ai-text);
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          resize: none;
          outline: none;
        }

        textarea::placeholder {
          color: var(--ai-text-muted);
        }

        textarea:focus {
          background-color: var(--ai-surface);
          border: 1px solid var(--ai-accent);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        button {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background-color: var(--ai-accent);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          transition: all 0.2s;
        }

        button:hover:not(:disabled) {
          background-color: #2563eb;
          transform: scale(1.05);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        button:focus-visible {
          outline: 2px solid var(--ai-accent);
          outline-offset: 2px;
        }

        [part="hint"] {
          font-size: 12px;
          color: var(--ai-text-muted);
          margin-top: 4px;
          text-align: right;
        }
      </style>

      <div style="flex: 1;">
        <div part="composer">
          <textarea
            placeholder="Ask AI..."
            aria-label="Message input"
            rows="1"
          ></textarea>
          <button data-send type="button" aria-label="Send message" title="Send (Enter) or Add newline (Shift+Enter)">
            ↑
          </button>
        </div>
        <div part="hint">Shift+Enter for newline</div>
      </div>
    `;
  }
}

export function defineAIComposerElement(tagName = "ai-composer") {
  if (typeof customElements === "undefined") {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, AIComposerElement);
  }
}

// Auto-register by default
if (typeof customElements !== "undefined") {
  defineAIComposerElement();
}
