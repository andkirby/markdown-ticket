/**
 * Request Helper - MDT-106.
 *
 * Provides Supertest request builders for API testing.
 * All request functions return Promises that resolve to Response objects.
 */

import type { Express } from 'express'
import type { Response, SuperAgentTest } from 'supertest'
import request from 'supertest'

/**
 * Request target: either a bare Express app or a credentialed supertest agent
 * (from `setupAuthenticatedTestEnvironment().authRequest`). The helpers branch
 * on this so suites can opt into authenticated requests without changing call
 * sites — just pass `authRequest` instead of `app`.
 */
type RequestTarget = Express | SuperAgentTest

/**
 * Express apps are callable functions; supertest agents are plain objects.
 * Use this to normalize either into something `.get()/.post()` can chain on.
 */
function requestBuilder(target: RequestTarget) {
  return typeof target === 'function' ? request(target as Express) : target
}

/**
 * Request options for customizing requests.
 */
interface RequestOptions {
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean>
}

/**
 * Create a Supertest request builder for the given Express app or agent.
 *
 * @param target - Express app or credentialed agent.
 * @returns Supertest Test instance
 */
function _createTestRequest(target: RequestTarget): ReturnType<typeof request> {
  return requestBuilder(target)
}

/**
 * Build a GET request with optional query parameters
 * Returns a Promise that resolves to the Response.
 *
 * @param target - Express app or credentialed agent.
 * @param path - Request path
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
export function createGetRequest(
  target: RequestTarget,
  path: string,
  options?: RequestOptions,
): Promise<Response> {
  let req = requestBuilder(target).get(path)

  if (options?.query) {
    req = req.query(options.query)
  }
  if (options?.headers) {
    req = req.set(options.headers)
  }

  return req
}

/**
 * Build a POST request with JSON body
 * Returns a Promise that resolves to the Response.
 *
 * @param target - Express app or credentialed agent.
 * @param path - Request path
 * @param body - Request body
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
export function createPostRequest<T extends string | object | undefined = object>(
  target: RequestTarget,
  path: string,
  body: T,
  options?: RequestOptions,
): Promise<Response> {
  let req = requestBuilder(target).post(path).send(body)

  if (options?.headers) {
    req = req.set(options.headers)
  }

  return req
}

/**
 * Build a PATCH request with JSON body
 * Returns a Promise that resolves to the Response.
 *
 * @param target - Express app or credentialed agent.
 * @param path - Request path
 * @param body - Request body
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
function createPatchRequest<T extends string | object | undefined = object>(
  target: RequestTarget,
  path: string,
  body: T,
  options?: RequestOptions,
): Promise<Response> {
  let req = requestBuilder(target).patch(path).send(body)

  if (options?.headers) {
    req = req.set(options.headers)
  }

  return req
}

/**
 * Build a PUT request with JSON body
 * Returns a Promise that resolves to the Response.
 *
 * @param target - Express app or credentialed agent.
 * @param path - Request path
 * @param body - Request body
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
function createPutRequest<T extends string | object | undefined = object>(
  target: RequestTarget,
  path: string,
  body: T,
  options?: RequestOptions,
): Promise<Response> {
  let req = requestBuilder(target).put(path).send(body)

  if (options?.headers) {
    req = req.set(options.headers)
  }

  return req
}

/**
 * Build a DELETE request
 * Returns a Promise that resolves to the Response.
 *
 * @param target - Express app or credentialed agent.
 * @param path - Request path
 * @param options - Optional request configuration
 * @returns Promise resolving to Supertest Response
 */
function createDeleteRequest(
  target: RequestTarget,
  path: string,
  options?: RequestOptions,
): Promise<Response> {
  let req = requestBuilder(target).delete(path)

  if (options?.headers) {
    req = req.set(options.headers)
  }

  return req
}

/**
 * Project API request builders.
 */
export const projectApi = {
  /**
   * GET /api/projects - List all projects.
   */
  listProjects: (target: RequestTarget, bypassCache = false) => { return createGetRequest(target, '/api/projects', { query: { bypassCache } }) },

  /**
   * GET /api/projects/:projectId - Get project configuration.
   */
  getProjectConfig: (target: RequestTarget, projectId: string) => { return createGetRequest(target, `/api/projects/${projectId}/config`) },

  /**
   * GET /api/projects/:projectId/crs - List CRs for project.
   */
  listCRs: (target: RequestTarget, projectId: string, bypassCache = false) => { return createGetRequest(target, `/api/projects/${projectId}/crs`, { query: { bypassCache } }) },

  /**
   * GET /api/projects/:projectId/crs/:crId - Get specific CR.
   */
  getCR: (target: RequestTarget, projectId: string, crId: string) => { return createGetRequest(target, `/api/projects/${projectId}/crs/${crId}`) },

  /**
   * POST /api/projects/:projectId/crs - Create new CR.
   */
  createCR: <T extends string | object | undefined = object>(target: RequestTarget, projectId: string, crData: T) => { return createPostRequest(target, `/api/projects/${projectId}/crs`, crData) },

  /**
   * PATCH /api/projects/:projectId/crs/:crId - Partial update CR.
   */
  patchCR: <T extends string | object | undefined = object>(target: RequestTarget, projectId: string, crId: string, updates: T) => { return createPatchRequest(target, `/api/projects/${projectId}/crs/${crId}`, updates) },

  /**
   * PUT /api/projects/:projectId/crs/:crId - Full update CR.
   */
  updateCR: <T extends string | object | undefined = object>(target: RequestTarget, projectId: string, crId: string, crData: T) => { return createPutRequest(target, `/api/projects/${projectId}/crs/${crId}`, crData) },

  /**
   * DELETE /api/projects/:projectId/crs/:crId - Delete CR.
   */
  deleteCR: (target: RequestTarget, projectId: string, crId: string) => { return createDeleteRequest(target, `/api/projects/${projectId}/crs/${crId}`) },
}

/**
 * System API request builders.
 */
const _systemApi = {
  /**
   * GET /api/status - Get server status.
   */
  getStatus: (target: RequestTarget) => createGetRequest(target, '/api/status'),

  /**
   * GET /api/filesystem - Get file system tree.
   */
  getFileSystem: (target: RequestTarget, projectId: string) => { return createGetRequest(target, '/api/filesystem', { query: { projectId } }) },

  /**
   * POST /api/check-directory - Check if directory exists.
   */
  checkDirectory: (target: RequestTarget, path: string) => { return createPostRequest(target, '/api/check-directory', { path }) },

  /**
   * POST /api/configure-documents - Configure document paths.
   */
  configureDocuments: (target: RequestTarget, projectId: string, documentPaths: string[]) => { return createPostRequest(target, '/api/configure-documents', { projectId, documentPaths }) },
}
