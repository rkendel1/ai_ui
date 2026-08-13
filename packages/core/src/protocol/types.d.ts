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

/**
 * Canonical tool call model
 */
export interface AIToolCall {
  id: string;
  name: string;
  status: "pending" | "running" | "approval_required" | "completed" | "rejected" | "failed";
  input?: unknown;
  output?: unknown;
  error?: unknown;
  inputSchema?: unknown; // JSON Schema for the input
}

export interface ToolCallStarted {
  type: "tool.call.started";
  id: string;
  name: string;
  input?: unknown;
  inputSchema?: unknown;
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

export interface ToolApproved {
  type: "tool.approved";
  id: string;
}

export interface ToolRejected {
  type: "tool.rejected";
  id: string;
  reason?: string;
}

/**
 * Canonical artifact model
 */
export interface AIArtifact {
  id: string;
  type: "text" | "code" | "json" | "table" | "image" | "chart" | "document" | "custom";
  title?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
  status?: "creating" | "completed" | "failed";
}

export interface ArtifactCreated {
  type: "artifact.created";
  artifact: AIArtifact;
}

export interface ArtifactUpdated {
  type: "artifact.updated";
  artifactId: string;
  changes: Partial<AIArtifact>;
}

export interface ArtifactCompleted {
  type: "artifact.completed";
  artifactId: string;
}

export interface ArtifactFailed {
  type: "artifact.failed";
  artifactId: string;
  error?: string;
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
  | ToolApproved
  | ToolRejected
  | ArtifactCreated
  | ArtifactUpdated
  | ArtifactCompleted
  | ArtifactFailed
  | CitationAdded
  | MessageCompleted
  | ErrorOccurred
  | SessionCompleted;

export interface AITransport {
  send(request: AIRequest): AsyncIterable<AIEvent>;
}
