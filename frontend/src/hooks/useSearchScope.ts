/**
 * useSearchScope - Search scope state management — MDT-179
 *
 * Manages the active search scope (Global, Tickets, Projects, Documents)
 * and provides scope-switching via click or keyboard shortcut.
 */

import type { SearchScopeValue } from '@mdt/domain-contracts'
import { SearchScope, SearchScopes } from '@mdt/domain-contracts'
import { useCallback, useState } from 'react'

export interface UseSearchScopeResult {
  /** Current active search scope */
  scope: SearchScopeValue
  /** Switch scope to a specific value */
  setScope: (scope: SearchScopeValue) => void
  /** Cycle to the next scope (for keyboard shortcut) */
  cycleScope: () => void
  /** Reset scope to Global (e.g., when modal closes) */
  resetScope: () => void
}

/**
 * Get the next scope in the cycle after the given scope.
 * Pure function exported for testing.
 */
export function getNextScope(current: SearchScopeValue): SearchScopeValue {
  const index = SearchScopes.indexOf(current)
  if (index === -1)
    return SearchScope.GLOBAL
  return SearchScopes[(index + 1) % SearchScopes.length] as SearchScopeValue
}

/**
 * Hook for managing search scope state.
 *
 * Scope values come from the canonical SearchScope enum in domain-contracts.
 * The cycle function advances through: global → tickets → projects → documents → global.
 */
export function useSearchScope(): UseSearchScopeResult {
  const [scope, setScope] = useState<SearchScopeValue>(SearchScope.GLOBAL)

  const cycleScope = useCallback(() => {
    setScope(prev => getNextScope(prev))
  }, [])

  const resetScope = useCallback(() => {
    setScope(SearchScope.GLOBAL)
  }, [])

  return { scope, setScope, cycleScope, resetScope }
}
