import type { TicketFilters } from '@mdt/domain-contracts'

/**
 * localStorage-backed persistence for board filter state.
 *
 * Mirrors the `markdown-ticket-sort-preferences` pattern in `sorting.ts`:
 * the filter state is a lifecycle sibling of sort preferences — both are
 * per-browser, transient narrowing controls that survive a reload.
 *
 * Invalid/stale shapes reset to empty (never throw) per BDD S22.
 */

const FILTER_PREFERENCES_KEY = 'markdown-ticket-filter-preferences'

const EMPTY_FILTERS: TicketFilters = {}

/**
 * The set of multi-select facet keys we persist. Kept explicit so an unknown
 * key from a future schema does not silently survive a read.
 */
const PERSISTED_FACET_KEYS = ['status', 'type', 'priority', 'assignee', 'phaseEpic', 'impactAreas'] as const

/**
 * Read persisted filter preferences. Returns `{}` when nothing is stored or
 * when the stored value does not validate as a `TicketFilters` shape.
 */
export function getFilterPreferences(): TicketFilters {
  try {
    const stored = localStorage.getItem(FILTER_PREFERENCES_KEY)
    if (!stored)
      return { ...EMPTY_FILTERS }

    const parsed = JSON.parse(stored)
    return sanitizeFilters(parsed)
  }
  catch {
    // Invalid JSON, storage disabled, or parse error → safe empty state.
    return { ...EMPTY_FILTERS }
  }
}

/**
 * Persist filter preferences. Failures (private mode, quota) are swallowed
 * to match the sort-preferences resilience contract.
 */
export function setFilterPreferences(filters: TicketFilters): void {
  try {
    localStorage.setItem(FILTER_PREFERENCES_KEY, JSON.stringify(filters))
  }
  catch {
    // Swallow — filtering is transient; persistence is best-effort.
  }
}

/** Clear persisted filter preferences (used by tests and reset flows). */
export function clearFilterPreferences(): void {
  try {
    localStorage.removeItem(FILTER_PREFERENCES_KEY)
  }
  catch {
    // Swallow — best-effort.
  }
}

/**
 * Validate and coerce an unknown parsed value into a safe `TicketFilters`.
 * Drops unknown keys and rejects wrong-typed values, returning `{}` on failure.
 *
 * Visible for unit testing (BDD S22 — "old schema never throws").
 */
export function sanitizeFilters(value: unknown): TicketFilters {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...EMPTY_FILTERS }
  }

  const obj = value as Record<string, unknown>
  const result: TicketFilters = {}
  let hasAny = false

  for (const key of PERSISTED_FACET_KEYS) {
    const raw = obj[key]
    if (typeof raw === 'string') {
      result[key] = raw
      hasAny = true
    }
    else if (Array.isArray(raw) && raw.every(v => typeof v === 'string')) {
      result[key] = raw
      hasAny = true
    }
  }

  if (typeof obj.query === 'string') {
    result.query = obj.query
    hasAny = true
  }

  if (typeof obj.inWorktree === 'boolean') {
    result.inWorktree = obj.inWorktree
    hasAny = true
  }

  return hasAny ? result : { ...EMPTY_FILTERS }
}
