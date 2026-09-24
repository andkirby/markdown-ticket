import { readStorageString, writeStorageString } from './settingsPreferences'

/**
 * MDT-248 UAT r7 — per-ticket reading-session snapshots for the side pane.
 *
 * A modal close no longer loses the reading context: each ticket keeps one
 * snapshot (history + index + scrolls + last-known titles) in localStorage,
 * restored hidden (pill shows) the next time that ticket opens. Snapshots are
 * scoped by project AND ticket (keys collide across projects otherwise).
 *
 * Obsolescence control is a FILO cap: at most MAX_SESSION_RECORDS tickets are
 * remembered, most recently used first; saving a new or re-touched ticket
 * evicts the oldest beyond the cap. Deleted documents degrade gracefully at
 * restore time (pane failure UX, Edge-2). Key follows the settingsPreferences
 * `mdt-settings-*` convention.
 */
const SESSIONS_KEY = 'mdt-settings-ticket-side-pane-sessions'

export const MAX_SESSION_RECORDS = 5

export interface SidePaneSessionRecord {
  projectId: string
  ticketKey: string
  hist: string[]
  hi: number
  scrolls: Record<string, number>
  titles: Record<string, string>
  updatedAt: number
}

function isValidRecord(value: unknown): value is SidePaneSessionRecord {
  if (typeof value !== 'object' || value === null)
    return false
  const r = value as Partial<SidePaneSessionRecord>
  return typeof r.projectId === 'string'
    && typeof r.ticketKey === 'string'
    && Array.isArray(r.hist)
    && r.hist.length > 0
    && r.hist.every(p => typeof p === 'string')
    && typeof r.hi === 'number'
    && Number.isInteger(r.hi)
    && r.hi >= 0
    && r.hi < r.hist.length
    && typeof r.scrolls === 'object'
    && typeof r.titles === 'object'
    && typeof r.updatedAt === 'number'
}

function readAll(): SidePaneSessionRecord[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(readStorageString(SESSIONS_KEY, ''))
  }
  catch {
    return []
  }
  if (!Array.isArray(parsed))
    return []
  // No-migration policy: invalid entries fall out; the rest stay.
  return parsed.filter(isValidRecord)
}

function writeAll(records: SidePaneSessionRecord[]): void {
  writeStorageString(SESSIONS_KEY, JSON.stringify(records))
}

/** Snapshot for this ticket, or null when nothing (valid) is remembered. */
export function loadSidePaneSessionRecord(projectId: string, ticketKey: string): SidePaneSessionRecord | null {
  return readAll().find(r => r.projectId === projectId && r.ticketKey === ticketKey) ?? null
}

/** Upsert by project+ticket, moved to the front; evicts oldest beyond the cap. */
export function saveSidePaneSessionRecord(record: SidePaneSessionRecord): void {
  const rest = readAll().filter(r => !(r.projectId === record.projectId && r.ticketKey === record.ticketKey))
  const live = new Set(record.hist)
  const pruned = {
    ...record,
    // Forward-stack truncation drops entries; their scroll/title keys go too.
    scrolls: Object.fromEntries(Object.entries(record.scrolls).filter(([p]) => live.has(p))),
    titles: Object.fromEntries(Object.entries(record.titles).filter(([p]) => live.has(p))),
  }
  writeAll([pruned, ...rest].slice(0, MAX_SESSION_RECORDS))
}

/** Forget this ticket's snapshot (pane × discard). */
export function clearSidePaneSessionRecord(projectId: string, ticketKey: string): void {
  writeAll(readAll().filter(r => !(r.projectId === projectId && r.ticketKey === ticketKey)))
}
