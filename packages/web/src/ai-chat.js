const HTMLElementBase = globalThis.HTMLElement ?? class {};

class AIChatElement extends HTMLElementBase {
  connectedCallback() {
    if (typeof this.attachShadow !== "function" || this.shadowRoot) {
      return;
    }

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 1rem;
          font-family: system-ui, sans-serif;
        }
      </style>
      <slot name="header"></slot>
      <div part="status">AI UI chat surface ready.</div>
    `;
  }
}

export function defineAIChatElement(tagName = "ai-chat") {
  if (typeof customElements === "undefined") {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, AIChatElement);
  }
}
