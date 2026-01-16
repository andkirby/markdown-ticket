/**
 * Shared types for Section Management Service
 *
 * Domain-specific types for section operations.
 * Re-exports common types from @mdt/shared where available.
 */

// Re-export shared types
export type { SectionMatch } from '@mdt/shared/services/MarkdownSectionService.js'

/** Section management operations */
export type Operation = 'list' | 'get' | 'replace' | 'append' | 'prepend'
