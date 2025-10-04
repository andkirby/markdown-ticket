import { Router } from 'express';

/**
 * Router for ticket/task-related endpoints (legacy and duplicate detection)
 * @param {TicketController} ticketController - Ticket controller instance
 * @returns {Router} Express router
 */
export function createTicketRouter(ticketController) {
  const router = Router();

  // Legacy task endpoints
  // Get all task files
  router.get('/', (req, res) => ticketController.getAllTasks(req, res));

  // Get individual task file
  router.get('/:filename', (req, res) => ticketController.getTask(req, res));

  // Save task file
  router.post('/save', (req, res) => ticketController.saveTask(req, res));

  // Delete task file
  router.delete('/:filename', (req, res) => ticketController.deleteTask(req, res));

  return router;
}

/**
 * Router for duplicate detection endpoints
 * @param {TicketController} ticketController - Ticket controller instance
 * @returns {Router} Express router
 */
export function createDuplicateRouter(ticketController) {
  const router = Router();

  // Get duplicates for a project
  router.get('/:projectId', (req, res) => ticketController.getDuplicates(req, res));

  // Preview rename changes
  router.post('/preview', (req, res) => ticketController.previewDuplicateRename(req, res));

  // Resolve duplicate by renaming or deleting
  router.post('/resolve', (req, res) => ticketController.resolveDuplicateTicket(req, res));

  return router;
}
