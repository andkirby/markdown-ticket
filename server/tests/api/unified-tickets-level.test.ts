/**
 * Unified tickets endpoint — `level` field regression (MDT-205/MDT-206).
 *
 * The board reads `/api/projects/:id/tickets/unified` (NOT `/crs`). The
 * unified serializer must carry `level` so the frontend can detect epic
 * tickets — without it, `isEpicTicket()` always returns false, epics leak onto
 * the flat board as regular cards, and swimlanes never form epic lanes.
 *
 * This is a production-path test (real TicketService → real MarkdownService),
 * not a mock — it guards the contract that mocks previously masked.
 */

/// <reference types="jest" />

import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { SuperAgentTest } from 'supertest'
import { readFile, writeFile } from 'node:fs/promises'
import { assertSuccess } from './helpers'
import { cleanupAuthenticatedTestEnvironment, setupAuthenticatedTestEnvironment } from './setup'

describe('Unified tickets endpoint — level field (MDT-205/206)', () => {
  let authRequest: SuperAgentTest
  let tempDir: string
  let projectFactory: ProjectFactory

  beforeAll(async () => {
    const ctx = await setupAuthenticatedTestEnvironment()
    authRequest = ctx.authRequest
    tempDir = ctx.tempDir
    projectFactory = ctx.projectFactory
  })

  afterAll(async () => {
    await cleanupAuthenticatedTestEnvironment(authRequest, tempDir)
  })

  it('includes level:"epic" on a canonical local epic so the board can detect it', async () => {
    const project = await projectFactory.createProject('empty')
    const crResult = await projectFactory.createTestCR(project.key, {
      title: 'Epic CR',
      type: 'Feature Enhancement',
      priority: 'Medium',
      content: 'Epic content.',
    })
    if (!crResult.success || !crResult.crCode || !crResult.filePath)
      throw new Error(`Failed to create test CR: ${crResult.error}`)

    // Promote the CR to an epic the way MDT-205 epics are authored: add
    // `level: epic` to the frontmatter.
    const raw = await readFile(crResult.filePath, 'utf8')
    await writeFile(crResult.filePath, raw.replace('priority: Medium\n', 'priority: Medium\nlevel: epic\n'), 'utf8')

    const response = await authRequest.get(`/api/projects/${project.key}/tickets/unified`)
    assertSuccess(response)

    const item = response.body.find((i: { code: string }) => i.code === crResult.crCode)
    expect(item).toBeDefined()
    // The serializer must carry level through; the frontend normalizer defaults
    // a missing/null level to 'ticket', which would hide the epic.
    expect(item.level).toBe('epic')
  })

  it('includes level:"ticket" (the default) on a regular canonical ticket', async () => {
    const project = await projectFactory.createProject('empty')
    const crResult = await projectFactory.createTestCR(project.key, {
      title: 'Plain CR',
      type: 'Feature Enhancement',
      priority: 'Medium',
      content: 'Plain content.',
    })
    if (!crResult.success || !crResult.crCode)
      throw new Error(`Failed to create test CR: ${crResult.error}`)

    const response = await authRequest.get(`/api/projects/${project.key}/tickets/unified`)
    assertSuccess(response)

    const item = response.body.find((i: { code: string }) => i.code === crResult.crCode)
    expect(item).toBeDefined()
    // No level in frontmatter → shared normalizer defaults to 'ticket'; the
    // serializer must forward that default rather than dropping it.
    expect(item.level).toBe('ticket')
  })

  // phaseEpic (child→epic lane assignment) is verified end-to-end by the
  // swimlane E2E suite ("switches to swimlanes, renders lanes …" checks child
  // tickets land inside their epic lane), which drives the real create flow.
  // The serializer forwards `phaseEpic: t.phaseEpic ?? null` on the same path
  // proven for `level` above.
})
