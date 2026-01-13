/**
 * Request Helper - MDT-106
 *
 * Provides Supertest request builders for API testing.
 * All request functions return Promises that resolve to Response objects.
 */

import request from 'supertest';
import type { Express } from 'express';
import type { Response } from 'supertest';

/**
 * Request options for customizing requests
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
}

/**
 * Create a Supertest request builder for the given Express app
 *
 * @param app - Express application instance
 * @returns Supertest Test instance
 */
function createTestRequest(app: Express): ReturnType<typeof request> {
  return request(app);
}

/**
 * Build a GET request with optional query parameters
 * Returns a Promise that resolves to the Response
 *
 * @param app - Express application instance
 * @param path - Request path
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
export function createGetRequest(
  app: Express,
  path: string,
  options?: RequestOptions
): Promise<Response> {
  let req = request(app).get(path);
  if (options?.query) {
    req = req.query(options.query);
  }
  if (options?.headers) {
    req = req.set(options.headers);
  }
  return req;
}

/**
 * Build a POST request with JSON body
 * Returns a Promise that resolves to the Response
 *
 * @param app - Express application instance
 * @param path - Request path
 * @param body - Request body
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
export function createPostRequest<T extends string | object | undefined = object>(
  app: Express,
  path: string,
  body: T,
  options?: RequestOptions
): Promise<Response> {
  let req = request(app).post(path).send(body as string | object | undefined);
  if (options?.headers) {
    req = req.set(options.headers);
  }
  return req;
}

/**
 * Build a PATCH request with JSON body
 * Returns a Promise that resolves to the Response
 *
 * @param app - Express application instance
 * @param path - Request path
 * @param body - Request body
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
function createPatchRequest<T extends string | object | undefined = object>(
  app: Express,
  path: string,
  body: T,
  options?: RequestOptions
): Promise<Response> {
  let req = request(app).patch(path).send(body as string | object | undefined);
  if (options?.headers) {
    req = req.set(options.headers);
  }
  return req;
}

/**
 * Build a PUT request with JSON body
 * Returns a Promise that resolves to the Response
 *
 * @param app - Express application instance
 * @param path - Request path
 * @param body - Request body
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
function createPutRequest<T extends string | object | undefined = object>(
  app: Express,
  path: string,
  body: T,
  options?: RequestOptions
): Promise<Response> {
  let req = request(app).put(path).send(body as string | object | undefined);
  if (options?.headers) {
    req = req.set(options.headers);
  }
  return req;
}

/**
 * Build a DELETE request
 * Returns a Promise that resolves to the Response
 *
 * @param app - Express application instance
 * @param path - Request path
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
export function createDeleteRequest(
  app: Express,
  path: string,
  options?: RequestOptions
): Promise<Response> {
  let req = request(app).delete(path);
  if (options?.headers) {
    req = req.set(options.headers);
  }
  return req;
}

/**
 * Project API request builders
 */
export const projectApi = {
  /**
   * GET /api/projects - List all projects
   */
  listProjects: (app: Express, bypassCache = false) =>
    createGetRequest(app, '/api/projects', { query: { bypassCache } }),

  /**
   * GET /api/projects/:projectId - Get project configuration
   */
  getProjectConfig: (app: Express, projectId: string) =>
    createGetRequest(app, `/api/projects/${projectId}/config`),

  /**
   * GET /api/projects/:projectId/crs - List CRs for project
   */
  listCRs: (app: Express, projectId: string, bypassCache = false) =>
    createGetRequest(app, `/api/projects/${projectId}/crs`, { query: { bypassCache } }),

  /**
   * GET /api/projects/:projectId/crs/:crId - Get specific CR
   */
  getCR: (app: Express, projectId: string, crId: string) =>
    createGetRequest(app, `/api/projects/${projectId}/crs/${crId}`),

  /**
   * POST /api/projects/:projectId/crs - Create new CR
   */
  createCR: <T extends string | object | undefined = object>(app: Express, projectId: string, crData: T) =>
    createPostRequest(app, `/api/projects/${projectId}/crs`, crData),

  /**
   * PATCH /api/projects/:projectId/crs/:crId - Partial update CR
   */
  patchCR: <T extends string | object | undefined = object>(app: Express, projectId: string, crId: string, updates: T) =>
    createPatchRequest(app, `/api/projects/${projectId}/crs/${crId}`, updates),

  /**
   * PUT /api/projects/:projectId/crs/:crId - Full update CR
   */
  updateCR: <T extends string | object | undefined = object>(app: Express, projectId: string, crId: string, crData: T) =>
    createPutRequest(app, `/api/projects/${projectId}/crs/${crId}`, crData),

  /**
   * DELETE /api/projects/:projectId/crs/:crId - Delete CR
   */
  deleteCR: (app: Express, projectId: string, crId: string) =>
    createDeleteRequest(app, `/api/projects/${projectId}/crs/${crId}`),
};

/**
 * System API request builders
 */
const systemApi = {
  /**
   * GET /api/status - Get server status
   */
  getStatus: (app: Express) => createGetRequest(app, '/api/status'),

  /**
   * GET /api/filesystem - Get file system tree
   */
  getFileSystem: (app: Express, projectId: string) =>
    createGetRequest(app, '/api/filesystem', { query: { projectId } }),

  /**
   * POST /api/check-directory - Check if directory exists
   */
  checkDirectory: (app: Express, path: string) =>
    createPostRequest(app, '/api/check-directory', { path }),

  /**
   * POST /api/configure-documents - Configure document paths
   */
  configureDocuments: (app: Express, projectId: string, documentPaths: string[]) =>
    createPostRequest(app, '/api/configure-documents', { projectId, documentPaths }),
};
