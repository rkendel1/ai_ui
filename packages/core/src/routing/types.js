/**
 * @typedef {("auto" | "fast" | "cheap" | "reasoning" | "vision" | "local" | string)} AIModelSelector
 * 
 * Predefined selectors:
 * - "auto": Automatically select the best model for the task
 * - "fast": Select the fastest available model
 * - "cheap": Select the most cost-effective model
 * - "reasoning": Select a model with reasoning capabilities
 * - "vision": Select a model with vision capabilities
 * - "local": Select a locally-running model
 * 
 * Or an explicit model ID in format "provider:model-id" (e.g., "openai:gpt-5")
 */

/**
 * @typedef {Object} AIRoutingPolicy
 * @property {string} name - Name of the routing policy
 * @property {string} description - Description of the policy behavior
 * @property {Function} evaluate - Function to evaluate and select a model
 * @property {Function} [fallback] - Optional function to determine fallback behavior
 */

/**
 * @typedef {Object} AIFallbackOptions
 * @property {boolean} [enabled] - Whether fallback is enabled
 * @property {AIModelSelector[]} [chain] - Chain of models to try in order
 * @property {number} [maxRetries] - Maximum number of fallback attempts
 * @property {boolean} [requireAllCapabilities] - Whether to require all requested capabilities
 */

/**
 * @typedef {Object} AIRouteResult
 * @property {import("../capabilities/types.js").AIModel} model - Selected model
 * @property {string} reason - Reason for selection
 * @property {number} confidence - Confidence score (0-1)
 */

/**
 * @typedef {Object} AIModelCatalog
 * @property {Function} list - List available models
 * @property {Function} [get] - Get a specific model by ID
 * @property {Function} [filter] - Filter models by criteria
 * @property {Function} [getDefault] - Get default model for a selector
 */

/**
 * Routing error codes
 */
export const ROUTING_ERROR_CODES = {
  NO_MODEL_SELECTED: "no_model_selected",
  INVALID_SELECTOR: "invalid_selector",
  NO_SUITABLE_MODEL: "no_suitable_model",
  MODEL_FALLBACK_EXHAUSTED: "model_fallback_exhausted",
  CATALOG_NOT_PROVIDED: "catalog_not_provided",
  POLICY_EVALUATION_ERROR: "policy_evaluation_error",
  INVALID_POLICY: "invalid_policy"
};

/**
 * Built-in routing policy names
 */
export const ROUTING_POLICY_NAMES = {
  AUTO: "auto",
  FAST: "fast",
  CHEAP: "cheap",
  REASONING: "reasoning",
  VISION: "vision",
  LOCAL: "local",
  EXPLICIT: "explicit"
};
