import { ROUTING_POLICY_NAMES, ROUTING_ERROR_CODES } from "./types.js";
import { BUILT_IN_POLICIES } from "./policies.js";
import {
  createInvalidSelectorError,
  createNoSuitableModelError,
  createNoModelSelectedError,
  createInvalidPolicyError,
  createPolicyEvaluationError
} from "./errors.js";

/**
 * Determines if a selector is a predefined policy name
 * @param {string} selector
 * @returns {boolean}
 */
export function isPredefinedPolicy(selector) {
  return Object.values(ROUTING_POLICY_NAMES).includes(selector);
}

/**
 * Determines if a selector is an explicit model ID (format: "provider:model-id")
 * @param {string} selector
 * @returns {boolean}
 */
export function isExplicitModelId(selector) {
  return typeof selector === 'string' && selector.includes(':');
}

/**
 * Select a model based on the given selector
 * 
 * @param {string | "auto" | "fast" | "cheap" | "reasoning" | "vision" | "local"} selector - Model selector
 * @param {import("./types.js").AIModelCatalog} catalog - Model catalog
 * @param {Object} [options] - Selection options
 * @param {Object} [options.requirements] - Derived capability requirements
 * @param {import("../capabilities/types.js").AIModel[]} [options.availableModels] - Pre-filtered models
 * @param {Map<string, import("./types.js").AIRoutingPolicy>} [options.policies] - Custom routing policies
 * @returns {import("./types.js").AIRouteResult}
 * @throws {Error} If model selection fails
 */
export function selectModel(selector, catalog, options = {}) {
  const { requirements, availableModels, policies = new Map() } = options;

  // Validate selector
  if (!selector || typeof selector !== 'string') {
    throw createInvalidSelectorError(selector, {
      reason: 'Selector must be a non-empty string'
    });
  }

  // Handle explicit model ID (format: "provider:model-id")
  if (isExplicitModelId(selector)) {
    return selectExplicitModel(selector, catalog, { availableModels });
  }

  // Handle predefined policies
  if (isPredefinedPolicy(selector)) {
    return selectByPolicy(selector, catalog, { requirements, availableModels, policies });
  }

  // Invalid selector
  throw createInvalidSelectorError(selector, {
    reason: `Unknown selector. Must be one of: auto, fast, cheap, reasoning, vision, local, or explicit format "provider:model-id"`
  });
}

/**
 * Select a model by explicit ID
 * @param {string} modelId - Model ID in format "provider:model-id"
 * @param {import("./types.js").AIModelCatalog} catalog
 * @param {Object} options
 * @param {import("../capabilities/types.js").AIModel[]} [options.availableModels]
 * @returns {import("./types.js").AIRouteResult}
 */
function selectExplicitModel(modelId, catalog, options = {}) {
  const { availableModels } = options;

  // Try to find model in available models first
  if (availableModels && Array.isArray(availableModels)) {
    const model = availableModels.find(m => m.id === modelId);
    if (model) {
      return {
        model,
        reason: `Explicitly selected model "${modelId}"`,
        confidence: 1.0
      };
    }
  }

  // Try to get from catalog
  if (catalog && catalog.get && typeof catalog.get === 'function') {
    try {
      const model = catalog.get(modelId);
      if (model) {
        return {
          model,
          reason: `Explicitly selected model "${modelId}"`,
          confidence: 1.0
        };
      }
    } catch (e) {
      // Fall through to error
    }
  }

  // Model not found
  throw createNoSuitableModelError({
    selector: modelId,
    reason: `Model "${modelId}" not found in catalog`
  });
}

/**
 * Select a model using a routing policy
 * @param {string} policyName
 * @param {import("./types.js").AIModelCatalog} catalog
 * @param {Object} options
 * @param {Object} [options.requirements]
 * @param {import("../capabilities/types.js").AIModel[]} [options.availableModels]
 * @param {Map<string, import("./types.js").AIRoutingPolicy>} [options.policies]
 * @returns {import("./types.js").AIRouteResult}
 */
function selectByPolicy(policyName, catalog, options = {}) {
  const { requirements, availableModels, policies = new Map() } = options;

  // Look up policy
  let policy = policies.get(policyName);
  if (!policy) {
    policy = BUILT_IN_POLICIES[policyName];
  }

  if (!policy) {
    throw createInvalidPolicyError(policyName);
  }

  if (!policy.evaluate || typeof policy.evaluate !== 'function') {
    throw createInvalidPolicyError(policyName, {
      reason: 'Policy does not have a valid evaluate function'
    });
  }

  // Evaluate policy
  let result;
  try {
    result = policy.evaluate(catalog, { requirements, availableModels });
  } catch (error) {
    throw createPolicyEvaluationError(policyName, error, {
      requirements,
      availableModels: availableModels ? availableModels.length : 0
    });
  }

  if (!result || !result.model) {
    throw createNoSuitableModelError({
      policy: policyName,
      requirements,
      availableModels: availableModels ? availableModels.length : 'unknown'
    });
  }

  return result;
}

/**
 * Select model from a list of candidates
 * Useful when you have pre-filtered available models
 * 
 * @param {string | "auto" | "fast" | "cheap" | "reasoning" | "vision" | "local"} selector
 * @param {import("../capabilities/types.js").AIModel[]} candidates - List of candidate models
 * @param {Object} [options]
 * @param {Object} [options.requirements] - Capability requirements
 * @param {Map<string, import("./types.js").AIRoutingPolicy>} [options.policies] - Custom policies
 * @returns {import("./types.js").AIRouteResult}
 */
export function selectModelFromCandidates(selector, candidates, options = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw createNoSuitableModelError({
      selector,
      reason: 'No candidate models provided'
    });
  }

  // Create a minimal catalog from candidates
  const catalog = {
    list: () => candidates,
    get: (id) => candidates.find(m => m.id === id)
  };

  return selectModel(selector, catalog, {
    ...options,
    availableModels: candidates
  });
}
