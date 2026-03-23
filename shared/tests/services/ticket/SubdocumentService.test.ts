import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ResolvedTicketLocation } from '../../../services/ticket/types.js'
import { SubdocumentService } from '../../../services/ticket/SubdocumentService.js'

describe('SubdocumentService', () => {
  const service = new SubdocumentService()
  let testRoot: string
  let location: ResolvedTicketLocation

  beforeEach(() => {
    testRoot = mkdtempSync(join(tmpdir(), 'mdt-subdocs-'))
    const ticketDir = join(testRoot, 'docs/CRs/MDT-138')
    mkdirSync(ticketDir, { recursive: true })
    location = {
      projectRoot: testRoot,
      ticketDir,
      ticketsPath: 'docs/CRs',
      isWorktree: false,
    }
  })

  afterEach(() => {
    rmSync(testRoot, { recursive: true, force: true })
  })

  it('merges virtual and physical namespace folders into one logical namespace', () => {
    writeFileSync(join(location.ticketDir, 'architecture.md'), '# main')
    writeFileSync(join(location.ticketDir, 'architecture.approve-it.md'), '# approve')
    mkdirSync(join(location.ticketDir, 'architecture'))
    writeFileSync(join(location.ticketDir, 'architecture/review.md'), '# review')

    const result = service.discover(location, 'MDT-138')
    const architecture = result[0]

    expect(result).toHaveLength(1)
    expect(architecture).toBeDefined()
    expect(architecture).toMatchObject({
      name: 'architecture',
      kind: 'folder',
    })
    expect(architecture?.children.map(child => child.name)).toEqual(['main', 'approve-it', 'review'])
  })

  it('resolves slash notation to dot-notation files', () => {
    writeFileSync(join(location.ticketDir, 'architecture.approve-it.md'), '# approve')

    expect(service.resolvePath(location, 'architecture/approve-it')).toBe(
      join(location.ticketDir, 'architecture.approve-it.md'),
    )
  })

  it('reads a subdocument by namespace sub-key lookup', () => {
    writeFileSync(join(location.ticketDir, 'architecture.approve-it.md'), '# approve')

    expect(service.read(location, 'approve-it')).toMatchObject({
      code: 'approve-it',
      content: '# approve',
    })
  })

  it('keeps a root markdown file when a same-name folder has no supported markdown children', () => {
    writeFileSync(join(location.ticketDir, 'poc.md'), '# poc')
    mkdirSync(join(location.ticketDir, 'poc'))
    mkdirSync(join(location.ticketDir, 'poc', 'nested'), { recursive: true })
    writeFileSync(join(location.ticketDir, 'poc', 'nested', 'deep.md'), '# ignored')

    expect(service.discover(location, 'MDT-138')).toEqual([
      {
        name: 'poc',
        kind: 'file',
        children: [],
        filePath: 'MDT-138/poc.md',
      },
    ])
  })

  it('rejects subdocument paths deeper than one folder level', () => {
    mkdirSync(join(location.ticketDir, 'poc', 'nested'), { recursive: true })
    writeFileSync(join(location.ticketDir, 'poc', 'nested', 'deep.md'), '# ignored')

    expect(service.resolvePath(location, 'poc/nested/deep')).toBeNull()
  })
})
