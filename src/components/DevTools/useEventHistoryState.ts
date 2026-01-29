/**
 * EventHistory State Management
 *
 * Simple global state for controlling EventHistory popup visibility.
 * Allows the hamburger menu to toggle the EventHistory panel.
 *
 * State is persisted to localStorage with key 'mdt-eventHistory-hidden'
 *
 * - `isOpen`: Controls the popup open/closed state
 * - `forceHidden`: When true, hides BOTH popup AND floating button
 */

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'mdt-eventHistory-hidden'

// Load initial state from localStorage
const loadInitialState = (): { isOpen: boolean; forceHidden: boolean } => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      const forceHidden = saved === 'true'
      return { isOpen: false, forceHidden }
    }
  } catch {
    // localStorage not available (e.g., in iframe with restrictions)
  }
  return { isOpen: false, forceHidden: false }
}

const initialState = loadInitialState()

let globalIsOpen = initialState.isOpen
let globalForceHidden = initialState.forceHidden
const listeners = new Set<(open: boolean, forceHidden: boolean) => void>()

/**
 * Persist forceHidden state to localStorage
 */
function persistState(forceHidden: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(forceHidden))
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Toggle EventHistory visibility (called from hamburger menu)
 * When hiding, sets forceHidden=true to hide both popup AND floating button
 */
export function toggleEventHistory() {
  if (globalIsOpen || !globalForceHidden) {
    // Currently visible (open OR button showing) -> hide everything
    globalIsOpen = false
    globalForceHidden = true
  } else {
    // Currently hidden -> show button (but don't open popup)
    globalIsOpen = false
    globalForceHidden = false
  }
  persistState(globalForceHidden)
  listeners.forEach(listener => listener(globalIsOpen, globalForceHidden))
}

/**
 * Set EventHistory visibility state
 */
export function setEventHistoryOpen(open: boolean) {
  globalIsOpen = open
  // When opening, ensure it's not force hidden
  if (open) {
    globalForceHidden = false
    persistState(false)
  }
  listeners.forEach(listener => listener(globalIsOpen, globalForceHidden))
}

/**
 * Set EventHistory forceHidden state (hide both popup and button)
 */
export function setEventHistoryForceHidden(forceHidden: boolean) {
  globalForceHidden = forceHidden
  persistState(forceHidden)
  listeners.forEach(listener => listener(globalIsOpen, globalForceHidden))
}

/**
 * Get current EventHistory visibility state
 */
export function getEventHistoryOpen(): boolean {
  return globalIsOpen
}

/**
 * Get current EventHistory forceHidden state
 */
export function getEventHistoryForceHidden(): boolean {
  return globalForceHidden
}

/**
 * React hook for components that need to control or observe EventHistory state
 *
 * @example
 * ```tsx
 * function EventHistory() {
 *   const [isOpen, forceHidden, setState] = useEventHistoryState()
 *   return <div className={forceHidden ? 'hidden' : isOpen ? 'open' : 'button'}>...</div>
 * }
 * ```
 */
export function useEventHistoryState(): [boolean, boolean, (open: boolean, forceHidden?: boolean) => void] {
  const [isOpen, setIsOpen] = useState(globalIsOpen)
  const [forceHidden, setForceHidden] = useState(globalForceHidden)

  useEffect(() => {
    const listener = (open: boolean, hidden: boolean) => {
      setIsOpen(open)
      setForceHidden(hidden)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  // Sync with global state if it changes externally
  useEffect(() => {
    if (isOpen !== globalIsOpen || forceHidden !== globalForceHidden) {
      globalIsOpen = isOpen
      globalForceHidden = forceHidden
      persistState(forceHidden)
      // Don't notify listeners to avoid loops
    }
  }, [isOpen, forceHidden])

  const setState = (open: boolean, hidden?: boolean) => {
    globalIsOpen = open
    if (hidden !== undefined) {
      globalForceHidden = hidden
    }
    persistState(globalForceHidden)
    listeners.forEach(listener => listener(globalIsOpen, globalForceHidden))
  }

  return [isOpen, forceHidden, setState]
}
