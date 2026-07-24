import type { TicketFilters } from '@mdt/domain-contracts'
import type { Ticket } from '../../types'
import type { FacetKey } from '../../utils/ticketFilters'
import type { FacetOption } from './FacetSection'
import { CRPriorities, CRStatuses, CRTypes } from '@mdt/domain-contracts'
import * as React from 'react'
import { countActiveFilters } from '../../utils/ticketFilters'
import { FilterControls } from '../FilterControls'
import { Modal, ModalBody, ModalHeader } from '../ui/Modal'
import { ScrollArea } from '../ui/scroll-area'
import { ActiveFilterChips } from './ActiveFilterChips'
import { FacetSection } from './FacetSection'
import { FilterButton } from './FilterButton'

export interface BoardFilterBarProps {
  /** Whether to render the desktop inline chrome (search + FilterButton) or the mobile filter sheet. */
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
  /** Controlled open state for the mobile filter sheet (parent owns it). */
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
 * hosts a "Filter · N" trigger that opens a bottom-anchored filter sheet with
 * the same content.
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
    <MobileFilterSheet
      open={mobilePopoverOpen}
      onOpenChange={onMobilePopoverOpenChange ?? (() => {})}
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
}: Omit<BoardFilterBarProps, 'desktop' | 'mobilePopoverOpen' | 'onMobilePopoverOpenChange'>) {
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

// ─── Shared sub-components (desktop popover + mobile modal) ───────────────────

/** Resolve the selected values array for a facet from the filter state. */
function useSelectedFor(filters: TicketFilters) {
  return React.useCallback((facet: FacetKey): string[] => {
    const raw = filters[facet]
    if (!raw)
      return []
    return Array.isArray(raw) ? raw : [raw]
  }, [filters])
}

/** The "Showing N of M tickets" count (left) + Clear all button (right). */
function ResultCountRow({ countText, onClearAll }: { countText: string, onClearAll: () => void }) {
  return (
    <div className="flex items-center justify-between m-2">
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
  )
}

/**
 * Two-column facet grid (surface spec §"Facet grid order").
 * Column-major fill: Row 1 = Type | Status, Row 2 = Priority | Assignee.
 */
function FacetGrid({
  filters,
  facetOptions,
  onToggle,
}: {
  filters: TicketFilters
  facetOptions: { assignee: string[], phaseEpic: string[], impactAreas: string[] }
  onToggle: (facet: FacetKey, value: string) => void
}) {
  const selectedFor = useSelectedFor(filters)
  const assigneeOpts: FacetOption[] = facetOptions.assignee.map(v => ({
    value: v,
    label: v === '__none__' ? 'Unassigned' : v,
  }))

  return (
    <div className="grid grid-cols-2 gap-x-4">
      <FacetSection facet="type" label="Type" options={TYPE_OPTIONS} selected={selectedFor('type')} onToggle={onToggle} />
      <FacetSection facet="status" label="Status" options={STATUS_OPTIONS} selected={selectedFor('status')} onToggle={onToggle} />
      <FacetSection facet="priority" label="Priority" options={PRIORITY_OPTIONS} selected={selectedFor('priority')} onToggle={onToggle} />
      <FacetSection facet="assignee" label="Assignee" options={assigneeOpts} selected={selectedFor('assignee')} onToggle={onToggle} />
    </div>
  )
}

// ─── Desktop popover content (result count + grid + chips) ────────────────────

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
  return (
    <>
      <ResultCountRow countText={countText} onClearAll={onClearAll} />
      <FacetGrid filters={filters} facetOptions={facetOptions} onToggle={onToggle} />
      <ActiveFilterChips filters={filters} onRemove={onRemove} variant="inline" />
    </>
  )
}

// ─── Mobile: full-width filter modal (opened from Hamburger Menu) ─────────────
//
// Reuses the shared <Modal> primitive (the same one ProjectBrowserPanel uses),
// with size="full" (100% width). The search input sits in the pinned ModalHeader
// (same pattern as the project browser's inline search). Below it: a result-count
// + Clear-all row, then the two-column FacetGrid + chips inside a Radix ScrollArea
// that fills the remaining 80dvh-constrained body.

function MobileFilterSheet({
  open,
  onOpenChange,
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
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      size="full"
      data-testid="mobile-filter-sheet"
    >
      <ModalBody className="modal__body--constrained">
        <ModalHeader
          onClose={() => onOpenChange(false)}
          closeTestId="mobile-filter-done"
          className="flex items-center gap-3"
        >
          <h1 className="modal__headline shrink-0">Filter</h1>
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              placeholder="Filter tickets..."
              value={filters.query ?? ''}
              onChange={e => onQueryChange(e.target.value)}
              data-testid="mobile-filter-query"
              className="project-search w-full"
            />
          </div>
        </ModalHeader>
        {/* Result-count row (single Clear-all — no duplication) */}
        <ResultCountRow countText={countText} onClearAll={onClearAll} />
        {/* Facet grid + chips scroll inside the constrained body */}
        <ScrollArea type="hover" scrollHideDelay={600} className="flex-1 min-h-0 overflow-hidden">
          <div className="p-4">
            <FacetGrid filters={filters} facetOptions={facetOptions} onToggle={onToggle} />
            <ActiveFilterChips filters={filters} onRemove={() => {}} variant="inline" />
          </div>
        </ScrollArea>
      </ModalBody>
    </Modal>
  )
}

/** Re-exported for callers that need the option type. */
export type { FacetKey, Ticket }
