import type { Project } from '../../../models/Project.js'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProjectService } from '../../../services/ProjectService.js'
import { WorktreeService } from '../../../services/WorktreeService.js'
import { ProjectFactory, TestEnvironment } from '../../../test-lib/index.js'
import { DEFAULTS } from '../../../utils/constants.js'
import { stringify } from '../../../utils/toml.js'

describe.each(['getProjectCRs', 'getProjectCRsMetadata'] as const)('MDT-257 %s', (method) => {
  let env: TestEnvironment
  let project: Project
  let root: string
  let registryPath: string
  let registryBefore: string
  let service: ProjectService
  let detect: jest.SpyInstance

  function writeTicket(ticketRoot: string, ticketsPath: string, code: string, title: string) {
    const directory = join(ticketRoot, ticketsPath)
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, `${code}-test.md`), `---\ncode: ${code}\nstatus: Proposed\ntype: Bug Fix\npriority: Medium\nlevel: epic\n---\n\n# ${title}\n\nTicket body.\n`)
  }

  beforeEach(async () => {
    env = new TestEnvironment()
    await env.setup()
    const fixture = await new ProjectFactory(env).createProject('empty', {
      code: 'GLB',
      ticketsPath: 'issues/custom',
    })
    root = fixture.path
    registryPath = join(env.getConfigDirectory(), 'projects', 'GLB.toml')
    registryBefore = stringify({
      project: { id: 'GLB', name: 'Global Only', code: 'GLB', path: root, ticketsPath: 'issues/custom', active: true },
      metadata: { globalOnly: true },
    })
    writeFileSync(registryPath, registryBefore)
    rmSync(join(root, '.mdt-config.toml'))
    detect = jest.spyOn(WorktreeService.prototype, 'detect').mockResolvedValue(new Map())
    service = new ProjectService(true)
    project = (await service.getProject('GLB')).data
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await env.cleanup()
  })

  it('reads the registry custom path without creating local config or changing the registry', async () => {
    writeTicket(root, 'issues/custom', 'GLB-001', 'Registry ticket')
    writeTicket(root, DEFAULTS.TICKETS_PATH, 'GLB-099', 'Wrong directory')

    const tickets = await service[method](project)

    expect(tickets.map(ticket => ticket.code)).toEqual(['GLB-001'])
    expect(tickets[0]).toMatchObject({ title: 'Registry ticket', level: 'epic', inWorktree: false })
    expect(tickets[0].filePath).toContain('issues/custom/GLB-001-test.md')
    if (method === 'getProjectCRsMetadata')
      expect(tickets[0]).not.toHaveProperty('content')
    else
      expect(tickets[0]).toHaveProperty('content', expect.stringContaining('Ticket body.'))
    expect(detect).toHaveBeenCalledWith(root, 'GLB')
    expect(existsSync(join(root, '.mdt-config.toml'))).toBe(false)
    expect(readFileSync(registryPath, 'utf8')).toBe(registryBefore)
  })

  it('uses the built-in tickets path when the resolved context has none', async () => {
    writeTicket(root, DEFAULTS.TICKETS_PATH, 'GLB-001', 'Default path')
    project.project.ticketsPath = ''
    expect((await service[method](project)).map(ticket => ticket.code)).toEqual(['GLB-001'])
  })

  it('prefers local path and project code over stale resolved fields', async () => {
    writeFileSync(join(root, '.mdt-config.toml'), stringify({
      project: { name: 'Local', code: 'LOC', ticketsPath: 'local/tickets' },
    }))
    writeTicket(root, 'local/tickets', 'LOC-001', 'Local ticket')
    writeTicket(root, 'issues/custom', 'GLB-099', 'Stale registry ticket')

    expect((await service[method](project)).map(ticket => ticket.code)).toEqual(['LOC-001'])
    expect(detect).toHaveBeenCalledWith(root, 'LOC')
  })

  it('falls back to the resolved path when local config omits ticketsPath', async () => {
    writeFileSync(join(root, '.mdt-config.toml'), stringify({ project: { name: 'Local', code: 'GLB' } }))
    writeTicket(root, 'issues/custom', 'GLB-001', 'Fallback path')
    expect((await service[method](project)).map(ticket => ticket.code)).toEqual(['GLB-001'])
  })

  it('keeps the resolved fallback when local config cannot be parsed', async () => {
    const invalidConfig = '[project\ninvalid = true'
    writeFileSync(join(root, '.mdt-config.toml'), invalidConfig)
    writeTicket(root, 'issues/custom', 'GLB-001', 'Registry fallback')
    expect((await service[method](project)).map(ticket => ticket.code)).toEqual(['GLB-001'])
    expect(readFileSync(join(root, '.mdt-config.toml'), 'utf8')).toBe(invalidConfig)
  })

  it.each(['empty', 'missing'])('returns an empty list for an %s ticket directory', async (state) => {
    if (state === 'missing')
      rmSync(join(root, 'issues/custom'), { recursive: true })
    expect(await service[method](project)).toEqual([])
  })

  it('does not detect worktrees or add worktree metadata when disabled locally', async () => {
    writeFileSync(join(root, '.mdt-config.toml'), stringify({
      project: { name: 'Local', code: 'GLB', ticketsPath: 'issues/custom' },
      worktree: { enabled: false },
    }))
    writeTicket(root, 'issues/custom', 'GLB-001', 'Main ticket')
    const tickets = await service[method](project)
    expect(tickets.map(ticket => ticket.code)).toEqual(['GLB-001'])
    expect(tickets[0]).not.toHaveProperty('inWorktree')
    expect(tickets[0]).not.toHaveProperty('worktreePath')
    expect(detect).not.toHaveBeenCalled()
  })

  it('merges worktree-only tickets and prefers worktree copies without duplicate rows', async () => {
    const worktreeRoot = join(env.getTempDirectory(), 'active-worktree')
    writeTicket(root, 'issues/custom', 'GLB-001', 'Main copy')
    writeTicket(root, 'issues/custom', 'GLB-003', 'Main only')
    writeTicket(worktreeRoot, 'issues/custom', 'GLB-001', 'Worktree copy')
    writeTicket(worktreeRoot, 'issues/custom', 'GLB-002', 'Worktree only')
    detect.mockResolvedValue(new Map([
      ['GLB-001', worktreeRoot],
      ['GLB-002', worktreeRoot],
      ['GLB-003', join(env.getTempDirectory(), 'removed-worktree')],
      ['GLB-004', worktreeRoot],
    ]))

    const tickets = await service[method](project)
    expect(tickets).toHaveLength(3)
    expect(tickets).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'GLB-001', title: 'Worktree copy', inWorktree: true, worktreePath: worktreeRoot }),
      expect.objectContaining({ code: 'GLB-002', title: 'Worktree only', inWorktree: true, worktreePath: worktreeRoot }),
      expect.objectContaining({ code: 'GLB-003', title: 'Main only', inWorktree: false }),
    ]))
    if (method === 'getProjectCRsMetadata')
      expect(tickets.every(ticket => !('content' in ticket))).toBe(true)
  })

  it('retains worktree-only tickets when the main tickets directory is absent', async () => {
    const worktreeRoot = join(env.getTempDirectory(), 'worktree-only')
    rmSync(join(root, 'issues/custom'), { recursive: true })
    writeTicket(worktreeRoot, 'issues/custom', 'GLB-002', 'Worktree only')
    detect.mockResolvedValue(new Map([['GLB-002', worktreeRoot]]))
    expect(await service[method](project)).toEqual([
      expect.objectContaining({ code: 'GLB-002', inWorktree: true, worktreePath: worktreeRoot }),
    ])
  })
})
