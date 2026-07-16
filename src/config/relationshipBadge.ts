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
 * Empty string renders links adjacently with no separator.
 */
export const RELATIONSHIP_LINK_SEPARATOR = ''

/**
 * Elision applies to all surfaces (board + ticket viewer).
 * When true, same-project links render as bare numbers everywhere.
 */
export const ELIDE_EVERYWHERE = true
