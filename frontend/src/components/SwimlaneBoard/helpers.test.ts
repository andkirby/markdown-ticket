import type { Ticket } from '../../types'
import { CRLevel, CRStatus } from '@mdt/domain-contracts'
import {
  buildSwimlaneModel,
  filterLanesBySearch,
  filterLanesByVisibility,
  getEpicProgress,
  getTicketLaneKey,
  isEpicTicket,
  matchesTicketSearch,
  NO_EPIC_LANE_KEY,
} from './helpers'

function ticket(overrides: Partial<Ticket>): Ticket {
  return {
    code: 'MDT-000',
    title: 'Ticket',
    status: CRStatus.PROPOSED,
    type: 'Feature Enhancement',
    priority: 'Medium',
    dateCreated: new Date('2026-08-08T00:00:00Z'),
    lastModified: new Date('2026-08-08T00:00:00Z'),
    filePath: '',
    content: '',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
    ...overrides,
  } as Ticket
}

describe('SwimlaneBoard helpers', () => {
  it('recognizes explicit epic level values from ticket metadata', () => {
    expect(isEpicTicket(ticket({ level: CRLevel.EPIC }))).toBe(true)
    expect(isEpicTicket(ticket({ level: ' epic ' as Ticket['level'] }))).toBe(true)
    expect(isEpicTicket(ticket({ level: CRLevel.TICKET }))).toBe(false)
  })

  it('builds explicit epic lanes, excludes epic cards, and keeps No epic last', () => {
    const epic = ticket({
      code: 'MDT-100',
      title: 'Platform Epic',
      level: CRLevel.EPIC,
      status: CRStatus.APPROVED,
    })
    const child = ticket({
      code: 'MDT-101',
      title: 'Child',
      phaseEpic: 'MDT-100',
      status: CRStatus.IN_PROGRESS,
    })
    const orphan = ticket({
      code: 'MDT-102',
      title: 'Orphan',
      phaseEpic: 'MDT-999',
      status: CRStatus.PROPOSED,
    })

    const model = buildSwimlaneModel([epic, child, orphan])

    expect(model.lanes.map(lane => lane.key)).toEqual(['MDT-100', NO_EPIC_LANE_KEY])
    expect(model.lanes[0].tickets.map(t => t.code)).toEqual(['MDT-101'])
    expect(model.lanes[1].tickets.map(t => t.code)).toEqual(['MDT-102'])
  })

  it('keeps epic lanes from the unfiltered lane source when visible tickets are filtered', () => {
    const epic = ticket({
      code: 'MDT-225',
      title: 'Epic level model and swimlane board',
      level: CRLevel.EPIC,
      status: CRStatus.APPROVED,
    })
    const visibleChild = ticket({
      code: 'MDT-206',
      title: 'Visible child',
      phaseEpic: 'MDT-225',
      status: CRStatus.IN_PROGRESS,
    })
    const hiddenDoneChild = ticket({
      code: 'MDT-205',
      title: 'Hidden done child',
      phaseEpic: 'MDT-225',
      status: CRStatus.IMPLEMENTED,
    })

    const model = buildSwimlaneModel([visibleChild], [epic, visibleChild, hiddenDoneChild])

    expect(model.lanes.map(lane => lane.key)).toEqual(['MDT-225', NO_EPIC_LANE_KEY])
    expect(model.lanes[0].tickets.map(t => t.code)).toEqual(['MDT-206'])
    expect(model.lanes[0].progress).toEqual({ done: 1, total: 2, percent: 50 })
  })

  it('keeps childless proposed epics as lanes until hide-empty UI filtering is applied', () => {
    const emptyEpic = ticket({
      code: 'MDT-225',
      title: 'Childless Proposed Epic',
      level: CRLevel.EPIC,
      status: CRStatus.PROPOSED,
    })

    const model = buildSwimlaneModel([emptyEpic])

    expect(model.lanes.map(lane => lane.key)).toEqual(['MDT-225', NO_EPIC_LANE_KEY])
    expect(model.lanes[0].tickets).toEqual([])
    expect(model.lanes[0].progress).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it('computes progress from terminal children only', () => {
    const progress = getEpicProgress([
      ticket({ code: 'MDT-101', status: CRStatus.IMPLEMENTED }),
      ticket({ code: 'MDT-102', status: CRStatus.REJECTED }),
      ticket({ code: 'MDT-103', status: CRStatus.PARTIALLY_IMPLEMENTED }),
      ticket({ code: 'MDT-104', status: CRStatus.IN_PROGRESS }),
    ])

    expect(progress.done).toBe(3)
    expect(progress.total).toBe(4)
    expect(progress.percent).toBe(75)
  })

  it('keeps lane key resolution status-only and falls back for invalid epic targets', () => {
    const epics = new Set(['MDT-100'])

    expect(getTicketLaneKey(ticket({ phaseEpic: 'MDT-100' }), epics)).toBe('MDT-100')
    expect(getTicketLaneKey(ticket({ phaseEpic: 'mdt-100' }), epics)).toBe('MDT-100')
    expect(getTicketLaneKey(ticket({ phaseEpic: 'MDT-999' }), epics)).toBe(NO_EPIC_LANE_KEY)
    expect(getTicketLaneKey(ticket({ phaseEpic: '' }), epics)).toBe(NO_EPIC_LANE_KEY)
  })

  describe('filterLanesByVisibility', () => {
    const openEpic = { key: 'MDT-100', title: 'Open Epic', isNone: false, epic: { status: CRStatus.APPROVED }, tickets: [{ code: 'MDT-101' }] } as never
    const closedEpic = { key: 'MDT-200', title: 'Closed Epic', isNone: false, epic: { status: CRStatus.IMPLEMENTED }, tickets: [{ code: 'MDT-201' }] } as never
    const noEpicLane = { key: NO_EPIC_LANE_KEY, title: 'No epic', isNone: true, epic: null, tickets: [{ code: 'MDT-001' }] } as never

    it('hides closed (Implemented) epic lanes when showClosed is false', () => {
      const lanes = [openEpic, closedEpic, noEpicLane] as never
      const result = filterLanesByVisibility(lanes, { hideEmpty: false, showClosed: false })
      expect(result.map(l => l.key)).toEqual(['MDT-100', NO_EPIC_LANE_KEY])
    })

    it('keeps closed epic lanes when showClosed is true', () => {
      const lanes = [openEpic, closedEpic, noEpicLane] as never
      const result = filterLanesByVisibility(lanes, { hideEmpty: false, showClosed: true })
      expect(result.map(l => l.key)).toEqual(['MDT-100', 'MDT-200', NO_EPIC_LANE_KEY])
    })

    it('the No-epic lane is never hidden by the show-closed filter', () => {
      const lanes = [noEpicLane] as never
      const result = filterLanesByVisibility(lanes, { hideEmpty: false, showClosed: false })
      expect(result.map(l => l.key)).toEqual([NO_EPIC_LANE_KEY])
    })

    it('hide-empty still omits zero-ticket lanes (in addition to show-closed)', () => {
      const emptyOpen = { ...openEpic, tickets: [] } as never
      const lanes = [emptyOpen, openEpic, noEpicLane] as never
      const result = filterLanesByVisibility(lanes, { hideEmpty: true, showClosed: false })
      expect(result.map(l => l.key)).toEqual(['MDT-100', NO_EPIC_LANE_KEY])
    })
  })
})

describe('SwimlaneBoard toolbar search (MDT-206 BR-6.1, UAT round 7)', () => {
  it('matches the full zero-padded key', () => {
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, 'ABC-012')).toBe(true)
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, 'abc-012')).toBe(true)
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, 'ABC-013')).toBe(false)
  })

  it('matches the bare number regardless of zero-padding', () => {
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, '12')).toBe(true)
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, '012')).toBe(true)
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, '7')).toBe(false)
  })

  it('matches the simplified key by normalizing to zero-padded form', () => {
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, 'ABC-12')).toBe(true)
    expect(matchesTicketSearch({ code: 'MDT-206', title: 'Swimlanes' }, 'mdt-206')).toBe(true)
  })

  it('matches the title case-insensitively as a substring, and nothing else', () => {
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login flow' }, 'LOGIN')).toBe(true)
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login flow' }, 'login')).toBe(true)
    // Description-like words that appear nowhere in title or key do not match.
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login flow' }, 'oauth')).toBe(false)
  })

  it('treats an empty/whitespace query as match-all', () => {
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, '')).toBe(true)
    expect(matchesTicketSearch({ code: 'ABC-012', title: 'Fix login' }, '   ')).toBe(true)
  })

  it('filterLanesBySearch narrows lane tickets, preserves progress, and does not mutate input lanes', () => {
    const epic = ticket({ code: 'MDT-100', title: 'Platform Epic', status: CRStatus.APPROVED, level: CRLevel.EPIC })
    const a = ticket({ code: 'MDT-101', title: 'OAuth PKCE', phaseEpic: 'MDT-100' })
    const b = ticket({ code: 'MDT-102', title: 'Rate limits', phaseEpic: 'MDT-100' })
    const { lanes } = buildSwimlaneModel([epic, a, b], [epic, a, b])
    const epicLane = lanes.find(lane => lane.key === 'MDT-100')!

    const filtered = filterLanesBySearch(lanes, 'oauth')
    const filteredEpicLane = filtered.find(lane => lane.key === 'MDT-100')!
    expect(filteredEpicLane.tickets.map(t => t.code)).toEqual(['MDT-101'])

    // Progress is presentation-only: kept from the full child set.
    expect(filteredEpicLane.progress.total).toBe(epicLane.progress.total)
    // Input lanes untouched (original still holds both tickets).
    expect(epicLane.tickets.map(t => t.code)).toEqual(['MDT-101', 'MDT-102'])
  })

  it('filterLanesBySearch returns the same lanes when the query is empty', () => {
    const { lanes } = buildSwimlaneModel([], [])
    expect(filterLanesBySearch(lanes, '  ')).toBe(lanes)
  })

  it('keeps the whole lane when the epic key or title matches', () => {
    const epic = ticket({ code: 'MDT-100', title: 'Platform Epic', status: CRStatus.APPROVED, level: CRLevel.EPIC })
    const a = ticket({ code: 'MDT-101', title: 'OAuth PKCE', phaseEpic: 'MDT-100' })
    const b = ticket({ code: 'MDT-102', title: 'Rate limits', phaseEpic: 'MDT-100' })
    const { lanes } = buildSwimlaneModel([epic, a, b], [epic, a, b])

    // Epic title match → whole lane visible, all tickets shown.
    const byTitle = filterLanesBySearch(lanes, 'platform')
    const laneByTitle = byTitle.find(l => l.key === 'MDT-100')
    expect(laneByTitle).toBeDefined()
    expect(laneByTitle!.tickets.map(t => t.code).sort()).toEqual(['MDT-101', 'MDT-102'])

    // Epic key match (bare number) → whole lane visible.
    const byKey = filterLanesBySearch(lanes, '100')
    const laneByKey = byKey.find(l => l.key === 'MDT-100')
    expect(laneByKey).toBeDefined()
    expect(laneByKey!.tickets.map(t => t.code).sort()).toEqual(['MDT-101', 'MDT-102'])
  })

  it('removes epic lanes and the No-epic lane when nothing matches (filters the lane list)', () => {
    const epic = ticket({ code: 'MDT-100', title: 'Platform Epic', status: CRStatus.APPROVED, level: CRLevel.EPIC })
    const other = ticket({ code: 'MDT-200', title: 'Other Epic', status: CRStatus.APPROVED, level: CRLevel.EPIC })
    const a = ticket({ code: 'MDT-101', title: 'OAuth PKCE', phaseEpic: 'MDT-100' })
    const orphan = ticket({ code: 'MDT-001', title: 'Orphan work' })
    const { lanes } = buildSwimlaneModel([epic, other, a, orphan], [epic, other, a, orphan])

    // 'oauth' matches only MDT-101 → MDT-100 lane kept (narrowed), MDT-200 and No-epic removed.
    const filtered = filterLanesBySearch(lanes, 'oauth')
    expect(filtered.map(l => l.key)).toEqual(['MDT-100'])
    expect(filtered[0]!.tickets.map(t => t.code)).toEqual(['MDT-101'])

    // A query matching nothing removes every lane.
    expect(filterLanesBySearch(lanes, 'xyz nothing')).toEqual([])

    // A query matching only the No-epic orphan keeps just the No-epic lane.
    const byOrphan = filterLanesBySearch(lanes, 'orphan')
    expect(byOrphan.map(l => l.key)).toEqual([NO_EPIC_LANE_KEY])
    expect(byOrphan[0]!.tickets.map(t => t.code)).toEqual(['MDT-001'])
  })
})
