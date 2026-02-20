/**
 * MDT-120: Research Type E2E Tests
 *
 * Tests the create_cr tool with Research type
 * Verifies MCP API accepts Research as valid CR type
 */

import type { MCPResponse } from '../helpers/mcp-client'
import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { TestEnvironment } from '../helpers/test-environment'

describe('create_cr', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
  })

  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

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

  describe('research Type', () => {
    it('GIVEN Research type WHEN creating THEN success with proper CR key', async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type: 'Research',
        data: {
          title: 'Evaluate Bun vs Node Performance',
          priority: 'Medium',
          content: `## 1. Description

### Research Question
Which runtime (Bun or Node.js) provides better performance for our MCP server?

### Hypothesis
Bun will show 20-30% performance improvement for cold start and I/O operations.

## 2. Methodology

### Test Cases
- Cold start time
- HTTP request handling
- File system operations
- Memory usage

## 3. Acceptance Criteria
- [ ] Performance benchmarks completed
- [ ] Statistical significance verified (p < 0.05)
- [ ] Recommendation documented with supporting data`,
        },
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()

      // Verify response contains expected content
      const data = response.data as string
      expect(data).toContain('Created CR TEST-')
      expect(data).toContain('Evaluate Bun vs Node Performance')
      expect(data).toContain('Type: Research')
    })

    it('GIVEN Research type WHEN creating THEN auto-generate CR number', async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type: 'Research',
        data: {
          title: 'Test Research CR',
        },
      })

      expect(response.success).toBe(true)
      const data = response.data as string
      expect(data).toMatch(/Created CR TEST-\d{3}/)
    })

    it('GIVEN Research without content WHEN creating THEN use template', async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type: 'Research',
        data: {
          title: 'Research Without Content',
        },
      })

      expect(response.success).toBe(true)
      const data = response.data as string
      expect(data).toContain('Created CR TEST-')
      expect(data).toContain('Research Without Content')
      expect(data).toContain('Type: Research')
    })

    it('GIVEN Research with all fields WHEN creating THEN preserve all values', async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type: 'Research',
        data: {
          title: 'Full Research CR',
          priority: 'High',
          phaseEpic: 'Phase 1',
          assignee: 'researcher@example.com',
          impactAreas: ['Performance', 'Infrastructure'],
          content: `## 1. Description

### Research Question
Test research question.

## 2. Methodology

Test methodology.`,
        },
      })

      expect(response.success).toBe(true)
      const data = response.data as string
      expect(data).toContain('Full Research CR')
      expect(data).toContain('Type: Research')
      expect(data).toContain('Priority: High')
      expect(data).toContain('Phase: Phase 1')
    })
  })

  describe('type Validation', () => {
    it('GIVEN invalid type WHEN creating THEN list Research in valid types', async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type: 'InvalidType',
        data: {
          title: 'Test CR',
        },
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      const errorMessage = response.error?.message || ''
      // Verify error message lists all valid types including Research
      expect(errorMessage).toContain('Research')
    })

    it('GIVEN invalid Research variations WHEN creating THEN reject all', async () => {
      // Test each variation separately to avoid timeout
      const invalidVariations = ['research', 'RESEARCH', 'Research ', ' Research']

      for (const variation of invalidVariations) {
        const response = await mcpClient.callTool('create_cr', {
          project: 'TEST',
          type: variation,
          data: {
            title: 'Test CR',
          },
        })

        expect(response.success).toBe(false)
        expect(response.error).toBeDefined()
      }
    }, 15000) // Increase timeout for multiple E2E calls
  })

  describe('template Content', () => {
    it('GIVEN Research without content WHEN creating THEN use Research template', async () => {
      // 1. Create Research CR without content (should use template)
      const createResponse = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type: 'Research',
        data: {
          title: 'Template Verification CR',
        },
      })

      expect(createResponse.success).toBe(true)

      // 2. Extract CR key
      const crKey = extractCRKey(createResponse)

      // 3. Get full content to verify template
      const getResponse = await mcpClient.callTool('get_cr', {
        project: 'TEST',
        key: crKey,
        mode: 'full',
      })

      expect(getResponse.success).toBe(true)
      const content = getResponse.data as string

      // 4. Verify Research-specific sections ARE present
      expect(content).toContain('## 1. Description')
      expect(content).toContain('### Research Objective')
      expect(content).toContain('## 2. Research Questions')
      expect(content).toContain('## 3. Validation Approach')
      expect(content).toContain('## 4. Acceptance Criteria')

      // 5. Verify generic sections are NOT present (ensuring Research template, not generic)
      expect(content).not.toContain('### Problem Statement')
      expect(content).not.toContain('### Current State')
      expect(content).not.toContain('### Desired State')
    })
  })

  describe('tool Description', () => {
    it('GIVEN create_cr tool WHEN listing THEN description includes Research type', async () => {
      // Get tools list to verify create_cr description
      const tools = await mcpClient.listTools()

      expect(tools).toBeDefined()
      expect(Array.isArray(tools)).toBe(true)

      const createCrTool = tools.find(t => t.name === 'create_cr')
      expect(createCrTool).toBeDefined()

      // Verify tool description includes Research type
      if (createCrTool) {
        expect(createCrTool.description).toContain('Research')
        expect(createCrTool.description).toContain('technical validation')
      }
    })
  })
})
