/**
 * MDT-135: Badge Module
 *
 * Centralized badge components for ticket attribute rendering.
 * This module owns ALL badge styling - no other component defines badge colors.
 *
 * Obligations: OBL-single-owner
 */

// Badge components
export { StatusBadge } from './StatusBadge'
export type { StatusBadgeProps } from './StatusBadge'

export { PriorityBadge } from './PriorityBadge'
export type { PriorityBadgeProps } from './PriorityBadge'

export { TypeBadge } from './TypeBadge'
export type { TypeBadgeProps } from './TypeBadge'

export { ContextBadge } from './ContextBadge'
export type { ContextBadgeProps } from './ContextBadge'

export { RelationshipBadge } from './RelationshipBadge'
export type { RelationshipBadgeProps } from './RelationshipBadge'

// Variant functions (for advanced use cases)
export {
  contextVariants,
  priorityVariants,
  relationshipVariants,
  statusVariants,
  typeVariants,
} from './badgeVariants'

// Types
export type {
  ContextVariant,
  ContextVariantProps,
  PriorityVariantProps,
  RelationshipVariant,
  RelationshipVariantProps,
  StatusVariantProps,
  TypeVariantProps,
} from './types'
