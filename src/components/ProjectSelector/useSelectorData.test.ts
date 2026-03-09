/**
 * Selector Data Hook Tests (MDT-129)
 *
 * React hook tests for selector data management.
 * Tests cover:
 * - Fetching preferences + state from /api/config/selector
 * - Managing favorite toggle, usage tracking
 * - Persistence triggers
 * - BR-7, BR-8, BR-10 config validation and state persistence
 *
 * RED phase: Tests will fail until useSelectorData.ts is implemented.
 */

import { describe, it, expect, afterEach, mock, beforeEach } from 'bun:test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useSelectorData } from './useSelectorData'
import type { SelectorPreferences, SelectorState } from './types'

// Mock fetch globally
const mockFetch = mock()
global.fetch = mockFetch as unknown as typeof fetch

describe('useSelectorData - BR-7.1, BR-7.2: Load preferences from user.toml', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })
  afterEach(() => {
    mockFetch.mockClear()
  })

  it('returns visibleCount from user.toml', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 10,
        compactInactive: true,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.preferences.visibleCount).toBe(10)
  })

  it('returns compactInactive from user.toml', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: false,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.preferences.compactInactive).toBe(false)
  })

  it('returns both preferences when both are set', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 5,
        compactInactive: false,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.preferences.visibleCount).toBe(5)
    expect(result.current.preferences.compactInactive).toBe(false)
  })
})

describe('useSelectorData - BR-7.3: Fallback to defaults when config missing', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })
  afterEach(() => {
    mockFetch.mockClear()
  })

  it('returns default preferences when user.toml does not exist', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.preferences.visibleCount).toBe(7)
    expect(result.current.preferences.compactInactive).toBe(true)
  })
})

describe('useSelectorData - BR-7.4, BR-7.5: Invalid config fallbacks', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })
  afterEach(() => {
    mockFetch.mockClear()
  })

  it('falls back to default visibleCount when value is not integer', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 'invalid' as unknown as number,
        compactInactive: true,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.preferences.visibleCount).toBe(7) // default
  })

  it('falls back to default visibleCount when value is negative', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: -1,
        compactInactive: true,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.preferences.visibleCount).toBe(7) // default
  })

  it('falls back to default visibleCount when value is zero', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 0,
        compactInactive: true,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.preferences.visibleCount).toBe(7) // default
  })

  it('falls back to default compactInactive when value is not boolean', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: 'yes' as unknown as boolean,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.preferences.compactInactive).toBe(true) // default
  })
})

describe('useSelectorData - BR-8.5, BR-8.6: Selector state loading', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })
  afterEach(() => {
    mockFetch.mockClear()
  })

  it('returns empty state when project-selector.json does not exist', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.selectorState).toEqual({})
  })

  it('returns selector state from project-selector.json', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        },
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    expect(result.current.selectorState['PROJ-A']).toEqual({
      favorite: true,
      lastUsedAt: '2026-03-05T10:00:00Z',
      count: 42,
    })
  })

  it('falls back to empty state when JSON is invalid', async () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = () => {}

    // Mock a response that fails when json() is called
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })

    // Should handle error gracefully and return defaults
    expect(result.current.preferences.visibleCount).toBe(7)
    expect(result.current.preferences.compactInactive).toBe(true)

    console.error = originalError
  })
})

describe('useSelectorData - BR-10.x: Validation and error handling', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })
  afterEach(() => {
    mockFetch.mockClear()
  })

  it('drops invalid entries but keeps valid ones', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-VALID': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        },
        'PROJ-INVALID': {
          favorite: 'not-a-boolean' as unknown as boolean,
          lastUsedAt: 'invalid-date',
          count: 'not-a-number' as unknown as number,
        },
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // Valid entry should be present
    expect(result.current.selectorState['PROJ-VALID']).toBeDefined()

    // Invalid entry should be dropped or fields sanitized
    // Implementation may drop entire entry or sanitize fields
    const invalidEntry = result.current.selectorState['PROJ-INVALID']
    if (invalidEntry) {
      // If entry exists, fields should be sanitized
      expect(typeof invalidEntry.favorite).toBe('boolean')
      expect(typeof invalidEntry.count).toBe('number')
    }
  })

  it('handles non-boolean favorite field (treats as false)', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: 'yes' as unknown as boolean,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        },
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // Favorite should be sanitized to boolean false
    expect(result.current.selectorState['PROJ-A']?.favorite).toBe(false)
  })

  it('handles invalid lastUsedAt (drops field)', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: 'not-a-date',
          count: 42,
        },
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // Invalid lastUsedAt should be dropped/nullified
    expect(result.current.selectorState['PROJ-A']?.lastUsedAt).toBeNull()
  })

  it('handles non-integer count (treats as 0)', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 'not-a-number' as unknown as number,
        },
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // Invalid count should be sanitized to 0
    expect(result.current.selectorState['PROJ-A']?.count).toBe(0)
  })

  it('handles negative count (treats as 0)', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: -5,
        },
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // Negative count should be sanitized to 0
    expect(result.current.selectorState['PROJ-A']?.count).toBe(0)
  })

  it('ignores unknown fields in user.toml', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
        unknownField: 'should-be-ignored',
      } as unknown as SelectorPreferences,
      selectorState: {},
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // Unknown fields should not cause errors
    expect(result.current.preferences.visibleCount).toBe(7)
    expect(result.current.preferences.compactInactive).toBe(true)
    expect((result.current.preferences as unknown as Record<string, unknown>).unknownField).toBeUndefined()
  })

  it('ignores unknown fields in project-selector.json', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
          unknownField: 'should-be-ignored',
        } as unknown as SelectorState,
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // Unknown fields should not cause errors
    expect(result.current.selectorState['PROJ-A']?.favorite).toBe(true)
    expect((result.current.selectorState['PROJ-A'] as unknown as Record<string, unknown>).unknownField).toBeUndefined()
  })
})

describe('useSelectorData - BR-5.3, BR-5.4, BR-5.5: Usage tracking', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })
  afterEach(() => {
    mockFetch.mockClear()
  })

  it('updates usage state when project is selected', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        },
      },
    }

    ;(global.fetch as typeof mockFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    // Simulate project selection
    act(() => {
      result.current.trackProjectUsage('PROJ-B')
    })

    // Should trigger persistence (debounced)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2) // initial load + persist
    }, { timeout: 1000 })
  })

  it('increments count when tracking usage', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        },
      },
    }

    ;(global.fetch as typeof mockFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    const initialCount = result.current.selectorState['PROJ-A']?.count

    act(() => {
      result.current.trackProjectUsage('PROJ-A')
    })

    // Count should be incremented
    expect(result.current.selectorState['PROJ-A']?.count).toBe(initialCount! + 1)
  })

  it('sets lastUsedAt to current timestamp when tracking usage', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        },
      },
    }

    ;(global.fetch as typeof mockFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    const beforeTime = new Date()

    act(() => {
      result.current.trackProjectUsage('PROJ-A')
    })

    const afterTime = new Date()
    const newLastUsedAt = new Date(result.current.selectorState['PROJ-A']!.lastUsedAt!)

    // lastUsedAt should be current time
    expect(newLastUsedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
    expect(newLastUsedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
  })
})

describe('useSelectorData - BR-8.1, BR-8.2: Favorite toggle', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })
  afterEach(() => {
    mockFetch.mockClear()
  })

  it('toggles favorite state for a project', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        },
      },
    }

    ;(global.fetch as typeof mockFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    const initialFavorite = result.current.selectorState['PROJ-A']?.favorite

    act(() => {
      result.current.toggleFavorite('PROJ-A')
    })

    // Favorite should be toggled
    expect(result.current.selectorState['PROJ-A']?.favorite).toBe(!initialFavorite)
  })

  it('persists favorite state after toggle', async () => {
    const mockResponse = {
      preferences: {
        visibleCount: 7,
        compactInactive: true,
      },
      selectorState: {
        'PROJ-A': {
          favorite: true,
          lastUsedAt: '2026-03-05T10:00:00Z',
          count: 42,
        },
      },
    }

    ;(global.fetch as typeof mockFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const { result } = renderHook(() => useSelectorData())

    await waitFor(() => {
      expect(result.current.loaded).toBe(true)
    })

    act(() => {
      result.current.toggleFavorite('PROJ-A')
    })

    // Should trigger persistence
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2) // initial load + persist
    }, { timeout: 1000 })
  })
})
