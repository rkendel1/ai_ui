/**
 * Creates a universal HTTP streaming transport for AI interactions.
 * 
 * This transport communicates with a backend API using HTTP streaming,
 * supporting both newline-delimited JSON and Server-Sent Events (SSE) formats.
 * 
 * @param {string} endpoint - The API endpoint URL (e.g., "/api/ai" or "https://example.com/api/ai")
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.format="ndjson"] - Response format: "ndjson" or "sse"
 * @param {number} [options.timeout=30000] - Request timeout in milliseconds
 * @param {Record<string, string>} [options.headers={}] - Custom headers to send with requests
 * @param {(request: Object) => Object} [options.transformRequest] - Function to transform request before sending
 * @param {(event: Object) => Object} [options.transformEvent] - Function to transform events after receiving
 * 
 * @returns {Object} Transport object with send method
 * 
 * @example
 * const transport = createAITransport("/api/ai");
 * const { session } = useAISession({ transport });
 * 
 * @example
 * const transport = createAITransport("https://api.example.com/chat", {
 *   format: "sse",
 *   headers: { "Authorization": "******" },
 *   timeout: 60000
 * });
 */
export function createAITransport(
  endpoint,
  {
    format = "ndjson",
    timeout = 30000,
    headers = {},
    transformRequest = (req) => req,
    transformEvent = (evt) => evt
  } = {}
) {
  if (!endpoint) {
    throw new Error("createAITransport requires an endpoint URL");
  }

  if (!["ndjson", "sse"].includes(format)) {
    throw new Error(`Invalid format: ${format}. Must be "ndjson" or "sse"`);
  }

  return {
    async *send(request = {}) {
      try {
        // Transform request if provided
        const transformedRequest = transformRequest(request);

        // Build request body with message, context, and tools (only if defined)
        const body = {
          message: transformedRequest.message || ""
        };
        
        if (transformedRequest.context !== undefined) {
          body.context = transformedRequest.context;
        }
        
        if (transformedRequest.tools !== undefined) {
          body.tools = transformedRequest.tools;
        }

        // Make the HTTP request
        const controller = new AbortController();
        const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        // Clear timeout after response starts
        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        // Parse response based on format
        if (format === "sse") {
          yield* parseSSEStream(response, transformEvent);
        } else {
          // Default to newline-delimited JSON
          yield* parseNDJsonStream(response, transformEvent);
        }
      } catch (error) {
        // Emit error event
        yield {
          type: "error.occurred",
          message: error.message,
          code: error.code || "TRANSPORT_ERROR"
        };
      }
    }
  };
}

/**
 * Parse a newline-delimited JSON stream.
 * Each line should be a complete JSON object representing an event.
 * 
 * @private
 */
async function* parseNDJsonStream(response, transformEvent) {
  const reader = response.body?.getReader();
  
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        
        if (!line) continue; // Skip empty lines

        try {
          const event = JSON.parse(line);
          yield transformEvent(event);
        } catch (error) {
          // Log parse errors but continue processing
          console.warn("Failed to parse event JSON:", line, error);
        }
      }
    }

    // Process final buffer if not empty
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer);
        yield transformEvent(event);
      } catch (error) {
        console.warn("Failed to parse final event JSON:", buffer, error);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse a Server-Sent Events stream.
 * Events should be sent as standard SSE format.
 * 
 * @private
 */
async function* parseSSEStream(response, transformEvent) {
  const reader = response.body?.getReader();
  
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete events
      const events = buffer.split("\n\n");
      buffer = events[events.length - 1]; // Keep incomplete event in buffer

      for (let i = 0; i < events.length - 1; i++) {
        const eventText = events[i].trim();
        
        if (!eventText) continue; // Skip empty events

        const event = parseSSEEvent(eventText);
        if (event) {
          yield transformEvent(event);
        }
      }
    }

    // Process final buffer if not empty
    if (buffer.trim()) {
      const event = parseSSEEvent(buffer);
      if (event) {
        yield transformEvent(event);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse a single SSE event text into a JavaScript object.
 * 
 * @private
 */
function parseSSEEvent(eventText) {
  const lines = eventText.split("\n");
  const event = {};

  for (const line of lines) {
    if (!line.includes(":")) continue;

    const [field, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();

    if (field === "data") {
      // Try to parse data as JSON
      try {
        const parsed = JSON.parse(value);
        Object.assign(event, parsed);
      } catch {
        // If not JSON, treat as string value
        event.data = value;
      }
    } else if (field === "event") {
      event.type = value;
    } else if (field === "id") {
      event.id = value;
    } else if (field === "retry") {
      event.retry = parseInt(value);
    }
  }

  return Object.keys(event).length > 0 ? event : null;
}
