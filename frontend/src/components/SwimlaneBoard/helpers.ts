import type { BoardTicket, Ticket } from '../../types'
import { CRStatus } from '@mdt/domain-contracts'
import { formatCrKey } from '@mdt/shared/utils/keyNormalizer'
import { getLocalBoardTicket, isEpicTicket as isEpicBoardTicket } from '../../utils/ticketLevels'

export { isEpicTicket } from '../../utils/ticketLevels'

export const NO_EPIC_LANE_KEY = '__none'

export interface EpicProgress {
  done: number
  total: number
  percent: number
}

export interface SwimlaneLane {
  key: string
  title: string
  epic: Ticket | null
  tickets: BoardTicket[]
  progress: EpicProgress
  colorIndex: number
  isNone: boolean
}

const TERMINAL_EPIC_STATUSES = new Set<string>([
  CRStatus.IMPLEMENTED,
  CRStatus.REJECTED,
  CRStatus.PARTIALLY_IMPLEMENTED,
])

function normalizeKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

export function getTicketLaneKey(ticket: Pick<Ticket, 'phaseEpic'>, epicKeys: Set<string>): string {
  const normalizedPhaseEpic = normalizeKey(ticket.phaseEpic)
  if (!normalizedPhaseEpic)
    return NO_EPIC_LANE_KEY

  for (const epicKey of epicKeys) {
    if (normalizeKey(epicKey) === normalizedPhaseEpic)
      return epicKey
  }

  return NO_EPIC_LANE_KEY
}

export function getEpicProgress(tickets: Array<Pick<Ticket, 'status'>>): EpicProgress {
  const total = tickets.length
  const done = tickets.filter(ticket => TERMINAL_EPIC_STATUSES.has(String(ticket.status))).length
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}

export function buildSwimlaneModel(
  tickets: BoardTicket[],
  laneSourceTickets: BoardTicket[] = tickets,
): { lanes: SwimlaneLane[], laneKeyByTicketCode: Map<string, string> } {
  const epics = laneSourceTickets.filter(isEpicBoardTicket)
  const epicKeys = new Set(epics.map(epic => epic.code))
  const visibleLaneTickets = new Map<string, BoardTicket[]>()
  const progressLaneTickets = new Map<string, BoardTicket[]>()
  const laneKeyByTicketCode = new Map<string, string>()

  for (const epic of epics) {
    visibleLaneTickets.set(epic.code, [])
    progressLaneTickets.set(epic.code, [])
  }
  visibleLaneTickets.set(NO_EPIC_LANE_KEY, [])
  progressLaneTickets.set(NO_EPIC_LANE_KEY, [])

  for (const ticket of laneSourceTickets) {
    if (isEpicBoardTicket(ticket))
      continue

    const localTicket = getLocalBoardTicket(ticket)
    const laneKey = localTicket ? getTicketLaneKey(localTicket, epicKeys) : NO_EPIC_LANE_KEY
    const existing = progressLaneTickets.get(laneKey) ?? progressLaneTickets.get(NO_EPIC_LANE_KEY)
    existing?.push(ticket)
  }

  for (const ticket of tickets) {
    if (isEpicBoardTicket(ticket))
      continue

    const localTicket = getLocalBoardTicket(ticket)
    const laneKey = localTicket ? getTicketLaneKey(localTicket, epicKeys) : NO_EPIC_LANE_KEY
    const existing = visibleLaneTickets.get(laneKey) ?? visibleLaneTickets.get(NO_EPIC_LANE_KEY)
    existing?.push(ticket)
    laneKeyByTicketCode.set(ticket.code, laneKey)
  }

  const lanes: SwimlaneLane[] = epics
    .map((epic, index) => {
      const children = visibleLaneTickets.get(epic.code) ?? []
      const progressChildren = progressLaneTickets.get(epic.code) ?? []
      return {
        key: epic.code,
        title: epic.title,
        epic,
        tickets: children,
        progress: getEpicProgress(progressChildren),
        colorIndex: (index % 4) + 1,
        isNone: false,
      }
    })

  lanes.push({
    key: NO_EPIC_LANE_KEY,
    title: 'No epic',
    epic: null,
    tickets: visibleLaneTickets.get(NO_EPIC_LANE_KEY) ?? [],
    progress: getEpicProgress(progressLaneTickets.get(NO_EPIC_LANE_KEY) ?? []),
    colorIndex: 0,
    isNone: true,
  })

  return { lanes, laneKeyByTicketCode }
}

export function canDropTicketInLane(ticket: Pick<Ticket, 'phaseEpic'>, laneKey: string, epicKeys: Set<string>): boolean {
  return getTicketLaneKey(ticket, epicKeys) === laneKey
}

/**
 * Normalize a simplified ticket-key search term ("ABC-12") to the zero-padded
 * stored form ("ABC-012"), mirroring Quick Search's `normalizeTicketKeyTerm`
 * so both surfaces match keys identically. Non-key terms pass through.
 */
function normalizeKeyTerm(term: string): string {
  const match = term.match(/^([a-z]+)-(\d+)$/)
  if (match)
    return formatCrKey(match[1]!.toUpperCase(), Number.parseInt(match[2]!, 10)).toLowerCase()
  return term
}

/**
 * MDT-206 BR-6.1 (UAT round 7): does a ticket match the swimlane toolbar
 * search query? Only the title (case-insensitive substring) and the ticket
 * key are searched — no other field. Key matching accepts:
 * - the full zero-padded key ("ABC-012"),
 * - the bare number ("12", substring of the key's number part, so zero-pad
 *   differences don't matter),
 * - the simplified key ("ABC-12", normalized to zero-padded before compare).
 */
export function matchesTicketSearch(
  ticket: { code: string, title: string },
  query: string,
): boolean {
  const term = query.trim().toLowerCase()
  if (!term)
    return true

  const code = ticket.code.toLowerCase()
  const keyNum = code.split('-')[1] ?? ''
  const normalizedTerm = normalizeKeyTerm(term)

  if (code === term || code === normalizedTerm || code.includes(normalizedTerm))
    return true
  if (keyNum === term || keyNum.includes(term))
    return true
  return ticket.title.toLowerCase().includes(term)
}

/**
 * Filter the epic lane list itself (MDT-206 BR-6.1, UAT round 8):
 * - an epic lane is kept when its epic key/title matches the query, or when
 *   any child ticket matches;
 * - an epic match shows the whole lane (the user found the epic);
 * - a child-only match narrows the lane to the matching tickets;
 * - the No-epic lane is kept only when one of its tickets matches (narrowed).
 * Epic progress is intentionally kept from the full child set (search is
 * presentation-only).
 */
export function filterLanesBySearch(
  lanes: SwimlaneLane[],
  query: string,
): SwimlaneLane[] {
  if (!query.trim())
    return lanes
  return lanes
    .map((lane) => {
      const epicMatches = !!lane.epic && matchesTicketSearch(
        { code: lane.key, title: lane.title },
        query,
      )
      if (epicMatches)
        return { lane, keep: true }
      return {
        lane: { ...lane, tickets: lane.tickets.filter(ticket => matchesTicketSearch(ticket, query)) },
        keep: false,
      }
    })
    .filter(({ lane, keep }) => keep || lane.tickets.length > 0)
    .map(({ lane }) => lane)
}

export interface LaneVisibilityOptions {
  hideEmpty: boolean
  showClosed: boolean
  /**
   * MDT-246: key of the focused lane (the `?epic=` token, while focus is
   * active). The focused lane is exempt from both filters — arrival must land
   * on the lane even when it is empty or closed. Null/unknown keys filter
   * exactly as before (BR-1.6).
   */
  focusedKey?: string | null
}

/**
 * Apply the toolbar visibility filters to the lane list:
 * - `hideEmpty`: omit lanes with zero tickets (the `__none` lane is never hidden).
 * - `showClosed`: when false, omit epic lanes whose epic is in a terminal
 *   (Implemented) status — closed epics are hidden by default so the board
 *   focuses on active work. The `__none` lane is never hidden by this filter.
 * - `focusedKey`: the focused lane is always kept (MDT-246 focused arrival).
 */
export function filterLanesByVisibility(
  lanes: SwimlaneLane[],
  options: LaneVisibilityOptions,
): SwimlaneLane[] {
  const { hideEmpty, showClosed, focusedKey = null } = options
  return lanes.filter((lane) => {
    if (lane.isNone)
      return true
    if (focusedKey === lane.key)
      return true
    if (!showClosed && lane.epic?.status === CRStatus.IMPLEMENTED)
      return false
    if (hideEmpty && lane.tickets.length === 0)
      return false
    return true
  })
}
