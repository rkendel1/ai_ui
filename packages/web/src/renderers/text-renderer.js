/**
 * Text Artifact Renderer
 * Renders plain text artifacts with minimal styling
 */

export const TextArtifactRenderer = {
  type: "text",

  canHandle(artifact) {
    return artifact.type === "text";
  },

  render(artifact) {
    const container = document.createElement("div");
    container.setAttribute("part", "artifact-text");
    container.style.cssText = `
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: inherit;
    `;

    const text = typeof artifact.content === "string" ? artifact.content : JSON.stringify(artifact.content, null, 2);

    const pre = document.createElement("pre");
    pre.style.margin = "0";
    pre.style.fontFamily = "inherit";
    pre.style.fontSize = "inherit";
    pre.textContent = text;

    container.appendChild(pre);
    return container;
  }
};
