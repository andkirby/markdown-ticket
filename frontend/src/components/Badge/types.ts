/**
 * MDT-135: Badge Types
 *
 * Type definitions for badge variants.
 * These types align with @mdt/domain-contracts enums.
 */

import type { CRPriorityValue, CRStatusValue, CRTypeValue } from '@mdt/domain-contracts'

/**
 * Badge variant types for context badges
 */
export type ContextVariant = 'phase' | 'assignee' | 'worktree'

/**
 * Badge variant types for relationship badges
 */
export type RelationshipVariant = 'related' | 'depends' | 'blocks'

/**
 * Props for status badge variants
 */
export interface StatusVariantProps {
  status: CRStatusValue | string
}

/**
 * Props for priority badge variants
 */
export interface PriorityVariantProps {
  priority: CRPriorityValue | string
}

/**
 * Props for type badge variants
 */
export interface TypeVariantProps {
  type: CRTypeValue | string
}

/**
 * Props for context badge variants
 */
export interface ContextVariantProps {
  variant: ContextVariant
}

/**
 * Props for relationship badge variants
 */
export interface RelationshipVariantProps {
  variant: RelationshipVariant
}
