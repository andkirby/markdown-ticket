import type { StatusGlyph } from './statusGlyphs'
import {
  ApprovedGlyph,
  ImplementedGlyph,
  InProgressGlyph,
  OnHoldGlyph,
  PartiallyImplementedGlyph,
  ProposedGlyph,
  RejectedGlyph,
} from './statusGlyphs'

/**
 * MDT-247: status glyph per CRStatus (domain-contracts CRStatus). Keys are
 * `formatDataAttr(status)` — the same `data-status` values badge.css colors on.
 *
 * Glyphs are inline components ported from the owner set (statusGlyphs.tsx) —
 * bundled, never fetched per-icon from public/ (C4, STYLING.md §SVG Icons).
 * Kept in a non-component module so component files stay Fast-Refresh-clean
 * (react-refresh/only-export-components), mirroring priorityIcons.ts/typeIcons.ts.
 *
 * Intentionally unmapped: `deferred` (no Deferred CRStatus exists) and the two
 * fast-forward in-progress variants (no data distinguishes them) — C6.
 */
export const STATUS_ICON: Record<string, StatusGlyph> = {
  'proposed': ProposedGlyph,
  'approved': ApprovedGlyph,
  'in-progress': InProgressGlyph,
  'implemented': ImplementedGlyph,
  'rejected': RejectedGlyph,
  'on-hold': OnHoldGlyph,
  'partially-implemented': PartiallyImplementedGlyph,
}
