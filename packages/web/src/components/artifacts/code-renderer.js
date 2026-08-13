/**
 * Code Artifact Renderer
 * Renders code with syntax highlighting and copy support
 */

export const CodeArtifactRenderer = {
  canHandle(artifact) {
    return artifact.type === "code";
  },

  render(artifact) {
    const container = document.createElement("div");
    container.setAttribute("part", "artifact-code");
    container.style.cssText = `
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      line-height: 1.6;
      background-color: #f5f5f5;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
    `;

    // Dark mode support
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      container.style.backgroundColor = "#1e1e1e";
      container.style.borderColor = "#333";
      container.style.color = "#e0e0e0";
    }

    const pre = document.createElement("pre");
    pre.style.margin = "0";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordWrap = "break-word";
    
    const code = typeof artifact.content === "string"
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2);
    
    pre.textContent = code;
    container.appendChild(pre);

    return container;
  },

  export(artifact) {
    const content = typeof artifact.content === "string"
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2);
    
    const language = artifact.metadata?.language || "txt";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title || "artifact"}.${language}`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

/**
 * Text Artifact Renderer
 * Renders plain text content
 */
export const TextArtifactRenderer = {
  canHandle(artifact) {
    return artifact.type === "text";
  },

  render(artifact) {
    const container = document.createElement("div");
    container.setAttribute("part", "artifact-text");
    container.style.cssText = `
      padding: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 14px;
      color: #111827;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      max-height: 500px;
      overflow-y: auto;
    `;

    // Dark mode support
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      container.style.backgroundColor = "#1f2937";
      container.style.borderColor = "#374151";
      container.style.color = "#f3f4f6";
    }

    const content = typeof artifact.content === "string"
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2);
    
    container.textContent = content;
    return container;
  },

  export(artifact) {
    const content = typeof artifact.content === "string"
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2);
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title || "artifact"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
