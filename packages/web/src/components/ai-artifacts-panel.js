/**
 * Artifacts panel component
 * Displays generated artifacts in a panel format
 */

const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIArtifactsPanelElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._session = null;
    this._state = null;
    this._unsubscribe = null;
    this._selectedArtifactId = null;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
    this._setupEventListeners();
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
        this._renderArtifacts();
      });
      this._state = session.getState();
      this._renderArtifacts();
    }
  }

  /**
   * Get the current session
   */
  get session() {
    return this._session;
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    const container = this.shadowRoot.querySelector('[part="container"]');
    if (container) {
      container.addEventListener("click", (e) => {
        const item = e.target.closest('[data-artifact-id]');
        if (item) {
          this._selectedArtifactId = item.dataset.artifactId;
          this._renderArtifacts();
        }
      });
    }
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
          overflow-x: hidden;
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

        [part="artifact-list"] {
          display: flex;
          flex-direction: column;
          gap: var(--ai-space-2);
        }

        [part="artifact-item"] {
          padding: var(--ai-space-2);
          border: 1px solid var(--ai-border);
          border-radius: var(--ai-radius-md);
          background-color: var(--ai-surface-muted);
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }

        [part="artifact-item"]:hover {
          background-color: var(--ai-surface-hover);
          border-color: var(--ai-accent);
        }

        [part="artifact-item"][aria-selected="true"] {
          border-color: var(--ai-accent);
          background-color: var(--ai-surface);
        }

        [part="artifact-name"] {
          font-weight: 500;
          margin-bottom: var(--ai-space-1);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        [part="artifact-type"] {
          font-size: 11px;
          color: var(--ai-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      </style>

      <div part="header">📋 Artifacts</div>
      <div part="container" role="region" aria-label="Artifacts list">
        <div part="empty-state">No artifacts yet</div>
      </div>
    `;

    this.shadowRoot.innerHTML = styles;
  }

  /**
   * Render artifacts list
   */
  _renderArtifacts() {
    if (!this._state) return;

    const container = this.shadowRoot.querySelector('[part="container"]');
    const { artifacts } = this._state;

    if (!artifacts || artifacts.length === 0) {
      container.innerHTML = `
        <div part="empty-state">No artifacts yet</div>
      `;
      return;
    }

    let html = `<div part="artifact-list">`;

    artifacts.forEach((artifact, index) => {
      const isSelected = this._selectedArtifactId === artifact.id || (index === artifacts.length - 1 && !this._selectedArtifactId);
      if (isSelected && !this._selectedArtifactId) {
        this._selectedArtifactId = artifact.id;
      }

      const artifactTitle = artifact.title || `${artifact.type} artifact`;
      html += `
        <div 
          part="artifact-item" 
          data-artifact-id="${this._escapeAttr(artifact.id)}"
          aria-selected="${isSelected}"
          role="option"
          tabindex="0">
          <div part="artifact-name" title="${this._escapeHtml(artifactTitle)}">${this._escapeHtml(artifactTitle)}</div>
          <div part="artifact-type">${this._escapeHtml(artifact.type)}</div>
        </div>
      `;
    });

    html += `</div>`;

    container.innerHTML = html;

    this._setupEventListeners();
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
   * Escape attribute value
   */
  _escapeAttr(text) {
    if (!text) return "";
    return text.replace(/[&<>"']/g, (c) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
      return map[c];
    });
  }
}

export function defineAIArtifactsPanelElement(tagName = "ai-artifacts-panel") {
  if (typeof customElements === "undefined") {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, AIArtifactsPanelElement);
  }
}

// Auto-register by default
if (typeof customElements !== "undefined") {
  defineAIArtifactsPanelElement();
}
