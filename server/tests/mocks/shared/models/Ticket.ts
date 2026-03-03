/**
 * Mock for @mdt/shared/models/Ticket
 *
 * MDT-094: Added TicketMetadata and normalizeTicketMetadata
 */

export interface Ticket {
  code: string
  title: string
  status: string
  type: string
  priority: string
  dateCreated: Date | null
  lastModified: Date | null
  content: string
  filePath: string
  phaseEpic?: string
  assignee?: string
  implementationDate?: Date | null
  implementationNotes?: string
  relatedTickets: string[]
  dependsOn: string[]
  blocks: string[]
  inWorktree?: boolean
  worktreePath?: string
}

/**
 * MDT-094: TicketMetadata type (excludes content)
 */
export type TicketMetadata = Omit<Ticket, 'content'>

export interface TicketData {
  title: string
  type: string
  priority?: string
  phaseEpic?: string
  impactAreas?: string[]
  relatedTickets?: string
  dependsOn?: string
  blocks?: string
  assignee?: string
  content?: string
}

export interface TicketUpdateAttrs {
  priority?: string
  phaseEpic?: string
  relatedTickets?: string
  dependsOn?: string
  blocks?: string
  assignee?: string
  implementationDate?: Date | null
  implementationNotes?: string
}

export const TICKET_UPDATE_ALLOWED_ATTRS = new Set<keyof TicketUpdateAttrs>([
  'priority',
  'phaseEpic',
  'relatedTickets',
  'dependsOn',
  'blocks',
  'assignee',
  'implementationDate',
  'implementationNotes',
])

export interface TicketFilters {
  status?: string | string[]
  type?: string | string[]
  priority?: string | string[]
  dateRange?: {
    start?: Date
    end?: Date
  }
}

/**
 * Helper to safely parse date values
 */
function parseDate(dateValue: unknown): Date | null {
  if (!dateValue) return null
  if (dateValue instanceof Date) return dateValue
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

/**
 * Helper to normalize array fields
 */
function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/**
 * Normalize ticket data to ensure consistent structure
 */
export function normalizeTicket(rawTicket: unknown): Ticket {
  const ticket = asRecord(rawTicket)
  const normalizedTicket: Ticket = {
    code: getString(ticket.code) || getString(ticket.key),
    title: getString(ticket.title),
    status: getString(ticket.status, 'Proposed'),
    type: getString(ticket.type, 'Feature Enhancement'),
    priority: getString(ticket.priority, 'Medium'),
    content: getString(ticket.content),
    filePath: getString(ticket.filePath) || getString(ticket.path),
    dateCreated: parseDate(ticket.dateCreated),
    lastModified: parseDate(ticket.lastModified),
    implementationDate: parseDate(ticket.implementationDate),
    phaseEpic: getString(ticket.phaseEpic),
    assignee: getString(ticket.assignee),
    implementationNotes: getString(ticket.implementationNotes),
    relatedTickets: normalizeArray(ticket.relatedTickets),
    dependsOn: normalizeArray(ticket.dependsOn),
    blocks: normalizeArray(ticket.blocks),
  }

  if (typeof ticket.inWorktree === 'boolean') {
    normalizedTicket.inWorktree = ticket.inWorktree
  }
  if (typeof ticket.worktreePath === 'string') {
    normalizedTicket.worktreePath = ticket.worktreePath
  }

  return normalizedTicket
}

/**
 * MDT-094: Normalize to TicketMetadata (without content)
 */
export function normalizeTicketMetadata(rawTicket: unknown): TicketMetadata {
  const ticket = asRecord(rawTicket)
  const normalizedMetadata: TicketMetadata = {
    code: getString(ticket.code) || getString(ticket.key),
    title: getString(ticket.title),
    status: getString(ticket.status, 'Proposed'),
    type: getString(ticket.type, 'Feature Enhancement'),
    priority: getString(ticket.priority, 'Medium'),
    // content is intentionally excluded
    filePath: getString(ticket.filePath) || getString(ticket.path),
    dateCreated: parseDate(ticket.dateCreated),
    lastModified: parseDate(ticket.lastModified),
    implementationDate: parseDate(ticket.implementationDate),
    phaseEpic: getString(ticket.phaseEpic),
    assignee: getString(ticket.assignee),
    implementationNotes: getString(ticket.implementationNotes),
    relatedTickets: normalizeArray(ticket.relatedTickets),
    dependsOn: normalizeArray(ticket.dependsOn),
    blocks: normalizeArray(ticket.blocks),
  }

  if (typeof ticket.inWorktree === 'boolean') {
    normalizedMetadata.inWorktree = ticket.inWorktree
  }
  if (typeof ticket.worktreePath === 'string') {
    normalizedMetadata.worktreePath = ticket.worktreePath
  }

  return normalizedMetadata
}

export function arrayToString(arr: string[]): string {
  return Array.isArray(arr) ? arr.join(',') : ''
}
