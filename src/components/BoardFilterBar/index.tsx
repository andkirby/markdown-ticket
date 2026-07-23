import type { TicketFilters } from '@mdt/domain-contracts'
import type { FacetKey } from '../../utils/ticketFilters'
import type { FacetOption } from './FacetDropdown'
import { CRPriorities, CRStatuses, CRTypes } from '@mdt/domain-contracts'
import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { DesktopFilterBar } from './DesktopFilterBar'
import { FacetSection } from './FacetSection'

export interface BoardFilterBarProps {
  /** Whether to render the desktop bar (parent controls viewport visibility). */
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
 * Top-level board filter surface. Renders the desktop bar OR the mobile
 * popover depending on viewport, but both read/write the SAME `TicketFilters`.
 *
 * The desktop path is the default. The mobile path is opted into by passing
 * `mobileTrigger` and popover-control props; the parent (HamburgerMenu) hosts
 * the trigger and owns popover open state so the menu can close it on navigate.
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
      <DesktopFilterBar
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
      facetOptions={facetOptions}
      onQueryChange={onQueryChange}
      onToggle={onToggle}
      onClearAll={onClearAll}
    />
  )
}

/**
 * Internal: the mobile filter popover. Uses the existing `Popover` primitive
 * (surface spec: "mobile v1 uses the existing Popover, not a new Sheet").
 */
function MobileFilterPopover({
  open,
  onOpenChange,
  trigger,
  filters,
  facetOptions,
  onQueryChange,
  onToggle,
  onClearAll,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  filters: TicketFilters
  facetOptions: { assignee: string[], phaseEpic: string[], impactAreas: string[] }
  onQueryChange: (query: string) => void
  onToggle: (facet: FacetKey, value: string) => void
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
        <FacetSection facet="status" label="Status" options={STATUS_OPTIONS} selected={selectedFor('status')} onToggle={onToggle} />
        <FacetSection facet="priority" label="Priority" options={PRIORITY_OPTIONS} selected={selectedFor('priority')} onToggle={onToggle} />
        <FacetSection facet="assignee" label="Assignee" options={assigneeOpts} selected={selectedFor('assignee')} onToggle={onToggle} />
        <FacetSection facet="type" label="Type" options={TYPE_OPTIONS} selected={selectedFor('type')} onToggle={onToggle} />
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
