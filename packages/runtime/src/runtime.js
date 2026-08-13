import { AI_EVENT_TYPES } from "@ai-ui/core/protocol";
import { PROVIDER_EVENT_TYPES } from "./providers/interface.js";

/**
 * Core AI Runtime
 *
 * Bridges provider events to canonical AIEvents.
 * Manages the complete AI execution lifecycle including:
 * - Message streaming
 * - Tool execution
 * - Tool approval workflow
 * - Artifact generation
 * - Error handling
 * - Cancellation
 *
 * @param {Object} options - Configuration
 * @param {Object} options.provider - Provider instance
 * @param {Object} [options.tools] - Tool definitions
 * @param {Object} [options.approval] - Approval policy ("never" | "always" | function)
 * @param {Object} [options.hooks] - Event hooks
 * @param {Function} [options.hooks.onRequest] - Called before provider request
 * @param {Function} [options.hooks.onToolCall] - Called when tool starts
 * @param {Function} [options.hooks.onArtifact] - Called when artifact created
 * @param {Function} [options.hooks.onError] - Called on error
 * @param {Function} [options.hooks.onComplete] - Called when complete
 */
export function createAIRuntime(options) {
  options = options || {};
  const { provider, tools = {}, approval = "never", hooks = {} } = options;

  if (!provider || typeof provider.stream !== "function") {
    throw new Error(
      "createAIRuntime requires a provider with stream(request, options) method"
    );
  }

  // Define the generator function outside the object
  const execute = async function* (request, options) {
    request = request || {};
    options = options || {};
    const { message, context, tools: toolNames, signal } = request;
    const messages = request.messages || [];

    // Emit session started
    yield {
      type: AI_EVENT_TYPES.SESSION_STARTED,
      timestamp: Date.now()
    };

    // Create message ID
    const messageId = "msg-" + Date.now();

    // Emit message started
    yield {
      type: AI_EVENT_TYPES.MESSAGE_STARTED,
      messageId,
      timestamp: Date.now()
    };

    try {
      // Call hook
      if (hooks.onRequest) {
        await hooks.onRequest({ messages, context, tools: toolNames });
      }

      // Build provider request
      const toolDefinitions = [];
      if (toolNames && Array.isArray(toolNames)) {
        for (const toolName of toolNames) {
          const toolDef = tools[toolName];
          if (toolDef) {
            toolDefinitions.push({
              name: toolName,
              description: toolDef.description || "",
              inputSchema: toolDef.inputSchema || {}
            });
          }
        }
      }

      const providerRequest = {
        messages,
        tools: toolDefinitions
      };

      // Stream from provider
      yield* processProviderStream(
        provider,
        providerRequest,
        messageId,
        tools,
        approval,
        hooks,
        { signal }
      );

      // Emit message completed
      yield {
        type: AI_EVENT_TYPES.MESSAGE_COMPLETED,
        messageId,
        timestamp: Date.now()
      };
    } catch (error) {
      yield {
        type: AI_EVENT_TYPES.ERROR_OCCURRED,
        message: error.message,
        code: error.code || "RUNTIME_ERROR",
        timestamp: Date.now()
      };

      if (hooks.onError) {
        await hooks.onError(error);
      }
    }

    // Emit session completed
    yield {
      type: AI_EVENT_TYPES.SESSION_COMPLETED,
      timestamp: Date.now()
    };

    if (hooks.onComplete) {
      await hooks.onComplete();
    }
  };

  return { execute };
}

/**
 * Process provider stream and convert to canonical events.
 * Handles tool calls, approvals, and artifacts.
 *
 * @private
 */
async function* processProviderStream(
  provider,
  request,
  messageId,
  tools,
  approval,
  hooks,
  options
) {
  const { signal } = options;
  const toolCallStates = {};

  try {
    // Start provider stream
    const providerStream = provider.stream(request, { signal });

    for await (const event of providerStream) {
      if (signal?.aborted) break;

      switch (event.type) {
        case PROVIDER_EVENT_TYPES.CONTENT_DELTA:
          yield {
            type: AI_EVENT_TYPES.TEXT_DELTA,
            messageId,
            text: event.delta || "",
            timestamp: Date.now()
          };
          break;

        case PROVIDER_EVENT_TYPES.REASONING_DELTA:
          yield {
            type: AI_EVENT_TYPES.REASONING_DELTA,
            messageId,
            text: event.delta || "",
            timestamp: Date.now()
          };
          break;

        case PROVIDER_EVENT_TYPES.TOOL_CALL_STARTED: {
          const toolCallId = event.id;
          toolCallStates[toolCallId] = {
            id: toolCallId,
            name: event.name,
            input: event.input || {},
            requiresApproval: event.requiresApproval || false
          };

          yield {
            type: AI_EVENT_TYPES.TOOL_CALL_STARTED,
            id: toolCallId,
            name: event.name,
            timestamp: Date.now()
          };

          if (hooks.onToolCall) {
            await hooks.onToolCall({
              id: toolCallId,
              name: event.name
            });
          }

          // Check if approval is needed
          const needsApproval = await shouldRequireApproval(
            event.name,
            event.input,
            approval,
            tools
          );

          if (needsApproval) {
            yield {
              type: AI_EVENT_TYPES.TOOL_APPROVAL_REQUIRED,
              id: toolCallId,
              name: event.name,
              input: event.input || {},
              timestamp: Date.now()
            };
            // Note: Actual approval response would come from caller
          }

          break;
        }

        case PROVIDER_EVENT_TYPES.TOOL_CALL_DELTA:
          yield {
            type: AI_EVENT_TYPES.TOOL_CALL_DELTA,
            id: event.id,
            delta: event.delta || "",
            timestamp: Date.now()
          };
          break;

        case PROVIDER_EVENT_TYPES.TOOL_CALL_COMPLETED: {
          const toolCallId = event.id;
          const toolCall = toolCallStates[toolCallId];

          yield {
            type: AI_EVENT_TYPES.TOOL_CALL_COMPLETED,
            id: toolCallId,
            output: event.output || {},
            timestamp: Date.now()
          };

          // Execute tool if auto-execution is enabled
          if (toolCall && tools[toolCall.name]) {
            const toolDef = tools[toolCall.name];
            if (toolDef.execute) {
              try {
                const result = await toolDef.execute(
                  event.output || toolCall.input,
                  { signal }
                );

                // Handle artifacts if tool returns them
                if (result && result.artifacts) {
                  for (const artifact of result.artifacts) {
                    yield {
                      type: AI_EVENT_TYPES.ARTIFACT_CREATED,
                      artifact: {
                        id: artifact.id || "artifact-" + Date.now(),
                        type: artifact.type,
                        title: artifact.title,
                        content: artifact.content,
                        status: "created"
                      },
                      timestamp: Date.now()
                    };

                    if (hooks.onArtifact) {
                      await hooks.onArtifact(artifact);
                    }
                  }
                }
              } catch (error) {
                yield {
                  type: AI_EVENT_TYPES.ERROR_OCCURRED,
                  message: "Tool execution failed: " + error.message,
                  code: "TOOL_EXECUTION_ERROR",
                  timestamp: Date.now()
                };
              }
            }
          }

          break;
        }

        case PROVIDER_EVENT_TYPES.ARTIFACT:
          yield {
            type: AI_EVENT_TYPES.ARTIFACT_CREATED,
            artifact: {
              id: event.id || "artifact-" + Date.now(),
              type: event.type,
              title: event.title,
              content: event.content,
              status: "created"
            },
            timestamp: Date.now()
          };

          if (hooks.onArtifact) {
            await hooks.onArtifact({
              type: event.type,
              title: event.title,
              content: event.content
            });
          }
          break;

        case PROVIDER_EVENT_TYPES.STREAM_ERROR:
          yield {
            type: AI_EVENT_TYPES.ERROR_OCCURRED,
            message: event.error,
            code: event.code || "PROVIDER_ERROR",
            timestamp: Date.now()
          };

          if (hooks.onError) {
            await hooks.onError(new Error(event.error));
          }
          break;

        case PROVIDER_EVENT_TYPES.STREAM_COMPLETED:
          break;

        default:
          // Ignore unknown events
          break;
      }
    }
  } catch (error) {
    if (signal?.aborted) {
      yield {
        type: AI_EVENT_TYPES.ERROR_OCCURRED,
        message: "Stream cancelled",
        code: "CANCELLED",
        timestamp: Date.now()
      };
    } else {
      yield {
        type: AI_EVENT_TYPES.ERROR_OCCURRED,
        message: error.message,
        code: error.code || "STREAM_ERROR",
        timestamp: Date.now()
      };
    }
  }
}

/**
 * Determine if a tool call requires approval.
 *
 * @private
 */
async function shouldRequireApproval(toolName, input, approvalPolicy, tools) {
  // Check tool-specific approval setting
  const toolDef = tools[toolName];
  if (toolDef && toolDef.approval !== undefined) {
    const policy = toolDef.approval;

    if (typeof policy === "boolean") {
      return policy;
    }

    if (policy === "never") {
      return false;
    }

    if (policy === "always") {
      return true;
    }

    if (typeof policy === "function") {
      return await policy(toolName, input);
    }
  }

  // Fall back to global approval policy
  if (approvalPolicy === "never") {
    return false;
  }

  if (approvalPolicy === "always") {
    return true;
  }

  if (typeof approvalPolicy === "function") {
    return await approvalPolicy(toolName, input);
  }

  return false;
}
