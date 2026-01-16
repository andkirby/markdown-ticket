/**
 * PathResolver - Section path resolution service
 *
 * Consolidates path resolution logic from:
 * - SectionResolver (section finding and uniqueness validation)
 * - SimpleSectionValidator (path validation and normalization)
 */

import type { MarkdownSectionService, SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js'
import { ToolError } from '../../utils/toolError.js'

export interface PathResolutionResult {
  match: SectionMatch
  normalizedPath: string
}

export interface ValidationResult {
  valid: boolean
  normalized?: string
  errors: string[]
  suggestions: string[]
}

/**
 * PathResolver handles all section path resolution operations
 * including validation, normalization, and matching
 */
export class PathResolver {
  constructor(private markdownSectionService: typeof MarkdownSectionService) {}

  /**
   * Resolve a section path to a single matching section
   */
  resolve(document: string, path: string, key?: string): PathResolutionResult {
    const normalized = this.validatePath(path)
    const matches = this.markdownSectionService.findSection(document, normalized)
    const uniqueMatch = this.validateUnique(matches, normalized, key)

    return {
      match: uniqueMatch,
      normalizedPath: normalized,
    }
  }

  /**
   * Resolve all sections in document
   */
  resolveAll(document: string): SectionMatch[] {
    return this.markdownSectionService.findSection(document, '')
  }

  /**
   * Validate and normalize a section path
   * Throws ToolError if path is invalid
   */
  validatePath(path: string, availableSections?: string[]): string {
    const result = this.validate(path, availableSections)

    if (!result.valid) {
      const errorMsg = result.errors.join('\n')
      const suggestions = result.suggestions.length > 0
        ? `\n${result.suggestions.join('\n')}`
        : ''
      throw ToolError.toolExecution(`${errorMsg}${suggestions}`)
    }

    return result.normalized || path
  }

  /**
   * Validate path against available sections
   * Supports both user-friendly format ("1. Description") and exact format ("## 1. Description")
   */
  validate(path: string, availableSections: string[] = []): ValidationResult {
    const normalized = this.normalizePath(path)

    // Early return for empty paths
    if (!normalized) {
      return {
        valid: false,
        errors: ['Section identifier cannot be empty'],
        suggestions: [],
      }
    }

    // Validate against available sections if provided
    if (availableSections.length > 0) {
      return this.validateAgainstAvailable(normalized, availableSections)
    }

    // Validate format only (no available sections to check against)
    return this.validateFormat(normalized)
  }

  /**
   * Fallback resolution for ambiguous paths
   * TODO: Implement heuristic matching and context-aware resolution
   */
  fallbackResolution(_document: string, _path: string): SectionMatch | null {
    return null
  }

  private validateAgainstAvailable(path: string, availableSections: string[]): ValidationResult {
    const exactMatches = this.findExactMatches(availableSections, path)

    if (exactMatches.length === 0) {
      return this.createNotFoundResult(path, availableSections)
    }

    if (exactMatches.length > 1) {
      return this.createMultipleMatchesResult(path, exactMatches)
    }

    return {
      valid: true,
      normalized: exactMatches[0],
      errors: [],
      suggestions: [],
    }
  }

  private findExactMatches(sections: string[], normalizedInput: string): string[] {
    return sections.filter((section) => {
      const normalizedSection = this.normalizeForMatching(section)
      return normalizedSection === normalizedInput
    })
  }

  private createNotFoundResult(
    path: string,
    availableSections: string[],
  ): ValidationResult {
    const errors = [`Section "${path}" not found`]
    const suggestions = this.buildNotFoundSuggestions(availableSections, path)

    return { valid: false, errors, suggestions }
  }

  private buildNotFoundSuggestions(availableSections: string[], path: string): string[] {
    const partialMatches = this.findPartialMatches(availableSections, path)

    if (partialMatches.length > 0) {
      return [
        'Did you mean one of:',
        ...partialMatches.slice(0, 5).map(s => `  "${s}"`),
      ]
    }

    if (availableSections.length <= 10) {
      return ['Available sections:', ...availableSections.map(s => `  "${s}"`)]
    }

    return [
      `Use manage_cr_sections with operation="list" to see all ${availableSections.length} available sections`,
    ]
  }

  private findPartialMatches(sections: string[], normalizedInput: string): string[] {
    return sections.filter((section) => {
      const normalizedSection = this.normalizeForMatching(section)
      return (
        normalizedSection.includes(normalizedInput)
        || normalizedInput.includes(normalizedSection)
      )
    })
  }

  private createMultipleMatchesResult(path: string, exactMatches: string[]): ValidationResult {
    return {
      valid: false,
      errors: [
        `Multiple sections match "${path}". Please use a hierarchical path or the exact heading format.`,
      ],
      suggestions: ['Matching sections:', ...exactMatches.map(s => `  "${s}"`)],
    }
  }

  private validateFormat(path: string): ValidationResult {
    // Check hierarchical path depth
    if (path.includes(' / ')) {
      const parts = path.split(' / ')
      if (parts.length > 2) {
        return {
          valid: false,
          errors: ['Section path too deep - maximum 2 levels: "Parent / Child"'],
          suggestions: ['Use simpler section name or flatten document structure'],
        }
      }
    }

    return {
      valid: true,
      normalized: path,
      errors: [],
      suggestions: [],
    }
  }

  private validateUnique(matches: SectionMatch[], path: string, key?: string): SectionMatch {
    if (matches.length === 0) {
      const keyMsg = key ? ` in CR ${key}` : ''
      throw ToolError.toolExecution(`Section '${path}' not found${keyMsg}.`)
    }

    if (matches.length > 1) {
      const paths = matches.map(m => m.hierarchicalPath).join('\n  - ')
      throw ToolError.toolExecution(
        `Multiple sections match '${path}'. Please use hierarchical path:\n  - ${paths}`,
      )
    }

    return matches[0]
  }

  private normalizePath(path: string): string {
    return path.trim()
  }

  private normalizeForMatching(text: string): string {
    return text
      .replace(/^#+\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .trim()
      .toLowerCase()
  }
}
