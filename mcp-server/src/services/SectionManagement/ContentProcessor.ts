/**
 * ContentProcessor - Content Processing Utilities for Section Operations
 *
 * Phase 2 Extraction: Extracted from utils/simpleContentProcessor.ts (124 lines)
 *
 * Responsibilities:
 * - Process content by converting escaped newlines and trimming appropriately
 * - Extract new header from replacement content
 * - Validate content size limits
 *
 * Anti-duplication:
 * - Imports from Sanitizer for HTML sanitization
 * - No copying of sanitization logic
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

export interface HeaderExtractionResult {
  newHeader: string;
  remainingContent: string;
  hasHeader: boolean;
}

/**
 * ContentProcessor - Handles content processing for section operations
 */
export class ContentProcessor {
  private static readonly DEFAULT_MAX_LENGTH = 500_000; // 500KB

  /**
   * Process content by converting escaped newlines and trimming appropriately
   * @param content - Raw content to process
   * @param options - Processing options
   * @returns Processed content with metadata
   * @throws Error if content size exceeds limits
   */
  static processContent(content: string, options: ContentOptions): ContentResult {
    const maxLength = options.maxLength || ContentProcessor.DEFAULT_MAX_LENGTH;
    const warnings: string[] = [];

    // Basic length validation
    ContentProcessor.validateContentSize(content, maxLength);

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
    const trimmedContent = ContentProcessor.trimWhitespace(processedContent, options.operation);
    if (trimmedContent !== processedContent) {
      processedContent = trimmedContent;
      modified = true;
    }

    // Basic integrity checks
    const integrityWarnings = ContentProcessor.checkBasicIntegrity(processedContent);
    warnings.push(...integrityWarnings);

    return {
      content: processedContent,
      modified,
      warnings
    };
  }

  /**
   * Extract new header from replacement content
   * Detects if content starts with a markdown header (##, ###, etc.)
   * @param content - Content to analyze
   * @returns Header extraction result with new header and remaining content
   */
  static extractNewHeader(content: string): HeaderExtractionResult {
    const trimmedContent = content.trim();
    const headerMatch = trimmedContent.match(/^(#{1,6})\s+(.+)$/m);

    if (headerMatch) {
      const newHeader = headerMatch[0].trim();
      const remainingContent = trimmedContent
        .substring(headerMatch[0].length)
        .trim();

      return {
        newHeader,
        remainingContent,
        hasHeader: true
      };
    }

    return {
      newHeader: '',
      remainingContent: trimmedContent,
      hasHeader: false
    };
  }

  /**
   * Validate content size against limits
   * @param content - Content to validate
   * @param maxLength - Maximum allowed length
   * @throws Error if content exceeds maximum length
   */
  static validateContentSize(content: string, maxLength: number = ContentProcessor.DEFAULT_MAX_LENGTH): void {
    if (content.length > maxLength) {
      throw new Error(`Content too large: ${content.length} bytes (max: ${maxLength})`);
    }
  }

  /**
   * Apply operation-aware whitespace trimming
   * @param content - Content to trim
   * @param operation - Operation type
   * @returns Trimmed content
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
   * @param content - Content to check
   * @returns Array of warning messages
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
