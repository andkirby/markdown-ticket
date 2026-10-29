import type { ProjectionStreamStatus } from '../../services/cloud-sync/ProjectionStreamManager.js'
import type { TicketController } from './TicketController.js'
import { Router } from 'express'
import { parseRequest } from '../../http/parseRequest.js'
import { CloudStatusParamsSchema } from '../../http/readSchemas.js'

export function createTicketRouter(ticketController: Pick<TicketController, 'getProjectCRs' | 'getUnifiedTickets' | 'getCloudProjections' | 'getCR' | 'createCR' | 'patchCR' | 'updateCR' | 'getSubDocument' | 'getTraceStoreMetadata' | 'getTraceStore' | 'deleteCR'>): Router {
  const router = Router()

  /**
   * @openapi
   * /api/projects/{projectId}/crs:
   *   get:
   *     summary: List CRs for project
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *     responses:
   *       200:
   *         description: List of CRs
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/CR'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get('/:projectId/crs', ticketController.getProjectCRs.bind(ticketController))

  /**
   * MDT-226: unified ticket view — canonical local tickets plus projection-only
   * read-only entries with kind/readOnly/stale capability metadata. The browser
   * consumes this instead of a separate /cloud-projections request (C-11).
   */
  router.get('/:projectId/tickets/unified', ticketController.getUnifiedTickets.bind(ticketController))

  /**
   * Owner-only, header-only cloud projection feed. Registered before the
   * generic CR routes so no ticket wildcard can consume it.
   */
  router.get('/:projectId/cloud-projections', ticketController.getCloudProjections.bind(ticketController))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}:
   *   get:
   *     summary: Get specific CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *     responses:
   *       200:
   *         description: CR details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CR'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get('/:projectId/crs/:crId', ticketController.getCR.bind(ticketController))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}/subdocuments/{subDocName}:
   *   get:
   *     summary: Get individual sub-document content
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *       - name: subDocName
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *         description: Sub-document name (without .md extension)
   *     responses:
   *       200:
   *         description: Sub-document content
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SubDocumentDetail'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get('/:projectId/crs/:crId/subdocuments/:subDocName', ticketController.getSubDocument.bind(ticketController))

  router.get('/:projectId/crs/:crId/trace-store/meta', ticketController.getTraceStoreMetadata.bind(ticketController))

  router.get('/:projectId/crs/:crId/trace-store', ticketController.getTraceStore.bind(ticketController))

  // MDT-151: Catch path-traversal attempts that Express resolves before route matching
  // e.g. /subdocuments/../etc/passwd → resolved to /etc/passwd, misses the subdocuments route
  // Return same 404 body as subdocument handler to avoid information leakage
  router.get('/:projectId/crs/:crId/*', (_req, res) => {
    res.status(404).json({ error: 'Not Found', message: 'SubDocument not found' })
  })

  /**
   * @openapi
   * /api/projects/{projectId}/crs:
   *   post:
   *     summary: Create new CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *     requestBody:
   *       $ref: '#/components/requestBodies/CRCreate'
   *     responses:
   *       201:
   *         $ref: '#/components/responses/CRCreated'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.post('/:projectId/crs', ticketController.createCR.bind(ticketController))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}:
   *   patch:
   *     summary: Partial update CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *     requestBody:
   *       $ref: '#/components/requestBodies/CRPatch'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/CRUpdated'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.patch('/:projectId/crs/:crId', ticketController.patchCR.bind(ticketController))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}:
   *   put:
   *     summary: Full update CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *     requestBody:
   *       $ref: '#/components/requestBodies/CRUpdate'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/CRUpdated'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.put('/:projectId/crs/:crId', ticketController.updateCR.bind(ticketController))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}:
   *   delete:
   *     summary: Delete CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *     responses:
   *       204:
   *         description: CR deleted
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.delete('/:projectId/crs/:crId', ticketController.deleteCR.bind(ticketController))
  return router
}

/** Local diagnostics only: no credential resolution, network or cloud write. */
export function createCloudStatusRouter(manager: { getStatus: (projectId: string) => ProjectionStreamStatus | null }, rolloutEnabled: boolean): Router {
  const router = Router()
  // MDT-226 incident recovery: local-only cloud-sync diagnostics. Reads manager
  // and persisted activation state only — no credential, HTTP, WebSocket, or D1
  // call (BR-1.5, C-11, C-15). MDT-203 may render this in Project Settings and
  // MDT-223 in CLI diagnostics.
  router.get('/:id/cloud-sync/status', (req, res) => {
    const params = parseRequest(CloudStatusParamsSchema, req.params, res, 'params')
    if (!params.success)
      return
    const status = manager.getStatus(params.data.id)
    if (!status) {
      res.status(404).json({ error: 'cloud sync is not enabled for this project' })
      return
    }
    res.json({
      projectId: params.data.id,
      rolloutEnabled,
      ...status,
    })
  })

  return router
}
