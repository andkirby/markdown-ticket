/**
 * MDT-205 — phaseEpic target validation + epic close guard orchestration.
 *
 * These exercise the SHARED TicketService write paths against a real temp
 * project filesystem: updateCRAttrs (phaseEpic validation), updateCRStatus
 * (close guard), and createCR. They prove the pure epic rules are wired into
 * the persistence boundary shared by CLI, MCP, and REST.
 */

import type { Project } from '../../../models/Project.js'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CRLevel } from '@mdt/domain-contracts'
import { ServiceError } from '../../../services/ServiceError.js'
import { TicketService } from '../../../services/TicketService.js'

function ticketFrontmatter(fields: Record<string, string>): string {
  const lines = ['---']
  for (const [k, v] of Object.entries(fields)) {
    lines.push(`${k}: ${v}`)
  }
  lines.push('---', '')
  return lines.join('\n')
}

function writeTicket(
  projectRoot: string,
  ticketsPath: string,
  code: string,
  frontmatter: Record<string, string>,
  title: string,
): string {
  const dir = join(projectRoot, ticketsPath)
  mkdirSync(dir, { recursive: true })
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  const filePath = join(dir, `${code}-${slug}.md`)
  const body = `${ticketFrontmatter(frontmatter)}\n# ${title}\n\nBody.\n`
  writeFileSync(filePath, body)
  return filePath
}

function makeProject(projectRoot: string, code = 'MDT'): Project {
  return ({
    id: code.toLowerCase(),
    project: {
      path: projectRoot,
      code,
      ticketsPath: 'docs/CRs',
      name: 'Test Project',
      active: true,
    },
  }) as unknown as Project
}

describe('MDT-205 epic validation (TicketService orchestration)', () => {
  let tempDir: string
  let projectRoot: string
  let service: TicketService
  let project: Project

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mdt-205-epic-'))
    projectRoot = join(tempDir, 'main')
    mkdirSync(join(projectRoot, 'docs/CRs'), { recursive: true })
    service = new TicketService(true)
    project = makeProject(projectRoot)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  const seedEpic = (
    code: string,
    status: string,
    level: 'epic' | 'ticket' = 'epic',
  ) =>
    writeTicket(
      projectRoot,
      'docs/CRs',
      code,
      {
        code,
        status,
        type: 'Feature Enhancement',
        priority: 'Medium',
        level,
      },
      `Epic ${code}`,
    )

  const seedChild = (
    code: string,
    status = 'In Progress',
    phaseEpic?: string,
  ) => {
    const fm: Record<string, string> = {
      code,
      status,
      type: 'Feature Enhancement',
      priority: 'Medium',
    }
    if (phaseEpic)
      fm.phaseEpic = phaseEpic
    writeTicket(projectRoot, 'docs/CRs', code, fm, `Child ${code}`)
  }

  // --- phaseEpic target validation (updateCRAttrs) ---

  describe('phaseEpic validation on updateCRAttrs', () => {
    it('accepts an Approved epic target', async () => {
      seedEpic('MDT-010', 'Approved')
      seedChild('MDT-020')
      const ok = await service.updateCRAttrs(project, 'MDT-020', {
        phaseEpic: 'MDT-010',
      })
      expect(ok).toBe(true)
    })

    it('accepts an Implemented epic target', async () => {
      seedEpic('MDT-010', 'Implemented')
      seedChild('MDT-020')
      expect(
        await service.updateCRAttrs(project, 'MDT-020', {
          phaseEpic: 'MDT-010',
        }),
      ).toBe(true)
    })

    it('rejects a target that is not an epic', async () => {
      seedEpic('MDT-010', 'In Progress', 'ticket')
      seedChild('MDT-020')
      await expect(
        service.updateCRAttrs(project, 'MDT-020', { phaseEpic: 'MDT-010' }),
      ).rejects.toThrow(/not an epic/i)
    })

    it('rejects a missing target', async () => {
      seedChild('MDT-020')
      await expect(
        service.updateCRAttrs(project, 'MDT-020', { phaseEpic: 'MDT-999' }),
      ).rejects.toThrow(/does not exist/i)
    })

    it('rejects a Proposed epic (must be Approved first)', async () => {
      seedEpic('MDT-010', 'Proposed')
      seedChild('MDT-020')
      await expect(
        service.updateCRAttrs(project, 'MDT-020', { phaseEpic: 'MDT-010' }),
      ).rejects.toThrow(/approve/i)
    })

    it('accepts free-text (non-key) phaseEpic unchanged (Edge-6)', async () => {
      seedChild('MDT-020')
      expect(
        await service.updateCRAttrs(project, 'MDT-020', {
          phaseEpic: 'Q3 security overhaul',
        }),
      ).toBe(true)
    })

    it('allows clearing phaseEpic regardless of epic state (Edge-2)', async () => {
      seedEpic('MDT-010', 'Proposed')
      seedChild('MDT-020', 'In Progress', 'MDT-010')
      expect(
        await service.updateCRAttrs(project, 'MDT-020', { phaseEpic: '' }),
      ).toBe(true)
    })

    it('surfaces a ServiceError with an epicErrorCode detail', async () => {
      seedChild('MDT-020')
      try {
        await service.updateCRAttrs(project, 'MDT-020', {
          phaseEpic: 'MDT-999',
        })
        throw new Error('should have thrown')
      }
      catch (e) {
        expect(e).toBeInstanceOf(ServiceError)
        expect((e as ServiceError).details?.epicErrorCode).toBe(
          'EPIC_TARGET_NOT_FOUND',
        )
      }
    })
  })

  // --- phaseEpic validation on createCR ---

  describe('phaseEpic validation on createCR', () => {
    it('rejects creating a child pointing at a non-existent target', async () => {
      await expect(
        service.createCR(project, 'Feature Enhancement', {
          title: 'New child',
          type: 'Feature Enhancement',
          priority: 'Medium',
          phaseEpic: 'MDT-999',
        }),
      ).rejects.toThrow(/does not exist/i)
    })

    it('accepts creating a child pointing at an Approved epic', async () => {
      seedEpic('MDT-010', 'Approved')
      const ticket = await service.createCR(project, 'Feature Enhancement', {
        title: 'New child',
        type: 'Feature Enhancement',
        priority: 'Medium',
        phaseEpic: 'MDT-010',
      })
      expect(ticket.phaseEpic).toBe('MDT-010')
    })
  })

  // --- epic close guard (updateCRStatus) ---

  describe('epic close guard on updateCRStatus', () => {
    it('blocks an epic moving to Implemented when it has non-terminal children (BR-5)', async () => {
      seedEpic('MDT-010', 'Approved')
      seedChild('MDT-020', 'In Progress', 'MDT-010')
      seedChild('MDT-021', 'Approved', 'MDT-010')
      await expect(
        service.updateCRStatus(project, 'MDT-010', 'Implemented'),
      ).rejects.toThrow(/not terminal/i)
    })

    it('allows an epic to close when all children are terminal (BR-5)', async () => {
      seedEpic('MDT-010', 'Approved')
      seedChild('MDT-020', 'Implemented', 'MDT-010')
      seedChild('MDT-021', 'Rejected', 'MDT-010')
      expect(
        await service.updateCRStatus(project, 'MDT-010', 'Implemented'),
      ).toBe(true)
    })

    it('allows closing an epic with zero children (Edge-3)', async () => {
      seedEpic('MDT-010', 'Approved')
      expect(
        await service.updateCRStatus(project, 'MDT-010', 'Implemented'),
      ).toBe(true)
    })

    it('does not apply the close guard to a non-epic ticket (C-4)', async () => {
      // A regular ticket "implementing" something is unaffected.
      seedChild('MDT-020', 'In Progress')
      expect(
        await service.updateCRStatus(project, 'MDT-020', 'Implemented'),
      ).toBe(true)
    })

    it('allows reopening an epic from Implemented to Approved (Edge-5)', async () => {
      seedEpic('MDT-010', 'Implemented')
      expect(await service.updateCRStatus(project, 'MDT-010', 'Approved')).toBe(
        true,
      )
    })

    it('lists the blocking children in the close-guard error', async () => {
      seedEpic('MDT-010', 'Approved')
      seedChild('MDT-020', 'In Progress', 'MDT-010')
      try {
        await service.updateCRStatus(project, 'MDT-010', 'Implemented')
        throw new Error('should have thrown')
      }
      catch (e) {
        const err = e as ServiceError
        expect(err.message).toContain('MDT-020')
        expect(err.details?.epicErrorCode).toBe('EPIC_HAS_OPEN_CHILDREN')
        expect(err.details?.blockers).toEqual(['MDT-020'])
      }
    })
  })

  // --- level field persistence (sanity) ---

  describe('level field persistence', () => {
    it('persists level: epic via updateCRAttrs and reads it back', async () => {
      seedChild('MDT-010')
      expect(
        await service.updateCRAttrs(project, 'MDT-010', {
          level: CRLevel.EPIC,
        }),
      ).toBe(true)
      const readBack = await service.getCR(project, 'MDT-010')
      expect(readBack?.level).toBe(CRLevel.EPIC)
    })
  })
})
