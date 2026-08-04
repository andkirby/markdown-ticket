import type { Request, Response } from 'express'
import type { PinStateService } from '../services/PinStateService.js'

/**
 * MDT-197: Pin rail controller.
 *
 * Thin HTTP layer over PinStateService. Mirrors DocumentController's
 * putDocumentFavs posture: validate via the service, map known service
 * errors to HTTP statuses, 500 on the unexpected.
 *
 * Two endpoints:
 * - GET /api/pins          → readReconciledState (drops stale project codes)
 * - PUT /api/pins          → writeState (whole-list replace, validates project codes)
 *
 * Auth is applied at the /api mount (createApiAuthMiddleware), same as
 * /api/documents/favs. No per-project visibility gate — pins are user-global.
 */
interface PinStateRequest extends Request {
  body: {
    pins?: unknown
  }
}

export class PinController {
  constructor(private pinStateService: PinStateService) {}

  async getPinState(_req: Request, res: Response): Promise<void> {
    try {
      const state = await this.pinStateService.readReconciledState()
      res.json(state)
    }
    catch (error: unknown) {
      console.error('Error reading pin state:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to read pin state' })
    }
  }

  async putPinState(req: PinStateRequest, res: Response): Promise<void> {
    try {
      const state = await this.pinStateService.writeState(req.body)
      res.json(state)
    }
    catch (error: unknown) {
      console.error('Error writing pin state:', error)

      if (error instanceof Error) {
        // Zod validation errors carry a recognizable message prefix; service
        // errors ('Unknown project in pin set') map to 400 as well.
        if (error.message === 'Unknown project in pin set') {
          res.status(400).json({ error: 'Bad Request', message: error.message })
          return
        }
      }

      res.status(400).json({ error: 'Bad Request', message: 'Invalid pin state' })
    }
  }
}
