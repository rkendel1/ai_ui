/**
 * Composable AI Workspace
 * Combines ai-chat, ai-artifacts, and ai-tool-activity in a flexible layout
 */

import { createAISession } from "@ai-ui/core/runtime";

const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIWorkspaceElement extends HTMLElementBase {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._session = null;
    this._config = {};
    this._state = null;
    this._unsubscribe = null;
    this._layout = "default"; // "default" | "compact" | "wide"
    this._showArtifacts = true;
    this._showToolActivity = true;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this._render();
    this._setupChildComponents();
    
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
   * Configure the workspace
   */
  configure({ transport, context, tools, layout, showArtifacts, showToolActivity, ...config } = {}) {
    this._config = { transport, context, tools, ...config };
    if (layout) this._layout = layout;
    if (showArtifacts !== undefined) this._showArtifacts = showArtifacts;
    if (showToolActivity !== undefined) this._showToolActivity = showToolActivity;
    
    this._render();
    
    if (transport && !this._session) {
      this._initializeSession();
    }
  }

  /**
   * Register a plugin with workspace-local renderers
   */
  use(plugin) {
    if (!plugin || !plugin.name) {
      throw new Error("Plugin must have a name");
    }

    // Get or create registry (lazy init)
    if (!this._registry) {
      const { artifactRegistry, toolRegistry } = require("@ai-ui/core");
      this._registry = {
        artifacts: artifactRegistry,
        tools: toolRegistry
      };
    }

    // Register artifact renderers
    if (plugin.artifacts && Array.isArray(plugin.artifacts)) {
      plugin.artifacts.forEach((artifact) => {
        if (artifact.type && artifact.renderer) {
          this._registry.artifacts.register(artifact.type, artifact.renderer);
        }
      });
    }

    // Register tool renderers
    if (plugin.tools && Array.isArray(plugin.tools)) {
      plugin.tools.forEach((tool) => {
        if (tool.name && tool.renderer) {
          this._registry.tools.register(tool.name, tool.renderer);
        }
      });
    }

    return this;
  }

  /**
   * Access workspace renderer registry (for direct registration)
   */
  get registry() {
    if (!this._registry) {
      const { artifactRegistry, toolRegistry } = require("@ai-ui/core");
      this._registry = {
        artifacts: artifactRegistry,
        tools: toolRegistry
      };
    }
    return this._registry;
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
        this._propagateSessionToChildren();
      });
      this._state = session.getState();
      this._propagateSessionToChildren();
    }
  }

  /**
   * Get the current session
   */
  get session() {
    return this._session;
  }

  /**
   * Set layout mode
   */
  set layout(value) {
    if (["default", "compact", "wide"].includes(value)) {
      this._layout = value;
      this._render();
    }
  }

  /**
   * Get layout mode
   */
  get layout() {
    return this._layout;
  }

  /**
   * Toggle artifact panel visibility
   */
  toggleArtifacts() {
    this._showArtifacts = !this._showArtifacts;
    this._render();
  }

  /**
   * Toggle tool activity panel visibility
   */
  toggleToolActivity() {
    this._showToolActivity = !this._showToolActivity;
    this._render();
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
      this._propagateSessionToChildren();
    });
    this._state = this._session.getState();
    this._propagateSessionToChildren();
  }

  /**
   * Main render template
   */
  _render() {
    const isCompact = this._layout === "compact";
    const isWide = this._layout === "wide";

    const styles = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--ai-surface);
          font-family: var(--ai-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
          color: var(--ai-text);
        }

        [part="workspace-container"] {
          display: flex;
          flex: 1;
          gap: 0;
          overflow: hidden;
        }

        [part="chat-panel"] {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        [part="sidebar"] {
          display: flex;
          gap: 0;
          background-color: var(--ai-surface-muted);
        }

        [part="artifacts-panel"] {
          width: 300px;
          border-left: 1px solid var(--ai-border);
          overflow: hidden;
        }

        [part="tool-activity-panel"] {
          width: 250px;
          border-left: 1px solid var(--ai-border);
          overflow: hidden;
        }

        [part="header"] {
          padding: var(--ai-space-3);
          border-bottom: 1px solid var(--ai-border);
          background-color: var(--ai-surface-muted);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--ai-space-3);
        }

        [part="header-title"] {
          font-weight: 600;
          font-size: 14px;
        }

        [part="header-controls"] {
          display: flex;
          gap: var(--ai-space-2);
        }

        [part="header-controls"] button {
          padding: var(--ai-space-1) var(--ai-space-2);
          border: 1px solid var(--ai-border);
          border-radius: var(--ai-radius-sm);
          background-color: var(--ai-surface);
          color: var(--ai-text);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }

        [part="header-controls"] button:hover {
          background-color: var(--ai-surface-hover);
        }

        [part="header-controls"] button[aria-pressed="false"] {
          opacity: 0.6;
        }

        /* Compact layout */
        ${isCompact ? `
          [part="sidebar"] {
            display: none;
          }
        ` : ""}

        /* Wide layout */
        ${isWide ? `
          [part="artifacts-panel"] {
            width: 400px;
          }
          
          [part="tool-activity-panel"] {
            width: 350px;
          }
        ` : ""}

        /* Hide panels based on visibility */
        ${!this._showArtifacts ? `[part="artifacts-panel"] { display: none; }` : ""}
        ${!this._showToolActivity ? `[part="tool-activity-panel"] { display: none; }` : ""}
      </style>

      <div part="header">
        <div part="header-title">AI Workspace</div>
        <div part="header-controls">
          <button 
            aria-label="Toggle artifact panel"
            aria-pressed="${this._showArtifacts ? "true" : "false"}"
            data-control="artifacts"
            ${isCompact ? "disabled" : ""}>
            📋 Artifacts
          </button>
          <button 
            aria-label="Toggle tool activity panel"
            aria-pressed="${this._showToolActivity ? "true" : "false"}"
            data-control="tools"
            ${isCompact ? "disabled" : ""}>
            🔧 Tools
          </button>
          <select aria-label="Select layout" data-control="layout">
            <option value="default" ${this._layout === "default" ? "selected" : ""}>Default</option>
            <option value="compact" ${this._layout === "compact" ? "selected" : ""}>Compact</option>
            <option value="wide" ${this._layout === "wide" ? "selected" : ""}>Wide</option>
          </select>
        </div>
      </div>

      <div part="workspace-container">
        <div part="chat-panel">
          <slot name="chat"></slot>
        </div>
        
        <div part="sidebar">
          ${this._showArtifacts ? `<div part="artifacts-panel"><slot name="artifacts"></slot></div>` : ""}
          ${this._showToolActivity ? `<div part="tool-activity-panel"><slot name="tool-activity"></slot></div>` : ""}
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = styles;
    this._setupHeaderListeners();
  }

  /**
   * Setup listeners for header controls
   */
  _setupHeaderListeners() {
    const controls = this.shadowRoot.querySelectorAll("[data-control]");
    controls.forEach((control) => {
      control.addEventListener("click", (e) => {
        if (e.target.dataset.control === "artifacts") {
          this.toggleArtifacts();
        } else if (e.target.dataset.control === "tools") {
          this.toggleToolActivity();
        }
      });
    });

    const layoutSelect = this.shadowRoot.querySelector('[data-control="layout"]');
    if (layoutSelect) {
      layoutSelect.addEventListener("change", (e) => {
        this.layout = e.target.value;
      });
    }
  }

  /**
   * Setup child components
   */
  _setupChildComponents() {
    // The child components (ai-chat, ai-artifacts, ai-tool-activity) will be
    // slotted from the parent, so we just need to propagate the session to them
    this._propagateSessionToChildren();
  }

  /**
   * Propagate session to child components
   */
  _propagateSessionToChildren() {
    if (!this._session) return;

    // Find child components in the light DOM
    const chatElement = this.querySelector("ai-chat");
    const artifactsElement = this.querySelector("ai-artifacts");
    const toolActivityElement = this.querySelector("ai-tool-activity");

    if (chatElement) {
      chatElement.session = this._session;
    }
    if (artifactsElement) {
      artifactsElement.session = this._session;
    }
    if (toolActivityElement) {
      toolActivityElement.session = this._session;
    }
  }
}

export function defineAIWorkspaceElement(tagName = "ai-workspace") {
  if (typeof customElements === "undefined") {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, AIWorkspaceElement);
  }
}

// Auto-register by default
if (typeof customElements !== "undefined") {
  defineAIWorkspaceElement();
}
