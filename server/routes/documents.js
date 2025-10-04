import { Router } from 'express';

/**
 * Router for document-related endpoints
 * @param {DocumentController} documentController - Document controller instance
 * @param {ProjectController} projectController - Project controller instance (for configuration)
 * @returns {Router} Express router
 */
export function createDocumentRouter(documentController, projectController) {
  const router = Router();

  // Discover documents for a project
  router.get('/', (req, res) => documentController.getDocuments(req, res));

  // Get document content
  router.get('/content', (req, res) => documentController.getDocumentContent(req, res));

  // Configure document paths for a project
  router.post('/configure', (req, res) => projectController.configureDocuments(req, res));

  return router;
}
