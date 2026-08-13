/**
 * AI Renderer System Type Definitions
 * 
 * These interfaces define the contracts for rendering artifacts and tool calls
 * in a framework-neutral way. The core can use these types, and the web
 * implementation can translate them into DOM elements.
 */

/**
 * Context passed to artifact renderers
 */
export interface AIArtifactRenderContext {
  artifact: AIArtifact;
  registry?: AIRendererRegistry;
  sanitize?: (html: string) => string;
}

/**
 * Contract for rendering AI artifacts
 */
export interface AIArtifactRenderer {
  type: string;
  canHandle?(artifact: AIArtifact): boolean;
  render(artifact: AIArtifact, context?: AIArtifactRenderContext): unknown;
  export?(artifact: AIArtifact): void;
}

/**
 * Context passed to tool renderers
 */
export interface AIToolRenderContext {
  toolCall: AIToolCall;
  registry?: AIRendererRegistry;
}

/**
 * Contract for rendering tool calls
 */
export interface AIToolRenderer {
  name: string;
  renderInput(toolCall: AIToolCall, context?: AIToolRenderContext): unknown;
  renderOutput?(toolCall: AIToolCall, context?: AIToolRenderContext): unknown;
}

/**
 * Plugin interface for composing multiple renderers
 */
export interface AIUIPlugin {
  name: string;
  artifacts?: Array<{
    type: string;
    renderer: AIArtifactRenderer;
  }>;
  tools?: Array<{
    name: string;
    renderer: AIToolRenderer;
  }>;
  actions?: Array<{
    id: string;
    handler: (artifact: AIArtifact, context?: any) => void;
  }>;
}

/**
 * Universal renderer registry
 */
export interface AIRendererRegistry {
  /**
   * Register a custom artifact renderer
   */
  registerArtifact(type: string, renderer: AIArtifactRenderer): void;

  /**
   * Get a registered artifact renderer
   */
  getArtifactRenderer(type: string): AIArtifactRenderer | undefined;

  /**
   * Check if an artifact type is registered
   */
  hasArtifact(type: string): boolean;

  /**
   * List all registered artifact types
   */
  listArtifacts(): string[];

  /**
   * Unregister an artifact renderer
   */
  unregisterArtifact(type: string): void;

  /**
   * Subscribe to artifact renderer changes
   */
  subscribeArtifacts(listener: (event: RegistryEvent) => void): () => void;

  /**
   * Register a custom tool renderer
   */
  registerTool(name: string, renderer: AIToolRenderer): void;

  /**
   * Get a registered tool renderer
   */
  getToolRenderer(name: string): AIToolRenderer | undefined;

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean;

  /**
   * List all registered tool names
   */
  listTools(): string[];

  /**
   * Unregister a tool renderer
   */
  unregisterTool(name: string): void;

  /**
   * Subscribe to tool renderer changes
   */
  subscribeTools(listener: (event: RegistryEvent) => void): () => void;
}

export interface RegistryEvent {
  type: "artifact.registered" | "artifact.unregistered" | "tool.registered" | "tool.unregistered";
  name?: string;
  artifactType?: string;
}

// References to core types (re-exported for convenience)
export interface AIArtifact {
  id: string;
  type: string;
  title?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
  status?: "creating" | "completed" | "failed";
}

export interface AIToolCall {
  id: string;
  name: string;
  status: "pending" | "running" | "approval_required" | "completed" | "rejected" | "failed";
  input?: unknown;
  output?: unknown;
  error?: unknown;
  inputSchema?: unknown;
}
