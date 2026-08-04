import type { PinController } from '../controllers/PinController.js'
import { Router } from 'express'

/**
 * Router for pin-rail endpoints (MDT-197).
 *
 * @param pinController - Pin controller instance.
 * @returns Express router mounted at /api/pins.
 *
 * Auth is inherited from the /api mount (createApiAuthMiddleware), matching
 * /api/documents. No per-project visibility gate: pins are user-global.
 */
export function createPinRouter(pinController: PinController): Router {
  const router = Router()

  /**
   * @openapi
   * /api/pins:
   *   get:
   *     summary: Read the user's pinned tickets (cross-project, reconciled)
   *     tags: [Pins]
   *     responses:
   *       200:
   *         description: Reconciled pin state (stale project codes dropped)
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
   */
  router.get('/', (req, res) => pinController.getPinState(req, res))

  /**
   * @openapi
   * /api/pins:
   *   put:
   *     summary: Replace the user's entire pin set (whole-list replace)
   *     tags: [Pins]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [pins]
   *             properties:
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
   */
  router.put('/', (req, res) => pinController.putPinState(req, res))

  return router
}
