/**
 * QuickSearchResults grouped rendering tests — MDT-179
 *
 * TEST-quick-search-results-grouped: N-group result rendering
 * Covering: BR-2.1, BR-2.2, BR-6.1, BR-6.3
 */

import { afterEach, describe, expect, it, vi } from 'bun:test'
import { render, screen, cleanup } from '@testing-library/react'
import { QuickSearchResults } from '@/components/QuickSearch/QuickSearchResults'
import type { ScoredProject } from '@/hooks/useProjectSearch'

const mockOnSelect = vi.fn()
const mockOnRetry = vi.fn()

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const baseProps = {
  selectedIndex: 0,
  onSelect: mockOnSelect,
  queryMode: 'global' as const,
  crossProjectResults: [] as any[],
  crossProjectLoading: false,
  crossProjectError: null,
  onRetry: mockOnRetry,
  invalidProjectCode: null as string | null,
}

function makeScoredProject(name: string, code: string, score = 80): ScoredProject {
  return {
    project: { id: `${code}-id`, project: { code, name, path: `/tmp/${code}` } } as any,
    score,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuickSearchResults — grouped rendering (MDT-179)', () => {
  it('renders Projects section with header when projectResults provided (BR-2.1)', () => {
    const projectResults = [makeScoredProject('Task Manager', 'TMGR')]

    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[]}
        projectResults={projectResults}
      />,
    )

    expect(screen.getByText('Projects')).toBeDefined()
    expect(screen.getByTestId('quick-search-projects-section')).toBeDefined()
    expect(screen.getByText('Task Manager')).toBeDefined()
  })

  it('renders Documents section with header when documentResults provided (BR-2.1)', () => {
    const documentResults = [{
      path: 'docs/guide.md',
      name: 'guide.md',
      project: { code: 'TMGR', name: 'Task Manager' },
    }]

    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[]}
        documentResults={documentResults}
      />,
    )

    expect(screen.getByText('Documents')).toBeDefined()
    expect(screen.getByTestId('quick-search-documents-section')).toBeDefined()
    expect(screen.getByText('guide.md')).toBeDefined()
  })

  it('renders all three groups when all result types present (BR-2.1)', () => {
    const projectResults = [makeScoredProject('Task Manager', 'TMGR')]
    const documentResults = [{
      path: 'docs/guide.md',
      name: 'guide.md',
      project: { code: 'TMGR', name: 'Task Manager' },
    }]

    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[{ code: 'TMGR-001', title: 'Setup' } as any]}
        projectResults={projectResults}
        documentResults={documentResults}
      />,
    )

    // All three section headers
    expect(screen.getByText('Projects')).toBeDefined()
    expect(screen.getByText('Documents')).toBeDefined()
    // Tickets shown without header when not in ticket_key mode
    expect(screen.getByText('TMGR-001')).toBeDefined()
  })

  it('renders project results with code badge and Project label (BR-2.2)', () => {
    const projectResults = [makeScoredProject('Task Manager', 'TMGR')]

    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[]}
        projectResults={projectResults}
      />,
    )

    // Code badge visible
    expect(screen.getByText('TMGR')).toBeDefined()
    // Type label visible
    expect(screen.getByText('Project')).toBeDefined()
  })

  it('renders document results with project badge (BR-2.2)', () => {
    const documentResults = [{
      path: 'docs/setup.md',
      name: 'setup.md',
      project: { code: 'MDT', name: 'Markdown Ticket' },
    }]

    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[]}
        documentResults={documentResults}
      />,
    )

    expect(screen.getByText('MDT')).toBeDefined()
    expect(screen.getByText('Markdown Ticket')).toBeDefined()
  })

  it('separates ambiguous results into different groups (BR-6.1)', () => {
    // Query matches both a project and a ticket
    const projectResults = [makeScoredProject('Config Manager', 'CONF')]

    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[{ code: 'CONF-001', title: 'Config Setup' } as any]}
        projectResults={projectResults}
      />,
    )

    // Both sections present
    expect(screen.getByTestId('quick-search-projects-section')).toBeDefined()
    // Ticket section doesn't have explicit header in non-ticket_key mode
    expect(screen.getByText('CONF-001')).toBeDefined()
    expect(screen.getByText('Config Manager')).toBeDefined()
  })

  it('shows scoped empty state when activeScope is set (BR-6.3)', () => {
    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[]}
        activeScope="tickets"
      />,
    )

    expect(screen.getByText('No results found in tickets')).toBeDefined()
  })

  it('shows generic empty state when activeScope is global (BR-6.3)', () => {
    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[]}
        activeScope="global"
      />,
    )

    expect(screen.getByText('No results found')).toBeDefined()
  })

  it('preserves backward compat: renders tickets without projectResults', () => {
    render(
      <QuickSearchResults
        {...baseProps}
        tickets={[{ code: 'MDT-179', title: 'Scoped Search' } as any]}
      />,
    )

    expect(screen.getByText('MDT-179')).toBeDefined()
    expect(screen.getByText('Scoped Search')).toBeDefined()
  })
})
