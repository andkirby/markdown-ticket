import { PROJECT_CODE_PATTERN_BODY, TICKET_KEY_PATTERN_BODY, TICKET_NUMBER_MAX_DIGITS, TICKET_NUMBER_MIN_DIGITS } from '@mdt/domain-contracts'

// No capturing groups: consumers retain their existing capture layouts and flags.
export { TICKET_KEY_PATTERN_BODY } from '@mdt/domain-contracts'

// Historical CR-A001 links predate the canonical stored-key contract (MDT-001).
// Keep this exception confined to linkProcessor/linkNormalization consumers.
export const LINK_TICKET_KEY_PATTERN_BODY
  = `${PROJECT_CODE_PATTERN_BODY}-[A-Z]?\\d{${TICKET_NUMBER_MIN_DIGITS},${TICKET_NUMBER_MAX_DIGITS}}`

export const TICKET_FILENAME_PATTERN = new RegExp(`^(${TICKET_KEY_PATTERN_BODY})(?:-[^/]*)?\\.md$`)
export const TICKET_SOURCE_PATTERN = new RegExp(`^(${TICKET_KEY_PATTERN_BODY})(?=/|\\.md$)`)
export const TICKET_KEY_PREFIX_PATTERN = new RegExp(`^(${TICKET_KEY_PATTERN_BODY})(?=/|(?:-[^/]*)?\\.md$|$)`)
export const TICKET_SUBDOC_PATTERN = new RegExp(`^(${TICKET_KEY_PATTERN_BODY})/(.+\\.(?:md|html))$`)
export const TICKET_LINK_PATTERN = new RegExp(`^(${LINK_TICKET_KEY_PATTERN_BODY})(\\.md)?(#.*)?$`)
export const CROSS_PROJECT_TICKET_LINK_PATTERN = new RegExp(`^(${PROJECT_CODE_PATTERN_BODY})-(\\d{${TICKET_NUMBER_MIN_DIGITS},${TICKET_NUMBER_MAX_DIGITS}})(\\.md)?(#.*)?$`)

// Word boundaries alone allow a valid-looking suffix of an invalid project code.
export const TICKET_TOKEN_PATTERN = new RegExp(`(?<![\\w-])(${TICKET_KEY_PATTERN_BODY})\\b`, 'g')
