import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProjectConfigService } from '../../../services/project/ProjectConfigService'
import { ProjectService } from '../../../services/ProjectService'
import { ProjectManager } from '../../../tools/ProjectManager'
import { stringify } from '../../../utils/toml'

describe('MDT-258 invalid write reloads leave files byte-identical', () => {
  let dir: string
  let localPath: string
  let registryPath: string
  let oldConfig: string | undefined
  let service: ProjectConfigService
  const invalidLocalFiles = ['[project]\nactive = "yes"\n', '[project.document]\npaths = [1]\n', '[project\nbad syntax', 'project = false\n']
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mdt258-reload-'))
    oldConfig = process.env.CONFIG_DIR
    process.env.CONFIG_DIR = join(dir, 'config')
    mkdirSync(join(dir, 'config', 'projects'), { recursive: true })
    localPath = join(dir, '.mdt-config.toml')
    registryPath = join(dir, 'config', 'projects', 'local.toml')
    writeFileSync(localPath, '[project]\nname = "Local"\ncode = "LOC"\n')
    writeFileSync(registryPath, stringify({ project: { path: dir }, metadata: { lastAccessed: '2000-01-01' } }))
    service = new ProjectConfigService(true)
  })
  afterEach(() => {
    if (oldConfig === undefined)
      delete process.env.CONFIG_DIR
    else process.env.CONFIG_DIR = oldConfig
    rmSync(dir, { recursive: true, force: true })
  })
  function snapshot() {
    return [readFileSync(localPath, 'utf8'), readFileSync(registryPath, 'utf8')]
  }

  it.each(invalidLocalFiles)('validates local reload BEFORE updating the registry: %s', (invalid) => {
    writeFileSync(localPath, invalid)
    const before = snapshot()
    expect(() => service.updateProject('local', { active: false })).toThrow()
    expect(snapshot()).toEqual(before)
  })
  it.each(invalidLocalFiles)('rejects auto-discovered local writes: %s', (invalid) => {
    writeFileSync(localPath, invalid)
    const before = snapshot()
    expect(() => service.updateProjectByPath('local', dir, { name: 'Changed' })).toThrow()
    expect(snapshot()).toEqual(before)
  })
  it.each(invalidLocalFiles)('rejects document patch reloads: %s', async (invalid) => {
    writeFileSync(localPath, invalid)
    const before = snapshot()
    await expect(service.configureDocuments('local', [])).rejects.toThrow()
    expect(snapshot()).toEqual(before)
  })
  it.each(invalidLocalFiles)('rejects create-over-existing reloads: %s', (invalid) => {
    writeFileSync(localPath, invalid)
    const before = snapshot()
    expect(() => service.createOrUpdateLocalConfig('local', dir, 'Changed', 'LOC')).toThrow()
    expect(snapshot()).toEqual(before)
  })
  it.each(['project = 1', '[project]\npath = false', '[project]\npath = "/tmp"\n[metadata]\nglobalOnly = "yes"', '[project\nbroken'])('rejects registry reload before either destination changes: %s', async (invalid) => {
    writeFileSync(registryPath, invalid)
    const before = snapshot()
    expect(() => service.updateProject('local', { active: false })).toThrow()
    await expect(service.configureDocuments('local', [])).rejects.toThrow()
    expect(snapshot()).toEqual(before)
  })
  it('does not treat a corrupt registry as a missing-registry fallback', () => {
    writeFileSync(registryPath, '[project]\npath = false')
    const before = snapshot()
    const projectService = new ProjectService(true)
    expect(() => projectService.updateVisibleProject({ id: 'local', project: { path: dir } } as never, { active: false })).toThrow()
    expect(snapshot()).toEqual(before)
  })
  it('keeps files unchanged for an invalid document patch', async () => {
    const before = snapshot()
    await expect(service.configureDocuments('local', ['../escape'])).rejects.toThrow()
    expect(snapshot()).toEqual(before)
  })
  it('preflights create reloads before registry and counter creation', async () => {
    writeFileSync(localPath, '[project]\nactive = "invalid"')
    const before = snapshot()
    const registryEntries = readdirSync(join(dir, 'config', 'projects'))
    await expect(new ProjectManager(true).createProject({ name: 'Local Project', path: dir })).rejects.toThrow()
    expect(snapshot()).toEqual(before)
    expect(readdirSync(join(dir, 'config', 'projects'))).toEqual(registryEntries)
    expect(() => readFileSync(join(dir, '.mdt-next'))).toThrow()
  })
})
