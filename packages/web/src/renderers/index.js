/**
 * Built-in Artifact Renderers
 * Exports all built-in renderers for registration
 */

export { TextArtifactRenderer, CodeArtifactRenderer } from "../components/artifacts/code-renderer.js";
export { JSONArtifactRenderer } from "../components/artifacts/json-renderer.js";
export { TableArtifactRenderer } from "../components/artifacts/table-renderer.js";
export { TextArtifactRenderer as PlainTextRenderer } from "./text-renderer.js";
export { MarkdownArtifactRenderer } from "./markdown-renderer.js";
export { ImageArtifactRenderer } from "./image-renderer.js";

/**
 * Default built-in renderers in order of priority
 */
export const DEFAULT_ARTIFACT_RENDERERS = [
  { type: "text", renderer: require("./text-renderer.js").TextArtifactRenderer },
  { type: "code", renderer: require("../components/artifacts/code-renderer.js").CodeArtifactRenderer },
  { type: "markdown", renderer: require("./markdown-renderer.js").MarkdownArtifactRenderer },
  { type: "json", renderer: require("../components/artifacts/json-renderer.js").JSONArtifactRenderer },
  { type: "table", renderer: require("../components/artifacts/table-renderer.js").TableArtifactRenderer },
  { type: "image", renderer: require("./image-renderer.js").ImageArtifactRenderer }
];
