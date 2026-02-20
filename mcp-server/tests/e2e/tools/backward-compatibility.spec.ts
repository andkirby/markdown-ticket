/**
 * Backward Compatibility for Multi-Project Mode E2E Tests (MDT-121)
 *
 * BDD Scenarios:
 * - GIVEN explicit project parameter WHEN calling THEN always work
 * - GIVEN multi-project mode WHEN using explicit project THEN work
 * - GIVEN full format key WHEN calling without default THEN work
 *
 * Requirements: BR-5.1, BR-5.2, BR-5.3, C3
 */

import type { MCPResponse } from '../helpers/mcp-client'
import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('MDT-121: Backward Compatibility for Multi-Project Mode', () => {
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
    // Don't create local .mdt-config.toml - multi-project mode
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()

    // Create projects in registry
    await projectSetup.createProjectStructure('MDT', 'Markdown Ticket')
    await projectSetup.createProjectStructure('SUML', 'Summit Project')
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  }

  function extractCRKey(createResponse: MCPResponse): string {
    if (typeof createResponse.data !== 'string') {
      throw new TypeError(`Expected string response, got ${typeof createResponse.data}`)
    }
    const match = createResponse.data.match(/\*\*Created CR ([A-Z]+-\d+)\*\*:/)
    if (!match) {
      throw new Error(`Could not extract CR key from response: ${createResponse.data}`)
    }
    return match[1]
  }

  describe('Explicit project parameter always works', () => {
    it('GIVEN single-project mode with default MDT WHEN using explicit project SUML THEN use SUML', async () => {
      // BR-5.2, C3
      await setupSingleProjectMode()

      // Create SUML project
      await projectSetup.createProjectStructure('SUML', 'Summit Project')

      // Create CRs in both projects
      const mdtCR = await projectFactory.createTestCR('MDT', {
        title: 'MDT Backward Compatibility Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nMDT backward compatibility test content',
      })
      const mdtCRKey = extractCRKey(mdtCR)

      const sumlCR = await projectFactory.createTestCR('SUML', {
        title: 'SUML Backward Compatibility Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nSUML backward compatibility test content',
      })
      const sumlCRKey = extractCRKey(sumlCR)

      // Get MDT CR with explicit project (even though it's default)
      const mdtResponse = await mcpClient.callTool('get_cr', {
        key: mdtCRKey.split('-')[1],
        project: 'MDT',
      })
      expect(mdtResponse.success).toBe(true)
      expect(mdtResponse.data).toContain('MDT backward compatibility test content')

      // Get SUML CR with explicit project (overrides default)
      const sumlResponse = await mcpClient.callTool('get_cr', {
        key: sumlCRKey.split('-')[1],
        project: 'SUML',
      })
      expect(sumlResponse.success).toBe(true)
      expect(sumlResponse.data).toContain('SUML backward compatibility test content')
    })

    it('GIVEN single-project mode WHEN using full format with explicit project THEN work', async () => {
      // BR-5.2, C3
      await setupSingleProjectMode()

      // Create SUML project
      await projectSetup.createProjectStructure('SUML', 'Summit Project')

      const sumlCR = await projectFactory.createTestCR('SUML', {
        title: 'Full Format Explicit Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nFull format explicit test content',
      })
      const sumlCRKey = extractCRKey(sumlCR)

      // Use full format key with explicit project
      const response = await mcpClient.callTool('get_cr', {
        key: sumlCRKey, // Full format SUML-XXX
        project: 'SUML',
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('Full format explicit test content')
    })
  })

  describe('Multi-project mode with explicit project', () => {
    it('GIVEN multi-project mode WHEN using explicit project THEN work as before', async () => {
      // BR-5.1, BR-5.3, C3
      await setupMultiProjectMode()

      // Create CRs in both projects
      const mdtCR = await projectFactory.createTestCR('MDT', {
        title: 'MDT Multi-Project Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nMDT multi-project test content',
      })
      const mdtCRKey = extractCRKey(mdtCR)

      const sumlCR = await projectFactory.createTestCR('SUML', {
        title: 'SUML Multi-Project Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nSUML multi-project test content',
      })
      const sumlCRKey = extractCRKey(sumlCR)

      // Get MDT CR with explicit project
      const mdtResponse = await mcpClient.callTool('get_cr', {
        key: mdtCRKey.split('-')[1],
        project: 'MDT',
      })
      expect(mdtResponse.success).toBe(true)
      expect(mdtResponse.data).toContain('MDT multi-project test content')

      // Get SUML CR with explicit project
      const sumlResponse = await mcpClient.callTool('get_cr', {
        key: sumlCRKey.split('-')[1],
        project: 'SUML',
      })
      expect(sumlResponse.success).toBe(true)
      expect(sumlResponse.data).toContain('SUML multi-project test content')
    })

    it('GIVEN multi-project mode WHEN using numeric key with explicit project THEN work', async () => {
      // BR-5.3
      await setupMultiProjectMode()

      const sumlCR = await projectFactory.createTestCR('SUML', {
        title: 'Numeric Key Multi-Project Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nNumeric key multi-project test content',
      })
      const sumlCRKey = extractCRKey(sumlCR)

      // Use numeric key with explicit project in multi-project mode
      const response = await mcpClient.callTool('get_cr', {
        key: sumlCRKey.split('-')[1], // Numeric part
        project: 'SUML',
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('Numeric key multi-project test content')
    })

    it('GIVEN multi-project mode WHEN using full format key THEN work', async () => {
      // BR-5.3, C3
      await setupMultiProjectMode()

      const sumlCR = await projectFactory.createTestCR('SUML', {
        title: 'Full Format Multi-Project Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nFull format multi-project test content',
      })
      const sumlCRKey = extractCRKey(sumlCR)

      // Use full format key
      const response = await mcpClient.callTool('get_cr', {
        key: sumlCRKey, // SUML-XXX
        project: 'SUML',
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain('Full format multi-project test content')
    })
  })

  describe('Backward compatibility: all existing calls work', () => {
    it('GIVEN existing tool call patterns WHEN calling THEN continue to work', async () => {
      // C3 - comprehensive backward compatibility test
      await setupMultiProjectMode()

      // Create test CR
      const testCR = await projectFactory.createTestCR('MDT', {
        title: 'Backward Compatibility Comprehensive Test',
        type: 'Feature Enhancement',
        status: 'Proposed',
        priority: 'High',
        content: '## 1. Description\nComprehensive backward compatibility test content',
      })
      const crKey = extractCRKey(testCR)

      // Test all existing call patterns work
      const patterns = [
        // Full format with explicit project
        { key: crKey, project: 'MDT' },
        // Numeric with explicit project
        { key: crKey.split('-')[1], project: 'MDT' },
      ]

      for (const pattern of patterns) {
        const response = await mcpClient.callTool('get_cr', pattern)
        expect(response.success).toBe(true)
        expect(response.data).toContain('Comprehensive backward compatibility test content')
      }
    })
  })
})
