import type { BoardTicket, Ticket } from '../types'
import { CRLevel } from '@mdt/domain-contracts'
import { isProjectedStub } from '../types'

export function getLocalBoardTicket(ticket: BoardTicket): Ticket | null {
  return isProjectedStub(ticket) ? null : ticket
}

export function isEpicTicket(ticket: BoardTicket): ticket is Ticket {
  const localTicket = getLocalBoardTicket(ticket)
  return String(localTicket?.level ?? '').trim().toLowerCase() === CRLevel.EPIC
}
