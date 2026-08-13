/**
 * Renderer Registry Factory
 * Creates universal renderer registries that work with any framework
 */

/**
 * Create a new renderer registry instance
 * Can be used independently or integrated into workspace/session
 * @returns {AIRendererRegistry} A new registry instance
 */
export function createRendererRegistry() {
  const artifactRenderers = new Map();
  const toolRenderers = new Map();
  const artifactListeners = new Set();
  const toolListeners = new Set();

  return {
    // Artifact Renderer Methods
    registerArtifact(type, renderer) {
      if (!type || typeof type !== "string") {
        throw new Error("Artifact type must be a non-empty string");
      }
      if (!renderer || typeof renderer.render !== "function") {
        throw new Error("Renderer must have a render function");
      }
      artifactRenderers.set(type, renderer);
      this._notifyArtifactListeners({
        type: "artifact.registered",
        artifactType: type
      });
    },

    getArtifactRenderer(type) {
      return artifactRenderers.get(type);
    },

    hasArtifact(type) {
      return artifactRenderers.has(type);
    },

    listArtifacts() {
      return Array.from(artifactRenderers.keys());
    },

    unregisterArtifact(type) {
      artifactRenderers.delete(type);
      this._notifyArtifactListeners({
        type: "artifact.unregistered",
        artifactType: type
      });
    },

    subscribeArtifacts(listener) {
      artifactListeners.add(listener);
      return () => artifactListeners.delete(listener);
    },

    // Tool Renderer Methods
    registerTool(name, renderer) {
      if (!name || typeof name !== "string") {
        throw new Error("Tool name must be a non-empty string");
      }
      if (!renderer || typeof renderer.renderInput !== "function") {
        throw new Error("Renderer must have a renderInput function");
      }
      toolRenderers.set(name, renderer);
      this._notifyToolListeners({
        type: "tool.registered",
        name
      });
    },

    getToolRenderer(name) {
      return toolRenderers.get(name);
    },

    hasTool(name) {
      return toolRenderers.has(name);
    },

    listTools() {
      return Array.from(toolRenderers.keys());
    },

    unregisterTool(name) {
      toolRenderers.delete(name);
      this._notifyToolListeners({
        type: "tool.unregistered",
        name
      });
    },

    subscribeTools(listener) {
      toolListeners.add(listener);
      return () => toolListeners.delete(listener);
    },

    // Internal notification methods
    _notifyArtifactListeners(event) {
      for (const listener of artifactListeners) {
        listener(event);
      }
    },

    _notifyToolListeners(event) {
      for (const listener of toolListeners) {
        listener(event);
      }
    }
  };
}

export default createRendererRegistry;
