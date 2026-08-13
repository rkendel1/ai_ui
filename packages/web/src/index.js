export { defineAIChatElement } from "./ai-chat.js";

if (typeof window !== "undefined") {
  defineAIChatElement();
}
