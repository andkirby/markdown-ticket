import type { SearchResponse } from '@mdt/domain-contracts'
import type { Project } from '../../models/Project.js'
import type { Ticket } from '../../models/Ticket.js'
import { SearchResultType } from '@mdt/domain-contracts'
import { ticketSearchProvenance, ticketSearchScore } from '../ticket/referenceSearch.js'

export class SearchService {
  constructor(private catalog: { getAllProjects: () => Promise<Project[]> }, private tickets: { listCRs: (project: Project) => Promise<Ticket[]> }) {}
  async searchTickets(
    mode: 'ticket_key' | 'project_scope',
    query: string,
    options: {
      projectCode?: string
      limitPerProject: number
      limitTotal: number
    },
  ): Promise<SearchResponse> {
    if (mode === 'ticket_key') {
      return this.searchByTicketKey(query, options.limitTotal, options.limitPerProject)
    }
    return this.searchByProjectScope(
      query,
      options.projectCode!,
      options.limitPerProject,
      options.limitTotal,
    )
  }

  private async searchByTicketKey(
    query: string,
    limitTotal: number,
    limitPerProject: number,
  ): Promise<SearchResponse> {
    if (limitTotal < 1) {
      return { results: [], total: 0 }
    }

    const terms = query.trim().split(/\s+/)
    const projects = await this.catalog.getAllProjects()
    const groups = await Promise.all(projects.map(async (project) => {
      const tickets = await this.tickets.listCRs(project)
      return tickets.flatMap((ticket) => {
        const sources = terms.map(term => ticketSearchProvenance(ticket, term))
        const matchedBy = [...new Set(sources.flat())]
        return sources.every(matches => matches.length > 0)
          ? [{
              ticket: { code: ticket.code, title: ticket.title, priority: ticket.priority ?? null, status: ticket.status ?? null, refs: ticket.refs, externalRefs: ticket.externalRefs },
              project: { code: project.project.code || project.id, name: project.project.name },
              matchedBy,
            }]
          : []
      })
    }))
    const matches = groups.flat().sort((a, b) => {
      const rank = (item: typeof a) => terms.reduce((score, term) => score + ticketSearchScore(item.ticket, term), 0)
      return rank(b) - rank(a) || a.project.code.localeCompare(b.project.code) || a.ticket.code.localeCompare(b.ticket.code)
    })
    const perProject = new Map<string, number>()
    const unique = [...new Map(matches.map(result => [`${result.project.code}:${result.ticket.code}`, result])).values()]
    const results = unique.filter((result) => {
      const count = perProject.get(result.project.code) ?? 0
      perProject.set(result.project.code, count + 1)
      return count < limitPerProject
    }).slice(0, limitTotal)
    return { results, total: results.length }
  }

  private async searchByProjectScope(
    query: string,
    projectCode: string,
    limitPerProject: number,
    limitTotal: number,
  ): Promise<SearchResponse> {
    const projects = await this.catalog.getAllProjects()
    const project = projects.find(
      p => p.project.code === projectCode || p.id === projectCode,
    )

    if (!project) {
      throw new Error('Project not found')
    }

    const allCRs = await this.tickets.listCRs(project)

    const filtered = query
      ? allCRs.filter(cr => query.trim().split(/\s+/).every(term => ticketSearchProvenance(cr, term).length > 0))
      : allCRs

    const effectiveLimit = Math.min(limitPerProject, limitTotal)
    const ranked = [...filtered].sort((a, b) => {
      const rank = (ticket: Ticket) => ticketSearchScore(ticket, query)
      return rank(b) - rank(a)
    })
    const limited = ranked.slice(0, effectiveLimit)

    return {
      results: limited.map(cr => ({
        matchedBy: ticketSearchProvenance(cr, query),
        ticket: {
          code: cr.code,
          title: cr.title,
          refs: cr.refs,
          externalRefs: cr.externalRefs,
          priority: cr.priority ?? null,
          // MDT-247: additive status for the key-strip glyph (project_scope).
          status: cr.status ?? null,
        },
        project: {
          code: project.project.code || project.id,
          name: project.project.name,
        },
      })),
      total: limited.length,
    }
  }

  private async searchProjects(query: string, limit: number): Promise<any[]> {
    const projectService = this.catalog
    if (!projectService)
      return []

    const allProjects = await projectService.getAllProjects()
    const terms = query.toLowerCase().trim().split(/\s+/)

    return allProjects
      .map((project: any) => {
        const name = project.project?.name?.toLowerCase() ?? project.name?.toLowerCase() ?? ''
        const code = project.project?.code?.toLowerCase() ?? ''
        let score = 0
        for (const term of terms) {
          if (code === term) {
            score += 100
            continue
          }
          if (code.startsWith(term)) {
            score += 90
            continue
          }
          const words = name.split(/[^a-z0-9]+/).filter(Boolean)
          let matched = false
          for (const word of words) {
            if (word === term) {
              score += 80
              matched = true
              break
            }
            if (word.startsWith(term)) {
              score += 70
              matched = true
              break
            }
          }
          if (!matched)
            return null
        }
        return { project, score }
      })
      .filter((m: any): m is { project: any, score: number } => m !== null)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit)
      .map((m: any) => ({
        type: SearchResultType.PROJECT,
        code: m.project.project?.code ?? m.project.code ?? '',
        name: m.project.project?.name ?? m.project.name ?? '',
      }))
  }

  async searchUnified(query: string, scope: string, limitPerGroup: number, limitTotal: number) {
    const groups: Array<{ type: string, label: string, items: unknown[] }> = []
    const allResults: unknown[] = []
    if (scope === 'global' || scope === 'projects') {
      const items = await this.searchProjects(query, limitPerGroup)
      if (items.length) {
        groups.push({ type: SearchResultType.PROJECT, label: 'Projects', items })
        allResults.push(...items)
      }
    }
    if (scope === 'global' || scope === 'tickets') {
      let items: unknown[] = []
      try {
        const result = await this.searchTickets('ticket_key', query, { limitPerProject: limitPerGroup, limitTotal: limitPerGroup })
        items = result.results.map(r => ({ type: SearchResultType.TICKET, ticketKey: r.ticket.code, refs: r.ticket.refs, externalRefs: r.ticket.externalRefs, matchedBy: r.matchedBy, title: r.ticket.title, status: r.ticket.status ?? '', project: { code: r.project.code, name: r.project.name } }))
      }
      catch { /* Existing unified search isolates ticket search failure. */ }
      if (items.length) {
        groups.push({ type: SearchResultType.TICKET, label: 'Tickets', items })
        allResults.push(...items)
      }
    }
    const results = allResults.slice(0, limitTotal)
    return { results, groups, total: results.length }
  }
}
