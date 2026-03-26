import type { Ticket, TicketFilters } from '../../models/Ticket.js'
import type { ProjectConfig } from '../../models/Project.js'
import type { ReadResult, WriteResult } from '../project/types.js'

export interface ResolvedTicketLocation {
  projectRoot: string
  ticketDir: string
  ticketsPath: string
  isWorktree: boolean
}

export interface SubdocumentReadResult {
  code: string
  content: string
  dateCreated: Date | null
  lastModified: Date | null
}

export interface NamespaceParseResult {
  namespace: string
  subKey: string
}

export interface ProjectConfigLookup {
  getProjectConfig: (path: string) => ProjectConfig | null
}

export type AttrOp = 'replace' | 'add' | 'remove'

export interface AttrOperation {
  field: string
  op: AttrOp
  value: string | string[]
}

export interface ListTicketsRequest {
  projectRef: string
  filters?: TicketFilters
}

export interface GetTicketRequest {
  projectRef: string
  ticketKey: string
}

export interface UpdateTicketAttributesRequest {
  projectRef: string
  ticketKey: string
  operations: AttrOperation[]
}

export interface TicketWriteResult<TNormalizedInput> extends WriteResult<TNormalizedInput> {
  ticket: Ticket
}

export type TicketReadResult = ReadResult<Ticket>
