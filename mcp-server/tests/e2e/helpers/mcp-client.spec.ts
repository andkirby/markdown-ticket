/**
 * MCP Client Wrapper Tests
 *
 * Following TDD principles: RED → GREEN → REFACTOR
 * These tests should initially fail, then drive the implementation.
 */

import { MCPClient } from './mcp-client';
import { TestEnvironment } from './test-environment';

describe('MCP Client', () => {
  let testEnv: TestEnvironment;
  let mcpClient: MCPClient;

  beforeEach(async () => {
    // Create isolated test environment for each test
    testEnv = new TestEnvironment('mcp-client-test');
    await testEnv.setup();
    mcpClient = new MCPClient(testEnv);
  });

  afterEach(async () => {
    // Clean up test environment
    if (mcpClient) {
      await mcpClient.stop();
    }
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  describe('Server Lifecycle', () => {
    it('GIVEN test env WHEN starting client THEN server runs and responds', async () => {
      // This should fail initially (RED)
      // After implementation, client should start and connect to server

      await expect(mcpClient.start()).resolves.not.toThrow();

      // Verify server is responsive by checking connection
      const isConnected = await mcpClient.isConnected();
      expect(isConnected).toBe(true);

      // Basic health check
      const tools = await mcpClient.listTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    }, 15000);

    it('GIVEN running client WHEN stopping THEN server shuts down cleanly', async () => {
      // This should fail initially (RED)
      // After implementation, client should stop cleanly

      await mcpClient.start();
      expect(await mcpClient.isConnected()).toBe(true);

      await expect(mcpClient.stop()).resolves.not.toThrow();
      expect(await mcpClient.isConnected()).toBe(false);
    }, 15000);
  });

  describe('Tool Communication', () => {
    beforeEach(async () => {
      // Start client for tool communication tests
      await mcpClient.start();
    });

    it('GIVEN running client WHEN calling list_tools THEN return available tools', async () => {
      // This should fail initially (RED)
      const tools = await mcpClient.listTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Verify expected tools are present
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('list_projects');
      expect(toolNames).toContain('get_cr');
      expect(toolNames).toContain('create_cr');
    }, 10000);

    it('GIVEN running client WHEN calling list_projects THEN return response', async () => {
      // This should fail initially (RED)
      const response = await mcpClient.callTool('list_projects', {});

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data.projects)).toBe(true);
    }, 10000);
  });

  describe('Error Handling', () => {
    it('GIVEN invalid tool WHEN calling THEN should handle error gracefully', async () => {
      await mcpClient.start();

      const response = await mcpClient.callTool('invalid_tool', {});

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    }, 10000);

    it('GIVEN server down WHEN calling THEN should handle connection error', async () => {
      // Don't start client, simulate server down
      const response = await mcpClient.callTool('list_projects', {});

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    }, 5000);
  });

  describe('Transport Modes', () => {
    it('GIVEN stdio mode WHEN starting THEN use subprocess transport', async () => {
      const stdioClient = new MCPClient(testEnv, { transport: 'stdio' });
      await stdioClient.start();

      const isConnected = await stdioClient.isConnected();
      expect(isConnected).toBe(true);

      const tools = await stdioClient.listTools();
      expect(tools.length).toBeGreaterThan(0);

      await stdioClient.stop();
    }, 15000);

    it('GIVEN http mode WHEN starting THEN use HTTP transport', async () => {
      const httpClient = new MCPClient(testEnv, { transport: 'http' });
      await httpClient.start();

      const isConnected = await httpClient.isConnected();
      expect(isConnected).toBe(true);

      const tools = await httpClient.listTools();
      expect(tools.length).toBeGreaterThan(0);

      await httpClient.stop();
    }, 15000);
  });

  describe('Specific MCP Tools Integration', () => {
    beforeEach(async () => {
      // Register test data
      mcpClient.registerProject('MDT', {
        name: 'Markdown Ticket',
        path: testEnv.baseDir,
        description: 'Test project for MCP tools'
      });

      // Register a test CR by calling create_cr
      await mcpClient.start();

      const createResponse = await mcpClient.callTool('create_cr', {
        project: 'MDT',
        type: 'Bug Fix',
        data: {
          title: 'Initial Test CR',
          content: '## 1. Description\n\nTest content for get_cr test'
        }
      });

      // Store the CR key for reference
      (mcpClient as any).testCRKey = createResponse.data.key;
    });

    it('GIVEN client WHEN calling get_project_info THEN return project details', async () => {
      const response = await mcpClient.callTool('get_project_info', { key: 'MDT' });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    }, 10000);

    it('GIVEN client WHEN calling list_crs THEN return CR list', async () => {
      const response = await mcpClient.callTool('list_crs', { project: 'MDT' });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data.crs)).toBe(true);
    }, 10000);

    it('GIVEN client WHEN calling get_cr THEN return CR details', async () => {
      // Use the CR created in beforeEach
      const crKey = (mcpClient as any).testCRKey;
      expect(crKey).toBeDefined();

      const response = await mcpClient.callTool('get_cr', {
        project: 'MDT',
        key: crKey
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.key).toBe(crKey);
    }, 10000);

    it('GIVEN client WHEN calling create_cr THEN create new CR', async () => {
      const crData = {
        title: 'Test CR from MCP Client',
        type: 'Feature Enhancement',
        content: '## 1. Description\n\nTest description'
      };

      const response = await mcpClient.callTool('create_cr', {
        project: 'MDT',
        type: 'Feature Enhancement',
        data: crData
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.key).toBeDefined();
    }, 10000);
  });
});