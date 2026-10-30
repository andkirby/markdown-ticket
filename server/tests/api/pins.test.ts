/// <reference types="jest" />

import type { Express } from 'express'
import type { SuperAgentTest } from 'supertest'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PinStateService } from '../../services/PinStateService'
import { assertBadRequest, assertSuccess } from './helpers'
import {
  cleanupAuthenticatedTestEnvironment,
  createTestProjectWithCR,
  setupAuthenticatedTestEnvironment,
} from './setup'

describe('pins API (MDT-197, project-scoped per UAT 2026-10-30)', () => {
  let tempDir: string
  // `app` is needed for `app.locals.projectService` (canonical project id
  // resolution + service path test); `authRequest` is the credentialed agent
  // for requests so the MDT-157 auth gate passes (auth is genuinely enforced,
  // not bypassed).
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

  /** Canonical per-project storage dir id (clients may pass project code). */
  async function getProjectId(projectCode: string): Promise<string> {
    const projects = await app.locals.projectService.getAllProjects()
    const project = projects.find((candidate: { project: { code: string } }) => candidate.project.code === projectCode)

    if (!project) {
      throw new Error('Test project not found')
    }

    return project.id
  }

  async function pinsPath(projectCode: string): Promise<string> {
    return join(process.env.CONFIG_DIR!, 'projects', await getProjectId(projectCode), 'pins.json')
  }

  function legacyPinsPath(): string {
    return join(process.env.CONFIG_DIR!, 'pins.json')
  }

  function iso(offsetSeconds = 0): string {
    return new Date(Date.now() + offsetSeconds * 1000).toISOString()
  }

  it('TEST-api-put-pins: persists the whole pin set to projects/{projectId}/pins.json', async () => {
    const response = await authRequest
      .put('/api/pins')
      .send({
        projectId: projectCodeA,
        pins: [
          { projectCode: projectCodeA, ticketCode: `${projectCodeA}-001`, favoritedAt: iso() },
          { projectCode: projectCodeA, ticketCode: `${projectCodeA}-002`, favoritedAt: iso(1) },
        ],
      })

    assertSuccess(response, 200)
    expect(response.body.pins).toHaveLength(2)

    // Persisted to the project-scoped file under projects/{id}/, and the
    // legacy user-global file is never created.
    const stored = JSON.parse(readFileSync(await pinsPath(projectCodeA), 'utf8'))
    expect(stored.pins).toHaveLength(2)
    expect(existsSync(legacyPinsPath())).toBe(false)
  })

  it('TEST-api-project-isolation: pin sets are disjoint per project', async () => {
    // Write B's set; A's file must be untouched and B's GET returns only B.
    await authRequest
      .put('/api/pins')
      .send({
        projectId: projectCodeB,
        pins: [{ projectCode: projectCodeB, ticketCode: `${projectCodeB}-042`, favoritedAt: iso() }],
      })

    const getA = await authRequest.get(`/api/pins?projectId=${projectCodeA}`)
    assertSuccess(getA, 200)
    expect(getA.body.pins.map((p: { ticketCode: string }) => p.ticketCode))
      .toEqual([`${projectCodeA}-001`, `${projectCodeA}-002`])

    const getB = await authRequest.get(`/api/pins?projectId=${projectCodeB}`)
    assertSuccess(getB, 200)
    expect(getB.body.pins.map((p: { ticketCode: string }) => p.ticketCode))
      .toEqual([`${projectCodeB}-042`])

    // A's stored file was not modified by B's PUT.
    const storedA = JSON.parse(readFileSync(await pinsPath(projectCodeA), 'utf8'))
    expect(storedA.pins).toHaveLength(2)
  })

  it('TEST-api-legacy-migration: first read absorbs matching pins from legacy user-global pins.json', async () => {
    // Simulate the post-upgrade first read: no per-project pins file exists yet.
    rmSync(await pinsPath(projectCodeA), { force: true })
    rmSync(await pinsPath(projectCodeB), { force: true })

    // Seed a pre-upgrade user-global pin set containing pins for both
    // projects (plus a foreign project that must NOT migrate anywhere).
    writeFileSync(legacyPinsPath(), JSON.stringify({
      pins: [
        { projectCode: projectCodeA, ticketCode: `${projectCodeA}-100`, favoritedAt: iso() },
        { projectCode: projectCodeB, ticketCode: `${projectCodeB}-200`, favoritedAt: iso(1) },
        { projectCode: 'GHOST', ticketCode: 'GHOST-1', favoritedAt: iso(2) },
      ],
    }), 'utf8')

    // First GET per project absorbs that project's pins into its own file.
    const getA = await authRequest.get(`/api/pins?projectId=${projectCodeA}`)
    assertSuccess(getA, 200)
    expect(getA.body.pins.map((p: { ticketCode: string }) => p.ticketCode))
      .toEqual([`${projectCodeA}-100`])
    const storedA = JSON.parse(readFileSync(await pinsPath(projectCodeA), 'utf8'))
    expect(storedA.pins).toHaveLength(1)

    const getB = await authRequest.get(`/api/pins?projectId=${projectCodeB}`)
    assertSuccess(getB, 200)
    expect(getB.body.pins.map((p: { ticketCode: string }) => p.ticketCode))
      .toEqual([`${projectCodeB}-200`])

    // Foreign pins are never seeded into any project; legacy file is kept as backup.
    expect(existsSync(legacyPinsPath())).toBe(true)
    const storedB = JSON.parse(readFileSync(await pinsPath(projectCodeB), 'utf8'))
    expect(storedB.pins.map((p: { ticketCode: string }) => p.ticketCode)).toEqual([`${projectCodeB}-200`])
  })

  it('TEST-api-validate-schema: rejects malformed pin state with 400', async () => {
    // Missing projectId
    const missingProject = await authRequest
      .put('/api/pins')
      .send({ pins: [] })
    assertBadRequest(missingProject)

    // Bad project code (lowercase)
    const badProject = await authRequest
      .put('/api/pins')
      .send({ projectId: projectCodeA, pins: [{ projectCode: 'lower', ticketCode: 'lower-1', favoritedAt: iso() }] })
    assertBadRequest(badProject)

    // Bad ticket code (no dash-number)
    const badTicket = await authRequest
      .put('/api/pins')
      .send({ projectId: projectCodeA, pins: [{ projectCode: projectCodeA, ticketCode: 'not-a-code', favoritedAt: iso() }] })
    assertBadRequest(badTicket)

    // Bad datetime
    const badDate = await authRequest
      .put('/api/pins')
      .send({ projectId: projectCodeA, pins: [{ projectCode: projectCodeA, ticketCode: `${projectCodeA}-1`, favoritedAt: 'yesterday' }] })
    assertBadRequest(badDate)

    // Extra field (strict schema)
    const extraField = await authRequest
      .put('/api/pins')
      .send({ projectId: projectCodeA, pins: [{ projectCode: projectCodeA, ticketCode: `${projectCodeA}-1`, favoritedAt: iso(), extra: true }] })
    assertBadRequest(extraField)
  })

  it('TEST-api-reject-unknown-project: unknown projectId is 404; mismatched pin projectCode is 400', async () => {
    const unknownGet = await authRequest.get('/api/pins?projectId=NOPE')
    expect(unknownGet.status).toBe(404)

    const unknownPut = await authRequest
      .put('/api/pins')
      .send({ projectId: 'NOPE', pins: [] })
    expect(unknownPut.status).toBe(404)

    // Pin referencing another (registered) project's code does not belong in
    // this project's set.
    const mismatched = await authRequest
      .put('/api/pins')
      .send({
        projectId: projectCodeA,
        pins: [{ projectCode: projectCodeB, ticketCode: `${projectCodeB}-042`, favoritedAt: iso() }],
      })
    assertBadRequest(mismatched)
    expect(mismatched.body.message).toContain('does not match')
  })

  it('TEST-api-reconcile-on-read: GET drops pins whose projectCode mismatches the owning project', async () => {
    // Seed the file directly with an owning + a stale projectCode pin. (We
    // cannot use service.writeState to seed this because writeState enforces
    // the ownership match — that is the TEST-api-reject-unknown-project case.)
    writeFileSync(await pinsPath(projectCodeA), JSON.stringify({
      pins: [
        { projectCode: projectCodeA, ticketCode: `${projectCodeA}-1`, favoritedAt: iso() },
        { projectCode: 'STALE', ticketCode: 'STALE-1', favoritedAt: iso() },
      ],
    }), 'utf8')

    const response = await authRequest.get(`/api/pins?projectId=${projectCodeA}`)
    assertSuccess(response, 200)
    expect(response.body.pins).toHaveLength(1)
    expect(response.body.pins[0].projectCode).toBe(projectCodeA)
  })

  it('Edge-4: malformed stored file is reset to empty on read, never throws', async () => {
    // Corrupt the project file on disk (migration does not fire — file exists).
    writeFileSync(await pinsPath(projectCodeA), '{ "pins": "not-an-array" }', 'utf8')

    const response = await authRequest.get(`/api/pins?projectId=${projectCodeA}`)
    assertSuccess(response, 200)
    expect(response.body.pins).toEqual([])
  })

  it('PinStateService state path is per-project under CONFIG_DIR/projects/{id}', async () => {
    const service = new PinStateService(app.locals.projectService)
    const project = await service.resolveProject(projectCodeA)
    expect(service.getStatePath(project)).toBe(join(process.env.CONFIG_DIR!, 'projects', project.id, 'pins.json'))
    expect(service.getLegacyStatePath()).toBe(join(process.env.CONFIG_DIR!, 'pins.json'))
  })
})
