import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController.js';

/**
 * Router for project-related endpoints
 * @param projectController - Project controller instance
 * @returns Express router
 */
export function createProjectRouter(projectController: ProjectController): Router {
  const router = Router();

  // Get all projects
  router.get('/', (req, res) => projectController.getAllProjects(req, res));

  // Get specific project configuration
  router.get('/:projectId/config', (req, res) => projectController.getProjectConfig(req, res));

  // Get CRs for a specific project
  router.get('/:projectId/crs', (req, res) => projectController.getProjectCRs(req, res));

  // Get specific CR from a project
  router.get('/:projectId/crs/:crId', (req, res) => projectController.getCR(req, res));

  // Create new CR in a project
  router.post('/:projectId/crs', (req, res) => projectController.createCR(req, res));

  // Partially update CR fields (PATCH)
  router.patch('/:projectId/crs/:crId', (req, res) => projectController.patchCR(req, res));

  // Update CR in a project (PUT - full update)
  router.put('/:projectId/crs/:crId', (req, res) => projectController.updateCR(req, res));

  // Delete CR from a project
  router.delete('/:projectId/crs/:crId', (req, res) => projectController.deleteCR(req, res));

  // Register a new project (deprecated - kept for backward compatibility)
  router.post('/register', (req, res) => {
    res.status(501).json({
      error: 'This endpoint is deprecated',
      message: 'Please use POST /api/projects/create instead'
    });
  });

  // Create new project with UI form data
  router.post('/create', (req, res) => projectController.createProject(req, res));

  // Update existing project
  router.put('/:code/update', (req, res) => projectController.updateProject(req, res));

  // Enable project
  router.put('/:code/enable', (req, res) => projectController.enableProject(req, res));

  // Disable project
  router.put('/:code/disable', (req, res) => projectController.disableProject(req, res));

  return router;
}