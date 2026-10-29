import type { Project } from '@mdt/shared/models/Project.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import fsExtra from 'fs-extra'
import { RestPatchTicketInputSchema } from '../../http/ticketSchemas.js'
import { TicketService } from '../../services/TicketService.js'

// Exercise the real shared operation and persistence, rather than the legacy CRUD mock.
jest.mock('@mdt/shared/services/TicketService.js', () => jest.requireActual('../../../shared/services/TicketService.ts'))

describe('MDT-266 complete REST ticket mutation', () => {
  const env = new TestEnvironment()
  let factory: ProjectFactory
  let project: Project
  let service: TicketService
  let key: string
  let file: string

  beforeEach(async () => {
    await env.setup()
    factory = new ProjectFactory(env)
    const fixture = await factory.createProject('empty', { code: 'TEST', name: 'Mutation fixture' })
    const ticket = await factory.createTestCR('TEST', { title: 'Original', type: 'Research', content: 'Keep this body.\n' })
    key = ticket.crCode!
    file = ticket.filePath!
    project = {
      id: 'test',
      project: { id: 'test', name: 'Mutation fixture', code: 'TEST', path: fixture.path, configFile: join(fixture.path, '.mdt-config.toml'), active: true, ticketsPath: 'docs/CRs', description: '', repository: '' },
      metadata: { dateRegistered: '2026-10-29', lastAccessed: '2026-10-29', version: '1.0.0' },
    }
    service = new TicketService({ getAllProjects: async () => [project] }, { stateStoreRoot: env.getConfigDirectory() })
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await factory?.cleanup()
    await env.cleanup()
  })

  it('rejects missing phaseEpic without changing bytes or attempting publication', async () => {
    const before = readFileSync(file, 'utf8')
    const publication = jest.spyOn(SharedTicketService.prototype as unknown as { syncTicketProjectionBestEffort: (...args: unknown[]) => Promise<void> }, 'syncTicketProjectionBestEffort')
    await expect(service.updateCRPartial(project.id, key, { status: 'In Progress', phaseEpic: 'TEST-999' })).rejects.toThrow('does not exist')
    expect({ bytes: readFileSync(file, 'utf8'), publicationAttempts: publication.mock.calls.length }).toEqual({ bytes: before, publicationAttempts: 0 })
  })

  it('applies valid status and attributes, preserving the Markdown body', async () => {
    const publication = jest.spyOn(SharedTicketService.prototype as unknown as { syncTicketProjectionBestEffort: (...args: unknown[]) => Promise<void> }, 'syncTicketProjectionBestEffort')
    const bytesAtPublication: string[] = []
    publication.mockImplementation(async () => {
      bytesAtPublication.push(readFileSync(file, 'utf8'))
    })
    const result = await service.updateCRPartial(project.id, key, { status: 'In Progress', priority: 'High', assignee: 'developer' })
    expect(result.updatedFields).toEqual(['status', 'priority', 'assignee'])
    const ticket = await service.getCR(project.id, key)
    expect(ticket).toMatchObject({ status: 'In Progress', priority: 'High', assignee: 'developer' })
    expect(readFileSync(file, 'utf8')).toContain('Keep this body.')
    expect(publication).toHaveBeenCalledTimes(1)
    expect(bytesAtPublication).toEqual([readFileSync(file, 'utf8')])
    expect(publication.mock.calls[0]?.[2]).toMatchObject({ status: 'In Progress', priority: 'High', assignee: 'developer' })
  })

  it('keeps accepted ignored-only patches as no-ops, including a missing key', async () => {
    const before = readFileSync(file, 'utf8')
    const publication = jest.spyOn(SharedTicketService.prototype as unknown as { syncTicketProjectionBestEffort: (...args: unknown[]) => Promise<void> }, 'syncTicketProjectionBestEffort')
    const writes = jest.spyOn(fsExtra, 'outputFile')
    const ignored = RestPatchTicketInputSchema.parse({ implementationNotes: 'ignored' })
    for (const target of [key, 'TEST-999']) {
      expect((await service.updateCRPartial(project.id, target, ignored)).updatedFields).toEqual([])
    }
    expect(readFileSync(file, 'utf8')).toBe(before)
    expect(publication).not.toHaveBeenCalled()
    expect(writes).not.toHaveBeenCalled()
  })

  it('cannot demote and close an existing epic with open children', async () => {
    await service.updateCRPartial(project.id, key, { status: 'Approved', level: 'epic' })
    await factory.createTestCR('TEST', { title: 'Open child', type: 'Research', phaseEpic: key, content: 'Still open.' })
    const before = readFileSync(file, 'utf8')
    const publication = jest.spyOn(SharedTicketService.prototype as unknown as { syncTicketProjectionBestEffort: (...args: unknown[]) => Promise<void> }, 'syncTicketProjectionBestEffort')
    await expect(service.updateCRPartial(project.id, key, { status: 'Implemented', level: 'ticket' })).rejects.toMatchObject({ code: 'INVALID_OPERATION' })
    expect(readFileSync(file, 'utf8')).toBe(before)
    expect(publication).not.toHaveBeenCalled()
  })

  it.each(['EBUSY', 'EMFILE'])('preserves status write error mapping for combined patches (%s)', async (code) => {
    const before = readFileSync(file, 'utf8')
    const publication = jest.spyOn(SharedTicketService.prototype as unknown as { syncTicketProjectionBestEffort: (...args: unknown[]) => Promise<void> }, 'syncTicketProjectionBestEffort')
    jest.spyOn(fsExtra, 'outputFile').mockImplementationOnce(() => {
      throw new Error(`${code}: injected write failure`)
    })
    await expect(service.updateCRPartial(project.id, key, { status: 'In Progress', priority: 'High' })).rejects.toThrow('File locked or in use by another process')
    expect(readFileSync(file, 'utf8')).toBe(before)
    expect(publication).not.toHaveBeenCalled()
  })
})
