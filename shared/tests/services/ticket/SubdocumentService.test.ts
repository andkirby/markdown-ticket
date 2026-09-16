import type { ResolvedTicketLocation } from '../../../services/ticket/types.js'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
        docKind: 'markdown',
        children: [],
        filePath: 'MDT-138/poc.md',
      },
    ])
  })

  it('discovers .html files inside ticket subfolders as subdocuments with docKind html', () => {
    mkdirSync(join(location.ticketDir, 'diagrams'))
    writeFileSync(join(location.ticketDir, 'diagrams', 'coverage-dataflow.html'), '<html></html>')
    writeFileSync(join(location.ticketDir, 'diagrams', 'coverage-entities.htm'), '<html></html>')
    writeFileSync(join(location.ticketDir, 'diagrams', 'coverage-entities.json'), '{}')
    writeFileSync(join(location.ticketDir, 'diagrams', 'logo.png'), 'png')

    const result = service.discover(location, 'MDT-138')
    const diagrams = result.find(entry => entry.name === 'diagrams')

    expect(diagrams).toMatchObject({ name: 'diagrams', kind: 'folder' })
    expect(diagrams?.children).toEqual([
      {
        name: 'coverage-dataflow',
        kind: 'file',
        docKind: 'html',
        children: [],
        filePath: 'MDT-138/diagrams/coverage-dataflow.html',
      },
      {
        name: 'coverage-entities',
        kind: 'file',
        docKind: 'html',
        children: [],
        filePath: 'MDT-138/diagrams/coverage-entities.htm',
      },
    ])
  })

  it('drops a folder that contains only non-document assets', () => {
    mkdirSync(join(location.ticketDir, 'assets'))
    writeFileSync(join(location.ticketDir, 'assets', 'data.json'), '{}')
    writeFileSync(join(location.ticketDir, 'assets', 'image.png'), 'png')

    expect(service.discover(location, 'MDT-138')).toEqual([])
  })

  it('discovers top-level .html files next to the ticket markdown', () => {
    writeFileSync(join(location.ticketDir, 'sketch.html'), '<html></html>')

    expect(service.discover(location, 'MDT-138')).toEqual([
      {
        name: 'sketch',
        kind: 'file',
        docKind: 'html',
        children: [],
        filePath: 'MDT-138/sketch.html',
      },
    ])
  })

  it('keeps html names out of the markdown namespace machinery', () => {
    // coverage.html + coverage.trace.md: the namespace group rebuilds
    // filePaths with a .md suffix, so the .html file must not enter it —
    // it survives as a child of the virtual 'coverage' folder instead.
    writeFileSync(join(location.ticketDir, 'coverage.html'), '<html></html>')
    writeFileSync(join(location.ticketDir, 'coverage.trace.md'), '# trace')

    const result = service.discover(location, 'MDT-138')

    expect(result).toEqual([
      {
        name: 'coverage',
        kind: 'folder',
        isVirtual: true,
        filePath: 'MDT-138/coverage.md',
        children: [
          {
            name: 'trace',
            kind: 'file',
            docKind: 'markdown',
            children: [],
            filePath: 'MDT-138/coverage.trace.md',
          },
          {
            name: 'coverage',
            kind: 'file',
            docKind: 'html',
            children: [],
            filePath: 'MDT-138/coverage.html',
          },
        ],
      },
    ])
  })

  it('prefers markdown when a folder holds both foo.md and foo.html', () => {
    mkdirSync(join(location.ticketDir, 'diagrams'))
    writeFileSync(join(location.ticketDir, 'diagrams', 'flow.html'), '<html></html>')
    writeFileSync(join(location.ticketDir, 'diagrams', 'flow.md'), '# flow')

    const result = service.discover(location, 'MDT-138')
    const diagrams = result.find(entry => entry.name === 'diagrams')

    expect(diagrams?.children).toEqual([
      {
        name: 'flow',
        kind: 'file',
        docKind: 'markdown',
        children: [],
        filePath: 'MDT-138/diagrams/flow.md',
      },
    ])
  })

  it('resolves .html subdocument names to the exact file without appending .md', () => {
    mkdirSync(join(location.ticketDir, 'diagrams'))
    writeFileSync(join(location.ticketDir, 'diagrams', 'coverage-dataflow.html'), '<html></html>')

    expect(service.resolvePath(location, 'diagrams/coverage-dataflow.html')).toBe(
      join(location.ticketDir, 'diagrams', 'coverage-dataflow.html'),
    )
    expect(service.read(location, 'diagrams/coverage-dataflow.html')).toMatchObject({
      code: 'diagrams/coverage-dataflow.html',
      content: '<html></html>',
    })
  })

  it('rejects .html subdocument names that do not exist as exact files', () => {
    mkdirSync(join(location.ticketDir, 'diagrams'))
    writeFileSync(join(location.ticketDir, 'diagrams', 'coverage-dataflow.md'), '# md')

    expect(service.resolvePath(location, 'diagrams/coverage-dataflow.html')).toBeNull()
  })

  it('rejects subdocument paths deeper than one folder level', () => {
    mkdirSync(join(location.ticketDir, 'poc', 'nested'), { recursive: true })
    writeFileSync(join(location.ticketDir, 'poc', 'nested', 'deep.md'), '# ignored')

    expect(service.resolvePath(location, 'poc/nested/deep')).toBeNull()
  })
})
