import type { Project } from '@mdt/shared/models/Project'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { ProjectBrowserPanel } from './ProjectBrowserPanel'

function makeProject(code: string, name: string, description: string): Project {
  return {
    id: code.toLowerCase(),
    project: {
      id: code.toLowerCase(),
      code,
      name,
      path: `/tmp/${code.toLowerCase()}`,
      configFile: `/tmp/${code.toLowerCase()}/.mdt-config.toml`,
      active: true,
      description,
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2025-01-01',
      lastAccessed: '2025-01-01',
      version: '1.0.0',
    },
  }
}

const projects = [
  makeProject('MDT', 'Markdown Ticket', 'Current project'),
  makeProject('API', 'Service Gateway', 'Internal platform'),
  makeProject('OPS', 'Operations Console', 'Deployment workflows'),
  makeProject('FIN', 'Ledger', 'Billing and revenue tools'),
]

function renderPanel(selectorState: Record<string, any> = {}) {
  return render(
    <ProjectBrowserPanel
      projects={projects}
      activeProjectKey="MDT"
      preferences={{ visibleCount: 7, compactInactive: true }}
      selectorState={selectorState}
      onProjectSelect={mock()}
      isOpen={true}
      onClose={mock()}
    />,
  )
}

describe('ProjectBrowserPanel search', () => {
  afterEach(() => {
    cleanup()
  })

  it('matches projects by code, title, and description', () => {
    renderPanel()
    const searchInput = screen.getByTestId('project-browser-search-input')

    fireEvent.change(searchInput, { target: { value: 'api' } })
    expect(screen.getByTestId('project-browser-card-API')).toBeInTheDocument()
    expect(screen.queryByTestId('project-browser-card-OPS')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'operations' } })
    expect(screen.getByTestId('project-browser-card-OPS')).toBeInTheDocument()
    expect(screen.queryByTestId('project-browser-card-API')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'billing' } })
    expect(screen.getByTestId('project-browser-card-FIN')).toBeInTheDocument()
    expect(screen.queryByTestId('project-browser-card-OPS')).not.toBeInTheDocument()
  })
})

describe('ProjectBrowserPanel accent rendering - MDT-181', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a filled identity area for a configured browser-card accent', () => {
    renderPanel({
      API: {
        favorite: false,
        lastUsedAt: '2026-06-07T12:00:00.000Z',
        count: 1,
        accent: '#2563eb',
      },
    })

    const card = screen.getByTestId('project-browser-card-API')
    expect(card).toBeInTheDocument()
    expect(card.querySelector('.project-card__identity')).toBeInTheDocument()
  })

  it('renders identity fill without auto-discovering project-folder images when no accent is configured', () => {
    renderPanel()

    const card = screen.getByTestId('project-browser-card-API')
    expect(card).toBeInTheDocument()
    expect(card.querySelector('.project-card__identity')).toBeInTheDocument()
    expect(card.querySelector('img')).toBeNull()
  })
})

describe('ProjectBrowserPanel keyboard navigation - MDT-129 BR-11', () => {
  // jsdom reports a 1-column grid, so by default these tests only exercise
  // the linear fallback. Force a real 2-column layout via getComputedStyle so
  // the Excel-grid math (Down = same column) is actually verified — this is
  // the assertion that catches the zigzag regression. Column navigation that
  // depends on live CSS is covered here, not only in e2e.
  let realGetComputedStyle: typeof window.getComputedStyle
  let realScrollIntoView: typeof HTMLElement.prototype.scrollIntoView

  beforeEach(() => {
    realGetComputedStyle = window.getComputedStyle
    realScrollIntoView = HTMLElement.prototype.scrollIntoView
  })
  afterEach(() => {
    window.getComputedStyle = realGetComputedStyle
    HTMLElement.prototype.scrollIntoView = realScrollIntoView
    cleanup()
  })

  const forceColumns = (n: number) => {
    window.getComputedStyle = (((el: Element) => ({
      ...realGetComputedStyle(el),
      gridTemplateColumns: Array.from({ length: n }, () => '1fr').join(' '),
    })) as unknown) as typeof window.getComputedStyle
  }

  it('BR-11: the active project is highlighted when the panel opens', () => {
    renderPanel()
    // MDT is the active project and sits first in the default ordering
    expect(screen.getByTestId('project-browser-card-MDT').getAttribute('data-selected')).toBe('true')
  })

  it('BR-11.2: Down moves down the SAME column (Excel-grid), not zigzag to the next column', () => {
    renderPanel()
    // 2-column layout, row-major:
    //   col0      col1
    //   MDT(0)    API(1)
    //   OPS(2)    FIN(3)
    forceColumns(2)
    const searchInput = screen.getByTestId('project-browser-search-input')

    // Highlight starts on MDT (col0, row0). Down moves down the SAME column.
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
    expect(screen.getByTestId('project-browser-card-OPS').getAttribute('data-selected')).toBe('true')
    // API is in the OTHER column and must NOT be highlighted (no zigzag)
    expect(screen.getByTestId('project-browser-card-API').getAttribute('data-selected')).toBeNull()

    // Down again wraps within col0 back to its top (MDT)
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
    expect(screen.getByTestId('project-browser-card-MDT').getAttribute('data-selected')).toBe('true')

    // Right moves to the next column (same row) = API
    fireEvent.keyDown(searchInput, { key: 'ArrowRight' })
    expect(screen.getByTestId('project-browser-card-API').getAttribute('data-selected')).toBe('true')

    // Up from API (col1, row0) wraps to the bottom of col1 = FIN
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' })
    expect(screen.getByTestId('project-browser-card-FIN').getAttribute('data-selected')).toBe('true')

    // Left moves to the previous index (cyclic) = OPS
    fireEvent.keyDown(searchInput, { key: 'ArrowLeft' })
    expect(screen.getByTestId('project-browser-card-OPS').getAttribute('data-selected')).toBe('true')
  })

  it('BR-11.3: cyclic wrap within a column (Down on last-in-column wraps to column top)', () => {
    renderPanel()
    forceColumns(2) // Row0=[MDT(0), API(1)], Row1=[OPS(2), FIN(3)]
    const searchInput = screen.getByTestId('project-browser-search-input')

    // Move to FIN (col 1, last row)
    fireEvent.keyDown(searchInput, { key: 'ArrowRight' }) // MDT -> API (col 1)
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' }) // API -> FIN
    expect(screen.getByTestId('project-browser-card-FIN').getAttribute('data-selected')).toBe('true')

    // Down on FIN wraps to the top of col 1 = API
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
    expect(screen.getByTestId('project-browser-card-API').getAttribute('data-selected')).toBe('true')

    // Up on MDT (col 0, row 0) wraps to the bottom of col 0 = OPS
    fireEvent.keyDown(searchInput, { key: 'ArrowLeft' }) // API -> MDT
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' })
    expect(screen.getByTestId('project-browser-card-OPS').getAttribute('data-selected')).toBe('true')
  })

  it('BR-11.4: typing after navigating keeps focus in the search field and updates the query', () => {
    renderPanel()
    const searchInput = screen.getByTestId('project-browser-search-input') as HTMLInputElement
    // Model the post-open autofocus (the open effect focuses via requestAnimationFrame,
    // which does not reliably fire in jsdom). The implementation never moves focus off the input.
    searchInput.focus()
    expect(document.activeElement).toBe(searchInput)
    expect(screen.getByTestId('project-browser-card-MDT').getAttribute('data-selected')).toBe('true')

    // Type to refine the query; focus never left the input
    fireEvent.change(searchInput, { target: { value: 'api' } })

    expect(searchInput.value).toBe('api')
    expect(document.activeElement).toBe(searchInput)
    // Highlight clears when a search query is active
    expect(screen.getByTestId('project-browser-card-API').getAttribute('data-selected')).toBeNull()
    // The keystroke was not stranded: the list reflects the typed query
    expect(screen.queryByTestId('project-browser-card-OPS')).not.toBeInTheDocument()
  })

  it('BR-11.5: Enter selects the highlighted project and closes the panel', () => {
    const onProjectSelect = mock()
    const onClose = mock()
    render(
      <ProjectBrowserPanel
        projects={projects}
        activeProjectKey="MDT"
        preferences={{ visibleCount: 7, compactInactive: true }}
        selectorState={{}}
        onProjectSelect={onProjectSelect}
        isOpen={true}
        onClose={onClose}
      />,
    )
    const searchInput = screen.getByTestId('project-browser-search-input')
    forceColumns(2) // Row0=[MDT(0), API(1)]

    // Move from MDT (active, highlighted) to API via Right, then Enter
    fireEvent.keyDown(searchInput, { key: 'ArrowRight' })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(onProjectSelect).toHaveBeenCalledWith('API')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Enter with a search active and no explicit highlight is a no-op', () => {
    const onProjectSelect = mock()
    render(
      <ProjectBrowserPanel
        projects={projects}
        activeProjectKey="MDT"
        preferences={{ visibleCount: 7, compactInactive: true }}
        selectorState={{}}
        onProjectSelect={onProjectSelect}
        isOpen={true}
        onClose={mock()}
      />,
    )
    const searchInput = screen.getByTestId('project-browser-search-input') as HTMLInputElement

    // A non-empty query clears the highlight while results still exist
    fireEvent.change(searchInput, { target: { value: 'api' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(onProjectSelect).not.toHaveBeenCalled()
  })

  it('BR-11.6: the highlighted card is scrolled into view when the highlight moves', () => {
    const scrollIntoView = mock()
    HTMLElement.prototype.scrollIntoView = scrollIntoView as unknown as typeof HTMLElement.prototype.scrollIntoView
    renderPanel()
    forceColumns(2)
    const searchInput = screen.getByTestId('project-browser-search-input')

    // On open the active project (MDT) is highlighted and scrolled into view
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    ;(scrollIntoView as unknown as { mockClear: () => void }).mockClear()

    // Moving the highlight with the keyboard must scroll the new card into view
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('browser cards are listbox options, not tab-focusable (focus stays in the input)', () => {
    renderPanel()
    const apiCard = screen.getByTestId('project-browser-card-API')

    expect(apiCard.getAttribute('role')).toBe('option')
    expect(apiCard.getAttribute('tabindex')).toBe('-1')
  })

  it('regression: Tab does not escape the panel to <body> and strands arrow keys (BR-11.2/BR-11.4)', () => {
    renderPanel()
    forceColumns(2) // Row0=[MDT(0), API(1)], Row1=[OPS(2), FIN(3)]
    const searchInput = screen.getByTestId('project-browser-search-input') as HTMLInputElement
    searchInput.focus()
    expect(document.activeElement).toBe(searchInput)

    // Tab acts as Down (same column): MDT -> OPS, focus stays in the input
    fireEvent.keyDown(searchInput, { key: 'Tab' })
    expect(document.activeElement).toBe(searchInput)
    expect(screen.getByTestId('project-browser-card-OPS').getAttribute('data-selected')).toBe('true')

    // Shift+Tab moves back up the column, still without escaping
    fireEvent.keyDown(searchInput, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(searchInput)
    expect(screen.getByTestId('project-browser-card-MDT').getAttribute('data-selected')).toBe('true')
  })
})
