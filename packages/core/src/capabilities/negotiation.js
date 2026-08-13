import { createCapabilityNegotiationError } from "./errors.js";

/**
 * Result of capability negotiation
 * @typedef {Object} NegotiationResult
 * @property {boolean} supported - Whether all requested capabilities are supported
 * @property {string[]} missing - Array of missing capability names (empty if all supported)
 * @property {string[]} supported_capabilities - Array of capabilities that are supported
 */

/**
 * Negotiate capabilities between requested and available
 *
 * @param {Object} options - Negotiation options
 * @param {Object} options.requested - Requested capabilities
 * @param {Object} options.available - Available capabilities from model
 * @param {string} [options.modelId] - Model ID for error reporting
 * @param {string} [options.providerId] - Provider ID for error reporting
 * @returns {NegotiationResult}
 *
 * @example
 * const result = negotiateCapabilities({
 *   requested: { tools: true, vision: true },
 *   available: { tools: true, vision: false, streaming: true }
 * });
 * // Returns: { supported: false, missing: ["vision"], supported_capabilities: ["tools", "streaming"] }
 */
export function negotiateCapabilities(options) {
  const { requested = {}, available = {}, modelId, providerId } = options;

  if (!requested || typeof requested !== "object") {
    throw new Error("requested capabilities must be an object");
  }
  if (!available || typeof available !== "object") {
    throw new Error("available capabilities must be an object");
  }

  const missing = [];
  const supportedCapabilities = [];

  // Check each requested capability
  for (const [key, value] of Object.entries(requested)) {
    // Only check if the requested capability is truthy (we're asking for it)
    if (value === true) {
      if (available[key] === true) {
        supportedCapabilities.push(key);
      } else {
        missing.push(key);
      }
    }
  }

  // Collect all available capabilities
  for (const [key, value] of Object.entries(available)) {
    if (value === true && !supportedCapabilities.includes(key) && requested[key] !== true) {
      supportedCapabilities.push(key);
    }
  }

  return {
    supported: missing.length === 0,
    missing,
    supported_capabilities: supportedCapabilities
  };
}

/**
 * Check if a model has a specific capability
 *
 * @param {Object} model - Model object with capabilities
 * @param {string} capability - Capability to check
 * @returns {boolean}
 */
export function hasCapability(model, capability) {
  if (!model || typeof model !== "object") {
    throw new Error("model must be an object");
  }
  if (!model.capabilities || typeof model.capabilities !== "object") {
    throw new Error("model must have a capabilities object");
  }
  if (!capability || typeof capability !== "string") {
    throw new Error("capability must be a non-empty string");
  }

  return model.capabilities[capability] === true;
}

/**
 * Check if a model supports all required capabilities
 *
 * @param {Object} model - Model object with capabilities
 * @param {string[]} requiredCapabilities - Array of required capability names
 * @returns {boolean}
 */
export function supportsAllCapabilities(model, requiredCapabilities) {
  if (!model || typeof model !== "object") {
    throw new Error("model must be an object");
  }
  if (!Array.isArray(requiredCapabilities)) {
    throw new Error("requiredCapabilities must be an array");
  }

  return requiredCapabilities.every((capability) => hasCapability(model, capability));
}

/**
 * Check if a model supports any of the provided capabilities
 *
 * @param {Object} model - Model object with capabilities
 * @param {string[]} capabilities - Array of capability names
 * @returns {boolean}
 */
export function supportsAnyCapability(model, capabilities) {
  if (!model || typeof model !== "object") {
    throw new Error("model must be an object");
  }
  if (!Array.isArray(capabilities)) {
    throw new Error("capabilities must be an array");
  }

  return capabilities.some((capability) => hasCapability(model, capability));
}

/**
 * Find models that support all required capabilities
 *
 * @param {Object[]} models - Array of models
 * @param {string[]} requiredCapabilities - Array of required capability names
 * @returns {Object[]} - Filtered models
 */
export function filterModelsByCapabilities(models, requiredCapabilities) {
  if (!Array.isArray(models)) {
    throw new Error("models must be an array");
  }
  if (!Array.isArray(requiredCapabilities)) {
    throw new Error("requiredCapabilities must be an array");
  }

  return models.filter((model) => supportsAllCapabilities(model, requiredCapabilities));
}
