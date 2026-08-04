import type { NextFunction, Request, Response } from 'express'
import type { DocumentController } from '../controllers/DocumentController.js'
import type { ProjectController } from '../controllers/ProjectController.js'
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

  /**
   * @openapi
   * /api/documents/preview-token:
   *   post:
   *     summary: Mint a short-lived preview token for an HTML document
   *     tags: [Documents]
   *     description: |
   *       Owner-only. Mints a short-lived (<=300s), directory-scoped HMAC token
   *       that the sandboxed HTML preview iframe uses as its credential. The
   *       token is placed in the iframe src PATH (not a query param) so that
   *       relative subresources inherit the same credential. Read-token and
   *       shared sessions are rejected in v1.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId, filePath]
   *             properties:
   *               projectId: { type: string }
   *               filePath: { type: string, description: Project-relative path to the HTML file }
   *     responses:
   *       200:
   *         description: Preview token minted
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/PreviewTokenResponse' }
   *       400: { $ref: '#/components/responses/BadRequest' }
   *       403: { description: Read-only or shared session cannot mint preview tokens }
   */
  router.post('/preview-token', requireVisibleProject, (req, res) => documentController.mintPreviewToken(req, res))

  /**
   * @openapi
   * /api/documents/raw-preview/{token}/{documentPath}:
   *   get:
   *     summary: Serve a raw document asset from a token-scoped virtual root
   *     tags: [Documents]
   *     description: |
   *       Serves raw bytes for HTML preview and its relative subresources. The
   *       token is the credential (the opaque sandboxed iframe cannot send the
   *       SameSite=Strict session cookie). Responses carry the pinned CSP
   *       (sandbox allow-scripts; default-src 'none'; connect-src 'none'),
   *       X-Content-Type-Options nosniff, and X-Frame-Options SAMEORIGIN
   *       (overriding the global DENY so the iframe can load). Every request
   *       re-runs HMAC signature verification, token-scope, configured-paths,
   *       and project-root containment checks.
   *     parameters:
   *       - name: token
   *         in: path
   *         required: true
   *         schema: { type: string }
   *       - name: documentPath
   *         in: path
   *         required: true
   *         schema: { type: string, format: path }
   *     responses:
   *       200:
   *         description: Raw document bytes
   *         content:
   *           text/html: { schema: { type: string, format: binary } }
   *           text/css: { schema: { type: string, format: binary } }
   *           text/javascript: { schema: { type: string, format: binary } }
   *           image/png: { schema: { type: string, format: binary } }
   *       403: { description: Invalid, expired, or out-of-scope token; traversal attempt }
   *       404: { description: Unknown project or file }
   *       415: { description: Unsupported document type }
   */
  router.get('/raw-preview/:token/*', (req, res) => documentController.serveRawPreview(req, res))

  return router
}
