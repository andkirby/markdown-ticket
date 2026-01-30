/**
 * MDT-101 Phase 1: Ticket Test Fixtures
 * Test builders for Ticket/CR entities with field-level validation
 */

import type {
  CR,
  CreateTicketInput,
  Ticket,
  UpdateTicketInput,
} from '../ticket/schema.js'
import { CRPriority, CRStatus, CRType } from '../types/schema.js'

/**
 * Creates a valid Ticket with optional overrides
 * @param overrides - Partial ticket data to override defaults
 * @returns Valid Ticket object
 */
export function buildTicket(overrides: Partial<Ticket> = {}): Ticket {
  const defaults: Ticket = {
    code: 'MDT-101',
    title: 'Implement user authentication',
    status: CRStatus.PROPOSED,
    type: CRType.FEATURE_ENHANCEMENT,
    priority: CRPriority.MEDIUM,
  }

  return { ...defaults, ...overrides }
}

/**
 * Creates a valid CR (alias for Ticket)
 * @param overrides - Partial CR data to override defaults
 * @returns Valid CR object
 */
export function buildCR(overrides: Partial<CR> = {}): CR {
  return buildTicket(overrides)
}

/**
 * Creates valid CreateTicketInput
 * @param overrides - Partial input data to override defaults
 * @returns Valid CreateTicketInput object
 */
export function buildCreateTicketInput(overrides: Partial<CreateTicketInput> = {}): CreateTicketInput {
  const defaults: CreateTicketInput = {
    code: 'WEB-001',
    title: 'Add dark mode support',
    status: CRStatus.APPROVED,
    type: CRType.FEATURE_ENHANCEMENT,
    priority: CRPriority.HIGH,
  }

  return { ...defaults, ...overrides }
}

/**
 * Creates valid UpdateTicketInput
 * @param overrides - Partial update data (at least one field required)
 * @returns Valid UpdateTicketInput object
 */
export function buildUpdateTicketInput(overrides: Partial<UpdateTicketInput> = {}): UpdateTicketInput {
  // Default to updating status to ensure at least one field is present
  const defaults: UpdateTicketInput = {
    code: 'MDT-101',
    status: CRStatus.IN_PROGRESS,
  }

  return { ...defaults, ...overrides }
}

/**
 * Creates a Ticket with relationships (dependencies, blocks, or related)
 * @param ticketCode - Code for the main ticket
 * @param tickets - Array of ticket codes
 * @param relationshipType - Type of relationship ('dependsOn', 'blocks', 'relatedTickets')
 * @param overrides - Additional ticket overrides
 * @returns Valid Ticket with specified relationship field
 */
export function buildTicketWithRelationship(
  ticketCode: string,
  tickets: string[],
  relationshipType: 'dependsOn' | 'blocks' | 'relatedTickets',
  overrides: Partial<Ticket> = {},
): Ticket {
  return buildTicket({
    code: ticketCode,
    [relationshipType]: tickets.join(', '),
    ...overrides,
  })
}

// Convenience wrappers for specific relationship types
export function buildTicketWithDependencies(code: string, deps: string[], overrides = {}) {
  return buildTicketWithRelationship(code, deps, 'dependsOn', overrides)
}

export function buildTicketWithBlocks(code: string, blocks: string[], overrides = {}) {
  return buildTicketWithRelationship(code, blocks, 'blocks', overrides)
}

export function buildTicketWithRelations(code: string, related: string[], overrides = {}) {
  return buildTicketWithRelationship(code, related, 'relatedTickets', overrides)
}

/**
 * Creates a Ticket with all optional fields populated
 * @param overrides - Additional ticket overrides
 * @returns Valid Ticket with all fields
 */
export function buildFullTicket(overrides: Partial<Ticket> = {}): Ticket {
  return buildTicket({
    code: 'DOC-001',
    title: 'Update API documentation',
    status: CRStatus.IN_PROGRESS,
    type: CRType.DOCUMENTATION,
    priority: CRPriority.LOW,
    phaseEpic: 'Phase 2 - API Enhancement',
    impactAreas: ['Documentation', 'Developer Experience'],
    relatedTickets: 'DOC-002, DOC-003',
    dependsOn: 'API-001',
    blocks: 'WEB-005',
    assignee: 'technical-writer@example.com',
    content: '## 1. Description\n\nUpdate all API endpoints documentation...',
    implementationDate: '2025-01-15',
    implementationNotes: 'Pending review from team lead',
    ...overrides,
  })
}

/**
 * Creates multiple tickets with sequential codes
 * @param count - Number of tickets to create
 * @param baseCode - Base ticket code (will append number)
 * @param overrides - Overrides to apply to all tickets
 * @returns Array of valid Ticket objects
 */
export function buildTickets(count: number, baseCode = 'TCK', overrides: Partial<Ticket> = {}): Ticket[] {
  return Array.from({ length: count }, (_, i) =>
    buildTicket({
      code: `${baseCode}-${(i + 1).toString().padStart(3, '0')}`,
      title: `Ticket ${i + 1}`,
      ...overrides,
    }))
}
