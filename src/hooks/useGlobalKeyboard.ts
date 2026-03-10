/**
 * useGlobalKeyboard - Global keyboard shortcut handler
 * MDT-136: Cmd+K Quick Search for Tickets
 */

import { useCallback, useEffect } from 'react'

export interface UseGlobalKeyboardOptions {
  onQuickSearch: () => void
}

export function useGlobalKeyboard(options: UseGlobalKeyboardOptions): void {
  const { onQuickSearch } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    const isModifierPressed = event.metaKey || event.ctrlKey
    const isKKey = event.key === 'k' || event.key === 'K'

    if (isModifierPressed && isKKey) {
      event.preventDefault()
      onQuickSearch()
    }
  }, [onQuickSearch])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
