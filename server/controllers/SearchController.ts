/**
 * SearchController - Unified search across entity types — MDT-179
 *
 * POST /api/search — dispatches search across projects, tickets, and documents
 * based on the requested scope. Delegates to existing services.
 */

import type { Request, Response } from 'express'

import { UnifiedSearchRequestSchema, SearchResultType } from '@mdt/domain-contracts'

import type { ProjectController } from './ProjectController'

export class SearchController {
  constructor(private projectController: ProjectController) {}

  /**
   * Unified search endpoint. MDT-179.
   *
   * Dispatches search across entity types based on scope:
   * - global: searches projects, tickets, and documents
   * - tickets: searches tickets only
   * - projects: searches projects only
   * - documents: searches documents only
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body against schema
      const parseResult = UnifiedSearchRequestSchema.safeParse(req.body)
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0]
        const message = firstIssue?.message ?? 'Validation error'
        res.status(400).json({ error: 'Bad Request', message })
        return
      }

      const { query, scope, limitPerGroup, limitTotal } = parseResult.data

      const groups: Array<{
        type: string
        label: string
        items: any[]
      }> = []
      const allResults: any[] = []

      // Project search
      if (scope === 'global' || scope === 'projects') {
        const projectResults = await this.searchProjects(query, limitPerGroup)
        if (projectResults.length > 0) {
          groups.push({
            type: SearchResultType.PROJECT,
            label: 'Projects',
            items: projectResults,
          })
          allResults.push(...projectResults)
        }
      }

      // Ticket search (delegates to existing TicketService)
      if (scope === 'global' || scope === 'tickets') {
        const ticketResults = await this.searchTickets(query, limitPerGroup)
        if (ticketResults.length > 0) {
          groups.push({
            type: SearchResultType.TICKET,
            label: 'Tickets',
            items: ticketResults,
          })
          allResults.push(...ticketResults)
        }
      }

      // Document search (placeholder — document content search is C6 extensibility)
      if (scope === 'documents') {
        // Document search will be implemented when document content search is added
        // For now, return empty group
      }

      // Apply total limit
      const totalResults = allResults.slice(0, limitTotal)

      res.json({
        results: totalResults,
        groups,
        total: totalResults.length,
      })
    }
    catch (error: unknown) {
      const err = error as Error
      console.error('Error in unified search:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to search' })
    }
  }

  /**
   * Search projects by name/code. MDT-179.
   * Uses the ProjectService already loaded by the ProjectController.
   */
  private async searchProjects(query: string, limit: number): Promise<any[]> {
    const projectService = this.projectController.getProjectService()
    if (!projectService) return []

    const allProjects = await projectService.getAllProjects()
    const terms = query.toLowerCase().trim().split(/\s+/)

    return allProjects
      .map((project: any) => {
        const name = project.project?.name?.toLowerCase() ?? project.name?.toLowerCase() ?? ''
        const code = project.project?.code?.toLowerCase() ?? ''
        let score = 0
        for (const term of terms) {
          if (code === term) { score += 100; continue }
          if (code.startsWith(term)) { score += 90; continue }
          const words = name.split(/[^a-z0-9]+/).filter(Boolean)
          let matched = false
          for (const word of words) {
            if (word === term) { score += 80; matched = true; break }
            if (word.startsWith(term)) { score += 70; matched = true; break }
          }
          if (!matched) return null
        }
        return { project, score }
      })
      .filter((m: any): m is { project: any; score: number } => m !== null)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit)
      .map((m: any) => ({
        type: SearchResultType.PROJECT,
        code: m.project.project?.code ?? m.project.code ?? '',
        name: m.project.project?.name ?? m.project.name ?? '',
      }))
  }

  /**
   * Search tickets using existing TicketService. MDT-179.
   * Reuses the same search logic from ProjectController.search().
   */
  private async searchTickets(query: string, limit: number): Promise<any[]> {
    const ticketService = this.projectController.getTicketService()
    if (!ticketService) return []

    try {
      // Use ticket_key mode with the query as-is for broad matching
      const result = await ticketService.searchTickets(
        'ticket_key',
        query,
        { limitPerProject: limit, limitTotal: limit },
      )

      return (result as any).results?.map((r: any) => ({
        type: SearchResultType.TICKET,
        ticketKey: r.ticket.code,
        title: r.ticket.title,
        status: r.ticket.status ?? '',
        project: {
          code: r.project.code,
          name: r.project.name,
        },
      })) ?? []
    }
    catch {
      return []
    }
  }
}
