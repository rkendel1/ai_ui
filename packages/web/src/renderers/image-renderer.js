/**
 * Image Artifact Renderer
 * Renders image artifacts with preview and metadata
 */

export const ImageArtifactRenderer = {
  type: "image",

  canHandle(artifact) {
    return artifact.type === "image";
  },

  render(artifact) {
    const container = document.createElement("div");
    container.setAttribute("part", "artifact-image");
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    `;

    const imageUrl = typeof artifact.content === "string" ? artifact.content : artifact.content?.url || "";

    if (!imageUrl) {
      const error = document.createElement("div");
      error.style.cssText = `
        color: #ef4444;
        font-size: 12px;
      `;
      error.textContent = "Invalid image URL";
      container.appendChild(error);
      return container;
    }

    // Validate image URL for security
    if (!isValidImageUrl(imageUrl)) {
      const error = document.createElement("div");
      error.style.cssText = `
        color: #ef4444;
        font-size: 12px;
      `;
      error.textContent = "Image URL not allowed";
      container.appendChild(error);
      return container;
    }

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = artifact.title || "Generated image";
    img.style.cssText = `
      max-width: 100%;
      max-height: 500px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    `;

    // Handle errors
    img.addEventListener("error", () => {
      img.style.display = "none";
      const error = document.createElement("div");
      error.style.cssText = `
        color: #ef4444;
        font-size: 12px;
        padding: 12px;
        background-color: #fef2f2;
        border-radius: 4px;
      `;
      error.textContent = "Failed to load image";
      container.appendChild(error);
    });

    container.appendChild(img);

    // Add metadata if available
    if (artifact.metadata) {
      const metadata = document.createElement("div");
      metadata.style.cssText = `
        font-size: 12px;
        color: #6b7280;
        text-align: center;
        width: 100%;
      `;

      if (artifact.metadata.dimensions) {
        metadata.textContent += `${artifact.metadata.dimensions}`;
      }
      if (artifact.metadata.size) {
        if (artifact.metadata.dimensions) metadata.textContent += " | ";
        metadata.textContent += artifact.metadata.size;
      }

      if (metadata.textContent) {
        container.appendChild(metadata);
      }
    }

    return container;
  }
};

function isValidImageUrl(url) {
  if (typeof url !== "string") return false;

  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://example.com");
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    // Allow relative URLs
    if (!url.includes(":") && !url.startsWith("//")) {
      return true;
    }
    return false;
  }
}
