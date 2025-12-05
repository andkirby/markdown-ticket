import { Router } from 'express';
import { TicketController } from '../controllers/TicketController.js';

/**
 * Router for ticket/task-related endpoints (legacy and duplicate detection)
 * @param ticketController - Ticket controller instance
 * @returns Express router
 */
export function createTicketRouter(ticketController: TicketController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/tasks:
   *   get:
   *     tags: [Tasks]
   *     summary: List all task files
   *     description: Returns array of markdown filenames from the legacy tasks directory
   *     responses:
   *       200:
   *         description: List of task filenames
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { type: string, example: 'task-001.md' }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.get('/', (req, res) => ticketController.getAllTasks(req, res));

  /**
   * @openapi
   * /api/tasks/{filename}:
   *   get:
   *     tags: [Tasks]
   *     summary: Get task file content
   *     description: Returns raw markdown content of a specific task file
   *     parameters:
   *       - name: filename
   *         in: path
   *         required: true
   *         schema: { type: string }
   *         example: task-001.md
   *     responses:
   *       200:
   *         description: Task file content (raw markdown)
   *         content:
   *           text/plain: { schema: { type: string } }
   *       400:
   *         description: Missing filename
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error400' }
   *       404:
   *         description: Task not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error404' }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.get('/:filename', (req, res) => ticketController.getTask(req, res));

  /**
   * @openapi
   * /api/tasks/save:
   *   post:
   *     tags: [Tasks]
   *     summary: Save task file
   *     description: Creates or updates a task markdown file
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [filename, content]
   *             properties:
   *               filename: { type: string, example: 'task-001.md' }
   *               content: { type: string, description: 'Markdown content' }
   *     responses:
   *       200:
   *         description: Task saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 filename: { type: string }
   *       400:
   *         description: Missing required fields
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error400' }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.post('/save', (req, res) => ticketController.saveTask(req, res));

  /**
   * @openapi
   * /api/tasks/{filename}:
   *   delete:
   *     tags: [Tasks]
   *     summary: Delete task file
   *     description: Removes a task markdown file from the filesystem
   *     parameters:
   *       - name: filename
   *         in: path
   *         required: true
   *         schema: { type: string }
   *         example: task-001.md
   *     responses:
   *       200:
   *         description: Task deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *       400:
   *         description: Missing filename
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error400' }
   *       404:
   *         description: Task not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error404' }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.delete('/:filename', (req, res) => ticketController.deleteTask(req, res));

  return router;
}

/**
 * Router for duplicate detection endpoints
 * @param ticketController - Ticket controller instance
 * @returns Express router
 */
export function createDuplicateRouter(ticketController: TicketController): Router {
  const router = Router();

  /**
   * @openapi
   * /api/duplicates/{projectId}:
   *   get:
   *     tags: [Duplicates]
   *     summary: Get duplicate tickets (deprecated)
   *     description: |
   *       Finds tickets with identical or similar titles within a project.
   *       **Deprecated per MDT-082** - returns empty results.
   *     deprecated: true
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *     responses:
   *       200:
   *         description: Duplicate detection results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 duplicates: { type: array, items: { type: object } }
   *                 totalDuplicates: { type: integer, example: 0 }
   *       400:
   *         description: Missing project ID
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error400' }
   *       404:
   *         description: Project not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error404' }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.get('/:projectId', (req, res) => ticketController.getDuplicates(req, res));

  /**
   * @openapi
   * /api/duplicates/preview:
   *   post:
   *     tags: [Duplicates]
   *     summary: Preview duplicate rename (deprecated)
   *     description: |
   *       Previews changes that would occur when renaming a duplicate ticket.
   *       **Deprecated per MDT-082** - returns empty results.
   *     deprecated: true
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId, filepath]
   *             properties:
   *               projectId: { type: string, example: 'mdt' }
   *               filepath: { type: string, example: 'docs/CRs/MDT-001.md' }
   *     responses:
   *       200:
   *         description: Rename preview
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 originalFilepath: { type: string }
   *                 newFilepath: { type: string }
   *                 oldCode: { type: string }
   *                 newCode: { type: string }
   *                 changesPreview: { type: string }
   *       400:
   *         description: Missing required fields
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error400' }
   *       404:
   *         description: Project not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error404' }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.post('/preview', (req, res) => ticketController.previewDuplicateRename(req, res));

  /**
   * @openapi
   * /api/duplicates/resolve:
   *   post:
   *     tags: [Duplicates]
   *     summary: Resolve duplicate ticket (deprecated)
   *     description: |
   *       Resolves a duplicate by renaming or deleting the ticket.
   *       **Deprecated per MDT-082** - returns empty results.
   *     deprecated: true
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId, oldFilepath, action]
   *             properties:
   *               projectId: { type: string, example: 'mdt' }
   *               oldFilepath: { type: string, example: 'docs/CRs/MDT-001.md' }
   *               action: { type: string, enum: [rename, delete], example: 'rename' }
   *     responses:
   *       200:
   *         description: Resolution result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 action: { type: string }
   *                 originalFilepath: { type: string }
   *                 newFilepath: { type: string }
   *       400:
   *         description: Missing required fields
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error400' }
   *       404:
   *         description: Project not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error404' }
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Error500' }
   */
  router.post('/resolve', (req, res) => ticketController.resolveDuplicateTicket(req, res));

  return router;
}