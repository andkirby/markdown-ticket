import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController.js';
import { ProjectController } from '../controllers/ProjectController.js';

/**
 * Router for document-related endpoints
 * @param documentController - Document controller instance
 * @param projectController - Project controller instance (for configuration)
 * @returns Express router
 */
export function createDocumentRouter(
  documentController: DocumentController,
  projectController: ProjectController
): Router {
  const router = Router();

  // Discover documents for a project
  router.get('/', (req, res) => documentController.getDocuments(req, res));

  // Get document content
  router.get('/content', (req, res) => documentController.getDocumentContent(req, res));

  // Configure document paths for a project
  router.post('/configure', (req, res) => projectController.configureDocuments(req, res));

  return router;
}