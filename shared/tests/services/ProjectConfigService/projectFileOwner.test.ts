import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ProjectConfigLoader } from '../../../services/project/ProjectConfigLoader.js'
import { ProjectConfigService } from '../../../services/project/ProjectConfigService.js'
import { ProjectFactory, TestEnvironment } from '../../../test-lib/index.js'
import { parseToml } from '../../../utils/toml.js'

describe('shared project-file mutation owner', () => {
  const env = new TestEnvironment()
  const owner = new ProjectConfigService(true)
  let factory: ProjectFactory
  let root: string
  let file: string
  beforeEach(async () => {
    await env.setup()
    factory = new ProjectFactory(env)
    root = (await factory.createProject('empty', { code: 'TEST' })).path
    file = join(root, '.mdt-config.toml')
  })
  afterEach(async () => {
    await factory.cleanup()
    await env.cleanup()
  })
  it('preserves sibling fields across selector writes and synchronous project updates', async () => {
    writeFileSync(file, `${readFileSync(file, 'utf8')}\n[custom]\nvalue = "retained"\n`)
    await owner.mutateProjectFile(root, current => ({ ...current, project: { ...current.project, description: 'selector' } }))
    owner.updateProjectByPath('test', root, { name: 'Synchronous update' })
    expect(parseToml(readFileSync(file, 'utf8'))).toMatchObject({ project: { name: 'Synchronous update', description: 'selector' }, custom: { value: 'retained' } })
  })
  it('keeps tolerant display separate from strict mutation reload, with rejected bytes unchanged', async () => {
    writeFileSync(file, '[project\ninvalid')
    expect(await owner.readProjectFile(root)).toEqual({ project: { name: '', code: '', id: '' } })
    await expect(owner.mutateProjectFile(root, current => current)).rejects.toThrow()
    expect(readFileSync(file, 'utf8')).toBe('[project\ninvalid')
  })
  it('keeps minimal missing-file defaults and does not create on a display read', async () => {
    const absent = join(root, 'absent')
    expect(await owner.readProjectFile(absent)).toEqual({ project: { name: '', code: '', id: '' } })
    expect(existsSync(join(absent, '.mdt-config.toml'))).toBe(false)
    await owner.mutateProjectFile(absent, current => ({ ...current, project: { ...current.project, name: 'Created', code: 'NEW', id: 'new' } }))
    expect(readFileSync(join(absent, '.mdt-config.toml'), 'utf8')).toContain('Created')
  })
  it('preserves discovery migration independently from ordinary config validation and document defaults', () => {
    const legacy = '[project]\nname="Legacy"\ncode="TEST"\npath="legacy-tickets"\n'
    writeFileSync(file, legacy)
    const discovery = new ProjectConfigLoader(true).getProjectConfig(root)
    expect(discovery?.project).toMatchObject({ path: '.', ticketsPath: 'legacy-tickets' })
    expect(discovery?.project.document).toBeUndefined()
    expect(readFileSync(file, 'utf8')).toContain('ticketsPath = "legacy-tickets"')
    writeFileSync(file, legacy)
    const ordinary = owner.getProjectConfig(root)
    expect(ordinary?.project.document).toEqual({ paths: [], excludeFolders: [] })
    const invalidPath = '[project]\nname="Legacy"\ncode="TEST"\npath="../outside"\n'
    writeFileSync(file, invalidPath)
    expect(owner.getProjectConfig(root)).toBeNull()
    expect(readFileSync(file, 'utf8')).toBe(invalidPath)
    expect(new ProjectConfigLoader(true).getProjectConfig(root)?.project.ticketsPath).toBe('../outside')
  })
})
