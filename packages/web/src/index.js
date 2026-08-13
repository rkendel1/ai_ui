export { defineAIChatElement } from "./components/ai-chat.js";
export { defineAIComposerElement } from "./components/ai-composer.js";
export { defineAIAttachmentsElement } from "./components/ai-attachments.js";

// PR5: First-class tool and artifact components
export { defineAIToolCallElement } from "./components/tools/ai-tool-call.js";
export { defineAIToolApprovalElement } from "./components/approval/ai-tool-approval.js";
export { defineAIArtifactElement } from "./components/artifacts/ai-artifact.js";

// PR5: Artifact renderers
export { JSONArtifactRenderer } from "./components/artifacts/json-renderer.js";
export { CodeArtifactRenderer, TextArtifactRenderer } from "./components/artifacts/code-renderer.js";
export { TableArtifactRenderer } from "./components/artifacts/table-renderer.js";

if (typeof customElements !== "undefined") {
  defineAIChatElement();
  defineAIComposerElement();
  defineAIAttachmentsElement();
  defineAIToolCallElement();
  defineAIToolApprovalElement();
  defineAIArtifactElement();
}

