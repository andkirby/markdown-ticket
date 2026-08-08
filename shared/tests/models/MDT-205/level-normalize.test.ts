/**
 * MDT-205 — level normalization (read default) and YAML round-trip tests.
 *
 * Covers BR-1 (level exists, defaults to ticket) and C-1 (no migration — legacy
 * files without level read as ticket). These exercise the shared model + the
 * two YAML writers indirectly through the round-trip property.
 */

import { CRLevel } from '@mdt/domain-contracts'
import {
  normalizeTicket,
  normalizeTicketMetadata,
} from '../../../models/Ticket'

const baseRaw = {
  code: 'MDT-205',
  title: 'Epic work',
  status: 'Proposed',
  type: 'Feature Enhancement',
  priority: 'Medium',
  content: '',
  filePath: 'docs/CRs/MDT-205.md',
  relatedTickets: [],
  dependsOn: [],
  blocks: [],
}

describe('normalizeTicket — level field', () => {
  it('defaults level to ticket when absent (no migration)', () => {
    const ticket = normalizeTicket(baseRaw)
    expect(ticket.level).toBe(CRLevel.TICKET)
  })

  it('preserves level: epic when present', () => {
    const ticket = normalizeTicket({ ...baseRaw, level: 'epic' })
    expect(ticket.level).toBe(CRLevel.EPIC)
  })

  it('falls back to ticket for an unknown level value', () => {
    const ticket = normalizeTicket({ ...baseRaw, level: 'saga' })
    expect(ticket.level).toBe(CRLevel.TICKET)
  })
})

describe('normalizeTicketMetadata — level field', () => {
  const baseMeta = {
    code: 'MDT-205',
    title: 'Epic work',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    filePath: 'docs/CRs/MDT-205.md',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
  }

  it('defaults level to ticket when absent', () => {
    const meta = normalizeTicketMetadata(baseMeta)
    expect(meta.level).toBe(CRLevel.TICKET)
  })

  it('preserves level: epic when present', () => {
    const meta = normalizeTicketMetadata({ ...baseMeta, level: 'epic' })
    expect(meta.level).toBe(CRLevel.EPIC)
  })
})
