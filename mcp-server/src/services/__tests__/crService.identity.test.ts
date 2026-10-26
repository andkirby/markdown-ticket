import type { Project, ReserveRequest } from '@mdt/domain-contracts'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProjectStateStore } from '@mdt/shared/services/cloud-sync/project-state-store.js'
import { resolveTrustedServiceProfile } from '@mdt/shared/services/cloud-sync/trusted-service-profile.js'
import { MarkdownSectionService } from '@mdt/shared/services/MarkdownSectionService.js'
import { TicketService } from '@mdt/shared/services/TicketService.js'
import { CRService } from '../crService'
import { SectionRepository } from '../SectionManagement/SectionRepository'

jest.mock('@mdt/shared/services/TicketService.js', () => jest.requireActual('../../../../shared/services/TicketService'))
jest.mock('@mdt/shared/services/MarkdownService.js', () => jest.requireActual('../../../../shared/services/MarkdownService'))
jest.mock('@mdt/shared/services/cloud-sync/project-state-store.js', () => jest.requireActual('../../../../shared/services/cloud-sync/project-state-store'))
jest.mock('@mdt/shared/services/cloud-sync/trusted-service-profile.js', () => jest.requireActual('../../../../shared/services/cloud-sync/trusted-service-profile'))
jest.mock('@mdt/shared/services/MarkdownSectionService.js', () => jest.requireActual('../../../../shared/services/MarkdownSectionService'))
let root: string
let project: Project
let previousConfig: string | undefined
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mdt-mcp-identity-'))
  previousConfig = process.env.CONFIG_DIR
  process.env.CONFIG_DIR = join(root, 'config')
  await mkdir(join(root, 'docs/CRs'), { recursive: true })
  await writeFile(join(root, '.mdt-config.toml'), '[project]\nname="Fixture"\ncode="MDT"\npath="."\nticketsPath="docs/CRs"\n')
  project = { id: 'fixture', project: { code: 'MDT', path: root, ticketsPath: 'docs/CRs' } } as Project
})
afterEach(async () => {
  if (previousConfig === undefined)
    delete process.env.CONFIG_DIR
  else process.env.CONFIG_DIR = previousConfig
  await rm(root, { recursive: true, force: true })
})

it('MCP adapter preserves shared key ambiguity and both canonical files', async () => {
  const body = '---\ncode: MDT-258\n---\n# Fixture\n'
  const paths = ['original', 'manual'].map(slug => join(root, 'docs/CRs', `MDT-258-${slug}.md`))
  for (const path of paths) await writeFile(path, body)
  const service = new CRService(new TicketService(true))
  await expect(service.getCR(project, 'MDT-258')).rejects.toMatchObject({ code: 'ticket_key_ambiguous' })
  await expect(service.updateCRStatus(project, 'MDT-258', 'In Progress')).rejects.toMatchObject({ code: 'ticket_key_ambiguous' })
  await expect(service.updateCRAttrs(project, 'MDT-258', { priority: 'High' })).rejects.toMatchObject({ code: 'ticket_key_ambiguous' })
  await expect(service.deleteCR(project, 'MDT-258')).rejects.toMatchObject({ code: 'ticket_key_ambiguous' })
  for (const path of paths) expect(await readFile(path, 'utf8')).toBe(body)
})

it('a warmed MCP section cache still rejects a newly ambiguous ticket key', async () => {
  const body = '---\ncode: MDT-258\n---\n# Fixture\n\n## Section\nContent\n'
  const original = join(root, 'docs/CRs/MDT-258-original.md')
  const duplicate = join(root, 'docs/CRs/MDT-258-manual.md')
  await writeFile(original, body)
  const repository = new SectionRepository(new CRService(new TicketService(true)), MarkdownSectionService)
  expect((await repository.listAll(project, 'MDT-258')).length).toBeGreaterThan(0)
  await writeFile(duplicate, body)
  await expect(repository.readCR(project, 'MDT-258')).rejects.toMatchObject({ code: 'ticket_key_ambiguous' })
  await expect(repository.listAll(project, 'MDT-258')).rejects.toMatchObject({ code: 'ticket_key_ambiguous' })
  await expect(repository.find(project, 'MDT-258', 'Section')).rejects.toMatchObject({ code: 'ticket_key_ambiguous' })
  expect(await readFile(original, 'utf8')).toBe(body)
  expect(await readFile(duplicate, 'utf8')).toBe(body)
})

it('MCP create uses the shared cloud floor and immutable creation identity', async () => {
  const stateStoreRoot = join(root, 'config')
  await new ProjectStateStore({ rootDir: stateStoreRoot, profile: resolveTrustedServiceProfile({ operatorOrigins: [] }) }).write('fixture', { version: 2, state: 'enabled', cloudProjectId: 'fixture-cloud', serviceOrigin: 'https://mdt-sync.constantapp.org' })
  await writeFile(join(root, 'docs/CRs/MDT-262-existing.md'), '---\ncode: MDT-262\n---\n# Existing\n')
  const reserve = jest.fn(async (req: ReserveRequest) => ({ protocolVersion: req.protocolVersion, creationId: req.creationId, minimumTicketNumber: req.minimumTicketNumber, ticketNumber: Math.max(258, req.minimumTicketNumber ?? 1), reservationId: 'fixture-reservation', state: 'reserved', replayed: false }))
  const acknowledge = jest.fn(async () => ({ acknowledged: true as const, projectionVersion: 1, projectRevision: 1, replayed: false }))
  const service = new CRService(new TicketService(true, { stateStoreRoot, journalRoot: join(root, 'journals'), credentialProvider: { resolve: async () => ({ kind: 'human', cfAccessToken: 'fixture' }) }, coordinatorFactory: () => ({ reserve, acknowledge }) }))
  const ticket = await service.createCR(project, 'Feature Enhancement', { title: 'MCP allocated', type: 'Feature Enhancement', content: 'Canonical body.' })
  expect(ticket.code).toBe('MDT-263')
  expect(ticket.creationId).toBeDefined()
  expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ minimumTicketNumber: 263, creationId: ticket.creationId }), expect.anything())
  expect(acknowledge).toHaveBeenCalledTimes(1)
  expect(await readFile(ticket.filePath, 'utf8')).toContain(`creationId: ${ticket.creationId}`)
})
