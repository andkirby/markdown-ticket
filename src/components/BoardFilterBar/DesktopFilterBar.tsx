import type { TicketFilters } from '@mdt/domain-contracts'
import type { Ticket } from '../../types'
import type { FacetKey } from '../../utils/ticketFilters'
import type { FacetOption } from './FacetDropdown'
import { CRPriorities, CRStatuses, CRTypes } from '@mdt/domain-contracts'
import * as React from 'react'
import { FilterControls } from '../FilterControls'
import { ActiveFilterChips } from './ActiveFilterChips'
import { FacetDropdown } from './FacetDropdown'

export interface DesktopFilterBarProps {
  filters: TicketFilters
  /** Total tickets (before filtering) — for the "Showing N of M" count. */
  totalCount: number
  /** Tickets after filtering. */
  filteredCount: number
  /** Derived facet values from the ticket set (assignee/phaseEpic/impactAreas). */
  facetOptions: {
    assignee: string[]
    phaseEpic: string[]
    impactAreas: string[]
  }
  /** Set the free-text query. */
  onQueryChange: (query: string) => void
  /** Toggle a facet value. */
  onToggle: (facet: FacetKey, value: string) => void
  /** Remove a single value (from a chip). */
  onRemove: (facet: FacetKey, value: string) => void
  /** Clear all filters. */
  onClearAll: () => void
}

/** Map a raw value to a display label for the assignee facet. */
function assigneeLabel(value: string): string {
  return value === '__none__' ? 'Unassigned' : value
}

/** Build the static facet options from the enum (surface spec "Static facets"). */
const STATIC_OPTIONS: Record<'status' | 'type' | 'priority', FacetOption[]> = {
  status: CRStatuses.map(v => ({ value: v, label: v })),
  type: CRTypes.map(v => ({ value: v, label: v })),
  priority: CRPriorities.map(v => ({ value: v, label: v })),
}

/**
 * Desktop filter bar: free-text search + four v1 facet dropdowns (status,
 * priority, assignee, type) + active-filter chip row + clear-all + the
 * "Showing N of M" result count.
 *
 * Hidden on `< sm` by the parent (`BoardFilterBar`); only renders desktop chrome.
 *
 * @testid desktop-filter-bar — the toolbar landmark
 * @testid filter-result-count — the "Showing N of M" text (aria-live)
 */
export const DesktopFilterBar: React.FC<DesktopFilterBarProps> = ({
  filters,
  totalCount,
  filteredCount,
  facetOptions,
  onQueryChange,
  onToggle,
  onRemove,
  onClearAll,
}) => {
  const selectedFor = (facet: FacetKey): string[] => {
    const raw = filters[facet]
    if (!raw)
      return []
    return Array.isArray(raw) ? raw : [raw]
  }

  const assigneeOptions: FacetOption[] = facetOptions.assignee.map(v => ({
    value: v,
    label: assigneeLabel(v),
  }))

  const countText = filteredCount === totalCount
    ? `Showing all ${totalCount} ticket${totalCount === 1 ? '' : 's'}`
    : `Showing ${filteredCount} of ${totalCount} tickets`

  return (
    <div data-testid="desktop-filter-bar" role="toolbar" aria-label="Filter tickets">
      <div className="flex items-center gap-2 flex-wrap">
        <FilterControls
          searchQuery={filters.query ?? ''}
          onSearchChange={onQueryChange}
        />
        <FacetDropdown
          facet="status"
          facetLabel="Status"
          options={STATIC_OPTIONS.status}
          selected={selectedFor('status')}
          onToggle={onToggle}
        />
        <FacetDropdown
          facet="priority"
          facetLabel="Priority"
          options={STATIC_OPTIONS.priority}
          selected={selectedFor('priority')}
          onToggle={onToggle}
        />
        <FacetDropdown
          facet="assignee"
          facetLabel="Assignee"
          options={assigneeOptions}
          selected={selectedFor('assignee')}
          onToggle={onToggle}
        />
        <FacetDropdown
          facet="type"
          facetLabel="Type"
          options={STATIC_OPTIONS.type}
          selected={selectedFor('type')}
          onToggle={onToggle}
        />
      </div>

      <ActiveFilterChips filters={filters} onRemove={onRemove} onClearAll={onClearAll} />

      <p
        data-testid="filter-result-count"
        aria-live="polite"
        className="text-xs text-muted-foreground mt-1"
      >
        {countText}
      </p>
    </div>
  )
}

/** Re-exported for callers that need the option type. */
export type { FacetKey, Ticket }
