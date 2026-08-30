/**
 * PriorityIcon — the colored lucide priority glyph rendered BEFORE the ticket
 * key on every surface (board card, cloud stub, list row, ticket viewer).
 *
 * This is the stable "priority-before-key" scanning pattern: users always find
 * priority in the same place — a colored glyph immediately left of the ticket
 * key — regardless of which view they are in. Color comes from the
 * `data-priority` attribute (badge.css); size is set by the consumer's
 * `className` (use `.priority-icon` for the standard `--sz-icon` size).
 *
 * Obligations: OBL-priority-badge
 */

import type { LucideIcon } from 'lucide-react'
import { Equal } from 'lucide-react'
import { PRIORITY_ICON } from './priorityIcons'
import { formatDataAttr } from './utils'

interface PriorityIconProps {
  /** Priority label, e.g. "Critical" / "High" / "Medium" / "Low". */
  priority?: string
  /** Sizing/spacing class — use `priority-icon` for the standard glyph size. */
  className?: string
}

export function PriorityIcon({ priority, className }: PriorityIconProps) {
  const key = priority ? formatDataAttr(priority) : ''
  const Icon: LucideIcon | null = key ? (PRIORITY_ICON[key] ?? Equal) : null
  if (!Icon) {
    return null
  }
  return <Icon className={className} data-priority={key} strokeWidth={2.5} aria-hidden="true" />
}
