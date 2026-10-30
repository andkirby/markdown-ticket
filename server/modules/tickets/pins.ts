import type { NextFunction, Request, Response } from 'express'
import type { ProjectAccess } from '../../http/projectAccess.js'
import type { PinController } from '../../modules/tickets/PinController.js'
import { Router } from 'express'
import { z } from 'zod'
import { parseRequest } from '../../http/parseRequest.js'
import { OptionalProjectRefQuerySchema } from '../../http/readSchemas.js'

/**
 * Router for pin-rail endpoints (MDT-197, project-scoped per UAT 2026-10-30).
 *
 * @param pinController - Pin controller instance.
 * @param projectAccess - Per-project visibility gate (same as /api/documents).
 * @returns Express router mounted at /api/pins.
 *
 * Auth is inherited from the /api mount (createApiAuthMiddleware). Both
 * endpoints resolve the project from `projectId` (query on GET, body on PUT)
 * and 404 when it is unknown or not visible to the caller.
 */
export function createPinRouter(pinController: PinController, projectAccess: ProjectAccess): Router {
  const router = Router()

  const requireVisibleProject = async (req: Request, res: Response, next: NextFunction) => {
    const query = parseRequest(OptionalProjectRefQuerySchema, req.query, res, 'query')
    if (!query.success)
      return
    const projectId = query.data.projectId ?? z.object({ projectId: z.string().min(1) }).safeParse(req.body ?? {}).data?.projectId

    if (typeof projectId !== 'string' || projectId.length === 0) {
      next()
      return
    }

    if (await projectAccess.ensureProjectVisible(projectId, req, res)) {
      next()
    }
  }

  /**
   * @openapi
   * /api/pins:
   *   get:
   *     summary: Read a project's pinned tickets (legacy-absorbed, reconciled)
   *     tags: [Pins]
   *     parameters:
   *       - name: projectId
   *         in: query
   *         required: true
   *         schema: { type: string }
   *         description: Project id or project code
   *     responses:
   *       200:
   *         description: Reconciled pin state for the project
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               required: [pins]
   *               properties:
   *                 pins:
   *                   type: array
   *                   items:
   *                     type: object
   *                     required: [projectCode, ticketCode, favoritedAt]
   *                     properties:
   *                       projectCode: { type: string }
   *                       ticketCode: { type: string, pattern: '^[A-Z][A-Z0-9]*-[0-9]+$' }
   *                       favoritedAt: { type: string, format: date-time }
   *       404: { $ref: '#/components/responses/NotFound' }
   */
  router.get('/', requireVisibleProject, pinController.getPinState.bind(pinController))

  /**
   * @openapi
   * /api/pins:
   *   put:
   *     summary: Replace a project's entire pin set (whole-list replace)
   *     tags: [Pins]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId, pins]
   *             properties:
   *               projectId: { type: string }
   *               pins:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [projectCode, ticketCode, favoritedAt]
   *                   properties:
   *                     projectCode: { type: string }
   *                     ticketCode: { type: string }
   *                     favoritedAt: { type: string, format: date-time }
   *     responses:
   *       200: { description: Pin state persisted }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       404: { $ref: '#/components/responses/NotFound' }
   */
  router.put('/', requireVisibleProject, pinController.putPinState.bind(pinController))

  return router
}
