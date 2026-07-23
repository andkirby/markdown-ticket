import type { TicketFilters } from '@mdt/domain-contracts'
import type { FacetKey } from '../../utils/ticketFilters'
import { X } from 'lucide-react'
import * as React from 'react'
import { deriveActiveEntries } from './ActiveFilterChips'

export interface MobileChipStripProps {
  filters: TicketFilters
  onRemove: (facet: FacetKey, value: string) => void
}

/**
 * Horizontal-scroll chip strip rendered under the mobile column header when
 * filters are active. Returns `null` when no filters are active — no empty
 * state, no wasted vertical space (surface spec "Mobile").
 *
 * Shares the chip rendering vocabulary with {@link ActiveFilterChips} but is
 * laid out for horizontal scroll on a narrow viewport.
 *
 * @testid mobile-chip-strip — the strip container
 * @testid mobile-filter-chip — a single chip (data-facet, data-value)
 */
export const MobileChipStrip: React.FC<MobileChipStripProps> = ({ filters, onRemove }) => {
  const entries = deriveActiveEntries(filters)
  if (entries.length === 0)
    return null

  return (
    <div
      data-testid="mobile-chip-strip"
      className="flex items-center gap-1.5 overflow-x-auto py-1 -mx-1 px-1"
      role="group"
      aria-label="Active filters"
    >
      {entries.map(({ facet, value }) => (
        <span
          key={`${facet}-${value}`}
          data-testid="mobile-filter-chip"
          data-facet={facet}
          data-value={value}
          className="badge bg-muted text-foreground border-border inline-flex shrink-0"
        >
          <span className="mr-0.5 truncate max-w-[10rem]">{value === '__none__' ? 'Unassigned' : value}</span>
          <button
            type="button"
            data-testid="mobile-filter-chip-remove"
            onClick={() => onRemove(facet, value)}
            className="inline-flex items-center hover:bg-accent rounded-full p-0.5"
            aria-label={`Remove filter: ${facet} ${value}`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  )
}
