import { AI_EVENT_TYPES } from "../protocol/index.js";

function cloneState(state) {
  return {
    ...state,
    messages: state.messages.map((message) => ({ ...message })),
    activeToolCalls: state.activeToolCalls.map((call) => ({ ...call })),
    artifacts: state.artifacts.map((artifact) => ({ ...artifact })),
    citations: state.citations.map((citation) => ({ ...citation }))
  };
}

function createInitialState() {
  return {
    status: "idle",
    messages: [],
    activeToolCalls: [],
    artifacts: [],
    citations: [],
    error: null
  };
}

export function createAISession({ transport, context, tools } = {}) {
  if (!transport || typeof transport.send !== "function") {
    throw new Error("createAISession requires a transport with a send(request) method");
  }

  let state = createInitialState();
  let abortController = null;
  let lastUserMessage = null;
  const listeners = new Set();

  const notify = () => {
    const snapshot = cloneState(state);
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const upsertAssistantMessage = (messageId) => {
    let message = state.messages.find((candidate) => candidate.id === messageId);
    if (!message) {
      message = { id: messageId, role: "assistant", content: "", reasoning: "" };
      state.messages.push(message);
    }
    return message;
  };

  const handleEvent = (event) => {
    switch (event.type) {
      case AI_EVENT_TYPES.SESSION_STARTED:
        state.status = "streaming";
        break;
      case AI_EVENT_TYPES.MESSAGE_STARTED:
        upsertAssistantMessage(event.messageId);
        state.status = "streaming";
        break;
      case AI_EVENT_TYPES.TEXT_DELTA:
        upsertAssistantMessage(event.messageId).content += event.text;
        break;
      case AI_EVENT_TYPES.REASONING_DELTA:
        upsertAssistantMessage(event.messageId).reasoning += event.text;
        break;
      case AI_EVENT_TYPES.TOOL_CALL_STARTED:
        state.activeToolCalls.push({ ...event, status: "running" });
        break;
      case AI_EVENT_TYPES.TOOL_CALL_DELTA: {
        const toolCall = state.activeToolCalls.find((call) => call.id === event.id);
        if (toolCall) {
          toolCall.delta = `${toolCall.delta ?? ""}${event.delta}`;
        }
        break;
      }
      case AI_EVENT_TYPES.TOOL_APPROVAL_REQUIRED: {
        const toolCall = state.activeToolCalls.find((call) => call.id === event.id);
        if (toolCall) {
          toolCall.status = "approval_required";
        }
        state.status = "waiting_for_approval";
        break;
      }
      case AI_EVENT_TYPES.TOOL_APPROVED: {
        const toolCall = state.activeToolCalls.find((call) => call.id === event.id);
        if (toolCall) {
          toolCall.status = "running";
        }
        if (state.status === "waiting_for_approval") {
          state.status = "streaming";
        }
        break;
      }
      case AI_EVENT_TYPES.TOOL_REJECTED: {
        const toolCall = state.activeToolCalls.find((call) => call.id === event.id);
        if (toolCall) {
          toolCall.status = "rejected";
          toolCall.error = event.reason || "Tool was rejected";
        }
        if (state.status === "waiting_for_approval") {
          state.status = "streaming";
        }
        break;
      }
      case AI_EVENT_TYPES.TOOL_CALL_COMPLETED: {
        const toolCall = state.activeToolCalls.find((call) => call.id === event.id);
        if (toolCall) {
          toolCall.status = "completed";
          toolCall.output = event.output;
        }
        if (state.status === "waiting_for_approval") {
          state.status = "streaming";
        }
        break;
      }
      case AI_EVENT_TYPES.ARTIFACT_CREATED:
        state.artifacts.push(event.artifact);
        break;
      case AI_EVENT_TYPES.ARTIFACT_UPDATED: {
        const artifact = state.artifacts.find((a) => a.id === event.artifactId);
        if (artifact) {
          Object.assign(artifact, event.changes);
        }
        break;
      }
      case AI_EVENT_TYPES.ARTIFACT_COMPLETED: {
        const artifact = state.artifacts.find((a) => a.id === event.artifactId);
        if (artifact) {
          artifact.status = "completed";
        }
        break;
      }
      case AI_EVENT_TYPES.ARTIFACT_FAILED: {
        const artifact = state.artifacts.find((a) => a.id === event.artifactId);
        if (artifact) {
          artifact.status = "failed";
          artifact.error = event.error;
        }
        break;
      }
      case AI_EVENT_TYPES.CITATION_ADDED:
        state.citations.push(event.citation);
        break;
      case AI_EVENT_TYPES.MESSAGE_COMPLETED:
        state.status = "complete";
        break;
      case AI_EVENT_TYPES.ERROR_OCCURRED:
        state.status = "error";
        state.error = { message: event.message, code: event.code ?? null };
        break;
      case AI_EVENT_TYPES.SESSION_COMPLETED:
        if (state.status !== "error") {
          state.status = "complete";
        }
        break;
      default:
        break;
    }

    notify();
  };

  const send = async (message) => {
    const content = typeof message === "string" ? message : message?.message;
    if (!content) {
      throw new Error("session.send requires a message string");
    }

    lastUserMessage = content;
    state.messages.push({
      id: `user-${Date.now()}`,
      role: "user",
      content
    });
    state.status = "streaming";
    state.error = null;
    notify();

    abortController = new AbortController();

    const stream = transport.send({
      message: content,
      context,
      tools,
      signal: abortController.signal
    });

    for await (const event of stream) {
      handleEvent(event);
    }

    if (state.status === "streaming") {
      state.status = "complete";
      notify();
    }
  };

  return {
    send,
    cancel() {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      if (state.status === "streaming" || state.status === "waiting_for_approval") {
        state.status = "idle";
        notify();
      }
    },
    retry() {
      if (!lastUserMessage) {
        throw new Error("session.retry requires at least one prior user message");
      }
      return send(lastUserMessage);
    },
    clear() {
      state = createInitialState();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(cloneState(state));
      return () => listeners.delete(listener);
    },
    getState() {
      return cloneState(state);
    }
  };
}
