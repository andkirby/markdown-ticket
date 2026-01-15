/**
 * Assertion Helpers - MDT-106.
 *
 * Provides reusable assertion utilities for API testing.
 * Simplifies common response validation patterns.
 */

import type { Response } from 'supertest'

/**
 * Assert that response has a successful status code (2xx).
 *
 * @param response - Supertest response.
 * @param expectedStatus - Expected status code (default: any 2xx).
 */
export function assertSuccess(response: Response, expectedStatus?: number): void {
  if (expectedStatus !== undefined) {
    expect(response.status).toBe(expectedStatus)
  }
  else {
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(300)
  }
}

/**
 * Assert that response has a specific status code.
 *
 * @param response - Supertest response.
 * @param statusCode - Expected status code.
 */
export function assertStatus(response: Response, statusCode: number): void {
  expect(response.status).toBe(statusCode)
}

/**
 * Assert that response indicates a bad request (400).
 *
 * @param response - Supertest response.
 */
export function assertBadRequest(response: Response): void {
  expect(response.status).toBe(400)
  expect(response.body).toHaveProperty('error')
  expect(response.body).toHaveProperty('message')
}

/**
 * Assert that response indicates not found (404).
 *
 * @param response - Supertest response.
 */
export function assertNotFound(response: Response): void {
  expect(response.status).toBe(404)
  expect(response.body).toHaveProperty('error')
  expect(response.body).toHaveProperty('message')
}

/**
 * Assert that response indicates a server error (500).
 *
 * @param response - Supertest response.
 */
function _assertServerError(response: Response): void {
  expect(response.status).toBeGreaterThanOrEqual(500)
  expect(response.body).toHaveProperty('error')
  expect(response.body).toHaveProperty('message')
}

/**
 * Assert that response body has specific properties.
 *
 * @param response - Supertest response.
 * @param properties - Array of property names to check.
 */
export function assertBodyHasProperties(response: Response, properties: string[]): void {
  properties.forEach((prop) => {
    expect(response.body).toHaveProperty(prop)
  })
}

/**
 * Assert that response body matches expected structure.
 *
 * @param response - Supertest response.
 * @param expectedBody - Expected body structure (partial match).
 */
function _assertBodyMatches<T = unknown>(response: Response, expectedBody: Partial<T>): void {
  expect(response.body).toMatchObject(expectedBody)
}

/**
 * Assert that response is an array.
 *
 * @param response - Supertest response.
 */
export function assertIsArray(response: Response): void {
  expect(Array.isArray(response.body)).toBe(true)
}

/**
 * Assert that response array has minimum length.
 *
 * @param response - Supertest response.
 * @param minLength - Minimum expected length.
 */
function _assertArrayHasMinLength(response: Response, minLength: number): void {
  expect(Array.isArray(response.body)).toBe(true)
  expect(response.body.length).toBeGreaterThanOrEqual(minLength)
}

/**
 * Assert that response array has specific length.
 *
 * @param response - Supertest response.
 * @param length - Expected length.
 */
export function assertArrayLength(response: Response, length: number): void {
  expect(Array.isArray(response.body)).toBe(true)
  expect(response.body).toHaveLength(length)
}

/**
 * Assert that response contains a specific item by property value.
 *
 * @param response - Supertest response (should be array).
 * @param property - Property name to check.
 * @param value - Expected value.
 */
function _assertArrayContains(response: Response, property: string, value: unknown): void {
  expect(Array.isArray(response.body)).toBe(true)
  expect(response.body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ [property]: value }),
    ]),
  )
}

/**
 * Assert that error response contains specific message.
 *
 * @param response - Supertest response.
 * @param message - Expected error message (partial match).
 */
export function assertErrorMessage(response: Response, message: string): void {
  expect(response.body).toHaveProperty('message')
  expect(response.body.message).toContain(message)
}

/**
 * Assert CR response structure.
 *
 * @param response - Supertest response.
 */
export function assertCRStructure(response: Response): void {
  assertBodyHasProperties(response, ['code', 'title', 'type', 'status'])
}

/**
 * Assert project response structure.
 *
 * @param response - Supertest response.
 */
function _assertProjectStructure(response: Response): void {
  assertBodyHasProperties(response, ['id', 'project'])
  expect(response.body.project).toHaveProperty('name')
  expect(response.body.project).toHaveProperty('path')
}

/**
 * Assert successful CRUD operation response.
 *
 * @param response - Supertest response.
 * @param operation - 'create' | 'update' | 'delete'.
 */
export function assertCRUDSuccess(response: Response, operation: 'create' | 'update' | 'delete'): void {
  assertSuccess(response)
  expect(response.body).toHaveProperty('success')
  expect(response.body.success).toBe(true)
  expect(response.body).toHaveProperty('message')

  switch (operation) {
    case 'create': {
      expect(response.body).toHaveProperty('crCode')
      expect(response.body).toHaveProperty('filename')

      break
    }
    case 'update': {
      expect(response.body).toHaveProperty('updatedFields')
      expect(Array.isArray(response.body.updatedFields)).toBe(true)

      break
    }
    case 'delete': {
      expect(response.body).toHaveProperty('filename')

      break
    }
    default:
  // Do nothing
  }
}

/**
 * Assert pagination parameters (if applicable).
 *
 * @param response - Supertest response.
 * @param queryParams - Query parameters used in request.
 * @param queryParams.page - Page number.
 * @param queryParams.limit - Items per page.
 */
function _assertPagination(response: Response, queryParams: { page?: number, limit?: number }): void {
  if (queryParams.page || queryParams.limit) {
    expect(response.body).toHaveProperty('pagination')
    expect(response.body.pagination).toMatchObject({
      page: queryParams.page || 1,
      limit: queryParams.limit || 10,
    })
  }
}

/**
 * Assert content-type header.
 *
 * @param response - Supertest response.
 * @param contentType - Expected content type.
 */
function _assertContentType(response: Response, contentType: string): void {
  expect(response.headers['content-type']).toContain(contentType)
}

/**
 * Assert CORS headers are present.
 *
 * @param response - Supertest response.
 */
function _assertCORSHeaders(response: Response): void {
  expect(response.headers['access-control-allow-origin']).toBeDefined()
}
