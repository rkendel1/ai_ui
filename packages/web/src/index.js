export { defineAIChatElement } from "./components/ai-chat.js";
export { defineAIComposerElement } from "./components/ai-composer.js";
export { defineAIAttachmentsElement } from "./components/ai-attachments.js";

if (typeof customElements !== "undefined") {
  defineAIChatElement();
  defineAIComposerElement();
  defineAIAttachmentsElement();
}
