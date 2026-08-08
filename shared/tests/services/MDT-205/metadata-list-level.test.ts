/**
 * MDT-205 — production-path regression: the metadata-only list path preserves
 * the `level` field end-to-end through the REAL shared service.
 *
 * This is the path the Board consumes (GET /api/projects/:projectId/crs →
 * ProjectServiceAdapter → SharedProjectService.getProjectCRsMetadata →
 * MarkdownService.scanTicketMetadata → normalizeTicketMetadata). It is distinct
 * from the full-ticket path and had no dedicated test before MDT-205 BR-8.
 *
 * Unlike the server integration test (which exercises a test-double
 * ProjectService mock), this test imports the REAL shared ProjectService and
 * MarkdownService, so a regression in `normalizeTicketMetadata` or
 * `scanTicketMetadata` that the mock would mask is caught here.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CRLevel } from '@mdt/domain-contracts'
import { ProjectService } from '../../../services/ProjectService.js'

function writeTicket(
  projectRoot: string,
  ticketsPath: string,
  code: string,
  frontmatter: Record<string, string>,
  title: string,
): void {
  const dir = join(projectRoot, ticketsPath)
  mkdirSync(dir, { recursive: true })
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  const lines = ['---']
  for (const [k, v] of Object.entries(frontmatter)) {
    lines.push(`${k}: ${v}`)
  }
  lines.push('---', '', `# ${title}`, '', 'Body content.')
  writeFileSync(join(dir, `${code}-${slug}.md`), lines.join('\n'))
}

describe('MDT-205 BR-8 — metadata list path preserves level (production)', () => {
  let tempDir: string
  let projectRoot: string
  let service: ProjectService

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mdt-205-metadata-level-'))
    projectRoot = join(tempDir, 'proj')
    mkdirSync(join(projectRoot, 'docs/CRs'), { recursive: true })
    // Inject a config that resolves the temp project, mirroring the proven
    // worktree-test pattern. This lets the REAL scanTicketMetadata path run
    // against our fixtures without touching the global registry.
    service = new ProjectService(
      undefined,
      {
        getProjectConfig: () => ({
          project: {
            path: projectRoot,
            code: 'TL',
            ticketsPath: 'docs/CRs',
            name: 'Test Level',
            active: true,
          },
        }),
      } as never,
      undefined,
      undefined,
      new (class {
        detect() { return Promise.resolve(new Map()) }
      })() as never,
      true,
    )
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('returns level: epic for a ticket whose frontmatter has level: epic', async () => {
    writeTicket(projectRoot, 'docs/CRs', 'TL-001', {
      code: 'TL-001',
      status: 'Approved',
      type: 'Feature Enhancement',
      priority: 'Medium',
      level: 'epic',
    }, 'Epic ticket')

    const metadata = await service.getProjectCRsMetadata(projectRoot)
    const epic = metadata.find(t => t.code === 'TL-001')

    expect(epic).toBeDefined()
    expect(epic!.level).toBe(CRLevel.EPIC)
  })

  it('defaults level to ticket for a legacy ticket without a level field', async () => {
    writeTicket(projectRoot, 'docs/CRs', 'TL-002', {
      code: 'TL-002',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
    }, 'Legacy ticket')

    const metadata = await service.getProjectCRsMetadata(projectRoot)
    const legacy = metadata.find(t => t.code === 'TL-002')

    expect(legacy).toBeDefined()
    expect(legacy!.level).toBe(CRLevel.TICKET)
  })

  it('does not include content in metadata list responses', async () => {
    writeTicket(projectRoot, 'docs/CRs', 'TL-003', {
      code: 'TL-003',
      status: 'Proposed',
      type: 'Feature Enhancement',
      priority: 'Medium',
      level: 'epic',
    }, 'No content in metadata')

    const metadata = await service.getProjectCRsMetadata(projectRoot)
    const item = metadata.find(t => t.code === 'TL-003')

    expect(item).toBeDefined()
    expect(item).not.toHaveProperty('content')
  })

  it('preserves level across a mixed set of epic and ticket items', async () => {
    writeTicket(projectRoot, 'docs/CRs', 'TL-010', {
      code: 'TL-010',
      status: 'Approved',
      type: 'Feature Enhancement',
      priority: 'Medium',
      level: 'epic',
    }, 'Epic one')
    writeTicket(projectRoot, 'docs/CRs', 'TL-011', {
      code: 'TL-011',
      status: 'In Progress',
      type: 'Bug Fix',
      priority: 'High',
    }, 'Regular child')
    writeTicket(projectRoot, 'docs/CRs', 'TL-012', {
      code: 'TL-012',
      status: 'Implemented',
      type: 'Architecture',
      priority: 'Low',
      level: 'epic',
    }, 'Epic two')

    const metadata = await service.getProjectCRsMetadata(projectRoot)
    const byCode = new Map(metadata.map(t => [t.code, t]))

    expect(byCode.get('TL-010')?.level).toBe(CRLevel.EPIC)
    expect(byCode.get('TL-011')?.level).toBe(CRLevel.TICKET)
    expect(byCode.get('TL-012')?.level).toBe(CRLevel.EPIC)
  })
})
