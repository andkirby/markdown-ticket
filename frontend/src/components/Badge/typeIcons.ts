import type { LucideIcon } from 'lucide-react'
import { Bandage, Bug, DraftingCompass, FileText, FlaskConical, Rocket } from 'lucide-react'

/**
 * Ticket-type glyph per CRType (domain-contracts CRType). Keys are
 * `formatDataAttr(type)` — the same `data-type` values badge.css colors on.
 *
 * All six are stock lucide-react icons delivered inline (tree-shaken into the
 * JS bundle), not via sprite/file: six glyphs don't justify a fetch that
 * blanks the first paint of every board card.
 *
 * Kept in a non-component module so TypeIcon stays Fast-Refresh-clean
 * (react-refresh/only-export-components).
 */
export const TYPE_ICON: Record<string, LucideIcon> = {
  'architecture': DraftingCompass,
  'bug-fix': Bug,
  'documentation': FileText,
  'feature-enhancement': Rocket,
  'research': FlaskConical,
  'technical-debt': Bandage,
}
