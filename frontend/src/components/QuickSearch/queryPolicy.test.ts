import { describe, expect, it } from 'bun:test'
import { resolveQuickSearchQuery } from './queryPolicy'

describe('MDT-136 project location', () => {
  it('keeps numbers, external refs and text local by default', () => {
    for (const query of ['20', '#20', 'jira:PRJ-20', 'login redirect'])
      expect(resolveQuickSearchQuery(query, 'global', 'ABC', false)).toMatchObject({ mode: 'current_project', searchText: query, projectCode: 'ABC' })
  })
  it('broadens numbers and text with the same switch', () => {
    for (const query of ['20', 'login redirect'])
      expect(resolveQuickSearchQuery(query, 'tickets', 'ABC', true)).toMatchObject({ mode: 'ticket_key', ticketCode: query, searchText: query })
  })
  it('retains explicit local/external key lookup and strips @scope from search text', () => {
    expect(resolveQuickSearchQuery('MDT-136', 'tickets', 'ABC', false)).toMatchObject({ mode: 'ticket_key', ticketCode: 'MDT-136' })
    expect(resolveQuickSearchQuery('@MDT login redirect', 'global', 'ABC', false)).toMatchObject({ mode: 'project_scope', projectCode: 'MDT', searchText: 'login redirect' })
  })
  it('does not run ticket requests in the Projects tab', () => {
    expect(resolveQuickSearchQuery('MDT-136', 'projects', 'ABC', true).mode).toBe('projects_only')
  })
  it('uses all projects when there is no current project', () => {
    expect(resolveQuickSearchQuery('20', 'global', undefined, false).mode).toBe('ticket_key')
  })
})
