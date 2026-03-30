/**
 * ViewMode persistence hook
 * Manages localStorage persistence for board/list mode toggle
 */

const STORAGE_KEY = 'lastBoardListMode'

/**
 * Custom hook for view mode persistence
 * Handles localStorage operations with graceful error handling
 */
export function useViewModePersistence() {
  /**
   * Gets the last board/list mode from localStorage
   * @returns 'board' or 'list', defaults to 'board' on missing/invalid/error
   */
  const getLastBoardListMode = (): 'board' | 'list' => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)

      // Validate against allowed values
      if (stored === 'board' || stored === 'list') {
        return stored
      }

      // Default to 'board' for missing/invalid values (Edge-1)
      return 'board'
    }
    catch (error) {
      // Handle localStorage unavailable gracefully (Edge-2)
      return 'board'
    }
  }

  /**
   * Saves board/list mode to localStorage
   * @param mode - 'board' or 'list' to save
   */
  const saveBoardListMode = (mode: 'board' | 'list'): void => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    }
    catch (error) {
      // Handle localStorage failure gracefully (Edge-2)
      // Don't throw - just fail silently
    }
  }

  return {
    getLastBoardListMode,
    saveBoardListMode,
  }
}
