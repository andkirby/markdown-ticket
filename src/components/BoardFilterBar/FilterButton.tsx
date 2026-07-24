import { Filter } from 'lucide-react'
import * as React from 'react'

export interface FilterButtonProps {
  /** Number of active facet values (not counting the free-text query). */
  activeCount: number
  /** Popover open state (controlled). */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Render-prop for the popover content. */
  children: React.ReactNode
}

/**
 * Compact "Filter · N" button that lives inline in the app header's single row.
 * Opens a Radix Popover with the facet sections. The button is the ONLY
 * header-level summary of facet state — chips and count live inside the
 * popover (surface spec: "never a second line").
 *
 * @testid filter-button — the button trigger
 */
export const FilterButton: React.FC<FilterButtonProps> = ({
  activeCount,
  open,
  onOpenChange,
  children,
}) => {
  const label = activeCount > 0 ? `Filter · ${activeCount}` : 'Filter'
  const ariaLabel = activeCount > 0 ? `Filter, ${activeCount} active` : 'Filter'

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        data-testid="filter-button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
        className={`inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm bg-background hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
          open ? 'border-primary ring-1 ring-primary' : 'border-border'
        }`}
      >
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
      </button>
      {open && (
        <>
          {/* click-away overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
          {/*
            Right-aligned popover (surface spec: anchored below-right of the button).
            w-[440px] fits the two-column facet grid. Scroll inherits the project-standard
            global ::-webkit-scrollbar (6px, gray-400 thumb, gray-100 track) via overflow-y-auto.
          */}
          <div
            role="dialog"
            aria-label="Filter tickets"
            data-testid="filter-popover"
            className="absolute top-full right-0 mt-1 z-50 w-[440px] max-h-[70vh] overflow-y-auto bg-popover border border-border rounded-lg shadow-lg p-3"
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}
