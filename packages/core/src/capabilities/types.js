/**
 * @typedef {Object} AIModelCapabilities
 * @property {boolean} streaming - Model supports streaming responses
 * @property {boolean} tools - Model supports tool/function calling
 * @property {boolean} [toolChoice] - Model supports tool choice control (auto, required, none)
 * @property {boolean} vision - Model supports vision/image input
 * @property {boolean} [audioInput] - Model supports audio input
 * @property {boolean} [audioOutput] - Model supports audio output
 * @property {boolean} [reasoning] - Model supports extended reasoning
 * @property {boolean} [structuredOutput] - Model supports structured output (JSON schema)
 * @property {boolean} [jsonMode] - Model supports JSON mode output
 * @property {boolean} [attachments] - Model supports file attachments
 */

/**
 * @typedef {Object} AIModelInput
 * @property {boolean} [text] - Supports text input
 * @property {boolean} [image] - Supports image input
 * @property {boolean} [audio] - Supports audio input
 * @property {boolean} [video] - Supports video input
 */

/**
 * @typedef {Object} AIModelOutput
 * @property {boolean} [text] - Supports text output
 * @property {boolean} [image] - Supports image output
 * @property {boolean} [audio] - Supports audio output
 */

/**
 * @typedef {Object} AIModel
 * @property {string} id - Unique model identifier
 * @property {string} provider - Provider name (e.g., "openai", "anthropic")
 * @property {string} [displayName] - Human-readable model name
 * @property {AIModelCapabilities} capabilities - Model capabilities
 * @property {number} [contextWindow] - Maximum context window size in tokens
 * @property {number} [maxOutputTokens] - Maximum output tokens
 * @property {AIModelInput} [input] - Supported input modalities
 * @property {AIModelOutput} [output] - Supported output modalities
 */

/**
 * @typedef {Object} AIProviderMetadata
 * @property {string} id - Provider identifier
 * @property {string} name - Human-readable provider name
 * @property {AIModelCapabilities} [capabilities] - Default capabilities (can be overridden per model)
 * @property {AIModel[]} [models] - Available models
 */

export const CAPABILITY_KEYS = {
  STREAMING: "streaming",
  TOOLS: "tools",
  TOOL_CHOICE: "toolChoice",
  VISION: "vision",
  AUDIO_INPUT: "audioInput",
  AUDIO_OUTPUT: "audioOutput",
  REASONING: "reasoning",
  STRUCTURED_OUTPUT: "structuredOutput",
  JSON_MODE: "jsonMode",
  ATTACHMENTS: "attachments"
};

/**
 * Create a normalized AIModelCapabilities object
 * @param {Partial<AIModelCapabilities>} [capabilities] - Capabilities to normalize
 * @returns {AIModelCapabilities}
 */
export function createCapabilities(capabilities = {}) {
  return {
    streaming: capabilities.streaming ?? false,
    tools: capabilities.tools ?? false,
    toolChoice: capabilities.toolChoice,
    vision: capabilities.vision ?? false,
    audioInput: capabilities.audioInput,
    audioOutput: capabilities.audioOutput,
    reasoning: capabilities.reasoning,
    structuredOutput: capabilities.structuredOutput,
    jsonMode: capabilities.jsonMode,
    attachments: capabilities.attachments
  };
}

/**
 * Create a normalized AIModel object
 * @param {AIModel} model - Model metadata
 * @returns {AIModel}
 */
export function createModel(model) {
  if (!model.id || typeof model.id !== "string") {
    throw new Error("AIModel requires a valid string id");
  }
  if (!model.provider || typeof model.provider !== "string") {
    throw new Error("AIModel requires a valid string provider");
  }
  if (!model.capabilities || typeof model.capabilities !== "object") {
    throw new Error("AIModel requires valid capabilities object");
  }

  return {
    id: model.id,
    provider: model.provider,
    displayName: model.displayName,
    capabilities: createCapabilities(model.capabilities),
    contextWindow: model.contextWindow,
    maxOutputTokens: model.maxOutputTokens,
    input: model.input,
    output: model.output
  };
}

/**
 * Create a normalized AIProviderMetadata object
 * @param {AIProviderMetadata} metadata - Provider metadata
 * @returns {AIProviderMetadata}
 */
export function createProviderMetadata(metadata) {
  if (!metadata.id || typeof metadata.id !== "string") {
    throw new Error("AIProviderMetadata requires a valid string id");
  }
  if (!metadata.name || typeof metadata.name !== "string") {
    throw new Error("AIProviderMetadata requires a valid string name");
  }

  return {
    id: metadata.id,
    name: metadata.name,
    capabilities: metadata.capabilities ? createCapabilities(metadata.capabilities) : undefined,
    models: metadata.models ? metadata.models.map(createModel) : undefined
  };
}
