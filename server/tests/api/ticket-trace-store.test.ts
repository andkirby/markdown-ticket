/**
 * Trace Store API Integration Tests - MDT-174.
 *
 * Verifies ticket-scoped trace store metadata and JSON access.
 */

/// <reference types="jest" />

import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { SuperAgentTest } from 'supertest'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertNotFound, assertSuccess } from './helpers'
import { cleanupAuthenticatedTestEnvironment, setupAuthenticatedTestEnvironment } from './setup'

describe('Ticket trace store API (MDT-174)', () => {
  // Credentialed agent — used in place of `authRequest` so protected routes
  // pass the MDT-157 auth gate. Auth is genuinely enforced (not bypassed).
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

  async function createProjectWithCR() {
    const project = await projectFactory.createProject('empty')
    const crResult = await projectFactory.createTestCR(project.key, {
      title: 'Trace Store Ticket',
      type: 'Feature Enhancement',
      content: 'Ticket with trace store',
    })

    if (!crResult.success || !crResult.crCode) {
      throw new Error(`Failed to create test CR: ${crResult.error}`)
    }

    return { projectCode: project.key, crCode: crResult.crCode, projectDir: project.path }
  }

  function writeTraceStore(projectDir: string, ticketCode: string, store: unknown): void {
    const traceDir = join(projectDir, 'docs/CRs', '.trace', ticketCode)
    mkdirSync(traceDir, { recursive: true })
    writeFileSync(join(traceDir, 'store.json'), JSON.stringify(store), 'utf8')
  }

  it('returns metadata when the standard trace store exists', async () => {
    const { projectCode, crCode, projectDir } = await createProjectWithCR()
    writeTraceStore(projectDir, crCode, { ticket: { key: crCode }, requirements: [] })

    const response = await authRequest
      .get(`/api/projects/${projectCode}/crs/${crCode}/trace-store/meta`)

    assertSuccess(response)
    expect(response.body).toEqual({
      exists: true,
      ticketCode: crCode,
      label: `${crCode}/store.json`,
    })
  })

  it('returns absence metadata without leaking filesystem paths', async () => {
    const { projectCode, crCode } = await createProjectWithCR()

    const response = await authRequest
      .get(`/api/projects/${projectCode}/crs/${crCode}/trace-store/meta`)

    assertSuccess(response)
    expect(response.body).toEqual({
      exists: false,
      ticketCode: crCode,
      label: `${crCode}/store.json`,
    })
    expect(JSON.stringify(response.body)).not.toContain(tempDir)
  })

  it('returns trace store JSON with no-store cache headers', async () => {
    const { projectCode, crCode, projectDir } = await createProjectWithCR()
    const store = {
      ticket: { key: crCode },
      requirements: [{ id: 'REQ-1', title: 'Render graph' }],
    }
    writeTraceStore(projectDir, crCode, store)

    const response = await authRequest
      .get(`/api/projects/${projectCode}/crs/${crCode}/trace-store`)

    assertSuccess(response)
    expect(response.body).toEqual(store)
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('returns 404 for missing trace store without an absolute path', async () => {
    const { projectCode, crCode } = await createProjectWithCR()

    const response = await authRequest
      .get(`/api/projects/${projectCode}/crs/${crCode}/trace-store`)

    assertNotFound(response)
    expect(JSON.stringify(response.body)).not.toContain(tempDir)
  })

  it('rejects symlinked trace stores outside the trace directory', async () => {
    const { projectCode, crCode, projectDir } = await createProjectWithCR()
    const outsideDir = mkdtempSync(join(tmpdir(), 'mdt-trace-outside-'))
    const outsideStore = join(outsideDir, 'store.json')
    writeFileSync(outsideStore, JSON.stringify({ ticket: { key: crCode } }), 'utf8')

    const traceDir = join(projectDir, 'docs/CRs', '.trace', crCode)
    mkdirSync(traceDir, { recursive: true })
    symlinkSync(outsideStore, join(traceDir, 'store.json'))

    const response = await authRequest
      .get(`/api/projects/${projectCode}/crs/${crCode}/trace-store`)

    assertNotFound(response)
  })
})
