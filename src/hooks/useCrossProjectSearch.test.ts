/**
 * useCrossProjectSearch Hook Tests - MDT-152
 *
 * Tests for debounce timing (C2), cache TTL (C9), loading state (C4),
 * request deduplication, retry behavior, and error handling (Edge-4).
 *
 * RED tests — will fail until useCrossProjectSearch hook is implemented.
 *
 * Note: These are unit tests for the hook's logic. The hook will be tested
 * using renderHook from @testing-library/react or by testing the extracted
 * pure functions directly.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test'

// The hook's pure utility functions will be exported for testing
// useCrossProjectSearch itself requires React rendering context

describe('useCrossProjectSearch — MDT-152', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('debounce timing — C2', () => {
    it('does not trigger search before 300ms debounce', async () => {
      const { createSearchDebouncer } = await import('./useCrossProjectSearch')

      const mockFetch = jest.fn().mockResolvedValue({ results: [], total: 0 })
      const debouncer = createSearchDebouncer(mockFetch, 300)

      debouncer.search({ mode: 'ticket_key', query: 'ABC-42' })

      // Advance less than 300ms
      jest.advanceTimersByTime(200)

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('triggers search after 300ms debounce', async () => {
      const { createSearchDebouncer } = await import('./useCrossProjectSearch')

      const mockFetch = jest.fn().mockResolvedValue({ results: [], total: 0 })
      const debouncer = createSearchDebouncer(mockFetch, 300)

      debouncer.search({ mode: 'ticket_key', query: 'ABC-42' })

      jest.advanceTimersByTime(300)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('resets debounce timer on rapid keystrokes', async () => {
      const { createSearchDebouncer } = await import('./useCrossProjectSearch')

      const mockFetch = jest.fn().mockResolvedValue({ results: [], total: 0 })
      const debouncer = createSearchDebouncer(mockFetch, 300)

      debouncer.search({ mode: 'ticket_key', query: 'ABC-4' })
      jest.advanceTimersByTime(200)

      debouncer.search({ mode: 'ticket_key', query: 'ABC-42' })
      jest.advanceTimersByTime(200)

      // 200 + 200 = 400ms total, but second call reset the timer
      expect(mockFetch).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100) // Now 300ms since last keystroke
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'ABC-42' }),
      )
    })

    it('cancels pending search when cancel() is called', async () => {
      const { createSearchDebouncer } = await import('./useCrossProjectSearch')

      const mockFetch = jest.fn().mockResolvedValue({ results: [], total: 0 })
      const debouncer = createSearchDebouncer(mockFetch, 300)

      debouncer.search({ mode: 'ticket_key', query: 'ABC-42' })
      debouncer.cancel()

      jest.advanceTimersByTime(400)

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('cache — C9 (5-minute TTL)', () => {
    it('returns cached results for identical requests within TTL', async () => {
      const { createSearchCache } = await import('./useCrossProjectSearch')

      const cache = createSearchCache(5 * 60 * 1000) // 5 min

      const mockResults = {
        results: [{ ticket: { code: 'ABC-42', title: 'Test' }, project: { code: 'ABC', name: 'Project ABC' } }],
        total: 1,
      }

      // Store in cache
      cache.set({ mode: 'ticket_key', query: 'ABC-42', projectCode: undefined }, mockResults)
      const cached = cache.get({ mode: 'ticket_key', query: 'ABC-42', projectCode: undefined })

      expect(cached).toEqual(mockResults)
    })

    it('returns null for cache miss', async () => {
      const { createSearchCache } = await import('./useCrossProjectSearch')

      const cache = createSearchCache(5 * 60 * 1000)

      const cached = cache.get({ mode: 'ticket_key', query: 'XYZ-99', projectCode: undefined })
      expect(cached).toBeNull()
    })

    it('expires entries after TTL', async () => {
      const { createSearchCache } = await import('./useCrossProjectSearch')

      const cache = createSearchCache(5 * 60 * 1000)

      cache.set(
        { mode: 'ticket_key', query: 'ABC-42', projectCode: undefined },
        { results: [], total: 0 },
      )

      // Advance past TTL
      jest.advanceTimersByTime(5 * 60 * 1000 + 1)

      const cached = cache.get({ mode: 'ticket_key', query: 'ABC-42', projectCode: undefined })
      expect(cached).toBeNull()
    })

    it('includes mode, projectCode, and query in cache key', async () => {
      const { createSearchCache } = await import('./useCrossProjectSearch')

      const cache = createSearchCache(5 * 60 * 1000)

      cache.set(
        { mode: 'ticket_key', query: 'ABC-42', projectCode: undefined },
        { results: [{ ticket: { code: 'ABC-42', title: 'Test' }, project: { code: 'ABC', name: 'ABC' } }], total: 1 },
      )

      // Different mode should not hit cache
      const cachedDifferent = cache.get({ mode: 'project_scope', query: 'ABC-42', projectCode: 'ABC' })
      expect(cachedDifferent).toBeNull()
    })
  })

  describe('loading state — C4', () => {
    it('sets loading to true immediately when search starts', async () => {
      const { createSearchState } = await import('./useCrossProjectSearch')

      const state = createSearchState()
      expect(state.isLoading()).toBe(false)

      state.setLoading(true)
      expect(state.isLoading()).toBe(true)
    })

    it('sets loading to false when search completes', async () => {
      const { createSearchState } = await import('./useCrossProjectSearch')

      const state = createSearchState()
      state.setLoading(true)
      state.setLoading(false)

      expect(state.isLoading()).toBe(false)
    })

    it('sets error state on fetch failure', async () => {
      const { createSearchState } = await import('./useCrossProjectSearch')

      const state = createSearchState()
      const error = new Error('Network failure')

      state.setError(error)

      expect(state.hasError()).toBe(true)
      expect(state.getError()).toBe(error)
    })

    it('clears error on retry', async () => {
      const { createSearchState } = await import('./useCrossProjectSearch')

      const state = createSearchState()
      state.setError(new Error('Network failure'))
      state.clearError()

      expect(state.hasError()).toBe(false)
      expect(state.getError()).toBeNull()
    })
  })

  describe('retry behavior — Edge-4', () => {
    it('retry clears error state before re-fetching', async () => {
      const { createSearchState } = await import('./useCrossProjectSearch')

      const state = createSearchState()
      state.setError(new Error('Network failure'))

      // Retry should clear error
      state.clearError()
      expect(state.hasError()).toBe(false)
    })
  })

  describe('request deduplication', () => {
    it('does not send duplicate requests for identical in-flight queries', async () => {
      const { createRequestDeduper } = await import('./useCrossProjectSearch')

      const deduper = createRequestDeduper()

      let resolveFirst: (value: unknown) => void
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve
      })

      const mockFetch = jest.fn()
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValue({ results: [], total: 0 })

      const key = 'ticket_key:ABC-42'

      // Two concurrent calls with same key
      const p1 = deduper.dedupe(key, mockFetch)
      const p2 = deduper.dedupe(key, mockFetch)

      // Only one fetch call should be made
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Resolve
      resolveFirst!({ results: [], total: 0 })

      // Both should get the same result
      const [r1, r2] = await Promise.all([p1, p2])
      expect(r1).toEqual(r2)
    })
  })
})
