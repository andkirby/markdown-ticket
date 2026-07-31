/**
 * MDT-135, MDT-187: RelationshipBadge Component
 *
 * Displays relationship badges for related, depends, and blocks links.
 * Uses data attributes for color mapping (see badge.css).
 *
 * MDT-187 additions:
 * - Elide same-project prefixes to bare numbers. Global (all surfaces) when
 *   `ELIDE_EVERYWHERE` is on; otherwise gated by `displayMode="compact"`.
 * - Inline separator is configurable (`RELATIONSHIP_LINK_SEPARATOR`).
 * - Collapse long lists behind a +N popover when above `INLINE_MAX`.
 * - Per-link `title` carries the full CR key even when elided.
 * - Click isolation: inline links and the +N trigger stop propagation so
 *   the parent card's viewer-open onClick does not double-fire.
 *
 * Obligations: OBL-relationship-badges
 * Coverage: BR-8
 */

import type { LucideIcon } from 'lucide-react'
import type { ElidedLink } from './relationshipLink'
import type { RelationshipVariant } from './types'
import { CornerDownRight, CornerLeftUp, Link as LinkIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ELIDE_EVERYWHERE,
  RELATIONSHIP_LINK_SEPARATOR,
} from '../../config/relationshipBadge'
import { cn } from '../../lib/utils'
import { classifyLink } from '../../utils/linkProcessor'
import SmartLink from '../SmartLink'
import { Badge } from '../ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { elideLinks } from './relationshipLink'

export interface RelationshipBadgeProps {
  /** Badge variant type */
  variant: RelationshipVariant
  /** Array of ticket codes to display */
  links: string[]
  /**
   * 'compact' elides same-project prefixes and collapses long lists behind a
   * +N popover. 'full' renders full codes. When `ELIDE_EVERYWHERE` is on
   * (the default), both modes elide; the prop is kept for callers and for
   * a future per-surface settings override.
   */
  displayMode?: 'compact' | 'full'
  /** Additional CSS classes */
  className?: string
}

/** Max links rendered inline before the rest collapse into a +N trigger. */
export const INLINE_MAX = 3

/**
 * Icon mapping for relationship types
 */
const RELATIONSHIP_ICONS: Record<RelationshipVariant, LucideIcon> = {
  related: LinkIcon,
  depends: CornerDownRight,
  blocks: CornerLeftUp,
}

/**
 * Renders a relationship badge with appropriate styling.
 *
 * @example
 * <RelationshipBadge variant="related" links={['MDT-100', 'MDT-101']} />
 * <RelationshipBadge variant="depends" links={['MDT-050']} />
 * <RelationshipBadge variant="blocks" links={['MDT-200']} displayMode="compact" />
 */
export function RelationshipBadge({
  variant,
  links,
  displayMode = 'full',
  className,
}: RelationshipBadgeProps) {
  const { projectCode } = useParams<{ projectCode: string }>()
  const currentProject = projectCode || ''
  const Icon = RELATIONSHIP_ICONS[variant]
  const [overflowOpen, setOverflowOpen] = useState(false)

  // Elide when configured globally, or when this surface explicitly opts in.
  const isCompact = ELIDE_EVERYWHERE || displayMode === 'compact'
  const hasOverflow = isCompact && links.length > INLINE_MAX

  const elided = useMemo<ElidedLink[]>(
    () =>
      isCompact
        ? elideLinks(links, currentProject)
        : links.map(link => ({
            fullKey: link,
            display: link,
            isSameProject: false,
          })),
    [links, currentProject, isCompact],
  )

  const inlineItems = hasOverflow ? elided.slice(0, INLINE_MAX) : elided
  const overflowItems = hasOverflow ? elided.slice(INLINE_MAX) : []

  // Badge-level title: all full keys, for quick hover scan without opening the popover.
  const badgeTitle = links.join(', ')

  const showSeparator = RELATIONSHIP_LINK_SEPARATOR.length > 0

  return (
    <Badge
      variant="outline"
      className={cn('badge', className)}
      data-relationship={variant}
      title={badgeTitle}
    >
      <Icon className="mr-1 h-3 w-3 flex-shrink-0" aria-hidden="true" />
      {inlineItems.map((item, index) => (
        <span
          key={item.fullKey}
          // Stop the card's viewer-open onClick from firing on link navigation.
          onClick={(e) => {
            e.stopPropagation()
          }}
          title={item.fullKey}
        >
          <SmartLink
            link={classifyLink(item.fullKey, currentProject)}
            currentProject={currentProject}
            showIcon={false}
            className="hover:underline"
          >
            {item.display}
          </SmartLink>
          {showSeparator && index < inlineItems.length - 1 && (
            <span>{RELATIONSHIP_LINK_SEPARATOR}</span>
          )}
        </span>
      ))}
      {hasOverflow && overflowItems.length > 0 && (
        <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'relationship-badge__overflow',
                'ml-1 inline-flex items-center rounded px-1 leading-none',
                'text-xs font-medium opacity-80 hover:opacity-100 hover:underline',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-haspopup="dialog"
              aria-expanded={overflowOpen}
              // Stop the card's viewer-open onClick from firing when opening the popover.
              onClick={(e) => {
                e.stopPropagation()
              }}
              title={`+${overflowItems.length} more: ${overflowItems.map(o => o.fullKey).join(', ')}`}
            >
              +
              {overflowItems.length}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto min-w-[8rem] p-2"
            onOpenAutoFocus={(e) => {
              // Move focus to the first popover link instead of the content container.
              e.preventDefault()
              const firstLink = document.getElementById(
                popoverLinkId(variant, overflowItems[0]?.fullKey),
              )
              firstLink?.focus()
            }}
          >
            <div className="flex flex-col gap-1">
              {overflowItems.map(item => (
                <span
                  key={item.fullKey}
                  id={popoverLinkId(variant, item.fullKey)}
                  // Close popover + stop card onClick on navigation.
                  onClick={(e) => {
                    e.stopPropagation()
                    setOverflowOpen(false)
                  }}
                  title={item.fullKey}
                >
                  <SmartLink
                    link={classifyLink(item.fullKey, currentProject)}
                    currentProject={currentProject}
                    showIcon={false}
                    className="inline-flex w-full items-center rounded px-1.5 py-1 text-xs hover:bg-accent hover:underline"
                  >
                    {item.fullKey}
                  </SmartLink>
                </span>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </Badge>
  )
}

/** Stable id for a popover link so focus can be moved on open. */
function popoverLinkId(
  variant: RelationshipVariant,
  fullKey: string | undefined,
): string {
  return fullKey ? `rel-${variant}-${fullKey}` : ''
}
