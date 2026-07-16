/**
 * MDT-187: Relationship link elision helpers
 *
 * Pure helpers for compact-mode rendering of relationship badge links.
 * On the board, same-project links render as a bare zero-padded number;
 * cross-project links keep their full CR key.
 *
 * Classification parses the key's prefix directly rather than relying on
 * `classifyLink`'s `link.type`, because the generic ticket regex in
 * linkProcessor.ts matches cross-project keys (e.g. `OTHER-123`) as
 * `LinkType.TICKET` before the cross-project branch runs.
 *
 * Obligations: OBL-relationship-badges
 */

/** Matches a CR key of shape `{PREFIX}-{DIGITS}` with an uppercase 2–5 char prefix. */
const CR_KEY_PATTERN = /^([A-Z][A-Z0-9]{1,4})-(\d+)$/

export interface ElidedLink {
  /** Original full link string (e.g. `MDT-030` or `not-a-ticket`). */
  readonly fullKey: string
  /** Display form: bare number for same-project, full key otherwise. */
  readonly display: string
  /** True when the link belongs to `currentProjectCode`. */
  readonly isSameProject: boolean
}

/**
 * Resolve the display form of a single relationship link.
 *
 * - Same-project: returns the bare zero-padded number segment (digit width preserved).
 * - Cross-project or unclassifiable: returns the full key unchanged.
 *
 * @example
 * elideLinkKey('MDT-030', 'MDT')   // '030'
 * elideLinkKey('MDT-1005', 'MDT')  // '1005'
 * elideLinkKey('VOC-005', 'MDT')   // 'VOC-005'
 * elideLinkKey('not-a-ticket', 'MDT') // 'not-a-ticket'
 */
export function elideLinkKey(
  link: string,
  currentProjectCode: string,
): ElidedLink {
  const match = link.match(CR_KEY_PATTERN)
  if (!match) {
    return { fullKey: link, display: link, isSameProject: false }
  }
  const [, prefix, number] = match
  const isSameProject = prefix === currentProjectCode
  return {
    fullKey: link,
    display: isSameProject ? number : link,
    isSameProject,
  }
}

/**
 * Resolve display forms for a list of links. Preserves order and length.
 */
export function elideLinks(
  links: string[],
  currentProjectCode: string,
): ElidedLink[] {
  return links.map(link => elideLinkKey(link, currentProjectCode))
}
