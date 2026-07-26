/**
 * TEST-mgmt-coordinator-envelope — covers C1, C5.
 *
 * Source: docs/CRs/MDT-201/architecture.md § Module Boundaries,
 *         docs/architecture/cloud-sync/identity-and-access.md § Access Applications.
 *
 * Verifies the ManagementCoordinator HTTP client:
 *   - Routes provisioning to the operator audience and every other management
 *     operation to the coordination audience.
 *   - Enforces the origin allowlist BEFORE attaching any credential.
 *   - Rejects redirects (redirect: 'error') so a credential is never silently
 *     followed to another origin.
 *   - Maps the cloud `{error}` envelope to stable CoordinatorError codes.
 *   - Carries no presentation logic (raw typed DTOs only).
 *   - Never logs or echoes a credential.
 */

import { describe, expect, it, jest } from '@jest/globals'

import {
  COORDINATION_ERRORS,
  type CloudCredential,
  CoordinatorError,
  type CoordinationErrorEnvelope,
} from '@mdt/domain-contracts'
import {
  ManagementCoordinator,
  type ManagementCoordinatorOptions,
} from '../management-coordinator'
import { buildEffectiveCloudSyncConfig } from '../config'

const ORIGIN = 'https://mdt-sync.constantapp.org'
const OPERATOR_ORIGIN = ORIGIN // same trusted profile host; audience differs by route prefix

type FetchImpl = ManagementCoordinatorOptions['fetchImpl']

function okResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ requestId: 'req-1', data }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(code: keyof typeof COORDINATION_ERRORS, status: number, message: string = code): Response {
  const body: CoordinationErrorEnvelope = {
    error: { code, message, requestId: 'req-1', retryable: false },
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('ManagementCoordinator (TEST-mgmt-coordinator-envelope)', () => {
  function build(fetchImpl: FetchImpl): ManagementCoordinator {
    return new ManagementCoordinator({
      coordinationOrigin: ORIGIN,
      provisioningOrigin: OPERATOR_ORIGIN,
      globalConfig: buildEffectiveCloudSyncConfig({ allowedOrigins: [] }),
      fetchImpl,
    })
  }

  describe('audience routing', () => {
    it('routes provisioning to the operator audience (/v1/admin/projects)', async () => {
      const calls: { url: string, headers: Record<string, string> }[] = []
      const fetchImpl: FetchImpl = async (url, init) => {
        calls.push({ url: String(url), headers: headersToObject(init?.headers) })
        return okResponse({ projectId: 'uuid-1' }, 201)
      }
      const c = build(fetchImpl)
      await c.provision({
        projectCode: 'MDT',
        initialOwnerEmail: 'owner@example.com',
        idempotencyKey: 'key-1',
        requestHash: 'hash-1',
      }, { kind: 'human', cfAccessToken: 'tok' })
      expect(calls[0]!.url).toContain('/v1/admin/projects')
    })

    it('routes probe, members, coordination-state to the coordination audience (/v1/projects)', async () => {
      const calls: string[] = []
      const fetchImpl: FetchImpl = async (url) => {
        calls.push(String(url))
        return okResponse({}, 200)
      }
      const c = build(fetchImpl)
      const cred: CloudCredential = { kind: 'human', cfAccessToken: 'tok' }
      await c.probe('uuid-1', cred)
      await c.listMembers('uuid-1', cred)
      await c.updateCoordinationState('uuid-1', { state: 'suspended' }, cred)
      expect(calls.every(u => u.includes('/v1/projects/'))).toBe(true)
      expect(calls.some(u => u.includes('/v1/admin/'))).toBe(false)
    })
  })

  describe('allowlist-before-credential', () => {
    it('throws and never reaches the wire when the origin is not allowlisted', async () => {
      let reached = false
      const fetchImpl: FetchImpl = async () => {
        reached = true
        return okResponse({})
      }
      const c = new ManagementCoordinator({
        coordinationOrigin: 'https://evil.example.com',
        provisioningOrigin: 'https://evil.example.com',
        globalConfig: buildEffectiveCloudSyncConfig({ allowedOrigins: [] }),
        fetchImpl,
      })
      await expect(c.probe('uuid-1', { kind: 'human', cfAccessToken: 'tok' })).rejects.toThrow(CoordinatorError)
      expect(reached).toBe(false)
    })

    it('attaches the human token only AFTER the allowlist passes', async () => {
      let seenHeaders: Record<string, string> = {}
      const fetchImpl: FetchImpl = async (_url, init) => {
        seenHeaders = headersToObject(init?.headers)
        return okResponse({})
      }
      const c = build(fetchImpl)
      await c.probe('uuid-1', { kind: 'human', cfAccessToken: 'tok' })
      expect(seenHeaders['cf-access-token']).toBe('tok')
    })

    it('attaches the service-token header pair for a machine credential', async () => {
      let seenHeaders: Record<string, string> = {}
      const fetchImpl: FetchImpl = async (_url, init) => {
        seenHeaders = headersToObject(init?.headers)
        return okResponse({})
      }
      const c = build(fetchImpl)
      await c.probe('uuid-1', { kind: 'service', clientId: 'id-1', clientSecret: 'secret-1' })
      expect(seenHeaders['cf-access-client-id']).toBe('id-1')
      expect(seenHeaders['cf-access-client-secret']).toBe('secret-1')
    })
  })

  describe('redirect denial', () => {
    it('rejects a redirect (redirect: error) and never follows it', async () => {
      const fetchImpl: FetchImpl = async () => {
        // A redirect throws TypeError under redirect: 'error'.
        throw new TypeError('redirect response')
      }
      const c = build(fetchImpl)
      await expect(c.probe('uuid-1', { kind: 'human', cfAccessToken: 'tok' })).rejects.toThrow(CoordinatorError)
    })

    it('uses redirect: error on every credential-bearing request', async () => {
      const redirects: RequestRedirect[] = []
      const fetchImpl: FetchImpl = async (url, init) => {
        redirects.push(init?.redirect ?? 'follow')
        // Provision returns 201; everything else returns 200.
        const status = String(url).includes('/admin/') ? 201 : 200
        return okResponse({ projectId: 'x', replayed: false }, status)
      }
      const c = build(fetchImpl)
      const cred: CloudCredential = { kind: 'human', cfAccessToken: 'tok' }
      await c.probe('uuid-1', cred)
      await c.listMembers('uuid-1', cred)
      await c.provision({ projectCode: 'MDT', initialOwnerEmail: 'o@e.com', idempotencyKey: 'k', requestHash: 'h' }, cred)
      expect(redirects.every(r => r === 'error')).toBe(true)
    })
  })

  describe('stable error envelope mapping', () => {
    it('maps a 401 envelope to authentication_required', async () => {
      const fetchImpl: FetchImpl = async () => errorResponse('authentication_required', 401)
      const c = build(fetchImpl)
      await expect(c.probe('uuid-1', { kind: 'human', cfAccessToken: 'tok' })).rejects.toMatchObject({
        code: 'authentication_required',
        status: 401,
      })
    })

    it('maps a 403 envelope to forbidden', async () => {
      const fetchImpl: FetchImpl = async () => errorResponse('forbidden', 403)
      const c = build(fetchImpl)
      await expect(c.probe('uuid-1', { kind: 'human', cfAccessToken: 'tok' })).rejects.toMatchObject({
        code: 'forbidden',
      })
    })

    it('maps a 404 envelope to project_not_found (non-disclosing)', async () => {
      const fetchImpl: FetchImpl = async () => errorResponse('project_not_found', 404)
      const c = build(fetchImpl)
      await expect(c.probe('uuid-1', { kind: 'human', cfAccessToken: 'tok' })).rejects.toMatchObject({
        code: 'project_not_found',
      })
    })

    it('maps a network failure to coordination_unavailable (recoverable)', async () => {
      const fetchImpl: FetchImpl = async () => {
        throw new TypeError('network down')
      }
      const c = build(fetchImpl)
      await expect(c.probe('uuid-1', { kind: 'human', cfAccessToken: 'tok' })).rejects.toMatchObject({
        code: 'coordination_unavailable',
      })
    })

    it('maps a provisioning idempotency_conflict envelope to idempotency_key_reused', async () => {
      const fetchImpl: FetchImpl = async () => errorResponse('idempotency_key_reused', 409, 'idempotency_conflict')
      const c = build(fetchImpl)
      await expect(c.provision(
        { projectCode: 'MDT', initialOwnerEmail: 'o@e.com', idempotencyKey: 'k', requestHash: 'h' },
        { kind: 'human', cfAccessToken: 'tok' },
      )).rejects.toMatchObject({ code: 'idempotency_key_reused' })
    })
  })

  describe('no presentation logic + no secret leakage', () => {
    it('returns raw typed DTOs (probe, members, provision) without formatting', async () => {
      const fetchImpl: FetchImpl = async (url) => {
        if (String(url).includes('/admin/')) {
          return okResponse({ projectId: 'uuid-9', replayed: true }, 201)
        }
        if (String(url).endsWith('/members')) {
          return okResponse({ items: [{ kind: 'human', id: 'a@b.com', displayLabel: 'A', role: 'owner' }] })
        }
        return okResponse({ projectId: 'uuid-1', projectCode: 'MDT', coordinationState: 'active', role: 'owner' })
      }
      const c = build(fetchImpl)
      const cred: CloudCredential = { kind: 'human', cfAccessToken: 'tok' }
      const probe = await c.probe('uuid-1', cred)
      expect(probe).toEqual({ projectId: 'uuid-1', projectCode: 'MDT', coordinationState: 'active', role: 'owner' })
      const members = await c.listMembers('uuid-1', cred)
      expect(members.items).toHaveLength(1)
      const prov = await c.provision(
        { projectCode: 'MDT', initialOwnerEmail: 'o@e.com', idempotencyKey: 'k', requestHash: 'h' },
        cred,
      )
      expect(prov).toEqual({ projectId: 'uuid-9', replayed: true })
    })

    it('never logs the credential', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const fetchImpl: FetchImpl = async () => {
        return errorResponse('authentication_required', 401)
      }
      const c = build(fetchImpl)
      try {
        await c.probe('uuid-1', { kind: 'human', cfAccessToken: 'topsecret' })
      }
      catch {
        // expected
      }
      expect(errSpy).not.toHaveBeenCalledWith(expect.stringContaining('topsecret'))
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('topsecret'))
      errSpy.mockRestore()
      logSpy.mockRestore()
    })
  })
})

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!headers) return out
  new Headers(headers).forEach((value, key) => {
    out[key.toLowerCase()] = value
  })
  return out
}

/**
 * TEST-mgmt-coordinator-authorization — covers BR-2.7, C7, C8, Edge-1, Edge-4.
 *
 * Verifies the management surface preserves the cloud-side authorization
 * invariants:
 *   - Non-member denial is non-disclosing (same response for unknown project
 *     and non-member principal).
 *   - Revocation blocks the NEXT protected operation with no client cache.
 *   - Final-owner protection and no-self-elevation hold.
 *   - Machine membership requests carry no secret (principal id only).
 *
 * The cloud-side enforcement lives in application/membership.ts (MDT-200);
 * these tests prove the coordinator + management DTOs preserve it end-to-end
 * without leaking secrets or project existence.
 */
describe('ManagementCoordinator authorization (TEST-mgmt-coordinator-authorization)', () => {
  function build(fetchImpl: FetchImpl): ManagementCoordinator {
    return new ManagementCoordinator({
      coordinationOrigin: ORIGIN,
      provisioningOrigin: OPERATOR_ORIGIN,
      globalConfig: buildEffectiveCloudSyncConfig({ allowedOrigins: [] }),
      fetchImpl,
    })
  }

  it('surfaces a non-member denial as forbidden without disclosing project existence', async () => {
    // The cloud returns the SAME non-disclosing code for an unknown project
    // and a known-project-non-member (tenant isolation, Edge-1). The
    // coordinator maps both to `forbidden`/`project_not_found` — never
    // distinguishing them.
    const cases: Array<{ envelope: keyof typeof COORDINATION_ERRORS, status: number }> = [
      { envelope: 'project_not_found', status: 404 },
      { envelope: 'forbidden', status: 403 },
    ]
    for (const { envelope, status } of cases) {
      const fetchImpl: FetchImpl = async () => errorResponse(envelope, status)
      const c = build(fetchImpl)
      let err: unknown = null
      try {
        await c.probe('uuid-maybe-or-maybe-not', { kind: 'human', cfAccessToken: 'tok' })
      }
      catch (e) {
        err = e
      }
      expect(err).toBeInstanceOf(CoordinatorError)
      // The error message never discloses which case it was.
      expect((err as Error).message).not.toContain('member')
      expect((err as Error).message).not.toContain('exists')
    }
  })

  it('revocation blocks the next protected operation with no client cache', async () => {
    // The first probe succeeds (member); after revocation the next probe is
    // denied. The coordinator has no cache — every call hits the cloud, so
    // revocation takes effect immediately on the next operation (Edge-4).
    let revoked = false
    const fetchImpl: FetchImpl = async () => {
      if (revoked) {
        return errorResponse('forbidden', 403)
      }
      return okResponse({ projectId: 'uuid-1', projectCode: 'MDT', coordinationState: 'active', role: 'owner' })
    }
    const c = build(fetchImpl)
    const cred: CloudCredential = { kind: 'human', cfAccessToken: 'tok' }
    const first = await c.probe('uuid-1', cred)
    expect(first.role).toBe('owner')
    revoked = true
    await expect(c.probe('uuid-1', cred)).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('final-owner protection surfaces as last_owner_required', async () => {
    const fetchImpl: FetchImpl = async () => errorResponse('last_owner_required', 409, 'cannot remove the final owner')
    const c = build(fetchImpl)
    await expect(c.removeMember('uuid-1', 'human', 'final@owner.com', { kind: 'human', cfAccessToken: 'tok' })).rejects.toMatchObject({
      code: 'last_owner_required',
    })
  })

  it('no-self-elevation (granting above own role) surfaces as forbidden', async () => {
    const fetchImpl: FetchImpl = async () => errorResponse('forbidden', 403, 'insufficient role')
    const c = build(fetchImpl)
    await expect(c.upsertMember(
      'uuid-1',
      'human',
      'new@example.com',
      { displayLabel: 'New', role: 'owner' },
      { kind: 'human', cfAccessToken: 'tok' },
    )).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('machine membership requests carry only the non-secret principal id (no client secret in body or URL)', async () => {
    let sentUrl = ''
    let sentBody = ''
    const fetchImpl: FetchImpl = async (url, init) => {
      sentUrl = String(url)
      sentBody = typeof init?.body === 'string' ? init.body : ''
      return okResponse({
        kind: 'machine',
        id: 'machine-principal-1',
        displayLabel: 'ci',
        role: 'contributor',
      })
    }
    const c = build(fetchImpl)
    // The membership upsert carries the non-secret machine principal id in the
    // URL path (the membership key); the body holds only displayLabel + role.
    // Neither the URL nor the body ever contains the client secret.
    await c.upsertMember(
      'uuid-1',
      'machine',
      'machine-principal-1',
      { displayLabel: 'ci', role: 'contributor' },
      { kind: 'human', cfAccessToken: 'owner-tok' },
    )
    expect(sentUrl).toContain('machine-principal-1')
    expect(sentBody).not.toMatch(/secret|clientSecret|token|machine-principal-1/i)
  })

  it('upsertMember route is project-scoped (path includes the cloudProjectId)', async () => {
    const urls: string[] = []
    const fetchImpl: FetchImpl = async (url) => {
      urls.push(String(url))
      return okResponse({ kind: 'human', id: 'a@b.com', displayLabel: 'A', role: 'viewer' })
    }
    const c = build(fetchImpl)
    await c.upsertMember('uuid-A', 'human', 'a@b.com', { displayLabel: 'A', role: 'viewer' }, { kind: 'human', cfAccessToken: 'tok' })
    await c.upsertMember('uuid-B', 'human', 'a@b.com', { displayLabel: 'A', role: 'viewer' }, { kind: 'human', cfAccessToken: 'tok' })
    // Each upsert targets its own project path; one project's membership
    // mutation never touches another (project-scoped, BR-2.5).
    expect(urls[0]).toContain('/v1/projects/uuid-A/members/')
    expect(urls[1]).toContain('/v1/projects/uuid-B/members/')
  })
})
