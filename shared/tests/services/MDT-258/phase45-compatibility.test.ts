import type { Project } from '../../../models/Project'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PersistedTicketFrontmatterSchema } from '@mdt/domain-contracts'
import { normalizeTicket, normalizeTicketMetadata } from '../../../models/Ticket'
import { CRService } from '../../../services/CRService'
import { MarkdownService } from '../../../services/MarkdownService'
import { ProjectConfigLoader } from '../../../services/project/ProjectConfigLoader'
import { ProjectConfigService } from '../../../services/project/ProjectConfigService'
import { ProjectDiscoveryService } from '../../../services/project/ProjectDiscoveryService'
import { ProjectRegistry } from '../../../services/project/ProjectRegistry'
import { TemplateService } from '../../../services/TemplateService'
import { TicketService } from '../../../services/TicketService'
import { stringify } from '../../../utils/toml'

describe('MDT-258 phase 4 pre-wiring file compatibility', () => {
  let dir: string
  let previous: string | undefined
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mdt258-read-'))
    previous = process.env.CONFIG_DIR
    process.env.CONFIG_DIR = join(dir, 'config')
    mkdirSync(join(dir, 'config', 'projects'), { recursive: true })
  })
  afterEach(() => {
    if (previous === undefined)
      delete process.env.CONFIG_DIR
    else process.env.CONFIG_DIR = previous
    rmSync(dir, { recursive: true, force: true })
  })
  it.each([ProjectConfigLoader, ProjectConfigService])('%p preserves raw spelling, partial previews, counters and extensions', (Loader) => {
    const config = { project: { code: ' RAW ', name: ' A name ', id: ' raw-id ', ticketsPath: ' tickets ', startNumber: '002', document: { preview: {} }, extension: { enabled: true } }, extension: { sibling: 1 } }
    const file = join(dir, '.mdt-config.toml')
    writeFileSync(file, stringify(config))
    const bytes = readFileSync(file, 'utf8')
    expect(new Loader(true).getProjectConfig(dir)).toEqual(config)
    expect(readFileSync(file, 'utf8')).toBe(bytes)
  })
  it.each([ProjectConfigLoader, ProjectConfigService])('%p keeps legacy migration and sibling keys', (Loader) => {
    writeFileSync(join(dir, '.mdt-config.toml'), stringify({ project: { code: 'LEG', name: 'Legacy', path: 'old-tickets' }, sibling: 'keep' }))
    expect(new Loader(true).getProjectConfig(dir)).toMatchObject({ project: { path: '.', ticketsPath: 'old-tickets' }, sibling: 'keep' })
    expect(readFileSync(join(dir, '.mdt-config.toml'), 'utf8')).toContain('ticketsPath = "old-tickets"')
  })
  it('accepts minimal registry references without inventing metadata', () => {
    writeFileSync(join(dir, 'config/projects/min.toml'), stringify({ project: { path: dir }, extension: { keep: true } }))
    expect(new ProjectRegistry(true).getRegisteredProjects()).toEqual([{ file: 'min.toml', data: { project: { path: dir }, extension: { keep: true } } }])
  })
  it('preserves legacy registry counters, sharing spelling and nested extension keys', () => {
    const data = { project: { path: dir, name: 'Legacy', code: 'LEG', startNumber: '002', extension: { keep: 1 } }, metadata: { sharing: { mode: 'unlisted-readonly', shareId: ' raw-share-id ', extension: 2 }, extension: 3 }, extension: 4 }
    const file = join(dir, 'config/projects/legacy.toml')
    writeFileSync(file, stringify(data))
    const bytes = readFileSync(file, 'utf8')
    expect(new ProjectRegistry(true).getRegisteredProjects()).toEqual([{ file: 'legacy.toml', data }])
    expect(readFileSync(file, 'utf8')).toBe(bytes)
  })
  it('discovers a minimal registry reference with absent metadata and a valid local config', () => {
    const project = join(dir, 'local-project')
    mkdirSync(project)
    writeFileSync(join(project, '.mdt-config.toml'), stringify({ project: { code: 'RAW', name: 'Raw', ticketsPath: 'docs/CRs' } }))
    writeFileSync(join(dir, 'config/projects/local.toml'), stringify({ project: { path: project } }))
    expect(new ProjectDiscoveryService(true).getRegisteredProjects()).toEqual(expect.arrayContaining([expect.objectContaining({ project: expect.objectContaining({ code: 'RAW' }) })]))
  })
  it('keeps global legacy migration and modern defaults', () => {
    const file = join(dir, 'config/config.toml')
    writeFileSync(file, '[dashboard]\nautoRefresh = false\n[discovery]\nsearchPaths = ["/tmp"]\n')
    const config = new ProjectConfigService(true).getGlobalConfig()
    expect(config.discovery.searchPaths).toEqual(['/tmp'])
    expect(config.system).toBeDefined()
    writeFileSync(file, '[discovery]\nsearchPaths = ["/tmp"]\n')
    expect(new ProjectConfigService(true).getGlobalConfig().discovery.searchPaths).toEqual(['/tmp'])
  })
  it('keeps H1 authority, date variants, relationships and the metadata-only path', async () => {
    const file = join(dir, 'RAW-001-ticket.md')
    writeFileSync(file, '---\ncode: RAW-001\ntitle: Legacy title\ndateCreated: 2026-01-02\nlastModified: 2026-01-03T12:30:00Z\ndependsOn: RAW-002, RAW-003\nrelatedTickets: RAW-004\nlevel: unknown\n---\n# Authoritative title\n\nBody\n')
    const full = await MarkdownService.parseMarkdownFile(file, dir)
    const metadata = await MarkdownService.extractTicketMetadata(file, dir)
    expect(full).toMatchObject({ title: 'Authoritative title', level: 'ticket', status: 'Proposed', priority: 'Medium', dependsOn: ['RAW-002', 'RAW-003'], relatedTickets: ['RAW-004'], dateCreated: new Date('2026-01-02'), lastModified: new Date('2026-01-03T12:30:00Z') })
    expect(metadata).toEqual(expect.objectContaining({ title: full!.title, dependsOn: full!.dependsOn, dateCreated: full!.dateCreated }))
    expect(metadata).not.toHaveProperty('content')
    const spy = jest.spyOn(CRService, 'processContentForDisplay')
    await MarkdownService.extractTicketMetadata(file, dir)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
  it('keeps array/comma relationships, invalid-field defaults and date variants through normalization', () => {
    const raw = { code: 'RAW-001', status: 42, dependsOn: ['RAW-002', 3, ''], blocks: 'RAW-003, RAW-004', dateCreated: new Date('2026-01-01'), lastModified: '2026-01-02T12:00:00+0200', implementationDate: 'invalid', assignee: 'plain-user' }
    const parsed = PersistedTicketFrontmatterSchema.parse(raw)
    expect(normalizeTicket(parsed)).toEqual(normalizeTicket(raw))
    expect(normalizeTicketMetadata(parsed)).toEqual(normalizeTicketMetadata(raw))
    expect(normalizeTicket(parsed).dependsOn).toEqual(['RAW-002'])
    expect(normalizeTicket(parsed).blocks).toEqual(['RAW-003', 'RAW-004'])
  })
  it('applies actual case-insensitive substring filters with OR arrays and AND facets', async () => {
    mkdirSync(join(dir, 'tickets'))
    for (const [code, status, priority] of [['RAW-001', 'In Progress', 'High'], ['RAW-002', 'Implemented', 'Low'], ['RAW-003', 'Proposed', 'High']]) {
      writeFileSync(join(dir, 'tickets', `${code}.md`), `---\ncode: ${code}\nstatus: ${status}\ntype: Bug Fix\npriority: ${priority}\n---\n# ${code} title\n`)
    }
    const project = { id: 'raw', project: { path: dir, code: 'RAW', ticketsPath: 'tickets', name: 'Raw', active: true } } as unknown as Project
    const service = new TicketService(true)
    expect((await service.listCRs(project, { status: 'pRoGrEsS', type: ['bug', 'research'], priority: 'h' })).map(ticket => ticket.code)).toEqual(['RAW-001'])
    expect((await service.listCRs(project, { status: ['progress', 'implemented'] })).map(ticket => ticket.code).sort()).toEqual(['RAW-001', 'RAW-002'])
    expect(await service.listCRs(project, { status: 'unknown' })).toEqual([])
  })
  it('skips bad/missing template entries independently; syntax failures fall back', () => {
    writeFileSync(join(dir, 'good.md'), '# Good template')
    writeFileSync(join(dir, 'templates.json'), JSON.stringify({ good: { file: 'good.md', requiredFields: ['title'], sections: [] }, bad: { file: 42 }, missing: { file: 'absent.md', requiredFields: ['title'], sections: [] } }))
    const templates = new TemplateService(dir, true)
    expect(templates.getTemplate('good').template).toBe('# Good template')
    expect(() => templates.getTemplate('bad')).toThrow()
    expect(() => templates.getTemplate('missing')).toThrow()
    writeFileSync(join(dir, 'templates.json'), '{broken')
    expect(new TemplateService(dir, true).getTemplate('Bug Fix').template).toContain('# ')
  })
})
