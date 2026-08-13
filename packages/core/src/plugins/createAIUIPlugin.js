/**
 * AI UI Plugin Factory
 * Simplifies creating well-formed plugins for AI UI
 */

/**
 * Create an AI UI plugin
 * @param {Object} options - Plugin configuration
 * @param {string} options.name - Unique plugin name
 * @param {Array} [options.artifacts] - Array of artifact renderers
 * @param {Array} [options.tools] - Array of tool renderers
 * @param {Array} [options.actions] - Array of artifact actions
 * @returns {AIUIPlugin} A well-formed plugin object
 */
export function createAIUIPlugin({
  name,
  artifacts = [],
  tools = [],
  actions = []
} = {}) {
  if (!name || typeof name !== "string") {
    throw new Error("Plugin name must be a non-empty string");
  }

  // Validate artifacts
  const validatedArtifacts = artifacts.map((artifact) => {
    if (!artifact.type) {
      throw new Error("Artifact renderer must have a 'type' property");
    }
    if (!artifact.renderer || typeof artifact.renderer.render !== "function") {
      throw new Error(`Artifact renderer for type '${artifact.type}' must have a 'render' function`);
    }
    return {
      type: artifact.type,
      renderer: artifact.renderer
    };
  });

  // Validate tools
  const validatedTools = tools.map((tool) => {
    if (!tool.name) {
      throw new Error("Tool renderer must have a 'name' property");
    }
    if (!tool.renderer || typeof tool.renderer.renderInput !== "function") {
      throw new Error(
        `Tool renderer for '${tool.name}' must have a 'renderInput' function`
      );
    }
    return {
      name: tool.name,
      renderer: tool.renderer
    };
  });

  // Validate actions
  const validatedActions = actions.map((action) => {
    if (!action.id) {
      throw new Error("Action must have an 'id' property");
    }
    if (typeof action.handler !== "function") {
      throw new Error(`Action '${action.id}' must have a 'handler' function`);
    }
    return {
      id: action.id,
      handler: action.handler
    };
  });

  return {
    name,
    artifacts: validatedArtifacts,
    tools: validatedTools,
    actions: validatedActions
  };
}

/**
 * Create an artifact renderer configuration
 * @param {string} type - Artifact type
 * @param {Object} renderer - Renderer implementation
 * @returns {Object} Artifact renderer config
 */
export function createArtifactRenderer(type, renderer) {
  if (!type || typeof type !== "string") {
    throw new Error("Artifact type must be a non-empty string");
  }
  if (!renderer || typeof renderer.render !== "function") {
    throw new Error("Renderer must have a render function");
  }

  return {
    type,
    renderer: {
      type,
      ...renderer
    }
  };
}

/**
 * Create a tool renderer configuration
 * @param {string} name - Tool name
 * @param {Object} renderer - Renderer implementation
 * @returns {Object} Tool renderer config
 */
export function createToolRenderer(name, renderer) {
  if (!name || typeof name !== "string") {
    throw new Error("Tool name must be a non-empty string");
  }
  if (!renderer || typeof renderer.renderInput !== "function") {
    throw new Error("Renderer must have a renderInput function");
  }

  return {
    name,
    renderer: {
      name,
      ...renderer
    }
  };
}

/**
 * Create an artifact action
 * @param {string} id - Action identifier
 * @param {Function} handler - Action handler function
 * @returns {Object} Action config
 */
export function createArtifactAction(id, handler) {
  if (!id || typeof id !== "string") {
    throw new Error("Action id must be a non-empty string");
  }
  if (typeof handler !== "function") {
    throw new Error("Action handler must be a function");
  }

  return {
    id,
    handler
  };
}

export default createAIUIPlugin;
