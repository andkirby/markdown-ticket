/**
 * MDT-244: shared store for the ticket-key type-glyph display options.
 *
 * Backs `ui.ticketKey.typeIconNearKey` / `ui.ticketKey.typeIconInBadge` —
 * user-scope app configuration (`user.toml`). Read through the non-owner
 * `/api/config/selector` preferences endpoint (the owner-only
 * `/api/config/selectors` is for the settings editor, not viewers); one
 * shared read per session, Settings applies update the store directly on
 * save. Components consume via `useTicketKeyOptions()` — never per-instance
 * fetches, never localStorage (BR-6.1 layer).
 */

import { useSyncExternalStore } from 'react'
import { authFetch } from '../auth/authFetch'

export interface TicketKeyOptions {
  typeIconNearKey: boolean
  typeIconInBadge: boolean
}

/** Absent config keys fall through to defaults — both options off (C2). */
const DEFAULTS: TicketKeyOptions = { typeIconNearKey: false, typeIconInBadge: false }

let options: TicketKeyOptions = { ...DEFAULTS }
const listeners = new Set<() => void>()

export function getTicketKeyOptions(): TicketKeyOptions {
  return options
}

export function setTicketKeyOptions(next: Partial<TicketKeyOptions>): void {
  options = { ...options, ...next }
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeTicketKeyOptions(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTicketKeyOptions(): TicketKeyOptions {
  return useSyncExternalStore(subscribeTicketKeyOptions, getTicketKeyOptions)
}

let loadStarted = false

/**
 * Read the two option values once per session and fold them into the store.
 * Absent keys keep defaults; a failed read keeps defaults too — staleness
 * until a reload or a Settings save is accepted (Edge-1).
 */
export async function loadTicketKeyOptions(): Promise<void> {
  if (loadStarted) {
    return
  }
  loadStarted = true
  try {
    const response = await authFetch('/api/config/selector')
    if (!response.ok) {
      return
    }
    const data = await response.json() as { ticketKeyOptions?: Partial<TicketKeyOptions> }
    const raw = data.ticketKeyOptions
    if (raw && typeof raw === 'object') {
      const next: Partial<TicketKeyOptions> = {}
      if (typeof raw.typeIconNearKey === 'boolean') {
        next.typeIconNearKey = raw.typeIconNearKey
      }
      if (typeof raw.typeIconInBadge === 'boolean') {
        next.typeIconInBadge = raw.typeIconInBadge
      }
      setTicketKeyOptions(next)
    }
  }
  catch {
    // Defaults stand until a reload succeeds (Edge-1).
  }
}
