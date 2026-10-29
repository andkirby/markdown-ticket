import type { TicketIdentityObservation } from '../../services/cloud-sync/TicketIdentityObservation.js'
import { Router } from 'express'
import { parseRequest } from '../../http/parseRequest.js'
import { ProjectRefParamsSchema } from '../../http/ticketSchemas.js'
import { getRequestAccess } from '../../security/apiAuth.js'
import { isWriteAccess } from '../../security/projectSharing.js'

/** Local owner diagnostics. GET only reads cache and never verifies against the cloud. */
export function createTicketIdentityRouter(observation: Pick<TicketIdentityObservation, 'get'>): Router {
  const router = Router()
  router.get('/:projectId/ticket-identities', (req, res) => {
    if (!isWriteAccess(getRequestAccess(req))) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
    if (!params.success)
      return
    const cached = observation.get(params.data.projectId)
    if (!cached) {
      res.status(404).json({ error: 'Not Found', message: 'Ticket identity diagnostics are not available' })
      return
    }
    res.json(cached)
  })
  return router
}
