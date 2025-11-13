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
   * Supports both user-friendly format ("1. Description") and exact format ("## 1. Description")
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

    // Normalize section text for matching (remove # symbols, numbers, lowercase)
    const normalizeForMatching = (text: string): string => {
      return text
        .replace(/^#+\s*/, '') // Remove leading # characters
        .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
        .trim()
        .toLowerCase();
    };

    // Check if section exists in available sections
    if (availableSections.length > 0) {
      const normalizedInput = normalizeForMatching(normalized);

      // Find exact matches (comparing normalized forms)
      const exactMatches = availableSections.filter(s => {
        const normalizedSection = normalizeForMatching(s);
        return normalizedSection === normalizedInput;
      });

      if (exactMatches.length === 0) {
        // No exact match found - provide helpful error
        errors.push(`Section "${normalized}" not found`);

        // Try to find partial matches for suggestions
        const partialMatches = availableSections.filter(s => {
          const normalizedSection = normalizeForMatching(s);
          return normalizedSection.includes(normalizedInput) ||
                 normalizedInput.includes(normalizedSection);
        });

        if (partialMatches.length > 0) {
          suggestions.push('Did you mean one of:');
          suggestions.push(...partialMatches.slice(0, 5).map(s => `  "${s}"`));
        } else if (availableSections.length <= 10) {
          suggestions.push('Available sections:');
          suggestions.push(...availableSections.map(s => `  "${s}"`));
        } else {
          suggestions.push(`Use manage_cr_sections with operation="list" to see all ${availableSections.length} available sections`);
        }

        return { valid: false, errors, suggestions };
      }

      if (exactMatches.length > 1) {
        // Multiple matches found - require hierarchical path or more specific identifier
        errors.push(`Multiple sections match "${normalized}". Please use a hierarchical path or the exact heading format.`);
        suggestions.push('Matching sections:');
        suggestions.push(...exactMatches.map(s => `  "${s}"`));

        return { valid: false, errors, suggestions };
      }

      // Single exact match found - use it
      // Return the exact section text from the document (with # symbols)
      return {
        valid: true,
        normalized: exactMatches[0],
        errors: [],
        suggestions: []
      };
    }

    // No available sections provided - just validate format
    // Check for hierarchical path format
    if (normalized.includes(' / ')) {
      const parts = normalized.split(' / ');
      if (parts.length > 2) {
        errors.push('Section path too deep - maximum 2 levels: "Parent / Child"');
        suggestions.push('Use simpler section name or flatten document structure');
        return { valid: false, errors, suggestions };
      }
    }

    // Accept both formats: with or without # symbols
    return {
      valid: true,
      normalized,
      errors: [],
      suggestions: []
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