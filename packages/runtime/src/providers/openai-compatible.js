import { PROVIDER_EVENT_TYPES } from "./interface.js";

/**
 * OpenAI-compatible provider adapter.
 * Works with any backend implementing the OpenAI-compatible API shape:
 * - OpenAI
 * - OpenRouter
 * - vLLM
 * - Ollama-compatible endpoints
 * - LM Studio
 * - Custom gateways
 */

/**
 * Create an OpenAI-compatible provider adapter.
 * 
 * @param {Object} options - Configuration
 * @param {string} options.baseURL - API base URL (e.g., "https://api.openai.com/v1")
 * @param {string} options.apiKey - API key for authentication
 * @param {string} options.model - Model name (e.g., "gpt-4", "gpt-3.5-turbo")
 * @param {number} [options.timeout=30000] - Request timeout in milliseconds
 * @returns {Object} Provider instance
 */
export function createOpenAICompatibleProvider({
  baseURL,
  apiKey,
  model,
  timeout = 30000
} = {}) {
  if (!baseURL) throw new Error("baseURL is required");
  if (!model) throw new Error("model is required");

  const endpoint = new URL("/chat/completions", baseURL).toString();

  return {
    async *stream(request, options = {}) {
      // Build request body
      const messages = request.messages || [];
      const tools = request.tools || [];

      const requestBody = {
        model,
        messages,
        stream: true
      };

      // Add tools if provided
      if (tools.length > 0) {
        requestBody.tools = tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
          }
        }));
      }

      // Add structured output if specified
      if (request.structuredOutput) {
        requestBody.response_format = {
          type: "json_schema",
          json_schema: {
            name: request.structuredOutput.name || "output",
            schema: request.structuredOutput.schema
          }
        };
      }

      // Build headers
      const headers = {
        "Content-Type": "application/json"
      };

      if (apiKey && apiKey !== "not-needed") {
        headers["Authorization"] = "Bearer " + apiKey;
      }

      // Setup timeout and cancellation
      const controller = new AbortController();
      const timeoutId = timeout
        ? setTimeout(() => controller.abort(), timeout)
        : null;

      // Link provided signal to abort controller
      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          controller.abort();
        });
      }

      try {
        yield { type: PROVIDER_EVENT_TYPES.STREAM_STARTED };

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        if (!response.ok) {
          const error = await response.text();
          yield {
            type: PROVIDER_EVENT_TYPES.STREAM_ERROR,
            error: `HTTP ${response.status}: ${error}`,
            code: normalizeErrorCode(response.status, error)
          };
          return;
        }

        // Parse streaming response
        yield* parseOpenAIStream(response);
      } catch (error) {
        // Normalize error codes
        yield {
          type: PROVIDER_EVENT_TYPES.STREAM_ERROR,
          error: error.message,
          code: normalizeErrorCode(error)
        };
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
  };
}

/**
 * Parse OpenAI-format streaming response.
 * Format: "data: {json}\n\n" for each chunk
 * 
 * @private
 */
async function* parseOpenAIStream(response) {
  const reader = response.body?.getReader();
  if (!reader) {
    yield {
      type: PROVIDER_EVENT_TYPES.STREAM_ERROR,
      error: "Response body is not readable",
      code: "RESPONSE_ERROR"
    };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let lineToolState = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines[lines.length - 1]; // Keep incomplete line

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();

        // Skip empty lines and [DONE]
        if (!line || line === "[DONE]") continue;

        // OpenAI format: "data: {...}"
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6); // Remove "data: "
        try {
          const chunk = JSON.parse(jsonStr);
          yield* translateOpenAIChunk(chunk, lineToolState);
        } catch (error) {
          console.warn("Failed to parse OpenAI stream chunk:", jsonStr, error);
        }
      }
    }

    // Final buffer
    if (buffer.trim() && buffer.trim() !== "[DONE]") {
      const jsonStr = buffer.replace(/^data: /, "").trim();
      try {
        const chunk = JSON.parse(jsonStr);
        yield* translateOpenAIChunk(chunk, lineToolState);
      } catch (error) {
        console.warn("Failed to parse final OpenAI stream chunk:", buffer);
      }
    }

    yield { type: PROVIDER_EVENT_TYPES.STREAM_COMPLETED };
  } finally {
    reader.releaseLock();
  }
}

/**
 * Translate OpenAI API chunk to provider events.
 * 
 * @private
 */
async function* translateOpenAIChunk(chunk, toolState) {
  if (!chunk.choices || chunk.choices.length === 0) return;

  const choice = chunk.choices[0];
  const delta = choice.delta || {};

  // Text content delta
  if (delta.content) {
    yield {
      type: PROVIDER_EVENT_TYPES.CONTENT_DELTA,
      delta: delta.content,
      role: choice.role || "assistant"
    };
  }

  // Tool calls
  if (delta.tool_calls) {
    for (const toolCall of delta.tool_calls) {
      const toolId = "tool-" + (toolCall.id || toolCall.index);

      if (!toolState[toolId]) {
        toolState[toolId] = {
          id: toolId,
          index: toolCall.index,
          name: toolCall.function?.name || "",
          input: ""
        };
      }

      // Tool call started
      if (toolCall.function?.name && !toolState[toolId].started) {
        toolState[toolId].started = true;
        yield {
          type: PROVIDER_EVENT_TYPES.TOOL_CALL_STARTED,
          id: toolId,
          name: toolCall.function.name,
          input: {} // Will be filled by deltas
        };
      }

      // Tool call input delta
      if (toolCall.function?.arguments) {
        toolState[toolId].input += toolCall.function.arguments;
        yield {
          type: PROVIDER_EVENT_TYPES.TOOL_CALL_DELTA,
          id: toolId,
          delta: toolCall.function.arguments
        };
      }
    }
  }

  // Tool call completion
  if (choice.finish_reason === "tool_calls") {
    for (const toolId in toolState) {
      if (!toolState[toolId].completed) {
        // Parse accumulated input JSON
        let parsedInput = {};
        try {
          if (toolState[toolId].input) {
            parsedInput = JSON.parse(toolState[toolId].input);
          }
        } catch {
          parsedInput = { raw: toolState[toolId].input };
        }

        yield {
          type: PROVIDER_EVENT_TYPES.TOOL_CALL_COMPLETED,
          id: toolId,
          input: parsedInput
        };
        toolState[toolId].completed = true;
      }
    }
  }
}

/**
 * Normalize provider errors to canonical error codes.
 * Maps provider-specific errors to canonical codes understood by the runtime.
 * 
 * @private
 */
function normalizeErrorCode(status, errorText) {
  if (status instanceof Error) {
    // Handle JavaScript error
    if (status.name === "AbortError") {
      return "CANCELLED";
    }
    if (status.message.includes("timeout")) {
      return "TIMEOUT";
    }
    return "UNKNOWN_ERROR";
  }

  // HTTP status-based mapping
  if (status === 401 || status === 403) {
    return "AUTHENTICATION_ERROR";
  }
  if (status === 429) {
    return "RATE_LIMIT";
  }
  if (status === 500 || status === 502 || status === 503) {
    return "SERVICE_ERROR";
  }
  if (status === 408) {
    return "TIMEOUT";
  }

  // Parse error message if available
  if (errorText && typeof errorText === "string") {
    if (errorText.includes("rate_limit")) return "RATE_LIMIT";
    if (errorText.includes("invalid_request")) return "INVALID_REQUEST";
    if (errorText.includes("authentication")) return "AUTHENTICATION_ERROR";
    if (errorText.includes("timeout")) return "TIMEOUT";
  }

  return "API_ERROR";
}
