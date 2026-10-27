/**
 * Project code contract (MDT-254).
 *
 * Leaf module: both the project schemas and the ticket key patterns derive
 * from this pattern, so it must not import from either to stay cycle-free.
 */

/**
 * Project code pattern body without anchors, for composing larger patterns
 * (ticket keys, filenames, branch names). Anchored variant below.
 */
export const PROJECT_CODE_PATTERN_BODY = '[A-Z][A-Z0-9]{1,4}'

/**
 * Project code pattern: 2-5 chars, uppercase alphanumeric, must start with a
 * letter (e.g. "MDT", "TP0").
 */
export const PROJECT_CODE_PATTERN = new RegExp(`^${PROJECT_CODE_PATTERN_BODY}$`)
