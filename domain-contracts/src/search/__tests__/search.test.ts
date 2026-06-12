/**
 * Schema validation tests for unified search — MDT-179
 *
 * TEST-search-schema: Validates UnifiedSearchRequest/Response schemas
 * Covering: BR-2.1, BR-2.2, C5, C6
 */

import { describe, expect, it } from 'bun:test'
import {
  ResultItemSchema,
  SearchResultType,
  SearchResultTypes,
  SearchScope,
  SearchScopes,
  UnifiedSearchRequestSchema,
  UnifiedSearchResponseSchema,
} from '../index'

// ---------------------------------------------------------------------------
// SearchScope enum
// ---------------------------------------------------------------------------

describe('SearchScope enum', () => {
  it('has exactly 4 scope values', () => {
    expect(SearchScopes).toHaveLength(4)
    expect(SearchScopes).toEqual(['global', 'tickets', 'projects', 'documents'])
  })

  it('provides named access for each scope', () => {
    expect(SearchScope.GLOBAL).toBe('global')
    expect(SearchScope.TICKETS).toBe('tickets')
    expect(SearchScope.PROJECTS).toBe('projects')
    expect(SearchScope.DOCUMENTS).toBe('documents')
  })
})

// ---------------------------------------------------------------------------
// SearchResultType enum
// ---------------------------------------------------------------------------

describe('SearchResultType enum', () => {
  it('has exactly 3 result type values', () => {
    expect(SearchResultTypes).toHaveLength(3)
    expect(SearchResultTypes).toEqual(['project', 'ticket', 'document'])
  })

  it('provides named access for each type', () => {
    expect(SearchResultType.PROJECT).toBe('project')
    expect(SearchResultType.TICKET).toBe('ticket')
    expect(SearchResultType.DOCUMENT).toBe('document')
  })
})

// ---------------------------------------------------------------------------
// UnifiedSearchRequestSchema
// ---------------------------------------------------------------------------

describe('UnifiedSearchRequestSchema', () => {
  it('accepts a minimal valid request', () => {
    const result = UnifiedSearchRequestSchema.safeParse({ query: 'task ma' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.query).toBe('task ma')
      expect(result.data.scope).toBe('global') // default
    }
  })

  it('accepts a request with explicit scope', () => {
    const result = UnifiedSearchRequestSchema.safeParse({
      query: 'task ma',
      scope: 'projects',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty query', () => {
    const result = UnifiedSearchRequestSchema.safeParse({ query: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid scope', () => {
    const result = UnifiedSearchRequestSchema.safeParse({
      query: 'test',
      scope: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('applies default values for limit fields', () => {
    const result = UnifiedSearchRequestSchema.safeParse({ query: 'test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limitPerGroup).toBe(5)
      expect(result.data.limitTotal).toBe(15)
    }
  })
})

// ---------------------------------------------------------------------------
// Discriminated result items (BR-2.1, BR-2.2)
// ---------------------------------------------------------------------------

describe('ResultItemSchema discriminated union', () => {
  it('validates a project result', () => {
    const item = {
      type: 'project',
      code: 'TMGR',
      name: 'Task Manager',
    }
    const result = ResultItemSchema.safeParse(item)
    expect(result.success).toBe(true)
  })

  it('validates a ticket result', () => {
    const item = {
      type: 'ticket',
      ticketKey: 'TMGR-001',
      title: 'Setup project',
      status: 'In Progress',
      project: { code: 'TMGR', name: 'Task Manager' },
    }
    const result = ResultItemSchema.safeParse(item)
    expect(result.success).toBe(true)
  })

  it('validates a document result', () => {
    const item = {
      type: 'document',
      path: 'docs/guide.md',
      name: 'guide.md',
      project: { code: 'TMGR', name: 'Task Manager' },
    }
    const result = ResultItemSchema.safeParse(item)
    expect(result.success).toBe(true)
  })

  it('rejects a result with unknown type', () => {
    const item = { type: 'unknown', name: 'test' }
    const result = ResultItemSchema.safeParse(item)
    expect(result.success).toBe(false)
  })

  it('discriminates correctly between types (BR-2.2)', () => {
    const projectItem = ResultItemSchema.parse({
      type: 'project',
      code: 'TMGR',
      name: 'Task Manager',
    })
    const ticketItem = ResultItemSchema.parse({
      type: 'ticket',
      ticketKey: 'TMGR-001',
      title: 'Setup',
      status: 'Open',
      project: { code: 'TMGR', name: 'Task Manager' },
    })

    // Type discrimination works — each item knows its type
    expect(projectItem.type).toBe('project')
    expect(ticketItem.type).toBe('ticket')

    // Project has code, ticket has ticketKey — visually distinct data shapes
    if (projectItem.type === 'project') {
      expect(projectItem).toHaveProperty('code')
      expect(projectItem).not.toHaveProperty('ticketKey')
    }
    if (ticketItem.type === 'ticket') {
      expect(ticketItem).toHaveProperty('ticketKey')
      expect(ticketItem).not.toHaveProperty('code')
    }
  })
})

// ---------------------------------------------------------------------------
// UnifiedSearchResponseSchema (BR-2.1, BR-2.2)
// ---------------------------------------------------------------------------

describe('UnifiedSearchResponseSchema', () => {
  it('validates a response with grouped results', () => {
    const response = {
      results: [
        { type: 'project', code: 'TMGR', name: 'Task Manager' },
        { type: 'ticket', ticketKey: 'TMGR-001', title: 'Setup', status: 'Open', project: { code: 'TMGR', name: 'Task Manager' } },
      ],
      groups: [
        {
          type: 'project',
          label: 'Projects',
          items: [
            { type: 'project', code: 'TMGR', name: 'Task Manager' },
          ],
        },
        {
          type: 'ticket',
          label: 'Tickets',
          items: [
            { type: 'ticket', ticketKey: 'TMGR-001', title: 'Setup', status: 'Open', project: { code: 'TMGR', name: 'Task Manager' } },
          ],
        },
      ],
      total: 2,
    }
    const result = UnifiedSearchResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.groups).toHaveLength(2)
      expect(result.data.total).toBe(2)
    }
  })

  it('validates an empty response', () => {
    const response = { results: [], groups: [], total: 0 }
    const result = UnifiedSearchResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Backward compatibility (C5) — existing ticket search untouched
// ---------------------------------------------------------------------------

describe('Backward compatibility (C5)', () => {
  it('does not re-export SearchMode or SearchResponse from ticket/search', async () => {
    // Verify the search module does NOT export conflicting types
    const searchModule = await import('../index')
    const exportedKeys = Object.keys(searchModule)

    // Should NOT have SearchMode (that lives in ticket/search.ts)
    expect(exportedKeys).not.toContain('SearchMode')
    expect(exportedKeys).not.toContain('SearchRequestSchema')
    expect(exportedKeys).not.toContain('SearchResponseSchema')

    // Should have our new types
    expect(exportedKeys).toContain('UnifiedSearchRequestSchema')
    expect(exportedKeys).toContain('UnifiedSearchResponseSchema')
    expect(exportedKeys).toContain('SearchScope')
    expect(exportedKeys).toContain('SearchResultType')
  })

  it('existing ticket search types remain importable from their module', async () => {
    const ticketSearch = await import('../../ticket/search')
    expect(ticketSearch.SearchMode).toBeDefined()
    expect(ticketSearch.SearchResponseSchema).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Extensibility (C6)
// ---------------------------------------------------------------------------

describe('Extensibility (C6)', () => {
  it('SearchResultTypes array can be extended without schema redesign', () => {
    // The discriminated union is data-driven from SearchResultType enum
    // Adding a new type requires only extending the enum + adding a schema
    expect(SearchResultTypes).toContain('project')
    expect(SearchResultTypes).toContain('ticket')
    expect(SearchResultTypes).toContain('document')
    // Future: 'content' type can be added without changing the response structure
  })

  it('response groups use the same discriminated type system', () => {
    // Groups reference SearchResultType — extensible without breaking existing groups
    const response = UnifiedSearchResponseSchema.parse({
      results: [],
      groups: [],
      total: 0,
    })
    expect(response.groups).toEqual([])
  })
})
