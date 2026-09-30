import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  CR_STATUS_SORT_ORDER,
  DEFAULT_SORT_ATTRIBUTES,
  getSortPreferences,
  setSortPreferences,
  SORT_ATTRIBUTES,
} from './sorting'

const SORT_STORAGE_KEY = 'markdown-ticket-sort-preferences'

const DEFAULTS = { selectedAttribute: 'code', selectedDirection: 'desc' }

describe('config/sorting — scoped attributes registry (MDT-249)', () => {
  describe('TEST-sort-attributes-registry', () => {
    it('board scope keeps the pre-change five attributes in order (C6)', () => {
      expect(SORT_ATTRIBUTES.board.map(a => a.name)).toEqual([
        'code',
        'title',
        'priority',
        'dateCreated',
        'lastModified',
      ])
    })

    it('list scope order is Key, Title, Status, Priority, Created, Updated (UX gate)', () => {
      expect(SORT_ATTRIBUTES.list.map(a => a.name)).toEqual([
        'code',
        'title',
        'status',
        'priority',
        'dateCreated',
        'lastModified',
      ])
    })

    it('list-scope Status entry: label Status, default asc (BR-6.1)', () => {
      const status = SORT_ATTRIBUTES.list.find(a => a.name === 'status')
      expect(status).toBeDefined()
      expect(status!.label).toBe('Status')
      expect(status!.defaultDirection).toBe('asc')
    })

    it('board scope offers no Status attribute (BR-6.2)', () => {
      expect(SORT_ATTRIBUTES.board.some(a => a.name === 'status')).toBe(false)
    })

    it('DEFAULT_SORT_ATTRIBUTES stays the board-scope alias (importers keep compiling)', () => {
      expect(DEFAULT_SORT_ATTRIBUTES).toEqual(SORT_ATTRIBUTES.board)
    })

    it('every attribute label is unique within its scope (dropdown/header label match)', () => {
      for (const scope of ['board', 'list'] as const) {
        const labels = SORT_ATTRIBUTES[scope].map(a => a.label)
        expect(new Set(labels).size).toBe(labels.length)
      }
    })

    it('CR_STATUS_SORT_ORDER encodes the lifecycle, not the registry arrays (C4)', () => {
      expect([...CR_STATUS_SORT_ORDER]).toEqual([
        'Proposed',
        'Approved',
        'In Progress',
        'On Hold',
        'Implemented',
        'Partially Implemented',
        'Rejected',
      ])
    })
  })
})

describe('config/sorting — scoped storage (MDT-249)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('TEST-sorting-config-scope-storage', () => {
    it('absent key → per-scope defaults (C1)', () => {
      expect(getSortPreferences('board')).toEqual(DEFAULTS)
      expect(getSortPreferences('list')).toEqual(DEFAULTS)
    })

    it('round-trips per scope', () => {
      setSortPreferences('list', { selectedAttribute: 'title', selectedDirection: 'asc' })
      expect(getSortPreferences('list')).toEqual({ selectedAttribute: 'title', selectedDirection: 'asc' })
    })

    it('writing one scope never clobbers the other (BR-7.1)', () => {
      setSortPreferences('board', { selectedAttribute: 'priority', selectedDirection: 'desc' })
      setSortPreferences('list', { selectedAttribute: 'status', selectedDirection: 'asc' })

      expect(getSortPreferences('board')).toEqual({ selectedAttribute: 'priority', selectedDirection: 'desc' })
      expect(getSortPreferences('list')).toEqual({ selectedAttribute: 'status', selectedDirection: 'asc' })
    })

    it('stores both scopes under the single existing key (C1)', () => {
      setSortPreferences('board', { selectedAttribute: 'title', selectedDirection: 'asc' })
      setSortPreferences('list', { selectedAttribute: 'status', selectedDirection: 'desc' })

      const stored = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY)!)
      expect(stored).toEqual({
        board: { selectedAttribute: 'title', selectedDirection: 'asc' },
        list: { selectedAttribute: 'status', selectedDirection: 'desc' },
      })
    })

    it('stale pre-change flat shape resets both scopes to defaults (Edge-1)', () => {
      localStorage.setItem(
        SORT_STORAGE_KEY,
        JSON.stringify({ selectedAttribute: 'title', selectedDirection: 'asc' }),
      )
      expect(getSortPreferences('board')).toEqual(DEFAULTS)
      expect(getSortPreferences('list')).toEqual(DEFAULTS)
    })

    it('malformed JSON never throws — defaults (Edge-1)', () => {
      localStorage.setItem(SORT_STORAGE_KEY, '{not valid json')
      expect(getSortPreferences('board')).toEqual(DEFAULTS)
      expect(getSortPreferences('list')).toEqual(DEFAULTS)
    })

    it('non-object root resets to defaults (Edge-1)', () => {
      localStorage.setItem(SORT_STORAGE_KEY, '"title"')
      expect(getSortPreferences('list')).toEqual(DEFAULTS)
    })

    it('wrong-typed scope value resets that scope to defaults, keeps the valid one', () => {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({
        board: { selectedAttribute: 'title', selectedDirection: 'asc' },
        list: { selectedAttribute: 42, selectedDirection: 'asc' },
      }))

      expect(getSortPreferences('board')).toEqual({ selectedAttribute: 'title', selectedDirection: 'asc' })
      expect(getSortPreferences('list')).toEqual(DEFAULTS)
    })

    it('invalid direction inside a scope value resets that scope (value-level sanitize)', () => {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({
        board: { selectedAttribute: 'title', selectedDirection: 'sideways' },
      }))

      expect(getSortPreferences('board')).toEqual(DEFAULTS)
    })

    it('setSortPreferences over a stale flat value preserves the other scope via read-modify-write', () => {
      localStorage.setItem(
        SORT_STORAGE_KEY,
        JSON.stringify({ selectedAttribute: 'title', selectedDirection: 'asc' }),
      )
      setSortPreferences('list', { selectedAttribute: 'created' as never, selectedDirection: 'desc' })

      // Board was not representable in the stale shape → default; list holds the write.
      expect(getSortPreferences('board')).toEqual(DEFAULTS)
      expect(getSortPreferences('list')).toEqual({ selectedAttribute: 'created', selectedDirection: 'desc' })
    })
  })
})
