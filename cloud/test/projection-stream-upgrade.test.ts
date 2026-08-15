/**
 * TEST-worker-hub-upgrade-forwarding — covers C-10, C-14, C-15, Edge-8.
 *
 * Source: docs/CRs/MDT-226/architecture.md § Worker routing, § Cloud project
 *         hub, § Security and Revocation.
 *
 * Verifies the control-plane/data-plane split without the Workers runtime,
 * against the same pure grant registry and forwarding helpers the Worker and
 * ProjectProjectionHub compose:
 *   - one session request performs exactly ONE membership decision and ONE
 *     denial audit; a cached decision (positive or terminal denial) performs
 *     neither (C-15);
 *   - the hub-side registry stores only grant DIGESTS — the raw opaque grant
 *     never appears in serialized state (C-10);
 *   - Worker→hub forwarding preserves the client's WebSocket upgrade headers
 *     while adding internal context (Edge-8);
 *   - a grant-bearing upgrade validates without any membership port access,
 *     including reconnects with the same grant (C-15);
 *   - revocation invalidates grants and cached decisions (Edge-4);
 *   - route telemetry distinguishes projection.stream.session from
 *     projection.stream.
 */

import type { Headers } from '@cloudflare/workers-types'
import { describe, expect, it } from 'bun:test'
import {
  authorizeProjectionStreamSession,
  buildHubForwardedHeaders,
  projectionStreamRouteName,
  StreamGrantRegistry,
} from '../src/cloudflare/durable/projection-hub-helpers'

const PRINCIPAL = { principalKind: 'human', principalId: 'user@example.com' }
const ACTIVATION = 'activation-fingerprint-1'
const NOW = 1_000_000

/** In-memory hub adapter mirroring the DO session RPC over a real registry. */
function makeHubHarness() {
  const registry = new StreamGrantRegistry({ now: () => NOW })
  return {
    registry,
    state: () => JSON.stringify(registry.exportState()),
    async cachedSessionDecision(principal: typeof PRINCIPAL, activationId: string) {
      return registry.cachedDecision(principal, activationId)
    },
    async recordSessionDecision(principal: typeof PRINCIPAL, activationId: string, outcome: 'allowed' | 'denied', opts: { code?: string, tokenExpiry: number }) {
      const decision = await registry.recordDecision(principal, activationId, outcome, opts)
      if (outcome === 'denied')
        return { kind: 'denied' as const, code: decision.code ?? 'forbidden' }
      const grant = await registry.issueGrant(principal, activationId, opts.tokenExpiry)
      return { kind: 'granted' as const, grant: grant.grant, expiresAt: grant.expiresAt }
    },
  }
}

/** Membership + audit spy: the only path allowed to touch D1. */
function makeMembershipSpy(allow: boolean) {
  const spy = { membershipCalls: 0, auditWrites: 0 }
  return {
    spy,
    authorizeOnce: async () => {
      spy.membershipCalls += 1
      if (!allow) {
        spy.auditWrites += 1
        return { ok: false as const, code: 'project_not_found' as const, status: 404 }
      }
      return { ok: true as const }
    },
  }
}

function makeHeaders(init: Record<string, string>): Headers {
  return new Headers(init) as unknown as Headers
}

describe('TEST-worker-hub-upgrade-forwarding', () => {
  describe('session authorization performs one bounded D1 decision (C-15)', () => {
    it('a cache miss performs exactly one membership decision and returns a grant', async () => {
      const hub = makeHubHarness()
      const { spy, authorizeOnce } = makeMembershipSpy(true)
      const result = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.grant.length).toBeGreaterThan(20)
        expect(result.expiresAt).toBeLessThanOrEqual(NOW + 300_000)
      }
      expect(spy.membershipCalls).toBe(1)
      expect(spy.auditWrites).toBe(0)
    })

    it('a cached positive decision issues a fresh grant with zero D1 calls', async () => {
      const hub = makeHubHarness()
      const { spy, authorizeOnce } = makeMembershipSpy(true)
      const first = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      const second = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      expect(spy.membershipCalls).toBe(1)
      expect(first.ok && second.ok).toBe(true)
      if (first.ok && second.ok) {
        // Fresh grant each issue, both valid until the bounded expiry.
        expect(second.grant).not.toBe(first.grant)
        expect(second.expiresAt).toBeLessThanOrEqual(NOW + 300_000)
      }
    })

    it('a terminal denial is cached: the second request performs no membership or audit call', async () => {
      const hub = makeHubHarness()
      const { spy, authorizeOnce } = makeMembershipSpy(false)
      const first = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      const second = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      expect(first.ok).toBe(false)
      expect(second.ok).toBe(false)
      if (!first.ok && !second.ok) {
        expect(second.code).toBe(first.code)
        expect(second.status).toBe(first.status)
      }
      expect(spy.membershipCalls).toBe(1)
      expect(spy.auditWrites).toBe(1)
    })

    it('a changed activation fingerprint is a new decision, not a cached one', async () => {
      const hub = makeHubHarness()
      const { spy, authorizeOnce } = makeMembershipSpy(false)
      await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: 'activation-fingerprint-2-rearmed',
        tokenExpiry: NOW + 300_000,
      })
      expect(spy.membershipCalls).toBe(2)
      expect(spy.auditWrites).toBe(2)
    })
  })

  describe('grant storage is digest-only (C-10)', () => {
    it('serialized registry state contains digests, never the raw grant', async () => {
      const hub = makeHubHarness()
      const { authorizeOnce } = makeMembershipSpy(true)
      const result = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      expect(result.ok).toBe(true)
      if (!result.ok)
        return
      const state = hub.state()
      expect(state).not.toContain(result.grant)
      const parsed = JSON.parse(state) as { grants: Array<{ digest: string }> }
      expect(parsed.grants.length).toBeGreaterThan(0)
      expect(parsed.grants.every(g => g.digest.length === 64)).toBe(true)
    })
  })

  describe('worker forwarding preserves the WebSocket upgrade (Edge-8)', () => {
    it('keeps upgrade headers and appends internal context', () => {
      const original = makeHeaders({
        'upgrade': 'websocket',
        'connection': 'Upgrade',
        'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'sec-websocket-version': '13',
        'cf-access-jwt-assertion': 'assertion-value',
        'x-mdt-after-revision': '5',
      })
      const forwarded = buildHubForwardedHeaders(original, {
        'x-mdt-cloud-project-id': 'proj-uuid',
        'x-mdt-stream-grant': 'grant-opaque-1',
      })
      expect(forwarded.get('upgrade')).toBe('websocket')
      expect(forwarded.get('connection')).toBe('Upgrade')
      expect(forwarded.get('sec-websocket-key')).toBe('dGhlIHNhbXBsZSBub25jZQ==')
      expect(forwarded.get('sec-websocket-version')).toBe('13')
      expect(forwarded.get('cf-access-jwt-assertion')).toBe('assertion-value')
      expect(forwarded.get('x-mdt-cloud-project-id')).toBe('proj-uuid')
      expect(forwarded.get('x-mdt-stream-grant')).toBe('grant-opaque-1')
      expect(forwarded.get('x-mdt-after-revision')).toBe('5')
    })
  })

  describe('grant-bearing upgrade validates without membership (C-10, C-15)', () => {
    it('validates the grant, and a reconnect with the same grant adds no membership read', async () => {
      const hub = makeHubHarness()
      const { spy, authorizeOnce } = makeMembershipSpy(true)
      const session = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      expect(session.ok).toBe(true)
      if (!session.ok)
        return

      const first = await hub.registry.validateGrant(session.grant)
      const reconnect = await hub.registry.validateGrant(session.grant)
      expect(first?.principalId).toBe(PRINCIPAL.principalId)
      expect(first?.activationId).toBe(ACTIVATION)
      expect(reconnect?.digest).toBe(first?.digest)
      expect(spy.membershipCalls).toBe(1)
    })

    it('rejects an unknown, expired, or tampered grant', async () => {
      const registry = new StreamGrantRegistry({ now: () => NOW })
      const issued = await registry.issueGrant(PRINCIPAL, ACTIVATION, NOW + 300_000)
      expect(await registry.validateGrant(issued.grant)).not.toBeNull()

      expect(await registry.validateGrant('not-a-grant')).toBeNull()
      expect(await registry.validateGrant(`${issued.grant}x`)).toBeNull()

      const later = new StreamGrantRegistry({ now: () => NOW + 300_001 })
      later.loadState(JSON.parse(JSON.stringify(registry.exportState())))
      expect(await later.validateGrant(issued.grant)).toBeNull()
    })

    it('revocation invalidates grants and cached decisions for the principal (Edge-4)', async () => {
      const hub = makeHubHarness()
      const { spy, authorizeOnce } = makeMembershipSpy(true)
      const session = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      expect(session.ok).toBe(true)

      const revoked = hub.registry.revokeByPrincipal(PRINCIPAL.principalId)
      expect(revoked.grants).toBe(1)
      expect(revoked.decisions).toBe(1)

      if (session.ok)
        expect(await hub.registry.validateGrant(session.grant)).toBeNull()

      // The revoked principal's next session is a fresh D1 decision, not a
      // cached allowance.
      const next = await authorizeProjectionStreamSession({
        hub,
        membership: { authorizeOnce },
        principal: PRINCIPAL,
        activationId: ACTIVATION,
        tokenExpiry: NOW + 300_000,
      })
      expect(next.ok).toBe(true)
      expect(spy.membershipCalls).toBe(2)
    })
  })

  describe('route telemetry distinguishes the two planes (C-14, operations.md)', () => {
    it('labels the session route and the upgrade route distinctly', () => {
      expect(projectionStreamRouteName('POST', '/v1/projects/proj-uuid/projection-stream-sessions'))
        .toBe('projection.stream.session')
      expect(projectionStreamRouteName('GET', '/v1/projects/proj-uuid/projection-stream'))
        .toBe('projection.stream')
      // Unrelated paths fall through to the caller's generic labels.
      expect(projectionStreamRouteName('GET', '/v1/projects/proj-uuid/projections')).toBeNull()
      expect(projectionStreamRouteName('GET', '/v1/projects/proj-uuid')).toBeNull()
    })
  })
})
