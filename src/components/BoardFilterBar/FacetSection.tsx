import type { FacetKey } from '../../utils/ticketFilters'
import * as React from 'react'

/** A selectable value in a facet list. */
export interface FacetOption {
  /** The raw filter value (e.g. `"__none__"` for unassigned). */
  value: string
  /** The label shown in the list (e.g. `"Unassigned"`). */
  label: string
}

export interface FacetSectionProps {
  facet: FacetKey
  /** Section heading text (e.g. "Status"). */
  label: string
  options: FacetOption[]
  selected: string[]
  onToggle: (facet: FacetKey, value: string) => void
}

/**
 * A checkbox group for one facet, rendered inside the filter popover (desktop)
 * and the bottom-anchored filter sheet (mobile). Collapsible via the disclosure
 * header so a long facet list stays scannable.
 *
 * @testid facet-section — the section container (data-facet)
 * @testid facet-option-checkbox — a checkbox (data-value)
 */
export const FacetSection: React.FC<FacetSectionProps> = ({
  facet,
  label,
  options,
  selected,
  onToggle,
}) => {
  const [open, setOpen] = React.useState(true)
  const selectedSet = React.useMemo(() => new Set(selected), [selected])
  const sectionId = React.useId()

  return (
    <div data-testid="facet-section" data-facet={facet} className="border-b border-border last:border-0 py-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={sectionId}
        className="w-full flex items-center justify-between px-1 py-1.5 text-sm font-medium"
      >
        <span>{label}</span>
        <span className="text-muted-foreground">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div id={sectionId} className="px-1 pb-1 space-y-0.5">
          {options.length === 0 && (
            <div className="text-sm text-muted-foreground px-1 py-1">No values</div>
          )}
          {options.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-1 py-1 text-sm cursor-pointer rounded hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(option.value)}
                onChange={() => onToggle(facet, option.value)}
                data-testid="facet-option-checkbox"
                data-value={option.value}
                className="h-4 w-4 rounded border-border"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
