/**
 * AI UI Plugin System
 * Enables applications to extend AI UI with custom renderers, tools, and actions
 */

import { toolRegistry, artifactRegistry } from "@ai-ui/core";

class AIUIPluginManager {
  constructor() {
    this.plugins = [];
  }

  /**
   * Register a plugin
   */
  register(plugin) {
    if (!plugin || !plugin.name) {
      throw new Error("Plugin must have a name");
    }

    // Register tool renderers
    if (plugin.tools && Array.isArray(plugin.tools)) {
      plugin.tools.forEach((tool) => {
        if (tool.name && tool.renderer) {
          toolRegistry.register(tool.name, tool.renderer);
        }
      });
    }

    // Register artifact renderers
    if (plugin.artifacts && Array.isArray(plugin.artifacts)) {
      plugin.artifacts.forEach((artifact) => {
        if (artifact.type && artifact.renderer) {
          artifactRegistry.register(artifact.type, artifact.renderer);
        }
      });
    }

    this.plugins.push(plugin);
    return this;
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginName) {
    const plugin = this.plugins.find((p) => p.name === pluginName);
    if (!plugin) {
      return false;
    }

    // Unregister tools
    if (plugin.tools && Array.isArray(plugin.tools)) {
      plugin.tools.forEach((tool) => {
        if (tool.name) {
          toolRegistry.unregister(tool.name);
        }
      });
    }

    // Unregister artifacts
    if (plugin.artifacts && Array.isArray(plugin.artifacts)) {
      plugin.artifacts.forEach((artifact) => {
        if (artifact.type) {
          artifactRegistry.unregister(artifact.type);
        }
      });
    }

    this.plugins = this.plugins.filter((p) => p.name !== pluginName);
    return true;
  }

  /**
   * Get registered plugins
   */
  list() {
    return this.plugins.map((p) => ({ name: p.name }));
  }

  /**
   * Get a plugin
   */
  get(pluginName) {
    return this.plugins.find((p) => p.name === pluginName);
  }
}

/**
 * Global plugin manager instance
 */
export const pluginManager = new AIUIPluginManager();

export { AIUIPluginManager };
export { createAIUIPlugin, createArtifactRenderer, createToolRenderer, createArtifactAction } from "./createAIUIPlugin.js";
