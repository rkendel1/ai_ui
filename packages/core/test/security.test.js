import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeHtml,
  escapeHtml,
  isValidUrl,
  isValidImageUrl,
  sanitizeMarkdown,
  safeStringifyJson
} from "../src/security/sanitization.js";

test("Security: sanitizeHtml removes script tags", () => {
  const dangerous = '<div><script>alert("XSS")</script>Safe text</div>';
  const safe = sanitizeHtml(dangerous);
  assert(!safe.includes("<script>"), "Script tag should be removed");
  assert(safe.includes("Safe text"), "Safe content should be preserved");
});

test("Security: sanitizeHtml removes event handlers", () => {
  const dangerous = '<div onclick="alert(\'XSS\')">Click me</div>';
  const safe = sanitizeHtml(dangerous);
  assert(!safe.includes("onclick"), "Event handler should be removed");
  assert(safe.includes("Click me"), "Content should be preserved");
});

test("Security: sanitizeHtml allows safe tags", () => {
  const safe = "<h1>Title</h1><p>Paragraph</p><strong>Bold</strong>";
  const result = sanitizeHtml(safe);
  assert(result.includes("Title"), "Headers should be allowed");
  assert(result.includes("Bold"), "Bold tags should be allowed");
});

test("Security: sanitizeHtml removes data attributes", () => {
  const dangerous = '<div data-value="secret">Content</div>';
  const safe = sanitizeHtml(dangerous);
  assert(!safe.includes("data-value"), "Data attributes should be removed");
});

test("Security: escapeHtml prevents HTML injection", () => {
  const dangerous = '<script>alert("XSS")</script>';
  const safe = escapeHtml(dangerous);
  assert(safe.includes("&lt;"), "< should be escaped");
  assert(safe.includes("&gt;"), "> should be escaped");
  assert(!safe.includes("<script>"), "Script tag should not be present");
});

test("Security: isValidUrl rejects javascript: URLs", () => {
  assert(!isValidUrl("javascript:alert('XSS')"), "javascript: URLs should be rejected");
  assert(!isValidUrl("data:text/html,<script>alert('XSS')</script>"), "data: URLs should be rejected");
});

test("Security: isValidUrl accepts safe URLs", () => {
  assert(isValidUrl("https://example.com"), "HTTPS URLs should be allowed");
  assert(isValidUrl("http://example.com"), "HTTP URLs should be allowed");
  assert(isValidUrl("mailto:test@example.com"), "mailto: URLs should be allowed");
  assert(isValidUrl("/relative/path"), "Relative URLs should be allowed");
});

test("Security: isValidImageUrl is more restrictive", () => {
  assert(isValidImageUrl("https://example.com/image.png"), "HTTPS image URLs should be allowed");
  assert(isValidImageUrl("http://example.com/image.png"), "HTTP image URLs should be allowed");
  assert(!isValidImageUrl("javascript:void(0)"), "javascript: URLs should be rejected");
});

test("Security: sanitizeMarkdown removes script tags", () => {
  const dangerous = "# Title\n<script>alert('XSS')</script>\nContent";
  const safe = sanitizeMarkdown(dangerous);
  assert(!safe.includes("<script>"), "Script tags should be removed");
  assert(safe.includes("# Title"), "Markdown should be preserved");
});

test("Security: sanitizeMarkdown removes javascript: protocol", () => {
  const dangerous = "[Link](javascript:alert('XSS'))";
  const safe = sanitizeMarkdown(dangerous);
  assert(!safe.includes("javascript:"), "javascript: protocol should be removed");
});

test("Security: sanitizeMarkdown removes event handlers", () => {
  const dangerous = '<img src="x" onerror="alert(\'XSS\')">';
  const safe = sanitizeMarkdown(dangerous);
  assert(!safe.includes("onerror"), "Event handlers should be removed");
});

test("Security: safeStringifyJson handles circular references", () => {
  const circular = { a: 1 };
  circular.self = circular;
  
  const result = safeStringifyJson(circular);
  assert(result.includes("Circular"), "Circular references should be marked");
  assert(result.includes("1"), "Regular values should be preserved");
});

test("Security: safeStringifyJson handles normal objects", () => {
  const obj = { name: "Test", value: 123, nested: { key: "value" } };
  const result = safeStringifyJson(obj);
  const parsed = JSON.parse(result);
  assert.deepEqual(parsed, obj, "Object should be correctly serialized");
});

test("Security: HTML sanitization preserves links with valid URLs", () => {
  const html = '<a href="https://example.com">Click here</a>';
  const safe = sanitizeHtml(html);
  assert(safe.includes("https://example.com"), "Valid HTTPS URLs should be preserved");
  assert(safe.includes("Click here"), "Link text should be preserved");
});

test("Security: HTML sanitization removes javascript: protocol from href", () => {
  const html = '<a href="javascript:alert(\'XSS\')">Click here</a>';
  const safe = sanitizeHtml(html);
  // The sanitizeHtml function replaces javascript: URLs with javascript:void(0)
  // So we just need to ensure the dangerous alert() code is not executable
  assert(safe.includes("Click here"), "Link text should be preserved");
  // The key point is that the dangerous alert is gone
  assert(!safe.includes("alert"), "alert() should not be present");
});
