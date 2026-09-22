import type { Ticket } from '../../types'
import { CRStatus } from '@mdt/domain-contracts'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act } from 'react'
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

function renderBoard(overrides: { tickets?: Ticket[], onTicketEdit?: (t: Ticket) => void, focusEpicKey?: string | null } = {}) {
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
  const buildTree = (focusEpicKey: string | null) => (
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
                focusEpicKey={focusEpicKey}
              />
            )}
          />
        </Routes>
      </MemoryRouter>
    </DndProvider>
  )
  const utils = render(buildTree(overrides.focusEpicKey ?? null))
  return { ...utils, onTicketEdit, rerenderWithFocus: (key: string | null) => utils.rerender(buildTree(key)) }
}

describe('SwimlaneBoard lane label (MDT-206 UAT round)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

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
  // Default is now collapsed-by-default (UAT round 4). Tests that need an
  // expanded lane persist {} to localStorage first, or click to expand.

  it('collapses all lanes by default on first load', () => {
    const { container } = renderBoard()
    const lanes = container.querySelectorAll('[data-testid="swimlane-lane"]')
    expect(lanes.length).toBeGreaterThan(0)
    lanes.forEach((lane) => {
      expect(lane.classList.contains('swimlane-board__lane--collapsed')).toBe(true)
    })
  })

  it('persists collapsed/expanded lane state to localStorage', () => {
    const { container } = renderBoard()
    const label = container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-100"]') as HTMLElement
    // default-collapsed; expand it
    fireEvent.click(label)
    const stored = localStorage.getItem('mdt-settings-swimlane-expanded-lanes')
    expect(stored).not.toBeNull()
    const expanded = JSON.parse(stored!) as string[]
    expect(expanded).toContain('MDT-100')
  })

  it('restores expanded lanes from localStorage on load', () => {
    localStorage.setItem('mdt-settings-swimlane-expanded-lanes', JSON.stringify(['MDT-100']))
    const { container } = renderBoard()
    const lane = container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-100"]')
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(false)
  })

  it('toggles collapse when the whole lane label is clicked (not just the chevron)', () => {
    const { container } = renderBoard()
    const label = container.querySelector('[data-testid="swimlane-lane-label"]') as HTMLElement
    expect(label).not.toBeNull()
    const lane = label.closest('[data-testid="swimlane-lane"]')
    // starts collapsed (default); first click expands
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(true)

    fireEvent.click(label)
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(false)

    fireEvent.click(label)
    expect(lane?.classList.contains('swimlane-board__lane--collapsed')).toBe(true)
  })

  it('carries the lane label as a button role with aria-expanded reflecting collapse state', () => {
    const { container } = renderBoard()
    const label = container.querySelector('[data-testid="swimlane-lane-label"]') as HTMLElement
    expect(label.getAttribute('role')).toBe('button')
    expect(label.tabIndex).toBe(0)
    // default-collapsed
    expect(label.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(label)
    expect(label.getAttribute('aria-expanded')).toBe('true')
  })

  it('hides the lane body when collapsed (default state)', () => {
    const { container } = renderBoard()
    const body = container.querySelector('[data-testid="swimlane-lane-body"]') as HTMLElement
    // default-collapsed
    expect(body.hidden).toBe(true)

    const label = container.querySelector('[data-testid="swimlane-lane-label"]') as HTMLElement
    fireEvent.click(label)
    expect(body.hidden).toBe(false)
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

  // --- UAT round 4: Show closed toggle + collapsed key-before-title ---

  it('hides closed (Implemented) epic lanes by default and shows them when Show closed is on', () => {
    const closedEpic = ticket({
      code: 'MDT-200',
      title: 'Closed Epic',
      status: CRStatus.IMPLEMENTED,
      level: 'epic',
      priority: 'Medium',
    })
    const closedChild = ticket({
      code: 'MDT-201',
      title: 'Closed child',
      status: CRStatus.IMPLEMENTED,
      phaseEpic: 'MDT-200',
      priority: 'Medium',
    })
    const all = [closedEpic, closedChild]
    const { container } = renderBoard({ tickets: all })

    // Closed epic lane is hidden by default.
    expect(container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-200"]')).toBeNull()

    // Toggle Show closed on.
    fireEvent.click(screen.getByTestId('swimlane-show-closed'))
    expect(container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-200"]')).not.toBeNull()
  })

  it('places the epic key block before the title in the collapsed layout (single line)', () => {
    const { container } = renderBoard()
    // Default is collapsed, so the collapsed layout is active.
    const label = container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-100"]') as HTMLElement
    const key = label.querySelector('[data-testid="swimlane-lane-key"]') as HTMLElement
    const title = label.querySelector('.swimlane-board__lane-title-text') as HTMLElement

    // Both exist and the key precedes the title in DOM order.
    expect(key).not.toBeNull()
    expect(title).not.toBeNull()
    const keyPos = Array.prototype.indexOf.call(label.querySelectorAll('*'), key)
    const titlePos = Array.prototype.indexOf.call(label.querySelectorAll('*'), title)
    // In the collapsed layout, the key comes before the title text.
    expect(keyPos).toBeLessThan(titlePos)
  })
})

// --- UAT round 6: swimlane status columns are collapsible (like the Board) ---
// Column collapse shares the Board's mdt-settings-collapsed-columns key (keyed
// by primary status), so collapsing a status in one view collapses it in the
// other. Lane collapse (above) is a separate, independent mechanism.

describe('SwimlaneBoard column collapse (MDT-206 UAT round 6)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders a collapse control on each swimlane column header', () => {
    renderBoard()
    // Three columns → three collapse chevrons, each tagged by primary status.
    const chevrons = screen.getAllByTestId('swimlane-col-collapse')
    expect(chevrons.length).toBe(columns.length)
    expect(chevrons.some(c => c.getAttribute('data-status') === 'Approved')).toBe(true)
  })

  it('collapses a swimlane column into a narrow rail and persists to the shared board key', () => {
    const { container } = renderBoard()
    // Collapse the "Open" (Approved) column. The chevron button carries the testid.
    const openChevron = container.querySelector('[data-testid="swimlane-col-collapse"][data-status="Approved"]') as HTMLElement
    expect(openChevron).not.toBeNull()
    fireEvent.click(openChevron)

    // Shared key (same one the flat Board uses) now contains the primary status.
    const stored = localStorage.getItem('mdt-settings-collapsed-columns')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!)).toContain('Approved')

    // The header is replaced by a click-to-expand rail.
    expect(container.querySelector('[data-testid="swimlane-col-expand"][data-status="Approved"]')).not.toBeNull()

    // The lane-body cell for that column is a narrow strip, not a drop zone.
    expect(container.querySelector('[data-testid="swimlane-lane-col-rail"][data-status="Approved"]')).not.toBeNull()
    // No active drop zone for the collapsed column in any lane.
    expect(container.querySelectorAll('[data-testid="swimlane-lane-col"][data-status="Approved"]').length).toBe(0)
  })

  it('expands a collapsed column from the rail', () => {
    localStorage.setItem('mdt-settings-collapsed-columns', JSON.stringify(['Approved']))
    const { container } = renderBoard()

    // Collapsed header renders the expand rail.
    const expandRail = container.querySelector('[data-testid="swimlane-col-expand"][data-status="Approved"]') as HTMLElement
    expect(expandRail).not.toBeNull()
    // No chevron for the collapsed column.
    expect(container.querySelector('[data-testid="swimlane-col-collapse"][data-status="Approved"]')).toBeNull()

    // Click the rail to expand.
    fireEvent.click(expandRail)
    expect(container.querySelector('[data-testid="swimlane-col-collapse"][data-status="Approved"]')).not.toBeNull()
    expect(JSON.parse(localStorage.getItem('mdt-settings-collapsed-columns')!)).not.toContain('Approved')
  })

  it('expands a collapsed column by clicking any lane strip in that column (Board parity)', () => {
    localStorage.setItem('mdt-settings-collapsed-columns', JSON.stringify(['Approved']))
    const { container } = renderBoard()

    // A collapsed column renders a strip per lane; the strip is clickable (a
    // button), not a dead div — matching the flat Board where the whole
    // collapsed column is one click target.
    const strip = container.querySelector('[data-testid="swimlane-lane-col-rail"][data-status="Approved"]') as HTMLElement
    expect(strip).not.toBeNull()
    expect(strip.tagName).toBe('BUTTON')
    expect(strip.getAttribute('aria-label')).toContain('Expand')

    // Clicking the strip expands the column (chevron returns, key cleared).
    fireEvent.click(strip)
    expect(container.querySelector('[data-testid="swimlane-col-collapse"][data-status="Approved"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="swimlane-lane-col-rail"][data-status="Approved"]')).toBeNull()
    expect(JSON.parse(localStorage.getItem('mdt-settings-collapsed-columns')!)).not.toContain('Approved')
  })

  it('restores collapsed columns from the shared localStorage key on load', () => {
    localStorage.setItem('mdt-settings-collapsed-columns', JSON.stringify(['Approved']))
    const { container } = renderBoard()
    expect(container.querySelector('[data-testid="swimlane-col-expand"][data-status="Approved"]')).not.toBeNull()
  })

  it('keeps lane collapse and column collapse independent', () => {
    const { container } = renderBoard()
    // Expand the lane (default-collapsed) and collapse the column.
    const label = container.querySelector('[data-testid="swimlane-lane-label"]') as HTMLElement
    fireEvent.click(label)
    expect(container.querySelector('[data-testid="swimlane-lane"]')?.classList.contains('swimlane-board__lane--collapsed')).toBe(false)

    const openChevron = container.querySelector('[data-testid="swimlane-col-collapse"][data-status="Approved"]') as HTMLElement
    fireEvent.click(openChevron)

    // Lane stays expanded; column is now collapsed.
    expect(container.querySelector('[data-testid="swimlane-lane"]')?.classList.contains('swimlane-board__lane--collapsed')).toBe(false)
    expect(container.querySelector('[data-testid="swimlane-col-expand"][data-status="Approved"]')).not.toBeNull()
  })

  it('syncs column collapse when the shared change event fires (cross-view/tab contract)', async () => {
    const { container } = renderBoard()
    expect(container.querySelector('[data-testid="swimlane-col-expand"][data-status="Approved"]')).toBeNull()

    // Simulate the Board (or another tab) writing the setting + dispatching.
    // Wrapped in act() because a raw dispatchEvent triggers a setState outside
    // React's batching boundary (the production listener is identical to the
    // flat Board's verified pattern).
    localStorage.setItem('mdt-settings-collapsed-columns', JSON.stringify(['Approved']))
    await act(async () => {
      window.dispatchEvent(new CustomEvent('markdown-ticket:settings:collapsed-columns-change', {
        detail: { columns: ['Approved'] },
      }))
    })

    expect(container.querySelector('[data-testid="swimlane-col-expand"][data-status="Approved"]')).not.toBeNull()
  })
})

describe('SwimlaneBoard toolbar search (MDT-206 BR-6.1, UAT rounds 7–9)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  function renderSearchBoard() {
    const epic = ticket({
      code: 'MDT-010',
      title: 'Auth Overhaul',
      status: 'Approved',
      level: 'epic',
    })
    const login = ticket({ code: 'MDT-012', title: 'Fix login flow', status: 'Approved', phaseEpic: 'MDT-010' })
    const rate = ticket({ code: 'MDT-003', title: 'Rate limits', status: 'Proposed', phaseEpic: 'MDT-010' })
    return renderBoard({ tickets: [epic, login, rate] })
  }

  it('renders the search field in the toolbar next to the toggles', () => {
    renderSearchBoard()
    const input = screen.getByTestId('swimlane-search')
    expect(input).toBeDefined()
    expect(input.getAttribute('aria-label')).toBe('Search epics by title or key')
    expect(screen.getByTestId('swimlane-hide-empty')).toBeDefined()
    expect(screen.getByTestId('swimlane-show-closed')).toBeDefined()
  })

  it('renders filters as an aria-pressed toggle group, not checkboxes (round 9 pattern)', () => {
    renderSearchBoard()
    expect(screen.getByRole('group', { name: 'Swimlane filters' })).toBeDefined()
    for (const testId of ['swimlane-hide-empty', 'swimlane-show-badges', 'swimlane-show-closed']) {
      const btn = screen.getByTestId(testId)
      expect(btn.tagName).toBe('BUTTON')
      expect(btn.getAttribute('aria-pressed')).toBe('false')
    }
    // One-shot actions never carry pressable state.
    expect(screen.getByTestId('swimlane-collapse-all').getAttribute('aria-pressed')).toBeNull()
    expect(screen.getByTestId('swimlane-expand-all').getAttribute('aria-pressed')).toBeNull()
  })

  it('removes the lane when only child tickets match the query (round 9: epics only)', () => {
    const { container } = renderSearchBoard()
    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: 'LOGIN' } })
    expect(container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-010"]')).toBeNull()
  })

  it('matches the epic by bare number and by simplified key (MDT-10 → MDT-010)', () => {
    const { container } = renderSearchBoard()
    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: '10' } })
    expect(container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-010"]')).not.toBeNull()
    expect(screen.getByText('Fix login flow')).toBeDefined()
    expect(screen.getByText('Rate limits')).toBeDefined()

    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: 'MDT-10' } })
    expect(container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-010"]')).not.toBeNull()
    expect(screen.getByText('Fix login flow')).toBeDefined()
    expect(screen.getByText('Rate limits')).toBeDefined()
  })

  it('clears the search via the clear button and restores the full board', () => {
    renderSearchBoard()
    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: 'login' } })
    expect(screen.queryByText('Fix login flow')).toBeNull()

    fireEvent.click(screen.getByTestId('swimlane-search-clear'))
    expect(screen.getByText('Fix login flow')).toBeDefined()
    expect(screen.getByText('Rate limits')).toBeDefined()
    expect((screen.getByTestId('swimlane-search') as HTMLInputElement).value).toBe('')
  })

  it('keeps the whole lane when the epic title/key matches (filters the epic list)', () => {
    const { container } = renderSearchBoard()
    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: 'auth' } })
    // Epic 'Auth Overhaul' matches → its lane stays with ALL its tickets.
    const lane = container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-010"]')
    expect(lane).not.toBeNull()
    expect(screen.getByText('Fix login flow')).toBeDefined()
    expect(screen.getByText('Rate limits')).toBeDefined()
  })

  it('removes lanes entirely when nothing in them matches', () => {
    const { container } = renderSearchBoard()
    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: 'nothing matches this' } })
    expect(container.querySelectorAll('[data-testid="swimlane-lane"]').length).toBe(0)
  })

  it('does not recompute the epic progress bar for the filtered view', () => {
    renderSearchBoard()
    const before = document.querySelector('[data-testid="swimlane-progress"]')?.getAttribute('aria-valuenow')
    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: 'auth overhaul' } })
    const after = document.querySelector('[data-testid="swimlane-progress"]')?.getAttribute('aria-valuenow')
    expect(after).toBe(before)
  })
})

describe('SwimlaneBoard focused arrival (MDT-246 ?epic= token)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  function laneEl(container: HTMLElement, key: string): HTMLElement {
    return container.querySelector(`[data-testid="swimlane-lane"][data-lane-key="${key}"]`) as HTMLElement
  }

  it('expands and persists the focused lane on arrival (BR-1.4)', async () => {
    const { container } = renderBoard({ focusEpicKey: 'MDT-100' })
    await act(async () => {})

    const label = container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-100"]') as HTMLElement
    expect(label.getAttribute('aria-expanded')).toBe('true')
    const persisted = JSON.parse(localStorage.getItem('mdt-settings-swimlane-expanded-lanes') ?? '[]')
    expect(persisted).toContain('MDT-100')
  })

  it('scrolls the focused lane into view (BR-1.4)', async () => {
    const scrollIntoView = mock()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      renderBoard({ focusEpicKey: 'MDT-100' })
      await act(async () => {})
      expect(scrollIntoView).toHaveBeenCalled()
    }
    finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('transiently highlights the focused lane and auto-clears after ~2s (BR-1.4)', async () => {
    const { container } = renderBoard({ focusEpicKey: 'MDT-100' })
    await act(async () => {})
    expect(laneEl(container, 'MDT-100').hasAttribute('data-focused')).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2100))
    })
    expect(laneEl(container, 'MDT-100').hasAttribute('data-focused')).toBe(false)
    // The highlight cleared; the expansion persists.
    const label = container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-100"]') as HTMLElement
    expect(label.getAttribute('aria-expanded')).toBe('true')
  })

  it('announces the focused lane through a polite live region (BR-1.4 a11y)', async () => {
    const { container } = renderBoard({ focusEpicKey: 'MDT-100' })
    await act(async () => {})
    const live = container.querySelector('[role="status"][aria-live="polite"]') as HTMLElement
    expect(live).not.toBeNull()
    expect(live.textContent).toContain('MDT-100')
    expect(live.textContent).toMatch(/expand/i)
  })

  it('renders the focused lane despite hideEmpty when the token arrives (BR-1.5)', async () => {
    const emptyEpic = ticket({ code: 'MDT-100', title: 'Auth Overhaul', status: 'Approved', level: 'epic' })
    const otherEpic = ticket({ code: 'MDT-200', title: 'Other Epic', status: 'Approved', level: 'epic' })
    const otherChild = ticket({ code: 'MDT-201', title: 'Other child', status: 'Approved', phaseEpic: 'MDT-200' })
    const { container, rerenderWithFocus } = renderBoard({ tickets: [emptyEpic, otherEpic, otherChild] })

    // Hide empty on: the empty focused lane is excluded before the token arrives.
    fireEvent.click(screen.getByTestId('swimlane-hide-empty'))
    expect(container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-100"]')).toBeNull()

    // Token changes while mounted (arrival): the focused lane renders anyway and
    // the filter toggle is untouched.
    rerenderWithFocus('MDT-100')
    await act(async () => {})
    expect(laneEl(container, 'MDT-100')).not.toBeNull()
    expect(screen.getByTestId('swimlane-hide-empty').getAttribute('aria-pressed')).toBe('true')
  })

  it('clears an active non-matching search on arrival (BR-1.5)', async () => {
    const { container, rerenderWithFocus } = renderBoard({ focusEpicKey: null })

    // Active search that excludes the focused lane before the token arrives.
    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: 'nothing matches' } })
    expect(container.querySelector('[data-testid="swimlane-lane"][data-lane-key="MDT-100"]')).toBeNull()

    // Arrival: the non-matching search is cleared; the lane is present.
    rerenderWithFocus('MDT-100')
    await act(async () => {})
    expect((screen.getByTestId('swimlane-search') as HTMLInputElement).value).toBe('')
    expect(laneEl(container, 'MDT-100')).not.toBeNull()
  })

  it('ignores an unknown epic key — board renders normally, nothing persisted (BR-1.6)', async () => {
    const { container } = renderBoard({ focusEpicKey: 'MDT-999' })
    await act(async () => {})

    const label = container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-100"]') as HTMLElement
    expect(label.getAttribute('aria-expanded')).toBe('false')
    expect(localStorage.getItem('mdt-settings-swimlane-expanded-lanes')).toBeNull()
    expect(container.querySelector('[role="status"][aria-live="polite"]')?.textContent).toBe('')
    expect(container.querySelectorAll('[data-testid="swimlane-lane"]').length).toBeGreaterThan(0)
  })

  it('keeps the lane expanded when focus ends on search interaction (INV-3)', async () => {
    const { container } = renderBoard({ focusEpicKey: 'MDT-100' })
    await act(async () => {})

    // Round 9: the query must match the epic itself ('auth' → 'Auth Overhaul');
    // a child-only match ('oauth') would remove the lane entirely.
    fireEvent.change(screen.getByTestId('swimlane-search'), { target: { value: 'auth' } })
    const label = container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-100"]') as HTMLElement
    expect(label.getAttribute('aria-expanded')).toBe('true')
    // Focus ended: the highlight is gone even before its timeout.
    expect(laneEl(container, 'MDT-100').hasAttribute('data-focused')).toBe(false)
  })

  it('scrolls once per arrival — later unrelated expansions do not re-scroll', async () => {
    const otherEpic = ticket({ code: 'MDT-200', title: 'Other Epic', status: 'Approved', level: 'epic' })
    const otherChild = ticket({ code: 'MDT-201', title: 'Other child', status: 'Approved', phaseEpic: 'MDT-200' })
    const scrolls: unknown[][] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (...args: unknown[]) {
      scrolls.push([this, args])
    }
    try {
      const { container } = renderBoard({ tickets: [ticket({ code: 'MDT-100', title: 'Auth Overhaul', status: 'Approved', level: 'epic' }), ticket({ code: 'MDT-101', title: 'Child', status: 'Approved', phaseEpic: 'MDT-100' }), otherEpic, otherChild], focusEpicKey: 'MDT-100' })
      await act(async () => {})
      const arrivalScrolls = scrolls.length
      expect(arrivalScrolls).toBeGreaterThan(0)

      // Expanding an unrelated lane must not snap back to the focused lane.
      fireEvent.click(container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-200"]') as HTMLElement)
      await act(async () => {})
      expect(scrolls.length).toBe(arrivalScrolls)
    }
    finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('ends focus when Collapse all collapses the focused lane (interactions contract)', async () => {
    const { container } = renderBoard({ focusEpicKey: 'MDT-100' })
    await act(async () => {})
    expect(laneEl(container, 'MDT-100').hasAttribute('data-focused')).toBe(true)

    fireEvent.click(screen.getByTestId('swimlane-collapse-all'))
    const label = container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-100"]') as HTMLElement
    expect(label.getAttribute('aria-expanded')).toBe('false')
    // Focus ended with the user's collapse — no override, no highlight.
    expect(laneEl(container, 'MDT-100').hasAttribute('data-focused')).toBe(false)
  })

  it('expands in-memory when localStorage persistence fails (Edge-1)', async () => {
    const original = localStorage.setItem.bind(localStorage)
    localStorage.setItem = () => {
      throw new Error('quota exceeded')
    }
    try {
      const { container } = renderBoard({ focusEpicKey: 'MDT-100' })
      await act(async () => {})
      const label = container.querySelector('[data-testid="swimlane-lane-label"][data-lane-key="MDT-100"]') as HTMLElement
      expect(label.getAttribute('aria-expanded')).toBe('true')
    }
    finally {
      localStorage.setItem = original
    }
  })
})
