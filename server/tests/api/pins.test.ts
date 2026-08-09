/// <reference types="jest" />

import type { Express } from 'express'
import type { SuperAgentTest } from 'supertest'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PinStateService } from '../../services/PinStateService'
import { assertBadRequest, assertSuccess } from './helpers'
import {
  cleanupAuthenticatedTestEnvironment,
  createTestProjectWithCR,
  setupAuthenticatedTestEnvironment,
} from './setup'

describe('pins API (MDT-197)', () => {
  let tempDir: string
  // `app` is needed for `app.locals.projectService` (service path test);
  // `authRequest` is the credentialed agent for requests so the MDT-157 auth
  // gate passes (auth is genuinely enforced, not bypassed).
  let app: Express
  let authRequest: SuperAgentTest
  let projectFactory: Awaited<ReturnType<typeof setupAuthenticatedTestEnvironment>>['projectFactory']
  let projectCodeA: string
  let projectCodeB: string

  beforeAll(async () => {
    const context = await setupAuthenticatedTestEnvironment()

    tempDir = context.tempDir
    app = context.app
    authRequest = context.authRequest
    projectFactory = context.projectFactory

    const projectA = await createTestProjectWithCR(projectFactory, {
      name: 'Pin Project A',
      code: 'PINA',
    })
    const projectB = await createTestProjectWithCR(projectFactory, {
      name: 'Pin Project B',
      code: 'PINB',
    })

    projectCodeA = projectA.projectCode
    projectCodeB = projectB.projectCode
  })

  afterAll(async () => {
    await cleanupAuthenticatedTestEnvironment(authRequest, tempDir)
  })

  function pinPath(): string {
    return join(process.env.CONFIG_DIR!, 'pins.json')
  }

  function iso(offsetSeconds = 0): string {
    return new Date(Date.now() + offsetSeconds * 1000).toISOString()
  }

  it('TEST-api-put-pins: persists the whole pin set to user-global pins.json', async () => {
    const response = await authRequest
      .put('/api/pins')
      .send({
        pins: [
          { projectCode: projectCodeA, ticketCode: `${projectCodeA}-001`, favoritedAt: iso() },
          { projectCode: projectCodeB, ticketCode: `${projectCodeB}-042`, favoritedAt: iso(1) },
        ],
      })

    assertSuccess(response, 200)
    expect(response.body.pins).toHaveLength(2)
    expect(response.body.pins.map((p: { projectCode: string }) => p.projectCode)).toEqual([
      projectCodeA,
      projectCodeB,
    ])

    // Persisted to the user-global pins.json (NOT per-project).
    expect(existsSync(pinPath())).toBe(true)
    const stored = JSON.parse(readFileSync(pinPath(), 'utf8'))
    expect(stored.pins).toHaveLength(2)
  })

  it('TEST-api-validate-schema: rejects malformed pin state with 400', async () => {
    // Bad project code (lowercase)
    const badProject = await authRequest
      .put('/api/pins')
      .send({ pins: [{ projectCode: 'lower', ticketCode: 'lower-1', favoritedAt: iso() }] })
    assertBadRequest(badProject)

    // Bad ticket code (no dash-number)
    const badTicket = await authRequest
      .put('/api/pins')
      .send({ pins: [{ projectCode: projectCodeA, ticketCode: 'not-a-code', favoritedAt: iso() }] })
    assertBadRequest(badTicket)

    // Bad datetime
    const badDate = await authRequest
      .put('/api/pins')
      .send({ pins: [{ projectCode: projectCodeA, ticketCode: `${projectCodeA}-1`, favoritedAt: 'yesterday' }] })
    assertBadRequest(badDate)

    // Extra field (strict schema)
    const extraField = await authRequest
      .put('/api/pins')
      .send({ pins: [{ projectCode: projectCodeA, ticketCode: `${projectCodeA}-1`, favoritedAt: iso(), extra: true }] })
    assertBadRequest(extraField)
  })

  it('TEST-api-reject-unknown-project: rejects pins referencing an unregistered project', async () => {
    const response = await authRequest
      .put('/api/pins')
      .send({
        pins: [
          { projectCode: 'GHOST', ticketCode: 'GHOST-001', favoritedAt: iso() },
        ],
      })

    assertBadRequest(response)
    expect(response.body.message).toContain('Unknown project')
  })

  it('TEST-api-reconcile-on-read: GET drops pins whose project is no longer registered', async () => {
    // Seed the file directly with a known + an unknown project code, simulating
    // a pin set persisted before a project was removed/unregistered. (We cannot
    // use service.writeState to seed this because writeState validates project
    // codes — that is the TEST-api-reject-unknown-project case.)
    writeFileSync(
      pinPath(),
      JSON.stringify({
        pins: [
          { projectCode: projectCodeA, ticketCode: `${projectCodeA}-1`, favoritedAt: iso() },
          { projectCode: 'STALE', ticketCode: 'STALE-1', favoritedAt: iso() },
        ],
      }),
      'utf8',
    )

    // GET should drop the STALE pin during reconciliation.
    const response = await authRequest.get('/api/pins')
    assertSuccess(response, 200)
    expect(response.body.pins).toHaveLength(1)
    expect(response.body.pins[0].projectCode).toBe(projectCodeA)
  })

  it('TEST-api-cross-project: accepts pins from multiple project codes in one set', async () => {
    const response = await authRequest
      .put('/api/pins')
      .send({
        pins: [
          { projectCode: projectCodeA, ticketCode: `${projectCodeA}-042`, favoritedAt: iso() },
          { projectCode: projectCodeB, ticketCode: `${projectCodeB}-042`, favoritedAt: iso(1) },
        ],
      })

    assertSuccess(response, 200)
    expect(response.body.pins).toHaveLength(2)
    // Same numeric code, different project codes — both accepted.
    const codes = response.body.pins.map((p: { ticketCode: string }) => p.ticketCode).sort()
    expect(codes).toEqual([`${projectCodeA}-042`, `${projectCodeB}-042`])
  })

  it('Edge-4: malformed stored file is reset to empty on read, never throws', async () => {
    // Corrupt the file on disk.
    writeFileSync(pinPath(), '{ "pins": "not-an-array" }', 'utf8')

    const response = await authRequest.get('/api/pins')
    assertSuccess(response, 200)
    expect(response.body.pins).toEqual([])
  })

  it('PinStateService getStatePath is user-global (not per-project)', async () => {
    const service = new PinStateService(app.locals.projectService.projectDiscovery)
    expect(service.getStatePath()).toBe(join(process.env.CONFIG_DIR!, 'pins.json'))
  })
})
