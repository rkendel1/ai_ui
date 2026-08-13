/**
 * Security utilities for AI artifact rendering
 * 
 * Ensures that AI-generated content is safe to render without
 * introducing security vulnerabilities.
 * 
 * ⚠️  IMPORTANT: This is a basic regex-based implementation designed for:
 *   - Node.js server-side rendering (where DOM APIs are unavailable)
 *   - Cross-environment compatibility
 * 
 * For production browser environments, strongly consider using:
 *   - DOMPurify (https://github.com/cure53/DOMPurify)
 *   - markdown-it with sanitization plugins
 *   - Or similar battle-tested libraries
 * 
 * Regex-based sanitization has known limitations:
 *   - Edge cases with whitespace in tag names: </script\t> or </script\n>
 *   - Event handlers with unusual encoding might bypass filters
 *   - HTML comments could theoretically hide attacks
 *   - Highly obfuscated payloads might evade detection
 * 
 * This implementation blocks common attack vectors but is not a complete
 * HTML parser replacement. Use CSP headers and proper frameworks in
 * production for defense-in-depth.
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * Removes:
 *   - All script tags (including with spacing: < script >, </script >)
 *   - Event handler attributes (onclick, onload, etc.)
 *   - data-* attributes that could contain executable content
 *   - Dangerous protocol handlers (javascript:, data:, vbscript:)
 * 
 * Note: This is regex-based and works in Node.js. See module comments
 * for production recommendations.
 * 
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (typeof html !== "string") {
    return "";
  }

  // Remove script tags - handles spacing variations like < script >, </script >
  // Note: CodeQL flags this as not handling tab/newline in tags. For production,
  // use DOMPurify which properly parses HTML instead of regex.
  let sanitized = html.replace(/<\s*script\b[^<]*(?:(?!<\s*\/\s*script\s*>)<[^<]*)*<\s*\/\s*script\s*>/gi, "");
  
  // Remove event handlers (on* attributes) with both quoted and unquoted values
  // Note: CodeQL notes this might miss encodings like &#111;n&#99;lick. Use DOMPurify for robust handling.
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove data-* attributes that could contain executable content
  sanitized = sanitized.replace(/\s+data-\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s+data-\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove dangerous protocols from href and src attributes
  // Blocks: javascript:, data:, vbscript:
  sanitized = sanitized.replace(/href\s*=\s*["'](?:javascript|data|vbscript):[^"']*["']/gi, 'href="about:blank"');
  sanitized = sanitized.replace(/src\s*=\s*["'](?:javascript|data|vbscript):[^"']*["']/gi, 'src=""');
  
  // Handle unquoted dangerous protocols
  sanitized = sanitized.replace(/href\s*=\s*(?:javascript|data|vbscript):[^\s>]*/gi, 'href="about:blank"');
  sanitized = sanitized.replace(/src\s*=\s*(?:javascript|data|vbscript):[^\s>]*/gi, 'src=""');

  return sanitized;
}

/**
 * Escape HTML special characters
 * Use this for text content that should not be interpreted as HTML
 * This is safe and handles all HTML entities.
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
 * Also blocks vbscript: and other potentially dangerous protocols
 * 
 * Allows: http://, https://, mailto:, ftp://, and relative URLs
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} true if URL is safe to use
 */
export function isValidUrl(url) {
  if (typeof url !== "string") {
    return false;
  }

  const lowerUrl = url.toLowerCase().trim();

  // Reject dangerous protocols early
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file://"];
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return false;
    }
  }

  // Allow relative URLs (no protocol)
  if (!url.includes(":") && !url.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(url, "http://example.com");
    const protocol = parsed.protocol;

    // Allow http, https, mailto, and ftp
    return ["http:", "https:", "mailto:", "ftp:"].includes(protocol);
  } catch {
    // If URL parsing fails, reject it (except relative URLs already allowed above)
    return false;
  }
}

/**
 * Validate image URL
 * More restrictive than general URL validation - only allows http/https and relative URLs
 * Blocks data: URLs to prevent data exfiltration
 */
export function isValidImageUrl(url) {
  if (typeof url !== "string") {
    return false;
  }

  const lowerUrl = url.toLowerCase().trim();

  // Reject dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file://"];
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return false;
    }
  }

  try {
    const parsed = new URL(url, "http://example.com");
    // Only allow http, https
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    // Allow relative URLs (no protocol)
    if (!url.includes(":") && !url.startsWith("//")) {
      return true;
    }
    return false;
  }
}

/**
 * Sanitize markdown to remove potentially dangerous content
 * 
 * This is a basic implementation designed for Node.js compatibility.
 * For production, consider using markdown-it with sanitization plugins
 * or marked with a DOMPurify renderer.
 * 
 * Note: CodeQL flags this as incomplete. For production, use a proper
 * markdown parsing library with HTML sanitization.
 */
export function sanitizeMarkdown(markdown) {
  if (typeof markdown !== "string") {
    return "";
  }

  // Remove script tags with spacing variations
  let sanitized = markdown.replace(/<\s*script\b[^<]*(?:(?!<\s*\/\s*script\s*>)<[^<]*)*<\s*\/\s*script\s*>/gi, "");
  
  // Remove dangerous protocols
  sanitized = sanitized.replace(/(?:javascript|data|vbscript):/gi, "");
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=/gi, "");

  // Remove HTML comments that might contain sensitive info
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");

  return sanitized;
}

/**
 * Create a safe rendering context with sanitization functions
 * Provides a bundle of security utilities for custom renderers
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
 * Safely converts objects to JSON without throwing on circular structures
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





