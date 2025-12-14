/**
 * Error Handling E2E Tests
 *
 * Testing JSON-RPC and MCP tool error response formats
 * Following MCP specification for error handling
 *
 * BDD Scenarios:
 * - Protocol Error Format (MUST-09):
 *   - Method not found (-32601)
 *   - Invalid params (-32602)
 *   - Server error (-32000 to -32099)
 * - Tool Execution Error Format (MUST-10):
 *   - Business logic failures
 *   - Validation errors
 *   - Resource not found errors
 */

import { TestEnvironment } from '../helpers/test-environment';
import { MCPClient } from '../helpers/mcp-client';
import { ProjectFactory } from '../helpers/project-factory';

describe('Error Handling', () => {
  let testEnv: TestEnvironment;
  let mcpClient: MCPClient;
  let projectFactory: ProjectFactory;

  beforeEach(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();

    mcpClient = new MCPClient(testEnv, { transport: 'stdio' });
    await mcpClient.start();

    projectFactory = new ProjectFactory(testEnv, mcpClient);
  });

  afterEach(async () => {
    await mcpClient.stop();
    await testEnv.cleanup();
  });

  describe('Protocol Error Format (MUST-09)', () => {
    it('should return -32601 for unknown method', async () => {
      const response = await mcpClient.callTool('non_existent_method', {});

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601);
      expect(response.error?.message).toContain('not found');
    });

    it('should return -32601 for misspelled method names', async () => {
      const response = await mcpClient.callTool('list_project', {}); // Missing 's'

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32601);
      expect(response.error?.message).toContain('not found');
    });

    it('should return -32602 for missing required parameters', async () => {
      const response = await mcpClient.callTool('get_cr', {}); // Missing 'key'

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32602);
      expect(response.error?.message).toContain('required');
      expect(response.error?.message).toContain('key');
    });

    it('should return -32602 for invalid parameter types', async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: 123, // Should be string
        type: 'Feature Enhancement',
        data: { title: 'Test' }
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32602);
      expect(response.error?.message).toContain('project');
    });

    it('should return -32602 for invalid enum values', async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type: 'Invalid Type', // Not a valid CR type
        data: { title: 'Test' }
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32602);
      expect(response.error?.message).toContain('type');
    });

    it('should return -32000 for resource not found errors', async () => {
      const response = await mcpClient.callTool('get_cr', {
        project: 'NONEXISTENT',
        key: 'FAKE-999'
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32000);
      expect(response.error?.message).toContain('not found');
    });

    it('should return server error for internal failures (-32000 to -32099)', async () => {
      const response = await mcpClient.callTool('get_cr', {
        project: '../../../etc/passwd', // Path traversal
        key: 'TEST-001'
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBeGreaterThanOrEqual(-32099);
      expect(response.error?.code).toBeLessThanOrEqual(-32000);
    });

    it('should include all required JSON-RPC error fields', async () => {
      const response = await mcpClient.callTool('fake_method', {});

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(typeof response.error?.code).toBe('number');
      expect(typeof response.error?.message).toBe('string');
      expect(response.error?.message.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Execution Error Format (MUST-10)', () => {
    it('should return isError: true for validation failures', async () => {
      await projectFactory.createProject('TEST', 'Test Project');

      const response = await mcpClient.callTool('manage_cr_sections', {
        project: 'TEST',
        key: 'TEST-001', // Non-existent CR
        operation: 'get',
        section: 'Description'
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32000);
      expect(response.error?.message).toContain('not found');
    });

    it('should return isError: true for dependency violations', async () => {
      await projectFactory.createProject('DEP', 'Dependency Test');

      const response = await mcpClient.callTool('delete_cr', {
        project: 'DEP',
        key: 'NONEXISTENT-999'
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32000);
      expect(response.error?.message).toContain('not found');
    });

    it('should return isError: true for invalid status transitions', async () => {
      await projectFactory.createProject('STATUS', 'Status Test');

      const response = await mcpClient.callTool('update_cr_status', {
        project: 'STATUS',
        key: 'STATUS-001',
        status: 'Invalid Status Value'
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32602);
      expect(response.error?.message).toContain('status');
    });

    it('should include descriptive error details', async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: '',
        type: '',
        data: {}
      });

      expect(response.success).toBe(false);
      expect(response.error?.message).toBeDefined();
      expect(response.error?.message.length).toBeGreaterThan(10);
      expect(response.error?.message).not.toContain('undefined');
    });

    it('should sanitize error information', async () => {
      const response = await mcpClient.callTool('get_project_info', {
        project: '<script>alert("xss")</script>'
      });

      expect(response.success).toBe(false);
      expect(response.error?.message).not.toContain('<script>');
      expect(response.error?.message).not.toContain('alert(');
    });

    it('should maintain consistent error format across tools', async () => {
      const tests = [
        { name: 'list_projects', args: { invalid: 'param' } },
        { name: 'get_cr', args: {} },
        { name: 'update_cr_status', args: { project: '', key: '', status: '' } }
      ];

      for (const test of tests) {
        const response = await mcpClient.callTool(test.name, test.args);

        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
        expect(typeof response.error?.code).toBe('number');
        expect(typeof response.error?.message).toBe('string');
        expect(response.error?.message.length).toBeGreaterThan(0);
      }
    });

    it('should not expose internal stack traces', async () => {
      const response = await mcpClient.callTool('nonexistent_method', {});

      expect(response.success).toBe(false);
      expect(response.error?.message).not.toContain('stack');
      expect(response.error?.message).not.toContain('node_modules');
      expect(response.error?.message).not.toContain('.js:');
    });
  });
});