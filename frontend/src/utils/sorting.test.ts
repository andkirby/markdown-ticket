import type { Ticket } from '../types'
import { CRPriorities } from '@mdt/domain-contracts'
import { describe, expect, it } from 'bun:test'
import { CR_STATUS_SORT_ORDER } from '../config/sorting'
import { sortTickets } from './sorting'

function mk(code: string, priority: string): Ticket {
  return { code, priority, title: code, dateCreated: '2026-01-01' } as unknown as Ticket
}

function mkStatus(code: string, status: string | null | undefined): Ticket {
  return { ...mk(code, 'Medium'), status: status ?? undefined } as Ticket
}

const codes = (tickets: Ticket[]): string[] => tickets.map(t => t.code)

describe('sortTickets', () => {
  describe('priority (MDT-047)', () => {
    // Weight order mirrors CRPriorities: [Low, Medium, High, Critical] → 0..3.
    it('desc orders most-urgent first (Critical → Low)', () => {
      const tickets = [
        mk('M', 'Medium'),
        mk('C', 'Critical'),
        mk('L', 'Low'),
        mk('H', 'High'),
      ]
      expect(codes(sortTickets(tickets, 'priority', 'desc'))).toEqual(['C', 'H', 'M', 'L'])
    })

    it('asc orders least-urgent first (Low → Critical)', () => {
      const tickets = [
        mk('M', 'Medium'),
        mk('C', 'Critical'),
        mk('L', 'Low'),
        mk('H', 'High'),
      ]
      expect(codes(sortTickets(tickets, 'priority', 'asc'))).toEqual(['L', 'M', 'H', 'C'])
    })

    it('is NOT alphabetical (would give Critical < High < Low < Medium)', () => {
      const tickets = [
        mk('M', 'Medium'),
        mk('C', 'Critical'),
        mk('L', 'Low'),
        mk('H', 'High'),
      ]
      const alphabetical = ['C', 'H', 'L', 'M']
      expect(codes(sortTickets(tickets, 'priority', 'asc'))).not.toEqual(alphabetical)
    })

    it('handles unknown values via indexOf -1 (last on desc, first on asc)', () => {
      const tickets = [
        mk('M', 'Medium'),
        mk('C', 'Critical'),
        mk('U', 'Blocker'), // unknown
      ]
      expect(codes(sortTickets(tickets, 'priority', 'desc'))).toEqual(['C', 'M', 'U'])
      expect(codes(sortTickets(tickets, 'priority', 'asc'))).toEqual(['U', 'M', 'C'])
    })

    it('keeps ties stable regardless of priority weight', () => {
      const tickets = [mk('C1', 'Critical'), mk('C2', 'Critical'), mk('C3', 'Critical')]
      expect(codes(sortTickets(tickets, 'priority', 'desc'))).toEqual(['C1', 'C2', 'C3'])
    })

    it('weight order matches the canonical CRPriorities array', () => {
      // Guards the invariant: the comparator's weight source is CRPriorities.
      const ascending = sortTickets(
        ['Critical', 'Low', 'Medium', 'High'].map(p => mk(p, p)),
        'priority',
        'asc',
      ).map(t => t.priority)
      expect(ascending).toEqual([...CRPriorities])
    })
  })

  describe('status (MDT-249)', () => {
    const LIFECYCLE = [
      'Proposed',
      'Approved',
      'In Progress',
      'On Hold',
      'Implemented',
      'Partially Implemented',
      'Rejected',
    ]

    // Deliberately out of order so a pass cannot come from input order.
    const mixed = ['Rejected', 'Implemented', 'Proposed', 'Partially Implemented', 'On Hold', 'Approved', 'In Progress']

    it('asc orders by lifecycle: Proposed → … → Rejected', () => {
      const tickets = mixed.map((s, i) => mkStatus(`T${i}`, s))
      expect(sortTickets(tickets, 'status', 'asc').map(t => t.status)).toEqual(LIFECYCLE)
    })

    it('desc is the reversed lifecycle', () => {
      const tickets = mixed.map((s, i) => mkStatus(`T${i}`, s))
      expect(sortTickets(tickets, 'status', 'desc').map(t => t.status)).toEqual([...LIFECYCLE].reverse())
    })

    it('is NOT alphabetical (would give Approved < Implemented < In Progress)', () => {
      const tickets = mixed.map((s, i) => mkStatus(`T${i}`, s))
      const alphabetical = [...mixed].sort((a, b) => a.localeCompare(b))
      expect(sortTickets(tickets, 'status', 'asc').map(t => t.status)).not.toEqual(alphabetical)
    })

    it('unknown statuses sort AFTER known ones in both directions (lead decision)', () => {
      const tickets = [mkStatus('K1', 'Implemented'), mkStatus('U1', 'Frozen'), mkStatus('K2', 'Proposed'), mkStatus('U2', 'Limbo')]
      expect(sortTickets(tickets, 'status', 'asc').map(t => t.code)).toEqual(['K2', 'K1', 'U1', 'U2'])
      // Unknown-vs-unknown ties → 0 → stable input order (U1 before U2 in input).
      expect(sortTickets(tickets, 'status', 'desc').map(t => t.code)).toEqual(['K1', 'K2', 'U1', 'U2'])
    })

    it('both unknown → stable (input order kept)', () => {
      const tickets = [mkStatus('U1', 'Frozen'), mkStatus('U2', 'Limbo')]
      expect(sortTickets(tickets, 'status', 'asc').map(t => t.code)).toEqual(['U1', 'U2'])
      expect(sortTickets(tickets, 'status', 'desc').map(t => t.code)).toEqual(['U1', 'U2'])
    })

    it('null/undefined status resolves to unknown (sorts last)', () => {
      const tickets = [mkStatus('N', null), mkStatus('K', 'Proposed'), mkStatus('U', undefined)]
      expect(sortTickets(tickets, 'status', 'asc').map(t => t.code)).toEqual(['K', 'N', 'U'])
    })

    it('rank source is the dedicated CR_STATUS_SORT_ORDER array (C4)', () => {
      expect(LIFECYCLE).toEqual([...CR_STATUS_SORT_ORDER])
    })
  })
})
