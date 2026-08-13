/**
 * Universal registry system for tools and artifacts
 * Allows applications to register custom renderers and handlers
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.listeners = new Set();
  }

  /**
   * Register a custom tool renderer
   * @param {string} name - Tool name
   * @param {Object} renderer - Renderer configuration
   * @param {Function} renderer.render - Function to render the tool (receives toolCall object)
   * @param {Function} [renderer.validate] - Optional validation function
   */
  register(name, renderer) {
    if (!name || typeof name !== "string") {
      throw new Error("Tool name must be a non-empty string");
    }
    if (!renderer || typeof renderer.render !== "function") {
      throw new Error("Renderer must have a render function");
    }
    this.tools.set(name, renderer);
    this._notifyListeners({ type: "tool.registered", name });
  }

  /**
   * Get a registered tool renderer
   * @param {string} name - Tool name
   * @returns {Object|null} Renderer or null if not found
   */
  get(name) {
    return this.tools.get(name) || null;
  }

  /**
   * Check if a tool is registered
   * @param {string} name - Tool name
   * @returns {boolean}
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * Get all registered tool names
   * @returns {string[]}
   */
  list() {
    return Array.from(this.tools.keys());
  }

  /**
   * Unregister a tool
   * @param {string} name - Tool name
   */
  unregister(name) {
    this.tools.delete(name);
    this._notifyListeners({ type: "tool.unregistered", name });
  }

  /**
   * Listen to registry changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(event) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

class ArtifactRegistry {
  constructor() {
    this.renderers = new Map();
    this.listeners = new Set();
  }

  /**
   * Register a custom artifact renderer
   * @param {string} type - Artifact type (e.g., "code", "table", "chart")
   * @param {Object} renderer - Renderer configuration
   * @param {Function} renderer.render - Function to render the artifact
   * @param {Function} [renderer.canHandle] - Optional function to check if renderer can handle artifact
   * @param {Function} [renderer.export] - Optional function to export artifact
   */
  register(type, renderer) {
    if (!type || typeof type !== "string") {
      throw new Error("Artifact type must be a non-empty string");
    }
    if (!renderer || typeof renderer.render !== "function") {
      throw new Error("Renderer must have a render function");
    }
    this.renderers.set(type, renderer);
    this._notifyListeners({ type: "artifact.registered", artifactType: type });
  }

  /**
   * Get a registered artifact renderer
   * @param {string} type - Artifact type
   * @returns {Object|null} Renderer or null if not found
   */
  get(type) {
    return this.renderers.get(type) || null;
  }

  /**
   * Check if an artifact type is registered
   * @param {string} type - Artifact type
   * @returns {boolean}
   */
  has(type) {
    return this.renderers.has(type);
  }

  /**
   * Get all registered artifact types
   * @returns {string[]}
   */
  list() {
    return Array.from(this.renderers.keys());
  }

  /**
   * Unregister an artifact type
   * @param {string} type - Artifact type
   */
  unregister(type) {
    this.renderers.delete(type);
    this._notifyListeners({ type: "artifact.unregistered", artifactType: type });
  }

  /**
   * Listen to registry changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(event) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

// Global registry instances
export const toolRegistry = new ToolRegistry();
export const artifactRegistry = new ArtifactRegistry();

export { ToolRegistry, ArtifactRegistry };
