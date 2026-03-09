/**
 * MDT-135: Badge Variants
 *
 * Centralized color mappings for ALL badge types.
 * This is the SINGLE SOURCE OF TRUTH for badge styling.
 *
 * Obligations: OBL-color-source
 * Coverage: BR-2, BR-6, BR-7, C3, C5
 */

import { cva } from 'class-variance-authority'
import type {
  ContextVariantProps,
  PriorityVariantProps,
  RelationshipVariantProps,
  StatusVariantProps,
  TypeVariantProps,
} from './types'

/**
 * Base badge classes shared by all badges
 * Note: rounded-* is handled by Badge component (rounded-full)
 */
const baseBadgeClasses = 'inline-flex items-center px-2 py-1 text-xs font-medium'

/**
 * Valid status values for type checking
 */
const VALID_STATUSES = [
  'Proposed',
  'Approved',
  'In Progress',
  'Implemented',
  'Rejected',
  'On Hold',
  'Partially Implemented',
  'Superseded',
  'Deprecated',
  'Duplicate',
] as const

/**
 * Valid priority values for type checking
 */
const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const

/**
 * Valid type values for type checking
 */
const VALID_TYPES = [
  'Feature Enhancement',
  'Bug Fix',
  'Architecture',
  'Technical Debt',
  'Documentation',
  'Research',
] as const

/**
 * Status badge variants (internal)
 * Uses solid colors with consistent 950 shade for dark mode
 */
const _statusVariants = cva(baseBadgeClasses, {
  variants: {
    status: {
      Proposed: 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200',
      Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
      Implemented: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      Rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
      'On Hold': 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
      'Partially Implemented': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
      Superseded: 'bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200',
      Deprecated: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200',
      Duplicate: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200',
    },
  },
  defaultVariants: {
    status: 'Proposed',
  },
})

/**
 * Status badge variants with fallback handling
 * Unknown status values fall back to gray (Proposed styling)
 *
 * Color decisions (from architecture.md):
 * - Proposed: gray (neutral/pending state)
 * - Implemented: green (completed state)
 */
export function statusVariants(props: StatusVariantProps): string {
  const isValidStatus = VALID_STATUSES.includes(props.status as typeof VALID_STATUSES[number])
  const status = (isValidStatus ? props.status : 'Proposed') as typeof VALID_STATUSES[number]
  return _statusVariants({ status })
}

/**
 * Priority badge variants (internal)
 * Uses gradient styling for visual distinction
 */
const _priorityVariants = cva(baseBadgeClasses, {
  variants: {
    priority: {
      Critical: 'bg-gradient-to-r from-rose-200 to-rose-300 text-rose-900 dark:from-rose-900 dark:to-rose-800 dark:text-rose-100',
      High: 'bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 dark:from-rose-950 dark:to-rose-900 dark:text-rose-200',
      Medium: 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 dark:from-amber-950 dark:to-amber-900 dark:text-amber-200',
      Low: 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-200',
    },
  },
  defaultVariants: {
    priority: 'Medium',
  },
})

/**
 * Priority badge variants with fallback handling
 * Unknown priority values fall back to Medium
 */
export function priorityVariants(props: PriorityVariantProps): string {
  const isValidPriority = VALID_PRIORITIES.includes(props.priority as typeof VALID_PRIORITIES[number])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priority = (isValidPriority ? props.priority : 'Medium') as any
  return _priorityVariants({ priority })
}

/**
 * Type badge variants (internal)
 * Uses gradient styling for visual distinction
 */
const _typeVariants = cva(baseBadgeClasses, {
  variants: {
    type: {
      'Feature Enhancement': 'bg-gradient-to-r from-blue-50 to-indigo-100 text-blue-800 dark:from-blue-950 dark:to-indigo-900 dark:text-blue-200',
      'Bug Fix': 'bg-gradient-to-r from-orange-50 to-amber-100 text-orange-800 dark:from-orange-950 dark:to-amber-900 dark:text-orange-200',
      Architecture: 'bg-gradient-to-r from-purple-50 to-violet-100 text-purple-800 dark:from-purple-950 dark:to-violet-900 dark:text-purple-200',
      'Technical Debt': 'bg-gradient-to-r from-slate-50 to-gray-100 text-slate-800 dark:from-slate-950 dark:to-gray-900 dark:text-slate-200',
      Documentation: 'bg-gradient-to-r from-cyan-50 to-teal-100 text-cyan-800 dark:from-cyan-950 dark:to-teal-900 dark:text-cyan-200',
      Research: 'bg-gradient-to-r from-pink-50 to-rose-100 text-pink-800 dark:from-pink-950 dark:to-rose-900 dark:text-pink-200',
    },
  },
  defaultVariants: {
    type: 'Feature Enhancement',
  },
})

/**
 * Type badge variants with fallback handling
 * Unknown type values fall back to Feature Enhancement
 */
export function typeVariants(props: TypeVariantProps): string {
  const isValidType = VALID_TYPES.includes(props.type as typeof VALID_TYPES[number])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const type = (isValidType ? props.type : 'Feature Enhancement') as any
  return _typeVariants({ type })
}

/**
 * Context badge variants (phase/epic, assignee, worktree)
 * Uses solid colors
 */
export const contextVariants = cva(baseBadgeClasses, {
  variants: {
    variant: {
      phase: 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200',
      assignee: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
      worktree: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    },
  },
  defaultVariants: {
    variant: 'phase',
  },
})

/**
 * Relationship badge variants (related, depends, blocks)
 * Uses solid colors
 */
export const relationshipVariants = cva(baseBadgeClasses, {
  variants: {
    variant: {
      related: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
      depends: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
      blocks: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    },
  },
  defaultVariants: {
    variant: 'related',
  },
})

// Export types for convenience
export type {
  ContextVariantProps,
  PriorityVariantProps,
  RelationshipVariantProps,
  StatusVariantProps,
  TypeVariantProps,
}
