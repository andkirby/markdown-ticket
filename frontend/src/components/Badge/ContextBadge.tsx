/**
 * MDT-135, MDT-193, MDT-246: ContextBadge Component
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
 * MDT-246 additions:
 * - Split chip on detail surfaces (`detail` prop): one badge, two interactive
 *   zones — identity (passive Zap + key link to the epic ticket) and a
 *   trailing action zone jumping to the Epics board focused on that epic.
 *   Board cards keep the compact single-zone badge (scan surfaces, C-3);
 *   the Zap glyph never becomes a click target (INV-1).
 *
 * Obligations: OBL-context-badges
 * Coverage: BR-8
 */

import type { ContextVariant } from './types'
import { Rows3, Zap } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { buildEpicsFocusPath } from '../../routes'
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
  /**
   * MDT-246: render a linkable phase value as a split chip (identity zone +
   * board-jump action zone). Detail surfaces only (ticket viewer header,
   * ticket attributes panel); board cards omit it and keep the compact badge.
   */
  'detail'?: boolean
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
 * <ContextBadge variant="phase" value="MDT-012" detail /> // split chip (MDT-246)
 * <ContextBadge variant="assignee" value="john" />
 * <ContextBadge variant="worktree" worktreePath="/path/to/worktree" />
 */
export function ContextBadge({ variant, value, worktreePath, className, detail }: ContextBadgeProps) {
  const { projectCode } = useParams<{ projectCode: string }>()
  const navigate = useNavigate()
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

  // MDT-246 split chip: detail surfaces only, and only when the epic key and
  // project route are resolvable (classifyLink normalizes `MDT-012.md` etc.).
  const epicKey = isEpic ? parsedLink?.ticketKey : undefined
  const splitChip = detail === true && !!epicKey && currentProject !== ''

  // Identity zone — identical content in compact and split renderings; the
  // split chip only wraps it and appends the action zone.
  const identityZone = (
    <>
      {isEpic && <Zap className="badge__icon" aria-hidden="true" />}
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
                className="ticket-key"
                ariaLabel={splitChip ? `Open epic ${epicKey}` : undefined}
              >
                {displayValue}
              </SmartLink>
            </span>
          )
        : displayValue}
    </>
  )

  return (
    <Badge
      className={cn('badge', splitChip && 'badge--split', className)}
      data-context={contextType}
      title={title}
    >
      {splitChip
        ? (
            <>
              <span className="badge__id">{identityZone}</span>
              <button
                type="button"
                className="badge-action"
                aria-label={`Show ${epicKey} on Epics board`}
                title={`Show ${epicKey} on Epics board`}
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(buildEpicsFocusPath(currentProject, epicKey!))
                }}
                data-testid="epic-badge-action"
              >
                <Rows3 aria-hidden="true" size={12} />
              </button>
            </>
          )
        : identityZone}
    </Badge>
  )
}
