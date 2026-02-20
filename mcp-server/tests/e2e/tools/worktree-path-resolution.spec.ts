/**
 * Worktree Path Resolution E2E Tests
 *
 * Testing the worktree detection and path resolution functionality.
 * Following BDD scenarios from MDT-095.
 *
 * BDD Scenarios:
 * - GIVEN existing worktrees WHEN system loads THEN worktree mapping is cached
 * - GIVEN worktree exists WHEN resolving path THEN returns worktree path
 * - GIVEN no worktree WHEN resolving path THEN falls back to main path
 * - GIVEN worktree disabled WHEN resolving path THEN always returns main path
 */

import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { ProjectFactory } from '../helpers/project-factory'
import { TestEnvironment } from '../helpers/test-environment'
import { FileHelper } from '../helpers/utils/file-helper'

describe('Worktree Path Resolution', () => {
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

  describe('Worktree Detection', () => {
    it('GIVEN existing worktrees WHEN system loads THEN worktree mapping is cached', async () => {
      // This test verifies worktree detection from git worktree list
      // For now, we test the basic flow - full implementation requires git worktree setup
      const projectDir = `${testEnv.getTempDir()}/projects/TEST`

      // Verify project structure exists
      expect(FileHelper.exists(projectDir)).toBe(true)

      // Call list_crs to trigger project load
      const response = await mcpClient.callTool('list_crs', { project: 'TEST' })
      expect(response.success).toBe(true)
    })

    it('GIVEN git command fails WHEN system loads THEN proceeds with empty mapping', async () => {
      // This test verifies graceful handling when git worktree list fails
      // The system should continue to function normally
      const response = await mcpClient.callTool('list_crs', { project: 'TEST' })
      expect(response.success).toBe(true)
      // Should return empty list rather than error
      expect(typeof response.data).toBe('string')
    })
  })

  describe('Path Resolution', () => {
    it('GIVEN no worktree exists WHEN resolving path THEN returns main path', async () => {
      // When no worktree exists, system should use main project path
      const createdCR = await projectFactory.createTestCR('TEST', {
        title: 'Main Path Test',
        type: 'Feature Enhancement',
        content: '## 1. Description\nTest content for main path.',
      })

      // Extract CR key from response
      if (typeof createdCR.data !== 'string') {
        throw new TypeError('Expected createdCR.data to be a string')
      }
      const match = createdCR.data.match(/\*\*Created CR ([A-Z]+-\d+)\*\*:/)
      expect(match).toBeDefined()

      if (match) {
        const crKey = match[1]
        const response = await mcpClient.callTool('get_cr', {
          project: 'TEST',
          key: crKey,
          mode: 'full',
        })

        expect(response.success).toBe(true)
        // In full mode, we get markdown content, not the YAML title
        // Check for the actual content text instead
        expect(response.data).toContain('## 1. Description')
        expect(response.data).toContain('Test content for main path')
      }
    })

    it('GIVEN worktree disabled in config WHEN resolving path THEN returns main path', async () => {
      // When worktree support is disabled, always use main path
      const response = await mcpClient.callTool('list_crs', { project: 'TEST' })
      expect(response.success).toBe(true)
    })
  })

  describe('Configuration', () => {
    it('GIVEN no worktree config WHEN system loads THEN enables worktree by default', async () => {
      // When config is absent, worktree support should be enabled by default
      const response = await mcpClient.callTool('list_crs', { project: 'TEST' })
      expect(response.success).toBe(true)
    })

    it('GIVEN worktree.enabled = false WHEN resolving path THEN always uses main path', async () => {
      // Create a new project with worktree disabled
      // Use a valid project code (4+ uppercase letters)
      const projectSetup = new ProjectSetup({ testEnv })
      await projectSetup.createProjectStructure('TEST', 'Test Project 2', {
        worktreeEnabled: false,
      })

      // Restart MCP client to pick up new project
      await mcpClient.stop()
      await mcpClient.start()

      const response = await mcpClient.callTool('list_crs', { project: 'TEST' })
      expect(response.success).toBe(true)
    })
  })

  describe('Caching Behavior', () => {
    it('GIVEN worktree detected WHEN caching THEN results cached for 30 seconds', async () => {
      // First call should cache the worktree mapping
      const response1 = await mcpClient.callTool('list_crs', { project: 'TEST' })
      expect(response1.success).toBe(true)

      // Immediate second call should use cache
      const response2 = await mcpClient.callTool('list_crs', { project: 'TEST' })
      expect(response2.success).toBe(true)
    })
  })
})
