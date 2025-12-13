/**
 * update_cr_status Tool E2E Tests
 *
 * Phase 2.6: Testing the update_cr_status MCP tool functionality
 * Following TDD RED-GREEN-REFACTOR approach
 *
 * BDD Scenarios:
 * - GIVEN existing CR WHEN updating status THEN success with new status
 * - GIVEN valid status transitions WHEN updating THEN allow all transitions
 * - GIVEN non-existent CR WHEN updating THEN return error
 * - GIVEN invalid status WHEN updating THEN return validation error
 * - GIVEN same status WHEN updating THEN still return success
 * - GIVEN project without CRs WHEN updating THEN return error
 */

import { TestEnvironment } from '../helpers/test-environment';
import { MCPClient, MCPResponse } from '../helpers/mcp-client';
import { ProjectFactory } from '../helpers/project-factory';

describe('update_cr_status', () => {
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

  async function callUpdateCRStatus(projectKey: string, crKey: string, newStatus: string) {
    return await mcpClient.callTool('update_cr_status', {
      project: projectKey,
      key: crKey,
      status: newStatus
    });
  }

  /**
   * Helper to create test CR content with all required sections
   */
  function createTestCRContent(title: string, description?: string): string {
    return `## 1. Description

${description || `Test CR for ${title}`}

## 2. Rationale

This CR is created for testing purposes to verify the update_cr_status functionality.

## 3. Solution Analysis

The solution involves testing the status update mechanism for CRs in the system.

## 4. Implementation Specification

1. Create test CR with initial status
2. Verify CR can be updated to various statuses
3. Validate status transitions are persisted correctly

## 5. Acceptance Criteria

- [ ] CR status can be updated successfully
- [ ] Status changes are persisted
- [ ] Error handling works for invalid inputs
`;
  }

  /**
   * Extract CR key from createCR response
   */
  function extractCRKeyFromResponse(response: MCPResponse): string {
    if (!response.success || !response.data) {
      throw new Error('Failed to create CR');
    }

    // The response contains markdown like: "✅ **Created CR TEST-001**: Title"
    const match = response.data.match(/\*\*Created CR ([A-Z0-9-]+)\*\*:/);
    if (!match) {
      throw new Error('Could not extract CR key from response');
    }

    return match[1];
  }

  /**
   * Extract CR status from createCR response
   */
  function extractCRStatusFromResponse(response: MCPResponse): string {
    if (!response.success || !response.data) {
      throw new Error('Failed to create CR');
    }

    // The response contains "- Status: Proposed"
    const match = response.data.match(/- Status: (.+)/);
    if (!match) {
      throw new Error('Could not extract CR status from response');
    }

    return match[1].trim();
  }

  describe('Valid Status Updates', () => {
    it('GIVEN existing CR WHEN updating status THEN success with new status', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      // Create a CR
      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Status Update Test CR',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: createTestCRContent('Status Update Test CR')
      });

      expect(createdCR.success).toBe(true);
      const crKey = extractCRKeyFromResponse(createdCR);
      const crStatus = extractCRStatusFromResponse(createdCR);
      expect(crStatus).toBe('Proposed');

      // Update status to Approved
      const response = await callUpdateCRStatus('TEST', crKey, 'Approved');

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data).toContain('Updated CR');
      expect(response.data).toContain('Approved');
      expect(response.data).toContain(crKey);
    });

    it('GIVEN valid status transitions WHEN updating THEN allow all transitions', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      // Create a CR
      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Status Transition Test',
        type: 'Bug Fix',
        status: 'Proposed',
        content: createTestCRContent('Status Transition Test')
      });

      const crKey = extractCRKeyFromResponse(createdCR);
      // Test valid status transitions one by one
      // Proposed -> Approved
      let response = await callUpdateCRStatus('TEST', crKey, 'Approved');
      expect(response.success).toBe(true);
      expect(response.data).toContain('Updated CR');
      expect(response.data).toContain('Approved');

      // Approved -> In Progress
      response = await callUpdateCRStatus('TEST', crKey, 'In Progress');
      expect(response.success).toBe(true);
      expect(response.data).toContain('Updated CR');
      expect(response.data).toContain('In Progress');

      // In Progress -> On Hold
      response = await callUpdateCRStatus('TEST', crKey, 'On Hold');
      expect(response.success).toBe(true);
      expect(response.data).toContain('Updated CR');
      expect(response.data).toContain('On Hold');

      // On Hold -> In Progress
      response = await callUpdateCRStatus('TEST', crKey, 'In Progress');
      expect(response.success).toBe(true);
      expect(response.data).toContain('Updated CR');
      expect(response.data).toContain('In Progress');

      // In Progress -> Implemented
      response = await callUpdateCRStatus('TEST', crKey, 'Implemented');
      expect(response.success).toBe(true);
      expect(response.data).toContain('Updated CR');
      expect(response.data).toContain('Implemented');
    });

    it('GIVEN same status WHEN updating THEN still return success', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      // Create a CR
      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Same Status Test',
        type: 'Architecture',
        status: 'Approved',
        content: createTestCRContent('Same Status Test')
      });

      const crKey = extractCRKeyFromResponse(createdCR);

      // Update to same status (Approved -> Approved)
      const response = await callUpdateCRStatus('TEST', crKey, 'Approved');

      expect(response.success).toBe(true);
      expect(response.data).toContain('Updated CR');
      expect(response.data).toContain('Approved');
    });
  });

  describe('Complete Workflow', () => {
    it('GIVEN CR lifecycle WHEN updating through all statuses THEN track changes correctly', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      // Create CR
      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Lifecycle Test CR',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: createTestCRContent('Lifecycle Test CR')
      });

      const crKey = extractCRKeyFromResponse(createdCR);

      // Simulate typical CR lifecycle
      const lifecycleSteps = [
        { status: 'Approved', description: 'CR approved for implementation' },
        { status: 'In Progress', description: 'Development started' },
        { status: 'On Hold', description: 'Blocked by dependency' },
        { status: 'In Progress', description: 'Dependency resolved, continuing' },
        { status: 'Implemented', description: 'Implementation complete' }
      ];

      for (const step of lifecycleSteps) {
        const response = await callUpdateCRStatus('TEST', crKey, step.status);

        expect(response.success).toBe(true);
        expect(response.data).toContain('Updated CR');
        expect(response.data).toContain(step.status);
        expect(response.data).toContain(crKey);
      }
    });
  });

  describe('Multiple CR Updates', () => {
    it('GIVEN multiple CRs WHEN updating THEN update each independently', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      // Create multiple CRs
      const cr1 = await projectFactory.createTestCR('TEST', {
        title: 'First CR',
        type: 'Bug Fix',
        status: 'Proposed',
        content: createTestCRContent('First CR')
      });

      const cr2 = await projectFactory.createTestCR('TEST', {
        title: 'Second CR',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: createTestCRContent('Second CR')
      });

      const cr3 = await projectFactory.createTestCR('TEST', {
        title: 'Third CR',
        type: 'Documentation',
        status: 'Proposed',
        content: createTestCRContent('Third CR')
      });

      const cr1Key = extractCRKeyFromResponse(cr1);
      const cr2Key = extractCRKeyFromResponse(cr2);
      const cr3Key = extractCRKeyFromResponse(cr3);

      // Update each to valid statuses from Proposed
      const response1 = await callUpdateCRStatus('TEST', cr1Key, 'In Progress');
      const response2 = await callUpdateCRStatus('TEST', cr2Key, 'Approved');
      const response3 = await callUpdateCRStatus('TEST', cr3Key, 'Rejected');

      // Verify each update succeeded
      expect(response1.success).toBe(true);
      expect(response1.data).toContain('Updated CR');
      expect(response1.data).toContain('In Progress');
      expect(response1.data).toContain(cr1Key);

      expect(response2.success).toBe(true);
      expect(response2.data).toContain('Updated CR');
      expect(response2.data).toContain('Approved');
      expect(response2.data).toContain(cr2Key);

      expect(response3.success).toBe(true);
      expect(response3.data).toContain('Updated CR');
      expect(response3.data).toContain('Rejected');
      expect(response3.data).toContain(cr3Key);
    });
  });

  describe('Error Handling', () => {
    it('GIVEN non-existent CR WHEN updating THEN return error', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      const response = await callUpdateCRStatus('TEST', 'TEST-999', 'Approved');

      // Error responses are returned as success=true with error message in data
      expect(response.success).toBe(true);
      expect(response.data).toContain('not found');
    });

    it('GIVEN non-existent project WHEN updating THEN return error', async () => {
      const response = await callUpdateCRStatus('NONEXISTENT', 'TEST-001', 'Approved');

      expect(response.success).toBe(true);
      expect(response.data).toContain('not found');
    });

    it('GIVEN invalid status WHEN updating THEN return validation error', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Invalid Status Test',
        type: 'Bug Fix',
        status: 'Proposed',
        content: createTestCRContent('Invalid Status Test')
      });

      const crKey = extractCRKeyFromResponse(createdCR);
      const response = await callUpdateCRStatus('TEST', crKey, 'Invalid Status');

      expect(response.success).toBe(true);
      expect(response.data).toContain('Error');
      expect(response.data).toContain('Invalid status');
    });

    it('GIVEN missing project parameter WHEN updating THEN return validation error', async () => {
      const response = await mcpClient.callTool('update_cr_status', {
        key: 'TEST-001',
        status: 'Approved'
      });

      expect(response.success).toBe(true);
      expect(response.data).toContain('Error');
      expect(response.data).toContain('project');
    });

    it('GIVEN missing key parameter WHEN updating THEN return validation error', async () => {
      const response = await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        status: 'Approved'
      });

      expect(response.success).toBe(true);
      expect(response.data).toContain('Error');
      // Error could be about missing key or missing parameters in general
    });

    it('GIVEN missing status parameter WHEN updating THEN return validation error', async () => {
      const response = await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        key: 'TEST-001'
      });

      expect(response.success).toBe(true);
      expect(response.data).toContain('Error');
      expect(response.data).toContain('status');
    });

    it('GIVEN empty status WHEN updating THEN return validation error', async () => {
      const response = await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        key: 'TEST-001',
        status: ''
      });

      expect(response.success).toBe(true);
      expect(response.data).toContain('Error');
      expect(response.data).toContain('status');
    });
  });

  describe('Status-Specific Behavior', () => {
    it('GIVEN CR rejected WHEN updating to implemented THEN allow re-evaluation', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Rejected to Implemented Test',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: createTestCRContent('Rejected to Implemented Test')
      });

      const crKey = extractCRKeyFromResponse(createdCR);

      // First reject the CR
      const rejectResponse = await callUpdateCRStatus('TEST', crKey, 'Rejected');
      expect(rejectResponse.success).toBe(true);
      expect(rejectResponse.data).toContain('Rejected');

      // Then implement it (e.g., after reconsideration)
      const implementResponse = await callUpdateCRStatus('TEST', crKey, 'Implemented');
      expect(implementResponse.success).toBe(true);
      expect(implementResponse.data).toContain('Implemented');
    });

    it('GIVEN CR on hold WHEN updating to in progress THEN allow resumption', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'On Hold Test',
        type: 'Technical Debt',
        status: 'In Progress',
        content: createTestCRContent('On Hold Test')
      });

      const crKey = extractCRKeyFromResponse(createdCR);

      // Put CR on hold
      const holdResponse = await callUpdateCRStatus('TEST', crKey, 'On Hold');
      expect(holdResponse.success).toBe(true);
      expect(holdResponse.data).toContain('On Hold');

      // Resume work
      const resumeResponse = await callUpdateCRStatus('TEST', crKey, 'In Progress');
      expect(resumeResponse.success).toBe(true);
      expect(resumeResponse.data).toContain('In Progress');
    });
  });

  describe('Response Format', () => {
    it('GIVEN successful update WHEN response THEN include updated CR data', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project');

      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Response Format Test',
        type: 'Documentation',
        status: 'Proposed',
        priority: 'High',
        content: createTestCRContent('Response Format Test')
      });

      const crKey = extractCRKeyFromResponse(createdCR);
      const response = await callUpdateCRStatus('TEST', crKey, 'Approved');

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      // Response should be markdown with CR info
      expect(response.data).toContain('Updated CR');
      expect(response.data).toContain(crKey);
      expect(response.data).toContain('Approved');
      expect(response.data).toContain('Response Format Test');
    });
  });
});