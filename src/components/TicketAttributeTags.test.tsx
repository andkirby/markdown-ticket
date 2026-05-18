import type { Ticket } from '../types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import { setVisibleTicketCardBadges, TicketCardBadge } from '../config/ticketCardBadges'
import TicketAttributes from './TicketAttributes'
import TicketAttributeTags from './TicketAttributeTags'

const ticket = {
  code: 'MDT-167',
  title: 'Add Settings modal',
  status: 'Implemented',
  priority: 'High',
  type: 'Feature Enhancement',
  phaseEpic: 'Settings',
  relatedTickets: ['MDT-166'],
  dependsOn: ['MDT-101'],
  blocks: ['MDT-200'],
  inWorktree: true,
  worktreePath: '/tmp/MDT-167',
  dateCreated: '2026-05-17T00:00:00.000Z',
  lastModified: '2026-05-17T00:00:00.000Z',
} as Ticket

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('TicketAttributeTags badge visibility', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders only configured board ticket card badges in canonical order', () => {
    setVisibleTicketCardBadges([
      TicketCardBadge.STATUS,
      TicketCardBadge.TYPE,
      TicketCardBadge.WORKTREE,
    ])

    const { container } = renderWithRouter(<TicketAttributeTags ticket={ticket} />)

    expect(screen.getByText('Implemented')).toBeInTheDocument()
    expect(screen.getByText('Feature Enhancement')).toBeInTheDocument()
    expect(screen.getByText('worktree')).toBeInTheDocument()
    expect(screen.queryByText('High')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    expect(screen.queryByText('MDT-166')).not.toBeInTheDocument()
    expect(screen.queryByText('MDT-101')).not.toBeInTheDocument()
    expect(screen.queryByText('MDT-200')).not.toBeInTheDocument()

    const visibleBadgeText = Array.from(container.querySelectorAll('.badge')).map(badge => badge.textContent)
    expect(visibleBadgeText).toEqual(['Implemented', 'Feature Enhancement', 'worktree'])
  })

  it('does not apply board badge visibility to ticket attributes outside board cards', () => {
    setVisibleTicketCardBadges([
      TicketCardBadge.STATUS,
      TicketCardBadge.TYPE,
    ])

    renderWithRouter(<TicketAttributes ticket={ticket} />)

    expect(screen.getByText('Implemented')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Feature Enhancement')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('worktree')).toBeInTheDocument()
    expect(screen.getByText('MDT-166')).toBeInTheDocument()
    expect(screen.getByText('MDT-101')).toBeInTheDocument()
    expect(screen.getByText('MDT-200')).toBeInTheDocument()
  })
})
