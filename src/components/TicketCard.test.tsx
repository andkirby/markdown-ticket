import type { Ticket } from '../types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TicketCard from './TicketCard'

const ticket = {
  code: 'MDT-206',
  title: 'Epic swimlane board',
  status: 'Approved',
  priority: 'High',
  type: 'Feature Enhancement',
  phaseEpic: 'MDT-225',
  relatedTickets: [],
  dependsOn: [],
  blocks: [],
  dateCreated: '2026-08-08T00:00:00.000Z',
  lastModified: '2026-08-08T00:00:00.000Z',
} as Ticket

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/prj/MDT']}>
      <Routes>
        <Route path="/prj/:projectCode" element={ui} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TicketCard badge visibility', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows badges by default for existing board cards', () => {
    const { container } = renderWithRouter(<TicketCard ticket={ticket} onEdit={mock()} />)

    expect(container.querySelector('.badge')).not.toBeNull()
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('can hide badges for compact swimlane cards', () => {
    const { container } = renderWithRouter(<TicketCard ticket={ticket} onEdit={mock()} showBadges={false} />)

    expect(container.querySelector('.badge')).toBeNull()
    expect(screen.queryByText('Approved')).not.toBeInTheDocument()
  })
})
