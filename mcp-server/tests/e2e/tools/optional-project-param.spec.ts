/**
 * Optional Project Parameter Resolution E2E Tests (MDT-121)
 *
 * BDD Scenarios:
 * - GIVEN default project WHEN omitting project parameter THEN use default
 * - GIVEN default project WHEN providing explicit project THEN use explicit
 * - GIVEN no default project WHEN omitting project parameter THEN error
 *
 * Requirements: BR-2.1, BR-2.2, BR-2.3
 */

import type { MCPResponse } from '../helpers/mcp-client'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { ProjectSetup } from '../helpers/core/project-setup'
import { TestEnvironment } from '../helpers/test-environment'

describe('MDT-121: Optional Project Parameter Resolution', () => {
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

  async function setupSingleProjectMode() {
    await projectSetup.createProjectStructure('MDT', 'Markdown Ticket')
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  }

  async function setupMultiProjectMode() {
    // Don't create any project - multi-project mode
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()

    // Create projects in registry but no local config
    await projectSetup.createProjectStructure('MDT', 'Markdown Ticket')
    await projectSetup.createProjectStructure('SUML', 'Summit Project')
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  }

  function extractCRKey(createResponse: MCPResponse): string {
    const match = createResponse.data?.match(/\*\*Created CR ([A-Z]+-\d+)\*\*:/)
    if (!match) {
      throw new Error(`Could not extract CR key from response: ${createResponse.data}`)
    }
    return match[1]
  }

  describe('Omit project parameter with default', () => {
    it('GIVEN default project exists WHEN omitting project parameter THEN use default project', async () => {
      // BR-2.2
      await setupSingleProjectMode()

      // Create a test CR
      const createdCR = await projectFactory.createTestCR('MDT', {
        title: 'Default Project Test CR',
        type: 'Feature Enhancement',
        content: '## 1. Description\nTest content',
      })
      const crKey = extractCRKey(createdCR)
      const numericKey = crKey.split('-')[1]

      // Call get_cr without project parameter (using numeric shorthand)
      // This will initially fail - project is currently required
      const response = await mcpClient.callTool('get_cr', {
        key: numericKey, // No project parameter
      })

      // After implementation, should succeed and return the CR
      expect(response.success).toBe(true)
      expect(response.data).toContain('Default Project Test CR')
    })
  })

  describe('Explicit project overrides default', () => {
    it('GIVEN default project exists WHEN providing explicit project THEN use explicit project', async () => {
      // BR-2.1
      await setupSingleProjectMode()

      // Create another project (SUML)
      await projectSetup.createProjectStructure('SUML', 'Summit Project')

      // Create a CR in SUML
      const sumlCR = await projectFactory.createTestCR('SUML', {
        title: 'SUML Test CR',
        type: 'Feature Enhancement',
        content: '## 1. Description\nSUML content',
      })
      const sumlCRKey = extractCRKey(sumlCR)

      // Call get_cr with explicit project parameter
      // Should use SUML even though MDT is the default
      const response = await mcpClient.callTool('get_cr', {
        key: sumlCRKey.split('-')[1],
        project: 'SUML', // Explicit project overrides default
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('SUML Test CR')
    })
  })

  describe('Error when no project context', () => {
    it('GIVEN no default project WHEN omitting project parameter THEN return clear error', async () => {
      // BR-2.3
      await setupMultiProjectMode()

      // Try to call get_cr without project parameter
      const response = await mcpClient.callTool('get_cr', {
        key: '5', // No project parameter
      })

      // Should fail with clear error message
      expect(response.success).toBe(false)
      expect(response.error?.message).toContain('No project context available')
      expect(response.error?.message).toContain('.mdt-config.toml')
    })

    it('GIVEN no default project WHEN using numeric key THEN return clear error', async () => {
      // BR-2.3, BR-3.5 (invalid key without context)
      await setupMultiProjectMode()

      // Try numeric key without project
      const response = await mcpClient.callTool('get_cr', {
        key: '123',
      })

      expect(response.success).toBe(false)
      expect(response.error?.message).toContain('No project context available')
    })
  })
})
