import type { TicketController } from '../controllers/TicketController.js'
import { Router } from 'express'

/**
 * Router for ticket/task-related endpoints (legacy).
 *
 * @param ticketController - Ticket controller instance.
 * @returns Express router.
 */
export function createTicketRouter(ticketController: TicketController): Router {
  const router = Router()

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
  router.get('/', (req, res) => ticketController.getAllTasks(req, res))

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
  router.get('/:filename', (req, res) => ticketController.getTask(req, res))

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
  router.post('/save', (req, res) => ticketController.saveTask(req, res))

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
  router.delete('/:filename', (req, res) => ticketController.deleteTask(req, res))

  return router
}
