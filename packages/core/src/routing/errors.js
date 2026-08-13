import { ROUTING_ERROR_CODES } from "./types.js";

/**
 * Create a routing error
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} [context] - Additional context
 * @returns {Error}
 */
export function createRoutingError(code, message, context = {}) {
  const error = new Error(message);
  error.code = code;
  error.context = context;
  return error;
}

/**
 * Create a "no model selected" error
 * @param {Object} [context]
 * @returns {Error}
 */
export function createNoModelSelectedError(context) {
  return createRoutingError(
    ROUTING_ERROR_CODES.NO_MODEL_SELECTED,
    "No model was selected by the routing policy",
    context
  );
}

/**
 * Create an "invalid selector" error
 * @param {string} selector
 * @param {Object} [context]
 * @returns {Error}
 */
export function createInvalidSelectorError(selector, context) {
  return createRoutingError(
    ROUTING_ERROR_CODES.INVALID_SELECTOR,
    `Invalid model selector: ${selector}`,
    { selector, ...context }
  );
}

/**
 * Create a "no suitable model" error
 * @param {Object} [context]
 * @returns {Error}
 */
export function createNoSuitableModelError(context) {
  return createRoutingError(
    ROUTING_ERROR_CODES.NO_SUITABLE_MODEL,
    "No suitable model found matching the criteria",
    context
  );
}

/**
 * Create a "model fallback exhausted" error
 * @param {Object} [context]
 * @returns {Error}
 */
export function createModelFallbackExhaustedError(context) {
  return createRoutingError(
    ROUTING_ERROR_CODES.MODEL_FALLBACK_EXHAUSTED,
    "All fallback models have been exhausted",
    context
  );
}

/**
 * Create a "catalog not provided" error
 * @param {Object} [context]
 * @returns {Error}
 */
export function createCatalogNotProvidedError(context) {
  return createRoutingError(
    ROUTING_ERROR_CODES.CATALOG_NOT_PROVIDED,
    "Model catalog was not provided for model selection",
    context
  );
}

/**
 * Create a "policy evaluation error"
 * @param {string} policyName
 * @param {Error} error
 * @param {Object} [context]
 * @returns {Error}
 */
export function createPolicyEvaluationError(policyName, error, context) {
  return createRoutingError(
    ROUTING_ERROR_CODES.POLICY_EVALUATION_ERROR,
    `Routing policy "${policyName}" failed to evaluate: ${error.message}`,
    { policyName, originalError: error, ...context }
  );
}

/**
 * Create an "invalid policy" error
 * @param {string} policyName
 * @param {Object} [context]
 * @returns {Error}
 */
export function createInvalidPolicyError(policyName, context) {
  return createRoutingError(
    ROUTING_ERROR_CODES.INVALID_POLICY,
    `Invalid or unknown routing policy: ${policyName}`,
    { policyName, ...context }
  );
}
