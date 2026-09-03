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
import type { SVGProps } from 'react'
import { Rocket } from 'lucide-react'
import { TYPE_ICON } from './typeIcons'
import { formatDataAttr } from './utils'

interface TypeIconProps {
  /** Type label, e.g. "Bug Fix" / "Architecture". */
  type?: string
  /** Sizing/spacing class — consumer-owned. */
  className?: string
  /**
   * Native hover tooltip (the human type label). Set by interactive-adjacent
   * consumers like the TicketCode key line; the badge skips it (its label is
   * adjacent). Stays non-interactive: a title attribute, never a Radix
   * trigger, so the glyph keeps no tab stop and no SR presence (C4).
   */
  title?: string
}

export function TypeIcon({ type, className, title }: TypeIconProps) {
  const key = type ? formatDataAttr(type) : ''
  const Icon: LucideIcon | null = key ? (TYPE_ICON[key] ?? Rocket) : null
  if (!Icon) {
    return null
  }
  // Native hover tooltip via an svg <title> child — the SVG-standard form
  // (lucide-react's props type predates the title attribute entirely).
  // Stays non-interactive and screen-reader-silent (aria-hidden wins).
  const svgProps: SVGProps<SVGSVGElement> = {
    className,
    'aria-hidden': true,
  }
  return (
    <Icon {...svgProps} data-type={key}>
      {title ? <title>{title}</title> : null}
    </Icon>
  )
}
