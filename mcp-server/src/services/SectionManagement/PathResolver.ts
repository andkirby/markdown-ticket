/**
 * PathResolver - Section path resolution service
 *
 * Consolidates path resolution logic from:
 * - SectionResolver (section finding and uniqueness validation)
 * - SimpleSectionValidator (path validation and normalization)
 *
 * Phase 4 (MDT-114 prep): Extract path resolution into dedicated service
 * - Hierarchical parsing stub (full implementation in MDT-114 feature work)
 * - Fallback resolution stub (full implementation in MDT-114 feature work)
 */

import { MarkdownSectionService, SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js';
import { ToolError } from '../../utils/toolError.js';

export interface PathResolutionResult {
  match: SectionMatch;
  normalizedPath: string;
}

export interface ValidationResult {
  valid: boolean;
  normalized?: string;
  errors: string[];
  suggestions: string[];
}

/**
 * PathResolver handles all section path resolution operations
 * including validation, normalization, and matching
 */
export class PathResolver {
  constructor(private markdownSectionService: typeof MarkdownSectionService) {}

  /**
   * Resolve a section path to a single matching section
   *
   * @param document - Full markdown document content
   * @param path - Section path to resolve (flexible format)
   * @param key - CR key for error messages (optional)
   * @returns Single matching section with normalized path
   * @throws ToolError if section not found or multiple matches
   */
  resolve(document: string, path: string, key?: string): PathResolutionResult {
    const normalized = this.validatePath(path);

    // Use MarkdownSectionService for section finding
    const matches = this.markdownSectionService.findSection(document, normalized);

    // Validate uniqueness
    const uniqueMatch = this.validateUnique(matches, normalized, key);

    return {
      match: uniqueMatch,
      normalizedPath: normalized
    };
  }

  /**
   * Resolve all sections in document
   *
   * @param document - Full markdown document content
   * @returns All sections in document
   */
  resolveAll(document: string): SectionMatch[] {
    return this.markdownSectionService.findSection(document, '');
  }

  /**
   * Validate and normalize a section path
   *
   * @param path - Section path to validate
   * @param availableSections - Optional list of available sections for validation
   * @returns Normalized path
   * @throws ToolError if path is invalid
   */
  validatePath(path: string, availableSections?: string[]): string {
    const result = this.validate(path, availableSections);

    if (!result.valid) {
      const errorMsg = result.errors.join('\n');
      const suggestions = result.suggestions.length > 0
        ? '\n' + result.suggestions.join('\n')
        : '';
      throw ToolError.toolExecution(`${errorMsg}${suggestions}`);
    }

    return result.normalized || path;
  }

  /**
   * Parse hierarchical path into components
   *
   * Phase 4 (prep): Stub implementation - full version in MDT-114 feature
   *
   * @param path - Hierarchical path (e.g., "Parent / Child")
   * @returns Array of path components
   */
  parseHierarchical(path: string): string[] {
    if (!path.includes(' / ')) {
      return [path];
    }

    // Stub: Basic split for now
    // Full implementation in MDT-114 feature will handle:
    // - Multi-level paths
    // - Path validation
    // - Path normalization
    return path.split(' / ').map(p => p.trim());
  }

  /**
   * Validate path against available sections
   *
   * Supports both user-friendly format ("1. Description") and exact format ("## 1. Description")
   *
   * @param path - Path to validate
   * @param availableSections - Optional list of available sections
   * @returns Validation result with normalization and suggestions
   */
  validate(path: string, availableSections: string[] = []): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Basic format validation
    if (!path || path.trim() === '') {
      errors.push('Section identifier cannot be empty');
      return { valid: false, errors, suggestions };
    }

    const normalized = this.normalizePath(path);

    // Check against available sections if provided
    if (availableSections.length > 0) {
      const normalizedInput = this.normalizeForMatching(normalized);

      // Find exact matches (comparing normalized forms)
      const exactMatches = availableSections.filter(s => {
        const normalizedSection = this.normalizeForMatching(s);
        return normalizedSection === normalizedInput;
      });

      if (exactMatches.length === 0) {
        errors.push(`Section "${normalized}" not found`);

        // Try to find partial matches for suggestions
        const partialMatches = availableSections.filter(s => {
          const normalizedSection = this.normalizeForMatching(s);
          return (
            normalizedSection.includes(normalizedInput) ||
            normalizedInput.includes(normalizedSection)
          );
        });

        if (partialMatches.length > 0) {
          suggestions.push('Did you mean one of:');
          suggestions.push(...partialMatches.slice(0, 5).map((s) => `  "${s}"`));
        } else if (availableSections.length <= 10) {
          suggestions.push('Available sections:');
          suggestions.push(...availableSections.map((s) => `  "${s}"`));
        } else {
          suggestions.push(
            `Use manage_cr_sections with operation="list" to see all ${availableSections.length} available sections`
          );
        }

        return { valid: false, errors, suggestions };
      }

      if (exactMatches.length > 1) {
        errors.push(
          `Multiple sections match "${normalized}". Please use a hierarchical path or the exact heading format.`
        );
        suggestions.push('Matching sections:');
        suggestions.push(...exactMatches.map((s) => `  "${s}"`));

        return { valid: false, errors, suggestions };
      }

      // Single exact match found
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
   * Find matching section(s) for a given path
   *
   * Uses MarkdownSectionService for actual section finding
   *
   * @param sections - All sections in document
   * @param path - Path to match
   * @returns Array of matching sections
   */
  findMatch(sections: SectionMatch[], path: string): SectionMatch[] {
    const normalized = this.normalizeForMatching(path);

    return sections.filter((section) => {
      const normalizedHeader = this.normalizeForMatching(section.headerText);
      return normalizedHeader.includes(normalized);
    });
  }

  /**
   * Fallback resolution for ambiguous paths
   *
   * Phase 4 (prep): Stub implementation - full version in MDT-114 feature
   * Will implement:
   * - Heuristic matching
   * - Context-aware resolution
   * - User prompts for disambiguation
   *
   * @param document - Full markdown document content
   * @param path - Ambiguous path
   * @returns Best-guess section match or null
   */
  fallbackResolution(document: string, path: string): SectionMatch | null {
    // Stub: Return null for now
    // Full implementation in MDT-114 feature
    return null;
  }

  /**
   * Validate that section resolution is unique
   *
   * @param matches - Array of matching sections
   * @param path - Original path for error messages
   * @param key - CR key for error messages (optional)
   * @returns Single matching section
   * @throws ToolError if 0 matches or 2+ matches
   */
  private validateUnique(matches: SectionMatch[], path: string, key?: string): SectionMatch {
    if (matches.length === 0) {
      const keyMsg = key ? ` in CR ${key}` : '';
      throw ToolError.toolExecution(`Section '${path}' not found${keyMsg}.`);
    }

    if (matches.length > 1) {
      const paths = matches.map((m) => m.hierarchicalPath).join('\n  - ');
      throw ToolError.toolExecution(
        `Multiple sections match '${path}'. Please use hierarchical path:\n  - ${paths}`
      );
    }

    return matches[0];
  }

  /**
   * Normalize section path for display/storage
   * Removes extra whitespace but preserves format
   */
  private normalizePath(path: string): string {
    return path.trim();
  }

  /**
   * Normalize path for matching (case-insensitive, removes prefixes)
   * Removes markdown prefix (###), numbers, and lowercases
   */
  private normalizeForMatching(text: string): string {
    return text
      .replace(/^#+\s*/, '') // Remove leading # characters
      .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
      .trim()
      .toLowerCase();
  }
}
