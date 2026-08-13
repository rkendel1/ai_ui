/**
 * Derive capability requirements from a request object
 *
 * Analyzes request structure to determine what capabilities are required:
 * - attachments with image type → requires vision capability
 * - tools array → requires tools capability
 * - responseFormat with json_schema → requires structuredOutput capability
 * - reasoning → requires reasoning capability
 * - audio → requires audioInput/audioOutput capability
 *
 * @param {Object} request - The request object
 * @returns {Object} - Capabilities requirements as key-value pairs (all true for requested)
 *
 * @example
 * deriveRequirements({
 *   messages: [...],
 *   attachments: [{ type: "image" }],
 *   tools: [...]
 * })
 * // Returns: { vision: true, attachments: true, tools: true }
 */
export function deriveRequirements(request) {
  if (!request || typeof request !== "object") {
    return {};
  }

  const requirements = {};

  // Check for attachments
  if (Array.isArray(request.attachments) && request.attachments.length > 0) {
    requirements.attachments = true;

    // Check for image attachments
    for (const attachment of request.attachments) {
      if (attachment && typeof attachment === "object") {
        const type = attachment.type?.toLowerCase();
        if (type === "image" || type?.includes("image")) {
          requirements.vision = true;
        } else if (type === "audio" || type?.includes("audio")) {
          requirements.audioInput = true;
        } else if (type === "video" || type?.includes("video")) {
          requirements.vision = true;
        }
      }
    }
  }

  // Check for tools
  if (Array.isArray(request.tools) && request.tools.length > 0) {
    requirements.tools = true;
  }

  // Check for tool choice
  if (request.toolChoice !== undefined && request.toolChoice !== null) {
    requirements.toolChoice = true;
  }

  // Check for structured output / response format
  if (request.responseFormat && typeof request.responseFormat === "object") {
    if (request.responseFormat.type === "json_schema") {
      requirements.structuredOutput = true;
    } else if (request.responseFormat.type === "json") {
      requirements.jsonMode = true;
    }
  }

  // Check for reasoning
  if (request.reasoning === true) {
    requirements.reasoning = true;
  }

  // Check for streaming
  if (request.streaming === true) {
    requirements.streaming = true;
  }

  // Check messages for content types
  if (Array.isArray(request.messages)) {
    for (const message of request.messages) {
      if (message && typeof message === "object") {
        // Check if message has content array with different types
        if (Array.isArray(message.content)) {
          for (const content of message.content) {
            if (!content || typeof content !== "object") continue;

            const contentType = content.type?.toLowerCase();
            if (contentType === "image" || contentType === "image_url") {
              requirements.vision = true;
            } else if (contentType === "audio") {
              requirements.audioInput = true;
            } else if (contentType === "video") {
              requirements.vision = true;
            }
          }
        }
      }
    }
  }

  return requirements;
}

/**
 * Check if a request requires streaming capability
 *
 * @param {Object} request - The request object
 * @returns {boolean}
 */
export function requiresStreaming(request) {
  return !!(request && request.streaming === true);
}

/**
 * Check if a request requires tools capability
 *
 * @param {Object} request - The request object
 * @returns {boolean}
 */
export function requiresTools(request) {
  return !!(request && Array.isArray(request.tools) && request.tools.length > 0);
}

/**
 * Check if a request requires vision capability
 *
 * @param {Object} request - The request object
 * @returns {boolean}
 */
export function requiresVision(request) {
  return deriveRequirements(request).vision === true;
}

/**
 * Check if a request requires structured output capability
 *
 * @param {Object} request - The request object
 * @returns {boolean}
 */
export function requiresStructuredOutput(request) {
  return !!(
    request &&
    request.responseFormat &&
    request.responseFormat.type === "json_schema"
  );
}

/**
 * Check if a request requires attachments capability
 *
 * @param {Object} request - The request object
 * @returns {boolean}
 */
export function requiresAttachments(request) {
  return !!(request && Array.isArray(request.attachments) && request.attachments.length > 0);
}

/**
 * Check if a request requires reasoning capability
 *
 * @param {Object} request - The request object
 * @returns {boolean}
 */
export function requiresReasoning(request) {
  return !!(request && request.reasoning === true);
}
