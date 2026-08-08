import type { BoardTicket, Ticket } from '../../types'
import { CRStatus } from '@mdt/domain-contracts'
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
