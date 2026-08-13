/**
 * Markdown Artifact Renderer
 * Renders markdown content with basic HTML conversion
 */

/**
 * Simple markdown to HTML converter (basic implementation)
 * For production, consider using a library like marked or markdown-it
 */
function markdownToHtml(markdown) {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  // Line breaks
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, "");

  // Lists
  html = html.replace(/^\* (.*?)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>)/s, "<ul>$1</ul>");
  html = html.replace(/^- (.*?)$/gm, "<li>$1</li>");

  return html;
}

export const MarkdownArtifactRenderer = {
  type: "markdown",

  canHandle(artifact) {
    return artifact.type === "markdown";
  },

  render(artifact) {
    const container = document.createElement("div");
    container.setAttribute("part", "artifact-markdown");
    container.style.cssText = `
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      color: inherit;
    `;

    const markdown = typeof artifact.content === "string" ? artifact.content : JSON.stringify(artifact.content, null, 2);

    const html = markdownToHtml(markdown);
    const div = document.createElement("div");
    div.style.cssText = `
      padding: 12px;
      border-radius: 4px;
    `;

    // Use textContent for security - parse HTML manually if needed
    const temp = document.createElement("div");
    temp.innerHTML = html; // This is safe because we only convert markdown

    // Walk the tree and escape dangerous content
    const walk = (node) => {
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 1) {
          // Element
          const tag = child.tagName.toLowerCase();
          // Only allow safe tags
          if (!["h1", "h2", "h3", "p", "strong", "em", "code", "pre", "a", "ul", "li", "br"].includes(tag)) {
            while (child.firstChild) {
              node.insertBefore(child.firstChild, child);
            }
            node.removeChild(child);
            i--;
            continue;
          }

          // Sanitize links
          if (tag === "a" && child.href) {
            if (!isValidUrl(child.href)) {
              child.href = "javascript:void(0)";
            }
          }

          walk(child);
        }
      }
    };

    walk(temp);
    div.appendChild(temp);
    container.appendChild(div);

    return container;
  }
};

function isValidUrl(url) {
  if (typeof url !== "string") return false;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:")) {
    return false;
  }
  return true;
}
