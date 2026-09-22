/**
 * MDT-247: status glyph components — one per CRStatus, ported from the
 * owner-provided set in `frontend/public/icons/status_svg/`.
 *
 * Normalized per C5: 24×24 viewBox, `currentColor` for every shape (the
 * sources carry 64×64 viewBoxes with hardcoded hex), lucide-ish stroke weight
 * (2 for rings, 2.25 for the bold check/X marks, matching the owner's
 * 5/6-of-64 emphasis ratio). Each glyph keeps its source silhouette:
 * proposed = diamond · approved = outlined ring + check · in-progress = ring +
 * filled play · implemented = filled disc with a knocked-out check (evenodd,
 * so it stays one currentColor and reads inverted on the filled disc) ·
 * rejected = ring + X · on-hold = ring + pause bars · partially-implemented =
 * ring + dim left half + check. deferred + fast-forward variants are NOT
 * ported — no CRStatus maps to them (C6).
 *
 * Components only (no records) so the file stays Fast-Refresh-clean
 * (react-refresh/only-export-components); the status→glyph map lives in
 * statusIcons.ts (the priorityIcons.ts/typeIcons.ts pattern).
 */

import type { SVGProps } from 'react'

export type StatusGlyph = React.FC<SVGProps<SVGSVGElement>>

type GlyphProps = SVGProps<SVGSVGElement>

export function ProposedGlyph({ children, ...props }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 4L20 12L12 20L4 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {children}
    </svg>
  )
}

export function ApprovedGlyph({ children, ...props }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.4L10.9 15.3L16.5 9.4" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {children}
    </svg>
  )
}

export function InProgressGlyph({ children, ...props }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="2" />
      <path d="M9.75 7.5v9l6.75-4.5-6.75-4.5Z" fill="currentColor" />
      {children}
    </svg>
  )
}

export function ImplementedGlyph({ children, ...props }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3.75a8.25 8.25 0 1 0 0 16.5a8.25 8.25 0 1 0 0-16.5ZM7.1 13.2L10.5 16.8L17.3 10.2L15.7 8.6L11.4 14L8.7 11.6Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      {children}
    </svg>
  )
}

export function RejectedGlyph({ children, ...props }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="2" />
      <path d="M8.6 8.6L15.4 15.4M15.4 8.6L8.6 15.4" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      {children}
    </svg>
  )
}

export function OnHoldGlyph({ children, ...props }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="2" />
      <rect x="8.2" y="7.5" width="2.6" height="9" rx="1" fill="currentColor" />
      <rect x="13.2" y="7.5" width="2.6" height="9" rx="1" fill="currentColor" />
      {children}
    </svg>
  )
}

export function PartiallyImplementedGlyph({ children, ...props }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 3.75A8.25 8.25 0 0 0 12 20.25Z" fill="currentColor" fillOpacity="0.35" />
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.4L10.9 15.3L16.5 9.4" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {children}
    </svg>
  )
}
