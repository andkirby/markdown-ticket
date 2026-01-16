import { Search, X } from 'lucide-react'
import * as React from 'react'

interface FilterControlsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  placeholder?: string
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  searchQuery,
  onSearchChange,
  placeholder = 'Filter tickets...',
}) => {
  const handleClear = () => {
    onSearchChange('')
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        className="pl-10 pr-10 py-1 text-sm border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[200px]"
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
          title="Clear filter"
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </div>
  )
}
