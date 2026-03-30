/**
 * MDT-131: getViewModePersistence Unit Tests
 *
 * Tests localStorage persistence behavior including edge cases.
 * Coverage: BR-4, BR-5, Edge-1, Edge-2
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { getViewModePersistence } from './useViewModePersistence'

// Mock localStorage - compatible with both Jest and bun test
function createMockLocalStorage() {
  const store = new Map<string, string>()
  let shouldThrow = false

  return {
    getItem: (key: string) => {
      if (shouldThrow)
        throw new Error('localStorage unavailable')
      return store.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      if (shouldThrow)
        throw new Error('localStorage unavailable')
      store.set(key, value)
    },
    clear: () => {
      store.clear()
      shouldThrow = false
    },
    removeItem: (key: string) => store.delete(key),
    get length() {
      return store.size
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    // Helper to simulate localStorage errors
    _shouldThrow: () => { shouldThrow = true },
  }
}

const localStorageMock = createMockLocalStorage()

// Mock global localStorage for both environments
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = localStorageMock as unknown as Storage
}
else {
  // Replace existing localStorage
  const _originalGetItem = globalThis.localStorage.getItem
  const _originalSetItem = globalThis.localStorage.setItem
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
}

describe('getViewModePersistence', () => {
  beforeEach(() => {
    // Clear the mock store before each test
    localStorageMock.clear()
  })

  describe('getLastBoardListMode', () => {
    it('should return "board" when localStorage key is absent (Edge-1)', () => {
      // Key is not set, so getItem returns null
      const { getLastBoardListMode } = getViewModePersistence()

      expect(getLastBoardListMode()).toBe('board')
    })

    it('should return "board" when localStorage value is invalid (Edge-1)', () => {
      localStorageMock.setItem('lastBoardListMode', 'invalid-mode')
      const { getLastBoardListMode } = getViewModePersistence()

      expect(getLastBoardListMode()).toBe('board')
    })

    it('should return stored value when valid "board" (BR-5)', () => {
      localStorageMock.setItem('lastBoardListMode', 'board')
      const { getLastBoardListMode } = getViewModePersistence()

      expect(getLastBoardListMode()).toBe('board')
    })

    it('should return stored value when valid "list" (BR-5)', () => {
      localStorageMock.setItem('lastBoardListMode', 'list')
      const { getLastBoardListMode } = getViewModePersistence()

      expect(getLastBoardListMode()).toBe('list')
    })

    it('should return "board" when localStorage throws error (Edge-2)', () => {
      localStorageMock._shouldThrow()
      const { getLastBoardListMode } = getViewModePersistence()

      expect(getLastBoardListMode()).toBe('board')
    })
  })

  describe('saveBoardListMode', () => {
    it('should save "board" to localStorage (BR-4)', () => {
      const { saveBoardListMode } = getViewModePersistence()

      saveBoardListMode('board')

      expect(localStorageMock.getItem('lastBoardListMode')).toBe('board')
    })

    it('should save "list" to localStorage (BR-4)', () => {
      const { saveBoardListMode } = getViewModePersistence()

      saveBoardListMode('list')

      expect(localStorageMock.getItem('lastBoardListMode')).toBe('list')
    })

    it('should not throw error when localStorage fails (Edge-2)', () => {
      localStorageMock._shouldThrow()
      const { saveBoardListMode } = getViewModePersistence()

      expect(() => {
        saveBoardListMode('board')
      }).not.toThrow()
    })
  })

  describe('integration with useViewMode', () => {
    it('should initialize hook without errors when localStorage unavailable (Edge-2)', () => {
      localStorageMock._shouldThrow()

      expect(() => {
        getViewModePersistence()
      }).not.toThrow()
    })
  })
})
