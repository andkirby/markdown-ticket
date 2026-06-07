/**
 * Search routes — MDT-179
 *
 * POST /api/search — unified search across entity types
 */

import type { SearchController } from '../controllers/SearchController'
import { Router } from 'express'

/**
 * Router for unified search endpoints.
 *
 * @param searchController - Search controller instance.
 * @returns Express router.
 */
export function createSearchRouter(searchController: SearchController): Router {
  const router = Router()

  /**
   * @openapi
   * /api/search:
   *   post:
   *     summary: Unified search across projects, tickets, and documents
   *     tags: [Search]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [query]
   *             properties:
   *               query:
   *                 type: string
   *                 minLength: 1
   *               scope:
   *                 type: string
   *                 enum: [global, tickets, projects, documents]
   *                 default: global
   *               limitPerGroup:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 10
   *                 default: 5
   *               limitTotal:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 30
   *                 default: 15
   *     responses:
   *       200:
   *         description: Search results grouped by entity type
   */
  router.post('/', (req, res) => searchController.search(req, res))

  return router
}
