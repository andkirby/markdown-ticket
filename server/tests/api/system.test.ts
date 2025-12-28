/**
 * System Endpoint Tests - MDT-106
 *
 * Tests for system-related endpoints including status, directories, filesystem,
 * config, and cache operations. Includes error cases and OpenAPI validation.
 */

/// <reference types="jest" />

import { setupTestEnvironment, cleanupTestEnvironment } from './setup.js';
import { createGetRequest, createPostRequest, assertSuccess, assertBadRequest, assertNotFound, assertBodyHasProperties, assertIsArray, assertErrorMessage } from './helpers/index.js';

describe('System Endpoint Tests (MDT-106)', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof setupTestEnvironment>>['app'];

  beforeAll(async () => {
    const context = await setupTestEnvironment();
    tempDir = context.tempDir;
    app = context.app;
  });

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir);
  });

  describe('GET /api/status', () => {
    it('should return server status with ok, timestamp, and sseClients count', async () => {
      const response = await createGetRequest(app, '/api/status');
      assertSuccess(response, 200);
      assertBodyHasProperties(response, ['status', 'message', 'timestamp', 'sseClients']);
      expect(response.body.status).toBe('ok');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.sseClients).toBe('number');
    });

    it('should return valid ISO timestamp', async () => {
      const response = await createGetRequest(app, '/api/status');
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should satisfy OpenAPI spec', async () => {
      const response = await createGetRequest(app, '/api/status');
      expect(response as any).toSatisfyApiSpec();
    });
  });

  describe('GET /api/directories', () => {
    it('should return system directories as array of directory names', async () => {
      const response = await createGetRequest(app, '/api/directories');
      assertSuccess(response, 200);
      assertIsArray(response);
      expect(response.body.length).toBeGreaterThan(0);
      expect(typeof response.body[0]).toBe('string');
    });

    // Note: OpenAPI spec validation skipped due to mock vs production difference
    // Mock returns string[], production returns { home: string, directories: string[] }
  });

  describe('POST /api/filesystem/exists', () => {
    it('should return 400 for missing path parameter', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', {});
      assertBadRequest(response);
      assertErrorMessage(response, 'Path is required');
    });

    it('should return 400 for non-string path', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: 12345 });
      assertBadRequest(response);
      assertErrorMessage(response, 'string');
    });

    it('should check if valid path exists', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: tempDir });
      assertSuccess(response, 200);
      assertBodyHasProperties(response, ['exists', 'isInDiscovery', 'expandedPath']);
      expect([0, 1]).toContain(response.body.exists);
      expect(typeof response.body.expandedPath).toBe('string');
    });

    it('should expand tilde paths', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: '~' });
      assertSuccess(response, 200);
      expect(response.body.expandedPath).not.toBe('~');
      expect(response.body.expandedPath).toMatch(/^\/[a-zA-Z]/);
    });

    it('should return 0 for non-existent path', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: '/nonexistent/path/12345' });
      assertSuccess(response, 200);
      expect(response.body.exists).toBe(0);
    });

    it('should satisfy OpenAPI spec', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: tempDir });
      expect(response as any).toSatisfyApiSpec();
    });
  });

  describe('GET /api/config', () => {
    it('should return frontend configuration', async () => {
      const response = await createGetRequest(app, '/api/config');
      assertSuccess(response, 200);
      assertBodyHasProperties(response, ['configDir', 'discovery']);
      expect(response.body.discovery).toHaveProperty('autoDiscover');
      expect(response.body.discovery).toHaveProperty('searchPaths');
      expect(response.body.discovery).toHaveProperty('maxDepth');
    });

    it('should satisfy OpenAPI spec', async () => {
      const response = await createGetRequest(app, '/api/config');
      expect(response as any).toSatisfyApiSpec();
    });
  });

  describe('GET /api/config/global', () => {
    it('should return full global configuration', async () => {
      const response = await createGetRequest(app, '/api/config/global');
      assertSuccess(response, 200);
      expect(response.body).toHaveProperty('discovery');
      expect(response.body).toHaveProperty('links');
    });

    it('should satisfy OpenAPI spec', async () => {
      const response = await createGetRequest(app, '/api/config/global');
      expect(response as any).toSatisfyApiSpec();
    });
  });

  describe('POST /api/cache/clear', () => {
    it('should clear cache successfully', async () => {
      const response = await createPostRequest(app, '/api/cache/clear', {});
      assertSuccess(response, 200);
      assertBodyHasProperties(response, ['success', 'message', 'timestamp']);
      expect(response.body.success).toBe(true);
    });

    it('should satisfy OpenAPI spec', async () => {
      const response = await createPostRequest(app, '/api/cache/clear', {});
      expect(response as any).toSatisfyApiSpec();
    });
  });

  describe('POST /api/config/clear', () => {
    it('should clear config cache successfully', async () => {
      const response = await createPostRequest(app, '/api/config/clear', {});
      assertSuccess(response, 200);
      assertBodyHasProperties(response, ['success', 'message', 'timestamp']);
      expect(response.body.success).toBe(true);
    });

    it('should satisfy OpenAPI spec', async () => {
      const response = await createPostRequest(app, '/api/config/clear', {});
      expect(response as any).toSatisfyApiSpec();
    });
  });

  describe('Error cases', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await createGetRequest(app, '/api/nonexistent');
      assertNotFound(response);
    });

    it('should return 400 for invalid POST data', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { invalidField: 'value' });
      assertBadRequest(response);
    });
  });
});
