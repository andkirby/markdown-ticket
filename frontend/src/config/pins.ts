import type { PinItem, PinState } from '@mdt/domain-contracts'
import { validatePinState } from '@mdt/domain-contracts'
import { authFetch } from '../auth/authFetch'

export type { PinItem, PinState }

/**
 * MDT-197: pin rail client. Mirrors src/config/documentFavs.ts — validate
 * locally, authFetch PUT the whole list, validate the response. The endpoint
 * is user-global (no projectId): each PinItem carries its own projectCode.
 */
export async function savePins(pins: PinItem[]): Promise<PinState> {
  const state = validatePinState({ pins })
  const response = await authFetch('/api/pins', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pins: state.pins }),
  })

  if (!response.ok) {
    throw new Error(`Failed to save pins: ${response.statusText}`)
  }

  const data = await response.json()

  return validatePinState(data)
}

export async function loadPins(): Promise<PinState> {
  const response = await authFetch('/api/pins', {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to load pins: ${response.statusText}`)
  }

  const data = await response.json()

  return validatePinState(data)
}
