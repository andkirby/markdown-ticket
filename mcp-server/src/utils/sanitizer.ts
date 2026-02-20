/**
 * Output Sanitization Utility
 *
 * Provides XSS protection and malicious content removal for MCP server outputs.
 * Implements MUST-06 requirement for server output sanitization.
 *
 * NOTE: This is a BETA FEATURE disabled by default.
 * Enable with MCP_SANITIZATION_ENABLED=true environment variable.
 */

import type { IOptions } from 'sanitize-html'
import process from 'node:process'
import sanitize from 'sanitize-html'

/**
 * Check if sanitization is enabled via environment variable
 * This function checks the environment variable at runtime
 */
function isSanitizationEnabled(): boolean {
  return process.env.MCP_SANITIZATION_ENABLED === 'true'
}

/**
 * Sanitizer configuration for different content types
 */
const SANITIZER_CONFIGS = {
  // Strict configuration for user-generated content
  strict: {
    allowedTags: [
      // Text formatting
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'del',
      'ins',
      'sub',
      'sup',

      // Lists
      'ul',
      'ol',
      'li',
      'dl',
      'dt',
      'dd',

      // Code blocks
      'pre',
      'code',

      // Blockquotes
      'blockquote',

      // Links (safe protocols only)
      'a',

      // Tables
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',

      // Other common elements
      'hr',
      'div',
      'span',
    ] as string[],
    allowedAttributes: {
      a: ['href', 'title'] as string[],
      th: ['align'] as string[],
      td: ['align'] as string[],
      pre: ['class'] as string[],
      code: ['class'] as string[],
      div: ['class'] as string[],
      span: ['class'] as string[],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'] as string[],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'tel'] as string[],
    },
    // Remove script tags and event handlers
    allowedScriptHostnames: [],
    allowedScriptDomains: [],
    // Transform functions to handle specific cases
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => {
        // Remove dangerous URLs
        const href = attribs.href
        if (!href)
          return { tagName: 'a', attribs: {} }

        // Check for dangerous protocols
        if (href.toLowerCase().startsWith('javascript:')
          || href.toLowerCase().startsWith('data:')
          || href.toLowerCase().startsWith('vbscript:')
          || href.toLowerCase().startsWith('file:')) {
          return { tagName: 'span', attribs: {} }
        }

        return { tagName, attribs }
      },
    },
    // Remove all style attributes to prevent CSS-based attacks
    allowedStyles: {},
    // Remove all class attributes except for safe ones
    allowedClasses: {
      pre: ['language-*', 'hljs'],
      code: ['language-*', 'hljs'],
      div: ['highlight'],
      span: ['hljs-*'],
    },
  } as IOptions,

  // Configuration for plain text (minimal HTML)
  text: {
    allowedTags: ['br', 'p'] as string[],
    allowedAttributes: {},
    textFilter: (text: string) => {
      // Escape HTML entities in text
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
    },
  } as IOptions,
}

/**
 * Combined sanitization pattern for better performance
 * Combines multiple patterns into a single regex to reduce passes
 */
const MALICIOUS_PATTERNS = [
  // Script tags - handles both opening and closing tags in one pass
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,

  // Event handlers (on* attributes) - all at once
  // Matches: onclick="...", onclick='...', onclick=... (without quotes)
  /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,

  // Dangerous URL protocols - combined pattern
  /(?<!\()\s*(?:javascript|data\s*:\s*(?:text\/html|application\/javascript)|vbscript|file)\s*:[^'"\s)]*/gi,
]

/**
 * Safe HTML entities that should be preserved
 */
const _SAFE_ENTITIES = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#x27;': '\'',
  '&#x2F;': '/',
  '&#60;': '<',
  '&#62;': '>',
  '&#38;': '&',
}

/**
 * Output Sanitizer Class
 *
 * Provides methods to sanitize various types of output content
 * All methods check SANITIZATION_ENABLED flag before processing
 */
export class Sanitizer {
  /**
   * Sanitize HTML content while preserving safe elements
   */
  static sanitizeHtml(content: string, config: keyof typeof SANITIZER_CONFIGS = 'strict'): string {
    if (!isSanitizationEnabled()) {
      return content
    }
    const sanitized = sanitize(content, SANITIZER_CONFIGS[config])
    return sanitized
  }

  /**
   * Sanitize markdown content by treating it as text but preserving markdown syntax
   * Optimized for better performance with large content
   */
  static sanitizeMarkdown(content: string): string {
    if (!isSanitizationEnabled()) {
      return content
    }

    // First remove obvious malicious patterns
    let sanitized = content

    // Apply all malicious patterns in a single loop (reduced from 6 to 3 patterns)
    for (const pattern of MALICIOUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '')
    }

    // Special handling for markdown links - protect them from HTML escaping
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
    const links: Array<{ text: string, url: string, full: string }> = []

    // Extract and protect markdown links
    sanitized = sanitized.replace(linkRegex, (match, text, url) => {
      // Sanitize the URL to remove dangerous protocols
      const sanitizedUrl = this.sanitizeUrl(url)
      const linkId = `__MARKDOWN_LINK_${links.length}__`
      links.push({ text, url: sanitizedUrl, full: match })
      return linkId
    })

    // Escape HTML in markdown but preserve safe entities
    sanitized = this.escapeHtmlButPreserveSafeEntities(sanitized)

    // Restore markdown links - use replaceAll for better performance with unique placeholders
    links.forEach((link, index) => {
      const placeholder = `__MARKDOWN_LINK_${index}__`
      sanitized = sanitized.replaceAll(placeholder, `[${link.text}](${link.url})`)
    })

    return sanitized
  }

  /**
   * Sanitize plain text content
   */
  static sanitizeText(content: string): string {
    if (!isSanitizationEnabled()) {
      return content
    }
    return sanitize(content, SANITIZER_CONFIGS.text)
  }

  /**
   * Sanitize URL values
   */
  static sanitizeUrl(url: string): string {
    if (!isSanitizationEnabled()) {
      return url
    }

    // Allow only safe protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']
    const protocol = `${url.toLowerCase().split(':')[0]}:`

    if (!allowedProtocols.includes(protocol)) {
      return '#'
    }

    return url
  }

  /**
   * Sanitize error messages to prevent reflection attacks
   * Optimized with improved pattern matching
   */
  static sanitizeError(error: Error | string): string {
    if (!isSanitizationEnabled()) {
      return error instanceof Error ? error.message : error
    }

    const errorMessage = error instanceof Error ? error.message : error

    // Remove any potential HTML/script tags using optimized patterns
    let sanitized = errorMessage

    for (const pattern of MALICIOUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '')
    }

    // Escape HTML entities
    sanitized = this.escapeHtmlButPreserveSafeEntities(sanitized)

    return sanitized
  }

  /**
   * Sanitize project descriptions and metadata
   */
  static sanitizeMetadata(content: string): string {
    if (!isSanitizationEnabled()) {
      return content
    }
    return this.sanitizeHtml(content, 'strict')
  }

  /**
   * Sanitize CR content based on the mode
   */
  static sanitizeCRContent(content: string, mode: 'full' | 'attributes' | 'metadata'): string {
    if (!isSanitizationEnabled()) {
      return content
    }

    switch (mode) {
      case 'full':
        // Full CR content - sanitize as markdown
        return this.sanitizeMarkdown(content)

      case 'attributes':
        // YAML attributes - escape to prevent injection
        return this.escapeHtmlButPreserveSafeEntities(content)

      case 'metadata':
        // Simple metadata - strict HTML sanitization
        return this.sanitizeHtml(content, 'text')

      default:
        return this.sanitizeMarkdown(content)
    }
  }

  /**
   * Escape HTML entities but preserve already-escaped ones
   * Optimized to use fewer replace operations
   */
  private static escapeHtmlButPreserveSafeEntities(content: string): string {
    // First, protect already-escaped HTML entities by replacing them with placeholders
    const entities: { [key: string]: string } = {}
    let protectedContent = content.replace(/&[a-z#]+;/gi, (match) => {
      const placeholder = `__HTML_ENTITY_${Object.keys(entities).length}__`
      entities[placeholder] = match
      return placeholder
    })

    // Then escape HTML special characters
    protectedContent = protectedContent.replace(/[&<>"'/]/g, (match) => {
      switch (match) {
        case '&':
          return '&amp;'
        case '<':
          return '&lt;'
        case '>':
          return '&gt;'
        case '"':
          return '&quot;'
        case '\'':
          return '&#x27;'
        case '/':
          return '&#x2F;'
        default:
          return match
      }
    })

    // Finally, restore the original HTML entities
    for (const [placeholder, entity] of Object.entries(entities)) {
      protectedContent = protectedContent.replace(placeholder, entity)
    }

    return protectedContent
  }

  /**
   * Sanitize any content by auto-detecting its type
   */
  static sanitize(content: unknown): string {
    if (!isSanitizationEnabled()) {
      return typeof content !== 'string' ? String(content) : content
    }

    let strContent: string
    if (typeof content !== 'string') {
      strContent = String(content)
    }
    else {
      strContent = content
    }

    // Auto-detect content type based on patterns
    if (strContent.includes('<') && strContent.includes('>')) {
      // Contains HTML tags
      return this.sanitizeHtml(strContent)
    }

    if (strContent.includes('```') || strContent.includes('#') || strContent.includes('*')) {
      // Likely markdown
      return this.sanitizeMarkdown(strContent)
    }

    // Default to text sanitization
    return this.sanitizeText(strContent)
  }

  /**
   * Check if content contains potentially malicious patterns
   * This method works regardless of SANITIZATION_ENABLED flag
   */
  static isSuspicious(content: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:\s*(?:text\/html|application\/javascript)/i,
      /vbscript:/i,
      /expression\s*\(/i,
      /@import/i,
    ]

    return suspiciousPatterns.some(pattern => pattern.test(content))
  }

  /**
   * Strip all HTML tags (convert to plain text)
   */
  static stripHtml(content: string): string {
    if (!isSanitizationEnabled()) {
      return content
    }
    return sanitize(content, {
      allowedTags: [],
      allowedAttributes: {},
      textFilter: undefined,
    })
  }
}
