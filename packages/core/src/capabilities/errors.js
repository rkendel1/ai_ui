/**
 * @typedef {Object} AICapabilityError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {string} capability - Missing capability
 * @property {string} model - Model ID
 * @property {string} provider - Provider ID
 */

export const ERROR_CODES = {
  CAPABILITY_UNSUPPORTED: "capability_unsupported",
  INVALID_CAPABILITIES: "invalid_capabilities",
  CAPABILITY_NEGOTIATION_FAILED: "capability_negotiation_failed",
  MODEL_NOT_FOUND: "model_not_found",
  PROVIDER_NOT_FOUND: "provider_not_found"
};

/**
 * Create a capability error
 * @param {string} capability - The unsupported capability
 * @param {string} modelId - The model ID
 * @param {string} providerId - The provider ID
 * @param {string} [message] - Custom error message
 * @returns {AICapabilityError}
 */
export function createCapabilityError(capability, modelId, providerId, message) {
  return {
    code: ERROR_CODES.CAPABILITY_UNSUPPORTED,
    message: message || `Model "${modelId}" from provider "${providerId}" does not support capability: ${capability}`,
    capability,
    model: modelId,
    provider: providerId
  };
}

/**
 * Create an invalid capabilities error
 * @param {string} message - Error message
 * @returns {Object}
 */
export function createInvalidCapabilitiesError(message) {
  return {
    code: ERROR_CODES.INVALID_CAPABILITIES,
    message: message || "Invalid capabilities configuration"
  };
}

/**
 * Create a capability negotiation failed error
 * @param {string[]} missingCapabilities - Array of missing capability names
 * @param {string} modelId - The model ID
 * @param {string} providerId - The provider ID
 * @param {string} [message] - Custom error message
 * @returns {Object}
 */
export function createCapabilityNegotiationError(missingCapabilities, modelId, providerId, message) {
  return {
    code: ERROR_CODES.CAPABILITY_NEGOTIATION_FAILED,
    message: message || `Model "${modelId}" is missing capabilities: ${missingCapabilities.join(", ")}`,
    missing: missingCapabilities,
    model: modelId,
    provider: providerId
  };
}

/**
 * Create a model not found error
 * @param {string} modelId - The model ID
 * @param {string} [providerId] - The provider ID
 * @returns {Object}
 */
export function createModelNotFoundError(modelId, providerId) {
  const message = providerId
    ? `Model "${modelId}" not found for provider "${providerId}"`
    : `Model "${modelId}" not found`;

  return {
    code: ERROR_CODES.MODEL_NOT_FOUND,
    message,
    model: modelId,
    provider: providerId
  };
}

/**
 * Create a provider not found error
 * @param {string} providerId - The provider ID
 * @returns {Object}
 */
export function createProviderNotFoundError(providerId) {
  return {
    code: ERROR_CODES.PROVIDER_NOT_FOUND,
    message: `Provider "${providerId}" not found`,
    provider: providerId
  };
}
