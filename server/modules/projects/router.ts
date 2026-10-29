import type { ProjectController } from './ProjectController.js'
import { Router } from 'express'

export function createProjectRouter(projectController: ProjectController): Router {
  const router = Router()

  /**
   * @openapi
   * /api/projects:
   *   get:
   *     summary: List all projects
   *     tags: [Projects]
   *     responses:
   *       200:
   *         description: List of all registered projects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Project'
   */
  router.get('/', projectController.getAllProjects.bind(projectController))

  /**
   * @openapi
   * /api/projects/{projectId}/config:
   *   get:
   *     summary: Get project configuration
   *     tags: [Projects]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *     responses:
   *       200:
   *         description: Project configuration
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProjectConfig'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get('/:projectId/config', projectController.getProjectConfig.bind(projectController))

  /**
   * @openapi
   * /api/projects/create:
   *   post:
   *     summary: Create new project
   *     tags: [Projects]
   *     requestBody:
   *       $ref: '#/components/requestBodies/ProjectCreate'
   *     responses:
   *       201:
   *         $ref: '#/components/responses/ProjectCreated'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  router.post('/create', projectController.createProject.bind(projectController))

  /**
   * @openapi
   * /api/projects/{code}/update:
   *   put:
   *     summary: Update project
   *     tags: [Projects]
   *     parameters:
   *       - $ref: '#/components/parameters/projectCode'
   *     requestBody:
   *       $ref: '#/components/requestBodies/ProjectUpdate'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/ProjectUpdated'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.put('/:code/update', projectController.updateProject.bind(projectController))

  router.put('/:code/sharing', projectController.updateProjectSharing.bind(projectController))

  /**
   * @openapi
   * /api/projects/{code}/enable:
   *   put:
   *     summary: Enable project
   *     tags: [Projects]
   *     parameters:
   *       - $ref: '#/components/parameters/projectCode'
   *     responses:
   *       200:
   *         description: Project enabled
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.put('/:code/enable', projectController.enableProject.bind(projectController))

  /**
   * @openapi
   * /api/projects/{code}/disable:
   *   put:
   *     summary: Disable project
   *     tags: [Projects]
   *     parameters:
   *       - $ref: '#/components/parameters/projectCode'
   *     responses:
   *       200:
   *         description: Project disabled
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.put('/:code/disable', projectController.disableProject.bind(projectController))
  return router
}
