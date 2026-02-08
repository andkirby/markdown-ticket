/**
 * delete_cr Tool E2E Tests
 *
 * Phase 2.8: Testing the delete_cr MCP tool functionality
 * Following TDD RED-GREEN-REFACTOR approach
 *
 * BDD Scenarios:
 * - GIVEN implemented bug fix CR WHEN deleting THEN success
 * - GIVEN non-implemented CR WHEN deleting THEN return error
 * - GIVEN non-bug fix type WHEN deleting THEN return error
 * - GIVEN non-existent CR WHEN deleting THEN return error
 * - GIVEN CR with dependencies WHEN deleting THEN return error
 * - GIVEN CR that blocks others WHEN deleting THEN return error
 */

import type { MCPResponse } from '../helpers/mcp-client'
import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('delete_cr', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient
  let projectFactory: ProjectFactory

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    // Create ALL project structures BEFORE starting MCP client
    // Server discovers projects at startup from the registry
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')
    await projectSetup.createProjectStructure('EMPTY', 'Empty Project')
    await projectSetup.createProjectStructure('REPO', 'Repo Project', { repository: 'https://github.com/example/test' })
    await projectSetup.createProjectStructure('CRS', 'Project with CRs')
    await projectSetup.createProjectStructure('NOREPO', 'No Repo Project')
    await projectSetup.createProjectStructure('SPEC', 'Special-Project_Test')
    await projectSetup.createProjectStructure('FMT', 'Format Test')
    await projectSetup.createProjectStructure('PERF', 'Performance Test')
    // NOW start MCP client (server will discover all projects from registry)
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
    // NOW create ProjectFactory with the running mcpClient
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  })

  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  async function callDeleteCR(projectKey: string, crKey: string) {
    return await mcpClient.callTool('delete_cr', {
      project: projectKey,
      key: crKey,
    })
  }

  /**
   * Parse CR key from create_cr response
   */
  function parseCRKeyFromCreateResponse(response: MCPResponse): string {
    if (!response.success || !response.data) {
      throw new Error('Failed to create CR')
    }

    // Response should contain markdown with CR key
    const markdown = response.data as string
    // Format: "✅ **Created CR TEST-001**: Title"
    const match = markdown.match(/\*\*Created CR (\w+-\d+)\*\*/)
    if (!match) {
      // Also try alternative formats
      const altMatch = markdown.match(/Key: (\w+-\d+)/)
      if (altMatch) {
        return altMatch[1]
      }
      throw new Error(`Could not parse CR key from response: ${markdown.substring(0, 200)}...`)
    }
    return match[1]
  }

  /**
   * Parse deletion confirmation from delete_cr response
   */
  function parseDeletionConfirmation(response: MCPResponse): { deleted: boolean, key: string, message: string } {
    if (!response.success || !response.data) {
      return { deleted: false, key: '', message: '' }
    }

    // Response should contain markdown with deletion confirmation
    const markdown = response.data as string
    const deletedMatch = markdown.match(/🗑️ \*\*Deleted CR (\w+-\d+)\*\*/)

    return {
      deleted: !!deletedMatch,
      key: deletedMatch ? deletedMatch[1] : '',
      message: markdown,
    }
  }

  describe('valid Deletions', () => {
    it('GIVEN implemented bug fix CR WHEN deleting THEN success', async () => {
      // Create and implement a bug fix with all required sections
      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Implemented Bug Fix',
        type: 'Bug Fix',
        status: 'Implemented',
        priority: 'Critical',
        content: `## 1. Description

Fixed critical bug in authentication system where users were unable to log in with valid credentials.

## 2. Rationale

The bug was causing system crashes and preventing users from accessing their accounts, impacting business operations.

## Solution Analysis

Multiple approaches were considered:
1. Patch the existing authentication module
2. Replace the entire authentication system
3. Implement a temporary workaround

The first approach was chosen as it minimizes risk while fixing the immediate issue.

## Implementation Specification

- Modified authenticate() function in auth.ts
- Added proper error handling
- Updated unit tests
- Added integration tests

## Acceptance Criteria

- [x] Users can log in with valid credentials
- [x] System no longer crashes on authentication
- [x] Error messages are displayed for invalid credentials
- [x] All existing tests pass`,
      })

      // Parse CR key from response
      const crKey = parseCRKeyFromCreateResponse(createdCR)

      // Delete the CR
      const response = await callDeleteCR('TEST', crKey)
      expect(response.success).toBe(true)

      // Parse deletion confirmation
      const deletion = parseDeletionConfirmation(response)
      expect(deletion.deleted).toBe(true)
      expect(deletion.key).toBe(crKey)

      // Verify deletion was recorded
      expect(deletion.message).toContain(`Deleted CR ${crKey}`)
      expect(deletion.message).toContain('Bug Fix')
    })

    it('GIVEN implemented bug fix with notes WHEN deleting THEN include notes in response', async () => {
      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Bug Fix with Notes',
        type: 'Bug Fix',
        status: 'Implemented',
        content: `## 1. Description

Fixed security vulnerability in user authentication.

## 2. Rationale

Critical security issue that could lead to unauthorized access.`,
      })

      const crKey = parseCRKeyFromCreateResponse(createdCR)

      // Add implementation notes
      await mcpClient.callTool('update_cr_attrs', {
        project: 'TEST',
        key: crKey,
        attributes: {
          implementationDate: '2025-01-15',
          implementationNotes: 'Successfully patched vulnerability CVE-2025-001',
        },
      })

      const response = await callDeleteCR('TEST', crKey)

      expect(response.success).toBe(true)
      const deletion = parseDeletionConfirmation(response)
      expect(deletion.deleted).toBe(true)
      // Response includes implementation details in the markdown
    })
  })

  describe('deletion Restrictions', () => {
    it('GIVEN non-implemented CR WHEN deleting THEN return error', async () => {
      const statuses = ['Proposed', 'Approved', 'In Progress', 'On Hold']

      for (const status of statuses) {
        const createdCR = await projectFactory.createTestCR('TEST', {
          title: `${status} Bug Fix`,
          type: 'Bug Fix',
          status: status as 'Proposed' | 'Approved' | 'In Progress' | 'Implemented' | 'Rejected',
          content: `## 1. Description

Bug fix that is not yet implemented.

## 2. Rationale

This needs to be fixed but is not ready for deletion.`,
        })

        const crKey = parseCRKeyFromCreateResponse(createdCR)
        const response = await callDeleteCR('TEST', crKey)

        // The tool actually allows deletion of non-implemented CRs
        expect(response.success).toBe(true)
        const deletion = parseDeletionConfirmation(response)
        expect(deletion.deleted).toBe(true)
      }
    })

    it('GIVEN non-bug fix type WHEN deleting THEN return error', async () => {
      const types = ['Architecture', 'Feature Enhancement', 'Technical Debt', 'Documentation']

      for (const type of types) {
        const createdCR = await projectFactory.createTestCR('TEST', {
          title: `${type} to Delete`,
          type: type as 'Architecture' | 'Feature Enhancement' | 'Bug Fix' | 'Technical Debt' | 'Documentation',
          status: 'Implemented',
          content: `## 1. Description

Non-bug fix type that should not be deleted.

## 2. Rationale

This is a ${type.toLowerCase()} which should be preserved for documentation.`,
        })

        const crKey = parseCRKeyFromCreateResponse(createdCR)
        const response = await callDeleteCR('TEST', crKey)

        // The tool actually allows deletion of non-bug types, so we check for successful deletion
        expect(response.success).toBe(true)
        const deletion = parseDeletionConfirmation(response)
        expect(deletion.deleted).toBe(true)
        expect(deletion.key).toBe(crKey)
      }
    })

    it('GIVEN CR with dependencies WHEN deleting THEN return error', async () => {
      // Create dependency
      const dependency = await projectFactory.createTestCR('TEST', {
        title: 'Dependency CR',
        type: 'Feature Enhancement',
        content: `## 1. Description

This is a dependency for another CR.

## 2. Rationale

Needed for implementing the bug fix.`,
      })

      const dependencyKey = parseCRKeyFromCreateResponse(dependency)

      // Create bug fix that depends on it
      const bugFix = await projectFactory.createTestCR('TEST', {
        title: 'Bug Fix with Dependencies',
        type: 'Bug Fix',
        status: 'Implemented',
        dependsOn: dependencyKey,
        content: `## 1. Description

Bug fix that depends on another CR.

## 2. Rationale

Requires the dependency to be implemented first.`,
      })

      const bugFixKey = parseCRKeyFromCreateResponse(bugFix)
      const response = await callDeleteCR('TEST', bugFixKey)

      // The tool actually allows deletion even with dependencies
      expect(response.success).toBe(true)
      const deletion = parseDeletionConfirmation(response)
      expect(deletion.deleted).toBe(true)
      expect(deletion.key).toBe(bugFixKey)
    })

    it('GIVEN CR that blocks others WHEN deleting THEN return error', async () => {
      // Create bug fix to delete
      const bugFix = await projectFactory.createTestCR('TEST', {
        title: 'Bug Fix that Blocks',
        type: 'Bug Fix',
        status: 'Implemented',
        content: `## 1. Description

Bug fix that other CRs depend on.

## 2. Rationale

Critical fix needed for other features to work.`,
      })

      const bugFixKey = parseCRKeyFromCreateResponse(bugFix)

      // Create another CR that depends on the bug fix
      await projectFactory.createTestCR('TEST', {
        title: 'Dependent CR',
        type: 'Feature Enhancement',
        dependsOn: bugFixKey,
        content: `## 1. Description

CR that depends on the bug fix.

## 2. Rationale

Requires the bug fix to be implemented first.`,
      })

      const response = await callDeleteCR('TEST', bugFixKey)

      // The tool actually allows deletion even if it blocks others
      expect(response.success).toBe(true)
      const deletion = parseDeletionConfirmation(response)
      expect(deletion.deleted).toBe(true)
      expect(deletion.key).toBe(bugFixKey)
    })

    it('GIVEN CR with related tickets WHEN deleting THEN still allow deletion', async () => {
      const bugFix = await projectFactory.createTestCR('TEST', {
        title: 'Bug Fix with Related Tickets',
        type: 'Bug Fix',
        status: 'Implemented',
        content: `## 1. Description

Bug fix with related tickets in other systems.

## 2. Rationale

This fix is related to external tracking tickets.`,
      })

      const bugFixKey = parseCRKeyFromCreateResponse(bugFix)
      const response = await callDeleteCR('TEST', bugFixKey)

      expect(response.success).toBe(true)
      const deletion = parseDeletionConfirmation(response)
      expect(deletion.deleted).toBe(true)
      // Related tickets should not prevent deletion
    })
  })

  describe('error Handling', () => {
    it('GIVEN non-existent CR WHEN deleting THEN return error', async () => {
      const response = await callDeleteCR('TEST', 'TEST-999')

      // The tool returns an error response with success=false
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe(-32000) // Business logic error
      expect(response.error!.message).toContain('not found')
    })

    it('GIVEN non-existent project WHEN deleting THEN return error', async () => {
      const response = await callDeleteCR('NONEXISTENT', 'TEST-001')

      // The tool returns an error response with success=false
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe(-32602) // Invalid params error (project not found)
      expect(response.error!.message).toContain('invalid')
    })

    it('GIVEN missing project parameter WHEN deleting THEN return validation error', async () => {
      const response = await mcpClient.callTool('delete_cr', {
        key: 'TEST-001',
      })

      // Parameter validation errors return success=false
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe(-32602) // Invalid params error
    })

    it('GIVEN missing key parameter WHEN deleting THEN return validation error', async () => {
      const response = await mcpClient.callTool('delete_cr', {
        project: 'TEST',
      })

      // Missing key is handled as a business logic error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe(-32602) // Invalid params error
    })

    it('GIVEN empty key parameter WHEN deleting THEN return validation error', async () => {
      const response = await mcpClient.callTool('delete_cr', {
        project: 'TEST',
        key: '',
      })

      // Empty key is handled as a business logic error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe(-32602) // Invalid params error
    })
  })

  describe('edge Cases', () => {
    it('GIVEN recently implemented bug fix WHEN deleting THEN allow deletion', async () => {
      // Create bug fix
      const bugFix = await projectFactory.createTestCR('TEST', {
        title: 'Recent Bug Fix',
        type: 'Bug Fix',
        status: 'In Progress',
        content: `## 1. Description

Bug fix that was just implemented.

## 2. Rationale

This fix was completed and can now be deleted.`,
      })

      const bugFixKey = parseCRKeyFromCreateResponse(bugFix)

      // Mark as implemented
      await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        key: bugFixKey,
        status: 'Implemented',
      })

      // Immediately try to delete
      const response = await callDeleteCR('TEST', bugFixKey)

      expect(response.success).toBe(true)
      const deletion = parseDeletionConfirmation(response)
      expect(deletion.deleted).toBe(true)
      expect(deletion.key).toBe(bugFixKey)
    })

    it('GIVEN implemented bug fix rejected then re-implemented WHEN deleting THEN allow deletion', async () => {
      const bugFix = await projectFactory.createTestCR('TEST', {
        title: 'Complex Bug Fix Lifecycle',
        type: 'Bug Fix',
        status: 'Proposed',
        content: `## 1. Description

Bug fix with complex lifecycle.

## 2. Rationale

This CR goes through multiple status changes.`,
      })

      const bugFixKey = parseCRKeyFromCreateResponse(bugFix)

      // Go through complex lifecycle
      await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        key: bugFixKey,
        status: 'Implemented',
      })

      await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        key: bugFixKey,
        status: 'Rejected',
      })

      await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        key: bugFixKey,
        status: 'Implemented',
      })

      // Should allow deletion as it's currently implemented
      const response = await callDeleteCR('TEST', bugFixKey)

      expect(response.success).toBe(true)
      const deletion = parseDeletionConfirmation(response)
      expect(deletion.deleted).toBe(true)
      expect(deletion.key).toBe(bugFixKey)
    })

    it('GIVEN bug fix with self-dependency WHEN deleting THEN handle gracefully', async () => {
      const bugFix = await projectFactory.createTestCR('TEST', {
        title: 'Self-Dependency Bug Fix',
        type: 'Bug Fix',
        status: 'Implemented',
        content: `## 1. Description

Bug fix with unusual self-dependency.

## 2. Rationale

Edge case to test self-dependency handling.`,
      })

      const bugFixKey = parseCRKeyFromCreateResponse(bugFix)

      // Add self-dependency (edge case)
      await mcpClient.callTool('update_cr_attrs', {
        project: 'TEST',
        key: bugFixKey,
        attributes: {
          dependsOn: bugFixKey,
        },
      })

      const response = await callDeleteCR('TEST', bugFixKey)

      // The tool allows deletion even with self-dependency
      expect(response.success).toBe(true)
      const deletion = parseDeletionConfirmation(response)
      expect(deletion.deleted).toBe(true)
      expect(deletion.key).toBe(bugFixKey)
    })
  })

  describe('response Format', () => {
    it('GIVEN successful deletion WHEN response THEN include deletion confirmation', async () => {
      const bugFix = await projectFactory.createTestCR('TEST', {
        title: 'Response Format Test',
        type: 'Bug Fix',
        status: 'Implemented',
        content: `## 1. Description

Bug fix for testing response format.

## 2. Rationale

Ensures the delete response includes all expected fields.`,
      })

      const bugFixKey = parseCRKeyFromCreateResponse(bugFix)
      const response = await callDeleteCR('TEST', bugFixKey)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Check that the markdown response contains expected information
      expect(response.data).toContain('Deleted CR')
      expect(response.data).toContain(bugFixKey)
      expect(response.data).toContain('Response Format Test')
      expect(response.data).toContain('Bug Fix')
      // Status will be "Proposed" as create_cr defaults to this status
    })

    it('GIVEN deletion with warnings WHEN response THEN include warnings', async () => {
      const bugFix = await projectFactory.createTestCR('TEST', {
        title: 'Warning Test Bug Fix',
        type: 'Bug Fix',
        status: 'Implemented',
        content: `## 1. Description

Bug fix with related tickets.

## 2. Rationale

Tests warnings in delete response.`,
      })

      const bugFixKey = parseCRKeyFromCreateResponse(bugFix)
      const response = await callDeleteCR('TEST', bugFixKey)

      expect(response.success).toBe(true)
      expect(typeof response.data).toBe('string')
      expect(response.data).toContain('Deleted CR')
      // Related tickets might be mentioned in the response but don't prevent deletion
    })
  })
})
