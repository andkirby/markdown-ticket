/**
 * SearchScopeBar - Scope selection tab strip — MDT-179
 *
 * Renders tab buttons for Global, Tickets, Projects, Documents scopes.
 * Styled as a compact tab strip below the search input.
 *
 * @testid search-scope-bar — container
 */

import type { SearchScopeValue } from '@mdt/domain-contracts'
import { SearchScope, SearchScopes } from '@mdt/domain-contracts'
import { cn } from '@/lib/utils'

export interface SearchScopeBarProps {
  activeScope: SearchScopeValue
  onScopeChange: (scope: SearchScopeValue) => void
  className?: string
}

const SCOPE_LABELS: Record<SearchScopeValue, string> = {
  [SearchScope.GLOBAL]: 'All',
  [SearchScope.TICKETS]: 'Tickets',
  [SearchScope.PROJECTS]: 'Projects',
  [SearchScope.DOCUMENTS]: 'Documents',
} as const

/** Scopes currently visible in the UI (Documents hidden until doc search is implemented). */
const VISIBLE_SCOPES = SearchScopes.filter(s => s !== SearchScope.DOCUMENTS)

export function SearchScopeBar({ activeScope, onScopeChange, className }: SearchScopeBarProps): React.ReactElement {
  return (
    <div
      className={cn('search-scope-bar', className)}
      data-testid="search-scope-bar"
      role="tablist"
      aria-label="Search scope"
    >
      {VISIBLE_SCOPES.map((scope) => (
        <button
          key={scope}
          type="button"
          role="tab"
          data-testid={`search-scope-tab-${scope}`}
          className={cn(
            'search-scope-bar__tab',
            scope === activeScope && 'search-scope-bar__tab--active',
          )}
          aria-selected={scope === activeScope}
          onClick={() => onScopeChange(scope)}
        >
          {SCOPE_LABELS[scope]}
        </button>
      ))}
    </div>
  )
}
