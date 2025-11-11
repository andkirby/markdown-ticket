import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController.js';
import { ProjectController } from '../controllers/ProjectController.js';
/**
 * Router for document-related endpoints
 * @param documentController - Document controller instance
 * @param projectController - Project controller instance (for configuration)
 * @returns Express router
 */
export declare function createDocumentRouter(documentController: DocumentController, projectController: ProjectController): Router;
