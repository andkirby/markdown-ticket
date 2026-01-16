/**
 * Shared types for Section Management Service
 *
 * Domain-specific types for section operations.
 * Re-exports common types from @mdt/shared where available.
 */

// Re-export shared types
export type { SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js'

/** Hierarchical path representation for MDT-114 feature (Format: "# H1 / ## H2 / ### H3") */
interface _HierarchicalPath {
  parts: string[]
  level: number
  fullPath: string
}

/** Validation result for section operations */
interface _ValidationResult {
  valid: boolean
  normalized?: string
  errors: string[]
  suggestions: string[]
}

/** Section management operations */
export type Operation = 'list' | 'get' | 'replace' | 'append' | 'prepend'
