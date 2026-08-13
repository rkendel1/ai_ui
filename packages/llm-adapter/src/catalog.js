import { normalizeModel, normalizeModels } from "./normalize.js";
import {
  createInvalidRegistryError,
  createRegistryAccessError
} from "./errors.js";

/**
 * Create an AIModelCatalog from an external LLM registry
 * 
 * @param {Object} config - Configuration object
 * @param {Object} config.registry - External model registry
 * @param {Function} [config.registry.list] - Function to list available models
 * @param {Function} [config.registry.get] - Function to get a specific model
 * @param {Function} [config.registry.filter] - Function to filter models
 * @param {string} [config.defaultProvider] - Default provider name
 * @param {boolean} [config.cache] - Whether to cache models (default: true)
 * @returns {Object} AIModelCatalog implementation
 * @throws {Error} If registry configuration is invalid
 */
export function createLLMCatalog(config) {
  if (!config || typeof config !== "object") {
    throw createInvalidRegistryError("Config must be an object");
  }

  const { registry, defaultProvider = "unknown", cache = true } = config;

  if (!registry || typeof registry !== "object") {
    throw createInvalidRegistryError("Config.registry must be a valid object");
  }

  // Validate that registry has at least one required method
  if (!registry.list && !registry.get) {
    throw createInvalidRegistryError(
      "Registry must have a 'list' or 'get' method"
    );
  }

  let modelCache = null;
  let cacheValid = false;

  /**
   * List all available models
   * @returns {Promise<Object[]>} Array of normalized AIModel objects
   */
  const list = async () => {
    // Return cached models if valid
    if (cache && cacheValid && modelCache) {
      return modelCache;
    }

    // Try to call registry.list()
    if (registry.list && typeof registry.list === "function") {
      try {
        let models = await Promise.resolve(registry.list());
        
        // Handle different return types
        if (!Array.isArray(models)) {
          if (models && typeof models.models === "object") {
            // Handle { models: [...] } format
            models = Array.isArray(models.models) ? models.models : [];
          } else if (models && typeof models[Symbol.iterator] === "function") {
            // Handle iterable
            models = Array.from(models);
          } else {
            throw new Error("Registry.list() must return an array or iterable");
          }
        }

        const normalized = normalizeModels(models, { defaultProvider });
        
        if (cache) {
          modelCache = normalized;
          cacheValid = true;
        }

        return normalized;
      } catch (error) {
        throw createRegistryAccessError(`Failed to list models: ${error.message}`, {
          originalError: error.message
        });
      }
    }

    // If no list method and no cache, throw error
    throw createInvalidRegistryError(
      "Registry must have a 'list' method to enumerate models"
    );
  };

  /**
   * Get a specific model by ID
   * @param {string} id - Model ID
   * @returns {Promise<Object|undefined>} Normalized AIModel or undefined
   */
  const get = async (id) => {
    if (!id || typeof id !== "string") {
      return undefined;
    }

    // Try registry.get() first if available
    if (registry.get && typeof registry.get === "function") {
      try {
        const model = await Promise.resolve(registry.get(id));
        if (model) {
          return normalizeModel(model, { defaultProvider });
        }
      } catch (error) {
        // Fall through to list-based lookup
        console.debug(`Registry.get('${id}') failed:`, error.message);
      }
    }

    // Fall back to searching in list
    try {
      const allModels = await list();
      return allModels.find((m) => m.id === id);
    } catch (error) {
      throw createRegistryAccessError(
        `Failed to get model "${id}": ${error.message}`,
        { modelId: id, originalError: error.message }
      );
    }
  };

  /**
   * Filter models by criteria
   * @param {Function} predicate - Filter predicate function
   * @returns {Promise<Object[]>} Filtered array of AIModel objects
   */
  const filter = async (predicate) => {
    if (typeof predicate !== "function") {
      throw new Error("Filter predicate must be a function");
    }

    // Try registry.filter() first if available
    if (registry.filter && typeof registry.filter === "function") {
      try {
        let models = await Promise.resolve(registry.filter(predicate));
        if (Array.isArray(models)) {
          return normalizeModels(models, { defaultProvider });
        }
      } catch (error) {
        // Fall through to list-based filtering
        console.debug("Registry.filter() failed:", error.message);
      }
    }

    // Fall back to filtering list
    try {
      const allModels = await list();
      return allModels.filter(predicate);
    } catch (error) {
      throw createRegistryAccessError(
        `Failed to filter models: ${error.message}`,
        { originalError: error.message }
      );
    }
  };

  /**
   * Get default model for a selector
   * @param {string} selector - Selector (auto, fast, cheap, reasoning, vision, local)
   * @returns {Promise<Object|undefined>} Default AIModel for selector or undefined
   */
  const getDefault = async (selector) => {
    if (!selector || typeof selector !== "string") {
      return undefined;
    }

    // Try registry.getDefault() first if available
    if (registry.getDefault && typeof registry.getDefault === "function") {
      try {
        const model = await Promise.resolve(registry.getDefault(selector));
        if (model) {
          return normalizeModel(model, { defaultProvider });
        }
      } catch (error) {
        // Fall through to custom logic
        console.debug(`Registry.getDefault('${selector}') failed:`, error.message);
      }
    }

    // Custom logic for selector-based defaults
    try {
      const allModels = await list();
      if (allModels.length === 0) return undefined;

      switch (selector.toLowerCase()) {
        case "fast":
          // Prefer models with "fast" in ID or smallest context
          return (
            allModels.find((m) => m.id.includes("fast")) ||
            allModels.reduce((best, m) => 
              !best || (m.contextWindow || 0) < (best.contextWindow || 0) ? m : best
            )
          );

        case "cheap":
          // Prefer models with "cheap" in ID or smallest context
          return (
            allModels.find((m) => m.id.includes("cheap")) ||
            allModels.reduce((best, m) =>
              !best || (m.contextWindow || 0) < (best.contextWindow || 0) ? m : best
            )
          );

        case "reasoning":
          // Prefer models with reasoning capability
          return allModels.find((m) => m.capabilities?.reasoning === true);

        case "vision":
          // Prefer models with vision capability
          return allModels.find((m) => m.capabilities?.vision === true);

        case "local":
          // Prefer models with local provider
          return allModels.find((m) => m.provider.toLowerCase() === "local");

        case "auto":
        default:
          // Return first model
          return allModels[0];
      }
    } catch (error) {
      throw createRegistryAccessError(
        `Failed to get default model for selector "${selector}": ${error.message}`,
        { selector, originalError: error.message }
      );
    }
  };

  /**
   * Invalidate cache
   */
  const invalidateCache = () => {
    cacheValid = false;
    modelCache = null;
  };

  return {
    list,
    get,
    filter,
    getDefault,
    invalidateCache
  };
}
