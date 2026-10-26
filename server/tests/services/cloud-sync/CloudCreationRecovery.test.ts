import type { Express, Router as ExpressRouter } from 'express'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { CoordinatorError } from '@mdt/domain-contracts'
import express, { Router } from 'express'
import request from 'supertest'
import { createApiAuthMiddleware, parseApiAuthConfig } from '../../../security/apiAuth.js'
import { createReadSessionCookie } from '../../../security/readSession.js'

// TEST-review-recovery-adapter: the HTTP boundary alone is mocked. Once the
// planned module exists these requests exercise its real Express router.
// A missing router produces observable HTTP 404s, never an import failure.
interface RecoveryPort {
  inspectCreationRecovery: (projectId: string) => Promise<unknown>
  resumeCreationRecovery: (projectId: string, input: { journalId: string, expectedDigest: string }) => Promise<unknown>
  reconcileCreationRecovery: (projectId: string, input: {
    journalId: string
    expectedDigest: string
    operationId: string
    reason: string
  }) => Promise<unknown>
}

type RouterFactory = (service: RecoveryPort) => ExpressRouter

async function recoveryRouter(service: RecoveryPort): Promise<ExpressRouter> {
  if (!existsSync(resolve(__dirname, '../../../routes/cloudCreationRecovery.ts')))
    return Router()
  const modulePath = '../../../routes/cloudCreationRecovery.js'
  const module = await import(modulePath) as { createCloudCreationRecoveryRouter: RouterFactory }
  return module.createCloudCreationRecoveryRouter(service)
}

const base = '/api/projects/fixture/cloud-sync/creation-recovery'
const journalId = 'current'
const expectedDigest = 'a'.repeat(64)
const operationId = '468d35aa-3e43-4acc-8cc2-82216251499c'
const resumeInput = { journalId, expectedDigest }
const reconcileInput = { ...resumeInput, operationId, reason: 'Reviewed the original terminal receipt and canonical evidence.' }
const ownerToken = 'isolated-recovery-owner'
const readSecret = 'isolated-recovery-read-secret'
const inspection = {
  entries: [
    {
      journalId,
      digest: expectedDigest,
      status: 'current',
      state: 'reserved',
      creationId: 'c3701cb7-5d90-4ac0-a18d-fab960ce63eb',
      reservationId: 'eb655478-3522-4016-b385-5ff71c0d86f4',
      ticketNumber: 263,
      lock: { pid: 12345, createdAt: '2026-10-25T10:00:00.000Z' },
      nextAction: 'Verify the retained lock owner before explicitly resuming this journal.',
    },
    { journalId: 'legacy/route-a', digest: 'b'.repeat(64), status: 'malformed', nextAction: 'Preserve evidence for manual review.' },
  ],
}

describe('MDT-200 explicit creation recovery HTTP boundary', () => {
  let root: string
  let app: Express
  let port: jest.Mocked<RecoveryPort>

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'mdt200-recovery-http-'))
    port = {
      inspectCreationRecovery: jest.fn().mockResolvedValue(inspection),
      resumeCreationRecovery: jest.fn().mockResolvedValue({ status: 'resumed', journalId }),
      reconcileCreationRecovery: jest.fn().mockResolvedValue({ status: 'archived', journalId, operationId }),
    }
    app = express()
    app.use(express.json())
    app.use('/api', createApiAuthMiddleware(parseApiAuthConfig({
      NODE_ENV: 'test',
      API_SECURITY_AUTH: 'true',
      API_AUTH_TOKEN: ownerToken,
      API_LOCAL_HOST_BYPASS: 'false',
    }), {
      configDir: root,
      allowLocalReadSessionFallback: false,
      readSessionSecret: readSecret,
      originPolicy: { isAllowedOrigin: () => false },
    }))
    app.use('/api/projects', await recoveryRouter(port))
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  function expectNoMutation(): void {
    expect(port.resumeCreationRecovery).not.toHaveBeenCalled()
    expect(port.reconcileCreationRecovery).not.toHaveBeenCalled()
  }

  it('mounts without inspecting or resuming anything at startup', async () => {
    expect(port.inspectCreationRecovery).not.toHaveBeenCalled()
    expectNoMutation()
    // Also proves this is the production router rather than a vacuous no-op.
    await request(app).get(base).auth(ownerToken, { type: 'bearer' }).expect(200)
    expectNoMutation()
  })

  it('owner inspection returns retained current and malformed legacy entries with no mutation', async () => {
    for (let i = 0; i < 2; i++) {
      const response = await request(app).get(base).auth(ownerToken, { type: 'bearer' }).expect(200)
      expect(response.body).toEqual(inspection)
      expect(response.body.entries[0]).toMatchObject({ journalId, digest: expectedDigest, ticketNumber: 263, lock: { pid: 12345 } })
      expect(response.body.entries[1]).toMatchObject({ status: 'malformed', nextAction: expect.any(String) })
      expect(JSON.stringify(response.body)).not.toMatch(/\/private\/|cfAccessToken|clientSecret|draftBody|"draft"/u)
    }
    expect(port.inspectCreationRecovery.mock.calls).toEqual([['fixture'], ['fixture']])
    expectNoMutation()
  })

  it('resumes only the selected journal/digest without reconstructing create arguments', async () => {
    const response = await request(app).post(`${base}/resume`).auth(ownerToken, { type: 'bearer' }).send(resumeInput).expect(200)
    expect(response.body).toEqual({ status: 'resumed', journalId })
    expect(port.resumeCreationRecovery.mock.calls).toEqual([['fixture', resumeInput]])
    expect(port.inspectCreationRecovery).not.toHaveBeenCalled()
    expect(port.reconcileCreationRecovery).not.toHaveBeenCalled()
  })

  it('forwards the exact reviewed reconciliation request and structured archive result', async () => {
    const response = await request(app).post(`${base}/reconcile`).auth(ownerToken, { type: 'bearer' }).send(reconcileInput).expect(200)
    expect(response.body).toEqual({ status: 'archived', journalId, operationId })
    expect(port.reconcileCreationRecovery.mock.calls).toEqual([['fixture', reconcileInput]])
    expect(port.inspectCreationRecovery).not.toHaveBeenCalled()
    expect(port.resumeCreationRecovery).not.toHaveBeenCalled()
  })

  it('keeps unproven legacy provenance as an inspectable manual-review outcome', async () => {
    const outcome = { status: 'manual-review-required', journalId: 'legacy/route-a', nextAction: 'Retain original bytes; verify the original receipt with the operator.' }
    port.reconcileCreationRecovery.mockResolvedValue(outcome)
    const response = await request(app).post(`${base}/reconcile`).auth(ownerToken, { type: 'bearer' }).send({ ...reconcileInput, journalId: 'legacy/route-a' }).expect(200)
    expect(response.body).toEqual(outcome)
    expect(port.reconcileCreationRecovery).toHaveBeenCalledTimes(1)
    expect(port.resumeCreationRecovery).not.toHaveBeenCalled()
  })

  it.each([
    ['missing digest', { journalId }],
    ['invalid digest', { ...resumeInput, expectedDigest: 'not-a-sha256' }],
    ['empty journal ID', { ...resumeInput, journalId: '' }],
    ['absolute journal path', { ...resumeInput, journalId: '/private/state/journal.json' }],
    ['parent traversal', { ...resumeInput, journalId: '../journal.json' }],
    ['backslash traversal', { ...resumeInput, journalId: '..\\journal.json' }],
    ['caller-supplied replacement draft', { ...resumeInput, draft: { title: 'replacement', body: 'replacement' } }],
    ['caller-supplied receipt', { ...resumeInput, reservationId: operationId, ticketNumber: 264 }],
    ['array body', [resumeInput]],
  ])('rejects resume %s before any service call', async (_name, body) => {
    const response = await request(app).post(`${base}/resume`).auth(ownerToken, { type: 'bearer' }).send(body).expect(400)
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', source: 'body' })
    expect(port.inspectCreationRecovery).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it.each([
    ['missing operation ID', resumeInput],
    ['invalid operation ID', { ...reconcileInput, operationId: 'not-a-uuid' }],
    ['missing reason', { ...resumeInput, operationId }],
    ['blank reason', { ...reconcileInput, reason: '   ' }],
    ['unbounded reason', { ...reconcileInput, reason: 'x'.repeat(4097) }],
    ['stale-digest bypass', { ...reconcileInput, expectedDigest: null }],
    ['force-clear bypass', { ...reconcileInput, force: true }],
    ['replacement identity', { ...reconcileInput, creationId: operationId }],
  ])('rejects reconciliation %s before any service call', async (_name, body) => {
    const response = await request(app).post(`${base}/reconcile`).auth(ownerToken, { type: 'bearer' }).send(body).expect(400)
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', source: 'body' })
    expectNoMutation()
  })

  it.each(['resume', 'reconcile'] as const)('preserves typed %s conflicts while sanitizing exception details', async (operation) => {
    const method = operation === 'resume' ? port.resumeCreationRecovery : port.reconcileCreationRecovery
    method.mockRejectedValue(new CoordinatorError('reservation_state_conflict', {
      message: '/private/state/journal.json cfAccessToken=fixture-secret draft-body',
    }))
    const response = await request(app).post(`${base}/${operation}`).auth(ownerToken, { type: 'bearer' }).send(operation === 'resume' ? resumeInput : reconcileInput).expect(409)
    expect(response.body).toMatchObject({ code: 'reservation_state_conflict', nextAction: expect.any(String) })
    expect(response.body.nextAction.trim().length).toBeGreaterThan(0)
    expect(JSON.stringify(response.body)).not.toMatch(/\/private|fixture-secret|cfAccessToken|draft-body|stack/u)
    expect(method).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['authentication_required', 401],
    ['forbidden', 403],
    ['project_not_found', 404],
    ['idempotency_key_reused', 409],
    ['coordination_suspended', 423],
    ['coordination_unavailable', 503],
  ] as const)('preserves typed %s status and safe actionable output', async (code, status) => {
    port.resumeCreationRecovery.mockRejectedValue(new CoordinatorError(code, { message: 'clientSecret=fixture-secret /private/state' }))
    const response = await request(app).post(`${base}/resume`).auth(ownerToken, { type: 'bearer' }).send(resumeInput).expect(status)
    expect(response.body).toMatchObject({ code, nextAction: expect.any(String) })
    expect(JSON.stringify(response.body)).not.toMatch(/fixture-secret|clientSecret|\/private/u)
    expect(port.resumeCreationRecovery).toHaveBeenCalledTimes(1)
    expect(port.reconcileCreationRecovery).not.toHaveBeenCalled()
  })

  it('sanitizes unexpected inspection failures without attempting recovery', async () => {
    port.inspectCreationRecovery.mockRejectedValue(new Error('/private/draft-body fixture-secret'))
    const response = await request(app).get(base).auth(ownerToken, { type: 'bearer' }).expect(500)
    expect(JSON.stringify(response.body)).not.toMatch(/\/private|fixture-secret|draft-body|stack/u)
    expectNoMutation()
  })

  it.each([
    ['get', false],
    ['get', true],
    ['head', false],
    ['head', true],
    ['options', false],
    ['options', true],
  ] as const)('denies %s inspection with read-session=%s', async (method, readSession) => {
    const cookie = createReadSessionCookie(readSecret, { projectRefs: ['fixture'] }, { secure: false }).split(';')[0]!
    await request(app)[method](base).set(readSession ? { Cookie: cookie } : {}).expect(403)
    expect(port.inspectCreationRecovery).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it.each([
    ['resume', false],
    ['resume', true],
    ['reconcile', false],
    ['reconcile', true],
  ] as const)('denies %s mutations with read-session=%s', async (operation, readSession) => {
    const cookie = createReadSessionCookie(readSecret, { projectRefs: ['fixture'] }, { secure: false }).split(';')[0]!
    await request(app).post(`${base}/${operation}`).set(readSession ? { Cookie: cookie } : {}).send(operation === 'resume' ? resumeInput : reconcileInput).expect(403)
    expect(port.inspectCreationRecovery).not.toHaveBeenCalled()
    expectNoMutation()
  })

  it.each(['get', 'resume', 'reconcile'] as const)('enforces owner access inside the router itself for %s', async (operation) => {
    const unguarded = express()
    unguarded.use(express.json())
    unguarded.use((_req, _res, next) => {
      // A project-scoped read grant is still insufficient for recovery.
      Object.assign(_req, { mdtAccess: { canWrite: false, mode: 'read-only', projectRefs: ['fixture'], shareIds: [] } })
      next()
    })
    unguarded.use('/api/projects', await recoveryRouter(port))
    if (operation === 'get')
      await request(unguarded).get(base).expect(403)
    else
      await request(unguarded).post(`${base}/${operation}`).send(operation === 'resume' ? resumeInput : reconcileInput).expect(403)
    expect(port.inspectCreationRecovery).not.toHaveBeenCalled()
    expectNoMutation()
  })
})
