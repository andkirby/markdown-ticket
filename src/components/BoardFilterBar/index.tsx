import type { TicketFilters } from '@mdt/domain-contracts'
import type { Ticket } from '../../types'
import type { FacetKey } from '../../utils/ticketFilters'
import type { FacetOption } from './FacetDropdown'
import { CRPriorities, CRStatuses, CRTypes } from '@mdt/domain-contracts'
import * as React from 'react'
import { countActiveFilters } from '../../utils/ticketFilters'
import { FilterControls } from '../FilterControls'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { ActiveFilterChips } from './ActiveFilterChips'
import { FacetSection } from './FacetSection'
import { FilterButton } from './FilterButton'

export interface BoardFilterBarProps {
  /** Whether to render the desktop inline chrome (search + FilterButton) or the mobile popover-only entry. */
  desktop?: boolean
  filters: TicketFilters
  totalCount: number
  filteredCount: number
  facetOptions: {
    assignee: string[]
    phaseEpic: string[]
    impactAreas: string[]
  }
  onQueryChange: (query: string) => void
  onToggle: (facet: FacetKey, value: string) => void
  onRemove: (facet: FacetKey, value: string) => void
  onClearAll: () => void
  /**
   * Mobile-only: when provided, renders a "Filter · N" trigger that opens a
   * Popover containing the facet sections. Parent controls whether this shows.
   */
  mobileTrigger?: React.ReactNode
  /** Controlled open state for the mobile filter popover (parent owns it). */
  mobilePopoverOpen?: boolean
  onMobilePopoverOpenChange?: (open: boolean) => void
}

/** Static facet options built from enums once (surface spec "Static facets"). */
const STATUS_OPTIONS: FacetOption[] = CRStatuses.map(v => ({ value: v, label: v }))
const PRIORITY_OPTIONS: FacetOption[] = CRPriorities.map(v => ({ value: v, label: v }))
const TYPE_OPTIONS: FacetOption[] = CRTypes.map(v => ({ value: v, label: v }))

/**
 * Top-level board filter surface.
 *
 * **Desktop** (`desktop=true`): renders inline in the app header's single row —
 * a free-text search input + a compact "Filter · N" button. Facets, chips, and
 * the result count live inside the button's popover. The header is always one
 * row (surface spec: "never a second line").
 *
 * **Mobile** (`desktop=false`): no inline chrome; the parent (HamburgerMenu)
 * hosts a "Filter · N" trigger that opens a Popover with the same content.
 *
 * Both modes read/write the SAME `TicketFilters` reducer.
 *
 * @testid board-filter-bar — desktop inline cluster container
 */
export const BoardFilterBar: React.FC<BoardFilterBarProps> = ({
  desktop = true,
  filters,
  totalCount,
  filteredCount,
  facetOptions,
  onQueryChange,
  onToggle,
  onRemove,
  onClearAll,
  mobileTrigger,
  mobilePopoverOpen = false,
  onMobilePopoverOpenChange,
}) => {
  if (desktop) {
    return (
      <DesktopInlineFilterBar
        filters={filters}
        totalCount={totalCount}
        filteredCount={filteredCount}
        facetOptions={facetOptions}
        onQueryChange={onQueryChange}
        onToggle={onToggle}
        onRemove={onRemove}
        onClearAll={onClearAll}
      />
    )
  }

  return (
    <MobileFilterPopover
      open={mobilePopoverOpen}
      onOpenChange={onMobilePopoverOpenChange ?? (() => {})}
      trigger={mobileTrigger}
      filters={filters}
      totalCount={totalCount}
      filteredCount={filteredCount}
      facetOptions={facetOptions}
      onQueryChange={onQueryChange}
      onToggle={onToggle}
      onClearAll={onClearAll}
    />
  )
}

// ─── Desktop: inline search + FilterButton with popover ──────────────────────

function DesktopInlineFilterBar({
  filters,
  totalCount,
  filteredCount,
  facetOptions,
  onQueryChange,
  onToggle,
  onRemove,
  onClearAll,
}: Omit<BoardFilterBarProps, 'desktop' | 'mobileTrigger' | 'mobilePopoverOpen' | 'onMobilePopoverOpenChange'>) {
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const activeCount = countActiveFilters(filters)

  const countText = filteredCount === totalCount
    ? `Showing all ${totalCount} ticket${totalCount === 1 ? '' : 's'}`
    : `Showing ${filteredCount} of ${totalCount} tickets`

  return (
    <div data-testid="board-filter-bar" className="flex items-center gap-2 flex-shrink-0">
      <FilterControls
        searchQuery={filters.query ?? ''}
        onSearchChange={onQueryChange}
      />
      <FilterButton
        activeCount={activeCount}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
      >
        <FilterPopoverContent
          countText={countText}
          filters={filters}
          facetOptions={facetOptions}
          onToggle={onToggle}
          onRemove={onRemove}
          onClearAll={onClearAll}
        />
      </FilterButton>
    </div>
  )
}

// ─── Shared popover content (desktop popover + mobile popover) ────────────────

function FilterPopoverContent({
  countText,
  filters,
  facetOptions,
  onToggle,
  onRemove,
  onClearAll,
}: {
  countText: string
  filters: TicketFilters
  facetOptions: { assignee: string[], phaseEpic: string[], impactAreas: string[] }
  onToggle: (facet: FacetKey, value: string) => void
  onRemove: (facet: FacetKey, value: string) => void
  onClearAll: () => void
}) {
  const selectedFor = (facet: FacetKey): string[] => {
    const raw = filters[facet]
    if (!raw)
      return []
    return Array.isArray(raw) ? raw : [raw]
  }

  const assigneeOpts: FacetOption[] = facetOptions.assignee.map(v => ({
    value: v,
    label: v === '__none__' ? 'Unassigned' : v,
  }))

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span
          data-testid="filter-result-count"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          {countText}
        </span>
        <button
          type="button"
          data-testid="clear-all-filters"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          aria-label="Clear all filters"
        >
          Clear all
        </button>
      </div>
      <FacetSection facet="status" label="Status" options={STATUS_OPTIONS} selected={selectedFor('status')} onToggle={onToggle} />
      <FacetSection facet="priority" label="Priority" options={PRIORITY_OPTIONS} selected={selectedFor('priority')} onToggle={onToggle} />
      <FacetSection facet="assignee" label="Assignee" options={assigneeOpts} selected={selectedFor('assignee')} onToggle={onToggle} />
      <FacetSection facet="type" label="Type" options={TYPE_OPTIONS} selected={selectedFor('type')} onToggle={onToggle} />
      <ActiveFilterChips filters={filters} onRemove={onRemove} variant="inline" />
    </>
  )
}

// ─── Mobile: popover opened from Hamburger Menu ───────────────────────────────

function MobileFilterPopover({
  open,
  onOpenChange,
  trigger,
  filters,
  totalCount,
  filteredCount,
  facetOptions,
  onQueryChange,
  onToggle,
  onClearAll,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  filters: TicketFilters
  totalCount: number
  filteredCount: number
  facetOptions: { assignee: string[], phaseEpic: string[], impactAreas: string[] }
  onQueryChange: (query: string) => void
  onToggle: (facet: FacetKey, value: string) => void
  onClearAll: () => void
}) {
  const countText = filteredCount === totalCount
    ? `Showing all ${totalCount} ticket${totalCount === 1 ? '' : 's'}`
    : `Showing ${filteredCount} of ${totalCount} tickets`

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      <PopoverContent align="start" className="w-80 max-h-[70vh] overflow-y-auto" data-testid="mobile-filter-popover">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Filter</span>
          <button
            type="button"
            data-testid="mobile-clear-all"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
        <input
          type="text"
          placeholder="Filter tickets..."
          value={filters.query ?? ''}
          onChange={e => onQueryChange(e.target.value)}
          data-testid="mobile-filter-query"
          className="w-full pl-3 pr-3 py-1 text-sm border border-border rounded-md bg-background mb-2"
        />
        <FilterPopoverContent
          countText={countText}
          filters={filters}
          facetOptions={facetOptions}
          onToggle={onToggle}
          onRemove={() => {}}
          onClearAll={onClearAll}
        />
        <div className="flex justify-end mt-2">
          <button
            type="button"
            data-testid="mobile-filter-done"
            onClick={() => onOpenChange(false)}
            className="text-sm px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Re-exported for callers that need the option type. */
export type { FacetKey, Ticket }
