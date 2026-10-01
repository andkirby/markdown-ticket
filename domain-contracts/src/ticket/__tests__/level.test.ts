/**
 * MDT-205 — `level` field (ticket | epic) domain contracts tests.
 *
 * Covers the CRLevel enum shape, the `level` field on TicketSchema, the
 * frontmatter schema, and the create/update input schemas. These are pure
 * schema tests; semantic phaseEpic/close-guard rules live in the shared layer.
 */

import type {
  CRLevelValue,
  Ticket,
} from '../schema'
import { CRPriority, CRStatus, CRType } from '../../types/schema'
import {
  CreateTicketInputSchema,
  CRLevel,
  CRLevels,
  CRLevelSchema,
  TICKET_UPDATE_ATTRS,
  TicketFrontmatterSchema,

  TicketSchema,
  UpdateTicketInputSchema,
} from '../schema'

// Inlined from the retired testing/ticket.fixtures (only consumer)
function buildTicket(overrides: Partial<Ticket> = {}): Ticket {
  const defaults: Ticket = {
    code: 'MDT-101',
    title: 'Implement user authentication',
    status: CRStatus.PROPOSED,
    type: CRType.FEATURE_ENHANCEMENT,
    priority: CRPriority.MEDIUM,
    dateCreated: new Date('2025-01-01T00:00:00.000Z'),
    lastModified: new Date('2025-01-01T00:00:00.000Z'),
    content: '',
    filePath: 'docs/CRs/MDT-101.md',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
  }

  return { ...defaults, ...overrides }
}

describe('CRLevel enum (type-safe enum pattern)', () => {
  it('exposes named values ticket and epic', () => {
    expect(CRLevel.TICKET).toBe('ticket')
    expect(CRLevel.EPIC).toBe('epic')
  })

  it('exposes an explicit array preserving literal order', () => {
    expect(CRLevels).toEqual(['ticket', 'epic'])
    // the type is the union of the two literals
    const sample: CRLevelValue = 'epic'
    expect(CRLevels).toContain(sample)
  })

  it('schema accepts the two canonical values and rejects others', () => {
    expect(CRLevelSchema.parse('ticket')).toBe('ticket')
    expect(CRLevelSchema.parse('epic')).toBe('epic')
    expect(() => CRLevelSchema.parse('Epic')).toThrow()
    expect(() => CRLevelSchema.parse('story')).toThrow()
    expect(() => CRLevelSchema.parse(undefined)).toThrow()
  })
})

describe('TicketSchema — level field', () => {
  it('accepts a ticket with level: epic', () => {
    const ticket = buildTicket({ level: CRLevel.EPIC })
    expect(() => TicketSchema.parse(ticket)).not.toThrow()
  })

  it('accepts a ticket without level (optional)', () => {
    const { level: _omit, ...withoutLevel } = buildTicket()
    expect(() => TicketSchema.parse(withoutLevel)).not.toThrow()
  })

  it('rejects an invalid level value', () => {
    const ticket = buildTicket({ level: 'saga' as unknown as CRLevelValue })
    expect(() => TicketSchema.parse(ticket)).toThrow()
  })
})

describe('TicketFrontmatterSchema — level field', () => {
  const validBase = {
    code: 'MDT-101',
    title: 'Epic work',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
  }

  it('accepts level: epic', () => {
    expect(() => TicketFrontmatterSchema.parse({ ...validBase, level: 'epic' })).not.toThrow()
  })

  it('accepts absence of level (defaults applied by normalizer, not schema)', () => {
    expect(() => TicketFrontmatterSchema.parse(validBase)).not.toThrow()
  })

  it('rejects an unknown level', () => {
    expect(() => TicketFrontmatterSchema.parse({ ...validBase, level: 'initiative' })).toThrow()
  })
})

describe('CreateTicketInputSchema — level field', () => {
  it('accepts level: epic on create', () => {
    const input = CreateTicketInputSchema.parse({
      title: 'New epic',
      type: 'Feature Enhancement',
      priority: 'Medium',
      level: 'epic',
    })
    expect(input.level).toBe('epic')
  })

  it('makes level optional on create', () => {
    const input = CreateTicketInputSchema.parse({
      title: 'New ticket',
      type: 'Feature Enhancement',
      priority: 'Medium',
    })
    expect(input.level).toBeUndefined()
  })
})

describe('UpdateTicketInputSchema — level field', () => {
  it('accepts level: ticket on update', () => {
    const input = UpdateTicketInputSchema.parse({ level: 'ticket' })
    expect(input.level).toBe('ticket')
  })

  it('accepts level: epic on update', () => {
    const input = UpdateTicketInputSchema.parse({ level: 'epic' })
    expect(input.level).toBe('epic')
  })
})

describe('TICKET_UPDATE_ATTRS — level is writable', () => {
  it('includes level in the update allowlist', () => {
    expect(TICKET_UPDATE_ATTRS).toContain('level')
  })
})
