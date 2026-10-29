import type { Project } from '../../../models/Project.js'
import { normalizeTicket } from '../../../models/Ticket.js'
import { SearchService } from '../../../services/search/SearchService.js'

const project = (code: string, name: string): Project => ({ id: code.toLowerCase(), project: { id: code.toLowerCase(), code, name, path: '/fixture', configFile: '.mdt-config.toml', ticketsPath: 'docs/CRs', active: true, description: '', repository: '' }, metadata: { dateRegistered: '', lastAccessed: '', version: '1' } })
const ticket = (code: string, title: string, refs?: string[]) => normalizeTicket({ code, title, refs, status: 'Proposed', type: 'Research', priority: 'Medium', filePath: `${code}.md` })
const options = { limitPerProject: 2, limitTotal: 10 }

describe('shared search operation preservation', () => {
  const projects = [project('BB', 'Alpha Beta'), project('AA', 'Alpha Beta')]
  it('ranks exact local identity before external identity and text; ties use project/key order', async () => {
    const search = new SearchService({ getAllProjects: async () => projects }, { listCRs: async p => p.project.code === 'AA' ? [ticket('AA-001', 'AA-004 text'), ticket('AA-002', 'Other', ['work:AA-004'])] : [ticket('AA-004', 'Exact')] })
    const result = await search.searchTickets('ticket_key', 'AA-004', options)
    expect(result.results.map(r => r.ticket.code)).toEqual(['AA-004', 'AA-002', 'AA-001'])
    expect(result.results[1].matchedBy).toEqual(['external-ref'])
  })
  it('deduplicates before per-project and total limits and preserves last duplicate fields', async () => {
    const search = new SearchService({ getAllProjects: async () => projects }, { listCRs: async p => [ticket(`${p.project.code}-001`, 'match first'), ticket(`${p.project.code}-001`, 'match last'), ticket(`${p.project.code}-002`, 'match')] })
    const result = await search.searchTickets('ticket_key', 'match', { limitPerProject: 1, limitTotal: 2 })
    expect(result.results.map(r => [r.project.code, r.ticket.title])).toEqual([['AA', 'match last'], ['BB', 'match last']])
    expect(result.total).toBe(2)
  })
  it('keeps project-scope empty-query behavior, AND terms, stable order and missing-project error', async () => {
    const search = new SearchService({ getAllProjects: async () => projects }, { listCRs: async () => [ticket('AA-002', 'alpha beta'), ticket('AA-001', 'alpha')] })
    expect((await search.searchTickets('ticket_key', '', options)).results).toEqual([])
    expect((await search.searchTickets('project_scope', '', { ...options, projectCode: 'aa' })).results.map(r => r.ticket.code)).toEqual(['AA-002', 'AA-001'])
    expect((await search.searchTickets('ticket_key', 'alpha beta', options)).results.every(r => r.ticket.title === 'alpha beta')).toBe(true)
    await expect(search.searchTickets('project_scope', '', { ...options, projectCode: 'missing' })).rejects.toThrow('Project not found')
  })
  it('preserves project scores/stable ties, full groups alongside limited results and isolated ticket errors', async () => {
    const search = new SearchService({ getAllProjects: async () => projects }, { listCRs: async () => [ticket('AA-001', 'alpha')] })
    const result = await search.searchUnified('alpha', 'global', 2, 1)
    expect(result.results).toEqual([{ type: 'project', code: 'BB', name: 'Alpha Beta' }])
    expect(result.groups.map(g => [g.type, g.items.length])).toEqual([['project', 2], ['ticket', 2]])
    const failing = new SearchService({ getAllProjects: async () => projects }, { listCRs: async () => {
      throw new Error('fixture')
    } })
    expect((await failing.searchUnified('alpha', 'global', 2, 2)).groups.map(g => g.type)).toEqual(['project'])
    expect(await search.searchUnified('alpha', 'documents', 2, 2)).toEqual({ results: [], groups: [], total: 0 })
  })
})
