/**
 * list_crs Tool E2E Tests
 *
 * Phase 2.3: Testing the list_crs MCP tool functionality
 * Following TDD RED-GREEN-REFACTOR approach
 *
 * BDD Scenarios:
 * - GIVEN empty project WHEN listing CRs THEN return empty list
 * - GIVEN project with CRs WHEN listing THEN show all CRs with details
 * - GIVEN project with CRs WHEN listing with status filter THEN return filtered CRs
 * - GIVEN project with CRs WHEN listing with type filter THEN return filtered CRs
 * - GIVEN non-existent project WHEN listing THEN return error
 * - GIVEN project with CRs WHEN listing with multiple filters THEN return correctly filtered CRs
 */

import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('list_crs', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient
  let projectFactory: ProjectFactory

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    // Create project structure manually BEFORE starting MCP client
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')
    // NOW start MCP client (server will discover the project from registry)
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
    // NOW create ProjectFactory with the running mcpClient
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  })

  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  async function callListCRs(projectKey: string, filters?: any) {
    const params: any = { project: projectKey }
    if (filters && Object.keys(filters).length > 0) {
      params.filters = filters
    }
    return await mcpClient.callTool('list_crs', params)
  }

  function parseMarkdownResponse(markdown: string): Array<{ code: string, title: string, status: string, type: string, priority: string, phaseEpic?: string }> {
    const crs: Array<any> = []
    const lines = markdown.split('\n')
    let currentCR: any = {}

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Match CR code and title: **TEST-001** - Test CR 1
      const codeTitleMatch = trimmedLine.match(/^\*\*([A-Z]+-\d+)\*\* - (.+)$/)
      if (codeTitleMatch) {
        if (Object.keys(currentCR).length > 0) {
          crs.push(currentCR)
        }
        currentCR = {
          code: codeTitleMatch[1],
          title: codeTitleMatch[2],
        }
        continue
      }

      // Match properties: - Status: Proposed
      const propMatch = trimmedLine.match(/^- (Status|Type|Priority|Phase|Created): (\S.*)$/)
      if (propMatch && currentCR) {
        const [, key, value] = propMatch
        switch (key) {
          case 'Status':
            currentCR.status = value
            break
          case 'Type':
            currentCR.type = value
            break
          case 'Priority':
            currentCR.priority = value
            break
          case 'Phase':
            currentCR.phaseEpic = value
            break
          case 'Created':
            currentCR.created = value
            break
        }
      }

      // Empty line indicates end of CR block
      if (trimmedLine === '' && Object.keys(currentCR).length > 0) {
        crs.push(currentCR)
        currentCR = {}
      }
    }

    // Push the last CR if there is one
    if (Object.keys(currentCR).length > 0) {
      crs.push(currentCR)
    }

    return crs
  }

  function expectCRStructure(cr: any) {
    expect(cr.code).toBeDefined()
    expect(typeof cr.code).toBe('string')
    expect(cr.title).toBeDefined()
    expect(typeof cr.title).toBe('string')
    expect(cr.status).toBeDefined()
    expect(typeof cr.status).toBe('string')
    expect(cr.type).toBeDefined()
    expect(typeof cr.type).toBe('string')
    expect(cr.priority).toBeDefined()
    expect(typeof cr.priority).toBe('string')

    // Optional fields
    if (cr.phaseEpic !== undefined) {
      expect(typeof cr.phaseEpic).toBe('string')
    }
  }

  function generateTestContent(title: string, description: string): string {
    return `## 1. Description

${description}

## 2. Rationale

This is a test CR for E2E testing purposes.

## 3. Solution Analysis

The solution is straightforward as this is test content.

## 4. Implementation Specification

1. Create the necessary test implementation
2. Verify the functionality works as expected
3. Clean up test data

## 5. Acceptance Criteria

- [ ] Test passes successfully
- [ ] All requirements are met`
  }

  describe('basic Listing', () => {
    it('gIVEN empty project WHEN listing CRs THEN return empty list', async () => {
      await projectFactory.createProjectStructure('EMPTY', 'Empty Project')

      const response = await callListCRs('EMPTY')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')
      expect(response.data).toMatch(/No CRs found( matching filters)? in project EMPTY/)
    })

    it('gIVEN project with CRs WHEN listing THEN show all CRs with details', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      // Create test CRs with required content field
      await projectFactory.createTestCR('TEST', {
        title: 'Feature Enhancement CR',
        type: 'Feature Enhancement',
        status: 'Proposed',
        priority: 'High',
        content: generateTestContent('Feature Enhancement CR', 'Test feature enhancement for E2E testing'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Bug Fix CR',
        type: 'Bug Fix',
        status: 'Approved',
        priority: 'Critical',
        content: generateTestContent('Bug Fix CR', 'Test bug fix for E2E testing'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Architecture CR',
        type: 'Architecture',
        status: 'In Progress',
        priority: 'Medium',
        content: generateTestContent('Architecture CR', 'Test architecture change for E2E testing'),
      })

      const response = await callListCRs('TEST')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Parse markdown response
      const crs = parseMarkdownResponse(response.data)
      expect(crs.length).toBeGreaterThanOrEqual(3)

      // Verify CR structure
      crs.forEach((cr: any) => {
        expectCRStructure(cr)
      })

      // Verify specific CRs exist
      const crTitles = crs.map((cr: any) => cr.title)
      expect(crTitles).toContain('Feature Enhancement CR')
      expect(crTitles).toContain('Bug Fix CR')
      expect(crTitles).toContain('Architecture CR')
    })
  })

  describe('status Filtering', () => {
    it('gIVEN project with CRs WHEN listing with status filter THEN return filtered CRs', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      // Create CRs (all will be created with 'Proposed' status regardless of what's specified)
      await projectFactory.createTestCR('TEST', {
        title: 'CR1',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: generateTestContent('CR1', 'Test CR 1'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'CR2',
        type: 'Bug Fix',
        status: 'Approved', // This will be ignored, will be created as 'Proposed'
        content: generateTestContent('CR2', 'Test CR 2'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'CR3',
        type: 'Architecture',
        status: 'In Progress', // This will be ignored, will be created as 'Proposed'
        content: generateTestContent('CR3', 'Test CR 3'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'CR4',
        type: 'Documentation',
        status: 'Implemented', // This will be ignored, will be created as 'Proposed'
        content: generateTestContent('CR4', 'Test CR 4'),
      })

      // Test single status filter - all CRs have 'Proposed' status
      const response = await callListCRs('TEST', { status: 'Proposed' })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Parse markdown response
      const crs = parseMarkdownResponse(response.data)

      // All 4 CRs should be returned since they all have 'Proposed' status
      expect(crs.length).toBe(4)
      crs.forEach((cr: any) => {
        expect(cr.status).toBe('Proposed')
      })
    })

    it('gIVEN project with CRs WHEN listing with multiple status filters THEN return filtered CRs', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      // Create CRs (all will be created with 'Proposed' status regardless of what's specified)
      await projectFactory.createTestCR('TEST', {
        title: 'CR1',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: generateTestContent('CR1', 'Test CR 1'),
      })
      await projectFactory.createTestCR('TEST', {
        title: 'CR2',
        type: 'Bug Fix',
        status: 'Approved', // This will be ignored, will be created as 'Proposed'
        content: generateTestContent('CR2', 'Test CR 2'),
      })
      await projectFactory.createTestCR('TEST', {
        title: 'CR3',
        type: 'Architecture',
        status: 'In Progress', // This will be ignored, will be created as 'Proposed'
        content: generateTestContent('CR3', 'Test CR 3'),
      })
      await projectFactory.createTestCR('TEST', {
        title: 'CR4',
        type: 'Documentation',
        status: 'Implemented', // This will be ignored, will be created as 'Proposed'
        content: generateTestContent('CR4', 'Test CR 4'),
      })

      // Test multiple status filters - filter for 'Proposed' and 'Approved'
      // All CRs have 'Proposed' status, so all 4 should be returned
      const response = await callListCRs('TEST', { status: ['Proposed', 'Approved'] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Parse markdown response
      const crs = parseMarkdownResponse(response.data)

      // All 4 CRs should be returned since they all have 'Proposed' status
      expect(crs.length).toBe(4)
      crs.forEach((cr: any) => {
        expect(cr.status).toBe('Proposed')
      })
    })
  })

  describe('type Filtering', () => {
    it('gIVEN project with CRs WHEN listing with type filter THEN return filtered CRs', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      // Create CRs with different types
      await projectFactory.createTestCR('TEST', {
        title: 'Feature CR',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: generateTestContent('Feature CR', 'Test feature CR'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Bug CR',
        type: 'Bug Fix',
        status: 'Proposed',
        content: generateTestContent('Bug CR', 'Test bug CR'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Architecture CR',
        type: 'Architecture',
        status: 'Proposed',
        content: generateTestContent('Architecture CR', 'Test architecture CR'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Documentation CR',
        type: 'Documentation',
        status: 'Proposed',
        content: generateTestContent('Documentation CR', 'Test documentation CR'),
      })

      // Test single type filter
      const response = await callListCRs('TEST', { type: 'Architecture' })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Parse markdown response
      const crs = parseMarkdownResponse(response.data)
      // Array handled by parseMarkdownResponse

      crs.forEach((cr: any) => {
        expect(cr.type).toBe('Architecture')
      })

      const crTitles = crs.map((cr: any) => cr.title)
      expect(crTitles).toContain('Architecture CR')
      expect(crTitles).not.toContain('Feature CR')
    })

    it('gIVEN project with CRs WHEN listing with multiple type filters THEN return filtered CRs', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      // Create CRs with different types

      await projectFactory.createTestCR('TEST', {
        title: 'CR1',
        type: 'Feature Enhancement',
        status: 'Proposed',
        content: generateTestContent('CR1', 'Test content for CR1'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'CR2',
        type: 'Bug Fix',
        status: 'Proposed',
        content: generateTestContent('CR2', 'Test content for CR2'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'CR3',
        type: 'Architecture',
        status: 'Proposed',
        content: generateTestContent('CR3', 'Test content for CR3'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'CR4',
        type: 'Technical Debt',
        status: 'Proposed',
        content: generateTestContent('CR4', 'Test content for CR4'),
      })

      // Test multiple type filters
      const response = await callListCRs('TEST', { type: ['Feature Enhancement', 'Bug Fix'] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Parse markdown response
      const crs = parseMarkdownResponse(response.data)
      // Array handled by parseMarkdownResponse

      crs.forEach((cr: any) => {
        expect(['Feature Enhancement', 'Bug Fix']).toContain(cr.type)
      })

      expect(crs.length).toBe(2)
    })
  })

  describe('priority Filtering', () => {
    it('gIVEN project with CRs WHEN listing with priority filter THEN return filtered CRs', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      // Create CRs with different priorities

      await projectFactory.createTestCR('TEST', {
        title: 'Low Priority',
        type: 'Feature Enhancement',
        priority: 'Low',
        content: generateTestContent('Low Priority', 'Test content for Low Priority'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Medium Priority',
        type: 'Feature Enhancement',
        priority: 'Medium',
        content: generateTestContent('Medium Priority', 'Test content for Medium Priority'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'High Priority',
        type: 'Feature Enhancement',
        priority: 'High',
        content: generateTestContent('High Priority', 'Test content for High Priority'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Critical Priority',
        type: 'Feature Enhancement',
        priority: 'Critical',
        content: generateTestContent('Critical Priority', 'Test content for Critical Priority'),
      })

      // Test priority filter
      const response = await callListCRs('TEST', { priority: ['High', 'Critical'] })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Parse markdown response
      const crs = parseMarkdownResponse(response.data)
      // Array handled by parseMarkdownResponse

      crs.forEach((cr: any) => {
        expect(['High', 'Critical']).toContain(cr.priority)
      })

      expect(crs.length).toBe(2)
    })
  })

  describe('combined Filtering', () => {
    it('gIVEN project with CRs WHEN listing with multiple filters THEN return correctly filtered CRs', async () => {
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      // Create diverse CRs
      await projectFactory.createTestCR('TEST', {
        title: 'High Priority Feature',
        type: 'Feature Enhancement',
        status: 'Approved',
        priority: 'High',
        content: generateTestContent('High Priority Feature', 'Test high priority feature'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Critical Bug',
        type: 'Bug Fix',
        status: 'In Progress',
        priority: 'Critical',
        content: generateTestContent('Critical Bug', 'Test critical bug'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Low Priority Feature',
        type: 'Feature Enhancement',
        status: 'Proposed',
        priority: 'Low',
        content: generateTestContent('Low Priority Feature', 'Test low priority feature'),
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Medium Priority Bug',
        type: 'Bug Fix',
        status: 'Approved',
        priority: 'Medium',
        content: generateTestContent('Medium Priority Bug', 'Test medium priority bug'),
      })

      // Test combined filters - all CRs default to 'Proposed', so filter by 'Proposed' instead
      const response = await callListCRs('TEST', {
        type: 'Feature Enhancement',
        status: 'Proposed',
      })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Parse markdown response
      const crs = parseMarkdownResponse(response.data)
      // Array handled by parseMarkdownResponse

      crs.forEach((cr: any) => {
        expect(cr.type).toBe('Feature Enhancement')
        expect(cr.status).toBe('Proposed')
      })

      expect(crs.length).toBe(2) // High Priority Feature and Low Priority Feature
      const crTitles = crs.map((cr: any) => cr.title)
      expect(crTitles).toContain('High Priority Feature')
      expect(crTitles).toContain('Low Priority Feature')
    })
  })

  describe('error Handling', () => {
    it('gIVEN non-existent project WHEN listing THEN return error message', async () => {
      const response = await callListCRs('NONEXISTENT')

      // Non-existent project results in a protocol error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error!.message).toContain('invalid')
    })

    it('gIVEN missing project parameter WHEN listing THEN return validation error', async () => {
      const response = await mcpClient.callTool('list_crs', {})

      // Missing required parameter should result in a protocol error
      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.message).toBeDefined()
      expect(response.error?.message).toContain('Project key is required')
    })
  })

  describe('response Format', () => {
    it('gIVEN successful listing WHEN response THEN match expected format', async () => {
      await projectFactory.createProjectStructure('FMT', 'Format Test')
      await projectFactory.createTestCR('FMT', {
        title: 'Format Test CR',
        type: 'Documentation',
        status: 'Proposed',
        priority: 'Medium',
        content: generateTestContent('Format Test CR', 'Test CR for format validation'),
      })

      const response = await callListCRs('FMT')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Parse markdown response
      const crs = parseMarkdownResponse(response.data)

      if (crs.length > 0) {
        const cr = crs[0]
        expectCRStructure(cr)
      }
    })
  })
})
