import type { TicketFilters } from '@mdt/domain-contracts'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { ActiveFilterChips, deriveActiveEntries } from './ActiveFilterChips'

afterEach(cleanup)

describe('ActiveFilterChips', () => {
  describe('deriveActiveEntries', () => {
    it('returns no entries for an empty filter', () => {
      expect(deriveActiveEntries({})).toEqual([])
    })

    it('returns one entry per selected value in facet order', () => {
      const filters: TicketFilters = { status: ['In Progress', 'Approved'], priority: 'High' }
      expect(deriveActiveEntries(filters)).toEqual([
        { facet: 'status', value: 'In Progress' },
        { facet: 'status', value: 'Approved' },
        { facet: 'priority', value: 'High' },
      ])
    })
  })

  describe('S12 — active state renders chips', () => {
    it('renders one chip per active value', () => {
      render(
        <ActiveFilterChips
          filters={{ status: ['In Progress', 'Approved'], priority: ['High'] }}
          onRemove={() => {}}
        />,
      )
      const chips = screen.getAllByTestId('active-filter-chip')
      expect(chips).toHaveLength(3)
    })

    it('renders Clear all when onClearAll is provided', () => {
      render(
        <ActiveFilterChips
          filters={{ status: ['In Progress'] }}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      expect(screen.getByTestId('clear-all-filters')).toBeDefined()
    })
  })

  describe('S11 — empty state renders nothing', () => {
    it('renders null when no filters active', () => {
      const { container } = render(<ActiveFilterChips filters={{}} onRemove={() => {}} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('S13 — chip remove calls onRemove with facet+value', () => {
    it('clicking a chip remove dispatches the correct facet and value', () => {
      const onRemove = mock()
      render(
        <ActiveFilterChips
          filters={{ status: ['In Progress', 'Approved'] }}
          onRemove={onRemove}
        />,
      )
      const chips = screen.getAllByTestId('active-filter-chip')
      const firstRemove = chips[0].querySelector('[data-testid="active-filter-chip-remove"]')!
      fireEvent.click(firstRemove)
      expect(onRemove).toHaveBeenCalledWith('status', 'In Progress')
    })
  })

  describe('S14 — Clear all calls onClearAll', () => {
    it('clicking Clear all fires the callback', () => {
      const onClearAll = mock()
      render(
        <ActiveFilterChips
          filters={{ status: ['In Progress'] }}
          onRemove={() => {}}
          onClearAll={onClearAll}
        />,
      )
      fireEvent.click(screen.getByTestId('clear-all-filters'))
      expect(onClearAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('S24 — chips are buttons with aria-labels', () => {
    it('each chip remove has a descriptive aria-label', () => {
      render(
        <ActiveFilterChips
          filters={{ priority: ['High'] }}
          onRemove={() => {}}
        />,
      )
      const remove = screen.getByLabelText('Remove filter: Priority High')
      expect(remove).toBeDefined()
    })

    it('Clear all has aria-label "Clear all filters"', () => {
      render(
        <ActiveFilterChips
          filters={{ priority: ['High'] }}
          onRemove={() => {}}
          onClearAll={() => {}}
        />,
      )
      expect(screen.getByLabelText('Clear all filters')).toBeDefined()
    })

    it('assignee sentinel maps to "Unassigned" in the label', () => {
      render(
        <ActiveFilterChips
          filters={{ assignee: ['__none__'] }}
          onRemove={() => {}}
        />,
      )
      expect(screen.getByLabelText('Remove filter: Assignee Unassigned')).toBeDefined()
    })
  })
})
