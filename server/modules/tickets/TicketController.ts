/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline: pre-existing casts, strip as they are rewritten */
import type { Response } from 'express'
import type { TicketService } from '../../services/TicketService.js'

import type { AuthenticatedRequest, ProjectServiceExtension } from '../projects/index.js'
import { parseRequest } from '../../http/parseRequest.js'
import { createProjectAccess } from '../../http/projectAccess.js'
import { ProjectionQuerySchema, SubdocumentRefParamsSchema } from '../../http/readSchemas.js'
import { ProjectRefParamsSchema, RestCreateTicketInputSchema, RestPatchTicketInputSchema, TicketRefParamsSchema } from '../../http/ticketSchemas.js'

import { getRequestAccess } from '../../security/apiAuth.js'
import {
  isWriteAccess,
} from '../../security/projectSharing.js'
/** Preserve the shared ambiguity boundary across every key-based HTTP adapter. */
function sendTicketIdentityConflict(error: unknown, res: Response): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'ticket_key_ambiguous')
    return false
  const paths = 'paths' in error && Array.isArray(error.paths)
    ? error.paths.filter((value): value is string => typeof value === 'string'
      && !/^(?:[\\/]|[a-z]:)/i.test(value) && !value.split(/[\\/]/).includes('..'))
    : []
  res.status(409).json({
    error: 'Conflict',
    code: 'ticket_key_ambiguous',
    message: 'Ticket key resolves to multiple files; inspect the listed relative paths.',
    paths,
  })
  return true
}

export class TicketController {
  private access: ReturnType<typeof createProjectAccess>
  private resolveVisibleProject(...args: Parameters<typeof this.access.resolveVisibleProject>) { return this.access.resolveVisibleProject(...args) }
  constructor(private projectService: ProjectServiceExtension, private ticketService?: TicketService) { this.access = createProjectAccess(projectService) }
  async getProjectCRs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId } = params.data

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })

        return
      }

      const project = await this.resolveVisibleProject(projectId, req, res)
      if (!project) {
        return
      }

      // MDT-094: Return metadata-only for list endpoint (reduces payload)
      const crs = await this.projectService.getProjectCRsMetadata(project)

      res.json(crs)
    }
    catch (error: unknown) {
      console.error('Error getting project CRs:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get project CRs' })
    }
  }

  async getUnifiedTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId } = params.data
      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })
        return
      }
      const project = await this.resolveVisibleProject(projectId, req, res)
      if (!project) {
        return
      }
      if (!this.ticketService) {
        res.status(503).json({ error: 'Service Unavailable', message: 'Ticket service not initialized' })
        return
      }
      const items = await this.ticketService.getUnifiedTickets(projectId)
      res.json(items)
    }
    catch (error: unknown) {
      console.error('Error getting unified tickets:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get unified tickets' })
    }
  }

  async getCloudProjections(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId } = params.data
      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })
        return
      }

      if (!isWriteAccess(getRequestAccess(req))) {
        res.status(403).json({ error: 'Forbidden', message: 'Owner access is required' })
        return
      }

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available for cloud projections' })
        return
      }

      const query = parseRequest(ProjectionQuerySchema, req.query, res, 'query')
      if (!query.success)
        return
      const after = Number.parseInt(query.data.after ?? '0', 10)
      const limit = Number.parseInt(query.data.limit ?? '100', 10)
      if (!Number.isSafeInteger(after) || after < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid projection cursor or limit' })
        return
      }

      const result = await this.ticketService.getCloudProjections(projectId, after, limit)
      res.json(result)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }
      console.error('Error polling cloud projections:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to poll cloud projections' })
    }
  }

  async getCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })

        return
      }

      if (!await this.resolveVisibleProject(projectId, req, res)) {
        return
      }

      // Use TicketService if available
      if (this.ticketService) {
        const cr = await this.ticketService.getCR(projectId, crId)

        res.json(cr)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for fetching CR' })
    }
    catch (error: unknown) {
      if (sendTicketIdentityConflict(error, res))
        return
      console.error('Error getting CR:', error)
      const err = error as Error

      if (err.message === 'Project not found' || err.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get CR', details: err.message })
    }
  }

  async createCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId } = params.data
      const body = parseRequest(RestCreateTicketInputSchema, req.body, res, 'body')
      if (!body.success)
        return
      const crData = body.data

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.createCR(projectId, crData)

        res.status(201).json(result)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for creating CR' })
    }
    catch (error: unknown) {
      if (sendTicketIdentityConflict(error, res))
        return
      console.error('Error creating CR:', error)
      const err = error as Error

      if (err.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      if (err.message.includes('required')) {
        res.status(400).json({ error: 'Bad Request', message: err.message })

        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create CR', details: err.message })
    }
  }

  async patchCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data
      const body = parseRequest(RestPatchTicketInputSchema, req.body, res, 'body')
      if (!body.success)
        return
      const updates = body.data

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.updateCRPartial(projectId, crId, updates)

        res.json(result)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for CR updates' })
    }
    catch (error: unknown) {
      if (sendTicketIdentityConflict(error, res))
        return
      console.error('Error updating CR:', error)
      const err = error as Error

      // Handle validation errors with appropriate status codes
      if (err.message.includes('Invalid status transition')) {
        res.status(400).json({ error: 'Bad Request', message: err.message })

        return
      }

      if (err.message === 'Project not found' || err.message === 'CR not found' || err.message.includes('not found')) {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      if (err.message.includes('No fields provided') || err.message.includes('required') || err.message.includes('Invalid')) {
        res.status(400).json({ error: 'Bad Request', message: err.message })

        return
      }

      if (err.message.includes('Permission denied')) {
        res.status(403).json({ error: 'Forbidden', message: err.message })

        return
      }

      // Generic errors
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update CR', details: err.message })
    }
  }

  async updateCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data
      const body = parseRequest(RestPatchTicketInputSchema, req.body, res, 'body')
      if (!body.success)
        return
      const crData = body.data

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.updateCRPartial(projectId, crId, crData)

        res.json(result)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for updating CR' })
    }
    catch (error: unknown) {
      if (sendTicketIdentityConflict(error, res))
        return
      console.error('Error updating CR:', error)
      const err = error as Error

      if (err.message === 'Project not found' || err.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update CR', details: err.message })
    }
  }

  async getSubDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(SubdocumentRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId, subDocName } = params.data

      if (!projectId || !crId || !subDocName) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID, CR ID, and sub-document name are required' })
        return
      }

      if (!await this.resolveVisibleProject(projectId, req, res)) {
        return
      }

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available' })
        return
      }

      const doc = await this.ticketService.getSubDocument(projectId, crId, subDocName)
      res.json(doc)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found' || err.message === 'SubDocument not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get sub-document' })
    }
  }

  async getTraceStoreMetadata(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })
        return
      }

      if (!await this.resolveVisibleProject(projectId, req, res)) {
        return
      }

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available' })
        return
      }

      const metadata = await this.ticketService.getTraceStoreMetadata(projectId, crId)
      res.setHeader('Cache-Control', 'no-store')
      res.json(metadata)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found' || err.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get trace store metadata' })
    }
  }

  async getTraceStore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })
        return
      }

      if (!await this.resolveVisibleProject(projectId, req, res)) {
        return
      }

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available' })
        return
      }

      const result = await this.ticketService.getTraceStore(projectId, crId)
      res.setHeader('Cache-Control', 'no-store')
      res.json(result.store)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found' || err.message === 'CR not found' || err.message === 'TraceStore not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }

      if (err.message === 'TraceStore invalid') {
        res.status(422).json({ error: 'Unprocessable Entity', message: 'TraceStore invalid' })
        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get trace store' })
    }
  }

  async deleteCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.deleteCR(projectId, crId)

        res.json(result)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for deleting CR' })
    }
    catch (error: unknown) {
      if (sendTicketIdentityConflict(error, res))
        return
      console.error('Error deleting CR:', error)
      const err = error as Error

      if (err.message === 'Project not found' || err.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete CR', details: err.message })
    }
  }
}
