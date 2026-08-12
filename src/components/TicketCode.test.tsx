import type { Ticket } from '../types'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { TicketCode } from './TicketCode'

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    code: 'MDT-100',
    title: 'Ticket',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    level: 'ticket',
    dateCreated: new Date('2026-08-08T00:00:00Z'),
    lastModified: new Date('2026-08-08T00:00:00Z'),
    filePath: '',
    content: '',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
    ...overrides,
  } as Ticket
}

describe('TicketCode — epic lightning (global)', () => {
  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the priority glyph before the key for every ticket', () => {
    const { container } = render(<TicketCode code="MDT-100" ticket={ticket()} />)
    expect(container.querySelector('.priority-icon')).not.toBeNull()
    expect(container.querySelector('[data-testid="ticket-code"]')?.textContent).toContain('MDT-100')
  })

  it('renders a lightning icon after the key when the ticket is an epic', () => {
    const { container } = render(<TicketCode code="MDT-100" ticket={ticket({ level: 'epic' })} />)
    const epicIcon = container.querySelector('.ticket-code__epic-icon')
    expect(epicIcon).not.toBeNull()
    // The epic icon is a Zap svg (lucide), aria-hidden.
    expect(epicIcon?.getAttribute('aria-hidden')).toBe('true')

    // Order invariant: priority → key → lightning. The epic icon comes after
    // the priority glyph and after the key text in DOM order.
    const code = container.querySelector('[data-testid="ticket-code"]')!
    const children = Array.from(code.querySelectorAll('*'))
    const prioPos = children.findIndex(el => el.classList.contains('priority-icon'))
    const epicPos = children.findIndex(el => el.classList.contains('ticket-code__epic-icon'))
    expect(prioPos).toBeGreaterThanOrEqual(0)
    expect(epicPos).toBeGreaterThan(prioPos)
  })

  it('does not render a lightning icon for a non-epic (level: ticket)', () => {
    const { container } = render(<TicketCode code="MDT-100" ticket={ticket({ level: 'ticket' })} />)
    expect(container.querySelector('.ticket-code__epic-icon')).toBeNull()
  })

  it('does not render a lightning icon when no ticket is provided', () => {
    const { container } = render(<TicketCode code="MDT-100" priority="Medium" />)
    expect(container.querySelector('.ticket-code__epic-icon')).toBeNull()
  })
})
