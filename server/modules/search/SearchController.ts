import type { SearchMode } from '@mdt/domain-contracts'
/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline: pre-existing casts, strip as they are rewritten */
import type { SearchService } from '@mdt/shared/services/search/SearchService.js'
import type { Request, Response } from 'express'
import { SearchRequestSchema, UnifiedSearchRequestSchema } from '@mdt/domain-contracts'

import { parseRequest } from '../../http/parseRequest.js'

export class SearchController {
  async search(req: Request, res: Response): Promise<void> {
    try {
      const parsed = parseRequest(UnifiedSearchRequestSchema, req.body, res, 'body')
      if (!parsed.success)
        return
      const { query, scope, limitPerGroup, limitTotal } = parsed.data
      res.json(await this.ticketService?.searchUnified?.(query, scope, limitPerGroup, limitTotal) ?? { results: [], groups: [], total: 0 })
    }
    catch (error) {
      console.error('Error in unified search:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to search' })
    }
  }

  constructor(private ticketService?: Pick<SearchService, 'searchTickets'> & Partial<Pick<SearchService, 'searchUnified'>>) {}
  async searchLegacy(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = parseRequest(SearchRequestSchema, req.body, res, 'body')
      if (!parseResult.success)
        return

      const { mode, query, limitPerProject, limitTotal } = parseResult.data
      const projectCode = 'projectCode' in parseResult.data
        ? (parseResult.data as { projectCode: string }).projectCode
        : undefined

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available for search' })
        return
      }

      const result = await this.ticketService.searchTickets(
        mode as SearchMode,
        query,
        { projectCode, limitPerProject, limitTotal },
      )

      res.json(result)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }
      console.error('Error searching tickets:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to search tickets' })
    }
  }
}
