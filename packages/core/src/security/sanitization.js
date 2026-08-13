/**
 * Security utilities for AI artifact rendering
 * 
 * Ensures that AI-generated content is safe to render without
 * introducing security vulnerabilities.
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * Only allows safe HTML tags and attributes
 * Note: In Node.js environment, this is a basic implementation.
 * In browser, it uses DOM parsing for better safety.
 */
export function sanitizeHtml(html) {
  if (typeof html !== "string") {
    return "";
  }

  // Use a basic regex-based approach that works in any environment
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove event handlers (on* attributes)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove data-* and other non-standard attributes
  sanitized = sanitized.replace(/\s+data-\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s+data-\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove dangerous protocols in href/src attributes
  // Match href="javascript:..." or href='javascript:...' patterns
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="javascript:void(0)"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
  sanitized = sanitized.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href="javascript:void(0)"');
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  
  // Also handle unquoted dangerous protocols
  sanitized = sanitized.replace(/href\s*=\s*javascript:[^\s>]*/gi, 'href="javascript:void(0)"');
  sanitized = sanitized.replace(/src\s*=\s*javascript:[^\s>]*/gi, 'src=""');
  sanitized = sanitized.replace(/href\s*=\s*data:[^\s>]*/gi, 'href="javascript:void(0)"');
  sanitized = sanitized.replace(/src\s*=\s*data:[^\s>]*/gi, 'src=""');

  return sanitized;
}

/**
 * Escape HTML special characters
 * Use this for text content that should not be interpreted as HTML
 */
export function escapeHtml(text) {
  if (typeof text !== "string") {
    return "";
  }

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate URL to prevent javascript: and data: URLs
 */
export function isValidUrl(url) {
  if (typeof url !== "string") {
    return false;
  }

  try {
    const lowerUrl = url.toLowerCase().trim();

    // Reject dangerous protocols
    if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:")) {
      return false;
    }

    // Allow relative URLs
    if (!url.includes(":") && !url.startsWith("//")) {
      return true;
    }

    // Try parsing as URL
    const parsed = new URL(url, "http://example.com");
    const protocol = parsed.protocol;

    // Allow http, https, mailto, and ftp
    return ["http:", "https:", "mailto:", "ftp:"].includes(protocol);
  } catch {
    // If URL parsing fails, allow relative URLs
    const lowerUrl = url.toLowerCase().trim();
    if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:")) {
      return false;
    }
    return !url.includes(":");
  }
}

/**
 * Validate image URL
 * More restrictive than general URL validation
 */
export function isValidImageUrl(url) {
  if (typeof url !== "string") {
    return false;
  }

  const lowerUrl = url.toLowerCase().trim();

  // Reject dangerous protocols
  if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:")) {
    return false;
  }

  try {
    const parsed = new URL(url, "http://example.com");
    // Only allow http, https
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    // Allow relative URLs
    if (!url.includes(":") && !url.startsWith("//")) {
      return true;
    }
    return false;
  }
}

/**
 * Sanitize markdown to remove potentially dangerous content
 * This is a basic implementation - consider using a library like DOMPurify
 * or markdown-it with sanitization for production use
 */
export function sanitizeMarkdown(markdown) {
  if (typeof markdown !== "string") {
    return "";
  }

  // Remove script tags and javascript: protocol
  let sanitized = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=/gi, ""); // Remove event handlers

  // Remove HTML comments that might contain sensitive info
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");

  return sanitized;
}

/**
 * Create a safe rendering context with sanitization functions
 */
export function createSafeRenderContext(artifact) {
  return {
    artifact,
    sanitize: sanitizeHtml,
    escapeHtml,
    isValidUrl,
    isValidImageUrl,
    sanitizeMarkdown
  };
}

/**
 * Safe JSON serialization that prevents circular references
 */
export function safeStringifyJson(obj, space = 2) {
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      },
      space
    );
  } catch {
    return JSON.stringify({ error: "Failed to serialize object" });
  }
}



