# Security Policy for AI UI Rendering

## Overview

The AI UI extensible rendering system includes security utilities for sanitizing AI-generated content. This document explains the security approach, known limitations, and recommendations for production use.

## Security Architecture

### Principle: Defense in Depth

The system uses multiple layers of defense:

1. **Content Sanitization**: Removes dangerous HTML tags, event handlers, and protocols
2. **URL Validation**: Whitelist-based protocol validation (http, https, mailto, ftp only)
3. **Context Isolation**: Renders content in controlled DOM contexts
4. **CSP Headers**: Server should provide Content Security Policy headers
5. **Framework Boundaries**: Renderers are isolated from core logic

## Sanitization Approach: Regex-Based

### Why Regex?

The security module uses regex-based HTML sanitization for:
- **Cross-environment compatibility**: Works in Node.js and browsers
- **Zero dependencies**: No external security libraries required
- **Predictable behavior**: No DOM-parsing variations across environments

### What It Protects Against

✅ **Blocks:**
- Script tag injection: `<script>alert('xss')</script>`
- Event handlers: `<img onclick="alert('xss')">`
- Dangerous protocols: `href="javascript:alert('xss')"`
- Data URLs: `src="data:text/html,<script>alert('xss')</script>"`
- VBScript: `href="vbscript:alert('xss')"`
- HTML comments with potential payloads

### Known Limitations

❌ **May Not Block (documented edge cases):**

1. **Whitespace in tags**: `<script\t>` or `</script\n>` might bypass the regex
   - Fix: Use `trim()` before sanitizing
   - Better: Use DOMPurify in production

2. **Character encoding evasion**: `&#111;nclick` (encoded "onclick") might bypass filters
   - Fix: Decode entities before filtering
   - Better: Use DOMPurify which handles encoding

3. **HTML comment payload**: `<!-- <script>alert('xss')</script> -->`
   - Handled: Comments are stripped entirely
   - Edge case: Nested comments might bypass

4. **Nested tags**: Complex nesting patterns
   - Handled: Recursive regex matching attempts to handle this
   - Edge case: Malformed HTML might not be fully parsed

## Production Recommendations

### For Browser Environments

**Strongly recommended**: Use **DOMPurify** instead of the regex approach

```javascript
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(untrustedHtml, {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel']
});
```

DOMPurify:
- Parses HTML properly (not regex-based)
- Handles encoding and edge cases
- Widely used and battle-tested
- Active maintenance and security updates

### For Markdown

**Recommended**: Use **markdown-it** with sanitization plugin

```javascript
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const md = new MarkdownIt();
const rendered = md.render(markdown);
const clean = DOMPurify.sanitize(rendered);
```

Or use **marked** with a custom renderer:

```javascript
import { marked } from 'marked';

marked.setOptions({
  renderer: {
    html(text) {
      return DOMPurify.sanitize(text);
    }
  }
});
```

### Node.js Server-Side Rendering

If you must sanitize on the server:

1. Use the regex-based approach (current implementation)
2. Add additional validation layers
3. Use CSP headers on responses
4. Log/monitor sanitization events
5. Plan migration to DOM-based when frameworks support it

Example with additional validation:

```javascript
import { sanitizeHtml, isValidUrl } from '@ai-ui/core/security';

function safeRender(artifact) {
  let html = sanitizeHtml(artifact.content);
  
  // Additional validation
  const links = html.match(/href="([^"]*)"/g) || [];
  for (const link of links) {
    const url = link.match(/href="([^"]*)"/)[1];
    if (!isValidUrl(url)) {
      html = html.replace(link, 'href="about:blank"');
    }
  }
  
  return html;
}
```

## Security Boundaries

### What Renderers Must NOT Do

❌ **Never:**
- Use `element.innerHTML = untrustedContent` directly
- Use `eval()` or `Function()` with content
- Pass untrusted content to `JSON.parse()` without validation
- Trust data: URLs or javascript: URLs
- Allow iframes with untrusted content

### What Renderers CAN Do

✅ **Safe operations:**
- Use `element.textContent = content` (always safe)
- Use `element.appendChild(document.createElement(...))` with sanitized content
- Use `dangerouslySetInnerHTML` in React with sanitized content
- Pass through CSP-compliant APIs

### Custom Renderer Security

When implementing a custom renderer:

```javascript
const myRenderer = {
  type: 'custom',
  render(artifact, context) {
    // ✅ GOOD: Use provided sanitization
    const safe = context.sanitize(artifact.content);
    
    // ✅ GOOD: Use textContent for user data
    const el = document.createElement('div');
    el.textContent = artifact.data.title;
    
    // ✅ GOOD: Validate URLs before using
    if (context.isValidUrl(artifact.url)) {
      el.href = artifact.url;
    }
    
    // ❌ BAD: Direct innerHTML
    // el.innerHTML = artifact.content;
    
    // ❌ BAD: Trusting user data
    // const url = artifact.url;
    // el.href = url;
    
    return el;
  }
};
```

## Testing Security

### Unit Tests

The system includes comprehensive security tests in `packages/core/test/security.test.js`:
- HTML sanitization with XSS payloads
- URL validation with dangerous protocols
- Image URL validation
- Markdown sanitization
- Circular reference handling in JSON

Run tests:
```bash
npm test
```

### Adversarial Testing

For production deployments, consider:
1. OWASP XSS test vectors
2. Browser-based security testing tools
3. Fuzz testing with random payloads
4. Manual penetration testing
5. Regular security audits

### CodeQL Analysis

The code passes CodeQL security analysis with 9 known-limitation alerts (documented in code comments). These reflect the inherent limitations of regex-based approaches and are mitigated through:
- Clear documentation
- Recommended alternatives
- Defense-in-depth architecture
- CSP header recommendations

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. **Do** report through GitHub's private vulnerability reporting
3. Include: vulnerability description, impact, reproduction steps
4. Allow time for patch development and testing

## Security Update Policy

- Security patches will be released as soon as possible
- CVEs will be assigned for critical issues
- Regular dependency audits (npm audit)
- Automated security scanning on CI/CD

## Future Improvements

1. **DOM-based sanitization**: Migrate to DOMPurify when available in all supported environments
2. **Content Security Policy**: Built-in CSP header generation for rendered content
3. **Subresource Integrity**: Hash-based validation for loaded resources
4. **Sandboxed iframes**: For untrusted renderer plugins
5. **Security headers**: Automatic CORS, X-Frame-Options, X-Content-Type-Options

## References

- [OWASP: Cross-Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [OWASP: HTML Sanitization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CodeQL: Incomplete HTML Sanitization](https://codeql.github.com/codeql-query-help/javascript/js-incomplete-html-sanitization/)
