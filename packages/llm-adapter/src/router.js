import { selectModel } from "@ai-ui/core/routing";
import { deriveRequirements } from "@ai-ui/core/capabilities";
import {
  createInvalidRouterConfigError,
  createRouterSelectionError
} from "./errors.js";

/**
 * Create an LLM router that integrates external routing with ai-ui model selection
 * 
 * @param {Object} config - Configuration object
 * @param {Object} config.catalog - AIModelCatalog implementation
 * @param {Object} [config.router] - External LLM router (optional)
 * @param {Function} [config.router.route] - Routing function
 * @param {Object} [config.policies] - Custom routing policies
 * @param {Function} [config.onRoute] - Callback when routing happens
 * @param {Function} [config.onFallback] - Callback when fallback occurs
 * @returns {Object} Router implementation with route() method
 * @throws {Error} If router configuration is invalid
 */
export function createLLMRouter(config = {}) {
  const {
    catalog,
    router: externalRouter,
    policies = new Map(),
    onRoute,
    onFallback
  } = config;

  if (!catalog || typeof catalog !== "object") {
    throw createInvalidRouterConfigError(
      "Config.catalog must be a valid AIModelCatalog"
    );
  }

  if (!catalog.list && !catalog.get) {
    throw createInvalidRouterConfigError(
      "Catalog must have 'list' or 'get' method"
    );
  }

  /**
   * Route a request to the best available model
   * 
   * @param {Object} config - Routing configuration
   * @param {string} [config.selector] - Model selector (auto, fast, cheap, reasoning, vision, local, or explicit model ID)
   * @param {string} [config.message] - User message for capability detection
   * @param {Object} [config.requirements] - Explicit capability requirements
   * @param {Array<string>} [config.fallbackChain] - Fallback selectors to try
   * @param {Object} [config.context] - Additional routing context
   * @returns {Promise<Object>} Route result with selected model
   * @throws {Error} If routing fails
   */
  const route = async (config = {}) => {
    const {
      selector = "auto",
      message,
      requirements,
      fallbackChain,
      context = {}
    } = config;

    // Try external router first if available
    if (externalRouter && externalRouter.route && typeof externalRouter.route === "function") {
      try {
        const externalResult = await Promise.resolve(externalRouter.route(config));
        if (externalResult && externalResult.model) {
          if (onRoute) {
            onRoute({ route: externalResult, source: "external" });
          }
          return externalResult;
        }
      } catch (error) {
        console.debug("External router failed:", error.message);
        // Fall through to core routing
      }
    }

    // Derive requirements from message if not provided
    let derivedRequirements = requirements;
    if (!derivedRequirements && message) {
      try {
        derivedRequirements = deriveRequirements({ message });
      } catch (error) {
        console.debug("Failed to derive requirements:", error.message);
        derivedRequirements = {};
      }
    }

    // Pre-fetch available models to support both sync and async catalogs
    let availableModels = [];
    try {
      availableModels = await catalog.list();
    } catch (error) {
      throw createRouterSelectionError(
        `Failed to list available models: ${error.message}`,
        { originalError: error.message }
      );
    }

    // Prepare list of selectors to try
    const selectorsToTry = Array.isArray(fallbackChain)
      ? fallbackChain
      : [selector];

    let lastError = null;

    // Try each selector in the chain
    for (const sel of selectorsToTry) {
      try {
        const result = selectModel(sel, catalog, {
          requirements: derivedRequirements,
          availableModels,
          policies
        });

        if (result && result.model) {
          if (onRoute) {
            onRoute({ route: result, selector: sel, source: "core" });
          }
          return result;
        }
      } catch (error) {
        lastError = error;
        if (onFallback) {
          onFallback({ selector: sel, error, attempt: selectorsToTry.indexOf(sel) });
        }
        // Continue to next selector
        continue;
      }
    }

    // All selectors failed
    throw createRouterSelectionError(
      `Failed to select model with selector "${selector}"${
        lastError ? `: ${lastError.message}` : ""
      }`,
      {
        selector,
        fallbackChain,
        requirements: derivedRequirements,
        lastError: lastError?.message
      }
    );
  };

  /**
   * Get model by ID (convenience method)
   * @param {string} modelId - Model ID
   * @returns {Promise<Object|undefined>} Model or undefined
   */
  const getModel = async (modelId) => {
    if (!modelId || typeof modelId !== "string") {
      return undefined;
    }

    // Try external router's getModel if available
    if (externalRouter && externalRouter.getModel && typeof externalRouter.getModel === "function") {
      try {
        const model = await Promise.resolve(externalRouter.getModel(modelId));
        if (model) return model;
      } catch (error) {
        console.debug(`External router getModel('${modelId}') failed:`, error.message);
      }
    }

    // Use catalog.get()
    try {
      return await catalog.get(modelId);
    } catch (error) {
      throw createRouterSelectionError(
        `Failed to get model "${modelId}": ${error.message}`,
        { modelId, originalError: error.message }
      );
    }
  };

  /**
   * List all available models
   * @returns {Promise<Object[]>} Array of available models
   */
  const listModels = async () => {
    try {
      return await catalog.list();
    } catch (error) {
      throw createRouterSelectionError(
        `Failed to list models: ${error.message}`,
        { originalError: error.message }
      );
    }
  };

  /**
   * Filter models by criteria
   * @param {Function} predicate - Filter predicate
   * @returns {Promise<Object[]>} Filtered models
   */
  const filterModels = async (predicate) => {
    try {
      return await catalog.filter(predicate);
    } catch (error) {
      throw createRouterSelectionError(
        `Failed to filter models: ${error.message}`,
        { originalError: error.message }
      );
    }
  };

  /**
   * Get recommended model for a selector
   * @param {string} selector - Selector (auto, fast, cheap, etc.)
   * @returns {Promise<Object|undefined>} Recommended model
   */
  const getRecommendedModel = async (selector) => {
    try {
      // Try external router's getRecommendedModel first
      if (externalRouter && externalRouter.getRecommendedModel && typeof externalRouter.getRecommendedModel === "function") {
        const model = await Promise.resolve(externalRouter.getRecommendedModel(selector));
        if (model) return model;
      }

      // Use catalog.getDefault()
      return await catalog.getDefault(selector);
    } catch (error) {
      throw createRouterSelectionError(
        `Failed to get recommended model for "${selector}": ${error.message}`,
        { selector, originalError: error.message }
      );
    }
  };

  return {
    route,
    getModel,
    listModels,
    filterModels,
    getRecommendedModel
  };
}

/**
 * Create a standalone router without external router integration
 * Simpler version for basic use cases
 * 
 * @param {Object} catalog - AIModelCatalog implementation
 * @param {Object} [options] - Router options
 * @returns {Object} Router implementation
 */
export function createBasicRouter(catalog, options = {}) {
  return createLLMRouter({
    catalog,
    policies: options.policies,
    onRoute: options.onRoute,
    onFallback: options.onFallback
  });
}
