/**
 * MDT-248 UAT r2 — split layout math for the ticket column / pane divider.
 * Kept component-free so TicketSidePane.tsx stays fast-refresh clean.
 */

/** Reasonable resize floor for either column (spec → Layout: divider). */
export const SPLIT_COLUMN_MIN_WIDTH = 340

/**
 * Clamp a ticket-column width so neither column drops below the minimum:
 * `min ≤ px ≤ bodyWidth − min` (the smaller bound wins when the body is
 * too narrow for two minimums).
 */
export function clampTicketColumnWidth(px: number, bodyWidth: number, min = SPLIT_COLUMN_MIN_WIDTH): number {
  const max = Math.max(min, bodyWidth - min)
  return Math.min(Math.max(px, min), max)
}
