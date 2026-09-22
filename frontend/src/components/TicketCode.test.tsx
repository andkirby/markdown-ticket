import type { Ticket } from '../types'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { setTicketKeyOptions } from '../config/ticketKeyConfig'
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

describe('TicketCode — type glyph slot (MDT-244)', () => {
  afterEach(() => {
    setTicketKeyOptions({ typeIconNearKey: false, typeIconInBadge: false })
    cleanup()
  })

  it('renders no type glyph when the key-icon option is off', () => {
    setTicketKeyOptions({ typeIconNearKey: false, typeIconInBadge: false })
    const { container } = render(<TicketCode code="MDT-100" ticket={ticket()} />)
    expect(container.querySelector('svg[data-type]')).toBeNull()
  })

  it('renders the type glyph between the key text and the epic Zap when on', () => {
    setTicketKeyOptions({ typeIconNearKey: true, typeIconInBadge: false })
    const { container } = render(<TicketCode code="MDT-100" ticket={ticket({ type: 'Bug Fix', level: 'epic' })} />)
    const code = container.querySelector('[data-testid="ticket-code"]')!
    const children = Array.from(code.querySelectorAll('*'))
    const prioPos = children.findIndex(el => el.classList.contains('priority-icon'))
    const glyphPos = children.findIndex(el => el.getAttribute('data-type') === 'bug-fix')
    const epicPos = children.findIndex(el => el.classList.contains('ticket-code__epic-icon'))
    expect(prioPos).toBeGreaterThanOrEqual(0)
    expect(glyphPos).toBeGreaterThan(prioPos)
    expect(epicPos).toBeGreaterThan(glyphPos)
  })

  it('renders exactly one aria-hidden type glyph for the ticket type', () => {
    setTicketKeyOptions({ typeIconNearKey: true, typeIconInBadge: false })
    const { container } = render(<TicketCode code="MDT-100" ticket={ticket({ type: 'Bug Fix' })} />)
    const glyphs = container.querySelectorAll('svg[data-type="bug-fix"]')
    expect(glyphs.length).toBe(1)
    expect(glyphs[0]?.getAttribute('aria-hidden')).toBe('true')
  })

  it('gives the key-line glyph a native tooltip with the type name', () => {
    setTicketKeyOptions({ typeIconNearKey: true, typeIconInBadge: false })
    const { container } = render(<TicketCode code="MDT-100" ticket={ticket({ type: 'Bug Fix' })} />)
    // Native SVG tooltip: a <title> child (browser shows it on hover)
    expect(container.querySelector('svg[data-type="bug-fix"] > title')?.textContent).toBe('Bug Fix')
  })

  it('renders no type glyph when no ticket is provided', () => {
    setTicketKeyOptions({ typeIconNearKey: true, typeIconInBadge: false })
    const { container } = render(<TicketCode code="MDT-100" priority="Medium" />)
    expect(container.querySelector('svg[data-type]')).toBeNull()
  })
})

describe('TicketCode — status glyph slot (MDT-247)', () => {
  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the status glyph between the priority glyph and the key when status is passed', () => {
    const { container } = render(<TicketCode code="MDT-100" priority="Medium" status="Proposed" />)
    const strip = container.querySelector('[data-testid="ticket-code"]')!
    const prio = strip.querySelector('.priority-icon')!
    const statusIcon = strip.querySelector('.ticket-code__status-icon[data-status="proposed"]')!
    expect(statusIcon).not.toBeNull()
    // Order invariant: priority → status glyph → key text.
    expect(prio.compareDocumentPosition(statusIcon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(strip.textContent).toContain('MDT-100')
  })

  it('gives the strip glyph a native tooltip with the status name (C2)', () => {
    const { container } = render(<TicketCode code="MDT-100" priority="Medium" status="On Hold" />)
    expect(container.querySelector('svg.ticket-code__status-icon > title')?.textContent).toBe('On Hold')
  })

  it('renders NO status glyph when no status prop is passed, even though the ticket carries status (suppression by construction, BR-1.4)', () => {
    const { container } = render(<TicketCode code="MDT-100" ticket={ticket({ status: 'Proposed' })} />)
    expect(container.querySelector('.ticket-code__status-icon')).toBeNull()
    expect(container.querySelector('svg[data-status]')).toBeNull()
  })

  it('renders no status glyph for an unmapped status value (BR-1.9)', () => {
    const { container } = render(<TicketCode code="MDT-100" priority="Medium" status="In Review" />)
    expect(container.querySelector('.ticket-code__status-icon')).toBeNull()
  })
})
