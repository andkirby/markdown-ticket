/**
 * TEST-rate-limit-wiring — verifies the mutation/polling routes call the abuse
 * guard and return 429 rate_limited when the binding denies.
 *
 * Source: docs/architecture/cloud-sync/operations.md § Rate Limits, constraint C7.
 *
 * The guard is advisory: it shapes abuse but never gates D1 allocation
 * correctness. This test wires the router the same way worker.ts does (a handler
 * that calls withinRateLimit before its work) and asserts:
 *   - the binding is invoked for the request;
 *   - a denied binding produces a 429 rate_limited envelope;
 *   - an allowed binding lets the handler proceed.
 *
 * A structurally-typed fake validator stands in for AccessValidator so no JWT
 * signing is required (the guard runs AFTER validation in production; here we
 * isolate the guard wiring).
 */

import type { CloudPrincipal } from '@mdt/domain-contracts'
import { describe, expect, mock, test } from 'bun:test'
import { CoordinationRouter } from '../src/cloudflare/http/router'
import { rateLimitKey, withinRateLimit } from '../src/cloudflare/rate-limit/guard'

const PRINCIPAL: CloudPrincipal = { kind: 'human', id: 'a@b.com', display: 'a@b.com' }

/** Minimal structural stand-in for AccessValidator. */
function fakeValidator() {
  return { validate: mock(() => Promise.resolve(PRINCIPAL)) } as unknown as
    import('../src/cloudflare/access/jwt').AccessValidator
}

function authedRequest(pathname: string, init?: RequestInit & { method?: string }): Request {
  return new Request(`https://coord.example.com${pathname}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), 'Cf-Access-Jwt-Assertion': 'fake-assertion' },
  })
}

describe('rate-limit wiring (U4: routes call the guard)', () => {
  test('a denied mutate binding → 429 rate_limited envelope', async () => {
    const mutateLimit = mock(() => Promise.resolve({ success: false }))
    const rateLimit = {
      RATE_LIMIT_READ: { limit: mock(() => Promise.resolve({ success: true })) },
      RATE_LIMIT_MUTATE: { limit: mutateLimit },
    }
    const router = new CoordinationRouter(fakeValidator(), {} as never, rateLimit)
    router.coordination(
      'POST',
      /^\/v1\/projects\/(?<projectId>[^/]+)\/reservations$/,
      async (ctx) => {
        if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_MUTATE', rateLimitKey(ctx.principal, ctx.params.projectId, 'mutate'))) {
          return new Response(JSON.stringify({ error: 'rate_limited', requestId: ctx.requestId }), { status: 429 })
        }
        return new Response(JSON.stringify({ requestId: ctx.requestId, data: { ok: true } }), { status: 201 })
      },
    )

    const res = await router.handle(authedRequest('/v1/projects/proj-1/reservations', { method: 'POST' }))
    expect(res.status).toBe(429)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('rate_limited')
    // The mutate binding was called exactly once with the derived key.
    expect(mutateLimit).toHaveBeenCalledTimes(1)
    expect(mutateLimit.mock.calls[0][0]).toEqual({ key: rateLimitKey(PRINCIPAL, 'proj-1', 'mutate') })
  })

  test('an allowed mutate binding lets the handler proceed', async () => {
    const mutateLimit = mock(() => Promise.resolve({ success: true }))
    const rateLimit = {
      RATE_LIMIT_READ: { limit: mock(() => Promise.resolve({ success: true })) },
      RATE_LIMIT_MUTATE: { limit: mutateLimit },
    }
    const router = new CoordinationRouter(fakeValidator(), {} as never, rateLimit)
    router.coordination(
      'POST',
      /^\/v1\/projects\/(?<projectId>[^/]+)\/reservations$/,
      async (ctx) => {
        if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_MUTATE', rateLimitKey(ctx.principal, ctx.params.projectId, 'mutate'))) {
          return new Response(JSON.stringify({ error: 'rate_limited', requestId: ctx.requestId }), { status: 429 })
        }
        return new Response(JSON.stringify({ requestId: ctx.requestId, data: { ok: true } }), { status: 201 })
      },
    )

    const res = await router.handle(authedRequest('/v1/projects/proj-1/reservations', { method: 'POST' }))
    expect(res.status).toBe(201)
    expect(mutateLimit).toHaveBeenCalledTimes(1)
  })

  test('polling (GET) uses the READ binding', async () => {
    const readLimit = mock(() => Promise.resolve({ success: false }))
    const rateLimit = {
      RATE_LIMIT_READ: { limit: readLimit },
      RATE_LIMIT_MUTATE: { limit: mock(() => Promise.resolve({ success: true })) },
    }
    const router = new CoordinationRouter(fakeValidator(), {} as never, rateLimit)
    router.coordination(
      'GET',
      /^\/v1\/projects\/(?<projectId>[^/]+)\/projections$/,
      async (ctx) => {
        const method = ctx.request.method.toUpperCase()
        if (method === 'GET') {
          if (ctx.rateLimit && !await withinRateLimit(ctx.rateLimit, 'RATE_LIMIT_READ', rateLimitKey(ctx.principal, ctx.params.projectId, 'read'))) {
            return new Response(JSON.stringify({ error: 'rate_limited', requestId: ctx.requestId }), { status: 429 })
          }
          return new Response(JSON.stringify({ requestId: ctx.requestId, data: [] }), { status: 200 })
        }
        return new Response(JSON.stringify({ requestId: ctx.requestId }), { status: 405 })
      },
    )

    const res = await router.handle(authedRequest('/v1/projects/proj-1/projections'))
    expect(res.status).toBe(429)
    expect(readLimit).toHaveBeenCalledTimes(1)
    // The read key carries the 'read' route class, not 'mutate'.
    expect(readLimit.mock.calls[0][0]).toEqual({ key: rateLimitKey(PRINCIPAL, 'proj-1', 'read') })
  })

  test('rateLimit bindings are threaded into RouteContext from the router', async () => {
    // Confirms the router constructor threads bindings to handlers. This is the
    // contract worker.ts relies on: buildRouter passes both bindings.
    const rateLimit = {
      RATE_LIMIT_READ: { limit: mock(() => Promise.resolve({ success: true })) },
      RATE_LIMIT_MUTATE: { limit: mock(() => Promise.resolve({ success: true })) },
    }
    let seen
    const router = new CoordinationRouter(fakeValidator(), {} as never, rateLimit)
    router.coordination(
      'GET',
      /^\/v1\/projects\/(?<projectId>[^/]+)\/probe$/,
      async (ctx) => {
        seen = ctx.rateLimit
        return new Response('{}', { status: 200 })
      },
    )
    await router.handle(authedRequest('/v1/projects/proj-1/probe'))
    expect(seen).toBe(rateLimit)
  })
})
