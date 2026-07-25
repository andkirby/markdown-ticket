import type { CRPriorities, CRStatusValue, CRTypes, Ticket } from '@mdt/domain-contracts'
import type { CR_STATUSES } from '@mdt/shared/models/Types'
import { TicketSchema } from '@mdt/domain-contracts'

export type { Ticket } from '@mdt/domain-contracts'

/**
 * A discriminator-tagged union over board items so the board can render local
 * tickets (editable, draggable) and cloud-projected stubs (read-only, non-
 * draggable) from one merged list (MDT-200 Slice U5).
 *
 * `kind` is the only field that reliably distinguishes source: a projected stub
 * shares the approved header fields (code/title/status/type/priority/assignee/
 * dates) but has NO content and NO local filePath (BR-3.1, BR-3.4).
 */
export type BoardTicket = Ticket | ProjectedStubTicket

/**
 * A cloud-projected ticket header with no canonical Markdown file locally.
 *
 * Carries ONLY the approved projected fields — never a body, description, or
 * comments (BR-3.1). `content` is intentionally absent; `filePath` is empty to
 * signal "no local file". `relatedTickets`/`dependsOn`/`blocks` are empty
 * because relationships are not part of the projection.
 */
export interface ProjectedStubTicket {
  /** Discriminator: always 'projected'. */
  readonly kind: 'projected'
  code: string
  title: string
  status: string
  type: string
  priority: string
  dateCreated: Date | null
  lastModified: Date | null
  /** Intentionally empty — a stub has no local file (BR-3.4). */
  filePath: string
  /** Intentionally empty — projection excludes the body (BR-3.1). */
  content: string
  assignee?: string
  relatedTickets: string[]
  dependsOn: string[]
  blocks: string[]
}

/** Type guard: is this board item a cloud-projected stub? */
export function isProjectedStub(ticket: BoardTicket): ticket is ProjectedStubTicket {
  return (ticket as ProjectedStubTicket).kind === 'projected'
}

/**
 * Narrow an arbitrary board ticket to a plain Ticket, projecting the subset of
 * fields the board grouping needs. Local tickets pass through unchanged.
 *
 * A stub has no local content/filePath; exposed values are empty so existing
 * code paths that read these fields do not throw.
 */
export function asTicket(ticket: BoardTicket): Ticket {
  if (!isProjectedStub(ticket))
    return ticket
  const { ...rest } = ticket
  return {
    ...rest,
    filePath: '',
    content: '',
  } as unknown as Ticket
}

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
