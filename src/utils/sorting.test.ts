import { describe, expect, it } from 'bun:test'
import { CRPriorities } from '@mdt/domain-contracts'
import type { Ticket } from '../types'
import { sortTickets } from './sorting'

function mk(code: string, priority: string): Ticket {
  return { code, priority, title: code, dateCreated: '2026-01-01' } as unknown as Ticket
}

const codes = (tickets: Ticket[]): string[] => tickets.map(t => t.code)

describe('sortTickets', () => {
  describe('priority (MDT-047)', () => {
    // Weight order mirrors CRPriorities: [Low, Medium, High, Critical] → 0..3.
    it('desc orders most-urgent first (Critical → Low)', () => {
      const tickets = [
        mk('M', 'Medium'), mk('C', 'Critical'), mk('L', 'Low'), mk('H', 'High'),
      ]
      expect(codes(sortTickets(tickets, 'priority', 'desc'))).toEqual(['C', 'H', 'M', 'L'])
    })

    it('asc orders least-urgent first (Low → Critical)', () => {
      const tickets = [
        mk('M', 'Medium'), mk('C', 'Critical'), mk('L', 'Low'), mk('H', 'High'),
      ]
      expect(codes(sortTickets(tickets, 'priority', 'asc'))).toEqual(['L', 'M', 'H', 'C'])
    })

    it('is NOT alphabetical (would give Critical < High < Low < Medium)', () => {
      const tickets = [
        mk('M', 'Medium'), mk('C', 'Critical'), mk('L', 'Low'), mk('H', 'High'),
      ]
      const alphabetical = ['C', 'H', 'L', 'M']
      expect(codes(sortTickets(tickets, 'priority', 'asc'))).not.toEqual(alphabetical)
    })

    it('handles unknown values via indexOf -1 (last on desc, first on asc)', () => {
      const tickets = [
        mk('M', 'Medium'), mk('C', 'Critical'), mk('U', 'Blocker'), // unknown
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
})
