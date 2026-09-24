import type { SidePaneSessionRecord } from './sidePaneSessions'
import { afterEach, describe, expect, it } from 'bun:test'
import {
  clearSidePaneSessionRecord,
  loadSidePaneSessionRecord,
  MAX_SESSION_RECORDS,
  saveSidePaneSessionRecord,

} from './sidePaneSessions'

const KEY = 'mdt-settings-ticket-side-pane-sessions'

afterEach(() => {
  localStorage.clear()
})

function record(projectId: string, ticketKey: string, updatedAt = 1): SidePaneSessionRecord {
  return {
    projectId,
    ticketKey,
    hist: [`docs/${ticketKey.toLowerCase()}.md`],
    hi: 0,
    scrolls: { [`docs/${ticketKey.toLowerCase()}.md`]: 120 },
    titles: { [`docs/${ticketKey.toLowerCase()}.md`]: `Doc ${ticketKey}` },
    updatedAt,
  }
}

describe('sidePaneSessions (per-ticket reading snapshots, UAT r7)', () => {
  it('round-trips a snapshot scoped by project AND ticket', () => {
    saveSidePaneSessionRecord(record('MDT', 'MDT-248'))
    expect(loadSidePaneSessionRecord('MDT', 'MDT-248')?.hist).toEqual(['docs/mdt-248.md'])
    // Same ticket key in another project is a different slot
    expect(loadSidePaneSessionRecord('OTHER', 'MDT-248')).toBeNull()
  })

  it('re-saving an existing ticket moves it to the front without duplicating', () => {
    saveSidePaneSessionRecord(record('MDT', 'A', 1))
    saveSidePaneSessionRecord(record('MDT', 'B', 2))
    saveSidePaneSessionRecord(record('MDT', 'A', 3))
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]') as SidePaneSessionRecord[]
    expect(stored).toHaveLength(2)
    expect(stored[0].ticketKey).toBe('A')
    expect(stored[0].updatedAt).toBe(3)
  })

  it('keeps at most 5 tickets and evicts the least recently used (FILO)', () => {
    for (let i = 1; i <= MAX_SESSION_RECORDS + 2; i++)
      saveSidePaneSessionRecord(record('MDT', `T-${i}`, i))
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]') as SidePaneSessionRecord[]
    expect(stored).toHaveLength(MAX_SESSION_RECORDS)
    // T-1 and T-2 were pushed out; the newest leads
    expect(stored.map(r => r.ticketKey)).toEqual(['T-7', 'T-6', 'T-5', 'T-4', 'T-3'])
    expect(loadSidePaneSessionRecord('MDT', 'T-1')).toBeNull()
  })

  it('re-touching an old ticket protects it from eviction', () => {
    for (let i = 1; i <= 5; i++)
      saveSidePaneSessionRecord(record('MDT', `T-${i}`, i))
    saveSidePaneSessionRecord(record('MDT', 'T-1', 99)) // touch the oldest
    saveSidePaneSessionRecord(record('MDT', 'T-6', 100))
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]') as SidePaneSessionRecord[]
    expect(stored.map(r => r.ticketKey)).toEqual(['T-6', 'T-1', 'T-5', 'T-4', 'T-3'])
  })

  it('prunes scroll and title keys for entries dropped from the history', () => {
    saveSidePaneSessionRecord({
      projectId: 'MDT',
      ticketKey: 'A',
      hist: ['docs/a.md', 'docs/b.md'],
      hi: 1,
      scrolls: { 'docs/a.md': 10, 'docs/b.md': 20, 'docs/gone.md': 30 },
      titles: { 'docs/a.md': 'A', 'docs/b.md': 'B', 'docs/gone.md': 'Gone' },
      updatedAt: 1,
    })
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]') as SidePaneSessionRecord[]
    expect(Object.keys(stored[0].scrolls).sort()).toEqual(['docs/a.md', 'docs/b.md'])
    expect(Object.keys(stored[0].titles).sort()).toEqual(['docs/a.md', 'docs/b.md'])
  })

  it('returns null for stored garbage and drops invalid entries around valid ones', () => {
    localStorage.setItem(KEY, 'not-json')
    expect(loadSidePaneSessionRecord('MDT', 'A')).toBeNull()

    saveSidePaneSessionRecord(record('MDT', 'A'))
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[]
    localStorage.setItem(KEY, JSON.stringify([{ junk: true }, ...stored]))
    expect(loadSidePaneSessionRecord('MDT', 'A')?.ticketKey).toBe('A')
  })

  it('clear forgets exactly one ticket snapshot', () => {
    saveSidePaneSessionRecord(record('MDT', 'A'))
    saveSidePaneSessionRecord(record('MDT', 'B'))
    clearSidePaneSessionRecord('MDT', 'A')
    expect(loadSidePaneSessionRecord('MDT', 'A')).toBeNull()
    expect(loadSidePaneSessionRecord('MDT', 'B')?.ticketKey).toBe('B')
  })
})
