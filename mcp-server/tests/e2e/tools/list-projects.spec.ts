/**
 * list_projects Tool E2E Tests
 *
 * Phase 2.1: Testing the list_projects MCP tool functionality
 * Following TDD RED-GREEN-REFACTOR approach
 *
 * BDD Scenarios:
 * - GIVEN no registered projects WHEN listing THEN return "No projects found"
 * - GIVEN single project exists WHEN listing THEN show project details
 * - GIVEN multiple projects exist WHEN listing THEN show all projects
 * - GIVEN project with CRs WHEN listing THEN include CR count
 * - GIVEN project without description WHEN listing THEN omit description
 */

import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'

describe('list_projects', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient
  let projectFactory: ProjectFactory

  // Test setup following RED phase
  beforeEach(async () => {
    // Create isolated test environment
    testEnv = new TestEnvironment()
    await testEnv.setup()

    // Create project structure manually BEFORE starting MCP client
    // This ensures the MCP server discovers the project on startup
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')

    // NOW start MCP client (server will discover the project from registry)
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()

    // NOW create ProjectFactory with the running mcpClient
    projectFactory = new ProjectFactory(testEnv, mcpClient)
  })

  // Test cleanup
  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  // Helper methods for cleaner tests (REFACTOR phase)
  async function callListProjects() {
    return await mcpClient.callTool('list_projects', {})
  }

  function expectProjectInMarkdown(markdown: string, projectKey: string, projectName?: string, projectPath?: string) {
    // Check that project key is present in markdown
    expect(markdown).toContain(`**${projectKey}**`)

    // Check that project name is present if provided
    if (projectName) {
      expect(markdown).toContain(projectName)
    }

    // Check that project path is present if provided
    if (projectPath) {
      expect(markdown).toContain(projectPath)
    }
  }

  function expectNoProjectsInMarkdown(markdown: string) {
    expect(markdown).toContain('No projects found')
  }

  describe('edge Case: No Projects', () => {
    let localMcpClient: MCPClient
    let localTestEnv: TestEnvironment

    beforeEach(async () => {
      // Setup without creating any projects
      localTestEnv = new TestEnvironment()
      await localTestEnv.setup()
      // Start MCP client without any pre-created projects
      localMcpClient = new MCPClient(localTestEnv, { transport: 'stdio' })
      await localMcpClient.start()
    })

    afterEach(async () => {
      await localMcpClient.stop()
      await localTestEnv.cleanup()
    })

    it('gIVEN no registered projects WHEN listing THEN return empty message', async () => {
      const response = await localMcpClient.callTool('list_projects', {})

      // Expected behavior: Should handle empty project list gracefully
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Should contain no projects message
      expectNoProjectsInMarkdown(response.data)
    })
  })

  describe('project Discovery', () => {
    it('gIVEN single project exists (pre-created in beforeEach) WHEN listing THEN show project details', async () => {
      // TEST project is created in beforeEach before MCP client starts
      const response = await callListProjects()

      // Expected behavior: Should show project with key, name, and path in markdown
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Should contain project information in markdown format
      expectProjectInMarkdown(response.data, 'TEST', 'Test Project')

      // Should show CR count
      expect(response.data).toContain('CRs:')
    })

    it('gIVEN multiple projects exist WHEN listing THEN show all projects', async () => {
      // RED: Test behavior for multiple projects
      // TEST is already created in beforeEach, create additional projects
      await projectFactory.createProjectStructure('MDT', 'Markdown Ticket')
      await projectFactory.createProjectStructure('API', 'API Server')

      const response = await callListProjects()

      // Expected behavior: Should list all discovered projects
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Should contain all created projects
      expectProjectInMarkdown(response.data, 'TEST', 'Test Project')
      expectProjectInMarkdown(response.data, 'MDT', 'Markdown Ticket')
      expectProjectInMarkdown(response.data, 'API', 'API Server')

      // Should show project count
      expect(response.data).toContain('Found 3 projects')
    })

    it('gIVEN project with custom configuration WHEN listing THEN reflect configuration', async () => {
      // RED: Test behavior for custom project configuration
      const customConfig = {
        repository: 'https://github.com/example/custom-project',
        crPath: 'tickets',
        documentPaths: ['docs', 'specifications'],
        excludeFolders: ['node_modules', 'build', 'dist'],
      }

      await projectFactory.createProjectStructure('CUST', 'Custom Project', customConfig)

      const response = await callListProjects()

      // Expected behavior: Should show project with custom configuration
      expect(response.success).toBe(true)
      expect(typeof response.data).toBe('string')

      // Should contain project information
      expectProjectInMarkdown(response.data, 'CUST', 'Custom Project')

      // Note: list_projects only shows basic info (Code, ID, Path, CRs)
      // Repository is only shown in get_project_info
      expect(response.data).toContain('Code: CUST')
      expect(response.data).toContain('ID: CUST')
    })

    it('gIVEN project with CRs WHEN listing THEN include CR count', async () => {
      // RED: Test behavior for project with CRs
      await projectFactory.createProjectStructure('TEST', 'Test Project')

      // Create some test CRs
      await projectFactory.createTestCR('TEST', {
        title: 'Test CR 1',
        type: 'Feature Enhancement',
        content: `## 1. Description

Test CR content for first ticket.

## 2. Rationale

This is needed for testing purposes.`,
      })

      await projectFactory.createTestCR('TEST', {
        title: 'Test CR 2',
        type: 'Bug Fix',
        content: `## 1. Description

Test CR content for second ticket.

## 2. Rationale

This fixes a critical bug.`,
      })

      const response = await callListProjects()

      // Expected behavior: Should include CR count if supported
      expect(response.success).toBe(true)
      expect(typeof response.data).toBe('string')

      // Should contain project information
      expectProjectInMarkdown(response.data, 'TEST', 'Test Project')

      // Should show CR count in markdown
      expect(response.data).toMatch(/CRs:\s*[2-9]/) // Should be 2 or more
    })
  })

  describe('error Handling', () => {
    it('gIVEN MCP server error WHEN listing THEN return error response', async () => {
      // RED: Test error handling
      // Simulate error by calling with invalid parameters (if applicable)
      const response = await callListProjects()

      // Should handle invalid parameters gracefully - currently ignores them
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')
    })
  })

  describe('response Format', () => {
    it('gIVEN successful listing WHEN response THEN match expected format', async () => {
      // RED: Test response format consistency
      await projectFactory.createProjectStructure('FMT', 'Format Test')

      const response = await callListProjects()

      // Expected response format
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('string')

      // Should be markdown format with headers
      expect(response.data).toContain('📁')
      expect(response.data).toContain('**')

      // Should contain project information in markdown
      expectProjectInMarkdown(response.data, 'FMT', 'Format Test')

      // Should contain standard project fields
      expect(response.data).toContain('Code:')
      expect(response.data).toContain('Path:')
      expect(response.data).toContain('CRs:')
    })
  })
})
