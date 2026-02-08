/**
 * Integration tests for shared/test-lib
 *
 * Tests that:
 * 1. TestEnvironment creates isolated directories
 * 2. ProjectFactory creates projects with custom ticketsPath
 * 3. TestServer starts backend with CONFIG_DIR
 * 4. Backend server discovers test-lib created projects/CRs
 */

import { existsSync, readFileSync } from 'node:fs'
import http from 'node:http'
import { join } from 'node:path'
import { findProjectRoot, ProjectFactory, TestEnvironment, TestServer } from '../index.js'

interface ProjectListItem {
  id?: string
  key?: string
  name?: string
  project?: {
    name?: string
  }
}

function asProjectList(value: unknown): ProjectListItem[] {
  return Array.isArray(value) ? value as ProjectListItem[] : []
}

/**
 * HTTP GET helper using Node's http module (no keep-alive, prevents Jest hanging).
 * The global fetch() uses keep-alive connections that block Jest from exiting.
 */
function httpGet(url: string): Promise<{ ok: boolean, statusCode: number, json: () => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { Connection: 'close' } }, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        // Explicitly close response socket
        res.destroy()
        resolve({
          ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode ?? 0,
          json: () => Promise.resolve(JSON.parse(data)),
        })
      })
    })
    req.on('error', reject)
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

describe('shared/test-lib - Integration', () => {
  // Increase timeout for server startup (60s)
  jest.setTimeout(60000)
  let testEnv: TestEnvironment
  let testServer: TestServer
  let factory: ProjectFactory

  beforeAll(async () => {
    // 1. Create isolated test environment with custom CONFIG_DIR
    testEnv = new TestEnvironment()
    await testEnv.setup()

    // 2. Create project factory and test project
    factory = new ProjectFactory(testEnv)
    await factory.createProject('empty', {
      name: 'Integration Test Project',
      code: 'TEST',
      ticketsPath: 'specs/tickets',
    })

    // 3. Create a test CR
    await factory.createTestCR('TEST', {
      title: 'Test Server Discovery',
      type: 'Feature Enhancement',
      content: 'Verify server discovers this CR',
    })

    // Wait for file system to sync
    await new Promise(resolve => setTimeout(resolve, 500))

    // 4. Start backend server with CONFIG_DIR
    // Note: We need to find the MONOREPO root (where root package.json with workspaces is)
    // The dev:server script is defined in the root package.json, not in the shared workspace
    // CONFIG_DIR env var tells server where to find test projects
    // IMPORTANT: Start server AFTER creating projects so it discovers them on startup
    testServer = new TestServer(testEnv.getPortConfig())

    // Find monorepo root by walking up from current directory
    // We look for a package.json with "workspaces" field
    let monorepoRoot = findProjectRoot()
    while (monorepoRoot !== '/') {
      const pkgPath = join(monorepoRoot, 'package.json')
      if (existsSync(pkgPath)) {
        const pkgContent = readFileSync(pkgPath, 'utf8')
        if (pkgContent.includes('"workspaces"')) {
          break // Found the monorepo root
        }
      }
      const parent = join(monorepoRoot, '..')
      if (parent === monorepoRoot)
        break // Reached filesystem root
      monorepoRoot = parent
    }

    await testServer.start('backend', monorepoRoot)

    // Wait for server to be fully ready and initialize project discovery
    // Then poll until projects are discovered (fix race condition)
    const port = testEnv.getPortConfig().backend
    const maxAttempts = 30
    const pollDelay = 500

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await httpGet(`http://localhost:${port}/api/projects?bypassCache=true`)
        if (response.ok) {
          const projects = asProjectList(await response.json())

          // Check if our TEST project is discovered
          const testProject = projects.find(p => p.id === 'TEST' || p.key === 'TEST')
          if (testProject) {
            break
          }

          if (attempt === maxAttempts) {
            throw new Error(`TEST project not discovered after ${maxAttempts} attempts. Found projects: ${JSON.stringify(projects)}`)
          }
        }
      }
      catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Failed to discover projects after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, pollDelay))
    }
  })

  afterAll(async () => {
    // 5. Cleanup - stopAll() now properly waits for process tree to exit
    await testServer.stopAll()
    await testEnv.cleanup()
  })

  it('backend server discovers test-lib created project', async () => {
    // Verify server is still running before making request
    await testServer.isReady('backend')

    const port = testEnv.getPortConfig().backend
    // Use bypassCache to avoid cached empty project list from server startup
    const response = await httpGet(`http://localhost:${port}/api/projects?bypassCache=true`)

    expect(response.ok).toBe(true)

    const projects = asProjectList(await response.json())

    // Should find our TEST project
    const testProject = projects.find(p => p.id === 'TEST' || p.key === 'TEST')
    expect(testProject).toBeDefined()
    expect(testProject!.project?.name || testProject!.name).toBe('Integration Test Project')
  })

  it('backend server discovers test-lib created CRs', async () => {
    const port = testEnv.getPortConfig().backend
    const response = await httpGet(`http://localhost:${port}/api/projects/TEST/crs?bypassCache=true`)

    expect(response.ok).toBe(true)

    const crs = await response.json() as Array<{ code: string, title: string }>

    // Should find our TEST-001 CR
    expect(crs).toHaveLength(1)
    expect(crs[0].code).toBe('TEST-001')
    expect(crs[0].title).toBe('Test Server Discovery')
  })

  it('cR file has correct filename with title slug', async () => {
    const port = testEnv.getPortConfig().backend
    const response = await httpGet(`http://localhost:${port}/api/projects/TEST/crs`)

    const crs = await response.json() as Array<{ filePath: string }>

    // Filename should be: specs/tickets/TEST-001-test-server-discovery.md
    // (title slug: "Test Server Discovery" → "test-server-discovery")
    expect(crs[0].filePath).toContain('test-server-discovery.md')
    expect(crs[0].filePath).not.toContain('TEST-001.md') // Should NOT be just the code
  })
})
