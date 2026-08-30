/**
 * MDT-187: Relationship badge display configuration
 *
 * Code-level configuration for relationship badge rendering.
 * Settings UI wiring is deferred; these constants are the single source of
 * truth until a settings item is added.
 *
 * When a settings item is added, replace these with localStorage-backed
 * getters mirroring the `ticketCardBadges.ts` pattern.
 */

/**
 * Separator rendered between inline relationship links.
 * Uses a non-breaking space (\u00A0) so it survives inline-flow whitespace
 * collapsing and does not break across lines — a regular space collapses to
 * nothing between the wrapper spans (027 041 042, not 027041042).
 */
export const RELATIONSHIP_LINK_SEPARATOR = '\u00A0'

/**
 * Elision applies to all surfaces (board + ticket viewer).
 * When true, same-project links render as bare numbers everywhere.
 */
export const ELIDE_EVERYWHERE = true
