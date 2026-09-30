import type { LucideIcon } from 'lucide-react'
import { ALargeSmall, Calendar1, CalendarClock, ChevronsUp, ListChecks, Ticket } from 'lucide-react'

/**
 * Sort attribute registry + view-scoped preference storage (MDT-249).
 *
 * Storage: one key holds `Record<SortScope, SortPreferences>`. Reads are
 * sanitize-and-default (stale shapes — including the pre-MDT-249 flat
 * `{selectedAttribute, selectedDirection}` value — reset to defaults, never
 * throw); writes merge by scope so board and list never clobber each other.
 */

export interface SortAttribute {
  name: string
  label: string
  defaultDirection: 'asc' | 'desc'
  system: boolean
  /** Lucide glyph shown in the collapsed SortMenu (icon map: sort-menu.spec.md). */
  icon: LucideIcon
}

export interface SortPreferences {
  selectedAttribute: string
  selectedDirection: 'asc' | 'desc'
}

/** Type-safe enum pattern (docs/PRE_IMPLEMENT.md): union + named array. */
export type SortScope = 'board' | 'list'
export const SORT_SCOPES: readonly SortScope[] = ['board', 'list']

/**
 * Lifecycle order for status sorting (Proposed → … → Rejected). Deliberately
 * NOT `STATUS_CONFIG.order` (On Hold sits 4th here, 6th there) nor
 * `VALID_STATUSES` — those encode workflow semantics; this encodes list sort
 * presentation (MDT-249 C4).
 */
export const CR_STATUS_SORT_ORDER: readonly string[] = [
  'Proposed',
  'Approved',
  'In Progress',
  'On Hold',
  'Implemented',
  'Partially Implemented',
  'Rejected',
]

const BOARD_SORT_ATTRIBUTES: SortAttribute[] = [
  { name: 'code', label: 'Key', defaultDirection: 'desc', system: true, icon: Ticket },
  { name: 'title', label: 'Title', defaultDirection: 'asc', system: true, icon: ALargeSmall },
  { name: 'priority', label: 'Priority', defaultDirection: 'desc', system: true, icon: ChevronsUp },
  // Labels drop the redundant "Date" — the calendar glyph carries it.
  { name: 'dateCreated', label: 'Created', defaultDirection: 'desc', system: true, icon: Calendar1 },
  { name: 'lastModified', label: 'Updated', defaultDirection: 'desc', system: true, icon: CalendarClock },
]

// List scope: Status after Title mirrors column order (UX gate); existing
// options keep their board-scope positions. Status sorts by lifecycle (asc).
const LIST_SORT_ATTRIBUTES: SortAttribute[] = [
  { name: 'code', label: 'Key', defaultDirection: 'desc', system: true, icon: Ticket },
  { name: 'title', label: 'Title', defaultDirection: 'asc', system: true, icon: ALargeSmall },
  { name: 'status', label: 'Status', defaultDirection: 'asc', system: true, icon: ListChecks },
  { name: 'priority', label: 'Priority', defaultDirection: 'desc', system: true, icon: ChevronsUp },
  { name: 'dateCreated', label: 'Created', defaultDirection: 'desc', system: true, icon: Calendar1 },
  { name: 'lastModified', label: 'Updated', defaultDirection: 'desc', system: true, icon: CalendarClock },
]

/** Per-scope attribute registry — the single source for dropdowns and headers. */
export const SORT_ATTRIBUTES: Record<SortScope, SortAttribute[]> = {
  board: BOARD_SORT_ATTRIBUTES,
  list: LIST_SORT_ATTRIBUTES,
}

/** Board-scope alias — pre-MDT-249 importers keep compiling. */
export const DEFAULT_SORT_ATTRIBUTES: SortAttribute[] = SORT_ATTRIBUTES.board

const DEFAULT_SORT_PREFERENCES: SortPreferences = {
  selectedAttribute: 'code',
  selectedDirection: 'desc',
}

// Local storage key
const SORT_PREFERENCES_KEY = 'markdown-ticket-sort-preferences'

/** Type-check one scope's stored value; anything else is stale → null. */
function sanitizeScopePreferences(value: unknown): SortPreferences | null {
  if (typeof value !== 'object' || value === null)
    return null
  const { selectedAttribute, selectedDirection } = value as Record<string, unknown>
  if (typeof selectedAttribute !== 'string')
    return null
  if (selectedDirection !== 'asc' && selectedDirection !== 'desc')
    return null
  return { selectedAttribute, selectedDirection }
}

/**
 * Read the stored record. Malformed JSON, non-object roots (the pre-MDT-249
 * flat shape included — it has no scope keys), and wrong-typed scope values
 * all drop to `{}` so callers fall back to defaults without throwing.
 */
function readScopedRecord(): Partial<Record<SortScope, SortPreferences>> {
  try {
    const stored = localStorage.getItem(SORT_PREFERENCES_KEY)
    if (!stored)
      return {}
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      return {}
    const obj = parsed as Record<string, unknown>
    const result: Partial<Record<SortScope, SortPreferences>> = {}
    for (const scope of SORT_SCOPES) {
      const prefs = sanitizeScopePreferences(obj[scope])
      if (prefs)
        result[scope] = prefs
    }
    return result
  }
  catch (error) {
    console.warn('Failed to load sort preferences:', error)
    return {}
  }
}

export function getSortPreferences(scope: SortScope): SortPreferences {
  return readScopedRecord()[scope] ?? DEFAULT_SORT_PREFERENCES
}

export function setSortPreferences(scope: SortScope, preferences: SortPreferences): void {
  try {
    // Read-modify-write: writing one scope never clobbers the other (BR-7.1).
    const record = readScopedRecord()
    record[scope] = preferences
    localStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(record))
  }
  catch (error) {
    console.warn('Failed to save sort preferences:', error)
  }
}
