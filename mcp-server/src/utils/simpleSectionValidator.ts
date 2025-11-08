/**
 * Simple section validation utilities for MCP operations
 *
 * Provides basic validation without over-engineering or complex algorithms.
 */

export interface ValidationResult {
  valid: boolean;
  normalized?: string;
  errors: string[];
  suggestions: string[];
}

/**
 * Simple section validator that provides basic validation and helpful error messages
 */
export class SimpleSectionValidator {
  /**
   * Validate a section identifier and provide helpful feedback
   */
  static validateSection(section: string, availableSections: string[] = []): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Basic format validation
    if (!section || section.trim() === '') {
      errors.push('Section identifier cannot be empty');
      return { valid: false, errors, suggestions };
    }

    const normalized = section.trim();

    // Check if it looks like a markdown header
    if (!normalized.startsWith('#')) {
      errors.push('Section identifier should start with # (markdown header)');
      suggestions.push(`Try adding header markers: "## ${normalized}"`);
    } else {
      // Validate header format
      if (!/^#+\s+.+$/.test(normalized)) {
        errors.push('Header format should be: "# + space + title"');
        suggestions.push(`Add space after #: "${normalized.replace(/^(#+)/, '$1 ')}"`);
      }
    }

    // Check if section exists in available sections
    if (availableSections.length > 0) {
      const exactMatch = availableSections.find(s => s === normalized);
      const partialMatches = availableSections.filter(s =>
        s.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(s.toLowerCase())
      );

      if (!exactMatch) {
        if (partialMatches.length > 0) {
          errors.push(`Section "${normalized}" not found. Did you mean one of:`);
          suggestions.push(...partialMatches.slice(0, 3).map(s => `  - "${s}"`));
        } else {
          errors.push(`Section "${normalized}" not found`);
          if (availableSections.length <= 10) {
            suggestions.push('Available sections:');
            suggestions.push(...availableSections.map(s => `  - "${s}"`));
          } else {
            suggestions.push(`Use list_cr_sections to see all ${availableSections.length} available sections`);
          }
        }
      }
    }

    // Check for hierarchical path format
    if (normalized.includes(' / ')) {
      const parts = normalized.split(' / ');
      if (parts.length > 2) {
        errors.push('Section path too deep - maximum format: "Document / Section"');
        suggestions.push('Use simpler section name or flatten document structure');
      }
    }

    return {
      valid: errors.length === 0,
      normalized,
      errors,
      suggestions
    };
  }

  /**
   * Create a simple list of available sections from markdown content
   */
  static extractSections(markdownBody: string): string[] {
    const sections: string[] = [];
    const lines = markdownBody.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        // Simple header detection
        sections.push(trimmed);
      }
    }

    return sections;
  }
}