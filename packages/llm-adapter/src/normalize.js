import { createModel, createCapabilities } from "@ai-ui/core/capabilities";
import {
  createInvalidModelMetadataError,
  createModelNormalizationError
} from "./errors.js";

/**
 * Map external capability names to AIModel capability names
 * This is extensible for different external providers
 */
export const CAPABILITY_MAPPINGS = {
  // Direct mappings (no prefix)
  "streaming": "streaming",
  "tools": "tools",
  "toolChoice": "toolChoice",
  "tool_choice": "toolChoice",
  "vision": "vision",
  "audioInput": "audioInput",
  "audio_input": "audioInput",
  "audioOutput": "audioOutput",
  "audio_output": "audioOutput",
  "reasoning": "reasoning",
  "structuredOutput": "structuredOutput",
  "structured_output": "structuredOutput",
  "jsonMode": "jsonMode",
  "json_mode": "jsonMode",
  "attachments": "attachments",
  
  // Supports* prefix variations
  "supports_streaming": "streaming",
  "supportsStreaming": "streaming",
  "stream": "streaming",
  
  "supports_tools": "tools",
  "supportsTools": "tools",
  "supports_function_calling": "tools",
  "function_calling": "tools",
  "tool_use": "tools",
  
  "supports_tool_choice": "toolChoice",
  
  "supports_vision": "vision",
  "supportsVision": "vision",
  "image_input": "vision",
  
  "supports_audio_input": "audioInput",
  
  "supports_audio_output": "audioOutput",
  
  "supports_reasoning": "reasoning",
  "extended_reasoning": "reasoning",
  
  "supports_structured_output": "structuredOutput",
  "json_schema": "structuredOutput",
  
  "supports_json_mode": "jsonMode",
  
  "supports_attachments": "attachments",
  "file_support": "attachments"
};

/**
 * Normalize capabilities from external format to AIModelCapabilities
 * @param {Object} externalCapabilities - Capabilities from external registry
 * @returns {Object} Normalized capabilities object
 */
export function normalizeCapabilities(externalCapabilities) {
  if (!externalCapabilities || typeof externalCapabilities !== "object") {
    return createCapabilities();
  }

  const normalized = {};

  // Handle both camelCase and snake_case keys
  for (const [key, value] of Object.entries(externalCapabilities)) {
    const mapped = CAPABILITY_MAPPINGS[key] || CAPABILITY_MAPPINGS[key.toLowerCase()];
    
    if (mapped) {
      // Convert various truthy representations to boolean
      if (value === true || value === 1 || value === "true" || value === "yes") {
        normalized[mapped] = true;
      } else if (value === false || value === 0 || value === "false" || value === "no") {
        normalized[mapped] = false;
      }
    }
  }

  return createCapabilities(normalized);
}

/**
 * Extract context window from various possible field names
 * @param {Object} model - External model object
 * @returns {number|undefined} Context window in tokens
 */
export function extractContextWindow(model) {
  if (!model) return undefined;

  // Try common field names
  const contextFields = [
    model.contextWindow,
    model.context_window,
    model.maxContextTokens,
    model.max_context_tokens,
    model.maxContextLength,
    model.max_context_length,
    model.inputTokenLimit,
    model.input_token_limit
  ];

  for (const value of contextFields) {
    if (typeof value === "number" && value > 0) {
      return value;
    }
  }

  return undefined;
}

/**
 * Extract max output tokens from various possible field names
 * @param {Object} model - External model object
 * @returns {number|undefined} Max output tokens
 */
export function extractMaxOutputTokens(model) {
  if (!model) return undefined;

  // Try common field names
  const outputFields = [
    model.maxOutputTokens,
    model.max_output_tokens,
    model.maxCompletionTokens,
    model.max_completion_tokens,
    model.maxTokens,
    model.max_tokens,
    model.outputTokenLimit,
    model.output_token_limit
  ];

  for (const value of outputFields) {
    if (typeof value === "number" && value > 0) {
      return value;
    }
  }

  return undefined;
}

/**
 * Extract provider from various possible locations
 * @param {Object} model - External model object
 * @param {string} [defaultProvider] - Default provider if not found
 * @returns {string} Provider name
 */
export function extractProvider(model, defaultProvider = "unknown") {
  if (!model) return defaultProvider;

  // Try common field names
  if (model.provider) return String(model.provider).toLowerCase();
  if (model.providerName) return String(model.providerName).toLowerCase();
  if (model.provider_name) return String(model.provider_name).toLowerCase();
  if (model.vendor) return String(model.vendor).toLowerCase();
  if (model.organization) return String(model.organization).toLowerCase();

  // Try to extract from model ID (format: "provider:model-id")
  if (model.id && typeof model.id === "string" && model.id.includes(":")) {
    return model.id.split(":")[0].toLowerCase();
  }

  return defaultProvider;
}

/**
 * Extract display name from various possible field names
 * @param {Object} model - External model object
 * @param {string} [id] - Model ID to use as fallback
 * @returns {string|undefined} Display name
 */
export function extractDisplayName(model, id) {
  if (!model) return undefined;

  // Try common field names
  if (model.displayName) return model.displayName;
  if (model.display_name) return model.display_name;
  if (model.name) return model.name;
  if (model.title) return model.title;
  if (model.label) return model.label;

  // Fallback to ID
  if (id) return id;

  return undefined;
}

/**
 * Extract metadata that should be preserved without contaminating core semantics
 * @param {Object} model - External model object
 * @param {Set<string>} [standardFields] - Fields to exclude from metadata
 * @returns {Object} Preserved metadata
 */
export function extractMetadata(model, standardFields = new Set()) {
  if (!model || typeof model !== "object") {
    return undefined;
  }

  // Standard fields that are used by AIModel
  const coreFields = new Set([
    "id",
    "provider",
    "displayName",
    "display_name",
    "capabilities",
    "contextWindow",
    "context_window",
    "maxOutputTokens",
    "max_output_tokens",
    "maxContextTokens",
    "max_context_tokens",
    "maxCompletionTokens",
    "max_completion_tokens",
    "maxTokens",
    "max_tokens",
    "input",
    "output",
    "name",
    "title",
    "label",
    ...standardFields
  ]);

  const metadata = {};
  for (const [key, value] of Object.entries(model)) {
    if (!coreFields.has(key) && value !== null && value !== undefined) {
      metadata[key] = value;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Normalize an external model to AIModel format
 * @param {Object} externalModel - Model from external registry
 * @param {Object} [options] - Normalization options
 * @param {string} [options.defaultProvider] - Default provider if not found
 * @returns {Object} Normalized AIModel object
 * @throws {Error} If model normalization fails
 */
export function normalizeModel(externalModel, options = {}) {
  if (!externalModel || typeof externalModel !== "object") {
    throw createInvalidModelMetadataError("Model must be a non-empty object");
  }

  const { defaultProvider = "unknown" } = options;

  // Extract required fields
  const id = externalModel.id || externalModel.model_id || externalModel.modelId;
  if (!id || typeof id !== "string") {
    throw createInvalidModelMetadataError(
      "Model must have a valid 'id' field",
      { model: externalModel }
    );
  }

  const provider = extractProvider(externalModel, defaultProvider);
  const displayName = extractDisplayName(externalModel, id);
  
  // Handle capabilities - could be in a capabilities field or spread at root level
  let capabilities;
  if (externalModel.capabilities && typeof externalModel.capabilities === "object") {
    // Use dedicated capabilities field
    capabilities = normalizeCapabilities(externalModel.capabilities);
  } else {
    // Look for capability-related fields at root level
    const rootLevelCapabilities = {};
    for (const [key, value] of Object.entries(externalModel)) {
      if (CAPABILITY_MAPPINGS[key] || CAPABILITY_MAPPINGS[key.toLowerCase()]) {
        rootLevelCapabilities[key] = value;
      }
    }
    capabilities = normalizeCapabilities(rootLevelCapabilities);
  }
  
  const contextWindow = extractContextWindow(externalModel);
  const maxOutputTokens = extractMaxOutputTokens(externalModel);
  const metadata = extractMetadata(externalModel);

  // Build the AIModel
  const normalizedModel = {
    id,
    provider,
    capabilities,
    displayName,
    contextWindow,
    maxOutputTokens
  };

  // Add metadata if present
  if (metadata) {
    normalizedModel.metadata = metadata;
  }

  // Validate and create using the core AIModel validator
  try {
    const validatedModel = createModel(normalizedModel);
    
    // Preserve metadata if present (createModel doesn't include it)
    if (metadata) {
      validatedModel.metadata = metadata;
    }
    
    return validatedModel;
  } catch (error) {
    throw createModelNormalizationError(id, error.message, {
      originalError: error.message
    });
  }
}

/**
 * Normalize multiple external models to AIModel format
 * @param {Object[]} externalModels - Models from external registry
 * @param {Object} [options] - Normalization options
 * @returns {Object[]} Array of normalized AIModel objects
 */
export function normalizeModels(externalModels, options = {}) {
  if (!Array.isArray(externalModels)) {
    return [];
  }

  return externalModels
    .map((model) => {
      try {
        return normalizeModel(model, options);
      } catch (error) {
        // Log but continue with other models
        console.warn(`Failed to normalize model:`, error.message);
        return null;
      }
    })
    .filter((model) => model !== null);
}
