import type { Ticket } from '../../types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SwimlaneBoard } from './index'

function ticket(overrides: Partial<Ticket> & { code: string }): Ticket {
  return {
    title: 'Ticket',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
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

const columns = [
  { label: 'Backlog', statuses: ['Proposed'], color: 'gray' },
  { label: 'Open', statuses: ['Approved'], color: 'blue' },
  { label: 'Done', statuses: ['Implemented'], color: 'green' },
]

function renderBoard(overrides: { tickets?: Ticket[], onTicketEdit?: (t: Ticket) => void } = {}) {
  const epic = ticket({
    code: 'MDT-100',
    title: 'Auth Overhaul',
    status: 'Approved',
    level: 'epic',
    priority: 'High',
  })
  const child = ticket({
    code: 'MDT-101',
    title: 'OAuth PKCE flow with reasonably long title text',
    status: 'Approved',
    phaseEpic: 'MDT-100',
    priority: 'Medium',
  })
  const all = overrides.tickets ?? [epic, child]
  const onTicketEdit = overrides.onTicketEdit ?? mock()
  const utils = render(
    <DndProvider backend={HTML5Backend}>
      <MemoryRouter initialEntries={['/prj/MDT']}>
        <Routes>
          <Route
            path="/prj/:projectCode"
            element={(
              <SwimlaneBoard
                tickets={all}
                laneSourceTickets={all}
                columns={columns}
                sortAttribute="priority"
                sortDirection="asc"
                canWrite={true}
                onTicketEdit={onTicketEdit}
                onTicketDrop={mock()}
                onEpicStatusChange={mock()}
              />
            )}
          />
        </Routes>
      </MemoryRouter>
    </DndProvider>,
  )
  return { ...utils, onTicketEdit }
}

describe('SwimlaneBoard lane label (MDT-206 UAT round)', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the epic key through TicketCode (priority glyph before key) for card parity', () => {
    const { container } = renderBoard()
    const lane = container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-100"]')
    expect(lane).not.toBeNull()
    // TicketCode renders both .ticket-code and .ticket-key and a priority glyph.
    const key = lane!.querySelector('.ticket-code.ticket-key')
    expect(key).not.toBeNull()
    expect(key?.textContent).toContain('MDT-100')
    expect(key?.querySelector('.priority-icon')).not.toBeNull()
  })

  it('does not render a color dot to the left of the lane title', () => {
    const { container } = renderBoard()
    const lane = container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-100"]')
    expect(lane).not.toBeNull()
    expect(lane!.querySelector('.swimlane-board__epic-dot')).toBeNull()
  })

  it('makes the epic key clickable to open the epic ticket', () => {
    const { onTicketEdit } = renderBoard()
    const keyButton = screen.getByTestId('swimlane-lane-key')
    fireEvent.click(keyButton)
    expect(onTicketEdit).toHaveBeenCalledTimes(1)
    const opened = onTicketEdit.mock.calls[0]?.[0] as Ticket
    expect(opened.code).toBe('MDT-100')
  })

  it('places the lifecycle action (Close/Activate) directly under the progress bar, not pinned to the bottom', () => {
    const { container } = renderBoard()
    const lane = container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-100"]')
    expect(lane).not.toBeNull()
    const progressRow = lane!.querySelector('.swimlane-board__progress-row')
    const lifecycle = lane!.querySelector('[data-testid="swimlane-lifecycle-action"]')
    expect(progressRow).not.toBeNull()
    expect(lifecycle).not.toBeNull()
    // lifecycle immediately follows progress row in DOM order
    expect(progressRow!.nextElementSibling?.contains(lifecycle as Element)).toBe(true)
  })

  it('places the collapse chevron glyph on the same row as the status + count, aligned to the right', () => {
    const { container } = renderBoard()
    const lane = container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-100"]')
    expect(lane).not.toBeNull()
    const meta = lane!.querySelector('.swimlane-board__lane-meta')
    const chevron = lane!.querySelector('.swimlane-board__collapse')
    expect(meta).not.toBeNull()
    expect(chevron).not.toBeNull()
    // chevron glyph is the last child of the meta row (right-aligned)
    expect(meta!.lastElementChild).toBe(chevron)
  })

  it('wraps long lane titles instead of ellipsing to one line', () => {
    const { container } = renderBoard()
    // The title renders in a dedicated word-wrap element (CSS applies
    // overflow-wrap/word-break: break-word). Layout truth — that long words
    // actually break — is verified in E2E where the stylesheet resolves; here
    // we assert the wrapping hook exists and carries the title text.
    const title = container.querySelector('.swimlane-board__lane-title-text')
    expect(title).not.toBeNull()
    expect(title!.textContent).toContain('Auth Overhaul')
  })

  // --- Collapse approach (design3 §8): whole-label toggle + horizontal reflow ---

  it('toggles collapse when the whole lane label is clicked (not just the chevron)', () => {
    const { container } = renderBoard()
    const label = container.querySelector('[data-testid="swimlane-lane-label"]') as HTMLElement
    expect(label).not.toBeNull()
    const lane = label.closest('[data-testid="swimlane-lane"]')
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(false)

    fireEvent.click(label)
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(true)

    fireEvent.click(label)
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(false)
  })

  it('carries the lane label as a button role with aria-expanded reflecting collapse state', () => {
    const { container } = renderBoard()
    const label = container.querySelector('[data-testid="swimlane-lane-label"]') as HTMLElement
    // role=button container (not a <button> element) so real <button> children
    // stay HTML-valid inside it.
    expect(label.getAttribute('role')).toBe('button')
    expect(label.tabIndex).toBe(0)
    expect(label.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(label)
    expect(label.getAttribute('aria-expanded')).toBe('false')
  })

  it('hides the lane body when collapsed', () => {
    const { container } = renderBoard()
    const label = container.querySelector('[data-testid="swimlane-lane-label"]') as HTMLElement
    const body = container.querySelector('[data-testid="swimlane-lane-body"]') as HTMLElement
    expect(body.hidden).toBe(false)

    fireEvent.click(label)
    expect(body.hidden).toBe(true)
  })

  it('does not toggle collapse when an interactive child (key, lifecycle, open-epic) is clicked', () => {
    const { container } = renderBoard()
    const lane = container.querySelector('[data-testid="swimlane-lane"]')
    const laneBefore = lane?.classList.contains('swimlane-board__lane--collapsed')

    // Epic key opens the ticket, not a collapse toggle.
    const key = screen.getByTestId('swimlane-lane-key')
    fireEvent.click(key)
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(laneBefore)

    // Lifecycle action does its own thing, not a collapse toggle.
    const lifecycle = screen.getByTestId('swimlane-lifecycle-action')
    fireEvent.click(lifecycle)
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(laneBefore)

    // Open-epic icon opens the ticket, not a collapse toggle.
    const openEpic = screen.getByTestId('swimlane-open-epic')
    fireEvent.click(openEpic)
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(laneBefore)
  })
})
