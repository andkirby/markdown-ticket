import type { FacetKey } from '../../utils/ticketFilters'
import { Check } from 'lucide-react'
import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

/** A selectable value in a facet dropdown. */
export interface FacetOption {
  /** The raw filter value (e.g. `"__none__"` for unassigned). */
  value: string
  /** The label shown in the menu (e.g. `"Unassigned"`). */
  label: string
}

export interface FacetDropdownProps {
  /** Which facet this dropdown controls. */
  facet: FacetKey
  /** Human label for the trigger when empty (e.g. "Status"). */
  facetLabel: string
  /** All selectable values for this facet. */
  options: FacetOption[]
  /** Currently selected values (checked state). */
  selected: string[]
  /** Called when the user toggles a value. */
  onToggle: (facet: FacetKey, value: string) => void
}

/**
 * Desktop facet dropdown built on Radix `DropdownMenu` with checkbox items.
 *
 * The trigger label is the per-facet summary: bare `facetLabel` when empty,
 * `facetLabel: N` when N values are selected (surface spec "Semantic Style
 * Anchors"). The menu lists every option regardless of whether any ticket uses
 * it (static facets draw from enums, derived facets from the ticket set — both
 * arrive as `options`).
 *
 * @testid facet-dropdown — the trigger button (data-facet)
 * @testid facet-dropdown-trigger — alias on the button
 * @testid facet-option — a single checkbox item (data-value)
 */
export const FacetDropdown: React.FC<FacetDropdownProps> = ({
  facet,
  facetLabel,
  options,
  selected,
  onToggle,
}) => {
  const selectedSet = React.useMemo(() => new Set(selected), [selected])
  const count = selected.length
  const triggerLabel = count === 0 ? facetLabel : `${facetLabel}: ${count}`

  return (
    <div data-testid="facet-dropdown" data-facet={facet} className="inline-block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="facet-dropdown-trigger"
            aria-haspopup="menu"
            className="inline-flex items-center gap-1 border border-border rounded-md px-3 py-1 text-sm bg-background hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {triggerLabel}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[12rem]">
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No values</div>
          )}
          {options.map(option => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedSet.has(option.value)}
              onCheckedChange={() => onToggle(facet, option.value)}
              data-testid="facet-option"
              data-value={option.value}
              onSelect={(e) => { e.preventDefault() }}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Re-exported for the empty-state icon swap if a future facet wants it. */
export { Check }
