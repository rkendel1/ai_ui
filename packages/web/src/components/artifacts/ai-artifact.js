/**
 * First-class artifact component
 * Universal renderer for AI-generated artifacts
 */

import { artifactRegistry } from "@ai-ui/core";
import { JSONArtifactRenderer } from "./json-renderer.js";
import { CodeArtifactRenderer, TextArtifactRenderer } from "./code-renderer.js";
import { TableArtifactRenderer } from "./table-renderer.js";

const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIArtifactElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._artifact = null;
    this._expanded = false;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
    this._setupEventListeners();
  }

  /**
   * Set the artifact data
   */
  set artifact(value) {
    this._artifact = value;
    this._render();
  }

  /**
   * Get the artifact data
   */
  get artifact() {
    return this._artifact;
  }

  /**
   * Expand/collapse the artifact
   */
  toggleExpanded() {
    this._expanded = !this._expanded;
    this._render();
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    const headerButton = this.shadowRoot.querySelector("[data-toggle]");
    if (headerButton) {
      headerButton.addEventListener("click", () => this.toggleExpanded());
    }

    // Setup action listeners
    const buttons = this.shadowRoot.querySelectorAll("[data-action]");
    buttons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        this._handleAction(button.dataset.action);
      });
    });
  }

  /**
   * Handle artifact actions
   */
  _handleAction(action) {
    if (!this._artifact) return;

    switch (action) {
      case "copy": {
        const content = typeof this._artifact.content === "string"
          ? this._artifact.content
          : JSON.stringify(this._artifact.content, null, 2);
        
        if (navigator.clipboard) {
          navigator.clipboard.writeText(content).then(() => {
            this._emitEvent("ai-artifact-action", { action, success: true });
          });
        }
        break;
      }
      case "export": {
        const renderer = this._getRenderer();
        if (renderer && renderer.export) {
          renderer.export(this._artifact);
          this._emitEvent("ai-artifact-action", { action, success: true });
        }
        break;
      }
      default:
        this._emitEvent("ai-artifact-action", { action, success: false });
    }
  }

  /**
   * Get the appropriate renderer for this artifact
   */
  _getRenderer() {
    // Try to find a custom renderer in registry
    const customRenderer = artifactRegistry.get(this._artifact.type);
    if (customRenderer) {
      return customRenderer;
    }

    // Try built-in renderers
    const builtInRenderers = [
      JSONArtifactRenderer,
      CodeArtifactRenderer,
      TextArtifactRenderer,
      TableArtifactRenderer
    ];

    for (const renderer of builtInRenderers) {
      if (renderer.canHandle(this._artifact)) {
        return renderer;
      }
    }

    // Fallback renderer
    return {
      canHandle: () => true,
      render: (artifact) => {
        const div = document.createElement("div");
        div.style.cssText = `
          padding: 12px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #6b7280;
        `;
        div.textContent = `Unsupported artifact type: ${artifact.type}`;
        return div;
      }
    };
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
    if (!this._artifact) return;

    const root = this.shadowRoot;
    const renderer = this._getRenderer();

    root.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          --ai-surface: #ffffff;
          --ai-surface-muted: #f9fafb;
          --ai-border: #e5e7eb;
          --ai-text: #111827;
          --ai-text-muted: #6b7280;
          --ai-accent: #3b82f6;
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
            --ai-surface-muted: #111827;
            --ai-border: #374151;
            --ai-text: #f3f4f6;
            --ai-text-muted: #9ca3af;
          }
        }

        [part="artifact-container"] {
          background-color: var(--ai-surface);
          border: 1px solid var(--ai-border);
          border-radius: var(--ai-radius-md);
          overflow: hidden;
        }

        [part="artifact-header"] {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ai-space-4);
          border-bottom: 1px solid var(--ai-border);
          background-color: var(--ai-surface-muted);
        }

        [part="artifact-title"] {
          font-weight: 500;
          color: var(--ai-text);
          flex: 1;
        }

        [part="artifact-status"] {
          display: inline-block;
          font-size: 11px;
          padding: var(--ai-space-1) var(--ai-space-2);
          border-radius: 3px;
          background-color: rgba(59, 130, 246, 0.1);
          color: var(--ai-text-muted);
          margin-right: var(--ai-space-2);
        }

        [part="artifact-actions"] {
          display: flex;
          gap: var(--ai-space-2);
        }

        [part="artifact-actions"] button {
          padding: 4px 8px;
          border: 1px solid var(--ai-border);
          background-color: transparent;
          color: var(--ai-text);
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        [part="artifact-actions"] button:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        @media (prefers-color-scheme: dark) {
          [part="artifact-actions"] button:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        }

        [part="artifact-content"] {
          padding: var(--ai-space-4);
          display: ${this._expanded ? "block" : "none"};
        }

        [data-toggle] {
          cursor: pointer;
          user-select: none;
        }
      </style>

      <div part="artifact-container" role="article" aria-label="Artifact: ${this._escapeHtml(this._artifact.title || this._artifact.type)}">
        <div part="artifact-header">
          <div style="display: flex; align-items: center; flex: 1; gap: var(--ai-space-3); cursor: pointer;" data-toggle>
            <span style="font-size: 16px;">${this._getTypeIcon()}</span>
            <div part="artifact-title">${this._escapeHtml(this._artifact.title || this._artifact.type)}</div>
            ${this._artifact.status ? `<span part="artifact-status">${this._escapeHtml(this._artifact.status)}</span>` : ""}
          </div>
          
          <div part="artifact-actions">
            <button data-action="copy" aria-label="Copy content">Copy</button>
            <button data-action="export" aria-label="Export artifact">Export</button>
          </div>
        </div>

        <div part="artifact-content"></div>
      </div>
    `;

    // Render content
    const contentDiv = root.querySelector('[part="artifact-content"]');
    if (contentDiv && this._expanded) {
      const renderedContent = renderer.render(this._artifact);
      contentDiv.appendChild(renderedContent);
    }

    this._setupEventListeners();
  }

  /**
   * Get icon for artifact type
   */
  _getTypeIcon() {
    const icons = {
      text: "📄",
      code: "💻",
      json: "{}",
      table: "📊",
      image: "🖼️",
      chart: "📈",
      document: "📑",
      custom: "🔧"
    };
    return icons[this._artifact?.type] || "📦";
  }
}

export function defineAIArtifactElement() {
  if (!customElements.get("ai-artifact")) {
    customElements.define("ai-artifact", AIArtifactElement);
  }
}

export { AIArtifactElement };
