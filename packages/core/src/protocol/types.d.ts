export interface AIRequest {
  message: string;
  context?: Record<string, unknown>;
  tools?: Record<string, unknown>[];
  signal?: AbortSignal;
}

export interface SessionStarted {
  type: "session.started";
  sessionId?: string;
}

export interface MessageStarted {
  type: "message.started";
  messageId: string;
  role?: "assistant";
}

export interface TextDelta {
  type: "text.delta";
  messageId: string;
  text: string;
}

export interface ReasoningDelta {
  type: "reasoning.delta";
  messageId: string;
  text: string;
}

export interface ToolCallStarted {
  type: "tool.call.started";
  id: string;
  name: string;
  input?: unknown;
}

export interface ToolCallDelta {
  type: "tool.call.delta";
  id: string;
  delta: string;
}

export interface ToolCallCompleted {
  type: "tool.call.completed";
  id: string;
  output?: unknown;
}

export interface ToolApprovalRequired {
  type: "tool.approval.required";
  id: string;
  reason?: string;
}

export interface ArtifactCreated {
  type: "artifact.created";
  artifact: {
    id: string;
    type: "code" | "table" | "json" | "image" | "document" | "chart" | "custom";
    title?: string;
    content: unknown;
    metadata?: Record<string, unknown>;
  };
}

export interface CitationAdded {
  type: "citation.added";
  citation: {
    id: string;
    label?: string;
    href?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface MessageCompleted {
  type: "message.completed";
  messageId: string;
}

export interface ErrorOccurred {
  type: "error.occurred";
  message: string;
  code?: string;
}

export interface SessionCompleted {
  type: "session.completed";
}

export type AIEvent =
  | SessionStarted
  | MessageStarted
  | TextDelta
  | ReasoningDelta
  | ToolCallStarted
  | ToolCallDelta
  | ToolCallCompleted
  | ToolApprovalRequired
  | ArtifactCreated
  | CitationAdded
  | MessageCompleted
  | ErrorOccurred
  | SessionCompleted;

export interface AITransport {
  send(request: AIRequest): AsyncIterable<AIEvent>;
}
