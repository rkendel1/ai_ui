/**
 * Provider-neutral interface for AI providers.
 * The runtime consumes this interface to ensure provider independence.
 * 
 * All providers must implement this interface, regardless of their
 * underlying API (OpenAI, Anthropic, Google, etc.).
 */

/**
 * @typedef {Object} AIProviderMessage
 * @property {string} role - "user" | "assistant" | "system"
 * @property {string} content - Message text content
 * @property {any} reasoning - Optional reasoning content
 */

/**
 * @typedef {Object} AIProviderTool
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {any} inputSchema - Tool input JSON schema
 */

/**
 * @typedef {Object} AIProviderRequest
 * @property {AIProviderMessage[]} messages - Message history
 * @property {string} model - Model name
 * @property {AIProviderTool[]} [tools] - Available tools
 * @property {any} [attachments] - File attachments
 * @property {boolean} [stream] - Enable streaming
 * @property {any} [structuredOutput] - Structured output schema
 */

/**
 * @typedef {Object} AIProviderOptions
 * @property {AbortSignal} [signal] - Cancellation signal
 * @property {Object} [context] - Additional context
 */

/**
 * Provider event types emitted by the underlying provider.
 * These are provider-native events that get translated to canonical AIEvents.
 */
export const PROVIDER_EVENT_TYPES = {
  STREAM_STARTED: "provider.stream.started",
  CONTENT_DELTA: "provider.content.delta",
  REASONING_DELTA: "provider.reasoning.delta",
  TOOL_CALL_STARTED: "provider.tool.call.started",
  TOOL_CALL_DELTA: "provider.tool.call.delta",
  TOOL_CALL_COMPLETED: "provider.tool.call.completed",
  STREAM_COMPLETED: "provider.stream.completed",
  STREAM_ERROR: "provider.stream.error"
};

/**
 * AIProvider interface that all provider adapters must implement.
 * 
 * @interface AIProvider
 * @property {(request: AIProviderRequest, options?: AIProviderOptions) => AsyncIterable} stream
 */

export class ProviderInterface {
  /**
   * Stream async iterable of provider events.
   * Providers must emit provider events that get normalized to canonical events.
   * 
   * @param {AIProviderRequest} request - The provider request
   * @param {AIProviderOptions} options - Streaming options
   * @returns {AsyncIterable} Async iterable of provider events
   */
  async *stream(request, options) {
    throw new Error("Provider must implement stream() method");
  }
}
