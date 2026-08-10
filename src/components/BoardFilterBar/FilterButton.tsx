import { Filter } from 'lucide-react'
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface FilterButtonProps {
  /** Number of active facet values (not counting the free-text query). */
  activeCount: number
  /** Popover open state (controlled). */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Render-prop for the popover content. */
  children: React.ReactNode
  /** When true, joins this control to its neighbours in a `.control-group`. */
  groupItem?: boolean
}

/**
 * Compact "Filter · N" button that lives inline in the app header's single row.
 * Opens a popover with the facet sections. The button is the ONLY header-level
 * summary of facet state — chips and count live inside the popover (surface
 * spec: "never a second line").
 *
 * Outside-click dismissal uses the same event-based guard as the shared
 * `<Modal>` primitive (`src/components/ui/Modal.tsx`): a `mousedown` listener
 * that closes when the target leaves the container. A `position: fixed`
 * click-away overlay cannot be used here because the app header carries
 * `backdrop-filter`, which establishes a containing block that traps fixed
 * descendants to header bounds (MDT-196 UAT).
 *
 * @testid filter-button — the button trigger
 * @testid filter-popover — the floating popover content
 */
export const FilterButton: React.FC<FilterButtonProps> = ({
  activeCount,
  open,
  onOpenChange,
  children,
  groupItem = false,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const label = activeCount > 0 ? `Filter · ${activeCount}` : 'Filter'
  const ariaLabel = activeCount > 0 ? `Filter, ${activeCount} active` : 'Filter'

  // Close on outside click (mirrors Modal's handleClickOutside). Event-based
  // so it is immune to the header's backdrop-filter containing block.
  React.useEffect(() => {
    if (!open)
      return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onOpenChange])

  return (
    <div ref={containerRef} className={cn('filter-button-wrapper', groupItem && 'control-group__item')}>
      <button
        type="button"
        data-testid="filter-button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
        className={`filter-button ${open ? 'filter-button--open' : ''} ${groupItem ? 'filter-button--grouped' : ''}`}
      >
        <Filter className="filter-button__icon" aria-hidden="true" />
        <span>{label}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Filter tickets"
          data-testid="filter-popover"
          className="filter-popover"
        >
          {children}
        </div>
      )}
    </div>
  )
}
