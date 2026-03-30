/**
 * MDT-135: Badge Module
 *
 * Centralized badge components for ticket attribute rendering.
 * This module owns ALL badge styling - no other component defines badge colors.
 * Uses data attributes for color mapping (see badge.css).
 *
 * Obligations: OBL-single-owner
 */

export { ContextBadge } from './ContextBadge'
export type { ContextBadgeProps } from './ContextBadge'

export { PriorityBadge } from './PriorityBadge'
export type { PriorityBadgeProps } from './PriorityBadge'

export { RelationshipBadge } from './RelationshipBadge'
export type { RelationshipBadgeProps } from './RelationshipBadge'

// Badge components
export { StatusBadge } from './StatusBadge'
export type { StatusBadgeProps } from './StatusBadge'

export { TypeBadge } from './TypeBadge'
export type { TypeBadgeProps } from './TypeBadge'

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
