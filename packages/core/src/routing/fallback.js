import { selectModel } from "./selector.js";
import { createModelFallbackExhaustedError } from "./errors.js";
import { supportsAllCapabilities } from "../capabilities/index.js";

/**
 * Convert requirements object to array of capability names
 * @param {Object} requirements - Capabilities object with boolean values
 * @returns {string[]} Array of required capability names
 */
function getRequiredCapabilities(requirements) {
  if (!requirements || typeof requirements !== 'object') {
    return [];
  }
  return Object.entries(requirements)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
}

/**
 * Execute a request with fallback models
 * 
 * @param {Object} options
 * @param {string | string[]} options.selector - Primary selector or fallback chain
 * @param {import("./types.js").AIModelCatalog} options.catalog - Model catalog
 * @param {Function} options.execute - Execution function that takes a model
 * @param {Object} [options.requirements] - Capability requirements
 * @param {import("../capabilities/types.js").AIModel[]} [options.availableModels] - Pre-filtered models
 * @param {number} [options.maxRetries] - Maximum fallback attempts (default: 3)
 * @param {boolean} [options.requireAllCapabilities] - Require all capabilities (default: true)
 * @param {Function} [options.onFallback] - Callback when falling back to another model
 * @returns {Promise<any>} Result from execute function
 * @throws {Error} If all fallback attempts exhausted
 */
export async function executeWithFallback(options) {
  const {
    selector,
    catalog,
    execute,
    requirements,
    availableModels,
    maxRetries = 3,
    requireAllCapabilities = true,
    onFallback
  } = options;

  if (!catalog) {
    throw new Error('executeWithFallback requires a catalog option');
  }

  if (!execute || typeof execute !== 'function') {
    throw new Error('executeWithFallback requires an execute function');
  }

  // Build fallback chain
  let chain = [];
  if (Array.isArray(selector)) {
    chain = selector;
  } else if (typeof selector === 'string') {
    chain = [selector];
  } else {
    throw new Error('executeWithFallback requires selector as string or array of strings');
  }

  // Add generic fallbacks if not enough in chain
  const builtInFallbacks = ['auto', 'cheap', 'fast'];
  for (const fallback of builtInFallbacks) {
    if (!chain.includes(fallback) && chain.length < maxRetries) {
      chain.push(fallback);
    }
  }

  let lastError = null;
  let attempt = 0;
  const attempted = new Set();
  const requiredCaps = getRequiredCapabilities(requirements);

  for (const sel of chain) {
    if (attempt >= maxRetries) {
      break;
    }

    attempt++;

    // Skip if we've already tried this selector
    if (attempted.has(sel)) {
      continue;
    }
    attempted.add(sel);

    try {
      // Select model
      const route = selectModel(sel, catalog, {
        requirements,
        availableModels
      });

      // Check if model meets requirements
      if (requirements && requireAllCapabilities && requiredCaps.length > 0) {
        if (!supportsAllCapabilities(route.model, requiredCaps)) {
          lastError = new Error(
            `Model "${route.model.id}" does not support all required capabilities`
          );
          onFallback && onFallback(sel, route.model, lastError, attempt);
          continue;
        }
      }

      // Execute with selected model
      try {
        return await execute(route.model);
      } catch (executionError) {
        // Execution failed, try fallback
        lastError = executionError;
        onFallback && onFallback(sel, route.model, executionError, attempt);
        continue;
      }
    } catch (selectionError) {
      // Selection failed, try next in chain
      lastError = selectionError;
      continue;
    }
  }

  // All fallbacks exhausted
  throw createModelFallbackExhaustedError({
    chain,
    attempts: attempt,
    maxRetries,
    lastError: lastError ? lastError.message : 'No models could be selected'
  });
}

/**
 * Build a fallback chain from requirements
 * Determines which selectors to try based on what capabilities are needed
 * 
 * @param {Object} requirements - Capability requirements
 * @returns {string[]} Fallback chain
 */
export function buildFallbackChain(requirements) {
  const chain = ['auto']; // Always start with auto

  // Add capability-specific selectors if needed
  if (requirements && requirements.reasoning) {
    chain.push('reasoning');
  }

  if (requirements && requirements.vision) {
    chain.push('vision');
  }

  // Add general fallbacks
  chain.push('fast', 'cheap', 'local');

  return chain;
}

/**
 * Create fallback configuration
 * 
 * @param {Object} options
 * @param {string | string[]} [options.selector] - Primary or fallback chain
 * @param {number} [options.maxRetries] - Maximum attempts (default: 3)
 * @param {boolean} [options.requireAllCapabilities] - Require all capabilities (default: true)
 * @param {boolean} [options.enabled] - Whether fallback is enabled (default: true)
 * @returns {import("./types.js").AIFallbackOptions}
 */
export function createFallbackConfig(options = {}) {
  const {
    selector,
    maxRetries = 3,
    requireAllCapabilities = true,
    enabled = true
  } = options;

  let chain = [];
  if (Array.isArray(selector)) {
    chain = selector;
  } else if (typeof selector === 'string') {
    chain = [selector];
  }

  return {
    enabled,
    chain,
    maxRetries,
    requireAllCapabilities
  };
}
