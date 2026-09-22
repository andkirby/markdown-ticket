/**
 * StatusIcon — the glyph per ticket status (map in statusIcons.ts, shapes in
 * statusGlyphs.tsx).
 *
 * Color is contextual, never set here: the glyph inherits `currentColor`, so
 * inside a `.badge[data-status]` badge.css already applies the per-status
 * `--status-*` color; standalone consumers (the ticket-key strip) target the
 * `data-status` attribute with their own token mapping. Size is set by the
 * consumer's `className` (`.badge__icon` inside a badge, the `--sz-icon` slot
 * beside the ticket key) — the TypeIcon.tsx contract (MDT-244), applied to
 * status.
 */

import type { SVGProps } from 'react'
import type { StatusGlyph } from './statusGlyphs'
import { STATUS_ICON } from './statusIcons'
import { formatDataAttr } from './utils'

interface StatusIconProps {
  /** Status label, e.g. "In Progress" / "On Hold". */
  status?: string
  /** Sizing/spacing class — consumer-owned. */
  className?: string
  /**
   * Native hover tooltip (the human status label). Set by interactive-adjacent
   * consumers like the TicketCode key line; the badge skips it (its label is
   * adjacent). Stays non-interactive: a title attribute, never a Radix
   * trigger, so the glyph keeps no tab stop and no SR presence.
   */
  title?: string
}

export function StatusIcon({ status, className, title }: StatusIconProps) {
  const key = status ? formatDataAttr(status) : ''
  const Icon: StatusGlyph | null = key ? (STATUS_ICON[key] ?? null) : null
  if (!Icon) {
    // Missing/unknown status renders nothing — graceful absence (BR-1.9).
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
    <Icon {...svgProps} data-status={key}>
      {title ? <title>{title}</title> : null}
    </Icon>
  )
}
