import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { TestEnvironment } from '../helpers/test-environment'

jest.setTimeout(30000)

describe('MDT-257 global-only project (real MCP stdio)', () => {
  let env: TestEnvironment
  let client: MCPClient
  let root: string
  let registryPath: string
  let registryBefore: string

  beforeAll(async () => {
    env = new TestEnvironment()
    await env.setup()
    root = await new ProjectSetup({ testEnv: env }).createProjectStructure('GLB', 'Global Only')
    mkdirSync(join(root, 'issues/custom'), { recursive: true })
    for (const code of ['GLB-001', 'GLB-002']) {
      writeFileSync(join(root, 'issues/custom', `${code}-test.md`), `---\ncode: ${code}\nstatus: Proposed\ntype: Bug Fix\npriority: Medium\n---\n\n# Global ticket ${code}\n\nBody for ${code}.\n`)
    }
    registryPath = join(env.getConfigDir(), 'projects', 'GLB.toml')
    registryBefore = `[project]\nid = "GLB"\ncode = "GLB"\nname = "Global Only"\npath = ${JSON.stringify(root)}\nticketsPath = "issues/custom"\nactive = true\n\n[metadata]\nglobalOnly = true\n`
    writeFileSync(registryPath, registryBefore)
    rmSync(join(root, '.mdt-config.toml'))
    client = new MCPClient(env, { transport: 'stdio' })
    await client.start()
  })

  afterEach(() => {
    expect(existsSync(join(root, '.mdt-config.toml'))).toBe(false)
    expect(readFileSync(registryPath, 'utf8')).toBe(registryBefore)
  })

  afterAll(async () => {
    await client?.stop()
    await env.cleanup()
  })

  it('lists both tickets from the registry custom path', async () => {
    const response = await client.callTool('list_crs', { project: 'GLB' })
    expect(response.success).toBe(true)
    expect(response.data).toContain('Found 2 CRs')
    expect(response.data).toContain('GLB-001')
    expect(response.data).toContain('GLB-002')
  })

  it('reports the correct project-list count', async () => {
    const response = await client.callTool('list_projects', {})
    expect(response.success).toBe(true)
    expect(response.data).toContain('**GLB**')
    expect(response.data).toContain('CRs: 2')
  })

  it('reports the same project-info count', async () => {
    const response = await client.callTool('get_project_info', { key: 'GLB' })
    expect(response.success).toBe(true)
    expect(response.data).toContain('Total CRs: 2')
  })

  it('still reads a listed ticket by key', async () => {
    const response = await client.callTool('get_cr', { project: 'GLB', key: 'GLB-001' })
    expect(response.success).toBe(true)
    expect(response.data).toContain('Body for GLB-001.')
  })
})
