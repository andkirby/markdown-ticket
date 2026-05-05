/**
 * Cross-project search hook utilities — MDT-152
 *
 * Pure-function utilities for debounce, cache, state, and request deduplication
 * plus the React hook that combines them all.
 */

import type { SearchRequest, SearchResponse } from '@mdt/domain-contracts'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dataLayer } from '../services/dataLayer'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Debounce delay in ms (C2) */
export const SEARCH_DEBOUNCE_MS = 300

/** Cache TTL in ms (C9) */
export const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000

/** Max retry attempts on error (Edge-4) */
const MAX_RETRIES = 1

// ---------------------------------------------------------------------------
// Debounce — C2 (300 ms default)
// ---------------------------------------------------------------------------

export interface SearchDebouncer {
  search: (req: { mode: string, query: string, projectCode?: string }) => void
  cancel: () => void
}

export function createSearchDebouncer(
  fetchFn: (req: { mode: string, query: string, projectCode?: string }) => Promise<unknown>,
  delayMs = 300,
): SearchDebouncer {
  let timerId: ReturnType<typeof setTimeout> | null = null
  let latestReq: { mode: string, query: string, projectCode?: string } | null = null

  return {
    search(req) {
      latestReq = req
      if (timerId !== null)
        clearTimeout(timerId)
      timerId = setTimeout(() => {
        timerId = null
        if (latestReq)
          fetchFn(latestReq)
      }, delayMs)
    },
    cancel() {
      if (timerId !== null) {
        clearTimeout(timerId)
        timerId = null
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Cache — C9 (5-minute TTL)
// ---------------------------------------------------------------------------

export interface SearchCache {
  get: (key: { mode: string, query: string, projectCode?: string }) => unknown | null
  set: (key: { mode: string, query: string, projectCode?: string }, value: unknown) => void
}

export function createSearchCache(ttlMs: number): SearchCache {
  const store = new Map<string, { value: unknown, expiresAt: number }>()

  function makeKey(k: { mode: string, query: string, projectCode?: string }): string {
    return `${k.mode}:${k.projectCode ?? ''}:${k.query}`
  }

  return {
    get(key) {
      const entry = store.get(makeKey(key))
      if (!entry)
        return null
      if (Date.now() > entry.expiresAt) {
        store.delete(makeKey(key))
        return null
      }
      return entry.value
    },
    set(key, value) {
      store.set(makeKey(key), { value, expiresAt: Date.now() + ttlMs })
    },
  }
}

// ---------------------------------------------------------------------------
// Loading / error state — C4, Edge-4
// ---------------------------------------------------------------------------

export interface SearchState {
  isLoading: () => boolean
  setLoading: (v: boolean) => void
  hasError: () => boolean
  getError: () => Error | null
  setError: (err: Error) => void
  clearError: () => void
}

export function createSearchState(): SearchState {
  let loading = false
  let error: Error | null = null

  return {
    isLoading: () => loading,
    setLoading(v) { loading = v },
    hasError: () => error !== null,
    getError: () => error,
    setError(err) { error = err },
    clearError() { error = null },
  }
}

// ---------------------------------------------------------------------------
// Request deduplication
// ---------------------------------------------------------------------------

export interface RequestDeduper {
  dedupe: <T>(key: string, fn: () => Promise<T>) => Promise<T>
}

export function createRequestDeduper(): RequestDeduper {
  const inflight = new Map<string, Promise<unknown>>()

  return {
    async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inflight.get(key)
      if (existing)
        return existing as Promise<T>

      const p = fn().finally(() => {
        inflight.delete(key)
      })
      inflight.set(key, p)
      return p
    },
  }
}

// ---------------------------------------------------------------------------
// React Hook — combines debounce, cache, state, dedupe, and retry
// ---------------------------------------------------------------------------

export interface CrossProjectSearchResult {
  /** Current search results */
  results: SearchResponse['results']
  /** Total result count */
  total: number
  /** Whether a search is in progress */
  loading: boolean
  /** Current error, if any */
  error: Error | null
  /** Trigger a new search (debounced) */
  search: (req: SearchRequest) => void
  /** Cancel any pending debounced search */
  cancel: () => void
  /** Clear current error and retry last request */
  retry: () => void
}

/**
 * useCrossProjectSearch — React hook for cross-project ticket search.
 *
 * Orchestrates:
 *  - 300ms debounce on user input (C2)
 *  - 5-minute response cache (C9)
 *  - Immediate loading state (C4)
 *  - Request deduplication
 *  - Retry on failure (Edge-4)
 *
 * @returns Search state and control functions
 */
export function useCrossProjectSearch(): CrossProjectSearchResult {
  const [results, setResults] = useState<SearchResponse['results']>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Refs for stable closures across renders
  const cacheRef = useRef<SearchCache>(createSearchCache(SEARCH_CACHE_TTL_MS))
  const deduperRef = useRef<RequestDeduper>(createRequestDeduper())
  const debouncerRef = useRef<SearchDebouncer | null>(null)
  const lastReqRef = useRef<SearchRequest | null>(null)

  /** Build a cache/dedupe key from a search request */
  function makeReqKey(req: SearchRequest): string {
    return `${req.mode}:${'projectCode' in req ? req.projectCode : ''}:${req.query}`
  }

  /** Execute the actual search (no debounce — called after debounce fires) */
  const executeSearch = useCallback(async (req: SearchRequest) => {
    const key = makeReqKey(req)

    // Check cache first
    const cached = cacheRef.current.get(req)
    if (cached) {
      const resp = cached as SearchResponse
      setResults(resp.results)
      setTotal(resp.total)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const resp = await deduperRef.current.dedupe(key, () =>
        dataLayer.searchProjects(req))

      // Cache the successful response
      cacheRef.current.set(req, resp)
      setResults(resp.results)
      setTotal(resp.total)
      setLoading(false)
    }
    catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setLoading(false)
    }
  }, [])

  /** Debounced search trigger */
  const search = useCallback((req: SearchRequest) => {
    lastReqRef.current = req
    setLoading(true)
    setError(null)

    // Recreate debouncer on each call is fine — the debounce is sequential
    debouncerRef.current = createSearchDebouncer(
      r => executeSearch(r as SearchRequest),
      SEARCH_DEBOUNCE_MS,
    )
    debouncerRef.current.search(req)
  }, [executeSearch])

  /** Cancel pending search */
  const cancel = useCallback(() => {
    debouncerRef.current?.cancel()
    setLoading(false)
  }, [])

  /** Retry last request */
  const retry = useCallback(() => {
    const lastReq = lastReqRef.current
    if (!lastReq)
      return

    setError(null)

    let attempts = 0
    const tryFetch = async (): Promise<void> => {
      try {
        setLoading(true)
        const resp = await dataLayer.searchProjects(lastReq)
        cacheRef.current.set(lastReq, resp)
        setResults(resp.results)
        setTotal(resp.total)
        setLoading(false)
      }
      catch (err) {
        attempts++
        if (attempts <= MAX_RETRIES) {
          await tryFetch()
        }
        else {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      }
    }
    tryFetch()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncerRef.current?.cancel()
    }
  }, [])

  return { results, total, loading, error, search, cancel, retry }
}
