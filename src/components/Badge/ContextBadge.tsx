/**
 * MDT-135, MDT-193: ContextBadge Component
 *
 * Displays context badges for phase/epic, assignee, and worktree.
 * Uses data attributes for color mapping (see badge.css).
 *
 * MDT-193 additions:
 * - Phase variant: whole-string ticket keys in `value` render as SmartLinks,
 *   reusing the same classifyLink/SmartLink machinery as RelationshipBadge.
 *   Free-text values (including embedded refs in prose) fall back to plain
 *   text — the ticket regex anchors (^...$) bound this boundary.
 * - Click isolation: link navigation stops propagation so a parent card/row
 *   viewer-open onClick does not double-fire. Mirrors RelationshipBadge.
 * - Assignee and worktree variants are unchanged.
 *
 * Obligations: OBL-context-badges
 * Coverage: BR-8
 */

import type { ContextVariant } from './types'
import { Zap } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { classifyLink, LinkType } from '../../utils/linkProcessor'
import SmartLink from '../SmartLink'
import { Badge } from '../ui/badge'

export interface ContextBadgeProps {
  /** Badge variant type */
  'variant': ContextVariant
  /** Value to display (not required for worktree) */
  'value'?: string
  /** Worktree path for title attribute */
  'worktreePath'?: string
  /** Additional CSS classes */
  'className'?: string
  /** Test ID for testing */
  'data-testid'?: string
}

/**
 * Whole-string ticket link types that ContextBadge will render as links.
 * Any other classifyLink result falls back to plain text.
 */
const LINKABLE_TYPES: ReadonlySet<LinkType> = new Set([
  LinkType.TICKET,
  LinkType.CROSS_PROJECT,
])

/**
 * Renders a context badge with appropriate styling.
 *
 * For the phase variant, a whole-string ticket key (e.g. `MDT-012`,
 * `MDT-012.md`, `MDT-012#section`) is rendered as an in-app link; all
 * other values render as plain text.
 *
 * @example
 * <ContextBadge variant="phase" value="Phase 1" />
 * <ContextBadge variant="phase" value="MDT-012" />
 * <ContextBadge variant="assignee" value="john" />
 * <ContextBadge variant="worktree" worktreePath="/path/to/worktree" />
 */
export function ContextBadge({ variant, value, worktreePath, className }: ContextBadgeProps) {
  const { projectCode } = useParams<{ projectCode: string }>()
  const currentProject = projectCode || ''
  const displayValue = variant === 'worktree' ? 'worktree' : value
  const title = worktreePath || undefined

  // Phase variant only: classify the value and linkify whole-string ticket refs.
  const parsedLink
    = variant === 'phase' && value
      ? classifyLink(value, currentProject)
      : undefined
  const isLinkable
    = parsedLink !== undefined && LINKABLE_TYPES.has(parsedLink.type)

  // A whole-string ticket ref in the phase field is an EPIC — gold accent + Zap
  // icon distinguish it from a free-text phase label (data-context: epic vs phase).
  const isEpic = variant === 'phase' && isLinkable
  const contextType = variant === 'phase' ? (isLinkable ? 'epic' : 'phase') : variant

  return (
    <Badge
      variant="outline"
      className={cn('badge', className)}
      data-context={contextType}
      title={title}
    >
      {isEpic && <Zap className="h-3 w-3" aria-hidden="true" />}
      {isLinkable && parsedLink
        ? (
            // Stop the parent card's viewer-open onClick from firing on navigation.
            <span
              onClick={(e) => {
                e.stopPropagation()
              }}
              title={value}
            >
              <SmartLink
                link={parsedLink}
                currentProject={currentProject}
                showIcon={false}
                className="hover:underline"
              >
                {displayValue}
              </SmartLink>
            </span>
          )
        : displayValue}
    </Badge>
  )
}
