import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProjectConfigService } from '../../../services/project/ProjectConfigService'
import { ProjectManager } from '../../../tools/ProjectManager'
import { parseToml, stringify } from '../../../utils/toml'

describe('MDT-258 accepted project write files (captured before wiring)', () => {
  let dir: string
  let oldConfig: string | undefined
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mdt258-project-'))
    oldConfig = process.env.CONFIG_DIR
    process.env.CONFIG_DIR = join(dir, 'config')
    mkdirSync(join(dir, 'config', 'projects'), { recursive: true })
  })
  afterEach(() => {
    if (oldConfig === undefined)
      delete process.env.CONFIG_DIR
    else process.env.CONFIG_DIR = oldConfig
    rmSync(dir, { recursive: true, force: true })
  })

  it('generates code and default tickets path with the real manager', async () => {
    const projectPath = join(dir, 'alpha')
    mkdirSync(projectPath)
    const project = await new ProjectManager(true).createProject({ name: 'Alpha Project', path: projectPath })
    expect(project.project.code).toBe('AP')
    expect(project.project.ticketsPath).toBe('docs/CRs')
    expect(readFileSync(join(projectPath, '.mdt-config.toml'), 'utf8')).toContain('AP')
  })

  it.each([[0, 3], [42, 42]])('retains global-only settings and existing maxDepth %i -> %i defaulting', async (maxDepth, expectedDepth) => {
    const projectPath = join(dir, 'absent')
    const project = await new ProjectManager(true).createProject({ name: 'Global Project', path: projectPath, globalOnly: true, createProjectPath: true, documentPaths: ['README.md'], maxDepth })
    const registry = parseToml(readFileSync(join(dir, 'config', 'projects', `${project.id}.toml`), 'utf8'))
    expect(registry).toMatchObject({ project: { document: { paths: ['README.md'], maxDepth: expectedDepth } } })
    expect(existsSync(projectPath)).toBe(false)
  })

  it('preserves raw spelling, legacy string counters and extension siblings across a two-file update and document patch', async () => {
    const projectPath = join(dir, 'local')
    mkdirSync(projectPath)
    const localPath = join(projectPath, '.mdt-config.toml')
    const registryPath = join(dir, 'config', 'projects', 'local.toml')
    writeFileSync(localPath, stringify({ project: { name: '  Legacy  ', code: 'legacy', path: '.', startNumber: '0042', custom: { keep: true }, document: { paths: ['old'], maxDepth: 99, custom: 'keep', preview: {} } }, extension: { keep: true } }))
    writeFileSync(registryPath, stringify({ project: { path: projectPath, custom: 1 }, metadata: { lastAccessed: '2000-01-01', custom: 2 }, extension: 3 }))
    const service = new ProjectConfigService(true)
    service.updateProject('local', { active: false })
    await service.configureDocuments('local', [])
    expect(parseToml(readFileSync(localPath, 'utf8'))).toEqual({ project: { name: '  Legacy  ', code: 'legacy', path: '.', startNumber: '0042', active: false, custom: { keep: true }, document: { paths: [], maxDepth: 99, custom: 'keep', preview: {} } }, extension: { keep: true } })
    expect(parseToml(readFileSync(registryPath, 'utf8'))).toMatchObject({ project: { path: projectPath, custom: 1 }, metadata: { custom: 2 }, extension: 3 })
  })
})
