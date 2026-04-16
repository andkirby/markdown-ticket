/**
 * Shared utilities for Badge components.
 *
 * Converts display strings to data-attribute format for CSS selectors.
 * Used by StatusBadge, TypeBadge, PriorityBadge, and other components
 * that use data-* attribute styling (see badge.css, STYLING.md).
 */

/**
 * Converts a display string to data attribute format.
 * "In Progress" -> "in-progress", "Feature Enhancement" -> "feature-enhancement"
 */
export function formatDataAttr(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-')
}
