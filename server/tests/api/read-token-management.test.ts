/// <reference types="jest" />

import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { Express } from 'express'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

const ownerToken = 'mdt-177-owner-token'
const allowedOrigin = 'http://localhost:6173'
const envReadToken = 'mdt-177-env-read-token'
const futureExpiry = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

function firstSetCookie(response: request.Response): string {
  const raw = response.headers['set-cookie']
  if (Array.isArray(raw)) {
    return raw[0] ?? ''
  }
  return raw ?? ''
}

function cookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? ''
}

describe('read token management API - MDT-177', () => {
  let tempDir: string
  let configDir: string
  let app: Express
  let projectFactory: ProjectFactory
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env.NODE_ENV = 'production'
    process.env.API_SECURITY_AUTH = 'true'
    process.env.API_AUTH_TOKEN = ownerToken

    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    configDir = context.configDir
    app = context.app
    projectFactory = context.projectFactory

    await projectFactory.createProject('empty', { name: 'Private A', code: 'PRA' })
    await projectFactory.createProject('empty', { name: 'Private B', code: 'PRB' })
  })

  afterEach(async () => {
    await cleanupTestEnvironment(tempDir)
    process.env = originalEnv
  })

  it('lets owners create, list, invite, and revoke named multi-project read access without returning stored raw tokens', async () => {
    const create = await request(app)
      .post('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Bob',
        projectRefs: ['PRA', 'PRB'],
        expiresAt: futureExpiry(),
      })

    expect(create.status).toBe(201)
    expect(create.body).toMatchObject({
      name: 'Bob',
      projectRefs: ['PRA', 'PRB'],
      status: 'active',
    })
    expect(create.body.id).toEqual(expect.any(String))
    expect(create.body.rawToken).toEqual(expect.any(String))
    expect(create.body.tokenHash).toBeUndefined()

    const list = await request(app)
      .get('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(list.status).toBe(200)
    expect(list.body.tokens).toHaveLength(1)
    expect(list.body.tokens[0]).toMatchObject({
      id: create.body.id,
      name: 'Bob',
      projectRefs: ['PRA', 'PRB'],
      status: 'active',
    })
    expect(JSON.stringify(list.body)).not.toContain(create.body.rawToken)
    expect(JSON.stringify(list.body)).not.toContain('tokenHash')

    const persisted = await fs.readFile(join(configDir, 'auth', 'read-access-tokens.json'), 'utf8')
    expect(persisted).not.toContain(create.body.rawToken)

    const invite = await request(app)
      .post(`/api/read-tokens/${create.body.id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', allowedOrigin)
      .send({ origin: allowedOrigin })

    expect(invite.status).toBe(201)
    expect(invite.body.inviteUrl).toMatch(new RegExp(`^${allowedOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/invite/`, 'u'))
    expect(invite.body.inviteUrl).not.toMatch(/(?:read[-_]?token|token=|access_token=)/iu)

    const revoke = await request(app)
      .post(`/api/read-tokens/${create.body.id}/revoke`)
      .set('Authorization', `Bearer ${ownerToken}`)

    expect(revoke.status).toBe(200)
    expect(revoke.body.status).toBe('revoked')
  })

  it('uses PUBLIC_ORIGIN as the single invite origin', async () => {
    setRuntimeEnv({
      PUBLIC_ORIGIN: 'https://share.example.com/',
    })
    const create = await createNamedAccess(['PRA'])

    const list = await request(app)
      .get('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', allowedOrigin)

    expect(list.status).toBe(200)
    expect(list.body.linkOrigins).toMatchObject({
      options: ['https://share.example.com'],
      selectedOrigin: 'https://share.example.com',
    })
    expect(list.body.linkOrigins).not.toHaveProperty('configuredPublicOrigins')
    expect(list.body.linkOrigins).not.toHaveProperty('currentOriginAllowed')
    expect(list.body.linkOrigins).not.toHaveProperty('fallbackReason')

    const invite = await request(app)
      .post(`/api/read-tokens/${create.body.id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', allowedOrigin)
      .send({ origin: 'https://share.example.com' })

    expect(invite.status).toBe(201)
    expect(new URL(invite.body.inviteUrl).origin).toBe('https://share.example.com')
  })

  it('falls back to the current allowed origin when no public origin is configured', async () => {
    setRuntimeEnv({
      PUBLIC_ORIGIN: '',
    })
    const create = await createNamedAccess(['PRA'])

    const list = await request(app)
      .get('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', allowedOrigin)

    expect(list.status).toBe(200)
    expect(list.body.linkOrigins).toMatchObject({
      options: [allowedOrigin],
      selectedOrigin: allowedOrigin,
    })

    const invite = await request(app)
      .post(`/api/read-tokens/${create.body.id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', allowedOrigin)
      .send({ origin: allowedOrigin })

    expect(invite.status).toBe(201)
    expect(new URL(invite.body.inviteUrl).origin).toBe(allowedOrigin)
  })

  it('does not populate invite origins from removed origin env vars', async () => {
    setRuntimeEnv({
      PUBLIC_ORIGIN: '',
      ALLOWED_DOMAINS: 'share.example.com',
      ALLOWED_ORIGINS: 'https://app.example.com',
      PUBLIC_LINK_ORIGINS: 'https://legacy-share.example.com',
    })

    const list = await request(app)
      .get('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', allowedOrigin)

    expect(list.status).toBe(200)
    expect(list.body.linkOrigins).toMatchObject({
      options: [allowedOrigin],
      selectedOrigin: allowedOrigin,
    })
    expect(list.body.linkOrigins.options).not.toContain('https://share.example.com')
    expect(list.body.linkOrigins.options).not.toContain('http://share.example.com')
    expect(list.body.linkOrigins.options).not.toContain('https://app.example.com')
    expect(list.body.linkOrigins.options).not.toContain('https://legacy-share.example.com')
  })

  it('uses Referer origin when same-origin list requests omit the Origin header', async () => {
    setRuntimeEnv({
      PUBLIC_ORIGIN: '',
    })

    const list = await request(app)
      .get('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Referer', `${allowedOrigin}/prj/PRA`)

    expect(list.status).toBe(200)
    expect(list.body.linkOrigins).toMatchObject({
      options: [allowedOrigin],
      selectedOrigin: allowedOrigin,
    })
  })

  it('reports no safe invite origin when public origins are empty and current origin is rejected', async () => {
    setRuntimeEnv({
      PUBLIC_ORIGIN: '',
    })
    const create = await createNamedAccess(['PRA'])

    const list = await request(app)
      .get('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', 'https://disallowed.example.test')

    expect(list.status).toBe(200)
    expect(list.body.linkOrigins).toMatchObject({
      options: [],
      notice: expect.stringMatching(/no allowed public origin/i),
    })
    expect(list.body.linkOrigins.selectedOrigin).toBeUndefined()

    const invite = await request(app)
      .post(`/api/read-tokens/${create.body.id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', 'https://disallowed.example.test')
      .send({})

    expect(invite.status).toBe(400)
  })

  it('exchanges a valid invite code into an HttpOnly SameSite=Lax read cookie and never echoes the code', async () => {
    const { inviteUrl } = await createNamedAccessInvite(['PRA', 'PRB'])
    const code = inviteUrl.pathname.split('/').pop() ?? ''

    const exchange = await request(app)
      .post(`/api/read-tokens/invites/${encodeURIComponent(code)}/session`)

    expect(exchange.status).toBe(200)
    expect(JSON.stringify(exchange.body)).not.toContain(code)

    const setCookie = firstSetCookie(exchange)
    expect(setCookie).toMatch(/mdt_read_session=/)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    expect(setCookie).toMatch(/Path=\/api/i)
    expect(setCookie).not.toContain(code)

    const scopedList = await request(app)
      .get('/api/projects')
      .set('Cookie', cookiePair(setCookie))

    expect(scopedList.status).toBe(200)
    expect(scopedList.body.map((project: { id: string }) => project.id)).toEqual(['PRA', 'PRB'])
  })

  it('exchanges the one-time raw persisted token without requiring invite links', async () => {
    const create = await request(app)
      .post('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Alice', projectRefs: ['PRA'] })

    expect(create.status).toBe(201)
    expect(create.body.rawToken).toEqual(expect.any(String))

    const exchange = await request(app)
      .post('/api/auth/read-token')
      .send({ token: create.body.rawToken })

    expect(exchange.status).toBe(200)
    const scopedList = await request(app)
      .get('/api/projects')
      .set('Cookie', cookiePair(firstSetCookie(exchange)))

    expect(scopedList.body.map((project: { id: string }) => project.id)).toEqual(['PRA'])
  })

  it('preserves env-token grants when a persisted named token is merged into the same read session', async () => {
    setRuntimeEnv({ API_READ_TOKEN_HASHES: `${hashToken(envReadToken)}:PRB` })
    const create = await request(app)
      .post('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Mixed access', projectRefs: ['PRA'] })

    expect(create.status).toBe(201)

    const envExchange = await request(app)
      .post('/api/auth/read-token')
      .send({ token: envReadToken })
    expect(envExchange.status).toBe(200)

    const persistedExchange = await request(app)
      .post('/api/auth/read-token')
      .set('Cookie', cookiePair(firstSetCookie(envExchange)))
      .send({ token: create.body.rawToken })
    expect(persistedExchange.status).toBe(200)

    const scopedList = await request(app)
      .get('/api/projects')
      .set('Cookie', cookiePair(firstSetCookie(persistedExchange)))

    expect(scopedList.body.map((project: { id: string }) => project.id)).toEqual(['PRA', 'PRB'])
  })

  it('removes token-scoped private projects from existing read sessions after revoke', async () => {
    const { inviteUrl, tokenId } = await createNamedAccessInvite(['PRA'])
    const code = inviteUrl.pathname.split('/').pop() ?? ''
    const exchange = await request(app).post(`/api/read-tokens/invites/${encodeURIComponent(code)}/session`)
    expect(exchange.status).toBe(200)
    const readCookie = cookiePair(firstSetCookie(exchange))

    const beforeRevoke = await request(app).get('/api/projects').set('Cookie', readCookie)
    expect(beforeRevoke.body.map((project: { id: string }) => project.id)).toEqual(['PRA'])

    const revoke = await request(app)
      .post(`/api/read-tokens/${tokenId}/revoke`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(revoke.status).toBe(200)

    const afterRevoke = await request(app).get('/api/projects').set('Cookie', readCookie)
    expect(afterRevoke.body.map((project: { id: string }) => project.id)).not.toContain('PRA')

    const session = await request(app).get('/api/auth/session').set('Cookie', readCookie)
    expect(session.body.readAuthenticated).toBe(false)
  })

  it('rejects invalid, consumed, expired, and revoked invite exchanges with generic errors and unchanged existing grants', async () => {
    const { inviteUrl } = await createNamedAccessInvite(['PRA'])
    const code = inviteUrl.pathname.split('/').pop() ?? ''

    const firstExchange = await request(app).post(`/api/read-tokens/invites/${encodeURIComponent(code)}/session`)
    expect(firstExchange.status).toBe(200)
    const existingCookie = cookiePair(firstSetCookie(firstExchange))

    const consumedAgain = await request(app)
      .post(`/api/read-tokens/invites/${encodeURIComponent(code)}/session`)
      .set('Cookie', existingCookie)

    expect(consumedAgain.status).toBe(401)
    expect(JSON.stringify(consumedAgain.body)).toMatch(/invite|access|token|not accepted|invalid/i)
    expect(JSON.stringify(consumedAgain.body)).not.toContain(code)
    expect(consumedAgain.headers['set-cookie']).toBeUndefined()

    const invalidCode = 'mdt-177-invalid-code'
    const invalid = await request(app)
      .post(`/api/read-tokens/invites/${invalidCode}/session`)
      .set('Cookie', existingCookie)

    expect(invalid.status).toBe(401)
    expect(JSON.stringify(invalid.body)).not.toContain(invalidCode)
    expect(invalid.headers['set-cookie']).toBeUndefined()

    const scopedList = await request(app)
      .get('/api/projects')
      .set('Cookie', existingCookie)

    expect(scopedList.body.map((project: { id: string }) => project.id)).toEqual(['PRA'])
  })

  it('allows only one concurrent HTTP exchange for the same invite code', async () => {
    const { inviteUrl } = await createNamedAccessInvite(['PRA'])
    const code = inviteUrl.pathname.split('/').pop() ?? ''

    const responses = await Promise.all([
      request(app).post(`/api/read-tokens/invites/${encodeURIComponent(code)}/session`),
      request(app).post(`/api/read-tokens/invites/${encodeURIComponent(code)}/session`),
    ])

    expect(responses.map(response => response.status).sort()).toEqual([200, 401])
  })

  it('keeps owner management APIs unavailable to anonymous, read-only, and share-link-only visitors', async () => {
    const shareSetup = await request(app)
      .put('/api/projects/PRA/sharing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mode: 'unlisted-readonly' })
    const shareId = shareSetup.body.metadata?.sharing?.shareId
    expect(shareId).toEqual(expect.any(String))
    const shareOnly = await request(app).post(`/api/share/${shareId}/session`)
    const shareOnlyCookie = cookiePair(firstSetCookie(shareOnly))

    const { inviteUrl } = await createNamedAccessInvite(['PRA'])
    const code = inviteUrl.pathname.split('/').pop() ?? ''
    const readOnly = await request(app).post(`/api/read-tokens/invites/${encodeURIComponent(code)}/session`)
    const readOnlyCookie = cookiePair(firstSetCookie(readOnly))

    const anonymousList = await request(app).get('/api/read-tokens')
    expect(anonymousList.status).toBe(403)

    const readOnlyList = await request(app)
      .get('/api/read-tokens')
      .set('Cookie', readOnlyCookie)
    expect(readOnlyList.status).toBe(403)

    const shareOnlyList = await request(app)
      .get('/api/read-tokens')
      .set('Cookie', shareOnlyCookie)
    expect(shareOnlyList.status).toBe(403)

    const readOnlyCreate = await request(app)
      .post('/api/read-tokens')
      .set('Cookie', readOnlyCookie)
      .send({ name: 'Mallory', projectRefs: ['PRB'] })
    expect(readOnlyCreate.status).toBe(403)
  })

  it('applies public invite exchange rate limiting', async () => {
    const responses: request.Response[] = []

    for (let index = 0; index < 31; index += 1) {
      responses.push(await request(app).post(`/api/read-tokens/invites/invalid-${index}/session`))
    }

    expect(responses.at(-1)?.status).toBe(429)
  })

  async function createNamedAccessInvite(projectRefs: string[]): Promise<{ inviteUrl: URL, tokenId: string }> {
    const create = await createNamedAccess(projectRefs)

    const invite = await request(app)
      .post(`/api/read-tokens/${create.body.id}/invites`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Origin', allowedOrigin)
      .send({ origin: allowedOrigin })

    expect(invite.status).toBe(201)
    expect(invite.body.inviteUrl).toEqual(expect.any(String))

    return { inviteUrl: new URL(invite.body.inviteUrl), tokenId: create.body.id }
  }

  async function createNamedAccess(projectRefs: string[]): Promise<request.Response> {
    const create = await request(app)
      .post('/api/read-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Bob', projectRefs })

    expect(create.status).toBe(201)
    expect(create.body.id).toEqual(expect.any(String))

    return create
  }

  function setRuntimeEnv(overrides: NodeJS.ProcessEnv): void {
    app.locals.runtimeConfig = buildRuntimeConfig({
      ...process.env,
      CONFIG_DIR: configDir,
      NODE_ENV: process.env.NODE_ENV,
      API_SECURITY_AUTH: process.env.API_SECURITY_AUTH,
      API_AUTH_TOKEN: process.env.API_AUTH_TOKEN,
      ...overrides,
    } as NodeJS.ProcessEnv)
  }
})

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
