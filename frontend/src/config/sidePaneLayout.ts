import { readStorageString, writeStorageString } from './settingsPreferences'

/**
 * MDT-248 UAT r3 — persisted split-wall position for the ticket side pane.
 *
 * Stored as a PERCENT of the split body width (not px): a percent flex-basis
 * resolves live against the container, so the restored wall (a) has no
 * measurement race with the modal width transition, and (b) keeps its
 * relative position across viewport sizes. The 340px per-column floor is
 * enforced at computation time (splitLayout.ts) plus a CSS min-width guard.
 *
 * Key follows the settingsPreferences `mdt-settings-*` convention.
 */
const SPLIT_PERCENT_KEY = 'mdt-settings-ticket-side-pane-split-ratio'

/** Stored wall position as a percent of the split body width, or null. */
export function getStoredSplitPercent(): number | null {
  const raw = readStorageString(SPLIT_PERCENT_KEY, '')
  if (!raw)
    return null
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value) || value <= 0 || value >= 100)
    return null
  return value
}

export function storeSplitPercent(percent: number): void {
  writeStorageString(SPLIT_PERCENT_KEY, percent.toFixed(3))
}

export function clearStoredSplitPercent(): void {
  try {
    localStorage.removeItem(SPLIT_PERCENT_KEY)
  }
  catch {
    console.warn(`Failed to clear setting: ${SPLIT_PERCENT_KEY}`)
  }
}
