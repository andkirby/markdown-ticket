import type { LucideIcon } from 'lucide-react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check } from 'lucide-react'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPopover } from '@/components/shared/useAnchoredPopover'
import { cn } from '../../lib/utils'

/**
 * SortMenu — collapsed sort control. Presentational; hosts own state and
 * persistence. Spec: docs/design/surfaces/sort-menu.spec.md.
 *
 * Variants (degradation ladder — see spec § Variants):
 *   a — icon + label trigger, direction sibling segment (default)
 *   b — icon-only trigger, direction sibling segment (tight)
 *   c — icon-only trigger, single button; direction rows inside the menu (tightest)
 *
 * @testid sort-menu — cluster root
 * @testid sort-menu-trigger — attribute trigger button
 * @testid sort-menu-direction — direction segment button (variants a/b)
 * @testid sort-menu-option — menu rows; data-value carries the attribute or direction name
 */

export type SortDirection = 'asc' | 'desc'
export type SortMenuVariant = 'a' | 'b' | 'c'

export interface SortMenuAttribute {
  name: string
  label: string
  icon: LucideIcon
  defaultDirection: SortDirection
}

interface SortMenuProps {
  attributes: SortMenuAttribute[]
  value: string
  direction: SortDirection
  /** Fired on attribute select (with the attribute's defaultDirection) and on direction change. */
  onChange: (attribute: string, direction: SortDirection) => void
  variant?: SortMenuVariant
  /** Header integration: hide the label below md (B) and show it at md+ (A). */
  collapseLabelBelowMd?: boolean
  className?: string
}

const DIRECTION_ROWS: Array<{ dir: SortDirection, label: string, Icon: LucideIcon }> = [
  { dir: 'asc', label: 'Ascending', Icon: ArrowUpNarrowWide },
  { dir: 'desc', label: 'Descending', Icon: ArrowDownWideNarrow },
]

export const SortMenu: React.FC<SortMenuProps> = ({
  attributes,
  value,
  direction,
  onChange,
  variant = 'a',
  collapseLabelBelowMd = false,
  className,
}) => {
  const { open, toggle, close, position, triggerRef, popoverRef } = useAnchoredPopover()

  const selected = attributes.find(attr => attr.name === value) ?? attributes[0]
  const iconOnly = variant !== 'a'
  const dirWord = direction === 'asc' ? 'ascending' : 'descending'

  const selectAttribute = (attr: SortMenuAttribute) => {
    // Per-attribute defaultDirection — same contract as the old handleAttributeChange.
    onChange(attr.name, attr.defaultDirection)
    close()
  }

  const flipDirection = () => onChange(value, direction === 'asc' ? 'desc' : 'asc')

  const SelectedIcon = selected.icon

  return (
    <div
      data-testid="sort-menu"
      className={cn('sort-menu', collapseLabelBelowMd && 'sort-menu--collapse-below-md', className)}
    >
      <button
        ref={triggerRef}
        type="button"
        data-testid="sort-menu-trigger"
        className={cn('sort-menu__trigger', iconOnly && 'sort-menu__trigger--icon')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort by ${selected.label} — ${dirWord}`}
        title={`Sort by ${selected.label} — ${dirWord}`}
        onClick={toggle}
      >
        <SelectedIcon aria-hidden="true" />
        {!iconOnly && <span className="sort-menu__label">{selected.label}</span>}
      </button>

      {variant !== 'c' && (
        <button
          type="button"
          data-testid="sort-menu-direction"
          className="sort-menu__direction"
          title={`Sort ${dirWord}`}
          aria-label={`Sort ${dirWord}`}
          onClick={flipDirection}
        >
          {direction === 'asc'
            ? <ArrowUpNarrowWide aria-hidden="true" />
            : <ArrowDownWideNarrow aria-hidden="true" />}
        </button>
      )}

      {open && createPortal(
        <div
          ref={popoverRef}
          className="sort-menu__popover"
          role="listbox"
          aria-label="Sort by"
          style={{ top: position.top, left: position.left }}
        >
          {attributes.map((attr) => {
            const Icon = attr.icon
            return (
              <div
                key={attr.name}
                role="option"
                aria-selected={attr.name === value}
                data-testid="sort-menu-option"
                data-value={attr.name}
                className="sort-menu__option"
                onClick={() => selectAttribute(attr)}
              >
                <Icon aria-hidden="true" />
                {attr.label}
                <span className="sort-menu__option-dir">{attr.defaultDirection}</span>
                {attr.name === value && <Check className="sort-menu__check" aria-hidden="true" />}
              </div>
            )
          })}
          {variant === 'c' && (
            <>
              <div className="sort-menu__separator" />
              {DIRECTION_ROWS.map(({ dir, label, Icon }) => (
                <div
                  key={dir}
                  role="option"
                  aria-selected={direction === dir}
                  data-testid="sort-menu-option"
                  data-value={dir}
                  className="sort-menu__option"
                  onClick={() => {
                    onChange(value, dir)
                    close()
                  }}
                >
                  <Icon aria-hidden="true" />
                  {label}
                  {direction === dir && <Check className="sort-menu__check" aria-hidden="true" />}
                </div>
              ))}
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
