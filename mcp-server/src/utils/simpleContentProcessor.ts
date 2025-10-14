/**
 * Simple content sanitization utilities for MCP operations
 *
 * Focuses on the core issue: converting escaped \n to actual newlines
 * without over-engineering or unnecessary complexity.
 */

export interface ContentOptions {
  operation: 'replace' | 'append' | 'prepend';
  maxLength?: number;
}

export interface ContentResult {
  content: string;
  modified: boolean;
  warnings: string[];
}

/**
 * Simple content processor that handles the core MDT-068 issue:
 * Converts literal \n sequences to actual newlines while preserving
 * legitimate content in code blocks and documentation.
 */
export class SimpleContentProcessor {
  private static readonly DEFAULT_MAX_LENGTH = 500_000; // 500KB

  /**
   * Process content by converting escaped newlines and trimming appropriately
   */
  static processContent(content: string, options: ContentOptions): ContentResult {
    const maxLength = options.maxLength || SimpleContentProcessor.DEFAULT_MAX_LENGTH;
    const warnings: string[] = [];

    // Basic length validation
    if (content.length > maxLength) {
      throw new Error(`Content too large: ${content.length} bytes (max: ${maxLength})`);
    }

    let processedContent = content;
    let modified = false;

    // Core fix: Convert \n\n to actual newlines
    // Handle double-escaped sequences: \\n -> \n
    if (processedContent.includes('\\\\n')) {
      processedContent = processedContent.replace(/\\\\n/g, '\n');
      modified = true;
      warnings.push('Converted double-escaped newlines (\\\\n) to actual newlines');
    }

    // Handle the specific MDT-067 corruption pattern: \n\n -> actual newlines
    // This is conservative - only fix the known corruption pattern
    // Leave single \n sequences alone as they might be legitimate documentation
    if (processedContent.includes('\\n\\n')) {
      const beforeLength = processedContent.length;
      processedContent = processedContent.replace(/\\n\\n/g, '\n\n');

      if (processedContent.length !== beforeLength) {
        modified = true;
        warnings.push('Fixed corrupted newline sequences (\\n\\n) to actual newlines');
      }
    }

    // Operation-aware whitespace trimming
    const trimmedContent = SimpleContentProcessor.trimWhitespace(processedContent, options.operation);
    if (trimmedContent !== processedContent) {
      processedContent = trimmedContent;
      modified = true;
    }

    // Basic integrity checks
    const integrityWarnings = SimpleContentProcessor.checkBasicIntegrity(processedContent);
    warnings.push(...integrityWarnings);

    return {
      content: processedContent,
      modified,
      warnings
    };
  }

  /**
   * Apply operation-aware whitespace trimming
   */
  private static trimWhitespace(content: string, operation: string): string {
    switch (operation) {
      case 'append':
        // Remove leading whitespace for append operations
        return content.trimStart();
      case 'prepend':
        // Remove trailing whitespace for prepend operations
        return content.trimEnd();
      case 'replace':
        // Trim both ends for replace operations
        return content.trim();
      default:
        return content;
    }
  }

  /**
   * Basic integrity checks without over-engineering
   */
  private static checkBasicIntegrity(content: string): string[] {
    const warnings: string[] = [];

    // Check for obviously malformed markdown
    if (content.includes('```') && (content.match(/```/g) || []).length % 2 !== 0) {
      warnings.push('Odd number of code block markers - possible unclosed code block');
    }

    // Check for suspicious HTML-like content (basic security)
    if (/<script[^>]*>/i.test(content)) {
      warnings.push('Contains script tags - please ensure content is safe');
    }

    // Check for very long lines that might indicate formatting issues
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 1000);
    if (longLines.length > 0) {
      warnings.push(`Found ${longLines.length} very long lines (>1000 chars)`);
    }

    return warnings;
  }
}