/**
 * API Documentation Routes - Serves OpenAPI spec and Redoc UI
 */

import { Router, Request, Response } from 'express';
import redoc from 'redoc-express';
import { swaggerSpec } from '../openapi/config.js';

/**
 * Creates router for API documentation endpoints
 * @returns Express router with /api-docs endpoints
 */
export function createDocsRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /api-docs/json:
   *   get:
   *     tags: [Documentation]
   *     summary: OpenAPI specification (JSON)
   *     description: Returns the raw OpenAPI 3.0.0 specification in JSON format
   *     responses:
   *       200:
   *         description: OpenAPI specification
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               description: OpenAPI 3.0.0 specification document
   */
  router.get('/json', (req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  /**
   * @openapi
   * /api-docs:
   *   get:
   *     tags: [Documentation]
   *     summary: Interactive API documentation (Redoc UI)
   *     description: Serves Redoc UI for interactive API exploration
   *     responses:
   *       200:
   *         description: Redoc HTML page
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   */
  // Use type assertion to handle redoc-express middleware typing
  const redocMiddleware = redoc({
    title: 'Markdown Ticket API',
    specUrl: '/api-docs/json'
  }) as unknown as (req: Request, res: Response) => void;

  router.get('/', redocMiddleware);

  return router;
}
