/* eslint-disable react-refresh/only-export-components -- deriveActiveEntries is pure logic co-located with its sole consumer */
import type { TicketFilters } from '@mdt/domain-contracts'
import type { FacetKey } from '../../utils/ticketFilters'
import { X } from 'lucide-react'
import * as React from 'react'
import { displayAssigneeValue } from '../../utils/ticketFilters'

/** A single active filter value and the facet it belongs to. */
export interface ActiveFilterEntry {
  facet: FacetKey
  value: string
}

export interface ActiveFilterChipsProps {
  /** Current filter state — chips are derived from it. */
  filters: TicketFilters
  /** Called when the user clicks the remove (✕) on a chip. */
  onRemove: (facet: FacetKey, value: string) => void
  /** Called when the user clicks "Clear all". Omit to hide the control. */
  onClearAll?: () => void
  /**
   * `"inline"` drops the top margin (used when the chip row is rendered inside
   * the filter popover alongside the result-count). Default keeps `mt-1.5`.
   */
  variant?: 'standalone' | 'inline'
}

/** Facet display labels for aria-label composition. */
const FACET_LABELS: Record<FacetKey, string> = {
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  type: 'Type',
  phaseEpic: 'Phase/Epic',
  impactAreas: 'Impact area',
}

/** Render label for a value within a facet (assignee sentinel → "Unassigned"). */
function valueLabel(facet: FacetKey, value: string): string {
  if (facet === 'assignee')
    return displayAssigneeValue(value)
  return value
}

/** Extract an ordered list of active filter entries from the filter state. */
export function deriveActiveEntries(filters: TicketFilters): ActiveFilterEntry[] {
  const facets: FacetKey[] = ['status', 'priority', 'assignee', 'type', 'phaseEpic', 'impactAreas']
  const entries: ActiveFilterEntry[] = []
  for (const facet of facets) {
    const raw = filters[facet]
    if (!raw)
      continue
    const values = Array.isArray(raw) ? raw : [raw]
    for (const value of values) {
      entries.push({ facet, value })
    }
  }
  return entries
}

/**
 * Renders one removable chip per active filter value, in facet order then value
 * order, followed by an optional "Clear all" button.
 *
 * Reuses the `.badge` styling (semantic style anchor, surface spec) so filter
 * chips and ticket badges share one visual vocabulary.
 *
 * @testid active-filter-chips — chip row container
 * @testid active-filter-chip — a single chip (data-facet, data-value)
 * @testid active-filter-chip-remove — the ✕ button on a chip
 * @testid clear-all-filters — the Clear all button
 */
export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onRemove,
  onClearAll,
  variant = 'standalone',
}) => {
  const entries = deriveActiveEntries(filters)
  if (entries.length === 0)
    return null

  const marginClass = variant === 'inline' ? '' : 'mt-1.5'

  return (
    <div
      data-testid="active-filter-chips"
      className={`flex flex-wrap items-center gap-1.5 ${marginClass}`}
      role="group"
      aria-label="Active filters"
    >
      {entries.map(({ facet, value }) => {
        const label = valueLabel(facet, value)
        return (
          <span
            key={`${facet}-${value}`}
            data-testid="active-filter-chip"
            data-facet={facet}
            data-value={value}
            className="badge bg-muted text-foreground border-border inline-flex"
          >
            <span className="mr-1">{label}</span>
            <button
              type="button"
              data-testid="active-filter-chip-remove"
              onClick={() => onRemove(facet, value)}
              className="inline-flex items-center hover:bg-accent rounded-full p-0.5 -mr-1"
              aria-label={`Remove filter: ${FACET_LABELS[facet]} ${label}`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        )
      })}
      {onClearAll && (
        <button
          type="button"
          data-testid="clear-all-filters"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline ml-1"
          aria-label="Clear all filters"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
