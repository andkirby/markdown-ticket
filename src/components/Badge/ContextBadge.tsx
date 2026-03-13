/**
 * MDT-135: ContextBadge Component
 *
 * Displays context badges for phase/epic, assignee, and worktree.
 * Uses data attributes for color mapping (see badge.css).
 *
 * Obligations: OBL-context-badges
 * Coverage: BR-8
 */

import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import type { ContextVariant } from './types'

export interface ContextBadgeProps {
  /** Badge variant type */
  variant: ContextVariant
  /** Value to display (not required for worktree) */
  value?: string
  /** Worktree path for title attribute */
  worktreePath?: string
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing */
  'data-testid'?: string
}

/**
 * Renders a context badge with appropriate styling.
 *
 * @example
 * <ContextBadge variant="phase" value="Phase 1" />
 * <ContextBadge variant="assignee" value="john" />
 * <ContextBadge variant="worktree" worktreePath="/path/to/worktree" />
 */
export function ContextBadge({ variant, value, worktreePath, className }: ContextBadgeProps) {
  const displayValue = variant === 'worktree' ? 'worktree' : value
  const title = worktreePath || undefined

  return (
    <Badge
      variant="outline"
      className={cn('badge', className)}
      data-context={variant}
      title={title}
    >
      {displayValue}
    </Badge>
  )
}
