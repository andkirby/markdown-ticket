import { Search, X } from 'lucide-react'
import * as React from 'react'

interface FilterControlsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  placeholder?: string
  /** When true, joins this control to its neighbours in a `.control-group`. */
  groupItem?: boolean
}

/**
 * @testid filter-controls — Filter controls container
 * @testid search-input — Search input field
 */
export const FilterControls: React.FC<FilterControlsProps> = ({
  searchQuery,
  onSearchChange,
  placeholder = 'Filter tickets...',
  groupItem = false,
}) => {
  const handleClear = () => {
    onSearchChange('')
  }

  return (
    <div data-testid="filter-controls" className={groupItem ? 'control-group__item icon-input' : 'icon-input'}>
      <Search className="icon-input__icon" aria-hidden="true" size={16} />
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        className="icon-input__input"
        data-testid="search-input"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="icon-input__clear"
          title="Clear filter"
          aria-label="Clear filter"
        >
          <X aria-hidden="true" size={12} />
        </button>
      )}
    </div>
  )
}
