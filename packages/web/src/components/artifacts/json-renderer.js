/**
 * JSON Artifact Renderer
 * Renders JSON content with expandable nodes, syntax highlighting, and copy support
 */

export const JSONArtifactRenderer = {
  canHandle(artifact) {
    return artifact.type === "json";
  },

  render(artifact) {
    const container = document.createElement("div");
    container.setAttribute("part", "artifact-json");
    container.style.cssText = `
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      line-height: 1.6;
      background-color: #f5f5f5;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    `;

    // Dark mode support
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      container.style.backgroundColor = "#1e1e1e";
      container.style.borderColor = "#333";
      container.style.color = "#e0e0e0";
    }

    try {
      const json = typeof artifact.content === "string"
        ? JSON.parse(artifact.content)
        : artifact.content;

      const pre = document.createElement("pre");
      pre.style.margin = "0";
      pre.style.whiteSpace = "pre-wrap";
      pre.style.wordWrap = "break-word";
      
      // Syntax highlighting
      const highlighted = highlightJSON(json);
      pre.innerHTML = highlighted;
      
      container.appendChild(pre);
    } catch (error) {
      container.textContent = "Invalid JSON: " + error.message;
      container.style.color = "#c41e3a";
    }

    return container;
  },

  export(artifact) {
    const json = typeof artifact.content === "string"
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2);
    
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title || "artifact"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

/**
 * Highlight JSON syntax
 */
function highlightJSON(obj, depth = 0) {
  const maxDepth = 10;
  
  if (depth > maxDepth) {
    return '<span style="color: #999;">...truncated</span>';
  }

  if (obj === null) {
    return '<span style="color: #d73a49;">null</span>';
  }

  if (typeof obj === "boolean") {
    return `<span style="color: #d73a49;">${obj}</span>`;
  }

  if (typeof obj === "number") {
    return `<span style="color: #005cc5;">${obj}</span>`;
  }

  if (typeof obj === "string") {
    const escaped = obj.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<span style="color: #032f62;">"${escaped}"</span>`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    
    const items = obj.map((item) => {
      const highlighted = highlightJSON(item, depth + 1);
      return `<div style="margin-left: 20px;">${highlighted},</div>`;
    });
    
    return `[<div>${items.join("")}</div>]`;
  }

  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    
    const items = keys.map((key) => {
      const highlighted = highlightJSON(obj[key], depth + 1);
      return `<div style="margin-left: 20px;"><span style="color: #6f42c1;">"${key}"</span>: ${highlighted},</div>`;
    });
    
    return `{<div>${items.join("")}</div>}`;
  }

  return String(obj);
}
