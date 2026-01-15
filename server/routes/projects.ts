import type { ProjectController } from '../controllers/ProjectController.js'
import { Router } from 'express'

/**
 * Router for project-related endpoints.
 *
 * @param projectController - Project controller instance.
 * @returns Express router.
 */
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
  router.get('/', (req, res) => projectController.getAllProjects(req, res))

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
  router.get('/:projectId/config', (req, res) => projectController.getProjectConfig(req, res))

  /**
   * @openapi
   * /api/projects/{projectId}/crs:
   *   get:
   *     summary: List CRs for project
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *     responses:
   *       200:
   *         description: List of CRs
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/CR'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get('/:projectId/crs', (req, res) => projectController.getProjectCRs(req, res))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}:
   *   get:
   *     summary: Get specific CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *     responses:
   *       200:
   *         description: CR details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CR'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get('/:projectId/crs/:crId', (req, res) => projectController.getCR(req, res))

  /**
   * @openapi
   * /api/projects/{projectId}/crs:
   *   post:
   *     summary: Create new CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *     requestBody:
   *       $ref: '#/components/requestBodies/CRCreate'
   *     responses:
   *       201:
   *         $ref: '#/components/responses/CRCreated'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.post('/:projectId/crs', (req, res) => projectController.createCR(req, res))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}:
   *   patch:
   *     summary: Partial update CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *     requestBody:
   *       $ref: '#/components/requestBodies/CRPatch'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/CRUpdated'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.patch('/:projectId/crs/:crId', (req, res) => projectController.patchCR(req, res))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}:
   *   put:
   *     summary: Full update CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *     requestBody:
   *       $ref: '#/components/requestBodies/CRUpdate'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/CRUpdated'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.put('/:projectId/crs/:crId', (req, res) => projectController.updateCR(req, res))

  /**
   * @openapi
   * /api/projects/{projectId}/crs/{crId}:
   *   delete:
   *     summary: Delete CR
   *     tags: [CRs]
   *     parameters:
   *       - $ref: '#/components/parameters/projectId'
   *       - $ref: '#/components/parameters/crId'
   *     responses:
   *       204:
   *         description: CR deleted
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.delete('/:projectId/crs/:crId', (req, res) => projectController.deleteCR(req, res))

  /**
   * @openapi
   * /api/projects/register:
   *   post:
   *     summary: Register project (deprecated)
   *     tags: [Projects]
   *     deprecated: true
   *     responses:
   *       501:
   *         description: Endpoint deprecated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/register', (req, res) => {
    res.status(501).json({
      error: 'This endpoint is deprecated',
      message: 'Please use POST /api/projects/create instead',
    })
  })

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
  router.post('/create', (req, res) => projectController.createProject(req, res))

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
  router.put('/:code/update', (req, res) => projectController.updateProject(req, res))

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
  router.put('/:code/enable', (req, res) => projectController.enableProject(req, res))

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
  router.put('/:code/disable', (req, res) => projectController.disableProject(req, res))

  return router
}
