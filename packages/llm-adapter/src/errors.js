/**
 * Error handling for LLM adapter
 */

class LLMAdapterError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = "LLMAdapterError";
    this.code = code;
    this.context = context;
  }
}

export const ADAPTER_ERROR_CODES = {
  INVALID_REGISTRY: "invalid_registry",
  MODEL_NORMALIZATION_FAILED: "model_normalization_failed",
  REGISTRY_ACCESS_FAILED: "registry_access_failed",
  INVALID_MODEL_METADATA: "invalid_model_metadata",
  INVALID_ROUTER_CONFIG: "invalid_router_config",
  ROUTER_SELECTION_FAILED: "router_selection_failed"
};

/**
 * Create an invalid registry error
 * @param {string} reason
 * @param {Object} context
 * @returns {LLMAdapterError}
 */
export function createInvalidRegistryError(reason, context = {}) {
  return new LLMAdapterError(
    `Invalid registry: ${reason}`,
    ADAPTER_ERROR_CODES.INVALID_REGISTRY,
    context
  );
}

/**
 * Create a model normalization error
 * @param {string} modelId
 * @param {string} reason
 * @param {Object} context
 * @returns {LLMAdapterError}
 */
export function createModelNormalizationError(modelId, reason, context = {}) {
  return new LLMAdapterError(
    `Failed to normalize model "${modelId}": ${reason}`,
    ADAPTER_ERROR_CODES.MODEL_NORMALIZATION_FAILED,
    { modelId, ...context }
  );
}

/**
 * Create a registry access error
 * @param {string} reason
 * @param {Object} context
 * @returns {LLMAdapterError}
 */
export function createRegistryAccessError(reason, context = {}) {
  return new LLMAdapterError(
    `Failed to access registry: ${reason}`,
    ADAPTER_ERROR_CODES.REGISTRY_ACCESS_FAILED,
    context
  );
}

/**
 * Create an invalid model metadata error
 * @param {string} reason
 * @param {Object} context
 * @returns {LLMAdapterError}
 */
export function createInvalidModelMetadataError(reason, context = {}) {
  return new LLMAdapterError(
    `Invalid model metadata: ${reason}`,
    ADAPTER_ERROR_CODES.INVALID_MODEL_METADATA,
    context
  );
}

/**
 * Create an invalid router config error
 * @param {string} reason
 * @param {Object} context
 * @returns {LLMAdapterError}
 */
export function createInvalidRouterConfigError(reason, context = {}) {
  return new LLMAdapterError(
    `Invalid router configuration: ${reason}`,
    ADAPTER_ERROR_CODES.INVALID_ROUTER_CONFIG,
    context
  );
}

/**
 * Create a router selection error
 * @param {string} reason
 * @param {Object} context
 * @returns {LLMAdapterError}
 */
export function createRouterSelectionError(reason, context = {}) {
  return new LLMAdapterError(
    `Router failed to select model: ${reason}`,
    ADAPTER_ERROR_CODES.ROUTER_SELECTION_FAILED,
    context
  );
}

export { LLMAdapterError };
