import type { PinItem, PinState } from '@mdt/domain-contracts'
import { validatePinState } from '@mdt/domain-contracts'
import { authFetch } from '../auth/authFetch'

export type { PinItem, PinState }

/**
 * MDT-197: pin rail client. Mirrors src/config/documentFavs.ts — validate
 * locally, authFetch the whole list, validate the response. Project-scoped
 * per UAT 2026-10-30: every call carries the owning projectId (id or code;
 * the server resolves to the canonical id).
 */
export async function savePins(projectId: string, pins: PinItem[]): Promise<PinState> {
  const state = validatePinState({ pins })
  const response = await authFetch('/api/pins', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId, pins: state.pins }),
  })

  if (!response.ok) {
    throw new Error(`Failed to save pins: ${response.statusText}`)
  }

  const data = await response.json()

  return validatePinState(data)
}

export async function loadPins(projectId: string): Promise<PinState> {
  const response = await authFetch(`/api/pins?projectId=${encodeURIComponent(projectId)}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to load pins: ${response.statusText}`)
  }

  const data = await response.json()

  return validatePinState(data)
}
