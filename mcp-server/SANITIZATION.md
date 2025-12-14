# MCP Server Output Sanitization

## Overview

The MCP server includes output sanitization capabilities to prevent XSS attacks and malicious content injection. This is a **BETA FEATURE** that is disabled by default.

## How it Works

When enabled, the server automatically sanitizes all tool outputs before returning them to the client. The sanitization:

1. Removes dangerous HTML tags (`<script>`, `<iframe>`, etc.)
2. Strips event handlers (`onclick`, `onerror`, etc.)
3. Filters out dangerous URL protocols (`javascript:`, `data:`, etc.)
4. Preserves safe HTML elements for legitimate content

## Enabling Sanitization

Set the environment variable `MCP_SANITIZATION_ENABLED=true`:

```bash
# For stdio transport
MCP_SANITIZATION_ENABLED=true npm run dev

# For HTTP transport
MCP_SANITIZATION_ENABLED=true MCP_HTTP_ENABLED=true npm run dev

# For both transports
MCP_SANITIZATION_ENABLED=true MCP_HTTP_ENABLED=true MCP_HTTP_PORT=3002 npm run dev
```

## Sanitization Rules

### HTML Content
- **Allowed tags**: `h1`-`h6`, `p`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, `del`, `ins`, `sub`, `sup`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `pre`, `code`, `blockquote`, `a`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `hr`, `div`, `span`
- **Allowed attributes**: `href`, `title` (for `a`), `align` (for `th`, `td`), `class` (for code blocks)
- **Allowed protocols**: `http`, `https`, `mailto`, `tel`

### Markdown Content
- Preserves markdown syntax while removing malicious patterns
- Protects markdown links from HTML escaping
- Auto-detects and sanitizes suspicious URLs

### Error Messages
- Escapes HTML entities
- Removes script tags and event handlers
- Maintains error message readability

## Implementation Details

### Transport Layer Integration

The sanitization is applied at the transport layer, ensuring all outputs are sanitized regardless of which tool produced them:

1. **stdio.ts**: Sanitizes responses for stdio transport clients
2. **http.ts**: Sanitizes responses for HTTP transport clients

### Sanitizer Class

The `Sanitizer` class provides methods for different content types:

- `sanitize()` - Auto-detects content type and sanitizes appropriately
- `sanitizeHtml()` - For HTML content with strict rules
- `sanitizeMarkdown()` - For markdown content with link preservation
- `sanitizeText()` - For plain text content
- `sanitizeError()` - Specifically for error messages
- `sanitizeUrl()` - For URL values only
- `isSuspicious()` - Checks if content contains malicious patterns (always active)

## Testing

A test script is provided to verify sanitization:

```bash
node test-sanitization.js
```

This script tests both transports with and without sanitization enabled.

## Security Considerations

1. **Performance**: Sanitization adds minimal overhead but is disabled by default to maintain optimal performance
2. **Compatibility**: Existing tools continue to work without modification when sanitization is disabled
3. **False Positives**: The sanitizer is conservative but may occasionally strip legitimate content edge cases

## Example

### Without Sanitization (Default)
```javascript
// Tool output containing malicious content
"<script>alert('xss')</script><p>Safe content</p>"
```

### With Sanitization Enabled
```javascript
// Sanitized output
"Safe content"
```

## Future Enhancements

- Configurable sanitization levels (strict, moderate, permissive)
- Whitelist for trusted domains/URLs
- Per-tool sanitization rules
- Custom sanitization rules via configuration