/**
 * Unified search types — MDT-179
 *
 * SearchScope and SearchResultType enums for scoped global search.
 */

// ---------------------------------------------------------------------------
// SearchScope enum
// ---------------------------------------------------------------------------

export const SearchScope = {
  GLOBAL: 'global',
  TICKETS: 'tickets',
  PROJECTS: 'projects',
  DOCUMENTS: 'documents',
} as const

export type SearchScopeValue = (typeof SearchScope)[keyof typeof SearchScope]

export const SearchScopes = [
  SearchScope.GLOBAL,
  SearchScope.TICKETS,
  SearchScope.PROJECTS,
  SearchScope.DOCUMENTS,
] as const

// ---------------------------------------------------------------------------
// SearchResultType enum
// ---------------------------------------------------------------------------

export const SearchResultType = {
  PROJECT: 'project',
  TICKET: 'ticket',
  DOCUMENT: 'document',
} as const

export type SearchResultTypeValue = (typeof SearchResultType)[keyof typeof SearchResultType]

export const SearchResultTypes = [
  SearchResultType.PROJECT,
  SearchResultType.TICKET,
  SearchResultType.DOCUMENT,
] as const
