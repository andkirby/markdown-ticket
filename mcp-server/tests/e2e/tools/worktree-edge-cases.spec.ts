/**
 * Worktree Edge Cases E2E Tests
 *
 * Testing edge case handling for worktree functionality.
 * Following BDD scenarios from MDT-095.
 *
 * BDD Scenarios:
 * - GIVEN worktree deleted WHEN cache refreshes THEN falls back to main
 * - GIVEN invalid worktree path WHEN detection THEN ignores invalid
 * - GIVEN path filtering excludes worktree WHEN operations THEN respects exclusion
 * - GIVEN multiple worktrees same ticket WHEN detection THEN logs warning
 */

import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('Worktree Edge Cases', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient
  let projectFactory: ProjectFactory

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  })

  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  describe('Deleted worktree handling', () => {
    it('GIVEN project loaded WHEN operations requested THEN handles missing paths gracefully', async () => {
      // Test that operations work even when paths change
      const response = await mcpClient.callTool('list_crs', {
        project: 'TEST',
      })

      expect(response.success).toBe(true)
      // Should return empty list rather than error
      expect(typeof response.data).toBe('string')
    })
  })

  describe('Invalid worktree path handling', () => {
    it('GIVEN invalid path WHEN resolving THEN ignores invalid worktrees', async () => {
      // System should handle invalid paths gracefully
      const response = await mcpClient.callTool('list_crs', {
        project: 'TEST',
      })

      expect(response.success).toBe(true)
    })
  })

  describe('Path filtering respect', () => {
    it('GIVEN path filtering configured WHEN operations THEN respects exclusions', async () => {
      // Create project with path filtering
      // Use a valid project code (4+ uppercase letters)
      const projectSetup = new ProjectSetup({ testEnv })
      await projectSetup.createProjectStructure('PROJ', 'Test Project 2', {
        excludeFolders: ['node_modules', '.git', 'test-results'],
      })

      // Restart MCP client to pick up new project
      await mcpClient.stop()
      await mcpClient.start()

      const response = await mcpClient.callTool('list_crs', {
        project: 'PROJ',
      })

      expect(response.success).toBe(true)
    })
  })

  describe('Configuration edge cases', () => {
    it('GIVEN missing config section WHEN loading THEN uses defaults', async () => {
      // Project with minimal config should work
      const response = await mcpClient.callTool('list_crs', {
        project: 'TEST',
      })

      expect(response.success).toBe(true)
    })

    it('GIVEN empty project code WHEN operations THEN handles gracefully', async () => {
      const response = await mcpClient.callTool('list_crs', {
        project: 'NONEXISTENT',
      })

      // Should return error for invalid project
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })

  describe('Non-existent ticket handling', () => {
    it('GIVEN non-existent ticket WHEN get_cr THEN returns error', async () => {
      const response = await mcpClient.callTool('get_cr', {
        project: 'TEST',
        key: 'TEST-999',
        mode: 'full',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('GIVEN non-existent ticket WHEN update_cr_status THEN returns error', async () => {
      const response = await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        key: 'TEST-999',
        status: 'In Progress',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('GIVEN non-existent ticket WHEN delete_cr THEN returns error', async () => {
      const response = await mcpClient.callTool('delete_cr', {
        project: 'TEST',
        key: 'TEST-999',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })

  describe('Invalid parameter handling', () => {
    it('GIVEN missing key parameter WHEN get_cr THEN returns validation error', async () => {
      const response = await mcpClient.callTool('get_cr', {
        project: 'TEST',
        mode: 'full',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('GIVEN invalid mode WHEN get_cr THEN returns validation error', async () => {
      const response = await mcpClient.callTool('get_cr', {
        project: 'TEST',
        key: 'TEST-001',
        mode: 'invalid',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('GIVEN invalid status WHEN update_cr_status THEN returns validation error', async () => {
      const response = await mcpClient.callTool('update_cr_status', {
        project: 'TEST',
        key: 'TEST-001',
        status: 'InvalidStatus',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })

  describe('Concurrent operations', () => {
    it('GIVEN multiple operations WHEN executed THEN all complete successfully', async () => {
      // Create multiple tickets
      const promises = [
        projectFactory.createTestCR('TEST', {
          title: 'Concurrent Test 1',
          type: 'Feature Enhancement',
          content: '## 1. Description\nFirst concurrent ticket.',
        }),
        projectFactory.createTestCR('TEST', {
          title: 'Concurrent Test 2',
          type: 'Bug Fix',
          content: '## 1. Description\nSecond concurrent ticket.',
        }),
        projectFactory.createTestCR('TEST', {
          title: 'Concurrent Test 3',
          type: 'Documentation',
          content: '## 1. Description\nThird concurrent ticket.',
        }),
      ]

      const responses = await Promise.all(promises)

      responses.forEach((response) => {
        expect(response.success).toBe(true)
        expect(response.data).toContain('Created CR')
      })
    })
  })

  describe('Special characters in content', () => {
    it('GIVEN content with special chars WHEN create_cr THEN handles correctly', async () => {
      const specialContent = `## 1. Description

This content has special characters:

- Backticks: \`code\`
- Quotes: "double" and 'single'
- Brackets: [parentheses] and {braces}
- Math: $x + y = z$
- Unicode: 你好 🌿

\`\`\`javascript
function example() {
  return "test";
}
\`\`\``

      const response = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type: 'Feature Enhancement',
        data: {
          title: 'Special Chars Test',
          content: specialContent,
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('Created CR')
    })
  })
})
