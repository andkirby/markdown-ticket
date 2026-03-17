/**
 * Mock for @mdt/shared/models/Ticket
 *
 * MDT-094: Added TicketMetadata and normalizeTicketMetadata
 */
export type {
  Ticket,
  TicketData,
  TicketFilters,
  TicketMetadata,
  TicketUpdateAttrs,
} from '@mdt/domain-contracts'
import { TICKET_UPDATE_ALLOWED_ATTRS } from '@mdt/shared/models/Ticket.js'

export { TICKET_UPDATE_ALLOWED_ATTRS }

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
