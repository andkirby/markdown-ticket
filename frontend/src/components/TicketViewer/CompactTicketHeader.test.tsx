/**
 * MDT-244: CompactTicketHeader suppression unit tests
 *
 * The viewer header renders the ticket key and the type badge in one header
 * block. Precedence rule: when the key-icon option is on, the header omits
 * the type badge entirely (the key line already carries the glyph).
 */

import type { Ticket } from '../../types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { setTicketKeyOptions } from '../../config/ticketKeyConfig'
import { CompactTicketHeader } from './CompactTicketHeader'

function ticket(): Ticket {
  return {
    code: 'MDT-100',
    title: 'Ticket',
    status: 'Proposed',
    type: 'Bug Fix',
    priority: 'Medium',
    level: 'ticket',
    dateCreated: new Date('2026-09-02T00:00:00Z'),
    lastModified: new Date('2026-09-02T00:00:00Z'),
    filePath: '',
    content: '',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
  } as Ticket
}

afterEach(() => {
  setTicketKeyOptions({ typeIconNearKey: false, typeIconInBadge: false })
  cleanup()
})

describe('CompactTicketHeader — type badge suppression (MDT-244)', () => {
  it('omits the type badge when the key-icon option is on, even with badge glyph on', () => {
    setTicketKeyOptions({ typeIconNearKey: true, typeIconInBadge: true })
    render(<CompactTicketHeader ticket={ticket()} />)
    expect(screen.queryByTestId('ticket-type')).toBeNull()
  })

  it('shows the type badge when the key-icon option is off', () => {
    setTicketKeyOptions({ typeIconNearKey: false, typeIconInBadge: true })
    render(<CompactTicketHeader ticket={ticket()} />)
    expect(screen.getByTestId('ticket-type')).toBeInTheDocument()
  })

  it('exposes the ticket-detail-header test hook for E2E scoping', () => {
    render(<CompactTicketHeader ticket={ticket()} />)
    expect(screen.getByTestId('ticket-detail-header')).toBeInTheDocument()
  })
})
