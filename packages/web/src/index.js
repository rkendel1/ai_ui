export { defineAIChatElement } from "./components/ai-chat.js";
export { defineAIComposerElement } from "./components/ai-composer.js";

if (typeof customElements !== "undefined") {
  defineAIChatElement();
  defineAIComposerElement();
}
