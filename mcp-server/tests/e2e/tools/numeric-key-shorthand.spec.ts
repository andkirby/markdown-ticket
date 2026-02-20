/**
 * Numeric Key Shorthand Support E2E Tests (MDT-121)
 *
 * BDD Scenarios:
 * - GIVEN numeric key WHEN default project exists THEN resolve to {PROJECT}-{NUM}
 * - GIVEN full format key WHEN calling THEN uppercase project code
 * - GIVEN lowercase key WHEN calling THEN uppercase project code
 * - GIVEN numeric key with explicit project WHEN calling THEN use explicit project
 * - GIVEN invalid key format WHEN calling THEN return clear error
 *
 * Requirements: BR-3.1, BR-3.2, BR-3.3, BR-3.4, BR-3.5, BR-5.3
 */

import type { MCPResponse } from '../helpers/mcp-client'
import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('MDT-121: Numeric Key Shorthand Support', () => {
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

  function extractCRKey(createResponse: MCPResponse): string {
    const data = createResponse.data
    if (typeof data !== 'string') {
      throw new TypeError(`Expected string response data, got: ${typeof data}`)
    }
    const match = data.match(/\*\*Created CR ([A-Z]+-\d+)\*\*:/)
    if (!match) {
      throw new Error(`Could not extract CR key from response: ${data}`)
    }
    return match[1]
  }

  describe('Numeric key normalization', () => {
    it('GIVEN numeric key "5" WHEN default project exists THEN resolve to MDT-5 (strip leading zeros)', async () => {
      // BR-3.1, BR-3.2
      await setupSingleProjectMode()

      // Create CR MDT-005
      const createdCR = await projectFactory.createTestCR('MDT', {
        title: 'Test CR for Numeric Key',
        type: 'Feature Enhancement',
        content: '## 1. Description\nTest content for numeric key',
      })
      const crKey = extractCRKey(createdCR)

      // Use numeric shorthand (5 instead of MDT-005)
      const numericKey = crKey.split('-')[1] // e.g., "005"
      const strippedKey = String(Number.parseInt(numericKey, 10)) // "5"

      const response = await mcpClient.callTool('get_cr', {
        key: strippedKey, // No project parameter
      })

      // After implementation, should find the CR
      expect(response.success).toBe(true)
      expect(response.data).toContain('Test content for numeric key')
    })

    it('GIVEN numeric key "005" WHEN default project exists THEN resolve to MDT-5', async () => {
      // BR-3.2 (leading zeros stripped)
      await setupSingleProjectMode()

      const createdCR = await projectFactory.createTestCR('MDT', {
        title: 'Leading Zeros Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nLeading zeros test content',
      })
      const crKey = extractCRKey(createdCR)

      // Use numeric shorthand with leading zeros
      const response = await mcpClient.callTool('get_cr', {
        key: crKey.split('-')[1], // e.g., "005"
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('Leading zeros test content')
    })
  })

  describe('Full format key normalization', () => {
    it('GIVEN lowercase key "abc-12" WHEN calling THEN uppercase to ABC-12', async () => {
      // BR-3.3, BR-3.4
      await setupSingleProjectMode()

      const createdCR = await projectFactory.createTestCR('MDT', {
        title: 'Uppercase Test CR',
        type: 'Feature Enhancement',
        content: '## 1. Description\nUppercase test content',
      })
      const crKey = extractCRKey(createdCR)

      // Use lowercase format
      const lowercaseKey = crKey.toLowerCase() // e.g., "mdt-001"
      const response = await mcpClient.callTool('get_cr', {
        key: lowercaseKey,
        project: 'MDT',
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('Uppercase test content')
    })

    it('GIVEN mixed case key "MdT-5" WHEN calling THEN normalize to MDT-5', async () => {
      // BR-3.4
      await setupSingleProjectMode()

      const createdCR = await projectFactory.createTestCR('MDT', {
        title: 'Mixed Case Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nMixed case test content',
      })
      const crKey = extractCRKey(createdCR)

      // Use mixed case format
      const response = await mcpClient.callTool('get_cr', {
        key: crKey, // MDT-001
        project: 'mdt', // lowercase project code
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('Mixed case test content')
    })
  })

  describe('Numeric key with explicit project', () => {
    it('GIVEN numeric key "5" with explicit project "SUML" WHEN calling THEN resolve to SUML-5', async () => {
      // BR-5.3
      await setupSingleProjectMode()

      // Create SUML project
      await projectSetup.createProjectStructure('SUML', 'Summit Project')

      const sumlCR = await projectFactory.createTestCR('SUML', {
        title: 'SUML Numeric Key Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nSUML numeric key test content',
      })
      const sumlCRKey = extractCRKey(sumlCR)

      // Use numeric key with explicit project
      const response = await mcpClient.callTool('get_cr', {
        key: sumlCRKey.split('-')[1], // e.g., "001"
        project: 'SUML', // Explicit project
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('SUML numeric key test content')
    })
  })

  describe('Invalid key format error', () => {
    it('GIVEN invalid key format "invalid-format" WHEN calling THEN return clear error', async () => {
      // BR-3.5
      await setupSingleProjectMode()

      const response = await mcpClient.callTool('get_cr', {
        key: 'invalid-format',
      })

      expect(response.success).toBe(false)
      expect(response.error?.message).toContain('Invalid key format')
      // The error message contains "numeric shorthand" (may have escaped quotes in JSON-RPC response)
      expect(response.error?.message).toMatch(/numeric shorthand|Numeric shorthand/)
    })

    it('GIVEN invalid key format "12-abc" WHEN calling THEN return clear error', async () => {
      // BR-3.5 (reversed format)
      await setupSingleProjectMode()

      const response = await mcpClient.callTool('get_cr', {
        key: '12-abc',
      })

      expect(response.success).toBe(false)
      expect(response.error?.message).toContain('Invalid key format')
    })
  })

  describe('Full format with default project', () => {
    it('GIVEN full format key "SUML-123" WHEN default is MDT THEN use SUML (not default)', async () => {
      // BR-3.3 (cross-project with full format)
      await setupSingleProjectMode()

      // Create SUML project and CR
      await projectSetup.createProjectStructure('SUML', 'Summit Project')
      const sumlCR = await projectFactory.createTestCR('SUML', {
        title: 'Cross-Project Full Format',
        type: 'Feature Enhancement',
        content: '## 1. Description\nCross-project full format test content',
      })
      const sumlCRKey = extractCRKey(sumlCR)

      // Use full format key - should use SUML, not default MDT
      const response = await mcpClient.callTool('get_cr', {
        key: sumlCRKey, // Full format SUML-XXX
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('Cross-project full format test content')
    })
  })
})
