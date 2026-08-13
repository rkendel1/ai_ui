/**
 * @ai-ui/llm-adapter
 * 
 * Integration adapter for external LLM model registries with ai-ui
 * 
 * This adapter bridges the gap between external model intelligence systems
 * and the ai-ui core, normalizing model metadata into a canonical format
 * while preserving external metadata without contaminating core semantics.
 */

// Catalog adapter
export { createLLMCatalog } from "./catalog.js";

// Router adapter
export { createLLMRouter, createBasicRouter } from "./router.js";

// Normalization utilities
export {
  normalizeCapabilities,
  normalizeModel,
  normalizeModels,
  extractContextWindow,
  extractMaxOutputTokens,
  extractProvider,
  extractDisplayName,
  extractMetadata,
  CAPABILITY_MAPPINGS
} from "./normalize.js";

// Error handling
export {
  ADAPTER_ERROR_CODES,
  createInvalidRegistryError,
  createModelNormalizationError,
  createRegistryAccessError,
  createInvalidModelMetadataError,
  createInvalidRouterConfigError,
  createRouterSelectionError,
  LLMAdapterError
} from "./errors.js";
