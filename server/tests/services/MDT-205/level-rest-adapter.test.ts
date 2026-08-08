/**
 * MDT-205 — REST adapter forwards `level` through PATCH and create, and the
 * OpenAPI documents the field.
 *
 * The server TicketService delegates to the shared TicketService (whose epic
 * validation is covered separately). These tests prove the adapter wiring:
 * level reaches persistence on both create and patch, and the alias shorthand
 * (e→epic) resolves through the shared gate.
 */

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
import { TicketService } from '../../../services/TicketService.js'

function ticketFrontmatter(fields: Record<string, string>): string {
  const lines = ['---']
  for (const [k, v] of Object.entries(fields)) {
    lines.push(`${k}: ${v}`)
  }
  lines.push('---', '')
  return lines.join('\n')
}

describe('MDT-205 REST adapter — level field', () => {
  let tempDir: string
  let projectRoot: string
  let service: TicketService
  const projectId = 'test-rest'

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mdt-205-rest-'))
    projectRoot = join(tempDir, 'main')
    mkdirSync(join(projectRoot, 'docs/CRs'), { recursive: true })
    // Seed one existing ticket to PATCH.
    writeFileSync(
      join(projectRoot, 'docs/CRs', 'MDT-020-existing-ticket.md'),
      `${ticketFrontmatter({
        code: 'MDT-020',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })}\n# Existing Ticket\n\nBody.\n`,
    )

    // The adapter resolves the project via projectDiscovery.getAllProjects().
    service = new TicketService({
      getAllProjects: async () => [
        {
          id: projectId,
          project: {
            path: projectRoot,
            code: 'MDT',
            ticketsPath: 'docs/CRs',
            name: 'Test',
            active: true,
          },
        } as never,
      ],
    })
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('forwards level through PATCH and persists it', async () => {
    const result = await service.updateCRPartial(projectId, 'MDT-020', {
      level: CRLevel.EPIC,
    })
    expect(result.success).toBe(true)
    expect(result.updatedFields).toContain('level')
  })

  it('resolves the e alias to epic through the shared gate', async () => {
    // The REST PATCH body carries the raw alias; the adapter resolves it.
    const updates = { level: 'e' } as Record<string, unknown>
    const result = await service.updateCRPartial(projectId, 'MDT-020', updates)
    expect(result.success).toBe(true)
    // The on-disk YAML should now contain level: epic.
    const { readFile } = await import('node:fs/promises')
    const content = await readFile(
      join(projectRoot, 'docs/CRs', 'MDT-020-existing-ticket.md'),
      'utf-8',
    )
    expect(content).toMatch(/level: epic/)
  })

  it('forwards level through create', async () => {
    const result = await service.createCR(projectId, {
      title: 'Brand new epic',
      type: 'Feature Enhancement',
      priority: 'Medium',
      level: CRLevel.EPIC,
    })
    expect(result.success).toBe(true)
    const { readFile } = await import('node:fs/promises')
    const content = await readFile(result.path, 'utf-8')
    expect(content).toMatch(/level: epic/)
  })
})
