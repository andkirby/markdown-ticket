import type { Request, Response } from 'express'
import type { PinStateService } from '../../services/PinStateService.js'
import { PinInputSchema } from '@mdt/domain-contracts'
import { z } from 'zod'
import { parseRequest } from '../../http/parseRequest.js'

/**
 * MDT-197: Pin rail controller (project-scoped per UAT 2026-10-30).
 *
 * Thin HTTP layer over PinStateService. Mirrors DocumentController's
 * putDocumentFavs posture: validate shape at the adapter, map known service
 * errors to HTTP statuses, 500 on the unexpected.
 *
 * Two endpoints, both scoped to a project:
 * - GET /api/pins?projectId=X  → readReconciledState (legacy-absorbed, reconciled)
 * - PUT /api/pins {projectId, pins} → writeState (whole-list replace)
 *
 * The router additionally gates both behind project visibility
 * (ensureProjectVisible), same as /api/documents.
 */
interface PinStateRequest extends Request {}

const ProjectIdQuerySchema = z.object({ projectId: z.string().min(1) })

export class PinController {
  constructor(private pinStateService: PinStateService) {}

  async getPinState(req: PinStateRequest, res: Response): Promise<void> {
    try {
      const query = parseRequest(ProjectIdQuerySchema, req.query, res, 'query')
      if (!query.success)
        return
      const state = await this.pinStateService.readReconciledState(query.data.projectId)
      res.json(state)
    }
    catch (error: unknown) {
      console.error('Error reading pin state:', error)
      if (error instanceof Error && error.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: error.message })
        return
      }
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to read pin state' })
    }
  }

  async putPinState(req: PinStateRequest, res: Response): Promise<void> {
    try {
      const body = parseRequest(PinInputSchema, req.body, res, 'body')
      if (!body.success)
        return
      const state = await this.pinStateService.writeState(body.data.projectId, { pins: body.data.pins })
      res.json(state)
    }
    catch (error: unknown) {
      console.error('Error writing pin state:', error)

      if (error instanceof Error) {
        if (error.message === 'Project not found') {
          res.status(404).json({ error: 'Not Found', message: error.message })
          return
        }
        // Service-level rule violations (projectCode mismatch) and Zod
        // validation errors both map to 400.
        if (error.message === 'Pin projectCode does not match owning project') {
          res.status(400).json({ error: 'Bad Request', message: error.message })
          return
        }
      }

      res.status(400).json({ error: 'Bad Request', message: 'Invalid pin state' })
    }
  }
}
