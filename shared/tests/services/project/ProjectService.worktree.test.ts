import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProjectService } from '../../../services/ProjectService.js'

function writeTicket(projectRoot: string, relativeTicketsPath: string, code: string, title: string): string {
  const ticketsDir = join(projectRoot, relativeTicketsPath)
  mkdirSync(ticketsDir, { recursive: true })
  const filePath = join(ticketsDir, `${code}-${title.toLowerCase().replace(/\s+/g, '-')}.md`)
  writeFileSync(filePath, `---
code: ${code}
status: Proposed
type: Feature Enhancement
priority: Medium
---

# ${title}

Ticket body.
`)
  return filePath
}

function createService(projectRoot: string, worktrees: Map<string, string>): ProjectService {
  return new ProjectService(
    undefined,
    {
      getProjectConfig: () => ({
        project: {
          path: '.',
          code: 'MDT',
          ticketsPath: 'docs/CRs',
          name: 'Markdown Ticket',
          active: true,
        },
        worktree: { enabled: true },
      }),
    } as never,
    undefined,
    undefined,
    {
      detect: jest.fn().mockResolvedValue(worktrees),
    } as never,
    true,
  )
}

describe('ProjectService worktree ticket listing', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mdt-project-service-worktree-'))
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('lists branch-matched worktree-only tickets absent from the main project', async () => {
    const projectRoot = join(tempDir, 'main')
    const worktreeRoot = join(tempDir, 'worktree-MDT-161')
    mkdirSync(join(projectRoot, 'docs/CRs'), { recursive: true })
    writeTicket(worktreeRoot, 'docs/CRs', 'MDT-161', 'Active Document Scroll Target')

    const service = createService(projectRoot, new Map([['MDT-161', worktreeRoot]]))

    const tickets = await service.getProjectCRs(projectRoot)

    expect(tickets).toHaveLength(1)
    expect(tickets[0]).toEqual(expect.objectContaining({
      code: 'MDT-161',
      title: 'Active Document Scroll Target',
      inWorktree: true,
      worktreePath: worktreeRoot,
    }))
  })

  it('prefers the active worktree ticket without returning duplicate rows', async () => {
    const projectRoot = join(tempDir, 'main')
    const worktreeRoot = join(tempDir, 'worktree-MDT-142')
    writeTicket(projectRoot, 'docs/CRs', 'MDT-142', 'Main Copy')
    writeTicket(worktreeRoot, 'docs/CRs', 'MDT-142', 'Worktree Copy')

    const service = createService(projectRoot, new Map([['MDT-142', worktreeRoot]]))

    const tickets = await service.getProjectCRs(projectRoot)

    expect(tickets).toHaveLength(1)
    expect(tickets[0]).toEqual(expect.objectContaining({
      code: 'MDT-142',
      title: 'Worktree Copy',
      inWorktree: true,
      worktreePath: worktreeRoot,
    }))
  })

  it('includes worktree-only tickets in metadata list responses', async () => {
    const projectRoot = join(tempDir, 'main')
    const worktreeRoot = join(tempDir, 'worktree-MDT-161')
    mkdirSync(join(projectRoot, 'docs/CRs'), { recursive: true })
    writeTicket(worktreeRoot, 'docs/CRs', 'MDT-161', 'Active Document Scroll Target')

    const service = createService(projectRoot, new Map([['MDT-161', worktreeRoot]]))

    const metadata = await service.getProjectCRsMetadata(projectRoot)

    expect(metadata).toHaveLength(1)
    expect(metadata[0]).toEqual(expect.objectContaining({
      code: 'MDT-161',
      title: 'Active Document Scroll Target',
      inWorktree: true,
      worktreePath: worktreeRoot,
    }))
    expect(metadata[0]).not.toHaveProperty('content')
  })
})
