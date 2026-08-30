import type { PinItem } from '@mdt/domain-contracts'
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPins, savePins } from '../config/pins'
import { useToast } from './useToast'

/**
 * MDT-197: pin rail state + actions.
 *
 * Loads the user-global pin set from /api/pins once, then exposes add/remove
 * that optimistically mutate local state and persist the whole list via PUT
 * /api/pins. On persistence failure the optimistic change is reverted and a
 * toast surfaces (Edge-3: no phantom pin).
 *
 * `canWrite` gates mutations (BR-10): in read-only access modes add/remove
 * are no-ops; the pin set remains readable for click-to-open.
 *
 * Pin identity is (projectCode, ticketCode). Recency-pinned-first: addPin
 * prepends (or moves-to-top) and stamps a fresh favoritedAt.
 */
export interface UsePinsResult {
  pins: PinItem[]
  loading: boolean
  /** True when (projectCode, ticketCode) is pinned. */
  isPinned: (projectCode: string, ticketCode: string) => boolean
  /** Pin a ticket. No-op when canWrite is false. Returns true if state changed. */
  addPin: (projectCode: string, ticketCode: string) => boolean
  /** Unpin a ticket. No-op when canWrite is false. Returns true if state changed. */
  removePin: (projectCode: string, ticketCode: string) => boolean
}

function pinKey(p: { projectCode: string, ticketCode: string }): string {
  return `${p.projectCode}\u{0000}${p.ticketCode}`
}

export function usePins(canWrite: boolean): UsePinsResult {
  const [pins, setPins] = useState<PinItem[]>([])
  const [loading, setLoading] = useState(true)
  const pinsRef = useRef<PinItem[]>([])
  const toast = useToast()

  // pinsRef is the synchronous source of truth; mutations (add/remove/load)
  // update it directly and mirror into React state via setPins for rendering.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadPins()
      .then((state) => {
        if (!cancelled) {
          pinsRef.current = state.pins
          setPins(state.pins)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          // Load failure is non-fatal: empty rail. Do not spam toast on boot.
          console.error('Failed to load pins:', err)
          pinsRef.current = []
          setPins([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback(
    async (next: PinItem[]): Promise<boolean> => {
      try {
        await savePins(next)
        return true
      }
      catch (err: unknown) {
        console.error('Failed to persist pins:', err)
        toast.error('Pin not saved', { description: 'Could not reach the server. Try again.' })
        return false
      }
    },
    [toast],
  )

  const addPin = useCallback(
    (projectCode: string, ticketCode: string): boolean => {
      if (!canWrite) {
        return false
      }
      const key = pinKey({ projectCode, ticketCode })
      // pinsRef is the synchronous source of truth; setPinsSync mirrors it into
      // React state for rendering. This makes consecutive synchronous addPin
      // calls chain correctly without waiting for a render flush.
      const prev = pinsRef.current
      // Already pinned: no-op. v1 keeps original recency (no reorder on re-pin).
      if (prev.some(p => pinKey(p) === key)) {
        return false
      }
      const now = new Date().toISOString()
      const next = [{ projectCode, ticketCode, favoritedAt: now }, ...prev]
      pinsRef.current = next
      setPins(next)
      void persist(next)
      return true
    },
    [canWrite, persist],
  )

  const removePin = useCallback(
    (projectCode: string, ticketCode: string): boolean => {
      if (!canWrite) {
        return false
      }
      const key = pinKey({ projectCode, ticketCode })
      const prev = pinsRef.current
      if (!prev.some(p => pinKey(p) === key)) {
        return false
      }
      const next = prev.filter(p => pinKey(p) !== key)
      pinsRef.current = next
      setPins(next)
      void persist(next)
      return true
    },
    [canWrite, persist],
  )

  const isPinned = useCallback(
    (projectCode: string, ticketCode: string): boolean =>
      pins.some(p => pinKey(p) === pinKey({ projectCode, ticketCode })),
    [pins],
  )

  return { pins, loading, isPinned, addPin, removePin }
}
