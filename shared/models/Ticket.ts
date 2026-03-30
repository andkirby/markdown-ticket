import type {
  Ticket,
  TicketMetadata,
} from '@mdt/domain-contracts'
import { CRType } from '@mdt/domain-contracts'

export type {
  Ticket,
  TicketData,
  TicketFilters,
  TicketMetadata,
  TicketUpdateAttrs,
} from '@mdt/domain-contracts'

export {
  TICKET_UPDATE_ALLOWED_ATTRS,
  TICKET_UPDATE_ATTRS,
} from '@mdt/domain-contracts'

/**
 * Helper function to safely parse date values
 */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function parseDate(dateValue: unknown): Date | null {
  if (!dateValue)
    return null
  if (dateValue instanceof Date)
    return dateValue
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

/**
 * Helper function to normalize array fields
 */
function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

/**
 * Normalize ticket data to ensure consistent structure
 */
export function normalizeTicket(rawTicket: unknown): Ticket {
  const ticket = asRecord(rawTicket)
  const normalizedTicket: Ticket = {
    // Map core fields
    code: getString(ticket.code) || getString(ticket.key),
    title: getString(ticket.title),
    status: getString(ticket.status, 'Proposed'),
    type: getString(ticket.type, CRType.FEATURE_ENHANCEMENT),
    priority: getString(ticket.priority, 'Medium'),
    content: getString(ticket.content),
    filePath: getString(ticket.filePath) || getString(ticket.path),

    // Handle dates
    dateCreated: parseDate(ticket.dateCreated),
    lastModified: parseDate(ticket.lastModified),
    implementationDate: parseDate(ticket.implementationDate),

    // Map optional fields
    phaseEpic: getString(ticket.phaseEpic),
    assignee: getString(ticket.assignee),
    implementationNotes: getString(ticket.implementationNotes),

    // Normalize relationship fields to arrays
    relatedTickets: normalizeArray(ticket.relatedTickets),
    dependsOn: normalizeArray(ticket.dependsOn),
    blocks: normalizeArray(ticket.blocks),
  }

  // MDT-095: Preserve worktree fields if present
  if (typeof ticket.inWorktree === 'boolean') {
    normalizedTicket.inWorktree = ticket.inWorktree
  }
  if (typeof ticket.worktreePath === 'string') {
    normalizedTicket.worktreePath = ticket.worktreePath
  }

  // MDT-093: Preserve subdocuments array if present
  if (Array.isArray(ticket.subdocuments)) {
    normalizedTicket.subdocuments = ticket.subdocuments
  }

  return normalizedTicket
}

/**
 * Convert arrays back to comma-separated strings for YAML
 */
export function arrayToString(arr: string[]): string {
  return Array.isArray(arr) ? arr.join(',') : ''
}

/**
 * MDT-094: Normalize unknown input to TicketMetadata.
 *
 * Same as normalizeTicket() but excludes content field.
 * Reuses helper functions from normalizeTicket() for consistency.
 */
export function normalizeTicketMetadata(rawTicket: unknown): TicketMetadata {
  const ticket = asRecord(rawTicket)
  const normalizedMetadata: TicketMetadata = {
    // Map core fields (same as normalizeTicket)
    code: getString(ticket.code) || getString(ticket.key),
    title: getString(ticket.title),
    status: getString(ticket.status, 'Proposed'),
    type: getString(ticket.type, CRType.FEATURE_ENHANCEMENT),
    priority: getString(ticket.priority, 'Medium'),
    // content is intentionally excluded
    filePath: getString(ticket.filePath) || getString(ticket.path),

    // Handle dates
    dateCreated: parseDate(ticket.dateCreated),
    lastModified: parseDate(ticket.lastModified),
    implementationDate: parseDate(ticket.implementationDate),

    // Map optional fields
    phaseEpic: getString(ticket.phaseEpic),
    assignee: getString(ticket.assignee),
    implementationNotes: getString(ticket.implementationNotes),

    // Normalize relationship fields to arrays
    relatedTickets: normalizeArray(ticket.relatedTickets),
    dependsOn: normalizeArray(ticket.dependsOn),
    blocks: normalizeArray(ticket.blocks),
  }

  // MDT-095: Preserve worktree fields if present
  if (typeof ticket.inWorktree === 'boolean') {
    normalizedMetadata.inWorktree = ticket.inWorktree
  }
  if (typeof ticket.worktreePath === 'string') {
    normalizedMetadata.worktreePath = ticket.worktreePath
  }

  return normalizedMetadata
}
