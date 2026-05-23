import type { DocumentController } from '../controllers/DocumentController.js'
import type { ProjectController } from '../controllers/ProjectController.js'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

/**
 * Router for document-related endpoints.
 *
 * @param documentController - Document controller instance.
 * @param projectController - Project controller instance (for configuration).
 * @returns Express router.
 */
export function createDocumentRouter(
  documentController: DocumentController,
  projectController: ProjectController,
): Router {
  const router = Router()
  const requireVisibleProject = async (req: Request, res: Response, next: NextFunction) => {
    const projectId = typeof req.query.projectId === 'string'
      ? req.query.projectId
      : typeof req.body?.projectId === 'string'
        ? req.body.projectId
        : null

    if (!projectId) {
      next()
      return
    }

    if (await projectController.ensureProjectVisible(projectId, req, res)) {
      next()
    }
  }

  /**
   * @openapi
   * /api/documents:
   *   get:
   *     summary: Discover documents for a project
   *     tags: [Documents]
   *     parameters:
   *       - name: projectId
   *         in: query
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: List of discovered documents
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/Document' } }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       404: { $ref: '#/components/responses/NotFound' }
   */
  router.get('/', requireVisibleProject, (req, res) => documentController.getDocuments(req, res))

  /**
   * @openapi
   * /api/documents/content:
   *   get:
   *     summary: Get document content
   *     tags: [Documents]
   *     parameters:
   *       - name: projectId
   *         in: query
   *         required: true
   *         schema: { type: string }
   *       - name: path
   *         in: query
   *         required: true
   *         schema: { type: string }
   *         description: Relative path to document
   *     responses:
   *       200:
   *         description: Document content
   *         content:
   *           text/plain:
   *             schema: { type: string }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       403: { description: Access denied or invalid file path }
   *       404: { $ref: '#/components/responses/NotFound' }
   */
  router.get('/content', requireVisibleProject, (req, res) => documentController.getDocumentContent(req, res))

  /**
   * @openapi
   * /api/documents/favs:
   *   put:
   *     summary: Persist document fav state
   *     tags: [Documents]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId, favItems]
   *             properties:
   *               projectId: { type: string }
   *               favItems:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [path, type, favoritedAt]
   *                   properties:
   *                     path: { type: string }
   *                     type: { type: string, enum: [file, folder] }
   *                     favoritedAt: { type: string, format: date-time }
   *     responses:
   *       200:
   *         description: Fav state persisted
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       404: { $ref: '#/components/responses/NotFound' }
   */
  router.put('/favs', (req, res) => documentController.putDocumentFavs(req, res))

  /**
   * @openapi
   * /api/documents/configure:
   *   post:
   *     summary: Configure document paths for a project
   *     tags: [Documents]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId, documentPaths]
   *             properties:
   *               projectId: { type: string }
   *               documentPaths: { type: array, items: { type: string } }
   *     responses:
   *       200:
   *         description: Configuration updated
   *         content:
   *           application/json:
   *             schema: { type: object, properties: { success: { type: boolean } } }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       404: { $ref: '#/components/responses/NotFound' }
   */
  router.post('/configure', (req, res) => projectController.configureDocuments(req, res))

  return router
}
