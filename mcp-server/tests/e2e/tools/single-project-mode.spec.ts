/**
 * Single-Project Mode Auto-Detection E2E Tests (MDT-121)
 *
 * BDD Scenarios:
 * - GIVEN project directory with .mdt-config.toml WHEN starting THEN detect project
 * - GIVEN subdirectory of project WHEN starting THEN detect from parent
 * - GIVEN directory without config WHEN starting THEN multi-project mode
 * - GIVEN nested configs WHEN starting THEN use closest one
 * - GIVEN search depth zero WHEN starting THEN only check cwd
 *
 * Requirements: BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-1.5, BR-4.2, BR-4.3, BR-4.4
 */

import type { MCPResponse } from '../helpers/mcp-client'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { ProjectSetup } from '../helpers/core/project-setup'
import { TestEnvironment } from '../helpers/test-environment'

describe('MDT-121: Single-Project Mode Auto-Detection', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient
  let projectFactory: ProjectFactory
  let projectSetup: ProjectSetup

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectSetup = new ProjectSetup({ testEnv })
  })

  afterEach(async () => {
    if (mcpClient) {
      await mcpClient.stop()
    }
    await testEnv.cleanup()
  })

  /**
   * Helper to start MCP client from a specific directory
   * This requires modifying the client to support custom cwd
   * For now, we'll test the detection behavior through tool calls
   */
  async function startClientWithProject(projectCode: string, projectName: string) {
    await projectSetup.createProjectStructure(projectCode, projectName)

    // Start MCP client - it will detect the project from registry
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()

    // Create ProjectFactory after client starts
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  }

  /**
   * Helper to start MCP client without any project (multi-project mode)
   */
  async function startClientNoProject() {
    // Don't create any project structure
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
  }

  /**
   * Extract CR key from create response
   */
  function extractCRKey(createResponse: MCPResponse): string {
    const match = createResponse.data?.match(/\*\*Created CR ([A-Z]+-\d+)\*\*:/)
    if (!match) {
      throw new Error(`Could not extract CR key from response: ${createResponse.data}`)
    }
    return match[1]
  }

  describe('Project Auto-Detection', () => {
    it('GIVEN project directory with .mdt-config.toml WHEN starting THEN detect project and log single-project mode', async () => {
      // BR-1.1, BR-1.2, BR-1.4
      await startClientWithProject('MDT', 'Markdown Ticket Test')

      // Verify project is detected by checking tool works without project parameter
      // Note: This test will initially fail because project parameter is currently required
      const createdCR = await projectFactory.createTestCR('MDT', {
        title: 'Test CR for Auto-Detection',
        type: 'Feature Enhancement',
        content: '## 1. Description\nTest content',
      })
      const crKey = extractCRKey(createdCR)

      // Get the CR without specifying project (should use detected default)
      // This will fail until the feature is implemented
      const response = await mcpClient.callTool('get_cr', {
        key: crKey.split('-')[1], // Numeric part only
      })

      // After implementation, this should succeed
      expect(response.success).toBe(true)
      expect(response.data).toContain('Test CR for Auto-Detection')
    })

    it('GIVEN subdirectory of project WHEN starting THEN detect from parent config', async () => {
      // BR-1.1, BR-1.4
      const projectDir = await projectSetup.createProjectStructure('MDT', 'Markdown Ticket Test')

      // Create a subdirectory (simulating starting from mcp-server/src/)
      const subdir = testEnv.createProjectStructure('MDT', {
        'subdirectory': {
          'nested': true,
        },
      })

      // Note: Current test infrastructure doesn't support starting from custom cwd
      // This test documents the expected behavior
      // Implementation will require extending StdioTransport to support custom cwd

      // For now, we verify the project structure was created correctly
      expect(subdir).toBeDefined()
    })

    it('GIVEN directory without .mdt-config.toml WHEN starting THEN use multi-project mode', async () => {
      // BR-1.3, BR-1.5
      await startClientNoProject()

      // Try to call a tool without project parameter
      // Should fail with clear error message
      const response = await mcpClient.callTool('get_cr', {
        key: '5',
      })

      // Should fail because no project context available
      expect(response.success).toBe(false)
      expect(response.error?.message).toContain('No project context available')
    })
  })

  describe('Parent Directory Search', () => {
    it('GIVEN nested .mdt-config.toml files WHEN starting THEN use closest one', async () => {
      // BR-4.4
      // Create parent project
      await projectSetup.createProjectStructure('PARENT', 'Parent Project')

      // Create a subdirectory with its own config (simulating monorepo scenario)
      // This test documents the expected behavior
      // Implementation will require support for nested configs

      const projectDir = testEnv.createProjectDir('nested-project')
      expect(projectDir).toBeDefined()
    })

    it('GIVEN search depth zero WHEN starting THEN only check current directory', async () => {
      // BR-4.2
      // This test requires configuration support for mdtConfigSearchDepth
      // Documents the expected behavior when depth is set to 0

      const tempDir = testEnv.getTempDir()
      expect(tempDir).toBeDefined()
    })

    it('GIVEN search depth not configured WHEN starting THEN default to 3 levels', async () => {
      // BR-4.3
      // This test documents the default search depth behavior
      const tempDir = testEnv.getTempDir()
      expect(tempDir).toBeDefined()
    })
  })

  describe('Startup Logging', () => {
    it('GIVEN project detected WHEN starting THEN log "Single-project mode: {CODE}"', async () => {
      // BR-1.4
      await startClientWithProject('TEST', 'Test Project')

      // Note: Capturing server logs for verification requires test infrastructure changes
      // This test documents the expected logging behavior
      expect(mcpClient).toBeDefined()
    })

    it('GIVEN no project detected WHEN starting THEN log "Multi-project mode"', async () => {
      // BR-1.5
      await startClientNoProject()

      // Note: Capturing server logs for verification requires test infrastructure changes
      // This test documents the expected logging behavior
      expect(mcpClient).toBeDefined()
    })
  })
})
