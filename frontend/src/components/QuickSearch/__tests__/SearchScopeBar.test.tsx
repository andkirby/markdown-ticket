/**
 * SearchScopeBar component tests — MDT-179
 *
 * TEST-scope-bar: Scope bar rendering
 * Covering: BR-1.2, BR-1.3, C1, C2
 */

import { describe, expect, it, vi } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchScopeBar } from '@/components/QuickSearch/SearchScopeBar'
import { SearchScope, SearchScopes } from '@mdt/domain-contracts'

describe('SearchScopeBar', () => {
  it('renders a tab for each visible scope (BR-1.2)', () => {
    render(<SearchScopeBar activeScope={SearchScope.GLOBAL} onScopeChange={() => {}} />)

    // Documents tab hidden until doc search is implemented
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
  })

  it('shows labels: All, Tickets, Projects', () => {
    render(<SearchScopeBar activeScope={SearchScope.GLOBAL} onScopeChange={() => {}} />)

    expect(screen.getByText('All')).toBeDefined()
    expect(screen.getByText('Tickets')).toBeDefined()
    expect(screen.getByText('Projects')).toBeDefined()
  })

  it('marks the active scope tab as selected', () => {
    render(<SearchScopeBar activeScope={SearchScope.TICKETS} onScopeChange={() => {}} />)

    const ticketsTab = screen.getByTestId('search-scope-tab-tickets')
    expect(ticketsTab.getAttribute('aria-selected')).toBe('true')

    const globalTab = screen.getByTestId('search-scope-tab-global')
    expect(globalTab.getAttribute('aria-selected')).toBe('false')
  })

  it('calls onScopeChange when a tab is clicked (BR-1.3)', () => {
    const handleChange = vi.fn()
    render(<SearchScopeBar activeScope={SearchScope.GLOBAL} onScopeChange={handleChange} />)

    const projectsTab = screen.getByTestId('search-scope-tab-projects')
    fireEvent.click(projectsTab)

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(SearchScope.PROJECTS)
  })

  it('has a tablist role with label', () => {
    render(<SearchScopeBar activeScope={SearchScope.GLOBAL} onScopeChange={() => {}} />)

    const tablist = screen.getByRole('tablist', { name: 'Search scope' })
    expect(tablist).toBeDefined()
  })

  it('has data-testid on each visible tab', () => {
    render(<SearchScopeBar activeScope={SearchScope.GLOBAL} onScopeChange={() => {}} />)

    // Documents tab hidden until doc search is implemented
    const visibleScopes = SearchScopes.filter(s => s !== SearchScope.DOCUMENTS)
    for (const scope of visibleScopes) {
      expect(screen.getByTestId(`search-scope-tab-${scope}`)).toBeDefined()
    }
  })
})
