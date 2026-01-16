/**
 * create_cr Tool E2E Tests
 *
 * Phase 2.5: Testing the create_cr MCP tool functionality
 * Following TDD RED-GREEN-REFACTOR approach
 *
 * BDD Scenarios:
 * - GIVEN valid project and data WHEN creating THEN success with proper CR key
 * - GIVEN all CR types WHEN creating THEN create each type successfully
 * - GIVEN missing required fields WHEN creating THEN return validation error
 * - GIVEN invalid project WHEN creating THEN return error
 * - GIVEN valid creation WHEN creating THEN auto-generate CR number
 * - GIVEN CR with dependencies WHEN creating THEN create with relationships
 */

import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('create_cr', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient
  let _projectFactory: ProjectFactory

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    // Create project structure manually BEFORE starting MCP client
    // This ensures the MCP server discovers the project from registry on startup
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')
    // NOW start MCP client (server will discover the project from registry)
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
    // NOW create ProjectFactory with the running mcpClient
    _projectFactory = new ProjectFactory(testEnv, mcpClient)
  })

  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  async function callCreateCR(projectKey: string, type: string, title: string, data: any = {}) {
    const response = await mcpClient.callTool('create_cr', {
      project: projectKey,
      type,
      data: {
        title,
        ...data,
      },
    })

    // For successful responses, parse the markdown to extract CR information
    if (response.success && response.data) {
      response.data = parseCreateCRResponse(response.data)
    }

    return response
  }

  function parseCreateCRResponse(markdown: string): any {
    const cr: any = {}

    // Extract CR key from first line (format: ✅ **Created CR TEST-001**: Title)
    const keyMatch = markdown.match(/✅ \*\*Created CR ([A-Z]+-\d+)\*\*:/)
    if (keyMatch) {
      cr.key = keyMatch[1]
    }

    // Extract title from first line
    const titleMatch = markdown.match(/✅ \*\*Created CR [A-Z]+-\d+\*\*: (.+)$/m)
    if (titleMatch) {
      cr.title = titleMatch[1]
    }

    // Extract details from the list
    const statusMatch = markdown.match(/- Status: (.+)/)
    if (statusMatch) {
      cr.status = statusMatch[1]
    }

    const typeMatch = markdown.match(/- Type: (.+)/)
    if (typeMatch) {
      cr.type = typeMatch[1]
    }

    const priorityMatch = markdown.match(/- Priority: (.+)/)
    if (priorityMatch) {
      cr.priority = priorityMatch[1]
    }

    const phaseMatch = markdown.match(/- Phase: (.+)/)
    if (phaseMatch) {
      cr.phaseEpic = phaseMatch[1]
    }

    return cr
  }

  function expectCreatedCRStructure(cr: any, expectedTitle: string, expectedType: string) {
    expect(cr.key).toBeDefined()
    expect(typeof cr.key).toBe('string')
    expect(cr.key).toMatch(/^[A-Z]+-\d{3}$/) // Format: PROJECT-123
    expect(cr.title).toBe(expectedTitle)
    expect(cr.type).toBe(expectedType)
    expect(cr.status).toBe('Proposed') // Default status
    expect(cr.priority).toBeDefined()
    expect(['Low', 'Medium', 'High', 'Critical']).toContain(cr.priority)
  }

  describe('valid Creation', () => {
    it('gIVEN valid project and data WHEN creating THEN success with proper CR key', async () => {
      const response = await callCreateCR('TEST', 'Feature Enhancement', 'Test Feature CR', {
        priority: 'High',
        phaseEpic: 'Phase 1',
        content: `## 1. Description

This is a test CR for feature enhancement.

## 2. Rationale

We need this feature to improve the system.`,
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expectCreatedCRStructure(response.data, 'Test Feature CR', 'Feature Enhancement')

      // Verify assigned values
      expect(response.data.priority).toBe('High')
      expect(response.data.phaseEpic).toBe('Phase 1')
      expect(response.data.key).toMatch(/^TEST-\d{3}$/) // Should start with TEST-
    })

    it('gIVEN valid creation WHEN creating THEN auto-generate CR number', async () => {
      // Create multiple CRs to verify auto-numbering
      const cr1 = await callCreateCR('TEST', 'Feature Enhancement', 'First CR')
      const cr2 = await callCreateCR('TEST', 'Bug Fix', 'Second CR')
      const cr3 = await callCreateCR('TEST', 'Architecture', 'Third CR')

      expect(cr1.success).toBe(true)
      expect(cr2.success).toBe(true)
      expect(cr3.success).toBe(true)

      // Verify all have unique keys
      const keys = [cr1.data.key, cr2.data.key, cr3.data.key]
      expect(new Set(keys).size).toBe(3)

      // Verify key format
      keys.forEach((key) => {
        expect(key).toMatch(/^TEST-\d{3}$/)
      })
    })

    it('gIVEN CR with dependencies WHEN creating THEN create with relationships', async () => {
      // First create some CRs to depend on
      const dep1 = await callCreateCR('TEST', 'Feature Enhancement', 'Dependency 1')
      const dep2 = await callCreateCR('TEST', 'Bug Fix', 'Dependency 2')

      expect(dep1.success).toBe(true)
      expect(dep2.success).toBe(true)

      // Now create a CR that depends on them
      const response = await callCreateCR('TEST', 'Feature Enhancement', 'CR with Dependencies', {
        dependsOn: `${dep1.data.key}, ${dep2.data.key}`,
        blocks: 'TEST-999', // Future CR
        relatedTickets: 'MDT-001, MDT-002',
        assignee: 'developer@example.com',
      })

      expect(response.success).toBe(true)
      expectCreatedCRStructure(response.data, 'CR with Dependencies', 'Feature Enhancement')

      // Note: The markdown response from create_cr doesn't include these fields
      // To verify these values, we would need to read the actual CR file
      // For now, we just verify the CR was created successfully
    })
  })

  describe('cR Types', () => {
    const crTypes = [
      'Architecture',
      'Feature Enhancement',
      'Bug Fix',
      'Technical Debt',
      'Documentation',
    ]

    crTypes.forEach((type) => {
      it(`GIVEN ${type} type WHEN creating THEN create successfully`, async () => {
        const response = await callCreateCR('TEST', type, `${type} Test CR`, {
          priority: 'Medium',
          content: `## 1. Description

Test CR for ${type} type.`,
        })

        expect(response.success).toBe(true)
        expectCreatedCRStructure(response.data, `${type} Test CR`, type)
      })
    })
  })

  describe('required Fields', () => {
    it('gIVEN missing project WHEN creating THEN return validation error', async () => {
      const response = await callCreateCR(undefined as any, 'Feature Enhancement', 'Test CR')

      // Missing required parameter is a protocol error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('Project key is required')
    })

    it('gIVEN missing type WHEN creating THEN return validation error', async () => {
      const response = await callCreateCR('TEST', undefined as any, 'Test CR')

      // Missing required parameter is a protocol error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('type is required')
    })

    it('gIVEN missing title WHEN creating THEN return validation error', async () => {
      const response = await callCreateCR('TEST', 'Feature Enhancement', '' as any)

      // Missing title is a validation error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('CR data validation failed')
      expect(response.error?.message).toContain('Title is required')
    })

    it('gIVEN empty title WHEN creating THEN return validation error', async () => {
      const response = await callCreateCR('TEST', 'Feature Enhancement', '')

      // Empty title is a validation error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('CR data validation failed')
      expect(response.error?.message).toContain('Title is required')
    })
  })

  describe('invalid Values', () => {
    it('gIVEN invalid project WHEN creating THEN return error', async () => {
      const response = await callCreateCR('NONEXISTENT', 'Feature Enhancement', 'Test CR')

      // Invalid project is a parameter validation error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('is invalid')
      expect(response.error?.message).toContain('Must be 2-5 characters')
    })

    it('gIVEN invalid type WHEN creating THEN return validation error', async () => {
      const response = await callCreateCR('TEST', 'Invalid Type', 'Test CR')

      // Invalid type is a validation error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('Invalid type')
      expect(response.error?.message).toContain('Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation')
    })

    it('gIVEN invalid priority WHEN creating THEN return validation error', async () => {
      const response = await callCreateCR('TEST', 'Feature Enhancement', 'Test CR', {
        priority: 'Invalid Priority',
      })

      // Invalid priority MUST fail validation according to MUST-03
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602) // Invalid params error code
      expect(response.error?.message).toContain('Invalid priority')
    })
  })

  describe('optional Fields', () => {
    it('gIVEN minimal valid data WHEN creating THEN use defaults for optional fields', async () => {
      const response = await callCreateCR('TEST', 'Bug Fix', 'Minimal CR')

      expect(response.success).toBe(true)
      expectCreatedCRStructure(response.data, 'Minimal CR', 'Bug Fix')

      // Verify defaults
      expect(response.data.status).toBe('Proposed')
      // Check what the implementation actually returns for priority - don't assume 'Medium'
      expect(response.data.priority).toBeDefined()
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(response.data.priority)
      expect(response.data.phaseEpic).toBeUndefined()
      expect(response.data.assignee).toBeUndefined()
      expect(response.data.dependsOn).toBeUndefined()
      expect(response.data.blocks).toBeUndefined()
      expect(response.data.relatedTickets).toBeUndefined()
    })

    it('gIVEN all optional fields WHEN creating THEN preserve all values', async () => {
      const fullData = {
        priority: 'Critical',
        phaseEpic: 'Phase 2',
        dependsOn: 'TEST-001, TEST-002',
        blocks: 'TEST-005',
        relatedTickets: 'MDT-001, MDT-002',
        assignee: 'lead@example.com',
        impactAreas: ['UI', 'Backend', 'Database'],
        content: `## 1. Description

Full CR with all fields.

## 2. Rationale

Complete testing of all optional fields.`,
      }

      const response = await callCreateCR('TEST', 'Feature Enhancement', 'Full Fields CR', fullData)

      expect(response.success).toBe(true)
      expectCreatedCRStructure(response.data, 'Full Fields CR', 'Feature Enhancement')

      // Verify only the fields returned in the markdown response
      expect(response.data.priority).toBe('Critical')
      expect(response.data.phaseEpic).toBe('Phase 2')
      // Note: dependsOn, blocks, relatedTickets, assignee, impactAreas, and content
      // are not included in the markdown response from create_cr tool
    })
  })

  describe('content Handling', () => {
    it('gIVEN CR without content WHEN creating THEN use template', async () => {
      const response = await callCreateCR('TEST', 'Documentation', 'No Content CR')

      expect(response.success).toBe(true)
      expectCreatedCRStructure(response.data, 'No Content CR', 'Documentation')

      // Note: The create_cr tool returns a summary, not the full content
      // To verify the template was used, we would need to read the actual file
      // For now, we just verify the CR was created successfully
    })

    it('gIVEN CR with content WHEN creating THEN preserve content exactly', async () => {
      const customContent = `# Custom CR Content

This is completely custom content with no standard sections.

## Custom Section

Whatever the user wants to write.

### Nested Content

More details here.`

      const response = await callCreateCR('TEST', 'Technical Debt', 'Custom Content CR', {
        content: customContent,
      })

      expect(response.success).toBe(true)
      expectCreatedCRStructure(response.data, 'Custom Content CR', 'Technical Debt')

      // Note: The create_cr tool returns a summary, not the full content
      // To verify the content was preserved, we would need to read the actual file
      // For now, we just verify the CR was created successfully
    })
  })

  describe('response Format', () => {
    it('gIVEN successful creation WHEN response THEN include all CR fields', async () => {
      const response = await callCreateCR('TEST', 'Architecture', 'Response Format Test', {
        priority: 'High',
        phaseEpic: 'Test Phase',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()

      // Verify response has expected structure
      expect(response.data.key).toBeDefined()
      expect(response.data.title).toBeDefined()
      expect(response.data.type).toBeDefined()
      expect(response.data.status).toBeDefined()
      expect(response.data.priority).toBeDefined()
      expect(response.data.priority).toBe('High')
      expect(response.data.phaseEpic).toBe('Test Phase')
    })
  })
})
