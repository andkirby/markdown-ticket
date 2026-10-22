import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { SuperAgentTest } from 'supertest'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify } from '@mdt/shared/utils/toml.js'
import { cleanupAuthenticatedTestEnvironment, setupAuthenticatedTestEnvironment } from './setup'

// Exercise the production scanner rather than the API suite's default shared mock.
jest.mock('@mdt/shared/services/ProjectService.js', () => jest.requireActual('../../../shared/services/ProjectService.ts'))
jest.mock('@mdt/shared/services/TicketService.js', () => jest.requireActual('../../../shared/services/TicketService.ts'))

describe('MDT-257 global-only REST metadata listing (real shared service)', () => {
  let tempDir: string
  let configDir: string
  let authRequest: SuperAgentTest
  let factory: ProjectFactory
  let root: string
  let registryPath: string
  let registryBefore: string
  let keys: string[]

  beforeAll(async () => {
    const context = await setupAuthenticatedTestEnvironment()
    ;({ tempDir, configDir, authRequest } = context)
    factory = context.projectFactory
    const fixture = await factory.createProject('empty', { code: 'GLB', ticketsPath: 'issues/custom' })
    root = fixture.path
    const tickets = await factory.createMultipleCRs('GLB', [
      { title: 'Global one', type: 'Bug Fix', status: 'Proposed', priority: 'Medium', content: 'First body' },
      { title: 'Global two', type: 'Bug Fix', status: 'Approved', priority: 'High', content: 'Second body' },
    ])
    keys = tickets.map(ticket => ticket.crCode!)
    registryPath = join(configDir, 'projects', 'GLB.toml')
    registryBefore = stringify({
      project: { id: 'GLB', name: 'Global Only', code: 'GLB', path: root, ticketsPath: 'issues/custom', active: true },
      metadata: { globalOnly: true },
    })
    writeFileSync(registryPath, registryBefore)
    rmSync(join(root, '.mdt-config.toml'))
  })

  afterAll(async () => {
    await cleanupAuthenticatedTestEnvironment(authRequest, tempDir)
  })

  it('returns every registry-backed ticket without content and without creating local config', async () => {
    const response = await authRequest.get('/api/projects/GLB/crs')
    expect(response.status).toBe(200)
    expect(response.body.map((ticket: { code: string }) => ticket.code).sort()).toEqual([...keys].sort())
    for (const ticket of response.body) {
      expect(ticket).not.toHaveProperty('content')
      expect(ticket).toHaveProperty('inWorktree', false)
      expect(ticket.filePath).toContain('issues/custom/')
    }
    expect(existsSync(join(root, '.mdt-config.toml'))).toBe(false)
    expect(readFileSync(registryPath, 'utf8')).toBe(registryBefore)
  })

  it('still lists locally configured projects through the same adapter', async () => {
    const fixture = await factory.createProject('empty', { code: 'LOC', ticketsPath: 'local/issues' })
    await factory.createMultipleCRs('LOC', [
      { title: 'Local ticket', type: 'Bug Fix', status: 'Proposed', priority: 'Medium', content: 'Body' },
    ])
    const response = await authRequest.get(`/api/projects/${fixture.key}/crs`)
    expect(response.status).toBe(200)
    expect(response.body.map((ticket: { code: string }) => ticket.code)).toEqual(['LOC-001'])
  })

  it('includes the same canonical tickets in the browser unified view', async () => {
    const response = await authRequest.get('/api/projects/GLB/tickets/unified')
    expect(response.status).toBe(200)
    expect(response.body.map((ticket: { code: string }) => ticket.code).sort()).toEqual([...keys].sort())
    for (const ticket of response.body) {
      expect(ticket).toMatchObject({ kind: 'canonical', readOnly: false })
    }
    expect(existsSync(join(root, '.mdt-config.toml'))).toBe(false)
    expect(readFileSync(registryPath, 'utf8')).toBe(registryBefore)
  })
})
