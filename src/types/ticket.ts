import type { CRPriorities, CRStatusValue, CRTypes } from '@mdt/domain-contracts'
import type { Ticket } from '@mdt/domain-contracts'
import type { CR_STATUSES } from '@mdt/shared/models/Types'
import { TicketSchema } from '@mdt/domain-contracts'

export type { Ticket } from '@mdt/domain-contracts'

// Ticket Update Interface
interface _TicketUpdate {
  code: string
  updates: Partial<Ticket>
  updateImplementationDate?: boolean
}

// File Event Types
interface _FileEvent {
  type: 'create' | 'update' | 'delete'
  filePath: string
  cr?: Ticket
}

// Suggestion Interface
interface _Suggestion {
  code: string
  title: string
  type: string
  status: string
  matchScore: number
}

export { TicketSchema }

// MDT-095: Helper function to check if ticket is in a worktree
export function isTicketInWorktree(ticket: Partial<Ticket>): boolean {
  return ticket.inWorktree === true
}

// Status Enum Values - imported from shared types
export type Status = CRStatusValue | typeof CR_STATUSES[number]

// Type Enum Values - imported from domain-contracts
type _Type = typeof CRTypes[number]

// Priority Enum Values - imported from domain-contracts
type _Priority = typeof CRPriorities[number]
