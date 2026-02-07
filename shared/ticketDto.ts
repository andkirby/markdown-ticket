/**
 * Shared Ticket DTO for Frontend, Backend, and MCP
 * Ensures consistent data structure across all systems
 */

import { CRType } from '@mdt/domain-contracts'

export interface TicketDTO {
  // Core required fields
  code: string
  title: string
  status: string
  type: string
  priority: string
  dateCreated: Date | null
  lastModified: Date | null
  content: string
  filePath: string

  // Optional fields
  phaseEpic?: string
  description?: string
  rationale?: string
  assignee?: string
  implementationDate?: Date | null
  implementationNotes?: string

  // Relationship fields (always arrays)
  relatedTickets: string[]
  dependsOn: string[]
  blocks: string[]
}

/**
 * Normalize ticket data to ensure consistent structure
 */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function normalizeTicket(rawTicket: unknown): TicketDTO {
  const ticket = asRecord(rawTicket)
  return {
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
    description: getString(ticket.description),
    rationale: getString(ticket.rationale),
    assignee: getString(ticket.assignee),
    implementationNotes: getString(ticket.implementationNotes),

    // Normalize relationship fields to arrays (never undefined)
    relatedTickets: normalizeArray(ticket.relatedTickets),
    dependsOn: normalizeArray(ticket.dependsOn),
    blocks: normalizeArray(ticket.blocks),
  }
}

/**
 * Convert various formats to array
 */
function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    // Handle array elements that might be JSON strings
    const flattened = value.flatMap((item): unknown[] => {
      if (typeof item === 'string' && item.trim().startsWith('[')) {
        try {
          const parsed: unknown = JSON.parse(item)
          return Array.isArray(parsed) ? parsed : [item]
        }
        catch {
          return [item]
        }
      }
      return [item]
    })
    return flattened.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }
  if (typeof value === 'string' && value.trim()) {
    // Try to parse as JSON first
    if (value.trim().startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(value)
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
        }
      }
      catch {
        // Fall through to comma-separated parsing
      }
    }
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

/**
 * Parse date from various formats
 */
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
 * Convert arrays back to comma-separated strings for YAML
 */
export function arrayToString(arr: string[]): string {
  return Array.isArray(arr) ? arr.join(',') : ''
}
