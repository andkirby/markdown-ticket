import type { TicketFilters } from '@mdt/domain-contracts'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  clearFilterPreferences,
  getFilterPreferences,
  sanitizeFilters,
  setFilterPreferences,
} from './filterPreferences'

describe('filterPreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('round-trip', () => {
    it('persists and restores a populated filter', () => {
      const filters: TicketFilters = { status: ['In Progress', 'Approved'], priority: 'High', query: 'login' }
      setFilterPreferences(filters)
      expect(getFilterPreferences()).toEqual(filters)
    })

    it('round-trips a single-value facet stored as a string', () => {
      setFilterPreferences({ type: 'Bug Fix' })
      expect(getFilterPreferences()).toEqual({ type: 'Bug Fix' })
    })

    it('round-trips inWorktree boolean', () => {
      setFilterPreferences({ inWorktree: true })
      expect(getFilterPreferences()).toEqual({ inWorktree: true })
    })
  })

  describe('S1 — empty default', () => {
    it('returns empty when nothing is stored', () => {
      expect(getFilterPreferences()).toEqual({})
    })
  })

  describe('S22 — invalid shape never throws, resets to empty', () => {
    it('invalid JSON resets to empty', () => {
      localStorage.setItem('markdown-ticket-filter-preferences', '{not valid json')
      expect(getFilterPreferences()).toEqual({})
    })

    it('wrong shape (number status) resets to empty', () => {
      // sanitizeFilters drops the bad field; with nothing else valid, returns {}.
      expect(sanitizeFilters({ status: 123 })).toEqual({})
    })

    it('array with non-string elements drops the field', () => {
      expect(sanitizeFilters({ status: ['In Progress', 42] })).toEqual({})
    })

    it('non-object root returns empty', () => {
      expect(sanitizeFilters('hello')).toEqual({})
      expect(sanitizeFilters(null)).toEqual({})
      expect(sanitizeFilters([1, 2, 3])).toEqual({})
    })

    it('keeps valid fields and drops invalid ones from a mixed object', () => {
      const result = sanitizeFilters({ status: ['In Progress'], bogus: 'drop me', priority: 99 })
      expect(result).toEqual({ status: ['In Progress'] })
    })

    it('unknown keys do not survive', () => {
      const result = sanitizeFilters({ status: ['Approved'], unknownFacet: ['x'] })
      expect(result).toEqual({ status: ['Approved'] })
      expect('unknownFacet' in result).toBe(false)
    })
  })

  describe('clearFilterPreferences', () => {
    it('removes stored preferences', () => {
      setFilterPreferences({ status: ['In Progress'] })
      clearFilterPreferences()
      expect(getFilterPreferences()).toEqual({})
    })
  })
})
