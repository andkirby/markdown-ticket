import type { TicketFilters } from '@mdt/domain-contracts'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { DesktopFilterBar } from './DesktopFilterBar'

afterEach(cleanup)

const FACET_OPTIONS = {
  assignee: ['alice@example.com'],
  phaseEpic: [],
  impactAreas: [],
}

describe('DesktopFilterBar', () => {
  describe('S11 — empty state', () => {
    it('renders bare facet trigger labels', () => {
      render(
        <DesktopFilterBar
          filters={{}}
          totalCount={14}
          filteredCount={14}
          facetOptions={FACET_OPTIONS}
          onQueryChange={() => {}}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      const triggers = screen.getAllByTestId('facet-dropdown-trigger')
      const labels = triggers.map(t => t.textContent)
      expect(labels).toEqual(['Status', 'Priority', 'Assignee', 'Type'])
    })

    it('shows "Showing all N tickets" when no filter active', () => {
      render(
        <DesktopFilterBar
          filters={{}}
          totalCount={14}
          filteredCount={14}
          facetOptions={FACET_OPTIONS}
          onQueryChange={() => {}}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      expect(screen.getByTestId('filter-result-count').textContent).toContain('Showing all 14 tickets')
    })
  })

  describe('S12 — active state', () => {
    const activeFilters: TicketFilters = {
      status: ['In Progress', 'Approved'],
      priority: ['High'],
    }

    it('trigger labels show counts', () => {
      render(
        <DesktopFilterBar
          filters={activeFilters}
          totalCount={14}
          filteredCount={3}
          facetOptions={FACET_OPTIONS}
          onQueryChange={() => {}}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      const triggers = screen.getAllByTestId('facet-dropdown-trigger')
      const labels = triggers.map(t => t.textContent)
      expect(labels).toEqual(['Status: 2', 'Priority: 1', 'Assignee', 'Type'])
    })

    it('renders chips for active values', () => {
      render(
        <DesktopFilterBar
          filters={activeFilters}
          totalCount={14}
          filteredCount={3}
          facetOptions={FACET_OPTIONS}
          onQueryChange={() => {}}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      expect(screen.getAllByTestId('active-filter-chip')).toHaveLength(3)
    })

    it('shows "Showing N of M" with filtered count', () => {
      render(
        <DesktopFilterBar
          filters={activeFilters}
          totalCount={14}
          filteredCount={3}
          facetOptions={FACET_OPTIONS}
          onQueryChange={() => {}}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      expect(screen.getByTestId('filter-result-count').textContent).toBe('Showing 3 of 14 tickets')
    })
  })

  describe('S14 — Clear all', () => {
    it('clicking Clear all calls onClearAll', () => {
      const onClearAll = mock()
      render(
        <DesktopFilterBar
          filters={{ status: ['In Progress'] }}
          totalCount={14}
          filteredCount={5}
          facetOptions={FACET_OPTIONS}
          onQueryChange={() => {}}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={onClearAll}
        />,
      )
      fireEvent.click(screen.getByTestId('clear-all-filters'))
      expect(onClearAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('query input', () => {
    it('typing in the search input calls onQueryChange', () => {
      const onQueryChange = mock()
      render(
        <DesktopFilterBar
          filters={{ query: '' }}
          totalCount={14}
          filteredCount={14}
          facetOptions={FACET_OPTIONS}
          onQueryChange={onQueryChange}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'login' } })
      expect(onQueryChange).toHaveBeenCalledWith('login')
    })
  })

  describe('S25 — result count is an aria-live region', () => {
    it('the result count has aria-live="polite"', () => {
      render(
        <DesktopFilterBar
          filters={{}}
          totalCount={14}
          filteredCount={14}
          facetOptions={FACET_OPTIONS}
          onQueryChange={() => {}}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      expect(screen.getByTestId('filter-result-count').getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('toolbar landmark', () => {
    it('the bar is a toolbar with an accessible label', () => {
      render(
        <DesktopFilterBar
          filters={{}}
          totalCount={14}
          filteredCount={14}
          facetOptions={FACET_OPTIONS}
          onQueryChange={() => {}}
          onToggle={() => {}}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      const bar = screen.getByTestId('desktop-filter-bar')
      expect(bar.getAttribute('role')).toBe('toolbar')
      expect(bar.getAttribute('aria-label')).toBe('Filter tickets')
    })
  })
})
