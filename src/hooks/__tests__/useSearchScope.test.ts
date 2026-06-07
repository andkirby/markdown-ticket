/**
 * useSearchScope hook tests — MDT-179
 *
 * TEST-search-scope-hook: Scope state management
 * Covering: BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-4.4
 */

import { describe, expect, it } from 'bun:test'
import { SearchScope, SearchScopes } from '@mdt/domain-contracts'
import { getNextScope } from '@/hooks/useSearchScope'

// ---------------------------------------------------------------------------
// getNextScope (pure function — no React needed)
// ---------------------------------------------------------------------------

describe('getNextScope', () => {
  it('cycles: global → tickets', () => {
    expect(getNextScope(SearchScope.GLOBAL)).toBe(SearchScope.TICKETS)
  })

  it('cycles: tickets → projects', () => {
    expect(getNextScope(SearchScope.TICKETS)).toBe(SearchScope.PROJECTS)
  })

  it('cycles: projects → documents', () => {
    expect(getNextScope(SearchScope.PROJECTS)).toBe(SearchScope.DOCUMENTS)
  })

  it('wraps: documents → global', () => {
    expect(getNextScope(SearchScope.DOCUMENTS)).toBe(SearchScope.GLOBAL)
  })

  it('falls back to global for unknown scope', () => {
    expect(getNextScope('unknown' as any)).toBe(SearchScope.GLOBAL)
  })
})

// ---------------------------------------------------------------------------
// SearchScope enum coverage (BR-1.1, BR-1.2)
// ---------------------------------------------------------------------------

describe('SearchScope enum', () => {
  it('has all four scope values used by scope bar', () => {
    expect(SearchScopes).toContain('global')
    expect(SearchScopes).toContain('tickets')
    expect(SearchScopes).toContain('projects')
    expect(SearchScopes).toContain('documents')
  })

  it('provides named access matching UI labels', () => {
    expect(SearchScope.GLOBAL).toBe('global')
    expect(SearchScope.TICKETS).toBe('tickets')
    expect(SearchScope.PROJECTS).toBe('projects')
    expect(SearchScope.DOCUMENTS).toBe('documents')
  })
})
