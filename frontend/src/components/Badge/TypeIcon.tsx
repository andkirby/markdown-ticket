/**
 * TypeIcon — the lucide glyph per ticket type (map in typeIcons.ts).
 *
 * Color is contextual, never set here: the glyph inherits `currentColor`, so
 * inside a `.badge[data-type]` badge.css already applies the per-type
 * `--type-*` color; standalone consumers can target the `data-type` attribute.
 * Size is set by the consumer's `className` (`.badge__icon` inside a badge,
 * `--sz-icon` beside the ticket key).
 */

import type { LucideIcon } from 'lucide-react'
import { Rocket } from 'lucide-react'
import { TYPE_ICON } from './typeIcons'
import { formatDataAttr } from './utils'

interface TypeIconProps {
  /** Type label, e.g. "Bug Fix" / "Architecture". */
  type?: string
  /** Sizing/spacing class — consumer-owned. */
  className?: string
}

export function TypeIcon({ type, className }: TypeIconProps) {
  const key = type ? formatDataAttr(type) : ''
  const Icon: LucideIcon | null = key ? (TYPE_ICON[key] ?? Rocket) : null
  if (!Icon) {
    return null
  }
  return <Icon className={className} data-type={key} aria-hidden="true" />
}
