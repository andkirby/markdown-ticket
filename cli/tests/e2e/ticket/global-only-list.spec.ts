import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { stringify } from '@mdt/shared/utils/toml.js'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('MDT-257 global-only ticket listing', () => {
  let env: TestEnvironment
  let factory: ProjectFactory
  let root: string
  let registryPath: string
  let registryBefore: string
  let keys: string[]

  beforeAll(async () => {
    env = new TestEnvironment()
    await env.setup()
    factory = new ProjectFactory(env)
    const fixture = await factory.createProject('empty', { code: 'GLB', ticketsPath: 'issues/custom' })
    root = fixture.path
    const tickets = await factory.createMultipleCRs('GLB', [
      { title: 'Global proposed', type: 'Bug Fix', status: 'Proposed', priority: 'High', content: 'First ticket' },
      { title: 'Global approved', type: 'Bug Fix', status: 'Approved', priority: 'Medium', content: 'Second ticket' },
    ])
    keys = tickets.map(ticket => ticket.crCode!)
    registryPath = join(env.getConfigDirectory(), 'projects', 'GLB.toml')
    registryBefore = stringify({
      project: { id: 'GLB', code: 'GLB', name: 'Global Only', path: root, ticketsPath: 'issues/custom', active: true },
      metadata: { globalOnly: true },
    })
    writeFileSync(registryPath, registryBefore)
    rmSync(join(root, '.mdt-config.toml'))
  })

  afterEach(() => {
    expect(existsSync(join(root, '.mdt-config.toml'))).toBe(false)
    expect(readFileSync(registryPath, 'utf8')).toBe(registryBefore)
  })

  afterAll(async () => {
    await env.cleanup()
  })

  test('lists every ticket already readable by key from the registry custom path', async () => {
    const listed = await runCli(['list', '--all', '--json'], { cwd: root })
    expect(listed.exitCode).toBe(0)
    const payload = JSON.parse(listed.stdout)
    expect(payload.data.items.map((ticket: { key: string }) => ticket.key).sort()).toEqual([...keys].sort())
    expect(payload.data.count).toEqual({ total: 2, returned: 2 })
    for (const key of keys) {
      const got = await runCli(['ticket', 'get', key, '--json'], { cwd: root })
      expect(got.exitCode).toBe(0)
      expect(JSON.parse(got.stdout).data.ticket.key).toBe(key)
    }
  })

  test('resolves registry projects from nested directories and explicit project references', async () => {
    const nested = join(root, 'src', 'nested')
    await mkdir(nested, { recursive: true })
    for (const options of [
      { cwd: nested, args: ['list', '--all', '--json'] },
      { cwd: env.getTempDirectory(), args: ['list', '--project', 'GLB', '--all', '--json'] },
    ]) {
      const result = await runCli(options.args, { cwd: options.cwd })
      expect(result.exitCode).toBe(0)
      expect(JSON.parse(result.stdout).data.count.total).toBe(2)
    }
  })

  test('preserves filtering and pagination after registry-backed scanning', async () => {
    const filtered = await runCli(['list', 'status=proposed', '--json'], { cwd: root })
    expect(filtered.exitCode).toBe(0)
    expect(JSON.parse(filtered.stdout).data.items.map((ticket: { key: string }) => ticket.key)).toEqual([keys[0]])
    const limited = await runCli(['list', '--limit', '1', '--json'], { cwd: root })
    expect(limited.exitCode).toBe(0)
    expect(JSON.parse(limited.stdout).data.count).toEqual({ total: 2, returned: 1 })
  })

  test('continues listing a locally configured project with no registry entry', async () => {
    const local = await factory.createProject('empty', { code: 'LOC', ticketsPath: 'local/issues' })
    await factory.createMultipleCRs('LOC', [
      { title: 'Local only', type: 'Bug Fix', status: 'Proposed', priority: 'Medium', content: 'Local ticket' },
    ])
    rmSync(join(env.getConfigDirectory(), 'projects', 'LOC.toml'))
    const result = await runCli(['list', '--all', '--json'], { cwd: local.path })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).data.items.map((ticket: { key: string }) => ticket.key)).toEqual(['LOC-001'])
  })
})
